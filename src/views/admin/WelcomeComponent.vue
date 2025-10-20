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
  >
    <div class="body-wrapper" style="margin-top: -4rem;">
      <div class="container-fluid">
        <!-- Enhanced Stats Cards Container -->
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

          <!-- Hired Seekers Card -->
          <div class="stats-card">
            <div class="card-content">
              <div class="card-info">
                <div class="card-label">Hired Seekers</div>
                <div class="card-value">{{ employeesCount }}</div>
              </div>
              <div class="card-icon">
                <i class="ti ti-users"></i>
              </div>
            </div>
            <div class="card-gradient-bg"></div>
          </div>

          <!-- Approved Seekers Card -->
          <div class="stats-card">
            <div class="card-content">
              <div class="card-info">
                <div class="card-label">Approved Seekers</div>
                <div class="card-value">{{ approvedseekersCount }}</div>
              </div>
              <div class="card-icon">
                <i class="ti ti-user-check"></i>
              </div>
            </div>
            <div class="card-gradient-bg"></div>
          </div>

          <!-- Approved Providers Card -->
          <div class="stats-card">
            <div class="card-content">
              <div class="card-info">
                <div class="card-label">Approved Providers</div>
                <div class="card-value">{{ approvedprovidersCount }}</div>
              </div>
              <div class="card-icon">
                <i class="ti ti-building"></i>
              </div>
            </div>
            <div class="card-gradient-bg"></div>
          </div>

          <!-- All Agents Card -->
          <div class="stats-card">
            <div class="card-content">
              <div class="card-info">
                <div class="card-label">All Agents</div>
                <div class="card-value">{{ agentCount }}</div>
              </div>
              <div class="card-icon">
                <i class="ti ti-user-star"></i>
              </div>
            </div>
            <div class="card-gradient-bg"></div>
          </div>

          <!-- All Jobs Card -->
          <div class="stats-card">
            <div class="card-content">
              <div class="card-info">
                <div class="card-label">All Jobs</div>
                <div class="card-value">{{ jobsCount }}</div>
              </div>
              <div class="card-icon">
                <i class="ti ti-briefcase"></i>
              </div>
            </div>
            <div class="card-gradient-bg"></div>
          </div>

          <!-- Unpublished Jobs Card -->
          <div class="stats-card">
            <div class="card-content">
              <div class="card-info">
                <div class="card-label">Unpublished Jobs</div>
                <div class="card-value">{{ unpublishedCount }}</div>
              </div>
              <div class="card-icon">
                <i class="ti ti-eye-off"></i>
              </div>
            </div>
            <div class="card-gradient-bg"></div>
          </div>

          <!-- Active Jobs Card -->
          <div class="stats-card">
            <div class="card-content">
              <div class="card-info">
                <div class="card-label">Active Jobs</div>
                <div class="card-value">{{ activeJobsCount }}</div>
              </div>
              <div class="card-icon">
                <i class="ti ti-briefcase"></i>
              </div>
            </div>
            <div class="card-gradient-bg"></div>
          </div>

          <!-- Today's Provider Registrations Card -->
          <div class="stats-card">
            <div class="card-content">
              <div class="card-info">
                <div class="card-label">Today's Provider Registrations</div>
                <div class="card-value">{{ pendingApplicationsCount }}</div>
              </div>
              <div class="card-icon">
                <i class="ti ti-clock"></i>
              </div>
            </div>
            <div class="card-gradient-bg"></div>
          </div>

          <!-- Today's Registrations Card -->
          <div class="stats-card">
            <div class="card-content">
              <div class="card-info">
                <div class="card-label">Today's Registrations</div>
                <div class="card-value">{{ todayRegistrationsCount }}</div>
              </div>
              <div class="card-icon">
                <i class="ti ti-user-plus"></i>
              </div>
            </div>
            <div class="card-gradient-bg"></div>
          </div>

          <!-- Weekly Jobs Card -->
          <div class="stats-card">
            <div class="card-content">
              <div class="card-info">
                <div class="card-label">Jobs Posted This Week</div>
                <div class="card-value">{{ weeklyJobsCount }}</div>
              </div>
              <div class="card-icon">
                <i class="ti ti-trophy"></i>
              </div>
            </div>
            <div class="card-gradient-bg"></div>
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
      // Original data properties
      approvedseekersCount: 0,
      approvedprovidersCount: 0,
      agentCount: 0,
      jobsCount: 0,
      unpublishedCount: 0,
      productsCount: 0,
      blogsCount: 0,
      employeesCount: 0,
      userEmail: "",
      
      // Enhanced data properties
      activeJobsCount: 0,
      pendingApplicationsCount: 0,
      todayRegistrationsCount: 0,
      hiringSuccessRate: 0,
      weeklyJobsCount: 0,
      monthlyApplicationsCount: 0,
      avgDaysToHire: 0,
      rejectedApplicationsCount: 0,
    };
  },
  mounted() {
    // Original API calls
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

    axios
      .get(`${globalVariable}/employees/count`)
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

    // Approved seekers
    axios
      .get(`${globalVariable}/admin/count/approved_seekers`)
      .then((response) => {
        if (response.data.count !== undefined) {
          this.approvedseekersCount = response.data.count;
        } else {
          console.error("Error fetching team count:", response.data.error || "Unknown error");
        }
      })
      .catch((error) => {
        console.error("Error fetching approved seekers count:", error);
      });

    // Approved providers
    axios
      .get(`${globalVariable}/admin/count/approved_providers`)
      .then((response) => {
        if (response.data.count !== undefined) {
          this.approvedprovidersCount = response.data.count;
        } else {
          console.error("Error fetching team count:", response.data.error || "Unknown error");
        }
      })
      .catch((error) => {
        console.error("Error fetching approved providers count:", error);
      });

    // All agent
    axios
      .get(`${globalVariable}/admin/count/agent`)
      .then((response) => {
        if (response.data.count !== undefined) {
          this.agentCount = response.data.count;
        } else {
          console.error("Error fetching team count:", response.data.error || "Unknown error");
        }
      })
      .catch((error) => {
        console.error("Error fetching approved seekers count:", error);
      });

    // All jobs
    axios
      .get(`${globalVariable}/admin/count/jobs`)
      .then((response) => {
        if (response.data.count !== undefined) {
          this.jobsCount = response.data.count;
        } else {
          console.error("Error fetching team count:", response.data.error || "Unknown error");
        }
      })
      .catch((error) => {
        console.error("Error fetching approved seekers count:", error);
      });

    // Unpublished jobs
    axios
      .get(`${globalVariable}/admin/count/unpublishedjob`)
      .then((response) => {
        if (response.data.count !== undefined) {
          this.unpublishedCount = response.data.count;
        } else {
          console.error("Error fetching team count:", response.data.error || "Unknown error");
        }
      })
      .catch((error) => {
        console.error("Error fetching unpublished job:", error);
      });

    // Enhanced API calls

    // Active Jobs
    axios
      .get(`${globalVariable}/admin/count/active_jobs`)
      .then((response) => {
        if (response.data.count !== undefined) {
          this.activeJobsCount = response.data.count;
        }
      })
      .catch((error) => {
        console.error("Error fetching active jobs count:", error);
      });

    // Today's job provider registration
    axios
      .get(`${globalVariable}/admin/count/todays_job_providers`)
      .then((response) => {
        if (response.data.count !== undefined) {
          this.pendingApplicationsCount = response.data.count;
        }
      })
      .catch((error) => {
        console.error("Error fetching pending applications count:", error);
      });

    // Today's Registrations
    axios
      .get(`${globalVariable}/admin/count/todays_job_seekers`)
      .then((response) => {
        if (response.data.count !== undefined) {
          this.todayRegistrationsCount = response.data.count;
        }
      })
      .catch((error) => {
        console.error("Error fetching today's registrations count:", error);
      });

    // Weekly Jobs Count
    axios
      .get(`${globalVariable}/admin/count/job_posted_this_week`)
      .then((response) => {
        if (response.data.count !== undefined) {
          this.weeklyJobsCount = response.data.count;
        }
      })
      .catch((error) => {
        console.error("Error fetching weekly jobs count:", error);
      });

    // Get the logged-in user's email
    this.userEmail = localStorage.getItem("userEmail") || "No email found";
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

/* Different gradient backgrounds for variety */
.stats-card:nth-child(1) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.stats-card:nth-child(2) {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.stats-card:nth-child(3) {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.stats-card:nth-child(4) {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.stats-card:nth-child(5) {
  background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
}

.stats-card:nth-child(6) {
  background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
}

.stats-card:nth-child(7) {
  background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%);
}

.stats-card:nth-child(8) {
  background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
}

.stats-card:nth-child(9) {
  background: linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%);
}

.stats-card:nth-child(10) {
  background: linear-gradient(135deg, #fad0c4 0%, #ffd1ff 100%);
}

.stats-card:nth-child(11) {
  background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
}

.stats-card:nth-child(12) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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

/* Mobile Responsiveness */
@media (max-width: 768px) {
  .stats-cards-container {
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
    padding: 0 0.5rem;
  }
  
  .stats-card {
    padding: 1.5rem;
  }
  
  .card-value {
    font-size: 2rem;
  }
  
  .card-icon {
    font-size: 2.5rem;
  }
  
  .card-label {
    font-size: 0.8rem;
  }
}

@media (max-width: 480px) {
  .stats-cards-container {
    grid-template-columns: 1fr;
    gap: 1rem;
    padding: 0 0.5rem;
  }
  
  .stats-card {
    padding: 1.5rem;
  }
  
  .card-content {
    flex-direction: column;
    text-align: center;
  }
  
  .card-value {
    font-size: 1.8rem;
  }
  
  .card-icon {
    font-size: 2rem;
    margin-left: 0;
    margin-top: 0.5rem;
  }
  
  .card-label {
    font-size: 0.75rem;
    line-height: 1.3;
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

.stats-card:nth-child(1) { animation-delay: 0.1s; }
.stats-card:nth-child(2) { animation-delay: 0.15s; }
.stats-card:nth-child(3) { animation-delay: 0.2s; }
.stats-card:nth-child(4) { animation-delay: 0.25s; }
.stats-card:nth-child(5) { animation-delay: 0.3s; }
.stats-card:nth-child(6) { animation-delay: 0.35s; }
.stats-card:nth-child(7) { animation-delay: 0.4s; }
.stats-card:nth-child(8) { animation-delay: 0.45s; }
.stats-card:nth-child(9) { animation-delay: 0.5s; }
.stats-card:nth-child(10) { animation-delay: 0.55s; }
.stats-card:nth-child(11) { animation-delay: 0.6s; }
.stats-card:nth-child(12) { animation-delay: 0.65s; }
</style>