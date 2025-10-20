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
        <i class="ti ti-user-plus"></i> Approved seekers
      </h5>

      <!-- Loading Spinner -->
      <div v-if="isLoading" class="d-flex justify-content-center my-5">
        <div class="text-center">
          <div
            class="spinner-border text-primary"
            role="status"
            style="width: 3rem; height: 3rem;"
          >
            <span class="visually-hidden">Loading...</span>
          </div>
          <div class="mt-2">
            <p class="text-muted">Loading job seekers...</p>
          </div>
        </div>
      </div>

      <!-- Search Input -->
      <div class="d-flex justify-content-center mb-3" v-if="!isLoading">
        <input
          v-model="searchQuery"
          type="text"
          class="form-control"
          style="max-width: 500px"
          placeholder="Search by name, bio, province..."
        />
      </div>

      <!-- No Data Message -->
      <div v-if="!isLoading && jobs.length === 0" class="d-flex justify-content-center my-4">
        <div class="alert alert-danger text-center" style="width: 40rem;">
          No Approved seeker found.
        </div>
      </div>

      <!-- Table -->
      <div class="table-responsive" v-if="!isLoading && displayedJobs.length > 0">
        <table class="table table-bordered">
          <thead class="table-light">
            <tr>
              <th>ID</th>
              <th>NAMES</th>
              <th>SALARY EXPECTED</th>
              <th>SKILLS AND CAPABILITIES</th>
              <th>PROVINCE</th>
              <th>ACTION</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(approved, index) in displayedJobs" :key="approved.approved_id">
              <td>{{ (currentPage - 1) * perPage + index + 1 }}</td>
              <td>{{ approved.first_name }} {{ approved.last_name }}</td>
              <td>{{ approved.salary }}</td>
              <td>{{ approved.bio }}</td>
              <td>{{ approved.province }}</td>
              <td>
                <button class="btn btn-primary btn-sm" @click="goToMore(approved.users_id)">
                  More
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="d-flex flex-column align-items-center my-3" v-if="!isLoading && totalPages > 1">
        <nav aria-label="Page navigation">
          <ul class="pagination">
            <li :class="['page-item', { disabled: currentPage === 1 }]">
              <button class="page-link" @click="changePage(currentPage - 1)">Previous</button>
            </li>
            <li
              v-for="page in pagesToShow"
              :key="page"
              :class="['page-item', { active: currentPage === page }]"
            >
              <button class="page-link" @click="changePage(page)">{{ page }}</button>
            </li>
            <li :class="['page-item', { disabled: currentPage === totalPages }]">
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
        users_id: null,
        job_title: "",
        company: "",
        deadline_date: "",
        job_description: "",
        logo: "",
        location: "",
      },
      jobs: [],
      userEmail: "",
      userId: "",
      showModal: false,
      selectedAboutId: null,
      isSubmitting: false,
      isLoading: true, // show loading spinner on first load
      status: {
        success: false,
        message: "",
      },
      searchQuery: "",
      currentPage: 1,
      perPage: 20,
    };
  },

  computed: {
    displayedJobs() {
      const query = this.searchQuery.toLowerCase();
      const filtered = this.jobs.filter((job) => {
        return (
          job.first_name.toLowerCase().includes(query) ||
          job.last_name.toLowerCase().includes(query) ||
          job.bio.toLowerCase().includes(query) ||
          job.province.toLowerCase().includes(query)
        );
      });

      const start = (this.currentPage - 1) * this.perPage;
      return filtered.slice(start, start + this.perPage);
    },
    pagesToShow() {
      const total = this.totalPages;
      const current = this.currentPage;
      const delta = 2;
      const range = [];

      for (let i = Math.max(1, current - delta); i <= Math.min(total, current + delta); i++) {
        range.push(i);
      }

      return range;
    },
    totalPages() {
      const query = this.searchQuery.toLowerCase();
      const filteredCount = this.jobs.filter((job) => {
        return (
          job.first_name.toLowerCase().includes(query) ||
          job.last_name.toLowerCase().includes(query) ||
          job.bio.toLowerCase().includes(query) ||
          job.province.toLowerCase().includes(query)
        );
      }).length;

      return Math.ceil(filteredCount / this.perPage);
    },
  },

  watch: {
    searchQuery() {
      this.currentPage = 1;
    },
    jobs() {
      this.currentPage = 1;
    },
  },

  mounted() {
    this.userEmail = localStorage.getItem("userEmail") || "";
    if (this.userEmail) {
      this.getUserIdFromEmail();
    }
  },

  methods: {
    changePage(page) {
      if (page >= 1 && page <= this.totalPages) {
        this.currentPage = page;
      }
    },
    handleFileUpload(event) {
      this.form.logo = event.target.files[0];
    },
    async fetchJobsByUser() {
      this.isLoading = true;
      try {
        const token = localStorage.getItem("adminToken");
        if (!this.userId) return;
        const res = await fetch(`${globalVariable}/admin/approved_seekers`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) throw new Error("Failed to fetch jobs");
        const data = await res.json();
        this.jobs = data;
      } catch (err) {
        console.error("Error fetching jobs for user:", err);
      } finally {
        this.isLoading = false;
      }
    },
    goToMore(users_id) {
      this.$router.push({ name: "view-seekers", params: { id: users_id } });
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
