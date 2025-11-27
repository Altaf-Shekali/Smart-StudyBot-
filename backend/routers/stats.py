# routers/stats.py
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from db import SessionLocal
from models import Activity, LearningProgress, User
from routers.query import get_current_user

router = APIRouter(prefix="/api", tags=["Stats"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class ActivityCreate(BaseModel):
    type: str                 # 'login' | 'study' | 'topic' | 'quiz' | 'study_session'
    subject: Optional[str] = None
    duration: Optional[int] = 0   # minutes
    progress: Optional[int] = None  # 0-100 (new progress for subject)

@router.get("/stats")
def get_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    total_minutes = db.query(func.coalesce(func.sum(LearningProgress.minutes), 0)).filter(LearningProgress.user_id == current_user.id).scalar()
    study_hours = round((total_minutes or 0) / 60, 1)

    topics_studied = db.query(func.count(LearningProgress.id)).filter(LearningProgress.user_id == current_user.id).scalar() or 0

    avg_progress = db.query(func.coalesce(func.avg(LearningProgress.progress), 0)).filter(LearningProgress.user_id == current_user.id).scalar() or 0

    study_sessions = db.query(func.coalesce(func.count(Activity.id), 0)).filter(Activity.user_id == current_user.id, Activity.type == 'study_session').scalar() or 0

    return {
        "studyHours": study_hours,
        "topicsStudied": topics_studied,
        "avgProgress": int(avg_progress),
        "studySessions": study_sessions
    }

@router.post("/activity")
def create_activity(payload: ActivityCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    act = Activity(
        user_id=current_user.id,
        type=payload.type,
        subject=payload.subject,
        duration=payload.duration or 0,
        progress_delta=payload.progress or 0
    )
    db.add(act)

    if payload.subject:
        lp = db.query(LearningProgress).filter_by(user_id=current_user.id, subject=payload.subject).first()
        if not lp:
            lp = LearningProgress(
                user_id=current_user.id,
                subject=payload.subject,
                progress=payload.progress or 0,
                minutes=payload.duration or 0
            )
            db.add(lp)
        else:
            if payload.progress is not None:
                lp.progress = min(100, max(0, payload.progress))
            if payload.duration:
                lp.minutes = (lp.minutes or 0) + payload.duration

    db.commit()
    return {"message": "Activity recorded"}
