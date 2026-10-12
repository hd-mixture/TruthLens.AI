import io
import re
from typing import Dict, Any, Optional
import httpx
from bs4 import BeautifulSoup
import pypdf

# Common User-Agent header for fetching public news articles
HTTP_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36 TruthLens/1.0"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}


def extract_text_from_pdf_bytes(pdf_bytes: bytes) -> Dict[str, Any]:
    """
    Extracts text from a PDF byte buffer using pypdf.
    Returns extracted text, page count, and metadata.
    """
    try:
        reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
        num_pages = len(reader.pages)
        if num_pages == 0:
            return {
                "success": False,
                "text": "",
                "page_count": 0,
                "error": "The uploaded PDF document contains no pages."
            }

        extracted_pages = []
        for i, page in enumerate(reader.pages):
            page_text = page.extract_text() or ""
            if page_text.strip():
                extracted_pages.append(f"--- [Page {i + 1}] ---\n{page_text.strip()}")

        full_text = "\n\n".join(extracted_pages).strip()

        if not full_text:
            return {
                "success": False,
                "text": "",
                "page_count": num_pages,
                "error": "No readable text found in PDF. The document may be scanned or image-only."
            }

        return {
            "success": True,
            "text": full_text,
            "page_count": num_pages,
            "error": None
        }
    except Exception as e:
        return {
            "success": False,
            "text": "",
            "page_count": 0,
            "error": f"Failed to parse PDF document: {str(e)}"
        }


async def extract_text_from_url(url: str) -> Dict[str, Any]:
    """
    Fetches article content from a URL, removes scripts/ads,
    and extracts title, meta description, and primary article paragraphs.
    """
    # Basic URL sanitation
    url = url.strip()
    if not url.startswith(("http://", "https://")):
        url = "https://" + url

    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True, headers=HTTP_HEADERS) as client:
            response = await client.get(url)
            if response.status_code >= 400:
                return {
                    "success": False,
                    "title": "",
                    "text": "",
                    "error": f"HTTP request failed with status code {response.status_code}."
                }
            html_content = response.text
    except httpx.TimeoutException:
        return {
            "success": False,
            "title": "",
            "text": "",
            "error": "Connection timed out while fetching article from URL."
        }
    except Exception as e:
        return {
            "success": False,
            "title": "",
            "text": "",
            "error": f"Network error fetching article: {str(e)}"
        }

    try:
        soup = BeautifulSoup(html_content, "html.parser")

        # Remove script, style, header, footer, nav, and iframe elements
        for element in soup(["script", "style", "nav", "footer", "header", "noscript", "aside", "form"]):
            element.decompose()

        # Extract title
        title = ""
        if soup.title and soup.title.string:
            title = soup.title.string.strip()
        elif soup.find("h1"):
            title = soup.find("h1").get_text().strip()

        # Try to find article container
        article_elem = soup.find("article") or soup.find("main") or soup.find(class_=re.compile(r"article|post-content|story-body|entry-content", re.I))

        target_container = article_elem if article_elem else soup.body

        if not target_container:
            return {
                "success": False,
                "title": title,
                "text": "",
                "error": "Unable to extract main content body from page."
            }

        # Extract text from paragraphs
        paragraphs = target_container.find_all("p")
        cleaned_paragraphs = []
        for p in paragraphs:
            text = p.get_text().strip()
            # Exclude short snippet boilerplate like 'Subscribe now', 'Follow us on X'
            if len(text) > 35 and not re.search(r"cookie|subscription|all rights reserved|terms of service", text, re.I):
                cleaned_paragraphs.append(text)

        extracted_text = "\n\n".join(cleaned_paragraphs)

        # Fallback if few paragraphs found
        if len(extracted_text) < 100:
            raw_text = target_container.get_text(separator="\n").strip()
            lines = [line.strip() for line in raw_text.splitlines() if len(line.strip()) > 30]
            extracted_text = "\n\n".join(lines[:30])

        if not extracted_text:
            return {
                "success": False,
                "title": title,
                "text": "",
                "error": "No meaningful article text could be parsed from the webpage."
            }

        final_content = f"{title}\n\n{extracted_text}" if title and not extracted_text.startswith(title) else extracted_text

        return {
            "success": True,
            "title": title,
            "text": final_content,
            "error": None,
            "url": url
        }
    except Exception as e:
        return {
            "success": False,
            "title": "",
            "text": "",
            "error": f"Error parsing HTML content: {str(e)}"
        }
