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
        <li v-for="item in menuItems" :key="item.link">
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
        name: "AI Agent",
        link: "/agent/ai-agent",
        icon: "fa-solid fa-robot",
        matchPrefix: ["/agent/ai-agent"]
      },
      
     
      
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
</style>