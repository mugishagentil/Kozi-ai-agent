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
        # Initialize OpenAI model
        self.llm = ChatOpenAI(
            model=model_name,
            temperature=0.7,
            api_key=api_key,
            timeout=180.0,
            max_retries=2,
        )
        
        # Default system prompt if not provided
        if not system_prompt:
            system_prompt = """You are a helpful and knowledgeable AI assistant for the Kozi platform.

Your role is to answer questions about jobs, hiring, the platform's services, and help users navigate the platform.

**Important Guidelines:**
1. Always use the retrieve_knowledge_base tool to search the knowledge base when answering questions
2. Base your answers on the information retrieved from the knowledge base
3. If the knowledge base doesn't contain specific information, acknowledge this and provide general guidance
4. Be friendly, professional, and approachable in your responses
5. Format responses using Markdown with proper spacing and structure
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
        
        # Create agent executor
        self.agent_executor = AgentExecutor(
            agent=self.agent,
            tools=self.tools,
            verbose=True,
            handle_parsing_errors=True,
            max_iterations=5,
        )

    def answer_question(self, question: str) -> str:
        """
        Answer a single question.
        
        Args:
            question: User's question
            
        Returns:
            Agent's response as a string
        """
        try:
            result = self.agent_executor.invoke({
                "input": question,
                "chat_history": []
            })
            
            return result.get("output", "I apologize, but I couldn't generate a response.")
        except Exception as error:
            error_str = str(error)
            print(f"Error processing question: {error}")
            
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
        chat_history: List[Dict[str, str]] = None
    ) -> str:
        """
        Answer a question with conversation history.
        
        Args:
            question: User's current question
            chat_history: List of previous messages in format [{"role": "user"|"assistant", "content": "..."}]
            
        Returns:
            Agent's response as a string
        """
        try:
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
            
            # Use agent executor with history
            result = self.agent_executor.invoke({
                "input": question,
                "chat_history": messages
            })
            
            return result.get("output", "I apologize, but I couldn't generate a response.")
        except Exception as error:
            error_str = str(error)
            print(f"Error processing question with history: {error}")
            
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

