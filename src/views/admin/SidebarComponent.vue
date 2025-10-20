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
          name: "AI Agent",
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
    }
  },
};
</script>

<style scoped>
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
</style>