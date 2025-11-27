# simple_embeddings.py - Lightweight embeddings interface
from sentence_transformers import SentenceTransformer
import numpy as np
import logging

logger = logging.getLogger(__name__)

# Global model instance for reuse
_model = None

def get_embeddings_model():
    """Get or initialize the embeddings model"""
    global _model
    if _model is None:
        try:
            # Use a lightweight, fast model for embeddings
            _model = SentenceTransformer('all-MiniLM-L6-v2')
            logger.info("✅ Embeddings model loaded: all-MiniLM-L6-v2")
        except Exception as e:
            logger.error(f"❌ Failed to load embeddings model: {e}")
            raise
    return _model

def get_embeddings(texts):
    """
    Get embeddings for a list of texts
    Args:
        texts: List of strings or single string
    Returns:
        numpy array of embeddings
    """
    try:
        model = get_embeddings_model()
        
        # Handle single string input
        if isinstance(texts, str):
            texts = [texts]
        
        # Generate embeddings
        embeddings = model.encode(texts, convert_to_numpy=True)
        
        logger.debug(f"Generated embeddings for {len(texts)} texts")
        return embeddings
        
    except Exception as e:
        logger.error(f"❌ Error generating embeddings: {e}")
        raise

class SimpleEmbeddings:
    """Simple embeddings class compatible with LangChain"""
    
    def __init__(self):
        self.model = get_embeddings_model()
    
    def embed_documents(self, texts):
        """Embed a list of documents"""
        return get_embeddings(texts).tolist()
    
    def embed_query(self, text):
        """Embed a single query"""
        return get_embeddings([text])[0].tolist()
