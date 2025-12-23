// Clear all cached job data from browser
// Run this in browser console

console.log('🧹 Clearing all cached job data...');

// Clear localStorage
Object.keys(localStorage).forEach(key => {
    if (key.includes('job') || key.includes('chat') || key.includes('kozi')) {
        console.log(`Removing: ${key}`);
        localStorage.removeItem(key);
    }
});

// Clear sessionStorage
Object.keys(sessionStorage).forEach(key => {
    if (key.includes('job') || key.includes('chat') || key.includes('kozi')) {
        console.log(`Removing: ${key}`);
        sessionStorage.removeItem(key);
    }
});

console.log('✅ Cache cleared. Refresh the page and try again.');