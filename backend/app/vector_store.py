import chromadb
from chromadb.utils import embedding_functions

from app.config import settings

_client = chromadb.PersistentClient(path=settings.chroma_persist_dir)
_embedding_fn = embedding_functions.DefaultEmbeddingFunction()

courses_collection = _client.get_or_create_collection(
    name="courses",
    embedding_function=_embedding_fn,
)


def product_document(title: str, description: str, category: str, level: str, tags: str) -> str:
    return f"{title}\nCategory: {category}\nLevel: {level}\nTags: {tags}\n\n{description}"


def upsert_product(product_id: int, title: str, description: str, category: str, level: str, tags: str, price: float) -> None:
    courses_collection.upsert(
        ids=[str(product_id)],
        documents=[product_document(title, description, category, level, tags)],
        metadatas=[
            {
                "product_id": product_id,
                "title": title,
                "category": category,
                "level": level,
                "price": price,
            }
        ],
    )


def delete_product(product_id: int) -> None:
    courses_collection.delete(ids=[str(product_id)])


def query_products(query_text: str, n_results: int = 5, where: dict | None = None):
    # Chroma rejects a request larger than the collection. The agent deliberately
    # over-fetches to filter enrolled courses, so cap it safely for a small/new
    # catalog instead of turning a valid recommendation into an API error.
    available = courses_collection.count()
    if available == 0:
        return {"ids": [[]], "metadatas": [[]], "distances": [[]]}
    return courses_collection.query(
        query_texts=[query_text],
        n_results=min(n_results, available),
        where=where,
    )
