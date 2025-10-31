// src/composables/useKoziChat.js
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

const LAST_ACTIVE_SESSION_KEY = 'kozi_last_active_session'

// Save last active session to localStorage
function saveLastActiveSession(sessionId) {
  if (!sessionId) return
  localStorage.setItem(LAST_ACTIVE_SESSION_KEY, JSON.stringify({
    sessionId,
    timestamp: Date.now()
  }))
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
  
  // Get role from localStorage
  const getRoleFromLocalStorage = () => {
    const employeeRoleId = localStorage.getItem('employeeRoleId')
    const employerRoleId = localStorage.getItem('employerRoleId')
    const adminRoleId = localStorage.getItem('adminRoleId')
    const selectedRoleId = localStorage.getItem('selectedRoleId')
    
    // Check selected role first
    if (selectedRoleId === '2' || employerRoleId === '2') {
      return 'employer'
    } else if (selectedRoleId === '3' || adminRoleId === '3') {
      return 'admin'
    } else if (selectedRoleId === '1' || employeeRoleId === '1') {
      return 'employee'
    }
    
    // Fallback to URL detection
    const currentPath = window.location.pathname
    if (currentPath.includes('/admin')) {
      return 'admin'
    } else if (currentPath.includes('/employer/') || currentPath.includes('/jobprovider/')) {
      return 'employer'
    }
    
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

  // Load history from backend on mount (source of truth)
  onMounted(async () => {
    // Update role detection on mount
    updateRoleFromURL()
    
    // Initialize user first
    await initializeUser()
    
    // Always prioritize loading from backend (source of truth)
    if (currentUser.value) {
      await loadHistoryFromBackend()
    } else {
      // Fallback to localStorage if user not initialized yet
      const savedHistory = localStorage.getItem('kozi-chat-history')
      if (savedHistory) {
        try {
          const parsedHistory = JSON.parse(savedHistory)
          history.value = parsedHistory.map(item => ({
            ...item,
            timestamp: item.timestamp || new Date(item.createdAt).getTime() || Date.now(),
            createdAt: item.createdAt || new Date(item.timestamp) || new Date()
          }))
          console.log('Loaded localStorage chat history (fallback):', history.value)
        } catch (e) {
          console.warn('Failed to load localStorage chat history:', e)
          history.value = []
        }
      } else {
        history.value = []
      }
      
      // Try loading from backend once user is available
      setTimeout(async () => {
        if (currentUser.value) {
          await loadHistoryFromBackend()
        }
      }, 1000)
    }
    
    // Note: We no longer auto-restore the last active session
    // Chat sessions should only be loaded when explicitly requested via URL query parameter
    // This prevents conversations from auto-opening after refresh or logout/login
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

  const saveCurrentChatToHistory = async () => {
    if (!currentSession.value || messages.value.length === 0) return

    const firstUserMessage = messages.value.find((m) => m.sender === 'user')?.text
    
    // Use the current title if available and meaningful, otherwise generate from first message
    let finalTitle = currentChatTitle.value
    if (!finalTitle || finalTitle === 'New Chat') {
      if (firstUserMessage) {
        // Generate a meaningful title from the first user message
        finalTitle = generateChatTitle(firstUserMessage)
      } else {
        finalTitle = 'New Chat'
      }
    }

    const lastMessage = messages.value[messages.value.length - 1]
    let cleanLastMessage = ''

    if (lastMessage) {
      if (lastMessage.sender === 'user') {
        cleanLastMessage = lastMessage.text
      } else {
        cleanLastMessage = stripHtmlAndFormat(lastMessage.text)
      }
    }

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
      timestamp: currentTimestamp,
      messageCount: messages.value.length,
      lastMessage: cleanLastMessage.substring(0, 100),
      createdAt: new Date(currentTimestamp)
    }

    // Update local history immediately
    const filtered = history.value.filter((item) => item.sessionId !== currentSession.value)
    history.value = [chatEntry, ...filtered].slice(0, 50)
    localStorage.setItem('kozi-chat-history', JSON.stringify(history.value))
    
    // Reload from backend to ensure sync (backend is source of truth)
    if (currentUser.value) {
      try {
        // Small delay to ensure backend has saved the message
        setTimeout(async () => {
          await loadHistoryFromBackend()
        }, 500)
      } catch (e) {
        console.warn('Failed to sync history with backend:', e)
      }
    }
    
    console.log('Saved chat to history:', chatEntry)
  }

  const startNewChat = async () => {
    // Save current chat to history if it has messages
    if (currentSession.value && messages.value.length > 0) {
      saveCurrentChatToHistory()
    }

    // Reset all state immediately - like other AI chatbots
    messages.value = []
    currentSession.value = null
    chatStarted.value = false
    error.value = null
    currentChatTitle.value = 'New Chat'
    clearLastActiveSession() // Clear last active session so it doesn't auto-restore
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

    // Auto-start chat if needed
    if (!chatStarted.value || !currentSession.value) {
      console.log('Auto-starting chat session with first message:', text)
      try {
        loading.value = true
        // Pass the actual first message so backend can generate a meaningful title
        const data = await startSession(currentUser.value.users_id, text, getApiPrefix())

        if (data?.data?.session_id) {
          currentSession.value = data.data.session_id
          chatStarted.value = true
          saveLastActiveSession(data.data.session_id)
          
          // Update title if backend provided one
          if (data?.data?.title) {
            currentChatTitle.value = data.data.title
            console.log('✅ Received title from backend:', data.data.title)
          }
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

    // Create empty placeholder for streaming response
    const botMessageIndex = messages.value.length
    messages.value.push({ 
      sender: 'assistant', 
      text: '',
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
          if (chunk) {
            streamingMessage.value += chunk
            messages.value[botMessageIndex].text = formatMessage(streamingMessage.value)
            messages.value[botMessageIndex].streaming = true
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
            
            // Update in history if session exists
            const sessionIndex = history.value.findIndex(
              h => String(h.sessionId) === String(currentSession.value)
            );
            if (sessionIndex !== -1) {
              history.value[sessionIndex].title = title;
              localStorage.setItem('kozi-chat-history', JSON.stringify(history.value));
              console.log('✅ Updated title in history:', title)
            } else {
              // If not in history yet, reload from backend
              if (currentUser.value) {
                setTimeout(async () => {
                  await loadHistoryFromBackend()
                }, 500)
              }
            }
          }
        },
        getApiPrefix()
      )

      messages.value[botMessageIndex].streaming = false
      
      // Save to history after message completes (ensures persistence)
      if (currentSession.value && messages.value.length > 0) {
        saveCurrentChatToHistory()
        
        // Reload history from backend to get updated title and ensure sidebar syncs
        // Also dispatch event to notify sidebars to reload
        if (currentUser.value) {
          setTimeout(async () => {
            console.log('🔄 Reloading history from backend after message')
            await loadHistoryFromBackend()
            
            // Dispatch custom event to notify sidebar components
            window.dispatchEvent(new CustomEvent('chatHistoryUpdated', {
              detail: { sessionId: currentSession.value }
            }))
          }, 1000)
        }
      }

    } catch (e) {
      console.error('Failed to send message:', e)
      error.value = 'Failed to send message'
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
        saveLastActiveSession(historyItem.sessionId)
      } else {
        currentSession.value = historyItem.sessionId
        currentChatTitle.value = historyItem.title
        chatStarted.value = true
        saveLastActiveSession(historyItem.sessionId)
        messages.value = []
      }
    } catch (e) {
      console.error('Failed to load history:', e)
      currentSession.value = historyItem.sessionId
      currentChatTitle.value = historyItem.title
      chatStarted.value = true
      saveLastActiveSession(historyItem.sessionId)
      messages.value = []
    } finally {
      loading.value = false
    }
  }

  async function getUserChatSessions(users_id) {
    const url = `${API_BASE}${getApiPrefix()}/sessions?users_id=${users_id}`
    console.log('📋 Fetching chat sessions from:', url)
    const res = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    })
    
    if (!res.ok) {
      const errorText = await res.text()
      console.error('getUserChatSessions error:', res.status, errorText)
      throw new Error(`getUserChatSessions failed: ${res.status}`)
    }
    
    const data = await res.json()
    console.log('📋 Received chat sessions:', data)
    return data
  }

  const loadHistoryFromBackend = async () => {
    if (!currentUser.value) {
      console.warn('⚠️ Cannot load history: no current user')
      return
    }
    
    try {
      console.log('📚 Loading chat history from backend for user:', currentUser.value.users_id)
      const data = await getUserChatSessions(currentUser.value.users_id)
      
      console.log('📚 Backend returned data:', data)
      
      if (data?.sessions && Array.isArray(data.sessions)) {
        console.log(`✅ Found ${data.sessions.length} chat sessions`)
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
            timestamp: sessionTimestamp,
            messageCount: session.messages ? session.messages.length : 0,
            lastMessage: cleanLastMessage.substring(0, 100),
            createdAt: new Date(sessionTimestamp)
          }
        })
        
        backendHistory.sort((a, b) => b.timestamp - a.timestamp)
        
        history.value = backendHistory
        console.log('✅ Loaded backend chat history:', backendHistory.length, 'sessions')
        console.log('📋 Sessions:', backendHistory.map(s => ({ id: s.sessionId, title: s.title })))
        localStorage.setItem('kozi-chat-history', JSON.stringify(backendHistory))
      } else {
        console.warn('⚠️ No chat sessions found in backend response. Data structure:', data)
        history.value = []
      }
    } catch (e) {
      console.error('Failed to load chat history from backend:', e)
    }
  }

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

      history.value = history.value.filter(
        (item) => item.sessionId !== sessionId
      )

      if (currentSession.value === sessionId) {
        currentSession.value = null
        messages.value = []
        currentChatTitle.value = "New Chat"
        chatStarted.value = false
        clearLastActiveSession()
      }

      return result
    } catch (err) {
      console.error("Failed to delete chat session:", err)
      throw err
    }
  }

  const clearAllHistory = async () => {
    if (!currentUser.value || !currentUser.value.users_id) {
      console.error("❌ Cannot clear history: User not logged in")
      return
    }

    const users_id = currentUser.value.users_id

    try {
      history.value = []
      localStorage.removeItem("kozi-chat-history")

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

      currentSession.value = null
      messages.value = []
      currentChatTitle.value = "New Chat"
      chatStarted.value = false
      clearLastActiveSession()

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
    debugHistoryTimestamps,
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

  // --- Markdown-like syntax fixes ---

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
// const API_BASE = 'https://kozi-ai-agent-production.up.railway.app/api'.replace(/\/+$/, '')
const API_BASE = 'http://localhost:5050/api'.replace(/\/+$/, '')

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
  const { timeout = 10000 } = options
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(resource, { ...options, signal: controller.signal })
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
    
    // Try all possible token locations
    const token = employeeToken || employerToken || adminToken
    
    console.log('🔍 LocalStorage user data:', {
      userEmail,
      hasEmployeeToken: !!employeeToken,
      hasEmployerToken: !!employerToken,
      hasAdminToken: !!adminToken,
      hasAnyToken: !!token,
      allKeys: Object.keys(localStorage)
    })
    
    if (!userEmail) {
      throw new Error('No user email found in localStorage. Please log in.')
    }
    
    if (!token) {
      throw new Error('No authentication token found in localStorage. Please log in.')
    }
    
    // Fetch user_id from API using the email
    console.log('🔍 Fetching user ID for email:', userEmail)
    const resId = await fetch(
      `https://apis.kozi.rw/get_user_id_by_email/${encodeURIComponent(userEmail)}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );
    
    if (!resId.ok) {
      console.error('❌ User ID fetch failed:', resId.status, await resId.text())
      throw new Error(`Failed to fetch user ID: ${resId.status}`)
    }
    
    const dataId = await resId.json();
    console.log('📋 User ID response:', dataId)
    
    if (!dataId.users_id) {
      throw new Error('No user ID returned from API')
    }

    // Build basic user object first
    const user = {
      users_id: dataId.users_id,
      email: userEmail,
      first_name: userEmail.split('@')[0] || 'User',
      last_name: '',
      token: token
    };

    // Try to fetch profile data (but don't fail if this doesn't work)
    try {
      let profile = null;
      
      // Try multiple endpoints
      const endpoints = [
        `https://apis.kozi.rw/provider/view_profile/${dataId.users_id}`,
        `https://apis.kozi.rw/employee/view_profile/${dataId.users_id}`,
        `https://apis.kozi.rw/users/profile/${dataId.users_id}`
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
  
  const token = employeeToken || employerToken || adminToken;
  
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
    hasAnyToken: !!token,
    headers
  });
  
  return headers;
}

async function startSession(users_id, firstMessage, rolePrefix = '/chat') {
  const url = `${API_BASE}${rolePrefix}/new`
  console.log('🚀 Starting chat session at:', url, 'with API_BASE:', API_BASE)
  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: getAuthHeaders(),
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

// 🚀 Streaming message function
async function streamChatMessage(sessionId, message, isFirstUserMessage, onChunk, onJobs, onCandidates, onTitle, rolePrefix = '/chat') {
  const url = `${API_BASE}${rolePrefix}`
  console.log('🚀 AI Chat calling:', url, 'with API_BASE:', API_BASE)
  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ 
      sessionId, 
      message, 
      isFirstUserMessage
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
    const json = await res.json()
    if (json?.data?.content) {
      onChunk(json.data.content, null)
    } else if (json?.content) {
      onChunk(json.content, null)
    } else if (json?.messages) {
      const joined = (json.messages || [])
        .map(m => (m.type === 'user' ? '' : m.content))
        .filter(Boolean)
        .join('\n')
      if (joined) onChunk(joined, null)
    }
    return
  }

  if (!res.body || !res.body.getReader) {
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

async function getChatHistory(sessionId, rolePrefix = '/chat') {
  const url = `${API_BASE}${rolePrefix}?action=loadPreviousSession`
  console.log('Fetching chat history from:', url, 'with sessionId:', sessionId)
  
  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: getAuthHeaders(),
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