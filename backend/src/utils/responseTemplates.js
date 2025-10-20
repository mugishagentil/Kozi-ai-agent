const { ChatOpenAI } = require('@langchain/openai');

const llm = new ChatOpenAI({
  modelName: process.env.OPENAI_CHAT_MODEL || 'gpt-4o',
  temperature: 0.3,
  openAIApiKey: process.env.OPENAI_API_KEY,
});

// ============ ADMIN GREETING ============
async function greetingAdmin() {
  const greetings = [
    "Hey Admin 👋 Need help with payments, database queries, or emails?",
    "What can I help you with today? Salaries, data, or email support?",
    "Ready to assist! Payments, database, or Gmail?",
    "Good to see you! What admin task can I help with?",
    "Hello! Ready to manage the platform? Payments, data, or emails?"
  ];
  
  return greetings[Math.floor(Math.random() * greetings.length)];
}

// ============ PAYMENT TEMPLATES ============
async function paymentOverviewMessage(summary, report) {
  try {
    const prompt = `Create a concise admin payment overview message:

Summary Data:
- Total Payments: ${summary.data?.totalPayments || 0}
- Pending: ${summary.data?.pendingPayments || 0}
- Paid: ${summary.data?.paidPayments || 0}
- Overdue: ${summary.data?.overduePayments || 0}
- Upcoming (7 days): ${summary.data?.upcomingPayments || 0}
- Total Amount Paid: ${summary.data?.totalAmountPaid || 0} RWF
- Total Amount Pending: ${summary.data?.totalAmountPending || 0} RWF

Report Data:
- Upcoming Count: ${report.data?.upcoming?.length || 0}
- Overdue Count: ${report.data?.overdue?.length || 0}

Format as a professional admin message with:
1. Key statistics in a clear format
2. Action items if there are overdue payments
3. Next steps suggestions

Keep it concise and actionable.`;

    const response = await llm.invoke(prompt);
    return response.content;
  } catch (error) {
    console.error('[TEMPLATE] Payment overview error:', error);
    return `💰 **Payment Overview**

**Summary:**
• Total Payments: ${summary.data?.totalPayments || 0}
• Pending: ${summary.data?.pendingPayments || 0}
• Paid: ${summary.data?.paidPayments || 0}
• Overdue: ${summary.data?.overduePayments || 0}

${summary.data?.overduePayments > 0 ? '⚠️ **Action Required:** You have overdue payments that need attention.\n' : ''}
✅ **Next Steps:** Would you like me to generate a detailed report or help with specific payments?`;
  }
}

async function paymentMarkedAsPaidMessage(result) {
  if (result.success) {
    return `✅ **Payment Marked as Paid!**

Payment #${result.data.id} has been successfully marked as paid.

**Details:**
• Amount: ${result.data.amount} RWF
• Employer: ${result.data.employer?.company_name || 'N/A'}
• Job Seeker: ${result.data.job_seeker?.first_name} ${result.data.job_seeker?.last_name}
• Paid At: ${new Date(result.data.paid_at).toLocaleString()}

✅ **Next Steps:** Would you like me to show you other pending payments?`;
  } else {
    return `❌ **Failed to Mark Payment as Paid**

${result.message || 'An error occurred while updating the payment status.'}

✅ **Next Steps:** Please verify the payment ID and try again.`;
  }
}

async function paymentReportMessage(report) {
  try {
    const prompt = `Create a professional payment report message:

Report Data:
- Upcoming Payments: ${report.data?.upcoming?.length || 0}
- Overdue Payments: ${report.data?.overdue?.length || 0}
- Period: ${report.data?.period || 'Last 30 days'}
- Generated At: ${report.data?.generatedAt || new Date().toISOString()}

Format as:
1. Report header with period
2. Key findings
3. Action items if needed
4. Next steps

Keep it professional and actionable.`;

    const response = await llm.invoke(prompt);
    return response.content;
  } catch (error) {
    console.error('[TEMPLATE] Payment report error:', error);
    return `📊 **Payment Report - ${report.data?.period || 'Last 30 days'}**

**Summary:**
• Upcoming Payments: ${report.data?.upcoming?.length || 0}
• Overdue Payments: ${report.data?.overdue?.length || 0}

${report.data?.overdue?.length > 0 ? '⚠️ **Action Required:** You have overdue payments that need immediate attention.\n' : ''}
✅ **Next Steps:** Would you like me to help you contact employers about overdue payments?`;
  }
}

// ============ DATABASE TEMPLATES ============
async function databaseResultsMessage(result, insights) {
  try {
    const prompt = `Create a professional database query results message:

Query Results:
- Success: ${result.success}
- Count: ${result.count || 0}
- Entity: ${result.entity || 'data'}
- Location: ${result.location || 'N/A'}
- Query: ${result.query || 'N/A'}

Data Sample (first 3 items):
${JSON.stringify(result.data?.slice(0, 3) || [], null, 2)}

Insights Available:
${insights?.available ? insights.available.join(', ') : 'None'}

Format as:
1. Results summary
2. Key findings
3. Location breakdown if applicable
4. Available insights
5. Next steps

Keep it concise and professional.`;

    const response = await llm.invoke(prompt);
    return response.content;
  } catch (error) {
    console.error('[TEMPLATE] Database results error:', error);
    
    let message = `📊 **Database Query Results**\n\n`;
    
    if (result.success) {
      message += `Found **${result.count}** ${result.entity || 'records'}`;
      
      if (result.location) {
        message += ` in **${result.location}**`;
      }
      
      message += `.\n\n`;
      
      if (result.data && result.data.length > 0) {
        message += `**Sample Results:**\n`;
        result.data.slice(0, 3).forEach((item, index) => {
          message += `${index + 1}. ${JSON.stringify(item, null, 2)}\n`;
        });
      }
      
      if (insights?.available && insights.available.length > 0) {
        message += `\n**Available Insights:**\n`;
        insights.available.forEach(insight => {
          message += `• ${insight}\n`;
        });
      }
      
      message += `\n✅ **Next Steps:** Would you like me to filter these results further or show more details?`;
    } else {
      message += `❌ **Query Failed**\n\n${result.friendlyMessage || result.error}`;
    }
    
    return message;
  }
}

// ============ GMAIL TEMPLATES ============
async function gmailResultsMessage(result) {
  try {
    const prompt = `Create a professional Gmail results message:

Gmail Result:
${JSON.stringify(result, null, 2)}

Format as:
1. Action taken
2. Key information
3. Next steps if applicable

Keep it concise and professional.`;

    const response = await llm.invoke(prompt);
    return response.content;
  } catch (error) {
    console.error('[TEMPLATE] Gmail results error:', error);
    return `📧 **Gmail Operation**

${result.success ? '✅ **Success**' : '❌ **Failed**'}

${result.output || result.message || 'Operation completed.'}

${result.success ? '\n✅ **Next Steps:** Would you like me to help with another email task?' : '\n✅ **Next Steps:** Please try again or contact support if the issue persists.'}`;
  }
}

// ============ ERROR TEMPLATES ============
function getErrorMessage(context, error) {
  const messages = {
    gmail: "I'm having trouble connecting to Gmail right now. This could be due to:\n• Authentication issues\n• Network connectivity\n• API rate limits\n\n✅ **Suggested Action:** Please verify your Gmail settings or try again in a few minutes.",
    database: "I couldn't access the database at the moment. This might be because:\n• Connection timeout\n• Table doesn't exist\n• Invalid query\n\n✅ **Suggested Action:** Please check if the database is properly configured.",
    payment: "I encountered an issue with the payment system:\n• The payment record might not exist\n• Invalid payment ID\n• Database connection issue\n\n✅ **Suggested Action:** Please verify the payment ID and try again.",
    general: "I encountered an unexpected error. Please try again or contact support if the issue persists."
  };
  
  return messages[context] || messages.general;
}

module.exports = {
  greetingAdmin,
  paymentOverviewMessage,
  paymentMarkedAsPaidMessage,
  paymentReportMessage,
  databaseResultsMessage,
  gmailResultsMessage,
  getErrorMessage
};



