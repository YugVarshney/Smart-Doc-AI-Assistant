import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.core.config import settings
from backend.app.db.database import Base, engine
from backend.app.api import auth, documents, chats, analytics

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

try:
    logger.info("Synchronizing database tables...")
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables initialized successfully.")
except Exception as e:
    logger.error(f"Failed to initialize database tables: {e}")

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(documents.router, prefix=settings.API_V1_STR)
app.include_router(chats.router, prefix=settings.API_V1_STR)
app.include_router(analytics.router, prefix=settings.API_V1_STR)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "project": settings.PROJECT_NAME,
        "docs": f"{settings.API_V1_STR}/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
