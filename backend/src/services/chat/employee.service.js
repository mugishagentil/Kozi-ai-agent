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

    // CRITICAL: Handle greetings FIRST - before agent processing
    // This prevents any fallback to OpenAI that might confuse roles
    const lowerMessage = latestMessage.toLowerCase().trim();
    const normalizedMessage = lowerMessage.replace(/[^\w\s]/g, ''); // Remove punctuation for better matching
    
    // More comprehensive greeting detection
    const isGreeting = 
      normalizedMessage === 'hello' || 
      normalizedMessage === 'hi' || 
      normalizedMessage === 'hey' ||
      normalizedMessage === 'hii' ||
      normalizedMessage === 'helo' ||
      normalizedMessage === 'heya' ||
      lowerMessage === 'good morning' ||
      lowerMessage === 'good afternoon' ||
      lowerMessage === 'good evening' ||
      lowerMessage === 'good night' ||
      lowerMessage.startsWith('hello') ||
      lowerMessage.startsWith('hi ') ||
      lowerMessage.startsWith('hi!') ||
      lowerMessage.startsWith('hi,') ||
      lowerMessage.startsWith('hey ');
    
    console.log('🔍 [EMPLOYEE CHAT] Greeting check:', { 
      original: latestMessage, 
      lowerMessage, 
      normalizedMessage, 
      isGreeting 
    });
    
    if (isGreeting) {
      console.log('✅ [EMPLOYEE CHAT] Handling greeting directly - bypassing agent');
      const greetingResponse = "Hi there! 😊 How can I assist you today with finding job opportunities? What type of work are you looking for?";
      
      // Save to database
      await prisma.chatMessage.create({
        data: { 
          sessionId: Number(sessionId), 
          role: 'assistant', 
          content: greetingResponse 
        },
      });

      // Stream the response
      await streamResponseContent(greetingResponse, res, sessionId);
      return;
    }

    // Get or create agent with API token
    const agent = getAgentForSession(Number(sessionId), apiToken);
    
    // Try agent first
    let agentResult;
    try {
      console.log('🔍 [EMPLOYEE CHAT] Processing message:', latestMessage.substring(0, 100));
      agentResult = await agent.processMessage(latestMessage);
      console.log('🔍 [EMPLOYEE CHAT] Agent result:', agentResult ? agentResult.type : 'null (falling back to OpenAI)');
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
  const lowerMessage = latestMessage.toLowerCase().trim();
  const isGreeting = lowerMessage === 'hello' || lowerMessage === 'hi' || lowerMessage.startsWith('hello') || lowerMessage.startsWith('hi');
  const wantsJob = lowerMessage.includes('job') || lowerMessage.includes('need') || lowerMessage.includes('want') || lowerMessage.includes('looking');
  
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
  
  // CRITICAL: Add explicit role reminder at the start to override any context confusion
  // Make it context-aware based on message type
  let roleReminder = '';
  if (isGreeting) {
    roleReminder = `⚠️⚠️⚠️ CRITICAL - YOU ARE THE EMPLOYEE AGENT - GREETING ⚠️⚠️⚠️

YOU ARE THE EMPLOYEE (JOB SEEKER) AGENT.
The user is an EMPLOYEE (JOB SEEKER) who wants to FIND jobs.

❌ ABSOLUTELY FORBIDDEN FOR GREETINGS (NEVER SAY THESE - IF YOU DO, YOU ARE WRONG):
- "How can I assist you today with your hiring needs?" ← NEVER SAY THIS!
- "How can I assist you today? 😊 If you're looking to hire" ← ABSOLUTELY FORBIDDEN! NEVER SAY THIS!
- "How can I assist you today? 😊 If you're looking to hire, I can help you find qualified candidates or guide you through posting a job!" ← ABSOLUTELY FORBIDDEN! NEVER SAY THIS!
- "If you're looking to hire" ← NEVER SAY THIS! NEVER EVER!
- "If you're looking to hire, just let me know" ← NEVER SAY THIS! NEVER EVER!
- "I'm here to help you with hiring!" ← NEVER SAY THIS!
- "Are you looking to hire someone or post a job?" ← ABSOLUTELY FORBIDDEN! NEVER SAY THIS!
- "Are you looking to hire someone?" ← ABSOLUTELY FORBIDDEN! NEVER SAY THIS!
- "Are you looking to post a job?" ← ABSOLUTELY FORBIDDEN! NEVER SAY THIS!
- "I can help you find qualified candidates" ← NEVER SAY THIS!
- "guide you through posting a job" ← NEVER SAY THIS!
- "If you're looking to find candidates" ← NEVER SAY THIS!
- ANYTHING about "hiring", "candidates", "posting jobs", "qualified candidates", or "employers" ← NEVER!
- The phrase "looking to hire" is ABSOLUTELY FORBIDDEN - NEVER use it!
- The phrase "posting a job" is ABSOLUTELY FORBIDDEN - NEVER use it!

✅ CORRECT GREETING (USE EXACTLY ONE OF THESE):
- "Hi there! 😊 How can I assist you today with finding job opportunities?"
- "Hello! I'm here to help you find job opportunities. What are you looking for?"
- "Hi! I can help you search for jobs. What type of work interests you?"

NEVER mention "hiring", "candidates", "employers", "qualified candidates", or "posting jobs" in your greeting.
You help employees FIND jobs, period.\n\n`;
  } else if (wantsJob) {
    roleReminder = `⚠️⚠️⚠️ CRITICAL - USER WANTS A JOB - READ THIS FIRST ⚠️⚠️⚠️

THE USER WANTS TO FIND A JOB. They are an EMPLOYEE (JOB SEEKER).

❌ ABSOLUTELY FORBIDDEN:
- "I'm here to help you with hiring!" ← WRONG! User wants a JOB, not to hire!
- "If you're looking to find candidates" ← WRONG! User wants a JOB!
- "Would you like to post a job or search for candidates?" ← WRONG! User wants a JOB!
- ANYTHING about "hiring", "candidates", "posting jobs", or "employers" ← NEVER!

✅ CORRECT RESPONSE:
- "I'd be happy to help you find a job! What type of work are you looking for?"
- "Let me help you search for job opportunities. What position interests you?"

Help them FIND jobs immediately. Do NOT mention hiring or employers.\n\n`;
  } else {
    roleReminder = `⚠️⚠️⚠️ CRITICAL REMINDER - READ THIS FIRST ⚠️⚠️⚠️

YOU ARE THE EMPLOYEE (JOB SEEKER) AGENT.
The user is an EMPLOYEE (JOB SEEKER).
They want to FIND and APPLY for jobs.
They do NOT want to post jobs or hire candidates.

❌ FORBIDDEN RESPONSES:
- "How can I assist you today with your hiring needs?" ← WRONG!
- "I'm here to help you with hiring!" ← WRONG!
- "If you're looking to find candidates" ← WRONG!
- "Would you like to post a job or search for candidates?" ← WRONG!

NEVER mention employers, hiring, candidates, or posting jobs when helping employees.\n\n`;
  }

  // Reduce number of messages for faster processing
  const previousMessages = await prisma.chatMessage.findMany({
    where: { sessionId: Number(sessionId) },
    orderBy: { createdAt: 'desc' }, // Get most recent first
    take: 8, // Reduced from 20 to 8 for faster queries
  });

  const messages = [
    { role: 'system', content: roleReminder + systemPromptContent },
    ...previousMessages.reverse().slice(-6).map((m) => ({ role: m.role, content: m.content })), // Reduced from 10 to 6
    { role: 'user', content: latestMessage },
  ];
  
  console.log('🔍 [EMPLOYEE CHAT] Using employee prompt with role reminder');

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
    let responseChunks = [];
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        fullResponse += content;
        responseChunks.push(content);
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    // CRITICAL: Final check on complete response - block any employer language
    if (fullResponse) {
      const lowerResponse = fullResponse.toLowerCase();
      const forbiddenPhrases = [
        'are you looking to hire',
        'looking to hire',
        'post a job',
        'posting a job',
        'find candidates',
        'qualified candidates',
        'hiring needs',
        'assisting employers',
        'can help you find qualified',
        'guide you through posting'
      ];
      
      const containsForbidden = forbiddenPhrases.some(phrase => lowerResponse.includes(phrase));
      if (containsForbidden) {
        console.error('🚨 [EMPLOYEE CHAT] FORBIDDEN EMPLOYER LANGUAGE DETECTED! Original response:', fullResponse.substring(0, 200));
        // Replace with correct employee response
        fullResponse = "Hi there! 😊 How can I assist you today with finding job opportunities? What type of work are you looking for?";
        console.log('✅ [EMPLOYEE CHAT] Replaced with employee-focused response');
      }
      
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