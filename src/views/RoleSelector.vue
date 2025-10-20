<template>
  <div class="page-wrapper" id="main-wrapper">
    <div class="container">
      <div class="left-panel">
       
        <div class="business-illustration">
          <div class="illustration-bg"></div>
          <div class="floating-elements">
            <div class="element element-1"></div>
            <div class="element element-2"></div>
            <div class="element element-3"></div>
          </div>
        </div>
      </div>
      
      <div class="right-panel">
        <div class="header">
          <h1>Continue as</h1>
          <p>Choose your role to get started</p>
        </div>
        
        <div class="role-options">
          <div 
            class="role-card" 
            :class="{ 'selecting': selectedRole === 'worker' }"
            @click="selectRole('worker')"
          >
            <div class="role-content">
              <div class="role-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <div class="role-info">
                <h3 class="role-title">Worker</h3>
                <p class="role-subtitle">(Usaba akazi)</p>
                <p class="role-description">Find your dream job and advance your career</p>
              </div>
              <svg class="role-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </div>
          </div>
          
          <div 
            class="role-card" 
            :class="{ 'selecting': selectedRole === 'employer' }"
            @click="selectRole('employer')"
          >
            <div class="role-content">
              <div class="role-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                  <line x1="8" y1="21" x2="16" y2="21"/>
                  <line x1="12" y1="17" x2="12" y2="21"/>
                </svg>
              </div>
              <div class="role-info">
                <h3 class="role-title">Employer</h3>
                <p class="role-subtitle">&nbsp;</p>
                <p class="role-description">Post jobs and find the perfect candidates</p>
              </div>
              <svg class="role-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </div>
          </div>
        </div>
        
        <div class="footer">
          <a href="https://kozi.rw/" class="footer-link" target="_blank">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Go to kozi
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "RoleSelector",
  data() {
    return {
      selectedRole: null,
      isAnimating: false,
      profileImage: require("@/assets/img/Onboarding-Screen.png"),
    }
  },
  methods: {
    selectRole(roleType) {
      if (this.isAnimating) return;
      
      this.isAnimating = true;
      this.selectedRole = roleType;
      
      // Convert role type to ID to match your old system
      const roleId = roleType === 'worker' ? 1 : 2;
      
      // Add selection animation
      setTimeout(() => {
        this.selectedRole = null;
        this.isAnimating = false;

        // Store selection in localStorage (same as old code)
        localStorage.setItem("selectedRoleId", roleId);

        // Navigate to login
        this.$router.push("/login");
      }, 600);
    },
    handleMouseMove(e) {
      const leftPanel = this.$el.querySelector('.left-panel');
      if (!leftPanel) return;

      const mouseX = e.clientX / window.innerWidth;
      const mouseY = e.clientY / window.innerHeight;

      const moveX = (mouseX - 0.5) * 15;
      const moveY = (mouseY - 0.5) * 15;

      leftPanel.style.transform = `translate(${moveX}px, ${moveY}px)`;
    }
  },
  mounted() {
    // Add entrance animations
    this.$nextTick(() => {
      const cards = this.$el.querySelectorAll('.role-card');
      cards.forEach((card, index) => {
        card.style.animationDelay = `${0.3 + index * 0.1}s`;
      });
    });

    // Add subtle mouse movement parallax
    document.addEventListener('mousemove', this.handleMouseMove);
  },
  beforeUnmount() {
    document.removeEventListener('mousemove', this.handleMouseMove);
  }
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.page-wrapper {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    background: linear-gradient(135deg, #bbc5d3 15%, #e4b5d2 50%, #d35ad3 100%);
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  overflow-x: hidden;
}

.container {
  display: flex;
  max-width: 1200px;
  width: 100%;
  min-height: 600px;
  background: white;
  border-radius: 24px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  animation: slideIn 0.8s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.left-panel {
  flex: 1;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  transition: transform 0.3s ease;
}

.business-illustration {
  position: relative;
  width: 95%;
  max-width: 400px;
  height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
}


.illustration-bg {
  width: 100%;
  height: 100%; /* Default for mobile */
  background: url('@/assets/img/Onboarding-Screen.png') no-repeat center center;
  background-size: cover;
  border-radius: 20px;
  position: relative;
  animation: float 6s ease-in-out infinite;
  box-shadow: 0 15px 35px rgba(234, 96, 167, 0.3);
}

/* For larger screens (desktops and laptops) */
@media (min-width: 992px) {
  .illustration-bg {
    height: 150%;
  }
}




.illustration-bg::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 60px;
  height: 60px;

  border-radius: 50%;
 
}

.illustration-bg::after {

  position: absolute;
  top: 50%;
  left: 50%;
 
  font-size: 48px;
  
}

@keyframes float {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-15px) rotate(2deg); }
}

@keyframes pulse {
  0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.7; }
  50% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.3; }
}

@keyframes bounce {
  0%, 100% { transform: translate(-50%, -50%) scale(1); }
  50% { transform: translate(-50%, -50%) scale(1.1); }
}

.floating-elements {
  position: absolute;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.element {
  position: absolute;
  background: rgba(204, 12, 111, 0.1);
  border-radius: 50%;
  animation: floatElements 8s ease-in-out infinite;
}

.element-1 {
  width: 40px;
  height: 40px;
  top: 10%;
  left: 20%;
  animation-delay: 0s;
}

.element-2 {
  width: 25px;
  height: 25px;
  top: 70%;
  right: 20%;
  animation-delay: -2s;
}

.element-3 {
  width: 30px;
  height: 30px;
  bottom: 20%;
  left: 10%;
  animation-delay: -4s;
}

@keyframes floatElements {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  25% { transform: translateY(-20px) rotate(90deg); }
  50% { transform: translateY(-10px) rotate(180deg); }
  75% { transform: translateY(-15px) rotate(270deg); }
}

.right-panel {
  flex: 1;
  padding: 60px 40px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  position: relative;
}

.header {
  text-align: center;
  margin-bottom: 50px;
  animation: fadeInUp 1s ease-out 0.2s both;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.header h1 {
  font-size: 32px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 12px;
  letter-spacing: -0.025em;
}

.header p {
  color: #64748b;
  font-size: 16px;
  font-weight: 400;
}

.role-options {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 40px;
}

.role-card {
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 16px;
  padding: 24px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  animation: fadeInUp 1s ease-out both;
}

.role-card:nth-child(1) {
  animation-delay: 0.3s;
}

.role-card:nth-child(2) {
  animation-delay: 0.4s;
}

.role-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(234, 96, 167, 0.1), transparent);
  transition: left 0.5s ease;
}

.role-card:hover::before {
  left: 100%;
}

.role-card:hover {
  border-color: #EA60A7;
  box-shadow: 0 20px 40px rgba(234, 96, 167, 0.2);
  transform: translateY(-8px);
}

.role-card.selecting {
  border-color: #EA60A7;
  box-shadow: 0 25px 50px rgba(234, 96, 167, 0.3);
  transform: scale(0.98);
}

.role-card:active {
  transform: translateY(-4px);
}

.role-content {
  display: flex;
  align-items: center;
  gap: 20px;
  position: relative;
  z-index: 1;
}

.role-icon {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, #EA60A7, #d946a3);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  transition: all 0.3s ease;
  box-shadow: 0 4px 20px rgba(234, 96, 167, 0.3);
}

.role-card:hover .role-icon {
  transform: scale(1.1) rotate(5deg);
  box-shadow: 0 6px 30px rgba(234, 96, 167, 0.4);
}

.role-info {
  flex: 1;
}

.role-title {
  font-size: 24px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 8px;
  letter-spacing: -0.025em;
}

.role-subtitle {
  color: #EA60A7;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 4px;
  min-height: 20px;
}

.role-description {
  color: #374151;
  font-size: 16px;
  font-weight: 400;
  line-height: 1.5;
}

.role-arrow {
  width: 24px;
  height: 24px;
  color: #EA60A7;
  transition: transform 0.3s ease;
}

.role-card:hover .role-arrow {
  transform: translateX(8px);
}

.footer {
  text-align: center;
  animation: fadeInUp 1s ease-out 0.5s both;
}

.footer-link {
  color: #EA60A7;
  text-decoration: none;
  font-size: 16px;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
  padding: 12px 24px;
  border-radius: 12px;
  background: rgba(234, 96, 167, 0.1);
}

.footer-link:hover {
  background: rgba(234, 96, 167, 0.2);
  transform: translateY(-2px);
}

.footer-link svg {
  width: 20px;
  height: 20px;
  transition: transform 0.3s ease;
}

.footer-link:hover svg {
  transform: translateX(-4px);
}

/* Responsive Design */
@media (max-width: 768px) {
  .container {
    flex-direction: column;
    min-height: auto;
  }
  
  .left-panel {
    height: 300px;
  }
  
  .right-panel {
    padding: 40px 24px;
  }
  
  .header h1 {
    font-size: 28px;
  }
  
  .role-content {
    flex-direction: column;
    text-align: center;
    gap: 16px;
  }
  
  .role-info {
    text-align: center;
  }
  
  .role-icon {
    width: 60px;
    height: 60px;
  }
  
  .role-icon svg {
    width: 24px;
    height: 24px;
  }
}

@media (max-width: 480px) {
  .page-wrapper {
    padding: 12px;
  }
  
  .container {
    border-radius: 16px;
  }
  
  .right-panel {
    padding: 32px 20px;
  }
  
  .header {
    margin-bottom: 40px;
  }
  
  .header h1 {
    font-size: 24px;
  }
  
  .role-card {
    padding: 20px;
  }
  
  .role-title {
    font-size: 20px;
  }
}
</style>