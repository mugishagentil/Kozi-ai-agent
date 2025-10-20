<template>
  <header class="app-header">
    <nav class="navbar navbar-expand-lg navbar-light px-3 fixed-top">
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
                :src="profileImage"
                width="35"
                height="35"
                class="rounded-circle"
                alt="User profile"
              />
            </a>
            <ul
              class="dropdown-menu dropdown-menu-end dropdown-menu-animate-up"
              aria-labelledby="userDropdown"
            >
              <li>
                <router-link
                  to="#"
                  class="dropdown-item d-flex align-items-center "
                >
                  <i class="ti ti-user fs-6 me-2"></i> My Profile
                </router-link>
              </li>
              
              <li>
                <router-link
                  to=""
                  class="dropdown-item d-flex align-items-center"
                  
                >
                 <i class="fa-solid fa-key me-2"></i> Credentials
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
export default {
  name: "HeaderComponent",
  data() {
    return {
      profileImage: require("@/assets/img/user-1.jpg"),
    };
  },
  methods: {
    logout() {
      localStorage.removeItem("adminToken");
      this.$router.push("/admin");
    },
  },
};
</script>

<style scoped>
.app-header {
  width: 100%;
  background: #ffffff;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
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
