const { prisma } = require('../utils/chatUtils');
const fetch = require('node-fetch');

// ============ FETCH PAYROLL DATA FROM KOZI API ============
/**
 * Fetches payroll data directly from the Kozi payroll API endpoint
 * This API provides upcoming payment information for hired employees
 */
async function fetchPayrollFromAPI(apiToken = process.env.API_TOKEN) {
  try {
    const token = apiToken || process.env.API_TOKEN || '';
    const apiBase = process.env.JOBSEEKERS_API_BASE || 'https://apis.kozi.rw';
    const url = `${apiBase}/admin/payroll`;
    
    console.log('[PAYROLL_API] 🔍 Fetching payroll data...');
    console.log('[PAYROLL_API] URL:', url);
    console.log('[PAYROLL_API] Has token:', !!token);
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      }
    });
    
    console.log('[PAYROLL_API] Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[PAYROLL_API] ❌ Error response:', errorText);
      throw new Error(`Payroll API failed: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('[PAYROLL_API] Raw response data:', JSON.stringify(data).substring(0, 300));
    
    // Handle different response formats
    const payrollData = Array.isArray(data) ? data : (data.data || data.payroll || []);
    
    console.log('[PAYROLL_API] ✅ Found', payrollData.length, 'payroll records');
    
    if (payrollData.length > 0) {
      console.log('[PAYROLL_API] Sample payroll record:', {
        id: payrollData[0].id,
        seeker_name: payrollData[0].seekers_name,
        provider_name: payrollData[0].providers_name,
        salary: payrollData[0].salary,
        salary_date: payrollData[0].salary_date
      });
    }
    
    return {
      success: true,
      data: payrollData,
      count: payrollData.length
    };
  } catch (error) {
    console.error('[PAYROLL_API] ❌ Fetch error:', error.message);
    console.error('[PAYROLL_API] Stack:', error.stack);
    return {
      success: false,
      error: error.message,
      data: [],
      count: 0
    };
  }
}

// ============ CALCULATE UPCOMING PAYMENTS FROM PAYROLL DATA ============
/**
 * Processes payroll data to identify upcoming payments within the next 7 days
 */
function calculateUpcomingPaymentsFromPayroll(payrollData) {
  try {
    console.log('[PAYMENT] 💰 Processing payroll data for upcoming payments...');
    
    if (!payrollData || payrollData.length === 0) {
      console.log('[PAYMENT] ℹ️  No payroll data to process');
      return {
        success: true,
        data: [],
        count: 0
      };
    }
    
    const today = new Date();
    const fourteenDaysFromNow = new Date();
    fourteenDaysFromNow.setDate(today.getDate() + 14);
    
    console.log('[PAYMENT] 📅 Payment window:', {
      today: today.toISOString().split('T')[0],
      fourteenDaysFromNow: fourteenDaysFromNow.toISOString().split('T')[0],
      totalPayrollRecords: payrollData.length
    });
    
    const upcomingPayments = [];
    const allPayments = []; // Track ALL payments for fallback
    let skippedCount = 0;
    
    for (const payroll of payrollData) {
      // Parse salary date (could be a specific date or day of month)
      const salaryDate = parseSalaryDate(payroll.salary_date, payroll.starting_date);
      
      if (!salaryDate || isNaN(salaryDate.getTime())) {
        console.log(`[PAYMENT] ⚠️  Skipping payroll ${payroll.id} - invalid salary date:`, payroll.salary_date);
        skippedCount++;
        continue;
      }
      
      const isWithinWindow = salaryDate <= fourteenDaysFromNow && salaryDate >= today;
      const daysUntilPayment = Math.ceil((salaryDate - today) / (1000 * 60 * 60 * 24));
      
      console.log(`[PAYMENT] Processing ${payroll.seekers_name}:`, {
        salaryDate: salaryDate.toISOString().split('T')[0],
        daysUntilPayment: daysUntilPayment,
        isWithinWindow: isWithinWindow
      });
      
      const salary = parseFloat(payroll.salary) || 0;
      const koziCommission = Math.round(salary * 0.18); // 18% commission
      
      const paymentInfo = {
        id: payroll.id,
        amount: salary,
        commission: koziCommission,
        due_date: salaryDate.toISOString(),
        days_until: daysUntilPayment,
        status: 'pending',
        employer: {
          company_name: payroll.providers_name || 'Unknown Employer',
          first_name: null,
          last_name: null,
          email: payroll.providers_email || null
        },
        job_seeker: {
          first_name: payroll.seekers_name ? payroll.seekers_name.split(' ')[0] : '',
          last_name: payroll.seekers_name ? payroll.seekers_name.split(' ').slice(1).join(' ') : '',
          email: null
        },
        job_title: payroll.title || 'Not specified',
        accommodation: payroll.accommodation || 'Not specified',
        address: payroll.address || 'Not specified',
        starting_date: payroll.starting_date
      };
      
      // Add to all payments list
      allPayments.push(paymentInfo);
      
      // Check if payment is due within next 14 days
      if (isWithinWindow) {
        console.log(`[PAYMENT] ✅ Payment due within 14 days for ${payroll.seekers_name}`);
        upcomingPayments.push(paymentInfo);
      }
    }
    
    console.log('[PAYMENT] 📊 Summary:', {
      totalPayrollRecords: payrollData.length,
      upcomingPayments: upcomingPayments.length,
      allPaymentsCalculated: allPayments.length,
      skippedInvalidDates: skippedCount
    });
    
    // Sort by payment date (earliest first)
    upcomingPayments.sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
    allPayments.sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
    
    if (upcomingPayments.length > 0) {
      console.log('[PAYMENT] 🎉 Found', upcomingPayments.length, 'payments due within 14 days!');
      return {
        success: true,
        data: upcomingPayments,
        count: upcomingPayments.length,
        window: '14 days'
      };
    } else if (allPayments.length > 0) {
      console.log('[PAYMENT] ℹ️  No payments in 14-day window, showing next', Math.min(allPayments.length, 5), 'upcoming payments');
      // Show next 5 upcoming payments (even if they're beyond 14 days)
      const nextPayments = allPayments.slice(0, 5);
      return {
        success: true,
        data: nextPayments,
        count: nextPayments.length,
        window: 'next 30 days',
        message: `No payments due in the next 14 days. Showing ${nextPayments.length} upcoming payment(s).`
      };
    } else {
      console.log('[PAYMENT] ℹ️  No valid payment dates found');
      return {
        success: true,
        data: [],
        count: 0
      };
    }
  } catch (error) {
    console.error('[PAYMENT] ❌ Calculate upcoming payments error:', error);
    return {
      success: false,
      error: error.message,
      data: [],
      count: 0
    };
  }
}

// ============ HELPER FUNCTION: PARSE SALARY DATE ============
/**
 * Parses salary date and calculates the NEXT payment due date
 * 
 * This function handles:
 * - Full date: "2024-01-15" → calculates next monthly payment
 * - Day of month: "15" or "15th" → next occurrence of that day
 * - Ordinal: "31/12" (day/month) → calculates next payment
 * 
 * For monthly recurring payments, it calculates the next payment date
 * based on the original payment day.
 */
function parseSalaryDate(salaryDateStr, startingDate) {
  console.log('[DATE_PARSER] Input:', { salaryDateStr, startingDate });
  
  if (!salaryDateStr && !startingDate) {
    console.log('[DATE_PARSER] No date provided');
    return null;
  }
  
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to start of day
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  let paymentDay = null;
  
  // Try parsing as full date first (e.g., "2024-01-15")
  if (salaryDateStr && salaryDateStr.includes('-')) {
    const fullDate = new Date(salaryDateStr);
    if (!isNaN(fullDate.getTime())) {
      paymentDay = fullDate.getDate();
      console.log('[DATE_PARSER] Extracted day from full date:', paymentDay);
    }
  }
  
  // Try parsing as day/month format (e.g., "31/12" or "15/11")
  if (!paymentDay && salaryDateStr && salaryDateStr.includes('/')) {
    const parts = salaryDateStr.split('/');
    const day = parseInt(parts[0].trim());
    if (day >= 1 && day <= 31) {
      paymentDay = day;
      console.log('[DATE_PARSER] Extracted day from day/month format:', paymentDay);
    }
  }
  
  // Try parsing as day of month only (e.g., "15" or "15th")
  if (!paymentDay && salaryDateStr) {
    const dayMatch = salaryDateStr.match(/(\d+)/);
    if (dayMatch) {
      const day = parseInt(dayMatch[1]);
      if (day >= 1 && day <= 31) {
        paymentDay = day;
        console.log('[DATE_PARSER] Extracted day from number:', paymentDay);
      }
    }
  }
  
  // Fallback: use starting date if available
  if (!paymentDay && startingDate) {
    const startDate = new Date(startingDate);
    if (!isNaN(startDate.getTime())) {
      paymentDay = startDate.getDate();
      console.log('[DATE_PARSER] Extracted day from starting date:', paymentDay);
    }
  }
  
  if (!paymentDay) {
    console.log('[DATE_PARSER] Could not determine payment day');
    return null;
  }
  
  // Calculate the NEXT occurrence of this payment day
  // Try current month first
  let nextPaymentDate = new Date(currentYear, currentMonth, paymentDay);
  nextPaymentDate.setHours(0, 0, 0, 0);
  
  console.log('[DATE_PARSER] Trying current month:', nextPaymentDate.toISOString().split('T')[0]);
  
  // If the payment day doesn't exist in current month (e.g., Feb 31), 
  // or if it has already passed, try next month
  if (nextPaymentDate.getDate() !== paymentDay || nextPaymentDate < today) {
    nextPaymentDate = new Date(currentYear, currentMonth + 1, paymentDay);
    nextPaymentDate.setHours(0, 0, 0, 0);
    console.log('[DATE_PARSER] Moved to next month:', nextPaymentDate.toISOString().split('T')[0]);
    
    // If the day still doesn't exist (e.g., Feb 30), use last day of month
    if (nextPaymentDate.getDate() !== paymentDay) {
      nextPaymentDate = new Date(currentYear, currentMonth + 2, 0); // Last day of next month
      nextPaymentDate.setHours(0, 0, 0, 0);
      console.log('[DATE_PARSER] Day doesn\'t exist in next month, using last day:', nextPaymentDate.toISOString().split('T')[0]);
    }
  }
  
  console.log('[DATE_PARSER] Final next payment date:', nextPaymentDate.toISOString().split('T')[0]);
  return nextPaymentDate;
}

// ============ EXTERNAL (KOZI API) UPCOMING PAYMENTS ============
/**
 * Main function to fetch and process upcoming payments from the payroll API
 */
async function listUpcomingPaymentsFromAPI(apiToken = process.env.API_TOKEN) {
  try {
    console.log('[PAYMENT] Fetching upcoming payments from payroll API...');
    
    // Fetch payroll data from the API
    const payrollResult = await fetchPayrollFromAPI(apiToken);
    
    if (!payrollResult.success) {
      console.log('[PAYMENT] Failed to fetch payroll data:', payrollResult.error);
      return {
        success: false,
        error: payrollResult.error || 'Failed to fetch payroll data',
        data: []
      };
    }

    // Calculate upcoming payments from payroll data
    const paymentsResult = calculateUpcomingPaymentsFromPayroll(payrollResult.data);
    
    return paymentsResult;
  } catch (error) {
    console.error('[PAYMENT] External payroll API error:', error);
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
}

// ============ PAYMENT TRACKING ============
async function listUpcomingPayments(apiToken = null) {
  try {
    console.log('[PAYMENT] 📋 Fetching upcoming payments...');
    console.log('[PAYMENT] Has API token:', !!apiToken);
    
    // Try to get payments from payroll API with token
    const result = await listUpcomingPaymentsFromAPI(apiToken);
    
    console.log('[PAYMENT] Result:', {
      success: result.success,
      count: result.count,
      error: result.error || 'none'
    });
    
    // Return the result directly (no fallback to local DB since payment table doesn't exist)
    return result;
  } catch (error) {
    console.error('[PAYMENT] ❌ List upcoming payments error:', error);
    return {
      success: false,
      error: error.message,
      data: [],
      count: 0
    };
  }
}

async function markAsPaid(paymentId) {
  try {
    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: { 
        status: 'paid',
        paid_at: new Date()
      },
      include: {
        employer: {
          select: {
            company_name: true,
            first_name: true,
            last_name: true
          }
        },
        job_seeker: {
          select: {
            first_name: true,
            last_name: true
          }
        }
      }
    });

    return {
      success: true,
      data: updatedPayment,
      message: `Payment #${paymentId} marked as paid successfully`
    };
  } catch (error) {
    console.error('[PAYMENT] Mark as paid error:', error);
    return {
      success: false,
      error: error.message,
      message: `Failed to mark payment #${paymentId} as paid`
    };
  }
}

async function getSummary() {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    const sevenDaysFromNow = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));

    const [
      totalPayments,
      pendingPayments,
      paidPayments,
      overduePayments,
      upcomingPayments,
      recentPayments
    ] = await Promise.all([
      prisma.payment.count(),
      prisma.payment.count({ where: { status: 'pending' } }),
      prisma.payment.count({ where: { status: 'paid' } }),
      prisma.payment.count({ 
        where: { 
          status: 'pending',
          due_date: { lt: now }
        } 
      }),
      prisma.payment.count({ 
        where: { 
          status: 'pending',
          due_date: { 
            gte: now,
            lte: sevenDaysFromNow
          }
        } 
      }),
      prisma.payment.count({ 
        where: { 
          created_at: { gte: thirtyDaysAgo }
        } 
      })
    ]);

    const totalAmount = await prisma.payment.aggregate({
      where: { status: 'paid' },
      _sum: { amount: true }
    });

    const pendingAmount = await prisma.payment.aggregate({
      where: { status: 'pending' },
      _sum: { amount: true }
    });

    return {
      success: true,
      data: {
        totalPayments,
        pendingPayments,
        paidPayments,
        overduePayments,
        upcomingPayments,
        recentPayments,
        totalAmountPaid: totalAmount._sum.amount || 0,
        totalAmountPending: pendingAmount._sum.amount || 0
      }
    };
  } catch (error) {
    console.error('[PAYMENT] Summary error:', error);
    return {
      success: false,
      error: error.message,
      data: null
    };
  }
}

async function generatePaymentReport() {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

    const payments = await prisma.payment.findMany({
      where: {
        created_at: { gte: thirtyDaysAgo }
      },
      include: {
        employer: {
          select: {
            company_name: true,
            first_name: true,
            last_name: true
          }
        },
        job_seeker: {
          select: {
            first_name: true,
            last_name: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    // Group by status
    const groupedPayments = payments.reduce((acc, payment) => {
      if (!acc[payment.status]) {
        acc[payment.status] = [];
      }
      acc[payment.status].push(payment);
      return acc;
    }, {});

    // Calculate totals
    const totals = payments.reduce((acc, payment) => {
      if (!acc[payment.status]) {
        acc[payment.status] = { count: 0, amount: 0 };
      }
      acc[payment.status].count++;
      acc[payment.status].amount += payment.amount || 0;
      return acc;
    }, {});

    return {
      success: true,
      data: {
        payments,
        groupedPayments,
        totals,
        period: 'Last 30 days',
        generatedAt: now
      }
    };
  } catch (error) {
    console.error('[PAYMENT] Report generation error:', error);
    return {
      success: false,
      error: error.message,
      data: null
    };
  }
}

// ============ PAYMENT CREATION ============
async function createPayment(paymentData) {
  try {
    const payment = await prisma.payment.create({
      data: {
        employer_id: paymentData.employer_id,
        job_seeker_id: paymentData.job_seeker_id,
        amount: paymentData.amount,
        description: paymentData.description,
        due_date: paymentData.due_date,
        status: 'pending'
      },
      include: {
        employer: {
          select: {
            company_name: true,
            first_name: true,
            last_name: true
          }
        },
        job_seeker: {
          select: {
            first_name: true,
            last_name: true
          }
        }
      }
    });

    return {
      success: true,
      data: payment,
      message: 'Payment created successfully'
    };
  } catch (error) {
    console.error('[PAYMENT] Create payment error:', error);
    return {
      success: false,
      error: error.message,
      message: 'Failed to create payment'
    };
  }
}

// ============ PAYMENT QUERIES ============
async function getPaymentsByEmployer(employerId) {
  try {
    const payments = await prisma.payment.findMany({
      where: { employer_id: employerId },
      include: {
        job_seeker: {
          select: {
            first_name: true,
            last_name: true,
            email: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    return {
      success: true,
      data: payments,
      count: payments.length
    };
  } catch (error) {
    console.error('[PAYMENT] Get payments by employer error:', error);
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
}

async function getPaymentsByJobSeeker(jobSeekerId) {
  try {
    const payments = await prisma.payment.findMany({
      where: { job_seeker_id: jobSeekerId },
      include: {
        employer: {
          select: {
            company_name: true,
            first_name: true,
            last_name: true,
            email: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    return {
      success: true,
      data: payments,
      count: payments.length
    };
  } catch (error) {
    console.error('[PAYMENT] Get payments by job seeker error:', error);
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
}

module.exports = {
  listUpcomingPayments,
  markAsPaid,
  getSummary,
  generatePaymentReport,
  createPayment,
  getPaymentsByEmployer,
  getPaymentsByJobSeeker,
  listUpcomingPaymentsFromAPI,
  fetchPayrollFromAPI,
  calculateUpcomingPaymentsFromPayroll,
  parseSalaryDate
};

