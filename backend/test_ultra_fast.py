#!/usr/bin/env python3
"""
Quick test for ultra-fast LLM configuration
"""

import os
import sys
import asyncio
import time

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

async def test_ultra_fast_responses():
    """Test ultra-fast LLM responses"""
    print("🚀 Testing Ultra-Fast LLM Configuration...")
    
    try:
        from llm_interface import run_llm_async
        
        # Simple test questions
        test_questions = [
            "What is Python?",
            "Define AI",
            "What is 2+2?",
            "Explain machine learning"
        ]
        
        total_time = 0
        successful_responses = 0
        
        for i, question in enumerate(test_questions, 1):
            print(f"\n--- Test {i}: {question} ---")
            
            start_time = time.time()
            try:
                response = await run_llm_async(
                    query=question,
                    model_type="ollama"
                )
                response_time = time.time() - start_time
                total_time += response_time
                
                if response and not response.startswith("❌"):
                    successful_responses += 1
                    print(f"✅ Response in {response_time:.2f}s")
                    print(f"📝 Length: {len(response)} chars")
                    print(f"📄 Response: {response[:100]}...")
                else:
                    print(f"❌ Failed: {response}")
                    
            except Exception as e:
                response_time = time.time() - start_time
                print(f"❌ Error in {response_time:.2f}s: {e}")
        
        if successful_responses > 0:
            avg_time = total_time / successful_responses
            print(f"\n📊 Results:")
            print(f"✅ Successful: {successful_responses}/{len(test_questions)}")
            print(f"⏱️ Average time: {avg_time:.2f}s")
            print(f"🎯 Target: <5s per response")
            
            if avg_time < 5:
                print("🎉 ULTRA-FAST configuration working!")
                return True
            else:
                print("⚠️ Still too slow, may need further optimization")
                return False
        else:
            print("❌ No successful responses")
            return False
            
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False

async def main():
    """Run ultra-fast test"""
    print("🚀 Ultra-Fast LLM Test\n")
    
    success = await test_ultra_fast_responses()
    
    if success:
        print("\n🎉 LLM is now configured for ultra-fast responses!")
        print("📝 Responses should be brief but informative")
        print("⚡ Target response time: 2-5 seconds")
    else:
        print("\n🔧 Troubleshooting needed:")
        print("1. Check if Ollama is running: ollama serve")
        print("2. Verify model is available: ollama list")
        print("3. Try restarting Ollama")
        print("4. Check system resources")
    
    return success

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
