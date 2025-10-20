<template>
  <div id="main-wrapper">
    <SidebarComponent
      :visible="sidebarVisible"
      @close-sidebar="sidebarVisible = false"
    />

    <div class="body-wrapper" :class="{ hidden: isMobile && sidebarVisible }">
      <HeaderComponent @toggle-sidebar="toggleSidebar" />
      <slot />
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
    this.checkMobile(); // Ensure correct state on initial load
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
      }
    },
  },
};
</script>

<style scoped>
#main-wrapper {
  display: flex;
  height: 100vh;
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

@media (max-width: 768px) {
  .body-wrapper {
    margin-left: 0;
    width: 100%;
  }
  
  /* Ensure header has no padding/margin on mobile */
  .body-wrapper :deep(.app-header) {
    margin: 0;
    padding: 0;
  }
  
  .body-wrapper :deep(.navbar) {
    padding-left: 0.5rem !important;
    padding-right: 0.5rem !important;
  }
}
</style>