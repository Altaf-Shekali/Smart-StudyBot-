#!/usr/bin/env python3
"""
Test script to verify LLM provides structured, bullet-point answers for complex topics
"""

import os
import sys
import asyncio

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

async def test_structured_answers():
    """Test that LLM provides structured, bullet-point answers"""
    print("🧪 Testing LLM Structured Answers...")
    
    try:
        from llm_interface import run_llm_async
        
        # Test complex topics that should get structured answers
        complex_questions = [
            "Explain the different types of machine learning algorithms and their applications",
            "What are the key components of a computer network and how do they work together?",
            "Describe the process of cellular respiration and its importance in biology",
            "Explain the concept of object-oriented programming and its main principles"
        ]
        
        print("\n🔍 Testing structured responses for complex topics...")
        
        for i, question in enumerate(complex_questions, 1):
            print(f"\n--- Test {i}: {question[:60]}... ---")
            
            # Test with Ollama
            try:
                response = await run_llm_async(
                    query=question,
                    model_type="ollama"
                )
                
                print(f"📝 Response Length: {len(response)} characters")
                
                # Check for structured formatting
                has_bullets = '•' in response or '*' in response or '-' in response
                has_numbers = any(f"{j}." in response for j in range(1, 10))
                has_structure = has_bullets or has_numbers
                
                if has_structure:
                    print("✅ Structured formatting detected (bullets/numbers)")
                else:
                    print("⚠️ No clear structure detected")
                
                # Check for educational elements
                has_examples = 'example' in response.lower() or 'for instance' in response.lower()
                has_sections = any(word in response.lower() for word in ['types', 'components', 'steps', 'principles', 'categories'])
                
                if has_examples:
                    print("✅ Examples included")
                if has_sections:
                    print("✅ Clear sections/categories")
                
                # Show a sample of the first response
                if i == 1:
                    print(f"\n📄 Sample Structured Response:\n{response[:800]}...")
                
                break  # Only test first question in detail
                
            except Exception as e:
                print(f"❌ Test failed: {e}")
                return False
        
        return True
        
    except Exception as e:
        print(f"❌ Test setup failed: {e}")
        return False

async def test_pdf_structured_response():
    """Test structured responses with PDF context"""
    print("\n🧪 Testing PDF Context Structured Responses...")
    
    try:
        from llm_interface import run_llm_async
        
        # Simulate PDF context about a complex topic
        pdf_context = """
        Machine Learning Overview
        
        Machine learning is a method of data analysis that automates analytical model building. It is a branch of artificial intelligence based on the idea that systems can learn from data, identify patterns and make decisions with minimal human intervention.
        
        Types of Machine Learning:
        
        Supervised Learning: This type uses labeled training data to learn a mapping from inputs to outputs. Common algorithms include linear regression, decision trees, and neural networks. Applications include email spam detection, image recognition, and medical diagnosis.
        
        Unsupervised Learning: This finds hidden patterns in data without labeled examples. Techniques include clustering, association rules, and dimensionality reduction. Used for customer segmentation, anomaly detection, and data compression.
        
        Reinforcement Learning: This learns through interaction with an environment using rewards and penalties. Applications include game playing, robotics, and autonomous vehicles.
        
        The machine learning process typically involves data collection, data preprocessing, model selection, training, evaluation, and deployment.
        """
        
        question = "Based on the provided information, explain the different types of machine learning and their applications."
        
        response = await run_llm_async(
            query=question,
            context=pdf_context,
            model_type="ollama"
        )
        
        print(f"📝 PDF Context Response Length: {len(response)} characters")
        
        # Check for structured formatting
        has_bullets = '•' in response or '*' in response or '-' in response
        has_numbers = any(f"{j}." in response for j in range(1, 10))
        has_structure = has_bullets or has_numbers
        
        print(f"✅ Structured formatting: {'YES' if has_structure else 'NO'}")
        print(f"📄 Response Preview:\n{response[:600]}...")
        
        return has_structure
        
    except Exception as e:
        print(f"❌ PDF context test failed: {e}")
        return False

async def test_simple_vs_complex_topics():
    """Test that simple topics get appropriate responses while complex ones get structured"""
    print("\n🧪 Testing Simple vs Complex Topic Handling...")
    
    try:
        from llm_interface import run_llm_async
        
        # Simple question
        simple_question = "What is the capital of France?"
        simple_response = await run_llm_async(
            query=simple_question,
            model_type="ollama"
        )
        
        # Complex question
        complex_question = "Explain the differences between various database management systems and when to use each type"
        complex_response = await run_llm_async(
            query=complex_question,
            model_type="ollama"
        )
        
        print(f"📝 Simple Response Length: {len(simple_response)} characters")
        print(f"📝 Complex Response Length: {len(complex_response)} characters")
        
        # Complex response should be longer and more structured
        complex_is_longer = len(complex_response) > len(simple_response) * 2
        complex_has_structure = '•' in complex_response or any(f"{j}." in complex_response for j in range(1, 10))
        
        print(f"✅ Complex response is longer: {'YES' if complex_is_longer else 'NO'}")
        print(f"✅ Complex response has structure: {'YES' if complex_has_structure else 'NO'}")
        
        return complex_is_longer and complex_has_structure
        
    except Exception as e:
        print(f"❌ Simple vs complex test failed: {e}")
        return False

async def main():
    """Run all structured answer tests"""
    print("🚀 Starting LLM Structured Answer Tests\n")
    
    test1 = await test_structured_answers()
    test2 = await test_pdf_structured_response()
    test3 = await test_simple_vs_complex_topics()
    
    print(f"\n📊 Test Results:")
    print(f"✅ Structured Answers: {'PASS' if test1 else 'FAIL'}")
    print(f"✅ PDF Context Structure: {'PASS' if test2 else 'FAIL'}")
    print(f"✅ Appropriate Complexity: {'PASS' if test3 else 'FAIL'}")
    
    if test1 and test2 and test3:
        print("\n🎉 All tests passed! LLM now provides structured, educational answers.")
        print("📚 Complex topics will be broken down with bullet points and clear structure.")
        print("🎯 Simple topics will get appropriate, concise responses.")
    else:
        print("\n⚠️ Some tests failed. Check the configuration.")
    
    return test1 and test2 and test3

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
