from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.sql import func
from db import Base


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    password = Column(String)
    role = Column(String)  # "student" or "teacher"
class SearchHistory(Base):
    __tablename__ = "search_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True)
    question = Column(Text)
    answer = Column(Text)
    sources = Column(Text)  # comma-separated or JSON string
    branch = Column(String)
    year = Column(String)
    semester = Column(String)
    is_from_pdf = Column(Boolean)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())