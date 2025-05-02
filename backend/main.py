from fastapi import FastAPI, UploadFile, Form,File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
import shutil

from routers import auth, query  # ✅ Import auth and query routers
from retriever import create_vectorstore, load_vectorstore
from llm_interface import run_llm_ollama
from db import engine, Base
from models import User

app = FastAPI()

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
app.include_router(auth.router, prefix="/auth")    # ✅ Auth
app.include_router(query.router, prefix="/query", tags=["query"])

UPLOAD_DIR = "data"
VECTOR_STORE_DIR = "vector_store"

# ✅ Ensure directories exist
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(VECTOR_STORE_DIR, exist_ok=True)

# ✅ Upload PDF & generate vectorstore
# Modified upload endpoint in main.py
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
        
        # Save PDF temporarily
        temp_pdf = os.path.join(save_dir, file.filename)
        with open(temp_pdf, "wb") as f:
            shutil.copyfileobj(file.file, f)
        
        # Create vectorstore in the subject directory
        create_vectorstore(temp_pdf, save_dir)
        
        return {"message": f"Uploaded to {branch}/{year}/{semester}/{subject}"}
    except Exception as e:
        return JSONResponse(status_code=500, content={"message": str(e)})

# ✅ List documents
@app.get("/documents")
async def list_documents():
    try:
        documents = [f for f in os.listdir(VECTOR_STORE_DIR) if os.path.isdir(os.path.join(VECTOR_STORE_DIR, f))]
        return {"documents": documents}
    except Exception as e:
        return JSONResponse(status_code=500, content={"message": f"Error occurred: {str(e)}"})
