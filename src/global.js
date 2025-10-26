// Use environment variable for local development, fallback to remote API
export const globalVariable = process.env.VUE_APP_API_URL || 'https://apis.kozi.rw';
