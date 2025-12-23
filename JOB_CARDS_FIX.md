# Job Cards Issue Fix

## Problem Identified

The job cards are displaying unfetched/hardcoded data instead of the actual jobs returned from user queries. The issue is in the data flow between backend and frontend.

## Root Cause

1. **Backend**: The `search_jobs` tool in `mcp_tools.py` correctly fetches jobs and stores them in `_current_jobs_data`
2. **Agent**: The `BaseAgent` class has methods to get job data from tools
3. **Streaming**: The streaming endpoint checks for job data but may not be getting it properly
4. **Frontend**: The frontend correctly displays job cards when `message.jobs` exists

## The Fix

The issue is that the job data from the `search_jobs` tool is not being properly passed through the agent to the streaming endpoint. Here's the minimal fix:

### 1. Update the streaming endpoint in `main.py`

In the `generate_response()` function within the `/api/chat/stream` endpoint, add a fallback check:

```python
# Check for job data to send to frontend
jobs_data = agent.get_jobs_data()
if jobs_data:
    print(f"📋 Sending {len(jobs_data)} jobs to frontend")
    yield f"data: {json.dumps({'jobs': jobs_data})}\\n\\n"
    # Clear the data after sending
    agent.clear_jobs_data()
else:
    # ALSO check the global jobs data from tools directly
    try:
        from tools.mcp_tools import get_current_jobs_data, clear_current_jobs_data
        global_jobs_data = get_current_jobs_data()
        if global_jobs_data:
            print(f"📋 Found {len(global_jobs_data)} jobs in global data, sending to frontend")
            yield f"data: {json.dumps({'jobs': global_jobs_data})}\\n\\n"
            clear_current_jobs_data()
    except ImportError:
        print("⚠️ Could not import job data functions")
```

### 2. Ensure the BaseAgent properly retrieves job data

In `base_agent.py`, the `_check_for_jobs_data()` method should be called after tool execution:

```python
def _check_for_jobs_data(self):
    """Check if there's job data available from tools."""
    try:
        from tools.mcp_tools import get_current_jobs_data
        return get_current_jobs_data()
    except ImportError:
        return None
```

## How It Works

1. User asks for jobs (e.g., "I need marketing jobs")
2. JobSeekerAgent calls `search_jobs` tool
3. `search_jobs` fetches jobs from API and stores in `_current_jobs_data`
4. Agent completes response and checks for job data
5. Streaming endpoint sends both text response AND job data to frontend
6. Frontend receives job data and displays cards
7. User sees actual job results instead of hardcoded cards

## Test the Fix

1. Ask: "I need marketing jobs"
2. Check browser console for: "📋 Sending X jobs to frontend"
3. Verify job cards show real job data with correct titles, companies, locations
4. Cards should be clickable and lead to actual job pages

## Files Modified

- `backend/src_python/main.py` - Added fallback job data check in streaming endpoint
- `backend/src_python/agents/base_agent.py` - Ensured job data retrieval works properly

The frontend code in `ChatArea.vue` and `useKoziChat.js` is already correct and doesn't need changes.