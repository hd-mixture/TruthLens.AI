import re
from typing import Dict, Any, List, Optional

# Lexicons for heuristic indicators
CLICKBAIT_PATTERNS = [
    r"\byou won'?t believe\b",
    r"\bshocking truth\b",
    r"\bsecret revealed\b",
    r"\bmiracle cure\b",
    r"\bthey don'?t want you to know\b",
    r"\bbanned from tv\b",
    r"\bmainstream media won'?t tell\b",
    r"\bmind-?blowing\b",
    r"\bhidden agenda\b",
    r"\bsecret conspiracy\b",
    r"\bunbelievable discovery\b",
    r"\b100% guaranteed\b",
    r"\bwhat happened next will\b",
    r"\beverything you know is wrong\b",
    r"\bexposed:\b",
    r"\bbombshell report\b",
    r"\bwake up people\b",
    r"\bdeep state\b"
]

URGENCY_PATTERNS = [
    r"\bshare before (it'?s )?deleted\b",
    r"\bforward (this )?to everyone\b",
    r"\bforward to (all )?your groups\b",
    r"\burgent alert\b",
    r"\bpass this along\b",
    r"\bact now\b",
    r"\bviral alert\b",
    r"\bbefore it gets taken down\b",
    r"\bwarning to all citizens\b",
    r"\bemergency broadcast\b",
    r"\bdon'?t ignore this\b"
]

EMOTIONAL_PATTERNS = [
    r"\bhorrific\b",
    r"\bterrifying\b",
    r"\bdisgusting\b",
    r"\boutrageous\b",
    r"\bmonstrous\b",
    r"\bdestroy our country\b",
    r"\bevil plot\b",
    r"\bfurious\b",
    r"\bslaughter\b",
    r"\bhell on earth\b",
    r"\bheartbreaking tragedy\b"
]

ATTRIBUTION_PATTERNS = [
    r"\baccording to\b",
    r"\breported by\b",
    r"\bspokesperson (said|stated|confirmed)\b",
    r"\bofficial statement\b",
    r"\bstudy published in\b",
    r"\bdepartment of\b",
    r"\bministry of\b",
    r"\buniversity researchers\b",
    r"\bassociated press\b",
    r"\breuters\b",
    r"\bpeer-?reviewed\b",
    r"\bclinical trial\b",
    r"\bdata from\b",
    # Mainstream verified journalistic organizations & public health authorities
    r"\bcnn\b",
    r"\bndtv\b",
    r"\bthe guardian\b|\bguardian\b",
    r"\btimes of india\b|\btoi\b",
    r"\bbbc( news)?\b",
    r"\bwho\b|\bworld health organization\b|\btells who\b|\bwho says\b",
    r"\bthe hindu\b",
    r"\bindian express\b",
    r"\bhindustan times\b",
    r"\bbloomberg\b",
    r"\bafp\b|\bagence france-presse\b",
    r"\bnew york times\b|\bnyt\b",
    r"\bwashington post\b",
    r"\bwall street journal\b|\bwsj\b",
    r"\bal jazeera\b",
    r"\bcnbc\b",
    r"\babc news\b",
    r"\bcbs news\b",
    r"\bfinancial times\b",
    r"\bnpr\b",
    r"\bcdc\b"
]


def evaluate_credibility(
    raw_text: str,
    ml_prediction: str,
    ml_confidence: float,
    ocr_confidence: Optional[float] = None,
    input_type: str = "text"
) -> Dict[str, Any]:
    """
    Computes a multi-factor Credibility & Risk Score (0 - 100).
    A higher score represents higher journalistic credibility / reliability.
    A lower score represents higher risk of disinformation / sensationalism.
    """
    text_lower = raw_text.lower() if raw_text else ""
    warning_signs: List[str] = []
    positive_indicators: List[str] = []
    factors: List[Dict[str, Any]] = []

    # 1. Base Score derived from ML Classifier (Weight: 45 points)
    # ml_confidence is expected 0.0 to 1.0 (or 0-100)
    conf_norm = ml_confidence if ml_confidence <= 1.0 else ml_confidence / 100.0

    if ml_prediction == "Likely Real":
        ml_points = round(20 + 25 * conf_norm, 1)
        factors.append({
            "name": "Machine Learning Model",
            "score": ml_points,
            "max": 45,
            "status": "pass",
            "description": f"Statistical text classification predicted 'Likely Real' with {round(conf_norm * 100, 1)}% confidence."
        })
        positive_indicators.append("Pattern matching aligns with verified journalistic reporting styles.")
    else:
        # Potentially Fake
        ml_points = round(max(0, 20 - (20 * conf_norm)), 1)
        factors.append({
            "name": "Machine Learning Model",
            "score": ml_points,
            "max": 45,
            "status": "danger",
            "description": f"TF-IDF model classified patterns as 'Potentially Fake' with {round(conf_norm * 100, 1)}% confidence."
        })
        warning_signs.append("Text structure and vocabulary match known misinformation patterns.")

    # 2. Sensationalism & Clickbait detection (Weight: 15 points)
    detected_clickbait = [p for p in CLICKBAIT_PATTERNS if re.search(p, text_lower)]
    if len(detected_clickbait) == 0:
        clickbait_points = 15
        factors.append({
            "name": "Headline & Language Tone",
            "score": 15,
            "max": 15,
            "status": "pass",
            "description": "No exaggerated clickbait or sensational buzzwords detected."
        })
    elif len(detected_clickbait) == 1:
        clickbait_points = 7
        warning_signs.append("Mild sensational language detected ('" + detected_clickbait[0].replace(r"\b", "") + "').")
        factors.append({
            "name": "Headline & Language Tone",
            "score": 7,
            "max": 15,
            "status": "warning",
            "description": "Contains mildly sensational rhetoric or clickbait phrasing."
        })
    else:
        clickbait_points = 2
        warning_signs.append(f"High concentration of clickbait phrasing ({len(detected_clickbait)} triggers found).")
        factors.append({
            "name": "Headline & Language Tone",
            "score": 2,
            "max": 15,
            "status": "danger",
            "description": "Sensationalized claims designed to provoke shock without context."
        })

    # 3. Urgency & Viral Forwarding Cues (Weight: 10 points)
    detected_urgency = [p for p in URGENCY_PATTERNS if re.search(p, text_lower)]
    if len(detected_urgency) == 0:
        urgency_points = 10
        factors.append({
            "name": "Urgency & Call-to-Action",
            "score": 10,
            "max": 10,
            "status": "pass",
            "description": "No artificial urgency or viral forwarding mandates detected."
        })
    else:
        urgency_points = 0
        warning_signs.append("Artificial urgency / viral forward prompt detected (e.g., 'Share before deleted').")
        factors.append({
            "name": "Urgency & Call-to-Action",
            "score": 0,
            "max": 10,
            "status": "danger",
            "description": "Text urges immediate forwarding or warns of imminent censorship."
        })

    # 4. Source Attribution & Direct Quotations (Weight: 15 points)
    detected_attribution = [p for p in ATTRIBUTION_PATTERNS if re.search(p, text_lower)]
    quote_matches = re.findall(r'["\u201c\u201d\'].{15,150}["\u201c\u201d\']', raw_text)

    attr_score = 0
    if len(detected_attribution) >= 2 or (len(detected_attribution) >= 1 and len(quote_matches) >= 1):
        attr_score = 15
        positive_indicators.append("Contains direct attributions, institutional citations, or verifiable quotes.")
        factors.append({
            "name": "Sources & Attribution",
            "score": 15,
            "max": 15,
            "status": "pass",
            "description": "Explicit references to institutions, spokespersons, or official bodies."
        })
    elif len(detected_attribution) == 1 or len(quote_matches) >= 1:
        attr_score = 9
        factors.append({
            "name": "Sources & Attribution",
            "score": 9,
            "max": 15,
            "status": "warning",
            "description": "Limited source attribution; claims are only partially referenced."
        })
    else:
        attr_score = 2
        warning_signs.append("Missing primary source attribution or independent verification references.")
        factors.append({
            "name": "Sources & Attribution",
            "score": 2,
            "max": 15,
            "status": "danger",
            "description": "No verifiable citations, official data, or named institutions cited."
        })

    # 5. Emotional Manipulation & Fearmongering (Weight: 10 points)
    detected_emotional = [p for p in EMOTIONAL_PATTERNS if re.search(p, text_lower)]
    if len(detected_emotional) == 0:
        emotional_points = 10
        factors.append({
            "name": "Emotional Neutrality",
            "score": 10,
            "max": 10,
            "status": "pass",
            "description": "Maintains largely neutral, objective news tone."
        })
    else:
        emotional_points = max(0, 10 - (len(detected_emotional) * 4))
        warning_signs.append(f"Emotionally charged or inflammatory vocabulary detected ({len(detected_emotional)} triggers).")
        factors.append({
            "name": "Emotional Neutrality",
            "score": emotional_points,
            "max": 10,
            "status": "warning" if emotional_points >= 5 else "danger",
            "description": "Uses provocative wording intended to trigger strong emotional reactions."
        })

    # 6. Formatting & Typography Norms (Weight: 5 points)
    letters = [c for c in raw_text if c.isalpha()]
    caps_ratio = len([c for c in letters if c.isupper()]) / max(len(letters), 1)
    exclamations = raw_text.count("!")

    formatting_points = 5
    if caps_ratio > 0.35 and len(raw_text) > 40:
        formatting_points -= 3
        warning_signs.append(f"Excessive capitalization ({round(caps_ratio * 100)}% uppercase letters).")
    if exclamations >= 3:
        formatting_points -= 2
        warning_signs.append(f"Excessive exclamation marks ({exclamations} occurrences).")

    formatting_points = max(0, formatting_points)
    factors.append({
        "name": "Typography & Formatting",
        "score": formatting_points,
        "max": 5,
        "status": "pass" if formatting_points == 5 else ("warning" if formatting_points >= 3 else "danger"),
        "description": "Standard capitalization and punctuation conventions observed." if formatting_points == 5 else "Unusual capitalization or punctuation abuse."
    })

    # Calculate preliminary total
    total_score = round(ml_points + clickbait_points + urgency_points + attr_score + emotional_points + formatting_points)

    # 7. OCR Confidence impact (if input is image/screenshot)
    ocr_factor_note = None
    if ocr_confidence is not None and input_type in ["image", "clipboard"]:
        if ocr_confidence < 45.0:
            total_score = max(5, total_score - 10)
            warning_signs.append(f"Low OCR Extraction Confidence ({round(ocr_confidence, 1)}%). Some text may have been misrecognized.")
            ocr_factor_note = "Low OCR confidence may introduce typographical noise into the text analysis."
            factors.append({
                "name": "Image OCR Quality",
                "score": round(ocr_confidence / 10, 1),
                "max": 10,
                "status": "warning",
                "description": f"OCR clarity is low ({round(ocr_confidence, 1)}%). Extracted text should be reviewed carefully."
            })
        else:
            factors.append({
                "name": "Image OCR Quality",
                "score": 10,
                "max": 10,
                "status": "pass",
                "description": f"High OCR confidence ({round(ocr_confidence, 1)}%). Text recognition was clear."
            })

    # Clamp total score to 0 - 100
    final_score = max(0, min(100, total_score))

    # Categorize Risk Level
    if final_score >= 75:
        risk_level = "Low Risk (High Credibility)"
    elif final_score >= 50:
        risk_level = "Moderate Risk (Needs Caution)"
    elif final_score >= 30:
        risk_level = "High Risk (Likely Misleading)"
    else:
        risk_level = "Critical Risk (Severe Red Flags)"

    # Default positive indicator if list is empty
    if not positive_indicators and final_score >= 50:
        positive_indicators.append("No overt deceptive framing or extreme viral manipulation detected.")

    return {
        "credibility_score": final_score,
        "risk_level": risk_level,
        "warning_signs": warning_signs,
        "positive_indicators": positive_indicators,
        "factors": factors,
        "ocr_note": ocr_factor_note
    }
