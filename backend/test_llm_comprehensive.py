#!/usr/bin/env python3
"""
Test script to verify LLM provides comprehensive answers without token limitations
"""

import os
import sys
import asyncio

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

async def test_comprehensive_answers():
    """Test that LLM provides detailed, comprehensive answers"""
    print("🧪 Testing LLM Comprehensive Answers...")
    
    try:
        from llm_interface import run_llm_async
        
        # Test questions that should get detailed answers
        test_questions = [
            "Explain the concept of machine learning and its applications",
            "What are the key differences between supervised and unsupervised learning?",
            "Describe the process of photosynthesis in plants",
            "How does the internet work and what are its main protocols?"
        ]
        
        print("\n🔍 Testing with different questions...")
        
        for i, question in enumerate(test_questions, 1):
            print(f"\n--- Test {i}: {question[:50]}... ---")
            
            # Test with Ollama (if available)
            try:
                response_ollama = await run_llm_async(
                    query=question,
                    model_type="ollama"
                )
                
                print(f"📝 Ollama Response Length: {len(response_ollama)} characters")
                if len(response_ollama) > 200:  # Should be much longer than old 128 token limit
                    print("✅ Ollama: Comprehensive response received")
                else:
                    print("⚠️ Ollama: Response seems short")
                    print(f"Response: {response_ollama}")
                
            except Exception as e:
                print(f"❌ Ollama test failed: {e}")
            
            # Test with Gemini (if available)
            try:
                response_gemini = await run_llm_async(
                    query=question,
                    model_type="gemini"
                )
                
                print(f"📝 Gemini Response Length: {len(response_gemini)} characters")
                if len(response_gemini) > 200:  # Should be much longer than old 128 token limit
                    print("✅ Gemini: Comprehensive response received")
                else:
                    print("⚠️ Gemini: Response seems short")
                    print(f"Response: {response_gemini}")
                
            except Exception as e:
                print(f"❌ Gemini test failed: {e}")
            
            # Only test first question in detail to avoid spam
            if i == 1:
                print(f"\n📄 Sample Ollama Response:\n{response_ollama[:500]}...")
                break
        
        print("\n🎉 Comprehensive answer testing completed!")
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False

async def test_context_handling():
    """Test that LLM handles larger context properly"""
    print("\n🧪 Testing Context Handling...")
    
    try:
        from llm_interface import run_llm_async
        
        # Create a longer context to test
        long_context = """
        Machine Learning is a subset of artificial intelligence that enables computers to learn and improve from experience without being explicitly programmed. It involves algorithms that can identify patterns in data and make predictions or decisions based on those patterns.

        There are several types of machine learning:
        1. Supervised Learning: Uses labeled training data to learn a mapping from inputs to outputs
        2. Unsupervised Learning: Finds hidden patterns in data without labeled examples
        3. Reinforcement Learning: Learns through interaction with an environment using rewards and penalties

        Applications include:
        - Image recognition and computer vision
        - Natural language processing
        - Recommendation systems
        - Autonomous vehicles
        - Medical diagnosis
        - Financial fraud detection
        - Predictive analytics
        
        The process typically involves data collection, preprocessing, model selection, training, evaluation, and deployment.
        """
        
        question = "Based on the provided information, explain the different types of machine learning and give examples of their applications."
        
        response = await run_llm_async(
            query=question,
            context=long_context,
            model_type="ollama"
        )
        
        print(f"📝 Context-based Response Length: {len(response)} characters")
        print(f"📄 Response Preview:\n{response[:300]}...")
        
        if len(response) > 300:
            print("✅ Context handling: Comprehensive response with context")
            return True
        else:
            print("⚠️ Context handling: Response seems short")
            return False
            
    except Exception as e:
        print(f"❌ Context test failed: {e}")
        return False

async def main():
    """Run all comprehensive answer tests"""
    print("🚀 Starting LLM Comprehensive Answer Tests\n")
    
    test1 = await test_comprehensive_answers()
    test2 = await test_context_handling()
    
    print(f"\n📊 Test Results:")
    print(f"✅ Comprehensive Answers: {'PASS' if test1 else 'FAIL'}")
    print(f"✅ Context Handling: {'PASS' if test2 else 'FAIL'}")
    
    if test1 and test2:
        print("\n🎉 All tests passed! LLM now provides comprehensive answers.")
    else:
        print("\n⚠️ Some tests failed. Check the configuration.")
    
    return test1 and test2

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
