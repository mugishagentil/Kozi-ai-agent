<template>
  <IndexComponent />
  <div class="page-wrapper" id="main-wrapper" data-layout="vertical" data-navbarbg="skin6" data-sidebartype="full" data-sidebar-description="fixed" data-header-description="fixed">
    <div class="body-wrapper">
      <h5 class="card-title fw-semibold mb-4">AGENT PROFILE</h5>
      <div class="mx-4">
        <div v-if="message" :class="['alert', messageType]">{{ message }}</div>
        <div class="form-group row">
          <div class="col-md-6" v-for="(field, index) in personalFields" :key="index">
            <label class="form-label">{{ field.label }}</label>
            <p class="form-control-plaintext">{{ form[field.model] }}</p>
          </div>
        </div>

        <!-- Approve/Unapprove button -->
        <div v-if="status === 0 || status === 1">
          <button @click="handleStatusChange" class="btn mt-3" :class="status === 0 ? 'btn-primary' : 'btn-unpproved'">
            {{ status === 0 ? 'Approve' : 'Unapprove' }}
          </button>
        </div><br><br>
      </div>

      <div class="table-responsive">
        <h5 style="color: #E960A6;">All Seekers Registered by Agent {{ form.first_name }} {{ form.last_name }}</h5>
        <table class="table table-bordered">
          <thead class="table-light">
            <tr>
              <th>#</th>
              <th>NAMES</th>
              <th>SALARY</th>
              <th>SKILLS AND CAPABILITIES</th>
              <th>PROVINCE</th>
              <th>ACTION</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(seeker, index) in paginatedJobs" :key="seeker.users_id">
              <td>{{ (currentPage - 1) * perPage + index + 1 }}</td>
              <td>{{ seeker.first_name || 'N/A' }} {{ seeker.last_name || '' }}</td>
              <td>{{ seeker.salary || 'N/A' }}</td>
              <td>{{ seeker.bio ? (seeker.bio.length > 40 ? seeker.bio.substring(0, 40) + '...' : seeker.bio) : 'N/A' }}</td>
              <td>{{ seeker.province || 'N/A' }}</td>
              <td>
                <div class="d-flex gap-2">
                  <button class="btn btn-primary btn-sm" @click="goToEdit(seeker.users_id)">Edit</button>
                  <button class="btn btn-primary btn-sm" @click="goToMore(seeker.users_id)">More</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Pagination Controls -->
        <div class="mt-3 d-flex justify-content-center gap-2">
          <button class="btn btn-sm btn-outline-primary" :disabled="currentPage === 1" @click="currentPage--">Previous</button>

          <button
            v-for="page in totalPages"
            :key="page"
            @click="currentPage = page"
            class="btn btn-sm"
            :class="page === currentPage ? 'btn-primary' : 'btn-outline-primary'"
          >
            {{ page }}
          </button>

          <button class="btn btn-sm btn-outline-primary" :disabled="currentPage === totalPages" @click="currentPage++">Next</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { globalVariable } from "@/global";
import IndexComponent from "./IndexComponent.vue";

export default {
  name: "ProfileComponent",
  components: { IndexComponent },
  data() {
    return {
      form: {
        email: "",
        first_name: "",
        last_name: "",
        fathers_name: "",
        mothers_name: "",
        telephone: "",
        province: "",
        district: "",
        sector: "",
        cell: "",
        gender: "",
        country: "",
        village: "",
        image: "",
      },
      uploadsUrl: `${globalVariable}/uploads/profile/`,
      selectedCategoryType: "",
      userId: "",
      userIdurl: "",
      userEmail: "",
      status: null,
      message: null,
      messageType: null,
      categoryTypes: [],
      categories: [],
      categoryName: "Unknown",
      jobs: [],
      currentPage: 1,
      perPage: 10,
      personalFields: [
        { label: "Email", model: "email" },
        { label: "ID", model: "id" },
        { label: "First Name", model: "first_name" },
        { label: "Last Name", model: "last_name" },
        { label: "Country", model: "country" },
        { label: "Province", model: "province" },
        { label: "District", model: "district" },
        { label: "Sector", model: "sector" },
        { label: "Cell", model: "cell" },
        { label: "Village", model: "village" },
        { label: "Telephone", model: "telephone" },
        { label: "Gender", model: "gender" },
      ],
    };
  },
  computed: {
    validJobs() {
      return this.jobs.filter(seeker => seeker && typeof seeker === 'object');
    },
    paginatedJobs() {
      const start = (this.currentPage - 1) * this.perPage;
      const end = start + this.perPage;
      return this.validJobs.slice(start, end);
    },
    totalPages() {
      return Math.ceil(this.validJobs.length / this.perPage);
    },
  },
  mounted() {
    this.userIdurl = this.$route.params.id;
    this.getUserIdFromEmail();
  },
  methods: {
    async getUserIdFromEmail() {
      const token = localStorage.getItem("adminToken");
      if (!token) return;
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        this.userEmail = payload.email;
        const res = await fetch(`${globalVariable}/get_user_id_by_email/${this.userEmail}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) {
          this.userId = data.users_id;
          this.fetchProfile();
          this.fetchCategoryNameByUserId();
          this.fetchStatus();
        } else {
          this.message = data.message || "Unable to get user ID.";
          this.messageType = "alert-danger";
        }
      } catch (err) {
        console.error("Error getting users_id:", err);
        this.message = "Failed to fetch user ID.";
        this.messageType = "alert-danger";
      }
    },

    async fetchProfile() {
      try {
        const res = await fetch(`${globalVariable}/admin/select_agent/${this.userIdurl}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("adminToken")}` },
        });
        const data = await res.json();
        if (res.ok) {
          this.form = { ...this.form, ...data };
          if (data.image) this.form.image = data.image;
          if (data.categories_id) await this.determineCategoryType(data.categories_id);
          this.fetchJobsByUser();
        } else {
          this.message = data.message || "Failed to fetch profile";
          this.messageType = "alert-danger";
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
        this.message = "Error loading profile.";
        this.messageType = "alert-danger";
      }
    },

    async fetchJobsByUser() {
      try {
        const token = localStorage.getItem("adminToken");
        const email = this.form.email;
        if (!email) return;

        const res = await fetch(`${globalVariable}/admin/registered-seekers/${email}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();
        if (res.ok && Array.isArray(data)) {
          this.jobs = data.filter(seeker => seeker && typeof seeker === 'object');
        } else {
          this.jobs = [];
          console.error("Invalid data from server:", data.message);
        }
      } catch (err) {
        console.error("Error fetching seekers:", err);
        this.jobs = [];
      }
    },

    async fetchStatus() {
      try {
        const res = await fetch(`${globalVariable}/provider/status/${this.userIdurl}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("adminToken")}` },
        });
        const data = await res.json();
        if (res.ok) {
          this.status = Number(data.status);
        } else {
          this.status = null;
          console.error("Failed to fetch status:", data.message);
        }
      } catch (error) {
        console.error("Error fetching status:", error);
        this.status = null;
      }
    },

    async fetchCategoryNameByUserId() {
      try {
        const res = await fetch(`${globalVariable}/category/${this.userIdurl}`);
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

    goToEdit(job_id) {
      this.$router.push({ name: "edit-seekers", params: { id: job_id } });
    },

    goToMore(job_id) {
      this.$router.push({ name: "view-seekers", params: { id: job_id } });
    },

    confirmDelete(users_id) {
      if (confirm("Are you sure you want to delete this job seeker?")) {
        console.log("Delete seeker:", users_id);
      }
    },
  },
};
</script>







  

  <style scoped>
  .btn-primary {
        background-color: #E960A6;
        color: white;
      
      }
      .btn-primary:hover {
        background-color: #E960A6;
        color: teal;
      }

    .btn-unpproved {
        background-color: teal;
        color: white;
      
    }
    .btn-unpproved:hover {
        background-color: teal;
        color: #E960A6;
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
  
  .form-control-plaintext {
    padding: 12px 0;
    margin-bottom: 15px;
    border-bottom: 1px solid #ddd;
    color: #444;
    font-size: 16px;
  }
  
  .form-label {
    font-weight: bold;
    margin-bottom: 5px;
    display: block;
  }
  
  .img-thumbnail {
    border-radius: 8px;
    margin-top: 8px;
  }
  </style>
  