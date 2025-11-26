"""
Populate Qdrant Knowledge Base for Kozi AI

This script loads .txt files from data/knowledge_base/ directory,
splits them into chunks, and adds them to the Qdrant vector database.

Usage:
    python scripts/populate_qdrant.py
"""

import os
import sys
from pathlib import Path
from typing import List
from dotenv import load_dotenv
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document

# Add parent directory to path to import config
sys.path.insert(0, str(Path(__file__).parent.parent))

from config.qdrant_config import (
    get_vector_store,
    create_collection_if_not_exists,
    get_collection_info,
    COLLECTION_NAME,
    QDRANT_ENABLED,
)

# Load environment variables
load_dotenv()

# Configuration
# Point to knowledge_base folder at project root (not backend/data/knowledge_base)
KNOWLEDGE_DIR = Path(__file__).parent.parent.parent.parent / "knowledge_base"
CHUNK_SIZE = 500
CHUNK_OVERLAP = 100
BATCH_SIZE = 100  # Process documents in batches


def load_text_files(directory: Path) -> List[Document]:
    """
    Load all .txt files from the specified directory.
    
    Args:
        directory: Path to the directory containing .txt files
        
    Returns:
        List of Document objects with content and metadata
    """
    documents = []
    
    if not directory.exists():
        print(f"❌ Directory not found: {directory}")
        print(f"   Please create the directory and add .txt files to it.")
        return documents
    
    txt_files = list(directory.glob("*.txt"))
    
    if not txt_files:
        print(f"⚠️  No .txt files found in {directory}")
        return documents
    
    print(f"📂 Found {len(txt_files)} .txt file(s) in {directory}")
    
    for txt_file in txt_files:
        try:
            with open(txt_file, "r", encoding="utf-8") as f:
                content = f.read()
            
            if content.strip():
                doc = Document(
                    page_content=content,
                    metadata={
                        "source": txt_file.name,
                        "file_path": str(txt_file),
                    }
                )
                documents.append(doc)
                print(f"  ✅ Loaded: {txt_file.name} ({len(content)} characters)")
            else:
                print(f"  ⚠️  Skipped empty file: {txt_file.name}")
                
        except Exception as e:
            print(f"  ❌ Error loading {txt_file.name}: {e}")
    
    return documents


def split_documents(documents: List[Document]) -> List[Document]:
    """
    Split documents into chunks with overlap.
    
    Args:
        documents: List of Document objects to split
        
    Returns:
        List of chunked Document objects
    """
    if not documents:
        return []
    
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        length_function=len,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    
    chunks = text_splitter.split_documents(documents)
    print(f"📄 Split {len(documents)} document(s) into {len(chunks)} chunk(s)")
    
    return chunks


def add_documents_to_qdrant(chunks: List[Document]) -> None:
    """
    Add document chunks to Qdrant vector store in batches.
    
    Args:
        chunks: List of Document chunks to add
    """
    if not chunks:
        print("⚠️  No chunks to add to Qdrant")
        return
    
    if not QDRANT_ENABLED:
        print("⚠️  Qdrant is not configured. Please set QDRANT_URL and QDRANT_API_KEY.")
        return
    
    try:
        # Ensure collection exists
        create_collection_if_not_exists()
        
        # Get vector store
        vector_store = get_vector_store()
        
        if not vector_store:
            print("❌ Could not get vector store. Please check your Qdrant configuration.")
            return
        
        print(f"📤 Adding {len(chunks)} chunk(s) to Qdrant collection '{COLLECTION_NAME}'...")
        
        # Add documents in batches
        total_added = 0
        for i in range(0, len(chunks), BATCH_SIZE):
            batch = chunks[i:i + BATCH_SIZE]
            vector_store.add_documents(batch)
            total_added += len(batch)
            print(f"  ✅ Added batch {i // BATCH_SIZE + 1}: {len(batch)} chunk(s) (Total: {total_added}/{len(chunks)})")
        
        print(f"✅ Successfully added {total_added} chunk(s) to Qdrant")
        
    except Exception as e:
        print(f"❌ Error adding documents to Qdrant: {e}")
        raise


def clear_collection() -> None:
    """
    Clear all documents from the collection (optional, for re-indexing).
    """
    from config.qdrant_config import delete_collection
    
    try:
        print(f"🗑️  Clearing collection '{COLLECTION_NAME}'...")
        delete_collection()
        create_collection_if_not_exists()
        print("✅ Collection cleared and recreated")
    except Exception as e:
        print(f"❌ Error clearing collection: {e}")


def main():
    """
    Main function to populate Qdrant knowledge base.
    """
    print("=" * 60)
    print("🚀 Kozi AI Qdrant Knowledge Base Populator")
    print("=" * 60)
    print()
    
    if not QDRANT_ENABLED:
        print("⚠️  Qdrant is not configured.")
        print("   Please set QDRANT_URL and QDRANT_API_KEY in your .env file.")
        return
    
    # Check if knowledge directory exists
    if not KNOWLEDGE_DIR.exists():
        print(f"❌ Knowledge directory not found: {KNOWLEDGE_DIR}")
        print(f"   Please create the directory and add .txt files to it.")
        return
    
    # Load text files
    print("📖 Step 1: Loading text files...")
    documents = load_text_files(KNOWLEDGE_DIR)
    
    if not documents:
        print("❌ No documents loaded. Exiting.")
        return
    
    print()
    
    # Split documents into chunks
    print("✂️  Step 2: Splitting documents into chunks...")
    chunks = split_documents(documents)
    
    if not chunks:
        print("❌ No chunks created. Exiting.")
        return
    
    print()
    
    # Show collection info before adding
    print("📊 Current collection status:")
    info = get_collection_info()
    if "error" not in info:
        print(f"  Points: {info.get('points_count', 0)}")
        print(f"  Status: {info.get('status', 'Unknown')}")
    print()
    
    # Ask user if they want to clear existing data (skip if non-interactive)
    import sys
    if sys.stdin.isatty():
        # Interactive mode - ask user
        response = input("Do you want to clear existing data and re-index? (y/N): ").strip().lower()
        if response == 'y':
            clear_collection()
            print()
    else:
        # Non-interactive mode - automatically clear and re-index
        print("🔄 Non-interactive mode: Clearing existing data and re-indexing...")
        clear_collection()
        print()
    
    # Add documents to Qdrant
    print("💾 Step 3: Adding documents to Qdrant...")
    add_documents_to_qdrant(chunks)
    
    print()
    
    # Show final collection info
    print("📊 Final collection status:")
    info = get_collection_info()
    if "error" not in info:
        print(f"  ✅ Collection: {info.get('name', COLLECTION_NAME)}")
        print(f"  ✅ Total points: {info.get('points_count', 0)}")
        print(f"  ✅ Status: {info.get('status', 'Unknown')}")
    else:
        print(f"  ❌ Error: {info.get('error')}")
    
    print()
    print("=" * 60)
    print("✅ Knowledge base population complete!")
    print("=" * 60)


if __name__ == "__main__":
    main()

