const {
  prisma,
  openai,
  searchSimilarDocuments,
  generateChatTitle,
  setupSSEHeaders,
} = require('../../utils/chatUtils');
const { PROMPT_TEMPLATES } = require('../../utils/prompts');
const { fetchKoziWebsiteContext } = require('../../utils/fetchKoziWebsite');
const { getCachedWebsiteContext, setCachedWebsiteContext } = require('../../utils/websiteCache');
const { EmployerAgent, APIError, ValidationError } = require('../../utils/EmployerAgent');

const agentInstances = new Map();

// Friendly error messages mapping
const ERROR_MESSAGES = {
  // Authentication errors
  'NO_TOKEN': 'Your session has expired. Please refresh the page and try again.',
  'AUTH_ERROR': 'Your session has expired. Please refresh the page and try again.',
  'TOKEN_ERROR': 'There was an issue with your authentication. Please try again.',
  'FETCH_ERROR': 'We\'re having trouble connecting to our services right now. Please try again in a moment.',
  'NETWORK_ERROR': 'We\'re experiencing connectivity issues. Please check your internet connection and try again.',
  'API_ERROR': 'Our search service is temporarily unavailable. Please try again shortly.',
  'VALIDATION_ERROR': 'There was an issue with your request. Please check your input and try again.',
  'SEARCH_ERROR': 'We encountered an issue while searching for candidates. Please try again.',
  'CATEGORIES_UNAVAILABLE': 'Job categories are temporarily unavailable. Please try again later.',
  'DEFAULT': 'Something went wrong. Please try again or contact support if the problem persists.'
};

function getFriendlyErrorMessage(error, defaultMessage = 'Something went wrong. Please try again.') {
  if (error instanceof APIError || error instanceof ValidationError) {
    return ERROR_MESSAGES[error.code] || ERROR_MESSAGES.DEFAULT;
  }
  return defaultMessage;
}

function getAgentForSession(sessionId, apiToken = null) {
  if (!agentInstances.has(sessionId)) {
    const agent = new EmployerAgent('gpt-4-turbo', apiToken);
    agent.setSessionId(sessionId);
    agentInstances.set(sessionId, agent);
  } else if (apiToken) {
    const agent = agentInstances.get(sessionId);
    try {
      agent.setApiToken(apiToken);
    } catch (err) {
      console.warn('Failed to set API token on existing agent:', err.message);
      throw new APIError(`Failed to set API token: ${err.message}`, 'TOKEN_ERROR');
    }
  }
  return agentInstances.get(sessionId);
}

function cleanupAgent(sessionId) {
  agentInstances.delete(sessionId);
}

async function newChat(req, res) {
  try {
    const { users_id, firstMessage } = req.body;
    
    const apiToken = req.headers.authorization?.replace('Bearer ', '') || 
                     req.headers['x-api-token'];

    if (!users_id) {
      return res.status(400).json({ error: 'User ID is required to start a chat.' });
    }

    if (!apiToken) {
      return res.status(401).json({ error: 'Please provide your authentication token to continue.' });
    }

    const title = firstMessage?.trim()
      ? await generateChatTitle(firstMessage)
      : 'New Chat';

    const session = await prisma.chatSession.create({
      data: { users_id: parseInt(users_id), role_type: 'employer', title },
    });

    try {
      const agent = new EmployerAgent('gpt-4-turbo', apiToken);
      agent.setSessionId(session.id);
      agentInstances.set(session.id, agent);
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(400).json({ error: getFriendlyErrorMessage(error) });
      }
      throw error;
    }

    res.json({
      success: true,
      data: { session_id: session.id, title },
    });
  } catch (err) {
    console.error('POST /employer/chat/new error:', err);
    
    if (err instanceof APIError || err instanceof ValidationError) {
      return res.status(400).json({ error: getFriendlyErrorMessage(err) });
    }
    
    res.status(500).json({ error: 'We encountered an issue while creating your chat. Please try again.' });
  }
}

async function chat(req, res) {
  try {
    const { sessionId, message } = req.body;
    const action = req.query.action;
    
    const apiToken = req.headers.authorization?.replace('Bearer ', '') || 
                     req.headers['x-api-token'];

    if (action === 'loadPreviousSession') {
      if (!sessionId) {
        return res.status(400).json({ error: 'Session ID is required to load your chat.' });
      }

      const session = await prisma.chatSession.findUnique({
        where: { id: Number(sessionId) },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      });

      if (!session) {
        return res.status(404).json({ error: 'We couldn\'t find your chat session. It may have been deleted.' });
      }

      return res.json({
        success: true,
        messages: session.messages.map((m) => ({
          type: m.role,
          content: m.content,
          timestamp: m.createdAt,
        })),
      });
    }

    if (!sessionId || !message) {
      return res.status(400).json({ error: 'Both session ID and message are required to continue the conversation.' });
    }

    if (!apiToken) {
      return res.status(401).json({ error: 'Please provide your authentication token to continue.' });
    }

    const session = await prisma.chatSession.findUnique({
      where: { id: Number(sessionId) },
    });
    
    if (!session) {
      return res.status(404).json({ error: 'We couldn\'t find your chat session. Please start a new chat.' });
    }

    const latestMessage = Array.isArray(message)
      ? message.map((m) => m.content).join('\n')
      : String(message);

    await prisma.chatMessage.create({
      data: { 
        sessionId: Number(sessionId), 
        role: 'user', 
        content: latestMessage 
      },
    });

    // Generate title if needed
    if (!session.title || session.title === 'New Chat') {
      generateChatTitle(latestMessage)
        .then(async (title) => {
          if (title) {
            await prisma.chatSession.update({
              where: { id: Number(sessionId) },
              data: { title },
            });
            if (!res.writableEnded) {
              res.write(`data: ${JSON.stringify({ title })}\n\n`);
            }
          }
        })
        .catch(console.error);
    }

    setupSSEHeaders(res);
    const conversationHistory = await prisma.chatMessage.findMany({
      where: { sessionId: Number(sessionId) },
      orderBy: { createdAt: 'asc' },
      take: 10,
    });

    const historyForAgent = conversationHistory.map(m => ({
      role: m.role,
      content: m.content
    }));

    let agent;
    try {
      agent = getAgentForSession(Number(sessionId), apiToken);
    } catch (error) {
      if (error instanceof ValidationError || error instanceof APIError) {
        const friendlyMessage = getFriendlyErrorMessage(error);
        res.write(`data: ${JSON.stringify({ 
          content: friendlyMessage,
          error: true,
          code: error.code || 'AUTH_ERROR'
        })}\n\n`);
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
        return;
      }
      throw error;
    }

    // Try employer agent first with conversation history
    let agentResult;
    try {
      agentResult = await agent.processMessage(latestMessage, historyForAgent);
    } catch (error) {
      // Handle specific API errors from the agent with friendly messages
      if (error instanceof APIError) {
        const friendlyMessage = getFriendlyErrorMessage(error);
        res.write(`data: ${JSON.stringify({ 
          content: friendlyMessage,
          error: true,
          code: error.code
        })}\n\n`);
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
        return;
      }
      throw error;
    }

    // If agent returned null, it doesn't want to handle - use general chat
    if (agentResult === null) {
      await handleOpenAIChat(session, latestMessage, res);
      return;
    }

    // Handle clarification responses (no candidates, just asking for more info)
    if (agentResult && agentResult.type === 'clarification') {
      await prisma.chatMessage.create({
        data: { 
          sessionId: Number(sessionId), 
          role: 'assistant', 
          content: agentResult.message 
        },
      });

      const responseContent = agentResult.message;
      await streamResponse(res, responseContent);
      return;
    }

    // Handle error responses from agent with friendly messages
    if (agentResult && agentResult.type === 'error') {
      const friendlyMessage = getFriendlyErrorMessage({ code: agentResult.code });
      
      await prisma.chatMessage.create({
        data: { 
          sessionId: Number(sessionId), 
          role: 'assistant', 
          content: friendlyMessage 
        },
      });

      res.write(`data: ${JSON.stringify({ 
        content: friendlyMessage,
        error: true,
        code: agentResult.code
      })}\n\n`);
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
      return;
    }

    // Handle results with candidates
    if (agentResult && agentResult.type === 'results') {
      const responseContent = agentResult.message;

      await prisma.chatMessage.create({
        data: { 
          sessionId: Number(sessionId), 
          role: 'assistant', 
          content: responseContent 
        },
      });

      // Send candidate data first if available
      if (agentResult.candidates && Array.isArray(agentResult.candidates) && agentResult.candidates.length > 0) {
        res.write(`data: ${JSON.stringify({ candidates: agentResult.candidates })}\n\n`);
      }

      // Stream the response message
      await streamResponse(res, responseContent);
      return;
    }

    // Fallback to general chat
    await handleOpenAIChat(session, latestMessage, res);
    
  } catch (err) {
    console.error('POST /employer/chat error:', err);
    
    // Handle Prisma connection errors
    if (err.constructor?.name === 'PrismaClientInitializationError' || 
        err.name === 'PrismaClientInitializationError') {
      const errorMessage = 'Database connection error. Please try again in a moment.';
      console.error('Database connection failed:', err.message);
      
      if (!res.headersSent) {
        return res.status(503).json({ error: errorMessage });
      } else {
        res.write(`data: ${JSON.stringify({ 
          content: errorMessage,
          error: true,
          code: 'DATABASE_ERROR'
        })}\n\n`);
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
        return;
      }
    }
    
    // Handle specific error types with friendly messages
    if (err instanceof APIError || err instanceof ValidationError) {
      const friendlyMessage = getFriendlyErrorMessage(err);
      
      if (!res.headersSent) {
        return res.status(400).json({ error: friendlyMessage });
      } else {
        res.write(`data: ${JSON.stringify({ 
          content: friendlyMessage,
          error: true,
          code: err.code
        })}\n\n`);
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
        return;
      }
    }
    
    if (!res.headersSent) {
      res.status(500).json({ error: 'We encountered an unexpected error. Please try again.' });
    } else {
      res.write(`data: ${JSON.stringify({ 
        content: 'I apologize, but I encountered an unexpected error. Please try again.'
      })}\n\n`);
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    }
  }
}

async function streamResponse(res, content) {
  const chunks = content.match(/[^\n]+\n?|\n/g) || [content];
  
  for (const chunk of chunks) {
    const words = chunk.split(' ');
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const toSend = i < words.length - 1 ? word + ' ' : word;
      
      try {
        res.write(`data: ${JSON.stringify({ content: toSend })}\n\n`);
      } catch (writeError) {
        if (writeError.code === 'EPIPE') {
          console.log('Client disconnected, stopping stream');
          return;
        }
        throw writeError;
      }
      
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
  }

  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
}

const MAX_WEBSITE_CONTEXT_CHARS = 50000;

async function handleOpenAIChat(session, latestMessage, res) {
  const sessionId = session.id;
  const isSmallTalk = latestMessage.trim().split(/\s+/).length <= 5;
  let websiteContext = '';
  let dbContext = '';

  if (!isSmallTalk) {
    // Try to get cached website context first (much faster)
    const cachedContext = getCachedWebsiteContext();
    
    // Fetch website context and database context in parallel
    // If cache exists, use it immediately; if not, fetch in background
    const fetchPromises = [
      cachedContext 
        ? Promise.resolve(cachedContext)
        : fetchKoziWebsiteContext().then(content => {
            // Cache the result for future requests
            if (content && content.length > 1000) {
              setCachedWebsiteContext(content);
            }
            return content;
          }),
      searchSimilarDocuments(latestMessage, 5),
    ];

    const [websiteResult, dbResult] = await Promise.allSettled(fetchPromises);

    if (websiteResult.status === 'fulfilled' && websiteResult.value && websiteResult.value.length > 1000) {
      websiteContext = websiteResult.value.length > MAX_WEBSITE_CONTEXT_CHARS
        ? websiteResult.value.slice(0, MAX_WEBSITE_CONTEXT_CHARS)
        : websiteResult.value;
    }

    if (dbResult.status === 'fulfilled' && dbResult.value.length > 0) {
      dbContext = dbResult.value
        .map((d, i) => `### Document ${i + 1}: ${d.title}\n${d.content}`)
        .join('\n\n');
    }
  }

  const systemPromptContent = PROMPT_TEMPLATES.employer(websiteContext, dbContext);

  // Reduce number of messages for faster processing
  const previousMessages = await prisma.chatMessage.findMany({
    where: { sessionId: Number(sessionId) },
    orderBy: { createdAt: 'desc' }, // Get most recent first
    take: 8, // Reduced from 20 to 8 for faster queries
  });

  const messages = [
    { role: 'system', content: systemPromptContent },
    ...previousMessages.reverse().slice(-6).map((m) => ({ role: m.role, content: m.content })), // Reduced from 10 to 6
    { role: 'user', content: latestMessage },
  ];

  // Use faster model if available (gpt-4o-mini is much faster than gpt-4-turbo)
  const model = process.env.OPENAI_CHAT_MODEL || process.env.OPENAI_FAST_MODEL || 'gpt-4o-mini';
  
  const stream = await openai.chat.completions.create({
    model: model,
    messages,
    stream: true,
    max_tokens: 800, // Reduced for faster responses
    temperature: 0.6, // Slightly lower for faster generation
  });

  let fullResponse = '';
  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || '';
    if (content) {
      fullResponse += content;
      res.write(`data: ${JSON.stringify({ content })}\n\n`);
    }
  }

  if (fullResponse) {
    await prisma.chatMessage.create({
      data: { sessionId: Number(sessionId), role: 'assistant', content: fullResponse },
    });
  }

  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
}

async function getUserChatSessions(req, res) {
  try {
    const users_id = req.query.users_id;
    if (!users_id) {
      return res.status(400).json({ error: 'User ID is required to view your chat sessions.' });
    }

    const sessions = await prisma.chatSession.findMany({
      where: { 
        users_id: Number(users_id),
        role_type: 'employer'
      },
      include: { 
        messages: { 
          orderBy: { createdAt: 'desc' },
          take: 1
        } 
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = sessions.map((s) => ({
      id: s.id,
      title: s.title,
      last_message: s.messages[0]?.content || '',
      last_message_time: s.messages[0]?.createdAt || s.createdAt,
      created_at: s.createdAt,
    }));

    res.json({ sessions: formatted });
  } catch (err) {
    console.error('GET /employer/chat/sessions error:', err);
    
    // Handle Prisma connection errors
    if (err.constructor?.name === 'PrismaClientInitializationError' || 
        err.name === 'PrismaClientInitializationError') {
      console.error('Database connection failed:', err.message);
      return res.status(503).json({ 
        error: 'Database connection error. Please try again in a moment.' 
      });
    }
    
    res.status(500).json({ error: 'We encountered an issue while loading your chat sessions. Please try again.' });
  }
}

async function deleteChatSession(req, res) {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required to delete a chat.' });
    }

    cleanupAgent(Number(sessionId));

    await prisma.chatMessage.deleteMany({
      where: { sessionId: Number(sessionId) },
    });

    await prisma.chatSession.delete({
      where: { id: Number(sessionId) },
    });

    res.json({
      success: true,
      message: 'Chat session deleted successfully.',
    });
  } catch (err) {
    console.error('DELETE /employer/chat/session error:', err);
    res.status(500).json({ error: 'We couldn\'t delete the chat session. Please try again.' });
  }
}

async function deleteAllChatSessions(req, res) {
  try {
    const { users_id } = req.body;

    if (!users_id) {
      return res.status(400).json({ error: 'User ID is required to delete all chats.' });
    }

    const sessions = await prisma.chatSession.findMany({
      where: { users_id: Number(users_id), role_type: 'employer' },
      select: { id: true },
    });

    sessions.forEach((s) => cleanupAgent(s.id));

    await prisma.chatMessage.deleteMany({
      where: { 
        session: { 
          users_id: Number(users_id),
          role_type: 'employer'
        } 
      },
    });

    await prisma.chatSession.deleteMany({
      where: { 
        users_id: Number(users_id),
        role_type: 'employer'
      },
    });

    res.json({
      success: true,
      message: 'All chat sessions have been deleted successfully.',
    });
  } catch (err) {
    console.error('DELETE /employer/chat/sessions/all error:', err);
    res.status(500).json({ error: 'We couldn\'t delete all chat sessions. Please try again.' });
  }
}

module.exports = {
  newChat,
  chat,
  getUserChatSessions,
  deleteChatSession,
  deleteAllChatSessions,
};