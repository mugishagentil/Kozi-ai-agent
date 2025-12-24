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


def extract_thread_id_from_context(input_text: str = None) -> Optional[str]:
    """
    Extract thread ID from input context or API request.
    
    Args:
        input_text: Input text that may contain thread ID
        
    Returns:
        Thread ID string or None if not found
    """
    # Try to get from environment (set by external API/frontend)
    thread_id = os.getenv('CURRENT_THREAD_ID')
    if thread_id:
        return thread_id
    
    # Try to extract from input text pattern
    if input_text:
        import re
        match = re.search(r'\[Thread ID:\s*([^\]]+)\]', input_text)
        if match:
            return match.group(1).strip()
    
    # Try to get from request headers or context (would be set by API handler)
    thread_id = os.getenv('REQUEST_THREAD_ID')
    if thread_id:
        return thread_id
    
    return None



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
        'pet sitters': ['pet', 'animal', 'dog', 'cat', 'sitter'],
        'customer service representative': ['customer', 'service', 'support', 'call', 'help'],
        'data entry clerk': ['data', 'entry', 'typing', 'clerk', 'office'],
        'construction worker': ['construction', 'build', 'worker', 'laborer'],
        'driver': ['drive', 'delivery', 'transport', 'logistics', 'shipping'],
        'security guard': ['security', 'guard', 'protection', 'safety'],
        'salesperson': ['sell', 'sales', 'business', 'revenue', 'client'],
        'waiter / waitress': ['waiter', 'waitress', 'restaurant', 'food', 'service'],
        'warehouse worker': ['warehouse', 'storage', 'inventory', 'packing'],
        'farmer': ['farm', 'agriculture', 'crop', 'livestock', 'rural'],
        'housekeeper': ['cleaner','house', 'cleaning', 'domestic', 'clean', 'laundry'],
        'hairdresser': ['hair', 'salon', 'beauty', 'stylist'],
        'babysitter': ['baby', 'child', 'kids', 'nanny', 'childcare'],
        'machine operator': ['machine', 'operator', 'equipment', 'manufacturing'],
        'accountant': ['accounting', 'financial', 'bookkeeper', 'finance', 'money'],
        'doctor': ['doctor', 'medical', 'health', 'hospital', 'clinic'],
        'lawyer': ['lawyer', 'legal', 'law', 'attorney', 'advocate'],
        'architect': ['architect', 'design', 'building', 'construction'],
        'teacher': ['teach', 'school', 'training', 'learning', 'academic'],
        'project manager': ['project', 'manager', 'management', 'coordinator'],
        'human resources officer': ['hr', 'human resources', 'personnel', 'recruitment'],
        'marketing specialist': ['market', 'brand', 'social media', 'advertising', 'promotion'],
        'software developer': ['computer', 'software', 'tech', 'programming', 'coding', 'web', 'app'],
        'chef': ['chef', 'cook', 'kitchen', 'culinary', 'food'],
        'receptionist': ['reception', 'front desk', 'office', 'assistant'],
        'cleaners': ['cleaner', 'janitor', 'maintenance', 'housekeeping'],
        'manpower': ['labor', 'workforce', 'general', 'temporary']
    }
    
    matches = []
    for category, keywords in suggestions.items():
        if any(keyword in user_input_lower for keyword in keywords):
            matches.append(category)
    
    if matches:
        return f"Based on your search, you might be interested in: {', '.join(matches[:3])}"
    else:
        return "Try searching for categories like: pet sitters, customer service, data entry, construction, driver, security guard, salesperson, accountant, doctor, teacher"



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
    
    combined_text = f"{query} {category or ''}".strip().lower()
    
    # Skip validation if no meaningful text
    if not combined_text:
        return True, ""
    
    import re
    
    # Define nonsensical patterns - MORE STRICT
    nonsensical_patterns = [
        r'^[^a-zA-Z0-9\s]+$',  # Only special characters
        r'^\s*$',  # Only whitespace
        r'^.{1,2}$',  # Too short (1-2 characters)
        r'(.)\1{3,}',  # Repeated characters (aaaa)
        r'^\d+$',  # Only numbers
        r'^[bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ]{6,}$',  # Too many consonants (gibberish)
    ]
    
    # Check for nonsensical patterns
    for pattern in nonsensical_patterns:
        if re.search(pattern, combined_text):
            return False, "❌ Please provide a meaningful job search term (e.g., 'marketing', 'sales', 'IT jobs')."
    
    # Enhanced gibberish detection
    if len(combined_text) > 5:
        vowels = 'aeiou'
        consonants = 'bcdfghjklmnpqrstvwxyz'
        
        # Check vowel ratio - gibberish usually has very few vowels
        vowel_count = sum(1 for c in combined_text if c in vowels)
        consonant_count = sum(1 for c in combined_text if c in consonants)
        total_letters = vowel_count + consonant_count
        
        if total_letters > 0:
            vowel_ratio = vowel_count / total_letters
            # If less than 15% vowels, likely gibberish
            if vowel_ratio < 0.15:
                return False, "❌ Please provide a valid job search term. Try categories like 'sales', 'marketing', 'IT', or 'healthcare'."
    
    # Check for common gibberish patterns
    gibberish_patterns = [
        r'[qwrtypsdfghjklzxcvbnm]{8,}',  # Long sequences of consonants
        r'[bcdfghjklmnpqrstvwxyz]{5,}[bcdfghjklmnpqrstvwxyz]{3,}',  # Multiple consonant clusters
    ]
    
    for pattern in gibberish_patterns:
        if re.search(pattern, combined_text, re.IGNORECASE):
            return False, "❌ Please provide a meaningful job search term. Try specific job titles or categories."
    
    return True, ""


def get_stored_jobs_data() -> Optional[List[Dict]]:
    """
    Get currently stored jobs data for frontend display.
    
    Returns:
        List of job dictionaries or None if no jobs stored
    """
    global _current_jobs_data
    return _current_jobs_data


def clear_stored_jobs_data():
    """
    Clear stored jobs data.
    """
    global _current_jobs_data
    _current_jobs_data = None
    os.environ.pop('JOBS_DATA_AVAILABLE', None)


def generate_detailed_job_text(jobs_data: List[Dict], search_context: str = "") -> str:
    """
    Generate clean job listing text matching the UI style.
    
    Args:
        jobs_data: List of job dictionaries
        search_context: Context about the search (category, location, etc.)
        
    Returns:
        Formatted job listing text matching the UI design
    """
    if not jobs_data:
        return "No jobs found matching your criteria."
    
    # Header matching the UI style
    html = f"<div style='margin-bottom: 1rem;'><strong>Here are some{search_context} job opportunities available for you</strong></div>\n"
    
    for i, job in enumerate(jobs_data, 1):
        # Job title with number (pink color like in image)
        html += f"<div style='margin-bottom: 1rem;'>\n"
        html += f"<div style='color: #EA60A6; font-weight: 600; margin-bottom: 0.5rem;'>{i}. {job.get('job_title', 'Job Title')}</div>\n"
        
        # Company with bullet point
        html += f"<div style='margin-left: 1rem; margin-bottom: 0.25rem;'>\n"
        html += f"<span style='color: #EA60A6; margin-right: 0.5rem;'>•</span>"
        html += f"<strong>Company:</strong> {job.get('company', 'Company Name')}\n"
        html += f"</div>\n"
        
        # Type with bullet point (instead of location)
        if job.get('employment_type'):
            html += f"<div style='margin-left: 1rem; margin-bottom: 0.25rem;'>\n"
            html += f"<span style='color: #EA60A6; margin-right: 0.5rem;'>•</span>"
            html += f"<strong>Type:</strong> {job['employment_type']}\n"
            html += f"</div>\n"
        
        # Salary if available
        if job.get('salary_min') and job.get('salary_max') and job['salary_min'] != 1 and job['salary_max'] != 1:
            html += f"<div style='margin-left: 1rem; margin-bottom: 0.25rem;'>\n"
            html += f"<span style='color: #EA60A6; margin-right: 0.5rem;'>•</span>"
            if job['salary_min'] == job['salary_max']:
                html += f"<strong>Salary:</strong> {job['salary_min']:,} RWF\n"
            else:
                html += f"<strong>Salary:</strong> {job['salary_min']:,} - {job['salary_max']:,} RWF\n"
            html += f"</div>\n"
        
        html += f"</div>\n"  # Close job container
    
    return html


# Global variable to store jobs data for frontend
_current_jobs_data = None

@tool
def search_jobs(
    query: str = "",
    category: Optional[str] = None,
    location: Optional[str] = None,
    page: Optional[int] = 1,
    per_page: Optional[int] = 6,
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
            # Debug: Print job data to see what fields are available
            print(f"🔍 Raw job data: {job}")
            
            normalized_job = {
                'job_id': job.get('job_id') or job.get('id'),
                'job_title': job.get('job_title') or job.get('title') or 'Untitled',
                'company': job.get('company') or job.get('company_name') or 'Company',
                'location': None,  # API location field contains wrong data (employment type)
                'description': job.get('job_description') or job.get('description'),
                'employment_type': job.get('location') if job.get('location') in ['Full Time', 'Part Time', 'Contract', 'Temporary', 'Freelance'] else None,
                'salary_min': job.get('salary_min') or job.get('min_salary'),
                'salary_max': job.get('salary_max') or job.get('max_salary'),
                'deadline': job.get('deadline') or job.get('application_deadline'),
                'logo': job.get('logo') or job.get('company_logo'),
                'category': job.get('category') or job.get('category_name'),
                'created_at': job.get('created_at') or job.get('posted_date')
            }
            
            # Debug: Print normalized job to see what we got
            print(f"📋 Normalized job: location='{normalized_job['location']}', employment_type='{normalized_job['employment_type']}'")
            
            normalized_jobs.append(normalized_job)
        
        # Enhanced filtering for both category and query-based searches
        if (category or query) and normalized_jobs:
            filtered_jobs = []
            
            # Define valid categories and their keywords
            valid_categories = {
                'pet sitters': ['pet', 'sitter', 'animal', 'dog', 'cat', 'pet care', 'pet sitting', 'animal care', 'dog walking', 'pet walker'],
                'other': ['other', 'miscellaneous', 'general', 'various', 'temp', 'temporary', 'casual'],
                'customer service representative': ['customer service', 'support', 'representative', 'call center', 'help desk', 'customer support', 'client service', 'service representative', 'call centre', 'customer care'],
                'data entry clerk': ['data entry', 'clerk', 'typing', 'administrative', 'office', 'data clerk', 'admin', 'office clerk', 'administrative assistant', 'data processing'],
                'construction worker': ['construction', 'building', 'worker', 'laborer', 'contractor', 'builder', 'mason', 'carpenter', 'plumber', 'electrician', 'welder', 'roofer'],
                'driver': ['driver', 'transport', 'logistics', 'delivery', 'shipping', 'driving', 'chauffeur', 'truck driver', 'taxi driver', 'delivery driver', 'courier'],
                'security guard': ['security', 'guard', 'protection', 'safety', 'surveillance', 'security officer', 'watchman', 'security personnel', 'bodyguard'],
                'salesperson': ['sales', 'selling', 'salesperson', 'business development', 'account manager', 'sales representative', 'sales agent', 'marketing sales', 'retail sales'],
                'waiter / waitress': ['waiter', 'waitress', 'server', 'restaurant', 'food service', 'waitstaff', 'food server', 'dining', 'hospitality'],
                'warehouse worker': ['warehouse', 'storage', 'inventory', 'logistics', 'packing', 'warehouse operator', 'stock', 'fulfillment', 'distribution'],
                'farmer': ['farmer', 'agriculture', 'farming', 'crop', 'livestock', 'agricultural', 'farm worker', 'agricultural worker', 'cultivation'],
                'housekeeper': ['housekeeper', 'cleaning', 'domestic', 'housekeeping', 'cleaner', 'domestic worker', 'maid', 'house cleaner'],
                'hairdresser': ['hairdresser', 'hair', 'salon', 'stylist', 'beauty', 'barber', 'hair stylist', 'beautician', 'cosmetologist'],
                'babysitter': ['babysitter', 'childcare', 'nanny', 'child', 'kids', 'child care', 'daycare', 'au pair', 'caregiver'],
                'machine operator': ['machine operator', 'operator', 'machinery', 'equipment', 'manufacturing', 'production operator', 'factory worker'],
                'accountant': ['accountant', 'accounting', 'financial', 'bookkeeper', 'finance', 'bookkeeping', 'financial analyst', 'accounts'],
                'doctor': ['doctor', 'physician', 'medical', 'healthcare', 'clinic', 'nurse', 'medical officer', 'health', 'medical practitioner'],
                'lawyer': ['lawyer', 'attorney', 'legal', 'law', 'advocate', 'legal advisor', 'counsel', 'solicitor', 'barrister'],
                'architect': ['architect', 'design', 'building design', 'construction design', 'architectural', 'designer'],
                'teacher': ['teacher', 'education', 'training', 'instructor', 'academic', 'educator', 'tutor', 'lecturer', 'professor'],
                'project manager': ['project manager', 'manager', 'management', 'coordinator', 'project coordinator', 'team leader', 'supervisor'],
                'human resources officer': ['human resources', 'hr', 'personnel', 'recruitment', 'recruiter', 'hr officer', 'talent acquisition'],
                'marketing specialist': ['marketing', 'digital marketing', 'social media', 'advertising', 'promotion', 'brand', 'marketing specialist', 'marketing manager', 'seo', 'content marketing'],
                'software developer': ['software developer', 'developer', 'programmer', 'software', 'tech', 'coding', 'it', 'information technology', 'computer', 'web developer', 'mobile developer', 'frontend', 'backend', 'fullstack', 'java', 'python', 'javascript', 'react', 'angular', 'node', 'php', 'c++', 'c#', '.net', 'database', 'sql', 'devops', 'system administrator', 'network', 'cybersecurity', 'data analyst', 'software engineer', 'technical support', 'help desk'],
                'chef': ['chef', 'cook', 'kitchen', 'culinary', 'food preparation', 'head chef', 'sous chef', 'line cook', 'baker'],
                'receptionist': ['receptionist', 'front desk', 'reception', 'office assistant', 'front office', 'desk clerk'],
                'cleaners': ['cleaners', 'cleaning', 'janitor', 'maintenance', 'housekeeping', 'cleaner', 'housekeeper', 'domestic worker', 'sanitation', 'custodial', 'janitorial', 'facility maintenance', 'office cleaning', 'house cleaning', 'commercial cleaning'],
                'manpower': ['manpower', 'labor', 'workforce', 'general labor', 'temporary work', 'casual work', 'day labor', 'manual labor']
            }
            
            # Determine search keywords
            search_keywords = []
            
            if category:
                category_lower = category.lower().strip()
                # Find matching category keywords
                for valid_cat, keywords in valid_categories.items():
                    if category_lower == valid_cat or category_lower in keywords:
                        search_keywords.extend(keywords)
                        print(f"🔍 Category '{category}' matched to '{valid_cat}' with keywords: {keywords}")
                        break
                
                if not search_keywords:
                    print(f"❌ Category '{category}' not recognized")
                    suggestions = []
                    for valid_cat, keywords in valid_categories.items():
                        if any(keyword in category_lower or category_lower in keyword for keyword in keywords):
                            suggestions.append(valid_cat)
                    
                    if suggestions:
                        return f"❌ We couldn't find jobs for '{category}'. Did you mean: {', '.join(suggestions[:3])}? Please try searching with one of these categories."
                    else:
                        available_cats = ', '.join(list(valid_categories.keys())[:10])
                        return f"❌ We couldn't find jobs for '{category}'. Available job categories include: {available_cats}, and more. Please try searching with a valid category."
            
            if query:
                query_lower = query.lower().strip()
                # Add query terms as search keywords
                search_keywords.extend([query_lower])
                
                # Also check if query matches any category keywords
                for valid_cat, keywords in valid_categories.items():
                    if any(keyword in query_lower or query_lower in keyword for keyword in keywords):
                        search_keywords.extend(keywords)
                        print(f"🔍 Query '{query}' matched category '{valid_cat}' keywords: {keywords}")
                        break
            
            # Filter jobs using search keywords
            for job in normalized_jobs:
                job_title = (job.get('job_title') or '').lower()
                job_category = (job.get('category') or '').lower()
                job_description = (job.get('description') or '').lower()[:200]
                
                # Special strict filtering for IT/Tech searches
                if query and query.lower().strip() in ['it', 'tech', 'software', 'developer', 'programming']:
                    # For IT searches, require strong tech indicators
                    tech_indicators = ['software', 'developer', 'programmer', 'tech', 'it', 'computer', 'web', 'mobile', 'frontend', 'backend', 'fullstack', 'java', 'python', 'javascript', 'react', 'angular', 'node', 'php', 'c++', 'c#', '.net', 'database', 'sql', 'devops', 'system', 'network', 'cybersecurity', 'data analyst', 'engineer', 'technical']
                    
                    # Exclude non-tech terms that might cause false matches
                    non_tech_terms = ['waiter', 'waitress', 'kitchen', 'cook', 'chef', 'food', 'restaurant', 'cleaning', 'cleaner', 'security', 'guard', 'driver', 'sales', 'marketing', 'customer service', 'receptionist', 'assistant']
                    
                    # Check if job has tech indicators and no non-tech terms
                    has_tech = any(tech in job_title or tech in job_category or tech in job_description for tech in tech_indicators)
                    has_non_tech = any(non_tech in job_title or non_tech in job_category for non_tech in non_tech_terms)
                    
                    if has_tech and not has_non_tech:
                        filtered_jobs.append(job)
                else:
                    # Regular keyword matching for other searches
                    match_found = False
                    for keyword in search_keywords:
                        if (keyword in job_title or 
                            keyword in job_category or 
                            keyword in job_description):
                            match_found = True
                            break
                    
                    if match_found:
                        filtered_jobs.append(job)
            
            if filtered_jobs:
                normalized_jobs = filtered_jobs
                search_term = category or query
                print(f"🔍 Filtered to {len(normalized_jobs)} jobs matching '{search_term}'")
            else:
                search_term = category or query
                print(f"❌ No jobs matched search term '{search_term}' with keywords: {search_keywords}")
                return f"❌ No jobs found matching '{search_term}'. Try searching for jobs in other categories like: pet sitters, customer service representative, data entry clerk, construction worker, driver, security guard, salesperson, accountant, doctor, teacher."
        
        # Limit to maximum 6 jobs for frontend display
        max_jobs = 6
        limited_jobs = normalized_jobs[:max_jobs]
        
        if len(limited_jobs) == 0:
            # Clear any existing jobs data since no jobs found
            global _current_jobs_data
            _current_jobs_data = None
            return "❌ No jobs found matching your criteria. Try adjusting your search terms or category."
        
        # Store jobs for frontend display as cards AND include in response
        _current_jobs_data = limited_jobs
        
        print(f"📋 STORED {len(limited_jobs)} jobs for display as cards")
        print(f"📋 First job stored: {limited_jobs[0].get('job_title', 'No title') if limited_jobs else 'None'}")
        
        # CRITICAL: Store jobs globally AND in environment for streaming response
        os.environ['JOBS_DATA_AVAILABLE'] = 'true'
        os.environ['CURRENT_JOBS_JSON'] = __import__('json').dumps(limited_jobs)
        
        # Generate context for detailed text
        search_context = ""
        if category:
            search_context += f" in {category}"
        if location:
            search_context += f" in {location}"
        
        # Generate detailed job text for thread storage
        detailed_text = generate_detailed_job_text(limited_jobs, search_context)
        os.environ['THREAD_JOBS_TEXT'] = detailed_text
        
        # Return short descriptive text for immediate response
        result_msg = f"I found {len(limited_jobs)} great job opportunities{search_context} that match your search criteria."
        
        print(f"🔍 SEARCH_JOBS TOOL RETURNING: '{result_msg}'")
        print(f"📋 Jobs stored: {len(_current_jobs_data)} jobs for frontend cards")
        print(f"📝 Detailed text stored for thread: {len(detailed_text)} characters")
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
        
        # Call search_jobs tool to get jobs and generate both texts
        result = search_jobs.invoke({
            "query": search_query,
            "category": category_preference,
            "location": location_preference,
            "per_page": 6,
            "fetch_all": False,
            "api_token": token
        })
        
        # The search_jobs tool already handles the dual-text logic
        return result
        
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
            "• Pet Sitters",
            "• Customer Service Representative",
            "• Data Entry Clerk",
            "• Construction Worker",
            "• Driver",
            "• Security Guard",
            "• Salesperson",
            "• Waiter / Waitress",
            "• Warehouse Worker",
            "• Farmer",
            "• Housekeeper",
            "• Hairdresser",
            "• Babysitter",
            "• Machine Operator",
            "• Accountant",
            "• Doctor",
            "• Lawyer",
            "• Architect",
            "• Teacher",
            "• Project Manager",
            "• Human Resources Officer",
            "• Marketing Specialist",
            "• Software Developer",
            "• Chef",
            "• Receptionist",
            "• Cleaners",
            "• Manpower",
            "",
            "Please try again with a clearer search term! 😊"
        ]
        
        return "\n".join(response)
        
    except Exception as e:
        return f"I couldn't process your request. Please try searching for jobs using clear terms like 'sales', 'marketing', or 'IT jobs'. Error: {str(e)}"



# Global variables for external thread-based memory
_current_jobs_data = None
_thread_conversations = {}  # Store conversations by external thread ID

def get_or_create_thread_id(provided_thread_id=None):
    """Get existing thread ID or create new one."""
    if provided_thread_id:
        return provided_thread_id
    import uuid
    return str(uuid.uuid4())[:8]

def store_conversation_data(thread_id, data_type, data):
    """Store data for specific thread conversation."""
    global _thread_conversations
    if thread_id not in _thread_conversations:
        _thread_conversations[thread_id] = {'created': __import__('time').time(), 'jobs': [], 'history': []}
    _thread_conversations[thread_id][data_type] = data
    _thread_conversations[thread_id]['updated'] = __import__('time').time()

def get_conversation_data(thread_id, data_type):
    """Get data for specific thread conversation."""
    return _thread_conversations.get(thread_id, {}).get(data_type, [])

def get_current_jobs_data():
    """Get the current jobs data for frontend display."""
    global _current_jobs_data
    return _current_jobs_data

def clear_current_jobs_data():
    """Clear the current jobs data."""
    global _current_jobs_data
    _current_jobs_data = None