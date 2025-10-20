<!-- eslint-disable -->
<template>
  <div class="page-wrapper" id="main-wrapper">
    <div class="login-layout">
      <!-- Image Section -->
      <div class="image-section" style="background: linear-gradient(135deg, #EA60A7 0%, #d946a3 50%, #c026d3 100%);">
        <div class="image-overlay">
          <div class="brand-content">
            <div class="brand-logo">
              <div class="logo-icon">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                  <path d="M20 0C31.046 0 40 8.954 40 20C40 31.046 31.046 40 20 40C8.954 40 0 31.046 0 20C0 8.954 8.954 0 20 0Z" fill="white"/>
                  <path d="M20 8C15.582 8 12 11.582 12 16V20C12 24.418 15.582 28 20 28C24.418 28 28 24.418 28 20V16C28 11.582 24.418 8 20 8Z" fill="#EA60A7"/>
                </svg>
              </div>
              <h1 class="logo-text">Reset Password</h1>
            </div>
            <div class="brand-tagline">
              <p>Create a strong new password</p>
              <p>Secure your account with confidence</p>
            </div>
          </div>
          <div class="floating-elements">
            <div class="floating-card card-1">
              <div class="card-icon">🔒</div>
              <span>Secure Reset</span>
            </div>
            <div class="floating-card card-2">
              <div class="card-icon">🛡️</div>
              <span>Protected</span>
            </div>
            <div class="floating-card card-3" style="margin-left: 3rem;">
              <div class="card-icon">✅</div>
              <span> Account Verified</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Form Section -->
      <div class="form-section">
        <div class="form-container">
          <div class="form-header">
            <h2 class="form-title">Change Password</h2>
            <p class="form-subtitle">Create a strong new password for your account</p>
            <div class="email-display" v-if="email">{{ email }}</div>
          </div>

          <form @submit.prevent="resetPassword" class="login-form">
            <div class="error-container" v-if="message">
              <div class="alert" :class="messageType">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 0C3.58 0 0 3.58 0 8C0 12.42 3.58 16 8 16C12.42 16 16 12.42 16 8C16 3.58 12.42 0 8 0ZM9 12H7V10H9V12ZM9 8H7V4H9V8Z" fill="currentColor"/>
                </svg>
                {{ message }}
              </div>
            </div>

            <div class="form-group">
              <label for="newPassword" class="form-label">New Password</label>
              <div class="input-wrapper">
                <svg class="input-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M15 7H14V5C14 2.24 11.76 0 9 0S4 2.24 4 5V7H3C2.45 7 2 7.45 2 8V18C2 18.55 2.45 19 3 19H15C15.55 19 16 18.55 16 18V8C16 7.45 15.55 7 15 7ZM6 5C6 3.34 7.34 2 9 2S12 3.34 12 5V7H6V5Z" fill="currentColor"/>
                </svg>
                <input 
                  type="password" 
                  v-model="newPassword" 
                  class="form-control" 
                  id="newPassword"
                  required 
                  placeholder="Enter your new password"
                />
              </div>
              <div class="password-hint">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 0C3.58 0 0 3.58 0 8C0 12.42 3.58 16 8 16C12.42 16 16 12.42 16 8C16 3.58 12.42 0 8 0ZM9 12H7V10H9V12ZM9 8H7V4H9V8Z" fill="currentColor"/>
                </svg>
                Make it strong and secure
              </div>
            </div>

            <div class="form-group">
              <label for="confirmPassword" class="form-label">Confirm Password</label>
              <div class="input-wrapper">
                <svg class="input-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M15 7H14V5C14 2.24 11.76 0 9 0S4 2.24 4 5V7H3C2.45 7 2 7.45 2 8V18C2 18.55 2.45 19 3 19H15C15.55 19 16 18.55 16 18V8C16 7.45 15.55 7 15 7ZM6 5C6 3.34 7.34 2 9 2S12 3.34 12 5V7H6V5Z" fill="currentColor"/>
                </svg>
                <input 
                  type="password" 
                  v-model="confirmPassword" 
                  class="form-control" 
                  id="confirmPassword"
                  required 
                  placeholder="Confirm your new password"
                />
              </div>
              <div class="password-match" v-if="confirmPassword">
                <div v-if="passwordsMismatch" class="match-error">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 0C3.58 0 0 3.58 0 8C0 12.42 3.58 16 8 16C12.42 16 16 12.42 16 8C16 3.58 12.42 0 8 0ZM11 5L10 4L8 6L6 4L5 5L7 7L5 9L6 10L8 8L10 10L11 9L9 7L11 5Z" fill="currentColor"/>
                  </svg>
                  Passwords do not match
                </div>
                <div v-else class="match-success">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 0C3.58 0 0 3.58 0 8C0 12.42 3.58 16 8 16C12.42 16 16 12.42 16 8C16 3.58 12.42 0 8 0ZM7 11L3 7L4.41 5.59L7 8.17L11.59 3.58L13 5L7 11Z" fill="currentColor"/>
                  </svg>
                  Passwords match
                </div>
              </div>
            </div>

            <div class="password-requirements" v-if="newPassword">
              <div class="requirements-title">Password Requirements:</div>
              <div class="requirement-item" :class="{ 'valid': passwordValidation.length }">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 0C3.58 0 0 3.58 0 8C0 12.42 3.58 16 8 16C12.42 16 16 12.42 16 8C16 3.58 12.42 0 8 0ZM7 11L3 7L4.41 5.59L7 8.17L11.59 3.58L13 5L7 11Z" fill="currentColor"/>
                </svg>
                At least 8 characters
              </div>
              <div class="requirement-item" :class="{ 'valid': passwordValidation.uppercase }">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 0C3.58 0 0 3.58 0 8C0 12.42 3.58 16 8 16C12.42 16 16 12.42 16 8C16 3.58 12.42 0 8 0ZM7 11L3 7L4.41 5.59L7 8.17L11.59 3.58L13 5L7 11Z" fill="currentColor"/>
                </svg>
                One uppercase letter
              </div>
              <div class="requirement-item" :class="{ 'valid': passwordValidation.lowercase }">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 0C3.58 0 0 3.58 0 8C0 12.42 3.58 16 8 16C12.42 16 16 12.42 16 8C16 3.58 12.42 0 8 0ZM7 11L3 7L4.41 5.59L7 8.17L11.59 3.58L13 5L7 11Z" fill="currentColor"/>
                </svg>
                One lowercase letter
              </div>
              <div class="requirement-item" :class="{ 'valid': passwordValidation.number }">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 0C3.58 0 0 3.58 0 8C0 12.42 3.58 16 8 16C12.42 16 16 12.42 16 8C16 3.58 12.42 0 8 0ZM7 11L3 7L4.41 5.59L7 8.17L11.59 3.58L13 5L7 11Z" fill="currentColor"/>
                </svg>
                One number
              </div>
            </div>

            <button type="submit" class="btn-primary" :disabled="updating || passwordsMismatch || !isPasswordValid">
              <span v-if="updating" class="spinner"></span>
              <svg v-else width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 0C4.48 0 0 4.48 0 10S4.48 20 10 20S20 15.52 20 10S15.52 0 10 0ZM8 15L3 10L4.41 8.59L8 12.17L15.59 4.58L17 6L8 15Z" fill="currentColor"/>
              </svg>
              {{ updating ? 'Updating...' : 'Change Password' }}
            </button>

            <div class="footer-links">
              <a href="/login" class="link">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 0L6.59 1.41L12.17 7H0V9H12.17L6.59 14.59L8 16L16 8L8 0Z" fill="currentColor"/>
                </svg>
                Back to Login
              </a>
              <span class="separator">•</span>
              <a href="/forgot-password" class="link">Forgot Password?</a>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from "axios";
import { globalVariable } from "@/global";

export default {
  name: "ChangePasswordPage",
  data() {
    return {
      newPassword: "",
      confirmPassword: "",
      email: "",
      message: "",
      messageType: "",
      updating: false,
    };
  },
  computed: {
    passwordsMismatch() {
      return this.newPassword !== this.confirmPassword && this.confirmPassword !== "";
    },
    passwordValidation() {
      return {
        length: this.newPassword.length >= 8,
        uppercase: /[A-Z]/.test(this.newPassword),
        lowercase: /[a-z]/.test(this.newPassword),
        number: /\d/.test(this.newPassword),
      };
    },
    isPasswordValid() {
      return Object.values(this.passwordValidation).every(Boolean) && this.newPassword.length > 0;
    },
  },
  mounted() {
    const storedEmail = localStorage.getItem("forgotEmail");
    if (!storedEmail) {
      this.$router.push("/forgot-password");
    } else {
      this.email = storedEmail;
    }
  },
  methods: {
    async resetPassword() {
      if (this.passwordsMismatch) {
        this.message = "Passwords do not match.";
        this.messageType = "alert-danger";
        return;
      }

      if (!this.isPasswordValid) {
        this.message = "Please meet all password requirements.";
        this.messageType = "alert-danger";
        return;
      }

      this.message = "";
      this.updating = true;

      try {
        const response = await axios.post(`${globalVariable}/seeker/password-change`, {
          email: this.email,
          newPassword: this.newPassword,
        });

        if (response.status === 200) {
          this.message = "Password updated successfully! Redirecting to login...";
          this.messageType = "alert-success";
          localStorage.removeItem("forgotEmail");
          setTimeout(() => {
            this.$router.push("/login");
          }, 2000);
        }
      } catch (error) {
        console.error("Password reset error:", error.response || error);
        this.message = error.response?.data?.message || "Password reset failed. Please try again.";
        this.messageType = "alert-danger";
      } finally {
        this.updating = false;
      }
    },
  },
};
</script>

<style scoped>
@media (max-width: 375px) {
  .form-section {
    padding: 16px 12px;
  }
}
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}

.page-wrapper {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
}

.login-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  max-width: 100%;
  width: 100%;
  min-height: 100vh;
  background: white;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
  border-radius: 0;
  overflow: hidden;
}

/* Image Section */
.image-section {
  position: relative;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  background: linear-gradient(135deg, #EA60A7 0%, #d946a3 50%, #c026d3 100%);
  background-image: 
    radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.15) 0%, transparent 50%),
    radial-gradient(circle at 40% 40%, rgba(234, 96, 167, 0.2) 0%, transparent 50%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px 40px;
  overflow: hidden;
}

.image-overlay {
  position: relative;
  z-index: 2;
  text-align: center;
  color: white;
}

.brand-content {
  margin-bottom: 60px;
}

.brand-logo {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 30px;
}

.logo-icon {
  margin-bottom: 20px;
  animation: float 3s ease-in-out infinite;
}

.logo-text {
  font-size: 32px;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 0;
}

.brand-tagline {
  font-size: 18px;
  font-weight: 300;
  line-height: 1.6;
  opacity: 0.9;
}

.brand-tagline p {
  margin: 4px 0;
}

.floating-elements {
  position: relative;
  margin-top: 40px;
}

.floating-card {
  position: absolute;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  font-weight: 500;
  color: white;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.card-icon {
  font-size: 20px;
}

.card-1 {
  top: -20px;
  left: -40px;
  animation: float 3s ease-in-out infinite;
}

.card-2 {
  top: 20px;
  right: -80px;
  animation: float 3s ease-in-out infinite 1s;
}

.card-3 {
  bottom: -100px;
  left: 20px;
  animation: float 3s ease-in-out infinite 2s;
}

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
}

/* Form Section */
.form-section {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  background: white;
}

.form-container {
  width: 100%;
  max-width: 400px;
  animation: slideInRight 0.6s ease-out;
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.form-header {
  text-align: center;
  margin-bottom: 40px;
}

.form-title {
  font-size: 32px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 8px;
  letter-spacing: -0.025em;
}

.form-subtitle {
  color: #64748b;
  font-size: 16px;
  font-weight: 400;
  margin: 0 0 16px 0;
}

.email-display {
  background: #f8fafc;
  color: #EA60A7;
  font-weight: 600;
  font-size: 14px;
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  word-break: break-all;
  margin-top: 8px;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Error Alert */
.error-container {
  margin-bottom: 0;
}

.alert {
  padding: 16px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 12px;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.alert-danger {
  background-color: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
}

.alert-success {
  background-color: #f0fdf4;
  color: #16a34a;
  border: 1px solid #bbf7d0;
}

/* Form Groups */
.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin: 0;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 16px;
  color: #9ca3af;
  z-index: 1;
  transition: color 0.2s ease;
}

.form-control {
  width: 100%;
  padding: 16px 16px 16px 50px;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 400;
  background: white;
  transition: all 0.2s ease;
  outline: none;
}

.form-control:focus {
  border-color: #EA60A7;
  box-shadow: 0 0 0 3px rgba(234, 96, 167, 0.1);
}

.form-control:focus + .input-icon {
  color: #EA60A7;
}

.form-control::placeholder {
  color: #9ca3af;
}

.password-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #6b7280;
  padding: 4px 0;
}

.password-match {
  padding: 4px 0;
}

.match-error {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #dc2626;
}

.match-success {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #16a34a;
}

/* Password Requirements */
.password-requirements {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px;
  margin: -8px 0;
}

.requirements-title {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 12px;
}

.requirement-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 6px;
  transition: color 0.2s ease;
}

.requirement-item:last-child {
  margin-bottom: 0;
}

.requirement-item.valid {
  color: #16a34a;
}

.requirement-item.valid svg {
  color: #16a34a;
}

.requirement-item:not(.valid) svg {
  color: #9ca3af;
}

/* Primary Button */
.btn-primary {
  width: 100%;
  padding: 16px 24px;
  background: linear-gradient(135deg, #EA60A7 0%, #d946a3 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 4px 12px rgba(234, 96, 167, 0.3);
}

.btn-primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #d946a3 0%, #c2185b 100%);
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(234, 96, 167, 0.4);
}

.btn-primary:active:not(:disabled) {
  transform: translateY(0);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

/* Spinner */
.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Footer Links */
.footer-links {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 8px;
}

.link {
  color: #EA60A7;
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: color 0.2s ease;
  display: flex;
  align-items: center;
  gap: 4px;
}

.link:hover {
  color: #d946a3;
  text-decoration: underline;
}

.separator {
  color: #d1d5db;
  font-size: 14px;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .login-layout {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
    max-width: 100%;
    border-radius: 0;
    min-height: 100vh;
  }
  
  .image-section {
    padding: 40px 20px;
    min-height: 40vh;
  }
  
  .brand-logo {
    flex-direction: row;
    gap: 16px;
  }
  
  .logo-icon {
    margin-bottom: 0;
  }
  
  .logo-text {
    font-size: 24px;
  }
  
  .brand-tagline {
    font-size: 16px;
  }
  
  .floating-elements {
    display: none;
  }
}

@media (max-width: 768px) {
  .form-section {
    padding: 20px;
  }
  
  .form-container {
    max-width: 100%;
  }
  
  .form-title {
    font-size: 28px;
  }
  
  .form-control {
    padding: 14px 14px 14px 46px;
  }
  
  .btn-primary {
    padding: 14px 20px;
  }
  
  .image-section {
    min-height: 30vh;
    padding: 30px 20px;
  }
}

@media (max-width: 480px) {
  .login-layout {
    grid-template-rows: 25vh 1fr;
  }
  
  .image-section {
    min-height: 25vh;
    padding: 20px;
  }
  
  .brand-content {
    margin-bottom: 20px;
  }
  
  .logo-text {
    font-size: 20px;
  }
  
  .brand-tagline {
    font-size: 14px;
  }
  
  .form-title {
    font-size: 24px;
  }
  
  .form-header {
    margin-bottom: 30px;
  }
  
  .password-requirements {
    padding: 12px;
  }
  
  .footer-links {
    flex-direction: column;
    gap: 8px;
  }
  
  .separator {
    display: none;
  }
}
</style>