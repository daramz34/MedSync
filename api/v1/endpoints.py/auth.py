from database import get_db
from schemas import UserCreate, UserResponse, TokenResponse
from crud import create_user, authenticate_user, get_user_emal, get_user_username
from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.orm import Session
from core.security import create_access_token
from fastapi.security import OAuth2PasswordRequestForm
from service.email import send_welcome_email
from models import User