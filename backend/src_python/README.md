# Kozi AI Backend - Python LangChain Implementation

This is the new Python-based AI backend for Kozi, built with LangChain and OpenAI, replacing the previous Node.js/LangChain JS implementation.

## Features

- 🤖 **Three AI Agents** - Job Seeker, Employer, and Admin agents
- 📚 **Qdrant Knowledge Base** - Vector database integration for platform knowledge
- 🔧 **MCP Tools** - Modular tool system for API integrations (no web scraping)
- 💬 **Chat History** - MySQL database with Prisma ORM
- 📝 **REST API** - FastAPI endpoints

## Tech Stack

- **Python 3.10+** - FastAPI, LangChain, OpenAI
- **Qdrant Cloud** - Vector database for knowledge base
- **MySQL** - Chat history storage (via Prisma)
- **OpenAI GPT-4o** - AI model

## Project Structure

```
src_python/
├── agents/
│   ├── __init__.py
│   ├── base_agent.py          # Base agent class
│   ├── jobseeker_agent.py     # Job seeker agent
│   ├── employer_agent.py      # Employer agent
│   ├── admin_agent.py         # Admin agent
│   └── retrieval_tool.py      # Knowledge base retrieval tool
├── tools/
│   ├── __init__.py
│   └── mcp_tools.py           # MCP tools for APIs
├── config/
│   ├── __init__.py
│   └── qdrant_config.py      # Qdrant connection & setup
├── scripts/
│   └── populate_qdrant.py    # Populate knowledge base
├── database.py                # Prisma client management
└── main.py                    # FastAPI server
```

## Setup

### 1. Activate Virtual Environment

**IMPORTANT: Always activate the virtual environment first!**

**Linux/Mac:**
```bash
cd backend
source venv/bin/activate
```

**Windows:**
```cmd
cd backend
venv\Scripts\activate
```

You should see `(venv)` in your terminal prompt.

### 2. Install Dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### 3. Environment Variables

Create `.env` file in the `backend` directory:

```env
# Required
OPENAI_API_KEY=your_openai_api_key

# Optional
OPENAI_MODEL=gpt-4o
PORT=5050
DATABASE_URL=mysql://user:password@host:port/database

# Qdrant (optional but recommended)
QDRANT_URL=your_qdrant_cloud_url
QDRANT_API_KEY=your_qdrant_api_key
QDRANT_COLLECTION_NAME=kozi_knowledge

# API Configuration
JOBS_API_URL=https://api.kozi.rw/jobs
JOB_CATEGORIES_API=https://api.kozi.rw/categories
JOB_SEEKERS_BY_CATEGORY_API=https://api.kozi.rw/job-seekers
API_BASE_URL=http://localhost:5050
```

### 4. Setup Database

```bash
# Generate Prisma client
PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1 python -m prisma generate

# Run migrations (if needed)
npx prisma migrate dev
```

### 5. Setup Qdrant Knowledge Base

```bash
# Create data/knowledge_base directory and add .txt files
mkdir -p data/knowledge_base

# Populate knowledge base
cd src_python
python scripts/populate_qdrant.py
```

### 6. Run Server

**IMPORTANT: Make sure virtual environment is activated!**

```bash
# Verify venv is activated (you should see (venv) in your prompt)
# If not activated, run: source ../venv/bin/activate (from backend directory)

python main.py
```

Server runs on `http://localhost:5050`

## API Endpoints

- `POST /api/chat` - Chat with automatic history (supports role_type: "employee", "employer", "admin")
- `POST /api/chat/employer` - Employer-specific chat endpoint
- `POST /api/chat/history` - Chat with explicit history
- `GET /api/chat/{session_id}` - Get chat history
- `GET /api/chat/recent` - List recent chats
- `GET /health` - Health check

**API Docs:** http://localhost:5050/docs

## Agents

### Job Seeker Agent
- Helps job seekers find jobs
- Uses `search_jobs` and `get_job_categories` tools
- Accessible via `role_type: "employee"`

### Employer Agent
- Helps employers find job seekers
- Uses `search_job_seekers_by_category` and `get_job_categories` tools
- Accessible via `role_type: "employer"`

### Admin Agent
- Provides general support and platform information
- Has access to all tools
- Accessible via `role_type: "admin"`

## MCP Tools

The MCP (Model Context Protocol) tools are located in `tools/mcp_tools.py` and provide:
- `search_jobs` - Search for jobs
- `get_job_categories` - Get available job categories
- `search_job_seekers_by_category` - Search for job seekers

These tools can be extended to support additional APIs as needed.

## Knowledge Base

The knowledge base is stored in Qdrant and can be populated using the `populate_qdrant.py` script. Place your `.txt` files in `data/knowledge_base/` directory.

## Migration Notes

- Old LangChain JS agents have been removed
- Web scraping functionality has been removed (as requested)
- MCP support is maintained for API integrations
- Database schema remains compatible with existing Prisma setup

## Troubleshooting

**Qdrant Connection Issues:**
- Verify `QDRANT_URL` and `QDRANT_API_KEY` in `.env`
- Knowledge base is optional - agents will work without it

**Database Issues:**
- Run `python -m prisma generate` to generate Prisma client
- Verify `DATABASE_URL` is correct

**Import Errors:**
- Activate virtual environment
- Ensure you're running from the correct directory
- Check that all dependencies are installed

