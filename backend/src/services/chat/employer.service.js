const {
  prisma,
  openai,
  searchSimilarDocuments,
  generateChatTitle,
  setupSSEHeaders,
} = require('../../utils/chatUtils');
const { PROMPT_TEMPLATES } = require('../../utils/prompts');
const { fetchKoziWebsiteContext } = require('../../utils/fetchKoziWebsite');
const { EmployerAgent } = require('../../utils/EmployerAgent');

const agentInstances = new Map();

function getAgentForSession(sessionId, apiToken = null) {
  if (!agentInstances.has(sessionId)) {
    const agent = new EmployerAgent('gpt-4-turbo', apiToken);
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

async function newChat(req, res) {
  try {
    const { users_id, firstMessage } = req.body;
    
    // Extract API token from headers
    const apiToken = req.headers.authorization?.replace('Bearer ', '') || 
                     req.headers['x-api-token'];

    if (!users_id) {
      return res.status(400).json({ error: 'User ID required' });
    }

    if (!apiToken) {
      return res.status(401).json({ error: 'API token required in headers' });
    }

    const title = firstMessage?.trim()
      ? await generateChatTitle(firstMessage)
      : 'New Chat';

    const session = await prisma.chatSession.create({
      data: { users_id: parseInt(users_id), role_type: 'employer', title },
    });

    const agent = new EmployerAgent('gpt-4-turbo', apiToken);
    agent.setSessionId(session.id);
    agentInstances.set(session.id, agent);

    res.json({
      success: true,
      data: { session_id: session.id, title },
    });
  } catch (err) {
    console.error('POST /employer/chat/new error:', err);
    res.status(500).json({ error: 'Failed to create chat' });
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
        return res.status(400).json({ error: 'Session ID required' });
      }

      const session = await prisma.chatSession.findUnique({
        where: { id: Number(sessionId) },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      });

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
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
      return res.status(400).json({ error: 'Session ID and message required' });
    }

    if (!apiToken) {
      return res.status(401).json({ error: 'API token required in headers' });
    }

    const session = await prisma.chatSession.findUnique({
      where: { id: Number(sessionId) },
    });
    
    if (!session) {
      return res.status(404).json({ error: 'Chat session not found' });
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
        .catch(console.error);
    }

    setupSSEHeaders(res);

    // Get or create agent with API token
    const agent = getAgentForSession(Number(sessionId), apiToken);
    
    // Try job agent first
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
      const responseContent = agentResult.message;
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

      const responseContent = agentResult.message;
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

      // Stream response with faster typing effect
      const chunks = responseContent.match(/[^\n]+\n?|\n/g) || [responseContent];
      
      for (const chunk of chunks) {
        // Stream each line/chunk
        const words = chunk.split(' ');
        for (let i = 0; i < words.length; i++) {
          const word = words[i];
          const toSend = i < words.length - 1 ? word + ' ' : word;
          
          try {
            res.write(`data: ${JSON.stringify({ content: toSend })}\n\n`);
          } catch (writeError) {
            // Handle EPIPE errors gracefully
            if (writeError.code === 'EPIPE') {
              console.log('Client disconnected, stopping stream');
              return;
            }
            throw writeError;
          }
          
          // Faster delay for better performance (5ms instead of 20ms)
          await new Promise((resolve) => setTimeout(resolve, 5));
        }
      }

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
      return;
    }

    // Final fallback
    await handleOpenAIChat(session, latestMessage, isFirstUserMessage, res);
    
  } catch (err) {
    console.error('POST /employer/chat error:', err);
    
    if (!res.headersSent) {
      res.status(500).json({ error: 'Chat service error' });
    } else {
      res.write(`data: ${JSON.stringify({ 
        content: 'I apologize, but I encountered an error. Please try again or rephrase your question.'
      })}\n\n`);
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    }
  }
}

const MAX_WEBSITE_CONTEXT_CHARS = 50000;

async function handleOpenAIChat(session, latestMessage, isFirstUserMessage, res) {
  const sessionId = session.id;
  const isSmallTalk = latestMessage.trim().split(/\s+/).length <= 5;
  let websiteContext = '';
  let dbContext = '';
  let contextSource = 'NO_CONTEXT';

  if (!isSmallTalk) {
    const [websiteResult, dbResult] = await Promise.allSettled([
      fetchKoziWebsiteContext(),
      searchSimilarDocuments(latestMessage, 5),
    ]);

    if (websiteResult.status === 'fulfilled' && websiteResult.value.length > 1000) {
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

  // KEY DIFFERENCE: Use employer prompt instead of employee
  const systemPromptContent = PROMPT_TEMPLATES.employer(websiteContext, dbContext);

  const previousMessages = await prisma.chatMessage.findMany({
    where: { sessionId: Number(sessionId) },
    orderBy: { createdAt: 'asc' },
    take: 20,
  });

  const messages = [
    { role: 'system', content: systemPromptContent },
    ...previousMessages.slice(-10).map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: latestMessage },
  ];

  const stream = await openai.chat.completions.create({
    model: process.env.OPENAI_CHAT_MODEL || 'gpt-4-turbo',
    messages,
    stream: true,
    max_tokens: 1000,
    temperature: 0.7,
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
      return res.status(400).json({ error: 'User ID required' });
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
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
}

async function deleteChatSession(req, res) {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID required' });
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
    console.error('DELETE /employer/chat/session error:', err);
    res.status(500).json({ error: 'Failed to delete session' });
  }
}

async function deleteAllChatSessions(req, res) {
  try {
    const { users_id } = req.body;

    if (!users_id) {
      return res.status(400).json({ error: 'User ID required' });
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
    console.error('DELETE /employer/chat/sessions/all error:', err);
    res.status(500).json({ error: 'Failed to delete sessions' });
  }
}

module.exports = {
  newChat,
  chat,
  getUserChatSessions,
  deleteChatSession,
  deleteAllChatSessions,
};