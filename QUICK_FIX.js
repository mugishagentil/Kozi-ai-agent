// MINIMAL FIX: Clear cached job data
// Add this to your browser console and refresh

// Clear all job-related data
localStorage.removeItem('kozi-chat-history');
sessionStorage.clear();

// Force reload without cache
window.location.reload(true);