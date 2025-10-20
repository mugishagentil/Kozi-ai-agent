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
      <!-- <p style="margin: 0.5rem 0; font-size: 0.9rem;"><strong>Your email:</strong> {{ userEmail }}</p>
      <p style="margin: 0.5rem 0; font-size: 0.9rem;"><strong>User ID:</strong> {{ userId }}</p> -->

      <div class="container-fluid">
        <!-- Stats Cards Row -->
        <div class="stats-cards-container">
          <!-- Job Providers Card -->
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

          <!-- Job Seekers Card -->
          <div class="stats-card">
            <div class="card-content">
              <div class="card-info">
                <div class="card-label">All Job Seekers</div>
                <div class="card-value">{{ blogsCount }}</div>
              </div>
              <div class="card-icon">
                <i class="ti ti-archive"></i>
              </div>
            </div>
            <div class="card-gradient-bg"></div>
          </div>

          <!-- All Jobs Card -->
          <div class="stats-card">
            <div class="card-content">
              <div class="card-info">
                <div class="card-label">All Jobs</div>
                <div class="card-value">{{ teamCount }}</div>
              </div>
              <div class="card-icon">
                <i class="ti ti-users"></i>
              </div>
            </div>
            <div class="card-gradient-bg"></div>
          </div>
        </div>

        <!-- Payment Status & Benefits Section -->
        <div class="benefits-section">
          <h3 class="section-title">
            Payment Status & Benefits of Kozi Caretakers
          </h3>
          <hr class="section-divider">

          <div class="benefits-content">
            <!-- Image Section -->
            <div class="benefits-image">
              <img :src="require('@/assets/img/payment-post.jpg')" alt="Registration" class="responsive-image" />
            </div>

            <!-- Instructions Section -->
            <div class="benefits-instructions">
              <h2 class="instructions-title">How It Works</h2>
              <hr class="instructions-divider" />

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
  data() {
    return {
      productsCount: 0,
      blogsCount: 0,
      teamCount: 0,
      userEmail: "",
      userId: "",
    };
  },
  mounted() {
    this.fetchDashboardCounts();
    this.checkProfileStatus();
  },
  methods: {
    async fetchDashboardCounts() {
      try {
        const providerRes = await axios.get(`${globalVariable}/providers/counts`);
        this.productsCount = providerRes.data.count || 0;

        const seekersRes = await axios.get(`${globalVariable}/seekers/count`);
        this.blogsCount = seekersRes.data.count || 0;

        const jobsRes = await axios.get(`${globalVariable}/jobs/count`);
        this.teamCount = jobsRes.data.count || 0;
      } catch (error) {
        console.error("Error fetching dashboard counts:", error);
      }
    },

    async checkProfileStatus() {
      const token = localStorage.getItem("employeeToken");
      if (!token) return;

      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        this.userEmail = payload.email;

        // 1. Get userId from email
        const res = await axios.get(`${globalVariable}/get_user_id_by_email/${this.userEmail}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        this.userId = res.data.users_id;

        // 2. Check if profile is complete
        const checkRes = await axios.get(`${globalVariable}/seekers/check_columns/${this.userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const isComplete = checkRes.data.isComplete;

        // 3. Redirect if profile is incomplete
        if (!isComplete) {
          this.$router.push("/dashboard/Edit-Profile");
        }
      } catch (error) {
        console.error("Error checking profile completeness:", error);
      }
    },
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

/* Mobile Responsiveness - Keep cards in single row */
@media (max-width: 768px) {
  .stats-cards-container {
    grid-template-columns: repeat(3, 1fr);
    gap: 0.8rem;
    padding: 0 0.5rem;
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
  
  .benefits-content {
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
    flex-direction: column;
    text-align: center;
    padding: 1rem;
  }
  
  .step-number {
    margin-right: 0;
    margin-bottom: 0.5rem;
  }
}

@media (max-width: 480px) {
  .stats-cards-container {
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
    padding: 0 0.25rem;
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
}

/* Very small screens optimization */
@media (max-width: 320px) {
  .stats-cards-container {
    gap: 0.3rem;
  }
  
  .stats-card {
    padding: 0.6rem;
  }
  
  .card-value {
    font-size: 1.1rem;
  }
  
  .card-icon {
    font-size: 1.5rem;
  }
  
  .card-label {
    font-size: 0.6rem;
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
</style>