from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


# ---------- User Schemas ----------
class UserCreate(BaseModel):
    email: str
    password: str
    role: str
    name: str
    branch: str
    year: str



class UserLogin(BaseModel):
    email: str
    password: str


# ---------- Query Request/Response ----------
class QueryRequest(BaseModel):
    branch: str
    year: str
    semester: str
    question: str


class QueryResponse(BaseModel):
    answer: str
    sources: List[str]
    is_from_pdf: bool


class SearchHistoryEntry(BaseModel):
    id: int
    user_id: str
    question: str
    answer: str
    sources: Optional[str]
    branch: str
    year: str
    is_from_pdf: bool
    timestamp: datetime
# ---------- Profile Schemas ----------
class ProfileUpdate(BaseModel):
    name: str
    role: str
    branch: str
    year: str

class PasswordChange(BaseModel):
    currentPassword: str
    newPassword: str
    confirmPassword: str


    class Config:
        from_attributes = True

