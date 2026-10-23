import json
import os
from typing import List, Dict
import chromadb
from sentence_transformers import SentenceTransformer

JSON_PATH = os.path.join("law_data", "constitution.json")
CHROMA_DIR = os.path.join("law_data", "chroma_db")
COLLECTION_NAME = "pakistan_constitution"
MODEL_NAME = "all-MiniLM-L6-v2"


def chunk_text(text: str, max_words: int = 400, overlap_words: int = 50) -> List[str]:
    """Splits text into chunks of max_words with overlap_words."""
    words = text.split()
    if len(words) <= max_words:
        return [text]

    chunks = []
    step = max(1, max_words - overlap_words)
    for i in range(0, len(words), step):
        chunk_words = words[i : i + max_words]
        chunks.append(" ".join(chunk_words))
        if i + max_words >= len(words):
            break
    return chunks


def embed_and_store(
    json_path: str = JSON_PATH,
    chroma_dir: str = CHROMA_DIR,
    collection_name: str = COLLECTION_NAME,
) -> None:
    """Reads constitution.json and stores chunk embeddings in ChromaDB."""
    if not os.path.exists(json_path):
        print(f"Error: {json_path} does not exist. Please run law_scraper.py first.")
        return

    os.makedirs(chroma_dir, exist_ok=True)
    client = chromadb.PersistentClient(path=chroma_dir)
    collection = client.get_or_create_collection(name=collection_name)

    existing_count = collection.count()
    if existing_count > 0:
        print(f"Collection '{collection_name}' already contains {existing_count} items. Skipping embedding.")
        return

    with open(json_path, "r", encoding="utf-8") as f:
        articles: List[Dict[str, str]] = json.load(f)

    all_chunks = []
    all_metadatas = []
    all_ids = []

    for item in articles:
        article_name = item.get("article", "")
        title = item.get("title", "")
        text = item.get("text", "")
        chunks = chunk_text(text, max_words=400, overlap_words=50)

        for idx, chunk in enumerate(chunks):
            # Include article and title context for rich semantic retrieval
            document_text = f"{article_name}: {title}\n{chunk}" if title else f"{article_name}\n{chunk}"
            all_chunks.append(document_text)
            all_metadatas.append({
                "article": article_name,
                "title": title,
                "chunk_index": idx,
                "raw_text": chunk,
            })
            all_ids.append(f"{article_name}_{idx}")

    total_chunks = len(all_chunks)
    if total_chunks == 0:
        print("No chunks found to embed.")
        return

    print(f"Loading embedding model '{MODEL_NAME}'...")
    model = SentenceTransformer(MODEL_NAME)

    batch_size = 64
    for i in range(0, total_chunks, batch_size):
        end_idx = min(i + batch_size, total_chunks)
        batch_docs = all_chunks[i:end_idx]
        batch_metas = all_metadatas[i:end_idx]
        batch_ids = all_ids[i:end_idx]

        batch_embeddings = model.encode(batch_docs, show_progress_bar=False).tolist()

        collection.add(
            ids=batch_ids,
            documents=batch_docs,
            metadatas=batch_metas,
            embeddings=batch_embeddings,
        )
        print(f"Embedded {end_idx} / {total_chunks} chunks")


if __name__ == "__main__":
    embed_and_store()
