# Land O'Clock Backend

AI-powered real estate agent backend using LangChain, OpenAI GPT-4o, and Qdrant vector database.

## Features

- 🤖 **AI Agent** - GPT-4o with LangChain agent framework
- 📚 **Qdrant Knowledge Base** - Vector database with 174+ knowledge chunks
- 💬 **Chat History** - PostgreSQL with Prisma ORM
- 🔍 **Smart Retrieval** - Automatic knowledge base search for all queries
- 📝 **REST API** - FastAPI endpoints

## Tech Stack

- **Python 3.10+** - FastAPI, LangChain, OpenAI
- **Qdrant Cloud** - Vector database for knowledge base
- **PostgreSQL** - Chat history storage
- **OpenAI GPT-4o** - AI model

## Quick Setup

### 1. Install Dependencies

```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Environment Variables

Create `.env` file:

```env
# Required
OPENAI_API_KEY=your_openai_api_key
QDRANT_URL=your_qdrant_cloud_url
QDRANT_API_KEY=your_qdrant_api_key

# Optional
OPENAI_MODEL=gpt-4o
PORT=3001
DATABASE_URL=postgresql://user:password@host:port/database

# ScrapingAnt (optional but recommended for better web scraping)
# Get your free API key from https://scrapingant.com/
# Free plan includes 10,000 API credits per month
SCRAPINGANT_API_KEY=your_scrapingant_api_key
```

### 3. Setup Qdrant Knowledge Base

```bash
# Test connection
python test_qdrant_connection.py

# Populate knowledge base
python scripts/populate_qdrant.py
```

### 4. Setup Database (Optional)

```bash
npx prisma generate
npx prisma db push
```

### 5. Run Server

```bash
python src/main.py
```

Server runs on `http://localhost:3001`

## Qdrant Knowledge Base

Our AI agent uses Qdrant vector database to retrieve information from:

- **Platform Information** - Mission, vision, features
- **Investment Strategies** - Buy-to-rent, land banking, etc.
- **Rwanda Market Insights** - Best ROI areas, market analysis
- **FAQ & Support** - Complete FAQ and contact information

**Collection:** `landoclock_knowledge`  
**Embeddings:** OpenAI text-embedding-3-small (1536 dimensions)  
**Total Chunks:** 174+ knowledge chunks

See [QDRANT_SETUP.md](./QDRANT_SETUP.md) for detailed setup.

## API Endpoints

- `POST /api/chat` - Chat with automatic history
- `GET /api/chat/{session_id}` - Get chat history
- `GET /api/chat/recent` - List recent chats
- `GET /health` - Health check

**API Docs:** http://localhost:3001/docs

## Project Structure

```
Backend/
├── src/
│   ├── agent.py          # AI agent with knowledge base integration
│   └── main.py           # FastAPI server
├── config/
│   └── qdrant_config.py  # Qdrant connection & setup
├── agents/
│   └── retrieval_tool.py # Knowledge base retrieval tool
├── scripts/
│   └── populate_qdrant.py # Populate knowledge base
├── data/real_estate_knowledge/  # Knowledge base files
└── requirements.txt
```

## How It Works

1. **User asks question** → Frontend sends to `/api/chat`
2. **Agent receives query** → LangChain agent executor processes it
3. **Auto knowledge search** → Calls `retrieve_real_estate_knowledge` tool
4. **Qdrant search** → Retrieves top 3 relevant chunks
5. **Response generation** → Agent uses retrieved info to answer
6. **No hardcoded info** → All answers come from knowledge base

## Troubleshooting

**Qdrant Connection Issues:**
- Verify `QDRANT_URL` and `QDRANT_API_KEY` in `.env`
- Run `python test_qdrant_connection.py`

**Knowledge Base Empty:**
- Run `python scripts/populate_qdrant.py`
- Check `data/real_estate_knowledge/` has `.txt` files

**Import Errors:**
- Activate virtual environment
- Run from `Backend/` directory

For more details, see [QDRANT_SETUP.md](./QDRANT_SETUP.md)
