# llm_interface.py - Critical Performance Fixes
import subprocess
import os
import logging
import time
import hashlib
import asyncio
from typing import Optional, Dict, List
from dotenv import load_dotenv
import google.generativeai as genai
import requests
import json
from functools import lru_cache

load_dotenv()
logger = logging.getLogger(__name__)

# 🚀 Performance Configuration
OLLAMA_MODEL = "mistral"
OLLAMA_HOST = "http://localhost:11434"
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Initialize Gemini client
GEMINI_MODEL = None
GEMINI_AVAILABLE = False
GEMINI_QUOTA_EXCEEDED = False

if GEMINI_API_KEY:
    try:
        import google.generativeai as genai
        
        # Configure with timeout and retry settings
        genai.configure(
            api_key=GEMINI_API_KEY,
            transport='rest',
        )
        
        # List available models and select the best one
        try:
            models = [m for m in genai.list_models() if 'generateContent' in m.supported_generation_methods]
            if models:
                # Try to find the best available model
                for model_name in ['gemini-1.5-pro', 'gemini-pro', 'models/gemini-1.5-pro', 'models/gemini-pro']:
                    model = next((m for m in models if m.name.endswith(model_name)), None)
                    if model:
                        GEMINI_MODEL = model.name.split('/')[-1]
                        break
                
                # If no specific model found, use the first available one
                if not GEMINI_MODEL:
                    GEMINI_MODEL = models[0].name.split('/')[-1]
                
                GEMINI_AVAILABLE = True
                
        except Exception as e:
            if "quota" in str(e).lower() or "429" in str(e):
                GEMINI_QUOTA_EXCEEDED = True
            
    except Exception as e:
        if "quota" in str(e).lower() or "429" in str(e):
            GEMINI_QUOTA_EXCEEDED = True

# 📊 Performance Metrics
PERFORMANCE_METRICS = {
    "total_queries": 0,
    "cache_hits": 0,
    "cache_misses": 0,
    "avg_response_time": 0.0,
    "model_usage": {"ollama": 0, "gemini": 0}
}

# 🎯 Response Cache
RESPONSE_CACHE = {}
MAX_CACHE_SIZE = 500

class FastLLMInterface:
    def __init__(self):
        self.ollama_available = self._check_ollama_availability()
        self.gemini_available = bool(GEMINI_API_KEY)
        self._init_gemini()
        
        logger.info(f"🚀 FastLLM Interface initialized:")
        logger.info(f"  - Ollama: {'✅' if self.ollama_available else '❌'}")
        logger.info(f"  - Gemini: {'✅' if self.gemini_available else '❌'}")
    
    def _check_ollama_availability(self) -> bool:
        """Check if Ollama is running and accessible"""
        try:
            response = requests.get(f"{OLLAMA_HOST}/api/tags", timeout=5)
            return response.status_code == 200
        except:
            return False
    
    def _init_gemini(self):
        """Initialize Gemini API if available"""
        if self.gemini_available:
            try:
                genai.configure(api_key=GEMINI_API_KEY)
                logger.info("✅ Gemini API configured")
            except Exception as e:
                logger.error(f"❌ Gemini configuration failed: {e}")
                self.gemini_available = False
    
    def _get_cache_key(self, query: str, context: Optional[str] = None, model_type: str = "ollama") -> str:
        """Generate cache key for query-context-model combination"""
        content = f"{query}:{context or 'no_context'}:{model_type}"
        return hashlib.md5(content.encode()).hexdigest()
    
    def _get_cached_response(self, cache_key: str) -> Optional[str]:
        """Get cached response if available"""
        if cache_key in RESPONSE_CACHE:
            PERFORMANCE_METRICS["cache_hits"] += 1
            return RESPONSE_CACHE[cache_key]
        
        PERFORMANCE_METRICS["cache_misses"] += 1
        return None
    
    def _cache_response(self, cache_key: str, response: str):
        """Cache response with LRU eviction"""
        if len(RESPONSE_CACHE) >= MAX_CACHE_SIZE:
            # Remove oldest entry
            oldest_key = next(iter(RESPONSE_CACHE))
            del RESPONSE_CACHE[oldest_key]
        
        RESPONSE_CACHE[cache_key] = response

# 🚀 Optimized Ollama Interface with CRITICAL fixes
def run_llm_ollama(prompt: str, timeout: int = 30) -> str:
    """Run local model using Ollama REST API with CRITICAL performance fixes"""
    start_time = time.time()
    
    try:
        # 🎯 Create comprehensive prompt for detailed answers
        optimized_prompt = _create_comprehensive_prompt(prompt)
        
        # 🚨 CRITICAL: Much shorter timeout and faster settings
        response = requests.post(
            f"{OLLAMA_HOST}/api/generate",
            json={
                "model": OLLAMA_MODEL,
                "prompt": optimized_prompt,
                "stream": False,
                "options": {
                    "temperature": 0.05,    # Ultra low for maximum speed
                    "num_predict": 100,      # Very short responses
                    "top_k": 5,            # Minimal selection for speed
                    "top_p": 0.7,          # Very focused sampling
                    "repeat_penalty": 1.0,  # No penalty for speed
                    "num_ctx": 512         # Minimal context for speed
                }
            },
            timeout=timeout  # CRITICAL: Much shorter timeout
        )
        
        if response.status_code == 200:
            result = response.json()["response"].strip()
            response_time = time.time() - start_time
            
            PERFORMANCE_METRICS["model_usage"]["ollama"] += 1
            PERFORMANCE_METRICS["total_queries"] += 1
            
            # Update average response time
            current_avg = PERFORMANCE_METRICS["avg_response_time"]
            total_queries = PERFORMANCE_METRICS["total_queries"]
            PERFORMANCE_METRICS["avg_response_time"] = (
                (current_avg * (total_queries - 1) + response_time) / total_queries
            )
            
            logger.info(f"✅ Ollama response in {response_time:.2f}s")
            return result
        else:
            return f"❌ Ollama API error: {response.text}"
            
    except requests.exceptions.Timeout:
        logger.warning(f"Ollama timeout after {timeout}s")
        # Try a simpler, faster request as fallback
        try:
            simple_response = requests.post(
                f"{OLLAMA_HOST}/api/generate",
                json={
                    "model": OLLAMA_MODEL,
                    "prompt": f"Answer briefly: {prompt}",
                    "stream": False,
                    "options": {
                        "temperature": 0.1,
                        "num_predict": 100,
                        "num_ctx": 512
                    }
                },
                timeout=10
            )
            if simple_response.status_code == 200:
                return simple_response.json()["response"].strip()
        except:
            pass
        return "❌ LLM timed out. The model might be busy or the question too complex. Try a simpler question or try again."
    except Exception as e:
        logger.error(f"Ollama error: {str(e)}")
        return f"❌ Ollama error: {str(e)}. Try restarting Ollama or check if the model is available."

# 🚀 Optimized Gemini Interface
def run_llm_gemini(prompt: str) -> str:
    """Run Gemini API with quota and error handling"""
    global GEMINI_QUOTA_EXCEEDED
    
    if GEMINI_QUOTA_EXCEEDED:
        raise Exception("Gemini API quota exceeded. Please check your Google Cloud Console.")
    
    if not GEMINI_AVAILABLE or not GEMINI_MODEL:
        raise Exception("Gemini is not available.")
    
    try:
        model = genai.GenerativeModel(GEMINI_MODEL)
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                temperature=0.3,
                max_output_tokens=1000,
                top_k=40,
                top_p=0.9,
                stop_sequences=["\n"]
            )
        )
        
        if hasattr(response, 'prompt_feedback') and response.prompt_feedback.block_reason:
            raise Exception(f"Content blocked: {response.prompt_feedback.block_reason}")
            
        if not hasattr(response, 'text') or not response.text:
            raise Exception("Empty response from Gemini API")
            
        PERFORMANCE_METRICS["model_usage"]["gemini"] += 1
        PERFORMANCE_METRICS["total_queries"] += 1
        
        return response.text.strip()
        
    except Exception as e:
        if "quota" in str(e).lower() or "429" in str(e):
            GEMINI_QUOTA_EXCEEDED = True
            raise Exception("Gemini API quota exceeded. Please check your Google Cloud Console.")
        raise

# 🚀 Ultra-fast response optimization
def _create_comprehensive_prompt(prompt: str) -> str:
    """Create ultra-minimal prompt for maximum speed"""
    
    # Minimal instruction for fastest response
    prompt += "\n\nAnswer briefly:"
    
    return prompt

# 🚀 Enhanced main LLM function with conversation memory
def run_llm(
    query: str, 
    context: Optional[str] = None, 
    model_type: str = "ollama",
    use_cache: bool = True,
    sources: Optional[List[str]] = None,
    conversation_history: Optional[List[Dict]] = None
) -> str:
    """Main LLM router with fallback logic"""
    # If Gemini is selected but not available or quota exceeded, fall back to Ollama
    if model_type.lower() == "gemini" and (GEMINI_QUOTA_EXCEEDED or not GEMINI_AVAILABLE):
        model_type = "ollama"
    """Enhanced LLM router with conversation memory and privacy protection"""
    
    # Generate cache key
    cache_key = hashlib.md5(f"{query}:{context or 'no_context'}:{model_type}".encode()).hexdigest()
    
    # Check cache first
    if use_cache:
        cached_response = RESPONSE_CACHE.get(cache_key)
        if cached_response:
            PERFORMANCE_METRICS["cache_hits"] += 1
            logger.info("✅ Using cached response")
            return cached_response
    
    # 🧠 Build conversation context from history
    conversation_context = ""
    if conversation_history and len(conversation_history) > 0:
        # Include last 3 Q&A pairs for context
        recent_history = conversation_history[-3:]
        history_text = []
        for item in recent_history:
            history_text.append(f"Previous Q: {item['question']}")
            history_text.append(f"Previous A: {item['answer']}")
        conversation_context = "\n".join(history_text) + "\n\n"
    
    # 🎯 PRIVACY PROTECTION: Route based on model and context availability
    if model_type == "gemini":
        # GEMINI: Only use general knowledge, no course materials
        prompt = f"""Question: {query}

Answer briefly:"""
        response = run_llm_gemini(prompt)
    
    elif model_type == "ollama":
        # OLLAMA: Use materials if available, otherwise general knowledge
        if context and sources:
            # Material-based response with source citation
            truncated_context = truncate_context(context, max_length=500)   # Minimal context for speed
            
            # Format source information
            source_info = "\n[Information sourced from course materials]"
            if sources:
                source_files = ", ".join([os.path.basename(s).split('-section')[0] for s in sources if s])
                if source_files:
                    source_info = f"\n[Information sourced from: {source_files}]"
            
            prompt = f"""{conversation_context}Based on the provided course materials:

Context: {truncated_context}

Current Question: {query}

Answer the question concisely using only the provided materials. 
At the end of your response, add: {source_info}

Answer:"""
            response = run_llm_ollama(prompt, timeout=30)
            
            # Ensure the source info is included in the response
            if source_info not in response:
                response += f"\n\n{source_info}"
        else:
            # No materials available, use general knowledge with conversation context
            prompt = f"""Question: {query}

Answer concisely. If you are not using any specific course materials, do not mention any sources."""
            response = run_llm_ollama(prompt, timeout=30)
            
            # Clean up any accidental source mentions in the response
            response = response.strip()
            if "[Information sourced from:" in response:
                response = response.split("[Information sourced from:")[0].strip()
            if "[This is a general knowledge answer]" not in response:
                response = f"{response}\n\n[This is a general knowledge answer]"
    else:
        response = f"❌ Invalid model type: {model_type}"
    
    # Cache the response
    if use_cache and response and not response.startswith("❌"):
        if len(RESPONSE_CACHE) >= MAX_CACHE_SIZE:
            # Remove oldest entry
            oldest_key = next(iter(RESPONSE_CACHE))
            del RESPONSE_CACHE[oldest_key]
        
        RESPONSE_CACHE[cache_key] = response
    
    return response

# 🚀 Async version for better performance
async def run_llm_async(
    query: str, 
    context: Optional[str] = None, 
    model_type: str = "ollama",
    use_cache: bool = True,
    sources: Optional[List[str]] = None,
    conversation_history: Optional[List[Dict]] = None
) -> str:
    """Async version of run_llm for non-blocking operations with proper cancellation support"""
    try:
        # Create a task that can be cancelled
        loop = asyncio.get_event_loop()
        task = loop.run_in_executor(
            None,  # Use default executor
            lambda: run_llm(
                query=query,
                context=context,
                model_type=model_type,
                use_cache=use_cache,
                sources=sources,
                conversation_history=conversation_history
            )
        )
        
        # Wait for the task to complete or be cancelled
        return await asyncio.wait_for(task, timeout=60)  # 60 second timeout
        
    except asyncio.TimeoutError:
        logger.warning("LLM request timed out after 60 seconds")
        return "❌ Request timed out. Please try again."
        
    except asyncio.CancelledError:
        logger.info("LLM request was cancelled")
        raise  # Re-raise to allow proper cleanup
        
    except Exception as e:
        logger.error(f"Error in run_llm_async: {str(e)}")
        return f"❌ Error processing your request: {str(e)}"

# 🚀 Batch processing for multiple queries
async def run_llm_batch(
    queries: List[str], 
    contexts: Optional[List[str]] = None,
    model_type: str = "ollama"
) -> List[str]:
    """Process multiple queries in parallel"""
    
    if contexts is None:
        contexts = [None] * len(queries)
    
    tasks = []
    for query, context in zip(queries, contexts):
        task = asyncio.create_task(
            run_llm_async(query, context, model_type)
        )
        tasks.append(task)
    
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    # Handle exceptions
    processed_results = []
    for result in results:
        if isinstance(result, Exception):
            processed_results.append(f"❌ Error: {str(result)}")
        else:
            processed_results.append(result)
    
    return processed_results

# 📊 Performance monitoring
def get_performance_metrics() -> Dict:
    """Get current performance metrics"""
    return {
        **PERFORMANCE_METRICS,
        "cache_size": len(RESPONSE_CACHE),
        "cache_hit_rate": PERFORMANCE_METRICS["cache_hits"] / max(1, PERFORMANCE_METRICS["cache_hits"] + PERFORMANCE_METRICS["cache_misses"])
    }

def clear_response_cache():
    """Clear response cache for memory management"""
    RESPONSE_CACHE.clear()
    logger.info("✅ Response cache cleared")

# 🎯 Smart context truncation for comprehensive understanding
def truncate_context(context: str, max_length: int = 3000) -> str:
    """Truncate context to optimal length while preserving important information"""
    if len(context) <= max_length:
        return context
    
    # Try to truncate at sentence boundaries
    sentences = context.split('. ')
    truncated = ""
    
    for sentence in sentences:
        if len(truncated + sentence + '. ') <= max_length:
            truncated += sentence + '. '
        else:
            break
    
    if truncated:
        return truncated.rstrip('. ') + '.'
    
    # Fallback to character-based truncation
    return context[:max_length-3] + "..."

# 🚀 Optimized context-aware prompting
def create_optimized_prompt(query: str, context: str, model_type: str = "ollama") -> str:
    """Create ultra-optimized prompt based on model type and context length"""
    
    # Optimize context while preserving important information
    optimized_context = truncate_context(context, max_length=3000)
    
    if model_type == "ollama":
        # Ollama-specific educational prompt
        prompt = f"""Context: {optimized_context}

Question: {query}

Format your response with:
• Clear structure using bullet points or numbered lists
• Break complex topics into digestible parts
• Include examples where helpful
• Use headings for different sections if needed

Provide a comprehensive and well-structured answer:"""
    
    elif model_type == "gemini":
        # Gemini-specific educational prompt
        prompt = f"""Context: {optimized_context}

Question: {query}

Format your response with:
• Clear structure using bullet points or numbered lists
• Break complex topics into digestible parts
• Include examples where helpful
• Use headings for different sections if needed

Provide a comprehensive and well-structured answer:"""
    
    else:
        # Generic educational prompt
        prompt = f"""Context: {optimized_context}

Question: {query}

Format your response with:
• Clear structure using bullet points or numbered lists
• Break complex topics into digestible parts
• Include examples where helpful
• Use headings for different sections if needed

Provide a comprehensive and well-structured answer:"""
    
    return prompt

# 🎯 Health check for LLM services
def check_llm_health() -> Dict[str, bool]:
    """Check health of available LLM services"""
    health_status = {}
    
    # Check Ollama
    try:
        response = requests.get(f"{OLLAMA_HOST}/api/tags", timeout=5)
        health_status["ollama"] = response.status_code == 200
    except:
        health_status["ollama"] = False
    
    # Check Gemini
    health_status["gemini"] = bool(GEMINI_API_KEY)
    
    return health_status