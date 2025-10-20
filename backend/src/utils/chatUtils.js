const OpenAI = require('openai');
const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');
const { PROMPT_TEMPLATES } = require('./prompts');

dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) throw new Error('Missing OPENAI_API_KEY');

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const prisma = new PrismaClient();
const titleModel = new OpenAI({ apiKey: OPENAI_API_KEY });

function normalizeVector(vec) {
  const mag = Math.sqrt(vec.reduce((sum, x) => sum + x * x, 0));
  return vec.map((x) => x / mag);
}

async function getEmbedding(text) {
  try {
    const model = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
    const response = await openai.embeddings.create({
      model,
      input: text,
    });
    return normalizeVector(response.data[0].embedding);
  } catch (err) {
    console.error('Embedding error:', err?.message || err);
    // Return empty vector to gracefully skip semantic search
    return [];
  }
}

function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  return a.reduce((sum, x, i) => sum + x * b[i], 0);
}

function isTextPart(part) {
  return part?.text !== undefined;
}

function extractMessageContent(content) {
  if (!content) return '';
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    const partsArray = content;
    const textParts = partsArray
      .filter(isTextPart)
      .map((part) => part.text ?? '');
    return textParts.join('');
  }
  return '';
}

async function searchSimilarDocuments(query, limit = 5) {
  const queryEmbedding = await getEmbedding(query);

  if (!Array.isArray(queryEmbedding) || queryEmbedding.length === 0) {
    // If embeddings failed or not available, skip similarity search
    return [];
  }

  const docs = await prisma.documents.findMany({
    where: { embedding: { not: null } },
    select: { id: true, title: true, content: true, embedding: true },
  });

  const results = docs
    .map((doc) => {
      try {
        const emb = Array.isArray(doc.embedding)
          ? doc.embedding
          : typeof doc.embedding === 'string'
          ? JSON.parse(doc.embedding)
          : [];

        if (!emb.length) return null;

        return { ...doc, similarity: cosineSimilarity(queryEmbedding, emb) };
      } catch (err) {
        console.error('Embedding parse error', doc.id, err);
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);

  return results;
}

function createFallbackTitle(message) {
  // Take first 40 chars of the message as title
  const cleaned = message.trim().substring(0, 40);
  return cleaned.length < message.length ? cleaned + '...' : cleaned;
}

async function generateChatTitle(firstMessage) {
  try {
    const resp = await titleModel.chat.completions.create({
      model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: PROMPT_TEMPLATES.titleGeneration,
        },
        { role: 'user', content: firstMessage },
      ],
    });

    const generatedTitle = resp.choices[0].message.content?.trim();
    
    // If generation fails, create a simple fallback from first message
    if (!generatedTitle) {
      return createFallbackTitle(firstMessage);
    }
    
    return generatedTitle;
  } catch (error) {
    console.error('Title generation error:', error);
    // Return fallback instead of null
    return createFallbackTitle(firstMessage);
  }
}

function setupSSEHeaders(res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
}

function processMessageContent(deltaContent) {
  let contentStr = '';

  if (typeof deltaContent === 'string') {
    contentStr = deltaContent;
  } else if (Array.isArray(deltaContent)) {
    const partsArray = deltaContent;
    const textParts = partsArray
      .filter(isTextPart)
      .map((part) => part.text ?? '');
    contentStr = textParts.join('');
  }

  return contentStr;
}

module.exports = {
  openai,
  prisma,
  titleModel,
  normalizeVector,
  getEmbedding,
  cosineSimilarity,
  isTextPart,
  extractMessageContent,
  searchSimilarDocuments,
  generateChatTitle,
  setupSSEHeaders,
  processMessageContent,
};
