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
      <!-- <div v-if="userEmail" class="card-body">
        <h5 class="text-center">Logged in as:</h5>
        <h6 class="text-center text-muted">{{ userEmail }}</h6>
        <p><strong>users_id:</strong> {{ userId }}</p>
      </div> -->

      <h5 class="card-title fw-semibold mb-4" style="color: #E960A6;">
        <i class="ti ti-user-plus"></i> Register New Job
      </h5>

      <form class="mx-4" @submit.prevent="submitForm">
        <div
          v-if="status.message"
          :class="['alert mt-3', status.success ? 'alert-success' : 'alert-danger']"
        >
          {{ status.message }}
        </div>

        <div class="form-group row">
          <div class="col-md-6">
            <label class="form-label">Job Title</label>
            <input type="text" v-model="form.job_title" class="form-control" required />
          </div>
          <div class="col-md-6">
            <label class="form-label">Company Name</label>
            <input type="text" v-model="form.company" class="form-control" required />
          </div>
        </div>

        <div class="form-group row">

          <div class="col-md-6">
          <label class="form-label">Working Mode</label>
          <select v-model="form.location" class="form-control"  required>
          <option value="" disabled>Choose Mode</option>
          <option value="Remote">Remote</option>
          <option value="Full Time">Full Time</option>
          </select>
          </div>

          
          <div class="col-md-6">
            <label class="form-label">Deadline Date</label>
            <input type="date" v-model="form.deadline_date" class="form-control" required />
          </div>
        </div>

        <div class="form-group row">
          <div class="col-md-6">
            <label class="form-label">Category</label>
            <select v-model="selectedCategoryId" class="form-control" style="height: 48px; padding-top: 8px; padding-bottom: 8px;" required>
              <option value="">Select a category</option>
              <option
                v-for="category in categories"
                :key="category.id"
                :value="category.id"
              >
                {{ category.name }}
              </option>
            </select>
          </div>

          <div class="col-md-6">
            <label class="form-label">Logo</label>
            <div v-if="form.logo && typeof form.logo === 'string'" class="mb-2">
              <img :src="uploadsUrl + form.logo" alt="Current Logo" class="custom-job-logo" width="150" />
            </div>
            <input type="file" @change="handleFileUpload" class="form-control" />
          </div>
        </div>

        <div class="form-group row">
          <div class="col-md-12">
            <label class="form-label">Job Description</label>
            <textarea
              v-model="form.job_description"
              class="form-control"
              style="height: 100px;"
              required
            ></textarea>
          </div>
        </div>
        <div class="form-group row">
          <div class="col-md-12">
            <label class="form-label">Requirements</label>
            <textarea
              v-model="form.requirements"
              class="form-control"
              style="height: 100px;"
              required
            ></textarea>
          </div>
        </div>
        <div class="form-group row">
          <div class="col-md-12">
            <label class="form-label">Responsability</label>
            <textarea
              v-model="form.responsability"
              class="form-control"
              style="height: 100px;"
              required
            ></textarea>
          </div>
        </div>
        <div class="form-group row">
          <div class="col-md-6">
            <label class="form-label">Salary-Min</label>
            <input type="number" v-model="form.salary_min" class="form-control" required />
          </div>
          <div class="col-md-6">
            <label class="form-label">Salary-max</label>
            <input type="number" v-model="form.salary_max" class="form-control" required />
          </div>
        </div>
        <div class="form-group row">
          <div class="col-md-12">
            <label class="form-label">Conclusion</label>
            <textarea
              v-model="form.conclusion"
              class="form-control"
              style="height: 100px;"
              required
            ></textarea>
          </div>
        </div>

        <button type="submit" class="btn btn-primary mt-3" :disabled="isSubmitting">
          <span
            v-if="isSubmitting"
            class="spinner-border spinner-border-sm me-2"
            role="status"
            aria-hidden="true"
          ></span>
          {{ isSubmitting ? "Submitting..." : form.job_id ? "Update Job" : "Submit Job" }}
        </button>
      </form>

      <!-- Confirmation Modal -->
      <div v-if="showModal" class="modal-overlay">
        <div class="modal-content">
          <h5>Are you sure you want to delete this job?</h5>
          <div>
            <button class="btn btn-danger mt-3" @click="confirmDeleteJob">Yes, Delete</button>
            &nbsp;
            <button class="btn btn-cancel mt-3" style="background-color: teal; color: white;" @click="closeModal">
              Cancel
            </button>
          </div>
        </div>
      </div>

      <hr class="my-4" />
      <h5 class="fw-semibold mb-3">Your Jobs</h5>

      <!-- Search and Filter -->
      <div class="row mb-3 mx-4">
        <div class="col-md-8">
          <input v-model="searchQuery" class="form-control" placeholder="Search by title, company or location" />
        </div>
        <div class="col-md-4">
          <select v-model="filterStatus" class="form-control">
            <option value="">All Statuses</option>
            <option value="1">Approved</option>
            <option value="0">Pending</option>
          </select>
        </div>
      </div>
      <div v-if="filteredJobs.length === 0" class="text-muted px-4">.</div>
      <div v-if="filteredJobs.length === 0" class="d-flex justify-content-center my-4">
        <div class="btn btn-danger text-center" style="width: 40rem;">
          No jobs available yet.
        </div>
      </div>

      <div class="table-responsive" v-else>
        <table class="table table-bordered">
          <thead class="table-light">
            <tr>
              <th>Id</th>
              <th>Title</th>
              <th>Description</th>
              <th>Requirements</th>
              <th>Responsability</th>
              <th>salary-min</th>
              <th>salary-max</th>
              <th>Company</th>
              <th>Location</th>
              <th>Category</th>
              <th>Published</th>
              <th>Deadline</th>
              <th>Conclusion</th>
              <th>Logo</th>
              <th>Publisher</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(job, index) in paginatedJobs" :key="job.job_id">
              <td>{{ (currentPage - 1) * itemsPerPage + index + 1 }}</td>
              <td v-html="highlightMatch(job.job_title)"></td>
              <td>
                {{ job.job_description.length > 100 ? job.job_description.substring(0, 100) + "..." : job.job_description }}
              </td>
              <td>
                {{ job.requirements.length > 100 ? job.requirements.substring(0, 100) + "..." : job.requirements }}
              </td>
              <td>
                {{ job.responsability.length > 100 ? job.responsability.substring(0, 100) + "..." : job.responsability }}
              </td>
              <td v-html="highlightMatch(job.salary_min)"></td>
              <td v-html="highlightMatch(job.salary_max)"></td>
              <td v-html="highlightMatch(job.company)"></td>
              <td v-html="highlightMatch(job.location)"></td>
              <td>{{ getCategoryName(job.category_id) }}</td>
              <td>{{ job.published_date ? job.published_date.substring(0, 10) : "" }}</td>
              <td>{{ job.deadline_date ? job.deadline_date.substring(0, 10) : "" }}</td>
              <td>
                {{ job.conclusion.length > 100 ? job.conclusion.substring(0, 100) + "..." : job.conclusion }}
              </td>
              <td>
                <img :src="uploadsUrl + job.logo" alt="Logo" class="custom-job-logo" width="100" />
              </td>
              <td>{{ job.first_name }} {{ job.last_name }}</td>
              <td>
                <span :class="[getStatusLabel(job.status).colorClass, 'fw-bold']">
                  {{ getStatusLabel(job.status).text }}
                </span>
              </td>
              <td>
                <button class="btn btn-primary btn-sm" @click="editJob(job)" :disabled="!isAdmin">Edit</button>
                <button class="btn btn-cancel btn-sm" @click="goToMore(job.job_id)">More</button>
                <button class="btn btn-primary btn-sm" @click="openModal(job.job_id)" :disabled="!isAdmin">Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <nav class="mt-3" v-if="totalPages > 1">
        <ul class="pagination justify-content-center">
          <li class="page-item" :class="{ disabled: currentPage === 1 }">
            <button class="page-link" @click="changePage(currentPage - 1)">Previous</button>
          </li>
          <li
            v-for="page in pagesToShow"
            :key="page"
            :class="['page-item', { active: currentPage === page }]"
          >
            <button class="page-link" @click="changePage(page)">{{ page }}</button>
          </li>
          <li class="page-item" :class="{ disabled: currentPage === totalPages }">
            <button class="page-link" @click="changePage(currentPage + 1)">Next</button>
          </li>
        </ul>
      </nav>
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
        requirements: "",
        responsability: "",
        salary_min: "",
        salary_max: "",
        conclusion: "",
        logo: "",
        location: "",
        category_id: null,
      },
      jobs: [],
      isSubmitting: false,
      categories: [],
      categoryNames: {},
      selectedCategoryId: null,
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
      itemsPerPage: 10,
    };
  },
  computed: {
    isAdmin() {
    return this.userEmail.toLowerCase() === "admin@kozi.rw";
  },
    pagesToShow() {
      const total = this.totalPages;
      const current = this.currentPage;
      const delta = 2; // how many pages to show before and after current
      const range = [];

      for (let i = Math.max(1, current - delta); i <= Math.min(total, current + delta); i++) {
        range.push(i);
      }

      return range;
    },
    filteredJobs() {
      const query = this.searchQuery.toLowerCase();
      return this.jobs.filter((job) => {
        const title = (job.job_title || "").toLowerCase();
        const company = (job.company || "").toLowerCase();
        const location = (job.location || "").toLowerCase();

        const matchesSearch =
          title.includes(query) || company.includes(query) || location.includes(query);

        const matchesStatus =
          this.filterStatus === ""
            ? true
            : String(job.status) === String(this.filterStatus);

        return matchesSearch && matchesStatus;
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
    this.fetchCategories(); // Fetch categories on mount
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
    async fetchCategories() {
      try {
        const token = localStorage.getItem("adminToken");
        const response = await fetch(`${globalVariable}/name_and_id`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();
        if (response.ok) {
          this.categories = data;
          data.forEach(category => {
            this.categoryNames[category.id] = category.name;
          });
        } else {
          console.error("Failed to load categories:", data.message);
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    },
    async fetchCategoryNameByUserId() {
      try {
        const res = await fetch(`${globalVariable}/category/${this.userId}`);
        const data = await res.json();
        if (res.ok && data.name) {
          this.categoryName = data.name;
        } else {
          this.categoryName = "Unknown";
        }
      } catch (error) {
        console.error("Failed to fetch category name:", error);
        this.categoryName = "Error fetching category";
      }
    },
    getCategoryName(categoryId) {
      return this.categoryNames[categoryId] || "Unknown";
    },
    async confirmDeleteJob() {
      const token = localStorage.getItem("adminToken");

      try {
        const res = await fetch(`${globalVariable}/admin/delete_job/${this.selectedJobId}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

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
        const res = await fetch(`${globalVariable}/admin/select_jobs`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) throw new Error("Failed to fetch jobs");
        const data = await res.json();
        this.jobs = data;
        console.log("Jobs loaded:", this.jobs);
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
        formData.append("requirements", this.form.requirements);
        formData.append("responsability", this.form.responsability);
        formData.append("salary_min", this.form.salary_min);
        formData.append("salary_max", this.form.salary_max);
        formData.append("conclusion", this.form.conclusion);
        formData.append("published_date", today);
        formData.append("deadline_date", this.form.deadline_date);
        formData.append("users_id", this.userId);
        formData.append("category_id", this.selectedCategoryId); // Add category_id to form data
        
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
            message: result.message || (this.form.job_id ? "Job updated!" : "Job added!"),
          };

          // Reset form
          this.form = {
            job_id: null,
            job_title: "",
            company: "",
            deadline_date: "",
            job_description: "",
            requirements: "",
            responsability: "",
            salary_max: "",
            salary_min: "",
            conclusion: "",
            logo: "",
            location: "",
            category_id: null,
          };
          this.selectedCategoryId = null;

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
    editJob(job) {
      const deadlineDate = job.deadline_date
        ? new Date(job.deadline_date).toISOString().split("T")[0]
        : "";

      this.form = {
        job_id: job.job_id,
        job_title: job.job_title,
        company: job.company,
        deadline_date: deadlineDate,
        job_description: job.job_description,
        requirements: job.requirements,
        responsability: job.responsability,
        salary_min: job.salary_min,
        salary_max: job.salary_max,
        conclusion:job.conclusion,
        logo: job.logo,
        location: job.location,
        category_id: job.category_id,
      };
      
      // Set the selected category for the dropdown
      this.selectedCategoryId = job.category_id;
      
      window.scrollTo({ top: 0, behavior: "smooth" });
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
  if (text === null || text === undefined) return "";
  const str = String(text); // convert to string
  if (!this.searchQuery) return str;
  const regex = new RegExp(`(${this.searchQuery})`, "gi");
  return str.replace(regex, `<span class="highlight-teal">$1</span>`);
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