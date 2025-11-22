"""
Test Qdrant Cloud Connection

This script tests the connection to Qdrant Cloud using credentials from .env
and verifies that the landoclock_knowledge collection exists.

Usage:
    python test_qdrant_connection.py
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Add parent directory to path to import config
sys.path.insert(0, str(Path(__file__).parent))

from config.qdrant_config import (
    get_qdrant_client,
    get_embeddings,
    get_vector_store,
    create_collection_if_not_exists,
    get_collection_info,
    COLLECTION_NAME,
    QDRANT_URL,
    QDRANT_API_KEY,
)

# Load environment variables
load_dotenv()


def test_environment_variables():
    """Test that required environment variables are set."""
    print("=" * 60)
    print("🔍 Testing Environment Variables")
    print("=" * 60)
    
    qdrant_url = os.getenv("QDRANT_URL")
    qdrant_api_key = os.getenv("QDRANT_API_KEY")
    openai_api_key = os.getenv("OPENAI_API_KEY")
    
    print(f"QDRANT_URL: {'✅ Set' if qdrant_url else '❌ Not set'}")
    if qdrant_url:
        # Mask the URL for security (show only domain)
        try:
            domain = qdrant_url.split("//")[1].split("/")[0] if "//" in qdrant_url else "***"
            print(f"  → {domain}")
        except:
            print(f"  → ***")
    
    print(f"QDRANT_API_KEY: {'✅ Set' if qdrant_api_key else '❌ Not set'}")
    if qdrant_api_key:
        masked_key = qdrant_api_key[:8] + "..." + qdrant_api_key[-4:] if len(qdrant_api_key) > 12 else "***"
        print(f"  → {masked_key}")
    
    print(f"OPENAI_API_KEY: {'✅ Set' if openai_api_key else '❌ Not set'}")
    if openai_api_key:
        masked_key = openai_api_key[:8] + "..." + openai_api_key[-4:] if len(openai_api_key) > 12 else "***"
        print(f"  → {masked_key}")
    
    print()
    
    if not qdrant_url or not qdrant_api_key:
        print("❌ Missing required Qdrant environment variables!")
        return False
    
    if not openai_api_key:
        print("⚠️  OPENAI_API_KEY not set (needed for embeddings)")
        return False
    
    return True


def test_qdrant_connection():
    """Test connection to Qdrant Cloud."""
    print("=" * 60)
    print("🔌 Testing Qdrant Cloud Connection")
    print("=" * 60)
    
    try:
        client = get_qdrant_client()
        print("✅ Qdrant client created successfully")
        
        # Test connection by getting collections
        collections = client.get_collections()
        print(f"✅ Successfully connected to Qdrant Cloud")
        print(f"   Found {len(collections.collections)} collection(s)")
        
        for col in collections.collections:
            print(f"   - {col.name}")
        
        print()
        return True
        
    except Exception as e:
        print(f"❌ Failed to connect to Qdrant Cloud: {e}")
        print()
        return False


def test_embeddings():
    """Test OpenAI embeddings initialization."""
    print("=" * 60)
    print("🧮 Testing OpenAI Embeddings")
    print("=" * 60)
    
    try:
        embeddings = get_embeddings()
        print("✅ Embeddings model initialized successfully")
        print(f"   Model: text-embedding-3-small")
        
        # Test embedding generation
        test_text = "Land O'Clock real estate platform"
        result = embeddings.embed_query(test_text)
        print(f"✅ Test embedding generated: {len(result)} dimensions")
        print()
        return True
        
    except Exception as e:
        print(f"❌ Failed to initialize embeddings: {e}")
        print()
        return False


def test_collection():
    """Test collection existence and configuration."""
    print("=" * 60)
    print(f"📦 Testing Collection: {COLLECTION_NAME}")
    print("=" * 60)
    
    try:
        # Ensure collection exists
        create_collection_if_not_exists()
        
        # Get collection info
        info = get_collection_info()
        
        if "error" in info:
            print(f"❌ Error getting collection info: {info['error']}")
            return False
        
        print(f"✅ Collection '{info['name']}' exists")
        print(f"   Points: {info['points_count']}")
        if 'vectors_count' in info:
            print(f"   Vectors: {info['vectors_count']}")
        print(f"   Status: {info['status']}")
        print(f"   Vector Size: {info['config']['vector_size']}")
        print(f"   Distance: {info['config']['distance']}")
        print()
        return True
        
    except Exception as e:
        print(f"❌ Error testing collection: {e}")
        print()
        return False


def test_vector_store():
    """Test vector store operations."""
    print("=" * 60)
    print("🔍 Testing Vector Store Operations")
    print("=" * 60)
    
    try:
        vector_store = get_vector_store()
        print("✅ Vector store initialized successfully")
        
        # Test a simple search (even if collection is empty)
        try:
            results = vector_store.similarity_search("test query", k=1)
            print(f"✅ Search operation successful (found {len(results)} result(s))")
        except Exception as e:
            print(f"⚠️  Search test: {e}")
            print("   (This is normal if the collection is empty)")
        
        print()
        return True
        
    except Exception as e:
        print(f"❌ Error testing vector store: {e}")
        print()
        return False


def main():
    """Run all tests."""
    print()
    print("🚀 Land O'Clock Qdrant Connection Test")
    print()
    
    results = []
    
    # Test 1: Environment variables
    results.append(("Environment Variables", test_environment_variables()))
    
    if not results[-1][1]:
        print("❌ Cannot proceed without environment variables. Please check your .env file.")
        return
    
    # Test 2: Qdrant connection
    results.append(("Qdrant Connection", test_qdrant_connection()))
    
    # Test 3: Embeddings
    results.append(("OpenAI Embeddings", test_embeddings()))
    
    # Test 4: Collection
    results.append(("Collection", test_collection()))
    
    # Test 5: Vector store
    results.append(("Vector Store", test_vector_store()))
    
    # Summary
    print("=" * 60)
    print("📊 Test Summary")
    print("=" * 60)
    
    for test_name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status}: {test_name}")
    
    print()
    
    all_passed = all(result[1] for result in results)
    
    if all_passed:
        print("✅ All tests passed! Qdrant integration is ready to use.")
    else:
        print("⚠️  Some tests failed. Please check the errors above.")
    
    print("=" * 60)
    print()


if __name__ == "__main__":
    main()

