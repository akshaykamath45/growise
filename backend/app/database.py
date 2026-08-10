from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker

from app.config import settings

connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
engine = create_engine(settings.database_url, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def ensure_schema() -> None:
    """Apply the small backwards-compatible schema additions used by the demo."""
    inspector = inspect(engine)
    if "products" not in inspector.get_table_names():
        return

    product_columns = {column["name"] for column in inspector.get_columns("products")}
    if "course_content" not in product_columns:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE products ADD COLUMN course_content JSON"))


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
