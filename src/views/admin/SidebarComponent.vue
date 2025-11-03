<template>
  <div class="page-wrapper" id="main-wrapper" data-layout="vertical" data-navbarbg="skin6" data-sidebartype="full"
    data-sidebar-position="fixed" data-header-position="fixed">

    <!-- Sidebar -->
    <aside :class="['left-sidebar', { 'sidebar-collapsed': !sidebarVisible }]">
      <div>
        <div class="brand-logo d-flex align-items-center justify-content-between">
          <a href="/admin" class="text-nowrap logo-img">
            <img :src="require('@/assets/img/logo.png')" alt="Logo" style="width:10rem">
          </a>
          <div class="close-btn d-xl-none d-block sidebartoggler cursor-pointer" @click="toggleSidebar" aria-label="Toggle sidebar">
            <i class="ti ti-x fs-8"></i>
          </div>
        </div>
        <nav class="sidebar-nav scroll-sidebar" data-simplebar style="margin-top: 2rem;">
          <ul id="sidebarnav">
            <li v-for="item in menuItems" :key="item.name" class="sidebar-item" :class="{ active: isMainMenuActive(item) && !isSubmenuOpen(item) }">
              
              <!-- Dropdown Toggle -->
              <template v-if="item.children">
                <div class="sidebar-link cursor-pointer" 
                     @click="toggleDropdown(item.name)"
                     :class="{ active: isMainMenuActive(item) && !isSubmenuOpen(item) }">
                  <span><i :class="item.icon"></i></span>
                  <span class="hide-menu">{{ item.name }}</span>
                  <i class="ti ti-chevron-down ms-auto"></i>
                </div>
                <ul v-if="openDropdown === item.name" class="submenu">
                  <li v-for="child in item.children" :key="child.name" :class="{ active: isChildActive(child) }">
                    <router-link :to="child.link" class="sidebar-link" :class="{ active: isChildActive(child) }">
                      <span class="hide-menu">{{ child.name }}</span>
                    </router-link>
                  </li>
                </ul>
              </template>

              <!-- External Link -->
              <template v-else-if="item.external">
                <a :href="item.link" class="sidebar-link" target="_blank" rel="noopener">
                  <span><i :class="item.icon"></i></span>
                  <span class="hide-menu">{{ item.name }}</span>
                </a>
              </template>

              <!-- AI Dropdown -->
              <template v-else-if="item.name === 'AI'">
                <div class="sidebar-link ai-menu-item cursor-pointer" 
                     @click.stop="handleAIClick(item)"
                     :class="{ 
                       active: isMenuItemActive(item) && !aiDropdownOpen,
                       'dropdown-open': aiDropdownOpen 
                     }">
                  <span>
                    <img src="/AI-Logo.png" alt="AI" class="ai-sidebar-icon" />
                  </span>
                  <span class="hide-menu">{{ item.name }}</span>
                  <i class="ti ti-chevron-down ai-chevron ms-auto" 
                     :class="{ 'rotated': aiDropdownOpen }"></i>
                </div>
                <ul v-if="aiDropdownOpen" class="submenu ai-dropdown-content">
                  <!-- New Chat Link -->
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

              <!-- Internal Vue Router Link -->
              <template v-else>
                <router-link :to="item.link" class="sidebar-link" :class="{ active: isMenuItemActive(item) }">
                  <span><i :class="item.icon"></i></span>
                  <span class="hide-menu">{{ item.name }}</span>
                </router-link>
              </template>

            </li>
          </ul>
        </nav>
      </div>
    </aside>


  

    <div class="body-wrapper">
      <slot></slot>
    </div>
  </div>
</template>

<script>
import '@/assets/css/styles.min.css';

export default {
  name: "SidebarNavigation",
  data() {
    return {
      sidebarVisible: true,
      openDropdown: null,
      isMobile: false,
      aiDropdownOpen: false,
      chatHistory: [],
      currentSessionId: null,
      loadingHistory: false,
      userId: null,
      menuItems: [
        {
          name: "Dashboard",
          link: "/admin/index",
          icon: "ti ti-layout-dashboard",
          matchPrefix: ["/admin/index"] // Exact match only
        },
        {
          name: "Job Seekers",
          icon: "ti ti-user-plus",
          matchPrefix: ["/admin/view-seekers", "/admin/register-seeker", "/admin/hired-seeker", "/admin/approved-user", "/admin/open-tickets"],
          children: [
            { 
              name: "View Seekers", 
              link: "/admin/view-seekers",
              matchPrefix: ["/admin/view-seekers", "/admin/edit-seekers", "/view-seekers"]
            },
            { 
              name: "Register Seekers", 
              link: "/admin/register-seeker",
              matchPrefix: ["/admin/register-seeker"]
            },
            { 
              name: "Hired Seekers", 
              link: "/admin/hired-seeker",
              matchPrefix: ["/admin/hired-seeker"]
            },
            { 
              name: "Approved Users", 
              link: "/admin/approved-user",
              matchPrefix: ["/admin/approved-user"]
            },
            { 
              name: "Open Tickets", 
              link: "/admin/open-tickets",
              matchPrefix: ["/admin/open-tickets"]
            },
            { 
              name: "Employment details", 
              link: "/admin/payroll",
              matchPrefix: ["/admin/payroll"]
            }
          ]
        },
        {
          name: "Job Providers",
          icon: "ti ti-briefcase",
          matchPrefix: ["/admin/view-provider", "/admin/edit-provider", "/admin/register-provider"],
          children: [
            { 
              name: "View Providers", 
              link: "/admin/view-provider",
              matchPrefix: ["/admin/view-more", "/admin/edit-provider"]
            },
            { 
              name: "Register Provider", 
              link: "/admin/register-provider",
              matchPrefix: ["/admin/register-provider"]
            },
            { 
              name: "Approved Providers", 
              link: "/admin/approved-providers",
              matchPrefix: ["/admin/approved-providers"]
            }
          ]
        },
        {
          name: "Agents",
          icon: "ti ti-id-badge",
          matchPrefix: ["/admin/view-agent", "/admin/edit-agent", "/admin/register-agent"],
          children: [
            { 
              name: "View Agent", 
              link: "/admin/view-agent",
              matchPrefix: ["/admin/more-agent", "/admin/edit-agent"]
            },
            { 
              name: "Register Agent", 
              link: "/admin/register-agent",
              matchPrefix: ["/admin/register-agent"]
            }
          ]
        },
        {
          name: "Jobs",
          icon: "ti ti-clipboard",
          matchPrefix: ["/admin/Register-jobs", "/admin/edit-jobs", "/admin/unpublished-job", "/admin/Job-Applicants"],
          children: [
            { 
              name: "Register New jobs", 
              link: "/admin/Register-jobs",
              matchPrefix: ["/admin/Register-jobs", "/admin/edit-jobs","/admin/job-details"]
            },
            { 
              name: "Un Published job", 
              link: "/admin/unpublished-job",
              matchPrefix: ["/admin/unpublished-job"]
            },
            { 
              name: "Job Applicants", 
              link: "/admin/Job-Applicants",
              matchPrefix: ["/admin/Job-Applicants"]
            }
          ]
        },
        {
          name: "ads and category",
          icon: "ti ti-briefcase",
          matchPrefix: ["/admin/advert", "/admin/edit-advert", "/admin/category", "/admin/edit-category"],
          children: [
            { 
              name: "Advert", 
              link: "/admin/advert",
              matchPrefix: ["/admin/advert", "/admin/edit-advert"]
            },
            { 
              name: "Category", 
              link: "/admin/category",
              matchPrefix: ["/admin/category", "/admin/edit-category"]
            }
          ]
        },
        {
          name: "AI",
          link: "/admin/ai-agent",
          icon: "fa-solid fa-robot",
          matchPrefix: ["/admin/ai-agent"]
        }
        
      ],
    };
  },
  mounted() {
    this.checkIfMobile();
    window.addEventListener('resize', this.checkIfMobile);
    this.getUserId();

    // Set currentSessionId from route query
    if (this.$route.query.sessionId) {
      this.currentSessionId = String(this.$route.query.sessionId);
    }
    
    // Watch route to update currentSessionId
    this.$watch(
      () => this.$route.query.sessionId,
      (sessionId) => {
        this.currentSessionId = sessionId ? String(sessionId) : null;
      },
      { immediate: false }
    );
    
    // Listen for chat history updates
    window.addEventListener('chatHistoryUpdated', this.handleChatHistoryUpdate);

    this.menuItems.forEach(item => {
      if (item.children && this.isMainMenuActive(item)) {
        this.openDropdown = item.name;
      }
    });
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.checkIfMobile);
    window.removeEventListener('chatHistoryUpdated', this.handleChatHistoryUpdate);
  },
  methods: {
    toggleSidebar() {
      this.sidebarVisible = !this.sidebarVisible;
    },
    
    // Check if current route matches any of the matchPrefix routes
    matchesPrefix(matchPrefix) {
      if (!matchPrefix || matchPrefix.length === 0) return false;
      const currentPath = this.$route.path;
      return matchPrefix.some(prefix => currentPath.startsWith(prefix));
    },
    
    // For regular menu items (non-dropdown)
    isMenuItemActive(item) {
      // First check exact match
      if (item.link && this.$route.path === item.link) return true;
      
      // Then check matchPrefix
      if (item.matchPrefix && this.matchesPrefix(item.matchPrefix)) return true;
      
      return false;
    },
    
    // For dropdown children
    isChildActive(child) {
      // First check exact match
      if (child.link && this.$route.path === child.link) return true;
      
      // Then check matchPrefix
      if (child.matchPrefix && this.matchesPrefix(child.matchPrefix)) return true;
      
      return false;
    },
    
    // For main menu items (including dropdowns)
    isMainMenuActive(item) {
      // Check if it's a direct link match
      if (item.link && this.$route.path === item.link) return true;
      
      // Check if main item has matchPrefix
      if (item.matchPrefix && this.matchesPrefix(item.matchPrefix)) return true;
      
      // Check if any children are active
      if (item.children) {
        return item.children.some(child => this.isChildActive(child));
      }
      
      return false;
    },
    
    // Legacy method for backward compatibility
    isActive(link) {
      return this.$route.path === link;
    },
    
    isSubmenuOpen(item) {
      return item.children && this.openDropdown === item.name;
    },
    toggleDropdown(name) {
      this.openDropdown = this.openDropdown === name ? null : name;
    },
    checkIfMobile() {
      this.isMobile = window.innerWidth <= 768;
      this.sidebarVisible = !this.isMobile;
    },
    async getUserId() {
      try {
        const token = localStorage.getItem("adminToken");
        if (!token) return;
        
        const payload = JSON.parse(atob(token.split(".")[1]));
        const userEmail = payload.email;
        
        const res = await fetch(`${this.apiBase}/get_user_id_by_email/${userEmail}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const data = await res.json();
        if (res.ok && data.users_id) {
          this.userId = data.users_id;
        }
      } catch (err) {
        console.error("Error getting user ID:", err);
      }
    },
    toggleAIDropdown() {
      this.aiDropdownOpen = !this.aiDropdownOpen;
      // Always reload history when opening dropdown to ensure it's up to date
      if (this.aiDropdownOpen && this.userId) {
        this.loadChatHistory();
      }
    },
    handleAIClick(item) {
      // Navigate to AI page if not already there
      if (!this.isMenuItemActive(item)) {
        this.$router.push(item.link);
      }
      // Toggle dropdown
      this.toggleAIDropdown();
    },
    async loadChatHistory() {
      if (!this.userId || this.loadingHistory) return;
      
      this.loadingHistory = true;
      try {
        const token = localStorage.getItem("adminToken");
        const url = `${this.apiBase}/admin/chat/sessions?users_id=${this.userId}`;
        console.log('📋 Admin Sidebar: Loading chat history from:', url);
        
        const res = await fetch(url, {
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        
        console.log('📋 Admin Sidebar: Response status:', res.status);
        
        if (res.ok) {
          const data = await res.json();
          console.log('📋 Admin Sidebar: Response data:', data);
          
          if (data.sessions && Array.isArray(data.sessions)) {
            console.log(`✅ Admin Sidebar: Found ${data.sessions.length} chat sessions`);
            this.chatHistory = data.sessions.map(session => ({
              sessionId: String(session.id),
              title: session.title || 'New Chat',
              createdAt: session.created_at || session.createdAt,
              lastMessage: session.last_message || ''
            })).sort((a, b) => {
              const dateA = new Date(a.createdAt || 0);
              const dateB = new Date(b.createdAt || 0);
              return dateB - dateA;
            });
            console.log('✅ Admin Sidebar: Loaded chat history:', this.chatHistory.length, 'sessions');
          } else {
            console.warn('⚠️ Admin Sidebar: No sessions array in response:', data);
            this.chatHistory = [];
          }
        } else {
          const errorText = await res.text();
          console.error('❌ Admin Sidebar: Error loading chat history:', res.status, errorText);
          this.chatHistory = [];
        }
      } catch (err) {
        console.error("Error loading chat history:", err);
      } finally {
        this.loadingHistory = false;
      }
    },
    handleNewChat() {
      this.$emit('close-sidebar');
      console.log('🆕 Admin: New Chat clicked, navigating to welcome page...');
      
      // Check if we're already on the AI page
      if (this.$route.path === '/admin/ai-agent' && this.$route.query.sessionId) {
        // If we're already on the AI page with a sessionId, replace to clear it
        console.log('🔄 Already on AI page, replacing route to clear sessionId');
        this.$router.replace({ 
          path: '/admin/ai-agent', 
          query: {} 
        }).then(() => {
          // Dispatch event to trigger new chat
          window.dispatchEvent(new CustomEvent('newChatRequested'));
        });
      } else {
        // Navigate to AI page without sessionId
        console.log('🔄 Navigating to AI page for new chat');
        this.$router.push({ 
          path: '/admin/ai-agent', 
          query: {} 
        }).then(() => {
          // Dispatch event to trigger new chat
          window.dispatchEvent(new CustomEvent('newChatRequested'));
        });
      }
    },
    loadChat(chat) {
      this.$router.push({
        path: '/admin/ai-agent',
        query: { sessionId: chat.sessionId }
      });
    },
    async deleteChat(chat) {
      if (!confirm(`Delete "${chat.title || 'Untitled Chat'}"?`)) return;
      
      try {
        const token = localStorage.getItem("adminToken");
        const res = await fetch(`${this.apiBase}/admin/chat/session/${chat.sessionId}`, {
          method: 'DELETE',
          headers: { 
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (res.ok) {
          this.chatHistory = this.chatHistory.filter(c => c.sessionId !== chat.sessionId);
        }
      } catch (err) {
        console.error("Error deleting chat:", err);
        alert("Failed to delete chat. Please try again.");
      }
    },
    async handleChatHistoryUpdate() {
      // Reload chat history when a new message is sent (even if dropdown is closed)
      console.log('📢 Admin Sidebar: Chat history updated event received');
      console.log('📢 Admin Sidebar: Current userId:', this.userId);
      console.log('📢 Admin Sidebar: Current loadingHistory:', this.loadingHistory);
      if (this.userId) {
        console.log('📢 Admin Sidebar: Reloading history due to update event');
        // Add a small delay to ensure backend has processed the new session
        setTimeout(async () => {
          await this.loadChatHistory();
          console.log('✅ Admin Sidebar: History reload completed. Sessions:', this.chatHistory.length);
        }, 300);
      } else {
        console.warn('⚠️ Admin Sidebar: Cannot reload history - no user ID, getting it first');
        await this.getUserId();
        if (this.userId) {
          console.log('📢 Admin Sidebar: Got user ID, now loading history from event...');
          setTimeout(async () => {
            await this.loadChatHistory();
            console.log('✅ Admin Sidebar: History reload completed after getting userId. Sessions:', this.chatHistory.length);
          }, 300);
        }
      }
    }
  },
};
</script>

<style scoped>
.ai-sidebar-icon {
  width: 1.25rem;
  height: 1.25rem;
  margin-right: 8px;
  object-fit: contain;
  display: inline-block;
}

.sidebar-link:hover {
  background-color: #E960A6 !important;
  color: white !important;
  font-weight: bold;
}

.sidebar-item.active > .sidebar-link,
.sidebar-link.active {
  background-color: #E960A6 !important;
  color: white !important;
  font-weight: bold;
}

.sidebar-collapsed {
  width: 0;
  overflow: hidden;
  transition: width 0.3s;
}

.sidebar-collapsed .sidebar-link {
  display: none;
}

@media (max-width: 768px) {
  .left-sidebar {
    display: none;
  }

  .left-sidebar.sidebar-collapsed {
    display: block;
  }

  .body-wrapper {
    margin-left: 0;
  }

  .close-btn {
    display: block;
  }

  .mobile-toggle-btn {
    position: fixed;
    top: 10px;
    left: 10px;
    z-index: 9999;
    background: #E960A6;
    border: none;
    color: white;
    padding: 10px;
    border-radius: 5px;
  }
}

.submenu {
  list-style: none;
  padding-left: 1.5rem;
  background-color: #f7f7f7;
}

.submenu li {
  margin: 0.3rem 0;
}

.submenu li.active > .sidebar-link,
.submenu .sidebar-link.active {
  background-color: #E960A6 !important;
  color: white !important;
  font-weight: bold;
}

.submenu .sidebar-link {
  font-size: 0.9rem;
  padding-left: 2rem;
  color: #333;
  display: block;
}

.submenu .sidebar-link:hover {
  background-color: #E960A6 !important;
  color: white !important;
  font-weight: bold;
}

/* AI Dropdown Styles */
.ai-menu-item {
  display: flex;
  align-items: center;
  width: 100%;
  cursor: pointer;
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

.ms-auto {
  margin-left: auto;
}

.hide-menu {
  flex: 1;
}

/* New Chat Link */
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