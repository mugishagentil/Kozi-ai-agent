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
        <li v-for="item in menuItems" :key="item.link">
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
        </li>
      </ul>
    </nav>
  </aside>
</template>


<script>
import { useRoute } from 'vue-router';

export default {
  props: {
    visible: Boolean,
  },
  emits: ['close-sidebar'],
  setup() {
    const route = useRoute();

    const menuItems = [
      {
        name: "Dashboard",
        link: "/employer/dashboard",
        icon: "fa-solid fa-table-columns",
        matchPrefix: ["/employer/dashboard"]
      },

      { name: "Edit Profile",
       link: "/employer/edit-profile",
        icon: "ti ti-user-plus",
        matchPrefix: ["/employer/edit-profile"]
       },

       { name: "View Profile",
       link: "/employer/view-profile",
        icon: "ti ti-user-check",
        matchPrefix: ["/employer/view-profile"]
       },

       { name: "All Job Seekers",
       link: "/employer/seekers",
        icon: "ti ti-users",
        matchPrefix: ["/employer/seekers"]
       },

       { name: "Add job",
       link: "/employer/add-job",
        icon: "ti ti-settings",
        premium: true,
        matchPrefix: ["/employer/add-job"]
       },

        

       { name: "All Categories",
       link: "/employer/category",
        icon: "ti ti-category-2",
        matchPrefix: ["/employer/category"]
       },
       { name: "Request Support",
       link: "/employer/support",
        icon: "ti ti-message-chatbot",
        matchPrefix: ["/employer/support"]
       },
       { name: "AI Agent",
       link: "/employer/ai-agent",
        icon: "fa-solid fa-robot",
        matchPrefix: ["/employer/ai-agent"]
       },
     
      { name: "Guidlines", link: "/Kozi_Client_Guidelines.pdf", icon: "ti ti-archive", external: true },
      
    ];

    const isActive = (matchPrefix) => {
      return matchPrefix.some(prefix => route.path.startsWith(prefix));
    };

    return {
      route,
      menuItems,
      isActive,
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
</style>