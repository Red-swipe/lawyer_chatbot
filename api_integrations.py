from datetime import datetime
import xml.etree.ElementTree as ET
import requests


def get_current_time() -> str:
    """Returns the current local time formatted as '10:34 PM'."""
    now = datetime.now()
    formatted = now.strftime("%I:%M %p")
    return formatted[1:] if formatted.startswith("0") else formatted


def get_current_date() -> str:
    """Returns the current date formatted as 'October 23, 2026'."""
    now = datetime.now()
    return f"{now.strftime('%B')} {now.day}, {now.year}"


def get_news(query: str = "pakistan") -> str:
    """Returns a short news summary (1-2 sentences) related to query using a free no-auth feed."""
    search_query = query.strip() if query and query.strip() else "pakistan"
    url = f"https://news.google.com/rss/search?q={requests.utils.quote(search_query)}&hl=en-PK&gl=PK&ceid=PK:en"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }

    try:
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code == 200:
            root = ET.fromstring(response.content)
            items = root.findall(".//item")
            headlines = []
            for item in items[:2]:
                title_elem = item.find("title")
                if title_elem is not None and title_elem.text:
                    headlines.append(title_elem.text.strip())

            if len(headlines) == 1:
                return f"Top news regarding {search_query}: {headlines[0]}."
            elif len(headlines) >= 2:
                return f"Top news regarding {search_query}: {headlines[0]}. In related news: {headlines[1]}."

        return f"No recent news found for '{search_query}'."
    except Exception as e:
        return f"Could not retrieve news at this time: {e}"


def is_law_question(user_input: str) -> bool:
    """Returns True if input mentions law/legal/constitution/article/rights, else False."""
    keywords = ["law", "legal", "constitution", "article", "fundamental right", "right"]
    lowered = user_input.lower()
    return any(keyword in lowered for keyword in keywords)
