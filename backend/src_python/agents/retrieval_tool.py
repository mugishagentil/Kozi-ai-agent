"""
Retrieval Tool for Kozi Knowledge Base

This module provides a LangChain tool that allows the AI agent to search
the Qdrant knowledge base for relevant information about Kozi platform,
job searching, hiring, and best practices.
"""

from langchain_core.tools import tool
from typing import Optional
import sys
from pathlib import Path
import concurrent.futures

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))
from config.qdrant_config import get_vector_store, QDRANT_ENABLED


@tool
def retrieve_knowledge_base(query: str) -> str:
    """
    Search the Kozi knowledge base for information about the platform,
    job searching, hiring processes, best practices, and platform features.
    
    This tool searches the Qdrant vector database containing comprehensive information about:
    - Kozi platform mission, vision, and features
    - Job searching strategies and tips
    - Hiring processes and best practices
    - Worker categories and job types
    - Platform usage guidelines
    - Employer and job seeker information
    
    Args:
        query: The search query/question about Kozi, job searching, hiring, or platform features
        
    Returns:
        str: Formatted search results with relevant information from the knowledge base.
             Returns "No relevant information found." if no results match the query.
    
    Example:
        >>> result = retrieve_knowledge_base("How do I search for jobs on Kozi?")
        >>> print(result)
    """
    print(f"🔍 Knowledge base retrieval called with query: {query[:100]}...")
    try:
        if not QDRANT_ENABLED:
            print(f"⚠️  Qdrant not enabled")
            return "Knowledge base is not configured. Please set QDRANT_URL and QDRANT_API_KEY environment variables."
        
        # Get the vector store
        print(f"📚 Getting vector store...")
        vector_store = get_vector_store()
        
        if not vector_store:
            print(f"⚠️  Vector store not available")
            return "Knowledge base is not available. Please check your Qdrant configuration."
        
        # Search for similar documents with timeout protection
        # Use ThreadPoolExecutor to add timeout protection for synchronous call
        print(f"🔎 Searching knowledge base with query: {query[:100]}...")
        try:
            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(vector_store.similarity_search, query, k=2)
                results = future.result(timeout=8.0)  # 8 second timeout
            print(f"✅ Knowledge base search completed, found {len(results) if results else 0} results")
        except concurrent.futures.TimeoutError:
            print("❌ Qdrant search timed out after 8 seconds")
            return "Knowledge base search timed out. Please try again with a more specific question."
        except Exception as search_error:
            error_message = f"Error searching knowledge base: {str(search_error)}"
            print(f"❌ {error_message}")
            return f"Unable to search the knowledge base. Error: {error_message}"
        
        if not results:
            print(f"⚠️  No results found in knowledge base")
            return "No relevant information found in the knowledge base."
        
        # Format the results for the AI agent
        formatted_results = []
        formatted_results.append(f"Found {len(results)} relevant document(s) from the Kozi knowledge base:\n")
        
        for i, doc in enumerate(results, 1):
            content = doc.page_content.strip()
            metadata = doc.metadata if hasattr(doc, 'metadata') else {}
            source = metadata.get('source', 'Unknown source')
            
            formatted_results.append(f"--- Result {i} ---")
            formatted_results.append(f"Source: {source}")
            formatted_results.append(f"Content:\n{content}\n")
        
        return "\n".join(formatted_results)
        
    except Exception as e:
        error_message = f"Error retrieving knowledge: {str(e)}"
        print(f"❌ {error_message}")
        return f"Unable to retrieve information from the knowledge base. Error: {error_message}"

