"""
OpenAI Thread Manager for Kozi AI Backend

This module manages OpenAI threads for persistent chat sessions.
"""

import os
from typing import Optional, Dict, Any, List
from openai import OpenAI
import json
from datetime import datetime

# In-memory storage for jobs data (keyed by thread_id)
_thread_jobs_storage = {}


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
    
    def add_message(self, thread_id: str, content: str, role: str = "user", jobs_data: Optional[List[Dict]] = None) -> str:
        """Add a message to a thread with optional jobs data."""
        try:
            metadata = {
                "timestamp": datetime.now().isoformat(),
                "has_jobs": "true" if jobs_data else "false"
            }
            
            if jobs_data:
                print(f"📋 Storing {len(jobs_data)} jobs with message in thread {thread_id}")
                
                # Store in memory for immediate access (cards during session)
                if thread_id not in _thread_jobs_storage:
                    _thread_jobs_storage[thread_id] = []
                _thread_jobs_storage[thread_id].append({
                    "timestamp": datetime.now().isoformat(),
                    "jobs_data": jobs_data
                })
                
                # Use detailed text for thread persistence instead of short text
                thread_content = os.environ.get('THREAD_JOBS_TEXT', content)
                print(f"📋 Using detailed text for thread: {thread_content[:100]}...")
            else:
                thread_content = content
            
            message = self.client.beta.threads.messages.create(
                thread_id=thread_id,
                role=role,
                content=thread_content,  # Use detailed text for thread
                metadata=metadata
            )
            print(f"✅ Added message to thread {thread_id}")
            return message.id
        except Exception as e:
            print(f"⚠️  Error adding message to thread {thread_id}: {e}")
            raise
    
    def get_messages(self, thread_id: str, limit: int = 100) -> List[Dict[str, Any]]:
        """Get messages from a thread with jobs data."""
        try:
            messages = self.client.beta.threads.messages.list(
                thread_id=thread_id,
                limit=limit,
                order="asc"
            )
            
            # Get stored jobs data for this thread (for cards)
            thread_jobs = _thread_jobs_storage.get(thread_id, [])
            
            formatted_messages = []
            jobs_index = 0
            
            for msg in messages.data:
                content = ""
                if msg.content and len(msg.content) > 0:
                    if hasattr(msg.content[0], 'text'):
                        content = msg.content[0].text.value
                    else:
                        content = str(msg.content[0])
                
                message_data = {
                    "id": msg.id,
                    "role": msg.role,
                    "content": content,  # Content includes job listings as text
                    "created_at": msg.created_at
                }
                
                # Add jobs data for cards if available in memory
                if (msg.metadata and msg.metadata.get("has_jobs") == "true" and 
                    jobs_index < len(thread_jobs)):
                    jobs_data = thread_jobs[jobs_index]["jobs_data"]
                    message_data["jobs"] = jobs_data
                    print(f"📋 Retrieved {len(jobs_data)} jobs from memory for cards")
                    jobs_index += 1
                
                formatted_messages.append(message_data)
            
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