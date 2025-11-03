<template>
  <div id="main-wrapper">
    <!-- Mobile overlay for sidebar -->
    <div 
      v-if="isMobile && sidebarVisible" 
      class="sidebar-overlay"
      @click="sidebarVisible = false"
    ></div>
    <SidebarComponent
      :visible="sidebarVisible"
      @close-sidebar="sidebarVisible = false"
    />

    <div class="body-wrapper" :class="{ hidden: isMobile && sidebarVisible }">
      <HeaderComponent @toggle-sidebar="toggleSidebar" />
      
    </div>
  </div>
</template>

<script>
import HeaderComponent from "./HeaderComponent.vue";
import SidebarComponent from "./SidebarComponent.vue";

export default {
  components: { HeaderComponent, SidebarComponent },
  data() {
    return {
      sidebarVisible: false,
      isMobile: window.innerWidth <= 768,
    };
  },
  mounted() {
    window.addEventListener("resize", this.checkMobile);
  },
  beforeUnmount() {
    window.removeEventListener("resize", this.checkMobile);
  },
  methods: {
    toggleSidebar() {
      this.sidebarVisible = !this.sidebarVisible;
    },
    checkMobile() {
      this.isMobile = window.innerWidth <= 768;
      if (!this.isMobile) {
        this.sidebarVisible = true;
      } else {
        this.sidebarVisible = false;
      }
    },
  },
};
</script>

<style scoped>
#main-wrapper {
  display: flex;
  height: 10rem;
  width: 100%;
}

.body-wrapper {
  flex: 1;
  transition: filter 0.3s ease;
  width: 100%;
  /* Remove padding that's causing the margins */
}

.body-wrapper.hidden {
  filter: blur(3px);
  pointer-events: none;
  user-select: none;
}

@media (min-width: 769px) {
  .body-wrapper {
    margin-left: 270px;
    width: calc(100% - 270px);
  }
}

/* Mobile overlay */
.sidebar-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 9998;
  display: none;
}

@media (max-width: 768px) {
  .sidebar-overlay {
    display: block;
  }
  
  #main-wrapper {
    width: 100vw !important;
    max-width: 100vw !important;
    overflow-x: hidden !important;
  }
  
  .body-wrapper {
    margin-left: 0 !important;
    width: 100% !important;
    max-width: 100vw !important;
    padding-left: 1rem !important;
    padding-right: 1rem !important;
    overflow-x: hidden !important;
  }
  
  /* Ensure header has no padding/margin on mobile */
  .body-wrapper :deep(.app-header) {
    margin: 0 !important;
    padding: 0 !important;
    width: 100% !important;
    max-width: 100vw !important;
  }
  
  .body-wrapper :deep(.navbar) {
    padding-left: 0.5rem !important;
    padding-right: 0.5rem !important;
    width: 100% !important;
    max-width: 100vw !important;
  }
}
</style>
