"""
Base Agent Class for Kozi AI Agents

This module provides a base class for all Kozi AI agents with common functionality
including knowledge base integration, tool management, and conversation handling.
"""

import sys
from pathlib import Path
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage
from langchain.agents import AgentExecutor
from typing import List, Dict, Optional

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


class BaseAgent:
    """Base class for all Kozi AI agents with common functionality."""
    
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
        
        # Create prompt template
        self.prompt_template = ChatPromptTemplate.from_messages([
            ("system", self.system_prompt),
            MessagesPlaceholder(variable_name="chat_history"),
            ("human", "{input}"),
            MessagesPlaceholder(variable_name="agent_scratchpad"),
        ])
        
        # Create the agent
        self.agent = create_openai_tools_agent(
            llm=self.llm,
            tools=self.tools,
            prompt=self.prompt_template
        )
        
        # Create agent executor (optimized for speed)
        self.agent_executor = AgentExecutor(
            agent=self.agent,
            tools=self.tools,
            verbose=False,  # Disabled for production (reduces overhead)
            handle_parsing_errors=True,
            max_iterations=5,  # Increased to 5 to allow tool calls (was 2 - too low, causing max iterations errors)
            max_execution_time=15,  # Reduced from 30 to 15 seconds
            return_intermediate_steps=False,  # Don't return intermediate steps (faster)
        )

    def answer_question(self, question: str, context: Optional[Dict] = None) -> str:
        """
        Answer a single question.
        
        Args:
            question: User's question
            context: Optional context dict with users_id, api_token, etc. for tools to use
            
        Returns:
            Agent's response as a string
        """
        print(f"📥 Base agent received question: {question[:100]}...")
        try:
            # Set API token in thread-local storage so tools can access it
            if context and 'api_token' in context:
                from tools.mcp_tools import set_api_token_for_thread
                set_api_token_for_thread(context['api_token'])
                print(f"🔑 API token set in thread-local storage")
            
            # Build input with context information
            agent_input = {
                "input": question,
                "chat_history": []
            }
            
            # If context provided, add users_id to input so agent knows to use it in tools
            if context:
                if 'users_id' in context:
                    # Add users_id to input so agent can use it when calling get_user_profile
                    agent_input['input'] = f"[User ID: {context['users_id']}] {question}"
                    print(f"👤 Added user ID {context['users_id']} to input")
                    # Also store in context for tools
                    agent_input['context'] = context
                if 'api_token' in context:
                    agent_input['api_token'] = context['api_token']
            
            print(f"🚀 Invoking agent executor with input: {agent_input['input'][:100]}...")
            result = self.agent_executor.invoke(agent_input)
            print(f"✅ Agent executor completed")
            
            # Check if agent stopped due to max iterations
            output = result.get("output", "")
            if "Agent stopped due to max iterations" in output or "max iterations" in output.lower():
                print(f"⚠️  Agent hit max iterations, returning generic response")
                # Return a generic helpful message (not job-specific)
                return "I apologize, but I'm having trouble processing your request. Could you please rephrase your question or provide more details? I'm here to help with questions about Kozi, job searching, profile management, and more."
            
            print(f"📤 Agent output: {output[:200] if output else 'Empty'}...")
            return output if output else "I apologize, but I couldn't generate a response."
        except Exception as error:
            error_str = str(error)
            print(f"❌ Error processing question: {error}")
            import traceback
            print(f"📋 Traceback: {traceback.format_exc()}")
            
            # Check for max iterations in exception message
            if "max iterations" in error_str.lower() or "max_iterations" in error_str.lower():
                print(f"⚠️  Max iterations error detected, returning generic response")
                return "I apologize, but I'm having trouble processing your request. Could you please rephrase your question or provide more details? I'm here to help with questions about Kozi, job searching, profile management, and more."
            
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
        context: Optional[Dict] = None
    ) -> str:
        """
        Answer a question with conversation history.
        
        Args:
            question: User's current question
            chat_history: List of previous messages in format [{"role": "user"|"assistant", "content": "..."}]
            context: Optional context dict with users_id, api_token, etc. for tools to use
            
        Returns:
            Agent's response as a string
        """
        print(f"📥 Base agent answer_with_history - Question: {question[:100]}...")
        print(f"📚 Chat history length: {len(chat_history) if chat_history else 0}")
        try:
            # Set API token in thread-local storage so tools can access it
            if context and 'api_token' in context:
                from tools.mcp_tools import set_api_token_for_thread
                set_api_token_for_thread(context['api_token'])
                print(f"🔑 API token set in thread-local storage")
            
            if chat_history is None:
                chat_history = []
            
            # Convert chat history to LangChain message format
            messages = []
            for msg in chat_history:
                role = msg.get("role", "")
                content = msg.get("content", "")
                
                if role == "user":
                    messages.append(HumanMessage(content=content))
                elif role == "assistant":
                    messages.append(AIMessage(content=content))
            
            print(f"📝 Converted {len(messages)} messages from chat history")
            
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
                    print(f"👤 Added user ID {context['users_id']} to input")
                    # Also store in context for tools
                    agent_input['context'] = context
                if 'api_token' in context:
                    agent_input['api_token'] = context['api_token']
            
            print(f"🚀 Invoking agent executor with history...")
            # Use agent executor with history
            result = self.agent_executor.invoke(agent_input)
            print(f"✅ Agent executor completed")
            
            # Check if agent stopped due to max iterations
            output = result.get("output", "")
            if "Agent stopped due to max iterations" in output or "max iterations" in output.lower():
                print(f"⚠️  Agent hit max iterations, returning generic response")
                # Return a generic helpful message (not job-specific)
                return "I apologize, but I'm having trouble processing your request. Could you please rephrase your question or provide more details? I'm here to help with questions about Kozi, job searching, profile management, and more."
            
            print(f"📤 Agent output: {output[:200] if output else 'Empty'}...")
            return output if output else "I apologize, but I couldn't generate a response."
        except Exception as error:
            error_str = str(error)
            print(f"❌ Error processing question with history: {error}")
            import traceback
            print(f"📋 Traceback: {traceback.format_exc()}")
            
            # Check for max iterations in exception message
            if "max iterations" in error_str.lower() or "max_iterations" in error_str.lower():
                print(f"⚠️  Max iterations error detected, returning generic response")
                return "I apologize, but I'm having trouble processing your request. Could you please rephrase your question or provide more details? I'm here to help with questions about Kozi, job searching, profile management, and more."
            
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

