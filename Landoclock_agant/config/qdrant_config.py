"""
Qdrant Configuration and Vector Store Setup

This module handles connection to Qdrant Cloud and initialization of the vector store
for the Land O'Clock real estate knowledge base.
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
COLLECTION_NAME = "landoclock_knowledge"
EMBEDDING_MODEL = "text-embedding-3-small"

# Validate required environment variables
if not QDRANT_URL:
    raise ValueError("QDRANT_URL environment variable is required")
if not QDRANT_API_KEY:
    raise ValueError("QDRANT_API_KEY environment variable is required")


def get_qdrant_client() -> QdrantClient:
    """
    Create and return a Qdrant client connected to Qdrant Cloud.
    
    Returns:
        QdrantClient: Configured Qdrant client instance
        
    Raises:
        ValueError: If QDRANT_URL or QDRANT_API_KEY are not set
    """
    if not QDRANT_URL or not QDRANT_API_KEY:
        raise ValueError("QDRANT_URL and QDRANT_API_KEY must be set in .env file")
    
    client = QdrantClient(
        url=QDRANT_URL,
        api_key=QDRANT_API_KEY,
    )
    
    return client


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


def get_vector_store() -> QdrantVectorStore:
    """
    Get or create the Qdrant vector store for the knowledge base.
    
    Returns:
        QdrantVectorStore: Configured vector store instance
    """
    client = get_qdrant_client()
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
    client = get_qdrant_client()
    embeddings = get_embeddings()
    
    # Get the vector size from the embeddings model
    # text-embedding-3-small has 1536 dimensions
    vector_size = 1536
    
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
    client = get_qdrant_client()
    
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
    client = get_qdrant_client()
    
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

