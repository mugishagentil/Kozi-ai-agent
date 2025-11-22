# Kozi AI Backend - Python

This is the Python-based AI backend for Kozi, built with LangChain, OpenAI, and FastAPI.

## 🚀 Quick Start

### Option 1: Using Startup Script (Recommended)

**Linux/Mac:**
```bash
./start.sh
```

**Windows:**
```cmd
start.bat
```

The script will automatically:
- Create virtual environment if needed
- Activate it
- Install dependencies
- Generate Prisma client
- Start the server

### Option 2: Manual Setup

#### 1. Create and Activate Virtual Environment

**Linux/Mac:**
```bash
python3 -m venv venv
source venv/bin/activate
```

**Windows:**
```cmd
python -m venv venv
venv\Scripts\activate
```

#### 2. Install Dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### 2. Environment Variables

Create `.env` file:

```env
# Required
OPENAI_API_KEY=your_openai_api_key
DATABASE_URL=mysql://user:password@host:port/database

# Optional
OPENAI_CHAT_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
PORT=5050

# Qdrant (optional but recommended)
QDRANT_URL=your_qdrant_cloud_url
QDRANT_API_KEY=your_qdrant_api_key
QDRANT_COLLECTION_NAME=kozi_knowledge

# API Configuration (for MCP tools)
JOBS_API_URL=https://api.kozi.rw/jobs
JOB_CATEGORIES_API=https://api.kozi.rw/categories
JOB_SEEKERS_BY_CATEGORY_API=https://api.kozi.rw/job-seekers
```

#### 3. Setup Database

```bash
# Generate Prisma client for Python
PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1 python -m prisma generate

# Run migrations (if needed)
python -m prisma db push
```

#### 4. Setup Knowledge Base (Optional)

```bash
# Create data/knowledge_base directory and add .txt files
mkdir -p data/knowledge_base

# Populate Qdrant knowledge base
cd src_python
python scripts/populate_qdrant.py
```

#### 5. Run Server

**IMPORTANT: Make sure virtual environment is activated!**

```bash
# Verify venv is activated (you should see (venv) in your prompt)
# If not activated, run: source venv/bin/activate

cd src_python
python main.py
```

Server runs on `http://localhost:5050`

## 📁 Project Structure

```
backend/
├── src_python/          # Python backend
│   ├── agents/          # AI agents (Job Seeker, Employer, Admin)
│   ├── tools/           # MCP tools for API integrations
│   ├── config/          # Configuration (Qdrant, etc.)
│   ├── scripts/         # Utility scripts
│   ├── database.py      # Prisma database client
│   └── main.py          # FastAPI server
├── prisma/              # Database schema and migrations
├── requirements.txt     # Python dependencies
└── .env                 # Environment variables
```

## 🔌 API Endpoints

- `POST /api/chat` - Main chat endpoint (supports role_type: "employee", "employer", "admin")
- `POST /api/chat/employer` - Employer-specific chat
- `GET /api/chat/{session_id}` - Get chat history
- `GET /api/chat/recent` - List recent chats
- `GET /health` - Health check
- `GET /docs` - API documentation (Swagger UI)

## 🤖 Agents

- **Job Seeker Agent** - Helps job seekers find jobs
- **Employer Agent** - Helps employers find job seekers
- **Admin Agent** - General support and platform information

## 📚 Knowledge Base

The knowledge base is stored in Qdrant vector database. Place your `.txt` files in `data/knowledge_base/` and run the populate script.

## 🛠️ Tech Stack

- **Python 3.10+** - FastAPI, LangChain, OpenAI
- **Qdrant Cloud** - Vector database for knowledge base
- **MySQL** - Chat history storage (via Prisma)
- **OpenAI GPT-4o** - AI model

## 📝 Notes

- This backend is **Python-only** - all JavaScript/Node.js code has been removed
- Prisma is used for database access (Python Prisma client)
- All chat functionality is handled by Python agents
