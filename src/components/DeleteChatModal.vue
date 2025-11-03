<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="visible" class="delete-chat-modal-overlay" @click.self="handleCancel">
        <div class="delete-chat-modal">
          <div class="modal-header">
            <h3 class="modal-title">Delete chat?</h3>
          </div>
          
          <div class="modal-body">
            <p class="modal-message">
              This will delete <strong>{{ chatTitle }}</strong>.
            </p>
            <p class="modal-secondary-message">
              This action cannot be undone.
            </p>
          </div>
          
          <div class="modal-actions">
            <button 
              class="btn-cancel"
              @click="handleCancel"
            >
              Cancel
            </button>
            <button 
              class="btn-delete"
              @click="handleConfirm"
              :disabled="deleting"
            >
              {{ deleting ? 'Deleting...' : 'Delete' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script>
export default {
  name: 'DeleteChatModal',
  props: {
    visible: {
      type: Boolean,
      required: true
    },
    chatTitle: {
      type: String,
      default: 'Untitled Chat'
    },
    deleting: {
      type: Boolean,
      default: false
    }
  },
  emits: ['confirm', 'cancel'],
  methods: {
    handleConfirm() {
      this.$emit('confirm');
    },
    handleCancel() {
      this.$emit('cancel');
    }
  },
  watch: {
    visible(newVal) {
      if (newVal) {
        // Prevent body scroll when modal is open
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    }
  },
  beforeUnmount() {
    // Restore body scroll if component is destroyed
    document.body.style.overflow = '';
  }
};
</script>

<style scoped>
.delete-chat-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 20px;
}

.delete-chat-modal {
  background-color: #ffffff;
  border-radius: 12px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 420px;
  overflow: hidden;
  animation: modalSlideIn 0.2s ease-out;
  border: 1px solid #e5e7eb;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-10px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-header {
  padding: 24px 24px 16px;
  border-bottom: 1px solid #e5e7eb;
  background-color: #ffffff;
}

.modal-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
  line-height: 1.5;
}

.modal-body {
  padding: 20px 24px;
  background-color: #ffffff;
}

.modal-message {
  margin: 0 0 12px 0;
  font-size: 15px;
  line-height: 1.5;
  color: #4b5563;
}

.modal-message strong {
  font-weight: 600;
  color: #1f2937;
}

.modal-secondary-message {
  margin: 0;
  font-size: 14px;
  color: #6b7280;
  line-height: 1.5;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid #e5e7eb;
  background-color: #f9fafb;
}

.btn-cancel,
.btn-delete {
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 500;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 80px;
}

.btn-cancel {
  background-color: #ffffff;
  color: #4b5563;
  border: 1px solid #d1d5db;
}

.btn-cancel:hover {
  background-color: #f9fafb;
  border-color: #9ca3af;
  color: #374151;
}

.btn-cancel:active {
  background-color: #f3f4f6;
}

.btn-delete {
  background-color: #dc2626;
  color: #ffffff;
}

.btn-delete:hover:not(:disabled) {
  background-color: #b91c1c;
}

.btn-delete:active:not(:disabled) {
  background-color: #991b1b;
}

.btn-delete:disabled {
  background-color: #fca5a5;
  cursor: not-allowed;
  opacity: 0.7;
}

/* Always use white and gray theme - no dark mode */

/* Modal transition animations */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .delete-chat-modal,
.modal-leave-active .delete-chat-modal {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.modal-enter-from .delete-chat-modal,
.modal-leave-to .delete-chat-modal {
  transform: translateY(-10px) scale(0.95);
  opacity: 0;
}
</style>

