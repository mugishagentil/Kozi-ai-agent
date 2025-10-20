<template>
  <div class="sidebar" :class="{ 
      'minimized': isMinimized, 
      'open': isMobile && visible, 
      'desktop-visible': !isMobile,
      'mobile': isMobile
    }" 
    :style="[
      mobileStyle,
      { height: isMobile ? '' : `calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))` }
    ]"
  >
    
    <div class="sidebar-header" v-if="!isMobile" :style="{ paddingTop: '1rem' }">
      <h2 v-if="!isMinimized">Chats</h2>
      <button class="menu-toggle" @click="handleToggle" :title="isMinimized ? 'Expand sidebar' : 'Collapse sidebar'">
        <i :class="isMinimized ? 'fas fa-bars' : 'fas fa-times'"></i>
      </button>
    </div>

    <div v-if="!isMobile" class="desktop-content">
      <div class="new-chat-row">
        <button class="new-chat-btn" @click="handleNewChat">
          <i class="fas fa-plus"></i>
          <span v-if="!isMinimized">New Chat</span>
        </button>
      </div>

      <div class="chat-history">
        <div class="history-controls">
          <div class="history-header">History</div>
          <button
            class="clear-history-btn"
            :class="{ confirm: showClearConfirm }"
            @click="handleClearAll"
            :title="showClearConfirm ? 'Click to confirm clearing history' : 'Clear all chat history'"
          >
            <i class="fas" :class="showClearConfirm ? 'fa-check' : 'fa-trash'"></i>
            <span>{{ showClearConfirm ? 'Confirm' : 'Clear' }}</span>
          </button>
        </div>

        <div class="history-content" v-if="sortedHistory.length">
          <div
            v-for="(item, index) in sortedHistory"
            :key="item.sessionId || index"
            class="history-item"
            :class="{ 'active': isActive(item.sessionId) }"
            @click="handleHistoryClick(item)"
          >
            <div class="history-content-wrapper">
              <div class="history-title">{{ item.title || 'Untitled Chat' }}</div>
            </div>
            <button
              class="delete-history-btn"
              @click.stop="handleDeleteHistory(item)"
              title="Delete this chat"
            >
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>

        <div class="empty-history" v-else>
          <p>No chats yet</p>
          <p class="subtext">Start a new conversation</p>
        </div>
      </div>
    </div>

    <div class="mobile-modal-content-wrapper" v-if="isMobile && visible">
        <div class="mobile-modal-header">
            <h2>Chats</h2>
            <button class="close-mobile-modal" @click="handleToggle" aria-label="Close history" title="Close">
                <i class="fas fa-times"></i>
            </button>
        </div>

        <div class="new-chat-row mobile-new-chat-row">
            <button class="new-chat-btn" @click="handleNewChat">
                <i class="fas fa-plus"></i>
                <span>New Chat</span>
            </button>
        </div>

        <div class="chat-history mobile-chat-history">
            <div class="history-content">
                <div 
                    v-for="(item, index) in sortedHistory"
                    :key="item.sessionId || index" 
                    class="history-item"
                    :class="{ 'active': isActive(item.sessionId) }"
                    @click="handleHistoryClick(item)"
                >
                    <div class="history-content-wrapper">
                        <div class="history-title">{{ item.title || 'Untitled Chat' }}</div>
                    </div>
                    <button 
                        class="delete-history-btn"
                        @click.stop="handleDeleteHistory(item)"
                        title="Delete this chat"
                    >
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue'

export default {
  name: 'ChatSidebar',
  props: {
    history: {
      type: Array,
      default: () => []
    },
    currentSessionId: {
      type: String,
      default: null
    },
    isMinimized: {
      type: Boolean,
      default: false
    },
    // Mobile visibility control (passed from parent)
    visible: {
      type: Boolean,
      default: true
    },
    isMobile: {
      type: Boolean,
      default: false
    }
  },
  emits: ['new-chat', 'toggle', 'load-history', 'delete-history', 'clear-history'],
  setup(props, { emit }) {
    // Local state for clear confirmation
    const showClearConfirm = ref(false)

    // Check if item is active
    const isActive = (sessionId) => {
      return props.currentSessionId === sessionId
    }

    // Sort history by creation time (newest first)
    const sortedHistory = computed(() => {
      return [...props.history].sort((a, b) => {
        const timeA = new Date(a.createdAt || 0)
        const timeB = new Date(b.createdAt || 0)
        return timeB - timeA
      })
    })

    // Event handlers
    const handleNewChat = () => {
      emit('new-chat')
    }

    const handleToggle = () => {
      emit('toggle')
    }

    const handleHistoryClick = (item) => {
      emit('load-history', item)
    }

    const handleDeleteHistory = (item) => {
      emit('delete-history', item)
    }

    const handleClearAll = () => {
      if (showClearConfirm.value) {
        emit('clear-history')
        showClearConfirm.value = false
      } else {
        showClearConfirm.value = true
        setTimeout(() => {
          showClearConfirm.value = false
        }, 3000)
      }
    }

    const mobileStyle = computed(() => {
      return null
    })

    return {
      showClearConfirm,
      isActive,
      sortedHistory,
      handleNewChat,
      handleToggle,
      handleHistoryClick,
      handleDeleteHistory,
      handleClearAll,
      mobileStyle
    }
  }
}
</script>

<style scoped>
/* Existing Desktop Styles (UNTOUCHED) */
.sidebar {
  width: 280px;
  height: 100vh;
  max-height: 100vh;
  background: var(--sidebar-bg, #f8f9fa);
  border-right: 1px solid var(--border-color, #e9ecef);
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 10001;
  transition: all 0.3s ease;
  overflow: hidden;
}

/* Minimized sidebar state */
.sidebar.minimized {
  width: 60px;
}

.sidebar.minimized .sidebar-header {
  justify-content: center;
  padding: 1rem 0.5rem;
}

.sidebar.minimized .new-chat-btn {
  justify-content: center;
  padding: 0.75rem;
  margin: 1rem 0.5rem;
}

.sidebar.minimized .new-chat-btn i {
  margin: 0;
}

/* Hide history section when sidebar is minimized */
.sidebar.minimized .chat-history {
  display: none;
}

.sidebar-header {
  padding: 1rem;
  border-bottom: 1px solid var(--border-color, #e9ecef);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--header-bg, #ffffff);
}

.sidebar-header h2 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary, #333);
}

.menu-toggle {
  background: none;
  border: none;
  font-size: 1.2rem;
  color: var(--text-secondary, #666);
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.menu-toggle:hover {
  background: var(--hover-bg, #f0f0f0);
  color: var(--text-primary, #333);
}

.new-chat-btn {
  margin: 1rem;
  padding: 0.75rem 1rem;
  background: var(--primary-color, #E960A6);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(233, 96, 166, 0.2);
}

.new-chat-btn:hover {
  background: var(--primary-hover, #d94a94);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(233, 96, 166, 0.3);
}

.new-chat-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.close-inline-mobile {
  margin-right: 1rem;
  background: none;
  border: 1px solid var(--border-color, #e9ecef);
  color: var(--text-secondary, #666);
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chat-history {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0; /* CRITICAL: Allow flex child to shrink below content size */
}

.history-controls {
  padding: 0 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.history-header {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary, #666);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.clear-history-btn {
  background: none;
  border: none;
  color: var(--text-secondary, #666);
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.clear-history-btn:hover {
  background: var(--danger-bg, #fee);
  color: var(--danger-color, #dc3545);
}

.clear-history-btn.confirm {
  background: var(--danger-bg, #fee);
  color: var(--danger-color, #dc3545);
}

.history-content {
  flex: 1;
  overflow-y: auto;
  padding: 0 1rem;
  min-height: 0; /* CRITICAL: Allow flex child to shrink */
}

.empty-history {
  text-align: center;
  padding: 2rem 1rem;
  color: var(--text-secondary, #666);
}

.empty-history p {
  margin: 0.25rem 0;
}

.subtext {
  font-size: 0.85rem;
  opacity: 0.7;
}

.history-item {
  position: relative;
  transition: background-color 0.2s;
  border-radius: 8px;
  margin-bottom: 0.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 0.75rem;
  gap: 0.75rem;
}

.history-item:hover {
  background: var(--hover-bg, #f0f0f0);
}

.history-item.active {
  background: var(--active-bg, #e3f2fd);
  border: 1px solid var(--primary-color, #007bff);
}

.history-content-wrapper {
  flex: 1;
  min-width: 0;
}

.history-title {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-primary, #333);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.delete-history-btn {
  background: none;
  border: none;
  color: var(--text-secondary, #666);
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  opacity: 0;
  transition: all 0.2s ease;
  font-size: 0.8rem;
}

.history-item:hover .delete-history-btn {
  opacity: 1;
}

.delete-history-btn:hover {
  background: var(--danger-bg, #fee);
  color: var(--danger-color, #dc3545);
}

/* Dark theme support (UNTOUCHED) */
body.dark .sidebar {
  background: var(--dark-sidebar-bg, #1a1a1a);
  border-right-color: var(--dark-border-color, #333);
}

body.dark .sidebar-header {
  background: var(--dark-header-bg, #2d2d2d);
  border-bottom-color: var(--dark-border-color, #333);
}

body.dark .sidebar-header h2 {
  color: var(--dark-text-primary, #fff);
}

body.dark .menu-toggle {
  color: var(--dark-text-secondary, #ccc);
}

body.dark .menu-toggle:hover {
  background: var(--dark-hover-bg, #333);
  color: var(--dark-text-primary, #fff);
}

body.dark .new-chat-btn {
  background: var(--dark-primary-color, #0d6efd);
}

body.dark .new-chat-btn:hover {
  background: var(--dark-primary-hover, #0b5ed7);
}

body.dark .history-header {
  color: var(--dark-text-secondary, #ccc);
}

body.dark .clear-history-btn {
  color: var(--dark-text-secondary, #ccc);
}

body.dark .clear-history-btn:hover {
  background: var(--dark-danger-bg, #2d1b1b);
  color: var(--dark-danger-color, #f56565);
}

body.dark .empty-history {
  color: var(--dark-text-secondary, #ccc);
}

body.dark .history-item:hover {
  background: var(--dark-hover-bg, #333);
}

body.dark .history-item.active {
  background: var(--dark-active-bg, #1e3a5f);
  border-color: var(--dark-primary-color, #0d6efd);
}

body.dark .history-title {
  color: var(--dark-text-primary, #fff);
}

body.dark .delete-history-btn {
  color: var(--dark-text-secondary, #ccc);
}

body.dark .delete-history-btn:hover {
  background: var(--dark-danger-bg, #2d1b1b);
  color: var(--dark-danger-color, #f56565);
}

/* Desktop content layout */
.desktop-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  height: 100%;
  overflow: hidden; /* Prevent parent from scrolling */
}

/* ---------------------------------- */
/* Responsive design (MOBILE FIXES for Modal) */
/* ---------------------------------- */
@media (max-width: 768px) {
  /* 1. The .sidebar now acts as the full-screen, translucent overlay */
  .sidebar.mobile {
    width: 100vw;
    height: 100dvh;
    position: fixed;
    top: 0;
    left: 0;
    z-index: 10061;
    background: rgba(0, 0, 0, 0.5); 
    display: flex; 
    
    /* Pushes content to the top */
    align-items: flex-start; 
    
    /* Center horizontally */
    justify-content: center; 
    transform: translateX(0);
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.3s ease, visibility 0.3s ease;
    border-right: none;
     
    /* Ensure the modal is pushed down from the top */
    padding-top: calc(30px + env(safe-area-inset-top, 0px));

    /* NEW: Add padding left/right to ensure space around the modal card */
    padding-left: 20px;
    padding-right: 20px;
  }

  /* Make the overlay visible when the sidebar is 'open' */
  .sidebar.mobile.open {
    opacity: 1;
    visibility: visible;
  }

  /* Hide desktop header */
  .sidebar-header {
    display: none;
  }

  /* 2. New Wrapper for the Actual Modal Content (the white card) */
  .mobile-modal-content-wrapper {
    background: #ffffff;
    
    /* Adjust width to be 100% of the new padded container, ensuring it respects the 20px left/right padding */
    width: 100%; 
    
    max-width: 350px; 
    height: auto;
    /* Max height adjusted to respect the new, larger top padding */
    max-height: calc(100vh - 120px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px)); 
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); 
    display: flex;
    flex-direction: column;
    overflow: hidden; 
    padding: 0; 
  }

  /* 3. Mobile Modal Header */
  .mobile-modal-header {
    display: flex;
    justify-content: center; 
    align-items: center;
    padding: 1rem 1.5rem;
    position: relative;
    border-bottom: 1px solid var(--border-color, #f0f0f0);
  }

  .mobile-modal-header h2 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
  }

  .close-mobile-modal {
    position: absolute;
    top: 50%; 
    transform: translateY(-50%);
    right: 1.5rem;
    background: none;
    border: none;
    font-size: 1.5rem;
    color: var(--text-secondary, #666);
    cursor: pointer;
    padding: 0.25rem;
    line-height: 1;
  }
  
  /* 4. New Chat Button Styling */
  .new-chat-row.mobile-new-chat-row {
    padding: 1rem;
    display: block; 
  }
  
  .new-chat-btn {
    width: 100%; 
    margin: 0; 
    justify-content: center;
    padding: 0.9rem;
    background: var(--primary-color, #E960A6);
    color: white;
    box-shadow: 0 2px 4px rgba(233, 96, 166, 0.2);
  }

  /* 5. Chat History List */
  .chat-history.mobile-chat-history {
    flex: 1;
    overflow-y: auto; 
    padding: 0;
    min-height: 0; /* CRITICAL: Allow flex child to shrink */
  }

  .history-content {
    padding: 0 1rem 1rem 1rem; 
  }
  
  .history-item {
    padding: 0.75rem 0.5rem; 
    border-radius: 8px; 
    margin-bottom: 0.5rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .history-item:last-child {
      margin-bottom: 0;
  }

  .delete-history-btn {
      opacity: 1;
      color: var(--text-secondary, #666);
  }
}

/* Desktop visible state (UNTOUCHED) */
.sidebar.desktop-visible {
  transform: translateX(0);
}
</style>