from sqlalchemy.orm import Session
from typing import List
from schemas import QuizSchema, QuizCreateSchema, QuestionSchema
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from fastapi.responses import JSONResponse, FileResponse
from db import get_db
from models import Quiz
from pydantic import BaseModel
import requests
import json

router = APIRouter()

# Pydantic models for AI quiz generation
class QuizGenerationRequest(BaseModel):
    subject: str
    topic: str = ""
    difficulty: str = "medium"  # easy, medium, hard
    num_questions: int = 5
    branch: str
    year: str
    semester: str

class GeneratedQuestion(BaseModel):
    text: str
    options: List[str]
    correctOption: int
    explanation: str = ""


@router.post("/", response_model=QuizSchema)
async def create_quiz(payload: QuizCreateSchema, db: Session = Depends(get_db)):
    try:
        # Validate questions
        for i, q in enumerate(payload.questions):
            if not q.text.strip():
                raise ValueError(f"Question {i+1} text is required")
            if len(q.options) < 2:
                raise ValueError(f"Question {i+1} must have at least 2 options")
            if len(set(map(str.lower, q.options))) != len(q.options):
                raise ValueError(f"Question {i+1} has duplicate options")
            if q.correctOption < 0 or q.correctOption >= len(q.options):
                raise ValueError(f"Correct option index out of range for question {i+1}")

        # Create quiz object
        db_quiz = Quiz(
            title=payload.title,
            branch=payload.branch,
            year=payload.year,
            semester=payload.semester,
            subject=payload.subject,
            questions=[q.dict() for q in payload.questions]
        )
        db.add(db_quiz)
        db.commit()
        db.refresh(db_quiz)
        return db_quiz

    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"Server error: {str(e)}")


# --- GET: Fetch Quizzes ---
@router.get("/{semester}", response_model=List[QuizSchema])
def get_quizzes(
    semester: str,
    branch: str = Query(...),
    year: str = Query(...),
    subject: str = Query(...),
    db: Session = Depends(get_db)
):
    results = db.query(Quiz).filter(
        Quiz.semester == semester,
        Quiz.branch == branch,
        Quiz.year == year,
        Quiz.subject == subject
    ).order_by(Quiz.created_at.desc()).all()
    return results
@router.delete("/{quiz_id}")
async def delete_quiz(quiz_id: int, db: Session = Depends(get_db)):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(404, "Quiz not found")
    db.delete(quiz)
    db.commit()
    return {"message": "Quiz deleted successfully"}

# AI Quiz Generation Functions
def create_quiz_prompt(subject: str, topic: str, difficulty: str, num_questions: int) -> str:
    """Create a structured prompt for quiz generation"""
    difficulty_descriptions = {
        "easy": "basic understanding and recall of fundamental concepts",
        "medium": "application of concepts and moderate problem-solving",
        "hard": "advanced analysis, synthesis, and complex problem-solving"
    }
    
    topic_context = f" focusing on {topic}" if topic else ""
    
    prompt = f"""Generate {num_questions} multiple choice questions for {subject}{topic_context}.

Requirements:
- Difficulty level: {difficulty} ({difficulty_descriptions.get(difficulty, 'medium level')})
- Each question should have exactly 4 options (A, B, C, D)
- Only one correct answer per question
- Include brief explanations for correct answers
- Questions should be clear, unambiguous, and educational
- Avoid trick questions or overly complex language

Format your response as a JSON array with this exact structure:
[
  {{
    "text": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctOption": 0,
    "explanation": "Brief explanation of why this is correct"
  }}
]

Subject: {subject}
Difficulty: {difficulty}
Number of questions: {num_questions}

Generate the quiz now:"""
    
    return prompt

async def call_llm_for_quiz(prompt: str) -> str:
    """Call the local LLM to generate quiz questions"""
    try:
        # Using the same LLM endpoint as your existing query system
        response = requests.post(
            "http://localhost:11434/api/generate",
            json={
                "model": "llama3.2:3b",  # Adjust model name as needed
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.7,
                    "top_p": 0.9,
                    "max_tokens": 2000
                }
            },
            timeout=60
        )
        
        if response.status_code == 200:
            result = response.json()
            return result.get("response", "")
        else:
            raise Exception(f"LLM API error: {response.status_code}")
            
    except Exception as e:
        raise Exception(f"Failed to generate quiz: {str(e)}")

def parse_llm_response(llm_response: str) -> List[dict]:
    """Parse LLM response and extract quiz questions"""
    try:
        # Try to find JSON in the response
        start_idx = llm_response.find('[')
        end_idx = llm_response.rfind(']') + 1
        
        if start_idx == -1 or end_idx == 0:
            raise ValueError("No JSON array found in response")
        
        json_str = llm_response[start_idx:end_idx]
        questions = json.loads(json_str)
        
        # Validate each question
        validated_questions = []
        for i, q in enumerate(questions):
            if not isinstance(q, dict):
                continue
                
            if not all(key in q for key in ["text", "options", "correctOption"]):
                continue
                
            if not isinstance(q["options"], list) or len(q["options"]) != 4:
                continue
                
            if not (0 <= q["correctOption"] < len(q["options"])):
                continue
            
            validated_questions.append({
                "text": str(q["text"]).strip(),
                "options": [str(opt).strip() for opt in q["options"]],
                "correctOption": int(q["correctOption"]),
                "explanation": str(q.get("explanation", "")).strip()
            })
        
        return validated_questions
        
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON in LLM response: {str(e)}")
    except Exception as e:
        raise ValueError(f"Error parsing LLM response: {str(e)}")

# AI Quiz Generation Endpoint
@router.post("/generate")
async def generate_quiz_with_ai(request: QuizGenerationRequest):
    """Generate quiz questions using AI based on subject, topic, and difficulty"""
    try:
        # Create prompt for LLM
        prompt = create_quiz_prompt(
            subject=request.subject,
            topic=request.topic,
            difficulty=request.difficulty,
            num_questions=request.num_questions
        )
        
        # Call LLM
        llm_response = await call_llm_for_quiz(prompt)
        
        # Parse response
        questions = parse_llm_response(llm_response)
        
        if not questions:
            raise HTTPException(400, "Failed to generate valid questions")
        
        # Format questions for frontend
        formatted_questions = []
        for q in questions:
            formatted_questions.append({
                "text": q["text"],
                "options": q["options"],
                "correctOption": q["correctOption"],
                "explanation": q["explanation"]
            })
        
        return {
            "success": True,
            "questions": formatted_questions,
            "metadata": {
                "subject": request.subject,
                "topic": request.topic,
                "difficulty": request.difficulty,
                "generated_count": len(formatted_questions),
                "requested_count": request.num_questions
            }
        }
        
    except Exception as e:
        raise HTTPException(500, f"Quiz generation failed: {str(e)}")