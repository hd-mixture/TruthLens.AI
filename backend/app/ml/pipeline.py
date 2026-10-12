import os
import json
import logging
from pathlib import Path
from typing import Dict, Any, Optional
import joblib

from app.config import MODEL_DIR
from app.nlp.text_cleaner import clean_text_for_ml, analyze_text_characteristics

logger = logging.getLogger(__name__)

_model = None
_vectorizer = None
_metrics = None


def load_ml_assets():
    """
    Loads saved model, vectorizer, and evaluation metrics into memory.
    """
    global _model, _vectorizer, _metrics

    model_path = MODEL_DIR / "fake_news_classifier.joblib"
    vec_path = MODEL_DIR / "tfidf_vectorizer.joblib"
    metrics_path = MODEL_DIR / "model_metrics.json"

    if _model is None and model_path.exists():
        try:
            _model = joblib.load(model_path)
            logger.info("Loaded fake_news_classifier model.")
        except Exception as e:
            logger.error(f"Error loading model: {e}")

    if _vectorizer is None and vec_path.exists():
        try:
            _vectorizer = joblib.load(vec_path)
            logger.info("Loaded tfidf_vectorizer.")
        except Exception as e:
            logger.error(f"Error loading vectorizer: {e}")

    if _metrics is None and metrics_path.exists():
        try:
            with open(metrics_path, "r", encoding="utf-8") as f:
                _metrics = json.load(f)
        except Exception as e:
            logger.error(f"Error loading metrics JSON: {e}")

    return _model, _vectorizer, _metrics


def predict_news(raw_text: str) -> Dict[str, Any]:
    """
    Runs text through cleaning, TF-IDF vectorization, and scikit-learn classifier.
    Returns:
    - prediction: "Likely Real" or "Potentially Fake"
    - confidence: float percentage (e.g. 94.2)
    - class_label: "REAL" or "FAKE"
    - probabilities: {"REAL": float, "FAKE": float}
    - cleaned_text: str
    - text_stats: Dict
    """
    model, vectorizer, _ = load_ml_assets()

    if not raw_text or not raw_text.strip():
        return {
            "prediction": "Indeterminate",
            "confidence": 0.0,
            "class_label": "UNKNOWN",
            "probabilities": {"REAL": 0.5, "FAKE": 0.5},
            "cleaned_text": "",
            "text_stats": analyze_text_characteristics("")
        }

    text_stats = analyze_text_characteristics(raw_text)
    cleaned_text = clean_text_for_ml(raw_text)

    # Fallback if text is too short after cleaning
    if not cleaned_text:
        cleaned_text = raw_text.lower()[:50]

    if model is None or vectorizer is None:
        logger.warning("ML Model or Vectorizer not loaded! Triggering automatic training fallback...")
        from app.ml.train import train_and_evaluate_models
        train_and_evaluate_models()
        model, vectorizer, _ = load_ml_assets()

    try:
        # Transform through TF-IDF
        features = vectorizer.transform([cleaned_text])

        # Predict probability
        proba = model.predict_proba(features)[0]  # [prob_real (class 0), prob_fake (class 1)]
        prob_real = float(proba[0])
        prob_fake = float(proba[1])

        # Contextual journalistic calibration:
        # Check for verified news media bylines and absence of clickbait manipulation
        import re
        from app.nlp.credibility import ATTRIBUTION_PATTERNS, CLICKBAIT_PATTERNS, URGENCY_PATTERNS
        text_lower = raw_text.lower()
        has_attribution = any(re.search(p, text_lower) for p in ATTRIBUTION_PATTERNS)
        has_clickbait = any(re.search(p, text_lower) for p in CLICKBAIT_PATTERNS)
        has_urgency = any(re.search(p, text_lower) for p in URGENCY_PATTERNS)

        # If probability is in the ambiguous borderline zone (40% - 60%):
        # When legitimate news organizations are cited (CNN, NDTV, Guardian, etc.) and there are NO clickbait or urgency flags,
        # calibrate decision toward REAL reporting.
        if 0.40 <= prob_fake <= 0.62 and has_attribution and not has_clickbait and not has_urgency:
            prob_real = max(prob_real, 0.76)
            prob_fake = round(1.0 - prob_real, 4)
        elif 0.45 <= prob_fake <= 0.55 and not has_clickbait and not has_urgency:
            prob_real = max(prob_real, 0.65)
            prob_fake = round(1.0 - prob_real, 4)

        # Decide label
        if prob_real >= prob_fake:
            class_label = "REAL"
            prediction = "Likely Real"
            confidence = round(prob_real * 100.0, 1)
        else:
            class_label = "FAKE"
            prediction = "Potentially Fake"
            confidence = round(prob_fake * 100.0, 1)

        return {
            "prediction": prediction,
            "confidence": confidence,
            "class_label": class_label,
            "probabilities": {
                "REAL": round(prob_real * 100.0, 1),
                "FAKE": round(prob_fake * 100.0, 1)
            },
            "cleaned_text": cleaned_text,
            "text_stats": text_stats
        }
    except Exception as e:
        logger.error(f"Inference error: {e}")
        return {
            "prediction": "Potentially Fake",
            "confidence": 50.0,
            "class_label": "FAKE",
            "probabilities": {"REAL": 50.0, "FAKE": 50.0},
            "cleaned_text": cleaned_text,
            "text_stats": text_stats,
            "error": str(e)
        }


def get_model_evaluation_metrics() -> Dict[str, Any]:
    """
    Returns stored evaluation metrics for the ML dashboard.
    """
    _, _, metrics = load_ml_assets()
    if metrics:
        return metrics

    # If missing, try loading or training
    metrics_path = MODEL_DIR / "model_metrics.json"
    if metrics_path.exists():
        with open(metrics_path, "r", encoding="utf-8") as f:
            return json.load(f)

    from app.ml.train import train_and_evaluate_models
    return train_and_evaluate_models()
