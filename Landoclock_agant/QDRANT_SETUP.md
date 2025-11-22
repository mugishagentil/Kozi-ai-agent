# Qdrant Integration Setup Guide

This guide explains how to set up and use the Qdrant knowledge base integration for Land O'Clock.

## Prerequisites

1. **Environment Variables** - Ensure your `.env` file contains:
   ```env
   QDRANT_URL=your_qdrant_cloud_url
   QDRANT_API_KEY=your_qdrant_api_key
   OPENAI_API_KEY=your_openai_api_key
   ```

2. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

## Quick Start

### 1. Test Connection

First, verify your Qdrant connection is working:

```bash
cd Backend
python test_qdrant_connection.py
```

This will test:
- Environment variables
- Qdrant Cloud connection
- OpenAI embeddings
- Collection existence
- Vector store operations

### 2. Populate Knowledge Base

Load the knowledge base files into Qdrant:

```bash
python scripts/populate_qdrant.py
```

This script will:
- Load all `.txt` files from `data/real_estate_knowledge/`
- Split them into chunks (500 chars, 100 overlap)
- Add them to the `landoclock_knowledge` collection in Qdrant

### 3. Use in Your Agent

The retrieval tool can be used in your LangChain agent:

```python
from agents.retrieval_tool import retrieve_real_estate_knowledge

# Use the tool in your agent
result = retrieve_real_estate_knowledge("What are the best areas to invest in Kigali?")
```

## File Structure

```
Backend/
├── config/
│   ├── __init__.py
│   └── qdrant_config.py          # Qdrant connection and configuration
├── agents/
│   ├── __init__.py
│   └── retrieval_tool.py          # LangChain tool for knowledge retrieval
├── scripts/
│   └── populate_qdrant.py        # Script to populate the knowledge base
├── data/
│   └── real_estate_knowledge/
│       ├── investment-guide.txt   # Investment strategies and market insights
│       └── about-land-oclock.txt  # Company information and platform features
└── test_qdrant_connection.py      # Connection test script
```

## Knowledge Base Content

The knowledge base contains:

1. **investment-guide.txt**: 
   - Real estate investment strategies
   - Property evaluation methods
   - Rwanda market analysis
   - AI applications in real estate
   - Best ROI areas in Kigali

2. **about-land-oclock.txt**:
   - Company mission and vision
   - Platform features and benefits
   - How the platform works
   - Target market information

## Usage Examples

### Basic Retrieval

```python
from agents.retrieval_tool import retrieve_real_estate_knowledge

# Search for information
result = retrieve_real_estate_knowledge("How does Land O'Clock help tenants?")
print(result)
```

### Integration with LangChain Agent

```python
from langchain.agents import AgentExecutor, create_openai_tools_agent
from agents.retrieval_tool import retrieve_real_estate_knowledge

# Add the tool to your agent's tools
tools = [retrieve_real_estate_knowledge]

# Create agent with the tool
agent = create_openai_tools_agent(llm, tools, prompt)
```

## Troubleshooting

### Import Errors

If you get import errors, make sure you're running scripts from the `Backend` directory:

```bash
cd Backend
python test_qdrant_connection.py
```

### Collection Not Found

If the collection doesn't exist, it will be created automatically when you run `populate_qdrant.py` or call `create_collection_if_not_exists()`.

### Empty Results

If searches return no results:
1. Make sure you've populated the knowledge base (`populate_qdrant.py`)
2. Check that the collection has points: `python test_qdrant_connection.py`
3. Try a more general query

## Collection Management

### Check Collection Status

```python
from config.qdrant_config import get_collection_info

info = get_collection_info()
print(f"Points: {info['points_count']}")
```

### Clear and Re-index

If you need to re-index the knowledge base:

```python
from config.qdrant_config import delete_collection, create_collection_if_not_exists

delete_collection()
create_collection_if_not_exists()
# Then run populate_qdrant.py again
```

## Next Steps

1. ✅ Test connection: `python test_qdrant_connection.py`
2. ✅ Populate knowledge base: `python scripts/populate_qdrant.py`
3. ✅ Integrate retrieval tool into your agent
4. ✅ Test with sample queries

For questions or issues, check the error messages in the console output.

