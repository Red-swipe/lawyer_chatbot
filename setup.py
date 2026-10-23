import sys
from law_scraper import scrape_constitution
from law_embedder import embed_and_store


def main() -> None:
    print("=== Step 1: Scraping Pakistan Constitution ===")
    scrape_constitution()

    print("\n=== Step 2: Embedding and Storing in ChromaDB ===")
    embed_and_store()

    print("\nSolon law knowledge base ready")


if __name__ == "__main__":
    main()
