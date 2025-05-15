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
def create_prompt(context_list, question: str) -> str:
    """
    Creates a prompt for the LLM using the retrieved document context.
    """
    context_text = "\n\n".join(context_list)
    prompt = (
        "You are a helpful assistant. Use the following context to answer the user's question.\n\n"
        f"Context:\n{context_text}\n\n"
        f"Question: {question}\n"
        "Answer:"
    )
    return prompt

def build_context(results):
    """
    Extracts content from search results for prompt generation.
    """
    return [doc["content"] for doc in results if "content" in doc]

def postprocess_answer(answer: str) -> str:
    """
    Cleans up the model's answer (optional).
    """
    return answer.strip()

def extract_sources(results, final_answer: str) -> str:
    """
    Extracts source filenames or paths used in the answer.
    """
    sources = set()
    for res in results:
        if "source" in res:
            sources.add(res["source"])
    return ",".join(sorted(sources))

def save_history(
    db,
    user,
    query,
    answer,
    sources
):
    """
    Saves the query and answer to the database.
    """
    new_entry = SearchHistory(
        user_id=user.email,
        question=query.question,
        answer=answer,
        sources=sources,
        branch=query.branch,
        year=query.year,
        semester=query.semester,
        is_from_pdf=True,
        timestamp=datetime.utcnow()
    )
    db.add(new_entry)
    db.commit()
    db.refresh(new_entry)
