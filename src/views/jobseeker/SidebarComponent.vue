<template>
  <aside :class="['sidebar', { visible: visible }]">
    <div class="sidebar-header">
      <div class="brand-logo">
        <a href="./" class="text-nowrap logo-img">
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
            <a 
              v-if="isProfileComplete || item.link === '/dashboard/ai-agent'"
              class="sidebar-nav-link ai-menu-item"
              @click.stop="handleAIClick(item)"
              :class="{ 
                'router-link-active': isActive(item.matchPrefix),
                'dropdown-open': aiDropdownOpen 
              }">
              <span>
                <img src="/generative.png" alt="AI" class="ai-sidebar-icon" />
              </span>
              <span class="hide-menu">{{ item.name }}</span>
              <i class="ti ti-chevron-down ai-chevron ms-auto" 
                 :class="{ 'rotated': aiDropdownOpen }"></i>
            </a>
            <a
              v-else
              @click="showAccessModal"
              class="sidebar-nav-link disabled-link"
              style="cursor: pointer;"
            >
              <span>
                <img src="/generative.png" alt="AI" class="ai-sidebar-icon" />
              </span>
              <span class="hide-menu">{{ item.name }}</span>
            </a>
            <!-- AI Dropdown Content -->
            <ul v-if="aiDropdownOpen && (isProfileComplete || item.link === '/dashboard/ai-agent')" class="ai-dropdown-content">
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
            <span v-if="item.premium" class="premium-badge">Premium</span>
          </a>

          <!-- Regular Router Links -->
          <router-link
          v-else-if="isProfileComplete || item.link === '/dashboard/Edit-Profile' || item.link === '/dashboard/message' || item.link === '/dashboard/ai-agent' || item.name === 'Guidelines'" 
          :to="item.link"
          @click="$emit('close-sidebar')"
          :class="[ { 'router-link-active': isActive(item.matchPrefix) } ]"
        >
            <i :class="item.icon" style="margin-right: 8px; font-size: 1.25rem;"></i>
            {{ item.name }}
            <span v-if="item.premium" class="premium-badge">Premium</span>
          </router-link>

          <!-- Disabled Links (Profile Incomplete) -->
          <a
            v-else
            @click="showAccessModal"
            class="sidebar-nav-link disabled-link"
            style="cursor: pointer;"
          >
            <i :class="item.icon" style="margin-right: 8px; font-size: 1.25rem;"></i>
            {{ item.name }}
            <span v-if="item.premium" class="premium-badge">Premium</span>
          </a>
          </template>
        </li>
      </ul>
    </nav>

    <!-- Access Restriction Modal -->
    <div v-if="showModal" class="modal-overlay" @click="closeModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3 class="modal-title">
            <i class="fa-solid fa-lock" style="margin-right: 8px; color: #E960A6;"></i>
           Uzuza Umwirondoro Wawe
          </h3>
          <button class="modal-close-btn" @click="closeModal">×</button>
        </div>
        <div class="modal-body">
          <p style="display: justify ;">Kugira ngo ubone iyi serivisi,banza wuzuze umwirondoro wawe</p>

          <p style="display: justify ;">Umwirondoro wuzuye niwo ugenderwaho kugira ngo ubone akazi bityo urasabwa kuzuza umwirondoro wawe neza.</p>

        </div>
        <div class="modal-footer">
          
          <router-link 
            to="/dashboard/Edit-Profile" 
            class="btn-primary"
            @click="closeModalAndNavigate"
          >
            Kanda hano
          </router-link>
        </div>
      </div>
    </div>
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
import DeleteChatModal from '@/components/DeleteChatModal.vue';
import { useRoute, useRouter } from 'vue-router';

export default {
  props: {
    visible: Boolean,
  },
  emits: ['close-sidebar'],
  components: {
    DeleteChatModal
  },
  data() {
    return {
      userEmail: "",
      userId: "",
      isProfileComplete: false,
      showModal: false,
      aiDropdownOpen: false,
      chatHistory: [],
      currentSessionId: null,
      loadingHistory: false,
      showDeleteModal: false,
      chatToDelete: null,
      deletingChat: false,
    };
  },
  computed: {
    // Determine API base - use same logic as useKoziChat for consistency
    // Check if we're in development (localhost) or production (Railway)
    apiBase() {
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:5050/api'
      }
      // Production - use Railway (where chat history is stored)
      return 'https://kozi-ai-agent-production.up.railway.app/api'
    }
  },
  async mounted() {
    console.log('🟢 Job Seeker Sidebar mounted, initializing...');
    
    // Initialize user ID and profile check first
    await this.getUserIdAndCheckProfile();
    
    // Set currentSessionId from route query
    if (this.$route.query.sessionId) {
      this.currentSessionId = String(this.$route.query.sessionId);
    }
    
    // Watch route to update currentSessionId
    this.$watch(
      () => this.$route.query.sessionId,
      (sessionId) => {
        this.currentSessionId = sessionId ? String(sessionId) : null;
        // Reload history when a session is loaded via URL
        if (sessionId && this.userId) {
          console.log('🔄 Job Seeker Sidebar: Session ID changed in URL, reloading history...');
          this.loadChatHistory();
        }
      },
      { immediate: false }
    );
    
    // Listen for chat history updates
    window.addEventListener('chatHistoryUpdated', this.handleChatHistoryUpdate);
    
    // Load initial chat history
    if (this.userId && this.isProfileComplete) {
      console.log('📋 Job Seeker Sidebar: Loading initial chat history on mount');
      await this.loadChatHistory();
    }
  },
  beforeUnmount() {
    window.removeEventListener('chatHistoryUpdated', this.handleChatHistoryUpdate);
  },
  setup() {
    const route = useRoute();
    const router = useRouter();

    const menuItems = [
      {
        name: "Dashboard",
        link: "/dashboard/",
        icon: "fa-solid fa-table-columns"
      },
      {
        name: "Edit Profile",
        link: "/dashboard/Edit-Profile",
        icon: "ti ti-user-plus",
        matchPrefix: ["/dashboard/Edit-Profile"]
      },
      {
        name: "View Profile",
        link: "/dashboard/View-profile",
        icon: "ti ti-user-check",
        matchPrefix: ["/dashboard/View-profile"]
      },
      {
        name: "My Application",
        link: "/dashboard/My-application",
        icon: "fa-solid fa-spinner",
        matchPrefix: ["/dashboard/My-application"]
      },
      {
        name: "All jobs",
        link: "/dashboard/All-jobs",
        icon: "fa-solid fa-briefcase",
        premium: true,
        matchPrefix: ["/dashboard/All-jobs"]
      },
      {
        name: "Payment",
        link: "/dashboard/payment",
        icon: "fa-solid fa-money-bills",
        matchPrefix: ["/dashboard/payment"]
      },
      // {
      //   name: "Generate cv",
      //   link: "/dashboard/generate-cv",
      //   icon: "fa-solid fa-money-bills",
      //   matchPrefix: ["/dashboard/generate-cv"]
      // },
      {
        name: "Messages",
        link: "/dashboard/message",
        icon: "ti ti-message-chatbot",
        matchPrefix: ["/dashboard/message"]
      },
      {
        name: "AI",
        link: "/dashboard/ai-agent",
        icon: "fa-solid fa-robot",
        matchPrefix: ["/dashboard/ai-agent"]
      },
      {
        name: "Guidelines",
        link: "/Kozi_Worker_Guidelines.pdf",
        icon: "ti ti-archive",
        external: true
      },
    ];

    const isActive = (matchPrefix, link) => {
      if (Array.isArray(matchPrefix)) {
        return matchPrefix.some(prefix => route.path.startsWith(prefix));
      }
      return route.path === link;
    };

    return {
      route,
      router,
      menuItems,
      isActive,
    };
  },
  methods: {
    async getUserIdAndCheckProfile() {
      const token = localStorage.getItem("employeeToken");
      if (!token) {
        console.warn('⚠️ Job Seeker Sidebar: No employeeToken found');
        return;
      }

      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        this.userEmail = payload.email;
        console.log('📧 Job Seeker Sidebar: Getting user ID for email:', this.userEmail);

        // Get user ID from external API (same as composable)
        const userIdUrl = `https://apis.kozi.rw/get_user_id_by_email/${encodeURIComponent(this.userEmail)}`;
        console.log('📧 Job Seeker Sidebar: Fetching userId from:', userIdUrl);
        
        const res = await fetch(userIdUrl, {
          headers: { 
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}` 
          },
        });
        
        if (!res.ok) {
          const errorText = await res.text();
          console.error('❌ Job Seeker Sidebar: User ID fetch failed:', res.status, errorText);
          throw new Error(`Failed to fetch user ID: ${res.status}`);
        }
        
        const data = await res.json();
        console.log('📋 Job Seeker Sidebar: User ID response:', data);

        if (data.users_id) {
          this.userId = data.users_id;
          console.log('✅ Job Seeker Sidebar: Got user ID:', this.userId);

          // Check profile completeness (try both API bases)
          try {
            const checkRes = await fetch(`${this.apiBase}/seekers/check_columns/${this.userId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
            
            if (checkRes.ok) {
          const checkData = await checkRes.json();
          this.isProfileComplete = checkData.isComplete;
              console.log('✅ Job Seeker Sidebar: Profile check complete:', {
                userId: this.userId,
                isComplete: this.isProfileComplete
              });
            } else {
              console.warn('⚠️ Job Seeker Sidebar: Profile check failed, assuming complete');
              this.isProfileComplete = true; // Assume complete if check fails
            }
          } catch (profileErr) {
            console.warn('⚠️ Job Seeker Sidebar: Profile check error, assuming complete:', profileErr);
            this.isProfileComplete = true; // Assume complete if check fails
          }
        } else {
          console.error("❌ Job Seeker Sidebar: No user ID in response:", data);
        }
      } catch (err) {
        console.error("❌ Job Seeker Sidebar: Error retrieving user info or checking profile:", err);
      }
    },
    async toggleAIDropdown() {
      this.aiDropdownOpen = !this.aiDropdownOpen;
      console.log('🔄 Job Seeker Sidebar: AI dropdown toggled, open:', this.aiDropdownOpen);
      // Always reload history when opening dropdown to ensure it's up to date
      if (this.aiDropdownOpen) {
        if (this.userId) {
          console.log('📋 Job Seeker Sidebar: Reloading history on dropdown open');
          await this.loadChatHistory();
        } else {
          console.log('⚠️ Job Seeker Sidebar: No user ID, getting it first...');
          await this.getUserIdAndCheckProfile();
        }
      }
    },
    handleAIClick(item) {
      // Navigate to AI page if not already there
      if (!this.isActive(item.matchPrefix)) {
        this.$router.push(item.link);
        this.$emit('close-sidebar');
      }
      // Toggle dropdown
      this.toggleAIDropdown();
    },
    async loadChatHistory() {
      if (!this.userId) {
        console.warn('⚠️ Job Seeker Sidebar: Cannot load history - no user ID');
        return;
      }
      
      // Prevent concurrent requests but allow queued requests
      if (this.loadingHistory) {
        console.log('📋 Job Seeker Sidebar: Already loading, skipping duplicate request');
        return;
      }
      
      this.loadingHistory = true;
      try {
        const token = localStorage.getItem("employeeToken");
        if (!token) {
          console.warn('⚠️ Job Seeker Sidebar: No token available');
          this.loadingHistory = false;
          return;
        }
        
        const url = `${this.apiBase}/chat/sessions?users_id=${this.userId}`;
        console.log('📋 Job Seeker Sidebar: Loading chat history from:', url);
        
        const res = await fetch(url, {
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        
        console.log('📋 Job Seeker Sidebar: Response status:', res.status);
        
        if (res.ok) {
          const data = await res.json();
          console.log('📋 Job Seeker Sidebar: Response data:', data);
          
          if (data.sessions && Array.isArray(data.sessions)) {
            console.log(`✅ Job Seeker Sidebar: Found ${data.sessions.length} chat sessions`);
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
            
            // Force reactivity by creating new array reference
            this.chatHistory = [...mappedSessions];
            console.log('✅ Job Seeker Sidebar: Loaded chat history:', this.chatHistory.length, 'sessions');
          } else {
            console.warn('⚠️ Job Seeker Sidebar: No sessions array in response:', data);
            this.chatHistory = [];
          }
        } else {
          const errorText = await res.text();
          console.error('❌ Job Seeker Sidebar: Error loading chat history:', res.status, errorText);
          this.chatHistory = [];
        }
      } catch (err) {
        console.error("Error loading chat history:", err);
        this.chatHistory = [];
      } finally {
        this.loadingHistory = false;
      }
    },
    handleNewChat() {
      this.$emit('close-sidebar');
      console.log('🆕 Job Seeker: New Chat clicked, navigating to welcome page...');
      
      // Check if we're already on the AI page
      if (this.$route.path === '/dashboard/ai-agent' && this.$route.query.sessionId) {
        // If we're already on the AI page with a sessionId, replace to clear it
        console.log('🔄 Already on AI page, replacing route to clear sessionId');
        this.$router.replace({ 
          path: '/dashboard/ai-agent', 
          query: {} 
        }).then(() => {
          // Dispatch event to trigger new chat
          window.dispatchEvent(new CustomEvent('newChatRequested'));
        });
      } else {
        // Navigate to AI page without sessionId
        console.log('🔄 Navigating to AI page for new chat');
        this.$router.push({ 
          path: '/dashboard/ai-agent', 
          query: {} 
        }).then(() => {
          // Dispatch event to trigger new chat
          window.dispatchEvent(new CustomEvent('newChatRequested'));
        });
      }
    },
    loadChat(chat) {
      this.$emit('close-sidebar');
      this.$router.push({
        path: '/dashboard/ai-agent',
        query: { sessionId: chat.sessionId }
      });
    },
    deleteChat(chat) {
      // Show the modal instead of browser confirm
      this.chatToDelete = chat;
      this.showDeleteModal = true;
    },
    async confirmDelete() {
      if (!this.chatToDelete) return;
      
      this.deletingChat = true;
      try {
        const token = localStorage.getItem("employeeToken");
        const res = await fetch(`${this.apiBase}/chat/session/${this.chatToDelete.sessionId}`, {
          method: 'DELETE',
          headers: { 
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (res.ok) {
          this.chatHistory = this.chatHistory.filter(c => c.sessionId !== this.chatToDelete.sessionId);
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
        this.deletingChat = false;
        this.showDeleteModal = false;
        this.chatToDelete = null;
      }
    },
    cancelDelete() {
      this.showDeleteModal = false;
      this.chatToDelete = null;
      this.deletingChat = false;
    },
    showAccessModal() {
      this.showModal = true;
    },
    closeModal() {
      this.showModal = false;
    },
    closeModalAndNavigate() {
      this.showModal = false;
      this.$emit('close-sidebar');
    },
    async handleChatHistoryUpdate() {
      // Reload chat history when a new message is sent (even if dropdown is closed)
      console.log('📢 Job Seeker Sidebar: Chat history updated event received');
      console.log('📢 Job Seeker Sidebar: Current userId:', this.userId);
      console.log('📢 Job Seeker Sidebar: Current loadingHistory:', this.loadingHistory);
      
      if (this.userId) {
        console.log('📢 Job Seeker Sidebar: Reloading history due to update event');
        // Add a small delay to ensure backend has processed the new session
        setTimeout(async () => {
          await this.loadChatHistory();
          console.log('✅ Job Seeker Sidebar: History reload completed. Sessions:', this.chatHistory.length);
        }, 300);
      } else {
        console.warn('⚠️ Job Seeker Sidebar: Cannot reload history - no user ID');
        await this.getUserIdAndCheckProfile();
        if (this.userId) {
          setTimeout(async () => {
            await this.loadChatHistory();
            console.log('✅ Job Seeker Sidebar: History reload completed after getting userId. Sessions:', this.chatHistory.length);
          }, 300);
        }
      }
    }
  }
};
</script>

<style scoped>
.disabled-link {
  opacity: 0.7;
  cursor: pointer !important;
}

.disabled-link:hover {
  background-color: rgba(233, 96, 166, 0.1) !important;
  color: #E960A6 !important;
  padding-left: 2rem !important;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  animation: fadeIn 0.3s ease;
}

.modal-content {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  animation: slideIn 0.3s ease;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem 1rem;
  border-bottom: 1px solid #f0f0f0;
}

.modal-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #333;
  display: flex;
  align-items: center;
}

.modal-close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #999;
  padding: 0.25rem;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.modal-close-btn:hover {
  background-color: #f5f5f5;
  color: #666;
}

.modal-body {
  padding: 1.5rem 2rem;
}

.modal-body p {
  margin: 0 0 1rem;
  color: #666;
  line-height: 1.5;
}

.modal-body p:last-child {
  margin-bottom: 0;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1rem 2rem 1.5rem;
  border-top: 1px solid #f0f0f0;
}

.btn-secondary,
.btn-primary {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  min-width: 100px;
}

.btn-secondary {
  background-color: #f8f9fa;
  color: #6c757d;
  border: 1px solid #dee2e6;
}

.btn-secondary:hover {
  background-color: #e9ecef;
  color: #5a6268;
}

.btn-primary {
  background-color: #E960A6;
  color: white;
}

.btn-primary:hover {
  background-color: #d4519a;
  color: white;
  text-decoration: none;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-50px) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* Existing styles remain the same */
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
  }
  
  .close-btn {
    display: flex;
  }
}

.text-nowrap {
  white-space: nowrap;
}

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