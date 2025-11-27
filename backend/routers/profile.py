from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db import get_db
from models import User
from routers.query import get_current_user
from utils import verify_password, get_password_hash
from pydantic import BaseModel

router = APIRouter(tags=["Profile"])

# --- Schemas ---
class ProfileUpdate(BaseModel):
    name: str
    role: str
    branch: str
    year: str
    semester: str
    usn: str = ""
    
    class Config:
        # Allow extra fields and validate assignment
        extra = "forbid"
        validate_assignment = True

class PasswordChange(BaseModel):
    currentPassword: str
    newPassword: str
    confirmPassword: str

# --- Endpoints ---

@router.get("/profile")
def get_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Import models here to avoid circular imports
    from models import LearningProgress, Activity
    from sqlalchemy import func
    
    # Debug logging
    print(f"DEBUG: Getting profile for user {current_user.id}")
    print(f"DEBUG: Current user data - branch: '{current_user.branch}', year: '{current_user.year}', semester: '{current_user.semester}'")
    
    # Get user stats
    total_activities = db.query(Activity).filter(Activity.user_id == current_user.id).count()
    total_progress = db.query(LearningProgress).filter(LearningProgress.user_id == current_user.id).count()
    
    # Calculate completion rate (dummy calculation for now)
    completion_rate = min(100, (total_progress * 10)) if total_progress > 0 else 0
    
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role,
        "branch": current_user.branch,
        "year": current_user.year,
        "semester": current_user.semester,
        "usn": current_user.usn
    }

@router.put("/profile")
async def update_profile(
    request: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        print(f"DEBUG: Raw request data received: {request}")
        print(f"DEBUG: Request keys: {list(request.keys()) if request else 'No request data'}")
        
        print(f"DEBUG: Updating profile for user {current_user.id}")
        print(f"DEBUG: Old data - branch: '{current_user.branch}', year: '{current_user.year}', semester: '{current_user.semester}'")
        
        # Get fresh user object from current session to avoid session issues
        user_to_update = db.query(User).filter(User.id == current_user.id).first()
        if not user_to_update:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Extract data from request with fallbacks
        name = request.get('name', user_to_update.name)
        role = request.get('role', user_to_update.role)
        branch = request.get('branch', user_to_update.branch)
        year = request.get('year', user_to_update.year)
        semester = request.get('semester', user_to_update.semester)
        usn = request.get('usn', user_to_update.usn)
        
        print(f"DEBUG: New data - name: '{name}', role: '{role}', branch: '{branch}', year: '{year}', semester: '{semester}', usn: '{usn}'")
        
        # Update the fresh user object
        user_to_update.name = name
        user_to_update.role = role
        user_to_update.branch = str(branch).strip().upper() if branch else ""
        user_to_update.year = str(year).strip() if year else ""
        user_to_update.semester = str(semester).strip() if semester else ""
        user_to_update.usn = usn if usn else ""
        
        print(f"DEBUG: Before commit - branch: '{user_to_update.branch}', year: '{user_to_update.year}', semester: '{user_to_update.semester}'")
        
        db.commit()
        db.refresh(user_to_update)
        
        print(f"DEBUG: After commit - branch: '{user_to_update.branch}', year: '{user_to_update.year}', semester: '{user_to_update.semester}'")
        
        return {
            "message": "Profile updated successfully",
            "updated_data": {
                "branch": user_to_update.branch,
                "year": user_to_update.year,
                "semester": user_to_update.semester
            }
        }
    except Exception as e:
        print(f"ERROR: Profile update failed - {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Profile update failed: {str(e)}")

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
