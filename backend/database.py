import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from backend.config import settings

# Configure engine with connection pooling and SQLite thread safety
connect_args = {}
db_url = settings.DATABASE_URL

def create_db_engine(url: str):
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    if url.startswith("sqlite"):
        return create_engine(url, connect_args={"check_same_thread": False}, echo=False)
    else:
        return create_engine(url, pool_size=10, max_overflow=20, pool_pre_ping=True, echo=False)

try:
    engine = create_db_engine(db_url)
    # Test connection
    with engine.connect() as conn:
        pass
except Exception as e:
    print(f"[Database] Warning: Could not connect to primary database ({db_url}): {e}")
    print("[Database] Falling back to local SQLite database (sqlite:///./database.sqlite)...")
    db_url = "sqlite:///./database.sqlite"
    engine = create_db_engine(db_url)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    """
    FastAPI dependency that provides a transactional SQLAlchemy database session.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
