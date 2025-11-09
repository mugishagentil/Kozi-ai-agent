const { prisma } = require('../utils/chatUtils');

// ============ EXTERNAL (KOZI API) UPCOMING PAYMENTS ============
async function listUpcomingPaymentsFromAPI(apiToken = process.env.API_TOKEN) {
  try {
    const apiBase = process.env.JOBSEEKERS_API_BASE || 'https://apis.kozi.rw';
    // NOTE: Update this endpoint to your actual hired job seeker payments endpoint
    const url = `${apiBase}/admin/hired_seekers/upcoming_payments`;

    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(apiToken ? { 'Authorization': `Bearer ${apiToken}` } : {})
      }
    });

    if (!res.ok) {
      throw new Error(`Hired payments API failed: ${res.status}`);
    }

    const data = await res.json();
    const items = Array.isArray(data) ? data : (data.data || data.results || []);

    const normalized = items.map((p, i) => ({
      id: p.id || i + 1,
      amount: Number(p.amount) || 0,
      due_date: p.next_payment_date ? new Date(p.next_payment_date) : null,
      status: p.status || 'pending',
      employer: {
        company_name: p.employer_name || p.employer?.company_name || 'Unknown Employer',
        first_name: p.employer?.first_name || null,
        last_name: p.employer?.last_name || null,
        email: p.employer?.email || null
      },
      job_seeker: {
        first_name: p.job_seeker_first_name || p.job_seeker?.first_name || '',
        last_name: p.job_seeker_last_name || p.job_seeker?.last_name || '',
        email: p.job_seeker?.email || null
      }
    }))
    .filter(p => p.due_date && (p.due_date - new Date()) <= 7 * 24 * 60 * 60 * 1000)
    .sort((a, b) => a.due_date - b.due_date);

    return {
      success: true,
      data: normalized,
      count: normalized.length
    };
  } catch (error) {
    console.error('[PAYMENT] External hired payments error:', error);
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
}

// ============ PAYMENT TRACKING ============
async function listUpcomingPayments() {
  try {
    // 1) Try external hired job seeker API first
    const apiFirst = await listUpcomingPaymentsFromAPI();
    if (apiFirst.success && apiFirst.data && apiFirst.data.length > 0) {
      return apiFirst;
    }

    // 2) Fallback to local DB (payments table) - due in next 7 days
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const upcomingPayments = await prisma.payment.findMany({
      where: {
        due_date: {
          lte: sevenDaysFromNow,
        },
        status: 'pending'
      },
      include: {
        employer: {
          select: {
            company_name: true,
            first_name: true,
            last_name: true,
            email: true
          }
        },
        job_seeker: {
          select: {
            first_name: true,
            last_name: true,
            email: true
          }
        }
      },
      orderBy: {
        due_date: 'asc'
      }
    });

    return {
      success: true,
      data: upcomingPayments,
      count: upcomingPayments.length
    };
  } catch (error) {
    console.error('[PAYMENT] List upcoming payments error:', error);
    return {
      success: false,
      error: error.message,
      data: []
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
  listUpcomingPaymentsFromAPI
};

