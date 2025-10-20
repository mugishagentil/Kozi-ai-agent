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
        <i class="ti ti-user-plus"></i> View agent
      </h5>

      <!-- Search -->
      <div class="d-flex justify-content-center mb-3">
        <input
          v-model="searchQuery"
          type="text"
          class="form-control"
          placeholder="Search by names, province or district"
          style="max-width: 450px;"
        />
      </div>
      
<div v-if="filteredAgents.length === 0" class="d-flex justify-content-center my-4">
        <div class="alert alert-danger text-center" style="width: 40rem;">
          No agent found.
        </div>
      </div>

<!-- Agent Table -->
<div class="table-responsive" v-else>
  <table class="table table-bordered">
    <thead class="table-light">
      <tr>
        <th>ID</th>
        <th>NAMES</th>
        <th>COUNTRY</th>
        <th>PROVINCE</th>
        <th>DISTRICT</th>
        <th>ACTION</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="(agent, index) in paginatedAgents" :key="agent.users_id">
        <td>{{ (currentPage - 1) * perPage + index + 1 }}</td>
        <td>{{ agent.first_name }} {{ agent.last_name }}</td>
        <td>{{ agent.country }}</td>
        <td>{{ agent.province }}</td>
        <td>{{ agent.district }}</td>
        <td>
          <div class="d-flex gap-2">
            <button class="btn btn-primary btn-sm" @click="goToEdit(agent.users_id)" :disabled="!isAdmin">Edit</button>
            <button class="btn btn-cancel btn-sm" @click="goToMore(agent.users_id)">More</button>
            <button class="btn btn-primary btn-sm" @click="confirmDelete(agent.users_id)" :disabled="!isAdmin">Delete</button>
          </div>
        </td>
      </tr>
    </tbody>
  </table>
</div>


      <!-- Pagination -->
      <div v-if="totalPages > 1" class="d-flex flex-column align-items-center my-3">
        <nav>
          <ul class="pagination">
            <li :class="['page-item', { disabled: currentPage === 1 }]">
              <button class="page-link" @click="changePage(currentPage - 1)">Previous</button>
            </li>
            <li
              v-for="page in totalPages"
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

  <!-- Modal -->
  <div v-if="showModal" class="modal-overlay">
    <div class="modal-content">
      <h5>Are you sure you want to delete this view agent content?</h5>
      <div>
        <button class="btn btn-primary mt-3" @click="deleteAbout(selectedAboutId)">Yes, Delete</button>
        <button class="btn btn-cancel mt-3" style="background-color: teal; color: white;" @click="closeModal">
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
      jobs: [],
      searchQuery: "",
      currentPage: 1,
      perPage: 20,
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
    filteredAgents() {
      const query = this.searchQuery.toLowerCase();
      return this.jobs.filter((agent) => {
        const name = `${agent.first_name} ${agent.last_name}`.toLowerCase();
        const province = agent.province?.toLowerCase() || "";
        const district = agent.district?.toLowerCase() || "";
        return (
          name.includes(query) || province.includes(query) || district.includes(query)
        );
      });
    },

    paginatedAgents() {
      const start = (this.currentPage - 1) * this.perPage;
      const end = start + this.perPage;
      return this.filteredAgents.slice(start, end);
    },

    totalPages() {
      return Math.ceil(this.filteredAgents.length / this.perPage);
    },
  },

  watch: {
    searchQuery() {
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

    async fetchJobsByUser() {
      try {
        const token = localStorage.getItem("adminToken");
        if (!this.userId) return;
        const res = await fetch(`${globalVariable}/admin/select_agent`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) throw new Error("Failed to fetch agents");
        const data = await res.json();
        this.jobs = data;
      } catch (err) {
        console.error("Error fetching agents:", err);
      }
    },

    goToEdit(users_id) {
      this.$router.push({ name: "edit-agent", params: { id: users_id } });
    },

    goToMore(users_id) {
      this.$router.push({ name: "more-agent", params: { id: users_id } });
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
        const res = await fetch(`${globalVariable}/admin/delete_agent/${users_id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();
        if (res.ok) {
          this.jobs = this.jobs.filter((job) => job.users_id !== users_id);
        } else {
          console.error("Failed to delete:", data.message);
        }
      } catch (err) {
        console.error("Error deleting agent:", err);
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
          console.error("Unable to get user ID:", data.message);
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
