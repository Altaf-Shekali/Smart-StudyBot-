from fastapi import APIRouter, Depends, HTTPException, Form
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from db import get_db
from models import User, Attendance
from datetime import datetime, date
from typing import List, Dict
from pydantic import BaseModel
from fastapi import UploadFile, File
import pandas as pd
import io

router = APIRouter(tags=["Attendance"])

# Pydantic models for request/response
class AttendanceMarkRequest(BaseModel):
    usn: str
    subject: str
    status: str  # "Present" or "Absent"
    date: str = None  # Optional, defaults to today

class AttendanceResponse(BaseModel):
    usn: str
    name: str
    subject: str
    total_classes: int
    present_count: int
    absent_count: int
    percentage: float

class StudentUploadData(BaseModel):
    usn: str
    name: str
    branch: str
    year: str
    semester: str

# ✅ Get students from DB based on branch, year, semester
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

@router.post("/mark")
def mark_attendance(attendance_data: AttendanceMarkRequest, db: Session = Depends(get_db)):
    """Mark attendance for a student by USN"""
    try:
        # Find student by USN
        student = db.query(User).filter(
            User.usn == attendance_data.usn,
            User.role == "student"
        ).first()
        
        if not student:
            raise HTTPException(status_code=404, detail=f"Student with USN {attendance_data.usn} not found")
        
        # Parse date or use today
        attendance_date = datetime.strptime(attendance_data.date, "%Y-%m-%d").date() if attendance_data.date else date.today()
        
        # Check if attendance already exists for this date and subject
        existing_attendance = db.query(Attendance).filter(
            and_(
                Attendance.student_id == student.id,
                Attendance.subject == attendance_data.subject,
                func.date(Attendance.date) == attendance_date
            )
        ).first()
        
        if existing_attendance:
            # Update existing record
            existing_attendance.status = attendance_data.status
            existing_attendance.date = datetime.combine(attendance_date, datetime.min.time())
        else:
            # Create new attendance record
            new_attendance = Attendance(
                student_id=student.id,
                subject=attendance_data.subject,
                status=attendance_data.status,
                date=datetime.combine(attendance_date, datetime.min.time())
            )
            db.add(new_attendance)
        
        db.commit()
        
        return {
            "message": f"Attendance marked for {student.name} (USN: {attendance_data.usn})",
            "student_name": student.name,
            "usn": attendance_data.usn,
            "subject": attendance_data.subject,
            "status": attendance_data.status,
            "date": attendance_date.isoformat()
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/bulk-mark")
def mark_bulk_attendance(attendance_list: List[AttendanceMarkRequest], db: Session = Depends(get_db)):
    """Mark attendance for multiple students at once"""
    try:
        results = []
        
        for attendance_data in attendance_list:
            # Find student by USN
            student = db.query(User).filter(
                User.usn == attendance_data.usn,
                User.role == "student"
            ).first()
            
            if not student:
                results.append({
                    "usn": attendance_data.usn,
                    "status": "error",
                    "message": f"Student with USN {attendance_data.usn} not found"
                })
                continue
            
            # Parse date or use today
            attendance_date = datetime.strptime(attendance_data.date, "%Y-%m-%d").date() if attendance_data.date else date.today()
            
            # Check if attendance already exists
            existing_attendance = db.query(Attendance).filter(
                and_(
                    Attendance.student_id == student.id,
                    Attendance.subject == attendance_data.subject,
                    func.date(Attendance.date) == attendance_date
                )
            ).first()
            
            if existing_attendance:
                existing_attendance.status = attendance_data.status
                existing_attendance.date = datetime.combine(attendance_date, datetime.min.time())
            else:
                new_attendance = Attendance(
                    student_id=student.id,
                    subject=attendance_data.subject,
                    status=attendance_data.status,
                    date=datetime.combine(attendance_date, datetime.min.time())
                )
                db.add(new_attendance)
            
            results.append({
                "usn": attendance_data.usn,
                "student_name": student.name,
                "status": "success",
                "message": "Attendance marked successfully"
            })
        
        db.commit()
        return {"results": results}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/student/{usn}")
def get_student_attendance(usn: str, db: Session = Depends(get_db)):
    """Get attendance summary for a specific student by USN"""
    try:
        # Find student by USN
        student = db.query(User).filter(
            User.usn == usn,
            User.role == "student"
        ).first()
        
        if not student:
            raise HTTPException(status_code=404, detail=f"Student with USN {usn} not found")
        
        # Get attendance records grouped by subject
        attendance_records = db.query(Attendance).filter(
            Attendance.student_id == student.id
        ).all()
        
        # Group by subject and calculate percentages
        subject_attendance = {}
        
        for record in attendance_records:
            subject = record.subject
            if subject not in subject_attendance:
                subject_attendance[subject] = {
                    "total_classes": 0,
                    "present_count": 0,
                    "absent_count": 0
                }
            
            subject_attendance[subject]["total_classes"] += 1
            if record.status == "Present":
                subject_attendance[subject]["present_count"] += 1
            else:
                subject_attendance[subject]["absent_count"] += 1
        
        # Calculate percentages and format response
        attendance_summary = []
        for subject, data in subject_attendance.items():
            percentage = (data["present_count"] / data["total_classes"] * 100) if data["total_classes"] > 0 else 0
            
            attendance_summary.append({
                "usn": usn,
                "name": student.name,
                "subject": subject,
                "total_classes": data["total_classes"],
                "present_count": data["present_count"],
                "absent_count": data["absent_count"],
                "percentage": round(percentage, 2)
            })
        
        return {
            "student_info": {
                "usn": usn,
                "name": student.name,
                "branch": student.branch,
                "year": student.year,
                "semester": student.semester
            },
            "attendance_summary": attendance_summary
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/subject/{subject}")
def get_subject_attendance(subject: str, branch: str = None, year: str = None, semester: str = None, db: Session = Depends(get_db)):
    """Get attendance for all students in a specific subject"""
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
        
        attendance_data = []
        
        for student in students:
            # Get attendance records for this student and subject
            records = db.query(Attendance).filter(
                and_(
                    Attendance.student_id == student.id,
                    Attendance.subject == subject
                )
            ).all()
            
            total_classes = len(records)
            present_count = sum(1 for r in records if r.status == "Present")
            absent_count = total_classes - present_count
            percentage = (present_count / total_classes * 100) if total_classes > 0 else 0
            
            attendance_data.append({
                "usn": student.usn,
                "name": student.name,
                "branch": student.branch,
                "year": student.year,
                "semester": student.semester,
                "total_classes": total_classes,
                "present_count": present_count,
                "absent_count": absent_count,
                "percentage": round(percentage, 2)
            })
        
        return {
            "subject": subject,
            "filters": {
                "branch": branch,
                "year": year,
                "semester": semester
            },
            "attendance_data": attendance_data
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload-students")
async def upload_students_excel(
    file: UploadFile = File(...),
    branch: str = Form(...),
    year: str = Form(...),
    semester: str = Form(...),
    db: Session = Depends(get_db)
):
    """Upload students from Excel file when not found in database"""
    try:
        # Validate file type
        if not file.filename.endswith(('.xlsx', '.xls', '.csv')):
            raise HTTPException(status_code=400, detail="Please upload an Excel (.xlsx, .xls) or CSV file")
        
        # Read file content
        content = await file.read()
        
        # Parse based on file type
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.StringIO(content.decode('utf-8')))
        else:
            df = pd.read_excel(io.BytesIO(content))
        
        # Validate required columns
        required_columns = ['usn', 'name']
        missing_columns = [col for col in required_columns if col.lower() not in df.columns.str.lower()]
        
        if missing_columns:
            raise HTTPException(
                status_code=400, 
                detail=f"Missing required columns: {missing_columns}. Required: USN, Name"
            )
        
        # Normalize column names
        df.columns = df.columns.str.lower()
        
        # Create or update students in database
        created_students = []
        updated_students = []
        errors = []
        
        for index, row in df.iterrows():
            try:
                usn = str(row['usn']).strip()
                name = str(row['name']).strip()
                
                if not usn or not name:
                    errors.append(f"Row {index + 1}: Missing USN or Name")
                    continue
                
                # Check if student already exists
                existing_student = db.query(User).filter(
                    User.usn == usn,
                    User.role == "student"
                ).first()
                
                if existing_student:
                    # Update existing student's details
                    existing_student.name = name
                    existing_student.branch = branch
                    existing_student.year = year
                    existing_student.semester = semester
                    updated_students.append({
                        "usn": usn,
                        "name": name,
                        "action": "updated"
                    })
                else:
                    # Create new student
                    new_student = User(
                        email=f"{usn.lower()}@student.edu",  # Generate email from USN
                        password="defaultpass123",  # Default password
                        role="student",
                        name=name,
                        branch=branch,
                        year=year,
                        semester=semester,
                        usn=usn
                    )
                    db.add(new_student)
                    created_students.append({
                        "usn": usn,
                        "name": name,
                        "action": "created"
                    })
                    
            except Exception as e:
                errors.append(f"Row {index + 1}: {str(e)}")
        
        db.commit()
        
        return {
            "message": "Students processed successfully",
            "summary": {
                "created": len(created_students),
                "updated": len(updated_students),
                "errors": len(errors)
            },
            "details": {
                "created_students": created_students,
                "updated_students": updated_students,
                "errors": errors
            }
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")
