from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from fastapi.responses import FileResponse
from pydantic import BaseModel
import os
import logging
from typing import List

from retriever import search_multiple_indexes
from llm_interface import run_llm_ollama

router = APIRouter()
logger = logging.getLogger(__name__)

class QueryRequest(BaseModel):
    branch: str
    year: str
    semester: str
    question: str

class QueryResponse(BaseModel):
    answer: str
    sources: List[str]
    is_from_pdf: bool

def validate_directory_structure(base_path: str):
    """Ensure proper nested directory structure exists"""
    if not os.path.exists(base_path):
        return False
    return any(os.path.isdir(os.path.join(base_path, subject)) 
            for subject in os.listdir(base_path))

@router.post("/", response_model=QueryResponse)
async def query_document(query: QueryRequest):
    try:
        base_path = os.path.join("vector_store", query.branch, query.year, query.semester)
        
        # Validate directory structure contains subject folders
        if not validate_directory_structure(base_path):
            return JSONResponse(
                status_code=404,
                content={
                    "answer": "📕 No course materials found for selected criteria",
                    "sources": [],
                    "is_from_pdf": False
                }
            )

        # Search across all PDF vector stores
        results = search_multiple_indexes(base_path, query.question)
        context = "\n".join(results["matched_chunks"])
        sources = results["sources"]

        if context:
            prompt = f"""Analyze all relevant course materials and answer the question.
                        
                        Available Materials:
                        {context}
                        
                        Question: {query.question}
                        
                        Format requirements:
                        - Cite sources using [1], [2] notation
                        - List sources at the end
                        - If unsure, state which parts are unclear"""
            
            answer = run_llm_ollama(prompt)
            return {
                "answer": f"📚 Multiple sources found:\n{answer}",
                "sources": sources,
                "is_from_pdf": True
            }
        
        # Fallback to general knowledge
        prompt = f"""Answer this general question: {query.question}
                    Add "Note: This answer wasn't found in course materials" at the end"""
        answer = run_llm_ollama(prompt)
        return {
            "answer": f"🌐 General knowledge:\n{answer}",
            "sources": [],
            "is_from_pdf": False
        }

    except Exception as e:
        logger.error(f"Query error: {str(e)}")
        raise HTTPException(status_code=500, detail="Processing error")

@router.get("/download")
async def download_pdf(branch: str, year: str, semester: str, subject: str):
    pdf_path = os.path.join("data", branch, year, semester, f"{subject}.pdf")

    if os.path.exists(pdf_path):
        return FileResponse(
            path=pdf_path,
            media_type="application/pdf",
            filename=f"{subject}.pdf"
        )
    else:
        raise HTTPException(status_code=404, detail="PDF not found.")
