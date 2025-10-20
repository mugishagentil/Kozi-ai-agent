<!-- views/NotFound.vue -->
<template>
  <div class="text-center p-8">
    <h1 class="text-4xl font-bold text-red-600">404 - Page Not Found</h1>
    <p class="mt-4 text-gray-600">The page you're looking for doesn't exist.</p>
    <router-link to="/" class="text-blue-500 underline">Go to Home</router-link>
  </div>
</template>

<script>
export default {
  name: 'NotFound'
}
</script>
