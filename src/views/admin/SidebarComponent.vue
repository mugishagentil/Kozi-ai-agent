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
          <div class="close-btn d-xl-none d-block sidebartoggler cursor-pointer" @click="$emit('toggle-sidebar')" aria-label="Toggle sidebar">
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
                    <img src="/generative.png" alt="AI" class="ai-sidebar-icon" />
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
  props: {
    sidebarVisible: {
      type: Boolean,
      default: true
    }
  },
  emits: ['toggle-sidebar', 'close-sidebar'],
  data() {
    return {
      openDropdown: null,
      isMobile: false,
      aiDropdownOpen: false,
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
  computed: {
    apiBase() {
      return process.env.VUE_APP_API_BASE || 'http://localhost:5050/api';
    }
  },
  mounted() {
    this.checkIfMobile();
    window.addEventListener('resize', this.checkIfMobile);

    this.menuItems.forEach(item => {
      if (item.children && this.isMainMenuActive(item)) {
        this.openDropdown = item.name;
      }
    });
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.checkIfMobile);
  },
  methods: {
    toggleSidebar() {
      this.$emit('toggle-sidebar');
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
      // Emit event to parent to update sidebar state
      if (!this.isMobile) {
        this.$emit('toggle-sidebar');
      } else {
        this.$emit('close-sidebar');
      }
    },
    async getUserId() {
      try {
        // Try all tokens (same priority as composable) - adminToken might not work with external API
        const employeeToken = localStorage.getItem("employeeToken");
        const employerToken = localStorage.getItem("employerToken");
        const adminToken = localStorage.getItem("adminToken");
        const token = employeeToken || employerToken || adminToken;
        
        if (!token) {
          console.warn('⚠️ Admin Sidebar: No token found (tried adminToken, employerToken, employeeToken)');
          return;
        }
        
        // Get email from localStorage or token payload
        let userEmail = localStorage.getItem('userEmail');
        if (!userEmail) {
          try {
            const payload = JSON.parse(atob(token.split(".")[1]));
            userEmail = payload.email;
          } catch (e) {
            console.error('❌ Admin Sidebar: Could not decode token:', e);
            return;
          }
        }
        
        console.log('📧 Admin Sidebar: Getting user ID for email:', userEmail);
        console.log('🔑 Admin Sidebar: Using token type:', employeeToken ? 'employee' : employerToken ? 'employer' : 'admin');

        // Get user ID from external API (same as composable)
        const userIdUrl = `https://apis.kozi.rw/get_user_id_by_email/${encodeURIComponent(userEmail)}`;
        console.log('📧 Admin Sidebar: Fetching userId from:', userIdUrl);
        
        const res = await fetch(userIdUrl, {
          headers: { 
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}` 
          },
        });
        
        if (!res.ok) {
          const errorText = await res.text();
          console.error('❌ Admin Sidebar: User ID fetch failed:', res.status, errorText);
          throw new Error(`Failed to fetch user ID: ${res.status}`);
        }
        
        const data = await res.json();
        console.log('📋 Admin Sidebar: User ID response:', data);

        if (data.users_id) {
          this.userId = data.users_id;
          console.log('✅ Admin Sidebar: Got user ID:', this.userId);
        } else {
          console.warn('⚠️ Admin Sidebar: No user ID in response:', data);
        }
      } catch (err) {
        console.error("❌ Admin Sidebar: Error getting user ID:", err);
      }
    },
    toggleAIDropdown() {
      this.aiDropdownOpen = !this.aiDropdownOpen;
    },
    handleAIClick(item) {
      // Navigate to AI page if not already there
      if (!this.isMenuItemActive(item)) {
        this.$router.push(item.link);
      }
      // Toggle dropdown
      this.toggleAIDropdown();
    },
    handleNewChat() {
      this.$emit('close-sidebar');
      this.$router.push({ 
        path: '/admin/ai-agent', 
        query: {} 
      }).then(() => {
        window.dispatchEvent(new CustomEvent('newChatRequested'));
      });
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
  /* Fix sidebar positioning on mobile */
  .left-sidebar {
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: min(85vw, 320px) !important;
    height: 100vh !important;
    z-index: 9999 !important;
    transform: translateX(-100%) !important;
    transition: transform 0.3s ease !important;
    display: block !important;
    background: #fff !important;
    box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1) !important;
  }

  /* When sidebar is visible (not collapsed) */
  .left-sidebar:not(.sidebar-collapsed) {
    transform: translateX(0) !important;
  }
  
  /* When sidebar is collapsed, hide it completely */
  .left-sidebar.sidebar-collapsed {
    transform: translateX(-100%) !important;
  }

  /* Overlay is now handled by IndexComponent */

  /* Force body-wrapper to have no margin on mobile - override inline styles */
  .body-wrapper {
    margin-left: 0 !important;
    width: 100% !important;
    max-width: 100vw !important;
    padding-left: 1rem !important;
    padding-right: 1rem !important;
    overflow-x: hidden !important;
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
  
  /* Prevent page wrapper from overflowing */
  .page-wrapper {
    width: 100% !important;
    max-width: 100vw !important;
    overflow-x: hidden !important;
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