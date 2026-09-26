from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path

class Settings(BaseSettings):
    DATABASE_URL:str
    SECRET_KEY:str
    ACCESS_TOKEN_EXPIRE_MINUTES:int
    ALGORITHM:str
    REFRESH_TOKEN_EXPIRE_DAYS: int 
    OTP_EXPIRE_MINUTES: int 

    APP_NAME: str = "CAMPUS HEALTH MANAGER"
    VERSION: str = "1.0.0"


    #mail
    SENDER_EMAIL:str
    GMAIL_PASSWORD:str

    CLOUDINARY_CLOUD_NAME: str
    CLOUDINARY_API_KEY: str
    CLOUDINARY_API_SECRET: str

    # core/config.py — add
    REDIS_URL: str | None = None
    RATE_LIMIT_DEFAULT: str = "100/minute"

    OPENFDA_URL: str = "https://api.fda.gov/drug/label.json"
    OPENFDA_API_KEY: str | None = None          # optional — raises the daily limit 1000 → 120,000
    OPENFDA_CACHE_DAYS: int = 7
    OPENFDA_TIMEOUT_SECONDS: float = 10.0
    OPENFDA_RESULT_LIMIT: int = 5

    


    model_config = SettingsConfigDict(env_file=Path(__file__).resolve().parent.parent / ".env", extra="ignore")


settings = Settings()



