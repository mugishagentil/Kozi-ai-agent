<template>
  <div class="chat-widget">
    <!-- Chat Button (when minimized) -->
    <button 
      v-if="!isOpen" 
      @click="toggleChat" 
      class="chat-button"
      aria-label="Open chat"
    >
      <i class="fas fa-comments"></i>
    </button>

    <!-- Chat Window (when open) -->
    <div v-if="isOpen" class="chat-window">
      <!-- Header -->
      <div class="chat-header">
        <div class="header-left">
          <img src="/generative.png" alt="AI" class="header-logo" />
          <span>Kozi Assistant</span>
        </div>
        <div class="header-right">
          <button @click="resetChat" class="icon-btn" title="Reset chat">
            <i class="fas fa-redo"></i>
          </button>
          <button @click="toggleChat" class="icon-btn" title="Close">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>

      <!-- Messages Area -->
      <div class="chat-messages" ref="messagesContainer">
        <!-- Welcome Screen (show when no messages) -->
        <div v-if="messages.length === 0" class="welcome-screen">
          <div class="welcome-title">
            Hello there, Ready to dive in?
          </div>
          <p class="welcome-description">I'm here to help you with everything related to Kozi platform</p>
          
          <!-- Quick Suggestions -->
          <div class="suggestions-area">
            <button 
              v-for="(suggestion, index) in suggestions" 
              :key="index"
              @click="sendMessage(suggestion.text)"
              class="suggestion-btn"
            >
              <span class="suggestion-emoji">{{ suggestion.emoji }}</span>
              {{ suggestion.label }}
            </button>
          </div>
        </div>
        
        <!-- Messages -->
        <div v-else>
          <div 
            v-for="(message, index) in messages" 
            :key="index" 
            :class="['message', message.sender]"
          >
            <div class="message-bubble" v-html="message.text"></div>
          </div>
          
          <!-- Typing Indicator -->
          <div v-if="isTyping" class="message bot">
            <div class="message-bubble typing-indicator">
              <span></span><span></span><span></span>
            </div>
          </div>
        </div>
      </div>

      <!-- Input Area -->
      <div class="chat-input-area">
        <input 
          v-model="userInput" 
          @keypress.enter="handleSend"
          type="text" 
          placeholder="Message..."
          :disabled="isTyping"
        />
        <button @click="handleSend" :disabled="!userInput.trim() || isTyping" class="send-btn">
          <i class="fas fa-paper-plane"></i>
        </button>
      </div>

      <!-- Footer -->
      <div class="chat-footer-text">
        Powered by <a href="https://www.sansongrp.com/" target="_blank" rel="noopener noreferrer">Sanson Grp</a>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'LiveChatbot',
  data() {
    return {
      isOpen: false,
      userInput: '',
      messages: [],
      isTyping: false,
      unreadCount: 0,
      showSuggestions: true,
      suggestions: [
        { emoji: '❓', label: 'About Kozi', text: 'What is Kozi?' },
        { emoji: '💰', label: 'Pricing', text: 'What are your pricing and fees?' },
        { emoji: '📝', label: 'Register', text: 'How do I register on Kozi?' },
        { emoji: '📞', label: 'Contact', text: 'How can I contact Kozi?' }
      ],
      conversationHistory: []
    }
  },
  methods: {
    toggleChat() {
      this.isOpen = !this.isOpen;
      if (this.isOpen) {
        this.$nextTick(() => {
          this.scrollToBottom();
        });
      }
    },
    
    resetChat() {
      this.messages = [];
      this.conversationHistory = [];
      this.userInput = '';
      this.showSuggestions = true;
      this.scrollToBottom();
    },
    
    handleSend() {
      if (!this.userInput.trim() || this.isTyping) return;
      
      const message = this.userInput.trim();
      this.sendMessage(message);
    },
    
    async sendMessage(text) {
      // Add user message
      this.messages.push({
        sender: 'user',
        text: text
      });
      
      // Add to conversation history
      this.conversationHistory.push({
        role: 'user',
        content: text
      });
      
      this.userInput = '';
      this.showSuggestions = false; // Hide suggestions after user sends message
      this.scrollToBottom();
      
      // Get AI response
      this.isTyping = true;
      try {
        const response = await this.getAIResponse(text);
        this.addBotMessage(response);
        
        // Add to conversation history
        this.conversationHistory.push({
          role: 'assistant',
          content: response
        });
      } catch (error) {
        console.error('Chat error:', error);
        this.addBotMessage('I apologize, but I\'m having trouble connecting. Please contact us at +250 788 719 678 or info@kozi.rw');
      } finally {
        this.isTyping = false;
        this.scrollToBottom();
      }
    },
    
    async getAIResponse(userMessage) {
      try {
        const API_BASE = process.env.VUE_APP_API_BASE || 'http://localhost:5050';
        
        const response = await fetch(`${API_BASE}/api/public-chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: userMessage,
            conversationHistory: this.conversationHistory.slice(-10)
          })
        });
        
        if (!response.ok) {
          throw new Error('Failed to get response');
        }
        
        const data = await response.json();
        return data.response;
      } catch (error) {
        console.error('API Error:', error);
        throw error;
      }
    },
    
    addBotMessage(text) {
      this.messages.push({
        sender: 'bot',
        text: this.formatMessage(text)
      });
    },
    
    formatMessage(text) {
      return text
        // Handle markdown headings (###, ##, #)
        .replace(/^###\s*(.+)$/gm, '<h4 style="font-weight: 600; margin: 8px 0 4px 0; font-size: 13px; color: #E41E79;">$1</h4>')
        .replace(/^##\s*(.+)$/gm, '<h3 style="font-weight: 600; margin: 10px 0 6px 0; font-size: 14px; color: #E41E79;">$1</h3>')
        .replace(/^#\s*(.+)$/gm, '<h2 style="font-weight: 600; margin: 12px 0 8px 0; font-size: 15px; color: #E41E79;">$1</h2>')
        // Bold and italic
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        // Newlines
        .replace(/\n/g, '<br>');
    },
    
    scrollToBottom() {
      this.$nextTick(() => {
        const container = this.$refs.messagesContainer;
        if (container) {
          container.scrollTop = container.scrollHeight;
        }
      });
    }
  }
}
</script>

<style scoped>
.chat-widget {
  position: fixed;
  bottom: 20px;
  left: 20px;
  z-index: 9999;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* Chat Button */
.chat-button {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #E41E79 0%, #C0126E 100%);
  border: none;
  color: white;
  font-size: 22px;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(228, 30, 121, 0.4);
  transition: all 0.3s ease;
}

.chat-button:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 20px rgba(228, 30, 121, 0.6);
}

/* Chat Window */
.chat-window {
  width: 350px;
  height: 480px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Header */
.chat-header {
  background: linear-gradient(135deg, #E41E79 0%, #C0126E 100%);
  color: white;
  padding: 12px 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 15px;
  font-weight: 600;
}

.header-logo {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  object-fit: cover;
}

.header-right {
  display: flex;
  gap: 8px;
}

.icon-btn {
  background: transparent;
  border: none;
  color: white;
  cursor: pointer;
  padding: 4px;
  font-size: 14px;
  opacity: 0.9;
  transition: opacity 0.2s;
}

.icon-btn:hover {
  opacity: 1;
}

/* Messages */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 14px;
  background: white;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* Welcome Screen */
.welcome-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 20px 10px;
  height: 100%;
}

.welcome-title {
  margin: 0 0 12px 0;
  font-size: 17px;
  font-weight: 800;
  background: linear-gradient(135deg, #4a5568 0%, #E41E79 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1.4;
}

.welcome-description {
  font-size: 13px;
  color: #6b7280;
  margin: 0 0 20px 0;
  line-height: 1.5;
}

/* Quick Suggestions inside message area */
.suggestions-area {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 8px 0;
  justify-content: center;
}

.suggestion-btn {
  background: white;
  border: 1.5px solid #e5e7eb;
  border-radius: 18px;
  padding: 7px 12px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  color: #374151;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.suggestion-emoji {
  font-size: 13px;
}

.suggestion-btn:hover {
  background: #fef2f8;
  border-color: #E41E79;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(228, 30, 121, 0.15);
}

.message {
  display: flex;
}

.message.user {
  justify-content: flex-end;
}

.message.bot {
  justify-content: flex-start;
}

.message-bubble {
  max-width: 85%;
  padding: 10px 14px;
  border-radius: 16px;
  line-height: 1.4;
  font-size: 13px;
}

.message.user .message-bubble {
  background: linear-gradient(135deg, #E41E79 0%, #C0126E 100%);
  color: white;
  border-bottom-right-radius: 4px;
}

.message.bot .message-bubble {
  background: #E8E8E8;
  color: #333;
  border-bottom-left-radius: 4px;
}

/* Typing Indicator */
.typing-indicator {
  display: flex;
  gap: 3px;
  padding: 10px 12px;
}

.typing-indicator span {
  width: 6px;
  height: 6px;
  background: #999;
  border-radius: 50%;
  animation: bounce 1.4s infinite;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes bounce {
  0%, 60%, 100% { transform: translateY(0); }
  30% { transform: translateY(-6px); }
}

/* Input Area */
.chat-input-area {
  padding: 10px 14px;
  background: white;
  border-top: 1px solid #e5e7eb;
  display: flex;
  gap: 8px;
  align-items: center;
}

.chat-input-area input {
  flex: 1;
  border: 1px solid #ddd;
  border-radius: 20px;
  padding: 9px 14px;
  font-size: 13px;
  outline: none;
  background: white;
}

.chat-input-area input:focus {
  border-color: #E41E79;
}

.chat-input-area input::placeholder {
  color: #999;
}

.send-btn {
  width: 36px;
  height: 36px;
  border-radius: 6px;
  background: linear-gradient(135deg, #E41E79 0%, #C0126E 100%);
  border: none;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
  box-shadow: 0 2px 6px rgba(228, 30, 121, 0.3);
}

.send-btn:hover:not(:disabled) {
  box-shadow: 0 4px 10px rgba(228, 30, 121, 0.4);
  transform: scale(1.05);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.send-btn i {
  font-size: 14px;
}

/* Footer */
.chat-footer-text {
  text-align: center;
  font-size: 10px;
  color: #999;
  padding: 6px 0;
  background: white;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.chat-footer-text a {
  color: #999;
  text-decoration: none;
  display: inline;
}

.chat-footer-text a:hover {
  text-decoration: underline;
}

/* Mobile Responsive */
@media (max-width: 768px) {
  .chat-widget {
    bottom: 10px;
    left: 10px;
  }
  
  .chat-window {
    width: calc(100vw - 20px);
    height: calc(100vh - 80px);
  }
}
</style>
