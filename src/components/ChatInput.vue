<template>
  <div class="chat-input-container">
    <div class="chat-input">
      <input
        v-model="message"
        type="text"
        placeholder="Ask me anything about Kozi..."
        :disabled="disabled"
        @keypress="handleKeyPress"
        ref="inputRef"
      />
      <button 
        @click="handleSend"
        :disabled="disabled || !canSend"
        id="sendBtn"
      >
        <i class="fas fa-paper-plane"></i>
      </button>
    </div>
  </div>
</template>

<script>
import { ref, computed, nextTick } from 'vue'

export default {
  name: 'ChatInput',
  props: {
    disabled: {
      type: Boolean,
      default: false
    }
  },
  emits: ['send'],
  setup(props, { emit }) {

// Local state
const message = ref('')
const inputRef = ref(null)

// Computed properties
const canSend = computed(() => {
  return message.value.trim().length > 0
})

// Methods
const handleSend = () => {
  if (canSend.value && !props.disabled) {
    const messageToSend = message.value.trim()
    emit('send', messageToSend)
    message.value = ''
    
    // Focus back to input after sending
    nextTick(() => {
      if (inputRef.value) {
        inputRef.value.focus()
      }
    })
  }
}

const handleKeyPress = (event) => {
  if (event.key === 'Enter' && !event.shiftKey && !props.disabled) {
    event.preventDefault()
    handleSend()
  }
}

    return {
      message,
      inputRef,
      canSend,
      handleSend,
      handleKeyPress
    }
  }
}
</script>

<style scoped>
.chat-input-container {
  position: sticky;
  bottom: 0;
  background: linear-gradient(180deg, rgba(249,250,251,0) 0%, #ffffff 30%);
  padding: 0.85rem 1rem 1.2rem;
  display: flex;
  justify-content: center;
}

.chat-input {
  display: flex;
  gap: 0.5rem;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 24px;
  padding: 0.35rem 0.35rem 0.35rem 1rem;
  align-items: center;
  width: 100%;
  max-width: 720px;
  box-shadow: 0 8px 28px rgba(0,0,0,.06);
}

.chat-input input {
  flex: 1;
  border: 0;
  outline: none;
  font-size: 0.98rem;
  padding: 0.9rem 0.2rem;
}

.chat-input button {
  background: linear-gradient(135deg, #E41E79 0%, #C0126E 100%);
  color: white;
  border: none;
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  cursor: pointer;
  transition: transform .1s ease, box-shadow .1s ease, background .1s ease;
}

.chat-input button:hover { 
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(234,96,166,.35);
}
.chat-input button:disabled { 
  background: #e5e7eb; color: #9ca3af; cursor: not-allowed; box-shadow: none; transform:none;
}

/* Dark */
body.dark .chat-input { background: #0f1115; border-color: #2a2a2a; }
body.dark .chat-input-container { background: linear-gradient(180deg, rgba(15,17,21,0) 0%, #0f1115 30%); }
body.dark .chat-input input { color: #e5e7eb; }

/* Mobile responsiveness */
@media (max-width: 768px) {
  .chat-input-container { 
    padding: 0.6rem 0.75rem 1rem;
    width: 100%;
    max-width: 100vw;
  }
  .chat-input { 
    max-width: 100%; 
    border-radius: 20px;
    width: 100%;
  }
  .chat-input input { font-size: 1rem; padding: 0.85rem 0.2rem; }
  .chat-input button { width: 40px; height: 40px; }
}

</style>
