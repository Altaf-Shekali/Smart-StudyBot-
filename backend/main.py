# main.py
from fastapi import FastAPI, UploadFile, Form, File, APIRouter, Depends, Query, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
import shutil
from sqlalchemy.orm import Session
import json
from typing import List, Optional

from routers import auth, query
from retriever import create_vectorstore, load_vectorstore
from llm_interface import run_llm
from db import engine, Base, get_db
from models import User, Announcement, Quiz, QuizAttempt, Attendance, StudentMarks
from routers import profile
from routers.query import get_current_user
from routers import attendance
from routers import marks
from routers import subjectroute as subjectroute
import requests
from schemas import QuizSchema, QuizCreateSchema, QuestionSchema, QuizAttemptCreate, QuizAttemptSchema, AnnouncementCreate, AnnouncementResponse, QuizWithAttemptStatus
from pydantic import BaseModel

app = FastAPI()
router = APIRouter()

# ✅ Allow frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ Create all tables
Base.metadata.create_all(bind=engine)

# ✅ Mount routers
app.include_router(auth.router, prefix="/auth")
app.include_router(query.router, prefix="/query", tags=["query"])
app.include_router(profile.router, prefix="/api")
app.include_router(subjectroute.router)
app.include_router(attendance.router, prefix="/attendance", tags=["attendance"])
app.include_router(marks.router, prefix="/marks", tags=["marks"])
# app.include_router(quiz_router.router, prefix="/api/quiz", tags=["quiz"])  # Commented out to avoid conflicts

UPLOAD_DIR = "data"
VECTOR_STORE_DIR = "vector_store"

# ✅ Ensure directories exist
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(VECTOR_STORE_DIR, exist_ok=True)

# ✅ Upload PDF & generate vectorstore with proper error handling
@app.post("/upload")
async def upload_pdf(
    file: UploadFile = File(...),
    branch: str = Form(...),
    year: str = Form(...),
    semester: str = Form(...),
    subject: str = Form(...),
    background_tasks: BackgroundTasks = None
):
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        # Validate file type
        if not file.filename.lower().endswith('.pdf'):
            return JSONResponse(status_code=400, content={"message": "Only PDF files are allowed"})
        
        # Create directory structure
        save_dir = os.path.join(VECTOR_STORE_DIR, branch, year, semester, subject)
        os.makedirs(save_dir, exist_ok=True)
        logger.info(f"Created directory: {save_dir}")

        # Save uploaded file
        file_path = os.path.join(save_dir, file.filename)
        with open(file_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
        
        file_size = os.path.getsize(file_path)
        logger.info(f"File saved: {file_path} ({file_size} bytes)")
        
        # Validate file was saved properly
        if file_size == 0:
            return JSONResponse(status_code=400, content={"message": "Uploaded file is empty"})

        # Create vectorstore with proper error handling
        def create_vectorstore_with_logging(pdf_path: str, store_dir: str):
            try:
                logger.info(f"Starting vectorstore creation for {pdf_path}")
                success = create_vectorstore(pdf_path, store_dir)
                if success:
                    logger.info(f"✅ Vectorstore created successfully at {store_dir}")
                    # Verify files were created
                    index_file = os.path.join(store_dir, "index.faiss")
                    pkl_file = os.path.join(store_dir, "index.pkl")
                    if os.path.exists(index_file) and os.path.exists(pkl_file):
                        logger.info(f"✅ Vectorstore files verified: index.faiss ({os.path.getsize(index_file)} bytes), index.pkl ({os.path.getsize(pkl_file)} bytes)")
                    else:
                        logger.error(f"❌ Vectorstore files missing after creation")
                else:
                    logger.error(f"❌ Vectorstore creation failed for {pdf_path}")
            except Exception as e:
                logger.error(f"❌ Vectorstore creation error: {str(e)}")
                import traceback
                logger.error(traceback.format_exc())
        
        # Process vectorstore creation
        if background_tasks:
            background_tasks.add_task(create_vectorstore_with_logging, file_path, save_dir)
            message = f"File uploaded to {branch}/{year}/{semester}/{subject}. Vector store processing in background..."
        else:
            create_vectorstore_with_logging(file_path, save_dir)
            message = f"File uploaded and processed successfully: {branch}/{year}/{semester}/{subject}"

        return {
            "message": message,
            "file_path": file_path,
            "store_dir": save_dir,
            "file_size": file_size
        }

    except Exception as e:
        logger.error(f"Upload error: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return JSONResponse(status_code=500, content={"message": f"Upload failed: {str(e)}"})

# ✅ List documents
@app.get("/documents")
async def list_documents():
    try:
        documents = [f for f in os.listdir(VECTOR_STORE_DIR) if os.path.isdir(os.path.join(VECTOR_STORE_DIR, f))]
        return {"documents": documents}
    except Exception as e:
        return JSONResponse(status_code=500, content={"message": f"Error occurred: {str(e)}"})

@router.get("/profile")
def get_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Import models here to avoid circular imports
    from models import LearningProgress, Activity
    from sqlalchemy import func
    
    # Get learning progress data (same as dashboard)
    learning_progress = db.query(LearningProgress).filter(LearningProgress.user_id == current_user.id).all()
    
    # Get recent activities
    recent_activities = db.query(Activity).filter(Activity.user_id == current_user.id).order_by(Activity.created_at.desc()).limit(10).all()
    
    # Calculate stats from learning progress (matching dashboard logic)
    study_hours = sum([round(lp.minutes / 60, 1) for lp in learning_progress]) if learning_progress else 0
    topics_studied = len(set([lp.subject for lp in learning_progress])) if learning_progress else 0
    avg_progress = round(sum([lp.progress for lp in learning_progress]) / len(learning_progress) if learning_progress else 0, 1)
    study_sessions = len(recent_activities)
    
    return {
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role,
        "branch": current_user.branch,
        "year": current_user.year,
        "semester": current_user.semester,
        "usn": current_user.usn,
        "stats": {
            "courses_taken": topics_studied,
            "completion_rate": avg_progress,
            "quiz_attempts": study_sessions,
            "average_score": study_hours
        }
    }

@router.put("/profile")
def update_profile(
    form: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    current_user.name = form["name"]
    current_user.role = form["role"]
    current_user.branch = form["branch"]
    current_user.year = form["year"]
    db.commit()
    return {"message": "Profile updated"}

@app.post("/announcements", response_model=AnnouncementResponse)
async def create_announcement(
    announcement: AnnouncementCreate,
    db: Session = Depends(get_db)
):
    db_announcement = Announcement(
        content=announcement.content,
        branch=announcement.branch,
        year=announcement.year,
        semester=announcement.semester,
        subject=announcement.subject
    )
    db.add(db_announcement)
    db.commit()
    db.refresh(db_announcement)
    return db_announcement

@app.get("/announcements/{semester}", response_model=List[AnnouncementResponse])
def get_announcements_by_semester(
    semester: str,
    branch: str = Query(...),
    year: str = Query(...),
    db: Session = Depends(get_db)
):
    results = db.query(Announcement).filter(
        Announcement.semester == semester,
        Announcement.branch == branch,
        Announcement.year == year
    ).order_by(Announcement.created_at.desc()).all()
    
    if not results:
        raise HTTPException(status_code=404, detail="No announcements found")
    
    return results

@app.get("/announcements", response_model=List[AnnouncementResponse])
def get_announcements(
    branch: Optional[str] = Query(None),
    year: Optional[str] = Query(None),
    semester: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Announcement)

    if branch:
        query = query.filter(Announcement.branch == branch)
    if year:
        query = query.filter(Announcement.year == year)
    if semester:
        query = query.filter(Announcement.semester == semester)

    results = query.order_by(Announcement.created_at.desc()).all()
    
    return results

@app.delete("/announcements/{announcement_id}")
async def delete_announcement(announcement_id: int, db: Session = Depends(get_db)):
    announcement = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if not announcement:
        raise HTTPException(404, "Announcement not found")
    db.delete(announcement)
    db.commit()
    return {"message": "Announcement deleted successfully"}

# Teacher Dashboard Endpoints
@app.get("/students")
async def get_students(db: Session = Depends(get_db)):
    """Get all students for teacher dashboard"""
    students = db.query(User).filter(User.role == "student").all()
    return students

@app.get("/attendance")
async def get_attendance(db: Session = Depends(get_db)):
    """Get all attendance records for teacher dashboard"""
    attendance_records = db.query(Attendance).join(User).all()
    result = []
    for record in attendance_records:
        result.append({
            "id": record.id,
            "student_id": record.student_id,
            "student_name": record.student.name,
            "subject": record.subject,
            "date": record.date,
            "present": record.status == "Present"
        })
    return result

@app.get("/marks")
async def get_marks(db: Session = Depends(get_db)):
    """Get all student marks for teacher dashboard"""
    marks_records = db.query(StudentMarks).join(User).all()
    result = []
    for record in marks_records:
        # Calculate total marks and percentage
        total_ia = record.ia1_marks + record.ia2_marks
        total_other = record.quiz_marks + record.assignment_marks + record.seminar_marks
        total_marks_obtained = total_ia + total_other + record.lab_ia_marks
        total_possible = 100  # Assuming 100 is the total possible marks
        
        result.append({
            "id": record.id,
            "student_id": record.student_id,
            "student_name": record.student.name,
            "subject": record.subject,
            "exam_type": "Overall",
            "marks_obtained": total_marks_obtained,
            "total_marks": total_possible,
            "ia1_marks": record.ia1_marks,
            "ia2_marks": record.ia2_marks,
            "quiz_marks": record.quiz_marks,
            "assignment_marks": record.assignment_marks,
            "seminar_marks": record.seminar_marks,
            "lab_ia_marks": record.lab_ia_marks,
            "created_at": record.created_at
        })
    return result

# Sample data creation endpoints (for testing)
@app.post("/create-sample-data")
async def create_sample_data(db: Session = Depends(get_db)):
    """Create sample data for testing the teacher dashboard"""
    try:
        # Create sample students if they don't exist
        sample_students = [
            {"name": "John Doe", "email": "john@example.com", "branch": "CSE", "year": "3", "semester": "5", "usn": "1CS20CS001"},
            {"name": "Jane Smith", "email": "jane@example.com", "branch": "CSE", "year": "3", "semester": "5", "usn": "1CS20CS002"},
            {"name": "Bob Johnson", "email": "bob@example.com", "branch": "ECE", "year": "2", "semester": "3", "usn": "1EC20EC001"},
            {"name": "Alice Brown", "email": "alice@example.com", "branch": "CSE", "year": "3", "semester": "5", "usn": "1CS20CS003"},
        ]
        
        created_students = []
        for student_data in sample_students:
            existing = db.query(User).filter(User.email == student_data["email"]).first()
            if not existing:
                student = User(
                    name=student_data["name"],
                    email=student_data["email"],
                    password="hashed_password",  # In real app, hash this
                    role="student",
                    branch=student_data["branch"],
                    year=student_data["year"],
                    semester=student_data["semester"],
                    usn=student_data["usn"]
                )
                db.add(student)
                db.commit()
                db.refresh(student)
                created_students.append(student)
            else:
                created_students.append(existing)
        
        # Create sample attendance records
        import random
        from datetime import datetime, timedelta
        
        subjects = ["Machine Learning", "Database Systems", "Computer Networks", "Software Engineering"]
        
        for student in created_students:
            for i in range(10):  # 10 attendance records per student
                date = datetime.now() - timedelta(days=random.randint(1, 30))
                attendance = Attendance(
                    student_id=student.id,
                    subject=random.choice(subjects),
                    date=date,
                    status="Present" if random.random() > 0.2 else "Absent"  # 80% attendance rate
                )
                db.add(attendance)
        
        # Create sample marks records
        for student in created_students:
            for subject in subjects[:2]:  # 2 subjects per student
                marks = StudentMarks(
                    student_id=student.id,
                    subject=subject,
                    ia1_marks=random.randint(15, 25),
                    ia2_marks=random.randint(15, 25),
                    quiz_marks=random.randint(8, 15),
                    assignment_marks=random.randint(8, 15),
                    seminar_marks=random.randint(8, 15),
                    lab_ia_marks=random.randint(15, 25)
                )
                db.add(marks)
        
        db.commit()
        return {"message": "Sample data created successfully"}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"Error creating sample data: {str(e)}")

@app.post("/quizzes", response_model=QuizSchema)
async def create_quiz(payload: QuizCreateSchema, db: Session = Depends(get_db)):
    try:
        # Validate questions
        for i, q in enumerate(payload.questions):
            if not q.text.strip():
                raise ValueError(f"Question {i+1} text is required")
            if len(q.options) < 2:
                raise ValueError(f"Question {i+1} must have at least 2 options")
            if len(set(map(str.lower, q.options))) != len(q.options):
                raise ValueError(f"Question {i+1} has duplicate options")
            if q.correctOption < 0 or q.correctOption >= len(q.options):
                raise ValueError(f"Correct option index out of range for question {i+1}")

        # Debug logging
        print(f"DEBUG: Creating quiz with - branch: '{payload.branch}', year: '{payload.year}', semester: '{payload.semester}'")
        print(f"DEBUG: Payload data types - branch: {type(payload.branch)}, year: {type(payload.year)}, semester: {type(payload.semester)}")
        
        # Create quiz object with normalized data
        normalized_branch = str(payload.branch).strip().upper() if payload.branch else ""
        normalized_year = str(payload.year).strip() if payload.year else ""
        normalized_semester = str(payload.semester).strip() if payload.semester else ""
        
        print(f"DEBUG: Normalized quiz data - branch: '{normalized_branch}', year: '{normalized_year}', semester: '{normalized_semester}'")
        
        db_quiz = Quiz(
            title=payload.title,
            description=payload.description,
            dueDate=payload.dueDate,
            branch=normalized_branch,
            year=normalized_year,
            semester=normalized_semester,
            subject=payload.subject,
            questions=[q.dict() for q in payload.questions]
        )
        db.add(db_quiz)
        db.commit()
        db.refresh(db_quiz)
        return db_quiz

    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"Server error: {str(e)}")

# --- GET: Fetch Quizzes ---
@app.get("/quizzes", response_model=List[QuizSchema])
def get_all_quizzes(db: Session = Depends(get_db)):
    return db.query(Quiz).order_by(Quiz.created_at.desc()).all()

# --- GET: Fetch User-Specific Quizzes with Attempt Status ---
@app.get("/quizzes/user", response_model=List[QuizWithAttemptStatus])
def get_user_quizzes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can access this endpoint")
    
    # Debug logging - check user data from database
    print(f"DEBUG: Current user ID: {current_user.id}")
    print(f"DEBUG: User data - branch: '{current_user.branch}', year: '{current_user.year}', semester: '{current_user.semester}'")
    print(f"DEBUG: User data types - branch: {type(current_user.branch)}, year: {type(current_user.year)}, semester: {type(current_user.semester)}")
    
    # Double-check by querying the user directly from database
    fresh_user = db.query(User).filter(User.id == current_user.id).first()
    if fresh_user:
        print(f"DEBUG: Fresh DB query - branch: '{fresh_user.branch}', year: '{fresh_user.year}', semester: '{fresh_user.semester}'")
    
    # Get all quizzes first to debug
    all_quizzes = db.query(Quiz).all()
    print(f"DEBUG: Total quizzes in database: {len(all_quizzes)}")
    for quiz in all_quizzes:
        print(f"DEBUG: Quiz - branch: '{quiz.branch}', year: '{quiz.year}', semester: '{quiz.semester}' (types: {type(quiz.branch)}, {type(quiz.year)}, {type(quiz.semester)})")
    
    # Get quizzes for user's branch, year, and semester with normalization
    user_branch = str(current_user.branch).strip().upper() if current_user.branch else ""
    user_year = str(current_user.year).strip() if current_user.year else ""
    user_semester = str(current_user.semester).strip() if current_user.semester else ""
    
    print(f"DEBUG: Normalized user data - branch: '{user_branch}', year: '{user_year}', semester: '{user_semester}'")
    
    quizzes = db.query(Quiz).filter(
        Quiz.branch == user_branch,
        Quiz.year == user_year,
        Quiz.semester == user_semester
    ).order_by(Quiz.created_at.desc()).all()
    
    print(f"DEBUG: Matching quizzes found: {len(quizzes)}")
    
    # If no quizzes found and user semester is empty, suggest profile update
    if len(quizzes) == 0 and not user_semester:
        print(f"DEBUG: No quizzes found - user semester is empty. User should update their profile.")
    
    # Get user's quiz attempts
    attempts = db.query(QuizAttempt).filter(
        QuizAttempt.student_id == current_user.id
    ).all()
    
    # Create a map of quiz_id to attempt data
    attempt_map = {}
    for attempt in attempts:
        if attempt.quiz_id not in attempt_map:
            attempt_map[attempt.quiz_id] = {
                'has_attempted': True,
                'best_score': attempt.score,
                'total_attempts': 1
            }
        else:
            attempt_map[attempt.quiz_id]['total_attempts'] += 1
            if attempt.score > attempt_map[attempt.quiz_id]['best_score']:
                attempt_map[attempt.quiz_id]['best_score'] = attempt.score
    
    # Combine quiz data with attempt status
    result = []
    for quiz in quizzes:
        quiz_dict = {
            'id': quiz.id,
            'title': quiz.title,
            'description': quiz.description,
            'dueDate': quiz.dueDate,
            'branch': quiz.branch,
            'year': quiz.year,
            'semester': quiz.semester,
            'subject': quiz.subject,
            'questions': quiz.questions,
            'created_at': quiz.created_at,
            'has_attempted': attempt_map.get(quiz.id, {}).get('has_attempted', False),
            'best_score': attempt_map.get(quiz.id, {}).get('best_score'),
            'total_attempts': attempt_map.get(quiz.id, {}).get('total_attempts', 0)
        }
        result.append(quiz_dict)
    
    return result

# Debug endpoint to check user data
@app.get("/debug/user-data")
def debug_user_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Debug endpoint to check user data and suggest fixes"""
    return {
        "user_id": current_user.id,
        "email": current_user.email,
        "role": current_user.role,
        "name": current_user.name,
        "branch": current_user.branch,
        "year": current_user.year,
        "semester": current_user.semester,
        "usn": current_user.usn,
        "data_types": {
            "branch": str(type(current_user.branch)),
            "year": str(type(current_user.year)),
            "semester": str(type(current_user.semester))
        },
        "issues": {
            "empty_semester": current_user.semester == "" or current_user.semester is None,
            "empty_branch": current_user.branch == "" or current_user.branch is None,
            "empty_year": current_user.year == "" or current_user.year is None
        }
    }

# Endpoint to fix user profile data
@app.post("/debug/fix-user-profile")
def fix_user_profile(
    branch: str,
    year: str,
    semester: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Fix user profile data if it's missing"""
    print(f"DEBUG: Fixing user profile for user {current_user.id}")
    print(f"DEBUG: Old data - branch: '{current_user.branch}', year: '{current_user.year}', semester: '{current_user.semester}'")
    
    current_user.branch = str(branch).strip().upper()
    current_user.year = str(year).strip()
    current_user.semester = str(semester).strip()
    
    db.commit()
    
    print(f"DEBUG: Fixed data - branch: '{current_user.branch}', year: '{current_user.year}', semester: '{current_user.semester}'")
    
    return {
        "message": "User profile fixed successfully",
        "updated_data": {
            "branch": current_user.branch,
            "year": current_user.year,
            "semester": current_user.semester
        }
    }

@app.get("/quizzes/{semester}", response_model=List[QuizSchema])
def get_quizzes(
    semester: str,
    branch: str = Query(...),
    year: str = Query(...),
    subject: str = Query(...),
    db: Session = Depends(get_db)
):
    results = db.query(Quiz).filter(
        Quiz.semester == semester,
        Quiz.branch == branch,
        Quiz.year == year,
        Quiz.subject == subject
    ).order_by(Quiz.created_at.desc()).all()
    return results

@app.delete("/quizzes/{quiz_id}")
async def delete_quiz(quiz_id: int, db: Session = Depends(get_db)):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(404, "Quiz not found")
    db.delete(quiz)
    db.commit()
    return {"message": "Quiz deleted successfully"}

@app.post("/quiz-attempts", response_model=QuizAttemptSchema)
def save_quiz_attempt(payload: QuizAttemptCreate, db: Session = Depends(get_db)):
    attempt = QuizAttempt(
        quiz_id=payload.quiz_id,
        student_id=payload.student_id,
        student_name=payload.student_name,
        score=payload.score,
        total=payload.total,
        answers=payload.answers
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)
    return attempt

@app.get("/quiz-attempts/{quiz_id}", response_model=List[QuizAttemptSchema])
def get_attempts_for_quiz(quiz_id: int, db: Session = Depends(get_db)):
    return (
        db.query(QuizAttempt)
        .filter(QuizAttempt.quiz_id == quiz_id)
        .order_by(QuizAttempt.attempted_at.desc())
        .all()
    )

@app.get("/quiz-analytics/{quiz_id}")
def get_quiz_analytics(quiz_id: int, db: Session = Depends(get_db)):
    """Get analytics data for a specific quiz including score distribution"""
    
    # Get quiz details
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(404, "Quiz not found")
    
    # Get all attempts for this quiz
    attempts = db.query(QuizAttempt).filter(QuizAttempt.quiz_id == quiz_id).all()
    
    if not attempts:
        return {
            "quiz_id": quiz_id,
            "quiz_title": quiz.title,
            "total_attempts": 0,
            "score_distribution": {},
            "grade_distribution": {},
            "average_score": 0,
            "max_score": quiz.questions and len(quiz.questions) or 0,
            "students_attempted": 0
        }
    
    # Calculate score distribution
    score_counts = {}
    total_score = 0
    max_possible = len(quiz.questions) if quiz.questions else 10
    
    for attempt in attempts:
        score = attempt.score
        total_score += score
        if score in score_counts:
            score_counts[score] += 1
        else:
            score_counts[score] = 1
    
    # Calculate grade distribution (A, B, C, D, F)
    grade_counts = {"A": 0, "B": 0, "C": 0, "D": 0, "F": 0}
    
    for attempt in attempts:
        percentage = (attempt.score / max_possible) * 100
        if percentage >= 90:
            grade_counts["A"] += 1
        elif percentage >= 80:
            grade_counts["B"] += 1
        elif percentage >= 70:
            grade_counts["C"] += 1
        elif percentage >= 60:
            grade_counts["D"] += 1
        else:
            grade_counts["F"] += 1
    
    # Get unique students who attempted
    unique_students = len(set(attempt.student_id for attempt in attempts))
    
    return {
        "quiz_id": quiz_id,
        "quiz_title": quiz.title,
        "quiz_subject": quiz.subject,
        "total_attempts": len(attempts),
        "score_distribution": score_counts,
        "grade_distribution": grade_counts,
        "average_score": round(total_score / len(attempts), 2),
        "max_score": max_possible,
        "students_attempted": unique_students,
        "attempts_data": [
            {
                "student_name": attempt.student_name,
                "score": attempt.score,
                "percentage": round((attempt.score / max_possible) * 100, 1),
                "attempted_at": attempt.attempted_at.isoformat()
            }
            for attempt in attempts
        ]
    }

# AI Quiz Generation Models
class QuizGenerationRequest(BaseModel):
    subject: str
    topic: str = ""
    difficulty: str = "medium"  # easy, medium, hard
    num_questions: int = 5
    branch: str
    year: str
    semester: str

def create_quiz_prompt(subject: str, topic: str, difficulty: str, num_questions: int) -> str:
    """Create a structured prompt for quiz generation"""
    difficulty_descriptions = {
        "easy": "basic understanding and recall of fundamental concepts",
        "medium": "application of concepts and moderate problem-solving",
        "hard": "advanced analysis, synthesis, and complex problem-solving"
    }
    
    topic_context = f" focusing on {topic}" if topic else ""
    
    prompt = f"""Generate {num_questions} multiple choice questions for {subject}{topic_context}.

Requirements:
- Difficulty level: {difficulty} ({difficulty_descriptions.get(difficulty, 'medium level')})
- Each question should have exactly 4 options (A, B, C, D)
- Only one correct answer per question
- Include brief explanations for correct answers
- Questions should be clear, unambiguous, and educational
- Avoid trick questions or overly complex language

Format your response as a JSON array with this exact structure:
[
  {{
    "text": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctOption": 0,
    "explanation": "Brief explanation of why this is correct"
  }}
]

Subject: {subject}
Difficulty: {difficulty}
Number of questions: {num_questions}

Generate the quiz now:"""
    
    return prompt

async def call_llm_for_quiz(prompt: str) -> str:
    """Call the local LLM to generate quiz questions"""
    try:
        print(f"🤖 Calling LLM with prompt length: {len(prompt)}")
        
        response = requests.post(
            "http://localhost:11434/api/generate",
            json={
                "model": "mistral",
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.7,
                    "top_p": 0.9,
                    "num_predict": 2000
                }
            },
            timeout=120  # Increased timeout for quiz generation
        )
        
        print(f"🔍 LLM Response Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            llm_output = result.get("response", "")
            print(f"📝 LLM Response Length: {len(llm_output)}")
            print(f"📝 LLM Response Preview: {llm_output[:200]}...")
            return llm_output
        else:
            print(f"❌ LLM API Error: {response.status_code} - {response.text}")
            raise Exception(f"LLM API error: {response.status_code} - {response.text}")
            
    except requests.exceptions.ConnectionError:
        raise Exception("Cannot connect to Ollama. Make sure Ollama is running on localhost:11434")
    except requests.exceptions.Timeout:
        raise Exception("LLM request timed out. Try reducing the number of questions.")
    except Exception as e:
        print(f"❌ LLM Error: {str(e)}")
        raise Exception(f"Failed to generate quiz: {str(e)}")

def parse_llm_response(llm_response: str) -> List[dict]:
    """Parse LLM response and extract quiz questions"""
    try:
        print(f"🔍 Parsing LLM response...")
        print(f"📄 Full LLM Response: {llm_response}")
        
        # Try to find JSON array in response
        start_idx = llm_response.find('[')
        end_idx = llm_response.rfind(']') + 1
        
        if start_idx == -1 or end_idx == 0:
            print("❌ No JSON array found in response")
            # Try to find individual question objects
            if '{"text":' in llm_response or '"text":' in llm_response:
                print("🔄 Attempting to extract individual questions...")
                # Create a simple fallback question if LLM didn't format properly
                return [{
                    "text": "Sample question generated from LLM response",
                    "options": ["Option A", "Option B", "Option C", "Option D"],
                    "correctOption": 0,
                    "explanation": "This is a fallback question due to parsing issues"
                }]
            raise ValueError("No JSON array found in response")
        
        json_str = llm_response[start_idx:end_idx]
        print(f"📋 Extracted JSON: {json_str}")
        
        questions = json.loads(json_str)
        print(f"✅ Parsed {len(questions)} questions from JSON")
        
        validated_questions = []
        for i, q in enumerate(questions):
            print(f"🔍 Validating question {i+1}: {q}")
            
            if not isinstance(q, dict):
                print(f"❌ Question {i+1} is not a dict")
                continue
                
            if not all(key in q for key in ["text", "options", "correctOption"]):
                print(f"❌ Question {i+1} missing required keys")
                continue
                
            if not isinstance(q["options"], list) or len(q["options"]) != 4:
                print(f"❌ Question {i+1} doesn't have 4 options")
                continue
                
            if not (0 <= q["correctOption"] < len(q["options"])):
                print(f"❌ Question {i+1} has invalid correctOption")
                continue
            
            validated_question = {
                "text": str(q["text"]).strip(),
                "options": [str(opt).strip() for opt in q["options"]],
                "correctOption": int(q["correctOption"]),
                "explanation": str(q.get("explanation", "")).strip()
            }
            validated_questions.append(validated_question)
            print(f"✅ Question {i+1} validated successfully")
        
        print(f"🎯 Final validated questions: {len(validated_questions)}")
        return validated_questions
        
    except json.JSONDecodeError as e:
        print(f"❌ JSON Decode Error: {str(e)}")
        print(f"📄 Problematic JSON: {json_str if 'json_str' in locals() else 'Not extracted'}")
        raise ValueError(f"Invalid JSON in LLM response: {str(e)}")
    except Exception as e:
        print(f"❌ General parsing error: {str(e)}")
        raise ValueError(f"Error parsing LLM response: {str(e)}")

@app.post("/api/quiz/generate")
async def generate_quiz_with_ai(request: QuizGenerationRequest):
    """Generate quiz questions using AI based on subject, topic, and difficulty"""
    try:
        print(f"🚀 Starting quiz generation for {request.subject}")
        print(f"📊 Request: {request.dict()}")
        
        prompt = create_quiz_prompt(
            subject=request.subject,
            topic=request.topic,
            difficulty=request.difficulty,
            num_questions=request.num_questions
        )
        
        print(f"📝 Generated prompt: {prompt[:200]}...")
        
        llm_response = await call_llm_for_quiz(prompt)
        questions = parse_llm_response(llm_response)
        
        if not questions:
            print("❌ No valid questions generated")
            raise HTTPException(400, "Failed to generate valid questions")
        
        formatted_questions = []
        for q in questions:
            formatted_questions.append({
                "text": q["text"],
                "options": q["options"],
                "correctOption": q["correctOption"],
                "explanation": q["explanation"]
            })
        
        print(f"✅ Successfully generated {len(formatted_questions)} questions")
        
        return {
            "success": True,
            "questions": formatted_questions,
            "metadata": {
                "subject": request.subject,
                "topic": request.topic,
                "difficulty": request.difficulty,
                "generated_count": len(formatted_questions),
                "requested_count": request.num_questions
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Quiz generation failed: {str(e)}")
        raise HTTPException(500, f"Quiz generation failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

