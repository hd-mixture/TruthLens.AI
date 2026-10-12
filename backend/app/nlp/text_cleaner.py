import re
import string
from typing import Dict, Any, List

# Standard English stop words list (crafted to preserve crucial factual modifiers like 'not', 'no', 'never', 'against')
BASIC_STOP_WORDS = {
    'a', 'about', 'above', 'after', 'again', 'all', 'am', 'an', 'and', 'any', 'are', 'as', 'at',
    'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
    'did', 'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'for', 'from', 'further',
    'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his',
    'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'just', 'me', 'more', 'most', 'my',
    'myself', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'our', 'ours', 'ourselves', 'out',
    'over', 'own', 'same', 'she', 'should', 'so', 'some', 'such', 'than', 'that', 'the', 'their',
    'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they', 'this', 'those', 'through',
    'to', 'too', 'under', 'until', 'up', 'very', 'was', 'we', 'were', 'what', 'when', 'where',
    'which', 'while', 'who', 'whom', 'why', 'with', 'you', 'your', 'yours', 'yourself', 'yourselves',
    # Temporal / UI metadata words that appear in news feeds (e.g. '2 hours ago', '30 minutes ago')
    'hours', 'minutes', 'seconds', 'ago', 'hour', 'minute', 'second', 'days', 'weeks'
}


def clean_text_for_ml(text: str) -> str:
    """
    Standard preprocessing pipeline for ML TF-IDF vectorization:
    - Lowercase
    - Remove URLs, HTML tags, email addresses
    - Normalize whitespace and punctuation
    - Preserve meaningful tokens
    """
    if not text or not isinstance(text, str):
        return ""

    # Convert to lowercase
    cleaned = text.lower()

    # Remove URLs
    cleaned = re.sub(r'https?://\S+|www\.\S+', ' ', cleaned)

    # Remove HTML markup
    cleaned = re.sub(r'<.*?>+', ' ', cleaned)

    # Remove email addresses
    cleaned = re.sub(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', ' ', cleaned)

    # Remove non-alphanumeric except basic spacing
    cleaned = re.sub(r'[^a-zA-Z\s]', ' ', cleaned)

    # Tokenize and remove stop words (preserving words with length > 2)
    tokens = cleaned.split()
    tokens = [t for t in tokens if t not in BASIC_STOP_WORDS and len(t) > 2]

    return " ".join(tokens)


def analyze_text_characteristics(text: str) -> Dict[str, Any]:
    """
    Computes linguistic metrics useful for credibility and warning flags:
    - All-caps ratio (hallmark of sensationalism)
    - Exclamation and question mark densities
    - Word, character, and sentence counts
    """
    if not text:
        return {
            "char_count": 0,
            "word_count": 0,
            "sentence_count": 0,
            "uppercase_ratio": 0.0,
            "exclamation_count": 0,
            "question_count": 0,
            "avg_word_length": 0.0
        }

    raw_words = text.split()
    word_count = len(raw_words)
    char_count = len(text)

    # Uppercase analysis (excluding numbers/punct)
    letters = [c for c in text if c.isalpha()]
    uppercase_letters = [c for c in letters if c.isupper()]
    uppercase_ratio = len(uppercase_letters) / max(len(letters), 1)

    exclamation_count = text.count("!")
    question_count = text.count("?")

    # Simple sentence count approximation
    sentences = re.split(r'[.!?]+', text)
    sentence_count = len([s for s in sentences if s.strip()])

    avg_word_length = sum(len(w) for w in raw_words) / max(word_count, 1)

    return {
        "char_count": char_count,
        "word_count": word_count,
        "sentence_count": sentence_count,
        "uppercase_ratio": round(uppercase_ratio * 100, 1),
        "exclamation_count": exclamation_count,
        "question_count": question_count,
        "avg_word_length": round(avg_word_length, 1)
    }
