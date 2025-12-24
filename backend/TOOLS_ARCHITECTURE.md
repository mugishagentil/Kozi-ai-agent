# Tools Architecture - How AI Agents Use Tools

## 🎯 Overview

The Kozi AI system uses **LangChain Tools** to give AI agents the ability to interact with external APIs and perform actions. Think of tools as "superpowers" that the AI can use when needed.

## 🏗️ Architecture

```
User Question
    ↓
AI Agent (LLM)
    ↓
Decides: "Do I need a tool?"
    ↓
    ├─→ NO → Direct Response
    │
    └─→ YES → Call Tool(s)
            ↓
        Tool Execution (API calls, data processing)
            ↓
        Tool Result
            ↓
        AI Agent processes result
            ↓
        Final Response to User
```

## 🔧 How Tools Work

### 1. **Tool Definition** (`@tool` decorator)

```python
@tool
def search_jobs(query: str, category: str = None) -> str:
    """
    Search for jobs on the Kozi platform.
    
    Args:
        query: Search keywords
        category: Job category filter
        
    Returns:
        Formatted string with job results
    """
    # Tool implementation
    response = requests.get(JOBS_API_URL, params={...})
    return formatted_results
```

**Key Components:**
- `@tool` decorator: Registers function as a LangChain tool
- **Docstring**: AI reads this to understand WHEN and HOW to use the tool
- **Type hints**: AI knows what parameters to pass
- **Return type**: Always returns `str` (AI can read text)

### 2. **Agent Decision Making**

The AI agent (LLM) decides whether to use tools based on:

1. **User's question** - "Find me a job" → needs `search_jobs` tool
2. **Tool docstrings** - AI reads descriptions to match intent
3. **Context** - Previous conversation history
4. **System prompt** - Instructions on when to use tools

**Example Flow:**

```
User: "I need a Python developer job in Kigali"
    ↓
AI thinks: "User wants jobs → I should use search_jobs tool"
    ↓
AI calls: search_jobs(query="Python developer", location="Kigali")
    ↓
Tool returns: "Found 5 jobs: 1. Senior Python Dev at Company X..."
    ↓
AI formats: "I found 5 Python developer jobs in Kigali for you: ..."
```

### 3. **Tool Execution Chain**

```python
# In BaseAgent class
self.agent_executor = AgentExecutor(
    agent=self.agent,
    tools=self.tools,  # List of available tools
    verbose=True,      # Show what AI is thinking
    max_iterations=5   # Max tool calls per question
)
```

**Execution Steps:**
1. User sends message
2. Agent receives input + chat history
3. Agent decides if tools needed
4. If yes: Call tool(s) → Get results → Process
5. Generate final response
6. Save to thread history

## 🛠️ Available Tools

### **1. search_jobs** - Job Search
```python
search_jobs(
    query="Python developer",
    category="IT",
    location="Kigali",
    fetch_all=True
)
```

**What it does:**
- Calls Kozi Jobs API
- Filters by category, location, keywords
- Returns formatted job listings
- Supports pagination (fetch_all=True gets all jobs)

**When AI uses it:**
- User asks for jobs
- User mentions job type ("I need a sales job")
- User wants to see available positions

### **2. get_user_profile** - User Profile Retrieval
```python
get_user_profile(
    users_id=123,
    api_token="Bearer xxx"
)
```

**What it does:**
- Fetches user's profile from Kozi API
- Returns: name, skills, experience, education, work history
- Used for personalized recommendations

**When AI uses it:**
- User asks to write CV/resume
- User wants personalized job matches
- User says "use my profile"

### **3. find_matching_jobs_for_user** - Personalized Job Matching
```python
find_matching_jobs_for_user(
    users_id=123,
    api_token="Bearer xxx"
)
```

**What it does:**
1. Gets user profile (skills, preferences, location)
2. Searches jobs matching their profile
3. Returns personalized recommendations

**When AI uses it:**
- User asks "What jobs match my profile?"
- User wants personalized suggestions
- User says "Find me a job"

### **4. get_job_categories** - Category List
```python
get_job_categories(api_token="Bearer xxx")
```

**What it does:**
- Returns list of all job categories
- Used to help users filter jobs

**When AI uses it:**
- User asks "What job categories are available?"
- User wants to explore options

### **5. search_job_seekers_by_category** - Candidate Search (Employer)
```python
search_job_seekers_by_category(
    category="IT",
    location="Kigali"
)
```

**What it does:**
- Searches for job seekers by category
- Used by employer agent

**When AI uses it:**
- Employer asks for candidates
- Employer wants to hire for specific role

### **6. retrieve_knowledge_base** - Platform Knowledge
```python
retrieve_knowledge_base(query="How do I post a job?")
```

**What it does:**
- Searches Kozi platform documentation
- Returns relevant information about features, policies

**When AI uses it:**
- User asks "How do I..." questions
- User wants to know about platform features
- User needs help with platform functionality

## 🔐 Authentication & Context

### **API Token Flow**

```python
# 1. User sends request with Authorization header
POST /api/chat
Authorization: Bearer <token>

# 2. Backend extracts token
api_token = authorization.split("Bearer ")[1]

# 3. Passes to agent context
agent.answer_question(
    question="Find me a job",
    context={
        "users_id": 123,
        "api_token": token
    }
)

# 4. Agent sets token in environment
os.environ['API_TOKEN'] = token

# 5. Tools read token from environment
def search_jobs(...):
    token = os.getenv('API_TOKEN')
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(API_URL, headers=headers)
```

### **User ID Extraction**

```python
# Method 1: From JWT token
payload = jwt.decode(token)
users_id = payload['users_id']

# Method 2: From input text pattern
input_text = "[User ID: 123] Find me a job"
users_id = extract_user_id_from_input(input_text)

# Method 3: From context dict
context = {"users_id": 123}
```

## 🎭 Agent-Specific Tools

### **JobSeeker Agent**
```python
tools = [
    retrieve_knowledge_base,
    search_jobs,
    get_user_profile,
    find_matching_jobs_for_user,
    get_job_categories
]
```

### **Employer Agent**
```python
tools = [
    retrieve_knowledge_base,
    search_job_seekers_by_category,
    get_job_categories
]
```

### **Admin Agent**
```python
tools = [
    search_jobs,
    get_job_categories,
    search_job_seekers_by_category
]
```

## 🧠 AI Decision Logic

### **When AI Uses Tools**

```python
# System prompt guides AI behavior
system_prompt = """
**CRITICAL: Tool Usage Guidelines:**
- DO NOT use tools for simple greetings (hello, hi, thanks)
- DO NOT use tools for casual conversation
- ONLY use tools when user asks SPECIFIC questions that require them

Examples:
✅ "Find me a job" → Use search_jobs tool
✅ "Write my CV" → Use get_user_profile tool
✅ "What jobs match my profile?" → Use find_matching_jobs_for_user
❌ "Hello" → Respond directly, no tools
❌ "Thanks" → Respond directly, no tools
"""
```

### **Tool Call Example (Verbose Output)**

```
📤 Sending to agent: Find me a Python job
🛠️  Available tools: ['retrieve_knowledge_base', 'search_jobs', 'get_user_profile']

> Entering new AgentExecutor chain...

Thought: User wants to find a job. I should use search_jobs tool.

Action: search_jobs
Action Input: {"query": "Python", "fetch_all": true}

🔍 search_jobs called with: query=Python, fetch_all=True
📡 Making API request to: https://apis.kozi.rw/jobs
📥 API response status: 200
📄 Fetched page 1: 15 jobs

Observation: Found 15 jobs:
1. **Senior Python Developer**
   Company: Tech Corp
   Location: Kigali
   ...

Thought: I have the job results. I can now respond to the user.

Final Answer: I found 15 Python developer jobs for you! Here are the top matches: ...

> Finished chain.
✅ Response generated
```

## 🔄 Memory & Thread Management

### **OpenAI Threads**

```python
# Create thread
thread_id = agent.create_thread(metadata={
    "users_id": "123",
    "role_type": "employee"
})

# Add message to thread
agent.answer_question(
    question="Find me a job",
    thread_id=thread_id  # Maintains history
)

# Get thread history
messages = agent.get_thread_messages(thread_id)
```

**Benefits:**
- Conversation history preserved
- AI remembers context across messages
- No database queries needed
- Managed by OpenAI infrastructure

## 📊 Performance Optimization

### **Tool Call Optimization**

```python
# 1. Reduce unnecessary tool calls
if is_greeting(message):
    return direct_response()  # No tools

# 2. Batch API calls
if fetch_all:
    # Get all pages in one execution
    while has_more_pages:
        fetch_next_page()

# 3. Cache results
@lru_cache(maxsize=100)
def get_job_categories():
    # Cached for repeated calls
    return fetch_categories()

# 4. Timeout limits
requests.get(url, timeout=30.0)  # Fail fast

# 5. Reduced max_iterations
AgentExecutor(max_iterations=5)  # Prevent infinite loops
```

## 🐛 Debugging Tools

### **Enable Verbose Mode**

```python
AgentExecutor(
    verbose=True,  # Shows AI thinking process
    return_intermediate_steps=True  # Returns tool calls
)
```

### **Check Tool Calls**

```python
result = agent_executor.invoke(input)

# See what tools were called
for step in result['intermediate_steps']:
    tool_name = step[0].tool
    tool_input = step[0].tool_input
    tool_output = step[1]
    print(f"Tool: {tool_name}, Input: {tool_input}, Output: {tool_output}")
```

## 🎯 Best Practices

1. **Clear Docstrings** - AI reads these to understand tools
2. **Type Hints** - Help AI pass correct parameters
3. **Error Handling** - Return helpful error messages as strings
4. **Authentication** - Pass tokens through context
5. **Pagination** - Support fetch_all for complete results
6. **Timeouts** - Prevent hanging requests
7. **Logging** - Print debug info for troubleshooting
8. **Optimization** - Avoid unnecessary tool calls

## 🔗 Tool Chain Example

```python
# Complex query requiring multiple tools
User: "Write my CV based on my profile"
    ↓
AI: "I need user profile first"
    ↓
Tool 1: get_user_profile(users_id=123)
    ↓
Result: {name, skills, experience, education}
    ↓
AI: "Now I can write the CV"
    ↓
AI generates CV using profile data
    ↓
Final Response: "Here's your professional CV: ..."
```

## 📝 Summary

**Tools = AI Superpowers**
- Tools let AI interact with external systems
- AI decides when to use tools based on user intent
- Tools return text results that AI can process
- Each agent has role-specific tools
- Memory is maintained through OpenAI threads
- Authentication flows through context
- Optimization prevents unnecessary tool calls

The system is designed to be:
- **Fast** - Minimal tool calls, optimized API requests
- **Smart** - AI knows when tools are needed
- **Reliable** - Error handling and timeouts
- **Scalable** - Thread-based memory, no DB bottlenecks
