const { google } = require('googleapis');
const { ChatOpenAI } = require('@langchain/openai');

class GmailAgentService {
  constructor() {
    this.oauth2Client = null;
    this.gmail = null;
    this.llm = new ChatOpenAI({
      modelName: process.env.OPENAI_CHAT_MODEL || 'gpt-4o',
      temperature: 0.3,
      openAIApiKey: process.env.OPENAI_API_KEY,
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

      const lowerInput = input.toLowerCase();
      
      // Route based on intent
      if (lowerInput.includes('unread') || lowerInput.includes('inbox')) {
        return await this.handleInboxRequest(input);
      } else if (lowerInput.includes('send') || lowerInput.includes('draft')) {
        return await this.handleSendRequest(input);
      } else if (lowerInput.includes('search') || lowerInput.includes('find')) {
        return await this.handleSearchRequest(input);
      } else if (lowerInput.includes('summarize') || lowerInput.includes('summary')) {
        return await this.handleSummaryRequest(input);
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

  async handleInboxRequest(input) {
    try {
      const messages = await this.gmail.users.messages.list({
        userId: 'me',
        maxResults: 10,
        q: 'is:unread'
      });

      if (!messages.data.messages || messages.data.messages.length === 0) {
        return {
          success: true,
          output: "📧 Your inbox is empty! No unread emails found."
        };
      }

      const emailDetails = await Promise.all(
        messages.data.messages.slice(0, 5).map(async (message) => {
          const email = await this.gmail.users.messages.get({
            userId: 'me',
            id: message.id,
            format: 'full'
          });

          const headers = email.data.payload.headers;
          const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject';
          const from = headers.find(h => h.name === 'From')?.value || 'Unknown Sender';
          const date = headers.find(h => h.name === 'Date')?.value || 'Unknown Date';

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

  async handleSendRequest(input) {
    try {
      // Extract recipient and subject from input
      const recipientMatch = input.match(/to\s+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
      const subjectMatch = input.match(/subject[:\s]+(.+?)(?:\s+body|$)/i);
      const bodyMatch = input.match(/body[:\s]+(.+)$/i);

      if (!recipientMatch) {
        return {
          success: false,
          output: "❌ Please specify a recipient email address.\n\n**Example:** \"Send email to john@example.com subject: Meeting Request body: Hi John, let's schedule a meeting.\""
        };
      }

      const recipient = recipientMatch[1];
      const subject = subjectMatch ? subjectMatch[1].trim() : 'No Subject';
      const body = bodyMatch ? bodyMatch[1].trim() : 'No message body provided.';

      // Create email message
      const message = this.createEmailMessage(recipient, subject, body);
      
      // Send the email
      const result = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: message
        }
      });

      return {
        success: true,
        output: `✅ **Email sent successfully!**\n\nTo: ${recipient}\nSubject: ${subject}\n\nMessage ID: ${result.data.id}\n\nWould you like me to help with anything else?`
      };
    } catch (error) {
      return {
        success: false,
        output: `Failed to send email: ${error.message}`
      };
    }
  }

  async handleSearchRequest(input) {
    try {
      // Extract search terms
      const searchTerms = input.replace(/search|find|emails?\s*/gi, '').trim();
      
      const messages = await this.gmail.users.messages.list({
        userId: 'me',
        maxResults: 10,
        q: searchTerms
      });

      if (!messages.data.messages || messages.data.messages.length === 0) {
        return {
          success: true,
          output: `🔍 No emails found matching "${searchTerms}"`
        };
      }

      const emailDetails = await Promise.all(
        messages.data.messages.slice(0, 5).map(async (message) => {
          const email = await this.gmail.users.messages.get({
            userId: 'me',
            id: message.id,
            format: 'full'
          });

          const headers = email.data.payload.headers;
          const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject';
          const from = headers.find(h => h.name === 'From')?.value || 'Unknown Sender';
          const date = headers.find(h => h.name === 'Date')?.value || 'Unknown Date';

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

  async handleSummaryRequest(input) {
    try {
      const messages = await this.gmail.users.messages.list({
        userId: 'me',
        maxResults: 20,
        q: 'is:unread'
      });

      if (!messages.data.messages || messages.data.messages.length === 0) {
        return {
          success: true,
          output: "📧 No unread emails to summarize."
        };
      }

      const emailSummaries = await Promise.all(
        messages.data.messages.slice(0, 10).map(async (message) => {
          const email = await this.gmail.users.messages.get({
            userId: 'me',
            id: message.id,
            format: 'full'
          });

          const headers = email.data.payload.headers;
          const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject';
          const from = headers.find(h => h.name === 'From')?.value || 'Unknown Sender';

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



