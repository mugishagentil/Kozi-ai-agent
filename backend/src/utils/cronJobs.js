const cron = require('node-cron');
const { listUpcomingPayments } = require('../services/payment.service');
const { logger } = require('./logger');

// ============ PAYMENT REMINDER CRON JOB ============
function setupPaymentReminders() {
  // Run every day at 9:00 AM
  cron.schedule('0 9 * * *', async () => {
    try {
      logger.info('Running daily payment reminder check...');
      
      const upcomingPayments = await listUpcomingPayments();
      
      if (upcomingPayments.success && upcomingPayments.data.length > 0) {
        logger.info(`Found ${upcomingPayments.data.length} upcoming payments`);
        
        // Log payment details
        upcomingPayments.data.forEach(payment => {
          logger.info(`Payment #${payment.id} due: ${payment.due_date} - ${payment.amount} RWF`);
        });
        
        // Here you could add email notifications or other alert mechanisms
        // For now, we'll just log the information
        
      } else {
        logger.info('No upcoming payments found');
      }
      
    } catch (error) {
      logger.error('Payment reminder cron job failed:', error);
    }
  }, {
    scheduled: true,
    timezone: "Africa/Kigali"
  });
  
  logger.info('Payment reminder cron job scheduled for 9:00 AM daily');
}

// ============ OVERDUE PAYMENT CHECK ============
function setupOverduePaymentCheck() {
  // Run every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    try {
      logger.info('Running overdue payment check...');
      
      const now = new Date();
      const overduePayments = await listUpcomingPayments();
      
      if (overduePayments.success) {
        const overdue = overduePayments.data.filter(payment => 
          new Date(payment.due_date) < now
        );
        
        if (overdue.length > 0) {
          logger.warn(`Found ${overdue.length} overdue payments`);
          
          overdue.forEach(payment => {
            logger.warn(`OVERDUE: Payment #${payment.id} - ${payment.amount} RWF (Due: ${payment.due_date})`);
          });
        }
      }
      
    } catch (error) {
      logger.error('Overdue payment check failed:', error);
    }
  }, {
    scheduled: true,
    timezone: "Africa/Kigali"
  });
  
  logger.info('Overdue payment check scheduled every 6 hours');
}

// ============ WEEKLY REPORT GENERATION ============
function setupWeeklyReports() {
  // Run every Monday at 8:00 AM
  cron.schedule('0 8 * * 1', async () => {
    try {
      logger.info('Generating weekly payment report...');
      
      const upcomingPayments = await listUpcomingPayments();
      
      if (upcomingPayments.success) {
        logger.info(`Weekly Report - Total upcoming payments: ${upcomingPayments.data.length}`);
        
        // Group by employer
        const byEmployer = upcomingPayments.data.reduce((acc, payment) => {
          const employer = payment.employer?.company_name || 'Unknown';
          if (!acc[employer]) acc[employer] = [];
          acc[employer].push(payment);
          return acc;
        }, {});
        
        Object.keys(byEmployer).forEach(employer => {
          const payments = byEmployer[employer];
          const total = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
          logger.info(`${employer}: ${payments.length} payments, Total: ${total} RWF`);
        });
      }
      
    } catch (error) {
      logger.error('Weekly report generation failed:', error);
    }
  }, {
    scheduled: true,
    timezone: "Africa/Kigali"
  });
  
  logger.info('Weekly report generation scheduled for Mondays at 8:00 AM');
}

// ============ INITIALIZE ALL CRON JOBS ============
function initializeCronJobs() {
  try {
    setupPaymentReminders();
    setupOverduePaymentCheck();
    setupWeeklyReports();
    
    logger.info('All cron jobs initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize cron jobs:', error);
  }
}

// ============ MANUAL TRIGGERS ============
async function triggerPaymentReminders() {
  try {
    logger.info('Manually triggering payment reminders...');
    
    const upcomingPayments = await listUpcomingPayments();
    
    if (upcomingPayments.success) {
      return {
        success: true,
        message: `Found ${upcomingPayments.data.length} upcoming payments`,
        data: upcomingPayments.data
      };
    } else {
      return {
        success: false,
        message: 'Failed to fetch upcoming payments',
        error: upcomingPayments.error
      };
    }
  } catch (error) {
    logger.error('Manual payment reminder trigger failed:', error);
    return {
      success: false,
      message: 'Manual trigger failed',
      error: error.message
    };
  }
}

module.exports = {
  initializeCronJobs,
  setupPaymentReminders,
  setupOverduePaymentCheck,
  setupWeeklyReports,
  triggerPaymentReminders
};



