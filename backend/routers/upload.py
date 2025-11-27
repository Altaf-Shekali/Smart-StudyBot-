from fastapi import APIRouter, UploadFile, Form, Depends, HTTPException, File
from utils import get_password_hash, verify_password, create_access_token
from jose import jwt
from sqlalchemy.orm import Session
from db import SessionLocal
from retriever import create_vectorstore
import os, shutil

router = APIRouter()
VECTOR_STORE_DIR = "vector_store"

# Import environment variables from auth module
from routers.auth import SECRET_KEY, ALGORITHM

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
    subject: str = Form(...),
    background_tasks: BackgroundTasks = None
):
    try:
        save_dir = os.path.join(VECTOR_STORE_DIR, branch, year, semester, subject)
        os.makedirs(save_dir, exist_ok=True)

        file_path = os.path.join(save_dir, file.filename)
        with open(file_path, "wb") as f:
            shutil.copyfileobj(file.file, f)

        # ✅ Background vectorstore creation for instant returns
        if background_tasks:
            background_tasks.add_task(create_vectorstore, file_path, save_dir)
        else:
            create_vectorstore(file_path, save_dir)

        return {"message": f"Uploaded to {branch}/{year}/{semester}/{subject}, processing in background..."}

    except Exception as e:
        return JSONResponse(status_code=500, content={"message": str(e)})
