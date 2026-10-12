# TruthLens AI — Multimodal Fake News Detector & Credibility Engine

> **Tagline:** *Analyze. Verify. Understand.*  
> **Type:** Multimodal AI/ML Web Application (Machine Learning, Natural Language Processing, Computer Vision, OCR, Generative AI)

TruthLens AI is an enterprise-grade multimodal artificial intelligence system designed to evaluate journalistic credibility and detect misinformation. Rather than operating as a simple prompt wrapper around a large language model, TruthLens features a genuine **scikit-learn** text classification pipeline trained on verified and fabricated news datasets, coupled with an **OpenCV & EasyOCR** computer vision pipeline, a multi-factor **Credibility & Risk Scoring Engine (0–100)**, and an explainable **Generative AI** journalistic analysis layer.

---

## 🌟 Key Capabilities

### 1. Multimodal Ingestion Pipeline
- **Direct Text Input:** Paste or type breaking headlines, statements, or social media forwards with real-time character/word counts.
- **Image & Screenshot OCR:** Upload photographs or newspaper clippings (`JPG`, `PNG`, `WEBP`).
- **Ctrl+V Clipboard Paste:** Take a screenshot using Windows Snipping Tool (`Win + Shift + S`) or Print Screen and press `Ctrl+V` anywhere inside the application to detect, preview, and analyze the image without manually saving files.
- **Drag & Drop:** Drag news images directly onto the active upload zone.
- **PDF Document Parser:** Upload official circulars, research papers, or press releases (`.pdf`) with automated layout and text extraction.
- **Web Article URL Scraper:** Paste any public article link; TruthLens strips ads, navigation markup, and scripts to extract core journalistic paragraphs.

### 2. Computer Vision & OCR Processing
When an image or screenshot is submitted, it undergoes a 6-stage Computer Vision pipeline:
1. **Format & Integrity Validation:** Validates MIME type, resolution bounds, and file size (< 10MB).
2. **Adaptive Resizing:** Preserves aspect ratio while optimizing resolution for character clarity.
3. **Bilateral Noise Filtering:** Edge-preserving noise reduction that smooths background artifacts while retaining sharp typography.
4. **Contrast Enhancement (CLAHE):** Contrast Limited Adaptive Histogram Equalization prevents local over-amplification.
5. **Adaptive Otsu Thresholding:** Generates high-contrast binary silhouettes for character segmentation.
6. **Deep Learning OCR (EasyOCR / PyTesseract):** PyTorch-powered text recognition with confidence calculation and low-confidence warning flags.

### 3. Machine Learning Classification Pipeline
- **Supervised ML Core:** Trained using Python and **scikit-learn**.
- **Preprocessing:** Normalization, regex URL/HTML stripping, domain-aware stop-word filtering (preserving essential negation modifiers like *not*, *no*, *never*).
- **Feature Extraction:** Sublinear TF-IDF (Term Frequency-Inverse Document Frequency) vectorizer spanning unigrams and bigrams.
- **Multi-Model Benchmark:**
  - The bundled metrics currently report perfect scores for several models, but these must **not** be interpreted as real-world fact-checking accuracy: the included training script generates synthetic examples and closely related augmentations.
  - Before making performance claims, evaluate against an independent, representative, deduplicated dataset with documented provenance and a held-out test set.
- **Model Persistence:** Models and vectorizers are pre-fitted and serialized using `joblib` for sub-millisecond REST API inference without retraining overhead.

### 4. 0–100 Multi-Factor Credibility & Risk Index
Mathematically deconstructed across six diagnostic pillars:
- **ML Statistical Classification:** Calibrated class probability.
- **Sensational / Clickbait Syntax:** Detection of exaggerated bait phrases (*"shocking discovery"*, *"they don't want you to know"*).
- **Urgency & Viral Forwarding Cues:** Forward pressure markers (*"share before deleted"*, *"urgent alert"*).
- **Source Attribution & Citations:** Verification of named institutions (Reuters, AP, WHO, Lancet) and quoted spokespersons.
- **Emotional Inflammatory Vocabulary:** Hostile, fearful, or apocalyptic lexicon analysis.
- **Typography & Formatting Anomalies:** ALL-CAPS percentage and excessive exclamation marks (`!?!?!`).
- **Image OCR Quality Metric:** Low OCR confidence alerts the user to potential character recognition noise.

### 5. Generative AI Explainability
- Powered by **Google Gemini 1.5 Flash** (with an intelligent rule-based NLP fallback engine).
- Synthesizes an executive summary, nuanced credibility rationale, extracted factual claims, rhetorical tone notes, and an actionable step-by-step verification checklist.
- Explicitly upholds the **Academic Principle of Non-Dogmatism:** It does not declare absolute truth; it communicates a probabilistic assessment.

### 6. Persistent Audit History & Model Dashboard
- **SQLite Archive:** Stores all past analyses, confidence scores, factor breakdowns, and extracted texts with search and filter capabilities.
- **Academic Model Dashboard (`/model`):** Displays real-time confusion matrices, precision/recall formulas, class distributions, and top 15 predictive feature weights.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Lucide Icons |
| **Backend API** | FastAPI, Uvicorn, Python 3.12, Pydantic, HTTPX |
| **Machine Learning** | scikit-learn, joblib, NumPy, pandas, NLTK |
| **Computer Vision / OCR** | OpenCV (`cv2`), Pillow (`PIL`), EasyOCR (PyTorch), PyTesseract |
| **Document & Web Parsing** | PyPDF (`pypdf`), BeautifulSoup4 (`bs4`) |
| **Generative AI** | Google Gemini API (`google-generativeai`) + Rule-Based NLP Engine |
| **Persistence** | SQLite (`truthlens_history.db`) |

---

## 🚀 Getting Started

### Prerequisites
- **Python:** 3.10+ (Python 3.12 recommended)
- **Node.js:** v18+ (Node.js v24 recommended)
- **npm:** v9+

---

### Step 1: Clone & Setup Backend

```bash
# Navigate to the backend directory
cd backend

# Create and activate virtual environment (optional but recommended)
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
```

*Note: You can add your free Google Gemini API key to `.env` (`GEMINI_API_KEY=your_key_here`). If omitted, TruthLens AI automatically uses its high-fidelity built-in NLP explanation engine!*

#### (Re)Train Models & Verify Metrics (Optional)
The models are already trained and saved in `backend/app/ml/models/`. If you wish to retrain:
```bash
python -m app.ml.train
```

#### Run the FastAPI Backend Server
```bash
python run.py
```
Backend API will start on **http://localhost:8000** (Interactive Swagger documentation available at **http://localhost:8000/docs**).

---

### Step 2: Setup & Run Frontend

Open a new terminal window:

```bash
# Navigate to frontend directory
cd frontend

# Install npm packages
npm install

# Start development server
npm run dev
```
The Next.js frontend will be live on **http://localhost:3000**.

---

## 🧪 Sample Test Files

Pre-configured test files are provided in the `sample_inputs/` directory:

| File | Type | Expected Result |
|---|---|---|
| `sample_real_article.txt` | Text (WHO Health Surveillance) | **Likely Real** (~88/100 Credibility) |
| `sample_fake_hoax.txt` | Text (Miracle Lemon Cancer Cure) | **Potentially Fake** (~36/100 Credibility) |
| `sample_news_screenshot.png` | Image Screenshot (Reuters Economic Report) | OCR Extraction &rarr; **Likely Real** |
| `sample_document.pdf` | PDF Document (Official Health Bulletin) | PDF Parsing &rarr; **Likely Real** |

### Testing Clipboard Paste (Ctrl+V)
1. Open any news website or image on your computer.
2. Press `Win + Shift + S` (Windows Snipping Tool) to capture a screenshot to your clipboard.
3. Switch to the TruthLens AI web app at `http://localhost:3000/analyze`.
4. Press `Ctrl + V`. TruthLens will instantly detect the clipboard image, render a preview, and prepare it for OCR analysis!

---

## 📊 Application Routes & Pages

- **`/` (Landing Page):** System overview, interactive quick-test widget, statistics counter, multimodal feature cards, and architecture pipeline.
- **`/analyze` (Multimodal Analyzer):** Central workbench with tabs for Text, Image (upload + drag-and-drop + Ctrl+V clipboard), PDF, and URL.
- **`/results` (Results Dashboard):** Detailed report featuring the Prediction Badge, Confidence Gauge, 0-100 Credibility Score breakdown, AI Journalistic Explanation, Detected Warning Flags, and Extracted OCR Text Inspector.
- **`/history` (Audit History):** Searchable, filterable archive of past verifications with delete and statistical summary cards.
- **`/model` (ML Performance Dashboard):** Supervised learning benchmark metrics, 4-model comparison table, confusion matrices, and top 15 informative features.
- **`/about` (Methodology & Ethics):** Academic framework, ethical AI guidelines, and links to verified fact-checking databases.

---

## 🔒 Security & Privacy Notice
- API keys are handled strictly via environment variables or optional ephemeral client headers.
- File uploads are validated by MIME type and strictly limited to 10MB.
- Uploaded image blobs are processed in memory and cleaned up to prevent persistent storage of user screenshots.
- Extracted HTML from external URLs is sanitized to neutralize malicious scripts.

---

## 📜 Academic Project Notice
TruthLens AI is an academic AI/ML project. Its predictions are computational estimations based on natural language processing, computer vision OCR, and statistical classification. Always verify critical news through primary journalistic wire services and independent fact-checking institutions.
