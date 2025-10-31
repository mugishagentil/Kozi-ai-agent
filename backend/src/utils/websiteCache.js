// Website content cache to avoid scraping on every request
// Cache expires after 1 hour (3600 seconds)

let websiteContextCache = {
  content: null,
  timestamp: null,
  expiresIn: 3600000, // 1 hour in milliseconds
};

/**
 * Get cached website context if available and not expired
 * @returns {string|null} Cached content or null if expired/missing
 */
function getCachedWebsiteContext() {
  if (!websiteContextCache.content || !websiteContextCache.timestamp) {
    return null;
  }

  const age = Date.now() - websiteContextCache.timestamp;
  if (age > websiteContextCache.expiresIn) {
    console.log('🔄 Website cache expired, will refresh');
    websiteContextCache.content = null;
    websiteContextCache.timestamp = null;
    return null;
  }

  console.log(`✅ Using cached website context (age: ${Math.round(age / 1000)}s)`);
  return websiteContextCache.content;
}

/**
 * Store website context in cache
 * @param {string} content - Website content to cache
 */
function setCachedWebsiteContext(content) {
  websiteContextCache.content = content;
  websiteContextCache.timestamp = Date.now();
  console.log('💾 Website context cached');
}

/**
 * Clear the website context cache (useful for testing or forced refresh)
 */
function clearWebsiteCache() {
  websiteContextCache.content = null;
  websiteContextCache.timestamp = null;
  console.log('🗑️  Website cache cleared');
}

module.exports = {
  getCachedWebsiteContext,
  setCachedWebsiteContext,
  clearWebsiteCache,
};

