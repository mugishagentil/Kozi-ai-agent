"""
FastAPI server for Kozi AI Backend

This module provides REST API endpoints for the Kozi AI agents (Job Seeker, Employer, Admin).
"""

import os
import sys
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from typing import List, Optional, Dict, Any
import uuid

# Add src_python to path
sys.path.insert(0, str(Path(__file__).parent))

from agents.jobseeker_agent import JobSeekerAgent
from agents.employer_agent import EmployerAgent
from agents.admin_agent import AdminAgent
from database import get_db, init_db, close_prisma

# Load environment variables
# Load from both backend/.env and backend/src_python/.env if they exist
load_dotenv()  # Load from current directory
load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env")  # Load from backend/.env


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events"""
    # Startup
    try:
        result = await init_db()
        if not result:
            print("ℹ️  Server starting without database. Chat will work, but history won't be saved.")
    except Exception as e:
        print(f"⚠️  Database initialization warning: {e}")
        print("   Server will continue without database features.")
    
    yield
    
    # Shutdown
    try:
        await close_prisma()
    except Exception:
        pass  # Ignore errors on shutdown


app = FastAPI(
    title="Kozi AI Backend",
    description="Backend API for Kozi AI agents using LangChain and OpenAI",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Validate environment variables
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_CHAT_MODEL") or os.getenv("OPENAI_MODEL", "gpt-4o")
PORT = int(os.getenv("PORT", "5050"))
DATABASE_URL = os.getenv("DATABASE_URL")

if not OPENAI_API_KEY:
    raise ValueError("OPENAI_API_KEY environment variable is required")

# Initialize agents
jobseeker_agent = JobSeekerAgent(OPENAI_API_KEY, OPENAI_MODEL)
employer_agent = EmployerAgent(OPENAI_API_KEY, OPENAI_MODEL)
admin_agent = AdminAgent(OPENAI_API_KEY, OPENAI_MODEL)

print(f"🤖 Kozi AI Agents initialized with model: {OPENAI_MODEL}")
print(f"   - Job Seeker Agent: Ready")
print(f"   - Employer Agent: Ready")
print(f"   - Admin Agent: Ready")


# Request/Response models
class ChatRequest(BaseModel):
    message: str
    sessionId: Optional[int] = None
    users_id: Optional[int] = None
    role_type: Optional[str] = "employee"  # "employee", "employer", or "admin"
    api_token: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
    model: str
    sessionId: Optional[int] = None


class ChatHistoryRequest(BaseModel):
    message: str
    sessionId: int
    history: Optional[List[Dict[str, str]]] = []


class ChatListResponse(BaseModel):
    chats: List[Dict[str, Any]]


class ChatDetailResponse(BaseModel):
    chat: Dict[str, Any]


class NewChatRequest(BaseModel):
    users_id: int
    firstMessage: Optional[str] = None


class NewChatResponse(BaseModel):
    data: Dict[str, Any]  # { session_id, title }


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
    """
    Get the appropriate agent based on role type.
    
    Args:
        role_type: "employee", "employer", or "admin"
        
    Returns:
        Agent instance
    """
    role_type = role_type.lower() if role_type else "employee"
    
    if role_type == "employer":
        return employer_agent
    elif role_type == "admin":
        return admin_agent
    else:  # Default to employee/jobseeker
        return jobseeker_agent


# Helper function to save messages to database using Prisma
async def save_chat_to_db(db, session_id: int, user_message: str, assistant_message: str, users_id: Optional[int] = None):
    """Save chat messages to database"""
    try:
        # Get or create chat session
        chat_session = await db.chatsession.find_unique(where={"id": session_id})
        
        if not chat_session:
            # Create new session
            if users_id:
                chat_session = await db.chatsession.create(
                    data={
                        "id": session_id,
                        "users_id": users_id,
                        "role_type": "employee",  # Default, can be updated
                        "title": None
                    }
                )
            else:
                # Can't create session without users_id
                print(f"⚠️  Cannot create session without users_id")
                return
        
        # Save user message
        await db.chatmessage.create(
            data={
                "sessionId": session_id,
                "role": "user",
                "content": user_message
            }
        )
        
        # Save assistant message
        await db.chatmessage.create(
            data={
                "sessionId": session_id,
                "role": "assistant",
                "content": assistant_message
            }
        )
        
    except Exception as e:
        print(f"⚠️  Error saving to database: {e}")
        # Don't fail the request if database save fails


# Chat endpoint for employees (job seekers)
@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Answer a question with automatic history from database.
    
    Request body:
    - message: The user's question (string)
    - sessionId: Session ID for chat history (int, optional)
    - users_id: User ID (int, optional)
    - role_type: "employee", "employer", or "admin" (default: "employee")
    - api_token: API authentication token (optional)
    
    Returns:
    - response: The agent's answer
    - model: The OpenAI model used
    - sessionId: Session ID
    """
    try:
        if not request.message or not isinstance(request.message, str):
            raise HTTPException(
                status_code=400,
                detail="Invalid request. 'message' field is required and must be a string.",
            )

        # Get appropriate agent
        agent = get_agent_for_role(request.role_type)
        
        # Generate session ID if not provided
        session_id = request.sessionId
        if not session_id:
            # Try to get from database or generate new
            if DATABASE_URL:
                try:
                    db = await get_db()
                    # Create new session if users_id provided
                    if request.users_id:
                        new_session = await db.chatsession.create(
                            data={
                                "users_id": request.users_id,
                                "role_type": request.role_type or "employee",
                                "title": None
                            }
                        )
                        session_id = new_session.id
                    else:
                        # Generate temporary session ID (won't be saved)
                        session_id = int(uuid.uuid4().int % 1000000000)
                except Exception as e:
                    print(f"⚠️  Could not create session: {e}")
                    session_id = int(uuid.uuid4().int % 1000000000)
            else:
                session_id = int(uuid.uuid4().int % 1000000000)

        print(f"📝 Question received: {request.message[:100]}... (Session: {session_id}, Role: {request.role_type})")

        # Load chat history from database if session exists
        chat_history = []
        if session_id and DATABASE_URL:
            try:
                db = await get_db()
                messages = await db.chatmessage.find_many(
                    where={"sessionId": session_id},
                    order={"createdAt": "asc"}
                )
                
                if messages:
                    # Convert to format for agent
                    chat_history = [
                        {"role": msg.role, "content": msg.content}
                        for msg in messages
                    ]
                    print(f"📚 Loaded {len(chat_history)} messages from history")
            except (RuntimeError, AttributeError) as e:
                # Prisma not available or not generated
                pass
            except Exception as e:
                print(f"⚠️  Could not load history from database: {e}")

        # Get response from agent (with history if available)
        if chat_history:
            response_text = agent.answer_with_history(request.message, chat_history)
        else:
            response_text = agent.answer_question(request.message)

        print(f"✅ Response generated ({len(response_text)} characters)")

        # Save to database
        if DATABASE_URL and session_id:
            try:
                db = await get_db()
                await save_chat_to_db(
                    db, 
                    session_id, 
                    request.message, 
                    response_text,
                    request.users_id
                )
            except (RuntimeError, AttributeError) as e:
                # Prisma not available - silently fail, chat still works
                pass
            except Exception as e:
                print(f"⚠️  Could not save to database: {e}")

        # Frontend expects data.content for streaming compatibility
        # Return in format that frontend can parse
        from fastapi.responses import JSONResponse
        return JSONResponse(content={
            "data": {
                "content": response_text,
                "sessionId": session_id
            },
            "response": response_text,  # Keep for backward compatibility
            "model": OPENAI_MODEL,
            "sessionId": session_id
        })
    except HTTPException:
        raise
    except Exception as error:
        error_str = str(error)
        print(f"Error in /api/chat: {error}")
        
        # Provide more helpful error messages
        if "quota" in error_str.lower() or "insufficient_quota" in error_str.lower():
            status_code = 402  # Payment Required
            detail = "OpenAI API quota exceeded. Please check your OpenAI account billing and quota limits."
        elif "401" in error_str or "unauthorized" in error_str.lower() or "invalid_api_key" in error_str.lower():
            status_code = 401
            detail = "OpenAI API key is invalid or not configured. Please check your OPENAI_API_KEY environment variable."
        elif "rate_limit" in error_str.lower():
            status_code = 429
            detail = "OpenAI API rate limit exceeded. Please wait a moment and try again."
        else:
            status_code = 500
            detail = f"Failed to process your question: {error_str}"
        
        raise HTTPException(
            status_code=status_code,
            detail=detail,
        )


# Chat endpoint for employers
@app.post("/api/chat/employer", response_model=ChatResponse)
async def chat_employer(request: ChatRequest):
    """
    Answer a question for employers with automatic history from database.
    """
    request.role_type = "employer"
    return await chat(request)


# Chat endpoint with history support
@app.post("/api/chat/history", response_model=ChatResponse)
async def chat_with_history(request: ChatHistoryRequest):
    """
    Answer a question with conversation history from database.
    """
    try:
        if not request.message or not isinstance(request.message, str):
            raise HTTPException(
                status_code=400,
                detail="Invalid request. 'message' field is required and must be a string.",
            )

        # Load session to determine role_type
        role_type = "employee"
        if DATABASE_URL:
            try:
                db = await get_db()
                session = await db.chatsession.find_unique(where={"id": request.sessionId})
                if session:
                    role_type = session.role_type or "employee"
            except Exception:
                pass

        agent = get_agent_for_role(role_type)
        
        # Get response from agent with history
        response_text = agent.answer_with_history(
            request.message, 
            request.history or []
        )

        print(f"✅ Response generated ({len(response_text)} characters)")

        return ChatResponse(response=response_text, model=OPENAI_MODEL)
    except HTTPException:
        raise
    except Exception as error:
        print(f"Error in /api/chat/history: {error}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process your question: {str(error)}",
        )


# Start new chat session
@app.post("/api/chat/new", response_model=NewChatResponse)
async def start_new_chat(request: NewChatRequest):
    """
    Start a new chat session.
    
    Request body:
    - users_id: User ID (int, required)
    - firstMessage: First message to send (string, optional)
    
    Returns:
    - data: { session_id, title }
    """
    try:
        if not DATABASE_URL:
            # Generate temporary session ID if no database
            session_id = int(uuid.uuid4().int % 1000000000)
            return NewChatResponse(data={
                "session_id": session_id,
                "title": None
            })
        
        db = await get_db()
        
        # Create new session
        new_session = await db.chatsession.create(
            data={
                "users_id": request.users_id,
                "role_type": "employee",  # Default, can be determined from context
                "title": None
            }
        )
        
        session_id = new_session.id
        
        # If firstMessage is provided, send it and get response to generate title
        title = None
        if request.firstMessage:
            try:
                agent = get_agent_for_role("employee")
                response_text = agent.answer_question(request.firstMessage)
                
                # Save both messages
                await save_chat_to_db(
                    db,
                    session_id,
                    request.firstMessage,
                    response_text,
                    request.users_id
                )
                
                # Generate a title from the first message (first 50 chars)
                title = request.firstMessage[:50].strip()
                if len(request.firstMessage) > 50:
                    title += "..."
                
                # Update session with title
                await db.chatsession.update(
                    where={"id": session_id},
                    data={"title": title}
                )
            except Exception as e:
                print(f"⚠️  Error processing first message: {e}")
                # Still return session even if first message fails
        
        return NewChatResponse(data={
            "session_id": session_id,
            "title": title
        })
    except Exception as error:
        print(f"Error starting new chat: {error}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to start chat session: {str(error)}",
        )


# Get chat sessions for a user
@app.get("/api/chat/sessions")
async def get_chat_sessions(users_id: int):
    """
    Get all chat sessions for a user.
    
    Query parameters:
    - users_id: User ID (int, required)
    
    Returns:
    - List of chat sessions
    """
    try:
        if not DATABASE_URL:
            return {"chats": []}
        
        db = await get_db()
        
        sessions = await db.chatsession.find_many(
            where={"users_id": users_id},
            order={"updatedAt": "desc"},
            take=50  # Limit to 50 most recent
        )
        
        chats = []
        for session in sessions:
            # Get message count
            message_count = await db.chatmessage.count(
                where={"sessionId": session.id}
            )
            
            # Get last message
            last_message = await db.chatmessage.find_first(
                where={"sessionId": session.id},
                order={"createdAt": "desc"}
            )
            
            chats.append({
                "sessionId": session.id,
                "title": session.title or "Untitled Chat",
                "role_type": session.role_type or "employee",
                "createdAt": session.createdAt.isoformat() if session.createdAt else None,
                "updatedAt": session.updatedAt.isoformat() if session.updatedAt else None,
                "messageCount": message_count,
                "lastMessage": last_message.content if last_message else None,
                "lastMessageTime": last_message.createdAt.isoformat() if last_message and last_message.createdAt else None
            })
        
        return {"sessions": chats}  # Frontend expects "sessions" not "chats"
    except Exception as error:
        print(f"Error getting chat sessions: {error}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve chat sessions: {str(error)}",
        )


# Get recent chats
@app.get("/api/chat/recent", response_model=ChatListResponse)
async def get_recent_chats(limit: int = 30):
    """
    Get recent chat sessions.
    """
    try:
        db = await get_db()
        sessions = await db.chatsession.find_many(
            order={"updatedAt": "desc"},
            take=limit
        )
        
        chats = [
            {
                "sessionId": session.id,
                "title": session.title or "Untitled Chat",
                "role_type": session.role_type or "employee",
                "createdAt": session.createdAt.isoformat() if session.createdAt else None,
                "updatedAt": session.updatedAt.isoformat() if session.updatedAt else None,
            }
            for session in sessions
        ]
        
        return ChatListResponse(chats=chats)
    except RuntimeError as e:
        if "not available" in str(e):
            raise HTTPException(
                status_code=503,
                detail="Database service temporarily unavailable. Please try again later."
            )
        raise
    except Exception as error:
        print(f"Error getting recent chats: {error}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve chats: {str(error)}",
        )


# Get chat history by session ID
@app.get("/api/chat/{session_id}", response_model=ChatDetailResponse)
async def get_chat(session_id: int):
    """
    Get chat history by session ID.
    """
    try:
        db = await get_db()
        chat_session = await db.chatsession.find_unique(
            where={"id": session_id},
            include={"messages": {"orderBy": {"createdAt": "asc"}}}
        )
        
        if not chat_session:
            raise HTTPException(
                status_code=404,
                detail=f"Chat session {session_id} not found",
            )
        
        formatted_messages = [
            {
                "role": msg.role,
                "content": msg.content,
                "timestamp": msg.createdAt.isoformat() if msg.createdAt else None
            }
            for msg in chat_session.messages
        ]
        
        return ChatDetailResponse(chat={
            "sessionId": chat_session.id,
            "title": chat_session.title or "Untitled Chat",
            "role_type": chat_session.role_type or "employee",
            "createdAt": chat_session.createdAt.isoformat() if chat_session.createdAt else None,
            "updatedAt": chat_session.updatedAt.isoformat() if chat_session.updatedAt else None,
            "messages": formatted_messages
        })
    except RuntimeError as e:
        if "not available" in str(e):
            raise HTTPException(
                status_code=503,
                detail="Database service temporarily unavailable. Please try again later."
            )
        raise
    except HTTPException:
        raise
    except Exception as error:
        print(f"Error getting chat: {error}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve chat: {str(error)}",
        )


if __name__ == "__main__":
    import uvicorn

    print(f"🚀 Starting Kozi AI server on http://localhost:{PORT}")
    print(f"📡 Health check: http://localhost:{PORT}/health")
    print(f"💬 Chat endpoint: http://localhost:{PORT}/api/chat")
    print(f"💼 Employer chat: http://localhost:{PORT}/api/chat/employer")
    print(f"📚 Get chat: GET http://localhost:{PORT}/api/chat/{{session_id}}")
    print(f"📋 Recent chats: GET http://localhost:{PORT}/api/chat/recent")
    
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=PORT,
        timeout_keep_alive=300,
    )

