#!/usr/bin/env python3
"""
Quick health check for LLM services to diagnose timeout issues
"""

import os
import sys
import asyncio
import requests
import time

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def test_ollama_connection():
    """Test basic Ollama connection"""
    print("🔍 Testing Ollama Connection...")
    
    try:
        # Test if Ollama is running
        response = requests.get("http://localhost:11434/api/tags", timeout=5)
        if response.status_code == 200:
            models = response.json().get('models', [])
            print(f"✅ Ollama is running with {len(models)} models")
            
            # List available models
            for model in models:
                print(f"  📦 {model.get('name', 'Unknown')}")
            
            return True
        else:
            print(f"❌ Ollama responded with status {response.status_code}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to Ollama. Is it running on localhost:11434?")
        return False
    except Exception as e:
        print(f"❌ Ollama connection error: {e}")
        return False

def test_simple_ollama_query():
    """Test a simple Ollama query"""
    print("\n🧪 Testing Simple Ollama Query...")
    
    try:
        start_time = time.time()
        response = requests.post(
            "http://localhost:11434/api/generate",
            json={
                "model": "mistral",
                "prompt": "What is 2+2?",
                "stream": False,
                "options": {
                    "temperature": 0.1,
                    "num_predict": 50,
                    "num_ctx": 512
                }
            },
            timeout=15
        )
        
        response_time = time.time() - start_time
        
        if response.status_code == 200:
            result = response.json().get("response", "").strip()
            print(f"✅ Simple query successful in {response_time:.2f}s")
            print(f"📝 Response: {result}")
            return True
        else:
            print(f"❌ Query failed with status {response.status_code}")
            print(f"📝 Error: {response.text}")
            return False
            
    except requests.exceptions.Timeout:
        print("❌ Simple query timed out (15s)")
        return False
    except Exception as e:
        print(f"❌ Query error: {e}")
        return False

async def test_llm_interface():
    """Test our LLM interface"""
    print("\n🧪 Testing LLM Interface...")
    
    try:
        from llm_interface import run_llm_async
        
        # Test simple question
        start_time = time.time()
        response = await run_llm_async(
            query="What is Python?",
            model_type="ollama"
        )
        response_time = time.time() - start_time
        
        if response and not response.startswith("❌"):
            print(f"✅ LLM interface working in {response_time:.2f}s")
            print(f"📝 Response length: {len(response)} characters")
            print(f"📄 Response preview: {response[:200]}...")
            return True
        else:
            print(f"❌ LLM interface failed: {response}")
            return False
            
    except Exception as e:
        print(f"❌ LLM interface error: {e}")
        return False

def test_gemini_availability():
    """Test if Gemini is available"""
    print("\n🔍 Testing Gemini Availability...")
    
    try:
        from llm_interface import GEMINI_API_KEY
        
        if GEMINI_API_KEY:
            print("✅ Gemini API key is configured")
            return True
        else:
            print("⚠️ Gemini API key not configured")
            return False
            
    except Exception as e:
        print(f"❌ Gemini check error: {e}")
        return False

async def main():
    """Run all health checks"""
    print("🚀 LLM Health Check Starting...\n")
    
    # Test Ollama connection
    ollama_connection = test_ollama_connection()
    
    # Test simple Ollama query
    ollama_query = test_simple_ollama_query() if ollama_connection else False
    
    # Test our LLM interface
    llm_interface = await test_llm_interface() if ollama_query else False
    
    # Test Gemini availability
    gemini_available = test_gemini_availability()
    
    print(f"\n📊 Health Check Results:")
    print(f"🔗 Ollama Connection: {'✅ PASS' if ollama_connection else '❌ FAIL'}")
    print(f"🧪 Ollama Query: {'✅ PASS' if ollama_query else '❌ FAIL'}")
    print(f"🤖 LLM Interface: {'✅ PASS' if llm_interface else '❌ FAIL'}")
    print(f"🌟 Gemini Available: {'✅ YES' if gemini_available else '⚠️ NO'}")
    
    if not ollama_connection:
        print(f"\n🔧 Troubleshooting Steps:")
        print(f"1. Start Ollama: 'ollama serve'")
        print(f"2. Pull the model: 'ollama pull mistral'")
        print(f"3. Check if port 11434 is available")
        
    if not ollama_query and ollama_connection:
        print(f"\n🔧 Troubleshooting Steps:")
        print(f"1. Try a different model: 'ollama pull llama2'")
        print(f"2. Check system resources (RAM/CPU)")
        print(f"3. Restart Ollama service")
        
    if not llm_interface and ollama_query:
        print(f"\n🔧 Troubleshooting Steps:")
        print(f"1. Check backend configuration")
        print(f"2. Verify model name in llm_interface.py")
        print(f"3. Check for Python import errors")
    
    overall_health = ollama_connection and ollama_query and llm_interface
    
    if overall_health:
        print(f"\n🎉 All systems operational! LLM should work properly.")
    else:
        print(f"\n⚠️ Issues detected. Follow troubleshooting steps above.")
    
    return overall_health

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
