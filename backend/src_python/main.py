"""
FastAPI server for Kozi AI Backend

This module provides REST API endpoints for the Kozi AI agents (Job Seeker, Employer, Admin).
"""

import os
import sys
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from typing import List, Optional, Dict, Any
import uuid
import base64
import json
import requests

# Add src_python to path
sys.path.insert(0, str(Path(__file__).parent))

from agents.jobseeker_agent import JobSeekerAgent
from agents.employer_agent import EmployerAgent
from agents.admin_agent import AdminAgent
from user_threads import user_thread_manager

# Load environment variables
load_dotenv()
load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events"""
    yield

app = FastAPI(
    title="Kozi AI Backend",
    description="Backend API for Kozi AI agents using OpenAI Threads",
    version="2.0.0",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Validate environment variables
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_CHAT_MODEL") or os.getenv("OPENAI_MODEL", "gpt-4o-mini")
PORT = int(os.getenv("PORT", "5050"))
API_BASE_URL = os.getenv("API_BASE_URL", "https://apis.kozi.rw")

if not OPENAI_API_KEY:
    raise ValueError("OPENAI_API_KEY environment variable is required")

# Initialize agents
jobseeker_agent = JobSeekerAgent(OPENAI_API_KEY, OPENAI_MODEL)
employer_agent = EmployerAgent(OPENAI_API_KEY, OPENAI_MODEL)
admin_agent = AdminAgent(OPENAI_API_KEY, OPENAI_MODEL)

print(f"Kozi AI Agents initialized with model: {OPENAI_MODEL}")
print(f"   - Job Seeker Agent: Ready")
print(f"   - Employer Agent: Ready")
print(f"   - Admin Agent: Ready")

# Request/Response models
class ChatRequest(BaseModel):
    message: str
    thread_id: Optional[str] = None
    users_id: Optional[int] = None
    role_type: Optional[str] = "employee"
    api_token: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    model: str
    thread_id: Optional[str] = None

class NewChatRequest(BaseModel):
    users_id: Optional[int] = None
    firstMessage: Optional[str] = None
    role_type: Optional[str] = "employee"

class NewChatResponse(BaseModel):
    data: Dict[str, Any]  # { thread_id, title }

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "ok",
        "service": "kozi-ai-backend",
        "model": OPENAI_MODEL,
        "agents": ["jobseeker", "employer", "admin"]
    }

def get_agent_for_role(role_type: str):
    """Get the appropriate agent based on role type."""
    role_type = role_type.lower() if role_type else "employee"
    
    if role_type == "employer":
        return employer_agent
    elif role_type == "admin":
        return admin_agent
    else:
        return jobseeker_agent

def get_user_id_from_token(authorization: Optional[str] = None, api_token: Optional[str] = None) -> Optional[int]:
    """Extract user ID from token."""
    token = api_token
    if not token and authorization:
        if authorization.startswith("Bearer "):
            token = authorization[7:]
        elif authorization.startswith("bearer "):
            token = authorization[7:]
        else:
            token = authorization
    
    if not token:
        return None
    
    try:
        parts = token.split('.')
        if len(parts) < 2:
            return None
        
        payload_str = parts[1]
        padding = 4 - len(payload_str) % 4
        if padding != 4:
            payload_str += '=' * padding
        
        payload = json.loads(base64.urlsafe_b64decode(payload_str))
        user_id = payload.get('users_id') or payload.get('user_id') or payload.get('id')
        if user_id:
            return int(user_id)
        
        user_email = payload.get('email')
        if not user_email:
            return None
        
        response = requests.get(
            f"{API_BASE_URL}/get_user_id_by_email/{user_email}",
            headers={"Authorization": f"Bearer {token}"},
            timeout=5.0
        )
        
        if response.status_code == 200:
            data = response.json()
            return data.get("users_id")
        
        return None
        
    except Exception:
        return None

# Chat endpoint
@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, authorization: Optional[str] = Header(None)):
    """Answer a question using OpenAI threads for history."""
    try:
        if not request.message:
            raise HTTPException(status_code=400, detail="Message is required")

        # Get appropriate agent
        agent = get_agent_for_role(request.role_type)
        
        # Get user ID first
        users_id_to_use = request.users_id
        if not users_id_to_use:
            users_id_to_use = get_user_id_from_token(authorization, request.api_token)
        
        # Use provided thread_id or get user's active thread
        thread_id = request.thread_id
        if not thread_id and users_id_to_use:
            thread_id = await user_thread_manager.get_thread_for_user(users_id_to_use)
        
        # Create new thread if none exists
        if not thread_id:
            if users_id_to_use:
                metadata = {
                    "role_type": request.role_type or "employee",
                    "users_id": str(users_id_to_use)
                }
                thread_id = agent.create_thread(metadata)
                await user_thread_manager.set_thread_for_user(users_id_to_use, thread_id)
                print(f"Created new thread for user {users_id_to_use}: {thread_id}")
            else:
                raise HTTPException(status_code=400, detail="Unable to identify user for thread creation")

        print(f"Question received: {request.message[:100]}... (Thread: {thread_id}, Role: {request.role_type})")

        # Extract API token from Authorization header if not in request body
        api_token = request.api_token
        if not api_token and authorization:
            if authorization.startswith("Bearer "):
                api_token = authorization[7:]

        # users_id_to_use already set above

        # Prepare context for agent
        agent_context = {}
        if users_id_to_use:
            agent_context['users_id'] = users_id_to_use
        if api_token:
            agent_context['api_token'] = api_token

        # Use thread-based conversation
        response_text = agent.answer_question(
            request.message,
            context=agent_context if agent_context else None,
            thread_id=thread_id
        )

        print(f"Response generated ({len(response_text)} characters)")

        return ChatResponse(
            response=response_text,
            model=OPENAI_MODEL,
            thread_id=thread_id
        )

    except HTTPException:
        raise
    except Exception as error:
        print(f"Error in /api/chat: {error}")
        raise HTTPException(status_code=500, detail=str(error))

# Chat endpoint for employers
@app.post("/api/chat/employer", response_model=ChatResponse)
async def chat_employer(request: ChatRequest, authorization: Optional[str] = Header(None)):
    """Answer a question for employers."""
    request.role_type = "employer"
    return await chat(request, authorization)

# New chat for employers
@app.post("/api/chat/employer/new", response_model=NewChatResponse)
async def start_new_employer_chat(request: NewChatRequest, authorization: Optional[str] = Header(None)):
    """Start a new employer chat session."""
    request.role_type = "employer"
    return await start_new_chat(request, authorization)

# Chat endpoint for admins
@app.post("/api/chat/admin", response_model=ChatResponse)
async def chat_admin(request: ChatRequest, authorization: Optional[str] = Header(None)):
    """Answer a question for admins."""
    request.role_type = "admin"
    return await chat(request, authorization)

# New chat for admins
@app.post("/api/chat/admin/new", response_model=NewChatResponse)
async def start_new_admin_chat(request: NewChatRequest, authorization: Optional[str] = Header(None)):
    """Start a new admin chat session."""
    request.role_type = "admin"
    return await start_new_chat(request, authorization)

# Start new chat session
@app.post("/api/chat/new", response_model=NewChatResponse)
async def start_new_chat(request: NewChatRequest, authorization: Optional[str] = Header(None)):
    """Start a new chat session with OpenAI threads."""
    try:
        print(f"Received new chat request: users_id={request.users_id}, role_type={request.role_type}, firstMessage={request.firstMessage[:50] if request.firstMessage else None}")
        
        # Extract API token
        api_token = None
        if authorization:
            if authorization.startswith("Bearer "):
                api_token = authorization[7:]

        # Get appropriate agent
        agent = get_agent_for_role(request.role_type or "employee")
        
        # Get user ID
        users_id_to_use = request.users_id or get_user_id_from_token(authorization, api_token)

        # Create OpenAI thread
        metadata = {
            "role_type": request.role_type or "employee",
            "users_id": str(users_id_to_use) if users_id_to_use else "unknown"
        }
        thread_id = agent.create_thread(metadata)
        
        # Initialize title
        title = request.firstMessage[:40].strip() if request.firstMessage else "New Chat"
        
        # Create ChatSession via external API
        if users_id_to_use:
            try:
                session_data = {
                    "users_id": users_id_to_use,
                    "role_type": request.role_type or "employee",
                    "thread_id": thread_id,
                    "title": title
                }
                
                response = requests.post(
                    f"{API_BASE_URL}/chat/start",
                    json=session_data,
                    headers={"Authorization": f"Bearer {api_token}"} if api_token else {},
                    timeout=10.0
                )
                
                if response.status_code != 200:
                    print(f"⚠️ API returned status {response.status_code}")
                
                await user_thread_manager.set_thread_for_user(users_id_to_use, thread_id)
            except Exception as e:
                print(f"\n❌ API ERROR: {e}")
                print(f"Error type: {type(e).__name__}")
                import traceback
                print(traceback.format_exc())
        print(f"Created new OpenAI thread: {thread_id}")

        # Process first message if provided
        title = None
        if request.firstMessage:
            try:
                # Prepare context
                agent_context = {}
                if users_id_to_use:
                    agent_context['users_id'] = users_id_to_use
                if api_token:
                    agent_context['api_token'] = api_token

                # Use thread for conversation
                response_text = agent.answer_question(
                    request.firstMessage,
                    context=agent_context if agent_context else None,
                    thread_id=thread_id
                )

                # Generate simple title immediately
                title = request.firstMessage[:40].strip()
                
                # Generate AI title in background (non-blocking)
                import asyncio
                import traceback
                async def update_title_background():
                    try:
                        print(f"Starting background title generation for thread: {thread_id}")
                        ai_title = agent.generate_conversation_title(request.firstMessage, response_text)
                        print(f"Generated AI title: {ai_title}")
                        
                        from database import get_db
                        db = await get_db()
                        print(f"Connecting to database...")
                        
                        await db.chatsession.update(
                            where={"thread_id": thread_id},
                            data={"title": ai_title}
                        )
                        print(f"Updated title in database: {ai_title}")
                    except Exception as e:
                        print(f"Background title update failed: {e}")
                        print(f"Full error traceback:")
                        print(traceback.format_exc())
                
                asyncio.create_task(update_title_background())

            except Exception as e:
                print(f"Error processing first message: {e}")

        return NewChatResponse(data={
            "session_id": thread_id,
            "thread_id": thread_id,
            "title": title
        })

    except Exception as error:
        import traceback
        print(f"Error starting new chat: {error}")
        print(f"Full traceback:")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(error))

# Get chat history by thread ID
@app.get("/api/chat/thread/{thread_id}")
async def get_thread_chat(thread_id: str, role_type: str = "employee"):
    """Get chat history by OpenAI thread ID."""
    try:
        agent = get_agent_for_role(role_type)
        thread_messages = agent.get_thread_messages(thread_id)
        
        if not thread_messages:
            raise HTTPException(status_code=404, detail=f"Thread {thread_id} not found")
        
        formatted_messages = [
            {
                "role": msg["role"],
                "content": msg["content"],
                "timestamp": msg.get("created_at")
            }
            for msg in thread_messages
        ]
        
        return {
            "chat": {
                "thread_id": thread_id,
                "title": "Thread Chat",
                "messages": formatted_messages
            }
        }
    except HTTPException:
        raise
    except Exception as error:
        print(f"Error getting thread chat: {error}")
        raise HTTPException(status_code=500, detail=str(error))

# Get employer's thread chat
@app.get("/api/chat/employer/thread/{thread_id}")
async def get_employer_thread_chat(thread_id: str):
    """Get employer's chat history by thread ID."""
    return await get_thread_chat(thread_id, "employer")

# Get admin's thread chat
@app.get("/api/chat/admin/thread/{thread_id}")
async def get_admin_thread_chat(thread_id: str):
    """Get admin's chat history by thread ID."""
    return await get_thread_chat(thread_id, "admin")

# New thread endpoint for user
@app.post("/api/chat/new-thread")
async def new_thread_for_user(authorization: Optional[str] = Header(None)):
    """Create new thread for user (clears current thread)."""
    users_id = get_user_id_from_token(authorization)
    if not users_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Clear existing thread
    await user_thread_manager.clear_thread_for_user(users_id)
    return {"message": "Ready for new conversation"}

# Get user ID endpoint
@app.get("/api/user/id")
async def get_user_id_endpoint(authorization: Optional[str] = Header(None)):
    """Get user ID from token."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header is required")
    
    user_id = get_user_id_from_token(authorization)
    if not user_id:
        raise HTTPException(status_code=404, detail="Could not retrieve user ID from token")
    
    return {"users_id": user_id}

# Get user's chat sessions (threads)
@app.get("/api/chat/sessions")
async def get_chat_sessions(users_id: int, role_type: str = "employee", authorization: Optional[str] = Header(None)):
    """Get user's chat sessions with thread history."""
    try:
        # Extract token
        api_token = None
        if authorization and authorization.startswith("Bearer "):
            api_token = authorization[7:]
        
        # Get sessions from external API
        response = requests.get(
            f"{API_BASE_URL}/chat/select/sessions/{users_id}",
            headers={"Authorization": f"Bearer {api_token}"} if api_token else {},
            timeout=10.0
        )
        
        if response.status_code != 200:
            print(f"⚠️ API returned status {response.status_code}")
            return {"sessions": []}
        
        sessions = response.json()
        
        # Format sessions for frontend
        chats = []
        for session in sessions:
            chats.append({
                "sessionId": session.get("thread_id"),
                "thread_id": session.get("thread_id"),
                "title": session.get("title") or "New Chat",
                "createdAt": session.get("createdAt"),
                "messageCount": 0,
                "is_active": bool(session.get("is_active"))
            })
        
        return {"sessions": chats}
    except Exception as e:
        print(f"❌ Error fetching sessions: {e}")
        return {"sessions": []}

# Get employer's chat sessions
@app.get("/api/chat/employer/sessions")
async def get_employer_chat_sessions(users_id: int, authorization: Optional[str] = Header(None)):
    """Get employer's chat sessions."""
    return await get_chat_sessions(users_id, "employer", authorization)

# Get admin's chat sessions
@app.get("/api/chat/admin/sessions")
async def get_admin_chat_sessions(users_id: int, authorization: Optional[str] = Header(None)):
    """Get admin's chat sessions."""
    return await get_chat_sessions(users_id, "admin", authorization)

if __name__ == "__main__":
    import uvicorn
    print(f"Starting Kozi AI server on http://localhost:{PORT}")
    uvicorn.run(app, host="0.0.0.0", port=PORT)