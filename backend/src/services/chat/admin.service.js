const {
  prisma,
  openai,
  searchSimilarDocuments,
  generateChatTitle,
  setupSSEHeaders,
} = require('../../utils/chatUtils');
const { PROMPT_TEMPLATES } = require('../../utils/prompts');
const { analyzeIntent } = require('../../utils/llmUtils');
const { listUpcomingPayments, markAsPaid } = require('../payment.service');
const { intelligentQuery, getInsights, fetchJobSeekersFromAPI } = require('../adminDb.service');
const templates = require('../../utils/responseTemplates');
const { GmailAgentService } = require('../gmail.service');
const { fetchKoziWebsiteContext } = require('../../utils/fetchKoziWebsite');
const { getCachedWebsiteContext, setCachedWebsiteContext } = require('../../utils/websiteCache');

const MAX_WEBSITE_CONTEXT_CHARS = 500000;
const gmailAgent = new GmailAgentService();

// ============ SIMPLE ADMIN RESPONSES ============
async function getAdminResponse(message) {
  const lower = message.toLowerCase();
  
  if (lower.includes('payment') || lower.includes('salary')) {
    return `💰 **Payment Management**

I can help you with:
• Track upcoming salary payments
• Mark payments as completed
• Generate payment reports
• View payment summaries

**Example:** "Show me upcoming payments" or "Mark payment #123 as paid"`;
  }
  
  if (lower.includes('database') || lower.includes('query') || lower.includes('search')) {
    return `📊 **Database Queries**

I can help you search and filter:
• Job seekers by location, skills, or registration date
• Employers by company, location, or sector
• Jobs by category, location, or status
• Platform statistics and analytics

**Example:** "How many job seekers in Kigali?" or "Show me recent employers"`;
  }
  
  if (lower.includes('email') || lower.includes('gmail')) {
    return `📧 **Email Management**

I can help you with:
• View recent emails
• Draft professional replies
• Search email content
• Summarize email threads

**Example:** "Show me unread emails" or "Draft a reply to employer inquiry"`;
  }
  
  if (lower.includes('analytics') || lower.includes('insights') || lower.includes('statistics')) {
    return `📈 **Platform Analytics**

I can provide insights on:
• User registration trends
• Job posting statistics
• Platform growth metrics
• Geographic distribution

**Example:** "Show me platform insights" or "How many users registered this month?"`;
  }
  
  if (lower.includes('jobseekers') || lower.includes('job seekers') || lower.includes('candidates')) {
    return `👥 **Job Seekers Management**

I can help you with:
• Search job seekers via API
• Filter by location, skills, or availability
• View candidate profiles and details
• Export job seeker data

**Example:** "Find job seekers in Kigali" or "Show me recent candidates"`;
  }
  
  return `👋 **Admin Assistant Ready**

I'm your Kozi admin assistant! I can help you with:

💰 **Payment Management** - Track salaries and payments
📊 **Database Queries** - Search users, jobs, and analytics  
📧 **Email Support** - Manage Gmail and communications
📈 **Platform Analytics** - View insights and statistics
👥 **Job Seekers** - Search and manage candidates via API

What would you like to work on today?`;
}

// ============ UTILITY FUNCTIONS ============
function formatDataTable(items, maxRows = 10) {
  if (!items || items.length === 0) return 'No records found.';
  
  const rows = items.slice(0, maxRows);
  const keys = Object.keys(rows[0]).slice(0, 5); // Limit columns
  
  let table = '| ' + keys.join(' | ') + ' |\n';
  table += '| ' + keys.map(() => '---').join(' | ') + ' |\n';
  
  for (const row of rows) {
    table += '| ' + keys.map(k => {
      const val = row[k];
      if (val === null || val === undefined) return '-';
      const str = String(val);
      return str.length > 30 ? str.substring(0, 27) + '...' : str;
    }).join(' | ') + ' |\n';
  }
  
  if (items.length > maxRows) {
    table += `\n_...and ${items.length - maxRows} more records_`;
  }
  
  return table;
}

async function streamText(res, text, chunkSize = 30) {
  for (let i = 0; i < text.length; i += chunkSize) {
    const chunk = text.slice(i, i + chunkSize);
    res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
    await new Promise((r) => setTimeout(r, 20));
  }
}

function getFriendlyErrorMessage(context, error) {
  const messages = {
    gmail: "I'm having trouble connecting to Gmail right now. This could be due to:\n• Authentication issues\n• Network connectivity\n• API rate limits\n\n✅ **Suggested Action:** Please verify your Gmail settings or try again in a few minutes.",
    database: "I couldn't access the database at the moment. This might be because:\n• Connection timeout\n• Table doesn't exist\n• Invalid query\n\n✅ **Suggested Action:** Please check if the database is properly configured.",
    payment: "I encountered an issue with the payment system:\n• The payment record might not exist\n• Invalid payment ID\n• Database connection issue\n\n✅ **Suggested Action:** Please verify the payment ID and try again.",
    jobseekers_api: "I'm having trouble connecting to the Job Seekers API. This could be due to:\n• API service is down\n• Network connectivity issues\n• Invalid API configuration\n\n✅ **Suggested Action:** Please check if the JOB_SEEKERS_API_URL is properly configured in environment variables.",
  };
  
  return messages[context] || `I encountered an unexpected error: ${error}\n\n✅ **Suggested Action:** Please try again or contact support if the issue persists.`;
}

// ============ PAYMENT HANDLER ============
async function handlePayments(userMsg) {
  try {
    const lower = userMsg.toLowerCase();
    
    // Mark as paid
    if (lower.includes('mark as paid')) {
      const idMatch = userMsg.match(/mark as paid\s+(\d+)/i);
      if (!idMatch) {
        return '❌ Please specify the payment ID to mark as paid.\n\n**Example:** "mark as paid 42"\n\n✅ **Next Step:** Would you like me to show you upcoming payments?';
      }
      
      try {
        const result = await markAsPaid(Number(idMatch[1]));
        return await templates.paymentMarkedAsPaidMessage(result);
      } catch (err) {
        console.error('[PAYMENT] Mark as paid error:', err);
        return getFriendlyErrorMessage('payment', err.message);
      }
    }

    // Generate report
    if (lower.includes('report') || lower.includes('generate')) {
      try {
        const report = await generatePaymentReport();
        const response = await templates.paymentReportMessage(report);
        return response;
      } catch (err) {
        console.error('[PAYMENT] Report generation error:', err);
        return getFriendlyErrorMessage('payment', err.message);
      }
    }

    // Default: Show summary
    try {
      const [summary, report] = await Promise.all([getSummary(), generatePaymentReport()]);
      const response = await templates.paymentOverviewMessage(summary, report);
      return response;
    } catch (err) {
      console.error('[PAYMENT] Summary error:', err);
      return getFriendlyErrorMessage('payment', err.message);
    }
  } catch (err) {
    console.error('[PAYMENT] Handler error:', err);
    return getFriendlyErrorMessage('payment', err.message);
  }
}

// ============ GMAIL HANDLER ============
async function handleGmail(userMsg) {
  try {
    const res = await gmailAgent.invoke(userMsg);
    
    // Check if it's a successful response
    if (res && res.success && res.output) {
      return res.output;
    }
    
    // Handle different response formats
    if (typeof res?.output === 'string') return res.output;
    if (typeof res === 'string') return res;
    
    // If we got here, something unexpected happened
    return JSON.stringify(res, null, 2);
  } catch (err) {
    console.error('[GMAIL] Error:', err);
    return getFriendlyErrorMessage('gmail', err.message);
  }
}

// ============ DATABASE HANDLER ============
async function handleDb(userMsg) {
  try {
    console.log('[DB] Processing query:', userMsg);
    
    // Use intelligent query routing
    const result = await intelligentQuery(userMsg);
    
    if (!result.success) {
      console.error('[DB] Query failed:', result.error);
      return result.friendlyMessage || getFriendlyErrorMessage('database', result.error);
    }
    
    // Format the response via LLM template
    let insights = null;
    if (!userMsg.toLowerCase().includes('filter') && !userMsg.toLowerCase().includes('search')) {
      const i = await getInsights();
      if (i.success && i.available.length > 0) insights = { available: i.available };
    }
    const response = await templates.databaseResultsMessage(result, insights);
    return response;
  } catch (err) {
    console.error('[DB] Handler error:', err);
    return getFriendlyErrorMessage('database', err.message);
  }
}

// ============ JOB SEEKERS API HANDLER ============
async function handleJobSeekers(userMsg) {
  try {
    console.log('[JOB_SEEKERS] Processing query:', userMsg);
    
    const lowerMsg = userMsg.toLowerCase();
    
    // Extract filters from the message
    const filters = {};
    
    // Extract location
    const locationMatch = lowerMsg.match(/(?:in|from|at)\s+([a-zA-Z\s]+?)(?:\s|$)/);
    if (locationMatch) {
      const location = locationMatch[1].trim();
      if (location.toLowerCase().includes('province')) {
        filters.province = location;
      } else {
        filters.district = location;
      }
    }
    
    // Extract search terms
    const searchMatch = lowerMsg.match(/(?:search|find|show)\s+(?:for\s+)?(.+?)(?:\s+in|\s+from|\s+where|$)/);
    if (searchMatch && !searchMatch[1].includes('job seekers') && !searchMatch[1].includes('candidates')) {
      filters.search = searchMatch[1].trim();
    }
    
    // Extract timeframe
    if (lowerMsg.includes('recent') || lowerMsg.includes('new') || lowerMsg.includes('latest')) {
      filters.created_after = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(); // Last 7 days
    } else if (lowerMsg.includes('week')) {
      filters.created_after = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    } else if (lowerMsg.includes('month')) {
      filters.created_after = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    }
    
    // Set limit based on request
    if (lowerMsg.includes('all') || lowerMsg.includes('every')) {
      filters.limit = 100;
    } else {
      filters.limit = 20;
    }
    
    // Fetch job seekers from API
    const result = await fetchJobSeekersFromAPI(filters);
    
    if (!result.success) {
      return `❌ **Job Seekers API Error**\n\n${result.error}\n\n✅ **Next Step:** Please check if the Job Seekers API service is running and properly configured.`;
    }
    
    if (!result.data || result.data.length === 0) {
      let noResultsMessage = `👥 **No Job Seekers Found**\n\n`;
      
      if (filters.search) {
        noResultsMessage += `No candidates found matching "${filters.search}"`;
      } else if (filters.province || filters.district) {
        noResultsMessage += `No candidates found in ${filters.province || filters.district}`;
      } else {
        noResultsMessage += `No job seekers found in the system.`;
      }
      
      noResultsMessage += `\n\n✅ **Next Step:** Try adjusting your search criteria or check if candidates have registered recently.`;
      return noResultsMessage;
    }
    
    // Format the response
    let response = `👥 **Job Seekers Found** (${result.count} candidates)\n\n`;
    
    result.data.slice(0, 10).forEach((candidate, index) => {
      response += `${index + 1}. **${candidate.first_name || 'Unknown'} ${candidate.last_name || ''}**\n`;
      response += `   📧 ${candidate.email || 'No email'}\n`;
      if (candidate.phone) response += `   📞 ${candidate.phone}\n`;
      if (candidate.province || candidate.district) {
        response += `   📍 ${candidate.district || ''}${candidate.district && candidate.province ? ', ' : ''}${candidate.province || ''}\n`;
      }
      if (candidate.skills && candidate.skills.length > 0) {
        response += `   🛠️ ${candidate.skills.slice(0, 3).join(', ')}${candidate.skills.length > 3 ? '...' : ''}\n`;
      }
      if (candidate.created_at) {
        response += `   📅 Joined: ${new Date(candidate.created_at).toLocaleDateString()}\n`;
      }
      response += '\n';
    });
    
    if (result.data.length > 10) {
      response += `\n_...and ${result.data.length - 10} more candidates_\n\n`;
    }
    
    response += "✅ **Next Steps:** Would you like me to:\n";
    response += "• Export this list as a report\n";
    response += "• Search with different criteria\n";
    response += "• View detailed profiles\n";
    response += "• Contact specific candidates";
    
    return response;
    
  } catch (err) {
    console.error('[JOB_SEEKERS] Handler error:', err);
    return getFriendlyErrorMessage('jobseekers_api', err.message);
  }
}

// ============ PAYMENT HANDLER ============
async function handlePayment(userMsg) {
  try {
    console.log('[Payment] Processing query:', userMsg);
    
    const lowerMsg = userMsg.toLowerCase();
    
    // Get upcoming payments
    if (lowerMsg.includes('upcoming') || lowerMsg.includes('show') || lowerMsg.includes('list')) {
      const result = await listUpcomingPayments();
      
      if (!result.success || !result.data || result.data.length === 0) {
        return `💰 **No Upcoming Payments**\n\nThere are currently no upcoming salary payments scheduled.`;
      }
      
      let response = `💰 **Upcoming Salary Payments**\n\n`;
      result.data.forEach((payment, idx) => {
        const employeeName = payment.job_seeker ? 
          `${payment.job_seeker.first_name} ${payment.job_seeker.last_name}` : 
          'Unknown Employee';
        const employerName = payment.employer ? 
          payment.employer.company_name : 
          'Unknown Employer';
        
        response += `${idx + 1}. **${employeeName}** (${employerName})\n`;
        response += `   Amount: ${payment.amount} RWF\n`;
        response += `   Due: ${new Date(payment.due_date).toLocaleDateString()}\n`;
        response += `   Status: ${payment.status}\n\n`;
      });
      
      return response + `\nWould you like me to generate a payment report or send notifications?`;
    }
    
    // Mark payment as paid
    if (lowerMsg.includes('mark') && lowerMsg.includes('paid')) {
      return `To mark a payment as completed, please provide the payment ID.\n\nExample: "Mark payment #123 as paid"`;
    }
    
    // Default payment help
    return `💰 **Payment Management**\n\nI can help you with:\n• Track upcoming salary payments\n• Mark payments as completed\n• Generate payment reports\n\nWhat would you like to do?`;
    
  } catch (err) {
    console.error('[Payment] Handler error:', err);
    return `❌ I encountered an error accessing payment data. Please try again.`;
  }
}

// ============ SAVE ASSISTANT MESSAGE ============
async function saveAssistantMessage(sessionId, content) {
  try {
    await prisma.ChatMessage.create({
      data: {
        sessionId: Number(sessionId),
        role: 'assistant',
        content: content
      }
    });
  } catch (err) {
    console.error('[Admin] Failed to save assistant message:', err);
  }
}

// ============ OPENAI CHAT HANDLER ============
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

  const systemPromptContent =
    PROMPT_TEMPLATES.admin(websiteContext, dbContext) +
    `\n\n[Context source = ${contextSource}]` +
    `\n\nYou are an intelligent admin assistant. Always provide helpful, structured responses with clear next steps.`;

  // Reduce number of messages for faster processing
  const previousMessages = await prisma.ChatMessage.findMany({
    where: { sessionId: Number(sessionId) },
    orderBy: { createdAt: 'desc' }, // Get most recent first
    take: 8, // Reduced from 20 to 8 for faster queries
  });

  const messages = [
    { role: 'system', content: systemPromptContent },
    ...previousMessages.reverse().slice(-6).map((m) => ({ role: m.role, content: m.content })), // Reduced from 10 to 6
    { role: 'user', content: latestMessage },
  ];

  if (isFirstUserMessage && !session.title) {
    generateChatTitle(latestMessage)
      .then(async (title) => {
        if (title) {
          await prisma.ChatSession.update({
            where: { id: Number(sessionId) },
            data: { title },
          });
          if (!res.writableEnded) res.write(`data: ${JSON.stringify({ title })}\n\n`);
        }
      })
      .catch(console.error);
  }

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
    await prisma.ChatMessage.create({
      data: { sessionId: Number(sessionId), role: 'assistant', content: fullResponse },
    });
  }

  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
}

// ============ NEW CHAT SESSION ============
async function newChat(req, res) {
  try {
    const { users_id, firstMessage } = req.body;
    
    // Extract API token from headers
    const apiToken = req.headers.authorization?.replace('Bearer ', '') || 
                     req.headers['x-api-token'];

    if (!users_id) {
      return res.status(400).json({ error: 'users_id required' });
    }

    if (!apiToken) {
      return res.status(401).json({ error: 'API token required in headers' });
    }

    const title = firstMessage?.trim() 
      ? await generateChatTitle(firstMessage) 
      : 'Admin Assistant';
      
    const session = await prisma.ChatSession.create({ 
      data: { users_id, title, role_type: 'admin' } 
    });

    res.json({ success: true, data: { session_id: session.id, title } });
  } catch (err) {
    console.error('POST /admin/new-chat error:', err);
    res.status(500).json({ 
      error: 'Failed to create new chat session',
      message: 'Please try again or contact support if the issue persists.'
    });
  }
}

// ============ MAIN CHAT HANDLER ============
async function chat(req, res) {
  try {
    const action = req.query.action;
    
    // Extract API token from headers
    const apiToken = req.headers.authorization?.replace('Bearer ', '') || 
                     req.headers['x-api-token'];

    // Load previous session
    if (action === 'loadPreviousSession') {
      const { sessionId } = req.body;
      if (!sessionId) return res.status(400).json({ error: 'sessionId required' });

      const session = await prisma.ChatSession.findUnique({
        where: { id: Number(sessionId) },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      });

      if (!session) return res.status(404).json({ error: 'Session not found' });

      return res.json({
        success: true,
        messages: session.messages.map((m) => ({ 
          type: m.role, 
          content: m.content, 
          timestamp: m.createdAt 
        }))
      });
    }

    // Regular message handling
    const { sessionId, message, isFirstUserMessage } = req.body;
    if (!sessionId || !message) {
      return res.status(400).json({ error: 'sessionId and message required' });
    }

    if (!apiToken) {
      return res.status(401).json({ error: 'API token required in headers' });
    }

    const session = await prisma.ChatSession.findUnique({ 
      where: { id: Number(sessionId) } 
    });
    
    if (!session) {
      return res.status(404).json({ error: 'Chat session not found' });
    }

    const text = Array.isArray(message) 
      ? message.map((m) => m.content).join('\n') 
      : String(message);
    
    await prisma.ChatMessage.create({ 
      data: { 
        sessionId: Number(sessionId), 
        role: 'user', 
        content: text 
      } 
    });

    setupSSEHeaders(res);

    // Detect intent and route to appropriate service
    const intent = await analyzeIntent(text);
    console.log('[Admin Chat] Detected intent:', intent, 'for message:', text);

    if (intent === 'PAYMENT') {
      // Handle payment queries with real data
      const paymentResponse = await handlePayment(text);
      await streamText(res, paymentResponse);
      await saveAssistantMessage(session.id, paymentResponse);
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } else if (intent === 'EMAIL') {
      // Handle Gmail queries with real data
      const emailResponse = await handleGmail(text);
      await streamText(res, emailResponse);
      await saveAssistantMessage(session.id, emailResponse);
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } else if (intent === 'DATABASE') {
      // Handle database queries with real data
      const dbResponse = await handleDb(text);
      await streamText(res, dbResponse);
      await saveAssistantMessage(session.id, dbResponse);
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } else if (intent === 'JOB_SEEKERS') {
      // Handle job seekers API queries
      const jobSeekersResponse = await handleJobSeekers(text);
      await streamText(res, jobSeekersResponse);
      await saveAssistantMessage(session.id, jobSeekersResponse);
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } else {
      // Fallback to OpenAI for general queries
      await handleOpenAIChat(session, text, isFirstUserMessage, res);
    }

  } catch (err) {
    console.error('POST /admin/chat error:', err);
    if (!res.headersSent) {
      return res.status(500).json({ 
        error: 'Internal server error',
        message: 'An unexpected error occurred. Please try again.'
      });
    } else {
      const errorMsg = '❌ I encountered an unexpected error. Please try again or contact support if this continues.';
      res.write(`data: ${JSON.stringify({ content: errorMsg })}\n\n`);
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    }
  }
}

// ============ GET USER CHAT SESSIONS ============
async function getUserChatSessions(req, res) {
  try {
    const users_id = req.query.users_id;
    if (!users_id) return res.status(400).json({ error: 'users_id required' });

    const sessions = await prisma.ChatSession.findMany({
      where: { 
        users_id: Number(users_id),
        role_type: 'admin'  // CRITICAL: Filter by admin role only
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
    console.error('GET /admin/chat/sessions error:', err);
    res.status(500).json({ 
      error: 'Failed to retrieve chat sessions',
      message: 'Please try again later.'
    });
  }
}

// ============ DELETE CHAT SESSION ============
async function deleteChatSession(req, res) {
  try {
    const { sessionId } = req.params;
    if (!sessionId) return res.status(400).json({ error: 'sessionId required' });

    // Delete all messages first
    await prisma.ChatMessage.deleteMany({ 
      where: { sessionId: Number(sessionId) } 
    });
    
    // Delete the session
    const deletedSession = await prisma.ChatSession.delete({ 
      where: { id: Number(sessionId) } 
    });

    res.json({ 
      success: true, 
      message: 'Chat session deleted successfully', 
      deletedSessionId: deletedSession.id 
    });
  } catch (err) {
    console.error('DELETE /admin/chat/session error:', err);
    res.status(500).json({ 
      error: 'Failed to delete chat session',
      message: 'Please verify the session ID and try again.'
    });
  }
}

// ============ DELETE ALL CHAT SESSIONS ============
async function deleteAllChatSessions(req, res) {
  try {
    const users_id = req.query.users_id;
    if (!users_id) return res.status(400).json({ error: 'users_id required' });

    // Delete all messages for user's admin sessions
    const sessions = await prisma.ChatSession.findMany({
      where: { 
        users_id: Number(users_id),
        role_type: 'admin'
      },
      select: { id: true }
    });

    const sessionIds = sessions.map(s => s.id);

    await prisma.ChatMessage.deleteMany({
      where: { sessionId: { in: sessionIds } }
    });

    const deleted = await prisma.ChatSession.deleteMany({
      where: { 
        users_id: Number(users_id),
        role_type: 'admin'
      }
    });

    res.json({ 
      success: true, 
      message: 'All admin chat sessions deleted successfully', 
      deletedCount: deleted.count 
    });
  } catch (err) {
    console.error('DELETE /admin/chat/sessions/all error:', err);
    res.status(500).json({ 
      error: 'Failed to delete chat sessions',
      message: err.message
    });
  }
}

module.exports = { 
  newChat, 
  chat, 
  getUserChatSessions, 
  deleteChatSession, 
  deleteAllChatSessions 
};