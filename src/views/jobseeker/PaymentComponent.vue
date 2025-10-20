<template>
  <IndexComponent />
  <div
    class="page-wrapper"
    id="main-wrapper"
    data-layout="vertical"
    data-navbarbg="skin6"
    data-sidebartype="full"
    data-sidebar-description="fixed"
    data-header-description="fixed"
    style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; z-index: 1;"
  >
     <div class="body-wrapper" style="margin-top: 70px; margin-left: 270px; background: white; min-height: calc(100vh - 70px); padding: 20px; overflow-y: auto; max-height: calc(100vh - 70px);">
        <div class="container-fluid">
          <div class="row mt-4">
            <h3 class="card-title fw-semibold mb-4" style="color: #E960A6;"><i class=" fa-solid fa-money-bills"></i>   Application Status & Benefits of Kozi Caretakers</h3>
            
          </div>
          
          <!-- Benefits Section with Modern Styling -->
          <div class="benefits-section">
            <div class="benefits-content">
              <!-- Image Section -->
              <div class="benefits-image">
                <img :src="require('@/assets/img/payment-post.jpg')" alt="Registration" class="responsive-image"/>
              </div>

              <!-- Instructions Section -->
              <div class="benefits-instructions">
                <h2 class="instructions-title">How It Works</h2>
                <hr class="instructions-divider">
                
                <div class="premium-notice">
                  <p>
                    <strong>N.B:</strong> A one-time payment grants access to exclusive premium features for only advanced workers!
                  </p>
                </div>

                <div class="steps-container">
                  <div class="step-item">
                    <span class="step-number">1</span>
                    <span class="step-text">Dial the MoMo Pay code *182*8*1*067788#</span>
                  </div>
                  
                  <div class="step-item">
                    <span class="step-number">2</span>
                    <span class="step-text">Enter the amount: 1,500 RWF</span>
                  </div>
                  
                  <div class="step-item">
                    <span class="step-number">3</span>
                    <span class="step-text">Confirm the name: SANSON GROUP Ltd</span>
                  </div>
                  
                  <div class="step-item">
                    <span class="step-number">4</span>
                    <span class="step-text">Enter your MoMo PIN</span>
                  </div>
                  
                  <div class="step-item">
                    <span class="step-number">5</span>
                    <span class="step-text">Wait up to 5 minutes for approval</span>
                  </div>
                </div>

                <div class="footer-note">
                  Track your progress and take the next step in your career journey with us!
                </div>
              </div>
            </div>
          </div>

          <!-- Contact Section with Modern Styling -->
          <main class="contact-main">
            <!-- Header Section -->
            <div class="header-section">
              <div class="header-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
              </div>
              <h1 class="main-title">Get in Touch with Us</h1>
              <div class="title-underline"></div>
            </div>

            <!-- Description Section -->
            <div class="description-section">
              <p class="description-text">
                Have a question or need assistance? We're here to help! Whether
                you're looking for support, have feedback, or just want to share
                your thoughts, we'd love to hear from you. Simply type your
                message below and we'll get back to you as soon as possible.
              </p>
            </div>

            <!-- Form Section -->
            <div class="form-section">
              <form @submit.prevent="sendMessage" class="contact-form">
                <input type="hidden" name="job_seeker_id" :value="users_id" />

                <div class="form-group">
                  <label for="message" class="form-label">
                    <svg class="label-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14,2 14,8 20,8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                      <line x1="16" y1="17" x2="8" y2="17"/>
                      <polyline points="10,9 9,9 8,9"/>
                    </svg>
                    Your Message
                  </label>
                  <div class="textarea-wrapper">
                    <textarea
                      id="message"
                      name="message"
                      rows="6"
                      v-model="message"
                      placeholder="For approval delays, please notify us here. We'll get back to you as soon as possible.."
                      required
                      class="form-textarea"
                      :class="{ 'has-content': message.length > 0 }"
                    ></textarea>
                    <div class="character-count" v-if="message.length > 0">
                      {{ message.length }} characters
                    </div>
                  </div>
                </div>

                <div class="form-actions">
                  <button 
                    type="submit" 
                    class="submit-btn" 
                    :disabled="isSending || !message.trim()"
                    :class="{ 'sending': isSending, 'disabled': !message.trim() }"
                  >
                    <span v-if="!isSending" class="btn-content">
                      <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="22" y1="2" x2="11" y2="13"/>
                        <polygon points="22,2 15,22 11,13 2,9 22,2"/>
                      </svg>
                      Send Message
                    </span>
                    <span v-else class="btn-content">
                      <svg class="spinner" viewBox="0 0 50 50">
                        <circle
                          class="path"
                          cx="25"
                          cy="25"
                          r="20"
                          fill="none"
                          stroke-width="5"
                          stroke="currentColor"
                          stroke-linecap="round"
                        />
                      </svg>
                      Sending...
                    </span>
                  </button>
                </div>

                <!-- Feedback Section -->
                <div v-if="feedback" class="feedback-section">
                  <div class="feedback-message" :class="applyStatusClass">
                    <svg v-if="feedbackColor === 'green'" class="feedback-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M9 12l2 2 4-4"/>
                      <circle cx="12" cy="12" r="10"/>
                    </svg>
                    <svg v-else class="feedback-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="15" y1="9" x2="9" y2="15"/>
                      <line x1="9" y1="9" x2="15" y2="15"/>
                    </svg>
                    {{ feedback }}
                  </div>
                </div>
              </form>
            </div>
          </main>
        </div>
      </div>
    </div>
</template>

<script>
import { globalVariable } from "@/global";
import IndexComponent from "./IndexComponent.vue";

export default {
  name: "MainWrapper",
  components: {
    IndexComponent,
  },
  data() {
    return {
      userEmail: null,
      users_id: null,
      message: "",
      feedback: "",
      feedbackColor: "green",
      isSending: false,
    };
  },
  computed: {
    applyStatusClass() {
      return this.feedbackColor === "green" ? "alert-success" : "alert-danger";
    },
  },
  mounted() {
    const token = localStorage.getItem("employeeToken");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        this.userEmail = payload.email;
        this.getUserIdFromEmail();
      } catch (e) {
        console.error("Invalid JWT token:", e);
      }
    }
  },
  methods: {
    async getUserIdFromEmail() {
      const token = localStorage.getItem("employeeToken");
      if (!token || !this.userEmail) return;

      try {
        const res = await fetch(`${globalVariable}/get_user_id_by_email/${this.userEmail}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) {
          this.users_id = data.users_id;
        } else {
          this.feedback = data.message || "Unable to get user ID.";
          this.feedbackColor = "red";
        }
      } catch (err) {
        console.error("Error getting users_id:", err);
        this.feedback = "Failed to fetch user ID.";
        this.feedbackColor = "red";
      }
    },
    async sendMessage() {
      if (!this.message.trim() || !this.users_id) {
        this.feedback = "Message or user ID missing.";
        this.feedbackColor = "red";
        return;
      }

      this.isSending = true;
      this.feedback = "";

      try {
        const token = localStorage.getItem("employeeToken");
        const response = await fetch(`${globalVariable}/seeker/message`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            users_id: this.users_id,
            user_email: this.userEmail,
            message: this.message.trim(),
          }),
        });

        const data = await response.json();

        if (response.ok) {
          this.feedback = "Message sent successfully!";
          this.feedbackColor = "green";
          this.message = "";
        } else {
          this.feedback = data.message || "Something went wrong.";
          this.feedbackColor = "red";
        }
      } catch (error) {
        console.error("Error sending message:", error);
        this.feedback = "Error sending message.";
        this.feedbackColor = "red";
      } finally {
        this.isSending = false;
      }
    },
  },
};
</script>

<style scoped>
/* Benefits Section Styling (from second code) */
.benefits-section {
  margin-top: 3rem;
  padding: 0 1rem;
}

.benefits-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3rem;
  align-items: center;
  margin-top: 2rem;
}

.benefits-image {
  width: 100%;
}

.responsive-image {
  width: 100%;
  height: auto;
  max-height: 700px;
  object-fit: cover;
  border-radius: 15px;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
}

.benefits-instructions {
  padding: 2rem;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 15px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

.instructions-title {
  color: #5F9EA0;
  font-size: 1.5rem;
  margin-bottom: 1rem;
  font-weight: 600;
}

.instructions-divider {
  margin: 15px 0;
  border: 0;
  height: 2px;
  width: 60%;
  background: linear-gradient(90deg, #EA60A7, #5F9EA0);
  border-radius: 2px;
}

.premium-notice {
  background: linear-gradient(135deg, #EA60A7, #f093fb);
  color: white;
  padding: 1rem;
  border-radius: 10px;
  margin-bottom: 2rem;
  text-align: center;
}

.premium-notice p {
  margin: 0;
  font-weight: 500;
}

.steps-container {
  margin: 2rem 0;
}

.step-item {
  display: flex;
  align-items: center;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: white;
  border-radius: 10px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
  transition: transform 0.2s ease;
}

.step-item:hover {
  transform: translateX(5px);
}

.step-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  background: linear-gradient(135deg, #5F9EA0, #4facfe);
  color: white;
  border-radius: 50%;
  font-weight: 600;
  margin-right: 1rem;
  flex-shrink: 0;
}

.step-text {
  font-weight: 500;
  color: #333;
  flex: 1;
}

.footer-note {
  text-align: center;
  font-style: italic;
  color: #666;
  margin-top: 2rem;
  padding: 1rem;
  background: rgba(95, 158, 160, 0.1);
  border-radius: 10px;
}

/* Contact Section Styling (from third code) */
.contact-main {
  max-width: 700px;
  margin: 3rem auto 0;
  backdrop-filter: blur(10px);
  border-radius: 20px;
  overflow: hidden;
  animation: slideUp 0.6s ease-out;
}

/* Header Section */
.header-section {
  background: linear-gradient(135deg, #EA60A7 0%, #FF6B9D 100%);
  padding: 2rem 2rem;
  text-align: center;
  position: relative;
  overflow: hidden;
}

.header-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="rgba(255,255,255,0.1)"/><circle cx="75" cy="75" r="1" fill="rgba(255,255,255,0.1)"/><circle cx="50" cy="10" r="0.5" fill="rgba(255,255,255,0.1)"/></pattern></defs><rect width="100%" height="100%" fill="url(%23grain)"/></svg>');
  opacity: 0.3;
}

.header-icon {
  width: 60px;
  height: 60px;
  margin: 0 auto 1.5rem;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 1;
}

.header-icon svg {
  width: 30px;
  height: 30px;
  color: white;
}

.main-title {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  font-size: 2.5rem;
  font-weight: 700;
  color: white;
  margin: 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  position: relative;
  z-index: 1;
}

.title-underline {
  width: 80px;
  height: 4px;
  background: rgba(255, 255, 255, 0.8);
  margin: 1rem auto 0;
  border-radius: 2px;
  position: relative;
  z-index: 1;
}

/* Description Section */
.description-section {
  padding: 2.5rem;
  background: white;
}

.description-text {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  font-size: 1.1rem;
  line-height: 1.7;
  color: #555;
  text-align: center;
  margin: 0;
}

/* Form Section */
.form-section {
  padding: 0 2.5rem 2.5rem;
  background: white;
}

.contact-form {
  max-width: 100%;
}

.form-group {
  margin-bottom: 2rem;
}

.form-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 0.8rem;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.label-icon {
  width: 20px;
  height: 20px;
  color: #EA60A7;
}

.textarea-wrapper {
  position: relative;
}

.form-textarea {
  width: 100%;
  padding: 1.2rem;
  font-size: 1rem;
  border: 2px solid #e1e5e9;
  border-radius: 12px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  resize: vertical;
  min-height: 120px;
  background: #fafbfc;
  transition: all 0.3s ease;
  box-sizing: border-box;
}

.form-textarea:focus {
  outline: none;
  border-color: #EA60A7;
  background: white;
  box-shadow: 0 0 0 3px rgba(234, 96, 167, 0.1);
}

.form-textarea.has-content {
  border-color: #EA60A7;
  background: white;
}

.character-count {
  position: absolute;
  bottom: 8px;
  right: 12px;
  font-size: 0.85rem;
  color: #888;
  background: rgba(255, 255, 255, 0.9);
  padding: 2px 6px;
  border-radius: 4px;
}

/* Form Actions */
.form-actions {
  text-align: center;
  margin-top: 2rem;
}

.submit-btn {
  background: linear-gradient(135deg, #EA60A7 0%, #FF6B9D 100%);
  color: white;
  border: none;
  padding: 1rem 2.5rem;
  font-size: 1.1rem;
  font-weight: 600;
  border-radius: 50px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(234, 96, 167, 0.3);
  position: relative;
  overflow: hidden;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.submit-btn:hover:not(.disabled):not(.sending) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(234, 96, 167, 0.4);
}

.submit-btn.disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.submit-btn.sending {
  background: linear-gradient(135deg, #c449a0 0%, #e55b8c 100%);
}

.btn-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.btn-icon {
  width: 18px;
  height: 18px;
}

/* Feedback Section */
.feedback-section {
  margin-top: 2rem;
}

.feedback-message {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-radius: 12px;
  font-weight: 500;
  animation: fadeIn 0.3s ease-out;
}

.feedback-message.alert-success {
  background: linear-gradient(135deg, #d4edda 0%, #c8e6c9 100%);
  color: #155724;
  border: 1px solid #c3e6cb;
}

.feedback-message.alert-danger {
  background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%);
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.feedback-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

/* Spinner Animation */
.spinner {
  width: 18px;
  height: 18px;
  animation: spin 1s linear infinite;
}

.spinner .path {
  stroke-dasharray: 90, 150;
  stroke-dashoffset: 0;
  animation: dash 1.5s ease-in-out infinite;
}

@keyframes spin {
  100% {
    transform: rotate(360deg);
  }
}

@keyframes dash {
  0% {
    stroke-dasharray: 1, 150;
    stroke-dashoffset: 0;
  }
  50% {
    stroke-dasharray: 90, 150;
    stroke-dashoffset: -35;
  }
  100% {
    stroke-dasharray: 90, 150;
    stroke-dashoffset: -124;
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Mobile Responsiveness */
@media (max-width: 768px) {
  .benefits-content {
    grid-template-columns: 1fr;
    gap: 2rem;
  }
  
  .benefits-instructions {
    padding: 1.5rem;
  }
  
  .instructions-title {
    font-size: 1.3rem;
  }
  
  .step-item {
    flex-direction: column;
    text-align: center;
    padding: 1rem;
  }
  
  .step-number {
    margin-right: 0;
    margin-bottom: 0.5rem;
  }
  
  .contact-main {
    margin: 2rem 1rem 0;
  }
  
  .header-section {
    padding: 2rem 1.5rem;
  }
  
  .main-title {
    font-size: 2rem;
  }
  
  .description-section,
  .form-section {
    padding: 1.5rem;
  }
  
  .form-textarea {
    padding: 1rem;
  }
  
  .submit-btn {
    padding: 0.9rem 2rem;
    font-size: 1rem;
  }
}

@media (max-width: 480px) {
  .main-title {
    font-size: 1.8rem;
  }
  
  .description-text {
    font-size: 1rem;
  }
  
  .form-label {
    font-size: 1rem;
  }
  
  .submit-btn {
    width: 100%;
    padding: 1rem;
  }
}
</style>