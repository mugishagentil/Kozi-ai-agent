<template>
  <IndexComponent>
    <div class="ai-chat-wrapper">
      <ChatbotComponent :showCloseButton="false" :embedded="true" />
    </div>
  </IndexComponent>
</template>

<script>
import IndexComponent from "./IndexComponent.vue";
import ChatbotComponent from "../ChatbotComponent.vue";

export default {
  name: "AIChatPage",
  components: {
    IndexComponent,
    ChatbotComponent,
  },
};
</script>

<style scoped>
.ai-chat-wrapper {
  position: fixed;
  top: 70px; /* Below header */
  left: 0;
  right: 0;
  bottom: 0;
  padding: 1.5rem; /* Add padding around the chatbot */
  overflow: hidden;
  background: #f9fafb;
  margin-left: 270px; /* Space for dashboard sidebar */
  width: calc(100% - 270px);
  z-index: 2;
  display: flex;
}

/* Add inner container with box shadow */
.ai-chat-wrapper :deep(.chatbot-container) {
  background: white;
  border-radius: 12px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  width: 100%;
  height: 100%;
}

@media (max-width: 768px) {
  .ai-chat-wrapper {
    position: fixed !important;
    top: 70px !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    margin-left: 0 !important;
    margin-right: 0 !important;
    width: 100vw !important;
    max-width: 100vw !important;
    height: calc(100dvh - 70px) !important;
    transform: none !important;
    transition: none !important;
    padding: 0.75rem; /* Smaller padding on mobile */
  }
}
</style>


