<template>
  <header class="app-header">
    <nav class="navbar navbar-expand-lg navbar-light px-3 fixed-top" style="background-color: white;">
      <ul class="navbar-nav">
        <!-- Sidebar toggle visible only on small screens -->
        <li class="nav-item d-block d-xl-none">
          <a
            class="nav-link sidebartoggler nav-icon-hover"
            href="javascript:void(0)"
            @click="$emit('toggle-sidebar')"
            title="Toggle Sidebar"
          >
            <i class="ti ti-menu-2"></i>
          </a>
        </li>
      </ul>

      <div class="navbar-collapse justify-content-end px-0" id="navbarNav">
        <ul class="navbar-nav flex-row ms-auto align-items-center justify-content-end">
          <!-- User Info Display -->
          <li class="nav-item me-3" v-if="userEmail">
            <div class="d-flex flex-column text-end">
              <!-- <small class="text-muted mb-0"><strong>Name:</strong> {{ firstName }} {{ lastName }}</small>
              <small class="text-muted mb-0"><strong>Image:</strong> {{ image }}</small>
              <img :src="uploadsUrl +image" alt="Current Logo" class="custom-job-logo" width="150" /> -->
        <!-- <small class="text-muted mb-0"><strong>Email:</strong> {{ userEmail }}</small>
              <small class="text-muted"><strong>ID:</strong> {{ userId }}</small> -->
            </div>
          </li>
          
          <!-- User dropdown -->
          <li class="nav-item dropdown">
            <a
              class="nav-link nav-icon-hover"
              href="javascript:void(0)"
              id="userDropdown"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >

            <img
            :src="uploadsUrl + image"
            @error="onLogoError($event)"
            alt="User Profile"
            class="rounded-circle"
            width="35"
            height="35"
            />
            
              
            </a>
           
            <ul
              class="dropdown-menu dropdown-menu-end dropdown-menu-animate-up"
              aria-labelledby="userDropdown"
            >
              <li>
                <router-link
                  to="/dashboard/View-profile"
                  class="dropdown-item d-flex align-items-center "
                >
                  <i class="ti ti-user fs-6 me-2"></i> My Profile
                </router-link>
              </li>
              
              <li>
                <router-link
                  to="/dashboard/change-password"
                  class="dropdown-item d-flex align-items-center"
                  
                >
                 <i class="fa-solid fa-key me-2"></i> Credentials
                </router-link>
              </li>
              <li>
                <router-link
                  to="/dashboard/settings"
                  class="dropdown-item d-flex align-items-center"
                  
                >
                 <i class="fa-solid fa-key me-2"></i> Settings
                </router-link>
              </li>
              <li>
                <a
                  href="javascript:void(0)"
                  class="dropdown-item"
                  @click="logout"
                >
                 <i class="ti ti-square-arrow-left me-2" style="width: 2rem;"></i> Logout
                </a>
              </li>
              
              
            </ul>
          </li>
        </ul>
      </div>
    </nav>
  </header>
</template>

<script>
import { globalVariable } from "@/global";

export default {
  name: "HeaderComponent",
  data() {
    return {
      defaultImage: require("@/assets/img/user-1.jpg"),
      uploadsUrl: globalVariable + "/uploads/profile/",
      
      userId: "",
      userEmail: "",
      firstName: "",
      lastName: "",
      image: "",
    };
  },
  mounted() {
    this.getUserIdFromEmail();
  },
  methods: {

     onLogoError(event) {
    event.target.src = this.defaultImage;
  },
    async getUserIdFromEmail() {
      const token = localStorage.getItem("employeeToken");
      if (!token) return;
      
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        this.userEmail = payload.email;
        
        const res = await fetch(`${globalVariable}/get_user_id_by_email/${this.userEmail}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        const data = await res.json();
        if (res.ok) {
          this.userId = data.users_id;
          this.fetchProfile(); // Fetch profile after getting userId
        } else {
          console.error("Unable to get user ID:", data.message);
        }
      } catch (err) {
        console.error("Error getting users_id:", err);
      }
    },

    async fetchProfile() {
      const token = localStorage.getItem("employeeToken");
      if (!token || !this.userId) return;
      
      try {
        const res = await fetch(`${globalVariable}/seeker/view_profile/${this.userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        const data = await res.json();
        if (res.ok) {
          this.firstName = data.first_name || "";
          this.lastName = data.last_name || "";
          this.image = data.image || "";
        } else {
          console.error("Failed to fetch profile:", data.message);
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
      }
    },
    
    logout() {
      localStorage.removeItem("authToken");
      this.$router.push("/login");
    },
  },
};
</script>

<style scoped>
.app-header {
  width: 100%;
  background: #ffffff;
  
}

.nav-icon-hover {
  cursor: pointer;
}

/* Hover effect for dropdown items */
.dropdown-item:hover {
  background-color: #ea60a7 !important;
  color: white !important;
}

/* Override bootstrap dropdown-menu animation if needed */
.dropdown-menu-animate-up {
  animation: dropdownAnimateUp 0.3s ease forwards;
}

@keyframes dropdownAnimateUp {
  0% {
    opacity: 0;
    transform: translateY(10px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
