import os
import json
import logging
import urllib.parse
import xml.etree.ElementTree as ET
from typing import Dict, Any, List, Optional
import httpx
import google.generativeai as genai
from app.config import settings

logger = logging.getLogger(__name__)

import re

async def extract_claim_and_entities(text: str, title: Optional[str] = None, api_key: Optional[str] = None) -> Dict[str, Any]:
    """Uses LLM (with heuristic NLP fallback) to extract main claim, entities, and search query."""
    key_to_use = api_key or settings.GEMINI_API_KEY
    
    # 1. Attempt with Gemini if key is provided and formatted reasonably
    if key_to_use and len(key_to_use) > 15:
        try:
            genai.configure(api_key=key_to_use)
            truncated_text = text[:2000]
            prompt = f"""You are a misinformation detection AI. Extract the core claim, entities, and generate an objective search query for the following news text.
Title: {title or 'None'}
Text: {truncated_text}

Respond ONLY with valid JSON. Do not wrap in markdown (no ```json). Keys:
"main_claim": (String) A one-sentence summary of the specific event/claim.
"entities": (List of Strings) Key people, organizations, locations, dates.
"search_query": (String) 3 to 6 words maximum, factual keywords only, suitable for Google News search. Do NOT include words like "fake", "hoax", or "news".
"""
            for model_name in ["gemini-1.5-flash", "gemini-1.5-pro"]:
                try:
                    model = genai.GenerativeModel(model_name)
                    response = await model.generate_content_async(prompt)
                    raw_output = response.text.strip()
                    if raw_output.startswith("```"):
                        raw_output = raw_output.split("\n", 1)[1]
                        if raw_output.endswith("```"):
                            raw_output = raw_output.rsplit("\n", 1)[0]
                    parsed = json.loads(raw_output)
                    if parsed.get("main_claim") and parsed.get("search_query"):
                        logger.info(f"Extracted claim via {model_name}: {parsed.get('main_claim')}")
                        return parsed
                except Exception as me:
                    logger.warning(f"Model {model_name} extraction failed: {me}")
        except Exception as ge:
            logger.warning(f"Gemini configuration/extraction failed: {ge}")

    # 2. Intelligent NLP Heuristic Fallback (Runs reliably even without Gemini key)
    logger.info("Using intelligent NLP heuristic extractor for claim and search query.")
    sentences = [s.strip() for s in re.split(r'[.\n!?]+', text) if len(s.strip()) > 15]
    
    # Main claim from title or first clean sentence
    if title and len(title.strip()) > 10:
        main_claim = title.strip()
    elif sentences:
        main_claim = sentences[0]
        if len(main_claim) > 160:
            main_claim = main_claim[:157] + "..."
    else:
        main_claim = text[:120].strip()

    # Extract proper nouns (capitalized word sequences) as entities
    candidate_entities = re.findall(r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b', (title or "") + " " + text[:500])
    # Filter stopwords
    common_stops = {"The", "A", "An", "In", "On", "At", "And", "Or", "This", "That", "It", "They", "We", "He", "She", "According", "Report", "News", "Breaking", "Urgent"}
    entities = []
    for ent in candidate_entities:
        ent_clean = ent.strip()
        if ent_clean not in common_stops and len(ent_clean) > 2 and ent_clean not in entities:
            entities.append(ent_clean)
        if len(entities) >= 5:
            break

    # Build search query (4 to 6 specific, factual content keywords)
    # Never use ONLY entity names! Must include both subject entity AND the action/predicate.
    stopwords_for_query = {
        "the", "this", "that", "with", "from", "have", "been", "were", "what", "when", 
        "where", "will", "would", "could", "should", "about", "after", "before", "their", 
        "there", "which", "while", "into", "more", "most", "some", "such", "than", "then",
        "they", "them", "very", "also", "just", "said", "says", "told", "next", "week",
        "today", "yesterday", "tomorrow", "breaking", "urgent", "news", "report", "reported",
        "and", "for", "are", "was", "has", "had", "out", "all", "our", "you", "your", "who", "official",
        "according", "states", "stated", "confirms", "confirmed", "announces", "announced"
    }
    
    # Extract significant tokens from main_claim or title
    source_text = title if (title and len(title.strip()) > 10) else main_claim
    all_tokens = re.findall(r'\b[A-Za-z0-9]+\b', source_text)
    significant_tokens = [t for t in all_tokens if t.lower() not in stopwords_for_query and len(t) > 2]
    
    # Include up to 6 distinct content words representing the specific claim
    if significant_tokens:
        search_query = " ".join(significant_tokens[:6])
    else:
        search_query = source_text[:50]

    return {
        "main_claim": main_claim,
        "entities": entities,
        "search_query": search_query
    }


async def fetch_news_sources(search_query: str) -> List[Dict[str, str]]:
    """Fetches articles from Google News RSS."""
    if not search_query or len(search_query.strip()) < 2:
        return []

    encoded_q = urllib.parse.quote(search_query)
    rss_url = f"https://news.google.com/rss/search?q={encoded_q}&hl=en-US&gl=US&ceid=US:en"
    
    raw_items = []
    try:
        async with httpx.AsyncClient(timeout=6.0, follow_redirects=True) as client:
            res = await client.get(rss_url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
            if res.status_code == 200:
                root = ET.fromstring(res.text)
                items = root.findall('.//item')
                for item in items[:10]:
                    title_elem = item.find('title')
                    link_elem = item.find('link')
                    source_elem = item.find('source')
                    pub_elem = item.find('pubDate')

                    if title_elem is not None and title_elem.text:
                        raw_items.append({
                            "title": title_elem.text.strip(),
                            "url": link_elem.text.strip() if link_elem is not None and link_elem.text else "",
                            "source": source_elem.text.strip() if source_elem is not None and source_elem.text else "News Publisher",
                            "published_at": pub_elem.text.strip() if pub_elem is not None and pub_elem.text else ""
                        })
    except Exception as e:
        logger.warning(f"News fetch error: {e}")
    return raw_items


async def evaluate_evidence_with_grounding(main_claim: str, search_query: str = "", entities: Optional[List[str]] = None, api_key: Optional[str] = None) -> Dict[str, Any]:
    """Evaluates claim with Gemini Search Grounding, or live Google News corroboration fallback."""
    key_to_use = api_key or settings.GEMINI_API_KEY
    query = search_query or main_claim

    # 1. Fetch live articles from Google News RSS in parallel
    news_items = await fetch_news_sources(query)
    logger.info(f"Retrieved {len(news_items)} live Google News articles for query: '{query}'")

    # 2. Attempt Google Search Grounding with Gemini if key is valid
    if key_to_use and len(key_to_use) > 15:
        try:
            genai.configure(api_key=key_to_use)
            for m_name in ["gemini-1.5-flash", "gemini-1.5-pro"]:
                try:
                    model = genai.GenerativeModel(m_name, tools='google_search')
                    prompt = f"""You are an expert fact-checker AI with access to Google Search.
Verify this claim: "{main_claim}"

Respond ONLY with valid JSON (no markdown). Keys:
"status": Exactly "SUPPORTED", "CONTRADICTED", or "INSUFFICIENT_EVIDENCE".
"supporting_evidence": List of Strings
"contradicting_evidence": List of Strings
"consistency_score": Integer 0-100
"message": One-sentence explanation.
"sources_checked": List of Objects with "title", "url", "source".
"""
                    response = await model.generate_content_async(prompt)
                    raw = response.text.strip()
                    if raw.startswith("```"):
                        raw = raw.split("\n", 1)[1]
                        if raw.endswith("```"):
                            raw = raw.rsplit("\n", 1)[0]
                    parsed = json.loads(raw)
                    if parsed.get("status"):
                        logger.info(f"Gemini grounding verdict ({m_name}): {parsed.get('status')}")
                        return parsed
                except Exception as e:
                    logger.warning(f"Grounding with {m_name} failed: {e}")

            # If grounding tool failed, try feeding the retrieved news articles to standard Gemini
            if news_items:
                model = genai.GenerativeModel("gemini-1.5-flash")
                eval_prompt = f"""You are an expert fact-checker AI.
Verify this Main Claim: "{main_claim}"
Against these live search articles from Google News:
{json.dumps(news_items[:6])}

Respond ONLY with valid JSON. Keys:
"status": Exactly "SUPPORTED", "CONTRADICTED", or "INSUFFICIENT_EVIDENCE".
"supporting_evidence": List of Strings
"contradicting_evidence": List of Strings
"consistency_score": Integer 0-100
"message": One-sentence explanation.
"sources_checked": List of Objects with "title", "url", "source".
"""
                response = await model.generate_content_async(eval_prompt)
                raw = response.text.strip()
                if raw.startswith("```"):
                    raw = raw.split("\n", 1)[1]
                    if raw.endswith("```"):
                        raw = raw.rsplit("\n", 1)[0]
                parsed = json.loads(raw)
                if not parsed.get("sources_checked"):
                    parsed["sources_checked"] = news_items[:4]
                return parsed
        except Exception as e:
            logger.warning(f"Gemini evaluation failed: {e}")

    # 3. Intelligent Live News Corroboration (Heuristic fact-checking on retrieved real-time news)
    logger.info("Performing live journalistic corroboration analysis on retrieved web news.")
    if not news_items:
        return {
            "status": "INSUFFICIENT_EVIDENCE",
            "supporting_evidence": [],
            "contradicting_evidence": [],
            "consistency_score": 50,
            "message": "Real-time web search produced no corroborating news coverage for this claim.",
            "sources_checked": []
        }

    # 1. Debunking patterns
    debunk_pattern = re.compile(r'\b(fact[\s-]?check|debunk(ed|s)?|hoax|fake\s+news|false\s+claim|viral\s+hoax|rumou?r|untrue|fabricated|busted|myth)\b', re.I)
    debunk_items = [item for item in news_items if debunk_pattern.search(item["title"])]

    # 2. Extract salient content keywords from the claim
    stopwords = {
        "the", "this", "that", "with", "from", "have", "been", "were", "what", "when", 
        "where", "will", "would", "could", "should", "about", "after", "before", "their", 
        "there", "which", "while", "into", "more", "most", "some", "such", "than", "then",
        "they", "them", "very", "also", "just", "said", "says", "told", "next", "week",
        "today", "yesterday", "tomorrow", "breaking", "urgent", "news", "report", "confirmed",
        "confirms", "announces", "announced", "year", "month", "days", "time", "over", "and",
        "for", "are", "was", "has", "had", "out", "all", "our", "you", "your", "who", "official",
        "according", "states", "stated"
    }
    claim_words = set(re.findall(r'\b[a-z]{3,}\b', main_claim.lower())) - stopwords

    # Separate entity words from predicate/action words
    entity_words = set()
    if entities:
        for ent in entities:
            for w in re.findall(r'\b[a-z]{3,}\b', ent.lower()):
                if w not in stopwords:
                    entity_words.add(w)

    predicate_words = claim_words - entity_words
    if len(predicate_words) < 2:
        predicate_words = claim_words

    corroborating_items = []
    authoritative_sources = [
        "reuters", "associated press", "ap", "bbc", "cnn", "ndtv", "times of india", 
        "the hindu", "indian express", "hindustan times", "the guardian", "bloomberg", 
        "afp", "new york times", "washington post", "wall street journal", "al jazeera",
        "cnbc", "abc news", "cbs news", "npr", "who", "nasa"
    ]

    for item in news_items:
        title_lower = item["title"].lower()
        if debunk_pattern.search(title_lower):
            continue

        title_words = set(re.findall(r'\b[a-z]{3,}\b', title_lower)) - stopwords
        
        # Overlap with predicate/action and overlap with total claim
        overlap_predicate = predicate_words.intersection(title_words)
        overlap_total = claim_words.intersection(title_words)
        
        # STRICT CORROBORATION CRITERIA:
        # 1. An article MUST match at least 1-2 words from the unique PREDICATE/ACTION
        # 2. Total overlap must be >= 3 distinct content words AND >= 40% of the claim keywords
        # (This prevents an article merely mentioning "NASA" or "Supreme Court" from being counted as confirming the claim!)
        predicate_matched = len(overlap_predicate) >= 2 or (len(overlap_predicate) >= 1 and len(overlap_total) >= 3)
        total_matched = len(overlap_total) >= 3 and (len(overlap_total) / max(len(claim_words), 1)) >= 0.40

        if predicate_matched and total_matched:
            is_auth = any(auth in item.get("source", "").lower() for auth in authoritative_sources)
            corroborating_items.append({
                **item,
                "overlap_count": len(overlap_total),
                "is_auth": is_auth
            })

    # If fact-check debunks were retrieved:
    if debunk_items:
        return {
            "status": "CONTRADICTED",
            "supporting_evidence": [],
            "contradicting_evidence": [f"{item['source']}: {item['title']}" for item in debunk_items[:4]],
            "consistency_score": 15,
            "message": f"Contradicted and debunked by fact-checking reports ({debunk_items[0]['source']}).",
            "sources_checked": debunk_items[:4]
        }

    # If and ONLY IF genuine corroborating articles actually match the claim content:
    auth_corroborated = [it for it in corroborating_items if it.get("is_auth")]
    if len(auth_corroborated) >= 1 or len(corroborating_items) >= 2:
        top_sources = (auth_corroborated + [it for it in corroborating_items if not it.get("is_auth")])[:5]
        publisher_names = ", ".join(list(dict.fromkeys([item["source"] for item in top_sources[:3]])))
        return {
            "status": "SUPPORTED",
            "supporting_evidence": [f"{item['source']}: {item['title']}" for item in top_sources],
            "contradicting_evidence": [],
            "consistency_score": 88,
            "message": f"Corroborated by active reporting across recognized news media ({publisher_names}).",
            "sources_checked": top_sources
        }

    # If articles were returned but NONE actually corroborated the claim:
    return {
        "status": "INSUFFICIENT_EVIDENCE",
        "supporting_evidence": [],
        "contradicting_evidence": [],
        "consistency_score": 50,
        "message": "Web search returned general news, but no reliable source reports or corroborates this specific claim.",
        "sources_checked": news_items[:3]
    }


async def verify_claim_with_evidence(text: str, title: Optional[str] = None, api_key: Optional[str] = None) -> Dict[str, Any]:
    """End-to-end evidence verification pipeline."""
    logger.info("Starting evidence verification pipeline.")
    logger.info(f"Input text (truncated): {text[:100]}...")

    # 1 & 2: Extract claim and entities
    extracted = await extract_claim_and_entities(text, title, api_key)
    main_claim = extracted.get("main_claim", "")
    entities = extracted.get("entities", [])
    search_query = extracted.get("search_query", "")

    # 3, 4, 5, 6, 7: Evaluate evidence using Google Search Grounding or retrieved live sources with entity separation
    evaluation = await evaluate_evidence_with_grounding(main_claim, search_query=search_query, entities=entities, api_key=api_key)

    sources_checked = evaluation.get("sources_checked", [])
    if not sources_checked and search_query:
        sources_checked = await fetch_news_sources(search_query)

    return {
        "extracted_claim": main_claim,
        "entities": entities,
        "search_query": search_query,
        "sources_checked": sources_checked,
        "status": evaluation.get("status", "INSUFFICIENT_EVIDENCE"),
        "supporting_evidence": evaluation.get("supporting_evidence", []),
        "contradicting_evidence": evaluation.get("contradicting_evidence", []),
        "consistency_score": evaluation.get("consistency_score", 50),
        "message": evaluation.get("message", "Could not verify.")
    }
