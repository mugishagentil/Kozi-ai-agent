const { google } = require('googleapis');
const { ChatOpenAI } = require('@langchain/openai');

class GmailAgentService {
  constructor() {
    this.oauth2Client = null;
    this.gmail = null;
    this.llm = new ChatOpenAI({
      modelName: process.env.OPENAI_CHAT_MODEL || 'gpt-4o',
      temperature: 0.7,
      openAIApiKey: process.env.OPENAI_API_KEY,
      maxTokens: 500,
    });
  }

  async init() {
    try {
      this.oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );

      // Set credentials if available
      if (process.env.GOOGLE_REFRESH_TOKEN) {
        this.oauth2Client.setCredentials({
          refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
        });
      }

      this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
      return true;
    } catch (error) {
      console.error('Gmail initialization failed:', error);
      return false;
    }
  }

  // ============ NEW: LLM Intent Detection ============
  async detectIntent(userInput) {
    try {
      const prompt = `Analyze this email-related request and extract details:
"${userInput}"

Return JSON:
{
  "action": "send_email" | "draft_email" | "search_emails" | "read_email" | "bulk_email" | "reply_email",
  "recipient": "email address, 'all_employers', or null",
  "emailContext": "what the email should be about",
  "searchQuery": "if searching, what to search for",
  "isPaymentReminder": boolean,
  "tone": "professional" | "friendly" | "formal" | "urgent",
  "count": number of emails to retrieve (default 10, max 50)
}

Only return the JSON, nothing else.`;

      const response = await this.llm.invoke(prompt);
      const content = response.content || response.text || "";
      
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      return null;
    } catch (error) {
      console.error('Intent detection failed:', error);
      return null;
    }
  }

  // ============ NEW: LLM Email Generation ============
  async generateEmail(context, tone = "professional") {
    try {
      const prompt = `Generate a professional email:

Context: ${context}
Tone: ${tone}

Requirements:
- Subject line (max 60 chars)
- Well-structured body
- Proper greeting and closing
- Clear and concise
- Sign off as "Kozi Team"

Return ONLY JSON:
{
  "subject": "subject line",
  "body": "email body with formatting"
}`;

      const response = await this.llm.invoke(prompt);
      const content = response.content || response.text || "";
      
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        if (!result.body.includes("Best regards") && !result.body.includes("Sincerely")) {
          result.body += "\n\nBest regards,\nKozi Team";
        }
        return result;
      }

      return {
        subject: "Important Message",
        body: `Dear Recipient,\n\n${context}\n\nBest regards,\nKozi Team`
      };
    } catch (error) {
      console.error('Email generation failed:', error);
      return {
        subject: "Important Message",
        body: `Dear Recipient,\n\n${context}\n\nBest regards,\nKozi Team`
      };
    }
  }

  // ============ NEW: Get Email Message with Body Extraction ============
  async getMessage(id) {
    try {
      const res = await this.gmail.users.messages.get({ 
        userId: 'me', 
        id, 
        format: 'full' 
      });

      const headers = {};
      (res.data.payload?.headers || []).forEach((h) => {
        headers[h.name] = h.value;
      });

      const snippet = res.data.snippet || '';
      
      let bodyText = '';
      const extractBody = (payload) => {
        if (payload.body?.data) {
          bodyText += Buffer.from(payload.body.data, 'base64').toString('utf-8');
        }
        if (payload.parts) {
          payload.parts.forEach(part => extractBody(part));
        }
      };
      extractBody(res.data.payload);

      return { 
        id: res.data.id, 
        headers, 
        snippet, 
        bodyText: bodyText || snippet,
        raw: res.data 
      };
    } catch (error) {
      console.error('getMessage failed:', error);
      throw new Error(`Failed to retrieve email: ${error.message}`);
    }
  }

  // ============ NEW: Gmail Search with Dynamic Count ============
  async searchEmails(q = '', maxResults = 10) {
    try {
      const res = await this.gmail.users.messages.list({ 
        userId: 'me', 
        q: q || undefined, 
        maxResults: Math.min(maxResults, 50) // Cap at 50 for safety
      });
      
      console.log(`Found ${res.data.messages?.length || 0} emails`);
      return res.data.messages || [];
    } catch (error) {
      console.error('Email search failed:', error);
      throw new Error(`Failed to search emails: ${error.message}`);
    }
  }

  // ============ UPDATED: Main Invoke Method ============
  async invoke(input) {
    try {
      if (!this.gmail) {
        const initialized = await this.init();
        if (!initialized) {
          return {
            success: false,
            output: "Gmail service is not properly configured. Please check your Gmail API credentials."
          };
        }
      }

      // NEW: Use intent detection for smarter routing
      const intent = await this.detectIntent(input);
      console.log('Detected intent:', intent);

      const lowerInput = input.toLowerCase();

      // NEW: Handle email sending/drafting with intent detection
      if (intent && (intent.action === 'send_email' || intent.action === 'draft_email')) {
        return await this.handleSendOrDraftRequest(input, intent);
      }
      
      // Keep existing routing for other cases
      if (lowerInput.includes('unread') || lowerInput.includes('inbox')) {
        return await this.handleInboxRequest(input, intent);
      } else if (lowerInput.includes('search') || lowerInput.includes('find')) {
        return await this.handleSearchRequest(input, intent);
      } else if (lowerInput.includes('summarize') || lowerInput.includes('summary')) {
        return await this.handleSummaryRequest(input, intent);
      } else {
        return await this.handleGeneralRequest(input);
      }
    } catch (error) {
      console.error('Gmail agent error:', error);
      return {
        success: false,
        output: `I encountered an error with Gmail: ${error.message}`
      };
    }
  }

  // ============ NEW: Improved Send/Draft Handler ============
  async handleSendOrDraftRequest(input, intent) {
    try {
      // Extract recipient from input or intent
      const emailMatch = input.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/) || 
                        (intent.recipient && intent.recipient.includes("@") ? [intent.recipient] : null);
      
      if (!emailMatch) {
        return {
          success: false,
          output: "❌ Please provide a valid email address.\n\n**Example:** 'Send email to user@example.com about payment reminder'"
        };
      }

      const recipient = emailMatch[0];
      
      // Generate professional email content using LLM
      const emailContent = await this.generateEmail(
        intent.emailContext || input,
        intent.tone || "professional"
      );

      const lowerInput = input.toLowerCase();
      const isDraft = intent.action === 'draft_email' || (lowerInput.includes('draft') && !lowerInput.includes('send'));

      if (isDraft) {
        // Create draft
        const draft = await this.gmail.users.drafts.create({
          userId: 'me',
          requestBody: {
            message: {
              raw: this.createEmailMessage(recipient, emailContent.subject, emailContent.body)
            }
          }
        });

        return {
          success: true,
          output: `✅ **Draft created successfully!**\n\n**To:** ${recipient}\n**Subject:** ${emailContent.subject}\n**Draft ID:** ${draft.data.id}\n\n**Next Step:** Would you like to send this draft or create another one?`
        };
      } else {
        // Send email immediately
        const result = await this.gmail.users.messages.send({
          userId: 'me',
          requestBody: {
            raw: this.createEmailMessage(recipient, emailContent.subject, emailContent.body)
          }
        });

        return {
          success: true,
          output: `✅ **Email sent successfully!**\n\n**To:** ${recipient}\n**Subject:** ${emailContent.subject}\nWould you like me to help with anything else?`
        };
      }
    } catch (error) {
      return {
        success: false,
        output: `Failed to process email request: ${error.message}`
      };
    }
  }

  // ============ UPDATED: Inbox Request Handler (with dynamic count) ============
  async handleInboxRequest(input, intent = null) {
    try {
      // Determine max results from intent or default to 10
      const maxResults = intent?.count || 10;
      
      const messages = await this.searchEmails('is:unread', maxResults);

      if (!messages || messages.length === 0) {
        return {
          success: true,
          output: "📧 Your inbox is empty! No unread emails found."
        };
      }

      const emailDetails = await Promise.all(
        messages.map(async (message) => {
          const email = await this.getMessage(message.id);

          const subject = email.headers['Subject'] || email.headers['subject'] || 'No Subject';
          const from = email.headers['From'] || email.headers['from'] || 'Unknown Sender';
          const date = email.headers['Date'] || email.headers['date'] || 'Unknown Date';

          return { subject, from, date, id: message.id };
        })
      );

      let output = "📧 **Recent Unread Emails:**\n\n";
      emailDetails.forEach((email, index) => {
        output += `${index + 1}. **${email.subject}**\n`;
        output += `   From: ${email.from}\n`;
        output += `   Date: ${email.date}\n\n`;
      });

      output += "✅ **Next Steps:** Would you like me to:\n";
      output += "• Read a specific email\n";
      output += "• Draft a reply\n";
      output += "• Search for specific emails";

      return {
        success: true,
        output
      };
    } catch (error) {
      return {
        success: false,
        output: `Failed to fetch inbox: ${error.message}`
      };
    }
  }

  // ============ UPDATED: Search Request Handler (with dynamic count) ============
  async handleSearchRequest(input, intent = null) {
    try {
      // Determine max results from intent or default to 10
      const maxResults = intent?.count || 10;
      
      // Extract search terms
      const searchTerms = input.replace(/search|find|emails?\s*/gi, '').trim();
      
      const messages = await this.searchEmails(searchTerms, maxResults);

      if (!messages || messages.length === 0) {
        return {
          success: true,
          output: `🔍 No emails found matching "${searchTerms}"`
        };
      }

      const emailDetails = await Promise.all(
        messages.map(async (message) => {
          const email = await this.getMessage(message.id);

          const subject = email.headers['Subject'] || email.headers['subject'] || 'No Subject';
          const from = email.headers['From'] || email.headers['from'] || 'Unknown Sender';
          const date = email.headers['Date'] || email.headers['date'] || 'Unknown Date';

          return { subject, from, date, id: message.id };
        })
      );

      let output = `🔍 **Search Results for "${searchTerms}":**\n\n`;
      emailDetails.forEach((email, index) => {
        output += `${index + 1}. **${email.subject}**\n`;
        output += `   From: ${email.from}\n`;
        output += `   Date: ${email.date}\n\n`;
      });

      return {
        success: true,
        output
      };
    } catch (error) {
      return {
        success: false,
        output: `Search failed: ${error.message}`
      };
    }
  }

  // ============ UPDATED: Summary Request Handler (with dynamic count) ============
  async handleSummaryRequest(input, intent = null) {
    try {
      // Determine max results from intent or default to 20
      const maxResults = intent?.count || 20;
      
      const messages = await this.searchEmails('is:unread', maxResults);

      if (!messages || messages.length === 0) {
        return {
          success: true,
          output: "📧 No unread emails to summarize."
        };
      }

      const emailSummaries = await Promise.all(
        messages.slice(0, 10).map(async (message) => {
          const email = await this.getMessage(message.id);

          const subject = email.headers['Subject'] || email.headers['subject'] || 'No Subject';
          const from = email.headers['From'] || email.headers['from'] || 'Unknown Sender';

          return { subject, from };
        })
      );

      const summary = await this.llm.invoke(`
        Summarize these email subjects and senders for an admin:
        ${emailSummaries.map(e => `From: ${e.from}, Subject: ${e.subject}`).join('\n')}
        
        Provide a concise summary with categories and priorities.
      `);

      return {
        success: true,
        output: `📧 **Email Summary:**\n\n${summary.content}\n\n✅ **Next Steps:** Would you like me to help you respond to any of these emails?`
      };
    } catch (error) {
      return {
        success: false,
        output: `Summary failed: ${error.message}`
      };
    }
  }

  async handleGeneralRequest(input) {
    try {
      const response = await this.llm.invoke(`
        You are a Gmail assistant for an admin. The user asked: "${input}"
        
        Provide helpful guidance on Gmail operations like:
        - Checking inbox
        - Sending emails
        - Searching emails
        - Drafting replies
        
        Be concise and actionable.
      `);

      return {
        success: true,
        output: response.content
      };
    } catch (error) {
      return {
        success: false,
        output: `I couldn't process that request: ${error.message}`
      };
    }
  }

  createEmailMessage(to, subject, body) {
    const message = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'Content-Type: text/plain; charset=utf-8',
      '',
      body
    ].join('\n');

    return Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  formatEmailList(emails) {
    if (!emails || emails.length === 0) {
      return "No emails found.";
    }

    return emails.map((email, index) => {
      return `${index + 1}. **${email.subject}**\n   From: ${email.from}\n   Date: ${email.date}`;
    }).join('\n\n');
  }
}

module.exports = { GmailAgentService };