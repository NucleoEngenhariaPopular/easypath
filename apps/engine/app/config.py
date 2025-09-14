import os


class Settings:
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    REDIS_URL: str | None = os.getenv("REDIS_URL")
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "deepseek")
    DEEPSEEK_API_KEY: str | None = os.getenv("DEEPSEEK_API_KEY")


settings = Settings()


