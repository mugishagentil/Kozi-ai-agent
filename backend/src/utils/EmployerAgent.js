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
    if (!categoryId) throw new Error('Category ID is required');
    const url = `${this.JOB_SEEKERS_BY_CATEGORY_API.replace(/\/+$/, '')}/${categoryId}`;
    return await this.fetchWithToken(url);
  }

  async loadCategories() {
    if (this.categoriesLoaded) return;
    this.categories = await this.getJobCategories();
    this.categoriesLoaded = true;
  }

  // Only handle EMPLOYER-specific queries
  async shouldHandleQuery(userMessage) {
    console.log('[EmployerAgent] Checking if query is employer-related:', userMessage);

    const text = userMessage.toLowerCase().trim();

    // Block any job seeker–type messages immediately
    const jobSeekerPhrases = [
      'i need a job', 'find me a job', 'show me jobs', 'available jobs',
      'any openings', 'apply for', 'submit my cv', 'job application'
    ];
    if (jobSeekerPhrases.some(p => text.includes(p))) return false;

    try {
      const prompt = `You are analyzing queries for an EMPLOYER assistant. 
This assistant ONLY helps employers find candidates or post jobs. 

Query: "${userMessage}"

Return JSON:
{"shouldHandle": true/false, "reason": "brief explanation", "userType": "employer|employee|unclear"}

Only handle if it's clearly from an employer (looking to hire or post jobs).`;

      const response = await Promise.race([
        this.llm.invoke(prompt),
        new Promise((_, reject) => setTimeout(() => reject(new Error('LLM timeout')), 5000))
      ]);

      const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return false;

      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.shouldHandle === true && parsed.userType === 'employer';
    } catch (error) {
      console.error('[EmployerAgent] Fallback keyword check:', error.message);

      const employerKeywords = [
        'candidate', 'worker', 'employee', 'staff', 'hire', 'recruit',
        'find workers', 'find candidates', 'post job', 'post a job', 'looking to hire'
      ];
      const isEmployer = employerKeywords.some(k => text.includes(k));
      return isEmployer; // never respond to "find me a job"
    }
  }

  async extractFiltersFromQuery(userQuery) {
    if (!this.categoriesLoaded) await this.loadCategories();

    const categoryList = this.categories.map(c => `${c.name} (ID: ${c.id})`).join(', ');

    const prompt = `Extract candidate search parameters for an employer from: "${userQuery}"

Categories: ${categoryList}

Return JSON:
{
  "matchedCategory": "exact category name or null",
  "categoryId": "ID number or null",
  "intentType": "candidate_search|specific_category|candidate_details|post_job|general_inquiry"
}`;

    const response = await this.llm.invoke(prompt);
    const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { intentType: 'unknown' };

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      category: parsed.categoryId || null,
      categoryName: parsed.matchedCategory || null,
      intentType: parsed.intentType || 'unknown'
    };
  }

  async performSearch(categoryId = null) {
    console.log('🔍 EmployerAgent: Searching for candidates, category:', categoryId);

    try {
      if (!categoryId) {
        const allCandidates = [];
        for (const category of this.categories) {
          const candidates = await this.getJobSeekersByCategory(category.id);
          allCandidates.push(...candidates);
        }
        return this.rankCandidates(allCandidates).slice(0, 20);
      }

      const candidates = await this.getJobSeekersByCategory(categoryId);
      return this.rankCandidates(candidates).slice(0, 20);
    } catch (err) {
      console.error('Candidate search failed:', err.message);
      return [];
    }
  }

  rankCandidates(candidates) {
    return candidates.sort((a, b) => {
      if (a.verification_badge && !b.verification_badge) return -1;
      if (!a.verification_badge && b.verification_badge) return 1;
      return this.calculateProfileCompleteness(b) - this.calculateProfileCompleteness(a);
    });
  }

  calculateProfileCompleteness(candidate) {
    const fields = ['first_name', 'last_name', 'email', 'phone', 'province', 'district', 'image'];
    let score = fields.reduce((acc, f) => acc + (candidate[f] ? 1 : 0), 0);
    if (candidate.verification_badge) score += 2;
    return score;
  }

  async processMessage(userMessage) {
    try {
      if (!this.API_TOKEN) {
        return { type: 'error', message: 'Please provide a valid API token to continue.', code: 'NO_TOKEN' };
      }

      const shouldHandle = await this.shouldHandleQuery(userMessage);
      if (!shouldHandle) return null;

      if (!this.categoriesLoaded) await this.loadCategories();
      const extracted = await this.extractFiltersFromQuery(userMessage);

      if (extracted.intentType === 'post_job') {
        return {
          type: 'clarification',
          message: `📝 To post a job on Kozi:\n\n1. Open your **Dashboard**\n2. Go to **Add Jobs** → **Add Job**\n3. Fill out job details (title, requirements, etc.)\n4. Submit the job post\n\n💡 Posting jobs is a premium feature — our team will contact you with payment details once submitted.`
        };
      }

      if (['candidate_search', 'specific_category'].includes(extracted.intentType)) {
        const results = await this.performSearch(extracted.category);
        this.lastSearchResults = results;
        this.hasActiveSearch = true;

        if (!results.length) {
          return {
            type: 'results',
            data: [],
            candidates: [],
            message: `😕 I couldn’t find any candidates${extracted.categoryName ? ` in ${extracted.categoryName}` : ''} right now.\n\nWould you like me to check another category or region?`
          };
        }

        const msg = `✅ Great news! I found **${results.length} ${extracted.categoryName || ''} candidates** for you.\n\nHere’s what I discovered — let’s check them out together 👇`;

        return {
          type: 'results',
          data: results,
          candidates: results.map(c => this.formatCandidateForCard(c)),
          message: msg,
          searchMode: 'candidates'
        };
      }

      return null;
    } catch (error) {
      console.error('[EmployerAgent] Error processing message:', error);
      return {
        type: 'error',
        message: `⚠️ Sorry, something went wrong while searching. Please try again later.`,
      };
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
