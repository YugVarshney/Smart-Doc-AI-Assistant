import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from backend.app.core.config import settings

logger = logging.getLogger(__name__)

Base = declarative_base()

engine = None
SessionLocal = None
is_sqlite = False

try:
    engine = create_engine(
        settings.DATABASE_URL,
        pool_pre_ping=True
    )
    with engine.connect() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
        conn.commit()
    logger.info("Successfully connected to PostgreSQL with pgvector.")
except Exception as e:
    logger.warning(f"PostgreSQL connection failed or pgvector extension creation failed: {e}")
    if settings.DATABASE_FALLBACK_SQLITE:
        logger.info("Falling back to SQLite database.")
        engine = create_engine(
            settings.SQLITE_URL,
            connect_args={"check_same_thread": False}
        )
        is_sqlite = True
    else:
        raise e

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
