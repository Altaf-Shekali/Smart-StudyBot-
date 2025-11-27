from fastapi import APIRouter, Depends, HTTPException, Form
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from db import get_db
from models import User, StudentMarks
from datetime import datetime, date
from typing import List, Dict
from pydantic import BaseModel
from fastapi import UploadFile, File
import pandas as pd
import io

router = APIRouter(tags=["Marks"])

# Pydantic models for request/response
class MarksEntryRequest(BaseModel):
    usn: str
    subject: str
    ia1_marks: int = 0
    ia2_marks: int = 0
    quiz_marks: int = 0
    assignment_marks: int = 0
    seminar_marks: int = 0
    lab_ia_marks: int = 0

class MarksResponse(BaseModel):
    usn: str
    name: str
    subject: str
    ia1_marks: int
    ia2_marks: int
    quiz_marks: int
    assignment_marks: int
    seminar_marks: int
    lab_ia_marks: int
    total_marks: int

# ✅ Get students from DB based on branch, year, semester (reuse from attendance)
@router.get("/students")
def get_students(branch: str, year: str, semester: str, db: Session = Depends(get_db)):
    """Get students from database based on branch, year, and semester"""
    
    # Normalize inputs to match typical student data format
    branch_normalized = branch.lower().strip()
    year_normalized = str(year).strip()
    semester_normalized = str(semester).strip()
    
    # Debug: Log the query parameters
    print(f"🔍 Original params: branch='{branch}', year='{year}', semester='{semester}'")
    print(f"🔄 Normalized params: branch='{branch_normalized}', year='{year_normalized}', semester='{semester_normalized}'")
    
    # Get all students first for debugging
    all_students = db.query(User).filter(User.role == "student").all()
    print(f"📊 Total students in DB: {len(all_students)}")
    
    if all_students:
        print("📋 Sample student data:")
        for s in all_students[:3]:
            print(f"   - {s.name}: branch='{s.branch}', year='{s.year}', semester='{s.semester}'")
    
    # Try normalized search with flexible matching
    students = db.query(User).filter(
        User.role == "student",
        func.lower(User.branch) == branch_normalized,
        User.year == year_normalized,
        User.semester == semester_normalized
    ).all()
    
    print(f"🎯 Normalized search found: {len(students)} students")
    
    # If still no match, try converting year/semester to int and back to string
    if len(students) == 0:
        try:
            year_int = int(year_normalized)
            semester_int = int(semester_normalized)
            
            students = db.query(User).filter(
                User.role == "student",
                func.lower(User.branch) == branch_normalized,
                User.year.in_([str(year_int), year_int]),
                User.semester.in_([str(semester_int), semester_int])
            ).all()
            print(f"🔄 Flexible type search found: {len(students)} students")
        except ValueError:
            print("⚠️ Could not convert year/semester to integer")

    return {
        "students": [
            {
                "id": s.id,
                "usn": s.usn,
                "name": s.name,
                "branch": s.branch,
                "year": s.year,
                "semester": s.semester,
            }
            for s in students
        ],
        "count": len(students),
        "found_in_db": len(students) > 0,
        "debug_info": {
            "original_params": {"branch": branch, "year": year, "semester": semester},
            "normalized_params": {"branch": branch_normalized, "year": year_normalized, "semester": semester_normalized},
            "total_students_in_db": len(all_students)
        }
    }

@router.post("/entry")
def enter_marks(marks_data: MarksEntryRequest, db: Session = Depends(get_db)):
    """Enter or update marks for a student by USN"""
    try:
        # Find student by USN
        student = db.query(User).filter(
            User.usn == marks_data.usn,
            User.role == "student"
        ).first()
        
        if not student:
            raise HTTPException(status_code=404, detail=f"Student with USN {marks_data.usn} not found")
        
        # Check if marks already exist for this student and subject
        existing_marks = db.query(StudentMarks).filter(
            and_(
                StudentMarks.student_id == student.id,
                StudentMarks.subject == marks_data.subject
            )
        ).first()
        
        if existing_marks:
            # Update existing record
            existing_marks.ia1_marks = marks_data.ia1_marks
            existing_marks.ia2_marks = marks_data.ia2_marks
            existing_marks.quiz_marks = marks_data.quiz_marks
            existing_marks.assignment_marks = marks_data.assignment_marks
            existing_marks.seminar_marks = marks_data.seminar_marks
            existing_marks.lab_ia_marks = marks_data.lab_ia_marks
            existing_marks.updated_at = datetime.utcnow()
        else:
            # Create new marks record
            new_marks = StudentMarks(
                student_id=student.id,
                subject=marks_data.subject,
                ia1_marks=marks_data.ia1_marks,
                ia2_marks=marks_data.ia2_marks,
                quiz_marks=marks_data.quiz_marks,
                assignment_marks=marks_data.assignment_marks,
                seminar_marks=marks_data.seminar_marks,
                lab_ia_marks=marks_data.lab_ia_marks
            )
            db.add(new_marks)
        
        db.commit()
        
        # Calculate total: IA1+IA2 converted to 25 total + Quiz+Assignment+Seminar (25 total) + Lab IA(optional)
        # IA conversion: (IA1 + IA2) * 25/50 = (IA1 + IA2) * 0.5
        ia_total = (marks_data.ia1_marks + marks_data.ia2_marks) * 0.5  # Convert 50 marks to 25
        other_total = marks_data.quiz_marks + marks_data.assignment_marks + marks_data.seminar_marks  # Max 25
        total_marks = ia_total + other_total + marks_data.lab_ia_marks
        
        return {
            "message": f"Marks entered for {student.name} (USN: {marks_data.usn})",
            "student_name": student.name,
            "usn": marks_data.usn,
            "subject": marks_data.subject,
            "total_marks": total_marks,
            "marks_breakdown": {
                "ia1": marks_data.ia1_marks,
                "ia2": marks_data.ia2_marks,
                "quiz": marks_data.quiz_marks,
                "assignment": marks_data.assignment_marks,
                "seminar": marks_data.seminar_marks,
                "lab_ia": marks_data.lab_ia_marks
            }
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/bulk-entry")
def enter_bulk_marks(marks_list: List[MarksEntryRequest], db: Session = Depends(get_db)):
    """Enter marks for multiple students at once"""
    try:
        results = []
        
        for marks_data in marks_list:
            # Find student by USN
            student = db.query(User).filter(
                User.usn == marks_data.usn,
                User.role == "student"
            ).first()
            
            if not student:
                results.append({
                    "usn": marks_data.usn,
                    "status": "error",
                    "message": f"Student with USN {marks_data.usn} not found"
                })
                continue
            
            # Check if marks already exist
            existing_marks = db.query(StudentMarks).filter(
                and_(
                    StudentMarks.student_id == student.id,
                    StudentMarks.subject == marks_data.subject
                )
            ).first()
            
            if existing_marks:
                existing_marks.ia1_marks = marks_data.ia1_marks
                existing_marks.ia2_marks = marks_data.ia2_marks
                existing_marks.quiz_marks = marks_data.quiz_marks
                existing_marks.assignment_marks = marks_data.assignment_marks
                existing_marks.seminar_marks = marks_data.seminar_marks
                existing_marks.lab_ia_marks = marks_data.lab_ia_marks
                existing_marks.updated_at = datetime.utcnow()
            else:
                new_marks = StudentMarks(
                    student_id=student.id,
                    subject=marks_data.subject,
                    ia1_marks=marks_data.ia1_marks,
                    ia2_marks=marks_data.ia2_marks,
                    quiz_marks=marks_data.quiz_marks,
                    assignment_marks=marks_data.assignment_marks,
                    seminar_marks=marks_data.seminar_marks,
                    lab_ia_marks=marks_data.lab_ia_marks
                )
                db.add(new_marks)
            
            # Calculate total: IA1+IA2 converted to 25 total + Quiz+Assignment+Seminar (25 total) + Lab IA(optional)
            # IA conversion: (IA1 + IA2) * 25/50 = (IA1 + IA2) * 0.5
            ia_total = (marks_data.ia1_marks + marks_data.ia2_marks) * 0.5  # Convert 50 marks to 25
            other_total = marks_data.quiz_marks + marks_data.assignment_marks + marks_data.seminar_marks  # Max 25
            total_marks = ia_total + other_total + marks_data.lab_ia_marks
            
            results.append({
                "usn": marks_data.usn,
                "student_name": student.name,
                "status": "success",
                "total_marks": total_marks,
                "message": "Marks entered successfully"
            })
        
        db.commit()
        return {"results": results}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/student/{usn}")
def get_student_marks(usn: str, db: Session = Depends(get_db)):
    """Get marks summary for a specific student by USN"""
    try:
        # Find student by USN
        student = db.query(User).filter(
            User.usn == usn,
            User.role == "student"
        ).first()
        
        if not student:
            raise HTTPException(status_code=404, detail=f"Student with USN {usn} not found")
        
        # Get marks records for this student
        marks_records = db.query(StudentMarks).filter(
            StudentMarks.student_id == student.id
        ).all()
        
        # Format marks summary
        marks_summary = []
        for record in marks_records:
            # Calculate total: IA1+IA2 converted to 25 total + Quiz+Assignment+Seminar (25 total) + Lab IA(optional)
            # IA conversion: (IA1 + IA2) * 25/50 = (IA1 + IA2) * 0.5
            ia_total = (record.ia1_marks + record.ia2_marks) * 0.5  # Convert 50 marks to 25
            other_total = record.quiz_marks + record.assignment_marks + record.seminar_marks  # Max 25
            total_marks = ia_total + other_total + record.lab_ia_marks
            
            marks_summary.append({
                "usn": usn,
                "name": student.name,
                "subject": record.subject,
                "ia1_marks": record.ia1_marks,
                "ia2_marks": record.ia2_marks,
                "quiz_marks": record.quiz_marks,
                "assignment_marks": record.assignment_marks,
                "seminar_marks": record.seminar_marks,
                "lab_ia_marks": record.lab_ia_marks,
                "total_marks": total_marks,
                "updated_at": record.updated_at.isoformat() if record.updated_at else None
            })
        
        return {
            "student_info": {
                "usn": usn,
                "name": student.name,
                "branch": student.branch,
                "year": student.year,
                "semester": student.semester
            },
            "marks_summary": marks_summary
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/subject/{subject}")
def get_subject_marks(subject: str, branch: str = None, year: str = None, semester: str = None, db: Session = Depends(get_db)):
    """Get marks for all students in a specific subject"""
    try:
        # Build query for students
        student_query = db.query(User).filter(User.role == "student")
        
        if branch:
            student_query = student_query.filter(User.branch == branch)
        if year:
            student_query = student_query.filter(User.year == year)
        if semester:
            student_query = student_query.filter(User.semester == semester)
        
        students = student_query.all()
        
        marks_data = []
        
        for student in students:
            # Get marks record for this student and subject
            marks_record = db.query(StudentMarks).filter(
                and_(
                    StudentMarks.student_id == student.id,
                    StudentMarks.subject == subject
                )
            ).first()
            
            if marks_record:
                # Calculate total: IA1+IA2 converted to 25 total + Quiz+Assignment+Seminar (25 total) + Lab IA(optional)
                # IA conversion: (IA1 + IA2) * 25/50 = (IA1 + IA2) * 0.5
                ia_total = (marks_record.ia1_marks + marks_record.ia2_marks) * 0.5  # Convert 50 marks to 25
                other_total = marks_record.quiz_marks + marks_record.assignment_marks + marks_record.seminar_marks  # Max 25
                total_marks = ia_total + other_total + marks_record.lab_ia_marks
                
                marks_data.append({
                    "usn": student.usn,
                    "name": student.name,
                    "branch": student.branch,
                    "year": student.year,
                    "semester": student.semester,
                    "ia1_marks": marks_record.ia1_marks,
                    "ia2_marks": marks_record.ia2_marks,
                    "quiz_marks": marks_record.quiz_marks,
                    "assignment_marks": marks_record.assignment_marks,
                    "seminar_marks": marks_record.seminar_marks,
                    "lab_ia_marks": marks_record.lab_ia_marks,
                    "total_marks": total_marks
                })
            else:
                # Student exists but no marks entered yet
                marks_data.append({
                    "usn": student.usn,
                    "name": student.name,
                    "branch": student.branch,
                    "year": student.year,
                    "semester": student.semester,
                    "ia1_marks": 0,
                    "ia2_marks": 0,
                    "quiz_marks": 0,
                    "assignment_marks": 0,
                    "seminar_marks": 0,
                    "lab_ia_marks": 0,
                    "total_marks": 0
                })
        
        return {
            "subject": subject,
            "filters": {
                "branch": branch,
                "year": year,
                "semester": semester
            },
            "marks_data": marks_data
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/student/{usn}/subject/{subject}")
def get_student_subject_marks(usn: str, subject: str, db: Session = Depends(get_db)):
    """Get marks for a specific student and subject"""
    try:
        # Find student by USN
        student = db.query(User).filter(
            User.usn == usn,
            User.role == "student"
        ).first()
        
        if not student:
            raise HTTPException(status_code=404, detail=f"Student with USN {usn} not found")
        
        # Get marks record for this student and subject
        marks_record = db.query(StudentMarks).filter(
            and_(
                StudentMarks.student_id == student.id,
                StudentMarks.subject == subject
            )
        ).first()
        
        if not marks_record:
            # Return zero marks if no record exists
            return {
                "usn": usn,
                "name": student.name,
                "subject": subject,
                "ia1_marks": 0,
                "ia2_marks": 0,
                "quiz_marks": 0,
                "assignment_marks": 0,
                "seminar_marks": 0,
                "lab_ia_marks": 0,
                "total_marks": 0,
                "has_marks": False
            }
        
        # Calculate total: IA1+IA2 converted to 25 total + Quiz+Assignment+Seminar (25 total) + Lab IA(optional)
        # IA conversion: (IA1 + IA2) * 25/50 = (IA1 + IA2) * 0.5
        ia_total = (marks_record.ia1_marks + marks_record.ia2_marks) * 0.5  # Convert 50 marks to 25
        other_total = marks_record.quiz_marks + marks_record.assignment_marks + marks_record.seminar_marks  # Max 25
        total_marks = ia_total + other_total + marks_record.lab_ia_marks
        
        return {
            "usn": usn,
            "name": student.name,
            "subject": subject,
            "ia1_marks": marks_record.ia1_marks,
            "ia2_marks": marks_record.ia2_marks,
            "quiz_marks": marks_record.quiz_marks,
            "assignment_marks": marks_record.assignment_marks,
            "seminar_marks": marks_record.seminar_marks,
            "lab_ia_marks": marks_record.lab_ia_marks,
            "total_marks": total_marks,
            "has_marks": True,
            "updated_at": marks_record.updated_at.isoformat() if marks_record.updated_at else None
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
