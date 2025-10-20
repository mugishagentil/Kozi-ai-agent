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
    <div class="body-wrapper">
      <!-- Confirmation Modal -->
      <div v-if="showModal" class="modal-overlay">
        <div class="modal-content">
          <h5>Are you sure you want to delete this job?</h5>
          <div>
            <button class="btn btn-danger mt-3" @click="confirmDeleteJob">Yes, Delete</button>
            &nbsp;
            <button
              class="btn btn-cancel mt-3"
              style="background-color: teal; color: white;"
              @click="closeModal"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      <h5 class="card-title fw-semibold mb-4" style="color: #E960A6;">
        <i class="ti ti-user-plus"></i> Unpublished job
      </h5>
      <hr class="my-4" />
      <div class="d-flex justify-content-center mb-3">
     
        <div class="col-md-8">
          <input
            v-model="searchQuery"
            class="form-control"
            placeholder="Search by title or company"
          />
        </div>
        
     
      </div>

      <!-- Show message if no jobs -->
      <div v-if="filteredJobs.length === 0" class="d-flex justify-content-center my-4">
        <div class="alert alert-danger text-center" style="width: 40rem;">
          No jobs available yet.
        </div>
      </div>

      <!-- Show table and pagination only if jobs exist -->
      <div v-else>
        <div class="table-responsive">
          <table class="table table-bordered">
            <thead class="table-light">
              <tr>
                <th>Id</th>
                <th>Title</th>
                <th>Description</th>
                <th>Company</th>
                <th>Location</th>
                <th>Published</th>
                <th>Deadline</th>
                <th>Logo</th>
                <th>Publisher</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(job, index) in paginatedJobs"
                :key="job.job_id"
              >
                <td>{{ (currentPage - 1) * itemsPerPage + index + 1 }}</td>
                <td>{{ job.job_title }}</td>
                <td>
                  {{
                    job.job_description.length > 100
                      ? job.job_description.substring(0, 100) + "..."
                      : job.job_description
                  }}
                </td>
                <td>{{ job.company }}</td>
                <td>{{ job.location }}</td>
                <td>{{ job.published_date ? job.published_date.substring(0, 10) : "" }}</td>
                <td>{{ job.deadline_date ? job.deadline_date.substring(0, 10) : "" }}</td>
                <td>
                  <img
                    :src="uploadsUrl + job.logo"
                    alt="Logo"
                    class="custom-job-logo"
                    width="100"
                  />
                </td>
                <td>{{ job.first_name }} {{ job.last_name }}</td>
                <td>
                  <span :class="[getStatusLabel(job.status).colorClass, 'fw-bold']">
                    {{ getStatusLabel(job.status).text }}
                  </span>
                </td>
                <td>
                  <button
                    class="btn btn-primary btn-sm"
                    @click="goToMore(job.job_id)"
                  >
                    More
                  </button>
                  <button
                    class="btn btn-cancel btn-sm"
                    @click="openModal(job.job_id)" :disabled="!isAdmin"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <nav class="mt-3">
          <ul class="pagination justify-content-center">
            <li
              class="page-item"
              :class="{ disabled: currentPage === 1 }"
            >
              <button
                class="page-link"
                @click="changePage(currentPage - 1)"
              >
                Previous
              </button>
            </li>
            <li
              v-for="page in pagesToShow"
              :key="page"
              :class="['page-item', { active: currentPage === page }]"
            >
              <button
                class="page-link"
                @click="changePage(page)"
              >
                {{ page }}
              </button>
            </li>
            <li
              class="page-item"
              :class="{ disabled: currentPage === totalPages }"
            >
              <button
                class="page-link"
                @click="changePage(currentPage + 1)"
              >
                Next
              </button>
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
        job_id: null,
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
      selectedJobId: null,

      // Search, Filter & Pagination
      searchQuery: "",
      filterStatus: "",
      currentPage: 1,
      itemsPerPage: 20,
    };
  },
  computed: {
    isAdmin() {
    return this.userEmail.toLowerCase() === "admin@kozi.rw";
  },
    
    pagesToShow() {
      const total = this.totalPages;
      const current = this.currentPage;
      const delta = 2; 
      const range = [];

      for (
        let i = Math.max(1, current - delta);
        i <= Math.min(total, current + delta);
        i++
      ) {
        range.push(i);
      }

      return range;
    },
    filteredJobs() {
      return this.jobs.filter((job) => {
        const searchLower = this.searchQuery.toLowerCase();
        const matchesSearch =
          job.job_title.toLowerCase().includes(searchLower) ||
          job.company.toLowerCase().includes(searchLower) ||
          job.location.toLowerCase().includes(searchLower);

        const matchesStatus =
          this.filterStatus === ""
            ? true
            : String(job.status) === String(this.filterStatus);

        return matchesSearch && matchesStatus;
      });
    },
    totalPages() {
      return Math.ceil(this.filteredJobs.length / this.itemsPerPage) || 1;
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
    handleFileUpload(event) {
      this.form.logo = event.target.files[0];
    },
    openModal(job_id) {
      this.selectedJobId = job_id;
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
        const res = await fetch(
          `${globalVariable}/admin/delete_job/${this.selectedJobId}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const result = await res.json();

        if (res.ok) {
          this.status = {
            success: true,
            message: result.message || "Job deleted successfully.",
          };
          this.fetchJobsByUser();
        } else {
          this.status = {
            success: false,
            message: result.message || "Failed to delete job.",
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
        if (!this.userId) return;
        const res = await fetch(`${globalVariable}/admin/unpublished_jobs`, {
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
    async submitForm() {
      this.isSubmitting = true;
      this.status.message = "";

      try {
        const formData = new FormData();
        const today = new Date().toISOString().split("T")[0];

        formData.append("job_title", this.form.job_title);
        formData.append("company", this.form.company);
        formData.append("location", this.form.location);
        formData.append("job_description", this.form.job_description);
        formData.append("published_date", today);
        formData.append("deadline_date", this.form.deadline_date);
        formData.append("users_id", this.userId);
        if (this.form.logo && typeof this.form.logo !== "string") {
          formData.append("logo", this.form.logo);
        }

        const token = localStorage.getItem("adminToken");

        const url = this.form.job_id
          ? `${globalVariable}/admin/update_job/${this.form.job_id}`
          : `${globalVariable}/admin/add_jobs`;

        const method = this.form.job_id ? "PUT" : "POST";

        const response = await fetch(url, {
          method,
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        if (response.ok) {
          const result = await response.json();
          this.status = {
            success: true,
            message:
              result.message || (this.form.job_id ? "Job updated!" : "Job added!"),
          };

          this.form = {
            job_id: null,
            job_title: "",
            company: "",
            deadline_date: "",
            job_description: "",
            logo: "",
            location: "",
          };

          this.fetchJobsByUser();
        } else {
          const error = await response.text();
          this.status = {
            success: false,
            message: "Failed: " + error,
          };
        }
      } catch (err) {
        console.error("Error:", err);
        this.status = {
          success: false,
          message: "Unexpected error occurred.",
        };
      } finally {
        this.isSubmitting = false;
      }
    },
    goToMore(job_id) {
      this.$router.push({ name: "admin/job-details", params: { id: job_id } });
    },
    async getUserIdFromEmail() {
      const token = localStorage.getItem("adminToken");
      if (!token) return;

      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        if (!this.userEmail) {
          this.userEmail = payload.email;
        }

        const res = await fetch(
          `${globalVariable}/get_user_id_by_email/${this.userEmail}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
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
    getStatusLabel(status) {
      if (status === 0) {
        return { text: "Pending", colorClass: "text-danger" };
      } else if (status === 1) {
        return { text: "Approved", colorClass: "text-success" };
      } else {
        return { text: "Unknown", colorClass: "text-muted" };
      }
    },
    highlightMatch(text) {
      if (!this.searchQuery) return text;
      const regex = new RegExp(`(${this.searchQuery})`, "gi");
      return text.replace(regex, `<span class="highlight-teal">$1</span>`);
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
