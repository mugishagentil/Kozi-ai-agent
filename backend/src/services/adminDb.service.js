const { prisma } = require('../utils/prisma');
const { ChatOpenAI } = require('@langchain/openai');
const { SqlAgent } = require('../utils/JobseekerAgent');

// ============ SQL EXTRACTION ============
function extractSqlFromText(text) {
  const sqlMatch = text.match(/```sql\s*([\s\S]*?)\s*```/i);
  return sqlMatch ? sqlMatch[1].trim() : null;
}

// ============ NATURAL LANGUAGE TO SQL ============
async function queryWithNaturalLanguage(question) {
  try {
    const llm = new ChatOpenAI({
      modelName: process.env.OPENAI_CHAT_MODEL || 'gpt-4o',
      temperature: 0,
      openAIApiKey: process.env.OPENAI_API_KEY,
      maxTokens: 1000,
    });

    const prompt = `You are a SQL expert for the Kozi platform database. 
    
Database Schema:
- users: id, first_name, last_name, email, phone, province, district, created_at, updated_at
- job_providers: id, first_name, last_name, email, phone, company_name, province, district, created_at, updated_at
- jobs: id, title, description, category_id, provider_id, location, salary, created_at, updated_at, status
- categories: id, name, description
- applications: id, job_id, user_id, status, applied_at

Convert this natural language question to SQL: "${question}"

Rules:
1. Use proper table joins when needed
2. Include relevant fields (id, names, locations, dates)
3. Add LIMIT 50 for large result sets
4. Use proper WHERE clauses for filtering
5. For location queries, always include province and district
6. Return ONLY the SQL query, no explanations

SQL Query:`;

    const response = await llm.invoke(prompt);
    const sqlQuery = response.content.trim();
    
    console.log(`[SQL] Generated: ${sqlQuery}`);
    
    // Execute the query
    const result = await prisma.$queryRawUnsafe(sqlQuery);
    
    return {
      success: true,
      data: result,
      query: sqlQuery,
      count: Array.isArray(result) ? result.length : 0
    };
  } catch (error) {
    console.error('[SQL] Query error:', error);
    return {
      success: false,
      error: error.message,
      friendlyMessage: `I couldn't process that database query. Please try rephrasing your question or be more specific about what data you're looking for.`
    };
  }
}

// ============ PLATFORM INSIGHTS ============
async function getInsights() {
  try {
    const [
      totalUsers,
      totalProviders,
      totalJobs,
      recentUsers,
      recentProviders,
      recentJobs
    ] = await Promise.all([
      prisma.users.count(),
      prisma.job_providers.count(),
      prisma.jobs.count(),
      prisma.users.count({
        where: {
          created_at: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        }
      }),
      prisma.job_providers.count({
        where: {
          created_at: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        }
      }),
      prisma.jobs.count({
        where: {
          created_at: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        }
      })
    ]);

    return {
      success: true,
      data: {
        totalUsers,
        totalProviders,
        totalJobs,
        recentUsers,
        recentProviders,
        recentJobs
      },
      available: [
        'Total users',
        'Total employers',
        'Total jobs',
        'Recent registrations (30 days)',
        'Job postings this month'
      ]
    };
  } catch (error) {
    console.error('[INSIGHTS] Error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// ============ ENTITY FILTERING ============
async function filterEntities({ entity, query, location, category, skill, timeframe, limit = 50 }) {
  try {
    let whereClause = {};
    
    // Base entity filtering
    if (entity === 'users' || entity === 'jobseekers') {
      if (query) {
        whereClause.OR = [
          { first_name: { contains: query, mode: 'insensitive' } },
          { last_name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } }
        ];
      }
      
      if (location) {
        if (location.toLowerCase().includes('province')) {
          whereClause.province = { contains: location, mode: 'insensitive' };
        } else {
          whereClause.district = { contains: location, mode: 'insensitive' };
        }
      }
      
      if (timeframe) {
        const days = timeframe === 'week' ? 7 : timeframe === 'month' ? 30 : 365;
        whereClause.created_at = {
          gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        };
      }
      
      const results = await prisma.users.findMany({
        where: whereClause,
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email: true,
          phone: true,
          province: true,
          district: true,
          created_at: true
        },
        take: limit,
        orderBy: { created_at: 'desc' }
      });
      
      return {
        success: true,
        data: results,
        count: results.length,
        entity: 'job seekers'
      };
    }
    
    if (entity === 'providers' || entity === 'employers') {
      if (query) {
        whereClause.OR = [
          { first_name: { contains: query, mode: 'insensitive' } },
          { last_name: { contains: query, mode: 'insensitive' } },
          { company_name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } }
        ];
      }
      
      if (location) {
        if (location.toLowerCase().includes('province')) {
          whereClause.province = { contains: location, mode: 'insensitive' };
        } else {
          whereClause.district = { contains: location, mode: 'insensitive' };
        }
      }
      
      if (timeframe) {
        const days = timeframe === 'week' ? 7 : timeframe === 'month' ? 30 : 365;
        whereClause.created_at = {
          gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        };
      }
      
      const results = await prisma.job_providers.findMany({
        where: whereClause,
        select: {
          id: true,
          first_name: true,
          last_name: true,
          company_name: true,
          email: true,
          phone: true,
          province: true,
          district: true,
          created_at: true
        },
        take: limit,
        orderBy: { created_at: 'desc' }
      });
      
      return {
        success: true,
        data: results,
        count: results.length,
        entity: 'employers'
      };
    }
    
    if (entity === 'jobs') {
      if (query) {
        whereClause.OR = [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } }
        ];
      }
      
      if (location) {
        whereClause.location = { contains: location, mode: 'insensitive' };
      }
      
      if (category) {
        whereClause.category_id = parseInt(category);
      }
      
      if (timeframe) {
        const days = timeframe === 'week' ? 7 : timeframe === 'month' ? 30 : 365;
        whereClause.created_at = {
          gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        };
      }
      
      const results = await prisma.jobs.findMany({
        where: whereClause,
        select: {
          id: true,
          title: true,
          description: true,
          location: true,
          salary: true,
          status: true,
          created_at: true,
          job_providers: {
            select: {
              company_name: true,
              first_name: true,
              last_name: true,
              logo: true,
              image: true
            }
          },
          categories: {
            select: {
              name: true
            }
          }
        },
        take: limit,
        orderBy: { created_at: 'desc' }
      });
      
      return {
        success: true,
        data: results,
        count: results.length,
        entity: 'jobs'
      };
    }
    
    return {
      success: false,
      error: 'Unknown entity type',
      friendlyMessage: 'Please specify whether you want to search users, employers, or jobs.'
    };
    
  } catch (error) {
    console.error('[FILTER] Error:', error);
    return {
      success: false,
      error: error.message,
      friendlyMessage: 'I encountered an error while filtering the data. Please try again with a different query.'
    };
  }
}

// ============ INTELLIGENT QUERY ROUTING ============
async function intelligentQuery(userQuestion) {
  try {
    const lowerQuestion = userQuestion.toLowerCase();
    
    // Check if it's a simple count question
    if (lowerQuestion.includes('how many') || lowerQuestion.includes('count')) {
      // Extract entity and location
      let entity = 'users';
      let location = null;
      
      if (lowerQuestion.includes('employer') || lowerQuestion.includes('provider')) {
        entity = 'providers';
      } else if (lowerQuestion.includes('job')) {
        entity = 'jobs';
      }
      
      // Extract location
      const locationMatch = lowerQuestion.match(/(?:in|from)\s+([a-zA-Z\s]+?)(?:\s|$)/);
      if (locationMatch) {
        location = locationMatch[1].trim();
      }
      
      const result = await filterEntities({ 
        entity, 
        location,
        limit: 1000 // Get all for counting
      });
      
      if (result.success) {
        return {
          success: true,
          data: result.data,
          count: result.count,
          entity: result.entity,
          location: location,
          query: userQuestion
        };
      }
    }
    
    // Check if it's a filter/search request
    if (lowerQuestion.includes('filter') || lowerQuestion.includes('search') || lowerQuestion.includes('find')) {
      let entity = 'users';
      let query = null;
      let location = null;
      let timeframe = null;
      
      // Extract entity
      if (lowerQuestion.includes('employer') || lowerQuestion.includes('provider')) {
        entity = 'providers';
      } else if (lowerQuestion.includes('job')) {
        entity = 'jobs';
      }
      
      // Extract search terms
      const searchMatch = lowerQuestion.match(/(?:search|find|filter)\s+(?:for\s+)?(.+?)(?:\s+in|\s+from|\s+where|$)/);
      if (searchMatch) {
        query = searchMatch[1].trim();
      }
      
      // Extract location
      const locationMatch = lowerQuestion.match(/(?:in|from)\s+([a-zA-Z\s]+?)(?:\s|$)/);
      if (locationMatch) {
        location = locationMatch[1].trim();
      }
      
      // Extract timeframe
      if (lowerQuestion.includes('week')) {
        timeframe = 'week';
      } else if (lowerQuestion.includes('month')) {
        timeframe = 'month';
      } else if (lowerQuestion.includes('year')) {
        timeframe = 'year';
      }
      
      const result = await filterEntities({ 
        entity, 
        query, 
        location, 
        timeframe,
        limit: 50
      });
      
      if (result.success) {
        return {
          success: true,
          data: result.data,
          count: result.count,
          entity: result.entity,
          query: query,
          location: location,
          timeframe: timeframe
        };
      }
    }
    
    // Fallback to natural language SQL generation
    return await queryWithNaturalLanguage(userQuestion);
    
  } catch (error) {
    console.error('[INTELLIGENT] Query error:', error);
    return {
      success: false,
      error: error.message,
      friendlyMessage: 'I couldn\'t understand your query. Please try rephrasing it or be more specific about what data you\'re looking for.'
    };
  }
}

// ============ FETCH JOB SEEKERS FROM EXTERNAL API ============
async function fetchJobSeekersFromAPI(filters = {}, apiToken = null) {
  try {
    // Use provided token (admin's token) or fall back to env variable
    const token = apiToken || process.env.API_TOKEN || '';
    const apiBase = 'https://apis.kozi.rw';
    
    // Build query parameters
    const queryParams = new URLSearchParams();
    if (filters.search) queryParams.append('search', filters.search);
    if (filters.province) queryParams.append('province', filters.province);
    if (filters.district) queryParams.append('district', filters.district);
    if (filters.category_id) queryParams.append('category_id', filters.category_id);
    if (filters.created_after) queryParams.append('created_after', filters.created_after);
    if (filters.limit) queryParams.append('limit', filters.limit);
    
    // Fetch all job seekers from external API
    const url = `${apiBase}/job_seekers${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    console.log('[JOB_SEEKERS_API] Fetching from:', url);
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[JOB_SEEKERS_API] Error:', response.status, errorText);
      throw new Error(`Job seekers API failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Handle different response formats
    const jobSeekers = Array.isArray(data) ? data : (data.data || data.job_seekers || data.seekers || []);
    
    // Apply client-side filtering if needed
    let filteredSeekers = jobSeekers;
    if (filters.search) {
      const searchLower = filters.search.toLowerCase().trim();
      const searchParts = searchLower.split(/\s+/).filter(p => p.length > 0);
      
      filteredSeekers = jobSeekers.filter(seeker => {
        // Try different name formats
        const firstName = (seeker.first_name || '').toLowerCase().trim();
        const lastName = (seeker.last_name || '').toLowerCase().trim();
        const fullName = `${firstName} ${lastName}`.trim();
        const reverseName = `${lastName} ${firstName}`.trim();
        const displayName = (seeker.name || seeker.full_name || '').toLowerCase().trim();
        const email = (seeker.email || '').toLowerCase().trim();
        
        // Exact match
        if (fullName === searchLower || reverseName === searchLower || displayName === searchLower || email === searchLower) {
          return true;
        }
        
        // Contains match
        if (fullName.includes(searchLower) || reverseName.includes(searchLower) || displayName.includes(searchLower) || email.includes(searchLower)) {
          return true;
        }
        
        // Parts match - check if all search parts are in the name
        if (searchParts.length > 0) {
          const allPartsMatch = searchParts.every(part => 
            fullName.includes(part) || 
            reverseName.includes(part) || 
            displayName.includes(part) ||
            firstName.includes(part) ||
            lastName.includes(part)
          );
          if (allPartsMatch) return true;
        }
        
        // Individual field matches
        if (firstName.includes(searchLower) || lastName.includes(searchLower)) {
          return true;
        }
        
        // Skills match
        if (seeker.skills) {
          if (Array.isArray(seeker.skills) && seeker.skills.some(skill => String(skill).toLowerCase().includes(searchLower))) {
            return true;
          }
          if (typeof seeker.skills === 'string' && seeker.skills.toLowerCase().includes(searchLower)) {
            return true;
          }
        }
        
        return false;
      });
    }
    
    // Apply limit
    if (filters.limit) {
      filteredSeekers = filteredSeekers.slice(0, filters.limit);
    }
    
    return {
      success: true,
      data: filteredSeekers,
      count: filteredSeekers.length,
      total: jobSeekers.length
    };
  } catch (error) {
    console.error('[JOB_SEEKERS_API] Fetch error:', error);
    return {
      success: false,
      error: error.message,
      data: [],
      count: 0
    };
  }
}

// ============ FETCH ALL CATEGORIES ============
async function fetchAllCategories(apiToken = null) {
  try {
    const token = apiToken || process.env.API_TOKEN || '';
    const apiBase = 'https://apis.kozi.rw';
    const url = `${apiBase}/name_and_id`;
    console.log('[CATEGORIES_API] Fetching from:', url);
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      }
    });
    
    if (!response.ok) {
      throw new Error(`Categories API failed: ${response.status}`);
    }
    
    const data = await response.json();
    const categories = Array.isArray(data) ? data : (data.data || data.categories || []);
    
    return {
      success: true,
      data: categories,
      count: categories.length
    };
  } catch (error) {
    console.error('[CATEGORIES_API] Fetch error:', error);
    return {
      success: false,
      error: error.message,
      data: [],
      count: 0
    };
  }
}

// ============ FETCH JOB SEEKERS BY CATEGORY ============
async function fetchJobSeekersByCategory(categoryId, filters = {}, apiToken = null) {
  try {
    if (!categoryId) {
      throw new Error('Category ID is required');
    }
    
    const token = apiToken || process.env.API_TOKEN || '';
    const apiBase = 'https://apis.kozi.rw';
    const url = `${apiBase}/select_user_based_on_category/${categoryId}`;
    console.log('[JOB_SEEKERS_BY_CATEGORY_API] Fetching from:', url);
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      }
    });
    
    if (!response.ok) {
      throw new Error(`Job seekers by category API failed: ${response.status}`);
    }
    
    const data = await response.json();
    const jobSeekers = Array.isArray(data) ? data : (data.data || data.seekers || []);
    
    // Apply filters if needed
    let filteredSeekers = jobSeekers;
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filteredSeekers = jobSeekers.filter(seeker => 
        (seeker.first_name && seeker.first_name.toLowerCase().includes(searchLower)) ||
        (seeker.last_name && seeker.last_name.toLowerCase().includes(searchLower)) ||
        (seeker.email && seeker.email.toLowerCase().includes(searchLower))
      );
    }
    
    if (filters.limit) {
      filteredSeekers = filteredSeekers.slice(0, filters.limit);
    }
    
    return {
      success: true,
      data: filteredSeekers,
      count: filteredSeekers.length,
      total: jobSeekers.length
    };
  } catch (error) {
    console.error('[JOB_SEEKERS_BY_CATEGORY_API] Fetch error:', error);
    return {
      success: false,
      error: error.message,
      data: [],
      count: 0
    };
  }
}

// ============ FETCH EMPLOYER PROFILE ============
async function fetchEmployerProfile(users_id, apiToken = null) {
  try {
    if (!users_id) {
      throw new Error('User ID is required');
    }
    
    const token = apiToken || process.env.API_TOKEN || '';
    const apiBase = 'https://apis.kozi.rw';
    const url = `${apiBase}/provider/view_profile/${users_id}`;
    console.log('[EMPLOYER_PROFILE_API] Fetching from:', url);
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      }
    });
    
    if (!response.ok) {
      throw new Error(`Employer profile API failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      success: true,
      data: data
    };
  } catch (error) {
    console.error('[EMPLOYER_PROFILE_API] Fetch error:', error);
    return {
      success: false,
      error: error.message,
      data: null
    };
  }
}

// ============ GET USER ID BY EMAIL ============
async function getUserIdByEmail(email, apiToken = null) {
  try {
    if (!email) {
      throw new Error('Email is required');
    }
    
    const token = apiToken || process.env.API_TOKEN || '';
    const apiBase = 'https://apis.kozi.rw';
    const url = `${apiBase}/get_user_id_by_email/${encodeURIComponent(email)}`;
    console.log('[GET_USER_ID_API] Fetching from:', url);
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      }
    });
    
    if (!response.ok) {
      throw new Error(`Get user ID API failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      success: true,
      users_id: data.users_id || data.user_id || data.id,
      data: data
    };
  } catch (error) {
    console.error('[GET_USER_ID_API] Fetch error:', error);
    return {
      success: false,
      error: error.message,
      users_id: null
    };
  }
}

// ============ FETCH INCOMPLETE PROFILES ============
async function fetchIncompleteProfiles(apiToken = null) {
  try {
    const token = apiToken || process.env.API_TOKEN || '';
    const apiBase = 'https://apis.kozi.rw';
    const url = `${apiBase}/admin/job_seekers/who_did_not_complete_profile`;
    console.log('[INCOMPLETE_PROFILES_API] Fetching from:', url);
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      }
    });
    
    if (!response.ok) {
      throw new Error(`Incomplete profiles API failed: ${response.status}`);
    }
    
    const data = await response.json();
    const incompleteProfiles = Array.isArray(data) ? data : (data.data || data.profiles || []);
    
    return {
      success: true,
      data: incompleteProfiles,
      count: incompleteProfiles.length
    };
  } catch (error) {
    console.error('[INCOMPLETE_PROFILES_API] Fetch error:', error);
    return {
      success: false,
      error: error.message,
      data: [],
      count: 0
    };
  }
}

// ============ FETCH DASHBOARD STATISTICS ============
async function fetchDashboardStatistics(apiToken = null) {
  try {
    const token = apiToken || process.env.API_TOKEN || '';
    const apiBase = 'https://apis.kozi.rw';
    
    console.log('[DASHBOARD_STATS] Fetching all statistics from API...');
    
    // Fetch all statistics in parallel
    const statsPromises = [
      fetch(`${apiBase}/providers/counts`, {
        headers: { 
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      }).then(r => r.ok ? r.json() : { count: 0 }).then(d => ({ key: 'jobProviders', value: d.count || 0 })).catch(() => ({ key: 'jobProviders', value: 0 })),
      
      fetch(`${apiBase}/seekers/count`, {
        headers: { 
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      }).then(r => r.ok ? r.json() : { count: 0 }).then(d => ({ key: 'jobSeekers', value: d.count || 0 })).catch(() => ({ key: 'jobSeekers', value: 0 })),
      
      fetch(`${apiBase}/admin/count/approved_seekers`, {
        headers: { 
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      }).then(r => r.ok ? r.json() : { count: 0 }).then(d => ({ key: 'approvedSeekers', value: d.count || 0 })).catch(() => ({ key: 'approvedSeekers', value: 0 })),
      
      fetch(`${apiBase}/admin/count/approved_providers`, {
        headers: { 
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      }).then(r => r.ok ? r.json() : { count: 0 }).then(d => ({ key: 'approvedProviders', value: d.count || 0 })).catch(() => ({ key: 'approvedProviders', value: 0 })),
      
      fetch(`${apiBase}/admin/count/agent`, {
        headers: { 
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      }).then(r => r.ok ? r.json() : { count: 0 }).then(d => ({ key: 'agents', value: d.count || 0 })).catch(() => ({ key: 'agents', value: 0 })),
      
      fetch(`${apiBase}/admin/count/jobs`, {
        headers: { 
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      }).then(r => r.ok ? r.json() : { count: 0 }).then(d => ({ key: 'allJobs', value: d.count || 0 })).catch(() => ({ key: 'allJobs', value: 0 })),
      
      fetch(`${apiBase}/admin/count/unpublishedjob`, {
        headers: { 
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      }).then(r => r.ok ? r.json() : { count: 0 }).then(d => ({ key: 'unpublishedJobs', value: d.count || 0 })).catch(() => ({ key: 'unpublishedJobs', value: 0 })),
      
      fetch(`${apiBase}/admin/count/active_jobs`, {
        headers: { 
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      }).then(r => r.ok ? r.json() : { count: 0 }).then(d => ({ key: 'activeJobs', value: d.count || 0 })).catch(() => ({ key: 'activeJobs', value: 0 })),
      
      fetch(`${apiBase}/admin/count/todays_job_providers`, {
        headers: { 
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      }).then(r => r.ok ? r.json() : { count: 0 }).then(d => ({ key: 'todayProviderRegistrations', value: d.count || 0 })).catch(() => ({ key: 'todayProviderRegistrations', value: 0 })),
      
      fetch(`${apiBase}/admin/count/todays_job_seekers`, {
        headers: { 
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      }).then(r => r.ok ? r.json() : { count: 0 }).then(d => ({ key: 'todayRegistrations', value: d.count || 0 })).catch(() => ({ key: 'todayRegistrations', value: 0 })),
      
      fetch(`${apiBase}/admin/count/job_posted_this_week`, {
        headers: { 
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      }).then(r => r.ok ? r.json() : { count: 0 }).then(d => ({ key: 'jobsPostedThisWeek', value: d.count || 0 })).catch(() => ({ key: 'jobsPostedThisWeek', value: 0 })),
      
      fetch(`${apiBase}/employees/count`, {
        headers: { 
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      }).then(r => r.ok ? r.json() : { count: 0 }).then(d => ({ key: 'hiredSeekers', value: d.count || 0 })).catch(() => ({ key: 'hiredSeekers', value: 0 })),
    ];
    
    const results = await Promise.all(statsPromises);
    
    // Convert array to object
    const statistics = results.reduce((acc, item) => {
      acc[item.key] = item.value;
      return acc;
    }, {});
    
    console.log('[DASHBOARD_STATS] Successfully fetched statistics:', statistics);
    
    return {
      success: true,
      data: statistics,
      count: Object.keys(statistics).length
    };
  } catch (error) {
    console.error('[DASHBOARD_STATS] Error:', error);
    return {
      success: false,
      error: error.message,
      data: {},
      count: 0
    };
  }
}

module.exports = {
  extractSqlFromText,
  queryWithNaturalLanguage,
  getInsights,
  filterEntities,
  intelligentQuery,
  fetchJobSeekersFromAPI,
  fetchAllCategories,
  fetchJobSeekersByCategory,
  fetchEmployerProfile,
  getUserIdByEmail,
  fetchIncompleteProfiles,
  fetchDashboardStatistics
};