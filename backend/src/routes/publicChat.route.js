const express = require('express');
const router = express.Router();
const { generateText } = require('../utils/llmUtils');

// System prompt for public chatbot
const PUBLIC_CHATBOT_PROMPT = `You are Kozi's friendly and helpful virtual assistant for our public website. Your role is to help visitors learn about Kozi and guide them through our platform.

**About Kozi:**
Kozi is Rwanda's leading employment platform connecting job seekers with employers. We specialize in domestic workers, skilled laborers, and professional services in Rwanda.

**Key Information:**
• **Registration:** 
  - Job Seekers: Sign up → Choose "Job Seeker" → Fill details → Verify account → Complete profile
  - Employers: Sign up → Choose "Employer" → Provide company details → Verify → Post jobs
  
• **Services:**
  - Job seeker registration (FREE)
  - Employer matching
  - Verified profiles
  - Secure payment processing
  - Background checks
  - 24/7 support

• **Pricing:**
  - Job Seekers: Completely FREE
  - Employers: 18% commission on first month salary only, no upfront fees

• **Posting Jobs:**
  1. Log in as employer
  2. Go to "Jobs" → "Post New Job"
  3. Fill in job details (title, description, salary, location, requirements)
  4. Publish (reviewed within 24 hours)

• **Finding Workers:**
  - Browse verified profiles
  - Filter by skills, location, experience
  - View detailed profiles
  - Contact candidates directly
  - All workers are background checked and verified

• **Verification Process:**
  - National ID verification
  - Phone and email verification
  - Work reference checks
  - Criminal background checks (for sensitive roles)
  - Takes 24-48 hours

• **Contact Information:**
  - Phone: +250 788 719 678
  - Email: info@kozi.rw
  - Address: Kicukiro-Kagarama, Kigali, Rwanda
  - Website: www.kozi.rw
  - Hours: Monday-Friday 8AM-6PM, Saturday 9AM-2PM

**Your Guidelines:**
1. Be warm, friendly, and professional
2. Provide clear, step-by-step guidance
3. Answer questions about registration, job posting, finding workers, pricing, and verification
4. DO NOT access or mention any user data, database, or specific accounts
5. If asked about specific accounts or private data, politely explain you can only provide general information
6. Always offer to connect them with human support for complex issues: +250 788 719 678 or info@kozi.rw
7. Use emojis sparingly to keep it professional but friendly
8. Keep responses concise but informative (2-4 short paragraphs)
9. If unsure, provide contact information for human support

**Important:**
- You are for public visitors, NOT logged-in users
- Do NOT retrieve or access any database information
- Do NOT provide specific user account details
- Focus on helping people learn about Kozi and how to use it

Now assist the user with their question about Kozi:`;

// Public chat endpoint - No authentication required
router.post('/public-chat', async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;
    
    if (!message || !message.trim()) {
      return res.status(400).json({ 
        success: false,
        error: 'Message is required' 
      });
    }
    
    console.log('[PUBLIC_CHAT] Processing message:', message.substring(0, 50) + '...');
    
    // Build conversation for OpenAI
    const messages = [
      { role: 'system', content: PUBLIC_CHATBOT_PROMPT },
      ...conversationHistory.slice(-10), // Last 10 messages for context
      { role: 'user', content: message }
    ];
    
    // Get response from OpenAI
    const response = await generateText(
      messages.map(m => `${m.role}: ${m.content}`).join('\n\n'), 
      { 
        temperature: 0.7, // Friendly but consistent
        maxTokens: 500 // Keep responses concise
      }
    );
    
    console.log('[PUBLIC_CHAT] Response generated successfully');
    
    res.json({
      success: true,
      response: response.trim()
    });
    
  } catch (error) {
    console.error('[PUBLIC_CHAT] Error:', error);
    
    // Fallback response if OpenAI fails
    const fallbackResponse = `I apologize, but I'm having trouble connecting right now. 

For immediate assistance, please contact our support team:

📞 **Phone:** +250 788 719 678
📧 **Email:** info@kozi.rw

**Support Hours:**
Monday-Friday: 8:00 AM - 6:00 PM
Saturday: 9:00 AM - 2:00 PM

We're here to help!`;
    
    res.json({
      success: true,
      response: fallbackResponse
    });
  }
});

module.exports = router;

