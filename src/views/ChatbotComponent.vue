<template>
  <div class="chatbot-container" :class="{ 'embedded-mode': embedded }">
    <!-- Chatbot Header (hidden in embedded mode) -->
    <div v-if="!embedded" class="chatbot-header">
      <div class="header-left">
        <div class="agent-info">
          <h3>Kozi AI</h3>
          <div class="status-indicator">
            <span class="status-dot online"></span>
            <span>Online</span>
            <span 
              v-if="currentChatTitle && currentChatTitle !== 'New Chat'" 
              class="current-chat-title"
            >
              • {{ currentChatTitle }}
            </span>
          </div>
        </div>
      </div>
      
      <!-- Close button for modal view -->
      <button class="close-btn" @click="$emit('close')" v-if="showCloseButton">
        <i class="fas fa-times"></i>
      </button>
    </div>

    <!-- Main Chat Area -->
    <div class="main-chat" :class="{ 'embedded-chat': embedded }">
      <!-- Chat Content Area -->
      <div class="chat-content">
        <!-- Chat Messages Area -->
        <ChatArea 
          :messages="messages" 
          :loading="loading"
          :isNewChat="isNewChat"
          @suggestion-click="sendSuggestion" 
        />
        
        <!-- Chat Input -->
        <ChatInput 
          :disabled="loading" 
          @send="sendMessage" 
        />
      </div>
    </div>
  </div>
</template>

<script>
import { ref, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import ChatArea from '../components/ChatArea.vue'
import ChatInput from '../components/ChatInput.vue'
import { useKoziChat } from '../composables/useKoziChat'

export default {
  name: 'ChatbotComponent',
  components: {
    ChatArea,
    ChatInput
  },
  props: {
    showCloseButton: {
      type: Boolean,
      default: false
    },
    embedded: {
      type: Boolean,
      default: false
    },
    prefilledMessage: {
      type: String,
      default: ''
    },
    userType: {
      type: String,
      default: 'employee'
    }
  },
  emits: ['close'],
  setup(props) {
    const route = useRoute()
    // Track if we're in a new chat
    const isNewChat = ref(true)

    // Use our chat composable
    const {
      // State
      messages,
      loading,
      currentChatTitle,
      history,
      
      // Actions
      startNewChat: originalStartNewChat,
      sendMessage: originalSendMessage,
      sendSuggestion: originalSendSuggestion,
      loadChatHistory
    } = useKoziChat()

    // Enhanced startNewChat that sets isNewChat to true
    const startNewChat = () => {
      isNewChat.value = true
      originalStartNewChat()
    }
    
    // Watch route query to detect new chat or session load
    watch(
      () => route.query.sessionId,
      async (sessionId, oldSessionId) => {
        console.log('🔄 Route sessionId changed:', { oldSessionId, sessionId, path: route.path, fullPath: route.fullPath })
        
        // If we have a sessionId in the URL, load that chat
        if (sessionId) {
          console.log('📂 Loading chat from URL sessionId:', sessionId)
          isNewChat.value = false
          
          // Find the session in history
          const sessionInHistory = history.value.find(
            h => String(h.sessionId) === String(sessionId)
          )
          
          if (sessionInHistory) {
            try {
              await loadChatHistory(sessionInHistory)
              console.log('✅ Loaded chat from history:', sessionInHistory)
            } catch (error) {
              console.error('❌ Failed to load chat from URL:', error)
              // If loading fails, show welcome screen
              isNewChat.value = true
              startNewChat()
            }
          } else {
            console.log('⚠️ Session not found in history, will try to load from backend')
            // Try to load even if not in history (might be from direct URL)
            try {
              await loadChatHistory({ sessionId: String(sessionId) })
              isNewChat.value = false
            } catch (error) {
              console.error('❌ Failed to load chat:', error)
              isNewChat.value = true
              startNewChat()
            }
          }
          return
        }
        
        // If sessionId was removed (went from having one to not having one), start new chat
        if (oldSessionId && !sessionId) {
          console.log('🔄 SessionId removed from URL, starting new chat')
          isNewChat.value = true
          startNewChat()
          return
        }
        
        // If we're on AI agent page without sessionId and have messages, reset
        if (!sessionId && messages.value.length > 0) {
          console.log('🔄 No sessionId in URL but messages exist, resetting to welcome screen')
          isNewChat.value = true
          startNewChat()
          return
        }
        
        // If no sessionId and no messages, ensure welcome screen shows
        if (!sessionId && messages.value.length === 0 && !isNewChat.value) {
          console.log('🆕 No sessionId and no messages, ensuring welcome screen')
          isNewChat.value = true
        }
      },
      { immediate: true }
    )

    // Enhanced sendMessage that sets isNewChat to false when sending first message
    const sendMessage = (message) => {
      if (isNewChat.value) {
        isNewChat.value = false
      }
      originalSendMessage(message)
    }

    // Enhanced sendSuggestion that sets isNewChat to false
    const sendSuggestion = (suggestion) => {
      if (isNewChat.value) {
        isNewChat.value = false
      }
      originalSendSuggestion(suggestion)
    }

    // Check initial screen size on component mount
    onMounted(() => {
      console.log('🆕 ChatbotComponent mounted:', { 
        hasSessionId: !!route.query.sessionId, 
        sessionId: route.query.sessionId,
        messageCount: messages.value.length,
        path: route.path,
        fullPath: route.fullPath
      })
      
      // If no sessionId in route query, ensure we show welcome screen
      if (!route.query.sessionId) {
        console.log('🆕 No sessionId in URL on mount, ensuring welcome screen')
        isNewChat.value = true
        // Only reset if we have messages (don't interfere with initial load)
        if (messages.value.length > 0) {
          startNewChat()
        }
      } else {
        // If we have a sessionId, we're loading an existing chat
        isNewChat.value = false
      }
      
      // Auto-send prefilled message if provided
      if (props.prefilledMessage && props.prefilledMessage.trim()) {
        // Wait a bit for the chat to initialize, then send the prefilled message
        setTimeout(() => {
          console.log('🚀 Auto-sending prefilled message:', props.prefilledMessage)
          sendMessage(props.prefilledMessage)
        }, 1000)
      }
    })

    // Watch messages to ensure isNewChat is false when messages exist
    watch(
      () => messages.value,
      (newMessages) => {
        if (newMessages && newMessages.length > 0) {
          isNewChat.value = false
        }
      },
      { immediate: true, deep: true }
    )

    return {
      // State
      isNewChat,
      messages,
      loading,
      currentChatTitle,
      
      // Actions
      startNewChat,
      sendMessage,
      sendSuggestion
    }
  }
}
</script>

<style scoped>
.chatbot-container {
  display: flex;
  /* Use dynamic viewport height to avoid mobile browser UI issues */
  height: 100dvh;
  width: 100dvw;
  background: #f9fafb;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
  z-index: 9999;
}

/* Embedded mode - fits within dashboard */
.chatbot-container.embedded-mode {
  position: relative;
  height: 100%;
  width: 100%;
  z-index: 1;
  display: flex;
  flex-direction: column;
  background: white;
  overflow: hidden;
  transform: none !important;
  transition: none !important;
}

.chatbot-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  padding: 1rem 2rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  z-index: 1000;
  transition: left 0.3s ease;
}

:root {
  --chat-header-height: 80px;
}

/* Embedded header */
.chatbot-header.embedded-header {
  position: relative;
  left: 0;
  top: 0;
  width: 100%;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.sidebar-toggle-btn {
  background: #f3f4f6;
  border: none;
  padding: 0.75rem;
  border-radius: 0.5rem;
  cursor: pointer;
  color: #6b7280;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
}

.sidebar-toggle-btn:hover {
  background: #ec4899;
  color: white;
  transform: scale(1.05);
}

.agent-info h3 {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
  color: #111827;
  letter-spacing: -0.025em;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  position: relative;
}

.status-dot.online {
  background: #10b981;
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
}

.status-dot.online::before {
  content: '';
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  border-radius: 50%;
  background: #10b981;
  animation: pulse 2s infinite;
  opacity: 0.6;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 0.6; }
  50% { transform: scale(1.2); opacity: 0.3; }
}

.current-chat-title {
  color: #6b7280;
  font-size: 0.875rem;
  font-weight: 500;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.close-btn {
  background: #f3f4f6;
  border: none;
  padding: 0.75rem;
  border-radius: 0.5rem;
  cursor: pointer;
  color: #6b7280;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
}

.close-btn:hover {
  background: #ef4444;
  color: white;
  transform: scale(1.05);
}

.main-chat {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: white;
  position: fixed;
  top: var(--chat-header-height);
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
}

/* Embedded chat */
.main-chat.embedded-chat {
  position: relative;
  top: 0;
  left: 0 !important;
  right: 0;
  bottom: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100%;
}

/* Chat content area (right side in embedded mode) */
.chat-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0; /* allow ChatArea to size and scroll */
  overflow: hidden;
  background: white;
}

/* Removed embedded topbar - cleaner design */

/* Provide a slightly narrower max width like the reference */
.chat-content > :deep(.message-content) { max-width: 720px; }

/* Mobile responsive */
@media (max-width: 768px) {
  :root { --chat-header-height: 70px; }
  
  .chatbot-header {
    padding: 1rem;
    left: 0;
  }

  /* Ensure chat input respects safe-area insets on modern iOS browsers */
  :deep(.chat-input-container) {
    padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 16px) !important;
  }
  
  .agent-info h3 {
    font-size: 1.125rem;
  }
  
  .main-chat { top: 70px; left: 0; right: 0; bottom: 0; height: calc(100dvh - 70px); }
  
  /* Embedded mode mobile - ensure full width */
  .chatbot-container.embedded-mode {
    flex-direction: column !important;
    width: 100% !important;
    max-width: 100vw !important;
    overflow-x: hidden !important;
  }
  
  /* Ensure main chat takes full width on mobile */
  .main-chat.embedded-chat {
    width: 100% !important;
    max-width: 100vw !important;
  }
}
</style>

