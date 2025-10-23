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
    this.API_TOKEN = apiToken; // Accept token as constructor parameter
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

  // New method to update API token dynamically
  setApiToken(apiToken) {
    if (!apiToken || typeof apiToken !== 'string' || apiToken.trim() === '') {
      throw new ValidationError('Invalid API token provided');
    }
    this.API_TOKEN = apiToken.trim();
  }

  validateEnvironment() {
    // Only validate API URLs from environment, token comes from headers
    this.JOB_CATEGORIES_API = process.env.JOB_CATEGORIES_API;
    this.JOB_SEEKERS_BY_CATEGORY_API = process.env.JOB_SEEKERS_BY_CATEGORY_API;
    this.JOBS_API_URL = process.env.JOBS_API_URL;

    const requiredVars = {
      'JOB_CATEGORIES_API': this.JOB_CATEGORIES_API,
      'JOB_SEEKERS_BY_CATEGORY_API': this.JOB_SEEKERS_BY_CATEGORY_API,
      'JOBS_API_URL': this.JOBS_API_URL
    };

    const missingVars = Object.entries(requiredVars)
      .filter(([_, value]) => !value)
      .map(([key]) => key);

    if (missingVars.length > 0) {
      throw new ValidationError(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    // Validate API token if provided during construction
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
    this.searchMode = 'jobs';
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
    // Check if token is available before making request
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

  async getJobSeekersByCategory(categoryId) {
    try {
      if (!categoryId) {
        throw new ValidationError('Category ID is required');
      }

      const url = `${this.JOB_SEEKERS_BY_CATEGORY_API.replace(/\/+$/, '')}/${categoryId}`;
      return await this.fetchWithToken(url);
    } catch (error) {
      console.error(`Failed to fetch job seekers for category ${categoryId}:`, error.message);
      throw new APIError(`Unable to retrieve job seekers: ${error.message}`);
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

Return JSON:
{
  "matchedCategory": "exact category name or null",
  "categoryId": "ID number or null", 
  "employmentType": "full-time|part-time|contract|any|null",
  "location": "location or null",
  "searchType": "jobs|job_seekers|unknown",
  "intentType": "job_search|general_availability|specific_category|details_request|candidate_details|list_all|other_jobs",
  "candidateName": "name if asking about specific candidate",
  "candidateIndex": "number if referring to candidate by number",
  "isMultiCategory": false,
  "confidence": "high|medium|low",
  "excludeCategories": []
}

Examples:
- "sales jobs" → intentType: "specific_category", matchedCategory: "Sales", searchType: "jobs"
- "find me a job" → intentType: "job_search", matchedCategory: null
- "available jobs" → intentType: "general_availability", matchedCategory: null
- "software engineering" → intentType: "specific_category", matchedCategory: "IT", searchType: "jobs"
- "find me sales candidates" → intentType: "specific_category", matchedCategory: "Sales", searchType: "job_seekers"
- "is there any person who can work in sales" → intentType: "specific_category", matchedCategory: "Sales", searchType: "job_seekers"
- "I need workers for construction" → intentType: "specific_category", matchedCategory: "Construction", searchType: "job_seekers"
- "show me qualified candidates" → intentType: "general_availability", matchedCategory: null, searchType: "job_seekers"
- "tell me more about Marie C" → intentType: "candidate_details", candidateName: "Marie C", searchType: "job_seekers"
- "show me John's profile" → intentType: "candidate_details", candidateName: "John", searchType: "job_seekers"
- "what is Alice's experience" → intentType: "candidate_details", candidateName: "Alice", searchType: "job_seekers"
- "more details about candidate 1" → intentType: "candidate_details", candidateIndex: 1, searchType: "job_seekers"

Match variations: "sales"→"Sales", "accounting"→"Accountant", "tech"→"IT", "programming"→"IT"

Return ONLY JSON:`;

      const response = await Promise.race([
        this.llm.invoke(prompt),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('LLM timeout')), 10000)
        )
      ]);
      const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
      
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return { searchType: 'unknown', intentType: 'unknown' };

      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        category: parsed.categoryId || null,
        categoryName: parsed.matchedCategory || null,
        employmentType: parsed.employmentType || null,
        location: parsed.location || null,
        searchType: parsed.searchType || 'jobs',
        intentType: parsed.intentType || 'unknown',
        isMultiCategory: parsed.isMultiCategory || false,
        confidence: parsed.confidence || 'medium',
        excludeCategories: parsed.excludeCategories || []
      };

    } catch (error) {
      console.error('AI filter extraction error:', error.message);
      return { searchType: 'unknown', intentType: 'unknown' };
    }
  }

  async shouldHandleQuery(userMessage) {
    console.log('[JobSeekerAgent] shouldHandleQuery called with:', userMessage);
    
    try {
      const prompt = `Analyze if this user query should be handled by a job search assistant. Return JSON with "shouldHandle" boolean and "reason".

Query: "${userMessage}"

Consider these scenarios for handling:
- Job search, employment, work opportunities
- Finding candidates, workers, employees
- Job categories, types of work
- Specific job details or candidate profiles
- General availability inquiries
- Follow-up questions about previous job/candidate searches

Consider these scenarios for NOT handling:
- Simple greetings (hi, hello, hey)
- Casual conversation unrelated to jobs
- Technical support issues
- Personal questions to the assistant
- Completely unrelated topics

Return JSON: {"shouldHandle": true/false, "reason": "brief explanation"}

Examples:
- "find me a job" → {"shouldHandle": true, "reason": "job search request"}
- "hello" → {"shouldHandle": false, "reason": "greeting"}
- "show me construction workers" → {"shouldHandle": true, "reason": "candidate search"}
- "what jobs are available" → {"shouldHandle": true, "reason": "general job availability"}
- "how are you today" → {"shouldHandle": false, "reason": "casual conversation"}
- "tell me about sales jobs" → {"shouldHandle": true, "reason": "specific category job search"}

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
        console.log('[JobSeekerAgent] No JSON found in response, defaulting to false');
        return false;
      }

      const parsed = JSON.parse(jsonMatch[0]);
      console.log('[JobSeekerAgent] LLM analysis result:', parsed);
      
      return parsed.shouldHandle === true;

    } catch (error) {
      console.error('[JobSeekerAgent] Error in shouldHandleQuery:', error.message);
      
      // Fallback to simple keyword matching if LLM fails
      const lowerMsg = userMessage.toLowerCase().trim();
      const greetings = ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'];
      
      if (greetings.some(greet => lowerMsg === greet || lowerMsg === greet + '!')) {
        console.log('[JobSeekerAgent] Fallback: Rejected as greeting');
        return false;
      }
      
      // If we have an active search, be more permissive with follow-ups
      if (this.hasActiveSearch) {
        const followUpKeywords = ['more', 'details', 'yes', 'show', 'tell', 'which', 'what', 'number', 'other'];
        if (followUpKeywords.some(kw => lowerMsg.includes(kw))) {
          console.log('[JobSeekerAgent] Fallback: Accepted as follow-up query');
          return true;
        }
      }
      
      return false;
    }
  }

  sanitizeField(text) {
    if (!text) return '';
    return text.replace(/<br\s*\/?>/gi, '\n').replace(/&nbsp;/g, ' ').trim();
  }

  matchUserInputToCategory(userInput) {
    if (!this.categories || this.categories.length === 0) return null;
    
    const lowerInput = userInput.toLowerCase().trim();
    
    for (const category of this.categories) {
      if (lowerInput === category.name.toLowerCase()) {
        return category.id;
      }
    }
    
    const numberMatch = lowerInput.match(/^(\d+)$/);
    if (numberMatch) {
      const index = parseInt(numberMatch[1]) - 1;
      if (index >= 0 && index < this.categories.length) {
        return this.categories[index].id;
      }
    }
    
    const ordinals = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'];
    const ordinalIndex = ordinals.findIndex(ordinal => lowerInput.includes(ordinal));
    if (ordinalIndex >= 0 && ordinalIndex < this.categories.length) {
      return this.categories[ordinalIndex].id;
    }
    
    const categorySynonyms = {
      'construction': ['building', 'construction', 'mason', 'carpenter', 'builder'],
      'hospitality': ['hotel', 'restaurant', 'cook', 'chef', 'waiter', 'waitress', 'service'],
      'healthcare': ['medical', 'health', 'nurse', 'doctor', 'care', 'hospital'],
      'security': ['guard', 'security', 'protection', 'watchman'],
      'cleaning': ['cleaner', 'housekeeping', 'janitor', 'maid'],
      'driver': ['driving', 'transport', 'delivery', 'taxi'],
      'accounting': ['accountant', 'finance', 'bookkeeping', 'money'],
      'it': ['computer', 'technology', 'programming', 'software', 'tech', 'software engineering', 'developer', 'coding', 'programmer'],
      'education': ['teacher', 'teaching', 'school', 'education', 'tutor'],
      'sales': ['selling', 'sales', 'marketing', 'retail', 'shop']
    };
    
    for (const category of this.categories) {
      const categoryName = category.name.toLowerCase();
      
      if (lowerInput.includes(categoryName) || categoryName.includes(lowerInput)) {
        return category.id;
      }
      
      if (categorySynonyms[categoryName]) {
        for (const synonym of categorySynonyms[categoryName]) {
          if (lowerInput.includes(synonym)) {
            return category.id;
          }
        }
      }
    }
    
    return null;
  }

  async generateAIResponse(userQuery, searchResults, searchMode, filters, context = {}) {
    try {
      const resultCount = searchResults.length;
      const { intentType, askedForDetails } = context;

      let prompt = '';

      if (resultCount === 1) {
        const job = searchResults[0];
        const jobData = {
          title: this.sanitizeField(job.job_title) || 'Not specified',
          company: this.sanitizeField(job.company) || 'Not specified',
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

Job Information (clean text provided):
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

Your task:
1. Start with a **friendly, concise, one-sentence introductory message** 
   (e.g., "I'm happy to provide all the details for the ${jobData.title} position!").
2. Follow that with the complete job details in **exactly this markdown structure**:

**Job Title:** [Title]  
**Company:** [Company]  
**Employment Type:** [Type]  

**Description:**  
[Description text]

**Requirements:**  
- [Requirement 1]  
- [Requirement 2]  

**Responsibilities:**  
- [Responsibility 1]  
- [Responsibility 2]  

[Include other sections as available]

**Posted:** [Date]  
**Deadline:** [Date]

End with: "Let me know if you need help with applying!"

IMPORTANT:
- Always use the provided markdown labels (do not reuse symbols from job data).
- Format lists with "- " prefix for bullet points.
- Keep spacing clean (blank line between sections).`;

        } else {
          prompt = `User selected the ${jobData.title} job.

Job Data:
- Title: ${jobData.title}
- Company: ${jobData.company}
- Employment Type: ${jobData.employmentType}
- Salary Range: ${jobData.salaryMin && jobData.salaryMax && jobData.salaryMin !== 1 && jobData.salaryMax !== 1 ? `${jobData.salaryMin} - ${jobData.salaryMax}` : 'Not specified'}

Generate a single paragraph response (3-4 sentences) that:
1. Confirms the job selection immediately (e.g., "The **${jobData.title}** job is available...").
2. States the company, employment type, and salary range using this structure: 
   "The job available is from **[Company]**, it is **[Employment Type]**. 
   The salary range is between **[Salary Min] and [Salary Max]**."
3. Ends with: "If you need to know more details, let me know, I'm happy to help."

Be professional and conversational.`;
        }

      } else if (searchMode === 'job_seekers') {
        if (intentType === 'general_availability') {
          prompt = `User asked about available job seekers (e.g., "show me available candidates", "find me workers", "what candidates are available").
          
          ${resultCount} job seekers found in the database.
          
          Generate a SHORT response (2-3 lines max):
          1. Acknowledge the request enthusiastically: "Great news! I found ${resultCount} qualified candidates for you! 😊"
          2. Say: "Scroll down to see their profiles!"
          
          DO NOT list candidate names, skills, or details - cards will show that.
          Keep it brief and professional.`;
      } else {
          prompt = `User asked: "${userQuery}"
          
          ${resultCount} job seekers found in the database.
          
          Generate a SHORT response (2-3 lines max):
          1. Acknowledge enthusiastically: "Excellent! I found ${resultCount} ${filters.categoryName || ''} candidates for you! 😊"
          2. Say: "Scroll down to see their profiles!"
          
          DO NOT list candidate names, skills, or details - cards will show that.
          Keep it brief and professional.`;
        }
      } else {
        const jobsList = searchResults.slice(0, 10).map((job, idx) => ({
          number: idx + 1,
          title: this.sanitizeField(job.job_title) || 'Not specified',
          company: this.sanitizeField(job.company) || 'Not specified',
          employmentType: this.sanitizeField(job.employment_type || job.location) || 'Not specified'
        }));

        if (intentType === 'general_availability') {
          const jobTitles = [...new Set(searchResults.map(job => this.sanitizeField(job.job_title) || 'Not specified'))];
          const titleList = jobTitles.map(title => `- ${title}`).join('\n');

          prompt = `User asked about available jobs (e.g., "show me available jobs", "find me a job", "what jobs are available").

We found ${resultCount} jobs total with these titles:
${titleList}

Generate a friendly, helpful response that:
1. Starts with enthusiasm: "Great news! I found some exciting opportunities for you! 😊"
2. Shows the available positions in a clear, scannable format:
   "Here are ${resultCount} position${resultCount > 1 ? 's' : ''} that might be perfect for you:

   1. **${jobTitles[0]}** at [Company]
   2. **${jobTitles[1]}** at [Company]
   [... etc]

3. Ends with: "Which position interests you most? I can give you full details about any of these jobs, or help you find something more specific!"

Make it conversational, encouraging, and action-oriented. Use emojis sparingly but effectively.`;

        } else {
          prompt = `User asked: "${userQuery}"

Found ${resultCount} ${filters.categoryName || ''} jobs. Showing first ${jobsList.length}:

${jobsList.map(j => `${j.number}. ${j.title} at ${j.company} (${j.employmentType})`).join('\n')}

Generate a response that:
1. States the number found enthusiastically ("Excellent! I found ${resultCount} ${filters.categoryName || ''} jobs for you:").
2. Lists jobs with their actual titles in a clear format.
3. Ends with: "Which job interests you most? I can give you full details about any of these positions!"

IMPORTANT:
- Use proper markdown with blank lines or double spaces at line ends.
- Keep each job entry clean and consistent.
- Be conversational, encouraging, and action-oriented.
- Make users feel excited about the opportunities.`;
        }
      }

      const response = await this.llm.invoke(prompt);
      const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);

      return content.trim();

    } catch (error) {
      console.error('Error generating AI response:', error);
      return this.getFallbackResponse(searchResults, searchMode, filters);
    }
  }

  getFallbackResponse(searchResults, searchMode, filters) {
    if (searchResults.length === 0) {
      return `I couldn't find any **${filters.categoryName || ''} ${searchMode === 'jobs' ? 'jobs' : 'candidates'}** matching your criteria right now. Don't worry though! Try asking for a different type of work, or check back later as new opportunities are added regularly! 😊`;
    }

   if (searchResults.length === 1) {
      const job = searchResults[0];
      return `Great! I found this opportunity for you:

**${job.job_title || 'Position'}** at **${job.company || 'Company'}** (${job.employment_type || 'Type not specified'})  

Would you like to know more details about this position?`;
    }

    const jobTitles = [...new Set(searchResults.map(job => job.job_title || 'Not specified'))];
    return `Excellent! I found some great opportunities for you! 😊

Here are ${searchResults.length} position${searchResults.length > 1 ? 's' : ''} that might be perfect:

${searchResults.slice(0, 20).map((job, index) => `${index + 1}. **${job.job_title || 'Position'}** at ${job.company || 'Company'}`).join('\n')}

Which position interests you most? I can give you full details about any of these jobs!`;
  }

  async performSearch(categoryId = null, excludeCategories = []) {
    let results = [];
    
    console.log('🔍 JobSeekerAgent: Starting job search with filters:', {
      categoryId,
      employmentType: this.filters.employmentType,
      location: this.filters.location,
      searchMode: this.searchMode
    });
    
    if (this.searchMode === 'jobs') {
      if (categoryId) {
        results = await this.getAvailableJobs({
          categoryId: categoryId,
          employmentType: this.filters.employmentType,
          location: this.filters.location
        });
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
    } else {
      results = await this.getJobSeekersByCategory(categoryId);
      results = this.filterJobSeekers(results);
      results = this.rankCandidates(results);
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

  filterJobSeekers(seekers) {
    return seekers.filter(seeker => {
      let matches = true;
      
      if (this.filters.employmentType && this.filters.employmentType !== 'any') {
        matches = matches && seeker.employment_type && 
          seeker.employment_type.toLowerCase().includes(this.filters.employmentType.toLowerCase());
      }
      
      if (this.filters.location) {
        matches = matches && (seeker.province || seeker.district) &&
          (seeker.province?.toLowerCase().includes(this.filters.location.toLowerCase()) ||
           seeker.district?.toLowerCase().includes(this.filters.location.toLowerCase()));
      }
      
      return matches;
    });
  }

  rankCandidates(candidates) {
    return candidates.sort((a, b) => {
      if (a.verification_badge && !b.verification_badge) return -1;
      if (!a.verification_badge && b.verification_badge) return 1;
      
      const aComplete = this.calculateProfileCompleteness(a);
      const bComplete = this.calculateProfileCompleteness(b);
      return bComplete - aComplete;
    }).slice(0, 20);
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
        // Check if API token is available
        if (!this.API_TOKEN) {
            return {
                type: 'error',
                message: 'Authentication required. Please provide an API token.',
                code: 'NO_TOKEN'
            };
        }

        const lowerMsg = userMessage.toLowerCase().trim();

        // Use LLM for intent analysis instead of keyword matching
        const shouldHandle = await this.shouldHandleQuery(userMessage);
        if (!shouldHandle) {
            console.log('[JobSeekerAgent] Query rejected by LLM analysis');
            return null;
        }

        if (this.hasActiveSearch && this.lastSearchResults.length > 0) {
            const detailsMatch = lowerMsg.match(/(?:more\s+)?details?\s*(?:about|on|for|of)?\s*(?:job\s*)?(\d+)?/i);
            const moreMatch = lowerMsg.match(/(?:yes|sure|okay|ok|show|tell|give)\s*(?:me)?(?:\s+more)?(?:\s+details)?(?:\s+about)?(?:\s+it)?/i);
            const otherMatch = lowerMsg.match(/(?:other|another|different)\s+(?:job|position)/i);

            let jobIndex = -1;
            let selectedJob = null;
            let isTitleSelection = false;

            selectedJob = this.lastSearchResults.find((job, index) => {
                if (job.job_title) {
                    const jobTitleLower = job.job_title.toLowerCase();
                    if (lowerMsg === jobTitleLower || lowerMsg.includes(jobTitleLower) || jobTitleLower.includes(lowerMsg.split(' ')[0])) {
                        jobIndex = index;
                        isTitleSelection = true;
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
                    this.searchMode,
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
                    message: aiResponse,
                    searchMode: this.searchMode
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
                        this.searchMode,
                        { ...this.filters, excludeCategories: currentJobTitles },
                        { intentType: 'other_jobs' }
                    );

                    this.lastSearchResults = otherJobs;

                    return {
                        type: 'results',
                        data: otherJobs,
                        jobs: otherJobs,
                        message: aiResponse,
                        searchMode: this.searchMode
                    };
                }
            }
        }

        if (!this.categoriesLoaded) {
            await this.loadCategories();
        }

        if (this.categories.length === 0) {
            return null;
        }

        const extractedFilters = await this.extractFiltersFromQuery(userMessage);
        this.searchMode = extractedFilters.searchType === 'job_seekers' ? 'job_seekers' : 'jobs';

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
                this.searchMode,
                {},
                { intentType: extractedFilters.intentType }
            );

            return {
                type: 'results',
                data: results,
                jobs: results,
                message: aiResponse,
                searchMode: this.searchMode
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
                this.searchMode,
                extractedFilters,
                { intentType: 'other_jobs' }
            );

            return {
                type: 'results',
                data: results,
                jobs: results,
                message: aiResponse,
                searchMode: this.searchMode
            };
        }

        if (extractedFilters.intentType === 'job_search' && !extractedFilters.category && extractedFilters.intentType !== 'other_jobs') {
            if (this.conversationContext.awaitingCategorySelection) {
                const matchedCategory = this.matchUserInputToCategory(userMessage);
                if (matchedCategory) {
                    extractedFilters.category = matchedCategory;
                    extractedFilters.intentType = 'specific_category';
                    this.conversationContext.awaitingCategorySelection = false;
                } else {
                    return {
                        type: 'clarification',
                        message: `No worries! Let me help you find the perfect job! 😊\n\nWhat type of work interests you? Here are some popular options:\n\n• **Construction** - Building, carpentry, masonry\n• **Hospitality** - Hotels, restaurants, customer service\n• **Healthcare** - Medical, nursing, caregiving\n• **Security** - Guard positions, protection services\n• **Cleaning** - Housekeeping, janitorial work\n• **Driving** - Transport, delivery, taxi services\n\nJust tell me what you enjoy doing, and I'll search our database for matching opportunities!`,
                        data: this.categories
                    };
                }
            } else {
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
        }

        if (extractedFilters.intentType === 'candidate_details') {
            let candidate = null;
            
            if (extractedFilters.candidateIndex && this.lastSearchResults && this.lastSearchResults.length > 0) {
                const index = extractedFilters.candidateIndex - 1;
                if (index >= 0 && index < this.lastSearchResults.length) {
                    candidate = this.lastSearchResults[index];
                }
            } else if (extractedFilters.candidateName) {
                candidate = await this.getCandidateDetails(extractedFilters.candidateName);
            }
            
            if (!candidate) {
                return {
                    type: 'clarification',
                    message: `I couldn't find details for that candidate. Could you specify which candidate you'd like to know more about? You can say "candidate 1" or use their name.`
                };
            }
            
            const aiResponse = await this.generateCandidateProfile(candidate);
            
            return {
                type: 'candidate_profile',
                data: candidate,
                message: aiResponse,
                searchMode: 'job_seekers'
            };
        }

        if (extractedFilters.intentType === 'specific_category' && !extractedFilters.category) {
            const categoriesList = this.categories.slice(0, 8)
                .map((cat, idx) => `${idx + 1}. **${cat.name}**`)
                .join('\n');
            
            return {
                type: 'clarification',
                message: `I searched for "${userMessage}" jobs but couldn't find that specific category in our database. 😊\n\nHere are the job categories we currently have:\n\n${categoriesList}\n\nWhich of these interests you? Or I can show you all available jobs!`,
                data: this.categories
            };
        }

        if (!extractedFilters.category && extractedFilters.intentType !== 'other_jobs' && extractedFilters.intentType !== 'job_search' && extractedFilters.intentType !== 'specific_category') {
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
            this.searchMode,
            this.filters,
            { intentType: extractedFilters.intentType }
        );

        const formattedData = this.searchMode === 'job_seekers' 
            ? results.slice(0, 20).map(candidate => this.formatCandidateForCard(candidate))
            : results.slice(0, 20).map(job => this.formatJobForCard(job));

        console.log('🔍 JobSeekerAgent Results:', {
            searchMode: this.searchMode,
            resultCount: results.length,
            formattedCount: formattedData.length,
            hasCandidates: this.searchMode === 'job_seekers'
        });

        this.lastSearchResults = results;
        this.conversationContext.lastCandidates = formattedData;

        return {
            type: 'results',
            data: formattedData,
            jobs: this.searchMode === 'jobs' ? formattedData : undefined,
            candidates: this.searchMode === 'job_seekers' ? formattedData : undefined,
            message: aiResponse,
            searchMode: this.searchMode,
            hasMoreResults: results.length > 20
        };

    } catch (error) {
        console.error('Error processing message:', error);
        
        // Handle authentication errors specifically
        if (error instanceof APIError && error.code === 'AUTH_ERROR') {
            return {
                type: 'error',
                message: 'Your session has expired. Please refresh the page and try again.',
                code: 'AUTH_ERROR'
            };
        }
        
        return null;
    }
}

  formatJobForCard(job) {
    return {
      id: job.id || job.job_id || Math.random().toString(320).substr(2, 9),
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
      bio: candidate.bio || null
    };
  }

  async getCandidateDetails(candidateName) {
    try {
      const candidates = await this.getJobSeekersByCategory(null);
      
      const candidate = candidates.find(c => 
        `${c.first_name} ${c.last_name}`.toLowerCase().includes(candidateName.toLowerCase()) ||
        candidateName.toLowerCase().includes(c.first_name.toLowerCase())
      );
      
      return candidate || null;
    } catch (error) {
      console.error('Error fetching candidate details:', error);
      return null;
    }
  }

  getCategoryName(categoryId) {
    if (!categoryId || !this.categories || this.categories.length === 0) {
      return null;
    }
    const category = this.categories.find(c => c.id === categoryId);
    return category ? category.name : null;
  }

  async generateCandidateProfile(candidate) {
    try {
      const hasExperience = candidate.experience && candidate.experience.trim() !== '';
      const hasSkills = candidate.skills && candidate.skills.trim() !== '';
      const hasBio = candidate.bio && candidate.bio.trim() !== '';
      const hasContact = candidate.email || candidate.phone;
      
      const isComplete = hasExperience || hasSkills || hasBio;
      
      if (!isComplete) {
        return `Unfortunately, **${candidate.first_name} ${candidate.last_name}**'s profile is not fully complete yet. 

**Available Information:**
- **Name:** ${candidate.first_name} ${candidate.last_name}
- **Category:** ${this.getCategoryName(candidate.categories_id) || 'Not specified'}
- **Location:** ${candidate.district || candidate.province || 'Not specified'}
${candidate.email ? `- **Email:** ${candidate.email}` : ''}
${candidate.phone ? `- **Phone:** ${candidate.phone}` : ''}
${candidate.verification_badge ? '- **Status:** ✓ Verified Professional' : ''}

I recommend contacting them directly to learn more about their experience and qualifications.`;
      }
      
      const prompt = `Generate a professional candidate profile summary.

Candidate Data:
- Name: ${candidate.first_name} ${candidate.last_name}
- Category: ${this.getCategoryName(candidate.categories_id) || 'Not specified'}
- Location: ${candidate.district || candidate.province || 'Not specified'}
- Email: ${candidate.email || 'Not provided'}
- Phone: ${candidate.phone || 'Not provided'}
- Verification: ${candidate.verification_badge ? 'Verified' : 'Not verified'}
${hasBio ? `- Bio: ${candidate.bio}` : ''}
${hasExperience ? `- Experience: ${candidate.experience}` : ''}
${hasSkills ? `- Skills: ${candidate.skills}` : ''}

Generate a response that:
1. Starts with: "Here's the complete profile for **${candidate.first_name} ${candidate.last_name}**:"
2. Shows information in this markdown format:

**Name:** [Name]
**Category:** [Category]
**Location:** [Location]
**Contact:** [Email] | [Phone]
${candidate.verification_badge ? '**Status:** ✓ Verified Professional' : ''}

${hasExperience ? '**Experience:**\n[Experience details]' : ''}

${hasSkills ? '**Skills:**\n[List skills clearly]' : ''}

${hasBio ? '**About:**\n[Bio]' : ''}

3. End with: "Would you like to contact this candidate or see other options?"

Keep it professional, well-formatted, and easy to read.`;

      const response = await this.llm.invoke(prompt);
      const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
      
      return content.trim();
      
    } catch (error) {
      console.error('Error generating candidate profile:', error);
      return `I found **${candidate.first_name} ${candidate.last_name}**, but I'm having trouble accessing their complete profile right now. Please try again or contact them directly at ${candidate.email || candidate.phone || 'the contact information on their profile'}.`;
    }
  }
}

module.exports = { JobSeekerAgent, APIError, ValidationError };