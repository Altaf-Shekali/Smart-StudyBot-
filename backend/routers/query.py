import os
import logging
import shutil
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, BackgroundTasks
from fastapi.responses import JSONResponse, FileResponse
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from collections import Counter
from db import SessionLocal
from models import SearchHistory, User, Activity, LearningProgress
from schemas import QueryResponse
from retriever import search_multiple_indexes, create_vectorstore, get_performance_metrics, preprocess_query
from llm_interface import run_llm_async, create_optimized_prompt, truncate_context, get_performance_metrics as get_llm_metrics
from utils import validate_directory_structure
from routers.auth import oauth2_scheme, SECRET_KEY, ALGORITHM
import asyncio
import time

router = APIRouter()
logger = logging.getLogger(__name__)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Disable debug logs in production
if os.getenv('ENVIRONMENT') == 'production':
    logging.getLogger().setLevel(logging.INFO)
    logging.getLogger('sqlalchemy.engine').setLevel(logging.WARNING)

# 🚀 Performance tracking
QUERY_PERFORMANCE = {
    "total_queries": 0,
    "avg_response_time": 0.0,
    "cache_hits": 0,
    "vector_search_time": 0.0,
    "llm_response_time": 0.0
}

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

# Stats endpoint for dashboard
@router.get("/stats")
async def get_user_stats(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get user statistics for dashboard"""
    
    # Get recent search history
    recent_searches = db.query(SearchHistory).filter(
        SearchHistory.user_id == current_user.id
    ).order_by(SearchHistory.timestamp.desc()).limit(10).all()
    
    # Get learning progress
    learning_progress = db.query(LearningProgress).filter(
        LearningProgress.user_id == current_user.id
    ).all()
    
    # Get recent activity
    recent_activity = db.query(Activity).filter(
        Activity.user_id == current_user.id
    ).order_by(Activity.created_at.desc()).limit(10).all()
    
    # Calculate stats
    total_searches = db.query(SearchHistory).filter(SearchHistory.user_id == current_user.id).count()
    
    # Debug logging - only log summary in production
    logger.debug(f"Stats for user {current_user.id}:")
    logger.debug(f"Recent searches: {len(recent_searches)}")
    logger.debug(f"Learning progress entries: {len(learning_progress)}")
    logger.debug(f"Recent activities: {len(recent_activity)}")
    logger.debug(f"Total searches: {total_searches}")
    
    # Format learning progress
    progress_data = []
    for lp in learning_progress:
        progress_data.append({
            "subject": lp.subject,
            "progress": lp.progress,
            "hours": round(lp.minutes / 60, 1) if lp.minutes else 0
        })
    
    # Format recent activity
    activity_data = []
    for act in recent_activity:
        activity_data.append({
            "title": act.type,
            "date": act.created_at.strftime("%Y-%m-%d"),
            "type": act.type,
            "duration": f"{act.duration}min" if act.duration else "N/A"
        })
    
    stats_response = {
        "studyHours": sum([round(lp.minutes / 60, 1) for lp in learning_progress]) if learning_progress else 0,
        "topicsStudied": len(set([s.question for s in recent_searches])) if recent_searches else 0,
        "avgProgress": sum([lp.progress for lp in learning_progress]) / len(learning_progress) if learning_progress else 0,
        "studySessions": total_searches,
        "recentActivity": activity_data,
        "learningProgress": progress_data
    }
    
    logger.debug(f"Returning stats for user {current_user.id} - Items: {len(stats_response.get('recentActivity', []))} activities, {len(stats_response.get('learningProgress', []))} progress entries")
    return stats_response

async def log_user_activity(db, user_id, branch, year, semester, sources, question, answer, is_from_pdf, session_id=None):
    """Background task to log user activity without blocking the response"""
    try:
        subject_name = branch if not sources else os.path.splitext(os.path.basename(sources[0]))[0]
        
        # Log the search with session tracking
        db.add(SearchHistory(
            user_id=user_id,
            session_id=session_id,
            branch=branch,
            year=year,
            semester=semester,
            question=question,
            answer=answer,
            sources=",".join(sources) if sources else "",
            is_from_pdf=is_from_pdf,
            timestamp=datetime.utcnow()
        ))

        # Log Activity
        db.add(Activity(
            user_id=user_id,
            type="study_session",
            subject=subject_name or "General Study",
            duration=2  # default 2 minutes
        ))

        # Update LearningProgress
        lp = db.query(LearningProgress).filter(
            LearningProgress.user_id == user_id,
            LearningProgress.subject == subject_name
        ).first()

        if lp:
            lp.minutes += 2
            lp.progress = min(100, lp.progress + 5)
        else:
            db.add(LearningProgress(
                user_id=user_id,
                subject=subject_name,
                progress=5,
                minutes=2
            ))

        db.commit()
    except Exception as e:
        logger.error(f"Error logging user activity: {str(e)}")
        db.rollback()

@router.post("/document")
async def query_document(
    question: str = Form(...),
    branch: str = Form(...),
    year: str = Form(...),
    semester: str = Form(...),
    subject: str = Form(None),
    model_type: str = Form("ollama"),
    session_id: str = Form(None),  # New: Chat session ID
    file: UploadFile = File(None),
    background_tasks: BackgroundTasks = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """🚀 Enhanced query endpoint with immediate PDF processing and optimized performance"""
    start_time = time.time()
    
    try:
        # 📊 Update performance metrics
        QUERY_PERFORMANCE["total_queries"] += 1
        
        base_path = os.path.join("vector_store", branch, year, semester)
        os.makedirs(base_path, exist_ok=True)

        answer = "No answer generated"
        final_sources = []
        is_from_pdf = False
        context = None
        target_subject = None
        pdf_text = None

        # 🚀 Handle TEMPORARY PDF processing for student uploads (no permanent storage)
        if file and file.filename.endswith('.pdf'):
            # Create temporary directory for student uploads (separate from course materials)
            import tempfile
            temp_dir = tempfile.mkdtemp(prefix="student_pdf_")
            temp_file_path = os.path.join(temp_dir, file.filename)
            
            # Save the file temporarily
            with open(temp_file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)

            # 🎯 IMMEDIATE temporary PDF processing for instant Q&A
            from retriever import process_temp_pdf_for_query
            context = process_temp_pdf_for_query(temp_file_path, question)
            
            if context:
                logger.info(f"📄 Processed temporary PDF: {file.filename} ({len(context)} chars context)")
                is_from_pdf = True
                final_sources = [file.filename]
                pdf_text = "processed"  # Flag to indicate successful processing
                
                # Clean up temporary file after processing
                try:
                    os.remove(temp_file_path)
                    os.rmdir(temp_dir)
                    logger.info(f"🧹 Cleaned up temporary PDF: {file.filename}")
                except Exception as cleanup_error:
                    logger.warning(f"⚠️ Failed to cleanup temporary file: {cleanup_error}")
            else:
                logger.warning(f"⚠️ Failed to process temporary PDF: {file.filename}")
                # Clean up on failure too
                try:
                    os.remove(temp_file_path)
                    os.rmdir(temp_dir)
                except:
                    pass

            # NOTE: No vectorstore creation for student uploads - they are temporary only

        # 🎯 Preprocess query for better search
        processed_question = preprocess_query(question)
        logger.info(f"Processing query: {processed_question[:50]}...")

        # 🧠 Get conversation history for context
        conversation_history = []
        if session_id:
            # Fetch recent conversation history for this session
            recent_chats = db.query(SearchHistory).filter(
                SearchHistory.user_id == current_user.id,
                SearchHistory.session_id == session_id
            ).order_by(SearchHistory.timestamp.desc()).limit(5).all()
            
            # Convert to conversation format (reverse to chronological order)
            conversation_history = [
                {"question": chat.question, "answer": chat.answer}
                for chat in reversed(recent_chats)
            ]
            
            logger.debug(f"Found {len(conversation_history)} previous messages in session {session_id}")

        # 🚀 Enhanced search strategy with temporary PDF processing
        if pdf_text and context:
            # Answer directly from uploaded temporary PDF
            logger.debug("Answering from temporary uploaded PDF content")
            answer = await run_llm_async(
                query=question, 
                context=context,
                model_type=model_type, 
                sources=final_sources,
                conversation_history=conversation_history
            )
            is_from_pdf = True
        elif not validate_directory_structure(base_path):
            # No course materials found, use LLM's knowledge directly
            logger.info("No course materials found, using LLM knowledge")
            answer = await run_llm_async(
                query=question, 
                model_type=model_type, 
                sources=None,
                conversation_history=conversation_history
            )
        else:
            # 🎯 Targeted search with performance optimization
            vector_search_start = time.time()
            
            # Use targeted search if we have a specific subject
            results = await asyncio.to_thread(
                search_multiple_indexes, 
                base_path, 
                processed_question, 
                target_subject,
                k=3  # Reduced for speed
            )
            
            vector_search_time = time.time() - vector_search_start
            QUERY_PERFORMANCE["vector_search_time"] = (
                (QUERY_PERFORMANCE["vector_search_time"] * (QUERY_PERFORMANCE["total_queries"] - 1) + vector_search_time) 
                / QUERY_PERFORMANCE["total_queries"]
            )
            
            chunks = results.get("matched_chunks", [])
            sources = results.get("sources", [])
            search_time = results.get("search_time", 0.0)

            logger.debug(f"Vector search completed in {search_time:.2f}s, found {len(chunks)} chunks")

            if chunks:
                # 🎯 Smart context optimization
                numbered_chunks = []
                citation_map = {}
                
                for i, chunk in enumerate(chunks[:3], start=1):  # Limit to top 3 chunks
                    citation_map[i] = chunk
                    numbered_chunks.append(f"[{i}] {chunk}")

                # 🚀 Optimize context for faster LLM processing
                raw_context = "\n".join(numbered_chunks)
                context = truncate_context(raw_context, max_length=1200)  # Reduced for speed
                is_from_pdf = True

                logger.debug(f"Context length: {len(raw_context)} -> {len(context)} characters")

                # 🚀 Use optimized LLM with context, sources, and conversation history
                llm_start = time.time()
                answer = await run_llm_async(
                    query=question, 
                    context=context, 
                    model_type=model_type,
                    sources=sources,
                    conversation_history=conversation_history
                )
                llm_time = time.time() - llm_start
                
                QUERY_PERFORMANCE["llm_response_time"] = (
                    (QUERY_PERFORMANCE["llm_response_time"] * (QUERY_PERFORMANCE["total_queries"] - 1) + llm_time) 
                    / QUERY_PERFORMANCE["total_queries"]
                )

                # 🎯 Smart source attribution
                source_counter = Counter([
                    citation_map[i] for i in citation_map.keys()
                    if f"[{i}]" in answer
                ])
                final_sources = [source_counter.most_common(1)[0]] if source_counter else []
                
                logger.info(f"LLM response generated in {llm_time:.2f}s")
            else:
                # No relevant chunks found, use LLM's knowledge directly
                logger.info("No relevant chunks found, using LLM knowledge")
                answer = await run_llm_async(
                    query=question, 
                    model_type=model_type, 
                    sources=None,
                    conversation_history=conversation_history
                )
                is_from_pdf = False

        # 📊 Calculate total response time
        total_time = time.time() - start_time
        QUERY_PERFORMANCE["avg_response_time"] = (
            (QUERY_PERFORMANCE["avg_response_time"] * (QUERY_PERFORMANCE["total_queries"] - 1) + total_time) 
            / QUERY_PERFORMANCE["total_queries"]
        )

        logger.debug(f"Query completed in {total_time:.2f}s")

        # Log user activity in background with proper data including session ID
        background_tasks.add_task(
            log_user_activity, 
            db, current_user.id, branch, year, semester, final_sources, question, answer, is_from_pdf, session_id
        )

        # Only include sources if we have them and the answer is from course materials
        response_data = {
            "answer": answer,
            "is_from_pdf": is_from_pdf,
            "model_type": model_type,
            "pdf_processed": pdf_text is not None,
            "pdf_filename": file.filename if file and pdf_text else None,
            "performance": {
                "total_time": round(total_time, 2),
                "vector_search_time": round(results.get("search_time", 0.0), 2) if 'results' in locals() else 0.0,
                "pdf_extraction_time": round(time.time() - start_time, 2) if pdf_text else 0.0
            }
        }
        
        # Only include sources if we actually used them in the answer
        if final_sources and any(source in answer for source in final_sources):
            response_data["sources"] = final_sources
            
        return response_data

    except Exception as e:
        logger.error(f"Query error: {str(e)}")
        if 'ENVIRONMENT' not in os.environ or os.environ['ENVIRONMENT'] != 'production':
            logger.exception("Full traceback:")
        raise HTTPException(status_code=500, detail=str(e))

# 🚀 New endpoint for performance monitoring
@router.get("/performance")
async def get_performance_metrics():
    """Get performance metrics for monitoring"""
    try:
        retriever_metrics = get_performance_metrics()
        llm_metrics = get_llm_metrics()
        
        return {
            "query_performance": QUERY_PERFORMANCE,
            "retriever_performance": retriever_metrics,
            "llm_performance": llm_metrics,
            "system_health": {
                "total_queries": QUERY_PERFORMANCE["total_queries"],
                "avg_response_time": round(QUERY_PERFORMANCE["avg_response_time"], 2),
                "cache_hit_rate": round(retriever_metrics.get("cache_hit_rate", 0), 2)
            }
        }
    except Exception as e:
        logger.error(f"Error getting performance metrics: {str(e)}")
        return {"error": str(e)}

# 🚀 New endpoint for batch queries
@router.post("/batch")
async def batch_query_documents(
    background_tasks: BackgroundTasks,
    branch: str = Form(...),
    year: str = Form(...),
    semester: str = Form(...),
    questions: str = Form(...),  # JSON array of questions
    model_type: str = Form("ollama"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Process multiple queries in parallel for better performance"""
    try:
        import json
        question_list = json.loads(questions)
        
        if not isinstance(question_list, list) or len(question_list) > 10:
            raise HTTPException(status_code=400, detail="Invalid questions format or too many questions")
        
        base_path = os.path.join("vector_store", branch, year, semester)
        
        # Process all questions in parallel
        tasks = []
        for question in question_list:
            task = asyncio.create_task(
                run_llm_async(query=question, model_type=model_type)
            )
            tasks.append(task)
        
        answers = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Format results
        results = []
        for i, (question, answer) in enumerate(zip(question_list, answers)):
            if isinstance(answer, Exception):
                results.append({
                    "question": question,
                    "answer": f"❌ Error: {str(answer)}",
                    "status": "error"
                })
            else:
                results.append({
                    "question": question,
                    "answer": answer,
                    "status": "success"
                })
        
        return {
            "results": results,
            "total_questions": len(question_list),
            "successful": len([r for r in results if r["status"] == "success"])
        }
        
    except Exception as e:
        logger.error(f"Batch query failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# 🚀 New endpoint for clearing caches
@router.post("/clear-cache")
async def clear_system_caches():
    """Clear all system caches for memory management"""
    try:
        from retriever import clear_caches
        from llm_interface import clear_response_cache
        
        clear_caches()
        clear_response_cache()
        
        return {"message": "✅ All caches cleared successfully"}
    except Exception as e:
        logger.error(f"Error clearing caches: {str(e)}")
        return {"error": str(e)}

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
        
        pdf_path = os.path.join(dir_path, pdf_files[0])
        return FileResponse(pdf_path, media_type="application/pdf", filename=pdf_files[0])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history")
async def get_user_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user's search history"""
    try:
        history = db.query(SearchHistory).filter(
            SearchHistory.user_id == current_user.id
        ).order_by(SearchHistory.timestamp.desc()).limit(50).all()
        
        return [{
            "id": h.id,
            "question": h.question,
            "answer": h.answer,
            "sources": h.sources,
            "branch": h.branch,
            "year": h.year,
            "semester": h.semester,
            "is_from_pdf": h.is_from_pdf,
            "timestamp": h.timestamp.isoformat() if h.timestamp else None
        } for h in history]
        
    except Exception as e:
        logger.error(f"Error fetching history: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/history/{history_id}")
async def delete_history_item(
    history_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a specific history item"""
    try:
        history_item = db.query(SearchHistory).filter(
            SearchHistory.id == history_id,
            SearchHistory.user_id == current_user.id
        ).first()
        
        if not history_item:
            raise HTTPException(status_code=404, detail="History item not found")
        
        db.delete(history_item)
        db.commit()
        
        return {"message": "History item deleted successfully"}
        
    except Exception as e:
        logger.error(f"Error deleting history: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/history")
async def clear_user_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Clear all user history"""
    try:
        db.query(SearchHistory).filter(
            SearchHistory.user_id == current_user.id
        ).delete()
        db.commit()
        
        return {"message": "History cleared successfully"}
        
    except Exception as e:
        logger.error(f"Error clearing history: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/health")
async def health_check():
    """System health check endpoint"""
    try:
        from llm_interface import check_llm_health
        
        llm_health = check_llm_health()
        
        return {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "llm_services": llm_health,
            "performance": {
                "avg_response_time": round(QUERY_PERFORMANCE["avg_response_time"], 2),
                "total_queries": QUERY_PERFORMANCE["total_queries"]
            }
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }