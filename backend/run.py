import uvicorn
import os
import sys
from pathlib import Path

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent))

if __name__ == "__main__":
    from app.config import settings
    print(f"Starting TruthLens AI Backend on http://{settings.HOST}:{settings.PORT}")
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
