from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from models import User, StudyStats
from db import get_db
from routers.query import get_current_user

router = APIRouter(prefix="/api/tracking", tags=["Tracking"])

# 🟢 Log a study session
@router.post("/log-session")
def log_session(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    stats = db.query(StudyStats).filter(StudyStats.user_id == current_user.id).first()

    if not stats:
        stats = StudyStats(
            user_id=current_user.id,
            study_hours=0,
            topics_studied=0,
            avg_progress=0,
            study_sessions=0,
            last_session=datetime.utcnow()
        )
        db.add(stats)

    stats.study_sessions += 1
    stats.last_session = datetime.utcnow()
    db.commit()

    return {"message": "Session logged", "sessions": stats.study_sessions}

# 🟢 Log study hours
@router.post("/log-hours")
def log_hours(hours: float, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    stats = db.query(StudyStats).filter(StudyStats.user_id == current_user.id).first()
    if stats:
        stats.study_hours += hours
        db.commit()
    return {"message": f"{hours} hours added"}

# 🟢 Log topic progress
@router.post("/log-topic")
def log_topic(progress: float, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    stats = db.query(StudyStats).filter(StudyStats.user_id == current_user.id).first()
    if stats:
        stats.topics_studied += 1
        # Calculate new average progress
        stats.avg_progress = (stats.avg_progress * (stats.topics_studied - 1) + progress) / stats.topics_studied
        db.commit()
    return {"message": "Topic logged", "avg_progress": stats.avg_progress}

# 🟢 Get current stats
@router.get("/stats")
def get_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    stats = db.query(StudyStats).filter(StudyStats.user_id == current_user.id).first()
    if not stats:
        return {"study_hours": 0, "topics_studied": 0, "avg_progress": 0, "study_sessions": 0}
    return {
        "study_hours": stats.study_hours,
        "topics_studied": stats.topics_studied,
        "avg_progress": stats.avg_progress,
        "study_sessions": stats.study_sessions
    }
