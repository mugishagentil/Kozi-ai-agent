"""
Qdrant Configuration and Vector Store Setup

This module handles connection to Qdrant Cloud and initialization of the vector store
for the Kozi AI knowledge base.
"""

import os
from typing import Optional
from dotenv import load_dotenv
from langchain_openai import OpenAIEmbeddings
from langchain_qdrant import QdrantVectorStore
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams

# Load environment variables
load_dotenv()

# Qdrant configuration
QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
COLLECTION_NAME = os.getenv("QDRANT_COLLECTION_NAME", "kozi_knowledge")
EMBEDDING_MODEL = os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")

# Validate required environment variables (optional - allow running without Qdrant)
QDRANT_ENABLED = bool(QDRANT_URL and QDRANT_API_KEY)


def get_qdrant_client() -> Optional[QdrantClient]:
    """
    Create and return a Qdrant client connected to Qdrant Cloud.
    
    Returns:
        QdrantClient: Configured Qdrant client instance or None if not configured
        
    Raises:
        ValueError: If QDRANT_URL or QDRANT_API_KEY are not set
    """
    if not QDRANT_URL or not QDRANT_API_KEY:
        return None
    
    try:
        client = QdrantClient(
            url=QDRANT_URL,
            api_key=QDRANT_API_KEY,
            timeout=10.0,  # 10 second timeout for all operations
        )
        
        # Test connection with a quick operation (non-blocking, just verify it works)
        try:
            client.get_collections()
            print("✅ Qdrant client connected successfully")
        except Exception as test_error:
            print(f"⚠️  Qdrant connection test failed: {test_error}")
            # Still return client - it might work for actual queries
            # The timeout in retrieval_tool will catch if it doesn't work
        
        return client
    except Exception as e:
        print(f"⚠️  Error creating Qdrant client: {e}")
        return None


def get_embeddings() -> OpenAIEmbeddings:
    """
    Initialize and return OpenAI embeddings model.
    
    Returns:
        OpenAIEmbeddings: Configured embeddings model
    """
    openai_api_key = os.getenv("OPENAI_API_KEY")
    if not openai_api_key:
        raise ValueError("OPENAI_API_KEY environment variable is required")
    
    embeddings = OpenAIEmbeddings(
        model=EMBEDDING_MODEL,
        api_key=openai_api_key,
    )
    
    return embeddings


def get_vector_store() -> Optional[QdrantVectorStore]:
    """
    Get or create the Qdrant vector store for the knowledge base.
    
    Returns:
        QdrantVectorStore: Configured vector store instance or None if not configured
    """
    if not QDRANT_ENABLED:
        return None
    
    client = get_qdrant_client()
    if not client:
        return None
    
    embeddings = get_embeddings()
    
    vector_store = QdrantVectorStore(
        client=client,
        collection_name=COLLECTION_NAME,
        embedding=embeddings,
    )
    
    return vector_store


def create_collection_if_not_exists() -> None:
    """
    Create the Qdrant collection if it doesn't exist.
    
    This function checks if the collection exists and creates it with the
    appropriate vector configuration if it doesn't.
    """
    if not QDRANT_ENABLED:
        print("⚠️  Qdrant not configured. Skipping collection creation.")
        return
    
    client = get_qdrant_client()
    if not client:
        return
    
    embeddings = get_embeddings()
    
    # Get the vector size from the embeddings model
    # Common models: text-embedding-3-small (1536), text-embedding-3-large (3072), text-embedding-ada-002 (1536)
    embedding_model = EMBEDDING_MODEL.lower()
    if "large" in embedding_model:
        vector_size = 3072
    else:
        vector_size = 1536  # Default for small/ada models
    
    # Check if collection exists
    collections = client.get_collections().collections
    collection_names = [col.name for col in collections]
    
    if COLLECTION_NAME not in collection_names:
        print(f"Creating collection '{COLLECTION_NAME}'...")
        client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(
                size=vector_size,
                distance=Distance.COSINE,
            ),
        )
        print(f"✅ Collection '{COLLECTION_NAME}' created successfully")
    else:
        print(f"✅ Collection '{COLLECTION_NAME}' already exists")


def delete_collection() -> None:
    """
    Delete the Qdrant collection (use with caution).
    
    This function permanently deletes the collection and all its data.
    """
    if not QDRANT_ENABLED:
        print("⚠️  Qdrant not configured.")
        return
    
    client = get_qdrant_client()
    if not client:
        return
    
    try:
        client.delete_collection(collection_name=COLLECTION_NAME)
        print(f"✅ Collection '{COLLECTION_NAME}' deleted successfully")
    except Exception as e:
        print(f"❌ Error deleting collection: {e}")


def get_collection_info() -> dict:
    """
    Get information about the Qdrant collection.
    
    Returns:
        dict: Collection information including point count and configuration
    """
    if not QDRANT_ENABLED:
        return {"error": "Qdrant not configured"}
    
    client = get_qdrant_client()
    if not client:
        return {"error": "Could not create Qdrant client"}
    
    try:
        collection_info = client.get_collection(COLLECTION_NAME)
        result = {
            "name": COLLECTION_NAME,
            "points_count": collection_info.points_count,
            "status": str(collection_info.status),
            "config": {
                "vector_size": collection_info.config.params.vectors.size,
                "distance": str(collection_info.config.params.vectors.distance),
            },
        }
        # vectors_count might not be available in all Qdrant versions
        if hasattr(collection_info, 'vectors_count'):
            result["vectors_count"] = collection_info.vectors_count
        return result
    except Exception as e:
        return {"error": str(e)}

