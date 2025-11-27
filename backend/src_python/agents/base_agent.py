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
        # LangChain Chain Structure with three roles:
        #
        # ROLE 1: SYSTEM (SystemMessage)
        #   - Defines AI behavior, instructions, personality, and tool usage guidelines
        #   - Set once during initialization, guides all AI responses
        #
        # ROLE 2: HUMAN (HumanMessage) 
        #   - User's messages and questions
        #   - Stored in chat_history for context
        #   - Current input: "{input}" placeholder
        #
        # ROLE 3: AI (AIMessage)
        #   - Assistant's responses and tool call decisions
        #   - Stored in chat_history for context
        #   - Tool usage tracked in agent_scratchpad
        #
        # The chain flow: System → [History: Human/AI pairs] → Human (current) → AI (response + tools)
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
        
        # Create agent executor with verbose mode to debug tool calls
        self.agent_executor = AgentExecutor(
            agent=self.agent,
            tools=self.tools,
            verbose=True,  # Enabled to debug tool calls - see what LLM decides
            handle_parsing_errors=True,
            max_iterations=5,  # Increased to 5 to allow tool calls (was 2 - too low, causing max iterations errors)
            max_execution_time=30,  # Increased to 30 seconds to allow API calls
            return_intermediate_steps=True,  # Return intermediate steps to see tool calls
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
        try:
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
                if 'api_token' in context:
                    # Store API token in environment so tools can access it
                    import os
                    os.environ['API_TOKEN'] = context['api_token']
                    print(f"🔑 API token set in environment for tools")
            
            # Log what we're sending to the agent
            print(f"📤 Sending to agent: {question[:100]}...")
            print(f"🛠️  Available tools: {[tool.name for tool in self.tools]}")
            
            result = self.agent_executor.invoke(agent_input)
            
            # Log intermediate steps to see if tools were called
            if 'intermediate_steps' in result:
                print(f"🔧 Intermediate steps: {len(result['intermediate_steps'])}")
                for i, step in enumerate(result['intermediate_steps']):
                    print(f"   Step {i+1}: {step}")
            
            # Check if agent stopped due to max iterations
            output = result.get("output", "")
            if "Agent stopped due to max iterations" in output or "max iterations" in output.lower():
                # Return a helpful message that encourages the user to provide more specific info
                return "I want to help you find the perfect job! Could you provide a bit more detail? For example:\n- What type of job are you looking for? (e.g., marketing, IT, sales)\n- What's your preferred location? (e.g., Kigali, remote)\n\nOnce I have this information, I'll search for matching jobs right away!"
            
            return output if output else "I apologize, but I couldn't generate a response."
        except Exception as error:
            error_str = str(error)
            print(f"Error processing question: {error}")
            
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
        try:
            if chat_history is None:
                chat_history = []
            
            # Convert chat history to LangChain message format with explicit roles
            # System role: AI instructions (already in prompt template)
            # Human role: user messages
            # AI role: assistant responses
            messages = []
            for msg in chat_history:
                role = msg.get("role", "")
                content = msg.get("content", "")
                
                if role == "user":
                    # Human role: user's messages
                    messages.append(HumanMessage(content=content))
                elif role == "assistant":
                    # AI role: assistant's previous responses
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
            
            # Log what we're sending to the agent
            print(f"📤 Sending to agent: {question[:100]}...")
            print(f"📚 Chat history: {len(messages)} messages")
            print(f"🛠️  Available tools: {[tool.name for tool in self.tools]}")
            
            # Use agent executor with history
            result = self.agent_executor.invoke(agent_input)
            
            # Log intermediate steps to see if tools were called
            if 'intermediate_steps' in result:
                print(f"🔧 Intermediate steps: {len(result['intermediate_steps'])}")
                for step in result['intermediate_steps']:
                    print(f"   Step: {step}")
            
            # Check if agent stopped due to max iterations
            output = result.get("output", "")
            if "Agent stopped due to max iterations" in output or "max iterations" in output.lower():
                # Return a helpful message that encourages the user to provide more specific info
                return "I want to help you find the perfect job! Could you provide a bit more detail? For example:\n- What type of job are you looking for? (e.g., marketing, IT, sales)\n- What's your preferred location? (e.g., Kigali, remote)\n\nOnce I have this information, I'll search for matching jobs right away!"
            
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

