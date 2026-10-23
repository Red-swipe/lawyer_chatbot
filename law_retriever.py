import os
from typing import List, Dict, Optional
import chromadb
from sentence_transformers import SentenceTransformer

DEFAULT_CHROMA_DIR = os.path.join("law_data", "chroma_db")
DEFAULT_COLLECTION = "pakistan_constitution"
DEFAULT_MODEL = "all-MiniLM-L6-v2"


class LawRetriever:
    """Retrieves relevant Pakistani constitutional articles from ChromaDB."""

    def __init__(
        self,
        chroma_dir: str = DEFAULT_CHROMA_DIR,
        collection_name: str = DEFAULT_COLLECTION,
        model_name: str = DEFAULT_MODEL,
    ) -> None:
        self.chroma_dir = chroma_dir
        self.collection_name = collection_name
        self.model_name = model_name
        self._model: Optional[SentenceTransformer] = None
        self._collection = None
        self._init_collection()

    def _init_collection(self) -> None:
        """Initializes ChromaDB collection."""
        try:
            if os.path.exists(self.chroma_dir):
                client = chromadb.PersistentClient(path=self.chroma_dir)
                self._collection = client.get_or_create_collection(name=self.collection_name)
        except Exception as e:
            self._collection = None

    @property
    def model(self) -> SentenceTransformer:
        """Lazy loader for sentence transformer model."""
        if self._model is None:
            self._model = SentenceTransformer(self.model_name)
        return self._model

    def is_available(self) -> bool:
        """Returns True if chroma collection has data, False if empty or uninitialized."""
        try:
            if self._collection is None:
                self._init_collection()
            if self._collection is not None:
                return self._collection.count() > 0
            return False
        except Exception:
            return False

    def query(self, user_question: str, top_k: int = 3) -> List[Dict[str, str]]:
        """Queries the vector database and returns top 3 most relevant chunks."""
        if not self.is_available() or self._collection is None:
            return []

        try:
            query_embedding = self.model.encode(user_question, show_progress_bar=False).tolist()
            results = self._collection.query(
                query_embeddings=[query_embedding],
                n_results=top_k,
            )

            hits: List[Dict[str, str]] = []
            if results and results.get("documents") and results["documents"]:
                docs = results["documents"][0]
                metas = results["metadatas"][0] if results.get("metadatas") else []

                for i, doc in enumerate(docs):
                    meta = metas[i] if i < len(metas) else {}
                    article = meta.get("article", "")
                    title = meta.get("title", "")
                    text = meta.get("raw_text") or doc

                    hits.append({
                        "article": article,
                        "title": title,
                        "text": text,
                    })
            return hits
        except Exception as e:
            print(f"Error querying legal vector database: {e}")
            return []
