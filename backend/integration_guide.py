#!/usr/bin/env python3
"""
Integration Guide for Fine-tuned Study Assistant
Updates existing FastAPI backend to use fine-tuned model
"""

import os
import requests
import json
from typing import Optional

def update_llm_interface():
    """Create updated LLM interface with fine-tuned model support"""
    
    updated_code = '''
# Updated llm_interface.py with fine-tuned model support

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

# Model Configuration
OLLAMA_HOST = "http://localhost:11434"
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Available models
MODELS = {
    "base_mistral": "mistral",
    "study_assistant_q4": "study-assistant-q4_k_m",
    "study_assistant_q5": "study-assistant-q5_k_m", 
    "study_assistant_q8": "study-assistant-q8_0",
    "gemini": "gemini-1.5-flash"
}

# Default model for study assistant
DEFAULT_STUDY_MODEL = "study_assistant_q4"

def run_llm_study_assistant(
    query: str, 
    context: Optional[str] = None,
    model: str = DEFAULT_STUDY_MODEL,
    timeout: int = 30
) -> str:
    """
    Enhanced LLM function specifically for study assistant with fine-tuned model
    """
    
    # Use fine-tuned model for study queries
    ollama_model = MODELS.get(model, MODELS[DEFAULT_STUDY_MODEL])
    
    try:
        # Create optimized prompt for study assistant
        if context:
            prompt = f"""### Instruction:
{query}

### Input:
{context}

### Response:
"""
        else:
            prompt = f"""### Instruction:
{query}

### Response:
"""
        
        # Call Ollama with fine-tuned model
        response = requests.post(
            f"{OLLAMA_HOST}/api/generate",
            json={
                "model": ollama_model,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.7,
                    "top_p": 0.9,
                    "top_k": 40,
                    "repeat_penalty": 1.1,
                    "num_predict": 512,
                    "num_ctx": 2048
                }
            },
            timeout=timeout
        )
        
        if response.status_code == 200:
            result = response.json()["response"].strip()
            logger.info(f"✅ Study Assistant ({ollama_model}) response generated")
            return result
        else:
            logger.error(f"Ollama API error: {response.text}")
            return f"❌ Study Assistant error: {response.text}"
            
    except requests.exceptions.Timeout:
        return "❌ Study Assistant timed out. Try a simpler question."
    except Exception as e:
        logger.error(f"Study Assistant error: {str(e)}")
        return f"❌ Study Assistant error: {str(e)}"

def check_study_models() -> Dict[str, bool]:
    """Check which study assistant models are available"""
    
    available_models = {}
    
    try:
        response = requests.get(f"{OLLAMA_HOST}/api/tags", timeout=5)
        if response.status_code == 200:
            models = response.json().get("models", [])
            model_names = [model["name"] for model in models]
            
            for key, model_name in MODELS.items():
                if key != "gemini":
                    available_models[key] = model_name in model_names
        else:
            available_models = {key: False for key in MODELS.keys() if key != "gemini"}
            
    except Exception as e:
        logger.error(f"Error checking models: {e}")
        available_models = {key: False for key in MODELS.keys() if key != "gemini"}
    
    # Check Gemini
    available_models["gemini"] = bool(GEMINI_API_KEY)
    
    return available_models

# Backward compatibility - update existing run_llm function
def run_llm(
    query: str, 
    context: Optional[str] = None, 
    model_type: str = "study_assistant",
    use_cache: bool = True
) -> str:
    """
    Updated run_llm function with study assistant integration
    """
    
    if model_type == "study_assistant" or model_type == "ollama":
        # Use fine-tuned study assistant model
        return run_llm_study_assistant(query, context)
    elif model_type == "gemini":
        # Use existing Gemini implementation
        return run_llm_gemini(query, context)
    else:
        return f"❌ Invalid model type: {model_type}"

# Keep existing functions for backward compatibility
def run_llm_gemini(prompt: str, context: Optional[str] = None) -> str:
    """Existing Gemini implementation"""
    # ... existing code ...
    pass
'''
    
    return updated_code

def create_model_management_script():
    """Create script to manage study assistant models"""
    
    script_content = '''#!/usr/bin/env python3
"""
Model Management Script for Study Assistant
Handles model installation, updates, and switching
"""

import requests
import subprocess
import json
import os

OLLAMA_HOST = "http://localhost:11434"

def list_available_models():
    """List all available Ollama models"""
    try:
        response = requests.get(f"{OLLAMA_HOST}/api/tags")
        if response.status_code == 200:
            models = response.json().get("models", [])
            print("Available Models:")
            for model in models:
                print(f"  - {model['name']} ({model.get('size', 'Unknown size')})")
        else:
            print("Failed to fetch models")
    except Exception as e:
        print(f"Error: {e}")

def install_study_model(model_path, model_name):
    """Install study assistant model from GGUF file"""
    
    modelfile_content = f"""FROM {model_path}

TEMPLATE \"\"\"### Instruction:
{{{{ .Prompt }}}}

### Response:
\"\"\"

PARAMETER temperature 0.7
PARAMETER top_p 0.9
PARAMETER top_k 40
PARAMETER repeat_penalty 1.1

SYSTEM \"\"\"You are a helpful study assistant. Always respond in this format:
Answer: [Direct answer]
Explanation: [Detailed explanation]  
Example: [Code or practical example if applicable]
Source: [Reference or context]

Keep responses concise, clear, and educational.\"\"\"
"""
    
    # Write Modelfile
    with open("Modelfile.tmp", "w") as f:
        f.write(modelfile_content)
    
    # Create model
    cmd = ["ollama", "create", model_name, "-f", "Modelfile.tmp"]
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    if result.returncode == 0:
        print(f"✅ Model '{model_name}' installed successfully")
        os.remove("Modelfile.tmp")
        return True
    else:
        print(f"❌ Failed to install model: {result.stderr}")
        return False

def test_model(model_name):
    """Test model with sample question"""
    
    test_prompt = """### Instruction:
Explain binary search algorithm briefly.

### Response:
"""
    
    try:
        response = requests.post(
            f"{OLLAMA_HOST}/api/generate",
            json={
                "model": model_name,
                "prompt": test_prompt,
                "stream": False
            }
        )
        
        if response.status_code == 200:
            result = response.json()["response"]
            print(f"✅ Model '{model_name}' test successful:")
            print(result)
            return True
        else:
            print(f"❌ Model test failed: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Test error: {e}")
        return False

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python model_manager.py list")
        print("  python model_manager.py install <gguf_path> <model_name>")
        print("  python model_manager.py test <model_name>")
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "list":
        list_available_models()
    elif command == "install" and len(sys.argv) == 4:
        install_study_model(sys.argv[2], sys.argv[3])
    elif command == "test" and len(sys.argv) == 3:
        test_model(sys.argv[2])
    else:
        print("Invalid command or arguments")
'''
    
    return script_content

def main():
    """Generate integration files"""
    
    print("Creating integration files for fine-tuned study assistant...")
    
    # Create updated LLM interface
    updated_interface = update_llm_interface()
    with open("llm_interface_updated.py", "w") as f:
        f.write(updated_interface)
    print("✅ Created llm_interface_updated.py")
    
    # Create model management script
    model_manager = create_model_management_script()
    with open("model_manager.py", "w") as f:
        f.write(model_manager)
    print("✅ Created model_manager.py")
    
    print("\nIntegration files created successfully!")
    print("\nNext steps:")
    print("1. Replace llm_interface.py with llm_interface_updated.py")
    print("2. Install your fine-tuned model using model_manager.py")
    print("3. Test the integration")

if __name__ == "__main__":
    main()
