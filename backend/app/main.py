import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.api.routes import router as api_router
from app.ml.pipeline import load_ml_assets

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("truthlens")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing TruthLens AI application...")
    # Preload ML model and vectorizer into memory
    load_ml_assets()
    logger.info("TruthLens AI ML models ready.")
    yield
    logger.info("Shutting down TruthLens AI...")


app = FastAPI(
    title="TruthLens AI Backend API",
    description="Multimodal Fake News Detection System utilizing Machine Learning, NLP, OpenCV, EasyOCR, and Generative AI.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
allowed_origins = [origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins if "*" not in allowed_origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes under /api
app.include_router(api_router, prefix="/api")


@app.get("/")
def root_endpoint():
    return {
        "app": "TruthLens AI",
        "tagline": "Analyze. Verify. Understand.",
        "status": "online",
        "version": "1.0.0",
        "docs_url": "/docs"
    }


@app.get("/health")
def health_endpoint():
    return {
        "status": "healthy",
        "service": "TruthLens AI Backend",
        "ocr_available": True
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
