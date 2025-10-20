const { ChatOpenAI } = require('@langchain/openai');

// ============ LLM UTILITIES ============
async function generateText(prompt, options = {}) {
  try {
    const llm = new ChatOpenAI({
      modelName: options.modelName || process.env.OPENAI_CHAT_MODEL || 'gpt-4o',
      temperature: options.temperature || 0.3,
      openAIApiKey: process.env.OPENAI_API_KEY,
      maxTokens: options.maxTokens || 1000,
    });

    const response = await llm.invoke(prompt);
    return response.content || response.text || '';
  } catch (error) {
    console.error('[LLM] Generate text error:', error);
    throw new Error(`Failed to generate text: ${error.message}`);
  }
}

async function generateChatTitle(message) {
  try {
    const prompt = `Summarize the user's first message into a short 3-5 word chat title. Return ONLY the title, no punctuation or quotes.

Message: "${message}"`;

    const title = await generateText(prompt, { temperature: 0.1, maxTokens: 50 });
    return title.trim().replace(/['"]/g, '');
  } catch (error) {
    console.error('[LLM] Generate title error:', error);
    return 'Admin Chat';
  }
}

async function analyzeIntent(message) {
  try {
    const prompt = `Analyze this admin query and determine the primary intent:

"${message}"

Categories:
- PAYMENT: salary, payments, payroll, mark as paid, payment reports, check payments, due dates
- EMAIL: send email, draft email, gmail, inbox, email summary, summarize emails, reply to emails
- DATABASE: filter jobseekers/employers/jobs, search by location/skills, count registrations, how many, workers, recent signups
- GENERAL: greetings, help requests, general questions, other

Important: "worker" and "workers" are synonyms for "job seeker"

Respond with ONLY ONE WORD: PAYMENT, EMAIL, DATABASE, or GENERAL`;

    const intent = await generateText(prompt, { temperature: 0, maxTokens: 10 });
    return intent.trim().toUpperCase();
  } catch (error) {
    console.error('[LLM] Analyze intent error:', error);
    return 'GENERAL';
  }
}

async function formatDatabaseResults(data, context = {}) {
  try {
    const prompt = `Format this database query result for an admin:

Data: ${JSON.stringify(data, null, 2)}
Context: ${JSON.stringify(context, null, 2)}

Format as:
1. Summary of findings
2. Key statistics
3. Notable patterns or insights
4. Suggested next actions

Keep it concise and professional.`;

    return await generateText(prompt, { temperature: 0.2 });
  } catch (error) {
    console.error('[LLM] Format database results error:', error);
    return `Found ${data.length || 0} records.`;
  }
}

async function generateEmailDraft(recipient, subject, context) {
  try {
    const prompt = `Generate a professional email draft:

Recipient: ${recipient}
Subject: ${subject}
Context: ${context}

Write a professional, polite email that:
1. Addresses the recipient appropriately
2. Clearly states the purpose
3. Provides necessary information
4. Includes a clear call to action
5. Maintains a professional tone

Return only the email body, no subject line.`;

    return await generateText(prompt, { temperature: 0.4 });
  } catch (error) {
    console.error('[LLM] Generate email draft error:', error);
    return `Dear ${recipient},\n\n${context}\n\nBest regards,\nAdmin Team`;
  }
}

async function summarizeEmails(emails) {
  try {
    const prompt = `Summarize these emails for an admin:

Emails: ${JSON.stringify(emails, null, 2)}

Create a concise summary that includes:
1. Total count of emails
2. Key topics or categories
3. Urgent items that need attention
4. Suggested actions

Keep it brief and actionable.`;

    return await generateText(prompt, { temperature: 0.3 });
  } catch (error) {
    console.error('[LLM] Summarize emails error:', error);
    return `Found ${emails.length} emails. Please review them individually.`;
  }
}

module.exports = {
  generateText,
  generateChatTitle,
  analyzeIntent,
  formatDatabaseResults,
  generateEmailDraft,
  summarizeEmails
};



