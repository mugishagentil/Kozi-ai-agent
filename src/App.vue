<template>
  <div id="app">
    <router-view></router-view> 
  </div>
</template>

<script>
import "./assets/styles.css";
import "./assets/css/dashboard.css";

export default {
  name: 'App',
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
