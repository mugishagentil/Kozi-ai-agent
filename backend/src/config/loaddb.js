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

const PDF_FOLDER = 'D:/kozi-ai-agent/frontend/public/docs/';
const CONCURRENCY_LIMIT = 3;
const BATCH_SIZE = 10;

function normalizeVector(vec) {
  const mag = Math.sqrt(vec.reduce((sum, x) => sum + x * x, 0));
  return vec.map((x) => x / mag);
}

(async () => {
  try {
    const pdfFiles = fs.readdirSync(PDF_FOLDER).filter((f) => f.endsWith('.pdf'));
    if (pdfFiles.length === 0) throw new Error('No PDFs found in folder');

    const allDocs = [];

    for (const file of pdfFiles) {
      const loader = new PDFLoader(path.join(PDF_FOLDER, file));
      const docs = await loader.load();

      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
      });

      const splitDocs = await splitter.splitDocuments(docs);

      splitDocs.forEach((doc) => {
        allDocs.push({ title: file, content: doc.pageContent });
      });
    }

    console.log('✅ Total PDF chunks:', allDocs.length);

    const limit = pLimit(CONCURRENCY_LIMIT);

    const tasks = allDocs.map((doc) =>
      limit(async () => {
        const embeddingRes = await openai.embeddings.create({
          model: process.env.OPENAI_EMBEDDING_MODEL,
          input: doc.content,
        });

        const vector = normalizeVector(embeddingRes.data[0].embedding);

        return { ...doc, vector };
      })
    );

    const docsWithVectors = await Promise.all(tasks);
    console.log('✅ All embeddings generated');

    for (let i = 0; i < docsWithVectors.length; i += BATCH_SIZE) {
      const batch = docsWithVectors.slice(i, i + BATCH_SIZE);

      const insertPromises = batch.map((doc) =>
        prisma.documents.create({
          data: {
            title: doc.title.slice(0, 255),
            content: doc.content,
            embedding: JSON.stringify(doc.vector),
          },
        })
      );

      await Promise.all(insertPromises);
      console.log(`✅ Inserted batch ${i / BATCH_SIZE + 1}`);
    }

    console.log('✅ All PDF chunks inserted into MySQL as normalized embeddings');
    await prisma.$disconnect();
  } catch (err) {
    console.error('❌ Error:', err);
    await prisma.$disconnect();
    process.exit(1);
  }
})();
