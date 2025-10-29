<template>
  <div class="chatbot-container" :class="{ 'embedded-mode': embedded }">
    <!-- Chatbot Header (hidden in embedded mode) -->
    <div v-if="!embedded" class="chatbot-header" :class="{ 'minimized-sidebar': sidebarMinimized && !isMobile, 'full-sidebar': !sidebarMinimized && !isMobile }">
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

    <!-- Sidebar Overlay for Mobile -->
    <div 
      v-if="isMobile && sidebarVisible" 
      class="sidebar-overlay" 
      @click="toggleSidebar"
    ></div>

    <!-- Mobile toggle button -->
    <button 
      v-if="isMobile" 
      class="mobile-sidebar-toggle" 
      @click="toggleSidebar"
      :aria-label="sidebarVisible ? 'Close history' : 'Open history'"
    >
      <i class="fas fa-bars"></i>
    </button>

    <!-- Floating history button for small devices (more visible) -->
    <button
      v-if="isMobile"
      class="mobile-history-button"
      @click="toggleSidebar"
      :aria-label="sidebarVisible ? 'Close history' : 'Open history'"
      title="Open chat history"
    >
      <i class="fas fa-history" aria-hidden="true"></i>
    </button>

    <!-- Sidebar (can be controlled via showSidebar prop) -->
    <Sidebar 
      v-if="shouldShowSidebar"
      :class="{ 
        'open': sidebarVisible && isMobile, 
        'desktop-visible': !isMobile,
        'sidebar-embedded': embedded
      }"
      :visible="sidebarVisible"
      :isMobile="isMobile"
      :history="history"
      :currentSessionId="currentSession"
      :isMinimized="sidebarMinimized && !isMobile"
      @new-chat="startNewChat" 
      @toggle="toggleSidebar"
      @load-history="enhancedLoadChatHistory"
      @delete-history="handleDeleteHistory"
      @clear-history="clearAllHistory"
    />

    <!-- Main Chat Area -->
    <div class="main-chat" :class="{ 'minimized-sidebar': sidebarMinimized && !isMobile, 'full-sidebar': !sidebarMinimized && !isMobile, 'embedded-chat': embedded }">
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
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import Sidebar from '../components/Sidebar.vue'
import ChatArea from '../components/ChatArea.vue'
import ChatInput from '../components/ChatInput.vue'
import { useKoziChat } from '../composables/useKoziChat'

export default {
  name: 'ChatbotComponent',
  components: {
    Sidebar,
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
    showSidebar: {
      type: Boolean,
      default: undefined
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
    // Local component state for sidebar visibility
    const sidebarVisible = ref(true)
    
    // Track if sidebar is minimized (desktop only) - starts minimized by default
    const sidebarMinimized = ref(true)

    // Track if we're on mobile
    const isMobile = ref(false)

    // Track if we're in a new chat
    const isNewChat = ref(true)

    // Computed: Determine if sidebar should be shown
    // If showSidebar prop is explicitly set, use it; otherwise default based on embedded mode
    const shouldShowSidebar = computed(() => {
      if (props.showSidebar !== undefined) {
        return props.showSidebar
      }
      // Always mount on mobile so the button can show/hide it
      if (isMobile.value) return true
      return !props.embedded
    })

    // Check screen size
    const checkScreenSize = () => {
      isMobile.value = window.innerWidth <= 768
      // Auto-hide sidebar on mobile by default
      if (isMobile.value) {
        sidebarVisible.value = false
      } else {
        // Show sidebar by default on desktop
        sidebarVisible.value = true
      }
    }

    // Use our chat composable
    const {
      // State
      messages,
      history,
      loading,
      currentChatTitle,
      currentSession,
      
      // Actions
      startNewChat: originalStartNewChat,
      sendMessage: originalSendMessage,
      sendSuggestion: originalSendSuggestion,
      loadChatHistory,
      deleteHistoryItem,
      clearAllHistory
    } = useKoziChat()

    // Enhanced startNewChat that sets isNewChat to true
    const startNewChat = () => {
      isNewChat.value = true
      originalStartNewChat()
      // Auto-close sidebar on mobile after starting new chat
      if (isMobile.value) {
        sidebarVisible.value = false
      }
    }

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

    // Enhanced loadChatHistory that sets isNewChat to false
    const enhancedLoadChatHistory = (historyItem) => {
      console.log('📂 Loading chat history:', historyItem)
      isNewChat.value = false // Set to false BEFORE loading
      loadChatHistory(historyItem)
      // Auto-close sidebar on mobile after loading chat
      if (isMobile.value) {
        sidebarVisible.value = false
      }
    }

    // Enhanced deleteHistoryItem that extracts sessionId from item
    const handleDeleteHistory = async (item) => {
      try {
        console.log('🗑️ Delete button clicked, item received:', item)
        const sessionId = item.sessionId || item.id || item
        console.log('🗑️ Extracted sessionId:', sessionId)
        
        if (!sessionId) {
          console.error('❌ No valid sessionId found in item:', item)
          alert('Cannot delete: Invalid session ID')
          return
        }
        
        await deleteHistoryItem(sessionId)
        console.log('✅ Delete completed successfully')
      } catch (error) {
        console.error('❌ Failed to delete chat session:', error)
        alert(`Failed to delete chat: ${error.message}`)
      }
    }

    // Sidebar toggle functionality
    const toggleSidebar = () => {
      if (isMobile.value) {
        sidebarVisible.value = !sidebarVisible.value
      } else {
        sidebarMinimized.value = !sidebarMinimized.value
      }
    }

    // Check initial screen size on component mount
    onMounted(() => {
      checkScreenSize()
      
      // Add resize listener
      window.addEventListener('resize', checkScreenSize)
      
      // Auto-send prefilled message if provided
      if (props.prefilledMessage && props.prefilledMessage.trim()) {
        // Wait a bit for the chat to initialize, then send the prefilled message
        setTimeout(() => {
          console.log('🚀 Auto-sending prefilled message:', props.prefilledMessage)
          sendMessage(props.prefilledMessage)
        }, 1000)
      }
    })

    // Cleanup resize listener
    onUnmounted(() => {
      window.removeEventListener('resize', checkScreenSize)
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
      sidebarVisible,
      sidebarMinimized,
      isMobile,
      isNewChat,
      shouldShowSidebar,
      messages,
      history,
      loading,
      currentChatTitle,
      currentSession,
      
      // Actions
      startNewChat,
      sendMessage,
      sendSuggestion,
      enhancedLoadChatHistory,
      handleDeleteHistory,
      clearAllHistory,
      toggleSidebar
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
  flex-direction: row; /* Changed from column to row to show sidebar + chat side by side */
  background: #f9fafb;
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

/* Header with full sidebar (desktop) */
.chatbot-header.full-sidebar {
  left: 280px;
}

/* Header with minimized sidebar (desktop) */
.chatbot-header.minimized-sidebar {
  left: 60px;
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

.sidebar-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 9999;
  animation: fadeIn 0.2s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
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
  transition: left 0.3s ease;
}

/* Main chat with full sidebar (desktop) */
.main-chat.full-sidebar {
  left: 280px;
}

/* Main chat with minimized sidebar (desktop) */
.main-chat.minimized-sidebar {
  left: 60px;
}

/* Embedded chat */
.main-chat.embedded-chat {
  position: relative;
  top: 0;
  left: 0 !important; /* Override any left offset */
  right: 0;
  bottom: 0;
  flex: 1;
  display: flex;
  flex-direction: row;
  overflow: hidden;
  height: 100%;
}

/* Sidebar in embedded mode - use relative positioning */
:deep(.sidebar-embedded) {
  position: relative !important;
  height: 100% !important;
  max-height: 100% !important;
  top: auto !important;
  left: auto !important;
  z-index: 1 !important;
  flex-shrink: 0; /* Prevent sidebar from shrinking */
}

/* Agent sidebar removed for cleaner design */

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
  .mobile-sidebar-toggle {
    position: fixed;
    top: 16px;
    left: 16px;
    z-index: 10050;
    width: 40px;
    height: 40px;
    border-radius: 10px;
    border: 1px solid #eee;
    background: #fff;
    color: #374151;
    box-shadow: 0 4px 12px rgba(0,0,0,.08);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .chatbot-header {
    padding: 1rem;
    left: 0;
  }

  /* Ensure chat input and floating controls respect safe-area insets on modern iOS browsers */
  :deep(.chat-input-container) {
    padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 16px) !important;
  }

  .mobile-history-button {
    bottom: calc(90px + env(safe-area-inset-bottom, 0px));
  }

  /* Floating history button placed above the chat input on mobile */
  .mobile-history-button {
    position: fixed;
    right: 16px;
    bottom: 90px; /* placed above typical chat input area */
    z-index: 10060;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    border: none;
    background: linear-gradient(135deg, #E960A6 0%, #F472B6 100%);
    color: white;
    box-shadow: 0 8px 20px rgba(233,96,166,0.18);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: transform 0.12s ease, box-shadow 0.12s ease;
  }

  .mobile-history-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 28px rgba(233,96,166,0.22);
  }

  .mobile-history-button i { font-size: 18px; }
  
  .agent-info h3 {
    font-size: 1.125rem;
  }
  
  .main-chat { top: 70px; left: 0; right: 0; bottom: 0; height: calc(100dvh - 70px); }
  
  /* Embedded mode mobile - ensure full width and no sidebar issues */
  .chatbot-container.embedded-mode {
    flex-direction: column !important;
    width: 100% !important;
    max-width: 100vw !important;
    overflow-x: hidden !important;
  }
  
  /* Show chat sidebar on mobile in embedded mode (slides via Sidebar styles) */
  .chatbot-container.embedded-mode :deep(.sidebar-embedded) {
    display: block !important;
    position: fixed !important;
    top: 70px !important;
    left: 0 !important;
    height: calc(100dvh - 70px) !important;
    width: 100% !important;
    z-index: 10061 !important;
  }
  
  /* Ensure main chat takes full width on mobile */
  .main-chat.embedded-chat {
    width: 100% !important;
    max-width: 100vw !important;
  }
}
</style>

