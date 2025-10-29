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
</template>

<script>
import { useRoute } from 'vue-router';
import { globalVariable } from "@/global";

export default {
  props: {
    visible: Boolean,
  },
  emits: ['close-sidebar'],
  data() {
    return {
      userEmail: "",
      userId: "",
      isProfileComplete: false,
      showModal: false,
    };
  },
  mounted() {
    this.getUserIdAndCheckProfile();
  },
  setup() {
    const route = useRoute();

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
      menuItems,
      isActive,
    };
  },
  methods: {
    async getUserIdAndCheckProfile() {
      const token = localStorage.getItem("employeeToken");
      if (!token) return;

      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        this.userEmail = payload.email;

        // Get user ID
        const res = await fetch(`${globalVariable}/get_user_id_by_email/${this.userEmail}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (res.ok) {
          this.userId = data.users_id;

          // Check profile completeness
          const checkRes = await fetch(`${globalVariable}/seekers/check_columns/${this.userId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const checkData = await checkRes.json();
          this.isProfileComplete = checkData.isComplete;
        } else {
          console.error("Unable to get user ID:", data.message);
        }
      } catch (err) {
        console.error("Error retrieving user info or checking profile:", err);
      }
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
</style>