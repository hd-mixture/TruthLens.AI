import io
import logging
from typing import Dict, Any, Optional, Tuple, List
import numpy as np
import cv2
from PIL import Image

logger = logging.getLogger(__name__)

# Global EasyOCR Reader singleton to avoid reload overhead per request
_easyocr_reader = None


def get_easyocr_reader():
    global _easyocr_reader
    if _easyocr_reader is None:
        try:
            import easyocr
            import torch
            has_gpu = torch.cuda.is_available()
            logger.info(f"Initializing EasyOCR Reader (GPU: {has_gpu})...")
            # Set download_enabled=True to ensure en model exists if needed
            _easyocr_reader = easyocr.Reader(['en'], gpu=has_gpu)
            logger.info("EasyOCR Reader successfully initialized.")
        except Exception as e:
            logger.warning(f"EasyOCR initialization failed: {e}")
            _easyocr_reader = False
    return _easyocr_reader if _easyocr_reader is not False else None


def preprocess_image_for_ocr(image_bytes: bytes) -> Tuple[np.ndarray, np.ndarray, List[str]]:
    """
    Executes the multi-stage Computer Vision pipeline:
    Image -> Validation -> Resize -> Noise Reduction -> Grayscale -> Contrast Enhancement (CLAHE) -> Thresholding
    Returns: (preprocessed_binary_image, enhanced_gray_image, steps_applied)
    """
    steps = ["Image Validation"]

    # 1. Validation & Load
    np_arr = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    if image is None:
        raise ValueError("Invalid or corrupted image format. Supported formats: JPG, PNG, WEBP.")

    h, w = image.shape[:2]

    # 2. Resize
    # If image is very large, downscale to prevent OOM / slow OCR.
    # If image is very small (e.g. low-res thumbnail), upscale to improve character recognition.
    if max(h, w) > 2400:
        scale = 2400.0 / max(h, w)
        image = cv2.resize(image, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
        steps.append(f"Downscaled image from ({w}x{h}) to ({int(w * scale)}x{int(h * scale)})")
    elif min(h, w) < 600:
        scale = 800.0 / min(h, w)
        image = cv2.resize(image, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_CUBIC)
        steps.append(f"Upscaled small image for OCR clarity to ({int(w * scale)}x{int(h * scale)})")
    else:
        steps.append(f"Maintained native resolution ({w}x{h})")

    # 3. Grayscale Conversion
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    steps.append("Grayscale Conversion")

    # 4. Noise Reduction (Bilateral filtering preserves edges while smoothing background noise)
    denoised = cv2.bilateralFilter(gray, d=7, sigmaColor=50, sigmaSpace=50)
    steps.append("Edge-Preserving Noise Reduction (Bilateral Filter)")

    # 5. Contrast Enhancement (CLAHE: Contrast Limited Adaptive Histogram Equalization)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(denoised)
    steps.append("Contrast Enhancement (CLAHE)")

    # 6. Adaptive Thresholding (Otsu binarization for clear character silhouettes)
    _, thresh = cv2.threshold(enhanced, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    steps.append("Adaptive Otsu Thresholding")

    return thresh, enhanced, steps


async def run_ocr_pipeline(image_bytes: bytes) -> Dict[str, Any]:
    """
    Executes end-to-end Computer Vision and OCR extraction.
    Returns extracted text, confidence, steps applied, and warnings.
    """
    try:
        binary_img, enhanced_gray, steps = preprocess_image_for_ocr(image_bytes)
    except Exception as e:
        return {
            "success": False,
            "text": "",
            "confidence": 0.0,
            "warning": str(e),
            "steps": [],
            "error": str(e)
        }

    extracted_lines = []
    confidences = []
    used_engine = "None"

    # Attempt 1: Native Windows Media OCR (Hardware accelerated, ultra fast)
    try:
        import winocr
        # First try enhanced grayscale image
        pil_img_enhanced = Image.fromarray(cv2.cvtColor(enhanced_gray, cv2.COLOR_GRAY2RGB))
        win_res = await winocr.recognize_pil(pil_img_enhanced, 'en')

        # If empty, also try original raw image directly
        if not win_res or not win_res.text or len(win_res.text.strip()) < 10:
            pil_img_raw = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            win_res = await winocr.recognize_pil(pil_img_raw, 'en')

        if win_res and win_res.text and len(win_res.text.strip()) > 10:
            used_engine = "Windows Media OCR Engine"
            extracted_lines.append(win_res.text.strip())
            confidences.append(0.94)  # High native confidence
            steps.append(f"Executed Windows Media OCR ({len(win_res.text.split())} tokens recognized)")
    except Exception as we:
        logger.warning(f"Windows OCR attempt failed: {we}")

    # Attempt 2: EasyOCR with PyTorch (fallback)
    if not extracted_lines:
        reader = get_easyocr_reader()
        if reader is not None:
            try:
                used_engine = "EasyOCR (Deep Learning)"
                results = reader.readtext(enhanced_gray)

                for bbox, text, conf in results:
                    cleaned_tok = text.strip()
                    if cleaned_tok:
                        extracted_lines.append(cleaned_tok)
                        confidences.append(float(conf))

                steps.append(f"Executed EasyOCR ({len(results)} text bounding boxes detected)")
            except Exception as e:
                logger.warning(f"EasyOCR runtime error: {e}. Falling back to PyTesseract...")
                reader = None

    # Attempt 2: PyTesseract fallback if EasyOCR produced no results or was unavailable
    if not extracted_lines:
        try:
            import pytesseract
            from app.config import settings

            if settings.TESSERACT_CMD:
                pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_CMD

            # Run pytesseract with data extraction to get confidence
            ocr_data = pytesseract.image_to_data(binary_img, output_type=pytesseract.Output.DICT)
            used_engine = "Tesseract OCR"

            words = []
            for i, word in enumerate(ocr_data['text']):
                if word.strip():
                    words.append(word.strip())
                    conf = float(ocr_data['conf'][i])
                    if conf > 0:
                        confidences.append(conf / 100.0)

            if words:
                extracted_lines.append(" ".join(words))
                steps.append(f"Executed Tesseract OCR ({len(words)} tokens detected)")
        except Exception as te:
            logger.info(f"Tesseract fallback unavailable or failed: {te}")

    full_text = "\n".join(extracted_lines).strip()

    # Calculate average confidence percentage
    if confidences:
        avg_confidence = round(float(np.mean(confidences)) * 100.0, 1)
    else:
        avg_confidence = 0.0

    # Determine if text is meaningful
    if not full_text:
        return {
            "success": False,
            "text": "",
            "confidence": 0.0,
            "warning": "No readable text detected in the image. Please ensure the screenshot or photograph is sharp, high-contrast, and oriented correctly.",
            "steps": steps,
            "engine": used_engine,
            "is_low_confidence": True
        }

    warning = None
    is_low_confidence = False
    if avg_confidence < 45.0:
        is_low_confidence = True
        warning = f"Low OCR text recognition confidence ({avg_confidence}%). The image might be blurry, noisy, or low-resolution. Please review the extracted text before finalizing."

    return {
        "success": True,
        "text": full_text,
        "confidence": avg_confidence,
        "warning": warning,
        "is_low_confidence": is_low_confidence,
        "steps": steps,
        "engine": used_engine,
        "box_count": len(confidences)
    }
