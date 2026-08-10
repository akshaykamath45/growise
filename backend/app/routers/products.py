from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.auth import get_current_admin
from app.database import get_db
from app.models import Product
from app.schemas import ProductCreate, ProductOut, ProductUpdate
from app.services import product_service

router = APIRouter(prefix="/api/products", tags=["products"])


@router.get("", response_model=list[ProductOut])
def list_products(
    db: Session = Depends(get_db),
    category: str | None = None,
    level: str | None = None,
    q: str | None = None,
    max_price: float | None = None,
    limit: int = Query(24, le=100),
    offset: int = 0,
):
    query = db.query(Product)
    if category:
        query = query.filter(Product.category == category)
    if level:
        query = query.filter(Product.level == level)
    if max_price is not None:
        query = query.filter(Product.price <= max_price)
    if q:
        like = f"%{q}%"
        query = query.filter(or_(Product.title.ilike(like), Product.description.ilike(like)))
    return query.order_by(Product.created_at.desc()).offset(offset).limit(limit).all()


@router.get("/categories", response_model=list[str])
def list_categories(db: Session = Depends(get_db)):
    rows = db.query(Product.category).distinct().all()
    return [r[0] for r in rows]


@router.get("/{product_id}", response_model=ProductOut)
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.post("", response_model=ProductOut, dependencies=[Depends(get_current_admin)])
def create_product(data: ProductCreate, db: Session = Depends(get_db)):
    return product_service.create_product(db, data)


@router.patch("/{product_id}", response_model=ProductOut, dependencies=[Depends(get_current_admin)])
def update_product(product_id: int, data: ProductUpdate, db: Session = Depends(get_db)):
    product = db.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return product_service.update_product(db, product, data)


@router.delete("/{product_id}", status_code=204, dependencies=[Depends(get_current_admin)])
def delete_product(product_id: int, db: Session = Depends(get_db)):
    product = db.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    product_service.delete_product(db, product)
