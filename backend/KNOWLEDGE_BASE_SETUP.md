# Kozi Knowledge Base - Vector Embedding Setup

## Overview

This system processes the `Kozi_Rwanda_Knowledge_Base.pdf` file and stores it as vector embeddings in the database. The AI agents automatically use this knowledge base to provide more accurate and context-aware answers.

## Architecture

- **PDF Processing**: Uses LangChain to load and split the PDF into chunks
- **Vector Embeddings**: Uses OpenAI's `text-embedding-3-small` model to generate embeddings
- **Storage**: Stores embeddings in MySQL database (Railway) in the `documents` table
- **Retrieval**: Semantic search using cosine similarity to find relevant chunks
- **Priority**: Knowledge Base chunks are prioritized over other sources

## Setup Instructions

### 1. Database Migration

First, apply the schema migration to add the `source` field:

```bash
cd backend
npx prisma migrate dev --name add_source_to_documents
```

Or if you prefer to run the migration manually:

```sql
ALTER TABLE documents ADD COLUMN source VARCHAR(100) NULL;
```

Then generate Prisma client:

```bash
npx prisma generate
```

### 2. Environment Variables

Ensure these are set in your `.env` file:

```env
OPENAI_API_KEY=your_openai_api_key
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
DATABASE_URL=your_mysql_connection_string
```

### 3. Process Knowledge Base

Run the script to process the PDF and generate embeddings:

```bash
cd backend
npm run load-knowledge-base
```

This will:
- Load the PDF from `backend/src/utils/Kozi_Rwanda_Knowledge_Base.pdf`
- Split it into chunks (1000 chars with 200 char overlap)
- Generate embeddings for each chunk
- Store them in the database with `source: 'knowledge_base'`
- Clear any existing knowledge base entries first

### 4. Verify

Check that documents were inserted:

```sql
SELECT COUNT(*) FROM documents WHERE source = 'knowledge_base';
```

## How It Works

### Automatic Integration

The AI agents **already use** the knowledge base automatically:

1. When a user asks a question, the system calls `searchSimilarDocuments(query)`
2. This function:
   - Generates an embedding for the query
   - Searches all documents in the database
   - Calculates cosine similarity
   - **Boosts Knowledge Base chunks by 20%** for priority
   - **Sorts Knowledge Base chunks first**, then by similarity
   - Returns top 5 most relevant chunks

3. The relevant chunks are included in the `dbContext` passed to the AI prompt
4. The AI uses this context to provide accurate, knowledge-based answers

### Priority System

- Knowledge Base chunks get **1.2x similarity boost**
- Knowledge Base chunks are **sorted first** before other documents
- This ensures official knowledge base content is prioritized over other sources

## Updating Knowledge Base

To update the knowledge base (e.g., after updating the PDF):

```bash
npm run load-knowledge-base
```

This will:
- Clear existing knowledge base entries
- Process the new/updated PDF
- Generate fresh embeddings

## File Structure

```
backend/
├── src/
│   ├── config/
│   │   └── loadKnowledgeBase.js    # Script to process PDF
│   ├── utils/
│   │   ├── Kozi_Rwanda_Knowledge_Base.pdf  # Source PDF
│   │   └── chatUtils.js            # Contains searchSimilarDocuments()
│   └── services/
│       └── chat/
│           ├── employee.service.js # Uses searchSimilarDocuments()
│           ├── employer.service.js  # Uses searchSimilarDocuments()
│           └── admin.service.js     # Uses searchSimilarDocuments()
└── prisma/
    └── schema.prisma               # Database schema with documents table
```

## Troubleshooting

### PDF Not Found

Ensure the PDF is at: `backend/src/utils/Kozi_Rwanda_Knowledge_Base.pdf`

### Embedding Generation Failed

- Check your `OPENAI_API_KEY` is valid
- Check you have available API credits
- The script will skip failed chunks and continue

### Database Connection Issues

- Verify `DATABASE_URL` is correct
- Check Railway database is accessible
- Ensure Prisma client is generated: `npx prisma generate`

### No Results in Search

- Verify embeddings were created: `SELECT COUNT(*) FROM documents WHERE source = 'knowledge_base'`
- Check embeddings are not null: `SELECT COUNT(*) FROM documents WHERE embedding IS NOT NULL`
- Ensure the query is generating embeddings (check logs)

## Performance

- **Chunk Size**: 1000 characters (optimal for most content)
- **Overlap**: 200 characters (ensures context continuity)
- **Concurrency**: 3 embeddings generated simultaneously
- **Batch Size**: 10 documents inserted per batch
- **Search Limit**: Top 5 most relevant chunks returned

## Cost Estimation

- Embedding model: `text-embedding-3-small` (~$0.02 per 1M tokens)
- For a typical 100-page PDF:
  - ~200-300 chunks
  - ~$0.01-0.02 per processing run
  - Very cost-effective!

## Next Steps

1. ✅ Run migration to add `source` field
2. ✅ Process knowledge base PDF
3. ✅ Test with AI agents - they'll automatically use the knowledge base!

The agents will now provide more accurate answers based on the official Kozi Knowledge Base! 🚀

