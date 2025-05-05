from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta
import os

SECRET_KEY = "supersecret"
ALGORITHM = "HS256"
EXPIRE_MINUTES = 60

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password):
    return pwd_context.hash(password)

def verify_password(plain, hashed):
    return pwd_context.verify(plain, hashed)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
import os  # Make sure this is at the top of utils.py

# Add to utils.py
def validate_directory_structure(base_path):
    """Check for either PDFs or FAISS indexes"""
    if not os.path.exists(base_path):
        return False
        
    # Check for any PDF files directly
    if any(f.endswith(".pdf") for f in os.listdir(base_path)):
        return True
        
    # Check subdirectories for indexes
    for subject in os.listdir(base_path):
        subject_dir = os.path.join(base_path, subject)
        if os.path.isdir(subject_dir):
            if any(f.endswith((".faiss", ".pkl")) for f in os.listdir(subject_dir)):
                return True
    return False