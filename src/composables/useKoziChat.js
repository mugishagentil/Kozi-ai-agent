// src/composables/useKoziChat.js
import { ref, computed, onMounted } from 'vue'


export function useKoziChat() {
  // Reactive state
  const currentUser = ref(null)
  const messages = ref([])
  const chatStarted = ref(false)
  const loading = ref(false)
  const error = ref(null)
  const currentChatTitle = ref('New Chat')
  const streamingMessage = ref('') // For real-time streaming
  
  // 🆕 Detect user role (employer = roleId 2, employee = roleId 1)
  const userRole = ref('employee') // default
  
  // Get role from localStorage
  const getRoleFromLocalStorage = () => {
    // CRITICAL FIX: Check route FIRST before localStorage
    // This ensures the correct AI agent is used based on the current page
    const currentPath = window.location.pathname
    
    // Route-based detection (highest priority)
    if (currentPath.includes('/admin')) {
      return 'admin'
    } else if (currentPath.includes('/employer/') || currentPath.includes('/jobprovider/')) {
      return 'employer'
    } else if (currentPath.includes('/dashboard/ai-agent')) {
      // Explicitly return employee for employee AI agent page
      // This prevents employer responses when on the employee AI agent page
      return 'employee'
    }
    
    // Only check localStorage if route doesn't determine the role
    const employeeRoleId = localStorage.getItem('employeeRoleId')
    const employerRoleId = localStorage.getItem('employerRoleId')
    const adminRoleId = localStorage.getItem('adminRoleId')
    const selectedRoleId = localStorage.getItem('selectedRoleId')
    
    // Check selected role
    if (selectedRoleId === '2' || employerRoleId === '2') {
      return 'employer'
    } else if (selectedRoleId === '3' || adminRoleId === '3') {
      return 'admin'
    } else if (selectedRoleId === '1' || employeeRoleId === '1') {
      return 'employee'
    }
    
    // Default fallback
    return 'employee'
  }
  
  userRole.value = getRoleFromLocalStorage()
  
  // Debug logging
  console.log('🔍 Role Detection Debug:', {
    userRole: userRole.value,
    selectedRoleId: localStorage.getItem('selectedRoleId'),
    employeeRoleId: localStorage.getItem('employeeRoleId'),
    employerRoleId: localStorage.getItem('employerRoleId'),
    adminRoleId: localStorage.getItem('adminRoleId'),
    currentPath: window.location.pathname
  })
  
  // Manual override for testing
  window.forceRole = (role) => {
    userRole.value = role
    console.log('🔧 Manual role override:', role)
  }
  
  // 🆕 Get API endpoint prefix based on role
  const getApiPrefix = () => {
    const currentPath = window.location.pathname;
    const isAdmin = isAdminUser();
    
    console.log('🔍 API Prefix Debug:', { 
      currentPath, 
      userRole: userRole.value, 
      isAdmin
    });
    
    // Check if user is admin
    if (isAdmin) {
      console.log('🔍 Admin user detected, using admin API')
      return '/admin/chat'
    }
    
    // Employee uses /chat, Employer uses /chat/employer
    const prefix = userRole.value === 'employer' ? '/chat/employer' : '/chat'
    console.log('🔍 Using prefix:', prefix, 'for role:', userRole.value)
    return prefix
  }

  // Function to update role based on current URL
  const updateRoleFromURL = () => {
    const newRole = getRoleFromLocalStorage()
    if (userRole.value !== newRole) {
      userRole.value = newRole
      console.log('🔄 Role updated:', { newRole })
    }
  }

  // Initialize on mount
  onMounted(async () => {
    // Update role detection on mount
    updateRoleFromURL()
    
    // Initialize user
    await initializeUser()
  })

const initializeUser = async () => {
  try {
    loading.value = true
    console.log('🔄 Initializing user...')
    
    const user = await getUserFromLocalStorage()
    
    if (!user) {
      throw new Error('User not authenticated. Please log in.')
    }
    
    currentUser.value = user
    console.log('✅ User initialized:', user)
    error.value = null // Clear any previous errors
    
  } catch (e) {
    console.error('❌ Failed to initialize user:', e)
    error.value = e.message || 'Failed to initialize. Please log in again.'
    
    // Add debug information to help diagnose the issue
    const debugInfo = {
      hasUserEmail: !!localStorage.getItem('userEmail'),
      hasEmployeeToken: !!localStorage.getItem('employeeToken'),
      hasEmployerToken: !!localStorage.getItem('employerToken'),
      hasAdminToken: !!localStorage.getItem('adminToken'),
      allStorageKeys: Object.keys(localStorage)
    }
    
    console.log('🔍 Authentication Debug Info:', debugInfo)
    
    messages.value = [
      {
        sender: 'assistant',
        text: 'Sorry, you need to be logged in to use the chat. Please log in and try again.',
      },
    ]
  } finally {
    loading.value = false
  }
}

  const addBotMessage = (text) => {
    messages.value.push({ sender: 'assistant', text: formatMessage(text) })
  }

  const addUserMessage = (text) => {
    messages.value.push({ sender: 'user', text })
  }


  const startNewChat = async () => {
    // Reset all state immediately - like other AI chatbots
    messages.value = []
    chatStarted.value = false
    error.value = null
    currentChatTitle.value = 'New Chat'
    loading.value = false // Don't show loading for new chat - just show welcome screen
    
    // Initialize user if needed (but don't create session yet)
    if (!currentUser.value) {
      console.warn('No user available for new chat — initializing user')
      try {
        await initializeUser()
    } catch (e) {
        console.error('Failed to initialize user:', e)
      }
    }
    
    console.log('✨ New chat started - showing welcome screen (last active session cleared)')
  }

  // 🚀 UPDATED: Streaming message handler
  const sendMessage = async (text) => {
    if (!text.trim() || !currentUser.value || loading.value) {
      return
    }

    console.log('Sending message:', text)

    // ✅ Add user message IMMEDIATELY so it appears right away
    addUserMessage(text)

    // ✅ Create bot message placeholder IMMEDIATELY with typing indicator
    // This ensures the typing indicator shows right away
    const botMessageIndex = messages.value.length
    messages.value.push({ 
      sender: 'assistant', 
      text: '',
      streaming: true 
    })

    // Set loading state immediately so typing indicator shows
    loading.value = true
    error.value = null
    streamingMessage.value = ''

    // Auto-start chat if needed
    if (!chatStarted.value) {
      console.log('Starting chat with first message:', text)
      
      // If users_id is missing, try to fetch it first (for admin users)
      let users_id = currentUser.value.users_id;
      if (!users_id) {
        console.log('⚠️ users_id is missing, attempting to fetch it...');
        try {
          // Try to get userId from external API (same logic as getUserFromLocalStorage)
          const userEmail = localStorage.getItem('userEmail');
          const employeeToken = localStorage.getItem('employeeToken');
          const employerToken = localStorage.getItem('employerToken');
          const adminToken = localStorage.getItem('adminToken');
          const agentToken = localStorage.getItem('agentToken');
          const token = employeeToken || employerToken || adminToken || agentToken;
          
          if (userEmail && token) {
            // First, try to extract from token payload (faster and works for all roles)
            try {
              console.log('🔍 Step 1: Attempting to extract userId from token payload...');
              const payload = JSON.parse(atob(token.split(".")[1]));
              console.log('📋 Token payload:', payload);
              console.log('📋 Token payload keys:', Object.keys(payload));
              
              // Check various possible userId fields in token
              if (payload.userId || payload.user_id || payload.id || payload.users_id || 
                  payload.sub || payload.userID) {
                users_id = payload.userId || payload.user_id || payload.id || payload.users_id || 
                          payload.sub || payload.userID;
                currentUser.value.users_id = users_id;
                console.log('✅ Extracted users_id from token payload:', users_id);
              } else {
                console.warn('⚠️ Token payload does not contain userId field. Available keys:', Object.keys(payload));
                // Log the full payload for debugging
                console.log('📋 Full token payload:', JSON.stringify(payload, null, 2));
              }
            } catch (tokenError) {
              console.warn('⚠️ Could not extract userId from token:', tokenError);
            }
            
            // If token extraction failed, try fetching from external API
            if (!users_id) {
              try {
                console.log('🔍 Step 2: Attempting to fetch userId from external API...');
                const resId = await fetchWithTimeout(
                  `https://apis.kozi.rw/get_user_id_by_email/${encodeURIComponent(userEmail)}`,
                  {
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${token}`,
                    },
                    timeout: 5000 // 5 second timeout
                  }
                );
                
                if (resId.ok) {
                  const dataId = await resId.json();
                  if (dataId.users_id) {
                    users_id = dataId.users_id;
                    currentUser.value.users_id = users_id; // Update current user
                    console.log('✅ Fetched users_id from API:', users_id);
                  }
                } else {
                  console.warn('⚠️ API call failed with status:', resId.status);
                  const errorText = await resId.text().catch(() => '');
                  console.warn('⚠️ API error response:', errorText);
                }
              } catch (fetchError) {
                console.warn('⚠️ Error fetching userId from API:', fetchError.message || fetchError);
              }
            }
            
            // Step 3: If still no users_id, try backend endpoint (requires Authorization header)
            if (!users_id && token) {
              try {
                console.log('🔍 Step 3: Attempting to fetch userId from backend endpoint...');
                const resBackend = await fetchWithTimeout(
                  `${API_BASE}/user/id`,
                  {
                    headers: {
                      "Content-Type": "application/json",
                      "Authorization": `Bearer ${token}`,  // CRITICAL: Backend needs this to extract user ID
                    },
                    timeout: 5000
                  }
                );
                
                if (resBackend.ok) {
                  const dataBackend = await resBackend.json();
                  if (dataBackend.users_id) {
                    users_id = dataBackend.users_id;
                    currentUser.value.users_id = users_id; // Update current user
                    console.log('✅ Fetched users_id from backend endpoint:', users_id);
                  }
                } else {
                  const errorText = await resBackend.text();
                  console.warn('⚠️ Backend user ID fetch failed:', resBackend.status, errorText);
                }
              } catch (fetchError) {
                console.warn('⚠️ Error fetching user ID from backend:', fetchError.message || fetchError);
              }
            }
          }
          
          if (!users_id) {
            throw new Error('Unable to retrieve user ID. Please check your connection and try again, or log in again.');
          }
        } catch (e) {
          console.error('❌ Failed to get users_id:', e);
          // Only show error message if we haven't already shown one
          const hasErrorAlready = messages.value.some(m => 
            m.sender === 'assistant' && 
            m.text && 
            (m.text.includes('retrieve your user information') || 
             m.text.includes('could not retrieve') ||
             m.text.includes('need to be logged in'))
          );
          
          if (!hasErrorAlready) {
            // Update the placeholder message with error instead of adding new one
            if (messages.value[botMessageIndex]) {
              messages.value[botMessageIndex].text = 'Sorry, I could not retrieve your user information. Please refresh the page and try again. If the issue persists, please log out and log in again.'
              messages.value[botMessageIndex].streaming = false
            } else {
              addBotMessage('Sorry, I could not retrieve your user information. Please refresh the page and try again. If the issue persists, please log out and log in again.')
            }
          }
          loading.value = false
          return;
        }
      }
      
      try {
        loading.value = true
        chatStarted.value = true
      } catch (e) {
        console.error('❌ Auto-start failed:', e)
        console.error('❌ Error stack:', e.stack)
        console.error('❌ Error name:', e.name)
        console.error('❌ Error details:', {
          message: e.message,
          name: e.name,
          users_id: users_id,
          apiPrefix: getApiPrefix(),
          hasToken: !!localStorage.getItem('employeeToken') || !!localStorage.getItem('employerToken') || !!localStorage.getItem('adminToken') || !!localStorage.getItem('agentToken'),
          url: `${API_BASE}${getApiPrefix()}/new`
        })
        
        // Show more specific error message based on the error
        let errorMessage = 'Sorry, I could not connect right now. Please try again in a moment.'
        
        // Handle AbortError (timeout) specifically
        if (e.name === 'AbortError' || e.message.includes('aborted') || e.message.includes('AbortError')) {
          errorMessage = 'Request timed out. The server is taking too long to respond. Please try again.'
          console.error('❌ Request was aborted (timeout) - this usually means the backend took longer than 30 seconds to respond')
        } else if (e.message) {
          if (e.message.includes('users_id') || e.message.includes('user ID') || e.message.includes('Invalid user')) {
            errorMessage = 'Unable to retrieve your user ID. Please refresh the page and try again.'
          } else if (e.message.includes('401') || e.message.includes('Unauthorized')) {
            errorMessage = 'Your session has expired. Please log in again.'
          } else if (e.message.includes('403') || e.message.includes('Forbidden')) {
            errorMessage = 'You don\'t have permission to start a chat. Please check your account settings.'
          } else if (e.message.includes('500') || e.message.includes('Internal Server Error')) {
            errorMessage = 'Server error occurred. Please try again in a moment.'
          } else if (e.message.includes('Network') || e.message.includes('fetch') || e.message.includes('Failed to fetch')) {
            errorMessage = 'Network error. Please check your internet connection and try again.'
          } else if (e.message.includes('404') || e.message.includes('Not Found')) {
            errorMessage = 'Chat endpoint not found. Please refresh the page.'
          } else {
            errorMessage = `Connection error: ${e.message}. Please try again.`
          }
        }
        
        // Update the placeholder message with error instead of adding new one
        if (messages.value[botMessageIndex]) {
          messages.value[botMessageIndex].text = errorMessage
          messages.value[botMessageIndex].streaming = false
        } else {
          addBotMessage(errorMessage)
        }
        loading.value = false
        return
      } finally {
        loading.value = false
      }
    }

    // User message and bot placeholder already added at the top of the function
    // Loading state already set at the top

    const userMessages = messages.value.filter(m => m.sender === 'user')
    const isFirstUserMessage = userMessages.length === 1

    try {
      // 🚀 Call streaming API - pass messages array for chat history
      await streamChatMessage(
        null, 
        text, 
        isFirstUserMessage,
        (chunk) => {
          if (chunk && typeof chunk === 'string') {
            streamingMessage.value += chunk
            // Ensure bot message index is valid before updating
            if (botMessageIndex >= 0 && botMessageIndex < messages.value.length) {
              messages.value[botMessageIndex].text = formatMessage(streamingMessage.value)
              messages.value[botMessageIndex].streaming = true
            } else {
              console.error('❌ Invalid botMessageIndex in onChunk:', botMessageIndex, 'messages.length:', messages.value.length)
            }
          } else {
            console.warn('⚠️ onChunk called with invalid chunk:', chunk)
          }
        },
        (jobs) => {
          if (jobs && Array.isArray(jobs)) {
            messages.value[botMessageIndex].jobs = jobs
          }
        },
        (candidates) => {
          if (candidates && Array.isArray(candidates)) {
            messages.value[botMessageIndex].candidates = candidates
          }
        },
        (title) => {
          if (title) {
            console.log('📝 Received title from backend:', title)
            currentChatTitle.value = title
          }
        },
        getApiPrefix(),
        messages.value  // Pass messages array for chat history
      )

      // Ensure bot message exists and set streaming to false
      if (botMessageIndex >= 0 && botMessageIndex < messages.value.length) {
        messages.value[botMessageIndex].streaming = false
        // Ensure message has content
        if (!messages.value[botMessageIndex].text || messages.value[botMessageIndex].text.trim() === '') {
          console.warn('⚠️ Bot message is empty after streaming, using streamingMessage')
          messages.value[botMessageIndex].text = formatMessage(streamingMessage.value || 'I apologize, but I could not generate a response. Please try again.')
        }
      } else {
        console.error('❌ Invalid botMessageIndex after streaming:', botMessageIndex, 'messages.length:', messages.value.length)
      }

    } catch (e) {
      console.error('❌ Failed to send message:', e)
      console.error('❌ Error stack:', e.stack)
      console.error('❌ Error name:', e.name)
      console.error('❌ Error details:', {
        message: e.message,
        name: e.name,
        apiPrefix: getApiPrefix(),
        hasToken: !!localStorage.getItem('employeeToken') || !!localStorage.getItem('employerToken') || !!localStorage.getItem('adminToken') || !!localStorage.getItem('agentToken'),
        botMessageIndex: botMessageIndex,
        messagesLength: messages.value.length
      })
      
      // Provide more specific error messages based on error type
      let errorMessage = '**Sorry, I couldn\'t process your message.**\n\n- Please check your internet connection and try again.\n- If this keeps happening, refresh the page.'
      
      if (e.message) {
        if (e.message.includes('401') || e.message.includes('Unauthorized')) {
          errorMessage = '**Your session has expired.**\n\n- Please refresh the page to continue.\n- If the problem persists, please log out and log in again.'
        } else if (e.message.includes('403') || e.message.includes('Forbidden')) {
          errorMessage = '**Access denied.**\n\n- You don\'t have permission to send this message.\n- Please check your account settings or contact support.'
        } else if (e.message.includes('404') || e.message.includes('Not Found')) {
          errorMessage = '**Chat session not found.**\n\n- Your chat session may have expired.\n- Please refresh the page to start a new chat.'
        } else if (e.message.includes('500') || e.message.includes('Internal Server Error')) {
          errorMessage = '**Server error occurred.**\n\n- Our servers are experiencing issues.\n- Please wait a moment and try again.\n- Contact support if this persists: info@kozi.rw'
        } else if (e.message.includes('Network') || e.message.includes('fetch') || e.message.includes('Failed to fetch')) {
          errorMessage = '**Network connection issue.**\n\n- Please check your internet connection.\n- Try refreshing the page.\n- If the problem continues, contact support: +250 788 719 678'
        } else if (e.message.includes('timeout') || e.message.includes('Timeout')) {
          errorMessage = '**Request timed out.**\n\n- The server is taking too long to respond.\n- Please try again in a moment.\n- If this continues, refresh the page.'
        } else if (e.message.includes('session') || e.message.includes('Session')) {
          errorMessage = '**Chat session error.**\n\n- Your chat session may have expired.\n- Please refresh the page to start a new chat.'
        }
      }
      
      error.value = 'Failed to send message'
      
      // Ensure bot message exists and is properly formatted
      if (botMessageIndex >= 0 && botMessageIndex < messages.value.length) {
        messages.value[botMessageIndex] = {
          sender: 'assistant',
          text: formatMessage(errorMessage),
          streaming: false
        }
      } else {
        // If bot message index is invalid, add error message
        console.warn('⚠️ Bot message index invalid, adding error message directly')
        messages.value.push({
          sender: 'assistant',
          text: formatMessage(errorMessage),
          streaming: false
        })
      }
    } finally {
      loading.value = false
      streamingMessage.value = ''
      
      // Ensure streaming is set to false for the bot message
      if (botMessageIndex >= 0 && botMessageIndex < messages.value.length) {
        messages.value[botMessageIndex].streaming = false
      }
    }
  }

  const sendSuggestion = async (text) => {
    await sendMessage(text)
  }


  const toggleTheme = () => {
    document.body.classList.toggle('dark')
  }



  return {
    // State
    currentUser: computed(() => currentUser.value),
    messages: computed(() => messages.value),
    chatStarted: computed(() => chatStarted.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    currentChatTitle: computed(() => currentChatTitle.value),

    // Actions
    startNewChat,
    sendMessage,
    sendSuggestion,
    toggleTheme,
  }
}

// Utility functions

function formatMessage(message = '') {
  if (!message) return ''

  let formatted = String(message).trim()

  // --- Markdown-like syntax fixes ---

  // Handle markdown tables FIRST (before other processing)
  formatted = formatted.replace(
    /(\|.+\|\n)+/g,
    (match) => {
      const lines = match.trim().split('\n')
      if (lines.length < 2) return match
      
      // Parse table
      const rows = lines.map(line => 
        line.split('|').map(cell => cell.trim()).filter(cell => cell)
      )
      
      // Check if second row is separator (contains only dashes and pipes)
      const hasSeparator = rows[1] && rows[1].every(cell => /^[-:]+$/.test(cell))
      
      if (!hasSeparator) return match
      
      // Build HTML table
      let html = '<div class="table-wrapper" style="overflow-x: auto; margin: 1rem 0; max-width: 100%;"><table class="markdown-table" style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; table-layout: auto;">'
      
      // Header row
      html += '<thead style="background-color: #f9fafb;"><tr>'
      rows[0].forEach(cell => {
        html += `<th style="padding: 0.4rem 0.5rem; text-align: left; font-weight: 600; border: 1px solid #e5e7eb; color: #374151; white-space: nowrap; font-size: 0.75rem; line-height: 1.3;">${cell}</th>`
      })
      html += '</tr></thead>'
      
      // Body rows (skip separator row at index 1)
      html += '<tbody>'
      for (let i = 2; i < rows.length; i++) {
        html += '<tr style="border-bottom: 1px solid #e5e7eb;">'
        rows[i].forEach(cell => {
          html += `<td style="padding: 0.4rem 0.5rem; border: 1px solid #e5e7eb; color: #4b5563; font-size: 0.75rem; line-height: 1.3;">${cell}</td>`
        })
        html += '</tr>'
      }
      html += '</tbody></table></div>'
      
      return html
    }
  )

  // Handle markdown headings (###, ##, #) - FIRST process headings
  formatted = formatted.replace(/^###\s*(.+)$/gm, '<h3 class="large-font mt-4 mb-2 font-semibold text-pink-600">$1</h3>')
  formatted = formatted.replace(/^##\s*(.+)$/gm, '<h2 class="large-font mt-4 mb-2 font-semibold text-pink-600">$1</h2>')
  formatted = formatted.replace(/^#\s*(.+)$/gm, '<h1 class="large-font mt-4 mb-2 font-semibold text-pink-600">$1</h1>')

  // Bold and italic formatting
  formatted = formatted
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')

  // --- Section headers (lines that are complete sentences ending with colon) ---
  formatted = formatted.replace(
    /^([^:\n]+):$/gm,
    '<div class="section-header large-font mt-4 mb-2 font-semibold text-gray-800">$1</div>'
  )

  // --- Numbered list (1. Item) ---
  formatted = formatted.replace(
    /^(\d+)\.\s+(.+)$/gm,
    '<div class="numbered-item large-font mb-2"><span class="number text-pink-600 font-bold">$1.</span> <span class="full-text">$2</span></div>'
  )

  // --- Bullet list (● Item or - Item) - FIXED to handle any number of items ---
formatted = formatted.replace(
  /^\s*[●•-]\s+(.+)$/gm,
  '<div class="bullet-item pl-20 large-font mb-2 flex items-start"><span class="text flex-1">$1</span></div>'
)

  // --- Process line by line to handle mixed content properly ---
  const lines = formatted.split('\n')
  const processedLines = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    
    // Skip empty lines
    if (!line) {
      processedLines.push('')
      continue
    }

    // Check if this line is already formatted with HTML tags
    if (line.match(/<(div|p|h[1-3])/)) {
      processedLines.push(line)
    }
    // Check if this line should be a regular paragraph (not a list item or heading)
    else if (!line.match(/^(\d+\.|\s*[●•-]|\s*#)/) && !line.endsWith(':')) {
      // If previous line was also a regular paragraph, append to it
      if (processedLines.length > 0 && 
          !processedLines[processedLines.length - 1].match(/<(div|p|h[1-3])/) &&
          processedLines[processedLines.length - 1] !== '') {
        processedLines[processedLines.length - 1] += '<br>' + line
      } else {
        processedLines.push(`<p class="large-font">${line}</p>`)
      }
    }
    // Leave other formatted lines as they are
    else {
      processedLines.push(line)
    }
  }

  formatted = processedLines.join('\n')

  // --- Final cleanup ---
  formatted = formatted.replace(/\n{2,}/g, '\n')
  formatted = formatted.replace(/<p class="large-font"><\/p>/g, '')
  formatted = formatted.replace(/<p class="large-font"><br><\/p>/g, '')

  return formatted
}

// ===== API integration with STREAMING =====
// Determine API base - use Railway for production, localhost for development
const getApiBase = () => {
  // Check if we're in development (localhost)
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:5050/api'
  }
  // Production - use Railway
  return 'https://kozi-ai-agent-production.up.railway.app/api'
}
const API_BASE = getApiBase().replace(/\/+$/, '')

// Admin detection logic
function isAdminUser() {
  const currentPath = window.location.pathname;
  const isOnAdminDashboard = currentPath.startsWith('/admin');
  
  if (!isOnAdminDashboard) {
    return false;
  }
  
  const adminRoleId = localStorage.getItem('adminRoleId');
  const selectedRoleId = localStorage.getItem('selectedRoleId');
  const userEmail = localStorage.getItem('userEmail') || '';
  
  return adminRoleId === '3' || selectedRoleId === '3' || userEmail === 'admin@kozi.rw' || userEmail.includes('admin');
}

// Generic fetch with timeout
async function fetchWithTimeout(resource, options = {}) {
  const { timeout = 10000, ...fetchOptions } = options
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(resource, { ...fetchOptions, signal: controller.signal })
    return response
  } finally {
    clearTimeout(id)
  }
}


async function getUserFromLocalStorage() {
  try {
    // Get user data from localStorage
    const userEmail = localStorage.getItem('userEmail')
    const employeeToken = localStorage.getItem('employeeToken')
    const employerToken = localStorage.getItem('employerToken')
    const adminToken = localStorage.getItem('adminToken')
    const agentToken = localStorage.getItem('agentToken')
    
    // Try all possible token locations
    const token = employeeToken || employerToken || adminToken || agentToken
    
    console.log('🔍 LocalStorage user data:', {
      userEmail,
      hasEmployeeToken: !!employeeToken,
      hasEmployerToken: !!employerToken,
      hasAdminToken: !!adminToken,
      hasAgentToken: !!agentToken,
      hasAnyToken: !!token,
      allKeys: Object.keys(localStorage)
    })
    
    if (!userEmail) {
      throw new Error('No user email found in localStorage. Please log in.')
    }
    
    if (!token) {
      throw new Error('No authentication token found in localStorage. Please log in.')
    }
    
    // Try to get userId - prioritize token extraction for better reliability
    // For admin users, the external API might reject adminToken, so token extraction is preferred
    console.log('🔍 Retrieving user ID for email:', userEmail)
    
    let users_id = null;
    
    // Step 1: Try to extract userId from token payload first (faster and works for all roles)
    try {
      console.log('🔍 Step 1: Attempting to extract userId from token payload...');
      const payload = JSON.parse(atob(token.split(".")[1]));
      console.log('📋 Token payload keys:', Object.keys(payload));
      
      // Check various possible userId fields in token payload
      if (payload.userId || payload.user_id || payload.id || payload.users_id || 
          payload.sub || payload.userID) {
        users_id = payload.userId || payload.user_id || payload.id || payload.users_id || 
                  payload.sub || payload.userID;
        console.log('✅ Extracted users_id from token payload:', users_id);
      } else {
        console.warn('⚠️ Token payload does not contain userId field. Available keys:', Object.keys(payload));
        console.log('📋 Full token payload:', JSON.stringify(payload, null, 2));
        
        // Try alternative approaches - check if email or other identifier can help
        if (payload.email) {
          console.log('📧 Token contains email:', payload.email);
        }
      }
    } catch (tokenError) {
      console.warn('⚠️ Could not extract userId from token:', tokenError);
    }
    
    // Step 2: If token extraction failed, try fetching from external API
    if (!users_id) {
      try {
        console.log('🔍 Step 2: Attempting to fetch userId from external API...');
        const resId = await fetchWithTimeout(
          `https://apis.kozi.rw/get_user_id_by_email/${encodeURIComponent(userEmail)}`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            timeout: 5000 // 5 second timeout
          }
        );
        
        if (resId.ok) {
          const dataId = await resId.json();
          console.log('📋 User ID response:', dataId)
          users_id = dataId.users_id;
          if (users_id) {
            console.log('✅ Fetched users_id from API:', users_id);
          }
        } else {
          const errorText = await resId.text();
          console.warn('⚠️ User ID fetch failed:', resId.status, errorText)
          
          // If it's a 403/401, allow creating user object without userId
          // The chat will work and we can fetch userId later when needed
          if (resId.status === 403 || resId.status === 401) {
            console.warn('⚠️ External API rejected token, but continuing with basic user object');
          } else {
            console.warn('⚠️ Could not get userId from API, but continuing anyway');
          }
        }
      } catch (fetchError) {
        console.warn('⚠️ Error fetching user ID from API:', fetchError.message || fetchError);
        // Continue without userId - chat can still work
        // Don't throw error, we'll create user object without userId
      }
    }
    
    // Step 3: If still no users_id, try backend endpoint (requires Authorization header)
    if (!users_id && token) {
      try {
        console.log('🔍 Step 3: Attempting to fetch userId from backend endpoint...');
        const resBackend = await fetchWithTimeout(
          `${API_BASE}/user/id`,  // Use API_BASE which points to your backend
          {
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`,  // CRITICAL: Backend needs this to extract user ID
            },
            timeout: 5000 // 5 second timeout
          }
        );
        
        if (resBackend.ok) {
          const dataBackend = await resBackend.json();
          console.log('📋 Backend User ID response:', dataBackend)
          users_id = dataBackend.users_id;
          if (users_id) {
            console.log('✅ Fetched users_id from backend endpoint:', users_id);
          }
        } else {
          const errorText = await resBackend.text();
          console.warn('⚠️ Backend user ID fetch failed:', resBackend.status, errorText);
        }
      } catch (fetchError) {
        console.warn('⚠️ Error fetching user ID from backend:', fetchError.message || fetchError);
      }
    }
    
    // Build basic user object - allow null users_id for all roles
    // users_id can be fetched later when needed (in sendMessage)
    const user = {
      users_id: users_id || null, // Can be null - will be fetched later if needed
      email: userEmail,
      first_name: userEmail.split('@')[0] || 'User',
      last_name: '',
      token: token
    };
    
    // If we don't have users_id yet, log it but don't fail
    // This is OK - users_id will be fetched when the user sends their first message
    if (!user.users_id) {
      console.warn('⚠️ User object created without userId. It will be fetched when needed.');
      // DON'T throw error - allow user to proceed
    }

    // Try to fetch profile data (but don't fail if this doesn't work)
    try {
      let profile = null;
      
      // Only try to fetch profile if we have users_id
      if (user.users_id) {
      // Try multiple endpoints
      const endpoints = [
          `https://apis.kozi.rw/provider/view_profile/${user.users_id}`,
          `https://apis.kozi.rw/employee/view_profile/${user.users_id}`,
          `https://apis.kozi.rw/users/profile/${user.users_id}`
      ];
      
      for (const endpoint of endpoints) {
        try {
          console.log('🔍 Attempting to fetch profile from:', endpoint)
          const resProfile = await fetch(endpoint, {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          });
          
          if (resProfile.ok) {
            profile = await resProfile.json();
            console.log('✅ Profile fetched from:', endpoint, profile)
            break;
          }
        } catch (e) {
          console.warn('⚠️ Profile fetch failed for', endpoint, e.message)
        }
      }
      
      // Update user with profile data if available
      if (profile) {
        user.first_name = profile.first_name || profile.firstName || user.first_name;
        user.last_name = profile.last_name || profile.lastName || user.last_name;
        }
      } else {
        console.log('⏭️ Skipping profile fetch - no userId available');
      }
      
    } catch (profileError) {
      console.warn('⚠️ Profile fetch failed, using basic user data:', profileError)
      // Continue with basic user data - don't throw error
    }

    console.log('✅ Authenticated user:', user)
    return user;
    
  } catch (e) {
    console.error("❌ getUserFromLocalStorage error:", e);
    throw e;
  }
}

// Helper function to get auth headers
// FIXED: Update getAuthHeaders to check all token types
function getAuthHeaders() {
  // Check all possible token locations
  const employeeToken = localStorage.getItem('employeeToken');
  const employerToken = localStorage.getItem('employerToken'); 
  const adminToken = localStorage.getItem('adminToken');
  const agentToken = localStorage.getItem('agentToken');
  
  const token = employeeToken || employerToken || adminToken || agentToken;
  
  const headers = {
    'Content-Type': 'application/json'
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    // Also add as x-api-token for compatibility
    headers['x-api-token'] = token;
  }
  
  console.log('🔐 Auth Headers Debug:', {
    hasEmployeeToken: !!employeeToken,
    hasEmployerToken: !!employerToken, 
    hasAdminToken: !!adminToken,
    hasAgentToken: !!agentToken,
    hasAnyToken: !!token,
    headers
  });
  
  return headers;
}


// 🚀 Streaming message function
async function streamChatMessage(sessionId, message, isFirstUserMessage, onChunk, onJobs, onCandidates, onTitle, rolePrefix = '/chat', messagesArray = null) {
  const url = `${API_BASE}${rolePrefix}`
  console.log('🚀 AI Chat calling:', url, 'with API_BASE:', API_BASE)
  
  // Get chat history from messages (exclude the current message being sent)
  // Format: [{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}]
  const chatHistory = []
  const messagesToUse = messagesArray || (window.messages && Array.isArray(window.messages) ? window.messages : [])
  
  if (messagesToUse && messagesToUse.length > 0) {
    // Get all messages except the last one (which is the current message being sent)
    const previousMessages = messagesToUse.slice(0, -1)
    for (const msg of previousMessages) {
      if (msg.sender === 'user' && msg.text) {
        chatHistory.push({ role: 'user', content: msg.text })
      } else if (msg.sender === 'assistant' && msg.text) {
        chatHistory.push({ role: 'assistant', content: msg.text })
      }
    }
  }
  
  console.log(`📚 Sending chat history with ${chatHistory.length} messages`)
  
  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ 
      message,
      chat_history: chatHistory.length > 0 ? chatHistory : undefined
    }),
    timeout: 60000
  })

  if (!res.ok) {
    const errorText = await res.text().catch(() => '')
    console.error('streamChatMessage error:', res.status, errorText)
    throw new Error(`Chat failed (${res.status}). ${errorText || ''}`)
  }

  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    try {
      // Clone response to read it without consuming the stream
      const responseText = await res.clone().text()
      console.log('📦 Raw response text:', responseText.substring(0, 500))
      
      const json = await res.json()
      console.log('📦 Parsed JSON response:', json)
      
      let contentFound = false
      let extractedContent = null
      
      // Try all possible content locations in order of preference
      if (json?.data?.content && typeof json.data.content === 'string') {
        extractedContent = json.data.content
        console.log('✅ Using json.data.content')
        contentFound = true
      } else if (json?.content && typeof json.content === 'string') {
        extractedContent = json.content
        console.log('✅ Using json.content')
        contentFound = true
      } else if (json?.response && typeof json.response === 'string') {
        extractedContent = json.response
        console.log('✅ Using json.response')
        contentFound = true
      } else if (json?.message && typeof json.message === 'string') {
        extractedContent = json.message
        console.log('✅ Using json.message')
        contentFound = true
      } else if (json?.messages && Array.isArray(json.messages)) {
        const joined = (json.messages || [])
          .map(m => (m.type === 'user' ? '' : (m.content || m.text || '')))
          .filter(Boolean)
          .join('\n')
        if (joined && joined.trim()) {
          extractedContent = joined
          console.log('✅ Using json.messages')
          contentFound = true
        }
      } else if (json?.text && typeof json.text === 'string') {
        extractedContent = json.text
        console.log('✅ Using json.text')
        contentFound = true
      }
      
      // CRITICAL: Always call onChunk if we found content
      if (contentFound && extractedContent) {
        onChunk(extractedContent, null)
        return
      }
      
      // If no content found, log detailed error and throw
      console.error('❌ No valid content found in JSON response')
      console.error('❌ Response structure:', JSON.stringify(json, null, 2))
      console.error('❌ Available keys:', Object.keys(json || {}))
      throw new Error('Response received but no valid content field found. Response structure: ' + JSON.stringify(Object.keys(json || {})))
      
    } catch (parseError) {
      console.error('❌ Failed to parse JSON response:', parseError)
      console.error('❌ Parse error details:', {
        message: parseError.message,
        stack: parseError.stack,
        name: parseError.name
      })
      
      // Try to get response text for debugging
      try {
        const errorText = await res.clone().text()
        console.error('❌ Response text (first 500 chars):', errorText.substring(0, 500))
      } catch (e) {
        console.error('❌ Could not read response text:', e)
      }
      
      throw new Error(`Failed to parse response: ${parseError.message}`)
    }
  }

  if (!res.body || !res.body.getReader) {
    const text = await res.text()
    if (text) {
      try {
        const maybe = JSON.parse(text)
        console.log('📦 Parsed non-streaming response:', maybe)
        
        // Try all possible content locations
        if (maybe?.data?.content) {
          onChunk(maybe.data.content, null)
        } else if (maybe?.content) {
          onChunk(maybe.content, null)
        } else if (maybe?.response) {
          onChunk(maybe.response, null)
        } else if (maybe?.message) {
          onChunk(maybe.message, null)
        } else if (maybe?.text) {
          onChunk(maybe.text, null)
        } else {
          // If JSON parsing succeeded but no content found, use the text
          console.warn('⚠️ JSON parsed but no content field found, using raw text')
          onChunk(text, null)
        }
      } catch (parseError) {
        // If not JSON, use raw text
        console.log('📝 Response is not JSON, using raw text')
        onChunk(text, null)
      }
    } else {
      console.warn('⚠️ Empty response body')
      throw new Error('Empty response from server')
    }
    return
  }
  
  const reader = res.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''
    
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      
      const payload = trimmed.slice(5).trim()
      if (!payload || payload === '[DONE]') continue
      
      try {
        const event = JSON.parse(payload)
        if (event.content) {
          onChunk(event.content, null)
        } else if (event.jobs) {
          onJobs(event.jobs)
        } else if (event.candidates) {
          onCandidates(event.candidates)
        } else if (event.title) {
          onTitle(event.title)
        } else if (event.done) {
          break
        } else if (event.error) {
          throw new Error(event.error)
        }
      } catch (parseError) {
        console.warn('Failed to parse SSE event:', parseError)
      }
    }
  }
}
