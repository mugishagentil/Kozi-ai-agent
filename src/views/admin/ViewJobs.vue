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
      <div v-if="userEmail" class="card-body">
        <h5 class="text-center">Logged in as:</h5>
        <h6 class="text-center text-muted">{{ userEmail }}</h6>
        <p><strong>users_id:</strong> {{ userId }}</p>
      </div>
      <h5 class="card-title fw-semibold mb-4">
        {{ form.users_id ? "Update Job" : "Add Job" }}
      </h5>
      <hr class="my-4" />
      <h5 class="fw-semibold mb-3">Your Jobs</h5>
      <div v-if="jobs.length === 0" class="text-muted">No jobs available yet.</div>
      <div class="table-responsive">
        <table class="table table-bordered">
          <thead class="table-light">
            <tr>
                
              <th>ID</th>
              <th>JOB TITLE</th>
              <th>COMPANY LOGO</th>
              <th>DESCRIPTION</th>
              <th>PUBLISHED DATE</th>
              <th>DEADLINE DATE</th>
              <th>AUTHOR</th>
              <th>ACTION</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(job, index) in jobs" :key="job.users_id">
              <td>{{ index + 1 }}</td>
              <td>{{ job.job_title }} </td>
              <td>{{ job.logo }}</td>
              <td>{{ job.job_description }}</td>
              <td>{{ job.published_date? job.published_date.substring(0,10): '' }}</td>
              <td>{{ job.deadline_date ?job.deadline_date.substring(0,10): '' }}</td>
               <td>{{ job.first_name }}{{ job.last_name }} </td>


              
              <td>
  <div class="d-flex gap-2">
    <button class="btn btn-primary btn-sm" @click="goToEdit(job.users_id)">Edit</button>
    <button class="btn btn-cancel btn-sm" @click="goToMore(job.users_id)">More</button>
    
    <button class="btn btn-primary btn-sm" @click="confirmDelete(job.users_id)">Delete</button>
  </div>
</td>

            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <div v-if="showModal" class="modal-overlay">
        <div class="modal-content">
          <h5>Are you sure you want to delete this job job content?</h5>
          <div>
            <button class="btn btn-primary mt-3" @click="deleteAbout(selectedAboutId)">Yes, Delete</button>&nbsp;
            <button class="btn btn-cancel  mt-3" style="background-color: teal; color: white;" @click="closeModal">Cancel</button>
          </div>
        </div>
      </div>
</template>

<script>
import IndexComponent from "./IndexComponent.vue";
import { globalVariable } from "@/global";

export default {
  name: "MainWrapper",
  components: { IndexComponent },
  data() {
    return {
      uploadsUrl: globalVariable + "/uploads/logo/",
      form: {
        users_id: null,
        job_title: "",
        company: "",
        deadline_date: "",
        job_description: "",
        logo: "",
        location: "",
      },
      jobs: [],
      isSubmitting: false,
      status: {
        success: false,
        message: "",
      },
      userEmail: "",
      userId: "",
      showModal: false,
      selectedAboutId: null,
    };
  },
  mounted() {
    this.userEmail = localStorage.getItem("userEmail") || "";
    if (this.userEmail) {
      this.getUserIdFromEmail();
    }
  },
  methods: {
    handleFileUpload(event) {
      this.form.logo = event.target.files[0];
    },

    async fetchJobsByUser() {
      try {
        const token = localStorage.getItem("adminToken");
        if (!this.userId) return;
        const res = await fetch(`${globalVariable}/admin/select_jobs`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) throw new Error("Failed to fetch jobs");
        const data = await res.json();
        this.jobs = data;
      } catch (err) {
        console.error("Error fetching jobs for user:", err);
      }
    },

    goToEdit(job_id) {
  this.$router.push({ name: "edit-jobs", params: { id: job_id } });
},

goToMore(job_id) {
  this.$router.push({ name: "view-jobs", params: { id: job_id } });
},

    confirmDelete(id) {
      this.selectedAboutId = id;
      this.showModal = true;
    },

    closeModal() {
      this.showModal = false;
      this.selectedAboutId = null;
    },

    async deleteAbout(users_id) {
      const token = localStorage.getItem("adminToken");
      try {
        const res = await fetch(`${globalVariable}/admin/delete_job_job/${users_id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();
        if (res.ok) {
          this.jobs = this.jobs.filter(job => job.users_id !== users_id);
          this.status = {
            success: true,
            message: "Job deleted successfully.",
          };
        } else {
          this.status = {
            success: false,
            message: data.message || "Failed to delete job.",
          };
        }
      } catch (err) {
        console.error("Error deleting job:", err);
        this.status = {
          success: false,
          message: "An error occurred while deleting.",
        };
      } finally {
        this.closeModal();
      }
    },

    async getUserIdFromEmail() {
      const token = localStorage.getItem("adminToken");
      if (!token) return;
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        if (!this.userEmail) {
          this.userEmail = payload.email;
        }
        const res = await fetch(`${globalVariable}/get_user_id_by_email/${this.userEmail}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) {
          this.userId = data.users_id;
          this.fetchJobsByUser(); 
        } else {
          this.status = {
            success: false,
            message: data.message || "Unable to get user ID.",
          };
        }
      } catch (err) {
        console.error("Error getting users_id:", err);
        this.status = {
          success: false,
          message: "Failed to fetch user ID.",
        };
      }
    },
  },
};
</script>

<style scoped>
      .modal-overlay {
         position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        
        /* Modal content styling */
        .modal-content {
          background-color: white;
          padding: 20px;
          border-radius: 8px;
          text-align: center;
          width: 300px;
        }
      
        .container-fluid {
          max-width: 800px;
          margin: auto;
          padding: 20px;
          background-color: #ffffff;
          border-radius: 8px;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
        }
        
        h5 {
          color: #333;
          margin-bottom: 20px;
        }
        .custom-select {
          width: 100%;
          padding: 15px;
          height: 50px;
          border: 1px solid #ccc;
          border-radius: 5px;
          box-sizing: border-box;
          transition: border-color 0.3s, box-shadow 0.3s;
          font-size: 16px;
    
        }
        .form-control {
          width: 100%;
          padding: 15px;
          height: 50px;
          border: 1px solid #ccc;
          border-radius: 5px;
          box-sizing: border-box;
          transition: border-color 0.3s, box-shadow 0.3s;
          font-size: 16px;
        }
        
        .form-control:focus {
          border-color: #E960A6;
          box-shadow: 0 0 5px rgba(0, 123, 255, 0.5);
          outline: none;
        }
        
        .form-label {
          font-weight: bold;
          margin-bottom: 5px;
          display: block;
        }
        
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
          background-color: teal ;
          color: #E960A6;
        }
        
        .form-group {
          margin-bottom: 15px;
        }
        
        </style>
