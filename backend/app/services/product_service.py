import logging

from sqlalchemy.orm import Session

from app import vector_store
from app.models import Product
from app.schemas import ProductCreate, ProductUpdate

logger = logging.getLogger(__name__)


def _sync_to_vector_store(product: Product) -> bool:
    try:
        vector_store.upsert_product(
            product_id=product.id,
            title=product.title,
            description=product.description,
            category=product.category,
            level=product.level,
            tags=product.tags,
            price=product.price,
        )
        return True
    except Exception:
        logger.exception("Failed to sync product %s to vector store", product.id)
        return False


def create_product(db: Session, data: ProductCreate) -> Product:
    product = Product(**data.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)

    product.vector_synced = _sync_to_vector_store(product)
    db.commit()
    db.refresh(product)
    return product


def update_product(db: Session, product: Product, data: ProductUpdate) -> Product:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(product, field, value)
    db.commit()
    db.refresh(product)

    product.vector_synced = _sync_to_vector_store(product)
    db.commit()
    db.refresh(product)
    return product


def delete_product(db: Session, product: Product) -> None:
    product_id = product.id
    db.delete(product)
    db.commit()
    try:
        vector_store.delete_product(product_id)
    except Exception:
        logger.exception("Failed to delete product %s from vector store", product_id)


def resync_pending_products(db: Session) -> int:
    """Retry vector sync for any product that failed dual-write earlier."""
    pending = db.query(Product).filter(Product.vector_synced.is_(False)).all()
    synced = 0
    for product in pending:
        if _sync_to_vector_store(product):
            product.vector_synced = True
            synced += 1
    db.commit()
    return synced
