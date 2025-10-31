<template>
  <IndexComponent />
  <div class="ai-chat-wrapper">
    <ChatbotComponent :showCloseButton="false" :embedded="true" />
  </div>
</template>

<script>
import IndexComponent from "../IndexComponent.vue";
import ChatbotComponent from "../../ChatbotComponent.vue";

export default {
  name: "AIChatPageProvider",
  components: {
    IndexComponent,
    ChatbotComponent,
  },
};
</script>

<style scoped>
.ai-chat-wrapper {
  position: fixed;
  top: 70px;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 1.5rem;
  background: #f9fafb;
  margin-left: 270px;
  width: calc(100% - 270px);
  z-index: 2;
  display: flex;
}

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
    padding: 0.75rem;
  }
}
</style>
