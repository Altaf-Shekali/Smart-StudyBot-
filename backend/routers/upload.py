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

@router.post("/")
async def upload_pdf(
    file: UploadFile = File(...),
    branch: str = Form(...),
    year: str = Form(...),
    semester: str = Form(...),
    subject: str = Form(...),
    token: str = Form(...)
):
    user = decode_token(token)
    if not user or user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Unauthorized")

    file_path = os.path.join("data", file.filename)
    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    vec_path = os.path.join("vector_store", branch, year, semester, subject)
    os.makedirs(vec_path, exist_ok=True)
    create_vectorstore(file_path, vec_path)
    return {"message": f"{file.filename} uploaded and indexed."}
