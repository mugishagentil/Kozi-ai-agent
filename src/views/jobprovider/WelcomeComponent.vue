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
        <!-- Modern Stats Cards Section -->
        <div class="stats-cards-container">
          <div class="stats-card">
            <div class="card-content">
              <div class="card-info">
                <div class="card-label">All Job Providers</div>
                <div class="card-value">{{ productsCount }}</div>
              </div>
              <div class="card-icon">
                <i class="ti ti-notebook"></i>
              </div>
            </div>
            <div class="card-gradient-bg"></div>
          </div>
          <div class="stats-card">
            <div class="card-content">
              <div class="card-info">
                <div class="card-label">All Job Seekers</div>
                <div class="card-value">{{ blogsCount }}</div>
              </div>
              <div class="card-icon">
                <i class="ti ti-users"></i>
              </div>
            </div>
            <div class="card-gradient-bg"></div>
          </div>
          <div class="stats-card">
            <div class="card-content">
              <div class="card-info">
                <div class="card-label">Published Jobs</div>
                <div class="card-value">{{ employeesCount }}</div>
              </div>
              <div class="card-icon">
                <i class="ti ti-clipboard"></i>
              </div>
            </div>
            <div class="card-gradient-bg"></div>
          </div>
        </div>

        <!-- Action Cards Section -->
        <div class="action-cards-container">
          <div class="action-card" @click="navigateToAddJob">
            <div class="action-card-icon">
              <i class="ti ti-briefcase"></i>
            </div>
            <div class="action-card-text">Add a Job</div>
          </div>
          
          <div class="action-card active" @click="navigateToFindCandidates">
            <div class="action-card-icon">
              <i class="ti ti-search"></i>
            </div>
            <div class="action-card-text">Find Candidates</div>
          </div>
          
          <div class="action-card" @click="navigateToCompanyProfile">
            <div class="action-card-icon">
              <i class="ti ti-building"></i>
            </div>
            <div class="action-card-text">Company Profile</div>
          </div>
        </div>

        <!-- Benefits Section -->
        <div class="benefits-section">
          <h3 class="section-title">Benefits of Kozi Caretakers</h3>
          <hr class="section-divider">

          <div class="benefits-content">
            <div class="benefits-image">
              <img 
                :src="require('@/assets/img/employer.jpg')" 
                alt="Employer Benefits" 
                class="responsive-image"
              />
            </div>

            <div class="benefits-instructions">
              <h2 class="instructions-title">How It Works</h2>
              <hr class="instructions-divider">
              
              <div class="premium-notice">
                <p>
                  <strong>N.B:</strong>A one-time payment grants access to exclusive premium features! This payment allows you to post job opportunities and reach a wider pool of qualified candidates.
                </p>
              </div>

              <div class="steps-container">
                <div class="step-item">
                  <div class="step-number">1</div>
                  <div class="step-text">
                    <strong>Step 1:</strong> Dial the MoMo Pay code *182*8*1*067788#.
                  </div>
                </div>

                <div class="step-item">
                  <div class="step-number">2</div>
                  <div class="step-text">
                    <strong>Step 2:</strong> Enter the amount: 2,000 RWF.
                  </div>
                </div>

                <div class="step-item">
                  <div class="step-number">3</div>
                  <div class="step-text">
                    <strong>Step 3:</strong> Confirm the name: SANSON GROUP Ltd.
                  </div>
                </div>

                <div class="step-item">
                  <div class="step-number">4</div>
                  <div class="step-text">
                    <strong>Step 4:</strong> Enter your MoMo PIN.
                  </div>
                </div>

                <div class="step-item">
                  <div class="step-number">5</div>
                  <div class="step-text">
                    <strong>Step 5:</strong> Wait up to 5 minutes for approval.
                  </div>
                </div>
              </div>

              <div class="footer-note">
                Grow your business and connect with the right talent — start hiring with us today!
              </div>
            </div>
          </div>
        </div>

        <!-- Profile Section -->
        <div class="profile-section">
          <div class="profile-content">
            <div class="profile-info">
              <hr class="section-divider">
              <h2 class="profile-title">Profile Information</h2>
              
              <div class="profile-description">
                <p>
                  Welcome to your profile page! Here, you can view and update your personal 
                  information. If your profile is not complete, please check the bio section 
                  below to add more details and help potential employers learn more about you.
                </p>
              </div>

              <a href="edit-profile" class="profile-update-link">
                <button class="update-button">Update My Profile</button>
              </a>
            </div>
            
            <div class="profile-picture-container">
              <img 
                :src="require('@/assets/img/sample.png')" 
                alt="Profile Picture" 
                class="profile-picture"
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script>
import { globalVariable } from "@/global";
import IndexComponent from "./IndexComponent.vue";
import axios from "axios";

export default {
  name: "WelcomeComponent",
  components: {
    IndexComponent,
  },
  setup() {
    return { globalVariable };
  },
  data() {
    return {
      productsCount: 0, 
      blogsCount: 0,    
      employeesCount: 0,     
      userEmail: "",   
    };
  },
  mounted() {
    // Fetch providers count
    axios
      .get(`${globalVariable}/providers/counts`)
      .then((response) => {
        if (response.data.count !== undefined) {
          this.productsCount = response.data.count;
        } else {
          console.error("Error fetching product count:", response.data.error || "Unknown error");
        }
      })
      .catch((error) => {
        console.error("Error fetching product count:", error);
      });

    // Fetch seekers count
    axios
      .get(`${globalVariable}/seekers/count`)
      .then((response) => {
        if (response.data.count !== undefined) {
          this.blogsCount = response.data.count;
        } else {
          console.error("Error fetching blogs count:", response.data.error || "Unknown error");
        }
      })
      .catch((error) => {
        console.error("Error fetching blogs count:", error);
      });

    // Fetch employees count
    axios
      
      .get(`${globalVariable}/admin/count/jobs`)
      .then((response) => {
        if (response.data.count !== undefined) {
          this.employeesCount = response.data.count;
        } else {
          console.error("Error fetching team count:", response.data.error || "Unknown error");
        }
      })
      .catch((error) => {
        console.error("Error fetching employees count:", error);
      });

    // Get the logged-in user's email from localStorage
    this.userEmail = localStorage.getItem("userEmail") || "No email found";                    
  },
  methods: {
    navigateToAddJob() {
      this.$router.push('/employer/add-job');
    },
    navigateToFindCandidates() {
      this.$router.push('/employer/seekers');
    },
    navigateToCompanyProfile() {
      this.$router.push('/employer/view-profile');
    }
  },
};
</script>

<style scoped>
/* Stats Cards Container */
.stats-cards-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;
  padding: 0 1rem;
}

/* Individual Stats Card */
.stats-card {
  position: relative;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 20px;
  padding: 2rem;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.stats-card:hover {
  transform: translateY(-10px);
  box-shadow: 0 30px 60px rgba(0, 0, 0, 0.15);
}

.stats-card:nth-child(1) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.stats-card:nth-child(2) {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.stats-card:nth-child(3) {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.card-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  z-index: 2;
}

.card-info {
  flex: 1;
}

.card-label {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.8);
  text-transform: uppercase;
  font-weight: 600;
  letter-spacing: 0.5px;
  margin-bottom: 0.5rem;
}

.card-value {
  font-size: 2.5rem;
  font-weight: 700;
  color: white;
  line-height: 1;
}

.card-icon {
  font-size: 3rem;
  color: rgba(255, 255, 255, 0.3);
  margin-left: 1rem;
}

.card-gradient-bg {
  position: absolute;
  top: 0;
  right: 0;
  width: 100px;
  height: 100px;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
  border-radius: 50%;
  transform: translate(30px, -30px);
}

/* Action Cards Container */
.action-cards-container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  margin-bottom: 3rem;
  padding: 0 1rem;
}

/* Individual Action Card */
.action-card {
  background: white;
  border-radius: 15px;
  padding: 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.08);
  position: relative;
  overflow: hidden;
}

.action-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.15);
  border-color: #EA60A7;
}

.action-card.active {
  background: linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%);
  border-color: #EA60A7;
  box-shadow: 0 10px 30px rgba(234, 96, 167, 0.2);
}

.action-card-icon {
  font-size: 3rem;
  color: #EA60A7;
  margin-bottom: 1rem;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 60px;
}

.action-card-text {
  font-size: 1.1rem;
  font-weight: 600;
  color: #374151;
  text-transform: capitalize;
  letter-spacing: 0.5px;
}

.action-card.active .action-card-text {
  color: #EA60A7;
  font-weight: 700;
}

/* Action Card Hover Effects */
.action-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(234, 96, 167, 0.1), transparent);
  transition: left 0.5s;
}

.action-card:hover::before {
  left: 100%;
}

/* Benefits Section */
.benefits-section {
  margin-top: 3rem;
  padding: 0 1rem;
}

.section-title {
  text-align: center;
  color: #5F9EA0;
  font-family: 'Michroma', sans-serif;
  font-size: 1.8rem;
  margin-bottom: 1rem;
  font-weight: 600;
}

.section-divider {
  margin: 20px auto;
  border: 0;
  height: 2px;
  width: 60%;
  background: linear-gradient(90deg, #EA60A7, #5F9EA0);
  border-radius: 2px;
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
  max-height: 500px;
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

/* Profile Section */
.profile-section {
  margin-top: 3rem;
  padding: 0 1rem;
}

.profile-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3rem;
  align-items: center;
  margin-top: 2rem;
}

.profile-title {
  color: #5F9EA0;
  font-size: 1.5rem;
  margin-bottom: 1rem;
  font-weight: 600;
}

.profile-description {
  margin-bottom: 2rem;
  color: #666;
  line-height: 1.6;
}

.profile-update-link {
  text-decoration: none;
}

.update-button {
  background: linear-gradient(135deg, #EA60A7, #f093fb);
  color: white;
  width: 60%;
  border: none;
  padding: 12px 24px;
  border-radius: 10px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
  transition: all 0.3s ease;
  box-shadow: 0 5px 15px rgba(234, 96, 167, 0.3);
}

.update-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(234, 96, 167, 0.4);
  background: linear-gradient(135deg, #f093fb, #EA60A7);
}

.profile-picture-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2rem;
}

.profile-picture {
  width: 100%;
  max-width: 400px;
  height: auto;
  border-radius: 15px;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;
}

.profile-picture:hover {
  transform: scale(1.05);
}

/* Mobile Responsiveness */
@media (max-width: 768px) {
  .stats-cards-container {
    grid-template-columns: repeat(3, 1fr);
    gap: 0.8rem;
    padding: 0 0.5rem;
  }
  
  .action-cards-container {
    grid-template-columns: repeat(3, 1fr);
    gap: 0.8rem;
    padding: 0 0.5rem;
  }
  
  .action-card {
    padding: 1.5rem 1rem;
  }
  
  .action-card-icon {
    font-size: 2.5rem;
    height: 50px;
  }
  
  .action-card-text {
    font-size: 0.9rem;
  }
  
  .stats-card {
    padding: 1rem;
  }
  
  .card-value {
    font-size: 1.5rem;
  }
  
  .card-icon {
    font-size: 2rem;
  }
  
  .card-label {
    font-size: 0.7rem;
  }
  
  .benefits-content,
  .profile-content {
    grid-template-columns: 1fr;
    gap: 2rem;
  }
  
  .section-title {
    font-size: 1.4rem;
  }
  
  .benefits-instructions {
    padding: 1.5rem;
  }
  
  .instructions-title {
    font-size: 1.3rem;
  }
  
  .step-item {
    padding: 1rem;
  }
  
  .update-button {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .stats-cards-container {
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
    padding: 0 0.25rem;
  }
  
  .action-cards-container {
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
    padding: 0 0.25rem;
  }
  
  .action-card {
    padding: 1rem 0.5rem;
  }
  
  .action-card-icon {
    font-size: 2rem;
    height: 40px;
  }
  
  .action-card-text {
    font-size: 0.8rem;
    line-height: 1.2;
  }
  
  .stats-card {
    padding: 0.8rem;
  }
  
  .card-content {
    flex-direction: column;
    text-align: center;
  }
  
  .card-value {
    font-size: 1.3rem;
  }
  
  .card-icon {
    font-size: 1.8rem;
    margin-left: 0;
    margin-top: 0.5rem;
  }
  
  .card-label {
    font-size: 0.65rem;
    line-height: 1.2;
  }
  
  .benefits-instructions {
    padding: 1rem;
  }
  
  .section-title {
    font-size: 1.2rem;
    padding: 0 1rem;
  }
  
  .step-item {
    flex-direction: column;
    text-align: center;
  }
  
  .step-number {
    margin-right: 0;
    margin-bottom: 0.5rem;
  }
}

/* Animation for cards loading */
@keyframes cardSlideIn {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.stats-card {
  animation: cardSlideIn 0.6s ease-out;
}

.stats-card:nth-child(1) {
  animation-delay: 0.1s;
}

.stats-card:nth-child(2) {
  animation-delay: 0.2s;
}

.stats-card:nth-child(3) {
  animation-delay: 0.3s;
}

/* Action Cards Animation */
.action-card {
  animation: cardSlideIn 0.6s ease-out;
}

.action-card:nth-child(1) {
  animation-delay: 0.4s;
}

.action-card:nth-child(2) {
  animation-delay: 0.5s;
}

.action-card:nth-child(3) {
  animation-delay: 0.6s;
}
</style>