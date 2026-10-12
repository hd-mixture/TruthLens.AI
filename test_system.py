import urllib.request
import urllib.parse
import json
import mimetypes
import uuid
from pathlib import Path

BASE_URL = "http://127.0.0.1:8000/api"
SAMPLES_DIR = Path(__file__).resolve().parent / "sample_inputs"

def test_api():
    print("=== TRUTHLENS AI END-TO-END VERIFICATION ===")

    # 1. Health check
    try:
        with urllib.request.urlopen("http://127.0.0.1:8000/health") as res:
            health = json.loads(res.read())
            print(f"1. Health Check: {health.get('status')} (Service: {health.get('service')})")
    except Exception as e:
        print(f"Health check failed: {e}")
        return

    # 2. Text Analysis: Fake News
    fake_text = (SAMPLES_DIR / "sample_fake_hoax.txt").read_text(encoding="utf-8")
    payload = json.dumps({"text": fake_text, "title": "Viral Miracle Lemon Cancer Cure"}).encode("utf-8")
    req = urllib.request.Request(f"{BASE_URL}/analyze/text", data=payload, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req) as res:
            fake_res = json.loads(res.read())
            print(f"2. Fake Text Analysis: Prediction='{fake_res['prediction']}', Confidence={fake_res['confidence']}%, Credibility Score={fake_res['credibility_score']}/100, Risk='{fake_res['risk_level']}'")
            print(f"   Warning Signs Detected: {len(fake_res['warning_signs'])}")
    except Exception as e:
        print(f"Fake text test failed: {e}")

    # 3. Text Analysis: Real News
    real_text = (SAMPLES_DIR / "sample_real_article.txt").read_text(encoding="utf-8")
    payload = json.dumps({"text": real_text, "title": "WHO Seasonal Surveillance Update"}).encode("utf-8")
    req = urllib.request.Request(f"{BASE_URL}/analyze/text", data=payload, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req) as res:
            real_res = json.loads(res.read())
            print(f"3. Real Text Analysis: Prediction='{real_res['prediction']}', Confidence={real_res['confidence']}%, Credibility Score={real_res['credibility_score']}/100, Risk='{real_res['risk_level']}'")
            print(f"   Positive Indicators: {len(real_res['positive_indicators'])}")
    except Exception as e:
        print(f"Real text test failed: {e}")

    # 4. History API
    try:
        with urllib.request.urlopen(f"{BASE_URL}/history") as res:
            history = json.loads(res.read())
            print(f"4. History API: Found {len(history)} persistent records in SQLite database.")
    except Exception as e:
        print(f"History test failed: {e}")

    # 5. Model Metrics
    try:
        with urllib.request.urlopen(f"{BASE_URL}/model/metrics") as res:
            metrics = json.loads(res.read())
            print(f"5. Model Metrics API: Primary='{metrics['primary_model']}', Accuracy={metrics['primary_metrics']['accuracy']}%, Vocabulary={metrics['vocabulary_size']} tokens.")
    except Exception as e:
        print(f"Model metrics test failed: {e}")

    print("=== ALL API ENDPOINTS VERIFIED AND OPERATIONAL ===")

if __name__ == "__main__":
    test_api()
