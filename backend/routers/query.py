import os
import logging
import re
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse, FileResponse
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from collections import Counter

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

        # Search index for relevant chunks
        results = search_multiple_indexes(base_path, query.question)
        chunks = results["matched_chunks"]
        sources = results["sources"]

        if chunks:
            # Build citation mapping
            numbered_chunks = []
            citation_map = {}
            for i, (chunk, source) in enumerate(zip(chunks, sources), start=1):
                citation_map[i] = source
                numbered_chunks.append(f"[{i}] {chunk}")

            context = "\n".join(numbered_chunks)
            prompt = f"""You are an academic assistant helping students with questions based only on provided study material.

Start with "According to course materials:" and present the answer clearly using bullet points or concise explanation. Use the numbered material if helpful to organize thoughts, but do not explain or reveal citation formats to the user.

--- Study Material ---
{context}

--- Question ---
{query.question}

**RESPONSE**"""
            answer = run_llm_ollama(prompt)
            is_from_pdf = True

            # Count citations and choose the most frequent one
            source_counter = Counter([
                citation_map[i] for i in citation_map.keys()
                if f"[{i}]" in answer
            ])
            final_sources = [source_counter.most_common(1)[0][0]] if source_counter else []

        else:
            prompt = f"Answer concisely: {query.question}"
            answer = run_llm_ollama(prompt)
            answer = re.sub(r'\[\d+\]', '', answer).strip()
            final_sources = []
            is_from_pdf = False

        # Save search to DB
        db.add(SearchHistory(
            user_id=current_user.email,
            branch=query.branch,
            year=query.year,
            semester=query.semester,
            question=query.question,
            answer=answer,
            sources=",".join(final_sources) if final_sources else "",
            is_from_pdf=is_from_pdf
        ))
        db.commit()

        return {
            "answer": answer,
            "sources": final_sources,
            "is_from_pdf": is_from_pdf
        }

    except Exception as e:
        logger.error(f"Query processing failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Knowledge retrieval error")

@router.get("/download")
async def download_pdf(
    branch: str = Query(...),
    year: str = Query(...),
    semester: str = Query(...),
    subject: str = Query(...)
):
    dir_path = os.path.join("vector_store", branch, year, semester, subject)
    try:
        pdf_files = [f for f in os.listdir(dir_path) if f.endswith(".pdf")]
        if not pdf_files:
            raise HTTPException(status_code=404, detail="PDF not found")
        file_path = os.path.join(dir_path, pdf_files[0])
        return FileResponse(
            file_path,
            media_type='application/pdf',
            filename=pdf_files[0]
        )
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Subject folder not found")

@router.get("/history")
async def get_search_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    history = db.query(SearchHistory).filter(
        SearchHistory.user_id == current_user.email
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