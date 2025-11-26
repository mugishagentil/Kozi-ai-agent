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
import base64
import json
import requests

# Add src_python to path
sys.path.insert(0, str(Path(__file__).parent))

from agents.jobseeker_agent import JobSeekerAgent
from agents.employer_agent import EmployerAgent
from agents.admin_agent import AdminAgent
from database import get_db, init_db, close_prisma, prisma_available

# Load environment variables
# Load from both backend/.env and backend/src_python/.env if they exist
load_dotenv()  # Load from current directory
load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env")  # Load from backend/.env


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events"""
    # Startup
    try:
        # Initialize database (optional - only if Prisma is available)
        if prisma_available:
            result = await init_db()
            if not result:
                print("⚠️  Database initialization failed, but continuing...")
        else:
            print("ℹ️  Prisma not available - skipping database initialization (knowledge base uses Qdrant)")
            print("ℹ️  Server starting without database.")
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
OPENAI_MODEL = os.getenv("OPENAI_CHAT_MODEL") or os.getenv("OPENAI_MODEL", "gpt-4o-mini")  # Use faster model by default
PORT = int(os.getenv("PORT", "5050"))
DATABASE_URL = os.getenv("DATABASE_URL")
API_BASE_URL = os.getenv("API_BASE_URL", "https://apis.kozi.rw")

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
    users_id: Optional[int] = None
    role_type: Optional[str] = "employee"  # "employee", "employer", or "admin"
    api_token: Optional[str] = None
    chat_history: Optional[List[Dict[str, str]]] = None  # List of previous messages [{"role": "user", "content": "..."}, ...]


class ChatResponse(BaseModel):
    response: str
    model: str


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


def get_user_id_from_token(authorization: Optional[str] = None, api_token: Optional[str] = None) -> Optional[int]:
    """
    Extract user ID from token by calling main API.
    
    Args:
        authorization: Authorization header value
        api_token: API token from request body
        
    Returns:
        User ID if found, None otherwise
    """
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
        # Extract email from token
        parts = token.split('.')
        if len(parts) < 2:
            print("⚠️  Invalid token format: token doesn't have enough parts")
            return None
        
        # Decode JWT payload (skip signature verification)
        payload_str = parts[1]
        # Add padding if needed
        padding = 4 - len(payload_str) % 4
        if padding != 4:
            payload_str += '=' * padding
        
        try:
            payload = json.loads(base64.urlsafe_b64decode(payload_str))
        except Exception as decode_error:
            print(f"⚠️  Error decoding token payload: {decode_error}")
            return None
        
        user_email = payload.get('email')
        
        if not user_email:
            print(f"⚠️  Token payload doesn't contain email. Available keys: {list(payload.keys())}")
            return None
        
        print(f"📧 Extracted email from token: {user_email}")
        
        # Call main API to get user ID
        try:
            response = requests.get(
                f"{API_BASE_URL}/get_user_id_by_email/{user_email}",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json"
                },
                timeout=10.0
            )
            
            if response.status_code == 200:
                data = response.json()
                user_id = data.get("users_id")
                if user_id:
                    print(f"✅ Got user ID from API: {user_id}")
                return user_id
            else:
                print(f"⚠️  API call failed with status {response.status_code}: {response.text[:200]}")
                return None
        except requests.exceptions.RequestException as api_error:
            print(f"⚠️  Error calling main API: {api_error}")
            return None
        
    except Exception as e:
        print(f"⚠️  Error getting user ID from token: {e}")
        import traceback
        print(f"   Traceback: {traceback.format_exc()}")
        return None


# Endpoint to get user ID dynamically from token
@app.get("/api/user/id")
async def get_user_id(authorization: Optional[str] = Header(None)):
    """
    Get user ID dynamically by extracting email from token and calling main API.
    This ensures each user gets their own ID, not a static one.
    """
    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="Authorization header is required"
        )
    
    user_id = get_user_id_from_token(authorization)
    
    if not user_id:
        raise HTTPException(
            status_code=404,
            detail="Could not retrieve user ID from token. Please ensure you are logged in."
        )
    
    return {"users_id": user_id}


# Chat endpoint for employees (job seekers)
@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, authorization: Optional[str] = Header(None)):
    """
    Answer a question.
    
    Request body:
    - message: The user's question (string)
    - users_id: User ID (int, optional)
    - role_type: "employee", "employer", or "admin" (default: "employee")
    - api_token: API authentication token (optional)
    
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

        # Get appropriate agent
        agent = get_agent_for_role(request.role_type)
        
        # Extract API token from Authorization header if not in request body
        api_token = request.api_token
        if not api_token and authorization:
            # Extract token from "Bearer <token>" format
            if authorization.startswith("Bearer "):
                api_token = authorization[7:]
            elif authorization.startswith("bearer "):
                api_token = authorization[7:]
        
        # OPTIMIZATION: For simple greetings, respond immediately without calling agent
        message_lower = request.message.lower().strip()
        simple_greetings = ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'thanks', 'thank you', 'bye', 'goodbye']
        is_simple_greeting = message_lower in simple_greetings
        
        print(f"📝 Question received: {request.message[:100]}... (Role: {request.role_type})")
        
        # EARLY RETURN: For simple greetings, respond immediately without calling agent
        if is_simple_greeting:
            # Return immediate friendly response - no agent call needed (saves 10-15 seconds)
            if message_lower in ['hello', 'hi', 'hey']:
                response_text = "Hello! 👋 I'm here to help you find jobs, write your CV, or answer any questions about Kozi. What would you like to do today?"
            elif message_lower in ['thanks', 'thank you']:
                response_text = "You're welcome! 😊 Is there anything else I can help you with?"
            elif message_lower in ['bye', 'goodbye']:
                response_text = "Goodbye! 👋 Feel free to come back anytime if you need help finding jobs or have questions about Kozi."
            else:
                response_text = "Hello! 👋 How can I help you today?"
            
            # Return immediately
            from fastapi.responses import JSONResponse
            return JSONResponse(content={
                "data": {
                    "content": response_text
                },
                "response": response_text,
                "model": OPENAI_MODEL
            })
        
        # Extract user ID if needed
        agent_context = {}
        users_id_to_use = request.users_id
        
        if not is_simple_greeting and not users_id_to_use:
            # Try to get user ID from token (but don't block if it fails)
            try:
                users_id_to_use = get_user_id_from_token(authorization, api_token)
                if users_id_to_use:
                    print(f"📝 Extracted users_id from token: {users_id_to_use}")
                    request.users_id = users_id_to_use
            except Exception as e:
                print(f"⚠️  Could not get user ID from token (non-blocking): {e}")
                # Continue without user ID - agent can still respond
        
        if users_id_to_use:
            agent_context['users_id'] = users_id_to_use
        if api_token:
            agent_context['api_token'] = api_token
        
        print(f"🤖 Calling agent.answer_question()...")
        print(f"   Context: users_id={agent_context.get('users_id') if agent_context else None}, api_token={'***' if agent_context and agent_context.get('api_token') else None}")
        print(f"   Chat history: {len(request.chat_history) if request.chat_history else 0} messages")
        
        # Get response from agent - use answer_with_history if chat_history is provided
        if request.chat_history and len(request.chat_history) > 0:
            # Convert frontend format to backend format if needed
            formatted_history = []
            for msg in request.chat_history:
                if isinstance(msg, dict):
                    role = msg.get("role") or msg.get("sender")
                    content = msg.get("content") or msg.get("text") or msg.get("message")
                    if role and content:
                        # Map frontend roles to backend roles
                        if role == "user" or role == "human":
                            formatted_history.append({"role": "user", "content": str(content)})
                        elif role == "assistant" or role == "ai" or role == "bot":
                            formatted_history.append({"role": "assistant", "content": str(content)})
            
            print(f"📚 Using chat history with {len(formatted_history)} messages")
            response_text = agent.answer_with_history(
                request.message,
                chat_history=formatted_history,
                context=agent_context if agent_context else None
            )
        else:
            # No history - use simple answer_question
            response_text = agent.answer_question(
                request.message,
                context=agent_context if agent_context else None
            )

        print(f"✅ Response generated ({len(response_text)} characters)")
        print(f"📤 Sending response to client...")

        # Return response
        from fastapi.responses import JSONResponse
        return JSONResponse(content={
            "data": {
                "content": response_text
            },
            "response": response_text,
            "model": OPENAI_MODEL
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
async def chat_employer(request: ChatRequest, authorization: Optional[str] = Header(None)):
    """
    Answer a question for employers.
    """
    request.role_type = "employer"
    return await chat(request, authorization)


if __name__ == "__main__":
    import uvicorn

    print(f"🚀 Starting Kozi AI server on http://localhost:{PORT}")
    print(f"📡 Health check: http://localhost:{PORT}/health")
    print(f"💬 Chat endpoint: http://localhost:{PORT}/api/chat")
    print(f"💼 Employer chat: http://localhost:{PORT}/api/chat/employer")
    
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=PORT,
        timeout_keep_alive=300,
    )

