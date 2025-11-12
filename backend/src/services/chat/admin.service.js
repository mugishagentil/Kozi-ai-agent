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
const { 
  intelligentQuery, 
  getInsights, 
  fetchJobSeekersFromAPI,
  fetchAllCategories,
  fetchJobSeekersByCategory,
  fetchEmployerProfile,
  getUserIdByEmail,
  fetchIncompleteProfiles,
  fetchDashboardStatistics
} = require('../adminDb.service');
const templates = require('../../utils/responseTemplates');
const { GmailAgentService } = require('../gmail.service');
const { EmailService } = require('../email.service');
const { fetchKoziWebsiteContext } = require('../../utils/fetchKoziWebsite');
const { getCachedWebsiteContext, setCachedWebsiteContext } = require('../../utils/websiteCache');

const MAX_WEBSITE_CONTEXT_CHARS = 500000;
const gmailAgent = new GmailAgentService();
const emailService = new EmailService();

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

// ============ PLATFORM STATISTICS HANDLER ============
async function handleStatistics(userMsg, apiToken = null) {
  try {
    const lowerMsg = userMsg.toLowerCase();
    
    // Check if user wants platform statistics
    if (lowerMsg.includes('statistics') || 
        lowerMsg.includes('insights') || 
        lowerMsg.includes('dashboard') ||
        lowerMsg.includes('platform insights') ||
        lowerMsg.includes('show me platform') ||
        lowerMsg.includes('platform stats') ||
        (lowerMsg.includes('how many') && (lowerMsg.includes('provider') || lowerMsg.includes('seeker') || lowerMsg.includes('job') || lowerMsg.includes('agent')))) {
      
      const result = await fetchDashboardStatistics(apiToken);
      
      if (!result.success) {
        return `❌ **Error Fetching Statistics**\n\n${result.error}\n\nPlease try again later.`;
      }
      
      const stats = result.data;
      
      // Format the response similar to dashboard
      let response = `📊 **Platform Insights and Statistics**\n\n`;
      response += `Here are the key statistics about Kozi:\n\n`;
      
      response += `**User Statistics:**\n`;
      response += `• All Job Providers: **${stats.jobProviders || 0}**\n`;
      response += `• All Job Seekers: **${stats.jobSeekers || 0}**\n`;
      response += `• Approved Seekers: **${stats.approvedSeekers || 0}**\n`;
      response += `• Approved Providers: **${stats.approvedProviders || 0}**\n`;
      response += `• Hired Seekers: **${stats.hiredSeekers || 0}**\n`;
      response += `• All Agents: **${stats.agents || 0}**\n\n`;
      
      response += `**Job Statistics:**\n`;
      response += `• All Jobs: **${stats.allJobs || 0}**\n`;
      response += `• Active Jobs: **${stats.activeJobs || 0}**\n`;
      response += `• Unpublished Jobs: **${stats.unpublishedJobs || 0}**\n`;
      response += `• Jobs Posted This Week: **${stats.jobsPostedThisWeek || 0}**\n\n`;
      
      response += `**Today's Activity:**\n`;
      response += `• Today's Provider Registrations: **${stats.todayProviderRegistrations || 0}**\n`;
      response += `• Today's Job Seeker Registrations: **${stats.todayRegistrations || 0}**\n\n`;
      
      response += `✅ **Next Steps:** You can ask me to:\n`;
      response += `• Show specific statistics (e.g., "How many job providers do we have?")\n`;
      response += `• Filter data by location or category\n`;
      response += `• View trends over time\n`;
      
      return response;
    }
    
    return null;
  } catch (error) {
    console.error('[STATISTICS] Error:', error);
    return `❌ **Error Processing Statistics Request**\n\n${error.message}`;
  }
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

// ============ EMAIL HANDLER ============
async function handleEmail(userMsg) {
  try {
    const lowerMsg = userMsg.toLowerCase();
    
    // Regex to detect email addresses
    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const hasEmailAddress = emailPattern.test(userMsg);
    
    // Check if user wants to send email (not just read Gmail)
    const isSendRequest = lowerMsg.includes('send email') || 
                         lowerMsg.includes('sent email') ||
                         lowerMsg.includes('send an email') ||
                         lowerMsg.includes('email to') ||
                         lowerMsg.includes('tell him') ||
                         lowerMsg.includes('tell her') ||
                         lowerMsg.includes('inform') ||
                         lowerMsg.includes('notify') ||
                         (hasEmailAddress && (lowerMsg.includes('email') || lowerMsg.includes('send') || lowerMsg.includes('sent'))) ||
                         // If message contains only an email address or email + message, treat as send request
                         (hasEmailAddress && userMsg.trim().split(/\s+/).length <= 10);
    
    if (isSendRequest || (hasEmailAddress && !lowerMsg.includes('gmail') && !lowerMsg.includes('inbox') && !lowerMsg.includes('read'))) {
      // Use email service for sending emails
      console.log('[EMAIL] Detected send email request');
      const result = await emailService.handleEmailRequest(userMsg);
      return result.output || JSON.stringify(result);
    } else {
      // Use existing Gmail service for reading/management
      console.log('[EMAIL] Using Gmail service for read/management');
      
      // Check if Gmail service is initialized
      if (!gmailAgent || !gmailAgent.oauth2Client) {
        return `❌ **Gmail Service Not Available**

Gmail API is not configured. To manage Gmail:
1. Set up Gmail API credentials
2. Or use email sending instead: "Send email to user@example.com about [topic]"

For sending emails, just say: "Send email to user@example.com about [message]"`;
      }
      
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
      } catch (gmailError) {
        // If Gmail service fails and we have an email address, suggest using email service
        if (hasEmailAddress) {
          return `❌ **Gmail Service Error**

${gmailError.message}

**Alternative:** To send an email, use:
"Send email to ${userMsg.match(emailPattern)?.[0] || 'user@example.com'} about [your message]"

Would you like to send an email instead?`;
        }
        throw gmailError;
      }
    }
  } catch (err) {
    console.error('[EMAIL] Error:', err);
    return `❌ **Email Error**

${err.message}

Please check your email configuration or try again.`;
  }
}

// ============ GMAIL HANDLER (Legacy - kept for backward compatibility) ============
async function handleGmail(userMsg) {
  // Redirect to handleEmail for consistency
  return handleEmail(userMsg);
}

// ============ DATABASE HANDLER ============
async function handleDb(userMsg, apiToken = null) {
  try {
    console.log('[DB] Processing query:', userMsg);
    
    const lowerMsg = userMsg.toLowerCase();
    
    // Check if user wants to find a user by email or name
    const emailMatch = userMsg.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
    const nameMatch = userMsg.match(/(?:user|find|search|have).*?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i) || 
                      userMsg.match(/(?:user|find|search|have).*?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+[A-Z][a-z]+)/i) ||
                      userMsg.match(/([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
    
    if (emailMatch || nameMatch) {
      if (emailMatch) {
        // Lookup by email
        const email = emailMatch[1];
        console.log('[DB] Looking up user by email:', email);
        
        // First, try searching in job seekers directly (more reliable)
        const seekersResult = await fetchJobSeekersFromAPI({ search: email, limit: 10 }, apiToken);
        
        if (seekersResult.success && seekersResult.data && seekersResult.data.length > 0) {
          // Find exact email match
          const matchedSeeker = seekersResult.data.find(seeker => 
            seeker.email && seeker.email.toLowerCase().trim() === email.toLowerCase().trim()
          ) || seekersResult.data[0];
          
          if (matchedSeeker.email && matchedSeeker.email.toLowerCase().trim() === email.toLowerCase().trim()) {
            let response = `✅ **User Found**\n\n`;
            response += `**Type:** Job Seeker\n`;
            if (matchedSeeker.users_id || matchedSeeker.id) {
              response += `**User ID:** ${matchedSeeker.users_id || matchedSeeker.id}\n`;
            }
            response += `**Name:** ${matchedSeeker.first_name || 'Unknown'} ${matchedSeeker.last_name || ''}\n`;
            response += `**Email:** ${matchedSeeker.email || email}\n`;
            if (matchedSeeker.phone) response += `**Phone:** ${matchedSeeker.phone}\n`;
            if (matchedSeeker.province || matchedSeeker.district) {
              response += `**Location:** ${matchedSeeker.district || ''}${matchedSeeker.district && matchedSeeker.province ? ', ' : ''}${matchedSeeker.province || ''}\n`;
            }
            if (matchedSeeker.skills && Array.isArray(matchedSeeker.skills) && matchedSeeker.skills.length > 0) {
              response += `**Skills:** ${matchedSeeker.skills.slice(0, 5).join(', ')}${matchedSeeker.skills.length > 5 ? '...' : ''}\n`;
            }
            if (matchedSeeker.created_at) {
              response += `**Registered:** ${new Date(matchedSeeker.created_at).toLocaleDateString()}\n`;
            }
            return response;
          }
        }
        
        // If not found in job seekers, try getUserIdByEmail API
        const userIdResult = await getUserIdByEmail(email, apiToken);
        
        if (userIdResult.success && userIdResult.users_id) {
          const users_id = userIdResult.users_id;
          
          // Try to fetch as employer first
          const employerResult = await fetchEmployerProfile(users_id, apiToken);
          
          if (employerResult.success && employerResult.data) {
            const profile = employerResult.data;
            let response = `✅ **User Found**\n\n`;
            response += `**Type:** Employer/Job Provider\n`;
            response += `**User ID:** ${users_id}\n`;
            response += `**Name:** ${profile.first_name || ''} ${profile.last_name || ''}\n`;
            response += `**Company:** ${profile.company_name || 'N/A'}\n`;
            response += `**Email:** ${profile.email || email}\n`;
            if (profile.phone) response += `**Phone:** ${profile.phone}\n`;
            if (profile.province || profile.district) {
              response += `**Location:** ${profile.district || ''}${profile.district && profile.province ? ', ' : ''}${profile.province || ''}\n`;
            }
            if (profile.created_at) {
              response += `**Registered:** ${new Date(profile.created_at).toLocaleDateString()}\n`;
            }
            return response;
          }
          
          // User ID found but profile details not available
          return `✅ **User Found**\n\n**User ID:** ${users_id}\n**Email:** ${email}\n\n⚠️ Profile details could not be retrieved. The user exists in the system.`;
        } else {
          // If getUserIdByEmail failed, try broader search in job seekers
          if (seekersResult.success && seekersResult.data && seekersResult.data.length > 0) {
            // Show closest matches
            let response = `⚠️ **Email Not Found Exactly**\n\n`;
            response += `Found ${seekersResult.data.length} similar results:\n\n`;
            seekersResult.data.slice(0, 3).forEach((seeker, idx) => {
              response += `${idx + 1}. **${seeker.first_name || 'Unknown'} ${seeker.last_name || ''}**\n`;
              response += `   📧 ${seeker.email || 'N/A'}\n`;
            });
            response += `\n✅ **Next Step:** Please verify the exact email address.`;
            return response;
          }
          
          return `❌ **User Not Found**\n\nNo user found with email: **${email}**\n\n✅ **Next Step:** Please verify the email address is correct or check if the user has registered.`;
        }
      } else if (nameMatch) {
        // Lookup by name
        const nameQuery = nameMatch[1].trim();
        console.log('[DB] Looking up user by name:', nameQuery);
        
        // Split name into parts for better search
        const nameParts = nameQuery.split(/\s+/);
        let searchQuery = nameQuery;
        
        // Try searching job seekers first
        const seekersResult = await fetchJobSeekersFromAPI({ search: searchQuery, limit: 20 });
        
        if (seekersResult.success && seekersResult.data && seekersResult.data.length > 0) {
          // Filter results to find exact or close matches
          const matchedSeekers = seekersResult.data.filter(seeker => {
            const fullName = `${seeker.first_name || ''} ${seeker.last_name || ''}`.toLowerCase().trim();
            const queryLower = nameQuery.toLowerCase();
            
            // Check if name matches exactly or contains all parts
            return fullName.includes(queryLower) || 
                   nameParts.every(part => fullName.includes(part.toLowerCase()));
          });
          
          if (matchedSeekers.length > 0) {
            const seeker = matchedSeekers[0]; // Take first match
            let response = `✅ **User Found**\n\n`;
            response += `**Type:** Job Seeker\n`;
            response += `**Name:** ${seeker.first_name || 'Unknown'} ${seeker.last_name || ''}\n`;
            response += `**Email:** ${seeker.email || 'N/A'}\n`;
            if (seeker.phone) response += `**Phone:** ${seeker.phone}\n`;
            if (seeker.province || seeker.district) {
              response += `**Location:** ${seeker.district || ''}${seeker.district && seeker.province ? ', ' : ''}${seeker.province || ''}\n`;
            }
            if (seeker.skills && Array.isArray(seeker.skills) && seeker.skills.length > 0) {
              response += `**Skills:** ${seeker.skills.slice(0, 5).join(', ')}${seeker.skills.length > 5 ? '...' : ''}\n`;
            }
            if (seeker.created_at) {
              response += `**Registered:** ${new Date(seeker.created_at).toLocaleDateString()}\n`;
            }
            
            // If multiple matches found, mention it
            if (matchedSeekers.length > 1) {
              response += `\n⚠️ **Note:** Found ${matchedSeekers.length} users with similar names. Showing the first match.`;
            }
            
            return response;
          }
        }
        
        // If not found in job seekers, try searching with all job seekers API
        // and check both employers (via direct API) and job seekers
        // For now, if job seekers search didn't find it, return not found
        return `❌ **User Not Found**\n\nNo user found with name: **${nameQuery}**\n\n✅ **Next Step:** Please verify the name spelling or try searching by email address instead.`;
      }
    }
    
    // Check if user wants all categories
    if (lowerMsg.includes('categories') || lowerMsg.includes('all categories')) {
      const result = await fetchAllCategories(apiToken);
      
      if (!result.success) {
        return `❌ **Error Fetching Categories**\n\n${result.error}`;
      }
      
      if (!result.data || result.data.length === 0) {
        return `📂 **No Categories Found**\n\nNo job categories are available.`;
      }
      
      let response = `📂 **All Categories** (${result.count} categories)\n\n`;
      result.data.slice(0, 20).forEach((category, index) => {
        response += `${index + 1}. **${category.name || category.category_name || 'Unknown'}**`;
        if (category.id || category.category_id) {
          response += ` (ID: ${category.id || category.category_id})`;
        }
        if (category.description) {
          response += `\n   ${category.description}`;
        }
        response += '\n\n';
      });
      
      if (result.data.length > 20) {
        response += `\n_...and ${result.data.length - 20} more categories_\n\n`;
      }
      
      response += `✅ **Next Steps:** You can ask me to:\n`;
      response += `• Show job seekers in a specific category\n`;
      response += `• Get more details about a category`;
      
      return response;
    }
    
    // Check if user wants employer information
    if (lowerMsg.includes('employer') && (lowerMsg.includes('profile') || lowerMsg.includes('info') || lowerMsg.includes('information'))) {
      // Extract user ID or email
      const userIdMatch = userMsg.match(/(?:user[_\s]*id|users_id|id)[:\s]+(\d+)/i);
      const emailMatch = userMsg.match(/email[:\s]+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
      
      let users_id = null;
      
      if (userIdMatch) {
        users_id = parseInt(userIdMatch[1]);
      } else if (emailMatch) {
        const email = emailMatch[1];
        const userIdResult = await getUserIdByEmail(email, apiToken);
        if (userIdResult.success && userIdResult.users_id) {
          users_id = userIdResult.users_id;
        } else {
          return `❌ **Error Getting User ID**\n\nCould not retrieve user ID for email: ${email}\n\n✅ **Next Step:** Please verify the email address is correct.`;
        }
      }
      
      if (!users_id) {
        return `❌ **Missing Information**\n\nPlease provide either:\n• User ID (e.g., "employer profile user_id: 123")\n• Email address (e.g., "employer profile email: user@example.com")`;
      }
      
      const result = await fetchEmployerProfile(users_id, apiToken);
      
      if (!result.success) {
        return `❌ **Error Fetching Employer Profile**\n\n${result.error}`;
      }
      
      if (!result.data) {
        return `❌ **No Profile Found**\n\nNo employer profile found for user ID: ${users_id}`;
      }
      
      const profile = result.data;
      let response = `🏢 **Employer Profile**\n\n`;
      response += `**Name:** ${profile.first_name || ''} ${profile.last_name || ''}\n`;
      response += `**Company:** ${profile.company_name || 'N/A'}\n`;
      response += `**Email:** ${profile.email || 'N/A'}\n`;
      if (profile.phone) response += `**Phone:** ${profile.phone}\n`;
      if (profile.province || profile.district) {
        response += `**Location:** ${profile.district || ''}${profile.district && profile.province ? ', ' : ''}${profile.province || ''}\n`;
      }
      if (profile.created_at) {
        response += `**Registered:** ${new Date(profile.created_at).toLocaleDateString()}\n`;
      }
      
      return response;
    }
    
    // Check for other user lookup patterns - any query mentioning "user", "find", "search", "have" with names
    if (lowerMsg.includes('user') || lowerMsg.includes('find') || lowerMsg.includes('search') || lowerMsg.includes('have')) {
      // Try to extract name from various patterns - handle mixed case
      const patterns = [
        /(?:do\s+we\s+have|have|find|search)\s+user\s+([A-Z][a-z]+\s+[a-zA-Z]+(?:\s+[a-zA-Z]+)*)(?:\s|$|\?)/i,
        /(?:do\s+we\s+have|have)\s+([A-Z][a-z]+\s+[a-zA-Z]+(?:\s+[a-zA-Z]+)*)(?:\s|$|\?)/i,
        /(?:user|find|search)\s+([A-Z][a-z]+\s+[a-zA-Z]+(?:\s+[a-zA-Z]+)*)(?:\s|$|\?)/i,
        /([A-Z][a-z]+\s+[a-zA-Z]+(?:\s+[a-zA-Z]+)*)(?:\s|$|\?)/i
      ];
      
      let extractedName = null;
      for (const pattern of patterns) {
        const match = userMsg.match(pattern);
        if (match && match[1]) {
          let potentialName = match[1].trim();
          
          // Remove "user" if it was included in the match
          potentialName = potentialName.replace(/^user\s+/i, '').trim();
          
          // Check if it looks like a name (has at least 2 words, not too long)
          const words = potentialName.split(/\s+/).filter(w => w.length > 0);
          if (words.length >= 2 && potentialName.length < 100 && !words.some(w => w.toLowerCase() === 'user')) {
            extractedName = potentialName;
            console.log('[DB] Extracted name:', extractedName);
            break;
          }
        }
      }
      
      // If no match, try to extract any capitalized words that look like names (handle mixed case)
      if (!extractedName) {
        const namePattern = /\b([A-Z][a-z]+\s+[a-zA-Z]+(?:\s+[a-zA-Z]+)*)\b/;
        const match = userMsg.match(namePattern);
        if (match && match[1]) {
          const potentialName = match[1].trim().replace(/^user\s+/i, '').trim();
          const words = potentialName.split(/\s+/).filter(w => w.length > 0 && w.toLowerCase() !== 'user');
          if (words.length >= 2) {
            extractedName = potentialName;
            console.log('[DB] Extracted name from fallback pattern:', extractedName);
          }
        }
      }
      
        if (extractedName && !emailMatch) {
          console.log('[DB] Looking up user by extracted name:', extractedName, 'from query:', userMsg);
          
          // Try multiple search strategies
          const searchTerms = [
            extractedName, // Full name
            ...extractedName.split(/\s+/) // Individual words
          ];
          
          let matchedSeekers = [];
          
          // Try each search term
          for (const searchTerm of searchTerms) {
            if (searchTerm.length < 2) continue; // Skip very short terms
            
            const seekersResult = await fetchJobSeekersFromAPI({ search: searchTerm, limit: 100 }, apiToken);
            
            if (seekersResult.success && seekersResult.data && seekersResult.data.length > 0) {
              // Filter results to find matches
              const nameParts = extractedName.toLowerCase().split(/\s+/).filter(p => p.length > 1);
              
              const filtered = seekersResult.data.filter(seeker => {
                // Try different name formats
                const firstName = (seeker.first_name || '').toLowerCase().trim();
                const lastName = (seeker.last_name || '').toLowerCase().trim();
                const fullName = `${firstName} ${lastName}`.trim();
                const reverseName = `${lastName} ${firstName}`.trim();
                const displayName = (seeker.name || seeker.full_name || '').toLowerCase().trim();
                
                const queryLower = extractedName.toLowerCase().trim();
                
                // Check multiple matching strategies
                const exactMatch = fullName === queryLower || reverseName === queryLower || displayName === queryLower;
                const containsMatch = fullName.includes(queryLower) || reverseName.includes(queryLower) || displayName.includes(queryLower);
                const partsMatch = nameParts.every(part => 
                  fullName.includes(part) || reverseName.includes(part) || displayName.includes(part)
                );
                const wordMatch = queryLower.split(/\s+/).every(word => 
                  fullName.includes(word) || reverseName.includes(word) || displayName.includes(word)
                );
                
                return exactMatch || containsMatch || partsMatch || wordMatch;
              });
              
              if (filtered.length > 0) {
                matchedSeekers = [...matchedSeekers, ...filtered];
              }
            }
          }
          
          // Remove duplicates based on email or user ID
          const uniqueSeekers = matchedSeekers.filter((seeker, index, self) => 
            index === self.findIndex(s => 
              (s.email && s.email === seeker.email) || 
              (s.users_id && s.users_id === seeker.users_id) ||
              (s.id && s.id === seeker.id)
            )
          );
          
          if (uniqueSeekers.length > 0) {
            const seeker = uniqueSeekers[0];
            const displayName = seeker.name || `${seeker.first_name || ''} ${seeker.last_name || ''}`.trim() || 'Unknown';
            
            let response = `✅ **User Found**\n\n`;
            response += `**Type:** Job Seeker\n`;
            response += `**Name:** ${displayName}\n`;
            response += `**Email:** ${seeker.email || 'N/A'}\n`;
            if (seeker.phone) response += `**Phone:** ${seeker.phone}\n`;
            if (seeker.province || seeker.district) {
              response += `**Location:** ${seeker.district || ''}${seeker.district && seeker.province ? ', ' : ''}${seeker.province || ''}\n`;
            }
            if (seeker.skills && Array.isArray(seeker.skills) && seeker.skills.length > 0) {
              response += `**Skills:** ${seeker.skills.slice(0, 5).join(', ')}${seeker.skills.length > 5 ? '...' : ''}\n`;
            } else if (seeker.skills && typeof seeker.skills === 'string') {
              response += `**Skills:** ${seeker.skills.substring(0, 100)}${seeker.skills.length > 100 ? '...' : ''}\n`;
            }
            if (seeker.created_at) {
              response += `**Registered:** ${new Date(seeker.created_at).toLocaleDateString()}\n`;
            }
            if (seeker.id || seeker.users_id) {
              response += `**User ID:** ${seeker.users_id || seeker.id}\n`;
            }
            
            if (uniqueSeekers.length > 1) {
              response += `\n⚠️ **Note:** Found ${uniqueSeekers.length} users with similar names. Showing the first match.`;
            }
            
            return response;
          }
          
          // If still no match, try a broader search without filters
          const broadSearch = await fetchJobSeekersFromAPI({ limit: 100 }, apiToken);
          if (broadSearch.success && broadSearch.data && broadSearch.data.length > 0) {
            const nameParts = extractedName.toLowerCase().split(/\s+/).filter(p => p.length > 1);
            const matched = broadSearch.data.filter(seeker => {
              const firstName = (seeker.first_name || '').toLowerCase();
              const lastName = (seeker.last_name || '').toLowerCase();
              const fullName = `${firstName} ${lastName}`.trim();
              const displayName = (seeker.name || seeker.full_name || '').toLowerCase().trim();
              const queryLower = extractedName.toLowerCase();
              
              return fullName.includes(queryLower) || displayName.includes(queryLower) ||
                     nameParts.every(part => fullName.includes(part) || displayName.includes(part));
            });
            
            if (matched.length > 0) {
              const seeker = matched[0];
              const displayName = seeker.name || `${seeker.first_name || ''} ${seeker.last_name || ''}`.trim() || 'Unknown';
              return `✅ **User Found**\n\n**Type:** Job Seeker\n**Name:** ${displayName}\n**Email:** ${seeker.email || 'N/A'}\n${seeker.phone ? `**Phone:** ${seeker.phone}\n` : ''}`;
            }
          }
          
          return `❌ **User Not Found**\n\nNo user found with name: **${extractedName}**\n\n✅ **Next Step:** Please verify the name spelling or try searching by email address instead.`;
        }
    }
    
    // Use intelligent query routing for other queries
    const result = await intelligentQuery(userMsg);
    
    if (!result.success) {
      console.error('[DB] Query failed:', result.error);
      return result.friendlyMessage || getFriendlyErrorMessage('database', result.error);
    }
    
    // Format the response via LLM template
    let insights = null;
    if (!lowerMsg.includes('filter') && !lowerMsg.includes('search')) {
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
async function handleJobSeekers(userMsg, apiToken = null) {
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
    
    // Check if user wants job seekers by category
    if (lowerMsg.includes('category') || lowerMsg.includes('by category')) {
      // Extract category ID or name
      const categoryMatch = lowerMsg.match(/category[:\s]+(\d+|[a-zA-Z\s]+)/i);
      if (categoryMatch) {
        const categoryId = categoryMatch[1].trim();
        const numericCategoryId = parseInt(categoryId);
        
        if (!isNaN(numericCategoryId)) {
          // Fetch job seekers by category
          const result = await fetchJobSeekersByCategory(numericCategoryId, filters, apiToken);
          
          if (!result.success) {
            return `❌ **Error Fetching Job Seekers by Category**\n\n${result.error}\n\n✅ **Next Step:** Please verify the category ID is correct.`;
          }
          
          if (!result.data || result.data.length === 0) {
            return `👥 **No Job Seekers Found in Category ${categoryId}**\n\nNo candidates found for this category.\n\n✅ **Next Step:** Try a different category or check if any job seekers have selected this category.`;
          }
          
          let response = `👥 **Job Seekers in Category ${categoryId}** (${result.count} candidates)\n\n`;
          result.data.slice(0, 10).forEach((candidate, index) => {
            response += `${index + 1}. **${candidate.first_name || 'Unknown'} ${candidate.last_name || ''}**\n`;
            response += `   📧 ${candidate.email || 'No email'}\n`;
            if (candidate.phone) response += `   📞 ${candidate.phone}\n`;
            if (candidate.province || candidate.district) {
              response += `   📍 ${candidate.district || ''}${candidate.district && candidate.province ? ', ' : ''}${candidate.province || ''}\n`;
            }
            response += '\n';
          });
          
          if (result.data.length > 10) {
            response += `\n_...and ${result.data.length - 10} more candidates_\n\n`;
          }
          
          return response;
        }
      }
    }
    
      // Check if user wants incomplete profiles
      if (lowerMsg.includes('incomplete') || lowerMsg.includes('not complete') || lowerMsg.includes('did not complete')) {
        const result = await fetchIncompleteProfiles(apiToken);
      
      if (!result.success) {
        return `❌ **Error Fetching Incomplete Profiles**\n\n${result.error}`;
      }
      
      if (!result.data || result.data.length === 0) {
        return `✅ **All Profiles Complete!**\n\nAll job seekers have completed their profiles.`;
      }
      
      let response = `⚠️ **Job Seekers with Incomplete Profiles** (${result.count} users)\n\n`;
      result.data.slice(0, 20).forEach((user, index) => {
        response += `${index + 1}. **${user.first_name || 'Unknown'} ${user.last_name || ''}**\n`;
        response += `   📧 ${user.email || 'No email'}\n`;
        if (user.missing_fields) {
          response += `   ⚠️ Missing: ${user.missing_fields.join(', ')}\n`;
        }
        response += '\n';
      });
      
      if (result.data.length > 20) {
        response += `\n_...and ${result.data.length - 20} more users with incomplete profiles_\n\n`;
      }
      
      response += `✅ **Next Steps:** Consider sending reminders to these users to complete their profiles.`;
      return response;
    }
    
    // Fetch job seekers from API
    const result = await fetchJobSeekersFromAPI(filters, apiToken);
    
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
    let response = `👥 **Job Seekers Found** (${result.count} candidates`;
    if (result.total && result.total !== result.count) {
      response += ` out of ${result.total} total`;
    }
    response += `)\n\n`;
    
    result.data.slice(0, 10).forEach((candidate, index) => {
      response += `${index + 1}. **${candidate.first_name || 'Unknown'} ${candidate.last_name || ''}**\n`;
      response += `   📧 ${candidate.email || 'No email'}\n`;
      if (candidate.phone) response += `   📞 ${candidate.phone}\n`;
      if (candidate.province || candidate.district) {
        response += `   📍 ${candidate.district || ''}${candidate.district && candidate.province ? ', ' : ''}${candidate.province || ''}\n`;
      }
      if (candidate.skills && Array.isArray(candidate.skills) && candidate.skills.length > 0) {
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
    response += "• Show job seekers by category\n";
    response += "• Show incomplete profiles\n";
    response += "• Search with different criteria\n";
    response += "• View detailed profiles";
    
    return response;
    
  } catch (err) {
    console.error('[JOB_SEEKERS] Handler error:', err);
    return getFriendlyErrorMessage('jobseekers_api', err.message);
  }
}

// ============ GENERATE FORMAL PAYMENT REPORT ============
async function generateFormalPaymentReport(apiToken = null) {
  const result = await listUpcomingPayments(apiToken);
  
  if (!result.success || !result.data || result.data.length === 0) {
    return null;
  }
  
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const windowMessage = result.window === '14 days' ? 'Next 14 Days' : 'Upcoming Period';
  
  let report = `FORMAL SALARY PAYMENT REPORT\n`;
  report += `═══════════════════════════════════════════════════════════════\n\n`;
  report += `From: Kozi Admin Team\n`;
  report += `Date: ${today}\n`;
  report += `Subject: Upcoming Salary Payments Report (${windowMessage})\n\n`;
  report += `═══════════════════════════════════════════════════════════════\n\n`;
  report += `UPCOMING SALARY PAYMENTS\n\n`;
  
  result.data.forEach((payment, idx) => {
    const employeeName = payment.job_seeker ? 
      `${payment.job_seeker.first_name} ${payment.job_seeker.last_name}` : 
      'Unknown Employee';
    const employerName = payment.employer ? 
      payment.employer.company_name : 
      'Unknown Employer';
    
    const dueDate = new Date(payment.due_date);
    const dueDateStr = dueDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const daysUntil = payment.days_until !== undefined ? payment.days_until : 
      Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24));
    
    report += `${idx + 1}. ${employeeName}\n`;
    report += `   ───────────────────────────────────────\n`;
    report += `   Employer: ${employerName}\n`;
    report += `   Position: ${payment.job_title || 'Not specified'}\n`;
    report += `   Salary: ${payment.amount ? payment.amount.toLocaleString() + ' RWF' : 'Not specified'}\n`;
    
    if (payment.commission) {
      report += `   Kozi Commission (18%): ${payment.commission.toLocaleString()} RWF\n`;
    }
    
    report += `   Due Date: ${dueDateStr} (in ${daysUntil} day${daysUntil !== 1 ? 's' : ''})\n`;
    report += `   Accommodation: ${payment.accommodation || 'Not specified'}\n`;
    report += `   Address: ${payment.address || 'Not specified'}\n`;
    report += `   Status: ${payment.status || 'Pending'}\n\n`;
  });
  
  // Calculate totals
  const totalSalaries = result.data.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalCommissions = result.data.reduce((sum, p) => sum + (p.commission || 0), 0);
  
  report += `═══════════════════════════════════════════════════════════════\n\n`;
  report += `SUMMARY\n`;
  report += `───────────────────────────────────────\n`;
  report += `Total Payments: ${result.data.length}\n`;
  report += `Total Salary Amount: ${totalSalaries.toLocaleString()} RWF\n`;
  report += `Total Kozi Commission: ${totalCommissions.toLocaleString()} RWF\n\n`;
  report += `═══════════════════════════════════════════════════════════════\n\n`;
  report += `NEXT STEPS:\n`;
  report += `Please review this report and coordinate with employers to ensure\n`;
  report += `timely salary payments. Contact each employer 2-3 days before the\n`;
  report += `due date to confirm payment processing.\n\n`;
  report += `For questions or assistance:\n`;
  report += `Email: info@kozi.rw\n`;
  report += `Phone: +250 788 719 678\n`;
  report += `Address: Kicukiro-Kagarama\n\n`;
  report += `Best regards,\n`;
  report += `Kozi Team\n`;
  
  return report;
}

// ============ PAYMENT HANDLER ============
async function handlePayment(userMsg, apiToken = null) {
  try {
    console.log('[Payment] Processing query:', userMsg);
    console.log('[Payment] Has API token:', !!apiToken);
    
    const lowerMsg = userMsg.toLowerCase();
    
    // Check if user wants to send report via email
    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const emailMatch = userMsg.match(emailPattern);
    
    if ((lowerMsg.includes('send') || lowerMsg.includes('email')) && 
        (lowerMsg.includes('report') || emailMatch)) {
      console.log('[Payment] Detected email report request');
      
      // Generate the formal report
      const report = await generateFormalPaymentReport(apiToken);
      
      if (!report) {
        return `❌ Unable to generate payment report. No payment data available.`;
      }
      
      // If email address is provided, send it
      if (emailMatch) {
        const emailAddress = emailMatch[0];
        console.log('[Payment] Sending report to:', emailAddress);
        
        try {
          const emailService = require('../email.service').EmailService;
          const service = new emailService();
          
          const result = await service.sendEmail({
            to: emailAddress,
            subject: 'Kozi - Upcoming Salary Payments Report',
            body: report
          });
          
          return `✅ **Payment Report Sent Successfully!**\n\n**To:** ${emailAddress}\n**Subject:** Kozi - Upcoming Salary Payments Report\n**Message ID:** ${result.messageId}\n\nThe formal payment report has been delivered to the specified email address.\n\nWould you like to send it to another recipient?`;
        } catch (error) {
          console.error('[Payment] Email send error:', error);
          return `❌ **Failed to Send Report**\n\nError: ${error.message}\n\n**The Report:**\n\n${report}\n\nWould you like to try sending it again?`;
        }
      } else {
        // Show report and ask for email
        return `📄 **Formal Payment Report Generated**\n\n${report}\n\nWould you like me to email this report? Please provide the email address.`;
      }
    }
    
    // Generate report (without email)
    if (lowerMsg.includes('generate') && lowerMsg.includes('report')) {
      console.log('[Payment] Generating formal report');
      
      const report = await generateFormalPaymentReport(apiToken);
      
      if (!report) {
        return `❌ Unable to generate payment report. No payment data available.`;
      }
      
      return `📄 **Formal Payment Report**\n\n${report}\n\nWould you like me to email this report to someone? Just say "send it to email@example.com"`;
    }
    
    // Get upcoming payments
    if (lowerMsg.includes('upcoming') || lowerMsg.includes('show') || lowerMsg.includes('list')) {
      console.log('[Admin Payment] Fetching upcoming payments...');
      const result = await listUpcomingPayments(apiToken);
      
      if (!result.success) {
        return `💰 **Payment System Status**\n\n❌ Unable to fetch payment data.\n\n**Issue:** ${result.error || 'Unknown error'}\n\n**Troubleshooting:**\n• Check that hired employees exist in the system\n• Verify the external API is accessible\n• Check backend logs for detailed error messages\n\nPlease contact technical support if the issue persists.`;
      }
      
      if (!result.data || result.data.length === 0) {
        return `💰 **No Upcoming Payments**\n\nThere are currently no salary payments calculated from the payroll records.\n\n**Possible reasons:**\n• No payroll records exist in the system\n• Payment dates could not be parsed from the data\n• All records have invalid date formats\n\n**Troubleshooting:**\n• Check backend console logs for detailed information\n• Verify payroll records have valid salary_date or starting_date fields\n• Contact technical support if the issue persists\n\n**Need help?** Email: info@kozi.rw | Phone: +250 788 719 678`;
      }
      
      // Determine window message
      const windowMessage = result.message || 
        (result.window === '14 days' ? '(Next 14 Days)' : '(Upcoming Payments)');
      
      let response = `💰 **Upcoming Salary Payments** ${windowMessage}\n\n`;
      
      // Add notice if showing extended window
      if (result.window !== '14 days' && result.message) {
        response += `ℹ️  ${result.message}\n\n`;
      }
      result.data.forEach((payment, idx) => {
        const employeeName = payment.job_seeker ? 
          `${payment.job_seeker.first_name} ${payment.job_seeker.last_name}` : 
          'Unknown Employee';
        const employerName = payment.employer ? 
          payment.employer.company_name : 
          'Unknown Employer';
        
        response += `${idx + 1}. **${employeeName}** (${employerName})\n`;
        response += `   💼 Position: ${payment.job_title || 'Not specified'}\n`;
        response += `   💵 Salary: ${payment.amount ? payment.amount.toLocaleString() + ' RWF' : 'Not specified'}\n`;
        
        // Show Kozi commission if available
        if (payment.commission) {
          response += `   💎 Kozi Commission (18%): ${payment.commission.toLocaleString()} RWF\n`;
        }
        
        // Show due date with days until payment
        const dueDate = new Date(payment.due_date);
        const dueDateStr = dueDate.toLocaleDateString();
        const daysUntil = payment.days_until !== undefined ? payment.days_until : 
          Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24));
        
        if (daysUntil === 0) {
          response += `   📅 Due Date: ${dueDateStr} ⚠️ **DUE TODAY**\n`;
        } else if (daysUntil === 1) {
          response += `   📅 Due Date: ${dueDateStr} (Tomorrow)\n`;
        } else if (daysUntil < 0) {
          response += `   📅 Due Date: ${dueDateStr} 🔴 **OVERDUE by ${Math.abs(daysUntil)} days**\n`;
        } else {
          response += `   📅 Due Date: ${dueDateStr} (in ${daysUntil} days)\n`;
        }
        
        response += `   🏠 Accommodation: ${payment.accommodation || 'Not specified'}\n`;
        response += `   📍 Address: ${payment.address || 'Not specified'}\n`;
        response += `   📊 Status: ${payment.status}\n\n`;
      });
      
      // Calculate totals
      const totalSalaries = result.data.reduce((sum, p) => sum + (p.amount || 0), 0);
      const totalCommissions = result.data.reduce((sum, p) => sum + (p.commission || 0), 0);
      
      response += `\n**Summary:**\n`;
      response += `• Total Payments: ${result.data.length}\n`;
      response += `• Total Salary Amount: ${totalSalaries.toLocaleString()} RWF\n`;
      response += `• Total Kozi Commission: ${totalCommissions.toLocaleString()} RWF\n\n`;
      response += `Would you like me to generate a detailed payment report or send notifications to employers?`;
      
      return response;
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

    // Check for statistics request first
    const statsResponse = await handleStatistics(text, apiToken);
    if (statsResponse) {
      await streamText(res, statsResponse);
      await saveAssistantMessage(session.id, statsResponse);
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
      return;
    }

    // Detect intent and route to appropriate service
    const intent = await analyzeIntent(text);
    console.log('[Admin Chat] Detected intent:', intent, 'for message:', text);

    if (intent === 'PAYMENT') {
      // Handle payment queries with real data
      const paymentResponse = await handlePayment(text, apiToken);
      await streamText(res, paymentResponse);
      await saveAssistantMessage(session.id, paymentResponse);
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } else if (intent === 'EMAIL') {
      // Handle email queries (send or manage Gmail)
      const emailResponse = await handleEmail(text);
      await streamText(res, emailResponse);
      await saveAssistantMessage(session.id, emailResponse);
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } else if (intent === 'DATABASE') {
      // Handle database queries with real data
      const dbResponse = await handleDb(text, apiToken);
      await streamText(res, dbResponse);
      await saveAssistantMessage(session.id, dbResponse);
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } else if (intent === 'JOB_SEEKERS') {
      // Handle job seekers API queries
      const jobSeekersResponse = await handleJobSeekers(text, apiToken);
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