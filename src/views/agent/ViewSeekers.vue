<template>
  <IndexComponent />
  <div class="page-wrapper" id="main-wrapper" data-layout="vertical" data-navbarbg="skin6" data-sidebartype="full" data-sidebar-description="fixed" data-header-description="fixed">
    <div class="body-wrapper">
      <h5 class="fw-semibold mb-3">My job seekers</h5>

      <div v-if="jobs.length === 0" class="text-muted">no seekers yet.</div>

      <div class="row mb-3">
        <div class="col-md-10">
          <input
            type="text"
            v-model="searchQuery"
            class="form-control"
            placeholder="Search by name"
          />
        </div>

        <!-- <div class="col-md-6">
          <select v-model="selectedCategoryId" class="form-control">
            <option disabled value="">SELECT CATEGORY</option>
            <option value="">All Categories</option>
            <option
              v-for="category in categories"
              :key="category.id"
              :value="category.id"
            >
              {{ category.name }}
            </option>
          </select>
        </div> -->
      </div>

      <div class="table-responsive">
        <table class="table table-bordered">
          <thead class="table-light">
            <tr>
              <th>ID</th>
              <th>NAMES</th>
              <th>SALARY</th>
              <th>SKILLS AND CAPABILITIES</th>
              <th>PROVINCE</th>
              <th>ACTION</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(seeker, index) in paginatedJobs" :key="seeker.users_id">
              <td>{{ (currentPage - 1) * pageSize + index + 1 }}</td>
              <td>{{ seeker.first_name }} {{ seeker.last_name }}</td>
              <td>{{ seeker.salary }}</td>
              <td>{{ seeker.bio.length > 40 ? seeker.bio.substring(0, 40) + '...' : seeker.bio }}</td>
              <td>{{ seeker.province }}</td>
              <td>
                <div class="d-flex gap-2">
                  <button class="btn btn-primary btn-sm" @click="goToEdit(seeker.users_id)">Edit</button>
                  <button class="btn btn-cancel btn-sm" @click="goToMore(seeker.users_id)">More</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="totalPages > 1" class="d-flex justify-content-center mt-4">
        <nav>
          <ul class="pagination">
            <li class="page-item" :class="{ disabled: currentPage === 1 }">
              <button class="page-link" @click="goToPage(currentPage - 1)">Previous</button>
            </li>

            <li
              v-for="page in totalPages"
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
        <button class="btn btn-primary mt-3" @click="deleteAbout(selectedAboutId)">Yes, Delete</button>&nbsp;
        <button class="btn btn-cancel mt-3" style="background-color: teal; color: white;" @click="closeModal">Cancel</button>
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
      form: {},
      jobs: [],
      currentPage: 1,
      pageSize: 10,
      searchQuery: "",
      selectedCategoryId: "",
      categories: [],
      isSubmitting: false,
      status: { success: false, message: "" },
      userEmail: "",
      userId: "",
      showModal: false,
      selectedAboutId: null,
    };
  },
  computed: {
    paginatedJobs() {
      let result = this.jobs;

      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase();
        result = result.filter(seeker =>
          (seeker.first_name + " " + seeker.last_name).toLowerCase().includes(query)
        );
      }

      if (this.selectedCategoryId) {
        result = result.filter(seeker =>
          seeker.categories_id == this.selectedCategoryId
        );
      }

      const start = (this.currentPage - 1) * this.pageSize;
      return result.slice(start, start + this.pageSize);
    },
    totalPages() {
      let result = this.jobs;

      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase();
        result = result.filter(seeker =>
          (seeker.first_name + " " + seeker.last_name).toLowerCase().includes(query)
        );
      }

      if (this.selectedCategoryId) {
        result = result.filter(seeker =>
          seeker.categories_id == this.selectedCategoryId
        );
      }

      return Math.ceil(result.length / this.pageSize);
    },
  },
  watch: {
    searchQuery() {
      this.currentPage = 1;
    },
    selectedCategoryId() {
      this.currentPage = 1;
    },
  },
  mounted() {
    this.userEmail = localStorage.getItem("userEmail") || "";
    this.fetchCategories();
    if (this.userEmail) {
      this.getUserIdFromEmail();
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
        const token = localStorage.getItem("agentToken");
        if (!this.userId) return;
        const res = await fetch(`${globalVariable}/admin/registered-seekers/${this.userEmail}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) {
          this.jobs = data;
        } else {
          console.error("Failed to fetch jobs:", data.message);
        }
      } catch (err) {
        console.error("Error fetching jobs for user:", err);
      }
    },
    goToEdit(job_id) {
      this.$router.push({ name: "agent/agent-edit-seekers", params: { id: job_id } });
    },
    goToMore(job_id) {
      this.$router.push({ name: "agent/agent-view-seekers", params: { id: job_id } });
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
      const token = localStorage.getItem("agentToken");
      try {
        const res = await fetch(`${globalVariable}/admin/delete_job_seeker/${users_id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) {
          this.jobs = this.jobs.filter(job => job.users_id !== users_id);
          this.status = { success: true, message: "Job deleted successfully." };
        } else {
          this.status = { success: false, message: data.message || "Failed to delete job." };
        }
      } catch (err) {
        console.error("Error deleting job:", err);
        this.status = { success: false, message: "An error occurred while deleting." };
      } finally {
        this.closeModal();
      }
    },
    async fetchCategories() {
      try {
        const token = localStorage.getItem("agentToken");
        const res = await fetch(`${globalVariable}/name_and_id`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) {
          this.categories = data;
        } else {
          console.error("Failed to fetch categories:", data.message);
        }
      } catch (err) {
        console.error("Error fetching categories:", err);
      }
    },
    async getUserIdFromEmail() {
      const token = localStorage.getItem("agentToken");
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
          this.status = { success: false, message: data.message || "Unable to get user ID." };
        }
      } catch (err) {
        console.error("Error getting users_id:", err);
        this.status = { success: false, message: "Failed to fetch user ID." };
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
        

.pagination {
  display: flex;
  list-style: none;
  padding-left: 0;
}
.page-item {
  margin: 0 4px;
}
.page-item .page-link {
  border: 1px solid #ddd;
  padding: 6px 12px;
  cursor: pointer;
  border-radius: 4px;
  background-color: white;
}
.page-item.active .page-link {
  background-color: #E960A6;
  color: white;
  border-color: #E960A6;
}
.page-item.disabled .page-link {
  cursor: not-allowed;
  opacity: 0.6;
}
</style>

