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
      <h5 class="card-title fw-semibold mb-4" style="color: #E960A6;">
        <i class="ti ti-user-plus"></i> Hired Seekers
      </h5>

      <div class="row mb-3">
        <div class="d-flex justify-content-center mb-3">
        <div class="col-md-6">
          <input
            type="text"
            v-model="searchQuery"
            class="form-control"
            placeholder="Search by seeker or provider name"
          />
        </div>
        </div>
      </div>

      <!-- Loading Spinner -->
      <div v-if="isLoading" class="d-flex justify-content-center my-5">
        <div class="text-center">
          <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
            <span class="visually-hidden">Loading...</span>
          </div>
          <div class="mt-2">
            <p class="text-muted">Loading hired seekers...</p>
          </div>
        </div>
      </div>
     
      <div v-else-if="filteredJobs.length === 0" class="d-flex justify-content-center my-4">
        <div class="alert alert-danger text-center" style="width: 40rem;">
          No Hired Seeker
        </div>
      </div>
      
      <div class="table-responsive" v-if="!isLoading && filteredJobs.length > 0">
        <table class="table table-bordered">
          <thead class="table-light">
            <tr>
              <th>ID</th>
              <th>SEEKER'S NAME</th>
              <th>PROVIDER'S NAME</th>
              <th>WHEN NEED WORKER</th>
              <th>WORKING MODE</th>
              <th>ACCOMMODATION PREFERENCES</th>
              <th>JOB DESCRIPTIONS</th>
              <th>DATE</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(hired, index) in paginatedJobs" :key="hired.hired_id">
              <td>{{ (currentPage - 1) * itemsPerPage + index + 1 }}</td>
              <td>{{ hired.seeker_first_name }} {{ hired.seeker_last_name }}</td>
              <td>{{ hired.provider_first_name }} {{ hired.provider_last_name }}</td>
              <td>{{ hired.when_need_worker }}</td>
              <td>{{ hired.working_mode }}</td>
              <td>{{ hired.accommodation_preference }}</td>
              <td>
                <span v-if="expandedRows.has(hired.hired_id)">
                  {{ hired.job_description }}
                  <button class="btn btn-link btn-sm p-0" @click="toggleDescription(hired.hired_id)">Less</button>
                </span>
                <span v-else>
                  {{ hired.job_description.slice(0, 50) }}<span v-if="hired.job_description.length > 50">...</span>
                  <button
                    v-if="hired.job_description.length > 50"
                    class="btn btn-link btn-sm p-0"
                    @click="toggleDescription(hired.hired_id)"
                  >
                    More
                  </button>
                </span>
              </td>
              <td>{{ hired.date ? hired.date.substring(0, 10) : '' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="d-flex justify-content-center mt-4" v-if="!isLoading && totalPages > 1">
        <nav>
          <ul class="pagination">
            <li class="page-item" :class="{ disabled: currentPage === 1 }">
              <button class="page-link" @click="goToPage(currentPage - 1)">Previous</button>
            </li>

            <li
              v-for="page in visiblePageNumbers"
              :key="page"
              class="page-item"
              :class="{ active: page === currentPage }"
            >
              <button class="page-link" @click="goToPage(page)">{{ page }}</button>
            </li>

            <li class="page-item" :class="{ disabled: currentPage === totalPages }">
              <button class="page-link" @click="goToPage(currentPage + 1)">Next</button>
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
      jobs: [],
      searchQuery: "",
      currentPage: 1,
      itemsPerPage: 20,
      userEmail: "",
      userId: "",
      isLoading: true, // Main loading state
      status: {
        success: false,
        message: "",
      },
      expandedRows: new Set(),
    };
  },
  computed: {
    filteredJobs() {
      const query = this.searchQuery.toLowerCase();
      return this.jobs.filter((job) => {
        const seeker = `${job.seeker_first_name} ${job.seeker_last_name}`.toLowerCase();
        const provider = `${job.provider_first_name} ${job.provider_last_name}`.toLowerCase();
          const when_need_worker = (job.when_need_worker || '').toLowerCase();
          const working_mode = (job.working_mode || '').toLowerCase();
          const accommodation_preference = (job.accommodation_preference || '').toLowerCase();

        return seeker.includes(query) || provider.includes(query)|| when_need_worker.includes(query) || working_mode.includes(query) ||accommodation_preference.includes(query) ;
      });
    },
    paginatedJobs() {
      const start = (this.currentPage - 1) * this.itemsPerPage;
      const end = start + this.itemsPerPage;
      return this.filteredJobs.slice(start, end);
    },
    totalPages() {
      return Math.ceil(this.filteredJobs.length / this.itemsPerPage);
    },
    visiblePageNumbers() {
      const maxPagesToShow = 5;
      const pages = [];

      let start = Math.max(this.currentPage - Math.floor(maxPagesToShow / 2), 1);
      let end = start + maxPagesToShow - 1;

      if (end > this.totalPages) {
        end = this.totalPages;
        start = Math.max(end - maxPagesToShow + 1, 1);
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      return pages;
    },
  },
  watch: {
    searchQuery() {
      this.currentPage = 1;
    },
  },
  async mounted() {
    this.userEmail = localStorage.getItem("userEmail") || "";
    
    try {
      if (this.userEmail) {
        await this.getUserIdFromEmail();
      }
    } catch (error) {
      console.error("Error during initialization:", error);
    } finally {
      this.isLoading = false;
    }
  },
  methods: {
    goToPage(page) {
      if (page >= 1 && page <= this.totalPages) {
        this.currentPage = page;
      }
    },
    
    async fetchJobsByUser() {
      try {
        this.isLoading = true;
        const token = localStorage.getItem("adminToken");
        if (!this.userId) return;
        
        const res = await fetch(`${globalVariable}/admin/hired_seekers`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        if (!res.ok) throw new Error("Failed to fetch jobs");
        const data = await res.json();
        this.jobs = data;
      } catch (err) {
        console.error("Error fetching jobs for user:", err);
        this.status = {
          success: false,
          message: "Failed to load hired seekers. Please try again.",
        };
      } finally {
        this.isLoading = false;
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
          await this.fetchJobsByUser();
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
    
    toggleDescription(id) {
      if (this.expandedRows.has(id)) {
        this.expandedRows.delete(id);
      } else {
        this.expandedRows.add(id);
      }
    },
  },
};
</script>

<style scoped>
.spinner-border-sm {
  width: 1rem;
  height: 1rem;
}




.btn-link {
  color: #E960A6;
  text-decoration: none;
}
.btn-link:hover {
  text-decoration: underline;
}

.pagination {
  display: flex;
  justify-content: center;
  gap: 0.3rem;
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
