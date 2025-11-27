# retriever.py - Critical Performance Fixes
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
# from simple_embeddings import get_embeddings  # Not used directly anymore
try:
    from langchain_huggingface import HuggingFaceEmbeddings
except ImportError:
    try:
        from langchain_community.embeddings import HuggingFaceEmbeddings
    except ImportError:
        # Fallback for older versions
        from langchain.embeddings import HuggingFaceEmbeddings
from PyPDF2 import PdfReader
from langchain_core.documents import Document
import os
import re
import numpy as np
import time
from functools import lru_cache
import concurrent.futures
import logging
import hashlib
import pickle
from typing import Dict, List, Tuple, Optional
import asyncio
from collections import defaultdict

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 🚀 Enhanced caching system
VECTORSTORE_CACHE = {}
QUERY_CACHE = {}
EMBEDDING_CACHE = {}
MAX_CACHE_SIZE = 50
QUERY_CACHE_SIZE = 1000

# 📊 Performance metrics
PERFORMANCE_METRICS = {
    "cache_hits": 0,
    "cache_misses": 0,
    "avg_search_time": 0.0,
    "total_searches": 0
}

class FastRetriever:
    def __init__(self):
        self.embeddings = None
        self._init_embeddings()
        self.semantic_cache = {}
        self.query_embeddings = {}
    
    def _init_embeddings(self):
        """Initialize optimized embeddings with GPU support"""
        try:
            import torch
            device = "cuda" if torch.cuda.is_available() else "cpu"
            logger.info(f"Using device: {device}")
        except ImportError:
            device = "cpu"
            logger.info("PyTorch not available, using CPU")
        
        self.embeddings = HuggingFaceEmbeddings(
            model_name="all-MiniLM-L6-v2",  # Fast, lightweight model
            model_kwargs={"device": device},
            encode_kwargs={
                "batch_size": 64,  # Increased batch size
                "show_progress_bar": False,  # Disable for speed
                "normalize_embeddings": True
            }
        )
    
    def _get_cache_key(self, query: str, subject_dir: str) -> str:
        """Generate cache key for query-subject combination"""
        return hashlib.md5(f"{query}:{subject_dir}".encode()).hexdigest()
    
    def _cache_query_result(self, cache_key: str, result: dict):
        """Cache query results with LRU eviction"""
        if len(QUERY_CACHE) >= QUERY_CACHE_SIZE:
            # Remove oldest entry
            oldest_key = next(iter(QUERY_CACHE))
            del QUERY_CACHE[oldest_key]
        
        QUERY_CACHE[cache_key] = {
            "result": result,
            "timestamp": time.time(),
            "access_count": 1
        }
    
    def _get_cached_result(self, cache_key: str) -> Optional[dict]:
        """Get cached result and update access count"""
        if cache_key in QUERY_CACHE:
            QUERY_CACHE[cache_key]["access_count"] += 1
            PERFORMANCE_METRICS["cache_hits"] += 1
            return QUERY_CACHE[cache_key]["result"]
        
        PERFORMANCE_METRICS["cache_misses"] += 1
        return None

# 🚀 Optimized vectorstore creation
def create_vectorstore(pdf_path: str, store_dir: str) -> bool:
    """Create optimized vectorstore with better chunking strategy"""
    start_time = time.time()
    
    try:
        text = load_pdf(pdf_path)
        if not text:
            raise ValueError("No text extracted from PDF")
        
        # 🎯 Smart chunking strategy
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=800,  # Optimal size for balance
            chunk_overlap=100,  # Reduced overlap for speed
            separators=["\n\n", "\n", ". ", "! ", "? ", "; ", ":", " "],
            length_function=len
        )
        
        # Extract structured sections
        sections = extract_sections(text)
        if not sections:
            sections = [("Full Document", text)]
        
        docs = []
        for section_title, section_content in sections:
            # Skip very short sections
            if len(section_content.strip()) < 50:
                continue
                
            section_chunks = splitter.split_text(section_content)
            docs.extend([
                Document(
                    page_content=chunk.strip(),
                    metadata={
                        "source": os.path.basename(pdf_path),
                        "section": section_title,
                        "chunk_id": f"{section_title}_{i}",
                        "length": len(chunk)
                    }
                ) for i, chunk in enumerate(section_chunks) if chunk.strip()
            ])
        
        # 🚀 GPU-accelerated embeddings
        device = "cuda"
        try:
            import torch
            if not torch.cuda.is_available():
                device = "cpu"
        except ImportError:
            device = "cpu"
        
        # Use simple embeddings to avoid torch conflicts
        from simple_embeddings import SimpleEmbeddings
        embeddings = SimpleEmbeddings()
        
        # Create and save vectorstore
        db = FAISS.from_documents(docs, embeddings)
        os.makedirs(store_dir, exist_ok=True)
        db.save_local(store_dir)
        
        # Cache the vectorstore
        if len(VECTORSTORE_CACHE) >= MAX_CACHE_SIZE:
            VECTORSTORE_CACHE.pop(next(iter(VECTORSTORE_CACHE)))
        
        VECTORSTORE_CACHE[store_dir] = db
        
        creation_time = time.time() - start_time
        logger.info(f"✅ Vectorstore created in {creation_time:.2f}s for {pdf_path}")
        return True
        
    except Exception as e:
        logger.error(f"❌ Vectorstore creation failed: {str(e)}")
        return False

# 🚀 Fast vectorstore loading with cache
def load_vectorstore(store_dir: str) -> Optional[FAISS]:
    """Load vectorstore with intelligent caching"""
    if store_dir in VECTORSTORE_CACHE:
        return VECTORSTORE_CACHE[store_dir]
    
    if not os.path.exists(os.path.join(store_dir, "index.faiss")):
        return None
    
    try:
        device = "cuda"
        try:
            import torch
            if not torch.cuda.is_available():
                device = "cpu"
        except ImportError:
            device = "cpu"
        
        # Use simple embeddings
        from simple_embeddings import SimpleEmbeddings
        embeddings = SimpleEmbeddings()
        
        db = FAISS.load_local(store_dir, embeddings, allow_dangerous_deserialization=True)
        
        # Cache the loaded vectorstore
        if len(VECTORSTORE_CACHE) >= MAX_CACHE_SIZE:
            VECTORSTORE_CACHE.pop(next(iter(VECTORSTORE_CACHE)))
        
        VECTORSTORE_CACHE[store_dir] = db
        return db
        
    except Exception as e:
        logger.error(f"Error loading vectorstore: {str(e)}")
        return None

# 🚨 CRITICAL FIX: Fast similarity search with proper scoring
def search_subject_index(subject_dir: str, query: str, k: int = 3) -> dict:
    """Fast search in a specific subject index with optimized FAISS operations"""
    start_time = time.time()
    
    try:
        db = load_vectorstore(subject_dir)
        if db is None:
            return {"matches": [], "sources": set(), "score": 0.0}
        
        # 🚀 CRITICAL: Use direct FAISS search for speed
        try:
            # Get query embedding
            query_embedding = db.embedding_function.embed_query(query)
            query_embedding = np.array(query_embedding).reshape(1, -1).astype('float32')
            
            # Direct FAISS search (much faster than langchain wrapper)
            scores, indices = db.index.search(query_embedding, k)
            
            # Process results efficiently
            matches = []
            sources = set()
            total_score = 0.0
            
            for i, (score, idx) in enumerate(zip(scores[0], indices[0])):
                if idx != -1:  # Valid index
                    # Convert FAISS score to similarity (0-1 range)
                    # FAISS returns L2 distance, convert to similarity
                    similarity_score = 1.0 / (1.0 + abs(score))
                    
                    if similarity_score > 0.1:  # Lower threshold for more results
                        doc = db.docstore._dict[db.index_to_docstore_id[idx]]
                        matches.append({
                            "content": doc.page_content,
                            "source": doc.metadata.get('source', 'Unknown'),
                            "section": doc.metadata.get('section', 'Unknown'),
                            "score": float(similarity_score)
                        })
                        sources.add(f"{os.path.basename(subject_dir)}/{doc.metadata['source']}")
                        total_score += similarity_score
            
            avg_score = total_score / len(matches) if matches else 0.0
            
        except Exception as e:
            logger.warning(f"Direct FAISS search failed, falling back to langchain: {e}")
            # Fallback to langchain method
            results = db.similarity_search_with_relevance_scores(query, k=k)
            
            matches = []
            sources = set()
            total_score = 0.0
            
            for doc, score in results:
                # Fix negative scores by converting to positive similarity
                similarity_score = max(0.0, min(1.0, (score + 1) / 2))
                
                if similarity_score > 0.1:
                    matches.append({
                        "content": doc.page_content,
                        "source": doc.metadata.get('source', 'Unknown'),
                        "section": doc.metadata.get('section', 'Unknown'),
                        "score": float(similarity_score)
                    })
                    sources.add(f"{os.path.basename(subject_dir)}/{doc.metadata['source']}")
                    total_score += similarity_score
            
            avg_score = total_score / len(matches) if matches else 0.0
        
        search_time = time.time() - start_time
        PERFORMANCE_METRICS["total_searches"] += 1
        PERFORMANCE_METRICS["avg_search_time"] = (
            (PERFORMANCE_METRICS["avg_search_time"] * (PERFORMANCE_METRICS["total_searches"] - 1) + search_time) 
            / PERFORMANCE_METRICS["total_searches"]
        )
        
        return {
            "matches": matches,
            "sources": sources,
            "score": avg_score,
            "search_time": search_time
        }
        
    except Exception as e:
        logger.error(f"Search error in {subject_dir}: {str(e)}")
        return {"matches": [], "sources": set(), "score": 0.0}

# 🚀 Smart multi-index search with caching
def search_multiple_indexes(
    base_dir: str, 
    query: str, 
    target_subject: Optional[str] = None,
    k: int = 3
) -> dict:
    """Intelligent search across multiple indexes with caching and targeting"""
    start_time = time.time()
    
    # Check cache first
    cache_key = hashlib.md5(f"{query}:{base_dir}:{target_subject}".encode()).hexdigest()
    cached_result = QUERY_CACHE.get(cache_key)
    if cached_result:
        PERFORMANCE_METRICS["cache_hits"] += 1
        logger.info(f"✅ Cache hit for query: {query[:50]}...")
        return cached_result["result"]
    
    if not os.path.exists(base_dir):
        return {"matched_chunks": [], "sources": [], "search_time": 0.0}
    
    # Find relevant subject directories
    subject_dirs = []
    for root, dirs, files in os.walk(base_dir):
        if "index.faiss" in files and "index.pkl" in files:
            subject_dirs.append(root)
    
    if not subject_dirs:
        return {"matched_chunks": [], "sources": [], "search_time": 0.0}
    
    # 🎯 Priority-based search strategy
    if target_subject:
        # Search target subject first
        target_dir = os.path.join(base_dir, target_subject)
        if target_dir in subject_dirs:
            subject_dirs.remove(target_dir)
            subject_dirs.insert(0, target_dir)
    
    # 🚀 Parallel search with limited workers for optimal performance
    max_workers = min(4, len(subject_dirs))
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_subject = {
            executor.submit(search_subject_index, subject_dir, query, k): subject_dir 
            for subject_dir in subject_dirs
        }
        
        all_results = []
        for future in concurrent.futures.as_completed(future_to_subject):
            try:
                result = future.result()
                if result["matches"]:
                    all_results.append(result)
            except Exception as e:
                logger.error(f"Error in parallel search: {str(e)}")
    
    # 🎯 Smart result ranking and selection
    ranked_results = []
    all_sources = set()
    
    for result in all_results:
        if result["score"] > 0.1:  # Lower threshold for more results
            ranked_results.extend(result["matches"])
            all_sources.update(result["sources"])
    
    # Sort by relevance score and limit results
    ranked_results.sort(key=lambda x: x["score"], reverse=True)
    top_results = ranked_results[:5]  # Limit to top 5 results
    
    # Format final output
    final_chunks = []
    for result in top_results:
        chunk = f"Source: {result['source']} | Section: {result['section']}\nContent: {result['content']}"
        final_chunks.append(chunk)
    
    search_time = time.time() - start_time
    
    final_result = {
        "matched_chunks": final_chunks,
        "sources": list(all_sources),
        "search_time": search_time,
        "total_results": len(ranked_results),
        "cache_key": cache_key
    }
    
    # Cache the result
    if len(QUERY_CACHE) < QUERY_CACHE_SIZE:
        QUERY_CACHE[cache_key] = {
            "result": final_result,
            "timestamp": time.time(),
            "access_count": 1
        }
    
    return final_result

# 📊 Performance monitoring
def get_performance_metrics() -> dict:
    """Get current performance metrics"""
    return {
        **PERFORMANCE_METRICS,
        "cache_size": len(QUERY_CACHE),
        "vectorstore_cache_size": len(VECTORSTORE_CACHE),
        "cache_hit_rate": PERFORMANCE_METRICS["cache_hits"] / max(1, PERFORMANCE_METRICS["cache_hits"] + PERFORMANCE_METRICS["cache_misses"])
    }

def clear_caches():
    """Clear all caches for memory management"""
    VECTORSTORE_CACHE.clear()
    QUERY_CACHE.clear()
    EMBEDDING_CACHE.clear()
    logger.info("✅ All caches cleared")

# 🎯 Smart section extraction
def extract_sections(text: str) -> List[Tuple[str, str]]:
    """Extract document sections with improved pattern matching"""
    # Multiple patterns for different document structures
    patterns = [
        r'(?:^|\n)(\d+(?:\.\d+)*\s+[^\n]+)\n',  # Numbered sections
        r'(?:^|\n)([A-Z][^:\n]+:)\n',  # Title sections
        r'(?:^|\n)([A-Z][^.\n]+\.)\n',  # Sentence titles
        r'(?:^|\n)([A-Z][^?\n]+\?)\n',  # Question titles
    ]
    
    sections = []
    for pattern in patterns:
        matches = list(re.finditer(pattern, text))
        if matches:
            for i, match in enumerate(matches):
                start = match.end()
                end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
                title = match.group(1).strip()
                content = text[start:end].strip()
                
                if len(content) > 50:  # Only include substantial sections
                    sections.append((title, content))
            break  # Use first pattern that finds matches
    
    return sections if sections else [("Full Document", text)]

# 🚀 Fast PDF loading
def load_pdf(path: str) -> Optional[str]:
    """Fast PDF text extraction with error handling"""
    try:
        reader = PdfReader(path)
        text_chunks = []
        
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                # Clean and normalize text
                cleaned_text = re.sub(r'\s+', ' ', page_text).strip()
                if cleaned_text:
                    text_chunks.append(cleaned_text)
        
        return "\n".join(text_chunks) if text_chunks else None
        
    except Exception as e:
        logger.error(f"PDF loading error: {str(e)}")
        return None

# 🎯 Query preprocessing for better search
def preprocess_query(query: str) -> str:
    """Preprocess query for better search results"""
    # Remove common stop words and normalize
    stop_words = {'what', 'how', 'why', 'when', 'where', 'is', 'are', 'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'}
    
    words = query.lower().split()
    filtered_words = [word for word in words if word not in stop_words and len(word) > 2]
    
    return " ".join(filtered_words) if filtered_words else query.lower()

# 🎯 Temporary PDF processing for student uploads
def process_temp_pdf_for_query(pdf_path: str, query: str) -> Optional[str]:
    """Process uploaded PDF temporarily for immediate Q&A without permanent storage"""
    try:
        # Extract text from PDF
        pdf_text = load_pdf(pdf_path)
        if not pdf_text:
            return None
        
        # Extract sections for better context
        sections = extract_sections(pdf_text)
        
        # Find most relevant sections for the question
        relevant_sections = []
        query_lower = query.lower()
        query_words = set(query_lower.split())
        
        for section_title, section_content in sections:
            # Simple relevance scoring based on keyword overlap
            section_lower = section_content.lower()
            section_words = set(section_lower.split())
            overlap = len(query_words.intersection(section_words))
            
            if overlap > 0:
                relevant_sections.append((overlap, section_title, section_content[:1500]))
        
        # Sort by relevance and take top 3 sections
        relevant_sections.sort(key=lambda x: x[0], reverse=True)
        top_sections = relevant_sections[:3]
        
        if top_sections:
            context_parts = []
            for _, title, content in top_sections:
                context_parts.append(f"Section: {title}\n{content}")
            return "\n\n".join(context_parts)
        else:
            # If no specific sections found, use first part of document
            return pdf_text[:2000]  # First 2000 characters
            
    except Exception as e:
        logger.error(f"❌ Temporary PDF processing failed: {str(e)}")
        return None

# 🚀 Batch processing for multiple queries
async def batch_search_queries(queries: List[str], base_dir: str, target_subject: Optional[str] = None) -> List[dict]:
    """Process multiple queries in parallel for batch operations"""
    tasks = []
    for query in queries:
        task = asyncio.create_task(
            asyncio.to_thread(search_multiple_indexes, base_dir, query, target_subject)
        )
        tasks.append(task)
    
    results = await asyncio.gather(*tasks, return_exceptions=True)
    return results

# 🧹 Cache management functions
def clear_caches():
    """Clear all caches for memory management"""
    global VECTORSTORE_CACHE, QUERY_CACHE, EMBEDDING_CACHE
    VECTORSTORE_CACHE.clear()
    QUERY_CACHE.clear()
    EMBEDDING_CACHE.clear()
    logger.info("✅ All retriever caches cleared")

def get_cache_stats():
    """Get cache statistics"""
    return {
        "vectorstore_cache_size": len(VECTORSTORE_CACHE),
        "query_cache_size": len(QUERY_CACHE),
        "embedding_cache_size": len(EMBEDDING_CACHE),
        "performance_metrics": PERFORMANCE_METRICS
    }