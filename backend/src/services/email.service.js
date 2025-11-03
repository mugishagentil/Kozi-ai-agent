const nodemailer = require('nodemailer');
const { generateText } = require('../utils/chatUtils');

class EmailService {
  constructor() {
    this.transporter = null;
    this.init();
  }

  async init() {
    try {
      // Check if required SMTP configuration is present
      if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
        console.warn('⚠️ Email service: SMTP_USER or SMTP_PASSWORD not configured. Email sending will be disabled.');
        return;
      }

      // Create transporter based on environment variables
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      });

      // Verify connection
      await this.transporter.verify();
      console.log('✅ Email service initialized successfully');
    } catch (error) {
      console.error('❌ Email service initialization failed:', error.message);
      this.transporter = null; // Ensure transporter is null on error
      // Don't throw - allow the service to continue but emails won't work
    }
  }

  /**
   * Extract email address from message using regex
   */
  extractEmailAddress(message) {
    // Regex pattern for email addresses
    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const matches = message.match(emailPattern);
    return matches ? matches[0] : null;
  }

  /**
   * Parse email details from user message using AI
   */
  async parseEmailRequest(message) {
    try {
      // First, try to extract email address directly using regex
      const extractedEmail = this.extractEmailAddress(message);
      
      const prompt = `Extract email details from this admin request:

"${message}"

${extractedEmail ? `IMPORTANT: The email address "${extractedEmail}" was found in the message. Use it as the "to" field.` : ''}

Extract and return ONLY a JSON object with:
{
  "to": "recipient@email.com" or null,
  "subject": "email subject" or null,
  "body": "email body content" or null,
  "action": "send" or "draft"
}

CRITICAL RULES:
1. If an email address is found in the message (like ${extractedEmail || 'example@email.com'}), it MUST be used as the "to" field
2. If the message contains "send", "sent", "email to", "tell him/her", "inform", "notify" - action should be "send"
3. If subject is not provided, generate a relevant one based on the message context
4. If body is not provided, extract the message content after the email address or generate based on context
5. For messages like "tell him/her [message]", use the message as the email body

Examples:
- "Sent email to user@example.com tell him he has an interview tomorrow" 
  → {"to": "user@example.com", "subject": "Interview Scheduled", "body": "You have an interview tomorrow", "action": "send"}
- "Email john@test.com about payment reminder"
  → {"to": "john@test.com", "subject": "Payment Reminder", "body": "This is a reminder about your payment", "action": "send"}

Return ONLY the JSON object, no other text.`;

      const response = await generateText(prompt, { temperature: 0.3, maxTokens: 500 });
      
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // Override with extracted email if found
        if (extractedEmail && !parsed.to) {
          parsed.to = extractedEmail;
        }
        
        return parsed;
      }
      
      // Fallback: if we have an email address but AI parsing failed, create basic structure
      if (extractedEmail) {
        return {
          to: extractedEmail,
          subject: null,
          body: null,
          action: 'send'
        };
      }
      
      return null;
    } catch (error) {
      console.error('[EmailService] Parse error:', error);
      
      // Fallback: try to extract email address even if AI parsing failed
      const extractedEmail = this.extractEmailAddress(message);
      if (extractedEmail) {
        return {
          to: extractedEmail,
          subject: null,
          body: message.replace(extractedEmail, '').trim(),
          action: 'send'
        };
      }
      
      return null;
    }
  }

  /**
   * Generate professional email body if not provided
   */
  async generateEmailBody(context, recipient, subject) {
    try {
      // Extract recipient name from email if possible
      const recipientName = recipient ? recipient.split('@')[0] : 'Recipient';
      
      const prompt = `You are a professional administrative assistant writing formal business emails for Kozi platform.

TASK: Transform this brief message into a COMPLETE, formal, professional email body.

BRIEF MESSAGE: "${context}"

Recipient Name: ${recipientName}
Subject: ${subject || 'No subject'}

CRITICAL REQUIREMENTS - YOU MUST:
1. EXPAND the brief message significantly - DO NOT just repeat it
2. Add professional context, formality, and helpful details
3. Make the email at least 3-4 well-structured paragraphs
4. Include specific information from the brief message but present it formally
5. Add relevant details (e.g., for interviews: what to bring, arrival instructions, etc.)
6. Use formal business language throughout
7. Start with "Dear ${recipientName},"
8. End with "Best," followed by "Kozi Team" and then "Address: Kicukiro-Kagarama" and "Contact: +250 788 719 678"

EXAMPLE OF PROPER TRANSFORMATION:

BRIEF MESSAGE: "he has an interview tomorrow 10:00 AM"

CORRECT EMAIL:
"Dear ${recipientName},

We are pleased to inform you that you have been scheduled for an interview tomorrow at 10:00 AM.

Please arrive 10 minutes early to allow time for check-in. We recommend bringing your identification documents, an updated copy of your resume, and any relevant certificates or portfolio items that showcase your skills and experience.

The interview will help us better understand your qualifications and how you might contribute to our team. If you have any questions or need to reschedule, please contact us at your earliest convenience.

We look forward to meeting with you and learning more about your background.

Best,
Kozi Team

Address: Kicukiro-Kagarama
Contact: +250 788 719 678"

WRONG (DO NOT DO THIS):
"Dear ${recipientName},
he has an interview tomorrow 10:00 AM
Best,
Kozi Team

Address: Kicukiro-Kagarama
Contact: +250 788 719 678"

Now generate a similar professional email for the brief message provided. Remember:
- EXPAND the message significantly
- Use formal language
- Add helpful context and details
- Make it at least 3-4 paragraphs
- Be professional and complete

Return ONLY the complete email body, no subject line.`;

      const body = await generateText(prompt, { 
        temperature: 0.5, // Slightly higher for more creative expansion
        maxTokens: 1000 // Increased for longer, more detailed emails
      });
      
      // Ensure proper formatting
      let formattedBody = body.trim();
      
      // Remove any quotes that might wrap the response
      formattedBody = formattedBody.replace(/^["']|["']$/g, '');
      
      // Ensure greeting is present
      if (!formattedBody.toLowerCase().startsWith('dear') && 
          !formattedBody.toLowerCase().startsWith('hello') &&
          !formattedBody.toLowerCase().startsWith('hi ')) {
        formattedBody = `Dear ${recipientName},\n\n${formattedBody}`;
      }
      
      // Ensure footer is present with new format
      // Remove old footer format if present
      formattedBody = formattedBody.replace(/\n\nBest regards,\s*\nKozi Admin Team.*$/gi, '');
      formattedBody = formattedBody.replace(/\n\nBest regards,\s*\nKozi Team.*$/gi, '');
      formattedBody = formattedBody.replace(/\n\nBest,\s*\nKozi Team.*$/gi, '');
      
      const hasNewFooter = formattedBody.includes('Best,') && 
                           formattedBody.includes('Kozi Team') &&
                           formattedBody.includes('Address:') &&
                           formattedBody.includes('Contact:');
      
      if (!hasNewFooter) {
        // Add new footer format
        formattedBody += '\n\nBest,\nKozi Team\n\nAddress: Kicukiro-Kagarama\nContact: +250 788 719 678';
      }
      
      // Validate minimum length - if too short, regenerate with more explicit instructions
      if (formattedBody.length < 200 || formattedBody.split('\n').length < 5) {
        console.warn('[EmailService] Email body too short, regenerating with more explicit instructions');
        const retryPrompt = `The previous email was too brief. Generate a MUCH MORE DETAILED professional email.

BRIEF MESSAGE: "${context}"

Recipient: ${recipientName}
Subject: ${subject}

REQUIREMENTS:
- The email MUST be at least 4-5 paragraphs
- MUST expand the brief message significantly with professional details
- Include helpful context and information
- Use formal business language
- Start with "Dear ${recipientName},"
- End with "Best,\nKozi Team\n\nAddress: Kicukiro-Kagarama\nContact: +250 788 719 678"

DO NOT just repeat the brief message. EXPAND it into a complete, formal email.

Return ONLY the complete email body.`;
        
        const retryBody = await generateText(retryPrompt, { 
          temperature: 0.6, // Higher for more creative expansion
          maxTokens: 1200 
        });
        
        if (retryBody && retryBody.trim().length > formattedBody.length) {
          formattedBody = retryBody.trim().replace(/^["']|["']$/g, '');
          
          // Re-add greeting and footer if needed
          if (!formattedBody.toLowerCase().startsWith('dear') && 
              !formattedBody.toLowerCase().startsWith('hello')) {
            formattedBody = `Dear ${recipientName},\n\n${formattedBody}`;
          }
          // Remove old footer if present
          formattedBody = formattedBody.replace(/\n\nBest regards,\s*\nKozi Admin Team.*$/gi, '');
          formattedBody = formattedBody.replace(/\n\nBest regards,\s*\nKozi Team.*$/gi, '');
          
          // Add new footer format
          if (!formattedBody.includes('Best,') || !formattedBody.includes('Kozi Team')) {
            formattedBody += '\n\nBest,\nKozi Team\n\nAddress: Kicukiro-Kagarama\nContact: +250 788 719 678';
          }
        }
      }
      
      return formattedBody;
    } catch (error) {
      console.error('[EmailService] Generate body error:', error);
      // Fallback with proper formatting - expand the context into a more formal message
      const recipientName = recipient ? recipient.split('@')[0] : 'Recipient';
      
      // Try to expand the context even in fallback
      let expandedContext = context;
      const lowerContext = context.toLowerCase();
      
      if (lowerContext.includes('interview')) {
        expandedContext = `We are pleased to inform you that you have been scheduled for an interview ${context.includes('tomorrow') ? 'tomorrow' : 'soon'}. ${context.includes('10:00 AM') ? 'The interview is scheduled for 10:00 AM.' : ''} Please arrive 10 minutes early and bring your identification documents and a copy of your resume.`;
      } else if (lowerContext.includes('payment')) {
        expandedContext = `This is a reminder regarding your payment. Please ensure your payment is processed as soon as possible. If you have any questions, please contact us.`;
      } else if (lowerContext.includes('account')) {
        expandedContext = `We are writing to inform you about your account status. ${context}`;
      }
      
      return `Dear ${recipientName},

${expandedContext}

If you have any questions or need further assistance, please do not hesitate to contact us.

Best,
Kozi Team

Address: Kicukiro-Kagarama
Contact: +250 788 719 678`;
    }
  }

  /**
   * Generate email subject if not provided
   */
  async generateEmailSubject(context) {
    try {
      const prompt = `Generate a professional, specific email subject line (max 60 characters) based on this message content:

"${context}"

The subject should be:
- Clear and specific (not generic)
- Professional and action-oriented
- Relevant to the message content
- Properly capitalized

Examples:
- "he has an interview tomorrow 10:00 AM" → "Interview Scheduled for Tomorrow at 10:00 AM"
- "payment reminder" → "Payment Reminder - Action Required"
- "account verified" → "Account Verification Confirmation"
- "tell him he won the job" → "Job Offer - Congratulations"

Return ONLY the subject line, no other text.`;

      const subject = await generateText(prompt, { temperature: 0.3, maxTokens: 50 });
      const cleanSubject = subject.trim().replace(/^["']|["']$/g, ''); // Remove quotes if present
      return cleanSubject.substring(0, 60);
    } catch (error) {
      // Fallback: generate basic subject from context
      const lowerContext = context.toLowerCase();
      if (lowerContext.includes('interview')) return 'Interview Scheduled';
      if (lowerContext.includes('payment')) return 'Payment Reminder';
      if (lowerContext.includes('account')) return 'Account Update';
      if (lowerContext.includes('job') || lowerContext.includes('position')) return 'Job Update';
      return 'Message from Kozi Admin';
    }
  }

  /**
   * Convert plain text email body to HTML with professional styling
   */
  formatEmailAsHTML(body) {
    if (!body) return '';
    
    // Create a professional HTML email template
    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: Arial, sans-serif;
      font-size: 16px;
      line-height: 1.6;
      color: #333333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .email-container {
      background-color: #ffffff;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .greeting {
      font-size: 18px;
      font-weight: bold;
      color: #2c3e50;
      margin-bottom: 25px;
    }
    .email-body {
      font-size: 16px;
      line-height: 1.8;
      margin-bottom: 30px;
      color: #333333;
    }
    .email-body p {
      margin-bottom: 15px;
    }
    .email-body strong {
      font-weight: bold;
      color: #2c3e50;
      font-size: 16px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 25px;
      border-top: 2px solid #e0e0e0;
    }
    .footer-signature {
      font-weight: bold;
      font-size: 18px;
      color: #2c3e50;
      margin-bottom: 15px;
    }
    .footer-info {
      line-height: 1.8;
      margin-top: 10px;
      font-size: 14px;
      color: #666666;
    }
    .footer-info strong {
      font-weight: bold;
      color: #333333;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="email-container">
    ${this.textToHTML(body)}
  </div>
</body>
</html>`;
    
    return htmlBody;
  }

  /**
   * Convert plain text to HTML with proper formatting
   */
  textToHTML(text) {
    if (!text) return '';
    
    // Split by double newlines to create paragraphs
    let html = text;
    
    // Extract and format greeting
    const greetingMatch = html.match(/^(Dear [^,\n]+),/i);
    let greeting = '';
    if (greetingMatch) {
      greeting = `<div class="greeting">${greetingMatch[0]}</div>`;
      html = html.replace(/^(Dear [^,\n]+),/i, '');
    }
    
    // Split into paragraphs
    const parts = html.split(/\n\n+/);
    let formattedHTML = greeting;
    
    parts.forEach((part) => {
      let paraText = part.trim();
      
      // Skip empty parts
      if (!paraText) return;
      
      // Skip footer lines (will be added separately)
      if (paraText.includes('Best,') || 
          paraText.includes('Kozi Team') ||
          paraText.includes('Address:') ||
          paraText.includes('Contact:')) {
        return;
      }
      
      // Convert single newlines to <br>
      paraText = paraText.replace(/\n/g, '<br>');
      
      // Bold important phrases
      paraText = paraText.replace(/\b(interview|payment|account|scheduled|important|reminder|tomorrow|please|arrive|bring)\b/gi, '<strong>$1</strong>');
      
      formattedHTML += `<div class="email-body"><p>${paraText}</p></div>\n`;
    });
    
    // Add footer
    formattedHTML += this.generateFooterHTML();
    
    return formattedHTML;
  }

  /**
   * Generate HTML footer
   */
  generateFooterHTML() {
    return `<div class="footer">
      <div class="footer-signature">Best,<br>Kozi Team</div>
      <div class="footer-info">
        <strong>Address:</strong> Kicukiro-Kagarama<br>
        <strong>Contact:</strong> +250 788 719 678
      </div>
    </div>`;
  }

  /**
   * Send email
   */
  async sendEmail({ to, subject, body, from = null }) {
    if (!this.transporter) {
      throw new Error('Email service not initialized. Please check SMTP configuration.');
    }

    if (!to) {
      throw new Error('Recipient email address is required');
    }

    if (!subject) {
      throw new Error('Email subject is required');
    }

    if (!body) {
      throw new Error('Email body is required');
    }

    // Format email body as HTML with styling
    const htmlBody = this.formatEmailAsHTML(body);

    const mailOptions = {
      from: from || process.env.SMTP_FROM || process.env.SMTP_USER,
      to: to,
      subject: subject,
      text: body, // Plain text version for email clients that don't support HTML
      html: htmlBody, // HTML version with professional styling
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Email sent successfully:', info.messageId);
      return {
        success: true,
        messageId: info.messageId,
        response: info.response,
      };
    } catch (error) {
      console.error('❌ Email send error:', error);
      throw error;
    }
  }

  /**
   * Extract message content from "tell him/her" phrases
   */
  extractMessageContent(message, emailAddress) {
    const lowerMsg = message.toLowerCase();
    
    // Patterns to extract message content
    const patterns = [
      /tell\s+him\s+(.+)/i,
      /tell\s+her\s+(.+)/i,
      /tell\s+(.+)/i,
      /saying\s+(.+)/i,
      /about\s+(.+)/i,
      /that\s+(.+)/i,
    ];
    
    // Try to find message content after email address
    const emailIndex = message.toLowerCase().indexOf(emailAddress.toLowerCase());
    if (emailIndex > -1) {
      const afterEmail = message.substring(emailIndex + emailAddress.length).trim();
      
      // Try patterns on text after email
      for (const pattern of patterns) {
        const match = afterEmail.match(pattern);
        if (match && match[1]) {
          const content = match[1].trim();
          // Don't return if it's too short or just the email again
          if (content.length > 3 && !content.includes('@')) {
            return content;
          }
        }
      }
      
      // If no pattern matches but there's content after email, use it
      if (afterEmail.length > 5) {
        // Remove common prefixes and clean up
        let cleaned = afterEmail
          .replace(/^(tell|saying|about|that|and|,|him|her)\s+/i, '')
          .trim();
        
        // Remove the email address if it appears again
        cleaned = cleaned.replace(emailAddress, '').trim();
        
        if (cleaned.length > 3) {
          return cleaned;
        }
      }
    }
    
    // Try patterns on full message
    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        const content = match[1].trim();
        // Don't return if it contains the email address (it's probably the recipient)
        if (content.length > 3 && !content.toLowerCase().includes(emailAddress.toLowerCase())) {
          return content;
        }
      }
    }
    
    return null;
  }

  /**
   * Handle email request from chatbot
   */
  async handleEmailRequest(userMessage) {
    try {
      // Parse email details from message
      let emailData = await this.parseEmailRequest(userMessage);
      
      if (!emailData || !emailData.to) {
        return {
          success: false,
          output: `❌ **Email Address Required**

I couldn't find a recipient email address in your message. Please provide:

**Example:**
- "Send email to user@example.com about payment reminder"
- "Email john@example.com with subject 'Account Update' and tell them their account is verified"
- "Send an email to support@company.com saying we need to schedule a meeting"
- "Sent email to user@example.com tell him he has an interview tomorrow"

What would you like to do?`
        };
      }

      // Extract message content from "tell him/her" phrases
      const extractedMessage = this.extractMessageContent(userMessage, emailData.to);
      
      // Determine the context for generating email
      // Use extracted message if available, otherwise use the parsed body or full message
      const emailContext = extractedMessage || emailData.body || userMessage;
      
      // ALWAYS generate subject (unless explicitly provided)
      if (!emailData.subject) {
        emailData.subject = await this.generateEmailSubject(emailContext);
      }

      // ALWAYS generate professional body (don't use raw extracted message directly)
      // The extracted message is used as context, but we generate a proper email
      emailData.body = await this.generateEmailBody(emailContext, emailData.to, emailData.subject);

      // Check if action is draft (don't send)
      if (emailData.action === 'draft') {
        return {
          success: true,
          output: `📝 **Email Draft Created**

**To:** ${emailData.to}
**Subject:** ${emailData.subject}

**Body:**
${emailData.body}

Would you like me to send this email?`
        };
      }

      // Send the email
      const result = await this.sendEmail({
        to: emailData.to,
        subject: emailData.subject,
        body: emailData.body,
      });

      return {
        success: true,
        output: `✅ **Email Sent Successfully!**

**To:** ${emailData.to}
**Subject:** ${emailData.subject}
**Message ID:** ${result.messageId}

The email has been delivered. Would you like to send another email?`
      };

    } catch (error) {
      console.error('[EmailService] Handle error:', error);
      return {
        success: false,
        output: `❌ **Failed to Send Email**

Error: ${error.message}

Please check:
- Email service configuration
- Recipient email address is valid
- SMTP credentials are correct

Would you like to try again?`
      };
    }
  }
}

module.exports = { EmailService };

