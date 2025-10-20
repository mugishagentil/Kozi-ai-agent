<template>
  <IndexComponent />
  <div class="page-wrapper" id="main-wrapper" data-layout="vertical" data-navbarbg="skin6"
    data-sidebartype="full" data-sidebar-description="fixed" data-header-description="fixed">
    <div class="body-wrapper">
      <!-- Modal -->
      <div v-if="showModal" class="modal-overlay">
        <div class="modal-content">
          <h5>Are you sure you want to delete this job?</h5>
          <div>
            <button class="btn btn-danger mt-3" @click="confirmDeleteJob">Yes, Delete</button>
            <button class="btn btn-cancel mt-3" style="background-color: teal; color: white;" @click="closeModal">Cancel</button>
          </div>
        </div>
      </div>

      <h5 class="card-title fw-semibold mb-4" style="color: #E960A6;">
        <i class="ti ti-user-plus"></i> Job Applicant
      </h5>

      <!-- Search Input -->
       <div class="d-flex justify-content-center mb-3">
        <input v-model="searchQuery" class="form-control" type="text" style="max-width: 400px" placeholder="Search by name, telephone or job title" />
      </div>

      <!-- Table -->
       <div v-if="filteredJobs.length === 0" class="d-flex justify-content-center my-4">
        <div class="alert alert-danger text-center" style="width: 40rem;">
          No Applicant.
        </div>
      </div>



      <div class="table-responsive" v-else>
        <table class="table table-bordered">
          <thead class="table-light">
            <tr>
              <th>Id</th>
              <th>Names</th>
              <th>Telephone</th>
              <th>Job Title</th>
              <th>Applied On</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(job, index) in paginatedJobs" :key="job.job_id">
              <td>{{ (currentPage - 1) * itemsPerPage + index + 1 }}</td>
              <td v-html="highlightMatch(job.first_name + ' ' + job.last_name)"></td>
              <td v-html="highlightMatch(job.telephone)"></td>
              <td v-html="highlightMatch(job.job_title)"></td>
              <td>{{ formatDateTime(job.created_at) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <!-- Pagination -->
<nav class="mt-3" v-if="filteredJobs.length > 0">
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
</template>

<script>
import IndexComponent from "./IndexComponent.vue";
import { globalVariable } from "@/global";

export default {
  name: "MainWrapper",
  components: { IndexComponent },
  data() {
    return {
      jobs: [],
      userEmail: "",
      userId: "",
      showModal: false,
      selectedJobId: null,
      searchQuery: "",
      currentPage: 1,
      itemsPerPage: 20,
    };
  },
  computed: {
    filteredJobs() {
      const query = this.searchQuery.toLowerCase();
      return this.jobs.filter((job) => {
        const fullName = `${job.first_name} ${job.last_name}`.toLowerCase();
        const telephone = job.telephone?.toLowerCase() || "";
        const title = job.job_title?.toLowerCase() || "";
        return (
          fullName.includes(query) ||
          telephone.includes(query) ||
          title.includes(query)
        );
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
    formatDateTime(datetime) {
      if (!datetime) return "";
      const date = new Date(datetime);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      let hours = date.getHours();
      const minutes = String(date.getMinutes()).padStart(2, "0");
      const seconds = String(date.getSeconds()).padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12;
      return `${year}-${month}-${day} ${String(hours).padStart(2, "0")}:${minutes}:${seconds} ${ampm}`;
    },
    changePage(page) {
      if (page >= 1 && page <= this.totalPages) {
        this.currentPage = page;
      }
    },
    highlightMatch(text) {
      if (!this.searchQuery) return text;
      const regex = new RegExp(`(${this.searchQuery})`, "gi");
      return text.replace(regex, `<span class="bg-warning text-dark">$1</span>`);
    },
    openModal(job_id) {
      this.selectedJobId = job_id;
      this.showModal = true;
    },
    closeModal() {
      this.showModal = false;
      this.selectedJobId = null;
    },
    async fetchJobsByUser() {
      try {
        const token = localStorage.getItem("adminToken");
        if (!this.userId) return;
        const res = await fetch(`${globalVariable}/admin/Applicants`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch jobs");
        const data = await res.json();
        this.jobs = data;
      } catch (err) {
        console.error("Error fetching jobs:", err);
      }
    },
    async getUserIdFromEmail() {
      const token = localStorage.getItem("adminToken");
      if (!token) return;
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        this.userEmail = this.userEmail || payload.email;
        const res = await fetch(`${globalVariable}/get_user_id_by_email/${this.userEmail}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) {
          this.userId = data.users_id;
          this.fetchJobsByUser();
        } else {
          console.error("Error: ", data.message);
        }
      } catch (err) {
        console.error("Error getting user ID:", err);
      }
    },
  },
};
</script>







<style scoped>

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
