import urllib.request
import urllib.parse
import json

BASE_URL = "http://127.0.0.1:8000/api"

def run_test(name, title, text):
    print(f"\n--- Testing: {name} ---")
    payload = json.dumps({"text": text, "title": title}).encode("utf-8")
    req = urllib.request.Request(f"{BASE_URL}/analyze/text", data=payload, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req) as res:
            data = json.loads(res.read())
            print(f"Prediction: {data['prediction']}")
            print(f"Confidence: {data['confidence']}%")
            print(f"Global Verification Status: {data.get('evidence_verification', {}).get('status', 'N/A')}")
            print(f"Global Message: {data.get('evidence_verification', {}).get('message', 'N/A')}")
            print(f"Keywords used: {data.get('evidence_verification', {}).get('search_query', 'N/A')}")
            refs = data.get('evidence_verification', {}).get('sources_checked', [])
            print(f"References found: {len(refs)}")
            for idx, r in enumerate(refs[:2]):
                print(f"  {idx+1}: {r['title']} ({r['source']})")
    except Exception as e:
        print(f"Failed: {e}")

if __name__ == "__main__":
    tests = [
        {
            "name": "Fake Kohli",
            "title": "Virat Kohli Dies in Car Accident",
            "text": "Breaking news: Indian cricket star Virat Kohli died in a tragic car accident yesterday on the Mumbai-Pune expressway. Fans are in shock."
        },
        {
            "name": "Real Eva Marie Saint",
            "title": "Oscar-winning On the Waterfront actress Eva Marie Saint dies aged 102",
            "text": "Eva Marie Saint, the Oscar-winning star of On the Waterfront and North by Northwest, has died aged 102."
        },
        {
            "name": "Real Ahmedabad Doctor",
            "title": "Ahmedabad doctor arrested for performing illegal surgeries",
            "text": "An Ahmedabad doctor was arrested on Tuesday for allegedly performing illegal surgeries without proper licenses at his clinic."
        },
        {
            "name": "Fake Anushka Sen",
            "title": "Anushka Sen Dies in car Accident",
            "text": "NEWS / ENTERTAINMENT / TELEVISION / Anushka Sen Dies in car Accident. Popular tv actress Anushka Sen passed away yesterday."
        }
    ]
    for t in tests:
        run_test(t["name"], t["title"], t["text"])
