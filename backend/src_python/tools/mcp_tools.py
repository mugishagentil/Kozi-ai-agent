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
API_BASE_URL = os.getenv("API_BASE_URL", "https://apis.kozi.rw")
USER_PROFILE_API = os.getenv("USER_PROFILE_API", f"{API_BASE_URL}/seeker/view_profile")


def get_api_token(context: Optional[Dict] = None) -> Optional[str]:
    """
    Get API token from context or environment.
    
    Args:
        context: Optional context dictionary containing API token
        
    Returns:
        API token string or None
    """
    # Try multiple sources for API token
    token = None
    
    # 1. Try context dict first
    if context and "api_token" in context:
        token = context["api_token"]
    
    # 2. Try environment variable
    if not token:
        token = os.getenv("API_TOKEN")
    
    # 3. Try from request context if available (for tools called by agent)
    if not token:
        # Check if there's a global context (set by agent)
        token = os.getenv("API_TOKEN")
    
    if token:
        print(f"🔑 API token found: {token[:20]}...")
    else:
        print(f"⚠️  No API token found in context or environment")
    
    return token


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


def suggest_job_categories(user_input: str) -> str:
    """
    Suggest relevant job categories based on user input.
    
    Args:
        user_input: User's search input
        
    Returns:
        Suggested categories or search terms
    """
    user_input_lower = user_input.lower()
    
    # Category suggestions based on keywords
    suggestions = {
        'sales': ['sell', 'customer', 'client', 'business', 'revenue'],
        'marketing': ['market', 'brand', 'social media', 'advertising', 'promotion'],
        'it': ['computer', 'software', 'tech', 'programming', 'coding', 'web', 'app'],
        'finance': ['money', 'bank', 'accounting', 'financial', 'investment'],
        'healthcare': ['health', 'medical', 'hospital', 'clinic', 'care'],
        'education': ['teach', 'school', 'training', 'learning', 'academic'],
        'construction': ['build', 'construction', 'engineer', 'architect'],
        'hospitality': ['hotel', 'restaurant', 'tourism', 'service', 'food'],
        'transport': ['drive', 'delivery', 'logistics', 'transport', 'shipping'],
        'agriculture': ['farm', 'crop', 'agriculture', 'livestock', 'rural']
    }
    
    matches = []
    for category, keywords in suggestions.items():
        if any(keyword in user_input_lower for keyword in keywords):
            matches.append(category)
    
    if matches:
        return f"Based on your search, you might be interested in: {', '.join(matches[:3])}"
    else:
        return "Try searching for categories like: sales, marketing, IT, finance, healthcare, education"



def validate_search_query(query: str, category: str = None) -> tuple[bool, str]:
    """
    Validate search query to prevent nonsensical job searches.
    
    Args:
        query: Search query string
        category: Category string
        
    Returns:
        Tuple of (is_valid, message)
    """
    if not query and not category:
        return True, ""  # Allow empty searches to show all jobs
    
    # Define nonsensical patterns
    nonsensical_patterns = [
        r'^[^a-zA-Z0-9\s]+$',  # Only special characters
        r'^\s*$',  # Only whitespace
        r'^.{1,2}$',  # Too short (1-2 characters)
        r'(.)\1{4,}',  # Repeated characters (aaaaa)
        r'^\d+$',  # Only numbers
    ]
    
    combined_text = f"{query} {category or ''}".strip().lower()
    
    # Check for nonsensical patterns
    import re
    for pattern in nonsensical_patterns:
        if re.search(pattern, combined_text):
            return False, "❌ Please provide a meaningful job search term (e.g., 'marketing', 'sales', 'IT jobs')."
    
    # Check for random gibberish (no vowels in long strings)
    if len(combined_text) > 5:
        vowels = 'aeiou'
        if not any(v in combined_text for v in vowels):
            return False, "❌ Please provide a valid job search term. Try categories like 'sales', 'marketing', 'IT', or 'healthcare'."
    
    return True, ""


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
    **MANDATORY TOOL FOR JOB SEARCHES** - Use this tool whenever a user asks for jobs, mentions a job type, or wants to find employment.
    
    Search for jobs on the Kozi platform with intelligent filtering and validation.
    
    **WHEN TO USE THIS TOOL:**
    - User says "I need a job" or "find me a job" → Use this tool
    - User mentions a job type (sales, marketing, IT, etc.) → Use this tool with category parameter
    - User mentions a location → Use this tool with location parameter
    - User asks "show me available jobs" → Use this tool
    - ANY job-related request → Use this tool
    
    **IMPORTANT:**
    - Always set fetch_all=True to get all available jobs
    - If user says "any location", set location=None or omit it
    - If user mentions a category (sales, marketing, IT, etc.), set category parameter
    - This tool validates categories and provides suggestions for invalid ones
    - Enhanced filtering prevents showing irrelevant jobs
    
    Args:
        query: Search query/keywords (e.g., "marketing specialist")
        category: Job category filter - REQUIRED if user mentions job type (e.g., "sales", "marketing", "IT")
        location: Location filter (e.g., "Kigali") - set to None if user says "any location"
        page: Page number to fetch (default: 1)
        per_page: Number of jobs per page (default: 50, max: 100)
        fetch_all: ALWAYS set to True to get all available jobs
        api_token: API authentication token (optional, will use environment variable if not provided)
        
    Returns:
        Formatted string with job search results including job titles, companies, locations, and descriptions
    """
    try:
        print(f"🔍 search_jobs called with: query='{query}', category='{category}', location='{location}', fetch_all={fetch_all}")
        print(f"🌐 Using JOBS_API_URL: {JOBS_API_URL}")
        
        # Validate search query first
        is_valid, validation_msg = validate_search_query(query, category)
        if not is_valid:
            return validation_msg
        
        if not JOBS_API_URL:
            error_msg = "Jobs API is not configured. Please set JOBS_API_URL environment variable."
            print(f"❌ {error_msg}")
            return error_msg
        
        token = api_token or get_api_token()
        if not token:
            error_msg = "API token is required. Please authenticate first. The API token should be available in the environment."
            print(f"❌ {error_msg}")
            print(f"🔍 Checking environment: API_TOKEN={'SET' if os.getenv('API_TOKEN') else 'NOT SET'}")
            return error_msg
        
        print(f"✅ API token found, proceeding with job search...")
        
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
                print(f"📡 Making API request to: {JOBS_API_URL} with params: {params}")
                response = requests.get(
                    JOBS_API_URL,
                    params=params,
                    headers=headers,
                    timeout=30.0
                )
                print(f"📥 API response status: {response.status_code}")
                
                # Handle 403 Forbidden specifically
                if response.status_code == 403:
                    error_msg = f"403 Forbidden: The API token does not have permission to access this endpoint. "
                    error_msg += f"URL: {response.url}. "
                    error_msg += f"Please check: 1) API token permissions, 2) JOBS_API_URL configuration (currently: {JOBS_API_URL}), "
                    error_msg += f"3) Ensure the endpoint is correct (should be a public jobs endpoint, not /admin/)."
                    print(f"❌ {error_msg}")
                    return error_msg
                
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
                    print(f"📄 Fetched page {current_page}: {len(jobs)} jobs (Total so far: {len(all_jobs)})")
                    
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
            no_jobs_msg = f"No jobs found matching your criteria: {query or 'all jobs'}"
            if category:
                no_jobs_msg += f" in category '{category}'"
            if location:
                no_jobs_msg += f" in location '{location}'"
            print(f"ℹ️  {no_jobs_msg}")
            return no_jobs_msg
        
        # Normalize job data for frontend display
        normalized_jobs = []
        for job in all_jobs:
            normalized_job = {
                'job_id': job.get('id') or job.get('job_id'),
                'job_title': job.get('title') or job.get('job_title') or 'Untitled',
                'company': job.get('company') or job.get('company_name') or 'Company',
                'location': job.get('location') or job.get('job_location'),
                'description': job.get('description'),
                'employment_type': job.get('employment_type') or job.get('type') or 'Full Time',
                'salary_min': job.get('salary_min') or job.get('min_salary'),
                'salary_max': job.get('salary_max') or job.get('max_salary'),
                'deadline': job.get('deadline') or job.get('application_deadline'),
                'logo': job.get('logo') or job.get('company_logo'),
                'category': job.get('category') or job.get('category_name'),
                'created_at': job.get('created_at') or job.get('posted_date')
            }
            normalized_jobs.append(normalized_job)
        
        # Enhanced category filtering with validation
        if category and normalized_jobs:
            category_lower = category.lower().strip()
            filtered_jobs = []
            
            # Define valid categories and their keywords
            valid_categories = {
                'sales': ['sales', 'selling', 'marketing', 'business development', 'account manager'],
                'marketing': ['marketing', 'digital marketing', 'social media', 'advertising', 'promotion', 'brand'],
                'it': ['developer', 'programmer', 'software', 'tech', 'system', 'data', 'web', 'computer', 'coding', 'engineering'],
                'finance': ['finance', 'accounting', 'financial', 'bank', 'investment', 'audit'],
                'healthcare': ['health', 'medical', 'nurse', 'doctor', 'hospital', 'clinic'],
                'education': ['teacher', 'education', 'training', 'instructor', 'academic'],
                'construction': ['construction', 'building', 'engineer', 'architect', 'contractor'],
                'hospitality': ['hotel', 'restaurant', 'tourism', 'hospitality', 'service'],
                'transport': ['driver', 'transport', 'logistics', 'delivery', 'shipping'],
                'agriculture': ['agriculture', 'farming', 'crop', 'livestock', 'agricultural']
            }
            
            # Check if category is valid
            category_keywords = None
            for valid_cat, keywords in valid_categories.items():
                if category_lower == valid_cat or category_lower in keywords:
                    category_keywords = keywords
                    break
            
            # If category is not recognized, suggest alternatives
            if not category_keywords:
                # Check for partial matches
                suggestions = []
                for valid_cat, keywords in valid_categories.items():
                    if any(keyword in category_lower or category_lower in keyword for keyword in keywords):
                        suggestions.append(valid_cat)
                
                if suggestions:
                    return f"❌ We couldn't find jobs for '{category}'. Did you mean: {', '.join(suggestions[:3])}? Please try searching with one of these categories."
                else:
                    available_cats = ', '.join(valid_categories.keys())
                    return f"❌ We couldn't find jobs for '{category}'. Available job categories include: {available_cats}. Please try searching with a valid category."
            
            # Filter jobs using enhanced matching
            for job in normalized_jobs:
                job_title = (job.get('job_title') or '').lower()
                job_category = (job.get('category') or '').lower()
                job_description = (job.get('description') or '').lower()[:200]  # Limit description length
                
                # Check if job matches any category keywords
                match_found = False
                for keyword in category_keywords:
                    if (keyword in job_title or 
                        keyword in job_category or 
                        keyword in job_description):
                        match_found = True
                        break
                
                if match_found:
                    filtered_jobs.append(job)
            
            if filtered_jobs:
                normalized_jobs = filtered_jobs
                print(f"🔍 Filtered to {len(normalized_jobs)} jobs matching category '{category}'")
            else:
                return f"❌ No jobs found in '{category}' category. Try searching for jobs in other categories like: {', '.join(list(valid_categories.keys())[:5])}."
        
        # Store jobs for frontend display with thread memory
        jobs_for_display = normalized_jobs[:10]
        
        # Store in thread-specific memory
        search_params = {
            'query': query,
            'category': category,
            'location': location
        }
        store_jobs_for_thread(jobs_for_display, search_params)
        
        print(f"📋 STORED {len(jobs_for_display)} jobs for thread {get_thread_id()}")
        
        # CRITICAL: Also store in agent instance for immediate access
        import os
        os.environ['JOBS_DATA_AVAILABLE'] = 'true'
        
        # Enhanced result formatting with better filtering
        display_limit = min(len(normalized_jobs), 10)  # Limit to 10 for better UX
        
        if len(normalized_jobs) == 0:
            return "❌ No jobs found matching your criteria. Try adjusting your search terms or category."
        
        result_msg = f"✅ Found {len(normalized_jobs)} relevant job(s)"
        if category:
            result_msg += f" in {category}"
        if location:
            result_msg += f" in {location}"
        result_msg += ". Here are the top matches:\n\n"
        
        # Add job details with enhanced formatting
        for i, job in enumerate(normalized_jobs[:display_limit], 1):
            result_msg += f"{i}. **{job.get('job_title', 'Untitled')}**\n"
            result_msg += f"   🏢 Company: {job.get('company', 'Company')}\n"
            result_msg += f"   📍 Location: {job.get('location', 'Location not specified')}\n"
            if job.get('employment_type'):
                result_msg += f"   💼 Type: {job.get('employment_type')}\n"
            if job.get('description'):
                desc = job.get('description', '')[:80] + '...' if len(job.get('description', '')) > 80 else job.get('description', '')
                result_msg += f"   📝 {desc}\n"
            result_msg += "\n"
        
        if len(normalized_jobs) > display_limit:
            result_msg += f"... and {len(normalized_jobs) - display_limit} more jobs available.\n"
        
        print(f"✅ search_jobs completed successfully, found {len(normalized_jobs)} jobs, displaying {display_limit} jobs")
        print(f"📋 Jobs stored for thread {get_thread_id()}: {len(get_jobs_for_thread())} jobs")
        return result_msg
        
    except requests.exceptions.RequestException as e:
        error_msg = f"API request failed: {str(e)}. Please check your internet connection and API configuration."
        print(f"❌ search_jobs API error: {error_msg}")
        return error_msg
    except Exception as e:
        error_msg = f"Error searching jobs: {str(e)}"
        print(f"❌ search_jobs error: {error_msg}")
        import traceback
        print(f"📋 Full traceback: {traceback.format_exc()}")
        return error_msg


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
            return "Job categories API is not configured."
        
        token = api_token or get_api_token()
        if not token:
            return "API token is required."
        
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        # Use synchronous requests
        response = requests.get(
            JOB_CATEGORIES_API,
            headers=headers,
            timeout=30.0
        )
        response.raise_for_status()
        categories = response.json()
        
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
        
        # Search for jobs matching user profile with enhanced filtering
        search_query = " ".join(skills[:3]) if skills else ""  # Use top 3 skills as query
        
        # Validate the search before proceeding
        is_valid, validation_msg = validate_search_query(search_query, category_preference)
        if not is_valid:
            return f"Profile-based search validation failed: {validation_msg}"
        
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


@tool
def handle_unclear_job_request(
    user_input: str,
    api_token: Optional[str] = None
) -> str:
    """
    Handle unclear, nonsensical, or invalid job search requests.
    
    Use this tool when:
    - User provides gibberish or nonsensical input for job search
    - User types random characters or very short meaningless text
    - User asks for jobs but the request is unclear
    - You need to guide user to provide better search terms
    
    Args:
        user_input: The unclear or nonsensical user input
        api_token: API authentication token (optional)
        
    Returns:
        Helpful guidance and suggestions for better job search
    """
    try:
        # Analyze the input and provide helpful suggestions
        suggestions = suggest_job_categories(user_input)
        
        response = [
            "❌ I couldn't understand your job search request.",
            "",
            "💡 **Here's how to search for jobs effectively:**",
            "• Use specific job categories: 'sales jobs', 'marketing positions', 'IT roles'",
            "• Mention your skills: 'graphic design', 'customer service', 'programming'",
            "• Include location if needed: 'jobs in Kigali', 'remote work'",
            "",
            f"🎯 **Suggestions:** {suggestions}",
            "",
            "🔍 **Popular job categories:**",
            "• Sales & Marketing",
            "• Information Technology (IT)",
            "• Healthcare & Medical",
            "• Finance & Accounting",
            "• Education & Training",
            "• Construction & Engineering",
            "",
            "Please try again with a clearer search term! 😊"
        ]
        
        return "\n".join(response)
        
    except Exception as e:
        return f"I couldn't process your request. Please try searching for jobs using clear terms like 'sales', 'marketing', or 'IT jobs'. Error: {str(e)}"



# Global variables for thread-based memory
_current_jobs_data = None
_thread_memory = {}  # Store data per thread/conversation

def get_thread_id() -> str:
    """Get current thread ID from environment or generate one."""
    import threading
    return str(threading.current_thread().ident)

def store_jobs_for_thread(jobs_data, search_params=None):
    """Store jobs data for current thread."""
    global _thread_memory, _current_jobs_data
    thread_id = get_thread_id()
    
    if thread_id not in _thread_memory:
        _thread_memory[thread_id] = {}
    
    _thread_memory[thread_id]['jobs'] = jobs_data
    _thread_memory[thread_id]['search_params'] = search_params or {}
    _thread_memory[thread_id]['timestamp'] = __import__('time').time()
    
    # Also set global for backward compatibility
    _current_jobs_data = jobs_data

def get_jobs_for_thread():
    """Get jobs data for current thread."""
    thread_id = get_thread_id()
    return _thread_memory.get(thread_id, {}).get('jobs', [])

def get_current_jobs_data():
    """Get the current jobs data for frontend display."""
    return get_jobs_for_thread() or _current_jobs_data

def clear_current_jobs_data():
    """Clear jobs data for current thread only."""
    global _current_jobs_data
    thread_id = get_thread_id()
    if thread_id in _thread_memory:
        _thread_memory[thread_id].pop('jobs', None)
    _current_jobs_data = None