import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import Base, engine, ensure_schema
from app.routers import auth, enrollments, events, products, recommendations

logging.basicConfig(level=logging.INFO)

Base.metadata.create_all(bind=engine)
ensure_schema()

app = FastAPI(title="Growise API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

STATIC_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")
os.makedirs(STATIC_DIR, exist_ok=True)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

app.include_router(auth.router)
app.include_router(products.router)
app.include_router(events.router)
app.include_router(enrollments.router)
app.include_router(recommendations.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
