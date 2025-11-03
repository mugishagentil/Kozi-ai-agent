const dotenv = require('dotenv');
dotenv.config();

const OpenAI = require('openai');
const { PrismaClient } = require('@prisma/client');
const { PDFLoader } = require('@langchain/community/document_loaders/fs/pdf');
const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');
const fs = require('fs');
const path = require('path');
const pLimit = require('p-limit');

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Path to the knowledge base PDF in utils folder
const KNOWLEDGE_BASE_PDF = path.join(__dirname, '../utils/Kozi_Rwanda_Knowledge_Base.pdf');
const CONCURRENCY_LIMIT = 3;
const BATCH_SIZE = 10;
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;

function normalizeVector(vec) {
  const mag = Math.sqrt(vec.reduce((sum, x) => sum + x * x, 0));
  return vec.map((x) => x / mag);
}

async function clearExistingKnowledgeBase() {
  try {
    // First, try to delete by source field (if migration has been run)
    // If source field doesn't exist, fall back to title pattern only
    try {
      const deleted = await prisma.documents.deleteMany({
        where: {
          OR: [
            { source: 'knowledge_base' },
            { title: { contains: 'Kozi_Rwanda_Knowledge_Base' } }
          ]
        }
      });
      console.log(`🗑️  Cleared ${deleted.count} existing knowledge base entries`);
    } catch (sourceError) {
      // If source field doesn't exist yet, use title pattern only
      if (sourceError.message?.includes('source') || sourceError.message?.includes('Unknown argument')) {
        console.log('⚠️  Source field not found, using title pattern only (run migration first)');
        const deleted = await prisma.documents.deleteMany({
          where: {
            title: { contains: 'Kozi_Rwanda_Knowledge_Base' }
          }
        });
        console.log(`🗑️  Cleared ${deleted.count} existing knowledge base entries (by title)`);
      } else {
        throw sourceError;
      }
    }
  } catch (error) {
    console.error('Error clearing existing entries:', error);
    // Continue anyway - might be first run
  }
}

async function processKnowledgeBase() {
  try {
    // Check if PDF exists
    if (!fs.existsSync(KNOWLEDGE_BASE_PDF)) {
      throw new Error(`Knowledge Base PDF not found at: ${KNOWLEDGE_BASE_PDF}`);
    }

    console.log('📚 Loading Knowledge Base PDF...');
    console.log(`📄 File: ${KNOWLEDGE_BASE_PDF}`);

    // Clear existing entries
    await clearExistingKnowledgeBase();

    // Load PDF
    const loader = new PDFLoader(KNOWLEDGE_BASE_PDF);
    const docs = await loader.load();
    console.log(`✅ Loaded ${docs.length} pages from PDF`);

    // Split documents into chunks
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: CHUNK_SIZE,
      chunkOverlap: CHUNK_OVERLAP,
    });

    const splitDocs = await splitter.splitDocuments(docs);
    console.log(`✅ Split into ${splitDocs.length} chunks`);

    // Prepare documents with metadata
    const allDocs = splitDocs.map((doc, index) => ({
      title: `Kozi_Rwanda_Knowledge_Base_Chunk_${index + 1}`,
      content: doc.pageContent,
      metadata: doc.metadata || {},
    }));

    console.log('🔮 Generating embeddings...');
    const limit = pLimit(CONCURRENCY_LIMIT);

    // Generate embeddings for all chunks
    const tasks = allDocs.map((doc) =>
      limit(async () => {
        try {
          const embeddingRes = await openai.embeddings.create({
            model: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
            input: doc.content,
          });

          const vector = normalizeVector(embeddingRes.data[0].embedding);
          return { ...doc, vector };
        } catch (error) {
          console.error(`Error generating embedding for chunk ${doc.title}:`, error);
          return null;
        }
      })
    );

    const docsWithVectors = (await Promise.all(tasks)).filter(Boolean);
    console.log(`✅ Generated ${docsWithVectors.length} embeddings`);

    // Insert into database in batches
    console.log('💾 Storing embeddings in database...');
    let insertedCount = 0;

    for (let i = 0; i < docsWithVectors.length; i += BATCH_SIZE) {
      const batch = docsWithVectors.slice(i, i + BATCH_SIZE);

      const insertPromises = batch.map(async (doc) => {
        const baseData = {
          title: doc.title.slice(0, 255),
          content: doc.content,
          embedding: JSON.stringify(doc.vector),
        };
        
        // Try to include source field, if it fails (field doesn't exist), retry without it
        try {
          return await prisma.documents.create({
            data: { ...baseData, source: 'knowledge_base' },
          });
        } catch (sourceError) {
          // If source field doesn't exist, create without it
          if (sourceError.message?.includes('source') || sourceError.message?.includes('Unknown argument')) {
            return await prisma.documents.create({ data: baseData });
          }
          throw sourceError;
        }
      });

      await Promise.all(insertPromises);
      insertedCount += batch.length;
      console.log(`✅ Inserted batch ${Math.floor(i / BATCH_SIZE) + 1} (${insertedCount}/${docsWithVectors.length})`);
    }

    console.log('\n✅ Knowledge Base successfully processed and stored!');
    console.log(`📊 Total chunks: ${docsWithVectors.length}`);
    console.log(`💾 Stored in: documents table`);
    console.log(`🚀 Your AI agents will now use this knowledge base for better answers!\n`);
    
    await prisma.$disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error processing Knowledge Base:', err);
    await prisma.$disconnect();
    process.exit(1);
  }
}

// Run the script
processKnowledgeBase();

