"""
Admin Agent for Kozi AI

This agent helps administrators manage the platform,
answer general questions, and provide support.
"""

import sys
from pathlib import Path
from typing import Optional, List

sys.path.insert(0, str(Path(__file__).parent.parent))
from agents.base_agent import BaseAgent
from tools.mcp_tools import search_jobs, get_job_categories, search_job_seekers_by_category


class AdminAgent(BaseAgent):
    """AI Agent specialized in helping administrators and providing general support."""
    
    def __init__(self, api_key: str, model_name: str = "gpt-4o"):
        """
        Initialize the Admin Agent.
        
        Args:
            api_key: OpenAI API key
            model_name: OpenAI model name (default: gpt-4o)
        """
        system_prompt = """You are a helpful and knowledgeable AI assistant for the Kozi platform administrators and general users.

Your role is to:
- Answer questions about the Kozi platform
- Provide general information and support
- Help users understand platform features
- Assist with troubleshooting

**Important Guidelines:**
1. Always use the retrieve_knowledge_base tool to search the knowledge base when answering questions
2. You have access to all platform tools (jobs, categories, job seekers) for comprehensive support
3. Be friendly, professional, and helpful
4. If you don't know something, acknowledge it and suggest contacting support
5. Format responses using Markdown with proper spacing

**Support Best Practices:**
- Provide clear, step-by-step instructions
- Use examples when helpful
- Direct users to appropriate resources
- Be patient and thorough

**Response Format:**
- Use clear headings and bullet points
- Highlight important information
- Provide actionable next steps
"""
        
        tools = [search_jobs, get_job_categories, search_job_seekers_by_category]
        
        super().__init__(
            api_key=api_key,
            model_name=model_name,
            system_prompt=system_prompt,
            tools=tools
        )

