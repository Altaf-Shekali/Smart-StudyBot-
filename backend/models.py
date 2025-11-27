# models.py

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from db import Base
from datetime import datetime


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    password = Column(String)
    role = Column(String)  # "student" or "teacher"
    name = Column(String, default="")
    branch = Column(String, default="")
    year = Column(String, default="")
    semester = Column(String, default="")  # Current semester
    usn = Column(String, default="")  # University Seat Number

    # relationships
    activities = relationship("Activity", back_populates="user", cascade="all, delete-orphan")
    learning_progress = relationship("LearningProgress", back_populates="user", cascade="all, delete-orphan")
    search_history = relationship("SearchHistory", back_populates="user", cascade="all, delete-orphan")


class Activity(Base):
    __tablename__ = "activities"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    type = Column(String, nullable=False)        # 'login', 'study', 'topic', 'quiz', 'study_session'
    subject = Column(String, nullable=True)      # topic name (if any)
    duration = Column(Integer, default=0)        # minutes
    progress_delta = Column(Integer, default=0)  # optional percent points change
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="activities")


class LearningProgress(Base):
    __tablename__ = "learning_progress"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    subject = Column(String, nullable=False, index=True)
    progress = Column(Integer, default=0)         # 0-100
    minutes = Column(Integer, default=0)          # total minutes studied on this subject
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="learning_progress")


class SearchHistory(Base):
    __tablename__ = "search_history"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    session_id = Column(String, index=True)  # New: Chat session identifier
    question = Column(Text)
    answer = Column(Text)
    sources = Column(Text)  # comma-separated or JSON string
    branch = Column(String)
    year = Column(String)
    semester = Column(String)
    is_from_pdf = Column(Boolean)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="search_history")


class Announcement(Base):
    __tablename__ = "announcements"
    
    id = Column(Integer, primary_key=True, index=True)
    content = Column(String, nullable=False)
    branch = Column(String, nullable=False)
    year = Column(String, nullable=False)
    semester = Column(String, nullable=False)
    subject = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Quiz(Base):
    __tablename__ = "quizzes"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)  # ✅ new
    dueDate = Column(DateTime, nullable=False)   # ✅ new
    branch = Column(String, nullable=False)
    year = Column(String, nullable=False)
    semester = Column(String, nullable=False)
    subject = Column(String, nullable=False)
    questions = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"), nullable=False)
    student_id = Column(Integer, nullable=False)  # Could also be ForeignKey("users.id")
    student_name = Column(String, nullable=False)
    score = Column(Integer, nullable=False)
    total = Column(Integer, nullable=False)
    answers = Column(JSON, nullable=True)
    attempted_at = Column(DateTime, default=datetime.utcnow)

class Attendance(Base):
    __tablename__ = "attendance"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    subject = Column(String, nullable=False)
    date = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="Absent")  # Present / Absent

    student = relationship("User")


class StudentMarks(Base):
    __tablename__ = "student_marks"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    subject = Column(String, nullable=False)
    ia1_marks = Column(Integer, default=0)  # Internal Assessment 1 (part of 25 total for IAs)
    ia2_marks = Column(Integer, default=0)  # Internal Assessment 2 (part of 25 total for IAs)
    quiz_marks = Column(Integer, default=0)  # Quiz marks (part of 25 total for Quiz+Assignment+Seminar)
    assignment_marks = Column(Integer, default=0)  # Assignment marks (part of 25 total)
    seminar_marks = Column(Integer, default=0)  # Seminar marks (part of 25 total)
    lab_ia_marks = Column(Integer, default=0)  # Lab Internal Assessment marks (optional)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    student = relationship("User")

