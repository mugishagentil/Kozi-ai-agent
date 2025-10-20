const { PrismaClient } = require('@prisma/client');
const { ChatOpenAI } = require('@langchain/openai');
const { SqlAgent } = require('../utils/sqlAgent');

const prisma = new PrismaClient();

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
              last_name: true
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

module.exports = {
  extractSqlFromText,
  queryWithNaturalLanguage,
  getInsights,
  filterEntities,
  intelligentQuery
};



