from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import jwt, JWTError
from db import SessionLocal
from models import User
from schemas import UserCreate
from utils import get_password_hash, verify_password, create_access_token
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

SECRET_KEY = os.getenv("SECRET_KEY", "fallback_secret_key_for_development")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
HF_API_TOKEN = os.getenv("HF_API_TOKEN")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/signup")
@router.post("/signup")
async def signup_user(
    user_data: UserCreate,
    db: Session = Depends(get_db)
):
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create the user with or without branch/year/semester/usn based on role
    new_user = User(
        email=user_data.email,
        password=get_password_hash(user_data.password),
        role=user_data.role,
        name=user_data.name,
        branch=user_data.branch or "",
        year=user_data.year or "",
        semester=user_data.semester or "",
        usn=user_data.usn or ""
    )

    db.add(new_user)
    db.commit()
    return {"message": "User created successfully"}


@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_access_token({"sub": user.email, "role": user.role})
    return {"access_token": token, "token_type": "bearer", "role": user.role}

@router.get("/me")
def get_me(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if not email:
            raise HTTPException(status_code=403, detail="Token invalid")
        user = db.query(User).filter(User.email == email).first()
        return {"email": user.email, "role": user.role}
    except JWTError:
        raise HTTPException(status_code=403, detail="Token decode failed")
