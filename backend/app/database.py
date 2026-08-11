from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker

from app.config import settings

connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
engine = create_engine(settings.database_url, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def ensure_schema() -> None:
    """Apply small backwards-compatible schema additions used by the demo."""
    inspector = inspect(engine)
    if "products" not in inspector.get_table_names():
        return

    product_columns = {column["name"] for column in inspector.get_columns("products")}
    recommendation_columns = {column["name"] for column in inspector.get_columns("recommendations")}
    with engine.begin() as connection:
        if "course_content" not in product_columns:
            connection.execute(text("ALTER TABLE products ADD COLUMN course_content JSON"))
        if "agent_run_id" not in recommendation_columns:
            # The new agent_runs table is created by Base.metadata.create_all.
            # The reference is intentionally nullable so existing recommendation
            # history stays valid and can remain untraced.
            connection.execute(text("ALTER TABLE recommendations ADD COLUMN agent_run_id INTEGER"))


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
