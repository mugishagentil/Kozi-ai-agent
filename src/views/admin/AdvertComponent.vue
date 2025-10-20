<template>
  <div>
    <IndexComponent />
    <div class="page-wrapper" id="main-wrapper" data-layout="vertical" data-navbarbg="skin6"
      data-sidebartype="full" data-sidebar-description="fixed" data-header-description="fixed">
      <div class="body-wrapper">
        <div v-if="userEmail" class="card-body"></div>

        <h5  class="card-title fw-semibold mb-4" style="color: #E960A6;">
          <i class="ti ti-briefcase"></i>
          {{ form.id ? "Update Advert" : "Add Advert" }}
        </h5>

        

        <form class="mx-4" @submit.prevent="submitForm">
          <div v-if="status.message" :class="['alert mt-3', status.success ? 'alert-success' : 'alert-danger']">
            {{ status.message }}
          </div>

          <div class="form-group row">
            <div class="col-md-6">
              <label class="form-label">Logo</label>
              <div v-if="form.logo && typeof form.logo === 'string'" class="mb-2">
                <img :src="uploadsUrl + form.logo" alt="Current Logo" class="custom-job-logo" width="150" />
              </div>
              <input type="file" @change="e => handleFileUpload(e, 'logo')" class="form-control" :required="!form.id" />
            </div>

            <div class="col-md-6">
              <label class="form-label">Mobile Ad</label>
              <div v-if="form.mobile_ad && typeof form.mobile_ad === 'string'" class="mb-2">
                <img :src="uploadsUrl + form.mobile_ad" alt="Current Mobile Ad" class="custom-job-logo" width="150" />
              </div>
              <input type="file" @change="e => handleFileUpload(e, 'mobile_ad')" class="form-control" :required="!form.id" />
            </div>
          </div>

          <div class="form-group row">
            <div class="col-md-12">
              <label class="form-label">Link</label>
              <input type="text" v-model="form.link" class="form-control">
            </div>
          </div>
          <button type="submit" class="btn btn-primary mt-3" :disabled="!isAdmin || isSubmitting">
            <span v-if="isSubmitting" class="spinner-border spinner-border-sm me-2" role="status"
              aria-hidden="true"></span>
            {{ isSubmitting ? "Submitting..." : form.id ? "Update Advert" : "Submit Advert" }}
          </button>
        </form>

        <!-- Confirmation Modal -->
        <div v-if="showModal" class="modal-overlay">
          <div class="modal-content">
            <h5>Are you sure you want to delete this advert?</h5>
            <div>
              <button class="btn btn-danger mt-3" @click="confirmDeleteJob">Yes, Delete</button>
              &nbsp;
              <button class="btn btn-cancel mt-3" style="background-color: teal; color: white;" @click="closeModal" >
                Cancel
              </button>
            </div>
          </div>
        </div>

        <hr class="my-4" />
        <h5 class="fw-semibold mb-3">Your Adverts</h5>

        <div v-if="filteredJobs.length === 0" class="text-muted px-4">No adverts available yet.</div>

        <div class="table-responsive">
          <table class="table table-bordered">
            <thead class="table-light">
              <tr>
                <th>Id</th>
                <th>Description</th>
                <th>Logo</th>
                <th>Mobile Ad</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(job, index) in paginatedJobs" :key="job.id">
                <td>{{ (currentPage - 1) * itemsPerPage + index + 1 }}</td>
                <td>{{ job.link }}</td>
                <td><img :src="uploadsUrl + job.logo" alt="Logo" class="custom-job-logo" width="100" /></td>
                <td><img :src="uploadsUrl + job.mobile_ad" alt="Mobile Ad" class="custom-job-logo" width="100" /></td>
                <td style="padding: 10px;">
                  <button class="btn btn-primary btn-sm me-2" @click="editJob(job)" :disabled="!isAdmin">Edit</button>
                  <button class="btn btn-cancel btn-sm" @click="openModal(job.id)" :disabled="!isAdmin">Delete</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <nav class="mt-3">
          <ul class="pagination justify-content-center">
            <li class="page-item" :class="{ disabled: currentPage === 1 }">
              <button class="page-link" @click="changePage(currentPage - 1)">Previous</button>
            </li>
            <li v-for="page in totalPages" :key="page" class="page-item" :class="{ active: currentPage === page }">
              <button class="page-link" @click="changePage(page)">{{ page }}</button>
            </li>
            <li class="page-item" :class="{ disabled: currentPage === totalPages }">
              <button class="page-link" @click="changePage(currentPage + 1)">Next</button>
            </li>
          </ul>
        </nav>
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
        id: null,
        link: "",
        logo: "",
        mobile_ad: "",
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
      selectedJobId: null,

      // Pagination
      searchQuery: "",
      currentPage: 1,
      itemsPerPage: 10,
    };
  },
  computed: {
    isAdmin() {
    return this.userEmail.toLowerCase() === "admin@kozi.rw";
  },
    filteredJobs() {
      return this.jobs.filter((job) => {
        return job.link?.toLowerCase().includes(this.searchQuery.toLowerCase());
      });
    },
    totalPages() {
      return Math.ceil(this.filteredJobs.length / this.itemsPerPage);
    },
    paginatedJobs() {
      const start = (this.currentPage - 1) * this.itemsPerPage;
      return this.filteredJobs.slice(start, start + this.itemsPerPage);
    },
  },
  mounted() {
    this.userEmail = localStorage.getItem("userEmail") || "";
    if (this.userEmail) {
      this.getUserIdFromEmail();
    }
  },
  methods: {
    handleFileUpload(event, type) {
      this.form[type] = event.target.files[0];
    },
    openModal(id) {
      this.selectedJobId = id;
      this.showModal = true;
    },
    closeModal() {
      this.showModal = false;
      this.selectedJobId = null;
    },
    changePage(page) {
      if (page >= 1 && page <= this.totalPages) {
        this.currentPage = page;
      }
    },
    async confirmDeleteJob() {
      const token = localStorage.getItem("adminToken");
      try {
        const res = await fetch(`${globalVariable}/admin/advert_delete/${this.selectedJobId}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const result = await res.json();

        if (res.ok) {
          this.status = {
            success: true,
            message: result.message || "Advert deleted successfully.",
          };
          this.fetchJobsByUser();
        } else {
          this.status = {
            success: false,
            message: result.message || "Failed to delete advert.",
          };
        }
      } catch (err) {
        console.error("Delete error:", err);
        this.status = {
          success: false,
          message: "Unexpected error occurred while deleting.",
        };
      } finally {
        this.closeModal();
      }
    },
    async fetchJobsByUser() {
      try {
        const token = localStorage.getItem("adminToken");
        const res = await fetch(`${globalVariable}/admin/select_advert`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch adverts");
        const data = await res.json();
        this.jobs = data;
      } catch (err) {
        console.error("Error fetching adverts:", err);
      }
    },
    async submitForm() {
      this.isSubmitting = true;
      this.status.message = "";

      try {
        const formData = new FormData();
        formData.append("link", this.form.link);
        if (this.form.logo && typeof this.form.logo !== "string") {
          formData.append("logo", this.form.logo);
        }
        if (this.form.mobile_ad && typeof this.form.mobile_ad !== "string") {
          formData.append("mobile_ad", this.form.mobile_ad);
        }

        const token = localStorage.getItem("adminToken");

        const url = this.form.id
          ? `${globalVariable}/admin/update_advert/${this.form.id}`
          : `${globalVariable}/admin/add_advert`;

        const method = this.form.id ? "PUT" : "POST";

        const response = await fetch(url, {
          method,
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        const result = await response.json();

        if (response.ok) {
          this.status = {
            success: true,
            message: result.message || (this.form.id ? "Advert updated!" : "Advert added!"),
          };

          this.form = { id: null, link: "", logo: "", mobile_ad: "" };
          this.fetchJobsByUser();
        } else {
          this.status = {
            success: false,
            message: result.message || "Failed to submit advert.",
          };
        }
      } catch (err) {
        console.error("Error submitting advert:", err);
        this.status = {
          success: false,
          message: "Unexpected error occurred.",
        };
      } finally {
        this.isSubmitting = false;
      }
    },
    editJob(job) {
      this.form = {
        id: job.id,
        link: job.link,
        logo: job.logo,
        mobile_ad: job.mobile_ad,
      };
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    async getUserIdFromEmail() {
      const token = localStorage.getItem("adminToken");
      if (!token) return;

      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        if (!this.userEmail) this.userEmail = payload.email;

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

.btn-cancel {
  background-color: teal;
  color: white;
}

.btn-cancel:hover {
  background-color: teal;
  color: #E960A6;
}
.page-item.active .page-link {
  background-color: #E960A6;
  color: white;
  border-color: #E960A6;
}

.page-link {
  border-radius: 4px;
  padding: 0.4rem 0.75rem;
  cursor: pointer;
  color:#336Cb6
}
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
        
.highlight-teal {
  background-color: #20c997;
  color: white;
  padding: 0 2px;
  border-radius: 3px;
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
        
        .form-group {
          margin-bottom: 15px;
        }
        
        </style>
