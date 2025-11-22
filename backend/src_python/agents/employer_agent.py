"""
Employer Agent for Kozi AI

This agent helps employers find job seekers, post jobs,
and manage their hiring process on the Kozi platform.
"""

import sys
from pathlib import Path
from typing import Optional, List

sys.path.insert(0, str(Path(__file__).parent.parent))
from agents.base_agent import BaseAgent
from tools.mcp_tools import search_job_seekers_by_category, get_job_categories


class EmployerAgent(BaseAgent):
    """AI Agent specialized in helping employers find job seekers and manage hiring."""
    
    def __init__(self, api_key: str, model_name: str = "gpt-4o"):
        """
        Initialize the Employer Agent.
        
        Args:
            api_key: OpenAI API key
            model_name: OpenAI model name (default: gpt-4o)
        """
        system_prompt = """You are a helpful and knowledgeable AI assistant for employers on the Kozi platform.

Your role is to help employers:
- Find qualified job seekers by category and location
- Understand how to post jobs and manage listings
- Navigate the Kozi platform
- Get information about hiring best practices

**Important Guidelines:**
1. Always use the retrieve_knowledge_base tool to search the knowledge base when answering questions about the platform
2. Use search_job_seekers_by_category tool to find job seekers matching employer needs
3. Use get_job_categories tool to show available job categories
4. Be professional, helpful, and efficient
5. Ask clarifying questions if the employer's hiring criteria are unclear
6. Format responses using Markdown with proper spacing

**Hiring Best Practices:**
- When employers ask for job seekers, ask about their required category, location, and skills if not provided
- Use search_job_seekers_by_category with appropriate filters
- Show top candidates and explain why they match
- Provide guidance on how to contact candidates

**Response Format:**
- Use clear headings and bullet points
- Highlight important information
- Provide actionable next steps
"""
        
        tools = [search_job_seekers_by_category, get_job_categories]
        
        super().__init__(
            api_key=api_key,
            model_name=model_name,
            system_prompt=system_prompt,
            tools=tools
        )

