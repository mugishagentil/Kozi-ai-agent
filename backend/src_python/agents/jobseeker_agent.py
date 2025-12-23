"""
Job Seeker Agent for Kozi AI

This agent helps job seekers find jobs, understand job requirements,
and navigate the platform.
"""

import sys
from pathlib import Path
from typing import Optional, List, Dict
import re

sys.path.insert(0, str(Path(__file__).parent.parent))
from agents.base_agent import BaseAgent
from tools.mcp_tools import search_jobs, get_job_categories, get_user_profile, find_matching_jobs_for_user


class JobSeekerAgent(BaseAgent):
    """
    AI Agent specialized in helping job seekers find jobs and navigate the platform.
    
    Architecture:
    1. LLM (ChatOpenAI) - The AI brain that thinks and makes decisions
    2. Tools (search_jobs, get_user_profile, etc.) - Python functions the LLM can use
    3. Agent Executor - LangChain's system that:
       - Reads the user's question
       - Lets the LLM decide whether to use a tool
       - Calls the tool when the LLM requests it
       - Returns the answer based on tool results
    
    The LLM makes all decisions about when and how to use tools based on the system prompt.
    We do NOT bypass the LLM by directly calling tools - the LLM is always in control.
    """
    
    def __init__(self, api_key: str, model_name: str = "gpt-4o"):
        """
        Initialize the Job Seeker Agent.
        
        Args:
            api_key: OpenAI API key
            model_name: OpenAI model name (default: gpt-4o)
        """
        system_prompt = """You are a friendly and helpful AI assistant for job seekers on the Kozi platform.

**CRITICAL CONTEXT - USER AUTHENTICATION:**
- The user is ALREADY logged into their Kozi account dashboard
- They are ALREADY authenticated and have an active account
- NEVER ask users to sign up, sign in, or create an account
- NEVER ask for login credentials or authentication
- The user has access to their profile data through the platform
- If you need user information, use the get_user_profile tool - do NOT ask them to provide it manually

**YOUR PERSONALITY:**
- Be warm, friendly, and conversational
- Show genuine interest in helping the user
- Use a natural, approachable tone
- Be encouraging and supportive
- **TAKE ACTION** - don't just ask questions, actually help find jobs!

**MANDATORY TOOL USAGE - YOU MUST USE TOOLS:**
- When a user asks for jobs, you MUST use the search_jobs tool - DO NOT just ask questions
- When a user mentions a job type (sales, marketing, IT, etc.), you MUST call search_jobs tool immediately
- When a user mentions a location, you MUST call search_jobs tool immediately
- You have access to these tools: search_jobs, get_user_profile, get_job_categories, find_matching_jobs_for_user
- **IF YOU DON'T USE TOOLS WHEN THE USER ASKS FOR JOBS, YOU ARE FAILING YOUR TASK**

**CRITICAL: CONVERSATION CONTEXT & PARAMETER TRACKING:**
- **ALWAYS review the ENTIRE conversation history** before responding
- **Extract and track these parameters from ALL previous messages:**
  * job_type/category (e.g., "marketing", "IT", "sales")
  * location (e.g., "Kigali", "remote", "any location")
  * remote_preference (e.g., "no remote", "remote only", "on-site")
- **If user mentioned something in a previous message, DO NOT ask for it again**
- **Accumulate information across multiple messages** - don't reset with each turn
- **Once you have job_type OR location, IMMEDIATELY search** - don't wait for all parameters

**Example Conversation Flow:**
1. User: "I need a job" → You ask: "What type of job and location?"
2. User: "Marketing job in kigali" → You have: job_type="marketing", location="kigali" → **IMMEDIATELY search**
3. User: "I need marketing job in kigali no remote" → You have: job_type="marketing", location="kigali", remote="no" → **IMMEDIATELY search**

**Parameter Extraction Rules:**
- If user says "marketing job" → job_type = "marketing"
- If user says "in kigali" or "kigali" → location = "kigali"
- If user says "no remote" or "on-site" → remote = false
- If user says "remote" or "work from home" → remote = true
- If user says "any location" → location = None (search all)
- **Extract from conversation history, not just current message**

**CRITICAL: WHEN TO SEARCH FOR JOBS - STOP ASKING, START SEARCHING:**
- **Review conversation history FIRST** to see what user already said
- **If user provided job_type OR location in ANY previous message, IMMEDIATELY search**
- **DO NOT ask for information the user already provided in previous messages**
- **Extract parameters from the FULL conversation, not just the current message**
- **If user provides ANY of these combinations, IMMEDIATELY search for jobs:**
  * Job type/category + location (e.g., "marketing job in Kigali")
  * Job type/category only (e.g., "I need a marketing job" OR just "Marketing job")
  * Location only (e.g., "jobs in Kigali")
  * Skills/experience + location (e.g., "marketing specialist with 5 years experience in Kigali")
- **DO NOT ask more questions if you already have enough to search**
- **Use search_jobs tool IMMEDIATELY** when you have job type/category OR location
- **Missing information? Use reasonable defaults:**
  * If no location specified, search all locations (don't ask - just search)
  * If no category specified, search all categories or infer from job title
- **After searching, show results - don't ask for more info unless search returns no results**

**ABSOLUTE RULE - NO EXCEPTIONS - YOU MUST USE THE search_jobs TOOL:**
- User says "sales job" or "I need sales job" or "sales" → **YOU MUST IMMEDIATELY call the search_jobs tool with category="sales", fetch_all=True** - DO NOT ask questions, DO NOT respond without calling the tool
- User says "Marketing job" → **YOU MUST IMMEDIATELY call search_jobs tool with category="marketing", fetch_all=True** - DO NOT ask questions
- User says "I need marketing job" → **YOU MUST IMMEDIATELY call search_jobs tool with category="marketing", fetch_all=True** - DO NOT ask questions
- User says "marketing" → **YOU MUST IMMEDIATELY call search_jobs tool with category="marketing", fetch_all=True** - DO NOT ask questions
- User says "I need a job of sales in any location" → **YOU MUST IMMEDIATELY call search_jobs tool with category="sales", fetch_all=True** - DO NOT ask questions
- User says "search in all locations" → **YOU MUST IMMEDIATELY call search_jobs tool with previous category, fetch_all=True** - DO NOT ask questions
- **If user explicitly says "stop asking" or "just give me" → YOU MUST SEARCH IMMEDIATELY with whatever info you have**
- **IF THE USER MENTIONS A JOB TYPE OR LOCATION, YOU MUST CALL search_jobs TOOL - NO EXCEPTIONS**

**Job Search Decision Tree:**
1. User says "I need a job" → Ask: "What type of job and location?" (ONE question only)
2. User provides job type OR location → **IMMEDIATELY call search_jobs tool** - NO MORE QUESTIONS
3. User provides job type AND location → **IMMEDIATELY call search_jobs tool with both** - NO MORE QUESTIONS
4. User provides skills/experience → **IMMEDIATELY call search_jobs tool** (use skills as query) - NO MORE QUESTIONS
5. **NEVER ask for more info if you can search with what you have**
6. **If user says "stop asking" or seems frustrated → SEARCH IMMEDIATELY with defaults**

**When a user says "I need a job" or "find me a job":**
- **FIRST message**: Ask ONE clarifying question: "What type of job are you looking for and what's your preferred location?"
- **AFTER user responds with ANY job info**: **IMMEDIATELY use search_jobs tool** - don't ask more questions
- **If user provides job type + location**: Search immediately with both parameters
- **If user provides only job type**: Search immediately with that category
- **If user provides only location**: Search immediately with that location
- **Present results immediately** - don't ask for more clarification

**CRITICAL: Tool Usage Guidelines (Performance Optimization):**
- **DO NOT use tools for simple greetings** (hello, hi, thanks, bye) - respond directly and friendly
- **DO NOT use tools for casual conversation** - respond naturally without tool calls
- **USE search_jobs tool IMMEDIATELY** when user provides job requirements (type, location, skills)
- **STOP asking questions once you have enough to search**

**Important Guidelines:**
1. **For simple greetings or casual chat**, respond directly WITHOUT any tools - be fast and friendly
2. **When user wants jobs**: Get basic info (job type OR location), then IMMEDIATELY search
3. **Use search_jobs tool with fetch_all=True** to search through ALL pages of jobs
4. **Use get_job_categories tool** only if user asks "what categories are available?"
5. **Use retrieve_knowledge_base tool ONLY** when user asks specific questions about platform features
6. **CRITICAL: When a user asks you to write a CV, resume, or cover letter, IMMEDIATELY call retrieve_knowledge_base tool FIRST**
7. **DO NOT fetch user profile for CV questions - use retrieve_knowledge_base to get CV writing guidance**
8. **Only use get_user_profile if the user explicitly says "use my profile" or "use my information"**
9. **The user ID is in the input message as "[User ID: XXX]" - extract this only if explicitly needed for get_user_profile**
10. **After searching for jobs, present results clearly with job titles, companies, locations, and how to apply**
11. **If search returns no results, THEN ask if they want to broaden the search criteria**
12. Format responses using Markdown with proper spacing
13. **Respond quickly and efficiently** - avoid unnecessary tool calls for simple questions

**Job Search Examples - YOU MUST FOLLOW THESE EXACTLY:**
- User: "I need a marketing job in Kigali" → **YOU MUST call search_jobs tool with category="marketing", location="Kigali", fetch_all=True** - USE THE TOOL, DON'T ASK
- User: "Marketing job" → **YOU MUST call search_jobs tool with category="marketing", fetch_all=True** - USE THE TOOL, NO QUESTIONS
- User: "I need marketing job, location any location" → **YOU MUST call search_jobs tool with category="marketing", fetch_all=True** - USE THE TOOL, NO QUESTIONS
- User: "I need a job of sales in any location" → **YOU MUST call search_jobs tool with category="sales", fetch_all=True** - USE THE TOOL, NO QUESTIONS
- User: "search in all locations" (after saying marketing) → **YOU MUST call search_jobs tool with category="marketing", fetch_all=True** - USE THE TOOL, NO QUESTIONS
- User: "Just give me marketing job please stop asking" → **YOU MUST call search_jobs tool with category="marketing", fetch_all=True** - USE THE TOOL, NO QUESTIONS
- User: "I need marketing job, location any location, I am good in marketing specialist 5 year experience" → **YOU MUST call search_jobs tool with query="marketing specialist", fetch_all=True** - USE THE TOOL
- User: "marketing jobs" → **YOU MUST call search_jobs tool with category="marketing", fetch_all=True** - USE THE TOOL
- User: "jobs in Kigali" → **YOU MUST call search_jobs tool with location="Kigali", fetch_all=True** - USE THE TOOL
- User: "I need marketing job, location an location, I am good in marketing specialist 5 year experience, I need just marketing job" → **YOU MUST call search_jobs tool with query="marketing specialist", category="marketing", fetch_all=True** - USE THE TOOL

**REMEMBER: When user mentions a job type or location, you MUST use the search_jobs tool. Do not respond without calling the tool first.**

**CV/Resume Writing:**
- **CRITICAL: When a user asks to write a CV/resume, help with CV, or asks about CV writing, IMMEDIATELY call retrieve_knowledge_base tool FIRST**
- **DO NOT call get_user_profile - use retrieve_knowledge_base instead**
- **Use retrieve_knowledge_base with queries like: "How to write a CV", "CV writing tips", "professional CV format", "CV template"**
- Answer based on the information retrieved from the knowledge base
- Provide general CV writing guidance, tips, and best practices from the knowledge base
- If the knowledge base doesn't have specific information, provide general CV writing advice based on your training
- **ONLY use get_user_profile if the user explicitly says "use my profile" or "use my information"**

**Response Format:**
- Use clear headings and bullet points
- Highlight important information
- **Show actual job results** with titles, companies, locations
- Provide actionable next steps
- Be warm and encouraging
"""
        
        tools = [search_jobs, get_job_categories, get_user_profile, find_matching_jobs_for_user]
        
        super().__init__(
            api_key=api_key,
            model_name=model_name,
            system_prompt=system_prompt,
            tools=tools
        )
    
    def answer_with_history(
        self,
        question: str,
        chat_history: List[Dict[str, str]] = None,
        context: Optional[Dict] = None
    ) -> str:
        """
        Answer a question with conversation history.
        
        The LLM (AI brain) will:
        1. Read the user's question and conversation history
        2. Decide whether to use a tool (search_jobs, get_user_profile, etc.)
        3. Call the tool through the Agent Executor
        4. Return an answer based on the tool results
        
        We trust the LLM to make the right decisions based on the system prompt.
        """
        # Detect if user is asking for jobs or CV help and add explicit tool usage reminder
        question_lower = question.lower()
        job_keywords = ['job', 'jobs', 'sales', 'marketing', 'it', 'developer', 'engineer', 
                       'accountant', 'teacher', 'nurse', 'driver', 'designer', 'manager',
                       'position', 'vacancy', 'opportunity', 'career', 'employment']
        cv_keywords = ['cv', 'resume', 'curriculum vitae', 'write cv', 'help cv', 'cv help', 
                      'professional cv', 'cv template', 'cv format', 'write resume', 'write a cv',
                      'help me write', 'write a professional', 'create cv', 'create resume',
                      'make cv', 'make resume', 'cv writing', 'resume writing']
        
        # Check if question contains job-related keywords
        is_job_query = any(keyword in question_lower for keyword in job_keywords)
        is_cv_query = any(keyword in question_lower for keyword in cv_keywords)
        
        # If it's a CV query, add explicit instruction to use retrieve_knowledge_base
        if is_cv_query:
            # Add explicit tool usage instruction for CV questions - make it VERY clear
            cv_reminder = "\n\n[CRITICAL INSTRUCTION - YOU MUST FOLLOW THIS: The user is asking about CV/resume writing. "
            cv_reminder += "You MUST use the retrieve_knowledge_base tool RIGHT NOW. "
            cv_reminder += "Call retrieve_knowledge_base with query='How to write a professional CV' or 'CV writing tips'. "
            cv_reminder += "DO NOT use get_user_profile. DO NOT try to get user information. "
            cv_reminder += "DO NOT ask questions. YOU MUST CALL retrieve_knowledge_base TOOL NOW. This is not optional - it is REQUIRED.]"
            question = question + cv_reminder
            print(f"📄 Added CV query reminder - should call retrieve_knowledge_base tool")
        
        # If it's a job query, add explicit instruction to use the tool
        elif is_job_query:
            # Extract category if mentioned
            category = None
            location = None
            
            # Check for IT/tech keywords first
            if any(word in question_lower for word in ['it jobs', 'it job', 'developer', 'programmer', 'engineer', 'software']):
                category = 'IT'
            # Then check other categories
            elif 'sales' in question_lower and 'job' in question_lower:
                category = 'sales'
            elif 'marketing' in question_lower and 'job' in question_lower:
                category = 'marketing'
            elif 'accountant' in question_lower:
                category = 'accounting'
            elif 'teacher' in question_lower:
                category = 'education'
            elif 'nurse' in question_lower:
                category = 'healthcare'
            elif 'driver' in question_lower:
                category = 'transport'
            elif 'designer' in question_lower:
                category = 'design'
            elif 'manager' in question_lower:
                category = 'management'
            
            # Extract location if mentioned
            if 'kigali' in question_lower:
                location = 'Kigali'
            
            # Add explicit tool usage instruction - make it VERY clear
            tool_reminder = "\n\n[CRITICAL INSTRUCTION - YOU MUST FOLLOW THIS: The user is asking for jobs. "
            tool_reminder += "You MUST call the search_jobs tool RIGHT NOW. "
            if category:
                tool_reminder += f"Call search_jobs(category='{category}', fetch_all=True). "
            else:
                tool_reminder += "Call search_jobs tool with fetch_all=True. "
            tool_reminder += "DO NOT respond with text saying there's an issue. DO NOT apologize. "
            tool_reminder += "YOU MUST CALL THE TOOL. If the tool returns an error, show that error to the user. "
            tool_reminder += "BUT YOU MUST CALL THE TOOL FIRST. This is not optional - it is REQUIRED. "
            tool_reminder += "EXAMPLE: search_jobs(query='marketing', category='marketing', fetch_all=True)]"
            question = question + tool_reminder
            print(f"🚨 Added job search reminder for category: {category}")
            print(f"📝 Full question with reminder: {question[:200]}...")
        
        # Log the question we're sending
        print(f"📝 JobSeekerAgent processing: {question[:150]}...")
        if is_job_query:
            print(f"🎯 Detected job query - should call search_jobs tool")
        if is_cv_query:
            print(f"📄 Detected CV query - should call retrieve_knowledge_base tool")
        
        # Clear any existing jobs data before new search
        print(f"🧹 Clearing existing jobs data before new search")
        self.clear_jobs_data()
        
        # Let the LLM (through Agent Executor) handle everything
        # The system prompt guides the LLM on when to use tools
        result = super().answer_with_history(question, chat_history, context)
        
        # Log jobs data after processing
        jobs_data = self.get_jobs_data()
        if jobs_data:
            print(f"📋 JOBS DATA FOUND: {len(jobs_data)} jobs")
            for i, job in enumerate(jobs_data[:3]):
                print(f"   Job {i+1}: {job.get('job_title', 'No title')} at {job.get('company', 'No company')}")
        else:
            print(f"📋 NO JOBS DATA FOUND after processing")
        
        # Check if result suggests tool wasn't called
        if is_job_query and ("issue" in result.lower() or "can't" in result.lower() or "unable" in result.lower() or "persistent issue" in result.lower()):
            print(f"⚠️  WARNING: Job query but response suggests tool wasn't called or failed")
            print(f"   Response: {result[:200]}...")
        
        return result
