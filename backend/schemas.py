# schemas.py

from pydantic import BaseModel, model_validator, field_validator
from typing import List, Optional
from datetime import datetime
import re


class UserCreate(BaseModel):
    email: str
    password: str
    role: str  # "student" or "teacher"
    name: str
    branch: Optional[str] = None
    year: Optional[str] = None
    semester: Optional[str] = None
    usn: Optional[str] = None

    @field_validator('usn')
    @classmethod
    def validate_usn_format(cls, v, info):
        if info.data.get('role') == 'student':
            if not v:
                raise ValueError("USN is required for students.")
            # USN format: 2JRXXXX000 (e.g., 2JR22CS001)
            usn_pattern = r'^2JR\d{2}[A-Z]{2}\d{3}$'
            if not re.match(usn_pattern, v.upper()):
                raise ValueError("USN must be in format 2JRXXXX000 (e.g., 2JR22CS001)")
            return v.upper()
        return v

    @model_validator(mode="after")
    def validate_student_fields(self):
        if self.role == "student":
            if not self.branch:
                raise ValueError("Branch is required for students.")
            if not self.year:
                raise ValueError("Year is required for students.")
            if not self.semester:
                raise ValueError("Semester is required for students.")
            if not self.usn:
                raise ValueError("USN is required for students.")
        return self


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
    user_id: int   # fixed type here
    question: str
    answer: str
    sources: Optional[str]
    branch: str
    year: str
    semester: str
    is_from_pdf: bool
    timestamp: datetime


# ---------- Profile Schemas ----------
class ProfileUpdate(BaseModel):
    name: str
    role: str
    branch: str
    year: str
    semester: str
    usn: Optional[str] = None

    @field_validator('usn')
    @classmethod
    def validate_usn_format(cls, v, info):
        if info.data.get('role') == 'student' and v:
            # USN format: 2JRXXXX000 (e.g., 2JR22CS001)
            usn_pattern = r'^2JR\d{2}[A-Z]{2}\d{3}$'
            if not re.match(usn_pattern, v.upper()):
                raise ValueError("USN must be in format 2JRXXXX000 (e.g., 2JR22CS001)")
            return v.upper()
        return v


class PasswordChange(BaseModel):
    currentPassword: str
    newPassword: str
    confirmPassword: str

    class Config:
        from_attributes = True


class QuestionSchema(BaseModel):
    text: str
    options: List[str]
    correctOption: int


class QuizCreateSchema(BaseModel):
    title: str
    description: str       # ✅ new
    dueDate: datetime      # ✅ new
    branch: str
    year: str
    semester: str
    subject: str
    questions: List[QuestionSchema]


class QuizSchema(QuizCreateSchema):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class QuizWithAttemptStatus(QuizSchema):
    has_attempted: bool = False
    best_score: Optional[int] = None
    total_attempts: int = 0


class QuizAttemptCreate(BaseModel):
    quiz_id: int
    student_id: int
    student_name: str
    score: int
    total: int
    answers: Optional[dict] = None


class QuizAttemptSchema(QuizAttemptCreate):
    id: int
    attempted_at: datetime

    class Config:
        from_attributes = True


class AnnouncementBase(BaseModel):
    content: str
    branch: str
    year: str
    semester: str
    subject: Optional[str] = None


class AnnouncementCreate(AnnouncementBase):
    pass


class AnnouncementResponse(AnnouncementBase):
    id: int
    created_at: datetime
    subject: Optional[str] = None

    class Config:
        from_attributes = True
