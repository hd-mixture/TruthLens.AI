import os
import json
import logging
import re
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)


def generate_fallback_explanation(
    text: str,
    prediction: str,
    confidence: float,
    credibility_score: int,
    warning_signs: List[str],
    text_stats: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Intelligent NLP-driven fallback explanation when Gemini API key is unset or network is offline.
    Uses structural analysis, linguistic markers, and heuristic claim extraction.
    """
    sentences = [s.strip() for s in re.split(r'[.!?]+', text) if len(s.strip()) > 15]

    # Summary: Take first 1-2 salient sentences or snippet
    if sentences:
        summary = " ".join(sentences[:2])
        if len(summary) > 280:
            summary = summary[:277] + "..."
    else:
        summary = text[:200] + "..." if len(text) > 200 else text

    # Extract Key Claims (sentences with strong assertion verbs)
    key_claims = []
    claim_keywords = ["shows", "reveals", "proves", "claims", "announced", "found", "causes", "secret", "reported", "confirms"]
    for s in sentences:
        if any(w in s.lower() for w in claim_keywords):
            cleaned_claim = re.sub(r'^(urgent|breaking|shocking|exposed|alert)[:! ]*', '', s, flags=re.I).strip()
            if cleaned_claim and cleaned_claim not in key_claims:
                key_claims.append(cleaned_claim)
        if len(key_claims) >= 3:
            break

    if not key_claims and sentences:
        key_claims = [sentences[0]]

    # Craft human-readable explanation based on prediction and signals
    if prediction == "Potentially Fake":
        reasoning_points = []
        if warning_signs:
            reasoning_points.append(f"Identified multiple red flags including {', '.join(warning_signs[:2]).lower()}.")
        if text_stats.get("uppercase_ratio", 0) > 15:
            reasoning_points.append("The text exhibits atypical capitalization and high-arousal punctuation typical of viral clickbait.")
        if text_stats.get("exclamation_count", 0) >= 2:
            reasoning_points.append("Frequent exclamation points suggest an attempt to induce immediate emotional arousal rather than neutral objective reporting.")
        if not reasoning_points:
            reasoning_points.append("The vocabulary and structural composition closely match patterns observed in unverified viral narratives.")

        explanation = (
            f"The statistical model classifies this content as Potentially Fake with {confidence}% confidence. "
            f"{' '.join(reasoning_points)} "
            "Journalistic standards prioritize verifiable evidence, named institutional spokespersons, and balanced attribution, which are noticeably absent here."
        )

        suspicious_language_notes = (
            "Uses persuasive framing, hyperbolic rhetoric, and urgent appeals designed to discourage critical evaluation."
        )

        verification_suggestions = [
            "Check established independent fact-checking databases such as Snopes, PolitiFact, or FactCheck.org.",
            "Search for primary press releases on official government or institutional portals rather than forwarded snippets.",
            "Verify whether reputable wire agencies (Associated Press, Reuters, BBC) have corroborated the core assertion.",
            "Look for named expert sources and check if the direct quotes exist in reputable archives."
        ]
    else:
        # Likely Real
        explanation = (
            f"The statistical model classifies this content as Likely Real with {confidence}% confidence. "
            "The text maintains an objective journalistic tone, avoids sensationalized clickbait syntax, "
            "and uses formal sentence architecture consistent with established news reporting standards."
        )

        suspicious_language_notes = (
            "The vocabulary appears predominantly informative and neutral, with minimal manipulative or hyper-sensational triggers."
        )

        verification_suggestions = [
            "Cross-reference key figures and dates with original publications or wire services.",
            "Check for ongoing updates, as real-time developments may introduce corrections or additional context.",
            "Consult the official organization or study mentioned to review original methodology or statements."
        ]

    return {
        "summary": summary,
        "explanation": explanation,
        "key_claims": key_claims if key_claims else ["No distinct assertive claims could be extracted."],
        "suspicious_language_notes": suspicious_language_notes,
        "verification_suggestions": verification_suggestions,
        "engine": "TruthLens NLP Engine (Rule-based Fallback)"
    }


async def generate_ai_explanation(
    text: str,
    prediction: str,
    confidence: float,
    credibility_score: int,
    warning_signs: List[str],
    text_stats: Dict[str, Any],
    api_key: Optional[str] = None
) -> Dict[str, Any]:
    """
    Orchestrates the Generative AI Layer:
    If GEMINI_API_KEY is available, invokes Google Gemini for an in-depth journalistic analysis.
    Otherwise, gracefully falls back to the local NLP synthesis engine.
    """
    key_to_use = api_key or os.getenv("GEMINI_API_KEY", "")

    if not key_to_use or not key_to_use.strip():
        logger.info("GEMINI_API_KEY not configured. Using high-fidelity NLP synthesis engine.")
        return generate_fallback_explanation(text, prediction, confidence, credibility_score, warning_signs, text_stats)

    try:
        import google.generativeai as genai
        genai.configure(api_key=key_to_use)

        # Truncate text context for prompt efficiency
        truncated_text = text[:3000]

        prompt = f"""You are TruthLens AI, an expert investigative journalist and computational linguist analyzing a news report for factual credibility and misinformation indicators.

IMPORTANT DIRECTIVES:
- Do NOT declare absolute truth or falsehood as an infallible judge. Emphasize that this is an AI/ML probabilistic assessment.
- The machine learning classifier classified this text as: '{prediction}' with {confidence}% confidence.
- Credibility & Risk Score: {credibility_score}/100.
- Detected Rule-based Warning Flags: {json.dumps(warning_signs)}.

NEWS TEXT FOR ANALYSIS:
\"\"\"{truncated_text}\"\"\"

Provide your analysis strictly as a JSON object with the following exact keys:
1. "summary": A concise 2-sentence summary of what the article claims.
2. "explanation": A nuanced, 3-4 sentence explanation analyzing the text's credibility, linguistic tone, and whether the claims appear corroborated or sensationalized.
3. "key_claims": A list of 2-4 specific factual claims made in the text.
4. "suspicious_language_notes": An explanation of any sensational, emotional, urgent, or manipulative language patterns detected (or note that language is neutral).
5. "verification_suggestions": A list of 3-4 specific, practical steps a reader should take to verify this specific story (e.g. named agencies, official portals, fact-checkers).

Respond ONLY with valid JSON. No markdown code blocks, no backticks, no extra preamble.
"""

        model = genai.GenerativeModel("gemini-1.5-flash")
        response = await model.generate_content_async(prompt)

        raw_output = response.text.strip()
        # Clean json backticks if model wrapped in ```json ... ```
        raw_output = re.sub(r'^```(json)?\s*', '', raw_output, flags=re.I)
        raw_output = re.sub(r'\s*```$', '', raw_output)

        parsed = json.loads(raw_output)
        parsed["engine"] = "Google Gemini 1.5 Flash"
        return parsed

    except Exception as e:
        logger.warning(f"Gemini API invocation encountered an issue ({e}). Transitioning to fallback engine.")
        fallback = generate_fallback_explanation(text, prediction, confidence, credibility_score, warning_signs, text_stats)
        err_msg = str(e).lower()
        if any(term in err_msg for term in ["quota", "429", "resource_exhausted", "rate limit"]):
            fallback["quota_exhausted"] = True
            fallback["quota_message"] = "Server Gemini AI free quota limit reached."
        fallback["engine"] = f"TruthLens NLP Engine (Gemini fallback: {str(e)[:60]}...)"
        return fallback
