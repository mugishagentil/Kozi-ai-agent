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
        
        # First, check if user_id is directly in the token payload (most efficient)
        user_id = payload.get('users_id') or payload.get('user_id') or payload.get('id')
        if user_id:
            try:
                user_id = int(user_id)
                print(f"✅ Got user ID from token payload: {user_id}")
                return user_id
            except (ValueError, TypeError):
                pass
        
        # Fallback: Try to get user ID from email via API
        user_email = payload.get('email')
        
        if not user_email:
            # No email or user_id in token - can't determine user
            return None
        
        print(f"📧 Extracted email from token: {user_email}")
        
        # Call main API to get user ID (only if not in token)
        try:
            response = requests.get(
                f"{API_BASE_URL}/get_user_id_by_email/{user_email}",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json"
                },
                timeout=5.0  # Reduced timeout to fail faster
            )
            
            if response.status_code == 200:
                data = response.json()
                user_id = data.get("users_id")
                if user_id:
                    print(f"✅ Got user ID from API: {user_id}")
                return user_id
            elif response.status_code == 404:
                # Endpoint doesn't exist - silently fail (don't spam logs)
                return None
            else:
                # Only log non-404 errors
                print(f"⚠️  API call failed with status {response.status_code}")
                return None
        except requests.exceptions.Timeout:
            # Timeout - silently fail (don't spam logs)
            return None
        except requests.exceptions.RequestException as api_error:
            # Only log if it's not a timeout or connection error
            if "timeout" not in str(api_error).lower() and "connection" not in str(api_error).lower():
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
async def chat(request: ChatRequest, authorization: Optional[str] = Header(None)):
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
        
        # Generate session ID quickly (without blocking database operations)
        session_id = request.sessionId
        if not session_id:
            # Generate temporary session ID immediately (will be created in background if needed)
            session_id = int(uuid.uuid4().int % 1000000000)
        
        print(f"📝 Question received: {request.message[:100]}... (Session: {session_id}, Role: {request.role_type})")
        
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
            response = JSONResponse(content={
                "data": {
                    "content": response_text,
                    "sessionId": session_id
                },
                "response": response_text,
                "model": OPENAI_MODEL,
                "sessionId": session_id
            })
            
            # Save in background (non-blocking)
            if DATABASE_URL and session_id:
                import asyncio
                bg_session_id = session_id
                bg_message = request.message
                bg_response = response_text
                bg_users_id = request.users_id
                bg_role_type = request.role_type or "employee"
                bg_authorization = authorization
                bg_api_token = api_token
                
                async def save_in_background():
                    try:
                        db = await get_db()
                        existing_session = await db.chatsession.find_unique(where={"id": bg_session_id})
                        if not existing_session:
                            final_users_id = bg_users_id
                            if not final_users_id and (bg_authorization or bg_api_token):
                                try:
                                    final_users_id = get_user_id_from_token(bg_authorization, bg_api_token)
                                except:
                                    pass
                            
                            if final_users_id:
                                try:
                                    await db.chatsession.create(
                                        data={
                                            "id": bg_session_id,
                                            "users_id": final_users_id,
                                            "role_type": bg_role_type,
                                            "title": None
                                        }
                                    )
                                except:
                                    pass
                        
                        await save_chat_to_db(db, bg_session_id, bg_message, bg_response, bg_users_id)
                    except Exception as e:
                        print(f"⚠️  Could not save greeting to database (background): {e}")
                
                asyncio.create_task(save_in_background())
            
            return response

        # OPTIMIZATION: Always load chat history if session exists (even if generated)
        # This ensures the AI remembers what the user said in previous messages
        chat_history = []
        if session_id and DATABASE_URL:  # Load history for any session, not just explicitly provided ones
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
        
        # OPTIMIZATION: Only extract user ID if needed (not for simple greetings)
        # For simple greetings, skip user ID extraction to avoid blocking HTTP calls
        agent_context = {}
        users_id_to_use = request.users_id
        
        # Only get user ID if:
        # 1. It's not a simple greeting (might need tools that require user ID)
        # 2. Or if users_id is already provided (no blocking call needed)
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
        
        # ALWAYS use history if available - this ensures context is maintained across messages
        # This allows the AI to remember what the user said in previous messages
        if chat_history:
            response_text = agent.answer_with_history(
                request.message, 
                chat_history,
                context=agent_context if agent_context else None
            )
        else:
            response_text = agent.answer_question(
                request.message,
                context=agent_context if agent_context else None
            )

        print(f"✅ Response generated ({len(response_text)} characters)")

        # Return response IMMEDIATELY - don't wait for database save
        from fastapi.responses import JSONResponse
        response = JSONResponse(content={
            "data": {
                "content": response_text,
                "sessionId": session_id
            },
            "response": response_text,  # Keep for backward compatibility
            "model": OPENAI_MODEL,
            "sessionId": session_id
        })
        
        # Save to database in background (non-blocking) - don't wait for it
        if DATABASE_URL and session_id:
            import asyncio
            # Capture variables for background task
            bg_session_id = session_id
            bg_message = request.message
            bg_response = response_text
            bg_users_id = users_id_to_use if users_id_to_use else request.users_id
            bg_role_type = request.role_type or "employee"
            bg_authorization = authorization
            bg_api_token = api_token
            
            async def save_in_background():
                try:
                    # Get fresh database connection for background task
                    db = await get_db()
                    
                    # If session doesn't exist, create it in background
                    existing_session = await db.chatsession.find_unique(where={"id": bg_session_id})
                    if not existing_session:
                        # Try to get user ID if not available
                        final_users_id = bg_users_id
                        if not final_users_id and (bg_authorization or bg_api_token):
                            try:
                                final_users_id = get_user_id_from_token(bg_authorization, bg_api_token)
                            except:
                                pass  # Continue without user ID
                        
                        if final_users_id:
                            try:
                                await db.chatsession.create(
                                    data={
                                        "id": bg_session_id,
                                        "users_id": final_users_id,
                                        "role_type": bg_role_type,
                                        "title": None
                                    }
                                )
                                print(f"✅ Created session in background: {bg_session_id}")
                            except Exception as e:
                                # Session might already exist, ignore
                                pass
                    
                    # Save messages
                    await save_chat_to_db(
                        db, 
                        bg_session_id, 
                        bg_message, 
                        bg_response,
                        bg_users_id
                    )
                    print(f"✅ Saved chat to database (background)")
                except (RuntimeError, AttributeError) as e:
                    # Prisma not available - silently fail
                    pass
                except Exception as e:
                    print(f"⚠️  Could not save to database (background): {e}")
            
            # Start background task - don't await it (non-blocking)
            asyncio.create_task(save_in_background())
        
        return response
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
    Answer a question for employers with automatic history from database.
    """
    request.role_type = "employer"
    return await chat(request, authorization)


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
async def start_new_chat(request: NewChatRequest, authorization: Optional[str] = Header(None)):
    """
    Start a new chat session.
    
    Request body:
    - users_id: User ID (int, required)
    - firstMessage: First message to send (string, optional)
    
    Returns:
    - data: { session_id, title }
    """
    try:
        # Extract API token from Authorization header if available (do this first)
        api_token = None
        if authorization:
            # Extract token from "Bearer <token>" format
            if authorization.startswith("Bearer "):
                api_token = authorization[7:]
            elif authorization.startswith("bearer "):
                api_token = authorization[7:]
        
        # Use request.users_id if provided, otherwise try to get from token
        users_id_to_use = request.users_id
        if not users_id_to_use:
            # Try to get user ID from token
            users_id_to_use = get_user_id_from_token(authorization, api_token)
            if users_id_to_use:
                print(f"📝 Extracted users_id from token for new chat: {users_id_to_use}")
        
        # Check if this is a CV query that doesn't need user ID
        first_message_lower = (request.firstMessage or "").lower()
        cv_keywords = ['cv', 'resume', 'curriculum vitae', 'write cv', 'help cv', 'cv help', 
                       'professional cv', 'cv template', 'cv format', 'write resume', 'write a cv',
                       'help me write', 'write a professional', 'create cv', 'create resume']
        is_cv_query = any(keyword in first_message_lower for keyword in cv_keywords)
        
        # Try to use database if available, otherwise generate temporary session ID
        session_id = None
        db = None
        
        if DATABASE_URL:
            try:
                db = await get_db()
                
                # For CV queries, allow null users_id (will use retrieve_knowledge_base)
                if not users_id_to_use and not is_cv_query:
                    raise HTTPException(
                        status_code=400,
                        detail="users_id is required. Either provide it in the request or ensure you are authenticated with a valid token."
                    )
                
                # For CV queries without users_id, generate temporary session
                if is_cv_query and not users_id_to_use:
                    print(f"ℹ️  CV query detected without users_id - generating temporary session")
                    session_id = int(uuid.uuid4().int % 1000000000)
                    db = None  # Don't use database for temporary sessions
                elif users_id_to_use:
                    # Create new session in database
                    new_session = await db.chatsession.create(
                        data={
                            "users_id": users_id_to_use,
                            "role_type": "employee",  # Default, can be determined from context
                            "title": None
                        }
                    )
                    session_id = new_session.id
                else:
                    # No users_id and not a CV query - should have been caught above
                    raise HTTPException(
                        status_code=400,
                        detail="users_id is required. Either provide it in the request or ensure you are authenticated with a valid token."
                    )
            except (RuntimeError, AttributeError) as db_error:
                # Database not available - fall back to temporary session ID
                if "not available" in str(db_error).lower() or "not generated" in str(db_error).lower() or "connection" in str(db_error).lower():
                    print(f"⚠️  Database not available, using temporary session ID: {db_error}")
                    db = None
                    session_id = int(uuid.uuid4().int % 1000000000)
                else:
                    raise
            except Exception as db_error:
                # Database connection failed - fall back to temporary session ID
                if "connection" in str(db_error).lower() or "timeout" in str(db_error).lower() or "failed" in str(db_error).lower():
                    print(f"⚠️  Database connection failed, using temporary session ID: {db_error}")
                    db = None
                    session_id = int(uuid.uuid4().int % 1000000000)
                else:
                    raise
        else:
            # No database configured - generate temporary session ID
            session_id = int(uuid.uuid4().int % 1000000000)
        
        # If no session_id was set, generate one
        if not session_id:
            session_id = int(uuid.uuid4().int % 1000000000)
        
        # If firstMessage is provided, send it and get response to generate title
        title = None
        if request.firstMessage:
            try:
                agent = get_agent_for_role("employee")
                
                # Prepare context for agent (users_id and api_token for tools)
                agent_context = {}
                if users_id_to_use:
                    agent_context['users_id'] = users_id_to_use
                if api_token:
                    agent_context['api_token'] = api_token
                
                response_text = agent.answer_question(
                    request.firstMessage,
                    context=agent_context if agent_context else None
                )
                
                # Generate a title from the first message (first 50 chars)
                title = request.firstMessage[:50].strip()
                if len(request.firstMessage) > 50:
                    title += "..."
                
                # Update session with title if database is available
                if db:
                    try:
                        await db.chatsession.update(
                            where={"id": session_id},
                            data={"title": title}
                        )
                    except Exception as update_error:
                        print(f"⚠️  Could not update session title: {update_error}")
                
                # Save both messages in background (non-blocking) if database is available
                if db:
                    import asyncio
                    # Capture variables for background task
                    bg_session_id = session_id
                    bg_first_message = request.firstMessage
                    bg_response_text = response_text
                    bg_users_id = users_id_to_use
                    
                    async def save_first_message_in_background():
                        try:
                            # Get fresh database connection for background task
                            bg_db = await get_db()
                            await save_chat_to_db(
                                bg_db,
                                bg_session_id,
                                bg_first_message,
                                bg_response_text,
                                bg_users_id
                            )
                            print(f"✅ Saved first message to database (background)")
                        except Exception as e:
                            print(f"⚠️  Could not save first message to database (background): {e}")
                    
                    # Start background task - don't await it
                    asyncio.create_task(save_first_message_in_background())
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
async def get_chat_sessions(users_id: int, authorization: Optional[str] = Header(None)):
    """
    Get all chat sessions for a user.
    
    Query parameters:
    - users_id: User ID (int, required)
    
    Returns:
    - List of chat sessions
    """
    try:
        # Verify users_id matches the authenticated user (security check)
        if authorization:
            try:
                token_user_id = get_user_id_from_token(authorization)
                if token_user_id and token_user_id != users_id:
                    raise HTTPException(
                        status_code=403,
                        detail="Access denied: Cannot access other user's sessions"
                    )
            except HTTPException:
                raise
            except Exception:
                # If token extraction fails, continue (might be optional)
                pass
        
        if not DATABASE_URL:
            return {"sessions": []}
        
        try:
            db = await get_db()
        except (RuntimeError, AttributeError) as db_error:
            # Database not available
            if "not available" in str(db_error).lower() or "not generated" in str(db_error).lower():
                return {"sessions": []}
            raise
        
        try:
            sessions = await db.chatsession.find_many(
                where={"users_id": users_id},
                order={"updatedAt": "desc"},
                take=50  # Limit to 50 most recent
            )
        except Exception as query_error:
            print(f"⚠️  Error querying sessions: {query_error}")
            return {"sessions": []}
        
        chats = []
        for session in sessions:
            try:
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
            except Exception as session_error:
                # Skip this session if there's an error, but continue with others
                print(f"⚠️  Error processing session {session.id}: {session_error}")
                continue
        
        return {"sessions": chats}  # Frontend expects "sessions" not "chats"
    except HTTPException:
        raise
    except Exception as error:
        import traceback
        print(f"Error getting chat sessions: {error}")
        print(f"Traceback: {traceback.format_exc()}")
        # Return empty list instead of 500 error to prevent frontend issues
        return {"sessions": []}


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
async def get_chat(session_id: int, authorization: Optional[str] = Header(None)):
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
                detail=f"Chat session {session_id} not found"
            )
        
        # Security check: Verify users_id matches the authenticated user
        if authorization and chat_session.users_id:
            token_user_id = get_user_id_from_token(authorization)
            if token_user_id and token_user_id != chat_session.users_id:
                raise HTTPException(
                    status_code=403,
                    detail="Access denied: This chat session belongs to another user"
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

