from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings  # ✅ Correct import
from PyPDF2 import PdfReader
from langchain.schema import Document
import os
import re
import numpy as np

# ----- Load and Clean PDF Text -----
def load_pdf(path):
    try:
        reader = PdfReader(path)
        return "\n".join([ 
            re.sub(r'\s+', ' ', p.extract_text()).strip() 
            for p in reader.pages if p.extract_text()
        ])
    except Exception as e:
        print(f"PDF Error: {str(e)}")
        return None

# ----- Create a Vectorstore from PDF -----
def create_vectorstore(pdf_path, store_dir):
    text = load_pdf(pdf_path)
    if not text:
        raise ValueError("No text extracted from PDF")

    # The rest of your existing code
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=800,
        chunk_overlap=300,
        separators=["\n\n• ", "\n\n", "\n", ". ", "! ", "? ", "; "]
    )
    
    # Create hierarchical chunks
    docs = []
    for section in text.split("\n\n"):
        section_chunks = splitter.split_text(section)
        docs.extend([Document( 
            page_content=chunk,
            metadata={"source": f"{os.path.basename(pdf_path)}-section{i}"}
        ) for i, chunk in enumerate(section_chunks)])
    
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    db = FAISS.from_documents(docs, embeddings)
    db.save_local(store_dir)

# ----- Load an Existing Vectorstore -----
def load_vectorstore(store_dir):
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    return FAISS.load_local(
        store_dir,
        embeddings,
        allow_dangerous_deserialization=True
    )

# ----- Custom Scaling of Relevance Scores -----
def scale_scores(scores, score_range=(0, 1)):
    min_score = np.min(scores)
    max_score = np.max(scores)
    
    # Prevent division by zero if all scores are the same
    if max_score == min_score:
        return np.full(scores.shape, score_range[0])  # Return a constant score in this case
    
    normalized_scores = (scores - min_score) / (max_score - min_score)  # Min-Max Scaling
    
    # Scale to the desired range
    scaled_scores = score_range[0] + (normalized_scores * (score_range[1] - score_range[0]))
    
    return scaled_scores


# ----- Search Across Multiple Vectorstores -----
# In retriever.py

def search_multiple_indexes(base_dir, query, min_threshold=0.15, max_threshold=0.85):
    matches = []
    sources = set()
    
    # Check if base_dir exists first
    if not os.path.exists(base_dir):
        return {"matched_chunks": [], "sources": []}
    
    for subject in os.listdir(base_dir):
        subject_dir = os.path.join(base_dir, subject)
        try:
            if not os.path.isdir(subject_dir):
                continue
                
            db = load_vectorstore(subject_dir)
            raw_results = db.similarity_search_with_relevance_scores(query, k=7)
            
            if not raw_results:
                continue
                
            # Extract scores and normalize
            scores = np.array([score for _, score in raw_results])
            scaled_scores = scale_scores(scores, (0, 1))
            
            # Apply dynamic thresholding
            avg_score = np.mean(scaled_scores)
            dynamic_threshold = max(min_threshold, avg_score - 0.15)
            
            for (doc, _), scaled in zip(raw_results, scaled_scores):
                if scaled >= dynamic_threshold:
                    matches.append(f"Source: {doc.metadata['source']}\nContent: {doc.page_content}")
                    sources.add(f"{subject}/{doc.metadata['source']}")

        except Exception as e:
            print(f"Search error in {subject}: {str(e)}")
    
    # Relevance-based sorting
    return {
        "matched_chunks": sorted(matches, key=lambda x: len(x), reverse=True)[:5],
        "sources": list(sources)
    }