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
    <div class="body-wrapper" style="margin-top: -3rem;">
    
      <div class="container-fluid">
        <div class="row">
          <div id="about" class="section wb">
            <!-- <div class="card-body">
        <h5 class="text-center">Logged in as:</h5>
        <h6 class="text-center text-muted">{{ userEmail }}</h6>
        <p><strong>jobid ID from URL:</strong> {{ jobIdurl }}</p>
      </div> -->
            <div class="container">
              <div v-if="job" class="job-details">
                <div class="section-title text-center">
                  <h2 style="font-family: 'Michroma';">{{ job.job_title }} - {{ job.location }}</h2>
                  <p class="lead" style="color: darkblue;">
                    <strong>Job Opportunity at: {{ job.company }}</strong> <br />
                    <strong>Published Date: {{ formatDate(job.published_date) }}</strong><br />
                    
                  Salary Range: {{job.salary_min }} Rwf - {{job.salary_max}} Rwf  Monthly

                    
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

                </div><div class="text-center mt-4" v-if="job">
                  <button
                   v-if="job.status === 0"
                    @click="publishJob"
                     class="btn btn-primary"
                     >
                     Publish
                    </button>
                    <button
                    v-else-if="job.status === 1"
                     @click="unpublishJob"
                     class="btn btn-cancel"
                     >
                     Unpublish
                    </button>
                  </div>
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
      jobIdurl: null,
    };
  },
  async mounted() {
    this.jobIdurl = this.$route.params.id;
    this.fetchJobDetails();
    this.getUserEmail();
    await this.fetchUserId();
  },
  methods: {
    async fetchJobDetails() {
      
      try {
        const token = localStorage.getItem("adminToken");
        const response = await fetch(`${globalVariable}/admin/select_job/${this.jobIdurl}`, {
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

    getUserEmail() {
      const token = localStorage.getItem("adminToken");
      if (token) {
        const payload = token.split('.')[1];
        const decodedPayload = atob(payload);
        const parsedPayload = JSON.parse(decodedPayload);
        this.userEmail = parsedPayload.email;
      }
    },
    async fetchUserId() {
      const email = this.userEmail;
      const token = localStorage.getItem("adminToken");

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
    async publishJob() {
  try {
    const token = localStorage.getItem("adminToken");
    const response = await fetch(`${globalVariable}/admin/publish/${this.jobIdurl}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();
    if (response.ok) {
      this.job.status = 1;
      this.applyMessage = "Job published successfully.";
      this.applyStatusClass = "alert-success";
    } else {
      this.applyMessage = data.message || "Failed to publish job.";
      this.applyStatusClass = "alert-danger";
    }
  } catch (error) {
    this.applyMessage = "An error occurred while publishing the job.";
    this.applyStatusClass = "alert-danger";
    console.error("Error publishing job:", error);
  }
},

async unpublishJob() {
  try {
    const token = localStorage.getItem("adminToken");
    const response = await fetch(`${globalVariable}/admin/unpublish/${this.jobIdurl}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();
    if (response.ok) {
      this.job.status = 0;
      this.applyMessage = "Job unpublished successfully.";
      this.applyStatusClass = "alert-warning";
    } else {
      this.applyMessage = data.message || "Failed to unpublish job.";
      this.applyStatusClass = "alert-danger";
    }
  } catch (error) {
    this.applyMessage = "An error occurred while unpublishing the job.";
    this.applyStatusClass = "alert-danger";
    console.error("Error unpublishing job:", error);
  }
},



  },
};
</script>

<style scoped>

.btn-primary {
  background-color: #E960A6;
  color: white;
}

.btn-primary:hover {
  background-color: #E960A6;
  color: teal;
}

.btn-cancel {
  background-color: teal;
  color: white;
}

.btn-cancel:hover {
  background-color: teal;
  color: #E960A6;
}
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
