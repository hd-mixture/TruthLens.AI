import os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

BASE_DIR = Path(__file__).resolve().parent.parent
SAMPLES_DIR = BASE_DIR / "sample_inputs"
SAMPLES_DIR.mkdir(parents=True, exist_ok=True)

# 1. Real Sample Text
real_text = """According to a joint statement released on Thursday by the World Health Organization and regional public health ministries, epidemiological surveillance data collected across forty-five monitoring hospitals confirmed an eleven percent decrease in seasonal influenza complications. Clinical directors noted that widespread immunization adherence and early therapeutic intervention contributed significantly to stabilized hospitalization rates over the four-month evaluation cycle."""

with open(SAMPLES_DIR / "sample_real_article.txt", "w", encoding="utf-8") as f:
    f.write(real_text)

# 2. Fake Sample Text
fake_text = """SHOCKING DISCOVERY: Top researchers were mysteriously silenced after proving that boiling raw lemons with baking soda completely eradicates all malignant tumors within twenty-four hours! Greed-driven pharmaceutical executives are furiously lobbying to censor this ancient secret remedy. Forward this urgent alert to all your groups immediately before it is removed!"""

with open(SAMPLES_DIR / "sample_fake_hoax.txt", "w", encoding="utf-8") as f:
    f.write(fake_text)

# 3. Create a synthetic realistic news screenshot image for OCR testing
img_width, img_height = 800, 450
img = Image.new("RGB", (img_width, img_height), color=(255, 255, 255))
draw = ImageDraw.Draw(img)

# Draw simulated news header banner
draw.rectangle([(0, 0), (img_width, 60)], fill=(15, 23, 42))
draw.text((25, 20), "GLOBAL NEWS WIRE - VERIFIED REPORT", fill=(56, 189, 248))

# Draw news headline
headline = "Federal Reserve Holds Benchmark Rates Steady Amid Inflation Stabilization"
draw.text((25, 80), headline, fill=(15, 23, 42))

# Draw simulated metadata
draw.text((25, 120), "WASHINGTON (Reuters) - Updated October 2026 | Bureau Economic Analysis", fill=(100, 116, 139))

# Draw article body lines
body_lines = [
    "The Federal Reserve announced on Wednesday that benchmark interest rates will remain unchanged",
    "following their scheduled two-day policy summit in Washington. Central bank governors indicated",
    "that consumer price index figures and labor market metrics demonstrated balanced equilibrium.",
    "Treasury yields responded with moderate stability across domestic capital exchanges as analysts",
    "projected steady economic expansion through the forthcoming fiscal quarter."
]

y_pos = 160
for line in body_lines:
    draw.text((25, y_pos), line, fill=(30, 41, 59))
    y_pos += 30

img_path = SAMPLES_DIR / "sample_news_screenshot.png"
img.save(img_path)
print(f"Created sample screenshot image at {img_path}")

# 4. Create sample PDF document using reportlab or fpdf if available, or pypdf
try:
    from reportlab.lib.pagesizes import letter
    from reportlab.pdfgen import canvas
    pdf_path = SAMPLES_DIR / "sample_policy_document.pdf"
    c = canvas.Canvas(str(pdf_path), pagesize=letter)
    c.drawString(72, 720, "Official Department of Energy Regulatory Review")
    c.drawString(72, 690, "According to quarterly assessment data, renewable grid integration reached record")
    c.drawString(72, 670, "capacity across thirty member districts. Technical safety audits confirmed stability.")
    c.drawString(72, 650, "Independent observers and institutional analysts commended the transmission upgrades.")
    c.save()
    print(f"Created sample PDF at {pdf_path}")
except Exception as e:
    print(f"PDF generation note: {e}")
