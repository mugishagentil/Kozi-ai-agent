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
      <h5 class="card-title fw-semibold mb-4" style="color: #E960A6;">
        <i class="ti ti-user-plus"></i> View Seekers
      </h5>
      <!-- <p><strong>Your email:</strong> {{ userEmail }}</p> -->
        
      
      <div class="row mb-3">
        <div class="col-md-8">
          <input
            type="text"
            v-model="searchQuery"
            class="form-control"
            placeholder="Search by name,email, skills , province or  district"
          />
        </div>

        <div class="col-md-3">
          <select v-model="selectedCategoryId" class="form-control" style="height: 48px; padding-top: 8px; padding-bottom: 8px;">
            <option disabled value="">CHOOSE CATEGORY</option>
            <option value="">All Categories</option>
            <option
              v-for="category in categories"
              :key="category.id"
              :value="category.id"
            >
              {{ category.name }}
            </option>
          </select>
        </div>

        
      </div>

      <!-- Loading Spinner -->
      <div v-if="isLoading" class="d-flex justify-content-center my-5">
        <div class="text-center">
          <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
            <span class="visually-hidden">Loading...</span>
          </div>
          <div class="mt-2">
            <p class="text-muted">Loading job seekers...</p>
          </div>
        </div>
      </div>
      
      <div v-else-if="filteredJobs.length === 0" class="d-flex justify-content-center my-4">
        <div class="alert alert-danger text-center" style="width: 40rem;">
          No job seekers found.
        </div>
      </div>

      <div class="table-responsive" v-if="!isLoading && filteredJobs.length > 0">
        <table class="table table-bordered">
          <thead class="table-light">
            <tr>
              <th>Ids</th>
              <th>NAMES</th>
              <th>PROVINCE</th>
              <th>CATEGORY</th>
              <th>SKILLS</th>
              <th>SALARY</th>
              <th>ACTION</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(seeker, index) in paginatedJobs" :key="seeker.users_id">
              <td>{{ (currentPage - 1) * itemsPerPage + index + 1 }}</td>
              <td>{{ seeker.first_name }} {{ seeker.last_name }}</td>
              <td>{{ seeker.province }}</td>
              <td>{{ getCategoryName(seeker.categories_id) }}</td>
              <td>{{ seeker.bio && seeker.bio.length > 40 ? seeker.bio.substring(0, 40) + '...' : seeker.bio || 'N/A' }}</td>
              <td>{{ seeker.salary }}</td>
              

              <td>
                <div class="d-flex gap-2">
                  
                  <button 
                  class="btn btn-primary btn-sm" 
                  @click="goToEdit(seeker.users_id)"
                  :disabled="!isAdmin || isDeletingId === seeker.users_id"
                  >
                  Edit
                </button>
                  <button class="btn btn-cancel btn-sm" @click="goToMore(seeker.users_id)">More</button>
                  <button 
                class="btn btn-primary btn-sm" 
                @click="confirmDelete(seeker.users_id)"
                :disabled="!isAdmin || isDeletingId === seeker.users_id"
                >
                <span v-if="isDeletingId === seeker.users_id" class="spinner-border spinner-border-sm me-1" role="status"></span>{{ isDeletingId === seeker.users_id ? 'Deleting...' : 'Delete' }}
              </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

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

  <div v-if="showModal" class="modal-overlay">
    <div class="modal-content">
      <h5>Are you sure you want to delete this job seeker content?</h5>
      <div>
        <button 
          class="btn btn-primary mt-3" 
          @click="deleteAbout(selectedAboutId)"
          :disabled="isDeleting"
        >
          <span v-if="isDeleting" class="spinner-border spinner-border-sm me-1" role="status"></span>
          {{ isDeleting ? 'Deleting...' : 'Yes, Delete' }}
        </button>&nbsp;
        <button 
          class="btn btn-cancel mt-3" 
          style="background-color: teal; color: white;" 
          @click="closeModal"
          :disabled="isDeleting"
        >
          Cancel
        </button>
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
      // Load search state from localStorage on initialization
      searchQuery: localStorage.getItem("seekers_search_query") || "",
      selectedCategoryId: localStorage.getItem("seekers_selected_category") || "",
      currentPage: parseInt(localStorage.getItem("seekers_current_page")) || 1,
      itemsPerPage: 20,
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
      categories: [],
      categoryNames: {},
      isSubmitting: false,
      isLoading: true, // Main loading state
      isDeleting: false, // Delete operation loading state
      isDeletingId: null, // Track which item is being deleted
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
  computed: {
    isAdmin() {
    return this.userEmail.toLowerCase() === "admin@kozi.rw";
  },
    filteredJobs() {
      const query = this.searchQuery.toLowerCase();
      return this.jobs.filter((job) => {
        const fullName = `${job.first_name} ${job.last_name}`.toLowerCase();
        const province = (job.province || '').toLowerCase();
        const bio = (job.bio || '').toLowerCase();
        const district = (job.district || '').toLowerCase();
        const email = (job.email || '').toLowerCase();
        const matchesSearch = !query || fullName.includes(query) || province.includes(query) || bio.includes(query) || email.includes(query) || district.includes(query);
        const matchesCategory = !this.selectedCategoryId || job.categories_id == this.selectedCategoryId;
        return matchesSearch && matchesCategory;
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
      // Save to localStorage whenever search query changes
      localStorage.setItem("seekers_search_query", this.searchQuery);
      localStorage.setItem("seekers_current_page", "1");
    },
    selectedCategoryId() {
      this.currentPage = 1;
      // Save to localStorage whenever category changes
      localStorage.setItem("seekers_selected_category", this.selectedCategoryId);
      localStorage.setItem("seekers_current_page", "1");
    },
    currentPage() {
      // Save current page to localStorage
      localStorage.setItem("seekers_current_page", this.currentPage.toString());
    }
  },
  async mounted() {
    this.userEmail = localStorage.getItem("userEmail") || "";
    
    try {
      await this.fetchCategories();
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
    handleFileUpload(event) {
      this.form.logo = event.target.files[0];
    },

    async fetchJobsByUser() {
      try {
        this.isLoading = true;
        const token = localStorage.getItem("adminToken");
        if (!this.userId) return;
        
        const res = await fetch(`${globalVariable}/admin/job_seekers`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        if (!res.ok) throw new Error("Failed to fetch jobs");
        const data = await res.json();
        this.jobs = data;

        const uniqueCategoryIds = [...new Set(data.map(job => job.categories_id).filter(id => id))];
        for (const categoryId of uniqueCategoryIds) {
          await this.fetchCategoryName(categoryId);
        }
      } catch (err) {
        console.error("Error fetching jobs for user:", err);
        this.status = {
          success: false,
          message: "Failed to load job seekers. Please try again.",
        };
      } finally {
        this.isLoading = false;
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

    async fetchCategoryName(categoryId) {
      if (this.categoryNames[categoryId]) return;

      try {
        const response = await fetch(`${globalVariable}/category_name/${categoryId}`);
        const data = await response.json();
        if (response.ok && data && data.name) {
          this.categoryNames[categoryId] = data.name;
        } else {
          this.categoryNames[categoryId] = "Unknown";
        }
      } catch (error) {
        console.error(`Error fetching category name for ID ${categoryId}:`, error);
        this.categoryNames[categoryId] = "Unknown";
      }
    },

    getCategoryName(categoryId) {
      return this.categoryNames[categoryId] || "Loading...";
    },

    goToEdit(job_id) {
      // Store current search state before navigating
      localStorage.setItem("seekers_search_query", this.searchQuery);
      localStorage.setItem("seekers_selected_category", this.selectedCategoryId);
      localStorage.setItem("seekers_current_page", this.currentPage.toString());
      
      this.$router.push({ name: "edit-seekers", params: { id: job_id } });
    },

    goToMore(job_id) {
      // Store current search state before navigating
      localStorage.setItem("seekers_search_query", this.searchQuery);
      localStorage.setItem("seekers_selected_category", this.selectedCategoryId);
      localStorage.setItem("seekers_current_page", this.currentPage.toString());
      
      this.$router.push({ name: "view-seekers", params: { id: job_id } });
    },
    
    goToPage(page) {
      if (page >= 1 && page <= this.totalPages) {
        this.currentPage = page;
      }
    },

    // Method to clear search filters
    clearFilters() {
      this.searchQuery = "";
      this.selectedCategoryId = "";
      this.currentPage = 1;
      
      // Clear from localStorage
      localStorage.removeItem("seekers_search_query");
      localStorage.removeItem("seekers_selected_category");
      localStorage.removeItem("seekers_current_page");
    },

    confirmDelete(id) {
      this.selectedAboutId = id;
      this.showModal = true;
    },

    closeModal() {
      if (!this.isDeleting) {
        this.showModal = false;
        this.selectedAboutId = null;
      }
    },

    async deleteAbout(users_id) {
      const token = localStorage.getItem("adminToken");
      try {
        this.isDeleting = true;
        this.isDeletingId = users_id;
        
        const res = await fetch(`${globalVariable}/admin/delete_job_seeker/${users_id}`, {
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
            message: "Job seeker deleted successfully.",
          };
        } else {
          this.status = {
            success: false,
            message: data.message || "Failed to delete job seeker.",
          };
        }
      } catch (err) {
        console.error("Error deleting job seeker:", err);
        this.status = {
          success: false,
          message: "An error occurred while deleting.",
        };
      } finally {
        this.isDeleting = false;
        this.isDeletingId = null;
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
  },

  // Optional: Clean up localStorage when component is destroyed
  beforeUnmount() {
    // Uncomment these lines if you want to clear search state when leaving the component permanently
    // localStorage.removeItem("seekers_search_query");
    // localStorage.removeItem("seekers_selected_category");
    // localStorage.removeItem("seekers_current_page");
  }
};
</script>


<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 20px;
  border-radius: 8px;
  text-align: center;
  max-width: 400px;
  width: 90%;
}

.spinner-border-sm {
  width: 1rem;
  height: 1rem;
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
  background-color: teal;
  color: #E960A6;
}

.form-group {
  margin-bottom: 15px;
}
</style>