"""
Configuration package for Land O'Clock backend.
"""

from .qdrant_config import (
    get_qdrant_client,
    get_embeddings,
    get_vector_store,
    create_collection_if_not_exists,
    delete_collection,
    get_collection_info,
    COLLECTION_NAME,
    QDRANT_URL,
    QDRANT_API_KEY,
    EMBEDDING_MODEL,
)

__all__ = [
    "get_qdrant_client",
    "get_embeddings",
    "get_vector_store",
    "create_collection_if_not_exists",
    "delete_collection",
    "get_collection_info",
    "COLLECTION_NAME",
    "QDRANT_URL",
    "QDRANT_API_KEY",
    "EMBEDDING_MODEL",
]

