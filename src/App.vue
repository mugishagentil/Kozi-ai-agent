<template>
  <div id="app">
    <router-view></router-view>
    
    <!-- Live Chat Widget - Only show on public pages (not in dashboard) -->
    <LiveChatbot v-if="showChatWidget" />
  </div>
</template>

<script>
import "./assets/styles.css";
import "./assets/css/dashboard.css";
import LiveChatbot from "./components/LiveChatbot.vue";

export default {
  name: 'App',
  components: {
    LiveChatbot
  },
  computed: {
    showChatWidget() {
      // Show widget on public pages, hide in dashboard/admin pages
      const publicPages = ['/', '/home', '/signup', '/login', '/forgot-password', '/role-selector'];
      const currentPath = this.$route.path.toLowerCase();
      
      // Hide in admin, jobseeker, jobprovider, agent dashboards
      if (currentPath.includes('/admin') || 
          currentPath.includes('/jobseeker') || 
          currentPath.includes('/jobprovider') ||
          currentPath.includes('/agent')) {
        return false;
      }
      
      // Show on public pages
      return publicPages.some(page => currentPath === page || currentPath.startsWith(page));
    }
  },
  watch: {
    $route(to) {
      const defaultTitle = 'Kozi Rwanda';
      document.title = to.meta.title || defaultTitle;
    }
  },
  mounted() {
    const defaultTitle = 'Kozi Rwanda';
    document.title = this.$route.meta.title || defaultTitle;
  }
};
</script>

<style>
/* Your styles */
</style>
