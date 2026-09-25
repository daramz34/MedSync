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
        

    


    model_config = SettingsConfigDict(env_file=Path(__file__).resolve().parent.parent / ".env", extra="ignore")


settings = Settings()

