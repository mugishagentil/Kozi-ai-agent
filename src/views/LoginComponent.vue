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
              <h1 class="logo-text">{{ roleDisplayName }}</h1>
            </div>
            <div class="brand-tagline">
              <p>{{ roleTagline.line1 }}</p>
              <p>{{ roleTagline.line2 }}</p>
            </div>
          </div>
          <div class="floating-elements">
            <div class="floating-card card-1">
              <div class="card-icon">{{ roleFeatures.feature1.icon }}</div>
              <span>{{ roleFeatures.feature1.text }}</span>
            </div>
            <div class="floating-card card-2">
              <div class="card-icon">{{ roleFeatures.feature2.icon }}</div>
              <span>{{ roleFeatures.feature2.text }}</span>
            </div>
            <div class="floating-card card-3">
              <div class="card-icon">{{ roleFeatures.feature3.icon }}</div>
              <span>{{ roleFeatures.feature3.text }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Form Section -->
      <div class="form-section">
        <div class="form-container">
          <div class="form-header">
            <h2 class="form-title">Welcome Back</h2>
            <p class="form-subtitle">Sign in to your {{ roleName.toLowerCase() }} account</p>
          </div>

          <form @submit.prevent="login" class="login-form">
            <div class="error-container" v-if="errorMessage">
              <div class="alert alert-danger">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 0C3.58 0 0 3.58 0 8C0 12.42 3.58 16 8 16C12.42 16 16 12.42 16 8C16 3.58 12.42 0 8 0ZM9 12H7V10H9V12ZM9 8H7V4H9V8Z" fill="currentColor"/>
                </svg>
                {{ errorMessage }}
              </div>
            </div>

            <div class="form-group">
              <label for="email" class="form-label">Emeyili Yawe</label>
              <div class="input-wrapper">
                <svg class="input-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M18 4H2C1.45 4 1 4.45 1 5V15C1 15.55 1.45 16 2 16H18C18.55 16 19 15.55 19 15V5C19 4.45 18.55 4 18 4ZM18 7L10 12L2 7V5L10 10L18 5V7Z" fill="currentColor"/>
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
              <label for="password" class="form-label">Ijambo Banga</label>
              <div class="input-wrapper">
                <svg class="input-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M15 7H14V5C14 2.24 11.76 0 9 0S4 2.24 4 5V7H3C2.45 7 2 7.45 2 8V18C2 18.55 2.45 19 3 19H15C15.55 19 16 18.55 16 18V8C16 7.45 15.55 7 15 7ZM6 5C6 3.34 7.34 2 9 2S12 3.34 12 5V7H6V5Z" fill="currentColor"/>
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
                  <svg v-if="showPassword" width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M10 12C8.9 12 8 11.1 8 10S8.9 8 10 8S12 8.9 12 10S11.1 12 10 12ZM10 4C5 4 1.73 7.11 1 10C1.73 12.89 5 16 10 16S18.27 12.89 19 10C18.27 7.11 15 4 10 4ZM10 14C7.24 14 4.91 12.36 4 10C4.91 7.64 7.24 6 10 6S15.09 7.64 16 10C15.09 12.36 12.76 14 10 14Z" fill="currentColor"/>
                  </svg>
                  <svg v-else width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M10 6C12.76 6 15.09 7.64 16 10C15.09 12.36 12.76 14 10 14C7.24 14 4.91 12.36 4 10C4.91 7.64 7.24 6 10 6ZM10 4C5 4 1.73 7.11 1 10C1.73 12.89 5 16 10 16S18.27 12.89 19 10C18.27 7.11 15 4 10 4ZM10 8C8.9 8 8 8.9 8 10S8.9 12 10 12S12 11.1 12 10S11.1 8 10 8Z" fill="currentColor"/>
                    <path d="M2 2L18 18" stroke="currentColor" stroke-width="2"/>
                  </svg>
                </button>
              </div>
            </div>

            <button type="submit" class="btn-primary" :disabled="loginInProgress">
              <span v-if="loginInProgress" class="spinner"></span>
              <svg v-else width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 0C4.48 0 0 4.48 0 10S4.48 20 10 20S20 15.52 20 10S15.52 0 10 0ZM8 15L3 10L4.41 8.59L8 12.17L15.59 4.58L17 6L8 15Z" fill="currentColor"/>
              </svg>
              {{ loginInProgress ? 'Signing In...' : 'Injira' }}
            </button>
            <!-- continue with google-->

            <!-- <div class="divider">
              <span class="divider-text">or continue with</span>
            </div> -->

            <!-- <div class="google-signin-container">
              <div id="google-button"></div>
            </div> -->

            <div class="footer-links">
              <p class="form-label">Nta konti ufite?</p>
              <a href="/signup" class="link">Kanda hano</a>
              <span class="separator">•</span>
              <a href="/forgot-password" class="link">Wibagiwe Ijambo banga?</a>
            </div>
            <div class="footer-links">
              
              <a href="/" class="link">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 0L1 7H4V16H12V7H15L8 0Z" fill="currentColor"/>
                </svg>
                Subira Inyuma
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
/* global google */
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
      googleClientId: "793211149046-copaoe356k4gg5qv1bjmu92egvsn2fcn.apps.googleusercontent.com",
      role_id: null,
    };
  },
  mounted() {
    const roleId = localStorage.getItem("selectedRoleId");

    if (!roleId) {
      this.$router.push("/role-selector");
    } else {
      this.role_id = roleId;

      this.$nextTick(() => {
        if (window.google) {
          google.accounts.id.initialize({
            client_id: this.googleClientId,
            callback: this.handleGoogleCredential,
          });

          google.accounts.id.renderButton(
            document.getElementById("google-button"),
            { 
              theme: "outline", 
              size: "large",
              width: "100%",
              text: "signin_with"
            }
          );
        }
      });
    }
  },
  computed: {
    roleName() {
      switch (parseInt(this.role_id)) {
        case 1: return "Job Seeker";
        case 2: return "Employer";
        case 3: return "Admin";
        case 4: return "Agent";
        default: return "Unknown Role";
      }
    },
    roleDisplayName() {
      switch (parseInt(this.role_id)) {
        case 1: return "Job Seeker Hub";
        case 2: return "Job Provider Portal";
        case 3: return "Admin Dashboard";
        case 4: return "Agent Portal";
        default: return "JobPortal";
      }
    },
    roleTagline() {
      switch (parseInt(this.role_id)) {
        case 1: 
          return {
            line1: "Discover your dream career",
            line2: "Build your professional future"
          };
        case 2:
          return {
            line1: "Find the perfect candidates",
            line2: "Grow your team efficiently"
          };
        case 3:
          return {
            line1: "Manage and oversee",
            line2: "Control platform operations"
          };
        case 4:
          return {
            line1: "Connect talent with opportunity",
            line2: "Bridge careers and companies"
          };
        default:
          return {
            line1: "Connect with opportunities",
            line2: "Shape your future"
          };
      }
    },
    roleFeatures() {
      switch (parseInt(this.role_id)) {
        case 1: // Job Seeker
          return {
            feature1: { icon: "🔍", text: "Search jobs  " },
            feature2: { icon: "📄", text: "Build Resume" },
            feature3: { icon: "🎯", text: "Apply Smartly" }
          };
        case 2: // Job Provider
          return {
            feature1: { icon: "📝", text: "Post Jobs" },
            feature2: { icon: "👥", text: "Find Talent" },
            feature3: { icon: "⚡", text: "Hire Fast and secured" }

            
          };
        case 3: // Admin
          return {
            feature1: { icon: "📊", text: "Analytics" },
            feature2: { icon: "⚙️", text: "Settings" },
            feature3: { icon: "🛡️", text: "Security" }
          };
        case 4: // Agent
          return {
            feature1: { icon: "🤝", text: "Connect" },
            feature2: { icon: "💼", text: "Manage" },
            feature3: { icon: "📈", text: "Track" }
          };
        default:
          return {
            feature1: { icon: "💼", text: "Find Jobs" },
            feature2: { icon: "🚀", text: "Grow Career" },
            feature3: { icon: "🎯", text: "Match Skills" }
          };
      }
    }
  },

  methods: {
    async login() {
      if (!this.role_id) {
        this.errorMessage = "Please select a role before logging in.";
        return;
      }

      this.loginInProgress = true;
      this.errorMessage = "";

      try {
        const response = await axios.post(`${globalVariable}/login`, {
          email: this.email,
          password: this.password,
          role_id: this.role_id,
        });

        if (response.data.token) {
          const tokenKey = this.role_id === "1" ? "employeeToken" : "employerToken";
          const roleKey = this.role_id === "1" ? "employeeRoleId" : "employerRoleId";
          localStorage.setItem(tokenKey, response.data.token);
          localStorage.setItem("userEmail", this.email);
          localStorage.setItem(roleKey, this.role_id);
          this.routeUser();
        } else {
          this.errorMessage = "Login failed.";
        }
      } catch (err) {
        this.errorMessage = err.response?.data?.message || "Login failed.";
      } finally {
        this.loginInProgress = false;
      }
    },

    handleGoogleCredential(response) {
      const credential = response.credential;

      axios.post(`${globalVariable}/google-login`, {
        token: credential,
        role_id: this.role_id,
      })
      .then((res) => {
        const tokenKey = this.role_id === "1" ? "employeeToken" : "employerToken";
        const roleKey = this.role_id === "1" ? "employeeRoleId" : "employerRoleId";
        localStorage.setItem(tokenKey, res.data.token);
        localStorage.setItem("userEmail", res.data.email);
        localStorage.setItem(roleKey, this.role_id);

        switch (parseInt(this.role_id)) {
          case 1:
            this.$router.push("/dashboard");
            break;
          case 2:
            this.$router.push("/employer/dashboard");
            break;
          case 3:
            this.$router.push("/admin-dashboard");
            break;
          case 4:
            this.$router.push("/agent-dashboard");
            break;
          default:
            this.$router.push("/dashboard");
        }
      })
      .catch((err) => {
        this.errorMessage = err.response?.data?.message || "Google sign-in failed.";
      });
    },

    routeUser() {
      switch (parseInt(this.role_id)) {
        case 1:
          this.$router.push("/dashboard");
          break;
        case 2:
          this.$router.push("/employer/dashboard");
          break;
        case 3:
          this.$router.push("/admin-dashboard");
          break;
        case 4:
          this.$router.push("/agent-dashboard");
          break;
        default:
          this.$router.push("/dashboard");
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

.login-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  /* max-width: 1200px; */
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
  margin: 0;
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
    display: none;
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

.password-toggle {
  position: absolute;
  right: 16px;
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 4px;
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

/* Divider */
.divider {
            display: flex;
            align-items: center;
            text-align: center;
            margin: 8px 0;
        }

        .divider::before,
        .divider::after {
            content: '';
            flex: 1;
            height: 1px;
            background: #e5e7eb;
        }

        .divider-text {
            padding: 0 16px;
            color: #9ca3af;
            font-size: 14px;
            font-weight: 500;
        }

/* Google Button */
.google-signin-container {
  display: flex;
  justify-content: center;
}

#google-button {
  width: 100%;
  border-radius: 12px !important;
  overflow: hidden;
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
}
</style>