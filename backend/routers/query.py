import os
import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse, FileResponse
from sqlalchemy.orm import Session
from jose import JWTError, jwt

from db import SessionLocal
from models import SearchHistory, User
from schemas import QueryRequest, QueryResponse
from retriever import search_multiple_indexes
from llm_interface import run_llm_ollama
from utils import validate_directory_structure
from routers.auth import oauth2_scheme, SECRET_KEY, ALGORITHM

router = APIRouter()
logger = logging.getLogger(__name__)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if email is None:
            raise credentials_exception
        user = db.query(User).filter(User.email == email).first()
        if user is None:
            raise credentials_exception
        return user
    except JWTError:
        raise credentials_exception

@router.post("/", response_model=QueryResponse)
async def query_document(
    query: QueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        base_path = os.path.join("vector_store", query.branch, query.year, query.semester)
        
        # Enhanced path validation
        if not os.path.exists(base_path):
            logger.error(f"Base path not found: {base_path}")
            return JSONResponse(
                status_code=404,
                content={
                    "answer": "🛑 Invalid academic path structure",
                    "sources": [],
                    "is_from_pdf": False
                }
            )

        if not validate_directory_structure(base_path):
            logger.warning(f"No valid course materials in: {base_path}")
            return JSONResponse(
                status_code=404,
                content={
                    "answer": "📕 No course materials found for selected criteria",
                    "sources": [],
                    "is_from_pdf": False
                }
            )

        results = search_multiple_indexes(base_path, query.question)
        context = "\n".join(results["matched_chunks"])
        sources = list({src.split("/")[0] for src in results["sources"]})

        if context:
            prompt = f"""**INSTRUCTIONS**
1. Use ONLY provided materials
2. Cite sources with [1], [2] notation
3. Structure:
- Start with "According to course materials:"
- Bullet points for key concepts
- End with "Reference sources: [sources]"

**MATERIALS**
{context}

**QUESTION**
{query.question}

**RESPONSE**"""
            answer = run_llm_ollama(prompt)
            is_from_pdf = True
        else:
            prompt = f"""Answer concisely: {query.question}
Add "Note: General knowledge answer (not from course materials)" at end"""
            answer = run_llm_ollama(prompt)
            sources = []
            is_from_pdf = False

        # Save to database
        db.add(SearchHistory(
            user_id=current_user.email,
            branch=query.branch,
            year=query.year,
            semester=query.semester,
            question=query.question,
            answer=answer,
            sources=",".join(sources) if sources else "",
            is_from_pdf=is_from_pdf
        ))
        db.commit()

        return {
            "answer": answer,
            "sources": sources,
            "is_from_pdf": is_from_pdf
        }

    except Exception as e:
        logger.error(f"Query processing failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Knowledge retrieval error")

# Keep other endpoints (download, history) the same
@router.get("/download")
async def download_pdf(
    branch: str = Query(...),
    year: str = Query(...),
    semester: str = Query(...),
    subject: str = Query(...)
):
    # Define the expected PDF path
    dir_path = os.path.join("vector_store", branch, year, semester, subject)
    
    # Search for any .pdf file in the subject directory
    try:
        pdf_files = [f for f in os.listdir(dir_path) if f.endswith(".pdf")]
        if not pdf_files:
            raise HTTPException(status_code=404, detail="PDF not found")

        file_path = os.path.join(dir_path, pdf_files[0])  # pick the first PDF

        return FileResponse(
            file_path,
            media_type='application/pdf',
            filename=pdf_files[0]
        )
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Subject folder not found")
# Add to your query router
async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception
    return user

@router.get("/history")
async def get_search_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    history = db.query(SearchHistory).filter(
        SearchHistory.user_id == current_user.email  # Using email as user identifier
    ).order_by(SearchHistory.timestamp.desc()).all()

    return [
        {
            "id": entry.id,
            "question": entry.question,
            "answer": entry.answer,
            "sources": entry.sources.split(",") if entry.sources else [],
            "branch": entry.branch,
            "year": entry.year,
            "semester": entry.semester,
            "is_from_pdf": entry.is_from_pdf,
            "timestamp": entry.timestamp.isoformat()
        }
        for entry in history
    ]