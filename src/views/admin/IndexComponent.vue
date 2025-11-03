<template>
    <div class="page-wrapper" id="main-wrapper" data-layout="vertical" data-navbarbg="skin6" data-sidebartype="full" data-sidebar-position="fixed" data-header-position="fixed">
      <!-- Mobile overlay for sidebar -->
      <div 
        v-if="isMobile && sidebarVisible" 
        class="sidebar-overlay"
        @click="closeSidebar"
      ></div>
      <SidebarComponent :sidebarVisible="sidebarVisible" @toggle-sidebar="toggleSidebar" />
      <div class="body-wrapper">
        <HeaderComponent @toggle-sidebar="toggleSidebar"/>
        <div class="container-fluid">
          <div class="row">
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script>
  import HeaderComponent from "./HeaderComponent.vue";
  import SidebarComponent from "./SidebarComponent.vue";
  
  export default {
    name: "MainWrapper",
    components: {
      SidebarComponent,
      HeaderComponent,
    },
    data() {
      return {
        sidebarVisible: false,
        isMobile: window.innerWidth <= 768,
      };
    },
    mounted() {
      window.addEventListener('resize', this.checkMobile);
      this.checkMobile();
      // On desktop, sidebar should be visible by default
      if (!this.isMobile) {
        this.sidebarVisible = true;
      }
    },
    beforeUnmount() {
      window.removeEventListener('resize', this.checkMobile);
    },
    methods: {
      toggleSidebar() {
        this.sidebarVisible = !this.sidebarVisible;
      },
      closeSidebar() {
        this.sidebarVisible = false;
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
  .page-wrapper {
    width: 100%;
    overflow-x: hidden;
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
    
    .page-wrapper {
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
  }
  </style>
  