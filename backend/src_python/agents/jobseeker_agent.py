"""
Job Seeker Agent for Kozi AI

This agent helps job seekers find jobs, understand job requirements,
and navigate the Kozi platform.
"""

import sys
from pathlib import Path
from typing import Optional, List, Dict
import re

sys.path.insert(0, str(Path(__file__).parent.parent))
from agents.base_agent import BaseAgent
from tools.mcp_tools import search_jobs, get_job_categories, get_user_profile, find_matching_jobs_for_user, API_BASE_URL
import os


class JobSeekerAgent(BaseAgent):
    """AI Agent specialized in helping job seekers find jobs and navigate the platform."""
    
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
- If user says "marketing job" or "marketing" → job_type = "marketing"
- If user says "sales job" or "sale job" or "sales" or "sale" → job_type = "sales"
- If user says "in kigali" or "kigali" → location = "kigali"
- If user says "no remote" or "on-site" → remote = false
- If user says "remote" or "work from home" → remote = true
- If user says "any location", "all locations", "anywhere", "any location" → location = None (search ALL locations)
- **"Any location" means search everywhere - DO NOT ask for location, just search**
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

**ABSOLUTE RULE - NO EXCEPTIONS:**
- User says "Marketing job" → **IMMEDIATELY call search_jobs(category="marketing", fetch_all=True)** - DO NOT ask questions
- User says "I need marketing job" → **IMMEDIATELY call search_jobs(category="marketing", fetch_all=True)** - DO NOT ask questions
- User says "marketing" → **IMMEDIATELY call search_jobs(category="marketing", fetch_all=True)** - DO NOT ask questions
- User says "search in all locations" → **IMMEDIATELY call search_jobs with previous category, fetch_all=True** - DO NOT ask questions
- **If user explicitly says "stop asking" or "just give me" → SEARCH IMMEDIATELY with whatever info you have**

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

**CRITICAL: MANDATORY API CALLS FOR JOB SEARCHES:**
- **When ANY user asks for jobs, you MUST call search_jobs tool** - this calls JOBS_API_URL
- **The search_jobs tool uses JOBS_API_URL to fetch real jobs from the Kozi platform**
- **If user asks about categories or you need to validate a category, call get_job_categories tool** - this calls JOB_CATEGORIES_API
- **When user asks about a specific job** (e.g., "tell me about the first one", "what about job ID 97", "details of the second job"), **you MUST call get_job_details tool** with the job ID extracted from chat history
- **When user asks about salary/payment** (e.g., "find me the one paid more", "which pays more", "highest salary"), **extract all job IDs from the previous job list in chat history, fetch details for each job, compare salaries, and return the highest paying job**
- **ALWAYS stay in the same job category** - if user asked for sales jobs, keep showing sales jobs, don't switch to marketing or other categories
- **ALWAYS check chat history** to find job IDs when user refers to jobs by position (first, second, etc.) or mentions job details from previous messages
- **NEVER make up job listings - ALWAYS use search_jobs tool to get real jobs from JOBS_API_URL**
- **NEVER make up job details - ALWAYS use get_job_details tool to get real job information**
- **If search_jobs returns no results, you can suggest calling get_job_categories to see available categories**

**Important Guidelines:**
1. **For simple greetings or casual chat**, respond directly WITHOUT any tools - be fast and friendly
2. **When user wants jobs**: Get basic info (job type OR location), then IMMEDIATELY call search_jobs tool (uses JOBS_API_URL)
3. **Use search_jobs tool with fetch_all=True** to search through ALL pages of jobs from JOBS_API_URL
4. **Use get_job_categories tool (calls JOB_CATEGORIES_API)** when:
   - User asks "what categories are available?"
   - User asks "what job categories do you have?"
   - You need to validate if a category exists before searching
   - Search returns no results and you want to show available categories
5. **Use retrieve_knowledge_base tool ONLY** when user asks specific questions about platform features
6. **ALWAYS use real API data - search_jobs calls JOBS_API_URL, get_job_categories calls JOB_CATEGORIES_API**
6. **CRITICAL: When a user asks you to write a CV, resume, or cover letter, OR says "use my profile" or "use my information", IMMEDIATELY call get_user_profile tool FIRST**
7. **The user ID is in the input message as "[User ID: XXX]" - you MUST extract this and use it**
8. **To call get_user_profile, pass the FULL input message as input_text parameter: get_user_profile(input_text="[User ID: 418] Help me write a CV")**
9. **Use the user's real information from their profile when writing CVs/resumes**
10. **After searching for jobs, present results clearly with job titles, companies, locations, and how to apply**
11. **If search returns no results, THEN ask if they want to broaden the search criteria**
12. Format responses using Markdown with proper spacing
13. **Respond quickly and efficiently** - avoid unnecessary tool calls for simple questions

**Job Search Examples (ALL use search_jobs tool which calls JOBS_API_URL):**
- User: "I need a marketing job in Kigali" → **IMMEDIATELY call search_jobs(category="marketing", location="Kigali", fetch_all=True)** → Calls JOBS_API_URL
- User: "Marketing job" → **IMMEDIATELY call search_jobs(category="marketing", fetch_all=True)** → Calls JOBS_API_URL - NO QUESTIONS
- User: "I need sale job just in an location" → **IMMEDIATELY call search_jobs(category="sales", fetch_all=True)** → Calls JOBS_API_URL - NO QUESTIONS (recognize "sale" = "sales", "any location" = search all)
- User: "I need sales job in any location" → **IMMEDIATELY call search_jobs(category="sales", fetch_all=True)** → Calls JOBS_API_URL - NO QUESTIONS
- User: "I need marketing job, location any location" → **IMMEDIATELY call search_jobs(category="marketing", fetch_all=True)** → Calls JOBS_API_URL - NO QUESTIONS
- User: "search in all locations" (after saying marketing) → **IMMEDIATELY call search_jobs(category="marketing", fetch_all=True)** → Calls JOBS_API_URL - NO QUESTIONS
- User: "Just give me marketing job please stop asking" → **IMMEDIATELY call search_jobs(category="marketing", fetch_all=True)** → Calls JOBS_API_URL - NO QUESTIONS
- User: "I need marketing job, location any location, I am good in marketing specialist 5 year experience" → **IMMEDIATELY call search_jobs(query="marketing specialist", fetch_all=True)** → Calls JOBS_API_URL
- User: "marketing jobs" → **IMMEDIATELY call search_jobs(category="marketing", fetch_all=True)** → Calls JOBS_API_URL
- User: "jobs in Kigali" → **IMMEDIATELY call search_jobs(location="Kigali", fetch_all=True)** → Calls JOBS_API_URL
- User: "I need marketing job, location an location, I am good in marketing specialist 5 year experience, I need just marketing job" → **IMMEDIATELY call search_jobs(query="marketing specialist", category="marketing", fetch_all=True)** → Calls JOBS_API_URL
- User: "what categories are available?" → **Call get_job_categories()** → Calls JOB_CATEGORIES_API
- User: "show me all job categories" → **Call get_job_categories()** → Calls JOB_CATEGORIES_API

**Job Details Examples (use get_job_details tool):**
- User: "Tell me about the first one" (after job search) → **Call get_job_details(job_id=97)** → Gets full job details
- User: "What about job ID 74?" → **Call get_job_details(job_id=74)** → Gets full job details
- User: "Details of the second job" → **Call get_job_details(job_id=74)** → Gets full job details (extract ID from chat history)
- User: "Tell me briefly about first one" → **Call get_job_details(job_id=97)** → Gets job details and summarize briefly

**CV/Resume Writing:**
- **CRITICAL: When a user asks to write a CV/resume OR says "use my profile" OR "use my information", IMMEDIATELY call get_user_profile tool FIRST**
- **ALWAYS pass the full input message as input_text parameter: get_user_profile(input_text="[User ID: 418] Help me write a CV")**
- The tool will automatically extract the user ID (418) from the input_text
- **NEVER ask the user for their information if you can access their profile - always try get_user_profile first**
- Use the user's actual name, skills, experience, education, and work history from their profile
- Create a professional, well-formatted CV using their real information from the profile
- If profile information is incomplete after fetching, mention what's missing and suggest they complete their profile
- If get_user_profile fails, then ask the user for the missing information

**Response Format:**
- Use clear headings and bullet points
- Highlight important information
- **Show actual job results** with titles, companies, locations
- Provide actionable next steps
- Be warm and encouraging
"""
        
        from tools.mcp_tools import get_job_details
        tools = [search_jobs, get_job_categories, get_user_profile, find_matching_jobs_for_user, get_job_details]
        
        super().__init__(
            api_key=api_key,
            model_name=model_name,
            system_prompt=system_prompt,
            tools=tools
        )
    
    def _extract_job_parameters(self, message: str, chat_history: List[Dict[str, str]] = None) -> Dict[str, Optional[str]]:
        """
        Extract job search parameters from message and conversation history.
        Returns dict with job_type, location, remote_preference.
        """
        params = {}
        
        # Combine current message with all user messages from history
        all_text = message.lower()
        if chat_history:
            for msg in chat_history:
                if msg.get("role") == "user":
                    all_text += " " + msg.get("content", "").lower()
        
        # Extract job type/category - handle both singular and plural forms
        job_keywords = {
            "marketing": "marketing",
            "it": "IT",
            "sales": "sales",
            "sale": "sales",  # Handle singular "sale"
            "developer": "IT",
            "programmer": "IT",
            "accountant": "accounting",
            "teacher": "education",
            "nurse": "healthcare",
            "driver": "transportation",
            "engineer": "IT",
            "designer": "design",
            "manager": "management",
            "customer service": "customer service",
            "receptionist": "administration",
            "cashier": "retail",
            "waiter": "hospitality",
            "chef": "hospitality",
            "security": "security",
            "cleaner": "cleaning",
            "gardener": "maintenance",
            "baby sitter": "childcare",  # Add baby sitter
            "babysitter": "childcare",  # Add babysitter (one word)
            "nanny": "childcare",  # Add nanny
            "childcare": "childcare",  # Add childcare
            "child care": "childcare",  # Add child care (two words)
            "pet sitter": "pet care",  # Add pet sitter
            "petsitter": "pet care",
            "housekeeper": "cleaning",
            "maid": "cleaning",
            "cook": "hospitality",
            "caregiver": "healthcare",
            "elderly care": "healthcare",
            "domestic worker": "domestic",
            "domestic": "domestic"
        }
        for keyword, category in job_keywords.items():
            if keyword in all_text:
                params["job_type"] = category
                break
        
        # Extract location - handle "any location", "all locations", "anywhere"
        location_keywords = ["any location", "all locations", "anywhere", "any location", "all location"]
        has_any_location = any(keyword in all_text for keyword in location_keywords)
        
        if has_any_location:
            # "Any location" means search all - don't set location parameter
            params["location"] = None
            params["search_all_locations"] = True
        elif "kigali" in all_text:
            params["location"] = "kigali"
        elif "remote" in all_text and "no remote" not in all_text and "not remote" not in all_text and "on-site" not in all_text:
            params["location"] = "remote"
        
        # Extract remote preference
        if "no remote" in all_text or "not remote" in all_text or "on-site" in all_text:
            params["remote"] = "false"
        elif "remote" in all_text and params.get("location") != "remote":
            params["remote"] = "true"
            
        return params
    
    def answer_question(self, question: str, context: Optional[Dict] = None) -> str:
        """
        Answer a question - override base method to use enhanced parameter extraction.
        This ensures job searches always use the JOBS_API_URL.
        """
        # Use answer_with_history with empty history (single turn conversation)
        return self.answer_with_history(question, chat_history=None, context=context)
    
    def _detect_salary_query(self, question: str) -> bool:
        """Detect if user is asking about salary/payment."""
        question_lower = question.lower()
        salary_keywords = [
            'paid more', 'pay more', 'highest salary', 'best pay', 'highest pay',
            'most paid', 'better salary', 'higher salary', 'which pays more',
            'salary', 'wage', 'compensation', 'earn more', 'make more',
            'the one paid', 'one paid more', 'find me the one paid'
        ]
        return any(keyword in question_lower for keyword in salary_keywords)
    
    def _extract_all_job_ids_from_history(self, chat_history: List[Dict[str, str]] = None) -> List[int]:
        """Extract all job IDs from the most recent job list in chat history."""
        if not chat_history:
            return []
        
        import re
        job_ids = []
        
        # Search backwards through history to find the most recent job list
        for msg in reversed(chat_history):
            content = msg.get("content", "") or msg.get("text", "")
            if not content:
                continue
            
            # Look for job list pattern (numbered list with IDs)
            lines = content.split('\n')
            for line in lines:
                line_stripped = line.strip()
                # Extract job ID (can be "ID: 97" or "ID:97")
                id_match = re.search(r'ID:\s*(\d+)', line_stripped, re.IGNORECASE)
                if id_match:
                    job_id = int(id_match.group(1))
                    if job_id not in job_ids:
                        job_ids.append(job_id)
            
            # If we found job IDs, return them (most recent list)
            if job_ids:
                print(f"📋 Extracted {len(job_ids)} job IDs from chat history: {job_ids}")
                return job_ids
        
        return []
    
    def _extract_job_reference(self, question: str, chat_history: List[Dict[str, str]] = None) -> Optional[int]:
        """
        Extract job ID from question or chat history when user refers to a job.
        Handles references like "first one", "second job", "job ID 97", "tell me about Digital Financial Services Sales Officer", etc.
        """
        question_lower = question.lower()
        import re
        
        # Check for explicit job ID mention
        id_match = re.search(r'(?:job\s*)?id\s*:?\s*(\d+)', question_lower)
        if id_match:
            try:
                return int(id_match.group(1))
            except:
                pass
        
        # Check for job title references (e.g., "tell me about Digital Financial Services Sales Officer")
        # Extract potential job title from question
        title_keywords = []
        # Look for phrases after "about", "more about", "details of", etc.
        title_patterns = [
            r'(?:tell me|show me|give me|what about|details of|more about|about)\s+(.+?)(?:\?|$|\.)',
            r'(?:the|a|an)\s+(.+?)(?:\s+job|\s+position|\?|$|\.)',
        ]
        
        for pattern in title_patterns:
            match = re.search(pattern, question_lower, re.IGNORECASE)
            if match:
                potential_title = match.group(1).strip()
                # Remove common filler words
                potential_title = re.sub(r'\b(the|a|an|this|that|job|position)\b', '', potential_title, flags=re.IGNORECASE).strip()
                if len(potential_title) > 5:  # Only if it's substantial
                    title_keywords = potential_title.split()
                    break
        
        # If we found title keywords, search chat history for matching job
        if title_keywords and chat_history:
            print(f"🔍 Searching for job with title keywords: {title_keywords}")
            # Search backwards through history to find the most recent job list
            for msg in reversed(chat_history):
                content = msg.get("content", "") or msg.get("text", "")
                if not content:
                    continue
                
                # Look for job entries and try to match by title
                lines = content.split('\n')
                current_job_num = 0
                current_job_title = ""
                current_job_id = None
                
                for line in lines:
                    line_stripped = line.strip()
                    # Detect numbered job entries
                    num_match = re.match(r'^(\d+)\.', line_stripped)
                    if num_match:
                        # Save previous job if we found a match
                        if current_job_id and current_job_title:
                            # Check if title matches
                            title_lower = current_job_title.lower()
                            # Check if all significant keywords are in the title
                            significant_keywords = [kw for kw in title_keywords if len(kw) > 3]
                            if significant_keywords:
                                matches = sum(1 for kw in significant_keywords if kw.lower() in title_lower)
                                if matches >= len(significant_keywords) * 0.6:  # At least 60% of keywords match
                                    print(f"✅ Found matching job: {current_job_title} (ID: {current_job_id})")
                                    return current_job_id
                        
                        current_job_num = int(num_match.group(1))
                        current_job_title = ""
                        current_job_id = None
                        
                        # Extract job title (usually on same line or next line after number)
                        # Pattern: "1. **Job Title**" or "1. Job Title"
                        title_match = re.search(r'\*\*(.+?)\*\*', line_stripped)
                        if title_match:
                            current_job_title = title_match.group(1).strip()
                        else:
                            # Try without markdown
                            title_part = line_stripped.split('.', 1)
                            if len(title_part) > 1:
                                current_job_title = title_part[1].strip()
                    
                    # Extract job ID
                    id_match = re.search(r'ID:\s*(\d+)', line_stripped, re.IGNORECASE)
                    if id_match:
                        current_job_id = int(id_match.group(1))
                
                # Check last job in the list
                if current_job_id and current_job_title:
                    title_lower = current_job_title.lower()
                    significant_keywords = [kw for kw in title_keywords if len(kw) > 3]
                    if significant_keywords:
                        matches = sum(1 for kw in significant_keywords if kw.lower() in title_lower)
                        if matches >= len(significant_keywords) * 0.6:
                            print(f"✅ Found matching job: {current_job_title} (ID: {current_job_id})")
                            return current_job_id
        
        # Check for ordinal references (first, second, third, etc.)
        ordinal_patterns = {
            'first': 1, '1st': 1, 'one': 1,
            'second': 2, '2nd': 2, 'two': 2,
            'third': 3, '3rd': 3, 'three': 3,
            'fourth': 4, '4th': 4, 'four': 4,
            'fifth': 5, '5th': 5, 'five': 5,
        }
        
        for pattern, position in ordinal_patterns.items():
            if pattern in question_lower:
                # Look for job list in chat history
                if chat_history:
                    # Search backwards through history to find the most recent job list
                    for msg in reversed(chat_history):
                        content = msg.get("content", "") or msg.get("text", "")
                        if not content:
                            continue
                        
                        # Look for job list pattern (numbered list with IDs)
                        # Pattern: "1. **Job Title**\n   ... ID: 97"
                        lines = content.split('\n')
                        job_ids = []
                        current_job_num = 0
                        
                        for line in lines:
                            line_stripped = line.strip()
                            # Detect numbered job entries (e.g., "1.", "2.", etc.)
                            num_match = re.match(r'^(\d+)\.', line_stripped)
                            if num_match:
                                current_job_num = int(num_match.group(1))
                            # Extract job ID (can be "ID: 97" or "ID:97")
                            id_match = re.search(r'ID:\s*(\d+)', line_stripped, re.IGNORECASE)
                            if id_match:
                                job_id = int(id_match.group(1))
                                if current_job_num > 0:
                                    job_ids.append((current_job_num, job_id))
                                else:
                                    # If no number found, assume it's the next job
                                    job_ids.append((len(job_ids) + 1, job_id))
                        
                        if job_ids and position <= len(job_ids):
                            # Find job ID at the requested position
                            job_ids.sort(key=lambda x: x[0])  # Sort by position
                            if position <= len(job_ids):
                                found_id = job_ids[position - 1][1]
                                print(f"✅ Found job ID {found_id} for position {position}")
                                return found_id
                
                break
        
        # Check for job title references (e.g., "tell me about Digital Financial Services Sales Officer")
        # Extract potential job title from question
        title_keywords = []
        # Look for phrases after "about", "more about", "details of", etc.
        title_patterns = [
            r'(?:tell me|show me|give me|what about|details of|more about|about)\s+(.+?)(?:\?|$|\.)',
            r'(?:the|a|an)\s+(.+?)(?:\s+job|\s+position|\?|$|\.)',
        ]
        
        for pattern in title_patterns:
            match = re.search(pattern, question_lower, re.IGNORECASE)
            if match:
                potential_title = match.group(1).strip()
                # Remove common filler words
                potential_title = re.sub(r'\b(the|a|an|this|that|job|position)\b', '', potential_title, flags=re.IGNORECASE).strip()
                if len(potential_title) > 5:  # Only if it's substantial
                    title_keywords = potential_title.split()
                    break
        
        # If we found title keywords, search chat history for matching job
        if title_keywords and chat_history:
            print(f"🔍 Searching for job with title keywords: {title_keywords}")
            # Search backwards through history to find the most recent job list
            for msg in reversed(chat_history):
                content = msg.get("content", "") or msg.get("text", "")
                if not content:
                    continue
                
                # Look for job entries and try to match by title
                lines = content.split('\n')
                current_job_num = 0
                current_job_title = ""
                current_job_id = None
                
                for line in lines:
                    line_stripped = line.strip()
                    # Detect numbered job entries
                    num_match = re.match(r'^(\d+)\.', line_stripped)
                    if num_match:
                        # Save previous job if we found a match
                        if current_job_id and current_job_title:
                            # Check if title matches
                            title_lower = current_job_title.lower()
                            # Check if all significant keywords are in the title
                            significant_keywords = [kw for kw in title_keywords if len(kw) > 3]
                            if significant_keywords:
                                matches = sum(1 for kw in significant_keywords if kw.lower() in title_lower)
                                if matches >= len(significant_keywords) * 0.6:  # At least 60% of keywords match
                                    print(f"✅ Found matching job: {current_job_title} (ID: {current_job_id})")
                                    return current_job_id
                        
                        current_job_num = int(num_match.group(1))
                        current_job_title = ""
                        current_job_id = None
                        
                        # Extract job title (usually on same line or next line after number)
                        # Pattern: "1. **Job Title**" or "1. Job Title"
                        title_match = re.search(r'\*\*(.+?)\*\*', line_stripped)
                        if title_match:
                            current_job_title = title_match.group(1).strip()
                        else:
                            # Try without markdown
                            title_part = line_stripped.split('.', 1)
                            if len(title_part) > 1:
                                current_job_title = title_part[1].strip()
                    
                    # Extract job ID
                    id_match = re.search(r'ID:\s*(\d+)', line_stripped, re.IGNORECASE)
                    if id_match:
                        current_job_id = int(id_match.group(1))
                
                # Check last job in the list
                if current_job_id and current_job_title:
                    title_lower = current_job_title.lower()
                    significant_keywords = [kw for kw in title_keywords if len(kw) > 3]
                    if significant_keywords:
                        matches = sum(1 for kw in significant_keywords if kw.lower() in title_lower)
                        if matches >= len(significant_keywords) * 0.6:
                            print(f"✅ Found matching job: {current_job_title} (ID: {current_job_id})")
                            return current_job_id
        
        return None
    
    def answer_with_history(
        self,
        question: str,
        chat_history: List[Dict[str, str]] = None,
        context: Optional[Dict] = None
    ) -> str:
        """
        Answer a question with conversation history, with parameter extraction and forced tool calls.
        """
        # Check if user is asking about a specific job
        job_id = self._extract_job_reference(question, chat_history)
        if job_id:
            print(f"🎯 User is asking about job ID: {job_id}")
            try:
                from tools.mcp_tools import get_job_details, get_api_token
                api_token = None
                if context:
                    api_token = context.get("api_token")
                if not api_token:
                    api_token = get_api_token()
                
                if api_token:
                    from tools.mcp_tools import set_api_token_for_thread
                    set_api_token_for_thread(api_token)
                
                print(f"📞 Fetching details for job ID {job_id}...")
                job_details = get_job_details.run(tool_input={"job_id": job_id, "api_token": api_token})
                
                if job_details and "not found" not in job_details.lower() and "error" not in job_details.lower():
                    print(f"✅ Successfully retrieved job details")
                    return f"Here are the details for that job:\n\n{job_details}\n\nWould you like to apply for this position or need more information?"
                else:
                    print(f"⚠️  Could not fetch job details: {job_details}")
            except Exception as e:
                import traceback
                print(f"⚠️  Error fetching job details: {e}")
                print(f"📋 Traceback: {traceback.format_exc()}")
                # Fall through to normal processing
        
        # Check if user is asking about salary/payment
        if self._detect_salary_query(question):
            print(f"💰 User is asking about salary/payment")
            # Extract all job IDs from previous response
            job_ids = []
            if chat_history:
                job_ids = self._extract_all_job_ids_from_history(chat_history)
            
            # If no job IDs found in history, try to extract from the most recent assistant message
            # This handles cases where chat_history might not be properly passed
            if not job_ids or len(job_ids) == 0:
                print(f"⚠️  No job IDs found in chat history, checking if we can extract from context...")
                # The agent might have job IDs in the current context - we'll handle this in the agent executor
                # For now, let's proceed with what we have
            
            if job_ids and len(job_ids) > 0:
                print(f"🔍 Comparing salaries for {len(job_ids)} jobs...")
                try:
                    from tools.mcp_tools import get_job_details, get_api_token
                    api_token = None
                    if context:
                        api_token = context.get("api_token")
                    if not api_token:
                        api_token = get_api_token()
                    
                    if api_token:
                        from tools.mcp_tools import set_api_token_for_thread
                        set_api_token_for_thread(api_token)
                    
                    # Fetch details for all jobs to compare salaries
                    jobs_with_salary = []
                    for job_id in job_ids:
                        try:
                            print(f"📞 Fetching details for job ID {job_id}...")
                            # Fetch raw job data directly to get salary
                            import requests
                            headers = {
                                "Authorization": f"Bearer {api_token}",
                                "Content-Type": "application/json"
                            }
                            response = requests.get(
                                f"{API_BASE_URL}/admin/select_job/{job_id}",
                                headers=headers,
                                timeout=30.0
                            )
                            if response.ok:
                                job_data = response.json()
                                salary_min = job_data.get('salary_min', 0) or 0
                                salary_max = job_data.get('salary_max', 0) or 0
                                
                                # Also get formatted details
                                job_details_text = get_job_details.run(tool_input={"job_id": job_id, "api_token": api_token})
                                
                                if salary_min or salary_max:
                                    avg_salary = (salary_min + salary_max) / 2 if salary_max else salary_min
                                    jobs_with_salary.append({
                                        'id': job_id,
                                        'details': job_details_text,
                                        'salary_min': salary_min,
                                        'salary_max': salary_max,
                                        'avg_salary': avg_salary,
                                        'title': job_data.get('job_title', job_data.get('title', '')),
                                        'company': job_data.get('company', '')
                                    })
                                else:
                                    # Job exists but no salary info
                                    jobs_with_salary.append({
                                        'id': job_id,
                                        'details': job_details_text,
                                        'salary_min': 0,
                                        'salary_max': 0,
                                        'avg_salary': 0,
                                        'title': job_data.get('job_title', job_data.get('title', '')),
                                        'company': job_data.get('company', '')
                                    })
                        except Exception as e:
                            print(f"⚠️  Error fetching job {job_id}: {e}")
                            continue
                    
                    if jobs_with_salary:
                        # Filter out jobs with no salary info, then sort by average salary (descending)
                        jobs_with_salary_info = [j for j in jobs_with_salary if j['avg_salary'] > 0]
                        
                        if jobs_with_salary_info:
                            jobs_with_salary_info.sort(key=lambda x: x['avg_salary'], reverse=True)
                            highest_paid = jobs_with_salary_info[0]
                            
                            print(f"✅ Found highest paying job: ID {highest_paid['id']} with salary {highest_paid['salary_min']}-{highest_paid['salary_max']}")
                            
                            response = f"Based on the jobs I found, here's the one with the highest salary:\n\n"
                            response += f"**{highest_paid.get('title', 'Job')}**\n"
                            if highest_paid.get('company'):
                                response += f"**Company:** {highest_paid['company']}\n"
                            response += f"**Salary:** {highest_paid['salary_min']:,} - {highest_paid['salary_max']:,} RWF per month\n\n"
                            response += f"{highest_paid['details']}\n\n"
                            response += "Would you like to apply for this position or see details of other jobs?"
                            
                            return response
                        else:
                            return "I found the jobs, but unfortunately salary information is not available for these positions. Would you like me to show you the details of any specific job?"
                    else:
                        return "I couldn't fetch salary information for the jobs. Let me show you the job details so you can compare them."
                        
                except Exception as e:
                    import traceback
                    print(f"⚠️  Error comparing salaries: {e}")
                    print(f"📋 Traceback: {traceback.format_exc()}")
                    # Fall through to normal processing
        
        # Extract parameters from conversation
        params = self._extract_job_parameters(question, chat_history)
        print(f"🔍 Extracted parameters: {params}")
        
        # Detect if user is asking for a job (even if category not recognized)
        job_query = None
        question_lower = question.lower()
        job_request_patterns = [
            r"i need (?:a |an )?(.+?) job",
            r"find me (?:a |an )?(.+?) job",
            r"looking for (?:a |an )?(.+?) job",
            r"need (?:a |an )?(.+?) job",
            r"want (?:a |an )?(.+?) job",
            r"(.+?) job",
            r"job.*?(?:as|for) (.+?)",
            r"is (?:there )?(?:a |an )?(.+?) job",
            r"is any (.+?) job",
        ]
        
        for pattern in job_request_patterns:
            match = re.search(pattern, question_lower)
            if match:
                potential_job = match.group(1).strip()
                # Remove common filler words
                potential_job = re.sub(r'\b(the|a|an|is|any|some|there)\b', '', potential_job, flags=re.IGNORECASE).strip()
                if len(potential_job) > 2:  # Only if substantial
                    job_query = potential_job
                    print(f"📝 Detected job query from pattern: '{job_query}'")
                    break
        
        # If we have job requirements OR detected a job request, DIRECTLY call the search_jobs tool
        has_job_type = bool(params.get("job_type"))
        has_location = bool(params.get("location"))
        has_any_location = params.get("search_all_locations", False)
        has_job_query = bool(job_query)
        
        if has_job_type or has_location or (has_any_location and has_job_type) or has_job_query:
            print(f"🚀 Directly calling search_jobs tool with extracted parameters")
            print(f"   job_type: {params.get('job_type')}, location: {params.get('location')}, any_location: {has_any_location}, job_query: {job_query}")
            
            try:
                # Get API token from context - try multiple sources
                api_token = None
                if context:
                    api_token = context.get("api_token")
                
                # If no token in context, try to get from environment (for testing)
                if not api_token:
                    import os
                    api_token = os.getenv("API_TOKEN")
                
                print(f"🔑 API token available: {bool(api_token)}")
                
                # Set API token in thread-local storage so tool can access it
                if api_token:
                    from tools.mcp_tools import set_api_token_for_thread
                    set_api_token_for_thread(api_token)
                
                # Call search_jobs tool directly (call the underlying function)
                from tools.mcp_tools import search_jobs
                
                # Prepare tool arguments
                tool_args = {
                    "fetch_all": True
                }
                
                # Use recognized category if available, otherwise use query
                if params.get("job_type"):
                    tool_args["category"] = params.get("job_type")
                    tool_args["query"] = params.get("job_type")  # Also use as query
                elif job_query:
                    # Use the detected job query
                    tool_args["query"] = job_query
                    print(f"📝 Using detected job query: {job_query}")
                
                # Only add location if it's not "any location"
                if has_location and not has_any_location:
                    tool_args["location"] = params.get("location")
                
                # Always pass API token explicitly to ensure it's used
                if api_token:
                    tool_args["api_token"] = api_token
                
                print(f"📞 Calling search_jobs with: category={tool_args.get('category', 'None')}, query={tool_args.get('query', 'None')}, location={tool_args.get('location', 'ALL LOCATIONS')}, fetch_all=True")
                
                # Call the tool using LangChain tool format (tool_input is a dict)
                search_result = search_jobs.run(tool_input=tool_args)
                
                print(f"📥 Tool returned: {search_result[:200] if search_result else 'None'}...")
                
                # Check if result is an error message
                error_indicators = [
                    "API token is required",
                    "Jobs API is not configured",
                    "Error searching jobs",
                    "not configured",
                    "required"
                ]
                
                is_error = any(indicator in search_result for indicator in error_indicators) if search_result else True
                
                if is_error:
                    print(f"⚠️  Tool returned error message: {search_result}")
                    # Fall through to agent fallback
                else:
                    # Format a friendly response with the search results
                    if search_result and "No jobs found" not in search_result and len(search_result) > 50:
                        response = f"Great! I found some job opportunities for you:\n\n{search_result}\n\nWould you like me to help you apply to any of these positions, or would you like to refine your search?"
                    elif "No jobs found" in search_result:
                        response = f"I searched for jobs but couldn't find any matching your criteria. {search_result}\n\nWould you like to:\n- Broaden your search criteria?\n- Try a different location?\n- Search in a different category?"
                    else:
                        response = f"I searched for jobs, but encountered an issue: {search_result}\n\nCould you try again, or would you like to refine your search criteria?"
                    
                    print(f"✅ Direct tool call successful, returning results ({len(response)} characters)")
                    return response
                
            except Exception as e:
                import traceback
                print(f"⚠️  Error calling search_jobs directly: {e}")
                print(f"📋 Traceback: {traceback.format_exc()}")
                # Fall through to agent fallback
        
        # If no parameters extracted OR direct call failed, use agent with explicit instruction
        if has_job_type or has_location or (has_any_location and has_job_type) or has_job_query:
            print(f"📝 Using agent fallback with explicit tool call instruction")
            # Build explicit tool call instruction
            tool_params = []
            if params.get("job_type"):
                tool_params.append(f'category="{params["job_type"]}"')
            elif job_query:
                tool_params.append(f'query="{job_query}"')
            if params.get("location") and not has_any_location:
                tool_params.append(f'location="{params["location"]}"')
            if params.get("remote"):
                tool_params.append(f'remote={params["remote"]}')
            
            # Add explicit instruction to force tool call
            params_str = ", ".join(tool_params) if tool_params else "fetch_all=True"
            location_note = " (searching ALL locations)" if has_any_location else ""
            search_instruction = f"\n\n[CRITICAL INSTRUCTION: User has provided job requirements in this conversation. You MUST call the search_jobs tool IMMEDIATELY with these exact parameters: {params_str}, fetch_all=True{location_note}. DO NOT ask questions - CALL THE TOOL NOW. The user said they want a job, so you MUST search. If you don't call the tool, you are failing your task.]"
            question = question + search_instruction
            print(f"📤 Passing question to base agent with tool call instruction")
        else:
            # Not a job search question - handle normally with knowledge base
            print(f"💡 Not a job search question - using knowledge base and general agent capabilities")
        
        # Call parent method (with or without tool call instruction)
        print(f"🤖 Invoking agent executor...")
        return super().answer_with_history(question, chat_history, context)

