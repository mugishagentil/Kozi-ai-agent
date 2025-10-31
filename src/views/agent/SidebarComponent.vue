<template>
  <aside :class="['sidebar', { visible: visible }]">
    <div class="sidebar-header">
      <div class="brand-logo">
        <a href="dashboard" class="text-nowrap logo-img">
          <img :src="require('@/assets/img/logo.png')" alt="Logo" style="width:10rem" />
        </a>
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
                <div v-if="chatHistory.length > 0" class="chat-history-list">
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
            <!-- External Links -->
            <a
              v-if="item.external"
              :href="item.link"
              target="_blank"
              rel="noopener noreferrer"
              class="sidebar-nav-link"
            >
              <i :class="item.icon" style="margin-right: 8px; font-size: 1.25rem;"></i>
              {{ item.name }}
            </a>

            <!-- Regular Router Links -->
            <router-link
              v-else
              :to="item.link"
              @click="$emit('close-sidebar')"
              :class="{ 'router-link-active': isActive(item.matchPrefix) }"
            >
              <i :class="item.icon" style="margin-right: 8px; font-size: 1.25rem;"></i>
              {{ item.name }}
            </router-link>
          </template>
        </li>
      </ul>
    </nav>
  </aside>
</template>


<script>
import { useRoute, useRouter } from 'vue-router';
import { ref, onMounted, watch } from 'vue';
import { globalVariable } from '@/global';

export default {
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

    const menuItems = [
      {
        name: "Dashboard",
        link: "/agent/dashboard",
        icon: "ti ti-layout-dashboard",
        matchPrefix: [
          "/agent/dashboard",
          "/agent/index",
        ],
      },
      
      {
        name: "View Seekers",
        link: "/agent/view-seekers",
        
        matchPrefix: [
          "/agent/view-seekers",
          "/agent/agent-edit-seekers",
          "/agent/agent-view-seekers",
          
        ],
        icon: "ti ti-user-check",
      },
      {
        name: "Register Seeker",
        link: "/agent/register-seeker",
        icon: "ti ti-user-search",
        matchPrefix: ["/agent/register-seeker"]
      },
      {
        name: "Terms of services",
        link: "https://kozi.rw/terms-of-service",
        icon: "ti ti-hotel-service",
        external: true, 
      },
      {
        name: "AI",
        link: "/agent/ai-agent",
        icon: "fa-solid fa-robot",
        matchPrefix: ["/agent/ai-agent"]
      },
      
     
      
    ];

    const isActive = (matchPrefix) => {
      return matchPrefix.some(prefix => route.path.startsWith(prefix));
    };

    const toggleAIDropdown = () => {
      aiDropdownOpen.value = !aiDropdownOpen.value;
      if (aiDropdownOpen.value && !chatHistory.value.length && userId.value) {
        loadChatHistory();
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
        const token = localStorage.getItem("agentToken") || localStorage.getItem("adminToken");
        if (!token) return;
        
        const payload = JSON.parse(atob(token.split(".")[1]));
        const userEmail = payload.email;
        
        const res = await fetch(`${globalVariable}/get_user_id_by_email/${userEmail}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const data = await res.json();
        if (res.ok && data.users_id) {
          userId.value = data.users_id;
          loadChatHistory();
        }
      } catch (err) {
        console.error("Error getting user ID:", err);
      }
    };

    const loadChatHistory = async () => {
      if (!userId.value || loadingHistory.value) return;
      
      loadingHistory.value = true;
      try {
        const token = localStorage.getItem("agentToken") || localStorage.getItem("adminToken");
        const res = await fetch(`${globalVariable}/api/admin/chat/sessions?users_id=${userId.value}`, {
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (res.ok) {
          const data = await res.json();
          if (data.sessions && Array.isArray(data.sessions)) {
            chatHistory.value = data.sessions.map(session => ({
              sessionId: String(session.id),
              title: session.title || 'New Chat',
              createdAt: session.created_at || session.createdAt,
              lastMessage: session.last_message || ''
            })).sort((a, b) => {
              const dateA = new Date(a.createdAt || 0);
              const dateB = new Date(b.createdAt || 0);
              return dateB - dateA;
            });
          }
        }
      } catch (err) {
        console.error("Error loading chat history:", err);
      } finally {
        loadingHistory.value = false;
      }
    };

    const handleNewChat = () => {
      // Navigate without sessionId to trigger new chat
      router.push({ path: '/agent/ai-agent', query: {} });
    };

    const loadChat = (chat) => {
      router.push({
        path: '/agent/ai-agent',
        query: { sessionId: chat.sessionId }
      });
    };

    const deleteChat = async (chat) => {
      if (!confirm(`Delete "${chat.title || 'Untitled Chat'}"?`)) return;
      
      try {
        const token = localStorage.getItem("agentToken") || localStorage.getItem("adminToken");
        const res = await fetch(`${globalVariable}/api/admin/chat/session/${chat.sessionId}`, {
          method: 'DELETE',
          headers: { 
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (res.ok) {
          chatHistory.value = chatHistory.value.filter(c => c.sessionId !== chat.sessionId);
        }
      } catch (err) {
        console.error("Error deleting chat:", err);
        alert("Failed to delete chat. Please try again.");
      }
    };

    // Watch route to update currentSessionId
    watch(
      () => route.query.sessionId,
      (sessionId) => {
        currentSessionId.value = sessionId ? String(sessionId) : null;
      },
      { immediate: true }
    );

    onMounted(() => {
      getUserId();
      // Set currentSessionId from route query
      if (route.query.sessionId) {
        currentSessionId.value = String(route.query.sessionId);
      }
    });

    return {
      route,
      router,
      menuItems,
      isActive,
      aiDropdownOpen,
      chatHistory,
      currentSessionId,
      loadingHistory,
      toggleAIDropdown,
      handleAIClick,
      handleNewChat,
      loadChat,
      deleteChat,
    };
  },
};
</script>





<style scoped>
/* Import your existing styles */


.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  width: 270px;
  height: 100vh;
  background: #fff;
  transform: translateX(-100%);
  transition: transform 0.3s ease;
  z-index: 9999;
  overflow-y: auto;
  box-shadow: 0 0 35px 0 rgba(154, 161, 171, 0.15);
  border-right: 1px solid rgba(0, 0, 0, 0.05);
}

.sidebar.visible {
  transform: translateX(0);
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

@media (min-width: 769px) {
  .sidebar {
    transform: translateX(0);
    position: fixed;
  }
}

@media (max-width: 768px) {
  .sidebar {
    width: 100%;
    max-width: 300px;
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