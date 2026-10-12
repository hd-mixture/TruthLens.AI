import uuid
from datetime import datetime
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, File, UploadFile, Form, HTTPException, Query
from pydantic import BaseModel, HttpUrl

from app.config import settings
from app.nlp.text_cleaner import analyze_text_characteristics
from app.nlp.extractor import extract_text_from_pdf_bytes, extract_text_from_url
from app.nlp.credibility import evaluate_credibility
from app.nlp.evidence_verifier import verify_claim_with_evidence
from app.vision.ocr_pipeline import run_ocr_pipeline
from app.ml.pipeline import predict_news, get_model_evaluation_metrics
from app.genai.explainer import generate_ai_explanation
from app.db.history_store import (
    save_analysis,
    get_history,
    get_analysis_by_id,
    delete_analysis,
    clear_all_history,
    get_history_stats
)

router = APIRouter()


# Request Schemas
class TextAnalysisRequest(BaseModel):
    text: str
    title: Optional[str] = None
    input_type: Optional[str] = "text"
    api_key: Optional[str] = None


class URLAnalysisRequest(BaseModel):
    url: str
    api_key: Optional[str] = None


async def _run_full_analysis_workflow(
    raw_text: str,
    input_type: str = "text",
    title: Optional[str] = None,
    ocr_confidence: Optional[float] = None,
    ocr_details: Optional[Dict[str, Any]] = None,
    api_key: Optional[str] = None
) -> Dict[str, Any]:
    """
    Unified end-to-end processing pipeline:
    Raw Text -> ML Classification -> Credibility Engine -> Generative AI Explanation -> Persistent Storage
    """
    if not raw_text or len(raw_text.strip()) < 15:
        raise HTTPException(
            status_code=400,
            detail="The provided content is too short for meaningful analysis. Please provide at least 15 characters of news text."
        )

    # 1. Machine Learning Prediction
    ml_result = predict_news(raw_text)

    # 2. Evidence Verification Layer
    try:
        evidence_verification = await verify_claim_with_evidence(raw_text, title=title, api_key=api_key)
    except ValueError as e:
        evidence_verification = {
            "status": "UNVERIFIED",
            "extracted_claim": "",
            "entities": [],
            "search_query": "",
            "sources_checked": [],
            "supporting_evidence": [],
            "contradicting_evidence": [],
            "consistency_score": 50,
            "message": str(e)
        }

    # Ground ML Prediction with Evidence Verification
    final_prediction = ml_result["prediction"]
    final_confidence = ml_result["confidence"]
    class_label = ml_result["class_label"]
    combined_warnings = []
    combined_positive = []

    status = evidence_verification.get("status")
    consistency = evidence_verification.get("consistency_score", 50)
    
    if status == "CONTRADICTED":
        final_prediction = "Likely Fake"
        class_label = "FAKE"
        final_confidence = max(final_confidence, 100 - consistency) # high confidence if low consistency
        combined_warnings.append(evidence_verification.get("message", "Evidence contradicts the claim."))
    elif status == "SUPPORTED":
        final_prediction = "Likely Real"
        class_label = "REAL"
        final_confidence = max(final_confidence, consistency)
        combined_positive.append(evidence_verification.get("message", "Reliable evidence supports the claim."))
    else:
        # INSUFFICIENT_EVIDENCE
        # External web search produced ZERO corroborating news reports for this claim.
        # An uncorroborated claim must NEVER be declared "Likely Real", regardless of writing style.
        if any(k in raw_text.lower() for k in ["shocking", "urgent", "secret", "exposed", "hoax", "conspiracy", "share before", "deleted", "wake up"]):
            final_prediction = "Potentially Fake"
            class_label = "FAKE"
            final_confidence = 75.0
            combined_warnings.append("Sensational language and lack of external news reporting indicate potential disinformation.")
        else:
            final_prediction = "Unverified / Cannot Determine"
            class_label = "UNVERIFIED"
            final_confidence = 50.0
            combined_warnings.append("No independent reliable news sources corroborate this claim. Exercise caution.")

    # 3. Multi-factor Credibility & Risk Scoring
    credibility_result = evaluate_credibility(
        raw_text=raw_text,
        ml_prediction=final_prediction,
        ml_confidence=final_confidence,
        ocr_confidence=ocr_confidence,
        input_type=input_type
    )

    final_credibility = credibility_result["credibility_score"]
    if status == "SUPPORTED":
        final_credibility = max(final_credibility, 85)
    elif status == "CONTRADICTED":
        final_credibility = min(final_credibility, 18)
    else:
        final_credibility = 50

    # Merge warning flags
    for w in credibility_result["warning_signs"]:
        if w not in combined_warnings:
            combined_warnings.append(w)
    for p in credibility_result["positive_indicators"]:
        if p not in combined_positive:
            combined_positive.append(p)

    if ocr_details and ocr_details.get("warning"):
        if ocr_details["warning"] not in combined_warnings:
            combined_warnings.insert(0, ocr_details["warning"])

    # 4. Generative AI Layer
    ai_explanation = await generate_ai_explanation(
        text=raw_text,
        prediction=final_prediction,
        confidence=final_confidence,
        credibility_score=final_credibility,
        warning_signs=combined_warnings,
        text_stats=ml_result["text_stats"],
        api_key=api_key
    )

    # Build Response Payload
    record_id = str(uuid.uuid4())
    timestamp = datetime.utcnow().isoformat()

    inferred_title = title
    if not inferred_title:
        first_line = raw_text.splitlines()[0].strip() if raw_text.splitlines() else ""
        inferred_title = first_line[:80] + ("..." if len(first_line) > 80 else "")

    response_payload = {
        "id": record_id,
        "timestamp": timestamp,
        "input_type": input_type,
        "title": inferred_title,
        "input_text": raw_text,
        "cleaned_text": ml_result["cleaned_text"],
        "prediction": final_prediction,
        "confidence": final_confidence,
        "class_label": class_label,
        "probabilities": ml_result["probabilities"],
        "credibility_score": final_credibility,
        "risk_level": credibility_result["risk_level"],
        "score_factors": credibility_result["factors"],
        "warning_signs": combined_warnings,
        "positive_indicators": combined_positive,
        "ai_explanation": ai_explanation,
        "text_stats": ml_result["text_stats"],
        "ocr_details": ocr_details,
        "evidence_verification": evidence_verification
    }

    # 4. Save to Persistent DB
    try:
        save_analysis(response_payload)
    except Exception as e:
        # Don't fail the response if logging to DB fails
        pass

    return response_payload


@router.post("/analyze/text")
async def analyze_text_endpoint(payload: TextAnalysisRequest):
    """
    Analyzes raw typed or pasted news text.
    """
    return await _run_full_analysis_workflow(
        raw_text=payload.text,
        input_type=payload.input_type or "text",
        title=payload.title,
        api_key=payload.api_key
    )


@router.post("/analyze/image")
async def analyze_image_endpoint(
    file: UploadFile = File(...),
    input_type: str = Form("image"),  # 'image' or 'clipboard'
    api_key: Optional[str] = Form(None)
):
    """
    Uploads an image (screenshot, WhatsApp forward, photo, or clipboard paste blob),
    runs Computer Vision preprocessing & OCR, then performs full news credibility analysis.
    """
    # 1. Validate MIME type
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/bmp", "image/jpg"]
    if file.content_type and file.content_type.lower() not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported image format: {file.content_type}. Please upload JPG, PNG, or WEBP."
        )

    # 2. Read bytes & check size
    image_bytes = await file.read()
    if len(image_bytes) > settings.MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="Image file exceeds maximum 10MB size limit.")

    # 3. Execute Computer Vision & OCR pipeline
    ocr_result = await run_ocr_pipeline(image_bytes)

    if not ocr_result["success"] or not ocr_result["text"].strip():
        raise HTTPException(
            status_code=422,
            detail=ocr_result.get("warning") or "No readable text could be recognized from the image."
        )

    # 4. Run Analysis Workflow
    ocr_details = {
        "engine": ocr_result.get("engine", "EasyOCR"),
        "confidence": ocr_result.get("confidence", 0.0),
        "warning": ocr_result.get("warning"),
        "steps": ocr_result.get("steps", []),
        "filename": file.filename,
        "is_low_confidence": ocr_result.get("is_low_confidence", False)
    }

    return await _run_full_analysis_workflow(
        raw_text=ocr_result["text"],
        input_type=input_type,
        title=f"Image Scan: {file.filename or 'Screenshot'}",
        ocr_confidence=ocr_result["confidence"],
        ocr_details=ocr_details,
        api_key=api_key
    )


@router.post("/ocr/extract-only")
async def ocr_extract_only_endpoint(file: UploadFile = File(...)):
    """
    Standalone OCR preview endpoint: performs Computer Vision preprocessing and OCR,
    returning extracted text and confidence so users can review/edit before analyzing.
    """
    image_bytes = await file.read()
    ocr_result = await run_ocr_pipeline(image_bytes)
    return ocr_result


@router.post("/analyze/pdf")
async def analyze_pdf_endpoint(
    file: UploadFile = File(...),
    api_key: Optional[str] = Form(None)
):
    """
    Uploads a PDF document, extracts text across pages, and analyzes for credibility.
    """
    if file.content_type and file.content_type.lower() != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF (.pdf) documents are accepted.")

    pdf_bytes = await file.read()
    if len(pdf_bytes) > settings.MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="PDF document exceeds 10MB limit.")

    extraction = extract_text_from_pdf_bytes(pdf_bytes)
    if not extraction["success"] or not extraction["text"].strip():
        raise HTTPException(status_code=422, detail=extraction.get("error", "Failed to extract text from PDF."))

    ocr_details = {
        "engine": "PyPDF Document Parser",
        "page_count": extraction.get("page_count", 1),
        "filename": file.filename
    }

    return await _run_full_analysis_workflow(
        raw_text=extraction["text"],
        input_type="pdf",
        title=f"Document: {file.filename}",
        ocr_details=ocr_details,
        api_key=api_key
    )


@router.post("/analyze/url")
async def analyze_url_endpoint(payload: URLAnalysisRequest):
    """
    Fetches article content from a URL and executes credibility analysis.
    """
    extraction = await extract_text_from_url(payload.url)
    if not extraction["success"] or not extraction["text"].strip():
        raise HTTPException(status_code=422, detail=extraction.get("error", "Unable to extract article from URL."))

    ocr_details = {
        "engine": "HTML5 Web Scraper",
        "source_url": payload.url
    }

    return await _run_full_analysis_workflow(
        raw_text=extraction["text"],
        input_type="url",
        title=extraction.get("title") or f"Article: {payload.url[:50]}...",
        ocr_details=ocr_details,
        api_key=payload.api_key
    )


@router.get("/history")
def get_history_endpoint(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    search: Optional[str] = None,
    filter_prediction: Optional[str] = None
):
    """
    Fetches stored analysis history records.
    """
    return get_history(limit=limit, offset=offset, search=search, filter_prediction=filter_prediction)


@router.get("/history/{record_id}")
def get_history_detail_endpoint(record_id: str):
    """
    Retrieves full details of a past analysis.
    """
    record = get_analysis_by_id(record_id)
    if not record:
        raise HTTPException(status_code=404, detail="Analysis record not found.")
    return record


@router.delete("/history/{record_id}")
def delete_history_item_endpoint(record_id: str):
    """
    Deletes an analysis record.
    """
    success = delete_analysis(record_id)
    if not success:
        raise HTTPException(status_code=404, detail="Record not found.")
    return {"success": True, "deleted_id": record_id}


@router.delete("/history")
def clear_all_history_endpoint():
    """
    Clears all analysis history.
    """
    count = clear_all_history()
    return {"success": True, "cleared_count": count}


@router.get("/history-stats")
def get_history_stats_endpoint():
    """
    Returns aggregate stats for the dashboard.
    """
    return get_history_stats()


@router.get("/model/metrics")
def get_model_metrics_endpoint():
    """
    Returns model training evaluation, confusion matrices, and pipeline data.
    """
    return get_model_evaluation_metrics()

class VerifyNewsRequest(BaseModel):
    text: str
    title: Optional[str] = None
    api_key: Optional[str] = None

@router.post("/verify-news")
async def verify_news_endpoint(payload: VerifyNewsRequest):
    """
    Provides a standardized verification response format as requested.
    """
    # 1. ML Classification
    ml_result = predict_news(payload.text)
    
    # 2. Evidence Verification Layer
    try:
        evidence_verification = await verify_claim_with_evidence(payload.text, title=payload.title, api_key=payload.api_key)
        search_error = None
        search_performed = True
    except ValueError as e:
        evidence_verification = None
        search_error = str(e)
        search_performed = False

    if evidence_verification:
        status = evidence_verification.get("status")
        consistency = evidence_verification.get("consistency_score", 50)
        claim = evidence_verification.get("extracted_claim", "")
        supp_srcs = evidence_verification.get("supporting_evidence", [])
        contr_srcs = evidence_verification.get("contradicting_evidence", [])
        explanation = evidence_verification.get("message", "")
    else:
        status = "UNVERIFIED"
        consistency = 50
        claim = ""
        supp_srcs = []
        contr_srcs = []
        explanation = search_error or "Search verification failed."

    # Final Verdict logic
    if status == "SUPPORTED":
        verdict = "LIKELY_REAL"
        confidence = max(ml_result["confidence"], consistency)
    elif status == "CONTRADICTED":
        verdict = "POTENTIALLY_FAKE"
        confidence = max(ml_result["confidence"], 100 - consistency)
    else:
        verdict = "UNVERIFIED"
        confidence = 50.0

    return {
      "verdict": verdict,
      "confidence": confidence,
      "claim": claim,
      "mlPrediction": ml_result["prediction"],
      "mlConfidence": ml_result["confidence"],
      "evidenceScore": consistency,
      "supportingSources": supp_srcs,
      "contradictingSources": contr_srcs,
      "explanation": explanation,
      "searchPerformed": search_performed,
      "searchError": search_error
    }
