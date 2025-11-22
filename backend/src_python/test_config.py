"""
Test script to verify environment configuration

Run this to check if all required environment variables are set correctly.
"""

import os
from dotenv import load_dotenv

load_dotenv()

def test_config():
    """Test environment configuration"""
    print("=" * 60)
    print("🔍 Testing Kozi AI Backend Configuration")
    print("=" * 60)
    print()
    
    # Required variables
    required_vars = {
        "OPENAI_API_KEY": os.getenv("OPENAI_API_KEY"),
        "DATABASE_URL": os.getenv("DATABASE_URL"),
    }
    
    # Optional but recommended
    optional_vars = {
        "OPENAI_CHAT_MODEL": os.getenv("OPENAI_CHAT_MODEL"),
        "OPENAI_EMBEDDING_MODEL": os.getenv("OPENAI_EMBEDDING_MODEL"),
        "QDRANT_URL": os.getenv("QDRANT_URL"),
        "QDRANT_API_KEY": os.getenv("QDRANT_API_KEY"),
        "QDRANT_COLLECTION_NAME": os.getenv("QDRANT_COLLECTION_NAME"),
        "PORT": os.getenv("PORT"),
    }
    
    # Check required
    print("📋 Required Environment Variables:")
    all_required_ok = True
    for var_name, var_value in required_vars.items():
        if var_value:
            print(f"  ✅ {var_name}: {'*' * min(len(var_value), 20)}...")
        else:
            print(f"  ❌ {var_name}: NOT SET")
            all_required_ok = False
    
    print()
    print("📋 Optional Environment Variables:")
    for var_name, var_value in optional_vars.items():
        if var_value:
            if var_name in ["QDRANT_API_KEY"]:
                print(f"  ✅ {var_name}: {'*' * min(len(var_value), 20)}...")
            else:
                print(f"  ✅ {var_name}: {var_value}")
        else:
            print(f"  ⚠️  {var_name}: Not set (using default)")
    
    print()
    
    # Test imports
    print("📦 Testing Python Imports:")
    try:
        from langchain_openai import ChatOpenAI, OpenAIEmbeddings
        print("  ✅ langchain_openai")
    except ImportError as e:
        print(f"  ❌ langchain_openai: {e}")
        all_required_ok = False
    
    try:
        from langchain_qdrant import QdrantVectorStore
        print("  ✅ langchain_qdrant")
    except ImportError as e:
        print(f"  ⚠️  langchain_qdrant: {e} (optional)")
    
    try:
        from prisma import Prisma
        print("  ✅ prisma")
    except ImportError as e:
        print(f"  ⚠️  prisma: {e} (optional)")
    
    try:
        from fastapi import FastAPI
        print("  ✅ fastapi")
    except ImportError as e:
        print(f"  ❌ fastapi: {e}")
        all_required_ok = False
    
    print()
    
    # Test Qdrant connection
    if os.getenv("QDRANT_URL") and os.getenv("QDRANT_API_KEY"):
        print("🔗 Testing Qdrant Connection:")
        try:
            from config.qdrant_config import get_qdrant_client, get_collection_info
            client = get_qdrant_client()
            if client:
                info = get_collection_info()
                if "error" not in info:
                    print(f"  ✅ Connected to Qdrant")
                    print(f"     Collection: {info.get('name', 'N/A')}")
                    print(f"     Points: {info.get('points_count', 0)}")
                else:
                    print(f"  ⚠️  Qdrant connection issue: {info.get('error')}")
            else:
                print("  ⚠️  Could not create Qdrant client")
        except Exception as e:
            print(f"  ⚠️  Qdrant test failed: {e}")
    else:
        print("🔗 Qdrant: Not configured (optional)")
    
    print()
    
    # Summary
    print("=" * 60)
    if all_required_ok:
        print("✅ Configuration looks good! You can start the server.")
    else:
        print("❌ Some required configuration is missing. Please check above.")
    print("=" * 60)


if __name__ == "__main__":
    test_config()

