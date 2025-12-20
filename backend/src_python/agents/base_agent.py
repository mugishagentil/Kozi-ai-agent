"""
Base Agent Class for Kozi AI Agents

This module provides a base class for all Kozi AI agents with common functionality
including knowledge base integration, tool management, and conversation handling.
"""

import sys
from pathlib import Path
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from langchain.agents import AgentExecutor
from typing import List, Dict, Optional, Any
from openai import OpenAI

# Try to import create_openai_tools_agent - handle version differences
try:
    from langchain.agents import create_openai_tools_agent
except ImportError:
    try:
        from langchain_openai import create_openai_tools_agent
    except ImportError:
        # Fallback for newer LangChain versions
        from langchain.agents import create_tool_calling_agent
        # Create a wrapper function
        def create_openai_tools_agent(llm, tools, prompt):
            return create_tool_calling_agent(llm, tools, prompt)

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))
from agents.retrieval_tool import retrieve_knowledge_base
from thread_manager import ThreadManager


class BaseAgent:
    """
    Base class for all Kozi AI agents with common functionality.
    
    Architecture using LangChain Chains:
    1. LLM (ChatOpenAI) - The AI brain/model
    2. Tools - Python functions the AI can call
    3. Agent Executor - Orchestrates the chain execution
    4. Prompt Template - Defines the conversation structure with roles:
       - System: AI instructions and behavior
       - Human: User messages/input
       - AI: Assistant responses and tool calls
    """
    
    def __init__(
        self,
        api_key: str,
        model_name: str = "gpt-4o",
        system_prompt: str = "",
        tools: Optional[List] = None
    ):
        """
        Initialize the base agent.
        
        Args:
            api_key: OpenAI API key
            model_name: OpenAI model name (default: gpt-4o)
            system_prompt: System prompt for the agent
            tools: List of tools for the agent (default: includes knowledge base retrieval)
        """
        # Initialize OpenAI model (optimized for speed)
        # Use gpt-4o-mini for faster responses (much faster than gpt-4o)
        effective_model = "gpt-4o-mini" if model_name == "gpt-4o" else model_name
        self.llm = ChatOpenAI(
            model=effective_model,
            temperature=0.2,  # Further reduced for faster, more deterministic responses
            api_key=api_key,
            timeout=15.0,  # Reduced from 30.0 - 15 seconds is enough
            max_retries=1,  # Reduced from 2 to fail faster
        )
        
        # Initialize OpenAI client and thread manager
        self.openai_client = OpenAI(api_key=api_key)
        self.thread_manager = ThreadManager(api_key)
        
        # Default system prompt if not provided
        if not system_prompt:
            system_prompt = """You are a helpful and knowledgeable AI assistant for the Kozi platform.

**CRITICAL CONTEXT - USER AUTHENTICATION:**
- Users accessing this AI are ALREADY logged into their Kozi account dashboard
- They are ALREADY authenticated and have active accounts
- NEVER ask users to sign up, sign in, or create an account
- NEVER ask for login credentials or authentication information

Your role is to answer questions about jobs, hiring, the platform's services, and help users navigate the platform.

**CRITICAL: Tool Usage Guidelines (Performance Optimization):**
- **DO NOT use tools for simple greetings** (hello, hi, thanks, bye) - respond directly and friendly
- **DO NOT use tools for casual conversation** - respond naturally without tool calls
- **ONLY use retrieve_knowledge_base tool** when user asks SPECIFIC questions about:
  * Platform features, policies, or procedures ("How do I...", "What is...")
  * Job searching or hiring information
  * Specific Kozi-related questions that require platform knowledge
- **For general questions you can answer from your training**, respond directly without tools
- **For simple acknowledgments or casual chat**, respond directly without tools

**Important Guidelines:**
1. Use retrieve_knowledge_base tool ONLY when needed for specific platform questions
2. For simple greetings, respond warmly and ask how you can help - NO TOOLS
3. Base your answers on the information retrieved from the knowledge base when you do use it
4. If the knowledge base doesn't contain specific information, acknowledge this and provide general guidance
5. Be friendly, professional, and approachable in your responses
6. Format responses using Markdown with proper spacing and structure
7. **Respond quickly and efficiently** - avoid unnecessary tool calls
"""
        
        self.system_prompt = system_prompt
        
        # Set up tools (default includes knowledge base retrieval)
        if tools is None:
            tools = [retrieve_knowledge_base]
        else:
            # Always include knowledge base retrieval
            if retrieve_knowledge_base not in tools:
                tools = [retrieve_knowledge_base] + tools
        
        self.tools = tools
        
        # Create prompt template using PromptTemplate.from_messages with explicit roles
        self.prompt_template = ChatPromptTemplate.from_messages([
            ("system", self.system_prompt),  # System role: AI instructions and behavior
            MessagesPlaceholder(variable_name="chat_history"),  # History: Human/AI message pairs
            ("human", "{input}"),  # Human role: current user input
            MessagesPlaceholder(variable_name="agent_scratchpad"),  # AI role: tool usage and reasoning
        ])
        
        # Create the agent
        self.agent = create_openai_tools_agent(
            llm=self.llm,
            tools=self.tools,
            prompt=self.prompt_template
        )
        
        # Create agent executor with optimized settings for production
        self.agent_executor = AgentExecutor(
            agent=self.agent,
            tools=self.tools,
            verbose=False,  # Disabled for production performance
            handle_parsing_errors=True,
            max_iterations=3,  # Reduced for faster responses
            max_execution_time=15,  # Reduced timeout
            return_intermediate_steps=False,  # Disabled for performance
        )

    def answer_question(self, question: str, context: Optional[Dict] = None, thread_id: Optional[str] = None) -> str:
        """
        Answer a single question.
        
        Args:
            question: User's question
            context: Optional context dict with users_id, api_token, etc. for tools to use
            thread_id: Optional OpenAI thread ID for persistent history
            
        Returns:
            Agent's response as a string
        """
        import time
        start_time = time.time()
        
        try:
            # If thread_id provided, get history from OpenAI thread
            messages = []
            if thread_id:
                history_start = time.time()
                try:
                    thread_messages = self.thread_manager.get_messages(thread_id)  # Get all messages
                    for msg in thread_messages:
                        if msg["role"] == "user":
                            messages.append(HumanMessage(content=msg["content"]))
                        elif msg["role"] == "assistant":
                            messages.append(AIMessage(content=msg["content"]))
                    if len(messages) > 0:
                        print(f"📚 Loaded {len(messages)} messages ({time.time() - history_start:.2f}s)")
                except Exception as e:
                    print(f"⚠️  Error loading thread history: {e}")
                    messages = []
            
            # Build input with context information
            agent_input = {
                "input": question,
                "chat_history": messages
            }
            
            # If context provided, add users_id to input so agent knows to use it in tools
            if context:
                if 'users_id' in context:
                    # Add users_id to input so agent can use it when calling get_user_profile
                    agent_input['input'] = f"[User ID: {context['users_id']}] {question}"
                if 'api_token' in context:
                    # Store API token in environment so tools can access it
                    import os
                    os.environ['API_TOKEN'] = context['api_token']
                    print(f"🔑 API token set in environment for tools")
            
            # Process with agent
            ai_start = time.time()
            result = self.agent_executor.invoke(agent_input)
            ai_time = time.time() - ai_start
            
            # Check if agent stopped due to max iterations
            output = result.get("output", "")
            if "Agent stopped due to max iterations" in output or "max iterations" in output.lower():
                # Return a helpful message that encourages the user to provide more specific info
                return "I want to help you find the perfect job! Could you provide a bit more detail? For example:\n- What type of job are you looking for? (e.g., marketing, IT, sales)\n- What's your preferred location? (e.g., Kigali, remote)\n\nOnce I have this information, I'll search for matching jobs right away!"
            
            # If thread_id provided, save the conversation to the thread
            if thread_id and output:
                save_start = time.time()
                try:
                    # Add user message to thread
                    self.thread_manager.add_message(thread_id, question, "user")
                    # Add assistant response to thread
                    self.thread_manager.add_message(thread_id, output, "assistant")
                    save_time = time.time() - save_start
                    print(f"💾 Saved to thread ({save_time:.2f}s)")
                except Exception as e:
                    print(f"⚠️  Error saving to thread: {e}")
            
            total_time = time.time() - start_time
            print(f"⏱️  Total response time: {total_time:.2f}s (AI: {ai_time:.2f}s)")
            
            return output if output else "I apologize, but I couldn't generate a response."
        except Exception as error:
            total_time = time.time() - start_time
            print(f"❌ Error after {total_time:.2f}s: {error}")
            
            error_str = str(error)
            
            # Check for max iterations in exception message
            if "max iterations" in error_str.lower() or "max_iterations" in error_str.lower():
                return "I want to help you find the perfect job! Could you provide a bit more detail? For example:\n- What type of job are you looking for? (e.g., marketing, IT, sales)\n- What's your preferred location? (e.g., Kigali, remote)\n\nOnce I have this information, I'll search for matching jobs right away!"
            
            # Check for specific OpenAI errors
            if "429" in error_str or "quota" in error_str.lower() or "insufficient_quota" in error_str.lower():
                raise Exception(
                    "OpenAI API quota exceeded. Please check your OpenAI account billing and quota limits. "
                    "Visit https://platform.openai.com/account/billing to add credits or upgrade your plan."
                )
            elif "401" in error_str or "unauthorized" in error_str.lower() or "invalid_api_key" in error_str.lower():
                raise Exception(
                    "OpenAI API key is invalid or not configured. Please check your OPENAI_API_KEY environment variable."
                )
            elif "rate_limit" in error_str.lower():
                raise Exception(
                    "OpenAI API rate limit exceeded. Please wait a moment and try again."
                )
            else:
                raise Exception(f"Failed to process your question: {error_str}")

    def answer_with_history(
        self,
        question: str,
        chat_history: List[Dict[str, str]] = None,
        context: Optional[Dict] = None,
        thread_id: Optional[str] = None
    ) -> str:
        """
        Answer a question with conversation history.
        
        Args:
            question: User's current question
            chat_history: List of previous messages in format [{"role": "user"|"assistant", "content": "..."}]
            context: Optional context dict with users_id, api_token, etc. for tools to use
            thread_id: Optional OpenAI thread ID for persistent history
            
        Returns:
            Agent's response as a string
        """
        try:
            # If thread_id provided, get history from OpenAI thread
            if thread_id:
                try:
                    thread_messages = self.thread_manager.get_messages(thread_id)  # Get all messages
                    messages = []
                    for msg in thread_messages:
                        if msg["role"] == "user":
                            messages.append(HumanMessage(content=msg["content"]))
                        elif msg["role"] == "assistant":
                            messages.append(AIMessage(content=msg["content"]))
                except Exception as e:
                    print(f"⚠️  Error loading thread history: {e}")
                    messages = []
            else:
                # Fallback to provided chat_history
                if chat_history is None:
                    chat_history = []
                
                # Convert chat history to LangChain message format with explicit roles
                messages = []
                for msg in chat_history:
                    role = msg.get("role", "")
                    content = msg.get("content", "")
                    
                    if role == "user":
                        messages.append(HumanMessage(content=content))
                    elif role == "assistant":
                        messages.append(AIMessage(content=content))
            
            # Build input with context information
            agent_input = {
                "input": question,
                "chat_history": messages
            }
            
            # If context provided, add users_id to input so agent knows to use it in tools
            if context:
                if 'users_id' in context:
                    # Add users_id to input so agent can use it when calling get_user_profile
                    agent_input['input'] = f"[User ID: {context['users_id']}] {question}"
                if 'api_token' in context:
                    # Store API token in environment so tools can access it
                    import os
                    os.environ['API_TOKEN'] = context['api_token']
                    print(f"🔑 API token set in environment for tools")
            
            # Log what we're sending to the agent (disabled for performance)
            # print(f"📤 Sending to agent: {question[:100]}...")
            # print(f"📚 Chat history: {len(messages)} messages")
            # print(f"🛠️  Available tools: {[tool.name for tool in self.tools]}")
            
            # Use agent executor with history
            result = self.agent_executor.invoke(agent_input)
            
            # Log intermediate steps to see if tools were called (disabled for performance)
            # if 'intermediate_steps' in result:
            #     print(f"🔧 Intermediate steps: {len(result['intermediate_steps'])}")
            #     for step in result['intermediate_steps']:
            #         print(f"   Step: {step}")
            
            # Check if agent stopped due to max iterations
            output = result.get("output", "")
            if "Agent stopped due to max iterations" in output or "max iterations" in output.lower():
                # Return a helpful message that encourages the user to provide more specific info
                return "I want to help you find the perfect job! Could you provide a bit more detail? For example:\n- What type of job are you looking for? (e.g., marketing, IT, sales)\n- What's your preferred location? (e.g., Kigali, remote)\n\nOnce I have this information, I'll search for matching jobs right away!"
            
            # If thread_id provided, save the conversation to the thread
            if thread_id and output:
                try:
                    # Add user message to thread
                    self.thread_manager.add_message(thread_id, question, "user")
                    # Add assistant response to thread
                    self.thread_manager.add_message(thread_id, output, "assistant")
                except Exception as e:
                    print(f"⚠️  Error saving to thread: {e}")
            
            return output if output else "I apologize, but I couldn't generate a response."
        except Exception as error:
            error_str = str(error)
            print(f"Error processing question with history: {error}")
            
            # Check for max iterations in exception message
            if "max iterations" in error_str.lower() or "max_iterations" in error_str.lower():
                return "I want to help you find the perfect job! Could you provide a bit more detail? For example:\n- What type of job are you looking for? (e.g., marketing, IT, sales)\n- What's your preferred location? (e.g., Kigali, remote)\n\nOnce I have this information, I'll search for matching jobs right away!"
            
            # Check for specific OpenAI errors
            if "429" in error_str or "quota" in error_str.lower() or "insufficient_quota" in error_str.lower():
                raise Exception(
                    "OpenAI API quota exceeded. Please check your OpenAI account billing and quota limits. "
                    "Visit https://platform.openai.com/account/billing to add credits or upgrade your plan."
                )
            elif "401" in error_str or "unauthorized" in error_str.lower() or "invalid_api_key" in error_str.lower():
                raise Exception(
                    "OpenAI API key is invalid or not configured. Please check your OPENAI_API_KEY environment variable."
                )
            elif "rate_limit" in error_str.lower():
                raise Exception(
                    "OpenAI API rate limit exceeded. Please wait a moment and try again."
                )
            else:
                raise Exception(f"Failed to process your question: {error_str}")
    
    def create_thread(self, metadata: Optional[Dict[str, str]] = None) -> str:
        """Create a new OpenAI thread for this agent."""
        return self.thread_manager.create_thread(metadata)
    
    def get_thread_messages(self, thread_id: str) -> List[Dict[str, Any]]:
        """Get messages from a thread."""
        return self.thread_manager.get_messages(thread_id)
    
    def generate_conversation_title(self, first_message: str, response: str, second_message: str = None) -> str:
        """Generate AI conversation title from first 2 messages, skipping greetings."""
        try:
            # Check if first message is just a greeting
            greetings = ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening']
            is_greeting = first_message.lower().strip() in greetings or len(first_message.strip()) < 5
            
            # Use second message if first is greeting
            if is_greeting and second_message:
                main_message = second_message
            else:
                main_message = first_message
            
            prompt = f"""Generate a short title (max 35 characters) for this conversation:

User: {main_message}
Assistant: {response[:150]}...

Title must be:
- Maximum 35 characters
- Descriptive and clear
- No quotes or special characters

Examples: "Job Search", "CV Writing", "Interview Tips"

Title:"""
            
            result = self.openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=15,
                temperature=0.3
            )
            
            title = result.choices[0].message.content.strip().strip('"').strip("'")
            # Ensure max 35 chars to prevent breaking sidebar
            return title[:35] if title else main_message[:35]
        except Exception as e:
            print(f"⚠️  Error generating title: {e}")
            return main_message[:35] if 'main_message' in locals() else first_message[:35]