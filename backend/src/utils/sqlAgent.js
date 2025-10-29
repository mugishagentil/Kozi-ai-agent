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
- "sales jobs" → intentType: "specific_category", matchedCategory: "Sales"
- "find me a job" → intentType: "job_search", matchedCategory: null
- "available jobs" → intentType: "general_availability", matchedCategory: null
- "software engineering" → intentType: "specific_category", matchedCategory: "IT"
- "tell me more about job 1" → intentType: "details_request"

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

MUST REJECT (shouldHandle: false) these scenarios:
- Employer/recruiter queries: "hire", "recruit", "find talent", "need workers", "looking for candidates", "I want to hire"
- Simple greetings: "hi", "hello", "hey", "good morning"
- Casual conversation unrelated to finding jobs
- Technical support issues
- Personal questions to the assistant
- Questions about the company or platform
- Completely unrelated topics

ONLY ACCEPT (shouldHandle: true) these scenarios:
- Job seeker looking for work: "find me a job", "I need work", "job openings"
- Asking about available positions: "what jobs are available", "show me jobs"
- Specific job searches: "sales jobs", "IT positions", "construction work"
- Job categories inquiry: "what types of jobs", "job categories"
- Follow-up questions about previously shown jobs
- Job details requests: "tell me about job 1", "more details"

Return JSON: {"shouldHandle": true/false, "reason": "brief explanation"}

Examples:
- "find me a job" → {"shouldHandle": true, "reason": "job seeker looking for work"}
- "I want to hire someone" → {"shouldHandle": false, "reason": "employer query, not job seeker"}
- "show me candidates" → {"shouldHandle": false, "reason": "recruiter/employer request"}
- "I need workers" → {"shouldHandle": false, "reason": "hiring request"}
- "hello" → {"shouldHandle": false, "reason": "greeting"}
- "what jobs are available" → {"shouldHandle": true, "reason": "job seeker asking about positions"}
- "sales positions" → {"shouldHandle": true, "reason": "specific job search"}
- "how are you" → {"shouldHandle": false, "reason": "casual conversation"}

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
      
      const lowerMsg = userMessage.toLowerCase().trim();
      
      // Reject employer/recruiter keywords
      const employerKeywords = ['hire', 'recruit', 'talent', 'candidate', 'worker', 'employee', 'staff'];
      if (employerKeywords.some(kw => lowerMsg.includes(kw))) {
        console.log('[JobSeekerAgent] Fallback: Rejected as employer query');
        return false;
      }
      
      // Reject greetings
      const greetings = ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'];
      if (greetings.some(greet => lowerMsg === greet || lowerMsg === greet + '!')) {
        console.log('[JobSeekerAgent] Fallback: Rejected as greeting');
        return false;
      }
      
      // Accept if we have an active search
      if (this.hasActiveSearch) {
        const followUpKeywords = ['more', 'details', 'yes', 'show', 'tell', 'which', 'what', 'number', 'other'];
        if (followUpKeywords.some(kw => lowerMsg.includes(kw))) {
          console.log('[JobSeekerAgent] Fallback: Accepted as follow-up query');
          return true;
        }
      }
      
      // Accept job seeker keywords
      const jobSeekerKeywords = ['job', 'work', 'position', 'employment', 'opening', 'opportunity'];
      if (jobSeekerKeywords.some(kw => lowerMsg.includes(kw))) {
        console.log('[JobSeekerAgent] Fallback: Accepted as job seeker query');
        return true;
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

async generateAIResponse(userQuery, searchResults, filters, context = {}) {
  try {
    const resultCount = searchResults.length;
    const { intentType, askedForDetails } = context;

    let prompt = '';

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

**Job Title:** ${jobData.title}  
**Company:** ${jobData.company}  
**Employment Type:** ${jobData.employmentType}  

**Description:**  
${jobData.description || 'Not specified'}

**Requirements:**  
${jobData.requirements ? jobData.requirements.split('\n').map(line => `- ${line.trim()}`).join('\n') : 'Not specified'}

**Responsibilities:**  
${jobData.responsibilities ? jobData.responsibilities.split('\n').map(line => `- ${line.trim()}`).join('\n') : 'Not specified'}

${jobData.additionalInfo ? `**Additional Information:**\n${jobData.additionalInfo}\n\n` : ''}
${jobData.postedDate ? `**Posted:** ${this.formatDate(jobData.postedDate)}\n\n` : ''}
${jobData.deadline ? `**Deadline:** ${this.formatDate(jobData.deadline)}` : ''}

End with: "Let me know if you need help with applying!"

IMPORTANT:
- Always use the provided company name: "${jobData.company}"
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
   "The job available is from **${jobData.company}**, it is **${jobData.employmentType}**. 
   ${jobData.salaryMin && jobData.salaryMax && jobData.salaryMin !== 1 && jobData.salaryMax !== 1 ? `The salary range is between **${jobData.salaryMin} and ${jobData.salaryMax}**.` : 'The salary details will be provided during the application process.'}"
3. Ends with: "If you need to know more details, let me know, I'm happy to help."

Be professional and conversational. Use the exact company name: "${jobData.company}".`;
      }

    } else {
      // MULTIPLE JOBS - Use actual company names from searchResults
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
        // Use actual job details with company names
        const jobDetails = searchResults.slice(0, 10).map((job, idx) => {
          const companyName = this.sanitizeField(job.company) || 'Company';
          return {
            number: idx + 1,
            title: this.sanitizeField(job.job_title) || 'Not specified',
            company: companyName
          };
        });

        prompt = `User asked about available jobs (e.g., "show me available jobs", "find me a job", "what jobs are available").

We found ${resultCount} jobs total. Showing first ${jobDetails.length}:

${jobDetails.map(j => `${j.number}. **${j.title}** at ${j.company}`).join('\n')}

Generate a friendly, helpful response that:
1. Starts with enthusiasm
2. Shows the available positions in a clear, scannable format using the EXACT job titles and company names from above
3. Ends with: "Which position interests you most? I can give you full details about any of these jobs, or help you find something more specific!"

CRITICAL: Use the exact company names and job titles from the list above. Do not use [Company] placeholder.

Make it conversational, encouraging, and action-oriented. Use emojis sparingly but effectively.`;

      } else {
        prompt = `User asked: "${userQuery}"

Found ${resultCount} ${filters.categoryName || ''} jobs. Showing first ${jobsList.length}:

${jobsList.map(j => `${j.number}. ${j.title} at ${j.company} (${j.employmentType})`).join('\n')}

Generate a response that:
1. States the number found enthusiastically ("Excellent! I found ${resultCount} ${filters.categoryName || ''} jobs for you:").
2. Lists jobs EXACTLY as shown above with their actual titles and company names
3. Ends with: "Which job interests you most? I can give you full details about any of these positions!"

IMPORTANT:
- Use proper markdown with blank lines or double spaces at line ends
- Keep each job entry clean and consistent
- Use the REAL company names from the list - do not use [Company] placeholder
- Be conversational, encouraging, and action-oriented
- Make users feel excited about the opportunities`;

      }
    }

    const response = await this.llm.invoke(prompt);
    const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);

    return content.trim();

  } catch (error) {
    console.error('Error generating AI response:', error);
  }
}

getFallbackResponse(searchResults, filters) {
  if (searchResults.length === 0) {
    return `I couldn't find any **${filters.categoryName || ''} jobs** matching your criteria right now. Don't worry though! Try asking for a different type of work, or check back later as new opportunities are added regularly! 😊`;
  }

  if (searchResults.length === 1) {
    const job = searchResults[0];
    const companyName = this.sanitizeField(job.company) || 'Company';
    return `Great! I found this opportunity for you:

**${job.job_title || 'Position'}** at **${companyName}** (${job.employment_type || 'Type not specified'})  

Would you like to know more details about this position?`;
  }

  // Use actual company names in the fallback response
  return `Excellent! I found some great opportunities for you! 😊

Here are ${searchResults.length} position${searchResults.length > 1 ? 's' : ''} that might be perfect:

${searchResults.slice(0, 10).map((job, index) => {
  const companyName = this.sanitizeField(job.company) || 'Company';
  return `${index + 1}. **${job.job_title || 'Position'}** at ${companyName}`;
}).join('\n')}

Which position interests you most? I can give you full details about any of these jobs!`;
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
        return null;
      }

      const extractedFilters = await this.extractFiltersFromQuery(userMessage);

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
      
      return null;
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