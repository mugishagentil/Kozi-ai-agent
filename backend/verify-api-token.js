/**
 * API Token Verification Script
 * 
 * This script verifies that the API token is properly configured
 * and can successfully authenticate with the payroll API.
 * 
 * Usage:
 *   node verify-api-token.js
 */

require('dotenv').config();
const fetch = require('node-fetch');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function log(color, ...args) {
  console.log(color, ...args, colors.reset);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(colors.bright + colors.cyan, title);
  console.log('='.repeat(60));
}

async function verifyAPIToken() {
  try {
    logSection('🔍 API TOKEN VERIFICATION');
    
    // Step 1: Check if API_TOKEN is set in environment
    logSection('Step 1: Checking Environment Variables');
    const apiToken = process.env.API_TOKEN;
    
    if (!apiToken) {
      log(colors.red, '❌ API_TOKEN is NOT set in environment variables!');
      console.log('\nTo fix this:');
      console.log('1. Open backend/.env file');
      console.log('2. Add or update this line:');
      console.log('   API_TOKEN=your_actual_token_here');
      console.log('3. Restart the backend server\n');
      process.exit(1);
    }
    
    log(colors.green, '✅ API_TOKEN is set in environment');
    log(colors.cyan, `   Token length: ${apiToken.length} characters`);
    log(colors.cyan, `   Token preview: ${apiToken.substring(0, 10)}...${apiToken.substring(apiToken.length - 5)}`);
    
    // Step 2: Check API base URL
    logSection('Step 2: Checking API Configuration');
    const apiBase = process.env.JOBSEEKERS_API_BASE || 'https://apis.kozi.rw';
    log(colors.green, '✅ API Base URL:', apiBase);
    
    const payrollUrl = `${apiBase}/admin/payroll`;
    log(colors.cyan, '   Payroll endpoint:', payrollUrl);
    
    // Step 3: Test API connection WITHOUT token
    logSection('Step 3: Testing API Connection (No Token)');
    log(colors.yellow, '⏳ Testing if endpoint is reachable...');
    
    try {
      const testResponse = await fetch(payrollUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      log(colors.cyan, `   Response status: ${testResponse.status}`);
      
      if (testResponse.status === 401) {
        log(colors.green, '✅ Endpoint is reachable (returns 401 as expected without token)');
      } else if (testResponse.status === 200) {
        log(colors.yellow, '⚠️  Endpoint is reachable but doesn\'t require authentication');
      } else {
        log(colors.yellow, `⚠️  Endpoint returned status ${testResponse.status}`);
      }
    } catch (error) {
      log(colors.red, '❌ Cannot reach API endpoint!');
      log(colors.red, `   Error: ${error.message}`);
      console.log('\nPossible issues:');
      console.log('• Network connectivity problem');
      console.log('• API endpoint is down');
      console.log('• Firewall blocking requests');
      process.exit(1);
    }
    
    // Step 4: Test API connection WITH token
    logSection('Step 4: Testing API Authentication (With Token)');
    log(colors.yellow, '⏳ Authenticating with API token...');
    
    const authResponse = await fetch(payrollUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken}`
      }
    });
    
    log(colors.cyan, `   Response status: ${authResponse.status}`);
    
    if (authResponse.status === 200) {
      log(colors.green, '✅ Authentication successful!');
      
      // Try to parse response
      const data = await authResponse.json();
      const payrollData = Array.isArray(data) ? data : (data.data || data.payroll || []);
      
      log(colors.green, `✅ Received ${payrollData.length} payroll records`);
      
      if (payrollData.length > 0) {
        log(colors.cyan, '\n   Sample record:');
        const sample = payrollData[0];
        console.log(JSON.stringify({
          id: sample.id,
          seekers_name: sample.seekers_name,
          providers_name: sample.providers_name,
          salary: sample.salary,
          salary_date: sample.salary_date
        }, null, 2));
      } else {
        log(colors.yellow, '⚠️  No payroll records found (database might be empty)');
      }
      
    } else if (authResponse.status === 401) {
      log(colors.red, '❌ Authentication failed!');
      
      const errorText = await authResponse.text();
      log(colors.red, '   Error response:', errorText);
      
      console.log('\nPossible issues:');
      console.log('• API token is invalid or expired');
      console.log('• Token format is incorrect');
      console.log('• Token doesn\'t have admin permissions');
      console.log('\n✅ Solution:');
      console.log('1. Get a fresh API token from your API administrator');
      console.log('2. Update backend/.env file with the new token');
      console.log('3. Restart the backend server');
      process.exit(1);
      
    } else {
      log(colors.red, `❌ Unexpected response status: ${authResponse.status}`);
      
      const errorText = await authResponse.text();
      log(colors.red, '   Response:', errorText);
      process.exit(1);
    }
    
    // Final Summary
    logSection('✅ VERIFICATION COMPLETE');
    log(colors.green, '🎉 All checks passed!');
    console.log('\n✅ Your API token is properly configured and working.');
    console.log('✅ You can now use the payment reminder feature.');
    console.log('\nNext steps:');
    console.log('1. Start the backend server: npm start');
    console.log('2. Log in as admin');
    console.log('3. Ask: "Show me upcoming payments"');
    console.log('');
    
  } catch (error) {
    logSection('❌ VERIFICATION FAILED');
    log(colors.red, 'Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run verification
console.log('\n');
log(colors.bright + colors.cyan, '🚀 Starting API Token Verification...');
console.log('');

verifyAPIToken().catch(error => {
  log(colors.red, '\n❌ Unhandled error:', error.message);
  console.error(error.stack);
  process.exit(1);
});








