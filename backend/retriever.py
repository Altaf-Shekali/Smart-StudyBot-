from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from PyPDF2 import PdfReader
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
    
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        separators=["\n\n", "\n", ". "]
    )

    docs = splitter.create_documents(
        [text],
        metadatas=[{"source": os.path.basename(pdf_path)}] * len(text)
    )

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
def search_multiple_indexes(base_dir, query, min_threshold=-0.5, max_threshold=0.75):  # Allow range from -0.5 to 0.75
    matches = []
    sources = set()

    for subject in os.listdir(base_dir):
        subject_dir = os.path.join(base_dir, subject)
        try:
            db = load_vectorstore(subject_dir)
            for doc, score in db.similarity_search_with_relevance_scores(query, k=5):  # Fetch top 5 results
                if min_threshold <= score <= max_threshold:  # Include documents within the range
                    matches.append(doc.page_content)
                    sources.add(f"{subject}/{doc.metadata['source']}")
        except Exception as e:
            print(f"Search error in {subject}: {str(e)}")

    return {"matched_chunks": matches, "sources": list(sources)}
