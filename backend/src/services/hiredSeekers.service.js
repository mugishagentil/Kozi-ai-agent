const fetch = require('node-fetch');

// ============ FETCH HIRED SEEKERS FROM EXTERNAL API ============
async function fetchHiredSeekersFromAPI(apiToken = null) {
  try {
    const token = apiToken || process.env.API_TOKEN || '';
    const apiBase = process.env.JOBSEEKERS_API_BASE || 'https://apis.kozi.rw';
    const url = `${apiBase}/admin/hired_seekers`;
    
    console.log('[HIRED_SEEKERS_API] 🔍 Fetching hired seekers...');
    console.log('[HIRED_SEEKERS_API] URL:', url);
    console.log('[HIRED_SEEKERS_API] Has token:', !!token);
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      }
    });
    
    console.log('[HIRED_SEEKERS_API] Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[HIRED_SEEKERS_API] ❌ Error response:', errorText);
      throw new Error(`Hired seekers API failed: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('[HIRED_SEEKERS_API] Raw response data:', JSON.stringify(data).substring(0, 200));
    
    // Handle different response formats
    const hiredSeekers = Array.isArray(data) ? data : (data.data || data.hired_seekers || []);
    
    console.log('[HIRED_SEEKERS_API] ✅ Found', hiredSeekers.length, 'hired seekers');
    
    if (hiredSeekers.length > 0) {
      console.log('[HIRED_SEEKERS_API] Sample hired seeker:', {
        hired_id: hiredSeekers[0].hired_id,
        seeker_name: `${hiredSeekers[0].seeker_first_name} ${hiredSeekers[0].seeker_last_name}`,
        hire_date: hiredSeekers[0].date,
        has_job_description: !!hiredSeekers[0].job_description
      });
    }
    
    return {
      success: true,
      data: hiredSeekers,
      count: hiredSeekers.length
    };
  } catch (error) {
    console.error('[HIRED_SEEKERS_API] ❌ Fetch error:', error.message);
    console.error('[HIRED_SEEKERS_API] Stack:', error.stack);
    return {
      success: false,
      error: error.message,
      data: [],
      count: 0
    };
  }
}

// ============ CALCULATE UPCOMING PAYMENTS ============
async function getUpcomingPayments(apiToken = null) {
  try {
    console.log('[PAYMENT] 💰 Starting payment calculation...');
    
    // Fetch hired seekers
    const hiredResult = await fetchHiredSeekersFromAPI(apiToken);
    
    if (!hiredResult.success) {
      console.log('[PAYMENT] ❌ Failed to fetch hired seekers:', hiredResult.error);
      return {
        success: false,
        data: [],
        count: 0,
        message: `Failed to fetch hired seekers: ${hiredResult.error}`
      };
    }
    
    if (!hiredResult.data || hiredResult.data.length === 0) {
      console.log('[PAYMENT] ℹ️  No hired seekers found in the system');
      return {
        success: true,
        data: [],
        count: 0,
        message: 'No hired seekers found'
      };
    }
    
    const hiredSeekers = hiredResult.data;
    const today = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(today.getDate() + 7);
    
    console.log('[PAYMENT] 📅 Payment window:', {
      today: today.toISOString().split('T')[0],
      sevenDaysFromNow: sevenDaysFromNow.toISOString().split('T')[0],
      totalHiredSeekers: hiredSeekers.length
    });
    
    // Calculate payment schedules for each hired seeker
    const upcomingPayments = [];
    let skippedCount = 0;
    let outsideWindowCount = 0;
    
    for (const hired of hiredSeekers) {
      // Parse the hire date
      const hireDate = hired.date ? new Date(hired.date) : null;
      
      if (!hireDate || isNaN(hireDate.getTime())) {
        console.log(`[PAYMENT] ⚠️  Skipping hired seeker ${hired.hired_id} - invalid hire date:`, hired.date);
        skippedCount++;
        continue;
      }
      
      // Calculate next payment date (assuming monthly payments on the same day of the month)
      const nextPaymentDate = calculateNextPaymentDate(hireDate, today);
      
      console.log(`[PAYMENT] Processing ${hired.seeker_first_name} ${hired.seeker_last_name}:`, {
        hireDate: hireDate.toISOString().split('T')[0],
        nextPayment: nextPaymentDate.toISOString().split('T')[0],
        isWithinWindow: nextPaymentDate <= sevenDaysFromNow && nextPaymentDate >= today
      });
      
      // Check if payment is due within next 7 days
      if (nextPaymentDate && nextPaymentDate <= sevenDaysFromNow && nextPaymentDate >= today) {
        // Extract salary from job_description or use a default
        const salary = extractSalaryFromDescription(hired.job_description);
        
        console.log(`[PAYMENT] ✅ Payment due for ${hired.seeker_first_name}:`, {
          salary: salary || 'NOT FOUND',
          jobDescription: hired.job_description ? hired.job_description.substring(0, 100) : 'NONE'
        });
        
        upcomingPayments.push({
          id: hired.hired_id,
          amount: salary || 0,
          next_payment_date: nextPaymentDate.toISOString(),
          status: 'pending',
          employer_name: `${hired.provider_first_name || ''} ${hired.provider_last_name || ''}`.trim(),
          job_seeker_first_name: hired.seeker_first_name || '',
          job_seeker_last_name: hired.seeker_last_name || '',
          employer: {
            company_name: `${hired.provider_first_name || ''} ${hired.provider_last_name || ''}`.trim(),
            first_name: hired.provider_first_name,
            last_name: hired.provider_last_name,
            email: null // Add if available in your data
          },
          job_seeker: {
            first_name: hired.seeker_first_name,
            last_name: hired.seeker_last_name,
            email: null // Add if available in your data
          },
          when_need_worker: hired.when_need_worker,
          working_mode: hired.working_mode,
          accommodation_preference: hired.accommodation_preference,
          hire_date: hireDate.toISOString()
        });
      } else {
        outsideWindowCount++;
      }
    }
    
    console.log('[PAYMENT] 📊 Summary:', {
      totalHiredSeekers: hiredSeekers.length,
      upcomingPayments: upcomingPayments.length,
      skippedInvalidDates: skippedCount,
      outsidePaymentWindow: outsideWindowCount
    });
    
    // Sort by payment date (earliest first)
    upcomingPayments.sort((a, b) => new Date(a.next_payment_date) - new Date(b.next_payment_date));
    
    if (upcomingPayments.length > 0) {
      console.log('[PAYMENT] 🎉 Found', upcomingPayments.length, 'upcoming payments!');
    } else {
      console.log('[PAYMENT] ℹ️  No payments due in the next 7 days');
    }
    
    return {
      success: true,
      data: upcomingPayments,
      count: upcomingPayments.length
    };
  } catch (error) {
    console.error('[PAYMENT] ❌ Get upcoming payments error:', error);
    return {
      success: false,
      error: error.message,
      data: [],
      count: 0
    };
  }
}

// ============ HELPER FUNCTIONS ============

/**
 * Calculate the next payment date based on hire date (monthly payments)
 */
function calculateNextPaymentDate(hireDate, today) {
  const paymentDay = hireDate.getDate();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  
  // Try current month
  let nextPayment = new Date(currentYear, currentMonth, paymentDay);
  
  // If that date has passed, try next month
  if (nextPayment < today) {
    nextPayment = new Date(currentYear, currentMonth + 1, paymentDay);
  }
  
  // Handle edge case where the payment day doesn't exist in the month (e.g., 31st in Feb)
  if (nextPayment.getDate() !== paymentDay) {
    // Set to last day of the month
    nextPayment = new Date(currentYear, currentMonth + 1, 0);
  }
  
  return nextPayment;
}

/**
 * Extract salary information from job description
 * Looks for patterns like "salary: 150000", "150000 RWF", "150,000", etc.
 */
function extractSalaryFromDescription(description) {
  if (!description) return null;
  
  const text = description.toLowerCase();
  
  // Pattern 1: "salary: 150000" or "salary:150000"
  let match = text.match(/salary\s*:?\s*([\d,]+)/i);
  if (match) {
    return parseFloat(match[1].replace(/,/g, ''));
  }
  
  // Pattern 2: "150000 RWF" or "150,000 RWF"
  match = text.match(/([\d,]+)\s*rwf/i);
  if (match) {
    return parseFloat(match[1].replace(/,/g, ''));
  }
  
  // Pattern 3: Any number followed by "per month" or "monthly"
  match = text.match(/([\d,]+)\s*(per\s*month|monthly)/i);
  if (match) {
    return parseFloat(match[1].replace(/,/g, ''));
  }
  
  // Default: return null if no salary found
  return null;
}

module.exports = {
  fetchHiredSeekersFromAPI,
  getUpcomingPayments,
  // Export helper functions for testing
  calculateNextPaymentDate,
  extractSalaryFromDescription
};

