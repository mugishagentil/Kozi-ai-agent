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
        <!-- Page Heading -->
        <div class="row mt-4">
             <h3 class="card-title fw-semibold mb-4" style="color: #E960A6;"><i class="fa-solid fa-spinner"></i>   Application Status & Benefits of Kozi Caretakers</h3>
        </div>

        <div class="row">
          <!-- Benefits Section -->
          <div class="col-md-6 other-div3">
            <h2 style="color:#5F9EA0">Benefits of Kozi Caretakers</h2>
            <ul><br>
              <li style="text-align: justify;">Wide Range of Opportunities: Discover diverse job listings tailored to your skills.</li><br>
              <li style="text-align: justify;">Continuous Skill Enhancement: Engage in training programs to sharpen your skills.</li><br>
              <li style="text-align: justify;">Community Support: Connect with a supportive community of fellow job seekers.</li><br>
              <li style="text-align: justify;">Exclusive Access: Gain access to exclusive job listings for Kozi Caretaker members.</li><br>
              <li style="text-align: justify;">Thank you for choosing Kozi Caretakers. Together, we're transforming lives.</li><br>
            </ul>
          </div>
          <!-- Progress Section -->
          <div class="col-md-6 other-div3">
            <h2 style="color:#5F9EA0">Application Status Update</h2>
            <div class="progress" style="height: 30px;">
              <div
                class="progress-bar"
                role="progressbar"
                :style="{ width: progress + '%' }"
                :aria-valuenow="progress"
                aria-valuemin="0"
                aria-valuemax="100"
              >
                {{ progress }}%
              </div>
            </div>

            <br />
            <strong> Step 1: Initial Sign-up:</strong> Start your journey with us! Your application status begins at 36%. Sign up and create your profile.<br><br>
            <strong> Step 2: Complete Your Profile:</strong> Update your information and complete your profile details to increase your status to 66%. Provide accurate information to enhance your job opportunities.<br><br>
            <strong>Step 3: Get Recruited:</strong> Congratulations! Once recruited, your application status reaches 100%. You are now part of our team and ready to begin your new role.<br><br>
            <strong>Step 4: Start Working:</strong> Begin working and making a difference! Your journey with us starts here. Dive into your responsibilities and contribute to our community.<br><br>
            <span style="font-size: 14px;">Track your progress and take the next step in your career journey with us!</span>
          </div>
        </div>

        <!-- Applied Jobs Section -->
        <div class="row mt-4">
          <h3 style="text-align:center;color:#5F9EA0; font-family:'Michroma', sans-serif;">
            Where I Have Applied
          </h3>
          <hr style="margin: 20px auto;border: 0;height: 1px;width: 50%;background: #EA60A7;">
        </div>

        <div class="row">
          <div class="col-md-12">
            <div class="applied-jobs" v-if="appliedJobs.length > 0">
              <div class="job-card" v-for="job in appliedJobs" :key="job.job_id">
                
                <h4 class="job-title">{{ job.job_title }}<span> at {{ job.company }} </span></h4>
                <strong>Status:</strong>
                    <span :class="job.status === 'Pending' ? 'status-pending' : 'status-expired'">
                      {{ job.status }}
                    </span>
                
              </div>
            </div>
            <p v-else class="no-jobs-message">You haven’t applied to any jobs yet.</p>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script>
import IndexComponent from "./IndexComponent.vue";

import { globalVariable } from "@/global";

export default {
  name: "WelcomeComponent",
  components: {
    IndexComponent,

  },
  data() {
    return {
      userEmail: "",
      userId: null,
      progress: 0,
      appliedJobs: [],
    };
  },
  mounted() {
    this.getUserEmailAndProgress();
  },
  methods: {
    async getUserEmailAndProgress() {
      const token = localStorage.getItem("employeeToken");
      if (!token) return;

      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        this.userEmail = payload.email;

        const res = await fetch(`${globalVariable}/get_user_id_by_email/${this.userEmail}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();
        if (res.ok) {
          this.userId = data.users_id;
          this.getProgress(this.userId);
          this.getAppliedJobs(this.userId);
        } else {
          console.error("Failed to get users_id from email:", data.message);
        }
      } catch (err) {
        console.error("Error decoding token or fetching user ID:", err);
      }
    },

    async getProgress(usersId) {
      try {
        const res = await fetch(`${globalVariable}/progress/${usersId}`);
        const data = await res.json();
        if (res.ok) {
          this.progress = Math.round(data.progress);
        } else {
          console.error("Progress fetch failed:", data.message);
        }
      } catch (error) {
        console.error("Error fetching progress:", error);
      }
    },

    async getAppliedJobs(usersId) {
      try {
        const res = await fetch(`${globalVariable}/applied_jobs/${usersId}`);
        const data = await res.json();
        if (res.ok) {
          this.appliedJobs = data.map(job => {
            const deadline = new Date(job.deadline_date);
            const now = new Date();
            job.status = deadline > now ? "Pending" : "Expired";
            return job;
          });
        } else {
          console.error("Failed to fetch applied jobs:", data.message);
        }
      } catch (error) {
        console.error("Error fetching applied jobs:", error);
      }
    },
  },
};
</script>

<style scoped>
.other-div3 {
  margin-bottom: 30px;
}

.applied-jobs {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.job-card {
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-left: 6px solid #5F9EA0;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.06);
  transition: transform 0.2s ease;
}

.job-card:hover {
  transform: translateY(-4px);
}
.status-pending {
  color: green;
  font-weight: bold;
}
.status-expired {
  color: red;
  font-weight: bold;
}

.job-title {
  color: #EA60A7;
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 10px;
}

.job-description {
  font-size: 15px;
  color: #333;
  margin-bottom: 8px;
  text-align: justify;
}

.job-location {
  font-size: 14px;
  color: #666;
}

.no-jobs-message {
  text-align: center;
  color: #999;
  margin-top: 20px;
}

  .progress {
            width: 100%;
            max-width: 400px;
            border: 1px solid #ccc;
            border-radius: 5px;
            overflow: hidden;
        }
        .progress-bar {
            width:20px;
            background-color: teal;
            color: white;
            text-align: center;
            padding: 7px 0;
            box-sizing: border-box;
        }
        .company-logo {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            margin-right: 20px;
        }

        .row {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
        }
        .other-div1, .other-div2 {
            flex: 1 1 100%;
        }
        @media (min-width: 768px) {
            .other-div1, .other-div2 {
                flex: 1 1 calc(50% - 10px);
            }
        }
        .other-div3 {
            width: 48%;
            background-color: #fff;
            box-shadow: 0px 0px 10px 0px rgba(0, 0, 0, 0.5);
            border-radius: 10px;
            margin-bottom: 1rem;
            padding: 1rem;
            box-sizing: border-box;
        }
        @media (max-width: 768px) {
            .other-div3 {
                width: 100%;
            }
        }
  </style>
  