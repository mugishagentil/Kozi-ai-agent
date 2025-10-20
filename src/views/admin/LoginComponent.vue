<template>
  <div class="page-wrapper" id="main-wrapper">
    <div class="login-container">
      <!-- Left side - Image/Brand section -->
      <div class="image-section">
        <div class="image-overlay"></div>
        <div class="brand-content">
          <div class="brand-logo">
            <div class="logo-icon">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M24 4L44 14V34L24 44L4 34V14L24 4Z" fill="white" fill-opacity="0.9"/>
                <path d="M24 12L36 18V30L24 36L12 30V18L24 12Z" fill="#EA60A7"/>
              </svg>
            </div>
            <h1 class="brand-name">AdminPanel</h1>
          </div>
          <div class="brand-description">
            <h2>Welcome Back!</h2>
            <p>Access your admin dashboard with secure authentication and powerful management tools.</p>
          </div>
          <div class="floating-elements">
            <div class="floating-element" style="--delay: 0s"></div>
            <div class="floating-element" style="--delay: 2s"></div>
            <div class="floating-element" style="--delay: 4s"></div>
          </div>
        </div>
      </div>

      <!-- Right side - Form section -->
      <div class="form-section">
        <div class="form-container">
          <div class="form-header">
            <h1 class="form-title">Admin Login</h1>
            <p class="form-subtitle">Sign in to your admin panel</p>
          </div>

          <form @submit.prevent="login" class="login-form">
            <div class="error-container" v-if="errorMessage">
              <div class="alert alert-danger">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8 1L15 15H1L8 1Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                  <path d="M8 6V9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  <path d="M8 12H8.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                {{ errorMessage }}
              </div>
            </div>

            <div class="form-group">
              <label for="email" class="form-label">Email Address</label>
              <div class="input-wrapper">
                <svg class="input-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3.33334 3.33334H16.6667C17.5833 3.33334 18.3333 4.08334 18.3333 5.00001V15C18.3333 15.9167 17.5833 16.6667 16.6667 16.6667H3.33334C2.41668 16.6667 1.66668 15.9167 1.66668 15V5.00001C1.66668 4.08334 2.41668 3.33334 3.33334 3.33334Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M18.3333 5L10 10.8333L1.66668 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <input 
                  type="email" 
                  v-model="email" 
                  class="form-control" 
                  id="email"
                  required 
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div class="form-group">
              <label for="password" class="form-label">Password</label>
              <div class="input-wrapper">
                <svg class="input-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15.8333 9.16667H4.16667C3.24619 9.16667 2.5 9.91286 2.5 10.8333V16.6667C2.5 17.5871 3.24619 18.3333 4.16667 18.3333H15.8333C16.7538 18.3333 17.5 17.5871 17.5 16.6667V10.8333C17.5 9.91286 16.7538 9.16667 15.8333 9.16667Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M5.83334 9.16667V5.83333C5.83334 4.72826 6.27233 3.66846 7.05373 2.88705C7.83513 2.10565 8.89494 1.66667 10 1.66667C11.1051 1.66667 12.1649 2.10565 12.9463 2.88705C13.7277 3.66846 14.1667 4.72826 14.1667 5.83333V9.16667" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <input
                  class="form-control"
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  id="password"
                  required
                  placeholder="Enter your password"
                />
                <button 
                  type="button" 
                  class="password-toggle"
                  @click="showPassword = !showPassword"
                >
                  <svg v-if="showPassword" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1.66668 10S4.16668 4.16667 10 4.16667 18.3333 10 18.3333 10 15.8333 15.8333 10 15.8333 1.66668 10 1.66668 10Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M10 12.5C11.3807 12.5 12.5 11.3807 12.5 10C12.5 8.61929 11.3807 7.5 10 7.5C8.61929 7.5 7.5 8.61929 7.5 10C7.5 11.3807 8.61929 12.5 10 12.5Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  <svg v-else width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M14.95 14.95C13.4805 16.0188 11.7668 16.6014 10 16.6667C4.16668 16.6667 1.66668 10 1.66668 10C2.98461 7.35556 4.80722 5.06927 7.05001 3.35" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M7.70834 6.66667C8.47337 6.22544 9.33044 5.99464 10.2 6C11.0696 6.00536 11.9262 6.23627 12.6917 6.67733C13.4572 7.11838 14.1076 7.75352 14.5833 8.525C14.5833 8.525 15.425 9.80833 15.8333 10.8333" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M10.8333 10.8333C10.6423 11.3235 10.3149 11.7381 9.89499 12.0273C9.47507 12.3166 8.98326 12.4678 8.48334 12.4608C7.98342 12.4538 7.49566 12.2889 7.08334 11.9875C6.67102 11.686 6.35372 11.2618 6.17501 10.775" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M1.66668 1.66667L18.3333 18.3333" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </button>
              </div>
            </div>

            <button type="submit" class="btn-primary" :disabled="loginInProgress">
              <span v-if="loginInProgress" class="spinner"></span>
              <span v-else>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M7.5 2.5H2.5V17.5H7.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M13.75 6.25L17.5 10L13.75 13.75" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M17.5 10H7.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </span>
              {{ loginInProgress ? 'Signing In...' : 'Sign In' }}
            </button>
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
  data() {
    return {
      email: "",
      password: "",
      errorMessage: "",
      showPassword: false,
      loginInProgress: false,
      role_id: "3", // Admin role
    };
  },
  methods: {
    async login() {
      this.loginInProgress = true;
      this.errorMessage = "";

      try {
        const response = await axios.post(`${globalVariable}/login`, {
          email: this.email,
          password: this.password,
          role_id: this.role_id,
        });

        if (response.data.token) {
          // Store the admin token instead of a general token
          localStorage.setItem("adminToken", response.data.token);
          localStorage.setItem("userEmail", this.email);
          localStorage.setItem("adminRoleId", this.role_id);
          this.$router.push("/admin/index");
        } else {
          this.errorMessage = "Login failed.";
        }
      } catch (err) {
        this.errorMessage = err.response?.data?.message || "Login failed.";
      } finally {
        this.loginInProgress = false;
      }
    },
  },
};
</script>

<style scoped>
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

.login-container {
  display: flex;
  width: 100%;
  max-width: 100%;
  height: 100vh;
  max-height: 800px;
  background: white;
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  position: relative;
}

/* Image Section */
.image-section {
  flex: 1;
  background: linear-gradient(135deg, #EA60A7 0%, #d946a3 50%, #c026d3 100%);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.image-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: 
    radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
    radial-gradient(circle at 80% 80%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
    linear-gradient(45deg, transparent 30%, rgba(255, 255, 255, 0.05) 50%, transparent 70%);
  animation: backgroundShift 20s ease-in-out infinite;
}

@keyframes backgroundShift {
  0%, 100% { transform: translateX(0) translateY(0); }
  25% { transform: translateX(-10px) translateY(-10px); }
  50% { transform: translateX(10px) translateY(10px); }
  75% { transform: translateX(-5px) translateY(5px); }
}

.image-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.1);
}

.brand-content {
  position: relative;
  z-index: 2;
  text-align: center;
  color: white;
  padding: 40px;
  max-width: 400px;
}

.brand-logo {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 40px;
  animation: fadeInUp 1s ease-out;
}

.logo-icon {
  margin-bottom: 20px;
  animation: logoFloat 3s ease-in-out infinite;
}

@keyframes logoFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.brand-name {
  font-size: 32px;
  font-weight: 700;
  letter-spacing: -0.5px;
  margin: 0;
}

.brand-description {
  animation: fadeInUp 1s ease-out 0.3s both;
}

.brand-description h2 {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 16px;
  line-height: 1.2;
}

.brand-description p {
  font-size: 16px;
  font-weight: 300;
  line-height: 1.6;
  opacity: 0.9;
}

.floating-elements {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

.floating-element {
  position: absolute;
  width: 60px;
  height: 60px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  animation: float 6s ease-in-out infinite;
  animation-delay: var(--delay);
}

.floating-element:nth-child(1) {
  top: 20%;
  left: 10%;
}

.floating-element:nth-child(2) {
  top: 60%;
  right: 15%;
  width: 40px;
  height: 40px;
}

.floating-element:nth-child(3) {
  bottom: 20%;
  left: 20%;
  width: 80px;
  height: 80px;
}

@keyframes float {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  33% { transform: translateY(-20px) rotate(120deg); }
  66% { transform: translateY(10px) rotate(240deg); }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Form Section */
.form-section {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  background: white;
}

.form-container {
  width: 100%;
  max-width: 400px;
  animation: fadeInRight 1s ease-out 0.5s both;
}

@keyframes fadeInRight {
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
  font-size: 28px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 8px;
  letter-spacing: -0.5px;
}

.form-subtitle {
  color: #64748b;
  font-size: 16px;
  font-weight: 400;
  margin: 0;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Error Alert */
.error-container {
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.alert {
  padding: 16px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 12px;
}

.alert-danger {
  background-color: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
}

/* Form Groups */
.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  margin: 0;
}

.input-wrapper {
  position: relative;
}

.input-icon {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
  z-index: 1;
}

.form-control {
  width: 100%;
  padding: 16px 16px 16px 48px;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 400;
  background: white;
  transition: all 0.3s ease;
  outline: none;
}

.form-control:focus {
  border-color: #EA60A7;
  box-shadow: 0 0 0 3px rgba(234, 96, 167, 0.1);
  transform: translateY(-2px);
}

.form-control:focus + .input-icon {
  color: #EA60A7;
}

.form-control::placeholder {
  color: #9ca3af;
}

.password-toggle {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 8px;
  border-radius: 6px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.password-toggle:hover {
  color: #EA60A7;
  background-color: rgba(234, 96, 167, 0.1);
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
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  position: relative;
  overflow: hidden;
}

.btn-primary::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s ease;
}

.btn-primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #d946a3 0%, #c026d3 100%);
  transform: translateY(-2px);
  box-shadow: 0 10px 30px rgba(234, 96, 167, 0.3);
}

.btn-primary:hover:not(:disabled)::before {
  left: 100%;
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

/* Responsive Design */
@media (max-width: 768px) {
  .login-container {
    flex-direction: column;
    height: 100vh;
    max-height: none;
    border-radius: 0;
  }
  
  .image-section {
    flex: 0 0 40%;
    min-height: 40vh;
  }
  
  .brand-content {
    padding: 20px;
  }
  
  .brand-name {
    font-size: 24px;
  }
  
  .brand-description h2 {
    font-size: 20px;
  }
  
  .brand-description p {
    font-size: 14px;
  }
  
  .form-section {
    flex: 1;
    padding: 20px;
  }
  
  .form-title {
    font-size: 24px;
  }
  
  .form-container {
    max-width: none;
  }
  
  .floating-element {
    width: 40px;
    height: 40px;
  }
  
  .floating-element:nth-child(3) {
    width: 60px;
    height: 60px;
  }
}

@media (max-width: 480px) {
  .page-wrapper {
    padding: 0;
  }
  
  .login-container {
    border-radius: 0;
  }
  
  .image-section {
    flex: 0 0 35%;
    min-height: 35vh;
  }
  
  .form-section {
    padding: 16px;
  }
  
  .form-container {
    padding: 0 8px;
  }
  
  .form-control {
    padding: 14px 14px 14px 44px;
    font-size: 16px;
  }
  
  .btn-primary {
    padding: 14px 20px;
  }
  
  .brand-content {
    padding: 16px;
  }
  
  .brand-name {
    font-size: 20px;
  }
  
  .brand-description h2 {
    font-size: 18px;
  }
}</style>