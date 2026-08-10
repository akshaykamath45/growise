from langchain_openai import ChatOpenAI

from app.config import settings


def get_mesh_llm(temperature: float = 0.7) -> ChatOpenAI:
    """Chat model routed through Mesh API (OpenAI-compatible gateway).

    Using langchain's ChatOpenAI (rather than the raw OpenAI SDK) means every
    call is automatically traced by LangSmith when LANGCHAIN_TRACING_V2 is set.
    """
    return ChatOpenAI(
        base_url=settings.mesh_base_url,
        api_key=settings.mesh_api_key or "missing-mesh-api-key",
        model=settings.mesh_model,
        temperature=temperature,
    )
