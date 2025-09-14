import os


class Settings:
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    REDIS_URL: str | None = os.getenv("REDIS_URL")
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "deepseek")
    DEEPSEEK_API_KEY: str | None = os.getenv("DEEPSEEK_API_KEY")
    # Google Gemini
    GEMINI_PROVIDER_MODE: str = os.getenv("GEMINI_PROVIDER_MODE", "api")  # api | vertex
    GOOGLE_API_KEY: str | None = os.getenv("GOOGLE_API_KEY")
    GOOGLE_CLOUD_PROJECT: str | None = os.getenv("GOOGLE_CLOUD_PROJECT")
    GOOGLE_CLOUD_LOCATION: str = os.getenv("GOOGLE_CLOUD_LOCATION", "global")
    GOOGLE_GEMINI_MODEL: str = os.getenv("GOOGLE_GEMINI_MODEL", "gemini-2.5-flash")


settings = Settings()


