from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from db import SessionLocal
from models import User
from utils import get_password_hash, verify_password
from routers.query import get_current_user

router = APIRouter(prefix="/api", tags=["Profile"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Schemas ---
class ProfileUpdate(BaseModel):
    name: str
    role: str
    branch: str
    year: str

class PasswordChange(BaseModel):
    currentPassword: str
    newPassword: str
    confirmPassword: str

# --- Endpoints ---

@router.get("/profile")
async def get_profile(current_user: User = Depends(get_current_user)):
    return {
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role,
        "branch": current_user.branch,
        "year": current_user.year
    }

@router.put("/profile")
async def update_profile(
    data: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    current_user.role = data.role
    current_user.name = data.name
    current_user.branch = data.branch
    current_user.year = data.year
    db.commit()
    return {"message": "Profile updated"}

@router.post("/change-password")
async def change_password(
    data: PasswordChange,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not verify_password(data.currentPassword, current_user.password):
        raise HTTPException(status_code=400, detail="Incorrect current password")

    if data.newPassword != data.confirmPassword:
        raise HTTPException(status_code=400, detail="New passwords do not match")

    current_user.password = get_password_hash(data.newPassword)
    db.commit()
    return {"message": "Password updated successfully"}
