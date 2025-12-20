"""
OpenAI Thread Manager for Kozi AI Backend

This module manages OpenAI threads for persistent chat sessions.
"""

import os
from typing import Optional, Dict, Any, List
from openai import OpenAI
import json


class ThreadManager:
    """Manages OpenAI threads for chat sessions."""
    
    def __init__(self, api_key: str):
        """Initialize the thread manager."""
        self.client = OpenAI(api_key=api_key)
        self._thread_cache = {}  # Cache threads to avoid repeated API calls
    
    def create_thread(self, metadata: Optional[Dict[str, str]] = None) -> str:
        """Create a new OpenAI thread."""
        try:
            thread = self.client.beta.threads.create(metadata=metadata or {})
            thread_id = thread.id
            self._thread_cache[thread_id] = thread
            print(f"✅ Created OpenAI thread: {thread_id}")
            return thread_id
        except Exception as e:
            print(f"⚠️  Error creating thread: {e}")
            raise
    
    def get_thread(self, thread_id: str) -> Optional[Dict[str, Any]]:
        """Get thread information."""
        try:
            if thread_id in self._thread_cache:
                return self._thread_cache[thread_id]
            
            thread = self.client.beta.threads.retrieve(thread_id)
            self._thread_cache[thread_id] = thread
            return thread
        except Exception as e:
            print(f"⚠️  Error retrieving thread {thread_id}: {e}")
            return None
    
    def add_message(self, thread_id: str, content: str, role: str = "user") -> str:
        """Add a message to a thread."""
        try:
            message = self.client.beta.threads.messages.create(
                thread_id=thread_id,
                role=role,
                content=content
            )
            print(f"✅ Added message to thread {thread_id}")
            return message.id
        except Exception as e:
            print(f"⚠️  Error adding message to thread {thread_id}: {e}")
            raise
    
    def get_messages(self, thread_id: str, limit: int = 6) -> List[Dict[str, Any]]:
        """Get messages from a thread."""
        try:
            messages = self.client.beta.threads.messages.list(
                thread_id=thread_id,
                limit=limit,  # Use the provided limit (default 6 for performance)
                order="desc"  # Get most recent first
            )
            
            formatted_messages = []
            for msg in messages.data:
                content = ""
                if msg.content and len(msg.content) > 0:
                    if hasattr(msg.content[0], 'text'):
                        content = msg.content[0].text.value
                    else:
                        content = str(msg.content[0])
                
                formatted_messages.append({
                    "id": msg.id,
                    "role": msg.role,
                    "content": content,
                    "created_at": msg.created_at
                })
            
            return formatted_messages
        except Exception as e:
            print(f"⚠️  Error getting messages from thread {thread_id}: {e}")
            return []
    
    def delete_thread(self, thread_id: str) -> bool:
        """Delete a thread."""
        try:
            self.client.beta.threads.delete(thread_id)
            if thread_id in self._thread_cache:
                del self._thread_cache[thread_id]
            print(f"✅ Deleted thread: {thread_id}")
            return True
        except Exception as e:
            print(f"⚠️  Error deleting thread {thread_id}: {e}")
            return False
    
    def update_thread_metadata(self, thread_id: str, metadata: Dict[str, str]) -> bool:
        """Update thread metadata."""
        try:
            self.client.beta.threads.modify(
                thread_id=thread_id,
                metadata=metadata
            )
            # Update cache
            if thread_id in self._thread_cache:
                self._thread_cache[thread_id].metadata = metadata
            print(f"✅ Updated thread metadata: {thread_id}")
            return True
        except Exception as e:
            print(f"⚠️  Error updating thread metadata {thread_id}: {e}")
            return False