from fastapi import APIRouter, UploadFile, Form, Depends, HTTPException, File
from utils import get_password_hash, verify_password, create_access_token
from jose import jwt
from sqlalchemy.orm import Session
from db import SessionLocal
from retriever import create_vectorstore
import os, shutil

router = APIRouter()

SECRET_KEY = "supersecret"
ALGORITHM = "HS256"

def decode_token(token):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except:
        return None

# In main.py upload endpoint
@app.post("/upload")
async def upload_pdf(
    file: UploadFile = File(...),
    branch: str = Form(...),
    year: str = Form(...),
    semester: str = Form(...),
    subject: str = Form(...)
):
    try:
        # Create structured directory
        save_dir = os.path.join(VECTOR_STORE_DIR, branch, year, semester, subject)
        os.makedirs(save_dir, exist_ok=True)
        
        # Save PDF
        pdf_path = os.path.join(save_dir, file.filename)
        with open(pdf_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
        
        # Create vectorstore in SUBJECT directory
        create_vectorstore(pdf_path, save_dir)  # ⬅️ Critical fix
        
        return {"message": f"Uploaded to {branch}/{year}/{semester}/{subject}"}
    except Exception as e:
        return JSONResponse(status_code=500, content={"message": str(e)})
