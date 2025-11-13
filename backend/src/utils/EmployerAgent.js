const { ChatOpenAI } = require('@langchain/openai');
const qs = require('querystring');

// Comprehensive category synonym mapping for accurate job matching
const CATEGORY_SYNONYMS = {
  // SUPPORT WORKER CATEGORIES
  'Pet Sitters': ['animal caretaker', 'dog walker', 'pet care assistant', 'pet nanny', 'animal sitter', 'pet groomer', 'pet sitter'],
  'Other': ['general worker', 'casual worker', 'unclassified role', 'miscellaneous job', 'helper', 'labor support'],
  'Customer Service Representative': ['client support agent', 'call center agent', 'helpdesk officer', 'customer care assistant', 'frontline support', 'service agent', 'customer service'],
  'Data Entry Clerk': ['typist', 'data encoder', 'office clerk', 'record entry officer', 'admin assistant', 'computer operator', 'data entry'],
  'Construction Worker': ['builder', 'mason', 'site laborer', 'construction assistant', 'bricklayer', 'general laborer', 'construction'],
  'Driver': ['chauffeur', 'transport operator', 'delivery driver', 'personal driver', 'vehicle operator', 'motorist'],
  'Security Guard': ['watchman', 'security officer', 'night guard', 'gatekeeper', 'security personnel', 'bouncer', 'security'],
  'Salesperson': ['sales agent', 'sales representative', 'marketer', 'shop attendant', 'retail clerk', 'promoter', 'sales'],
  'Waiter': ['waitress', 'restaurant server', 'food attendant', 'hospitality staff', 'restaurant assistant', 'steward', 'service staff'],
  'Warehouse Worker': ['storekeeper', 'loader', 'stock handler', 'warehouse assistant', 'inventory staff', 'packer', 'warehouse'],
  'Farmer': ['agricultural worker', 'farmhand', 'crop grower', 'farm assistant', 'livestock keeper', 'agric worker'],
  'Housekeeper': ['maid', 'domestic worker', 'cleaner', 'home attendant', 'household helper', 'caretaker'],
  'Hairdresser': ['barber', 'stylist', 'salon worker', 'beautician', 'hair stylist', 'grooming specialist'],
  'Babysitter': ['nanny', 'childcare worker', 'caregiver', 'child minder', 'domestic nanny', 'daycare assistant'],
  'Machine Operator': ['equipment operator', 'production worker', 'factory worker', 'plant operator', 'machine technician'],
  'Cleaners': ['janitor', 'sanitation worker', 'hygiene attendant', 'house cleaner', 'office cleaner', 'custodian'],
  'Manpower': ['laborer', 'workforce staff', 'skilled worker', 'factory labor', 'general staff', 'human resource support'],
  
  // WHITE-COLLAR WORKER CATEGORIES
  'Accountant': ['bookkeeper', 'finance officer', 'accounts clerk', 'auditor', 'financial analyst', 'payroll officer', 'accounting assistant'],
  'Doctors': ['physician', 'medical practitioner', 'health officer', 'general practitioner', 'gp', 'medical specialist', 'clinician', 'doctor'],
  'Lawyer': ['attorney', 'legal advisor', 'advocate', 'legal consultant', 'solicitor', 'barrister'],
  'Architect': ['building designer', 'construction planner', 'structural designer', 'urban planner', 'design engineer'],
  'Teacher': ['educator', 'instructor', 'tutor', 'lecturer', 'trainer', 'academic staff', 'mentor'],
  'Project Manager': ['program coordinator', 'project supervisor', 'operations manager', 'project lead', 'implementation manager'],
  'Human Resources Officer': ['hr assistant', 'people & culture officer', 'recruitment officer', 'talent manager', 'hr specialist', 'human resources'],
  'Marketing Specialist': ['marketing officer', 'brand manager', 'sales & marketing executive', 'digital marketer', 'promotions coordinator', 'marketing'],
  'Software Developer': ['programmer', 'software engineer', 'web developer', 'app developer', 'coder', 'it developer', 'developer'],
  'Chef': ['cook', 'culinary expert', 'kitchen supervisor', 'head cook', 'culinary specialist', 'pastry chef'],
  'Graphic designer': ['graphic designer', 'visual designer', 'creative designer', 'graphics'],
};

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
      isHiringProcessRequest: false,
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

  /**
   * Find category by matching user query against synonyms
   * Returns the category name if a synonym match is found
   */
  findCategoryBySynonym(userQuery) {
    if (!userQuery) return null;
    
    const queryLower = String(userQuery).toLowerCase().trim();
    
    // First, try exact category name match
    const exactMatch = this.categories.find(c => 
      (c.name || '').toLowerCase() === queryLower || 
      (c.displayName || '').toLowerCase() === queryLower
    );
    if (exactMatch) return exactMatch.name;
    
    // Then check synonyms
    for (const [categoryName, synonyms] of Object.entries(CATEGORY_SYNONYMS)) {
      // Check if query contains any synonym or if any synonym contains the query
      const matchFound = synonyms.some(synonym => {
        const synLower = synonym.toLowerCase();
        // Exact match
        if (queryLower === synLower) return true;
        // Query contains the synonym (e.g., "need a nanny" contains "nanny")
        if (queryLower.includes(synLower)) return true;
        // Synonym contains the query (e.g., "data entry" matches "data entry clerk")
        if (synLower.includes(queryLower) && queryLower.length >= 4) return true;
        return false;
      });
      
      if (matchFound) {
        console.log(`[EmployerAgent] 🎯 Matched "${userQuery}" to category "${categoryName}" via synonyms`);
        return categoryName;
      }
    }
    
    return null;
  }

  async shouldHandleQuery(userMessage, conversationHistory = []) {
    const lower = (userMessage || '').toLowerCase();
    
    // Check for hiring process information requests
    const hiringProcessKeywords = [
      'hiring process', 'how to hire', 'how can i hire', 'how do i hire',
      'process of hiring', 'steps to hire', 'hire process', 'hiring steps',
      'how does hiring work', 'how hiring works', 'hiring procedure',
      'ways to hire', 'options to hire', 'hire on kozi', 'hiring on kozi',
      'help me with hiring', 'help with hiring', 'help me hire',
      'interview process', 'hiring and interview', 'hiring interview',
      'guide to hiring', 'guide me through hiring', 'explain hiring',
      'what are the hiring steps', 'what is the hiring process'
    ];
    const isHiringProcessRequest = hiringProcessKeywords.some(kw => lower.includes(kw));
    
    if (isHiringProcessRequest) {
      this.conversationContext.lastEmployerIntent = true;
      this.conversationContext.isHiringProcessRequest = true;
      return true;
    }
    
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

**CRITICAL: Be AGGRESSIVE about extracting category names!**

When user mentions a job type/skill, ALWAYS try to match it to a category using synonyms:
- "nanny" or "childcare" → categoryName: "Babysitter"
- "maid" or "domestic worker" → categoryName: "Housekeeper"
- "chef" or "cook" → categoryName: "Chef"
- "security" or "watchman" → categoryName: "Security Guard"
- "driver" or "chauffeur" → categoryName: "Driver"
- "cleaner" or "janitor" → categoryName: "Cleaners"
- "developer" or "programmer" → categoryName: "Software Developer"
- "lawyer" or "attorney" → categoryName: "Lawyer"
- "doctor" or "physician" → categoryName: "Doctors"
- "teacher" or "tutor" → categoryName: "Teacher"
- "accountant" or "bookkeeper" → categoryName: "Accountant"
- "marketing" or "marketer" → categoryName: "Marketing Specialist"
- "sales" or "salesperson" → categoryName: "Salesperson"
- "construction" or "builder" → categoryName: "Construction Worker"

**RULES:**
1. ALWAYS extract categoryName if user mentions ANY job type/skill
2. Match to EXACT category names from the list below (case-insensitive)
3. Extract "role" for additional filtering within the category
4. If no exact match, choose the closest category

Recent conversation:
${recentHistory || 'No previous context'}

Current message: """${userQuery}"""

Available categories: ${categoriesList}

**Examples:**
User: "I need a person who can do marketing"
→ { "role": "marketing", "categoryName": "Marketing Specialist", "location": null }

User: "Find me a driver in Kigali"
→ { "role": "driver", "categoryName": "Driver", "location": "Kigali" }

User: "I need someone for sales full-time"
→ { "role": "sales", "categoryName": "Salesperson", "employmentType": "full-time" }

User: "Choose the best person for me" or "Give me the top 3"
→ { "isRecommendationRequest": true, "topN": 3 }

User: "Which candidate is better?" or "Recommend the best one"
→ { "isRecommendationRequest": true, "topN": 1 }

Return JSON only:
{
  "role": "specific role or null",
  "location": "specific location or null",
  "employmentType": "full-time | part-time | remote | contract | null",
  "categoryName": "exact category from list or null (ALWAYS try to extract this!)",
  "maxResults": number or null,
  "isRequestForMore": true|false,
  "isRecommendationRequest": true|false,
  "topN": number or null,
  "hasAtLeastOneFilter": true|false
}

**CRITICAL DETECTION RULES:**
- If user says "choose for me", "select the best", "recommend", "which one is better", "top 3", "best candidate", "just choose", "pick the best" → isRecommendationRequest: true
- Extract the number if they say "top 3", "best 5", "three best" etc. → topN: 3 or 5
- If isRecommendationRequest is true, also set isRequestForMore: false
- Set hasAtLeastOneFilter to true ONLY if at least one of: role, location, employmentType, or categoryName is provided.
`;

    try {
      const response = await Promise.race([
        this.llm.invoke(prompt),
        new Promise((_, reject) => setTimeout(() => reject(new Error('LLM timeout')), 7000))
      ]);

      const content = this._extractTextFromLLMResponse(response);
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn('[EmployerAgent] Could not extract JSON from LLM response');
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
      let categoryName = parsed.categoryName || null;
      
      // If LLM didn't extract a category, try synonym matching on the role
      if (!categoryName && parsed.role) {
        const matchedCategory = this.findCategoryBySynonym(parsed.role);
        if (matchedCategory) {
          categoryName = matchedCategory;
          console.log(`[EmployerAgent] 📝 Synonym match from role: "${parsed.role}" → "${categoryName}"`);
        }
      }
      
      // Also try matching the entire user query if still no category
      if (!categoryName) {
        const matchedCategory = this.findCategoryBySynonym(userQuery);
        if (matchedCategory) {
          categoryName = matchedCategory;
          console.log(`[EmployerAgent] 📝 Synonym match from query: "${userQuery}" → "${categoryName}"`);
        }
      }
      
      const categoryId = categoryName ? this.findCategoryIdByName(categoryName) : null;

      console.log('[EmployerAgent] 🔍 Extracted filters:', {
        role: parsed.role,
        categoryName,
        categoryId,
        location: parsed.location,
        employmentType: parsed.employmentType
      });

      const filters = {
        role: parsed.role || null,
        location: parsed.location || null,
        employmentType: parsed.employmentType || null,
        categoryName,
        categoryId,
        maxResults: parsed.maxResults || null,
        isRequestForMore: parsed.isRequestForMore || false,
        isRecommendationRequest: parsed.isRecommendationRequest || false,
        topN: parsed.topN || null,
        hasAtLeastOneFilter: parsed.hasAtLeastOneFilter || false,
      };

      if (filters.isRequestForMore && this.conversationContext.lastFilters) {
        return { ...this.conversationContext.lastFilters, isRequestForMore: true };
      }

      return filters;
    } catch (err) {
      console.error('[EmployerAgent] extractFiltersFromQuery LLM error:', {
        message: err.message,
        code: err.code,
        status: err.status,
        stack: err.stack?.substring(0, 500)
      });
      
      // If it's an OpenAI/LLM error, throw it up to be handled as an APIError
      if (err.message?.includes('OpenAI') || err.message?.includes('API') || err.code === 'ECONNREFUSED' || err.status) {
        throw new APIError(`AI service error: ${err.message}`, 'API_ERROR');
      }
      
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
        isRecommendationRequest: false,
        topN: null,
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

  async analyzeAndRecommendTopCandidates(candidates, topN = 3, filters = {}) {
    if (!candidates || candidates.length === 0) {
      return {
        recommendations: [],
        message: "I don't have any candidates to analyze at the moment. Please perform a search first."
      };
    }

    const actualTopN = Math.min(topN, candidates.length, 5); // Max 5 recommendations
    const candidateSummaries = candidates.slice(0, 20).map((c, idx) => { // Analyze top 20 only for performance
      return `
Candidate ${idx + 1}:
- Name: ${c.name || c.first_name + ' ' + c.last_name || 'Unknown'}
- Location: ${c.location || c.district || c.province || 'Not specified'}
- Skills: ${c.skills?.substring(0, 150) || c.bio?.substring(0, 100) || 'Not specified'}
- Experience: ${c.experience?.substring(0, 150) || c.summary?.substring(0, 100) || 'Not specified'}
- Verified: ${c.isVerified || c.is_verified ? 'Yes' : 'No'}
`.trim();
    }).join('\n\n');

    const prompt = `
You are an expert HR consultant helping an employer select the best candidates for a ${filters.role || 'marketing'} position${filters.location ? ` in ${filters.location}` : ''}.

**Your Task:** Analyze these candidates and recommend the TOP ${actualTopN} best matches with clear reasoning.

**Evaluation Criteria:**
1. **Relevant Experience:** How well their background matches the role
2. **Skills Quality:** Depth and relevance of listed skills
3. **Profile Completeness:** Well-written bio, clear experience
4. **Verification Status:** Verified profiles are more trustworthy
5. **Communication:** Professional presentation and clarity

**Candidates to Analyze:**
${candidateSummaries}

**Instructions:**
1. Evaluate each candidate objectively
2. Select the TOP ${actualTopN} best candidates
3. For each recommended candidate, provide:
   - Candidate number (from the list above)
   - 2-3 sentences explaining WHY they're a top choice
   - Key strengths that stand out

**Output Format (JSON):**
{
  "recommendations": [
    {
      "candidateIndex": 0,
      "name": "Candidate Name",
      "reasoning": "Clear explanation of why this person is recommended",
      "keyStrengths": ["Strength 1", "Strength 2", "Strength 3"]
    }
  ],
  "summary": "Brief 1-2 sentence overview of why these are the best choices"
}

Return ONLY valid JSON, no additional text.
`;

    try {
      const response = await Promise.race([
        this.llm.invoke(prompt),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Analysis timeout')), 10000))
      ]);

      const content = this._extractTextFromLLMResponse(response);
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error('Could not parse AI analysis response');
      }

      const analysis = JSON.parse(jsonMatch[0]);
      
      // Map the recommendations back to actual candidate objects
      const recommendedCandidates = analysis.recommendations.map(rec => {
        const candidate = candidates[rec.candidateIndex];
        return {
          ...this.formatCandidateForCard(candidate),
          aiRecommendation: {
            reasoning: rec.reasoning,
            keyStrengths: rec.keyStrengths
          }
        };
      });

      // Generate natural language message
      let message = `**🎯 Top ${actualTopN} Recommended Candidates:**\n\n`;
      
      analysis.recommendations.forEach((rec, idx) => {
        message += `**${idx + 1}. ${rec.name}**\n`;
        message += `${rec.reasoning}\n`;
        message += `**Key Strengths:** ${rec.keyStrengths.join(', ')}\n\n`;
      });
      
      message += `\n${analysis.summary}\n\n`;
      message += `You can view their full profiles and contact them directly. Would you like me to help you draft an email to any of these candidates?`;

      console.log(`[EmployerAgent] ✅ Generated ${actualTopN} recommendations with AI analysis`);
      
      return {
        recommendations: recommendedCandidates,
        message,
        analysis
      };

    } catch (err) {
      console.error('[EmployerAgent] analyzeAndRecommendTopCandidates error:', err);
      
      // Fallback: Just return top N by existing ranking
      const topCandidates = candidates.slice(0, actualTopN).map(c => this.formatCandidateForCard(c));
      return {
        recommendations: topCandidates,
        message: `Here are the top ${actualTopN} candidates from your search results. These are ranked based on profile completeness and relevance. Would you like me to analyze them in more detail?`
      };
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
        console.log(`[EmployerAgent] 🎯 Searching in specific category: ${filters.categoryName} (ID: ${filters.categoryId})`);
        
        const qsObj = {};
        if (filters.location) qsObj.location = filters.location;
        if (filters.role) qsObj.role = filters.role;
        if (filters.employmentType) qsObj.employmentType = filters.employmentType;
        qsObj.limit = 100;

        const q = qs.stringify(qsObj);
        const url = `${this.JOB_SEEKERS_BY_CATEGORY_API.replace(/\/+$/, '')}/${filters.categoryId}${q ? '?' + q : ''}`;
        const data = await this.fetchWithToken(url);
        candidates = Array.isArray(data) ? data : [];
        console.log(`[EmployerAgent] ✅ Found ${candidates.length} candidates in ${filters.categoryName} category`);
      } else {
        console.log('[EmployerAgent] ⚠️  No specific category - searching ALL categories');
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
        const candidateText = [
          c.title, c.first_name, c.last_name, c.bio, 
          c.skills, c.experience, c.profession, c.summary,
          c.category_name, c.job_title, c.specialization
        ]
          .filter(Boolean).map(x => String(x).toLowerCase()).join(' ');
        
        // Split role into keywords and check if ANY keyword matches
        const roleKeywords = wantRole.split(/\s+/);
        const hasMatch = roleKeywords.some(keyword => 
          candidateText.includes(keyword) || 
          candidateText.split(/\s+/).some(t => 
            t.includes(keyword) || keyword.includes(t)
          )
        );
        
        if (!hasMatch) return false;
      }
      return true;
    });

    console.log(`[EmployerAgent] 📊 After filtering: ${filtered.length} candidates match criteria`);

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
   * Provides detailed hiring process information
   */
  async getHiringProcessInfo() {
    return {
      type: 'hiring_process',
      message: `# 🎯 **HIRING PROCESS ON KOZI**

Kozi offers **4 ways to hire**, depending on your needs:

---

## **OPTION 1: Hire Support Workers (Domestic or Blue-Collar)**

1. From your dashboard, open the left navigation menu and click **"All Jobseekers"**
2. Use the filters to narrow down candidates by:
   - Job type (housemaid, cleaner, chef, babysitter, etc.)
   - Gender, age, experience level, location, and salary range
3. Review each profile carefully
4. Once you find someone who matches your criteria, click **"Hire"**
5. Our Kozi team will contact you within **3 business days** to finalize the placement
6. If you want clarification before hiring, click **"Quick Support"** - our team will reach out to assist
7. Kozi schedules the interview on your behalf
8. To confirm the process, you'll pay a service fee of **60,000 RWF**

---

## **OPTION 2: Fill the Residential Job Form**

If you prefer to make a direct hiring request:

1. Visit https://kozi.rw/Resedential-Job
2. Fill in the Residential Job Form with:
   - Type of worker needed
   - Work location
   - Work duration (stay-in, stay-out, part-time, etc.)
   - Expected salary and other preferences
3. Our Kozi team reviews your form and sends you qualified candidates within **3 business days**

---

## **OPTION 3: Hire or Recruit White-Collar Workers**

For companies or individuals hiring white-collar workers:

1. After registering as a Job Provider, you can **publish job opportunities** directly:
   - Go to your dashboard
   - Click **"Post a Job"**
   - Fill in job details (title, qualifications, experience, responsibilities, salary range)
   - Submit the posting for review

2. Once approved, the job post will appear on Kozi's job listings, and qualified talents can apply through your job link

3. You'll receive applications directly in your dashboard or via your registered email

4. **Important:** To post jobs and access advanced features, you must have an **active premium subscription plan**:
   - Receive unlimited applications
   - View verified candidate profiles
   - Use AI-powered matching
   - Manage multiple job posts

5. Activate premium features from your dashboard by clicking **"Upgrade Plan"**

---

## **OPTION 4: Request via Email (Manual Form)**

1. Email **info@kozi.rw** to request a Job Provider Form
2. Fill it out and send it back
3. The Kozi team will shortlist suitable candidates and contact you within **3 business days**

---

## **📋 Step 3: Interview & Confirmation**

- Kozi arranges interviews (online or in-person) with shortlisted candidates
- Once you confirm your choice, you'll proceed with the placement payment and contract finalization

---

## **✅ Step 4: Placement & Support**

- Kozi confirms the worker's start date
- The AI system updates the record to "Placed"
- Our team follows up after placement to ensure satisfaction
- If you need a replacement, Kozi will assist under the service agreement

---

## **💬 Step 5: Continuous Support**

Kozi keeps managing and verifying placed workers. You can always reach our support team through:

- Your dashboard's **Quick Support** feature
- Email: **info@kozi.rw**
- Phone: **+250 788 719 678**

---

Is there a specific hiring option you'd like to use? I can help you search for candidates right now!`,
    };
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

      // Check if this is a hiring process information request
      if (this.conversationContext.isHiringProcessRequest) {
        this.conversationContext.isHiringProcessRequest = false; // Reset flag
        return await this.getHiringProcessInfo();
      }

      // Check if this is an email writing request
      if (this.conversationContext.isEmailRequest) {
        this.conversationContext.isEmailRequest = false; // Reset flag
        return await this.generateProfessionalEmail(userMessage);
      }

      const filters = await this.extractFiltersFromQuery(userMessage, conversationHistory);
      const isLoadMore = filters.isRequestForMore || false;
      
      // Handle recommendation requests (user wants AI to analyze and select best candidates)
      if (filters.isRecommendationRequest && this.hasActiveSearch && this.allMatchedCandidates.length > 0) {
        console.log('[EmployerAgent] 🎯 Processing recommendation request');
        const topN = filters.topN || 3;
        const result = await this.analyzeAndRecommendTopCandidates(
          this.allMatchedCandidates, 
          topN, 
          this.conversationContext.lastFilters || filters
        );
        
        return {
          type: 'recommendations',
          data: result.recommendations,
          candidates: result.recommendations,
          message: result.message,
          searchMode: 'recommendations',
          totalFound: this.totalMatchedCount,
          showing: result.recommendations.length,
          hasMore: false
        };
      }
      
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
      console.error('[EmployerAgent] processMessage error:', {
        message: err.message,
        stack: err.stack,
        code: err.code,
        isAPIError: err instanceof APIError,
        isValidationError: err instanceof ValidationError
      });
      this.hasActiveSearch = false;
      
      if (err instanceof APIError) {
        return {
          type: 'error',
          message: `Unable to search for candidates: ${err.message}`,
          code: err.code,
          error: err.message
        };
      }
      
      return {
        type: 'error',
        message: `Sorry, I encountered an issue while searching. Please try again.`,
        code: err.code || 'SEARCH_ERROR',
        error: err.message
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