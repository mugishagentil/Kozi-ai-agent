// employerAgent.js - Specialized agent for EMPLOYERS ONLY
const { ChatOpenAI } = require('@langchain/openai');

class EmployerAgent {
  constructor(modelName = process.env.OPENAI_CHAT_MODEL || 'gpt-4-turbo', apiToken = null) {
    this.sessionId = null;
    this.API_TOKEN = apiToken;
    this.validateEnvironment();
    this.initializeLLM(modelName);
    this.resetState();
    this.loadCategories().catch(error => {
      console.warn('Initial category load failed:', error.message);
    });
  }

  setSessionId(sessionId) {
    this.sessionId = sessionId;
  }

  setApiToken(apiToken) {
    if (!apiToken || typeof apiToken !== 'string' || apiToken.trim() === '') {
      throw new Error('Invalid API token provided');
    }
    this.API_TOKEN = apiToken.trim();
  }

  validateEnvironment() {
    this.JOB_CATEGORIES_API = process.env.JOB_CATEGORIES_API;
    this.JOB_SEEKERS_BY_CATEGORY_API = process.env.JOB_SEEKERS_BY_CATEGORY_API;

    if (!this.JOB_CATEGORIES_API || !this.JOB_SEEKERS_BY_CATEGORY_API) {
      throw new Error('Missing required environment variables for candidate search');
    }
  }

  initializeLLM(modelName) {
    this.llm = new ChatOpenAI({
      model: modelName,
      temperature: 0.3,
      maxTokens: 500,
    });
  }

  resetState() {
    this.filters = {};
    this.categories = [];
    this.categoriesLoaded = false;
    this.lastSearchResults = [];
    this.currentOffset = 0;
    this.hasActiveSearch = false;
    this.conversationContext = {
      lastQuery: null,
      showedSummary: false,
      askedForDetails: false,
      selectedCandidateIndex: null,
    };
  }

  async fetchWithToken(url, options = {}) {
    if (!this.API_TOKEN) {
      throw new Error('API token not provided');
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.API_TOKEN.trim()}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (response.status === 401) {
      throw new Error('Authentication failed');
    }

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  }

  async getJobCategories() {
    const categories = await this.fetchWithToken(this.JOB_CATEGORIES_API);
    return Array.isArray(categories) ? categories : [];
  }

  async getJobSeekersByCategory(categoryId) {
    if (!categoryId) {
      throw new Error('Category ID is required');
    }
    const url = `${this.JOB_SEEKERS_BY_CATEGORY_API.replace(/\/+$/, '')}/${categoryId}`;
    return await this.fetchWithToken(url);
  }

  async loadCategories() {
    if (this.categoriesLoaded) return;
    this.categories = await this.getJobCategories();
    this.categoriesLoaded = true;
  }

  // KEY METHOD: Only handle EMPLOYER-specific queries
  async shouldHandleQuery(userMessage) {
    console.log('[EmployerAgent] Checking if query is employer-related:', userMessage);
    
    try {
      const prompt = `You are analyzing queries for an EMPLOYER/JOB PROVIDER assistant. 
This assistant ONLY helps employers find candidates/workers, NOT job seekers looking for jobs.

Query: "${userMessage}"

Should this query be handled by an EMPLOYER assistant?

HANDLE (return true) if query is about:
- Finding candidates, workers, employees, job seekers
- Searching for people to hire
- Looking for staff or workforce
- Candidate profiles or qualifications
- "show me housekeepers", "find me sales candidates", "I need construction workers"
- Posting jobs (employers post jobs)
- Managing job listings as an employer

DO NOT HANDLE (return false) if query is about:
- Looking for a job (that's for job seekers)
- "find me a job", "show me available jobs" (unless context clearly shows they want to POST jobs)
- Applying to jobs
- Resume/CV help for job seekers
- Job search as an employee
- Casual conversation, greetings

Return JSON: {"shouldHandle": true/false, "reason": "brief explanation", "userType": "employer|employee|unclear"}

Examples:
- "show me salesperson candidates" → {"shouldHandle": true, "reason": "employer looking for candidates", "userType": "employer"}
- "find me a salesperson job" → {"shouldHandle": false, "reason": "employee looking for job", "userType": "employee"}
- "I need housekeepers" → {"shouldHandle": true, "reason": "employer needs workers", "userType": "employer"}
- "show me available jobs" → {"shouldHandle": false, "reason": "employee seeking jobs", "userType": "employee"}
- "how do I post a job" → {"shouldHandle": true, "reason": "employer wants to post job", "userType": "employer"}
- "hello" → {"shouldHandle": false, "reason": "greeting", "userType": "unclear"}

Return ONLY JSON:`;

      const response = await Promise.race([
        this.llm.invoke(prompt),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('LLM timeout')), 5000)
        )
      ]);
      
      const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        console.log('[EmployerAgent] No JSON found, defaulting to false');
        return false;
      }

      const parsed = JSON.parse(jsonMatch[0]);
      console.log('[EmployerAgent] Analysis:', parsed);
      
      // CRITICAL: Only handle if userType is "employer"
      return parsed.shouldHandle === true && parsed.userType === 'employer';

    } catch (error) {
      console.error('[EmployerAgent] Error in shouldHandleQuery:', error.message);
      
      // Fallback: Check for employer-specific keywords
      const lowerMsg = userMessage.toLowerCase().trim();
      const employerKeywords = [
        'candidate', 'worker', 'employee', 'staff', 
        'hire', 'recruit', 'find me', 'show me',
        'need workers', 'need staff', 'post a job', 'post job'
      ];
      
      const isEmployerQuery = employerKeywords.some(keyword => lowerMsg.includes(keyword));
      
      // Exclude if it's clearly a job search
      const jobSearchKeywords = ['find me a job', 'show me jobs', 'available jobs', 'job search'];
      const isJobSearch = jobSearchKeywords.some(keyword => lowerMsg.includes(keyword));
      
      console.log('[EmployerAgent] Fallback check:', { isEmployerQuery, isJobSearch });
      return isEmployerQuery && !isJobSearch;
    }
  }

  async extractFiltersFromQuery(userQuery) {
    if (!this.categoriesLoaded) {
      await this.loadCategories();
    }

    const categoryList = this.categories.map(c => `${c.name} (ID: ${c.id})`).join(', ');
    
    const prompt = `Extract CANDIDATE search parameters for an EMPLOYER from: "${userQuery}"

Categories: ${categoryList}

Return JSON:
{
  "matchedCategory": "exact category name or null",
  "categoryId": "ID number or null",
  "location": "location or null",
  "intentType": "candidate_search|specific_category|candidate_details|post_job|general_inquiry",
  "candidateName": "name if asking about specific candidate",
  "candidateIndex": "number if referring to candidate by number",
  "confidence": "high|medium|low"
}

Examples:
- "show me salesperson candidates" → intentType: "specific_category", matchedCategory: "Sales"
- "find me construction workers" → intentType: "specific_category", matchedCategory: "Construction"
- "I need housekeepers" → intentType: "specific_category", matchedCategory: "Cleaning"
- "show me candidates" → intentType: "candidate_search", matchedCategory: null
- "tell me about candidate 1" → intentType: "candidate_details", candidateIndex: 1
- "how do I post a job" → intentType: "post_job"

Return ONLY JSON:`;

    const response = await this.llm.invoke(prompt);
    const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { intentType: 'unknown' };

    const parsed = JSON.parse(jsonMatch[0]);
    
    return {
      category: parsed.categoryId || null,
      categoryName: parsed.matchedCategory || null,
      location: parsed.location || null,
      intentType: parsed.intentType || 'unknown',
      candidateName: parsed.candidateName || null,
      candidateIndex: parsed.candidateIndex || null,
      confidence: parsed.confidence || 'medium'
    };
  }

  async performSearch(categoryId = null) {
    console.log('🔍 EmployerAgent: Searching for candidates, category:', categoryId);
    
    if (!categoryId) {
      // Get all candidates from all categories
      const allCandidates = [];
      for (const category of this.categories) {
        const candidates = await this.getJobSeekersByCategory(category.id);
        allCandidates.push(...candidates);
      }
      return this.rankCandidates(allCandidates).slice(0, 20);
    }
    
    const candidates = await this.getJobSeekersByCategory(categoryId);
    return this.rankCandidates(candidates).slice(0, 20);
  }

  rankCandidates(candidates) {
    return candidates.sort((a, b) => {
      if (a.verification_badge && !b.verification_badge) return -1;
      if (!a.verification_badge && b.verification_badge) return 1;
      
      const aComplete = this.calculateProfileCompleteness(a);
      const bComplete = this.calculateProfileCompleteness(b);
      return bComplete - aComplete;
    });
  }

  calculateProfileCompleteness(candidate) {
    let score = 0;
    const fields = ['first_name', 'last_name', 'email', 'phone', 'province', 'district', 'image'];
    
    fields.forEach(field => {
      if (candidate[field] && candidate[field].trim() !== '') {
        score += 1;
      }
    });
    
    if (candidate.verification_badge) score += 2;
    return score;
  }

  async processMessage(userMessage) {
    try {
      if (!this.API_TOKEN) {
        return {
          type: 'error',
          message: 'Authentication required. Please provide an API token.',
          code: 'NO_TOKEN'
        };
      }

      // Check if this is an employer query
      const shouldHandle = await this.shouldHandleQuery(userMessage);
      if (!shouldHandle) {
        console.log('[EmployerAgent] Query rejected - not employer-related');
        return null;
      }

      if (!this.categoriesLoaded) {
        await this.loadCategories();
      }

      const extractedFilters = await this.extractFiltersFromQuery(userMessage);

      // Handle job posting questions (not search-related)
      if (extractedFilters.intentType === 'post_job') {
        return {
          type: 'clarification',
          message: `To post a job on Kozi:

1. Go to **Add Jobs** in your dashboard
2. Click **Add Job**
3. Fill in the job details (title, description, requirements, salary, etc.)
4. Submit your job

**Note:** Adding jobs is a premium feature. Once you submit your job, our team will contact you with payment details before your job is published.

Need help with anything else?`
        };
      }

      // Handle candidate search
      if (extractedFilters.intentType === 'candidate_search' || extractedFilters.intentType === 'specific_category') {
        const results = await this.performSearch(extractedFilters.category);
        this.lastSearchResults = results;
        this.hasActiveSearch = true;

        const categoryInfo = extractedFilters.categoryName ? ` ${extractedFilters.categoryName}` : '';
        const message = `Excellent! I found ${results.length}${categoryInfo} candidates for you! 😊

Scroll down to see their profiles with full details including experience, skills, and contact information.`;

        return {
          type: 'results',
          data: results,
          candidates: results.map(c => this.formatCandidateForCard(c)),
          message: message,
          searchMode: 'candidates'
        };
      }

      // If we get here, return null to fallback to general chat
      return null;

    } catch (error) {
      console.error('[EmployerAgent] Error processing message:', error);
      return null;
    }
  }

  formatCandidateForCard(candidate) {
    return {
      id: candidate.id || candidate.users_id,
      users_id: candidate.users_id || candidate.id,
      first_name: candidate.first_name || 'Not specified',
      last_name: candidate.last_name || 'Not specified',
      email: candidate.email || null,
      phone: candidate.phone || null,
      image: candidate.image || null,
      province: candidate.province || null,
      district: candidate.district || null,
      categories_id: candidate.categories_id,
      verification_badge: candidate.verification_badge || 0,
      bio: candidate.bio || null,
      skills: candidate.skills || null,
      experience: candidate.experience || null
    };
  }
}

module.exports = { EmployerAgent };