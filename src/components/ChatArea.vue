<template>
  <div class="chat-messages" ref="chatContainer">
    <!-- Welcome Screen (show ONLY for truly new/empty chats) -->
    <div v-if="showWelcomeScreen" class="welcome-screen">
      <div class="welcome-content">
        <h1>{{ welcomeMessage }}</h1>
        <p>I'm here to help you with everything related to Kozi platform</p>

        <div class="suggestion-cards">
          <div
            v-for="(suggestion, index) in suggestionCards"
            :key="index"
            class="suggestion-card"
            @click="handleSuggestionClick(suggestion.msg)"
          >
            <i :class="suggestion.icon"></i>
            <span>{{ suggestion.text }}</span>
          </div>
        </div>
      </div>
    </div>

    <template v-else>
      <div
        v-for="(message, index) in messages"
        :key="index"
        :class="[
          'message',
          message.sender === 'user' ? 'user-message' : 'bot-message',
          { 'streaming': message.streaming }
        ]"
      >
        <!-- Bot messages: keep wrapper for avatar alignment -->
        <template v-if="message.sender !== 'user'">
          <div class="message-avatar">
            <img
              :src="botLogo"
              alt="Kozi AI"
              class="bot-logo"
            />
          </div>
          <div class="message-content">
            <div
              class="formatted-content"
              v-html="message.text"
            ></div>

                 <!-- Job Cards -->
                 <div v-if="message.jobs && message.jobs.length > 0" class="job-cards-container">
                   <div class="job-cards-grid">
                     <JobCard 
                       v-for="job in message.jobs" 
                       :key="job.id || job.job_id" 
                       :job="job"
                     />
                   </div>
                 </div>

                 <!-- Candidate Cards -->
                 <div v-if="message.candidates && message.candidates.length > 0" class="candidate-cards-container">
                   <div class="candidate-cards-grid">
                     <CandidateCard 
                       v-for="candidate in message.candidates" 
                       :key="candidate.users_id || candidate.id" 
                       :candidate="candidate"
                     />
                   </div>
                 </div>

            <div 
              v-if="message.streaming" 
              class="typing-indicator"
            >
              <span class="typing-dot"></span>
              <span class="typing-dot"></span>
              <span class="typing-dot"></span>
            </div>
          </div>
        </template>
        
        <!-- User messages: NO wrapper, direct bubble -->
        <div v-else class="message-text">
          {{ message.text }}
        </div>
      </div>

      <div v-if="loading && messages.length === 0" class="loading-indicator">
        <i class="fas fa-spinner fa-spin"></i>
        Initializing chat...
      </div>
    </template>
  </div>
</template>

<script>
import { computed, ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import JobCard from './JobCard.vue'
import CandidateCard from './CandidateCard.vue'

export default {
  name: 'ChatArea',
  components: {
    JobCard,
    CandidateCard
  },
  props: {
    messages: {
      type: Array,
      default: () => []
    },
    loading: {
      type: Boolean,
      default: false
    },
    isNewChat: {
      type: Boolean,
      default: true
    }
  },
  emits: ['suggestion-click'],
  setup(props, { emit }) {
const chatContainer = ref(null)
const isDarkMode = ref(false)
const updateDarkMode = () => {
  isDarkMode.value = document.body.classList.contains('dark')
}

onMounted(() => {
  updateDarkMode()
  
  const observer = new MutationObserver(updateDarkMode)
  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ['class']
  })
  
  window._themeObserver = observer
})

onUnmounted(() => {
  if (window._themeObserver) {
    window._themeObserver.disconnect()
    delete window._themeObserver
  }
})

const botLogo = computed(() => {
  return '/logo.png'
})

watch(
  () => props.messages,
  async () => {
    await nextTick()
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
  },
  { deep: true }
)

const showWelcomeScreen = computed(() => {
  console.log('🔍 Welcome screen check:', {
    isNewChat: props.isNewChat,
    messageCount: props.messages.length,
    loading: props.loading
  })
  
  return (props.isNewChat && props.messages.length === 0) || 
         (props.messages.length === 0 && !props.loading)
})

// Dynamic welcome message based on time of day
const welcomeMessage = computed(() => {
  const hour = new Date().getHours()
  
  if (hour >= 5 && hour < 12) {
    return 'Good Morning, Ready to dive in?'
  } else if (hour >= 12 && hour < 17) {
    return 'Good Afternoon, Ready to dive in?'
  } else {
    return 'Good Evening, Ready to dive in?'
  }
})

// Role-aware suggestion cards
const suggestionCards = computed(() => {
  // Detect user role
  const currentPath = window.location.pathname
  
  // Check for admin first
  const isAdmin = currentPath.includes('/admin/')
  
  if (isAdmin) {
    // Admin-specific cards
    return [
      {
        icon: 'fas fa-money-bill-wave',
        text: 'Payment Reminders',
        msg: 'Show me upcoming salary payments'
      },
      {
        icon: 'fas fa-database',
        text: 'Database Query',
        msg: 'Help me query the database for job seekers and employers'
      },
      {
        icon: 'fas fa-envelope',
        text: 'Gmail Support',
        msg: 'summarize my recent emails'
      },
      {
        icon: 'fas fa-chart-line',
        text: 'Platform Analytics',
        msg: 'Show me platform insights and statistics'
      }
    ]
  }
  
  // Check for employer
  const isEmployer = currentPath.includes('/employer/')
  
  if (isEmployer) {
    // Employer-specific cards
    return [
      {
        icon: 'fas fa-briefcase',
        text: 'add a Job',
        msg: 'How can I post a new job?'
      },
      {
        icon: 'fas fa-search',
        text: 'Find Candidates',
        msg: 'How do I search for qualified candidates?'
      },
      {
        icon: 'fas fa-file-alt',
        text: 'Hiring Process',
        msg: 'Help me with the hiring and interview process'
      },
      {
        icon: 'fas fa-building',
        text: 'Company Profile',
        msg: 'How do I manage my company profile?'
      }
    ]
  }
  
  // Default: Job seeker cards (employee)
  return [
    {
      icon: 'fas fa-user',
      text: 'Complete Profile',
      msg: 'How do I complete my profile?'
    },
    {
      icon: 'fas fa-file-alt',
      text: 'CV Writing Help',
      msg: 'Help me write a professional CV'
    },
    {
      icon: 'fas fa-briefcase',
      text: 'Find Jobs',
      msg: 'Show me available jobs'
    }
  ]
})

const handleSuggestionClick = (message) => {
  emit('suggestion-click', message)
}

    return {
      chatContainer,
      isDarkMode,
      botLogo,
      showWelcomeScreen,
      welcomeMessage,
      suggestionCards,
      handleSuggestionClick
    }
  }
}
</script>

<style scoped>
.chat-messages {
  /* Make ChatArea fill available space and scroll correctly */
  flex: 1;
  min-height: 0;
  height: 100%;
  overflow-y: auto;
  padding: 1.25rem 1.25rem 6.5rem; /* bottom padding to avoid input overlap */
  background: #ffffff;
}

/* Welcome screen */
.welcome-screen {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}
.welcome-content {
  max-width: 840px;
  text-align: center;
}
.welcome-content h1 {
  font-size: 2rem;
  font-weight: 800;
  color: #2a2a2a;
  margin-bottom: 0.5rem;
}
.welcome-content p {
  color: #6b7280;
  margin-bottom: 1.5rem;
}
.suggestion-cards {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.suggestion-card {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 24px;
  cursor: pointer;
  transition: all .15s ease-in-out;
  background: #fff;
  font-size: 0.9rem;
  white-space: nowrap;
}
.suggestion-card:hover { 
  border-color: #EA60A6; 
  box-shadow: 0 4px 14px rgba(234,96,166,.15);
  transform: translateY(-1px);
}
.suggestion-card i { 
  color: #EA60A6;
  font-size: 0.95rem;
}

/* Messages */
.message {
  display: flex;
  gap: 0.6rem;
  margin: 0.9rem 0;
  align-items: center; /* vertically center avatar with bubble */
}
.message.user-message { flex-direction: row-reverse; }
.message-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(0,0,0,.06);
}
.bot-logo { width: 28px; height: 28px; }

.message-content { max-width: 760px; }
.bot-message .message-content { margin-right: auto; }
.user-message .message-content { margin-left: auto; }

/* Avatar spacing relative to bubble side */
.bot-message .message-avatar { margin-right: 14px; margin-left: 0; }
.user-message .message-avatar { margin-left: 14px; margin-right: 0; }

.message-text,
.formatted-content {
  padding: 0.65rem 0.9rem;
  border-radius: 18px;
  line-height: 1.55;
  font-size: 0.98rem;
}
.user-message .message-text {
  background: linear-gradient(135deg, #E41E79 0%, #C0126E 100%) !important;
  color: #ffffff !important;
  border: 0 !important;
  border-radius: 26px !important;
  box-shadow: 0 2px 8px rgba(226, 46, 122, 0.15) !important;
  padding: 0.4rem 0.6rem !important;
  margin-left: auto !important;
  margin-right: 0 !important;
  max-width: 760px !important;
}
.bot-message .formatted-content { 
  background: transparent;
  border: none;
  box-shadow: none;
  padding: 0.3rem 0 0.3rem 0;
}

/* Align bubbles nearer to center like ref UI */
.bot-message { justify-content: flex-start; }
.user-message { justify-content: flex-end; }

/* Typing */
.typing-indicator { display: flex; gap: 4px; margin-top: 6px; }
.typing-dot {
  width: 6px; height: 6px; border-radius: 50%; background: #9ca3af;
  animation: blink 1.2s infinite ease-in-out;
}
.typing-dot:nth-child(2){ animation-delay: .2s }
.typing-dot:nth-child(3){ animation-delay: .4s }
@keyframes blink { 0%,80%,100%{opacity:.2} 40%{opacity:1} }

/* Large formatted blocks */
.formatted-content .section-header { font-weight: 700; margin: .6rem 0 .2rem; }
.formatted-content .bullet-item { margin: .25rem 0; }
.formatted-content .numbered-item { margin: .25rem 0; }
.formatted-content .large-font { font-size: 1rem; }

/* Dark support */
body.dark .chat-messages { background: #0f1115; }
body.dark .welcome-content h1 { color: #fff; }
body.dark .welcome-content p { color: #a1a1aa; }
body.dark .suggestion-card { border-color: #2a2a2a; background: #111318; }
body.dark .message-text, body.dark .formatted-content { color: #e5e7eb }
body.dark .bot-message .formatted-content { 
  background: transparent;
  border: none;
  box-shadow: none;
  padding: 0.3rem 0 0.3rem 0;
}
body.dark .user-message .message-text { background: linear-gradient(135deg, #c73e8a 0%, #a93272 100%); border-color: transparent; }

/* Job Cards */
.job-cards-container {
  margin-top: 1rem;
}

.job-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
  margin-top: 0.75rem;
}

/* Candidate Cards */
.candidate-cards-container {
  margin-top: 1rem;
}

.candidate-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1rem;
  margin-top: 0.75rem;
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .chat-messages { 
    padding: 0.75rem 0.75rem 6rem;
    width: 100%;
    max-width: 100vw;
    overflow-x: hidden;
  }
  
  /* Welcome screen adjustments for mobile */
  .welcome-content h1 {
    font-size: 1.25rem;
    font-weight: 700;
  }
  
  .welcome-content p {
    display: none; /* Hide subtitle on mobile */
  }
  
  .suggestion-cards {
    gap: 0.5rem;
  }
  
  .suggestion-card {
    padding: 0.55rem 0.85rem;
    font-size: 0.85rem;
    border-radius: 20px;
  }
  
  .suggestion-card i {
    font-size: 0.85rem;
  }
  
  .message-content { max-width: 100%; }
  .message-avatar { width: 36px; height: 36px; }
  .bot-message .message-avatar { margin-right: 10px; }
  .user-message .message-avatar { margin-left: 10px; }
  .message-text, .formatted-content { padding: 0.6rem 0.8rem; border-radius: 18px; }
  .user-message .message-text { 
    padding: 0.35rem 0.55rem !important;
    margin-left: auto !important;
    margin-right: 0 !important;
    max-width: 100% !important;
  }
  
  /* Mobile-specific bot message optimization - hide avatar for maximum width */
  .bot-message .message-avatar { 
    display: none !important;
  }
  
  .bot-message .message-content { 
    flex: 1;
    width: 100%;
    margin-left: 0;
  }
  
  .bot-message .formatted-content { 
    padding: 0.55rem 0.8rem !important;
    width: 100%;
    max-width: 100%;
  }
  
  .bot-message {
    display: flex;
    width: 100%;
  }
  
  /* Mobile job cards */
  .job-cards-grid {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
}

</style>