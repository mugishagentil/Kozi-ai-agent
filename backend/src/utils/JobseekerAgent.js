const { ChatOpenAI } = require('@langchain/openai');
const qs = require('querystring');

class APIError extends Error {
  constructor(message, code = 'API_ERROR') {
    super(message);
    this.name = 'APIError';
    this.code = code;
  }
}

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

class JobSeekerAgent {
  constructor(modelName = process.env.OPENAI_CHAT_MODEL || 'gpt-4-turbo', apiToken = null) {
    this.sessionId = null;
    this.API_TOKEN = apiToken;
    this.validateEnvironment();
    this.initializeLLM(modelName);
    this.resetState();
    this.loadCategories().catch(error => console.warn('Initial category load failed:', error.message));
  }

  setSessionId(sessionId) { this.sessionId = sessionId; }

  setApiToken(apiToken) {
    if (!apiToken || typeof apiToken !== 'string' || apiToken.trim() === '') {
      throw new ValidationError('Please provide a valid authentication token');
    }
    this.API_TOKEN = apiToken.trim();
  }

  validateEnvironment() {
    this.JOB_CATEGORIES_API = process.env.JOB_CATEGORIES_API;
    this.JOBS_API_URL = process.env.JOBS_API_URL;

    const requiredVars = {
      'JOB_CATEGORIES_API': this.JOB_CATEGORIES_API,
      'JOBS_API_URL': this.JOBS_API_URL
    };

    const missingVars = Object.entries(requiredVars)
      .filter(([_, value]) => !value)
      .map(([key]) => key);

    if (missingVars.length > 0) {
      throw new ValidationError('Service configuration is incomplete');
    }

    if (this.API_TOKEN && (typeof this.API_TOKEN !== 'string' || this.API_TOKEN.trim() === '')) {
      throw new ValidationError('Invalid authentication token format');
    }
  }

  initializeLLM(modelName) {
    try {
      this.llm = new ChatOpenAI({
        model: modelName,
        temperature: 0.7,
        maxTokens: 800,
      });
    } catch (error) {
      throw new ValidationError('Unable to initialize the search assistant');
    }
  }

  resetState() {
    this.filters = {};
    this.categories = [];
    this.categoriesLoaded = false;
    this.lastSearchResults = [];
    this.allMatchedJobs = [];
    this.totalMatchedCount = 0;
    this.currentOffset = 0;
    this.hasActiveSearch = false;
    this.conversationContext = {
      lastQuery: null,
      lastFilters: null,
      showedSummary: false,
      askedForDetails: false,
      selectedJobIndex: null,
      lastSearchType: null,
      lastJobSeekerIntent: false,
    };
  }

  async fetchWithToken(url, options = {}) {
    if (!this.API_TOKEN) {
      throw new APIError('Please authenticate to continue', 'NO_TOKEN');
    }

    try {
      const res = await fetch(url, {
        method: options.method || 'GET',
        headers: {
          Authorization: `Bearer ${this.API_TOKEN.trim()}`,
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
      });

      if (res.status === 401) {
        throw new APIError('Your session has expired. Please refresh the page', 'AUTH_ERROR');
      }

      if (!res.ok) {
        throw new APIError('Service temporarily unavailable. Please try again', 'FETCH_ERROR');
      }

      const data = await res.json().catch(() => null);
      return data;
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError('Network connection issue. Please check your internet', 'NETWORK_ERROR');
    }
  }

  async getJobCategories() {
    try {
      const data = await this.fetchWithToken(this.JOB_CATEGORIES_API);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Failed to fetch job categories:', error.message);
      throw new APIError('Unable to load job categories at the moment', 'CATEGORIES_UNAVAILABLE');
    }
  }

  async loadCategories() {
    if (this.categoriesLoaded) return;
    try {
      this.categories = await this.getJobCategories();
      this.categoriesLoaded = true;
    } catch (error) {
      console.error('[JobSeekerAgent] loadCategories failed:', error.message);
      this.categories = [];
      this.categoriesLoaded = false;
      throw error;
    }
  }

  findCategoryIdByName(name) {
    if (!name || !this.categories) return null;
    const lower = String(name).toLowerCase();
    const found = this.categories.find(c =>
      (c.name || '').toLowerCase() === lower || (c.displayName || '').toLowerCase() === lower
    );
    return found ? found.id : null;
  }

  async shouldHandleQuery(userMessage, conversationHistory = []) {
    const lower = (userMessage || '').toLowerCase().trim();
    
    const employerIndicators = [
      'hire', 'recruit', 'candidate', 'worker', 'employee', 'staff',
      'looking to hire', 'want to hire', 'need to hire', 'seeking to hire',
      'searching for candidates', 'find candidates', 'looking for employees',
      'need employees', 'want to recruit', 'seeking talent', 'talent search',
      'we are hiring', 'our company is hiring', 'my company needs',
      'post a job', 'post job', 'job posting', 'post vacancy', 'vacancy posting',
      'create job', 'add job', 'list job', 'publish job',
      'i want to post', 'i need to post', 'how to post',
      'how do i hire', 'how to hire', 'best way to hire',
      'how to write a job', 'how to create a job', 'how to post a job',
      'job description', 'writing job description', 'create job description',
      'my company', 'our company', 'business needs', 'my business',
      'i own a', 'we are a company', 'our organization',
      'employer', 'recruiter', 'hiring manager', 'business owner'
    ];
    
    const generalChatIndicators = [
      'help me write', 'write a cv', 'write my cv', 'create cv', 'cv help',
      'resume help', 'write resume', 'create resume',
      'complete my profile', 'complete profile', 'fill profile', 'profile setup',
      'how do i complete', 'how to complete', 'profile completion',
      'how do i get paid', 'how to get paid', 'payment method', 'receive payment',
      'when do i get paid', 'payment process', 'how does payment work',
      'how do i apply', 'how to apply', 'application process', 'apply for job',
      'account setup', 'account help', 'platform help', 'using platform',
      'how does this work', 'how do i use', 'help with account'
    ];
    
    const hasEmployerIntent = employerIndicators.some(kw => lower.includes(kw));
    
    if (hasEmployerIntent) {
      this.hasActiveSearch = false;
      this.conversationContext.lastJobSeekerIntent = false;
      return false;
    }
    
    const hasGeneralChatIntent = generalChatIndicators.some(kw => lower.includes(kw));
    
    if (hasGeneralChatIntent) {
      this.hasActiveSearch = false;
      this.conversationContext.lastJobSeekerIntent = false;
      return false;
    }

    const explicitJobSearchKeywords = [
      'find job', 'search job', 'looking for job', 'look for job',
      'need job', 'want job', 'need a job', 'want a job',
      'job search', 'searching for job', 'available jobs', 'job opportunities',
      'show me jobs', 'what jobs', 'any jobs', 'list jobs', 'jobs in',
      'jobs for', 'driver jobs', 'sales jobs', 'it jobs', 'teaching jobs',
      'show more', 'more jobs', 'next jobs', 'other jobs',
      'job categories', 'job types', 'what kind of jobs'
    ];
    
    const hasExplicitJobSearch = explicitJobSearchKeywords.some(kw => lower.includes(kw));
    
    if (hasExplicitJobSearch) {
      this.conversationContext.lastJobSeekerIntent = true;
      return true;
    }

    const recentHistory = conversationHistory.slice(-6).map(msg => 
      `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content.substring(0, 200)}`
    ).join('\n');

    const prompt = `
You are a STRICT classifier for a JOB SEEKER job search agent.

CRITICAL RULES - REJECT IMMEDIATELY if message is about:
1. ANY hiring, recruiting, or employer-related content
2. ANY job posting, vacancy creation, or employer actions
3. ANY business ownership or company management topics
4. CV/Resume writing or profile completion
5. Payment methods, account setup, or platform usage
6. General "how-to" questions about the platform
7. Application process questions (unless asking to see jobs TO apply for)

ONLY ACCEPT if message is EXPLICITLY about:
- Searching for jobs to APPLY for (not post)
- Viewing available job opportunities
- Asking about specific job categories or types
- Follow-up requests about previously shown jobs (show more, next jobs, etc.)

Recent conversation:
${recentHistory || 'No previous context'}

Current message: """${userMessage}"""

Previous job seeker intent: ${this.conversationContext.lastJobSeekerIntent}
Has active search: ${this.hasActiveSearch}

Examples to REJECT:
- "Help me write a CV" → REJECT (general chat - CV help)
- "How do I complete my profile?" → REJECT (general chat - account help)
- "How to apply for a job?" → REJECT (general chat - platform help)
- "How do I get paid?" → REJECT (general chat - payment help)
- "I want to hire a driver" → REJECT (employer)
- "How do I post a job?" → REJECT (employer)

Examples to ACCEPT:
- "Find me a job" → ACCEPT
- "Show me driver jobs" → ACCEPT
- "What jobs are available?" → ACCEPT
- "I need a job in Kigali" → ACCEPT
- "Show me more jobs" → ACCEPT (if hasActiveSearch)
- "What kind of jobs do you have?" → ACCEPT

Return JSON only:
{
  "shouldHandle": true|false,
  "isFollowUp": true|false,
  "isJobSeekerQuery": true|false,
  "reason": "brief explanation"
}
`;

    try {
      const response = await Promise.race([
        this.llm.invoke(prompt),
        new Promise((_, reject) => setTimeout(() => reject(new Error('LLM timeout')), 6000))
      ]);

      const content = this._extractTextFromLLMResponse(response);
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        this.conversationContext.lastJobSeekerIntent = false;
        return false;
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      if (parsed.isFollowUp) {
        const shouldHandle = this.hasActiveSearch && this.conversationContext.lastJobSeekerIntent;
        if (!shouldHandle) {
          this.conversationContext.lastJobSeekerIntent = false;
        }
        return shouldHandle;
      }
      
      const shouldHandle = parsed.shouldHandle === true && parsed.isJobSeekerQuery === true;
      this.conversationContext.lastJobSeekerIntent = shouldHandle;
      
      return shouldHandle;
      
    } catch (err) {
      this.conversationContext.lastJobSeekerIntent = false;
      
      const strictJobSeekerKeywords = [
        'find me a job', 'search for jobs', 'show me jobs', 
        'available jobs', 'what jobs', 'need a job', 'looking for a job'
      ];
      
      const hasStrictJobSeekerIntent = strictJobSeekerKeywords.some(kw => lower.includes(kw));
      
      return hasStrictJobSeekerIntent;
    }
  }

  async extractFiltersFromQuery(userQuery, conversationHistory = []) {
    await this.loadCategories();
    
    const recentHistory = conversationHistory.slice(-6).map(msg => 
      `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content.substring(0, 200)}`
    ).join('\n');

    const categoriesList = this.categories.map(c => `${c.name} (ID: ${c.id})`).join(', ');

    const prompt = `
Extract search filters for job search based on the conversation.
FILTERS ARE OPTIONAL - if user doesn't specify any, that's fine!

SPECIAL HANDLING:
- If user specifies a number like "show 10 jobs", set maxResults to that number
- If user says "show all", set maxResults to 50
- If user says "show remaining", set showRemaining to true
- For categories, match to EXACT category names from the list below

Available categories: ${categoriesList}

Recent conversation:
${recentHistory || 'No previous context'}

Current message: """${userQuery}"""

Return JSON only:
{
  "role": "specific role or null",
  "location": "specific location or null",
  "employmentType": "full-time | part-time | remote | contract | null",
  "categoryName": "exact category name from the list above or null",
  "maxResults": number or null,
  "isRequestForMore": true|false,
  "showRemaining": true|false,
  "showAll": true|false,
  "requestCategories": true|false,
  "searchType": "general | specific | category_only | location_only | categories_list"
}
`;

    try {
      const response = await Promise.race([
        this.llm.invoke(prompt),
        new Promise((_, reject) => setTimeout(() => reject(new Error('LLM timeout')), 7000))
      ]);

      const content = this._extractTextFromLLMResponse(response);
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        if (this.hasActiveSearch && this.conversationContext.lastFilters) {
          return { ...this.conversationContext.lastFilters, isRequestForMore: true };
        }
        return { 
          role: null, 
          location: null, 
          employmentType: null, 
          categoryId: null, 
          categoryName: null, 
          maxResults: null, 
          isRequestForMore: false,
          showRemaining: false,
          showAll: false,
          requestCategories: false,
          searchType: 'general'
        };
      }

      const parsed = JSON.parse(jsonMatch[0]);

      let categoryName = parsed.categoryName || null;
      let categoryId = null;
      
      if (!categoryName) {
        categoryName = this.mapRoleToCategory(parsed.role || userQuery);
      }
      
      if (categoryName) {
        categoryId = this.findCategoryIdByName(categoryName);
      }

      let maxResults = parsed.maxResults || null;
      const numberMatch = userQuery.match(/(\d+)\s*jobs?/i);
      if (numberMatch) {
        maxResults = parseInt(numberMatch[1]);
      }
      
      const showAll = parsed.showAll || userQuery.toLowerCase().includes('show all');
      if (showAll) {
        maxResults = 50;
      }

      const filters = {
        role: parsed.role || null,
        location: parsed.location || null,
        employmentType: parsed.employmentType || null,
        categoryName,
        categoryId,
        maxResults,
        isRequestForMore: parsed.isRequestForMore || false,
        showRemaining: parsed.showRemaining || userQuery.toLowerCase().includes('remaining'),
        showAll,
        requestCategories: parsed.requestCategories || userQuery.toLowerCase().includes('categories'),
        searchType: parsed.searchType || 'general',
      };

      if (filters.isRequestForMore && this.conversationContext.lastFilters) {
        return { ...this.conversationContext.lastFilters, isRequestForMore: true };
      }

      return filters;
    } catch (err) {
      if (this.hasActiveSearch && this.conversationContext.lastFilters) {
        return { ...this.conversationContext.lastFilters, isRequestForMore: true };
      }
      
      return { 
        role: null, 
        location: null, 
        employmentType: null, 
        categoryId: null, 
        categoryName: null, 
        maxResults: null, 
        isRequestForMore: false,
        showRemaining: false,
        showAll: false,
        requestCategories: false,
        searchType: 'general'
      };
    }
  }

  mapRoleToCategory(role) {
    if (!role) return null;
    
    const roleToCategoryMap = {
      'sales': 'Salesperson',
      'construction': 'Construction Worker',
      'cleaner': 'Housekeeper',
      'chef': 'Waiter / Waitress',
      'cook': 'Waiter / Waitress',
      'housekeeper': 'Housekeeper',
      'driver': 'Driver',
      'teacher': 'Teacher',
      'accountant': 'Accountant',
      'it': 'IT Professional',
      'software': 'IT Professional',
      'developer': 'IT Professional',
      'security': 'Security Guard',
      'waiter': 'Waiter / Waitress',
      'waitress': 'Waiter / Waitress',
      'receptionist': 'Receptionist',
      'cashier': 'Cashier',
      'data entry': 'Data Entry Clerk',
      'marketing': 'Marketing Executive',
      'nurse': 'Doctor',
      'medical': 'Doctor',
      'health': 'Doctor',
      'hospital': 'Doctor'
    };
    
    const lowerRole = role.toLowerCase();
    
    for (const [roleKey, category] of Object.entries(roleToCategoryMap)) {
      if (lowerRole.includes(roleKey)) {
        return category;
      }
    }
    
    return null;
  }

  async generateResponseMessage(filters, totalFound, showingCount, isLoadMore = false, remainingCount = 0) {
    let context = '';
    
    if (isLoadMore) {
      if (filters.showRemaining) {
        context = `Showing all remaining ${showingCount} jobs. No more jobs available after this.`;
      } else {
        context = `You just showed ${showingCount} more jobs. ${remainingCount > 0 ? `There ${remainingCount === 1 ? 'is' : 'are'} ${remainingCount} more available.` : 'No more jobs available.'}`;
      }
    } else {
      if (totalFound === 0) {
        context = `No jobs found matching your criteria.`;
      } else {
        context = `Found ${totalFound} ${filters.role || filters.categoryName || ''} jobs total. Showing ${showingCount} jobs.`;
      }
    }

    const prompt = `
You are a helpful job search assistant. Generate a natural, conversational response.

Context: ${context}

Guidelines:
- Be enthusiastic and helpful
- Keep it concise (2-3 sentences max)
- Use the EXACT numbers provided - don't make up numbers
- If showing results, mention the exact numbers correctly
- If no jobs found, be empathetic and suggest alternatives
- Sound professional but friendly

Generate ONLY the response message, no JSON:
`;

    try {
      const response = await Promise.race([
        this.llm.invoke(prompt),
        new Promise((_, reject) => setTimeout(() => reject(new Error('LLM timeout')), 5000))
      ]);

      return this._extractTextFromLLMResponse(response).trim();
    } catch (err) {
      if (isLoadMore) {
        if (filters.showRemaining) {
          return `Here ${showingCount === 1 ? 'is' : 'are'} all the remaining ${showingCount} job${showingCount > 1 ? 's' : ''}.`;
        }
        return `Here ${showingCount === 1 ? 'is' : 'are'} ${showingCount} more job${showingCount > 1 ? 's' : ''}. ${remainingCount > 0 ? `There ${remainingCount === 1 ? 'is' : 'are'} ${remainingCount} more available.` : ''}`;
      }
      
      if (totalFound === 0) {
        return `I couldn't find any ${filters.role || filters.categoryName || ''} jobs${filters.location ? ` in ${filters.location}` : ''} right now.`;
      }
      
      return `I found ${totalFound} ${filters.role || filters.categoryName || ''} job${totalFound > 1 ? 's' : ''} matching your criteria. Showing ${showingCount}.`;
    }
  }

  async performSearch(filters = {}, isLoadMore = false) {
    let maxResultsRequested = filters.maxResults ? Number(filters.maxResults) : 6;
    const maxResults = Math.min(Math.max(1, maxResultsRequested), 50);
    
    if (filters.showAll) {
      maxResultsRequested = 50;
    }
    
    let batchSize = maxResultsRequested;
    
    if (isLoadMore && this.allMatchedJobs.length > 0) {
      if (filters.showRemaining) {
        batchSize = this.totalMatchedCount - this.currentOffset;
      }
      
      const nextBatch = this.allMatchedJobs.slice(
        this.currentOffset, 
        this.currentOffset + batchSize
      );
      
      this.currentOffset += batchSize;
      this.lastSearchResults = nextBatch;
      
      return {
        jobs: nextBatch.map(j => this.formatJobForCard(j)),
        showingCount: nextBatch.length,
        remainingCount: Math.max(0, this.totalMatchedCount - this.currentOffset)
      };
    }

    let jobs = [];

    try {
      const params = new URLSearchParams();
      
      if (filters.categoryId) {
        params.append('category_id', filters.categoryId);
      }
      
      if (filters.employmentType && filters.employmentType !== 'any') {
        params.append('employment_type', filters.employmentType);
      }
      
      if (filters.location) {
        params.append('location', filters.location);
      }
      
      params.append('limit', '100');
      
      const url = params.toString() ? `${this.JOBS_API_URL}?${params.toString()}` : this.JOBS_API_URL;
      
      const data = await this.fetchWithToken(url);
      jobs = Array.isArray(data) ? data : [];
      
    } catch (err) {
      console.warn('[JobSeekerAgent] performSearch fetch error:', err.message);
      jobs = [];
    }

    if (!Array.isArray(jobs)) jobs = [];

    const filtered = this.filterJobs(jobs, filters);
    const ranked = this.rankJobs(filtered);
    
    this.allMatchedJobs = ranked;
    this.totalMatchedCount = ranked.length;
    
    let initialBatchSize = batchSize;
    if (filters.showAll) {
      initialBatchSize = Math.min(ranked.length, 50);
    }
    
    const firstBatch = ranked.slice(0, initialBatchSize);
    this.currentOffset = initialBatchSize;
    this.lastSearchResults = firstBatch;
    this.hasActiveSearch = ranked.length > 0;

    return {
      jobs: firstBatch.map(j => this.formatJobForCard(j)),
      showingCount: firstBatch.length,
      remainingCount: Math.max(0, ranked.length - initialBatchSize)
    };
  }

  filterJobs(jobs, filters) {
    const currentDate = new Date();
    
    return jobs.filter(job => {
      if (job.deadline_date) {
        try {
          const deadline = new Date(job.deadline_date);
          if (deadline < currentDate) return false;
        } catch (error) {
          console.warn('Invalid deadline date:', job.deadline_date);
        }
      }

      if (filters.categoryId || filters.categoryName) {
        const jobCategoryId = job.category_id || job.categories_id;
        const jobCategoryName = (job.category_name || job.job_category || '').toLowerCase();
        const targetCategoryName = (filters.categoryName || '').toLowerCase();
        
        if (filters.categoryId && jobCategoryId && jobCategoryId.toString() === filters.categoryId.toString()) {
        } 
        else if (targetCategoryName && jobCategoryName.includes(targetCategoryName)) {
        }
        else if (filters.categoryId || filters.categoryName) {
          return false;
        }
      }

      if (filters.role) {
        const jobTitle = (job.job_title || '').toLowerCase();
        const jobDescription = (job.job_description || '').toLowerCase();
        const jobResponsibilities = (job.responsibilities || '').toLowerCase();
        const jobRequirements = (job.requirements || '').toLowerCase();
        
        const wantedRole = (filters.role || '').toLowerCase();
        
        const allJobText = `${jobTitle} ${jobDescription} ${jobResponsibilities} ${jobRequirements}`.toLowerCase();
        
        const roleMatches = jobTitle.includes(wantedRole) || allJobText.includes(wantedRole);
        
        if (!roleMatches) {
          const roleSynonyms = this.getRoleSynonyms(wantedRole);
          const hasSynonymMatch = roleSynonyms.some(synonym => 
            jobTitle.includes(synonym) || allJobText.includes(synonym)
          );
          
          if (!hasSynonymMatch) {
            return false;
          }
        }
      }

      if (filters.employmentType && filters.employmentType !== 'any') {
        const jobEmploymentType = (job.employment_type || '').toLowerCase();
        const wantedType = filters.employmentType.toLowerCase();
        
        if (jobEmploymentType && !jobEmploymentType.includes(wantedType)) {
          return false;
        }
      }

      if (filters.location) {
        const jobLocation = (job.location || '').toLowerCase();
        const wantedLocation = filters.location.toLowerCase();
        
        if (jobLocation && !jobLocation.includes(wantedLocation)) {
          return false;
        }
      }

      return true;
    });
  }

  getRoleSynonyms(role) {
    const synonymsMap = {
      'sales': ['sales', 'seller', 'salesperson', 'sales representative', 'sales executive', 'sales agent', 'business development'],
      'construction': ['construction', 'builder', 'building', 'mason', 'carpenter', 'construction worker', 'laborer'],
      'cleaner': ['cleaner', 'cleaning', 'housekeeping', 'janitor', 'maid', 'sanitation', 'custodian'],
      'chef': ['chef', 'cook', 'kitchen', 'culinary', 'food preparation', 'sous chef', 'head chef'],
      'housekeeper': ['housekeeper', 'housekeeping', 'domestic', 'maid', 'cleaner', 'home helper'],
      'driver': ['driver', 'driving', 'chauffeur', 'delivery driver', 'truck driver', 'transport'],
      'teacher': ['teacher', 'teaching', 'educator', 'tutor', 'instructor', 'lecturer'],
      'accountant': ['accountant', 'accounting', 'bookkeeper', 'finance', 'auditor'],
      'it': ['it', 'information technology', 'software', 'developer', 'programmer', 'technical support'],
      'security': ['security', 'guard', 'protection', 'watchman', 'safety'],
      'waiter': ['waiter', 'waitress', 'server', 'food service', 'restaurant'],
      'receptionist': ['receptionist', 'front desk', 'administrative assistant', 'office assistant'],
      'marketing': ['marketing', 'brand', 'advertising', 'promotion', 'digital marketing'],
      'nurse': ['nurse', 'nursing', 'medical', 'healthcare', 'patient care'],
      'doctor': ['doctor', 'physician', 'medical', 'healthcare', 'clinic']
    };
    
    const lowerRole = role.toLowerCase();
    return synonymsMap[lowerRole] || [lowerRole];
  }

  rankJobs(jobs) {
    return jobs.sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      
      const dateA = new Date(a.published_date || a.created_at || 0);
      const dateB = new Date(b.published_date || b.created_at || 0);
      return dateB - dateA;
    });
  }

  async processMessage(userMessage, conversationHistory = []) {
    try {
      if (!this.API_TOKEN) {
        return {
          type: 'error',
          message: 'Please authenticate to continue searching for jobs',
          code: 'NO_TOKEN'
        };
      }

      const shouldHandle = await this.shouldHandleQuery(userMessage, conversationHistory);
      if (!shouldHandle) {
        return null;
      }

      const filters = await this.extractFiltersFromQuery(userMessage, conversationHistory);
      
      if (filters.requestCategories || filters.searchType === 'categories_list' || userMessage.toLowerCase().includes('categories')) {
        await this.loadCategories();
        const categoriesList = this.categories.slice(0, 20).map((cat, idx) => 
          `${idx + 1}. **${cat.name}**`
        ).join('\n');
        
        return {
          type: 'categories',
          message: `I'd be happy to help you explore job categories! Here are the main categories available:\n\n${categoriesList}\n\nWhich category interests you? Or you can ask me to search for jobs in a specific category!`,
          data: this.categories,
          categories: this.categories.slice(0, 20)
        };
      }

      const isLoadMore = filters.isRequestForMore || filters.showRemaining || false;
      
      if (isLoadMore && this.hasActiveSearch) {
        const searchResult = await this.performSearch(filters, true);
        const jobs = searchResult.jobs;
        const totalFound = this.totalMatchedCount;
        const showingCount = searchResult.showingCount;
        const remainingCount = searchResult.remainingCount;

        if (showingCount === 0) {
          this.hasActiveSearch = false;
          const message = await this.generateResponseMessage(filters, totalFound, 0, true, 0);
          return {
            type: 'results',
            data: [],
            jobs: [],
            message,
          };
        }

        const message = await this.generateResponseMessage(filters, totalFound, showingCount, true, remainingCount);
        const hasMore = remainingCount > 0;
        
        return {
          type: 'results',
          data: jobs,
          jobs,
          message,
          searchMode: 'jobs',
          totalFound,
          showing: showingCount,
          hasMore,
          remaining: remainingCount,
          currentOffset: this.currentOffset,
        };
      }

      this.conversationContext.lastFilters = filters;

      const searchResult = await this.performSearch(filters, false);
      const jobs = searchResult.jobs;
      const totalFound = this.totalMatchedCount;
      const showingCount = searchResult.showingCount;
      const remainingCount = searchResult.remainingCount;

      if (showingCount === 0) {
        this.hasActiveSearch = false;
        
        await this.loadCategories();
        const suggestedCategories = this.categories.slice(0, 8).map(cat => cat.name).join(', ');
        
        const message = `I couldn't find any ${filters.categoryName || filters.role || ''} jobs${filters.location ? ` in ${filters.location}` : ''} right now. 😔\n\nYou might want to try:\n• Searching in different categories like: ${suggestedCategories}\n• Removing some filters to broaden your search\n• Checking back later for new opportunities\n\nWhat type of work are you most interested in?`;
        
        return { 
          type: 'no_results', 
          data: [], 
          jobs: [], 
          message,
          suggestedCategories: this.categories.slice(0, 8)
        };
      }

      const message = await this.generateResponseMessage(filters, totalFound, showingCount, false, remainingCount);
      const hasMore = remainingCount > 0;
      
      return {
        type: 'results',
        data: jobs,
        jobs,
        message,
        searchMode: 'jobs',
        totalFound,
        showing: showingCount,
        hasMore,
        remaining: remainingCount,
        currentOffset: this.currentOffset,
      };
    } catch (err) {
      console.error('[JobSeekerAgent] processMessage error:', err);
      this.hasActiveSearch = false;
      
      if (err instanceof APIError) {
        return {
          type: 'error',
          message: 'We encountered an issue while searching for jobs. Please try again in a moment.',
          code: err.code
        };
      }
      
      return {
        type: 'error',
        message: 'Sorry, we encountered an unexpected issue. Please try again.',
        code: 'SEARCH_ERROR'
      };
    }
  }

  formatJobForCard(job) {
    const companyName = this.sanitizeField(job.company) || 'Company';
    
    return {
      id: job.id || job.job_id || Math.random().toString(36).substr(2, 9),
      job_id: job.job_id || job.id,
      job_title: job.job_title || 'Not specified',
      company: companyName,
      employment_type: job.employment_type || 'Full-time',
      positions: job.positions || job.available_positions || 1,
      location: job.location || 'Not specified',
      salary_min: job.salary_min,
      salary_max: job.salary_max,
      category: job.category_name || job.job_category || 'General',
      description: this.sanitizeField(job.job_description)?.substring(0, 150) + '...',
      postedDate: job.published_date,
      deadline: job.deadline_date,
      logo: job.logo || null,
      featured: job.featured || false
    };
  }

  sanitizeField(text) {
    if (!text) return '';
    return text.replace(/<br\s*\/?>/gi, '\n').replace(/&nbsp;/g, ' ').trim();
  }

  _extractTextFromLLMResponse(response) {
    if (!response) return '';
    if (typeof response === 'string') return response;
    if (response.text) return String(response.text);
    if (response.content && typeof response.content === 'string') return response.content;
    if (response.content && Array.isArray(response.content)) {
      const arrText = response.content.map(c => c.text || c).join(' ');
      if (arrText.trim()) return arrText;
    }
    return JSON.stringify(response);
  }
}

module.exports = { JobSeekerAgent, APIError, ValidationError };