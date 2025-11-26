"""
MCP Tools for Kozi AI Backend

This module provides LangChain tools for interacting with Kozi APIs via MCP.
These tools are designed to work with multiple agents and various API endpoints.
"""

import os
from typing import Optional, Dict, Any, List
from langchain_core.tools import tool
from dotenv import load_dotenv
import requests

# Load environment variables
load_dotenv()

# API Configuration
JOBS_API_URL = os.getenv("JOBS_API_URL")
JOB_CATEGORIES_API = os.getenv("JOB_CATEGORIES_API")
JOB_SEEKERS_BY_CATEGORY_API = os.getenv("JOB_SEEKERS_BY_CATEGORY_API")

# Extract base URL from JOBS_API_URL if available, otherwise use API_BASE_URL env var or default
if JOBS_API_URL:
    # Extract base URL from JOBS_API_URL (e.g., "https://apis.kozi.rw/admin/select_jobss" -> "https://apis.kozi.rw")
    from urllib.parse import urlparse
    parsed = urlparse(JOBS_API_URL)
    API_BASE_URL = f"{parsed.scheme}://{parsed.netloc}"
    print(f"🔗 Using API_BASE_URL extracted from JOBS_API_URL: {API_BASE_URL}")
else:
    API_BASE_URL = os.getenv("API_BASE_URL", "https://apis.kozi.rw")
    print(f"🔗 Using API_BASE_URL from env/default: {API_BASE_URL}")

USER_PROFILE_API = os.getenv("USER_PROFILE_API", f"{API_BASE_URL}/seeker/view_profile")


# Thread-local storage for API token (allows tools to access token from agent context)
import threading
_thread_local = threading.local()

def set_api_token_for_thread(token: str):
    """Set API token for current thread (used by agents to pass token to tools)"""
    _thread_local.api_token = token

def get_api_token(context: Optional[Dict] = None) -> Optional[str]:
    """
    Get API token from context, thread-local storage, or environment.
    
    Args:
        context: Optional context dictionary containing API token
        
    Returns:
        API token string or None
    """
    # Priority: context > thread-local > environment
    if context and "api_token" in context:
        return context["api_token"]
    if hasattr(_thread_local, 'api_token'):
        return _thread_local.api_token
    return os.getenv("API_TOKEN")


def extract_user_id_from_input(input_text: str) -> Optional[int]:
    """
    Extract user ID from input text that contains "[User ID: XXX]" format.
    
    Args:
        input_text: Input text that may contain "[User ID: XXX]" pattern
        
    Returns:
        Extracted user ID as int, or None if not found
    """
    import re
    # Look for pattern "[User ID: XXX]" or "[User ID:XXX]" at the beginning
    match = re.search(r'\[User ID:\s*(\d+)\]', input_text)
    if match:
        try:
            return int(match.group(1))
        except (ValueError, TypeError):
            pass
    return None


@tool
def search_jobs(
    query: str = "",
    category: Optional[str] = None,
    location: Optional[str] = None,
    page: Optional[int] = 1,
    per_page: Optional[int] = 50,
    fetch_all: Optional[bool] = False,
    api_token: Optional[str] = None
) -> str:
    """
    Search for jobs on the Kozi platform with pagination support.
    
    This tool can fetch jobs from all pages to find the best matches for the user.
    Use fetch_all=True to get all available jobs across all pages.
    
    Args:
        query: Search query/keywords
        category: Job category filter (optional)
        location: Location filter (optional)
        page: Page number to fetch (default: 1)
        per_page: Number of jobs per page (default: 50, max: 100)
        fetch_all: If True, fetches all pages of results (default: False)
        api_token: API authentication token (optional, can be passed via context)
        
    Returns:
        Formatted string with job search results including pagination info
    """
    try:
        if not JOBS_API_URL:
            print("❌ JOBS_API_URL is not configured")
            return "Jobs API is not configured. Please set JOBS_API_URL environment variable."
        
        print(f"🔍 Calling JOBS_API_URL: {JOBS_API_URL}")
        print(f"   Parameters: query={query}, category={category}, location={location}, page={page}, fetch_all={fetch_all}")
        
        token = api_token or get_api_token()
        if not token:
            print("❌ API token is required for job search")
            return "API token is required. Please authenticate first."
        
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        all_jobs = []
        current_page = page
        max_pages = 100  # Safety limit to prevent infinite loops
        has_more = True
        
        # Build base search parameters
        base_params = {}
        if query:
            base_params["q"] = query
        if category:
            base_params["category"] = category
        if location:
            base_params["location"] = location
        
        # Fetch jobs with pagination
        while has_more and current_page <= max_pages:
            params = base_params.copy()
            params["page"] = current_page
            params["per_page"] = min(per_page, 100)  # Cap at 100 per page
            
            try:
                print(f"📡 Fetching page {current_page} from JOBS_API_URL...")
                response = requests.get(
                    JOBS_API_URL,
                    params=params,
                    headers=headers,
                    timeout=30.0
                )
                response.raise_for_status()
                data = response.json()
                
                # Handle different API response formats
                if isinstance(data, dict):
                    # If API returns paginated response with 'data' or 'results' key
                    jobs = data.get('data', data.get('results', data.get('jobs', [])))
                    total_pages = data.get('total_pages', data.get('pages', 1))
                    current_count = data.get('per_page', data.get('limit', len(jobs)))
                    total_count = data.get('total', data.get('count', len(jobs)))
                elif isinstance(data, list):
                    # If API returns direct list
                    jobs = data
                    total_pages = 1
                    current_count = len(jobs)
                    total_count = len(jobs)
                else:
                    jobs = []
                    total_pages = 1
                    current_count = 0
                    total_count = 0
                
                if jobs and len(jobs) > 0:
                    all_jobs.extend(jobs)
                    print(f"✅ Fetched page {current_page} from JOBS_API_URL: {len(jobs)} jobs (Total so far: {len(all_jobs)})")
                    
                    # Check if there are more pages
                    if fetch_all:
                        # If we got fewer jobs than per_page, we've reached the end
                        if len(jobs) < per_page:
                            has_more = False
                        # If API provides total_pages info, use it
                        elif total_pages and current_page >= total_pages:
                            has_more = False
                        else:
                            current_page += 1
                    else:
                        # Only fetch requested page
                        has_more = False
                else:
                    # No more jobs
                    has_more = False
                    
            except requests.exceptions.HTTPError as e:
                if e.response.status_code == 404:
                    # No more pages
                    has_more = False
                else:
                    raise
            except Exception as e:
                print(f"⚠️  Error fetching page {current_page}: {e}")
                has_more = False
        
        if not all_jobs or len(all_jobs) == 0:
            print(f"⚠️  No jobs found from JOBS_API_URL with criteria: query={query}, category={category}, location={location}")
            return f"No jobs found matching your criteria: {query or 'all jobs'}"
        
        # CLIENT-SIDE FILTERING: If category was specified, filter jobs by category name or title
        filtered_jobs = all_jobs
        if category:
            category_lower = category.lower()
            print(f"🔍 Filtering jobs by category: {category}")
            filtered_jobs = []
            for job in all_jobs:
                job_title = (job.get('title', '') or job.get('job_title', '') or '').lower()
                job_category = (job.get('category', '') or job.get('category_name', '') or '').lower()
                job_description = (job.get('description', '') or '').lower()
                
                # Check if category matches in title, category field, or description
                if (category_lower in job_title or 
                    category_lower in job_category or 
                    category_lower in job_description):
                    filtered_jobs.append(job)
            
            print(f"📊 Filtered from {len(all_jobs)} to {len(filtered_jobs)} jobs matching category '{category}'")
            
            if len(filtered_jobs) == 0:
                return f"No jobs found matching the category '{category}'. Try searching for a different category or broaden your search."
        
        print(f"✅ Successfully retrieved {len(filtered_jobs)} job(s) from JOBS_API_URL")
        
        # Format results
        formatted = [f"Found {len(filtered_jobs)} job(s)"]
        if category:
            formatted[0] += f" in {category}"
        if fetch_all and current_page > 1:
            formatted[0] += f" across {current_page} page(s)"
        formatted[0] += ":\n\n"
        
        # Show all jobs (or top 50 if too many)
        display_limit = min(len(filtered_jobs), 50) if len(filtered_jobs) > 50 else len(filtered_jobs)
        
        for i, job in enumerate(filtered_jobs[:display_limit], 1):
            formatted.append(f"{i}. **{job.get('title', job.get('job_title', 'Untitled'))}**")
            
            if job.get('company') or job.get('company_name'):
                formatted.append(f"   Company: {job.get('company') or job.get('company_name')}")
            if job.get('location') or job.get('job_location'):
                formatted.append(f"   Location: {job.get('location') or job.get('job_location')}")
            if job.get('category') or job.get('category_name'):
                formatted.append(f"   Category: {job.get('category') or job.get('category_name')}")
            if job.get('salary') or job.get('salary_range'):
                formatted.append(f"   Salary: {job.get('salary') or job.get('salary_range')}")
            if job.get('description'):
                desc = str(job.get('description', ''))[:100]
                formatted.append(f"   Description: {desc}...")
            if job.get('id') or job.get('job_id'):
                formatted.append(f"   ID: {job.get('id') or job.get('job_id')}")
            formatted.append("")
        
        if len(filtered_jobs) > display_limit:
            formatted.append(f"\n... and {len(filtered_jobs) - display_limit} more job(s). Use more specific filters to narrow results.")
        
        return "\n".join(formatted)
        
    except Exception as e:
        return f"Error searching jobs: {str(e)}"


@tool
def get_job_details(job_id: int, api_token: Optional[str] = None) -> str:
    """
    Get detailed information about a specific job by its ID.
    
    This tool fetches complete job details including description, requirements,
    responsibilities, salary, company information, and more.
    
    Args:
        job_id: The ID of the job to get details for
        api_token: API authentication token (optional, can be passed via context)
        
    Returns:
        Formatted string with complete job details
    """
    try:
        if not API_BASE_URL:
            return "API base URL is not configured."
        
        token = api_token or get_api_token()
        if not token:
            return "API token is required."
        
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        # Use the job details endpoint
        job_details_url = f"{API_BASE_URL}/admin/select_job/{job_id}"
        
        print(f"📡 Fetching job details from: {job_details_url} for job ID: {job_id}")
        response = requests.get(
            job_details_url,
            headers=headers,
            timeout=30.0
        )
        response.raise_for_status()
        job = response.json()
        
        if not job:
            return f"Job with ID {job_id} not found."
        
        print(f"✅ Successfully fetched job details for ID {job_id}")
        
        # Format job details
        formatted = [f"**{job.get('job_title', job.get('title', 'Untitled'))}**\n"]
        
        if job.get('company'):
            formatted.append(f"**Company:** {job.get('company')}")
        if job.get('location'):
            formatted.append(f"**Location:** {job.get('location')}")
        if job.get('category') or job.get('category_name'):
            formatted.append(f"**Category:** {job.get('category') or job.get('category_name')}")
        if job.get('salary_min') or job.get('salary_max'):
            salary_min = job.get('salary_min', 'N/A')
            salary_max = job.get('salary_max', 'N/A')
            formatted.append(f"**Salary:** {salary_min} - {salary_max} RWF per month")
        
        formatted.append("")
        
        if job.get('job_description'):
            formatted.append(f"**Job Description:**\n{job.get('job_description')}")
            formatted.append("")
        
        if job.get('requirements'):
            formatted.append(f"**Requirements:**\n{job.get('requirements')}")
            formatted.append("")
        
        if job.get('responsability') or job.get('responsibilities'):
            formatted.append(f"**Responsibilities:**\n{job.get('responsability') or job.get('responsibilities')}")
            formatted.append("")
        
        if job.get('conclusion'):
            formatted.append(f"**Conclusion:**\n{job.get('conclusion')}")
        
        return "\n".join(formatted)
        
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 404:
            return f"Job with ID {job_id} not found."
        print(f"❌ HTTP Error fetching job details: {e}")
        return f"Error fetching job details: {str(e)}"
    except Exception as e:
        print(f"❌ Error fetching job details: {str(e)}")
        return f"Error fetching job details: {str(e)}"


@tool
def get_job_categories(api_token: Optional[str] = None) -> str:
    """
    Get list of available job categories.
    
    Args:
        api_token: API authentication token (optional)
        
    Returns:
        Formatted string with job categories
    """
    try:
        if not JOB_CATEGORIES_API:
            print("❌ JOB_CATEGORIES_API is not configured")
            return "Job categories API is not configured."
        
        print(f"🔍 Calling JOB_CATEGORIES_API: {JOB_CATEGORIES_API}")
        
        token = api_token or get_api_token()
        if not token:
            print("❌ API token is required for job categories")
            return "API token is required."
        
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        # Use synchronous requests
        print(f"📡 Fetching job categories from JOB_CATEGORIES_API...")
        response = requests.get(
            JOB_CATEGORIES_API,
            headers=headers,
            timeout=30.0
        )
        response.raise_for_status()
        categories = response.json()
        
        print(f"✅ Successfully fetched {len(categories) if isinstance(categories, list) else 'categories'} from JOB_CATEGORIES_API")
        
        if not categories:
            return "No job categories available."
        
        formatted = ["Available Job Categories:\n"]
        for i, category in enumerate(categories, 1):
            formatted.append(f"{i}. {category.get('name', 'Unknown')}")
        
        return "\n".join(formatted)
        
    except Exception as e:
        return f"Error fetching job categories: {str(e)}"


@tool
def search_job_seekers_by_category(
    category: str,
    location: Optional[str] = None,
    api_token: Optional[str] = None
) -> str:
    """
    Search for job seekers by category.
    
    Args:
        category: Job category to search for
        location: Location filter (optional)
        api_token: API authentication token (optional)
        
    Returns:
        Formatted string with job seeker results
    """
    try:
        if not JOB_SEEKERS_BY_CATEGORY_API:
            return "Job seekers API is not configured."
        
        token = api_token or get_api_token()
        if not token:
            return "API token is required."
        
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        params = {"category": category}
        if location:
            params["location"] = location
        
        # Use synchronous requests
        response = requests.get(
            JOB_SEEKERS_BY_CATEGORY_API,
            params=params,
            headers=headers,
            timeout=30.0
        )
        response.raise_for_status()
        seekers = response.json()
        
        if not seekers or len(seekers) == 0:
            return f"No job seekers found in category: {category}"
        
        formatted = [f"Found {len(seekers)} job seeker(s) in {category}:\n"]
        for i, seeker in enumerate(seekers[:10], 1):  # Limit to top 10
            formatted.append(f"{i}. **{seeker.get('name', 'Unknown')}**")
            if seeker.get('skills'):
                formatted.append(f"   Skills: {', '.join(seeker['skills'][:5])}")
            if seeker.get('location'):
                formatted.append(f"   Location: {seeker['location']}")
            formatted.append("")
        
        return "\n".join(formatted)
        
    except Exception as e:
        return f"Error searching job seekers: {str(e)}"


@tool
def find_matching_jobs_for_user(
    users_id: Optional[int] = None,
    input_text: Optional[str] = None,
    api_token: Optional[str] = None
) -> str:
    """
    Find jobs that match a user's profile and preferences.
    
    This tool automatically:
    1. Fetches the user's profile to get their skills, category preferences, and location
    2. Searches for jobs matching their profile
    3. Returns personalized job recommendations
    
    Use this when a user asks for job recommendations or says "find me a job" or "I need a job".
    
    Args:
        users_id: User ID (optional - will be extracted from input_text if not provided)
        input_text: The full input message (optional - used to extract users_id)
        api_token: API authentication token (optional, can be passed via context)
        
    Returns:
        Formatted string with matching job recommendations based on user profile
    """
    try:
        # Extract user ID
        if not users_id and input_text:
            users_id = extract_user_id_from_input(input_text)
        
        if not users_id:
            return "User ID is required. Please provide users_id or input_text with [User ID: XXX] format."
        
        token = api_token or get_api_token()
        if not token:
            return "API token is required. Please authenticate first."
        
        # First, get user profile by calling the get_user_profile function directly
        # (avoid circular import by calling the function, not importing it)
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        # Fetch user profile - try seeker profile first (most common)
        profile_url = f"{API_BASE_URL}/seeker/view_profile/{users_id}"
        response = requests.get(
            profile_url,
            headers=headers,
            timeout=30.0
        )
        
        # If seeker profile fails, try provider profile
        if response.status_code == 404:
            profile_url = f"{API_BASE_URL}/provider/view_profile/{users_id}"
            response = requests.get(
                profile_url,
                headers=headers,
                timeout=30.0
            )
        
        response.raise_for_status()
        profile = response.json()
        
        if not profile:
            return f"No profile found for user ID: {users_id}. Cannot find matching jobs."
        
        # Format profile information for parsing
        profile_text = f"Name: {profile.get('first_name', '')} {profile.get('last_name', '')}\n"
        if profile.get('skills'):
            if isinstance(profile['skills'], list):
                profile_text += f"Skills: {', '.join(profile['skills'])}\n"
            else:
                profile_text += f"Skills: {profile['skills']}\n"
        if profile.get('categories_id'):
            profile_text += f"Job Category ID: {profile['categories_id']}\n"
        if profile.get('preferred_location'):
            profile_text += f"Preferred Location: {profile['preferred_location']}\n"
        
        # Parse profile to extract preferences
        category_preference = None
        location_preference = None
        skills = []
        
        # Try to extract category and location from profile text
        if "Job Category ID:" in profile_text:
            try:
                category_line = [line for line in profile_text.split('\n') if 'Job Category ID:' in line][0]
                category_preference = category_line.split('Job Category ID:')[1].strip()
            except:
                pass
        
        if "Preferred Location:" in profile_text:
            try:
                location_line = [line for line in profile_text.split('\n') if 'Preferred Location:' in line][0]
                location_preference = location_line.split('Preferred Location:')[1].strip()
            except:
                pass
        
        if "Skills:" in profile_text:
            try:
                skills_section = profile_text.split('Skills:')[1].split('\n')[0]
                skills = [s.strip() for s in skills_section.replace('-', ',').split(',') if s.strip()]
            except:
                pass
        
        # Search for jobs matching user profile
        # Use fetch_all=True to get all jobs and find best matches
        search_query = " ".join(skills[:3]) if skills else ""  # Use top 3 skills as query
        
        result = search_jobs(
            query=search_query,
            category=category_preference,
            location=location_preference,
            fetch_all=True,
            api_token=token
        )
        
        # Add context about what was matched
        formatted = [f"**Personalized Job Recommendations Based on Your Profile:**\n"]
        formatted.append("=" * 60)
        if category_preference:
            formatted.append(f"Category: {category_preference}")
        if location_preference:
            formatted.append(f"Location: {location_preference}")
        if skills:
            formatted.append(f"Skills: {', '.join(skills[:5])}")
        formatted.append("=" * 60)
        formatted.append("")
        formatted.append(result)
        
        return "\n".join(formatted)
        
    except Exception as e:
        return f"Error finding matching jobs: {str(e)}"


@tool
def get_user_profile(
    users_id: Optional[int] = None,
    api_token: Optional[str] = None,
    input_text: Optional[str] = None
) -> str:
    """
    Get user profile information from Kozi API.
    
    **USE THIS TOOL IMMEDIATELY** when the user asks for:
    - Writing a CV/resume (ALWAYS call this first, don't ask for information)
    - Creating a cover letter
    - Profile recommendations
    - Personalized job suggestions
    - When user says "use my profile" or "use my information"
    - Any task that requires the user's personal information
    
    **HOW TO USE THIS TOOL:**
    The EASIEST way is to pass the full input message as input_text parameter.
    The tool will automatically extract the user ID from "[User ID: XXX]" pattern.
    
    Example: get_user_profile(input_text="[User ID: 418] Help me write a CV")
    
    The user is ALREADY logged in and authenticated - you have access to their profile.
    DO NOT ask them to sign up or provide information manually.
    
    Args:
        users_id: User ID (optional - will be extracted from input_text if not provided)
        api_token: API authentication token (optional, can be passed via context)
        input_text: The full input message (REQUIRED if users_id not provided - used to extract users_id)
        
    Returns:
        Formatted string with user profile information including:
        - Personal details (name, email, phone, address)
        - Skills and experience
        - Education
        - Work history
        - Preferences and categories
    """
    try:
        # Try to extract users_id from input_text if not provided
        if not users_id and input_text:
            users_id = extract_user_id_from_input(input_text)
        
        token = api_token or get_api_token()
        if not token:
            return "API token is required to fetch user profile. Please authenticate first."
        
        if not users_id:
            return "User ID is required to fetch profile information. The user ID should be provided in the message context as '[User ID: XXX]'. You can pass the full input message as input_text parameter and it will be extracted automatically."
        
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        # Fetch user profile - try seeker profile first (most common)
        profile_url = f"{API_BASE_URL}/seeker/view_profile/{users_id}"
        response = requests.get(
            profile_url,
            headers=headers,
            timeout=30.0
        )
        
        # If seeker profile fails, try provider profile
        if response.status_code == 404:
            profile_url = f"{API_BASE_URL}/provider/view_profile/{users_id}"
            response = requests.get(
                profile_url,
                headers=headers,
                timeout=30.0
            )
        
        response.raise_for_status()
        profile = response.json()
        
        if not profile:
            return f"No profile found for user ID: {users_id}"
        
        # Format profile information
        formatted = ["User Profile Information:\n"]
        formatted.append("=" * 50)
        
        # Personal Information
        if profile.get('first_name') or profile.get('last_name'):
            name_parts = [profile.get('first_name', ''), profile.get('last_name', '')]
            formatted.append(f"Name: {' '.join(filter(None, name_parts))}")
        
        if profile.get('email'):
            formatted.append(f"Email: {profile['email']}")
        if profile.get('phone'):
            formatted.append(f"Phone: {profile['phone']}")
        if profile.get('address'):
            formatted.append(f"Address: {profile['address']}")
        if profile.get('national_id'):
            formatted.append(f"National ID: {profile['national_id']}")
        
        formatted.append("")
        
        # Skills and Experience
        if profile.get('skills'):
            formatted.append("Skills:")
            if isinstance(profile['skills'], list):
                formatted.append(f"  - {', '.join(profile['skills'])}")
            else:
                formatted.append(f"  - {profile['skills']}")
            formatted.append("")
        
        if profile.get('experience'):
            formatted.append(f"Experience: {profile['experience']}")
        if profile.get('education'):
            formatted.append(f"Education: {profile['education']}")
        
        # Work History
        if profile.get('work_history'):
            formatted.append("\nWork History:")
            if isinstance(profile['work_history'], list):
                for work in profile['work_history']:
                    formatted.append(f"  - {work}")
            else:
                formatted.append(f"  - {profile['work_history']}")
        
        # Preferences
        if profile.get('categories_id'):
            formatted.append(f"\nJob Category ID: {profile['categories_id']}")
        if profile.get('preferred_location'):
            formatted.append(f"Preferred Location: {profile['preferred_location']}")
        
        # Additional fields
        additional_fields = ['bio', 'languages', 'certifications', 'references', 'date_of_birth']
        for field in additional_fields:
            if profile.get(field):
                formatted.append(f"{field.replace('_', ' ').title()}: {profile[field]}")
        
        formatted.append("=" * 50)
        
        return "\n".join(formatted)
        
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 404:
            return f"User profile not found for user ID: {users_id}"
        elif e.response.status_code == 401 or e.response.status_code == 403:
            return "Authentication failed. Cannot access user profile."
        else:
            return f"Error fetching user profile: HTTP {e.response.status_code}"
    except Exception as e:
        return f"Error fetching user profile: {str(e)}"

