import re
import urllib.parse
import xml.etree.ElementTree as ET
import logging
from typing import Dict, Any, List, Optional
import httpx

logger = logging.getLogger(__name__)

# List of accredited international & national news organizations
ACCREDITED_SOURCES = {
    'reuters', 'associated press', 'ap', 'bbc', 'cnn', 'the guardian', 'guardian',
    'the times of india', 'times of india', 'ndtv', 'cnbc', 'bloomberg', 'the hindu',
    'indian express', 'al jazeera', 'abc news', 'cbs news', 'nbc news', 'the new york times',
    'new york times', 'the washington post', 'washington post', 'wall street journal', 'wsj',
    'who', 'world health organization', 'cdc', 'nature', 'the lancet', 'financial times', 'forbes',
    'time', 'hindustan times', 'afp', 'france 24', 'dw', 'pbs', 'npr', 'sciencealert',
    'healthbeat', 'ynetnews', 'usa today', 'the independent', 'telegraph', 'sky news',
    'india today', 'aaj tak', 'business standard', 'economic times'
}

# Recognized independent fact-checking outlets
DEBUNK_SOURCES = {
    'snopes', 'politifact', 'factcheck.org', 'afp fact check', 'factly', 'boom live',
    'alt news', 'reuters fact check', 'ap fact check', 'lead stories', 'full fact',
    'check your fact', 'vishvas news', 'the quint fact check', 'newschecker', 'smhoaxslayer'
}

# Linguistic patterns indicative of debunking / fact-checking
DEBUNK_KEYWORDS = [
    r'\bfact[\s-]?check\b', r'\bfalse claim\b', r'\bfalse\b', r'\bdebunk(ed|s)?\b',
    r'\bmyth\b', r'\bhoax\b', r'\buntrue\b', r'\bfake alert\b', r'\bfake\b',
    r'doesn\'?t\b', r'\bdid not\b', r'\bno scientific basis\b', r'\bno evidence\b',
    r'\bmisleading\b', r'\bfabricated\b', r'\bnot true\b', r'\bdisproven\b'
]

# Website UI chrome, navbars, channel branding, and portal category words that appear in screenshots
NAVBAR_AND_UI_TERMS = {
    # Portals & Brands
    'toi', 'times', 'india', 'today', 'aaj', 'tak', 'newstak', 'gnttv', 'lallantop',
    'business', 'bangla', 'malayalam', 'tamil', 'telugu', 'hindi', 'english', 'marathi',
    'gujarati', 'kannada', 'cnn', 'bbc', 'reuters', 'ani', 'pti', 'ndtv', 'hindu',
    'hindustan', 'express', 'jazeera', 'fox', 'msnbc', 'wion', 'dd',
    # Categories & Sections
    'news', 'world', 'national', 'city', 'cities', 'state', 'states', 'sports',
    'cricket', 'football', 'markets', 'economy', 'entertainment', 'bollywood',
    'hollywood', 'lifestyle', 'life', 'style', 'fashion', 'food', 'health',
    'technology', 'tech', 'gadgets', 'science', 'education', 'jobs', 'careers',
    'stories', 'photos', 'videos', 'live', 'podcasts', 'opinion', 'editorials',
    'blogs', 'trending', 'viral', 'elections', 'puzzles', 'horoscope', 'astrology',
    'auto', 'travel', 'reels', 'shorts', 'feed', 'magazine', 'epaper', 'south', 'north', 'northeast',
    'web', 'stories', 'tv', 'television',
    # UI actions & boilerplate
    'home', 'sign', 'login', 'register', 'subscribe', 'subscription', 'search', 'menu',
    'edition', 'follow', 'share', 'save', 'bookmark', 'comments', 'comment', 'advertisement',
    'sponsored', 'watch', 'read', 'preferred', 'source', 'related', 'next', 'previous',
    'back', 'view', 'click', 'image', 'photo', 'credit', 'social', 'media', 'post', 'posts',
    'top', 'ildia', 'timesoeinpwcqm', 'timesqhnpwcom', 'breaking', 'exclusive', 'alert', 'urgent',
    'shocking', 'secret', 'exposed', 'forward', 'must', 'bns', 'sections', 'section'
}

# Context, incident, and action words (used to separate events from core subject entities)
CONTEXT_AND_EVENT_WORDS = {
    'dies', 'died', 'dead', 'death', 'killed', 'kill', 'accident', 'crash', 'crashed',
    'arrested', 'arrest', 'held', 'molests', 'molested', 'assaulted', 'assault', 'rape',
    'raped', 'probe', 'investigated', 'investigation', 'outbreak', 'case', 'scam',
    'fraud', 'banned', 'ban', 'darkness', 'cure', 'cures', 'curing', 'anthem', 'plague',
    'car', 'bus', 'train', 'plane', 'truck', 'suv', 'vehicle', 'road', 'highway', 'hospital',
    'fatal', 'suicide', 'murder', 'shot', 'injured', 'damage', 'collision'
}

# Common noise words, verbs, and grammatical filler
STOP_WORDS = {
    'the', 'and', 'with', 'from', 'that', 'this', 'have', 'has', 'had', 'were', 'been', 'what',
    'will', 'says', 'said', 'about', 'know', 'their', 'there', 'they', 'here',
    'just', 'over', 'into', 'some', 'than', 'them', 'these', 'could', 'would',
    'when', 'which', 'your', 'after', 'before', 'more', 'also', 'according',
    'first', 'official', 'officially', 'confirmed', 'reveals', 'discovered', 'claiming', 'claims',
    'people', 'yesterday', 'tomorrow', 'discover', 'drinking',
    'drink', 'find', 'make', 'taken', 'take', 'come', 'came', 'goes', 'went', 'see', 'saw',
    'look', 'looked', 'get', 'got', 'give', 'gave', 'tell', 'told', 'feel', 'show', 'shown',
    'report', 'reports', 'sources', 'everyone', 'declared', 'declares', 'declaration',
    'new', 'latest', 'like', 'such', 'many', 'much', 'only', 'very', 'even', 'well',
    'away', 'mins', 'hours', 'hour', 'near', 'across', 'shock', 'under', 'for', 'who',
    'she', 'her', 'his', 'him', 'its', 'they', 'them', 'their', 'he', 'was', 'are', 'is',
    'tuesday', 'monday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
    'natural', 'causes', 'surrounded', 'family', 'home'
}


def extract_search_query(text: str, title: Optional[str] = None) -> str:
    """
    Extracts high-signal factual search keywords from text or explicit title.
    Prioritizes named subject entities + specific event actions over pronouns or UI navbar chrome.
    """
    # 1. If a substantive title is provided, use it directly as the primary query source
    if title and not re.match(r'^(image scan|quick analysis|analysis record|untitled)', title.strip(), re.I):
        title_clean = re.sub(r'https?://\S+', ' ', title)
        title_clean = re.sub(r'[^a-zA-Z0-9\s]', ' ', title_clean)
        words = title_clean.split()
        meaningful_title = [
            w for w in words
            if len(w) > 2 and w.lower() not in STOP_WORDS and w.lower() not in NAVBAR_AND_UI_TERMS
        ]
        if len(meaningful_title) >= 3:
            return ' '.join(meaningful_title[:6])

    # 2. Extract from raw text / OCR content
    cleaned = re.sub(r'https?://\S+', ' ', text)
    cleaned = re.sub(r'@\w+', ' ', cleaned)
    cleaned = re.sub(r'\b\d+\s*(h|hrs?|hours?|m|mins?|minutes?|d|days?|s|secs?|seconds?|weeks?|months?)\s*(ago)?\b', ' ', cleaned, flags=re.I)

    # Candidate discovery from lead-in patterns
    candidate = ''

    # Breadcrumb match: e.g. 'NEWS / ENTERTAINMENT / TELEVISION / Anushka Sen Dies in car Accident'
    bc_match = re.search(r'(?:news|cities|city|world|sports|india|entertainment|television)\s*/\s*[^/]+/\s*([^\n\r]+)', cleaned, re.I)
    if bc_match:
        cand_text = bc_match.group(1).strip()
        if len(cand_text.split()) >= 3:
            candidate = cand_text

    # Breaking news lead-in match: e.g. 'Breaking: Anushka Sen dies in car accident...'
    if not candidate or len(candidate.split()) < 3:
        brk_match = re.search(r'\b(?:breaking|exclusive|alert)[:\s]+([^.\n\r]+)', cleaned, re.I)
        if brk_match:
            cand_text = brk_match.group(1).strip()
            if len(cand_text.split()) >= 3:
                candidate = cand_text

    # Headline candidate with action verbs
    if not candidate or len(candidate.split()) < 3:
        action_verbs_regex = r'\b(dies|died|dead|death|killed|arrested|held|molests|molested|assaulted|accident|crashed|probe|investigated|investigation|outbreak|case|scam|fraud|banned)\b'
        chunks = re.split(r'[\n\r.]|(?:\s{2,})', cleaned)
        for c in chunks:
            c_str = c.strip()
            if len(c_str.split()) >= 4 and re.search(action_verbs_regex, c_str, re.I) and '/' not in c_str and '|' not in c_str:
                candidate = c_str
                break

    source_to_parse = candidate if candidate and len(candidate.split()) >= 3 else cleaned

    # Extract words
    words = re.sub(r'[^a-zA-Z0-9\s]', ' ', source_to_parse).split()

    filtered = []
    seen = set()
    for w in words:
        wl = w.lower()
        if len(w) > 2 and wl not in NAVBAR_AND_UI_TERMS and wl not in STOP_WORDS:
            if wl not in seen:
                seen.add(wl)
                filtered.append(w)

    # If the candidate was a pronoun clause (e.g. "She died...") or missed the subject:
    # Scan the full text for capitalized proper noun entities to pair with the action
    subject_candidates = [t for t in filtered if t.lower() not in CONTEXT_AND_EVENT_WORDS]
    if len(subject_candidates) < 1:
        all_words = re.sub(r'[^a-zA-Z0-9\s]', ' ', cleaned).split()
        capitalized_entities = [
            w for w in all_words
            if len(w) > 2 and w[0].isupper() and w.lower() not in NAVBAR_AND_UI_TERMS and w.lower() not in STOP_WORDS and w.lower() not in CONTEXT_AND_EVENT_WORDS
        ]
        # Prepend the true subject entities
        for ent in capitalized_entities[:3]:
            if ent.lower() not in seen:
                seen.add(ent.lower())
                filtered.insert(0, ent)

    # Final fallback if still too short
    if len(filtered) < 3:
        all_words = re.sub(r'[^a-zA-Z0-9\s]', ' ', cleaned).split()
        for w in all_words:
            wl = w.lower()
            if len(w) > 2 and wl not in NAVBAR_AND_UI_TERMS and wl not in STOP_WORDS:
                if wl not in seen:
                    seen.add(wl)
                    filtered.append(w)

    return ' '.join(filtered[:6])


def is_article_relevant_to_claim(query_tokens: List[str], title_lower: str) -> bool:
    """
    Ensures a returned article strictly corroborates the SPECIFIC incident and entity.
    Requires:
      1. Word-boundary match of at least one named subject entity (e.g. 'anushka', 'sen', 'kohli').
      2. Word-boundary match of at least one core event/context keyword (e.g. 'dies', 'accident', 'arrested').
    Prevents unrelated accidents (e.g. Hyderabad techie or Chandrakanth) from corroborating Anushka Sen,
    and prevents substring false-matches (e.g. 'passenger' matching 'sen').
    """
    event_tokens = [t.lower() for t in query_tokens if t.lower() in CONTEXT_AND_EVENT_WORDS]
    subject_tokens = [t.lower() for t in query_tokens if t.lower() not in CONTEXT_AND_EVENT_WORDS]

    # Strict regex word-boundary counts
    subj_matches = sum(1 for s in subject_tokens if re.search(r'\b' + re.escape(s) + r'\b', title_lower, re.I))
    event_matches = sum(1 for e in event_tokens if re.search(r'\b' + re.escape(e) + r'\b', title_lower, re.I))

    if subject_tokens and event_tokens:
        # BOTH the subject person/entity AND the incident must be present in the article title!
        return subj_matches >= 1 and event_matches >= 1
    elif subject_tokens:
        return subj_matches >= 2
    else:
        return event_matches >= 2


async def verify_claim_globally(raw_text: str, title: Optional[str] = None) -> Dict[str, Any]:
    """
    Queries Google News global RSS feed to verify whether the claim/event is
    corroborated by reputable news organizations or flagged as a hoax by fact-checkers.
    """
    query = extract_search_query(raw_text, title=title)
    query_tokens = [t.lower() for t in query.split() if len(t) > 2]

    if not query or len(query.strip()) < 5 or len(query_tokens) < 2:
        return {
            "query": query,
            "articles_found": 0,
            "accredited_count": 0,
            "status": "INSUFFICIENT_QUERY",
            "is_corroborated": False,
            "is_debunked": False,
            "references": [],
            "search_url": f"https://news.google.com/search?q={urllib.parse.quote((title or raw_text)[:60])}&hl=en-US&gl=US&ceid=US:en",
            "message": "Not enough distinctive keywords to cross-reference with international news archives."
        }

    encoded_q = urllib.parse.quote(query)
    rss_url = f"https://news.google.com/rss/search?q={encoded_q}&hl=en-US&gl=US&ceid=US:en"

    raw_items: List[Dict[str, str]] = []
    debunk_references: List[Dict[str, str]] = []
    corroborating_references: List[Dict[str, str]] = []

    try:
        async with httpx.AsyncClient(timeout=6.0, follow_redirects=True) as client:
            res = await client.get(rss_url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
            if res.status_code == 200:
                root = ET.fromstring(res.text)
                items = root.findall('.//item')

                for item in items[:15]:
                    title_elem = item.find('title')
                    link_elem = item.find('link')
                    source_elem = item.find('source')
                    pub_elem = item.find('pubDate')

                    art_title = title_elem.text.strip() if title_elem is not None and title_elem.text else ""
                    art_link = link_elem.text.strip() if link_elem is not None and link_elem.text else ""
                    art_source = source_elem.text.strip() if source_elem is not None and source_elem.text else "News Publisher"
                    art_date = pub_elem.text.strip() if pub_elem is not None and pub_elem.text else ""

                    if not art_title:
                        continue

                    raw_items.append({
                        "title": art_title,
                        "source": art_source,
                        "url": art_link,
                        "published_at": art_date
                    })
    except Exception as e:
        logger.warning(f"Global RSS verification network error: {e}")

    # Process and classify each returned article
    for art in raw_items:
        title_lower = art["title"].lower()
        source_lower = art["source"].lower()

        # 1. Check for Debunk / Fact-Check
        is_debunk = (
            any(re.search(pat, title_lower) for pat in DEBUNK_KEYWORDS) or
            any(ds in source_lower for ds in DEBUNK_SOURCES)
        )

        if is_debunk:
            debunk_references.append(art)
            continue

        # 2. Strict Subject + Event Relevance Verification
        if is_article_relevant_to_claim(query_tokens, title_lower):
            corroborating_references.append(art)

    # Determine final verification state
    if len(debunk_references) > 0:
        status = "DEBUNKED_HOAX"
        is_corroborated = False
        is_debunked = True
        references = debunk_references[:6]
        top_debunker = debunk_references[0]["source"]
        message = f"Debunked as false or misleading by independent fact-checking archives (e.g., {top_debunker})."
    elif len(corroborating_references) >= 2 or any(any(acc in r["source"].lower() for acc in ACCREDITED_SOURCES) for r in corroborating_references):
        status = "GLOBALLY_CORROBORATED"
        is_corroborated = True
        is_debunked = False
        references = corroborating_references[:6]
        top_source = references[0]["source"] if references else "Global Media"
        message = f"Found {len(corroborating_references)} corroborating reports from reputable news organizations (including {top_source})."
    elif len(corroborating_references) == 1:
        status = "MINIMAL_COVERAGE"
        is_corroborated = False
        is_debunked = False
        references = corroborating_references
        message = "Single isolated mention found. Lacks broad multi-source journalistic corroboration."
    else:
        status = "NO_GLOBAL_COVERAGE"
        is_corroborated = False
        is_debunked = False
        references = []
        message = "Zero independent news organizations or international wire services have reported this story. Strong indicator of unverified rumor or fabrication."

    accredited_count = sum(1 for r in references if any(acc in r["source"].lower() for acc in ACCREDITED_SOURCES))

    return {
        "query": query,
        "articles_found": len(references),
        "accredited_count": accredited_count,
        "status": status,
        "is_corroborated": is_corroborated,
        "is_debunked": is_debunked,
        "references": references,
        "search_url": f"https://www.google.com/search?q={encoded_q}&tbm=nws",
        "message": message
    }
