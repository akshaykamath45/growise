from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


# ---- Auth ----
class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    tracking_opt_in: bool = True


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    email: str


class UserOut(BaseModel):
    id: int
    email: str
    role: str
    tracking_opt_in: bool

    model_config = {"from_attributes": True}


# ---- Products ----
class CourseLesson(BaseModel):
    title: str
    duration_label: str


class CourseSection(BaseModel):
    title: str
    summary: str
    duration_label: str
    lessons: list[CourseLesson]


class CourseContent(BaseModel):
    headline: str = ""
    overview: str
    outcomes: list[str]
    sections: list[CourseSection]


class ProductBase(BaseModel):
    title: str
    description: str
    category: str
    level: str = "Beginner"
    price: float = 0.0
    old_price: float | None = None
    instructor: str = ""
    duration_label: str = ""
    lessons_count: int = 0
    rating: float = 4.5
    reviews_count: int = 0
    tags: str = ""
    image_url: str | None = None
    course_content: CourseContent | None = None


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    category: str | None = None
    level: str | None = None
    price: float | None = None
    old_price: float | None = None
    instructor: str | None = None
    duration_label: str | None = None
    lessons_count: int | None = None
    rating: float | None = None
    reviews_count: int | None = None
    tags: str | None = None
    image_url: str | None = None
    course_content: CourseContent | None = None


class ProductOut(ProductBase):
    id: int
    vector_synced: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ---- Enrollments ----
class EnrollmentCreate(BaseModel):
    product_id: int


class EnrollmentOut(BaseModel):
    id: int
    product: ProductOut
    created_at: datetime

    model_config = {"from_attributes": True}


# ---- Events ----
class EventIn(BaseModel):
    event_type: str
    product_id: int | None = None
    search_query: str | None = None
    metadata: dict | None = None
    client_ts: datetime | None = None


class EventBatchIn(BaseModel):
    events: list[EventIn]


# ---- Recommendations ----
class RecommendationItemOut(BaseModel):
    product: ProductOut
    rank: int
    reason: str

    model_config = {"from_attributes": True}


class RecommendationOut(BaseModel):
    id: int
    narrative: str
    trigger_reason: str
    evidence: list[str] = []
    created_at: datetime
    items: list[RecommendationItemOut]

    model_config = {"from_attributes": True}
