// src/composables/useKoziChat.js
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

const DEMO_USER_CACHE_KEY = 'kozi-demo-user'
const LAST_ACTIVE_SESSION_KEY = 'kozi_last_active_session'

function createFallbackUser(email) {
  return {
    users_id: 5791,
    email,
    first_name: 'tuyishime',
    last_name: 'naome',
    role: 'employee'
  }
}

function persistUserToCache(user) {
  localStorage.setItem(DEMO_USER_CACHE_KEY, JSON.stringify(user))
  return user
}

// Save last active session to localStorage
function saveLastActiveSession(sessionId) {
  if (!sessionId) return
  localStorage.setItem(LAST_ACTIVE_SESSION_KEY, JSON.stringify({
    sessionId,
    timestamp: Date.now()
  }))
}

// Get last active session from localStorage
function getLastActiveSession() {
  try {
    const data = localStorage.getItem(LAST_ACTIVE_SESSION_KEY)
    return data ? JSON.parse(data) : null
  } catch (e) {
    console.error('Failed to load last active session:', e)
    return null
  }
}

// Clear last active session
function clearLastActiveSession() {
  localStorage.removeItem(LAST_ACTIVE_SESSION_KEY)
}

export function useKoziChat() {
  // Reactive state
  const currentUser = ref(null)
  const currentSession = ref(null)
  const messages = ref([])
  const history = ref([])
  const chatStarted = ref(false)
  const loading = ref(false)
  const error = ref(null)
  const currentChatTitle = ref('New Chat')
  const streamingMessage = ref('') // For real-time streaming
  
  // 🆕 Detect user role (employer = roleId 2, employee = roleId 1)
  const userRole = ref('employee') // default
  const roleId = localStorage.getItem('roleId')
  
  // More robust role detection
  if (roleId === '2') {
    userRole.value = 'employer'
  } else if (roleId === '1') {
    userRole.value = 'employee'
  } else {
    // If roleId is not set or invalid, try to detect from URL
    const currentPath = window.location.pathname
    if (currentPath.includes('/employer/') || currentPath.includes('/jobprovider/')) {
      userRole.value = 'employer'
    } else {
      userRole.value = 'employee'
    }
  }
  
  // Debug logging
  console.log('🔍 Role Detection Debug:', {
    roleId: roleId,
    userRole: userRole.value,
    currentPath: window.location.pathname,
    localStorage_roleId: localStorage.getItem('roleId')
  })
  
  // Manual override for testing (you can call this in console)
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
      isAdmin,
      adminRoleId: localStorage.getItem('adminRoleId'),
      employeeRoleId: localStorage.getItem('employeeRoleId'),
      employerRoleId: localStorage.getItem('employerRoleId')
    });
    
    // Check if user is admin (will now check URL path first)
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
    const currentPath = window.location.pathname
    const newRole = (currentPath.includes('/employer/') || currentPath.includes('/jobprovider/')) ? 'employer' : 'employee'
    if (userRole.value !== newRole) {
      userRole.value = newRole
      console.log('🔄 Role updated from URL:', { newRole, currentPath })
    }
  }

  // Load history from localStorage AND backend on mount
  onMounted(async () => {
    // Update role detection on mount
    updateRoleFromURL()
    
    const savedHistory = localStorage.getItem('kozi-chat-history')
    if (savedHistory) {
      try {
        const parsedHistory = JSON.parse(savedHistory)
        // Ensure all history items have proper timestamps
        history.value = parsedHistory.map(item => ({
          ...item,
          timestamp: item.timestamp || new Date(item.createdAt).getTime() || Date.now(),
          createdAt: item.createdAt || new Date(item.timestamp) || new Date()
        }))
        console.log('Loaded localStorage chat history:', history.value)
      } catch (e) {
        console.warn('Failed to load localStorage chat history:', e)
        history.value = []
      }
    } else {
      console.log('No saved localStorage chat history found')
      history.value = []
    }
    
    await initializeUser()
    
    if (currentUser.value) {
      await loadHistoryFromBackend()
      
      // 🆕 AUTO-RESTORE LAST ACTIVE SESSION
      const lastActive = getLastActiveSession()
      console.log('🔍 Last active session check:', lastActive)
      
      if (lastActive?.sessionId) {
        // Find this session in history
        const sessionInHistory = history.value.find(
          h => h.sessionId === lastActive.sessionId
        )
        
        console.log('🔍 Session in history check:', sessionInHistory)
        console.log('🔍 Available history:', history.value)
        
        if (sessionInHistory) {
          console.log('🔄 Restoring last active session:', sessionInHistory)
          // Move the loadChatHistory call to after all functions are defined
          setTimeout(async () => {
            try {
              await loadChatHistory(sessionInHistory)
            } catch (error) {
              console.error('❌ Failed to restore session:', error)
            }
          }, 100)
        } else {
          console.log('⚠️ Last active session not found in history, clearing')
          clearLastActiveSession()
        }
      } else {
        console.log('ℹ️ No last active session found')
      }
    }
  })

  watch(
    history,
    (newHistory) => {
      if (newHistory.length > 0) {
        localStorage.setItem('kozi-chat-history', JSON.stringify(newHistory))
      }
    },
    { deep: true },
  )


  const initializeUser = async () => {
    try {
      loading.value = true
      const user = await getUser()
      currentUser.value = user
      console.log('User initialized:', user)
    } catch (e) {
      console.error('Failed to initialize user:', e)
      error.value = 'Failed to initialize. Please refresh the page.'
      messages.value = [
        {
          sender: 'assistant',
          text: 'Sorry, I had trouble connecting. Please refresh the page and try again.',
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

  const generateChatTitle = (firstMessage) => {
    if (!firstMessage) return 'New Chat'

    let title = firstMessage.trim()
    title = title.replace(
      /^(how|what|when|where|why|can|could|would|should|tell me|help me)\s+/i,
      '',
    )
    title = title.charAt(0).toUpperCase() + title.slice(1)

    if (title.length > 50) {
      title = title.substring(0, 47) + '...'
    }

    return title || 'New Chat'
  }

  const saveCurrentChatToHistory = () => {
    if (!currentSession.value || messages.value.length === 0) return

    const firstUserMessage = messages.value.find((m) => m.sender === 'user')?.text
    const finalTitle = firstUserMessage
      ? generateChatTitle(firstUserMessage)
      : currentChatTitle.value

    const lastMessage = messages.value[messages.value.length - 1]
    let cleanLastMessage = ''

    if (lastMessage) {
      if (lastMessage.sender === 'user') {
        cleanLastMessage = lastMessage.text
      } else {
        cleanLastMessage = stripHtmlAndFormat(lastMessage.text)
      }
    }

    // FIX: Use current timestamp for new entries
    const currentTimestamp = Date.now()

    const chatEntry = {
      sessionId: currentSession.value,
      title: finalTitle,
      date: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      timestamp: currentTimestamp, // Use current timestamp
      messageCount: messages.value.length,
      lastMessage: cleanLastMessage.substring(0, 100),
      createdAt: new Date(currentTimestamp) // Add createdAt field
    }

    // Remove existing entry and add new one at the beginning
    const filtered = history.value.filter((item) => item.sessionId !== currentSession.value)
    history.value = [chatEntry, ...filtered].slice(0, 50)
    
    console.log('Saved chat to history:', chatEntry)
  }

  const startNewChat = async () => {
    if (!currentUser.value) {
      console.warn('No user available for new chat — initializing a demo user')
      try {
        await initializeUser()
      } catch (e) {
        // fallthrough, initializeUser handles its own errors
      }
      if (!currentUser.value) return
    }

    if (currentSession.value && messages.value.length > 0) {
      saveCurrentChatToHistory()
    }

    messages.value = []
    currentSession.value = null
    chatStarted.value = false
    error.value = null
    currentChatTitle.value = 'New Chat'
    clearLastActiveSession() // 🆕 Clear tracking for new chat
    loading.value = true

    try {
      const data = await startSession(currentUser.value.users_id, null, getApiPrefix())
      console.log('Session started:', data)

      if (data?.data?.session_id) {
        currentSession.value = data.data.session_id
        chatStarted.value = true
        saveLastActiveSession(data.data.session_id) // 🆕 Track this session
      } else {
        throw new Error('Invalid session response')
      }
    } catch (e) {
      console.error('Failed to start session:', e)
      error.value = 'Failed to start chat session'
      addBotMessage('Sorry, I had trouble starting our chat. Please try again.')
    } finally {
      loading.value = false
    }
  }

  // 🚀 UPDATED: Streaming message handler
  const sendMessage = async (text) => {
    if (!text.trim() || !currentUser.value || loading.value) {
      return
    }

    console.log('Sending message:', text)

    // Auto-start chat if needed
    if (!chatStarted.value || !currentSession.value) {
      console.log('Auto-starting chat session...')
      try {
        loading.value = true
        const data = await startSession(currentUser.value.users_id, null, getApiPrefix())

        if (data?.data?.session_id) {
          currentSession.value = data.data.session_id
          chatStarted.value = true
          saveLastActiveSession(data.data.session_id) // 🆕 Track this session
        } else {
          throw new Error('Failed to start session')
        }
      } catch (e) {
        console.error('Auto-start failed:', e)
        addBotMessage('Sorry, I could not connect right now. Please try again in a moment.')
        loading.value = false
        return
      } finally {
        loading.value = false
      }
    }

    // Add user message immediately
    addUserMessage(text)

    const userMessages = messages.value.filter(m => m.sender === 'user')
    const isFirstUserMessage = userMessages.length === 1

    if (isFirstUserMessage) {
      const newTitle = generateChatTitle(text)
      currentChatTitle.value = newTitle
    }

    // Create empty placeholder for streaming response (shows only bot icon + typing dots)
    const botMessageIndex = messages.value.length
    messages.value.push({ 
      sender: 'assistant', 
      text: '', // Start with empty content
      streaming: true 
    })

    loading.value = true
    error.value = null
    streamingMessage.value = ''

    try {
      // 🚀 Call streaming API
      await streamChatMessage(
        currentSession.value, 
        text, 
        isFirstUserMessage,
        (chunk) => {
          // Only process content chunks, ignore status
          if (chunk) {
            streamingMessage.value += chunk
            messages.value[botMessageIndex].text = formatMessage(streamingMessage.value)
            messages.value[botMessageIndex].streaming = true
          }
        },
        (jobs) => {
          // Handle job data if provided
          if (jobs && Array.isArray(jobs)) {
            messages.value[botMessageIndex].jobs = jobs
          }
        },
        (candidates) => {
          // Handle candidate data if provided
          if (candidates && Array.isArray(candidates)) {
            messages.value[botMessageIndex].candidates = candidates
          }
        },
        (title) => {
          // Title update callback
          if (title) {
            currentChatTitle.value = title
            
            // Update the current session title in history
            const sessionIndex = history.value.findIndex(
              h => h.sessionId === currentSession.value
            );
            if (sessionIndex !== -1) {
              history.value[sessionIndex].title = title;
              // Update localStorage
              localStorage.setItem('kozi_chat_history', JSON.stringify(history.value));
            }
          }
        },
        getApiPrefix()
      )

      // Mark streaming as complete
      messages.value[botMessageIndex].streaming = false

    } catch (e) {
      console.error('Failed to send message:', e)
      error.value = 'Failed to send message'
      // Replace the empty streaming bubble with a friendly error card
      messages.value[botMessageIndex] = {
        sender: 'assistant',
        text: formatMessage(
          '**We hit a hiccup.**\n\n- Please check your internet and try again.\n- If this keeps happening, refresh the page.'
        ),
        streaming: false
      }
    } finally {
      loading.value = false
      streamingMessage.value = ''
    }
  }

  const sendSuggestion = async (text) => {
    await sendMessage(text)
  }

  const loadChatHistory = async (historyItem) => {
    if (!historyItem.sessionId) return

    console.log('Loading chat history for session:', historyItem.sessionId)
    
    if (currentSession.value && messages.value.length > 0) {
      saveCurrentChatToHistory()
    }

    loading.value = true
    try {
      const data = await getChatHistory(historyItem.sessionId, getApiPrefix())
      console.log('Full response from getChatHistory:', data)

      let loadedMessages = []
      
      if (data?.data?.messages && Array.isArray(data.data.messages)) {
        loadedMessages = data.data.messages
      } else if (data?.messages && Array.isArray(data.messages)) {
        loadedMessages = data.messages
      } else if (Array.isArray(data)) {
        loadedMessages = data
      }

      if (loadedMessages.length > 0) {
        const msgs = loadedMessages.map((m) => ({
          sender: m.type === 'user' ? 'user' : 'assistant',
          text: m.type === 'user' ? m.content : formatMessage(m.content || m.message || ''),
        }))
        
        console.log('Processed messages:', msgs)
        messages.value = msgs
        currentSession.value = historyItem.sessionId
        currentChatTitle.value = historyItem.title
        chatStarted.value = true
        saveLastActiveSession(historyItem.sessionId) // 🆕 Track this session
      } else {
        currentSession.value = historyItem.sessionId
        currentChatTitle.value = historyItem.title
        chatStarted.value = true
        saveLastActiveSession(historyItem.sessionId) // 🆕 Track this session
        messages.value = []
      }
    } catch (e) {
      console.error('Failed to load history:', e)
      currentSession.value = historyItem.sessionId
      currentChatTitle.value = historyItem.title
      chatStarted.value = true
      saveLastActiveSession(historyItem.sessionId) // 🆕 Track this session
      messages.value = []
    } finally {
      loading.value = false
    }
  }

  async function getUserChatSessions(users_id) {
    const url = `${API_BASE}${getApiPrefix()}/sessions?users_id=${users_id}`
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })
    
    if (!res.ok) {
      const errorText = await res.text()
      console.error('getUserChatSessions error:', res.status, errorText)
      throw new Error(`getUserChatSessions failed: ${res.status}`)
    }
    
    return await res.json()
  }

  const loadHistoryFromBackend = async () => {
    if (!currentUser.value) return
    
    try {
      console.log('Loading chat history from backend for user:', currentUser.value.users_id)
      const data = await getUserChatSessions(currentUser.value.users_id)
      
      if (data?.sessions && Array.isArray(data.sessions)) {
        const backendHistory = data.sessions.map(session => {
          const lastMessage = session.messages && session.messages.length > 0 
            ? session.messages[session.messages.length - 1]
            : null
          
          let cleanLastMessage = ''
          if (lastMessage) {
            cleanLastMessage = lastMessage.type === 'user' 
              ? lastMessage.content 
              : stripHtmlAndFormat(lastMessage.content)
          }
          
          // FIX: Use proper timestamp from backend
          const sessionTimestamp = session.timestamp || 
                                  new Date(session.created_at).getTime() || 
                                  new Date(session.createdAt).getTime() ||
                                  Date.now()
          
          return {
            sessionId: session.id,
            title: session.title || 'New Chat',
            date: new Date(sessionTimestamp).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
            timestamp: sessionTimestamp, // Use the proper timestamp
            messageCount: session.messages ? session.messages.length : 0,
            lastMessage: cleanLastMessage.substring(0, 100),
            // Add createdAt for consistency
            createdAt: new Date(sessionTimestamp)
          }
        })
        
        // Sort backend history by timestamp descending (newest first)
        backendHistory.sort((a, b) => b.timestamp - a.timestamp)
        
        history.value = backendHistory
        console.log('Loaded backend chat history:', backendHistory)
        localStorage.setItem('kozi-chat-history', JSON.stringify(backendHistory))
      } else {
        console.log('No chat sessions found in backend')
      }
    } catch (e) {
      console.error('Failed to load chat history from backend:', e)
    }
  }

  // Delete a chat session by ID (backend + local)
  const deleteHistoryItem = async (sessionId) => {
    if (!sessionId) return

    try {
      const url = `${API_BASE}${getApiPrefix()}/session/${sessionId}`
      const res = await fetch(url, { method: "DELETE" })

      if (!res.ok) {
        const errorText = await res.text()
        console.error("deleteChatSession error:", res.status, errorText)
        throw new Error(`deleteChatSession failed: ${res.status}`)
      }

      const result = await res.json()
      console.log("Deleted chat session:", result)

      // ✅ Remove from local history (filter instead of recursion)
      history.value = history.value.filter(
        (item) => item.sessionId !== sessionId
      )

      // Reset current session if it was the one deleted
      if (currentSession.value === sessionId) {
        currentSession.value = null
        messages.value = []
        currentChatTitle.value = "New Chat"
        chatStarted.value = false
        clearLastActiveSession() // 🆕 Clear tracking
      }

      return result
    } catch (err) {
      console.error("Failed to delete chat session:", err)
      throw err
    }
  }

  const clearAllHistory = async () => {
    // ✅ Get users_id from currentUser
    if (!currentUser.value || !currentUser.value.users_id) {
      console.error("❌ Cannot clear history: User not logged in")
      return
    }

    const users_id = currentUser.value.users_id

    try {
      // Clear local history
      history.value = []
      localStorage.removeItem("kozi-chat-history")

      // Call backend API to clear sessions
      const res = await fetch(`${API_BASE}${getApiPrefix()}/sessions/all`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ users_id }),
      })

      if (!res.ok) {
        const data = await res.json()
        console.error("❌ Failed to clear server history:", data.error || data)
        return
      }

      const data = await res.json()
      console.log(`✅ Cleared ${data.deletedCount} sessions from server`)

      // ✅ Reset current session state
      currentSession.value = null
      messages.value = []
      currentChatTitle.value = "New Chat"
      chatStarted.value = false
      clearLastActiveSession() // 🆕 Clear tracking

    } catch (err) {
      console.error("❌ Error clearing history:", err)
    }
  }

  const toggleTheme = () => {
    document.body.classList.toggle('dark')
  }

  const handleBeforeUnload = () => {
    if (currentSession.value && messages.value.length > 0) {
      saveCurrentChatToHistory()
    }
  }

  // Debug function to check timestamp consistency
  const debugHistoryTimestamps = () => {
    console.log('=== HISTORY TIMESTAMP DEBUG ===')
    history.value.forEach((item, index) => {
      console.log(`[${index}] ${item.title}:`, {
        timestamp: item.timestamp,
        date: item.date,
        createdAt: item.createdAt,
        sessionId: item.sessionId
      })
    })
  }

  onMounted(() => {
    window.addEventListener('beforeunload', handleBeforeUnload)
  })

  onUnmounted(() => {
    window.removeEventListener('beforeunload', handleBeforeUnload)
    handleBeforeUnload()
  })

  return {
    // State
    currentUser: computed(() => currentUser.value),
    currentSession: computed(() => currentSession.value),
    messages: computed(() => messages.value),
    history: computed(() => history.value),
    chatStarted: computed(() => chatStarted.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    currentChatTitle: computed(() => currentChatTitle.value),

    // Actions
    startNewChat,
    sendMessage,
    sendSuggestion,
    loadChatHistory,
    deleteHistoryItem,
    clearAllHistory,
    toggleTheme,
    debugHistoryTimestamps, // Export debug function
  }
}

// Utility functions
function stripHtmlAndFormat(text = '') {
  if (!text) return ''
  let cleaned = text.replace(/<[^>]*>/g, '')
  cleaned = cleaned.replace(/\*\*(.+?)\*\*/g, '$1')
  cleaned = cleaned.replace(/\*(.+?)\*/g, '$1')
  cleaned = cleaned.replace(/#{1,6}\s*(.+)/g, '$1')
  cleaned = cleaned.replace(/^\d+\.\s*/gm, '')
  cleaned = cleaned.replace(/^[-•]\s*/gm, '')
  cleaned = cleaned.replace(/\s+/g, ' ').trim()
  return cleaned
}

function formatMessage(message = '') {
  if (!message) return ''
  let formatted = String(message).trim()

  // Remove any orphan/mismatched **
  formatted = formatted.replace(/(^|\s)\*\*([^*]+)(\s|$)/g, '$1<strong>$2</strong>$3')
  formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>')

  // Strip markdown headings / blockquotes
  formatted = formatted.replace(/^[#>]+\s*/gm, '')

  // Numbered list items → custom styled divs
  formatted = formatted.replace(
    /^(\d+)\.\s+([^:]+:\s*.+)$/gm,
    '<div class="numbered-item large-font"><span class="number">$1.</span><span class="full-text"> $2</span></div>'
  )

  // Bullet list items
  formatted = formatted.replace(/^\s*[-•]\s+(.+)$/gm, '<div class="bullet-item large-font">$1</div>')

  // Section headers
  formatted = formatted.replace(/^(.+):$/gm, '<div class="section-header large-font">$1</div>')

  // Paragraph spacing
  formatted = formatted.replace(/([^\n])\n\n([^\n])/g, '$1</p><p class="large-font">$2')
  formatted = formatted.replace(/(?<!<\/div>)\n(?!<div)/g, '<br>')
  formatted = formatted.replace(/^\s*<br>\s*<br>\s*/, '')

  // Wrap in <p> if not already formatted
  if (!formatted.includes('<div') && !formatted.includes('<p>')) {
    formatted = `<p class="large-font">${formatted}</p>`
  }

  return formatted
}


// ===== API integration with STREAMING =====
const API_BASE = (import.meta?.env?.VITE_API_URL || process.env.VUE_APP_API_URL || 'http://localhost:5050/api').replace(/\/+$/, '')

// Admin detection logic
function isAdminUser() {
  // Check current URL path first - only detect admin when actually on admin dashboard
  const currentPath = window.location.pathname;
  const isOnAdminDashboard = currentPath.startsWith('/admin');
  
  if (!isOnAdminDashboard) {
    return false; // If not on admin dashboard, definitely not admin
  }
  
  // If on admin dashboard, verify admin credentials
  const adminRoleId = localStorage.getItem('adminRoleId');
  const userEmail = localStorage.getItem('userEmail') || '';
  
  return adminRoleId === '3' || userEmail === 'admin@kozi.rw' || userEmail.includes('admin');
}

// Generic fetch with timeout (prevents infinite spinner if backend is down)
async function fetchWithTimeout(resource, options = {}) {
  const { timeout = 10000 } = options // 10s default
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(resource, { ...options, signal: controller.signal })
    return response
  } finally {
    clearTimeout(id)
  }
}

async function getUser(email = process.env.VUE_APP_EMPLOYEE_EMAIL || 'test@example.com') {
  try {
    const API_TOKEN = process.env.VUE_APP_KOZI_API_TOKEN || 'your_kozi_api_token_here';

    // Check local cache first
    const cached = localStorage.getItem(DEMO_USER_CACHE_KEY);
    if (cached) {
      try {
        const user = JSON.parse(cached);
        if (user && user.users_id && user.email === email) {
          return user;
        } else {
          localStorage.removeItem(DEMO_USER_CACHE_KEY);
        }
      } catch (e) {
        localStorage.removeItem(DEMO_USER_CACHE_KEY);
      }
    }

    if (!API_TOKEN) {
      console.warn('Missing VITE_KOZI_API_TOKEN. Using demo user profile instead.')
      return persistUserToCache(createFallbackUser(email))
    }

    // Fetch user_id
    const resId = await fetch(
      `https://apis.kozi.rw/get_user_id_by_email/${encodeURIComponent(email)}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_TOKEN}`,
        },
      }
    );
    if (!resId.ok) throw new Error("Failed to fetch user ID");
    const dataId = await resId.json();

    // Fetch full profile to get real name
    const resProfile = await fetch(
      `https://apis.kozi.rw/provider/view_profile/${dataId.users_id}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_TOKEN}`,
        },
      }
    );
    if (!resProfile.ok) throw new Error("Failed to fetch user profile");
    const profile = await resProfile.json();

    // Build user object
    const user = {
      users_id: dataId.users_id,
      email,
      first_name: profile.first_name || "Alice",
      last_name: profile.last_name || "Admin",
      role: "employee",
    };

    return persistUserToCache(user);
  } catch (e) {
    console.error("getUser error:", e);
    return persistUserToCache(createFallbackUser(email));
  }
}

async function startSession(users_id, firstMessage, rolePrefix = '/chat') {
  const url = `${API_BASE}${rolePrefix}/new`
  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ users_id, firstMessage }), 
    timeout: 10000
  })
  if (!res.ok) {
    const errorText = await res.text().catch(() => '')
    console.error('startSession error:', res.status, errorText)
    throw new Error(`Start session failed (${res.status}). ${errorText || ''}`)
  }
  return await res.json()
}

// 🚀 NEW: Streaming message function
async function streamChatMessage(sessionId, message, isFirstUserMessage, onChunk, onJobs, onCandidates, onTitle, rolePrefix = '/chat') {
  const url = `${API_BASE}${rolePrefix}`
  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      sessionId, 
      message, 
      isFirstUserMessage
    }),
    timeout: 60000 // Increased timeout for job searches
  })

  if (!res.ok) {
    const errorText = await res.text().catch(() => '')
    console.error('streamChatMessage error:', res.status, errorText)
    throw new Error(`Chat failed (${res.status}). ${errorText || ''}`)
  }

  // If backend responded with JSON (non-SSE fallback), handle gracefully
  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    const json = await res.json()
    if (json?.data?.content) {
      onChunk(json.data.content, null)
    } else if (json?.content) {
      onChunk(json.content, null)
    } else if (json?.messages) {
      // Join messages content for display
      const joined = (json.messages || [])
        .map(m => (m.type === 'user' ? '' : m.content))
        .filter(Boolean)
        .join('\n')
      if (joined) onChunk(joined, null)
    }
    return
  }

  // Handle SSE streaming
  if (!res.body || !res.body.getReader) {
    // Some environments (older browsers/proxies) may buffer the whole body
    const text = await res.text()
    if (text) {
      try {
        const maybe = JSON.parse(text)
        if (maybe?.content) onChunk(maybe.content, null)
      } catch {
        onChunk(text, null)
      }
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
          // Content chunk - only process actual content
          onChunk(event.content, null)
        } else if (event.jobs) {
          // Job data
          onJobs(event.jobs)
        } else if (event.candidates) {
          // Candidate data
          onCandidates(event.candidates)
        } else if (event.title) {
          // Title update
          onTitle(event.title)
        } else if (event.done) {
          // Streaming complete
          break
        } else if (event.error) {
          throw new Error(event.error)
        }
        // Ignore status events (processing, generating)
      } catch (parseError) {
        console.warn('Failed to parse SSE event:', parseError)
      }
    }
  }
}

async function getChatHistory(sessionId, rolePrefix = '/chat') {
  const url = `${API_BASE}${rolePrefix}?action=loadPreviousSession`
  console.log('Fetching chat history from:', url, 'with sessionId:', sessionId)
  
  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
    timeout: 10000
  })
  
  if (!res.ok) {
    const errorText = await res.text()
    console.error('getChatHistory error:', res.status, errorText)
    throw new Error(`getChatHistory failed: ${res.status}`)
  }
  
  const responseData = await res.json()
  console.log('Raw response from getChatHistory:', JSON.stringify(responseData, null, 2))
  return responseData
}
