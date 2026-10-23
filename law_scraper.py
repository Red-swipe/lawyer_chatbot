import json
import os
import re
from typing import List, Dict, Optional
from urllib.parse import urljoin
import requests
from bs4 import BeautifulSoup

BASE_URL = "https://www.pakistani.org/pakistan/constitution/"
OUTPUT_PATH = os.path.join("law_data", "constitution.json")

REQUEST_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
}


def clean_text(text: str) -> str:
    """Removes excess whitespace and normalizes text."""
    return re.sub(r"\s+", " ", text).strip()


def scrape_constitution(output_path: str = OUTPUT_PATH) -> List[Dict[str, str]]:
    """Scrapes all articles from the Pakistan Constitution and saves to json."""
    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)

    try:
        response = requests.get(BASE_URL, headers=REQUEST_HEADERS, timeout=15)
        response.raise_for_status()
    except Exception as e:
        print(f"Error connecting to Constitution index page ({BASE_URL}): {e}")
        return []

    soup = BeautifulSoup(response.text, "html.parser")
    part_urls = []
    for anchor in soup.find_all("a"):
        href = anchor.get("href", "")
        if ("part" in href or "schedules" in href) and href.endswith(".html"):
            full_url = urljoin(BASE_URL, href)
            if full_url not in part_urls:
                part_urls.append(full_url)

    articles: List[Dict[str, str]] = []
    seen_articles = set()

    for part_url in part_urls:
        try:
            part_resp = requests.get(part_url, headers=REQUEST_HEADERS, timeout=15)
            if part_resp.status_code != 200:
                continue

            part_soup = BeautifulSoup(part_resp.text, "html.parser")

            # Remove notes/footnotes/footer sections
            for heading in part_soup.find_all(["h2", "h3", "h4"]):
                if "notes" in heading.text.lower():
                    for sibling in list(heading.find_next_siblings()):
                        sibling.decompose()
                    heading.decompose()
                    break

            for row in part_soup.find_all("tr"):
                tds = row.find_all("td", recursive=False)
                if len(tds) < 2:
                    continue

                b_num = tds[0].find("b")
                if not b_num or not b_num.text.strip():
                    continue

                raw_num = b_num.text.strip().rstrip(".")
                if not re.match(r"^\d+[A-Z]?$", raw_num):
                    continue

                article_id = f"Article {raw_num}"
                if article_id in seen_articles:
                    continue

                b_title = tds[1].find("b")
                title_text = b_title.text if b_title else ""
                clean_title = clean_text(re.sub(r"[\r\n\t]+", " ", title_text)).rstrip(":").rstrip(".")

                # Copy td content and remove non-body tags
                td_copy = BeautifulSoup(str(tds[1]), "html.parser")
                for tag in td_copy.find_all(["sup", "script", "style", "noscript", "blockquote"]):
                    tag.decompose()
                if td_copy.find("b"):
                    td_copy.find("b").decompose()

                body_text = clean_text(td_copy.get_text(separator=" ", strip=True))
                if body_text:
                    seen_articles.add(article_id)
                    articles.append({
                        "article": article_id,
                        "title": clean_title,
                        "text": body_text,
                    })

        except Exception as e:
            print(f"Warning: Failed to scrape {part_url}: {e}")
            continue

    print(f"Scraped {len(articles)} articles")

    try:
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(articles, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"Error saving articles to {output_path}: {e}")

    return articles


if __name__ == "__main__":
    scrape_constitution()
