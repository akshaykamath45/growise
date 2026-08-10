from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./growise.db"
    chroma_persist_dir: str = "./chroma_data"

    jwt_secret: str = "dev-secret-change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7

    mesh_api_key: str = ""
    mesh_base_url: str = "https://api.meshapi.ai/v1"
    mesh_model: str = "openai/gpt-4o-mini"

    cors_origins: list[str] = ["http://localhost:3000"]

    # Agent trigger tuning
    recommendation_min_new_events: int = 5
    recommendation_cooldown_minutes: int = 10


settings = Settings()
