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
            addBotMessage('Sorry, I could not retrieve your user information. Please refresh the page and try again. If the issue persists, please log out and log in again.');
          }
          return;
        }
      }
      
      try {
        loading.value = true
        // Pass the actual first message so backend can generate a meaningful title
        const data = await startSession(users_id, text, getApiPrefix())

        if (data?.data?.session_id) {
          currentSession.value = data.data.session_id
          chatStarted.value = true
          saveLastActiveSession(data.data.session_id)
          
          // Update title if backend provided one
          if (data?.data?.title) {
            currentChatTitle.value = data.data.title
            console.log('✅ Received title from backend:', data.data.title)
          }
          
          // Dispatch event immediately after session creation so sidebar can load history
          console.log('📢 Dispatching chatHistoryUpdated event after session creation')
          window.dispatchEvent(new CustomEvent('chatHistoryUpdated', {
            detail: { sessionId: data.data.session_id }
          }))
        } else {
          throw new Error('Failed to start session')
        }
      } catch (e) {
        console.error('❌ Auto-start failed:', e)
        console.error('❌ Error details:', {
          message: e.message,
          users_id: users_id,
          apiPrefix: getApiPrefix(),
          hasToken: !!localStorage.getItem('employeeToken') || !!localStorage.getItem('employerToken') || !!localStorage.getItem('adminToken') || !!localStorage.getItem('agentToken')
        })
        
        // Show more specific error message based on the error
        let errorMessage = 'Sorry, I could not connect right now. Please try again in a moment.'
        if (e.message) {
          if (e.message.includes('users_id')) {
            errorMessage = 'Unable to retrieve your user ID. Please refresh the page and try again.'
          } else if (e.message.includes('401') || e.message.includes('Unauthorized')) {
            errorMessage = 'Your session has expired. Please log in again.'
          } else if (e.message.includes('403') || e.message.includes('Forbidden')) {
            errorMessage = 'You don\'t have permission to start a chat. Please check your account settings.'
          } else if (e.message.includes('500') || e.message.includes('Internal Server Error')) {
            errorMessage = 'Server error occurred. Please try again in a moment.'
          } else if (e.message.includes('Network') || e.message.includes('fetch')) {
            errorMessage = 'Network error. Please check your internet connection and try again.'
          }
        }
        
        addBotMessage(errorMessage)
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
          // Dispatch event immediately first (sidebar can load in background)
          console.log('📢 Dispatching chatHistoryUpdated event after message completion')
          window.dispatchEvent(new CustomEvent('chatHistoryUpdated', {
            detail: { sessionId: currentSession.value }
          }))
          
          // Then reload from backend after a short delay
          setTimeout(async () => {
            console.log('🔄 Reloading history from backend after message')
            await loadHistoryFromBackend()
            
            // Dispatch event again after backend sync to ensure sidebar has latest data
            window.dispatchEvent(new CustomEvent('chatHistoryUpdated', {
              detail: { sessionId: currentSession.value }
            }))
          }, 1500)
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
    
    // If users_id is missing, try to fetch it first
    if (!currentUser.value.users_id) {
      console.log('⚠️ users_id missing for history load, attempting to fetch...');
      try {
        const userEmail = localStorage.getItem('userEmail');
        const employeeToken = localStorage.getItem('employeeToken');
        const employerToken = localStorage.getItem('employerToken');
        const adminToken = localStorage.getItem('adminToken');
        const agentToken = localStorage.getItem('agentToken');
        const token = employeeToken || employerToken || adminToken || agentToken;
        
        if (userEmail && token) {
          // Try API first
          try {
            const resId = await fetch(
              `https://apis.kozi.rw/get_user_id_by_email/${encodeURIComponent(userEmail)}`,
              {
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
              }
            );
            
            if (resId.ok) {
              const dataId = await resId.json();
              if (dataId.users_id) {
                currentUser.value.users_id = dataId.users_id;
                console.log('✅ Fetched users_id for history:', currentUser.value.users_id);
              }
            } else {
              // Try token payload
              try {
                const payload = JSON.parse(atob(token.split(".")[1]));
                if (payload.userId || payload.user_id || payload.id || payload.users_id || payload.sub) {
                  currentUser.value.users_id = payload.userId || payload.user_id || payload.id || payload.users_id || payload.sub;
                  console.log('✅ Extracted users_id from token for history:', currentUser.value.users_id);
                }
              } catch (e) {
                console.warn('⚠️ Could not extract userId from token for history:', e);
              }
            }
          } catch (fetchError) {
            console.warn('⚠️ Error fetching userId for history:', fetchError);
          }
        }
      } catch (e) {
        console.warn('⚠️ Failed to get users_id for history load:', e);
      }
    }
    
    if (!currentUser.value.users_id) {
      console.warn('⚠️ Cannot load history: no user ID available after fetch attempt');
      return;
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

async function startSession(users_id, firstMessage, rolePrefix = '/chat') {
  // Validate users_id before making the request
  if (!users_id || isNaN(Number(users_id))) {
    console.error('❌ startSession: Invalid users_id:', users_id)
    throw new Error('Invalid user ID. Please refresh the page and try again.')
  }
  
  const url = `${API_BASE}${rolePrefix}/new`
  console.log('🚀 Starting chat session at:', url, 'with API_BASE:', API_BASE)
  console.log('🚀 Request body:', { users_id: Number(users_id), firstMessage: firstMessage?.substring(0, 50) + '...' })
  
  try {
  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: getAuthHeaders(),
      body: JSON.stringify({ users_id: Number(users_id), firstMessage }), 
    timeout: 10000
  })
    
  if (!res.ok) {
    const errorText = await res.text().catch(() => '')
      console.error('❌ startSession error:', res.status, errorText)
      throw new Error(`Start session failed (${res.status}). ${errorText || 'Unknown error'}`)
    }
    
    const data = await res.json()
    console.log('✅ startSession success:', data)
    return data
  } catch (e) {
    console.error('❌ startSession exception:', e)
    throw e
  }
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