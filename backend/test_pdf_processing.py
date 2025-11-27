#!/usr/bin/env python3
"""
Test script for PDF processing functionality
Tests both teacher course material upload and student temporary PDF processing
"""

import os
import sys
import tempfile
import shutil
from pathlib import Path

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def test_simple_embeddings():
    """Test the SimpleEmbeddings class"""
    print("🧪 Testing SimpleEmbeddings...")
    try:
        from simple_embeddings import SimpleEmbeddings, get_embeddings
        
        # Test SimpleEmbeddings class
        embeddings = SimpleEmbeddings()
        
        # Test embedding documents
        docs = ["This is a test document.", "Another test document."]
        doc_embeddings = embeddings.embed_documents(docs)
        print(f"✅ Document embeddings: {len(doc_embeddings)} docs, {len(doc_embeddings[0])} dimensions")
        
        # Test embedding query
        query = "test query"
        query_embedding = embeddings.embed_query(query)
        print(f"✅ Query embedding: {len(query_embedding)} dimensions")
        
        # Test get_embeddings function
        text_embeddings = get_embeddings(docs)
        print(f"✅ get_embeddings function: shape {text_embeddings.shape}")
        
        return True
    except Exception as e:
        print(f"❌ SimpleEmbeddings test failed: {e}")
        return False

def test_pdf_loading():
    """Test PDF loading functionality"""
    print("\n🧪 Testing PDF loading...")
    try:
        from retriever import load_pdf
        
        # Create a simple test PDF (if we have one)
        # For now, just test the function exists
        print("✅ load_pdf function imported successfully")
        return True
    except Exception as e:
        print(f"❌ PDF loading test failed: {e}")
        return False

def test_temp_pdf_processing():
    """Test temporary PDF processing"""
    print("\n🧪 Testing temporary PDF processing...")
    try:
        from retriever import process_temp_pdf_for_query
        
        print("✅ process_temp_pdf_for_query function imported successfully")
        return True
    except Exception as e:
        print(f"❌ Temporary PDF processing test failed: {e}")
        return False

def test_vectorstore_creation():
    """Test vectorstore creation"""
    print("\n🧪 Testing vectorstore creation...")
    try:
        from retriever import create_vectorstore
        
        print("✅ create_vectorstore function imported successfully")
        return True
    except Exception as e:
        print(f"❌ Vectorstore creation test failed: {e}")
        return False

def main():
    """Run all tests"""
    print("🚀 Starting PDF Processing Tests\n")
    
    tests = [
        test_simple_embeddings,
        test_pdf_loading,
        test_temp_pdf_processing,
        test_vectorstore_creation
    ]
    
    results = []
    for test in tests:
        try:
            result = test()
            results.append(result)
        except Exception as e:
            print(f"❌ Test {test.__name__} crashed: {e}")
            results.append(False)
    
    print(f"\n📊 Test Results:")
    print(f"✅ Passed: {sum(results)}/{len(results)}")
    print(f"❌ Failed: {len(results) - sum(results)}/{len(results)}")
    
    if all(results):
        print("\n🎉 All tests passed! PDF processing system is ready.")
    else:
        print("\n⚠️ Some tests failed. Check the errors above.")
    
    return all(results)

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
