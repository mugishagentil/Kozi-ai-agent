const { ChatOpenAI } = require('@langchain/openai');

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
    this.loadCategories().catch(error => {
      console.warn('Initial category load failed:', error.message);
    });
  }

  setSessionId(sessionId) {
    this.sessionId = sessionId;
  }

  setApiToken(apiToken) {
    if (!apiToken || typeof apiToken !== 'string' || apiToken.trim() === '') {
      throw new ValidationError('Invalid API token provided');
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
      throw new ValidationError(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    if (this.API_TOKEN && (typeof this.API_TOKEN !== 'string' || this.API_TOKEN.trim() === '')) {
      throw new ValidationError('Invalid API token format');
    }
  }

  initializeLLM(modelName) {
    try {
      this.llm = new ChatOpenAI({
        model: modelName,
        temperature: 0.3,
        maxTokens: 500,
      });
    } catch (error) {
      throw new ValidationError(`Failed to initialize language model: ${error.message}`);
    }
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
      listedCategories: false,
      selectedJobIndex: null,
      lastJobTitles: [],
      inJobSearchFlow: false,
      awaitingCategorySelection: false
    };
  }

  resetSearchState() {
    this.lastSearchResults = [];
    this.currentOffset = 0;
    this.hasActiveSearch = false;
    this.conversationContext = {
      lastQuery: null,
      showedSummary: false,
      askedForDetails: false,
      listedCategories: false,
      selectedJobIndex: null,
      lastJobTitles: [],
      inJobSearchFlow: false,
      awaitingCategorySelection: false
    };
  }

  async fetchWithToken(url, options = {}) {
    if (!this.API_TOKEN) {
      throw new APIError('API token not provided. Please authenticate first.', 'NO_TOKEN');
    }

    try {
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
        throw new APIError('Authentication failed: Invalid or expired token', 'AUTH_ERROR');
      }

      if (!response.ok) {
        throw new APIError(`Request failed with status ${response.status}`, 'REQUEST_FAILED');
      }

      const data = await response.json();
      return Array.isArray(data) ? data : [];

    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError(`Network error: ${error.message}`, 'NETWORK_ERROR');
    }
  }

  async getJobCategories() {
    try {
      const categories = await this.fetchWithToken(this.JOB_CATEGORIES_API);
      return Array.isArray(categories) ? categories : [];
    } catch (error) {
      console.error('Failed to fetch job categories:', error.message);
      throw new APIError(`Unable to retrieve job categories: ${error.message}`);
    }
  }

  async getAvailableJobs(filters = {}) {
    try {
      const params = new URLSearchParams();
      
      if (filters.categoryId) params.append('category_id', filters.categoryId);
      if (filters.employmentType && filters.employmentType !== 'any') {
        params.append('employment_type', filters.employmentType);
      }
      if (filters.location) params.append('location', filters.location);
      
      const url = params.toString() ? `${this.JOBS_API_URL}?${params.toString()}` : this.JOBS_API_URL;
      return await this.fetchWithToken(url);
    } catch (error) {
      console.error('Failed to fetch available jobs:', error.message);
      throw new APIError(`Unable to retrieve job listings: ${error.message}`);
    }
  }

  async loadCategories() {
    if (this.categoriesLoaded) return;

    try {
      this.categories = await this.getJobCategories();
      this.categoriesLoaded = true;
    } catch (error) {
      console.error('Error loading categories:', error.message);
      this.categories = [];
      this.categoriesLoaded = false;
      throw error;
    }
  }

  async extractFiltersFromQuery(userQuery) {
    try {
      if (!this.categoriesLoaded) {
        await this.loadCategories();
      }

      const categoryList = this.categories.map(c => `${c.name} (ID: ${c.id})`).join(', ');
      
      const prompt = `Extract job search parameters from: "${userQuery}"

Categories: ${categoryList}

Examples:
- "sales jobs" → intentType: "specific_category", matchedCategory: "Salesperson", categoryId: [corresponding ID]
- "find me a job" → intentType: "job_search", matchedCategory: null
- "available jobs" → intentType: "general_availability", matchedCategory: null
- "software engineering" → intentType: "specific_category", matchedCategory: "IT"
- "tell me more about job 1" → intentType: "details_request"

IMPORTANT: When matching categories, you MUST return the EXACT categoryId from the list above.
Match variations: "sales"→"Salesperson", "accounting"→"Accountant", "data entry"→"Data Entry Clerk", "construction"→"Construction Worker"

Return ONLY JSON with categoryId as NUMBER:
{
  "categoryId": 4,
  "matchedCategory": "Data Entry Clerk",
  "intentType": "specific_category"
}`;

      const response = await Promise.race([
        this.llm.invoke(prompt),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('LLM timeout')), 10000)
        )
      ]);
      const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
      
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return { intentType: 'unknown' };

      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        category: parsed.categoryId || null,
        categoryName: parsed.matchedCategory || null,
        employmentType: parsed.employmentType || null,
        location: parsed.location || null,
        intentType: parsed.intentType || 'unknown',
        isMultiCategory: parsed.isMultiCategory || false,
        confidence: parsed.confidence || 'medium',
        excludeCategories: parsed.excludeCategories || []
      };

    } catch (error) {
      console.error('AI filter extraction error:', error.message);
      return { intentType: 'unknown' };
    }
  }

  async shouldHandleQuery(userMessage) {
    console.log('[JobSeekerAgent] shouldHandleQuery called with:', userMessage);
    
    try {
      const prompt = `Analyze if this user query should be handled by a JOB SEEKER assistant (someone looking for employment). Return JSON with "shouldHandle" boolean and "reason".

CRITICAL: This is a JOB SEEKER agent - it helps people FIND JOBS, not hire people.

Query: "${userMessage}"

MUST REJECT (shouldHandle: false) these scenarios ONLY:
- CLEAR employer/recruiter queries: "hire", "recruit", "find talent", "need workers", "looking for candidates", "I want to hire", "post a job", "post job", "looking to hire", "want to hire", "need to hire", "searching for candidates", "find candidates", "looking for employees", "need employees", "want to recruit", "seeking talent", "talent search"
- Business owner queries: "I own a business", "my company needs", "we are hiring", "our company is looking for", "I need staff", "I want to post a vacancy"

MUST ACCEPT (shouldHandle: true) these scenarios:
- Job seeker looking for work: "find me a job", "I need work", "job openings", "looking for work", "need a job", "searching for jobs"
- Asking about available positions: "what jobs are available", "show me jobs", "available positions", "job listings"
- Specific job searches: "sales jobs", "IT positions", "construction work", "driver jobs", "teaching jobs"
- Job categories inquiry: "what types of jobs", "job categories", "what kind of jobs are there"
- Follow-up questions about previously shown jobs
- Job details requests: "tell me about job 1", "more details", "show me details", "about position 2"
- General questions about Kozi: "what is kozi", "describe kozi rwanda services", "what is the mission of kozi", "how does kozi work", "tell me about kozi"
- Platform guidance: "how to apply", "how to create profile", "how to use kozi"

Return JSON: {"shouldHandle": true/false, "reason": "brief explanation"}

Examples:
- "find me a job" → {"shouldHandle": true, "reason": "job seeker looking for work"}
- "I want to hire someone" → {"shouldHandle": false, "reason": "employer query, not job seeker"}
- "show me candidates" → {"shouldHandle": false, "reason": "recruiter/employer request"}
- "I need workers" → {"shouldHandle": false, "reason": "hiring request"}
- "post a job" → {"shouldHandle": false, "reason": "employer posting job"}
- "hello" → {"shouldHandle": true, "reason": "greeting - allow general conversation"}
- "what jobs are available" → {"shouldHandle": true, "reason": "job seeker asking about positions"}
- "sales positions" → {"shouldHandle": true, "reason": "specific job search"}
- "how are you" → {"shouldHandle": true, "reason": "general conversation"}
- "I want to hire a talent" → {"shouldHandle": false, "reason": "employer hiring request"}
- "describe kozi rwanda services" → {"shouldHandle": true, "reason": "general question about platform"}
- "what is the mission of kozi" → {"shouldHandle": true, "reason": "general platform inquiry"}
- "how does kozi work" → {"shouldHandle": true, "reason": "platform guidance for job seekers"}

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
        console.log('[JobSeekerAgent] No JSON found in response, defaulting to true for fallback');
        return { shouldHandle: true, reason: 'No JSON response from LLM, defaulting to true' };
      }

      const parsed = JSON.parse(jsonMatch[0]);
      console.log('[JobSeekerAgent] LLM analysis result:', parsed);
      
      return parsed;

    } catch (error) {
      console.error('[JobSeekerAgent] Error in shouldHandleQuery:', error.message);
      
      const lowerMsg = userMessage.toLowerCase().trim();
      
      // STRICT employer/recruiter keywords - only clear hiring intent
      const strictEmployerKeywords = [
        'hire', 'recruit', 'talent', 'candidate', 'worker', 'employee', 'staff',
        'post a job', 'post job', 'looking to hire', 'want to hire', 'need to hire',
        'searching for candidates', 'find candidates', 'looking for employees',
        'need employees', 'want to recruit', 'seeking talent', 'talent search',
        'my company', 'our company', 'business needs', 'we are hiring', 'vacancy posting',
        'i need staff', 'i want to post', 'post vacancy', 'job posting'
      ];
      
      // Check for CLEAR employer intent - must have hiring-related keywords in context
      const hasClearEmployerIntent = strictEmployerKeywords.some(kw => {
        if (lowerMsg.includes(kw)) {
          // Additional context checks to avoid false positives
          if (kw === 'talent' && !lowerMsg.includes('hire') && !lowerMsg.includes('recruit') && !lowerMsg.includes('find')) {
            return false; // "talent" alone might not be employer intent
          }
          if (kw === 'candidate' && !lowerMsg.includes('hire') && !lowerMsg.includes('recruit') && !lowerMsg.includes('find')) {
            return false; // "candidate" alone might not be employer intent
          }
          return true;
        }
        return false;
      });
      
      if (hasClearEmployerIntent) {
        console.log('[JobSeekerAgent] Fallback: Rejected as clear employer query');
        return { shouldHandle: false, reason: 'Clear employer query detected in fallback' };
      }
      
      // Accept greetings and general questions
      const greetings = ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'];
      if (greetings.some(greet => lowerMsg === greet || lowerMsg === greet + '!')) {
        console.log('[JobSeekerAgent] Fallback: Accepted as greeting');
        return { shouldHandle: true, reason: 'Greeting detected in fallback' };
      }
      
      // Accept general Kozi platform questions
      const koziPlatformKeywords = ['kozi', 'mission', 'vision', 'services', 'what is', 'how does', 'tell me about'];
      if (koziPlatformKeywords.some(kw => lowerMsg.includes(kw))) {
        console.log('[JobSeekerAgent] Fallback: Accepted as platform question');
        return { shouldHandle: true, reason: 'Platform question detected' };
      }
      
      // Accept if we have an active search
      if (this.hasActiveSearch) {
        const followUpKeywords = ['more', 'details', 'yes', 'show', 'tell', 'which', 'what', 'number', 'other'];
        if (followUpKeywords.some(kw => lowerMsg.includes(kw))) {
          console.log('[JobSeekerAgent] Fallback: Accepted as follow-up query');
          return { shouldHandle: true, reason: 'Follow-up query in active search' };
        }
      }
      
      // Accept job seeker keywords
      const jobSeekerKeywords = ['job', 'work', 'position', 'employment', 'opening', 'opportunity', 'vacancy', 'career'];
      if (jobSeekerKeywords.some(kw => lowerMsg.includes(kw))) {
        console.log('[JobSeekerAgent] Fallback: Accepted as job seeker query');
        return { shouldHandle: true, reason: 'Job seeker keywords detected' };
      }
      
      // DEFAULT: Accept most queries to allow general conversation
      console.log('[JobSeekerAgent] Fallback: Defaulting to true for general conversation');
      return { shouldHandle: true, reason: 'Defaulting to true for general conversation' };
    }
  }

  sanitizeField(text) {
    if (!text) return '';
    return text.replace(/<br\s*\/?>/gi, '\n').replace(/&nbsp;/g, ' ').trim();
  }

  matchUserInputToCategory(userInput) {
    if (!this.categories || this.categories.length === 0) return null;
    
    const lowerInput = userInput.toLowerCase().trim();
    
    // First try exact match (case-insensitive)
    for (const category of this.categories) {
      if (lowerInput === category.name.toLowerCase()) {
        console.log(`[matchUserInputToCategory] Exact match found: ${category.name} (ID: ${category.id})`);
        return category.id;
      }
    }
    
    // Try number match
    const numberMatch = lowerInput.match(/^(\d+)$/);
    if (numberMatch) {
      const index = parseInt(numberMatch[1]) - 1;
      if (index >= 0 && index < this.categories.length) {
        console.log(`[matchUserInputToCategory] Number match found: ${this.categories[index].name} (ID: ${this.categories[index].id})`);
        return this.categories[index].id;
      }
    }
    
    // Try ordinal match
    const ordinals = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'];
    const ordinalIndex = ordinals.findIndex(ordinal => lowerInput.includes(ordinal));
    if (ordinalIndex >= 0 && ordinalIndex < this.categories.length) {
      console.log(`[matchUserInputToCategory] Ordinal match found: ${this.categories[ordinalIndex].name} (ID: ${this.categories[ordinalIndex].id})`);
      return this.categories[ordinalIndex].id;
    }
    
    // Try partial match
    for (const category of this.categories) {
      const categoryName = category.name.toLowerCase();
      
      if (lowerInput.includes(categoryName) || categoryName.includes(lowerInput)) {
        console.log(`[matchUserInputToCategory] Partial match found: ${category.name} (ID: ${category.id})`);
        return category.id;
      }
    }
    
    // Try synonyms
    const categorySynonyms = {
      'construction worker': ['building', 'construction', 'mason', 'carpenter', 'builder'],
      'waiter / waitress': ['hotel', 'restaurant', 'cook', 'chef', 'waiter', 'waitress', 'service', 'hospitality'],
      'doctor': ['medical', 'health', 'nurse', 'doctor', 'care', 'hospital', 'healthcare'],
      'security guard': ['guard', 'security', 'protection', 'watchman'],
      'housekeeper': ['cleaner', 'housekeeping', 'janitor', 'maid', 'cleaning'],
      'driver': ['driving', 'transport', 'delivery', 'taxi'],
      'accountant': ['accountant', 'finance', 'bookkeeping', 'money', 'accounting'],
      'teacher': ['teacher', 'teaching', 'school', 'education', 'tutor'],
      'salesperson': ['selling', 'sales', 'marketing', 'retail', 'shop'],
      'data entry clerk': ['data entry', 'typing', 'clerk', 'data']
    };
    
    for (const category of this.categories) {
      const categoryName = category.name.toLowerCase();
      
      if (categorySynonyms[categoryName]) {
        for (const synonym of categorySynonyms[categoryName]) {
          if (lowerInput.includes(synonym)) {
            console.log(`[matchUserInputToCategory] Synonym match found: ${category.name} (ID: ${category.id})`);
            return category.id;
          }
        }
      }
    }
    
    console.log(`[matchUserInputToCategory] No match found for: ${userInput}`);
    return null;
  }

  async generateAIResponse(userQuery, searchResults, filters, context = {}) {
    try {
      const resultCount = searchResults.length;
      const { intentType, askedForDetails } = context;

      let prompt = '';

      // ✅ 1. Handle ZERO RESULTS gracefully
      if (resultCount === 0) {
        prompt = `
User asked: "${userQuery}"

No jobs were found matching this request.

Generate a short, friendly, and professional message that:
1. Politely tells the user that no jobs were found for their query.
2. Encourages them to try again with different keywords or a different category.
3. Gives one of these examples of how to rephrase (in parentheses, not bullet points).
4. Ends with: "Would you like me to help you look for a different type of job?"

Example tone:
"Sorry, I couldn't find any housekeeper jobs right now. You can try searching for cleaning or hospitality roles instead. Would you like me to help you look for a different type of job?"

Keep it conversational and encouraging.`;

        const response = await this.llm.invoke(prompt);
        const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
        return content.trim();
      }

      // ✅ 2. ONE JOB FOUND
      if (resultCount === 1) {
        const job = searchResults[0];
        const companyName = this.sanitizeField(job.company) || 'Company';
        const jobData = {
          title: this.sanitizeField(job.job_title) || 'Not specified',
          company: companyName,
          employmentType: this.sanitizeField(job.employment_type || job.location) || 'Not specified',
          salaryMin: job.salary_min,
          salaryMax: job.salary_max,
          description: this.sanitizeField(job.job_description),
          requirements: this.sanitizeField(job.requirements),
          responsibilities: this.sanitizeField(job.responsability),
          additionalInfo: this.sanitizeField(job.conclusion),
          postedDate: job.published_date,
          deadline: job.deadline_date
        };

        if (intentType === 'details_request' || askedForDetails) {
          prompt = `User requested details about a job.

Job Information:
- Title: ${jobData.title}
- Company: ${jobData.company}
- Employment Type: ${jobData.employmentType}
${jobData.salaryMin && jobData.salaryMax && jobData.salaryMin !== 1 && jobData.salaryMax !== 1 ? `- Salary: ${jobData.salaryMin} - ${jobData.salaryMax}` : ''}
${jobData.description ? `- Description: ${jobData.description}` : ''}
${jobData.requirements ? `- Requirements: ${jobData.requirements}` : ''}
${jobData.responsibilities ? `- Responsibilities: ${jobData.responsibilities}` : ''}
${jobData.additionalInfo ? `- Additional Info: ${jobData.additionalInfo}` : ''}
${jobData.postedDate ? `- Posted: ${this.formatDate(jobData.postedDate)}` : ''}
${jobData.deadline ? `- Deadline: ${this.formatDate(jobData.deadline)}` : ''}

Generate a friendly detailed markdown response with a short intro sentence, followed by all details in clear sections.
End with: "Let me know if you need help with applying!"`;
        } else {
          prompt = `User selected the ${jobData.title} job.

Generate a 3–4 sentence paragraph confirming the job selection.
Mention the title, company, employment type, and salary (if available).
End with: "If you need to know more details, let me know — I'm happy to help."`;
        }
      }

      // ✅ 3. MULTIPLE JOBS FOUND
      if (resultCount > 1) {
        const jobsList = searchResults.slice(0, 10).map((job, idx) => {
          const companyName = this.sanitizeField(job.company) || 'Company';
          return {
            number: idx + 1,
            title: this.sanitizeField(job.job_title) || 'Not specified',
            company: companyName,
            employmentType: this.sanitizeField(job.employment_type || job.location) || 'Not specified'
          };
        });

        if (intentType === 'general_availability') {
          prompt = `User asked about available jobs (e.g., "show me available jobs").

We found ${resultCount} jobs total. Showing first ${jobsList.length}:

${jobsList.map(j => `${j.number}. **${j.title}** at ${j.company}`).join('\n')}

Generate a friendly, helpful response that lists the jobs and ends with:
"Which position interests you most? I can give you full details about any of these jobs, or help you find something more specific!"`;
        } else {
          prompt = `User asked: "${userQuery}"

Found ${resultCount} ${filters.categoryName || ''} jobs. Showing first ${jobsList.length}:

${jobsList.map(j => `${j.number}. ${j.title} at ${j.company} (${j.employmentType})`).join('\n')}

Generate a response that starts with enthusiasm, lists the jobs, and ends with:
"Which job interests you most? I can give you full details about any of these positions!"`;
        }
      }

      // ✅ 4. Invoke LLM
      const response = await this.llm.invoke(prompt);
      const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);

      return content.trim();

    } catch (error) {
      console.error('Error generating AI response:', error);
      
      // Graceful fallback without generating hypothetical data
      const resultCount = searchResults.length;
      
      if (resultCount === 0) {
        return `I couldn't find any ${filters.categoryName ? filters.categoryName + ' ' : ''}jobs matching your criteria right now. You might want to try:\n\n• Searching with different keywords\n• Looking at other job categories\n• Checking back later as new opportunities are added regularly\n\nWould you like me to help you look for a different type of job?`;
      }
      
      if (resultCount === 1) {
        const job = searchResults[0];
        const companyName = this.sanitizeField(job.company) || 'Company';
        return `I found this opportunity for you:\n\n**${job.job_title || 'Position'}** at **${companyName}**\n\nWould you like to know more details about this position?`;
      }
      
      // Multiple jobs
      const jobsList = searchResults.slice(0, 10).map((job, index) => {
        const companyName = this.sanitizeField(job.company) || 'Company';
        return `${index + 1}. **${job.job_title || 'Position'}** at ${companyName}`;
      }).join('\n');
      
      return `I found ${resultCount} ${filters.categoryName || ''} jobs for you:\n\n${jobsList}\n\nWhich position interests you most? I can give you full details about any of these jobs!`;
    }
  }

  async performSearch(categoryId = null, excludeCategories = []) {
    let results = [];
    
    console.log('🔍 JobSeekerAgent: Starting job search with filters:', {
      categoryId,
      employmentType: this.filters.employmentType,
      location: this.filters.location
    });
    
    if (categoryId) {
      results = await this.getAvailableJobs({
        categoryId: categoryId,
        employmentType: this.filters.employmentType,
        location: this.filters.location
      });
      
      console.log(`📊 JobSeekerAgent: API returned ${results.length} jobs for category_id=${categoryId}`);
      
      // DEBUG: Log first few jobs to see their structure
      if (results.length > 0) {
        console.log('Sample job data:', {
          category_id: results[0].category_id,
          category_name: results[0].category_name,
          job_title: results[0].job_title
        });
      } else {
        // If no results from API with category filter, try getting all jobs and filter by category name
        console.log('⚠️ No jobs from API with category_id filter, trying fallback with category name match');
        const allJobs = await this.getAvailableJobs({
          employmentType: this.filters.employmentType,
          location: this.filters.location
        });
        
        console.log(`📊 Total jobs in database: ${allJobs.length}`);
        
        const categoryName = this.getCategoryName(categoryId);
        console.log(`🔍 Filtering by category name: ${categoryName}`);
        
        // Try matching by category name instead
        results = allJobs.filter(job => {
          const jobCategoryName = (job.category_name || '').toLowerCase().trim();
          const targetCategoryName = (categoryName || '').toLowerCase().trim();
          
          // Try exact match first
          if (jobCategoryName === targetCategoryName) return true;
          
          // Try partial match
          if (jobCategoryName.includes(targetCategoryName) || targetCategoryName.includes(jobCategoryName)) return true;
          
          // Try matching job_title if category_name is not available
          const jobTitle = (job.job_title || '').toLowerCase().trim();
          if (jobTitle.includes(targetCategoryName) || targetCategoryName.includes(jobTitle)) return true;
          
          return false;
        });
        
        console.log(`📊 After category name filtering: ${results.length} jobs`);
      }
      
      results = this.filterJobs(results, categoryId);
    } else {
      results = await this.getAvailableJobs({
        employmentType: this.filters.employmentType,
        location: this.filters.location
      });
      results = this.filterJobs(results, null);
    }

    if (excludeCategories.length > 0) {
      results = results.filter(job => {
        const jobCategory = job.category_name || job.job_title || 'Other';
        return !excludeCategories.some(excluded => 
          jobCategory.toLowerCase().includes(excluded.toLowerCase())
        );
      });
    }

    const limitedResults = results.slice(0, 20);
    console.log(`📊 JobSeekerAgent: Found ${results.length} total jobs, returning ${limitedResults.length} jobs (limited to 20)`);
    return limitedResults;
  }

  filterJobs(jobs, categoryId = null) {
    const currentDate = new Date();
    
    return jobs.filter(job => {
      if (categoryId && job.category_id !== categoryId) return false;

      if (job.deadline_date) {
        try {
          const deadline = new Date(job.deadline_date);
          if (deadline < currentDate) return false;
        } catch (error) {
          console.warn('Invalid deadline date:', job.deadline_date);
        }
      }

      if (this.filters.employmentType && this.filters.employmentType !== 'any') {
        if (job.employment_type && !job.employment_type.toLowerCase().includes(this.filters.employmentType.toLowerCase())) {
          return false;
        }
      }

      if (this.filters.location && job.location) {
        if (!job.location.toLowerCase().includes(this.filters.location.toLowerCase())) {
          return false;
        }
      }

      return true;
    });
  }

  formatDate(dateString) {
    if (!dateString) return 'Not specified';
    try {
      return new Date(dateString).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch {
      return dateString;
    }
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

      const lowerMsg = userMessage.toLowerCase().trim();

      // Check if this is an employer query and handle it properly
      const shouldHandleResult = await this.shouldHandleQuery(userMessage);
      
      if (!shouldHandleResult.shouldHandle) {
        console.log('[JobSeekerAgent] Query rejected by LLM analysis:', shouldHandleResult.reason);
        
        // Return a clear message that this is for job seekers only
        return {
          type: 'employer_query_rejected',
          message: `I'm here to help job seekers find employment opportunities. For employer services like hiring talent or posting jobs, please use our employer portal or contact our business team directly.\n\nIf you're looking for a job, I'd be happy to help you search for available positions! What type of work are you interested in?`,
          code: 'EMPLOYER_QUERY'
        };
      }

      // If it's not a job search query but should be handled, return null to let general chat handle it
      const isJobSearchQuery = lowerMsg.includes('job') || 
                              lowerMsg.includes('work') || 
                              lowerMsg.includes('position') || 
                              lowerMsg.includes('employment') ||
                              lowerMsg.includes('career') ||
                              lowerMsg.includes('vacancy') ||
                              this.hasActiveSearch;

      if (!isJobSearchQuery) {
        console.log('[JobSeekerAgent] Not a job search query, letting general chat handle:', userMessage);
        return null;
      }

      if (this.hasActiveSearch && this.lastSearchResults.length > 0) {
        const detailsMatch = lowerMsg.match(/(?:more\s+)?details?\s*(?:about|on|for|of)?\s*(?:job\s*)?(\d+)?/i);
        const moreMatch = lowerMsg.match(/(?:yes|sure|okay|ok|show|tell|give)\s*(?:me)?(?:\s+more)?(?:\s+details)?(?:\s+about)?(?:\s+it)?/i);
        const otherMatch = lowerMsg.match(/(?:other|another|different)\s+(?:job|position)/i);

        let jobIndex = -1;
        let selectedJob = null;

        selectedJob = this.lastSearchResults.find((job, index) => {
          if (job.job_title) {
            const jobTitleLower = job.job_title.toLowerCase();
            if (lowerMsg === jobTitleLower || lowerMsg.includes(jobTitleLower) || jobTitleLower.includes(lowerMsg.split(' ')[0])) {
              jobIndex = index;
              return true;
            }
          }
          return false;
        });

        if (jobIndex === -1) {
          if (detailsMatch && detailsMatch[1]) {
            jobIndex = parseInt(detailsMatch[1]) - 1;
          } else if (moreMatch && this.lastSearchResults.length === 1) {
            jobIndex = 0;
          }
        }

        if (jobIndex >= 0 && jobIndex < this.lastSearchResults.length) {
          const job = this.lastSearchResults[jobIndex];
          
          const fullDetailsRequested = (jobIndex === this.conversationContext.selectedJobIndex && moreMatch) || (detailsMatch);
          
          this.conversationContext.selectedJobIndex = jobIndex;

          const aiResponse = await this.generateAIResponse(
            userMessage,
            [job],
            this.filters,
            { 
              intentType: fullDetailsRequested ? 'details_request' : 'specific_category', 
              askedForDetails: fullDetailsRequested 
            }
          );

          return {
            type: 'results',
            data: [job],
            jobs: [job],
            message: aiResponse
          };
        }
        
        if (otherMatch) {
          const currentJobTitles = this.lastSearchResults.map(job => job.job_title || '');
          const allJobs = await this.performSearch(null);
          const otherJobs = allJobs.filter(job =>
            !currentJobTitles.includes(job.job_title || '')
          );

          if (otherJobs.length > 0) {
            const aiResponse = await this.generateAIResponse(
              userMessage,
              otherJobs,
              { ...this.filters, excludeCategories: currentJobTitles },
              { intentType: 'other_jobs' }
            );

            this.lastSearchResults = otherJobs;

            return {
              type: 'results',
              data: otherJobs,
              jobs: otherJobs,
              message: aiResponse
            };
          }
        }
      }

      if (!this.categoriesLoaded) {
        await this.loadCategories();
      }

      if (this.categories.length === 0) {
        return {
          type: 'error',
          message: 'Currently unable to load job categories. Please try again later.',
          code: 'CATEGORIES_UNAVAILABLE'
        };
      }

      // CRITICAL FIX: If awaiting category selection, try to match user input first
      if (this.conversationContext.awaitingCategorySelection) {
        console.log('[processMessage] Awaiting category selection, attempting to match:', userMessage);
        const matchedCategory = this.matchUserInputToCategory(userMessage);
        
        if (matchedCategory) {
          console.log('[processMessage] Category matched! ID:', matchedCategory);
          // Found a match - proceed with search
          this.conversationContext.awaitingCategorySelection = false;
          this.resetSearchState();
          
          const results = await this.performSearch(matchedCategory);
          this.lastSearchResults = results;
          this.hasActiveSearch = true;
          this.conversationContext.lastQuery = userMessage;
          
          const categoryName = this.getCategoryName(matchedCategory);
          
          const aiResponse = await this.generateAIResponse(
            userMessage,
            results,
            { category: matchedCategory, categoryName: categoryName },
            { intentType: 'specific_category' }
          );

          const formattedData = results.slice(0, 20).map(job => this.formatJobForCard(job));

          return {
            type: 'results',
            data: formattedData,
            jobs: formattedData,
            message: aiResponse,
            hasMoreResults: results.length > 20
          };
        } else {
          console.log('[processMessage] No category match found for:', userMessage);
          // No match found - show clarification again
          return {
            type: 'clarification',
            message: `I couldn't find that category. Let me show you what's available! 😊\n\nPlease choose from these job categories:\n\n${this.categories.slice(0, 10).map((cat, idx) => `${idx + 1}. **${cat.name}**`).join('\n')}\n\nJust type the name or number of the category you're interested in!`,
            data: this.categories
          };
        }
      }

      const extractedFilters = await this.extractFiltersFromQuery(userMessage);
      
      console.log('[processMessage] Extracted filters:', extractedFilters);

      if (extractedFilters.intentType === 'general_availability' || extractedFilters.intentType === 'list_all') {
        this.resetSearchState();
        
        const results = await this.performSearch(null);
        this.lastSearchResults = results;
        this.hasActiveSearch = true;
        this.conversationContext.showedSummary = true;
        this.conversationContext.lastQuery = userMessage;

        const aiResponse = await this.generateAIResponse(
          userMessage,
          results,
          {},
          { intentType: extractedFilters.intentType }
        );

        return {
          type: 'results',
          data: results,
          jobs: results,
          message: aiResponse
        };
      }

      if (extractedFilters.intentType === 'other_jobs') {
        this.resetSearchState();
        
        const results = await this.performSearch(null, extractedFilters.excludeCategories);
        this.lastSearchResults = results;
        this.hasActiveSearch = true;
        this.conversationContext.lastQuery = userMessage;

        const aiResponse = await this.generateAIResponse(
          userMessage,
          results,
          extractedFilters,
          { intentType: 'other_jobs' }
        );

        return {
          type: 'results',
          data: results,
          jobs: results,
          message: aiResponse
        };
      }

      // CRITICAL FIX: For specific_category intent, if LLM didn't extract categoryId, try manual matching
      if (extractedFilters.intentType === 'specific_category' && !extractedFilters.category) {
        console.log('[processMessage] specific_category but no categoryId, trying manual match');
        const matchedCategory = this.matchUserInputToCategory(userMessage);
        
        if (matchedCategory) {
          console.log('[processMessage] Manual match found! ID:', matchedCategory);
          extractedFilters.category = matchedCategory;
          extractedFilters.categoryName = this.getCategoryName(matchedCategory);
        } else {
          console.log('[processMessage] No manual match found');
          const categoriesList = this.categories.slice(0, 8)
            .map((cat, idx) => `${idx + 1}. **${cat.name}**`)
            .join('\n');
          
          return {
            type: 'clarification',
            message: `I searched for "${userMessage}" but couldn't find that exact category. 😊\n\nHere are the job categories we have:\n\n${categoriesList}\n\nWhich of these interests you? Or I can show you all available jobs!`,
            data: this.categories
          };
        }
      }

      if (extractedFilters.intentType === 'job_search' && !extractedFilters.category) {
        this.conversationContext.awaitingCategorySelection = true;
        this.conversationContext.inJobSearchFlow = true;
        
        const popularCategories = this.categories.slice(0, 20);
        const remainingCount = this.categories.length - 20;
        
        const categoriesList = popularCategories
          .map((cat, idx) => `${idx + 1}. **${cat.name}**`)
          .join('\n');
        
        return {
          type: 'clarification',
          message: `I'd love to help you find the perfect job! 😊\n\nWhat type of work interests you? Here are some popular categories:\n\n${categoriesList}${remainingCount > 0 ? `\n\n...and ${remainingCount} more categories available!` : ''}\n\nJust tell me what you enjoy doing - like "accounting", "construction", or "hospitality" - and I'll search our database for matching opportunities!`,
          data: this.categories
        };
      }

      if (!extractedFilters.category && extractedFilters.intentType !== 'other_jobs' && extractedFilters.intentType !== 'job_search' && extractedFilters.intentType !== 'specific_category') {
        // If it's not a clear job search query, let general chat handle it
        return null;
      }

      if (this.filters.category !== extractedFilters.category) {
        this.resetSearchState();
      }

      this.filters = extractedFilters;

      const results = await this.performSearch(extractedFilters.category, extractedFilters.excludeCategories);
      this.lastSearchResults = results;
      this.currentOffset = Math.min(20, results.length);
      this.hasActiveSearch = true;
      this.conversationContext.lastQuery = userMessage;

      const aiResponse = await this.generateAIResponse(
        userMessage,
        results,
        this.filters,
        { intentType: extractedFilters.intentType }
      );

      const formattedData = results.slice(0, 20).map(job => this.formatJobForCard(job));

      console.log('🔍 JobSeekerAgent Results:', {
        resultCount: results.length,
        formattedCount: formattedData.length
      });

      this.lastSearchResults = results;

      return {
        type: 'results',
        data: formattedData,
        jobs: formattedData,
        message: aiResponse,
        hasMoreResults: results.length > 20
      };

    } catch (error) {
      console.error('Error processing message:', error);
      
      if (error instanceof APIError && error.code === 'AUTH_ERROR') {
        return {
          type: 'error',
          message: 'Your session has expired. Please refresh the page and try again.',
          code: 'AUTH_ERROR'
        };
      }
      
      if (error instanceof APIError) {
        return {
          type: 'error',
          message: `Unable to search for jobs at the moment: ${error.message}`,
          code: error.code
        };
      }
      
      return {
        type: 'error',
        message: 'An unexpected error occurred while processing your request. Please try again.',
        code: 'UNKNOWN_ERROR'
      };
    }
  }

  formatJobForCard(job) {
    return {
      id: job.id || job.job_id || Math.random().toString(36).substr(2, 9),
      job_id: job.job_id || job.id,
      job_title: job.job_title || 'Not specified',
      company: job.company || 'Not specified',
      employment_type: job.employment_type || 'Full-time',
      positions: job.positions || job.available_positions || 1,
      location: job.location || 'Not specified',
      salary_min: job.salary_min,
      salary_max: job.salary_max,
      category: job.category_name || job.job_category || 'General',
      description: this.sanitizeField(job.job_description)?.substring(0, 150) + '...',
      postedDate: job.published_date,
      deadline: job.deadline_date,
      logo: job.logo || null
    };
  }

  getCategoryName(categoryId) {
    if (!categoryId || !this.categories || this.categories.length === 0) {
      return null;
    }
    const category = this.categories.find(c => c.id === categoryId);
    return category ? category.name : null;
  }
}

module.exports = { JobSeekerAgent, APIError, ValidationError };