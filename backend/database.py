import os
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import declarative_base, sessionmaker, Mapped, mapped_column
from sqlalchemy import String, DateTime, JSON

DATABASE_URL = "sqlite+aiosqlite:///./synora.db"

# When testing, we might want to use an in-memory db
if os.getenv("TESTING") == "1":
    DATABASE_URL = "sqlite+aiosqlite:///:memory:"

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

Base = declarative_base()

class DBJob(Base):
    __tablename__ = "jobs"

    job_id: Mapped[str] = mapped_column(String, primary_key=True, index=True)
    status: Mapped[str] = mapped_column(String, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    detections: Mapped[list] = mapped_column(JSON, default=list)
    error: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

from typing import AsyncGenerator
async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI Dependency that provides an asynchronous database session.
    Yields the session and ensures it is safely closed after the request.
    """
    async with AsyncSessionLocal() as session:
        yield session
