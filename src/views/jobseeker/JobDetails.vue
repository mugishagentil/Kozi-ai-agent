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
        <div class="row">
          <div id="about" class="section wb">
            <div v-if="userEmail" class="mx-4 mb-4">
        <!-- <p><strong>Your email:</strong> {{ userEmail }}</p>
        <p><strong>users_id:</strong> {{ userId }}</p> -->
      </div>
            <div class="container">
              <div v-if="job" class="job-details">
                <div class="section-title text-center">
                  <h3 style="font-family: 'Michroma';">{{ job.job_title }} - {{ job.location }}</h3>
                  <p class="lead" style="color: darkblue;">
                    <strong>Job Opportunity at: {{ job.company }}</strong> <br />
                    <strong>Published Date: {{ formatDate(job.published_date) }}</strong><br />
                    <strong>Application Deadline: {{ formatDate(job.deadline_date) }}</strong><br>
                     <!-- Salary Range: {{job.salary_min }} Rwf - {{job.salary_max}} Rwf  Monthly -->
                    
                  </p>
                </div>
                <div class="job-details">
                  <h4><strong>Company Overview</strong></h4>
                  <p v-html="job.job_description"></p>
                  <h4><strong>Requirements</strong></h4>
                  <p v-html="job.requirements" style="margin-left: 2rem;"></p>
                  <h4><strong>Responsabilities</strong></h4>
                  <p v-html="job.responsability" style="margin-left: 2rem;"></p>
                  <h4><strong>conclusion</strong></h4>
                  <p v-html="job.conclusion"></p>

                  
                </div>
                <button
                  class="custom-btn-apply"
                  @click="applyForJob"
                  :disabled="isApplying || !job?.job_id || !userId"
                >
                  {{ isApplying ? "Applying..." : "Apply for Job" }}
                </button><br><br>

                <div v-if="applyMessage" :class="['alert', applyStatusClass]" role="alert">
                  {{ applyMessage }}
                </div>

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


export default {
  components: {
    IndexComponent,
  },
  data() {
    return {
      job: null,
      isApplying: false,
      applyMessage: null,
      applyStatusClass: "",
      userEmail: null,
      userId: null,
    };
  },
  async mounted() {
    this.fetchJobDetails();
    this.getUserEmail();
    await this.fetchUserId();
  },
  methods: {
    async fetchJobDetails() {
      const jobId = this.$route.params.job_id;
      try {
        const token = localStorage.getItem("employeeToken");
        const response = await fetch(`${globalVariable}/admin/select_job/${jobId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();
        if (!response.ok) {
          console.error("Failed to fetch job:", data.message);
        } else {
          this.job = data;
        }
      } catch (error) {
        console.error("Error fetching job:", error);
      }
    },
    
    formatDate(dateStr) {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    },
    async applyForJob() {
  this.isApplying = true;
  this.applyMessage = null;

  try {
    const token = localStorage.getItem("employeeToken");
    const response = await fetch(`${globalVariable}/seeker/apply`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        job_id: this.job?.job_id,
        users_id: this.userId,
        user_email: this.userEmail,
        company: this.job?.company,
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      this.applyMessage = result.message || "Failed to apply.";
      this.applyStatusClass = "alert-danger";
    } else {
      this.applyMessage = result.message;
      this.applyStatusClass = "alert-success";
    }
  } catch (error) {
    console.error("Error applying for job:", error);
    this.applyMessage = "An error occurred while applying.";
    this.applyStatusClass = "text-danger";
  } finally {
    this.isApplying = false;
  }
},
    getUserEmail() {
      const token = localStorage.getItem("employeeToken");
      if (token) {
        const payload = token.split('.')[1];
        const decodedPayload = atob(payload);
        const parsedPayload = JSON.parse(decodedPayload);
        this.userEmail = parsedPayload.email;
      }
    },
    async fetchUserId() {
      const email = this.userEmail;
      const token = localStorage.getItem("employeeToken");

      if (email && token) {
        try {
          const response = await fetch(`${globalVariable}/get_user_id_by_email/${email}`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          const data = await response.json();
          if (response.ok) {
            this.userId = data.users_id;
          } else {
            console.error("Error fetching user ID:", data.message);
          }
        } catch (error) {
          console.error("Error fetching user ID:", error);
        }
      }
    },
  },
};
</script>

<style scoped>
.custom-btn-apply {
  background: #EA60A7;
  color: #fff;
  padding: 10px 15px;
  border: none;
  border-radius: 5px;
  font-size: 14px;
  cursor: pointer;
  margin-top: 20px;
  transition: background 0.3s ease;
}
.custom-btn-apply:hover {
  background: #fff;
  color: #EA60A7;
  border: 1px solid #EA60A7;
}
.text-success {
  color: green;
  margin-top: 10px;
}
.text-danger {
  color: red;
  margin-top: 10px;
}
</style>
