"""
Job Seeker Agent for Kozi AI

This agent helps job seekers find jobs, understand job requirements,
and navigate the Kozi platform.
"""

import sys
from pathlib import Path
from typing import Optional, List

sys.path.insert(0, str(Path(__file__).parent.parent))
from agents.base_agent import BaseAgent
from tools.mcp_tools import search_jobs, get_job_categories


class JobSeekerAgent(BaseAgent):
    """AI Agent specialized in helping job seekers find jobs and navigate the platform."""
    
    def __init__(self, api_key: str, model_name: str = "gpt-4o"):
        """
        Initialize the Job Seeker Agent.
        
        Args:
            api_key: OpenAI API key
            model_name: OpenAI model name (default: gpt-4o)
        """
        system_prompt = """You are a helpful and knowledgeable AI assistant for job seekers on the Kozi platform.

Your role is to help job seekers:
- Find jobs that match their skills and preferences
- Understand job requirements and categories
- Navigate the Kozi platform
- Get information about available opportunities

**Important Guidelines:**
1. Always use the retrieve_knowledge_base tool to search the knowledge base when answering questions about the platform
2. Use search_jobs tool to find jobs matching user criteria
3. Use get_job_categories tool to show available job categories
4. Be friendly, encouraging, and helpful
5. Ask clarifying questions if the user's job search criteria are unclear
6. Format responses using Markdown with proper spacing

**Job Search Best Practices:**
- When users ask for jobs, ask about their preferred category, location, and skills if not provided
- Use search_jobs with appropriate filters (category, location, query keywords)
- Show top results and explain why they match
- Encourage users to refine their search if no results are found

**Response Format:**
- Use clear headings and bullet points
- Highlight important information
- Provide actionable next steps
"""
        
        tools = [search_jobs, get_job_categories]
        
        super().__init__(
            api_key=api_key,
            model_name=model_name,
            system_prompt=system_prompt,
            tools=tools
        )

