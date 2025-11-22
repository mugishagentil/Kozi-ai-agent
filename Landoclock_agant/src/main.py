"""
FastAPI server for Land O'Clock Real Estate AI Agent

This module provides REST API endpoints for the real estate AI agent.
"""

import os
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid

from src.agent import RealEstateAgent
from src.database import get_db, init_db, close_prisma
from src.title_generator import TitleGenerator

# Load environment variables
load_dotenv()

app = FastAPI(
    title="Land O'Clock Real Estate AI Agent",
    description="Backend API for real estate Q&A using LangChain and OpenAI",
    version="1.0.0",
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
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o")
PORT = int(os.getenv("PORT", "3001"))
DATABASE_URL = os.getenv("DATABASE_URL")

if not OPENAI_API_KEY:
    raise ValueError("OPENAI_API_KEY environment variable is required")

# Initialize the real estate agent
agent = RealEstateAgent(OPENAI_API_KEY, OPENAI_MODEL)

# Initialize title generator
title_generator = TitleGenerator(OPENAI_API_KEY, model_name="gpt-4o-mini")

# Initialize database (will be initialized on startup)

print(f"🤖 Real Estate Agent initialized with model: {OPENAI_MODEL}")


# Request/Response models
class ChatRequest(BaseModel):
    message: str
    sessionId: Optional[str] = None  # Accept sessionId from frontend (for future use)


class ChatResponse(BaseModel):
    response: str
    model: str


class ChatHistoryRequest(BaseModel):
    message: str
    history: Optional[List[Dict[str, str]]] = []


class ChatListResponse(BaseModel):
    chats: List[Dict[str, str]]


class ChatDetailResponse(BaseModel):
    chat: Dict[str, Any]


# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "ok",
        "service": "land-oclock-backend",
        "model": OPENAI_MODEL,
    }


# Helper function to save messages to database using Prisma
async def save_chat_to_db(db, session_id: str, user_message: str, assistant_message: str):
    """Save chat messages to database and generate title if needed"""
    try:
        # Get or create chat session
        chat_session = await db.chatsession.find_unique(where={"id": session_id})
        
        if not chat_session:
            # Create new session
            chat_session = await db.chatsession.create(
                data={"id": session_id, "title": None}
            )
        
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
        
        # Generate title when there's a meaningful question (not just greetings)
        # Also update title if it's still "New Chat" or "Greeting" and we now have a meaningful question
        should_generate_title = (
            not chat_session.title or 
            chat_session.title in ["New Chat", "Property Inquiry", "Greeting"]
        )
        
        if should_generate_title:
            messages = await db.chatmessage.find_many(
                where={"sessionId": session_id},
                order={"createdAt": "asc"},
                take=10  # Get more messages to find meaningful question
            )
            
            # Only generate title if we have at least 2 messages (one exchange)
            # The title generator will skip greetings and find the first meaningful question
            if len(messages) >= 2:
                # Convert to format for title generator
                msg_list = [
                    {"role": msg.role, "content": msg.content}
                    for msg in messages
                ]
                title = title_generator.generate_title(msg_list)
                
                # Update title if:
                # 1. We don't have a title yet, OR
                # 2. Current title is generic ("New Chat") and new title is meaningful
                if title:
                    if not chat_session.title:
                        # No title yet - set it (even if "New Chat")
                        await db.chatsession.update(
                            where={"id": session_id},
                            data={"title": title}
                        )
                        print(f"📌 Generated title: {title}")
                    elif chat_session.title in ["New Chat", "Property Inquiry", "Greeting"] and title not in ["New Chat", "Greeting"]:
                        # Current title is generic, but we now have a meaningful one - update it
                        await db.chatsession.update(
                            where={"id": session_id},
                            data={"title": title}
                        )
                        print(f"📌 Updated title from '{chat_session.title}' to '{title}'")
        
    except Exception as e:
        print(f"⚠️  Error saving to database: {e}")
        # Don't fail the request if database save fails


# Simple chat endpoint - now with database storage and history loading
@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Answer a question about real estate with automatic history from database.
    
    Note: This endpoint has extended timeout (5 minutes) to allow for AI analysis
    of property images and detailed property evaluation.
    """
    """
    Answer a question about real estate with automatic history from database.
    
    Request body:
    - message: The user's question (string)
    - sessionId: Session ID for chat history (string, optional)
      If provided, will load previous messages from database and use them as context.
      If not provided, will generate a new session ID and save to database.
    
    Returns:
    - response: The agent's answer
    - model: The OpenAI model used
    """
    try:
        if not request.message or not isinstance(request.message, str):
            raise HTTPException(
                status_code=400,
                detail="Invalid request. 'message' field is required and must be a string.",
            )

        # Generate session ID if not provided
        session_id = request.sessionId or f"session-{uuid.uuid4().hex[:12]}"

        print(f"📝 Question received: {request.message[:100]}... (Session: {session_id})")

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
                pass  # Silently fail - chat works without database
            except Exception as e:
                print(f"⚠️  Could not load history from database: {e}")

        # Get response from agent (with history if available)
        if chat_history:
            response_text = agent.answer_with_history(request.message, chat_history)
        else:
            response_text = agent.answer_question(request.message)

        print(f"✅ Response generated ({len(response_text)} characters)")

        # Save to database
        if DATABASE_URL:
            try:
                db = await get_db()
                await save_chat_to_db(db, session_id, request.message, response_text)
            except (RuntimeError, AttributeError) as e:
                # Prisma not available - silently fail, chat still works
                pass
            except Exception as e:
                print(f"⚠️  Could not save to database: {e}")

        return ChatResponse(response=response_text, model=OPENAI_MODEL)
    except HTTPException:
        raise
    except Exception as error:
        print(f"Error in /api/chat: {error}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process your question: {str(error)}",
        )


# Chat endpoint with history support - now uses database
@app.post("/api/chat/history", response_model=ChatResponse)
async def chat_with_history(request: ChatHistoryRequest):
    """
    Answer a question with conversation history from database.
    
    Request body:
    - message: The user's current question (string)
    - sessionId: Session ID to load history from database (required)
    
    Returns:
    - response: The agent's answer
    - model: The OpenAI model used
    """
    try:
        if not request.message or not isinstance(request.message, str):
            raise HTTPException(
                status_code=400,
                detail="Invalid request. 'message' field is required and must be a string.",
            )

        # For history endpoint, we'll use sessionId from query param or request
        # Note: This endpoint can be enhanced to accept sessionId in the request
        print(f"📝 Question with history received: {request.message[:100]}...")

        # Get response from agent with history
        response_text = agent.answer_with_history(
            request.message, request.history or []
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


# Get recent chats (must be defined before /api/chat/{session_id} to avoid route conflicts)
@app.get("/api/chat/recent", response_model=ChatListResponse)
async def get_recent_chats(limit: int = 30):
    """
    Get recent chat sessions.
    
    Query params:
    - limit: Number of chats to return (default: 30)
    
    Returns:
    - chats: List of chat sessions with title and metadata
    """
    try:
        db = await get_db()
        # Get recent sessions
        sessions = await db.chatsession.find_many(
            order={"updatedAt": "desc"},
            take=limit
        )
        
        # Format sessions
        chats = [
            {
                "sessionId": session.id,
                "title": session.title or "Untitled Chat",
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
async def get_chat(session_id: str):
    """
    Get chat history by session ID.
    
    Returns:
    - chat: Chat object with session info and messages
    """
    try:
        db = await get_db()
        # Get chat session with messages
        chat_session = await db.chatsession.find_unique(
            where={"id": session_id},
            include={"messages": {"orderBy": {"createdAt": "asc"}}}
        )
        
        if not chat_session:
            raise HTTPException(
                status_code=404,
                detail=f"Chat session {session_id} not found",
            )
        
        # Format messages
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


# Delete chat session
@app.delete("/api/chat/{session_id}")
async def delete_chat(session_id: str):
    """
    Delete a chat session and all its messages (cascade delete).
    
    Returns:
    - message: Confirmation message
    """
    try:
        db = await get_db()
        # Check if session exists
        chat_session = await db.chatsession.find_unique(where={"id": session_id})
        
        if not chat_session:
            raise HTTPException(
                status_code=404,
                detail=f"Chat session {session_id} not found",
            )
        
        # Delete session (messages will be deleted automatically due to cascade)
        await db.chatsession.delete(where={"id": session_id})
        
        return {"message": "Chat deleted successfully"}
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
        print(f"Error deleting chat: {error}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete chat: {str(error)}",
        )


@app.on_event("startup")
async def startup_event():
    """Initialize database on startup"""
    try:
        result = await init_db()
        if not result:
            print("ℹ️  Server starting without database. Chat will work, but history won't be saved.")
    except Exception as e:
        print(f"⚠️  Database initialization warning: {e}")
        print("   Server will continue without database features.")
        print("   To enable database: PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1 python -m prisma generate")


@app.on_event("shutdown")
async def shutdown_event():
    """Close database connection on shutdown"""
    try:
        await close_prisma()
    except Exception:
        pass  # Ignore errors on shutdown


if __name__ == "__main__":
    import uvicorn

    print(f"🚀 Starting server on http://localhost:{PORT}")
    print(f"📡 Health check: http://localhost:{PORT}/health")
    print(f"💬 Chat endpoint: http://localhost:{PORT}/api/chat")
    print(f"💬 Chat with history: http://localhost:{PORT}/api/chat/history")
    print(f"📚 Get chat: GET http://localhost:{PORT}/api/chat/{{session_id}}")
    print(f"📋 Recent chats: GET http://localhost:{PORT}/api/chat/recent")
    print(f"🗑️  Delete chat: DELETE http://localhost:{PORT}/api/chat/{{session_id}}")
    
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=PORT,
        timeout_keep_alive=300,  # 5 minutes keep-alive timeout for AI analysis
    )

