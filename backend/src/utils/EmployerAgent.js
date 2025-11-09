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

class EmployerAgent {
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
      throw new ValidationError('Invalid API token provided');
    }
    this.API_TOKEN = apiToken.trim();
  }

  validateEnvironment() {
    this.JOB_CATEGORIES_API = process.env.JOB_CATEGORIES_API;
    this.JOB_SEEKERS_BY_CATEGORY_API = process.env.JOB_SEEKERS_BY_CATEGORY_API;

    const requiredVars = {
      'JOB_CATEGORIES_API': this.JOB_CATEGORIES_API,
      'JOB_SEEKERS_BY_CATEGORY_API': this.JOB_SEEKERS_BY_CATEGORY_API
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
        temperature: 0.7,
        maxTokens: 800,
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
    this.allMatchedCandidates = [];
    this.totalMatchedCount = 0;
    this.currentOffset = 0;
    this.hasActiveSearch = false;
    this.conversationContext = {
      lastQuery: null,
      lastFilters: null,
      showedSummary: false,
      askedForDetails: false,
      selectedCandidateIndex: null,
      lastSearchType: null,
      lastEmployerIntent: false,
      isEmailRequest: false,
    };
  }

  async fetchWithToken(url, options = {}) {
    if (!this.API_TOKEN) {
      throw new APIError('API token not provided. Please authenticate first.', 'NO_TOKEN');
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
        throw new APIError('Authentication failed: Invalid or expired token', 'AUTH_ERROR');
      }

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new APIError(`Request failed with status ${res.status}: ${text}`, 'FETCH_ERROR');
      }

      const data = await res.json().catch(() => null);
      return data;
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError(`Network error: ${error.message}`, 'NETWORK_ERROR');
    }
  }

  async getJobCategories() {
    try {
      const data = await this.fetchWithToken(this.JOB_CATEGORIES_API);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Failed to fetch job categories:', error.message);
      throw new APIError(`Unable to retrieve job categories: ${error.message}`);
    }
  }

  async loadCategories() {
    if (this.categoriesLoaded) return;
    try {
      this.categories = await this.getJobCategories();
      this.categoriesLoaded = true;
    } catch (error) {
      console.warn('[EmployerAgent] loadCategories failed:', error.message);
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
    const lower = (userMessage || '').toLowerCase();
    
    // Check for email writing help requests
    const emailWritingKeywords = [
      'write email', 'draft email', 'help me write', 'compose email',
      'email template', 'email draft', 'prepare email', 'need to email',
      'help write an email', 'write an email', 'email to candidate',
      'email to', 'send email', 'create email'
    ];
    const isEmailWritingRequest = emailWritingKeywords.some(kw => lower.includes(kw));
    
    if (isEmailWritingRequest) {
      this.conversationContext.lastEmployerIntent = true;
      this.conversationContext.isEmailRequest = true;
      return true;
    }
    
    // Block job seeker queries
    const jobSeekerIndicators = [
      'i need a job', 'find me a job', 'looking for work', 
      'where can i work', 'apply for', 'submit my cv', 
      'my cv', 'my resume', 'i want to apply', 'hire me',
      'i am looking for', 'i want a job', 'looking for employment'
    ];
    if (jobSeekerIndicators.some(p => lower.includes(p))) {
      this.hasActiveSearch = false;
      this.conversationContext.lastEmployerIntent = false;
      return false;
    }

    // Build conversation context
    const recentHistory = conversationHistory.slice(-6).map(msg => 
      `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content.substring(0, 200)}`
    ).join('\n');

    const prompt = `
You are a strict classifier for an EMPLOYER candidate search agent.

CRITICAL RULES:
1. ONLY handle messages with SPECIFIC hiring requirements (role, location, skills, etc.)
2. General questions like "I want to hire talent" or "How do I search?" should go to general chat
3. Follow-up requests (yes/more/show more) ONLY if there's an active search session

Recent conversation:
${recentHistory || 'No previous context'}

Current message: """${userMessage}"""

Previous employer intent: ${this.conversationContext.lastEmployerIntent}
Has active search: ${this.hasActiveSearch}

Examples that SHOULD be handled by this agent:
- "Find me a driver in Kigali"
- "I need a software developer with 5 years experience"
- "Looking for part-time cleaners in the north"
- "Show me more candidates" (ONLY if hasActiveSearch is true)

Examples that should NOT be handled (send to general chat):
- "I want to hire a talent" (too vague, no specifics)
- "How do I search for qualified candidates?" (informational)
- "What can you help me with?" (general question)
- "I need someone to work for me" (no specifics)

Return JSON only:
{
  "shouldHandle": true|false,
  "hasSpecificRequirements": true|false,
  "isFollowUp": true|false,
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
        this.conversationContext.lastEmployerIntent = false;
        return false;
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // For follow-ups, check if we have active search
      if (parsed.isFollowUp) {
        const shouldHandle = this.hasActiveSearch && this.conversationContext.lastEmployerIntent;
        if (!shouldHandle) {
          this.conversationContext.lastEmployerIntent = false;
        }
        return shouldHandle;
      }
      
      // Only handle if there are specific requirements
      const shouldHandle = parsed.shouldHandle === true && parsed.hasSpecificRequirements === true;
      this.conversationContext.lastEmployerIntent = shouldHandle;
      return shouldHandle;
      
    } catch (err) {
      console.warn('[EmployerAgent] shouldHandleQuery LLM error:', err.message);
      this.conversationContext.lastEmployerIntent = false;
      return false;
    }
  }

  async extractFiltersFromQuery(userQuery, conversationHistory = []) {
    await this.loadCategories();
    
    const recentHistory = conversationHistory.slice(-6).map(msg => 
      `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content.substring(0, 200)}`
    ).join('\n');

    const categoriesList = this.categories.map(c => `${c.name}`).join(', ');

    const prompt = `
Extract search filters for candidate search based on the conversation.

Recent conversation:
${recentHistory || 'No previous context'}

Current message: """${userQuery}"""

Available categories: ${categoriesList}

Return JSON only:
{
  "role": "specific role or null",
  "location": "specific location or null",
  "employmentType": "full-time | part-time | remote | contract | null",
  "categoryName": "exact category from list or null",
  "maxResults": number or null,
  "isRequestForMore": true|false,
  "hasAtLeastOneFilter": true|false
}

Set hasAtLeastOneFilter to true ONLY if at least one of: role, location, employmentType, or categoryName is provided.
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
          hasAtLeastOneFilter: false 
        };
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const categoryName = parsed.categoryName || null;
      const categoryId = categoryName ? this.findCategoryIdByName(categoryName) : null;

      const filters = {
        role: parsed.role || null,
        location: parsed.location || null,
        employmentType: parsed.employmentType || null,
        categoryName,
        categoryId,
        maxResults: parsed.maxResults || null,
        isRequestForMore: parsed.isRequestForMore || false,
        hasAtLeastOneFilter: parsed.hasAtLeastOneFilter || false,
      };

      if (filters.isRequestForMore && this.conversationContext.lastFilters) {
        return { ...this.conversationContext.lastFilters, isRequestForMore: true };
      }

      return filters;
    } catch (err) {
      console.warn('[EmployerAgent] extractFiltersFromQuery LLM error:', err.message);
      
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
        hasAtLeastOneFilter: false 
      };
    }
  }

  async generateResponseMessage(filters, totalFound, showingCount, isLoadMore = false, searchPerformed = true) {
    let context = '';
    
    if (isLoadMore) {
      const remaining = totalFound - this.currentOffset;
      context = `You just showed ${showingCount} more candidates. ${remaining > 0 ? `There are ${remaining} more available.` : 'No more candidates available.'}`;
    } else if (searchPerformed) {
      context = `Search results: Found ${totalFound} candidates total. Showing ${showingCount}.`;
      if (filters.role) context += ` Role: ${filters.role}.`;
      if (filters.location) context += ` Location: ${filters.location}.`;
      if (filters.employmentType) context += ` Type: ${filters.employmentType}.`;
    } else {
      context = `No search performed. Filters are insufficient.`;
    }

    const prompt = `
You are a helpful hiring assistant. Generate a natural, conversational response.

Context: ${context}

Guidelines:
- Be enthusiastic and helpful
- Keep it concise (2-3 sentences max)
- If showing results, mention key details naturally
- If more results available, ask if they want to see more
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
      console.warn('[EmployerAgent] generateResponseMessage error:', err.message);
      // Fallback to simple message
      if (isLoadMore) {
        return `Here ${showingCount === 1 ? 'is' : 'are'} ${showingCount} more candidate${showingCount > 1 ? 's' : ''}.`;
      }
      return `I found ${totalFound} candidate${totalFound > 1 ? 's' : ''} matching your criteria.`;
    }
  }

  async generateClarificationMessage(userQuery, filters) {
    const prompt = `
You are a helpful hiring assistant. The user wants to find candidates but hasn't provided enough details.

User query: "${userQuery}"

Current filters:
- Role: ${filters.role || 'not specified'}
- Location: ${filters.location || 'not specified'}
- Employment type: ${filters.employmentType || 'not specified'}

Generate a friendly message (2-3 sentences) asking for more specific information about what they're looking for. 
Be conversational and helpful. Suggest what details would be helpful (role, location, experience level, etc.).

Generate ONLY the response message, no JSON:
`;

    try {
      const response = await Promise.race([
        this.llm.invoke(prompt),
        new Promise((_, reject) => setTimeout(() => reject(new Error('LLM timeout')), 5000))
      ]);

      return this._extractTextFromLLMResponse(response).trim();
    } catch (err) {
      console.warn('[EmployerAgent] generateClarificationMessage error:', err.message);
      return `I'd be happy to help you find candidates! Could you tell me more about what you're looking for? For example, what role or position, preferred location, or employment type?`;
    }
  }

  async performSearch(filters = {}, isLoadMore = false) {
    const maxResultsRequested = filters.maxResults ? Number(filters.maxResults) : 6;
    const maxResults = Math.min(Math.max(1, maxResultsRequested), 50);
    const batchSize = 6;
    
    if (isLoadMore && this.allMatchedCandidates.length > 0) {
      const nextBatch = this.allMatchedCandidates.slice(
        this.currentOffset, 
        this.currentOffset + batchSize
      );
      
      this.currentOffset += batchSize;
      this.lastSearchResults = nextBatch;
      
      return nextBatch.map(c => this.formatCandidateForCard(c));
    }

    let candidates = [];

    try {
      if (filters.categoryId) {
        const qsObj = {};
        if (filters.location) qsObj.location = filters.location;
        if (filters.role) qsObj.role = filters.role;
        if (filters.employmentType) qsObj.employmentType = filters.employmentType;
        qsObj.limit = 100;

        const q = qs.stringify(qsObj);
        const url = `${this.JOB_SEEKERS_BY_CATEGORY_API.replace(/\/+$/, '')}/${filters.categoryId}${q ? '?' + q : ''}`;
        const data = await this.fetchWithToken(url);
        candidates = Array.isArray(data) ? data : [];
      } else {
        for (const cat of this.categories) {
          try {
            const url = `${this.JOB_SEEKERS_BY_CATEGORY_API.replace(/\/+$/, '')}/${cat.id}`;
            const data = await this.fetchWithToken(url);
            if (Array.isArray(data) && data.length) candidates.push(...data);
            if (candidates.length >= 100) break;
          } catch (err) {
            console.warn(`[EmployerAgent] skipped category ${cat.id}:`, err.message);
            continue;
          }
        }
      }
    } catch (err) {
      console.warn('[EmployerAgent] performSearch fetch error:', err.message);
      candidates = [];
    }

    if (!Array.isArray(candidates)) candidates = [];

    const filtered = candidates.filter(c => {
      if (filters.location) {
        const locLower = String(filters.location).toLowerCase();
        const candidateLocations = [c.province, c.district, c.city, c.location, c.address]
          .filter(Boolean).map(x => String(x).toLowerCase());
        const locMatches = candidateLocations.some(cl => cl.includes(locLower) || locLower.includes(cl));
        if (!locMatches) return false;
      }

      if (filters.employmentType) {
        const want = String(filters.employmentType).toLowerCase();
        const candidateTypes = [c.employment_type, c.availability, c.job_type]
          .filter(Boolean).map(x => String(x).toLowerCase()).join(' ');
        if (candidateTypes && !candidateTypes.includes(want)) return false;
      }

      if (filters.role) {
        const wantRole = String(filters.role).toLowerCase();
        const candidateText = [c.title, c.first_name, c.last_name, c.bio, c.skills, c.experience, c.profession, c.summary]
          .filter(Boolean).map(x => String(x).toLowerCase()).join(' ');
        if (!candidateText.includes(wantRole)) {
          if (!candidateText.split(/\s+/).some(t => t.includes(wantRole) || wantRole.includes(t))) {
            return false;
          }
        }
      }
      return true;
    });

    const ranked = this.rankCandidates(filtered);
    this.allMatchedCandidates = ranked;
    this.totalMatchedCount = ranked.length;
    this.currentOffset = batchSize;
    
    const firstBatch = ranked.slice(0, batchSize);
    this.lastSearchResults = firstBatch;
    this.hasActiveSearch = ranked.length > 0;

    return firstBatch.map(c => this.formatCandidateForCard(c));
  }

  rankCandidates(candidates) {
    return candidates.sort((a, b) => {
      if ((a.verification_badge || 0) > (b.verification_badge || 0)) return -1;
      if ((b.verification_badge || 0) > (a.verification_badge || 0)) return 1;
      return this.calculateProfileCompleteness(b) - this.calculateProfileCompleteness(a);
    });
  }

  /**
   * Generate a professional email based on employer's request
   */
  async generateProfessionalEmail(userMessage) {
    try {
      console.log('[EmployerAgent] Generating professional email');
      
      const prompt = `You are a professional email writing assistant helping an employer write emails to candidates or other business contacts.

User request: "${userMessage}"

Generate a professional, well-structured email based on the request. The email should:
1. Have an appropriate subject line (marked as **Subject:**)
2. Include proper greeting
3. Be clear and professional
4. Include relevant details based on the context
5. Have an appropriate closing
6. Be ready to copy and use

Format:
**Subject:** [Generated Subject]

[Email Body]

Return ONLY the email, no additional commentary.`;

      const response = await this.llm.invoke(prompt);
      const emailContent = this._extractTextFromLLMResponse(response);
      
      return {
        type: 'email_draft',
        message: `📧 **Professional Email Draft**\n\n${emailContent}\n\n---\n\n✅ You can copy this email and send it to your recipient.`,
        emailContent
      };
    } catch (error) {
      console.error('[EmployerAgent] Email generation error:', error);
      return {
        type: 'error',
        message: `I encountered an issue generating the email: ${error.message}. Please try rephrasing your request.`,
        code: 'EMAIL_GENERATION_ERROR'
      };
    }
  }

  calculateProfileCompleteness(candidate) {
    const fields = ['first_name', 'last_name', 'bio', 'image', 'skills', 'experience', 'province', 'district'];
    let score = fields.reduce((acc, f) => acc + (candidate[f] ? 1 : 0), 0);
    if (candidate.verification_badge) score += 2;
    return score;
  }

  async processMessage(userMessage, conversationHistory = []) {
    try {
      if (!this.API_TOKEN) {
        throw new APIError('API token missing', 'NO_TOKEN');
      }
      
      const shouldHandle = await this.shouldHandleQuery(userMessage, conversationHistory);
      if (!shouldHandle) return null;

      // Check if this is an email writing request
      if (this.conversationContext.isEmailRequest) {
        this.conversationContext.isEmailRequest = false; // Reset flag
        return await this.generateProfessionalEmail(userMessage);
      }

      const filters = await this.extractFiltersFromQuery(userMessage, conversationHistory);
      const isLoadMore = filters.isRequestForMore || false;
      
      // If requesting more results from active search
      if (isLoadMore && this.hasActiveSearch) {
        const candidates = await this.performSearch(filters, true);
        const totalFound = this.totalMatchedCount;
        const showingCount = candidates.length;

        if (showingCount === 0) {
          this.hasActiveSearch = false;
          const message = await this.generateResponseMessage(filters, totalFound, 0, true, false);
          return {
            type: 'clarification',
            data: [],
            candidates: [],
            message,
          };
        }

        const message = await this.generateResponseMessage(filters, totalFound, showingCount, true, true);
        const hasMore = this.currentOffset < totalFound;
        
        return {
          type: 'results',
          data: candidates,
          candidates,
          message,
          searchMode: 'candidates',
          totalFound,
          showing: showingCount,
          hasMore,
          currentOffset: this.currentOffset,
        };
      }

      // Check if we have sufficient filters for a search
      if (!filters.hasAtLeastOneFilter) {
        // Not enough information to perform search - ask for clarification
        const clarificationMsg = await this.generateClarificationMessage(userMessage, filters);
        return {
          type: 'clarification',
          message: clarificationMsg,
          data: [],
          candidates: [],
        };
      }

      // Store filters and perform search
      this.conversationContext.lastFilters = filters;
      if (!filters.maxResults) filters.maxResults = 6;

      const candidates = await this.performSearch(filters, false);
      const totalFound = this.totalMatchedCount;
      const showingCount = candidates.length;

      if (showingCount === 0) {
        this.hasActiveSearch = false;
        const message = await this.generateResponseMessage(filters, 0, 0, false, true);
        return { 
          type: 'results', 
          data: [], 
          candidates: [], 
          message 
        };
      }

      const message = await this.generateResponseMessage(filters, totalFound, showingCount, false, true);
      const hasMore = this.currentOffset < totalFound;
      
      return {
        type: 'results',
        data: candidates,
        candidates,
        message,
        searchMode: 'candidates',
        totalFound,
        showing: showingCount,
        hasMore,
        currentOffset: this.currentOffset,
      };
    } catch (err) {
      console.error('[EmployerAgent] processMessage error:', err);
      this.hasActiveSearch = false;
      
      if (err instanceof APIError) {
        return {
          type: 'error',
          message: `Unable to search for candidates: ${err.message}`,
          code: err.code
        };
      }
      
      return {
        type: 'error',
        message: `Sorry, I encountered an issue while searching. Please try again.`,
        code: err.code || 'SEARCH_ERROR'
      };
    }
  }

  formatCandidateForCard(candidate) {
    return {
      id: candidate.id || candidate.users_id || null,
      users_id: candidate.users_id || candidate.id || null,
      first_name: candidate.first_name || 'Not specified',
      last_name: candidate.last_name || 'Not specified',
      image: candidate.image || null,
      profilePicture: candidate.image || null,
      bio: candidate.bio || null,
      verification_badge: candidate.verification_badge || 0,
      categories_id: candidate.categories_id || candidate.category_id || null,
      province: candidate.province || null,
      district: candidate.district || null,
      phone: candidate.phone || null,
      email: candidate.email || null,
    };
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
module.exports = { EmployerAgent, APIError, ValidationError };