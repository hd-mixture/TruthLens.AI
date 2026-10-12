import urllib.request
import urllib.parse
import json

BASE_URL = "http://127.0.0.1:8000/api"

def run_test(name, title, text):
    print(f"\n--- Testing: {name} ---")
    payload = json.dumps({"text": text, "title": title}).encode("utf-8")
    req = urllib.request.Request(f"{BASE_URL}/verify-news", data=payload, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req) as res:
            data = json.loads(res.read())
            print(f"Final Verdict: {data['verdict']}")
            print(f"Final Confidence: {data['confidence']}%")
            print(f"Extracted Claim: {data['claim']}")
            print(f"ML Prediction: {data['mlPrediction']} ({data['mlConfidence']}%)")
            print(f"Evidence Score: {data['evidenceScore']}")
            print(f"Explanation: {data['explanation']}")
            print(f"Search Performed: {data['searchPerformed']}")
            if data['searchError']:
                print(f"Search Error: {data['searchError']}")
            
            print(f"Supporting Sources: {len(data['supportingSources'])}")
            print(f"Contradicting Sources: {len(data['contradictingSources'])}")
            
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8')
        print(f"Failed ({e.code}): {body}")
    except Exception as e:
        print(f"Failed: {e}")

if __name__ == "__main__":
    tests = [
        {
            "name": "Fabricated News: Sun goes out",
            "title": "Sun expected to go out for 3 days next month",
            "text": "NASA confirms the sun will experience a solar blackout for exactly 3 days in November 2026, plunging the Earth into darkness."
        },
        {
            "name": "Genuine News: Mars Rover",
            "title": "NASA's Perseverance rover collects new samples",
            "text": "The Perseverance rover has successfully drilled and collected a new core sample from the Jezero crater on Mars."
        }
    ]
    for t in tests:
        run_test(t["name"], t["title"], t["text"])
