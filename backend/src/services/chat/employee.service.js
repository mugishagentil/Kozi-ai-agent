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
const { JobSeekerAgent, APIError, ValidationError } = require('../../utils/JobseekerAgent');

const agentInstances = new Map();

function getAgentForSession(sessionId, apiToken = null) {
  if (!agentInstances.has(sessionId)) {
    const agent = new JobSeekerAgent('gpt-4-turbo', apiToken);
    agent.setSessionId(sessionId);
    agentInstances.set(sessionId, agent);
  } else if (apiToken) {
    // Update token if it's provided and agent already exists
    const agent = agentInstances.get(sessionId);
    agent.setApiToken(apiToken);
  }
  return agentInstances.get(sessionId);
}

function cleanupAgent(sessionId) {
  agentInstances.delete(sessionId);
}

// Error handling utility functions
function handleAPIError(error, res) {
  console.error('API Error:', error);
  
  if (error.code === 'AUTH_ERROR' || error.code === 'NO_TOKEN') {
    return res.status(401).json({ 
      error: 'Authentication failed',
      message: error.message,
      code: error.code
    });
  }
  
  if (error.code === 'VALIDATION_ERROR') {
    return res.status(400).json({ 
      error: 'Validation failed',
      message: error.message,
      code: error.code
    });
  }
  
  return res.status(503).json({ 
    error: 'Service temporarily unavailable',
    message: error.message,
    code: error.code || 'SERVICE_UNAVAILABLE'
  });
}

function handleValidationError(error, res) {
  console.error('Validation Error:', error);
  return res.status(400).json({ 
    error: 'Invalid request',
    message: error.message,
    code: 'VALIDATION_ERROR'
  });
}

function handleGenericError(error, res) {
  console.error('Server Error:', error);
  return res.status(500).json({ 
    error: 'Internal server error',
    message: 'An unexpected error occurred',
    code: 'INTERNAL_ERROR'
  });
}

async function newChat(req, res) {
  try {
    const { users_id, firstMessage } = req.body;
    
    // Extract API token from headers
    const apiToken = req.headers.authorization?.replace('Bearer ', '') || 
                     req.headers['x-api-token'];

    if (!users_id) {
      throw new ValidationError('User ID is required');
    }

    if (!apiToken) {
      throw new APIError('API token required', 'NO_TOKEN');
    }

    const title = firstMessage?.trim()
      ? await generateChatTitle(firstMessage)
      : 'New Chat';

    const session = await prisma.chatSession.create({
      data: { users_id: parseInt(users_id), role_type: 'employee', title },
    });

    const agent = new JobSeekerAgent('gpt-4-turbo', apiToken);
    agent.setSessionId(session.id);
    agentInstances.set(session.id, agent);

    res.json({
      success: true,
      data: { session_id: session.id, title },
    });
  } catch (err) {
    console.error('POST /new-chat error:', err);
    
    if (err instanceof APIError) {
      return handleAPIError(err, res);
    }
    
    if (err instanceof ValidationError) {
      return handleValidationError(err, res);
    }
    
    handleGenericError(err, res);
  }
}

async function chat(req, res) {
  try {
    const { sessionId, message, isFirstUserMessage } = req.body;
    const action = req.query.action;
    
    // Extract API token from headers
    const apiToken = req.headers.authorization?.replace('Bearer ', '') || 
                     req.headers['x-api-token'];

    if (action === 'loadPreviousSession') {
      if (!sessionId) {
        throw new ValidationError('Session ID is required');
      }

      const session = await prisma.chatSession.findUnique({
        where: { id: Number(sessionId) },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      });

      if (!session) {
        throw new APIError('Session not found', 'SESSION_NOT_FOUND');
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
      throw new ValidationError('Session ID and message are required');
    }

    if (!apiToken) {
      throw new APIError('API token required', 'NO_TOKEN');
    }

    const session = await prisma.chatSession.findUnique({
      where: { id: Number(sessionId) },
    });
    
    if (!session) {
      throw new APIError('Chat session not found', 'SESSION_NOT_FOUND');
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

    // If this is the first message and no title exists, generate one
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
        .catch(error => console.error('Title generation failed:', error));
    }

    setupSSEHeaders(res);

    // Get or create agent with API token
    const agent = getAgentForSession(Number(sessionId), apiToken);
    
    // Try agent first
    let agentResult;
    try {
      agentResult = await agent.processMessage(latestMessage);
    } catch (error) {
      // Handle authentication errors from the agent
      if (error.code === 'AUTH_ERROR' || error.code === 'NO_TOKEN') {
        res.write(`data: ${JSON.stringify({ 
          content: 'Your session has expired. Please refresh the page and try again.',
          error: true,
          code: error.code
        })}\n\n`);
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
        return;
      }
      throw error;
    }

    // Handle error responses from agent
    if (agentResult && agentResult.type === 'error') {
      await prisma.chatMessage.create({
        data: { 
          sessionId: Number(sessionId), 
          role: 'assistant', 
          content: agentResult.message 
        },
      });

      res.write(`data: ${JSON.stringify({ 
        content: agentResult.message,
        error: true,
        code: agentResult.code
      })}\n\n`);
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
      return;
    }

    // Fallback to general chat if agent returns null
    if (agentResult === null) {
      await handleOpenAIChat(session, latestMessage, isFirstUserMessage, res);
      return;
    }

    // Handle candidate_profile response type
    if (agentResult && agentResult.type === 'candidate_profile') {
      // Save to database
      await prisma.chatMessage.create({
        data: { 
          sessionId: Number(sessionId), 
          role: 'assistant', 
          content: agentResult.message 
        },
      });

      // Stream the candidate profile
      await streamResponseContent(agentResult.message, res, sessionId);
      return;
    }

    // Handle clarification requests
    if (agentResult && agentResult.type === 'clarification') {
      await prisma.chatMessage.create({
        data: { 
          sessionId: Number(sessionId), 
          role: 'assistant', 
          content: agentResult.message 
        },
      });

      await streamResponseContent(agentResult.message, res, sessionId);
      return;
    }

    // Handle agent response with streaming
    if (agentResult && agentResult.message) {
      const responseContent = agentResult.message;

      // Save to database
      await prisma.chatMessage.create({
        data: { 
          sessionId: Number(sessionId), 
          role: 'assistant', 
          content: responseContent 
        },
      });

      // Send candidate data first if available (so cards appear quickly)
      if (agentResult.candidates && Array.isArray(agentResult.candidates)) {
        console.log('Sending candidate data:', agentResult.candidates.length);
        res.write(`data: ${JSON.stringify({ candidates: agentResult.candidates })}\n\n`);
      }

      // Send job data if available
      if (agentResult.jobs && Array.isArray(agentResult.jobs)) {
        console.log('Sending job data:', agentResult.jobs.length);
        res.write(`data: ${JSON.stringify({ jobs: agentResult.jobs })}\n\n`);
      }

      // Stream response content
      await streamResponseContent(responseContent, res, sessionId);
      return;
    }

    // Final fallback
    await handleOpenAIChat(session, latestMessage, isFirstUserMessage, res);
    
  } catch (err) {
    console.error('POST /chat error:', err);
    
    if (!res.headersSent) {
      if (err instanceof APIError) {
        return handleAPIError(err, res);
      }
      
      if (err instanceof ValidationError) {
        return handleValidationError(err, res);
      }
      
      handleGenericError(err, res);
    } else {
      res.write(`data: ${JSON.stringify({ 
        content: 'I apologize, but I encountered an error. Please try again or rephrase your question.',
        error: true,
        code: 'STREAM_ERROR'
      })}\n\n`);
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    }
  }
}

// Helper function to stream response content
async function streamResponseContent(responseContent, res, sessionId) {
  const chunks = responseContent.match(/[^\n]+\n?|\n/g) || [responseContent];
  
  for (const chunk of chunks) {
    const words = chunk.split(' ');
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const toSend = i < words.length - 1 ? word + ' ' : word;
      
      try {
        res.write(`data: ${JSON.stringify({ content: toSend })}\n\n`);
      } catch (writeError) {
        if (writeError.code === 'EPIPE') {
          console.log('Client disconnected, stopping stream for session:', sessionId);
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

async function handleOpenAIChat(session, latestMessage, isFirstUserMessage, res) {
  const sessionId = session.id;
  const isSmallTalk = latestMessage.trim().split(/\s+/).length <= 5;
  let websiteContext = '';
  let dbContext = '';
  let contextSource = 'NO_CONTEXT';

  if (!isSmallTalk) {
    // Try to get cached website context first (much faster)
    const cachedContext = getCachedWebsiteContext();
    
    // Fetch website context and database context in parallel
    const fetchPromises = [
      cachedContext 
        ? Promise.resolve(cachedContext)
        : fetchKoziWebsiteContext().then(content => {
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
      contextSource = 'WEBSITE';
    }

    if (dbResult.status === 'fulfilled' && dbResult.value.length > 0) {
      dbContext = dbResult.value
        .map((d, i) => `### Document ${i + 1}: ${d.title}\n${d.content}`)
        .join('\n\n');
      contextSource = 'DATABASE';
    }
  }

  // Use employee prompt (different from employer)
  const systemPromptContent = PROMPT_TEMPLATES.employee(websiteContext, dbContext);

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

  try {
    // Use faster model if available
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
  } catch (error) {
    console.error('OpenAI API error:', error);
    
    if (!res.headersSent) {
      throw new APIError('AI service temporarily unavailable', 'AI_SERVICE_UNAVAILABLE');
    } else {
      res.write(`data: ${JSON.stringify({ 
        content: 'I apologize, but the AI service is currently unavailable. Please try again later.',
        error: true,
        code: 'AI_SERVICE_ERROR'
      })}\n\n`);
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    }
  }
}

async function getUserChatSessions(req, res) {
  try {
    const users_id = req.query.users_id;
    if (!users_id) {
      throw new ValidationError('User ID is required');
    }

    const sessions = await prisma.chatSession.findMany({
      where: { 
        users_id: Number(users_id),
        role_type: 'employee'
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
    console.error('GET /chat/sessions error:', err);
    
    if (err instanceof ValidationError) {
      return handleValidationError(err, res);
    }
    
    handleGenericError(err, res);
  }
}

async function deleteChatSession(req, res) {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      throw new ValidationError('Session ID is required');
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
      message: 'Chat session deleted',
    });
  } catch (err) {
    console.error('DELETE /chat/session error:', err);
    
    if (err instanceof ValidationError) {
      return handleValidationError(err, res);
    }
    
    handleGenericError(err, res);
  }
}

async function deleteAllChatSessions(req, res) {
  try {
    const { users_id } = req.body;

    if (!users_id) {
      throw new ValidationError('User ID is required');
    }

    const sessions = await prisma.chatSession.findMany({
      where: { users_id: Number(users_id) },
      select: { id: true },
    });

    sessions.forEach((s) => cleanupAgent(s.id));

    await prisma.chatMessage.deleteMany({
      where: { session: { users_id: Number(users_id) } },
    });

    await prisma.chatSession.deleteMany({
      where: { users_id: Number(users_id) },
    });

    res.json({
      success: true,
      message: 'All sessions deleted',
    });
  } catch (err) {
    console.error('DELETE /chat/sessions/all error:', err);
    
    if (err instanceof ValidationError) {
      return handleValidationError(err, res);
    }
    
    handleGenericError(err, res);
  }
}

module.exports = {
  newChat,
  chat,
  getUserChatSessions,
  deleteChatSession,
  deleteAllChatSessions,
};