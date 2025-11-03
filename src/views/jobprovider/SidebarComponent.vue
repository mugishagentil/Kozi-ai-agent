<template>
  <aside :class="['sidebar', { visible: visible }]">
    <div class="sidebar-header">
      <div class="brand-logo">
        <router-link to="/employer/dashboard" class="text-nowrap logo-img">
          <img :src="require('@/assets/img/logo.png')" alt="Logo" style="width:10rem" />
        </router-link>
      </div>
      <button class="close-btn" @click="$emit('close-sidebar')">×</button>
    </div>
    <nav class="sidebar-nav">
      <ul>
        <li v-for="item in menuItems" :key="item.link || item.name">
          <!-- AI Dropdown -->
          <template v-if="item.name === 'AI'">
            <a class="sidebar-nav-link ai-menu-item"
               @click.stop="handleAIClick(item)"
               :class="{ 
                 'router-link-active': isActive(item.matchPrefix),
                 'dropdown-open': aiDropdownOpen 
               }">
              <span>
                <img src="/AI-Logo.png" alt="AI" class="ai-sidebar-icon" />
              </span>
              <span class="hide-menu">{{ item.name }}</span>
              <i class="ti ti-chevron-down ai-chevron ms-auto" 
                 :class="{ 'rotated': aiDropdownOpen }"></i>
            </a>
            <!-- AI Dropdown Content -->
            <ul v-if="aiDropdownOpen" class="ai-dropdown-content">
              <!-- New Chat Button -->
              <li>
                <a class="new-chat-link" @click.prevent="handleNewChat">
                  <i class="fa-regular fa-pen-to-square"></i>
                  <span>New Chat</span>
                </a>
              </li>
              <!-- History Section -->
              <li class="history-section">
                <div class="history-header">
                  <span>HISTORY</span>
                </div>
                <div v-if="loadingHistory" class="empty-history">
                  <p>Loading chats...</p>
                </div>
                <div v-else-if="chatHistory.length > 0" class="chat-history-list">
                  <div
                    v-for="(chat, index) in chatHistory"
                    :key="chat.sessionId || index"
                    class="chat-history-item"
                    :class="{ 'active': String(currentSessionId) === String(chat.sessionId) }"
                    @click="loadChat(chat)"
                  >
                    <span class="chat-title">{{ chat.title || 'Untitled Chat' }}</span>
                    <button 
                      class="delete-chat-btn"
                      @click.stop="deleteChat(chat)"
                      title="Delete this chat"
                    >
                      <i class="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
                <div v-else class="empty-history">
                  <p>No chats yet</p>
                </div>
              </li>
            </ul>
          </template>
          <!-- Regular Menu Items -->
          <template v-else>
            <a
              v-if="item.external"
              :href="item.link"
              target="_blank"
              rel="noopener noreferrer"
              class="sidebar-nav-link"
            >
              <i :class="item.icon" style="margin-right: 8px; font-size: 1.25rem;"></i>
              {{ item.name }}
              <span v-if="item.premium" class="premium-badge">Premium</span>
            </a>
            <router-link
              v-else
              :to="item.link"
              @click="$emit('close-sidebar')"
              :class="{ 'router-link-active': isActive(item.matchPrefix) }"
            >
              <i :class="item.icon" style="margin-right: 8px; font-size: 1.25rem;"></i>
              {{ item.name }}
              <span v-if="item.premium" class="premium-badge">Premium</span>
            </router-link>
          </template>
        </li>
      </ul>
    </nav>
  </aside>
  
  <!-- Delete Chat Modal -->
  <DeleteChatModal
    :visible="showDeleteModal"
    :chat-title="chatToDelete?.title || 'Untitled Chat'"
    :deleting="deletingChat"
    @confirm="confirmDelete"
    @cancel="cancelDelete"
  />
</template>

<script>
import { useRoute, useRouter } from 'vue-router';
import { ref, onMounted, onUnmounted, watch } from 'vue';
import DeleteChatModal from '@/components/DeleteChatModal.vue';

export default {
  components: {
    DeleteChatModal
  },
  props: {
    visible: Boolean,
  },
  emits: ['close-sidebar'],
  setup(props, { emit }) {
    const route = useRoute();
    const router = useRouter();
    const aiDropdownOpen = ref(false);
    const chatHistory = ref([]);
    const currentSessionId = ref(null);
    const loadingHistory = ref(false);
    const userId = ref(null);
    const showDeleteModal = ref(false);
    const chatToDelete = ref(null);
    const deletingChat = ref(false);
    
    // Determine API base - use same logic as useKoziChat for consistency
    // Check if we're in development (localhost) or production (Railway)
    const getApiBase = () => {
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:5050/api'
      }
      // Production - use Railway (where chat history is stored)
      return 'https://kozi-ai-agent-production.up.railway.app/api'
    }
    const API_BASE = getApiBase()

    const menuItems = [
      {
        name: "Dashboard",
        link: "/employer/dashboard",
        icon: "fa-solid fa-table-columns",
        matchPrefix: ["/employer/dashboard"]
      },
      { 
        name: "Edit Profile",
        link: "/employer/edit-profile",
        icon: "ti ti-user-plus",
        matchPrefix: ["/employer/edit-profile"]
      },
      { 
        name: "View Profile",
        link: "/employer/view-profile",
        icon: "ti ti-user-check",
        matchPrefix: ["/employer/view-profile"]
      },
      { 
        name: "All Job Seekers",
        link: "/employer/seekers",
        icon: "ti ti-users",
        matchPrefix: ["/employer/seekers"]
      },
      { 
        name: "Add job",
        link: "/employer/add-job",
        icon: "ti ti-settings",
        premium: true,
        matchPrefix: ["/employer/add-job"]
      },
      { 
        name: "All Categories",
        link: "/employer/category",
        icon: "ti ti-category-2",
        matchPrefix: ["/employer/category"]
      },
      { 
        name: "Request Support",
        link: "/employer/support",
        icon: "ti ti-message-chatbot",
        matchPrefix: ["/employer/support"]
      },
      { 
        name: "AI",
        link: "/employer/ai-agent",
        icon: "fa-solid fa-robot",
        matchPrefix: ["/employer/ai-agent"]
      },
      { 
        name: "Guidlines", 
        link: "/Kozi_Client_Guidelines.pdf", 
        icon: "ti ti-archive", 
        external: true 
      },
    ];

    const isActive = (matchPrefix) => {
      return matchPrefix.some(prefix => route.path.startsWith(prefix));
    };

    const toggleAIDropdown = async () => {
      aiDropdownOpen.value = !aiDropdownOpen.value;
      console.log('🔄 Sidebar: AI dropdown toggled, open:', aiDropdownOpen.value);
      // Always reload history when opening dropdown to ensure it's up to date
      if (aiDropdownOpen.value) {
        if (userId.value) {
          console.log('📋 Sidebar: Reloading history on dropdown open');
          await loadChatHistory();
        } else {
          console.log('⚠️ Sidebar: No user ID, getting it first...');
          await getUserId();
          if (userId.value) {
            console.log('📋 Sidebar: Got user ID, now loading history...');
            await loadChatHistory();
          }
        }
      }
    };

    const handleAIClick = (item) => {
      // Navigate to AI page if not already there
      if (!isActive(item.matchPrefix)) {
        router.push(item.link);
        emit('close-sidebar');
      }
      // Toggle dropdown
      toggleAIDropdown();
    };

    const getUserId = async () => {
      try {
        const token = localStorage.getItem("employerToken");
        if (!token) {
          console.warn('⚠️ Employer Sidebar: No employerToken found');
          return;
        }
        
        const payload = JSON.parse(atob(token.split(".")[1]));
        const userEmail = payload.email;
        console.log('📧 Employer Sidebar: Getting user ID for email:', userEmail);

        // Get user ID from external API (same as composable and jobseeker sidebar)
        const userIdUrl = `https://apis.kozi.rw/get_user_id_by_email/${encodeURIComponent(userEmail)}`;
        console.log('📧 Employer Sidebar: Fetching userId from:', userIdUrl);
        
        const res = await fetch(userIdUrl, {
          headers: { 
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}` 
          },
        });
        
        if (!res.ok) {
          const errorText = await res.text();
          console.error('❌ Employer Sidebar: User ID fetch failed:', res.status, errorText);
          throw new Error(`Failed to fetch user ID: ${res.status}`);
        }
        
        const data = await res.json();
        console.log('📋 Employer Sidebar: User ID response:', data);

        if (data.users_id) {
          userId.value = data.users_id;
          console.log('✅ Employer Sidebar: Got user ID:', userId.value);
          
          // Load chat history immediately after getting user ID
          console.log('📋 Employer Sidebar: Loading chat history after getting user ID');
          await loadChatHistory();
        } else {
          console.warn('⚠️ Employer Sidebar: No user ID in response:', data);
        }
      } catch (err) {
        console.error("❌ Employer Sidebar: Error getting user ID:", err);
      }
    };

    const loadChatHistory = async () => {
      if (!userId.value) {
        console.warn('⚠️ Sidebar: Cannot load history - no user ID yet:', { userId: userId.value });
        return;
      }
      
      if (loadingHistory.value) {
        console.log('⚠️ Sidebar: History already loading, skipping...');
        return;
      }
      
      loadingHistory.value = true;
      try {
        const token = localStorage.getItem("employerToken");
        if (!token) {
          console.warn('⚠️ No token available for loading chat history');
          loadingHistory.value = false;
          return;
        }
        
        const url = `${API_BASE}/chat/employer/sessions?users_id=${userId.value}`;
        console.log('📋 Sidebar: Loading chat history from:', url);
        
        const res = await fetch(url, {
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        
        console.log('📋 Chat history response status:', res.status);
        
        if (res.ok) {
          const data = await res.json();
          console.log('📋 Chat history response data:', data);
          
          if (data.sessions && Array.isArray(data.sessions)) {
            console.log(`✅ Sidebar: Found ${data.sessions.length} chat sessions`);
            const mappedSessions = data.sessions.map(session => ({
              sessionId: String(session.id),
              title: session.title || 'New Chat',
              createdAt: session.created_at || session.createdAt,
              lastMessage: session.last_message || ''
            })).sort((a, b) => {
              const dateA = new Date(a.createdAt || 0);
              const dateB = new Date(b.createdAt || 0);
              return dateB - dateA;
            });
            console.log('📋 Sidebar: Mapped sessions:', mappedSessions);
            
            // Force reactivity by creating a new array reference
            chatHistory.value = [...mappedSessions];
            console.log('✅ Sidebar: Loaded chat history:', chatHistory.value.length, 'sessions');
            console.log('📋 Sidebar: Session titles:', chatHistory.value.map(s => ({ id: s.sessionId, title: s.title })));
            console.log('🔍 Sidebar: chatHistory.value after assignment:', chatHistory.value);
            
            // Force Vue to update by triggering a reactive change
            if (chatHistory.value.length > 0) {
              console.log('✅ Sidebar: History should now be visible in dropdown!');
            }
          } else {
            console.warn('⚠️ No sessions array in response:', data);
            chatHistory.value = [];
          }
        } else {
          const errorText = await res.text();
          console.error('❌ Error loading chat history:', res.status, errorText);
          chatHistory.value = [];
        }
      } catch (err) {
        console.error("❌ Error loading chat history:", err);
        chatHistory.value = [];
      } finally {
        loadingHistory.value = false;
      }
    };

    const handleNewChat = () => {
      emit('close-sidebar');
      console.log('🆕 New Chat clicked, navigating to welcome page...');
      
      // Check if we're already on the AI page
      if (route.path === '/employer/ai-agent' && route.query.sessionId) {
        // If we're already on the AI page with a sessionId, replace to clear it
        console.log('🔄 Already on AI page, replacing route to clear sessionId');
        router.replace({ 
          path: '/employer/ai-agent', 
          query: {} 
        }).then(() => {
          // Dispatch event to trigger new chat
          window.dispatchEvent(new CustomEvent('newChatRequested'));
        });
      } else {
        // Navigate to AI page without sessionId
        console.log('🔄 Navigating to AI page for new chat');
        router.push({ 
          path: '/employer/ai-agent', 
          query: {} 
        }).then(() => {
          // Dispatch event to trigger new chat
          window.dispatchEvent(new CustomEvent('newChatRequested'));
        });
      }
    };

    const loadChat = (chat) => {
      emit('close-sidebar');
      router.push({
        path: '/employer/ai-agent',
        query: { sessionId: chat.sessionId }
      });
    };

    const deleteChat = (chat) => {
      // Show the modal instead of browser confirm
      chatToDelete.value = chat;
      showDeleteModal.value = true;
    };
    
    const confirmDelete = async () => {
      if (!chatToDelete.value) return;
      
      deletingChat.value = true;
      try {
        const token = localStorage.getItem("employerToken");
        const res = await fetch(`${API_BASE}/chat/employer/session/${chatToDelete.value.sessionId}`, {
          method: 'DELETE',
          headers: { 
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (res.ok) {
          chatHistory.value = chatHistory.value.filter(c => c.sessionId !== chatToDelete.value.sessionId);
          console.log('✅ Chat deleted successfully');
        } else {
          const errorText = await res.text();
          console.error('❌ Failed to delete chat:', res.status, errorText);
          alert("Failed to delete chat. Please try again.");
        }
      } catch (err) {
        console.error("❌ Error deleting chat:", err);
        alert("Failed to delete chat. Please try again.");
      } finally {
        deletingChat.value = false;
        showDeleteModal.value = false;
        chatToDelete.value = null;
      }
    };
    
    const cancelDelete = () => {
      showDeleteModal.value = false;
      chatToDelete.value = null;
      deletingChat.value = false;
    };

    // Watch route to update currentSessionId and reload history when needed
    watch(
      () => route.query.sessionId,
      async (sessionId) => {
        currentSessionId.value = sessionId ? String(sessionId) : null;
        // Reload history when a session is loaded via URL (if dropdown is open)
        if (sessionId && userId.value && aiDropdownOpen.value) {
          console.log('🔄 Sidebar: Session ID changed in URL, reloading history...');
          await loadChatHistory();
        }
      },
      { immediate: true }
    );
    
    // Watch for route changes to AI page to reload history
    watch(
      () => route.path,
      async (newPath) => {
        if (newPath.includes('/ai-agent') && aiDropdownOpen.value && userId.value) {
          console.log('🔄 Sidebar: Route changed to AI page, reloading history...');
          await loadChatHistory();
        }
      }
    );

    onMounted(() => {
      console.log('🟢 Sidebar mounted, initializing...');
      
      // Set currentSessionId from route query
      if (route.query.sessionId) {
        currentSessionId.value = String(route.query.sessionId);
      }
      
      // Listen for chat history updates
      window.addEventListener('chatHistoryUpdated', handleChatHistoryUpdate);
      
      // Also listen for focus events to refresh history when user returns
      const handleFocus = () => {
        if (userId.value) {
          console.log('📋 Sidebar: Window focus, reloading history');
          loadChatHistory();
        }
      };
      window.addEventListener('focus', handleFocus);
      
      // Store handler for cleanup
      window._sidebarFocusHandler = handleFocus;
      
      // Initialize: get user ID and load history
      const initializeHistory = async () => {
        try {
          await getUserId();
          
          // If we got user ID, load history immediately
          if (userId.value) {
            console.log('📋 Sidebar: User ID available on mount, loading history...');
            await loadChatHistory();
          } else {
            // Retry after delay
            console.log('⚠️ Sidebar: User ID not available, will retry...');
            setTimeout(async () => {
              if (!userId.value) {
                await getUserId();
              }
              if (userId.value) {
                console.log('📋 Sidebar: Retry - loading history after delay');
                await loadChatHistory();
              }
            }, 1500);
          }
        } catch (err) {
          console.error('❌ Sidebar: Failed to initialize history:', err);
        }
      };
      
      initializeHistory();
    });
    
    const handleChatHistoryUpdate = async () => {
      // Reload chat history when a new message is sent (even if dropdown is closed)
      console.log('📢 Employer Sidebar: Chat history updated event received');
      console.log('📢 Employer Sidebar: Current userId:', userId.value);
      console.log('📢 Employer Sidebar: Current loadingHistory:', loadingHistory.value);
      // Always try to load history when event fires, even if dropdown is closed
      // This ensures history is ready when user opens dropdown
      if (userId.value) {
        console.log('📢 Employer Sidebar: Reloading history due to update event');
        // Add a small delay to ensure backend has processed the new session
        setTimeout(async () => {
          await loadChatHistory();
          console.log('✅ Employer Sidebar: History reload completed. Sessions:', chatHistory.value.length);
        }, 300);
      } else {
        console.warn('⚠️ Employer Sidebar: Cannot reload history - no user ID, getting it first');
        // Try to get user ID first
        await getUserId();
        if (userId.value) {
          console.log('📢 Employer Sidebar: Got user ID, now loading history from event...');
          setTimeout(async () => {
            await loadChatHistory();
            console.log('✅ Employer Sidebar: History reload completed after getting userId. Sessions:', chatHistory.value.length);
          }, 300);
        }
      }
    };
    
    onUnmounted(() => {
      window.removeEventListener('chatHistoryUpdated', handleChatHistoryUpdate);
      if (window._sidebarFocusHandler) {
        window.removeEventListener('focus', window._sidebarFocusHandler);
        delete window._sidebarFocusHandler;
      }
    });

    // Debug watcher to track chatHistory changes
    watch(chatHistory, (newVal, oldVal) => {
      console.log('🔍 Sidebar: chatHistory changed:', {
        oldLength: oldVal?.length || 0,
        newLength: newVal?.length || 0,
        newValue: newVal
      });
    }, { deep: true });
    
    // Watch userId and automatically load history when it becomes available
    watch(userId, async (newVal) => {
      console.log('🔍 Sidebar: userId changed:', newVal);
      if (newVal) {
        console.log('📋 Sidebar: User ID available, loading history...');
        await loadChatHistory();
      }
    });

    return {
      route,
      menuItems,
      isActive,
      aiDropdownOpen,
      chatHistory,
      currentSessionId,
      loadingHistory,
      showDeleteModal,
      chatToDelete,
      deletingChat,
      toggleAIDropdown,
      handleAIClick,
      handleNewChat,
      loadChat,
      deleteChat,
      confirmDelete,
      cancelDelete,
      handleChatHistoryUpdate,
      userId, // Expose userId for template debugging if needed
    };
  },
};
</script>





<style scoped>
/* Import your existing styles */
.sidebar {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  width: 270px !important;
  height: 100vh !important;
  background: #fff !important;
  transition: transform 0.3s ease;
  z-index: 9999 !important;
  overflow-y: auto;
  box-shadow: 0 0 35px 0 rgba(154, 161, 171, 0.15);
  border-right: 1px solid rgba(0, 0, 0, 0.05);
  /* Default hidden state, overridden by .visible class and media queries */
  transform: translateX(-100%);
}

.sidebar.visible {
  transform: translateX(0) !important;
}


.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  margin-bottom: 0;
}

.brand-logo {
  display: flex;
  align-items: center;
}

.logo-img img {
  max-width: 100%;
  height: auto;
}

.close-btn {
  font-size: 1.5rem;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  color: #5a6a85;
  width: 35px;
  height: 35px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.3s ease;
  display: none; 
}

@media (max-width: 768px) {
  .close-btn {
    display: flex; 
  }
}


.close-btn:hover {
  background-color: #f8f9fa;
  color: #495057;
}


.sidebar-nav {
  padding: 1rem 0;
  width: 230px;
  margin-left: 1rem;
  overflow-y: auto;
  
}

.sidebar-nav ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.sidebar-nav li {
  margin-bottom: 0.25rem;
}

.sidebar-nav a {
  display: flex;
  align-items: center;
  padding: 0.75rem 1.5rem;
  color: #5a6a85;
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 400;
  transition: all 0.3s ease;
  position: relative;
  border-radius: 0;
}

.sidebar-nav a:before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  width: 3px;
  background: transparent;
  transition: all 0.3s ease;
}

.sidebar-nav a:hover {
  background-color: rgba(233, 96, 166, 0.1);
  color: #E960A6;
  text-decoration: none;
  padding-left: 2rem;
}

.sidebar-nav a:hover:before {
  background: #336cb6;
}

.sidebar-nav a.router-link-active {
  background-color: #E960A6;
  border-radius: 5px;
  color: white;
  font-weight: 600;
  padding-left: 2rem;
}

.sidebar-nav a.router-link-active:before {
  background: #336cb6;
}

/* Premium Badge Styles */
.premium-badge {
  margin-left: auto;
  background: linear-gradient(135deg, #FFD700, #FFA500);
  color: #333;
  font-size: 0.6rem;
  font-weight: 600;
  padding: 0.2rem 0.5rem;
  border-radius: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  box-shadow: 0 2px 4px rgba(255, 165, 0, 0.3);
  border: 1px solid rgba(255, 215, 0, 0.5);
}

.sidebar-nav a.router-link-active .premium-badge {
  background: linear-gradient(135deg, #fff, #f8f9fa);
  color: #E960A6;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

@media (min-width: 769px) {
  .sidebar {
    transform: translateX(0) !important;
    position: fixed !important;
    display: block !important;
    visibility: visible !important;
    opacity: 1 !important;
    z-index: 1000 !important;
  }
}

@media (max-width: 768px) {
  .sidebar {
    width: 100%;
    max-width: 300px;
    transform: translateX(-100%) !important;
  }
  
  .sidebar.visible {
    transform: translateX(0) !important;
  }
  
  .close-btn {
    display: flex;
  }
}

.text-nowrap {
  white-space: nowrap;
}

/* AI Dropdown Styles - matching admin sidebar */
.ai-menu-item {
  display: flex;
  align-items: center;
  width: 100%;
}

.ai-menu-item .ai-chevron {
  margin-left: auto;
  transition: transform 0.3s ease;
  font-size: 0.875rem;
}

.ai-menu-item .ai-chevron.rotated {
  transform: rotate(180deg);
}

.ai-sidebar-icon {
  width: 1.25rem;
  height: 1.25rem;
  object-fit: contain;
  display: inline-block;
  margin-right: 8px;
}

.hide-menu {
  flex: 1;
}

.ms-auto {
  margin-left: auto;
}

.ai-dropdown-content {
  list-style: none;
  padding: 0;
  margin: 0;
  background-color: #f8f9fa;
  padding-left: 1rem;
  max-height: 400px;
  overflow-y: auto;
}

.ai-dropdown-content li {
  margin: 0;
}

/* New Chat Link - Minimal Menu Item Style */
.new-chat-link {
  display: flex;
  align-items: center;
  padding: 0.75rem 1.5rem;
  color: #5a6a85;
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 400;
  transition: all 0.3s ease;
  position: relative;
  cursor: pointer;
  gap: 0.5rem;
}

.new-chat-link i {
  font-size: 1.25rem;
  margin-right: 0;
}

.new-chat-link:hover {
  background-color: rgba(233, 96, 166, 0.1);
  color: #E960A6;
  text-decoration: none;
  padding-left: 2rem;
}

/* History Section */
.history-section {
  padding: 0.5rem;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  margin-bottom: 0.5rem;
}

.history-header span {
  font-size: 0.75rem;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Chat History List */
.chat-history-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  max-height: 400px;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 0.25rem;
}

/* Custom Scrollbar for Chat History */
.chat-history-list::-webkit-scrollbar {
  width: 6px;
}

.chat-history-list::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 10px;
}

.chat-history-list::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 10px;
}

.chat-history-list::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

.chat-history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  margin: 0 0.25rem;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s ease;
  background: white;
  border: 1px solid #e9ecef;
}

.chat-history-item:hover {
  background: #f8f9fa;
}

.chat-history-item.active {
  background: #E960A6;
  color: white;
  border-color: #E960A6;
}

.chat-title {
  flex: 1;
  font-size: 0.875rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-right: 0.5rem;
}

.delete-chat-btn {
  background: none;
  border: none;
  color: #999;
  cursor: pointer;
  padding: 0.25rem;
  opacity: 0;
  transition: opacity 0.2s ease, color 0.2s ease;
}

.chat-history-item:hover .delete-chat-btn {
  opacity: 1;
}

.chat-history-item.active .delete-chat-btn {
  color: white;
  opacity: 1;
}

.delete-chat-btn:hover {
  color: #E960A6;
}

.chat-history-item.active .delete-chat-btn:hover {
  color: #ffb3d9;
}

/* Empty History */
.empty-history {
  padding: 1rem;
  text-align: center;
  color: #999;
  font-size: 0.875rem;
}

.empty-history p {
  margin: 0;
}
</style>