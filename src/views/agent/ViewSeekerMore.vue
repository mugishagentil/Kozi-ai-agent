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
      <h5 class="card-title fw-semibold mb-4">Seeker's more information</h5>
      <!-- <div class="card-body">
        <h5 class="text-center">Logged in as:</h5>
        <h6 class="text-center text-muted">{{ userEmail }}</h6>
        <p><strong>Users ID from URL:</strong> {{ userIdurl }}</p>
      </div> -->

      <div class="mx-4">
        <div v-if="message" :class="['alert', messageType]">{{ message }}</div>
        <div class="form-group row">
          <div class="col-md-6" v-for="(field, index) in personalFields" :key="index">
            <label class="form-label">{{ field.label }}</label>
            <p class="form-control-plaintext">
              {{ field.model === 'category' ? categoryName : form[field.model] }}
            </p>
          </div>
          <div class="col-md-6">
            <strong>Profile Image:</strong><br />
            <a :href="uploadsUrl + form.image" target="_blank">
              <img :src="uploadsUrl + form.image" alt="Profile" class="img-thumbnail" width="250" />
            </a>
          </div>

          <div class="col-md-6">
            <strong>ID card:</strong><br />
            <a :href="uploadsUrl + form.id" target="_blank">
              <img :src="uploadsUrl + form.id" alt="ID" class="img-thumbnail" width="250" />
            </a>
          </div>

          <div class="col-md-6">
            <strong>CV:</strong><br />
            <a
              v-if="form.cv"
              :href="uploadsUrl + form.cv"
              target="_blank"
              rel="noopener noreferrer"
              class="btn btn-outline-primary mt-2"
            >
              View CV
            </a>
          </div>

          <div class="col-md-6"></div>

          <!-- <div class="col-md-6">
            <button @click="GiveAccess" type="button" class="btn btn-primary mt-3">Give access</button> &nbsp;
            <button @click="ApproveUser" type="button" class="btn btn-primary mt-3">Approve user</button>
          </div> -->
        </div>
      </div>
    </div>
  </div>
  <br /><br /><br /><br />
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
        first_name: "",
        last_name: "",
        email: "",
        gender: "",
        fathers_name: "",
        mothers_name: "",
        telephone: "",
        province: "",
        district: "",
        sector: "",
        cell: "",
        village: "",
        bio: "",
        salary: "",
        category: "",
        date_of_birth: "",
        disability: "",
        cv: null,
        id: null,
        image: null,
        categories_id: "",
        job_seeker_id: "",
        userIdurl: null,
      },
      uploadsUrl: `${globalVariable}/uploads/profile/`,
      selectedCategoryType: "",
      userId: "",
      userEmail: "",
      message: null,
      messageType: null,
      categoryTypes: [],
      categories: [],
      categoryName: "Unknown",
      personalFields: [
      
        { label: "First Name", model: "first_name" },
        { label: "Last Name", model: "last_name" },
        { label: "Last Name", model: "email" },
        { label: "Father's Name", model: "fathers_name" },
        { label: "Mother's Name", model: "mothers_name" },
        { label: "Date of Birth", model: "date_of_birth" },
        { label: "Gender", model: "gender" },
        { label: "Province", model: "province" },
        { label: "District", model: "district" },
        { label: "Sector", model: "sector" },
        { label: "Cell", model: "cell" },
        { label: "Village", model: "village" },
        { label: "Telephone", model: "telephone" },
        { label: "Disability", model: "disability" },
        { label: "Salary", model: "salary" },
        { label: "Category", model: "category" },
        { label: "Skills and capabilities", model: "bio" },
      ],
    };
  },
  mounted() {
    this.userIdurl = this.$route.params.id;
    this.getUserIdFromEmail();
    this.loadCategoryTypes();
    // Removed automatic GiveAccess call here
  },
  methods: {
    async getUserIdFromEmail() {
      const token = localStorage.getItem("agentToken");
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
        const res = await fetch(`${globalVariable}/seeker/view_profile/${this.userIdurl}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("agentToken")}` },
        });
        const data = await res.json();
        if (res.ok) {
          this.form = { ...this.form, ...data };
          if (data.categories_id) {
            await this.determineCategoryType(data.categories_id);
          }
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
    async determineCategoryType(categoryId) {
      try {
        const res = await fetch(`${globalVariable}/category-details/${categoryId}`);
        const data = await res.json();
        if (res.ok) {
          this.selectedCategoryType = data.type_id;
          await this.loadCategories();
          this.form.categories_id = categoryId;
        }
      } catch (error) {
        console.error("Error determining category type:", error);
      }
    },
    async loadCategoryTypes() {
      try {
        const res = await fetch(`${globalVariable}/category-types`);
        const data = await res.json();
        this.categoryTypes = data;
      } catch (error) {
        console.error("Failed to load category types:", error);
      }
    },
    async loadCategories() {
      try {
        const res = await fetch(`${globalVariable}/categories/${this.selectedCategoryType}`);
        const data = await res.json();
        this.categories = data;
      } catch (error) {
        console.error("Failed to load categories:", error);
      }
    },
    async ApproveUser() {
      console.log("ApproveUser called with job_seeker_id:", this.form.job_seeker_id);
      if (!this.form.job_seeker_id) {
        this.message = "Job seeker ID is missing!";
        this.messageType = "alert-danger";
        return;
      }
      try {
        const res = await fetch(`${globalVariable}/admin/approve_job_seeker/${this.form.job_seeker_id}`, {
          method: "PUT", 
          headers: {
            Authorization: `Bearer ${localStorage.getItem("agentToken")}`,
            "Content-Type": "application/json",
          },
        });
        const data = await res.json();
        if (res.ok) {
          this.message = " Approved successfully.";
          this.messageType = "alert-success";
        } else {
          this.message = data.message || "Failed to grant access.";
          this.messageType = "alert-danger";
        }
      } catch (error) {
        console.error("Error approving access:", error);
        this.message = "An error occurred while  approving access.";
        this.messageType = "alert-danger";
      }
    },
    async GiveAccess() {
      console.log("giveaccess called with job_seeker_id:", this.form.job_seeker_id);
      if (!this.form.job_seeker_id) {
        this.message = "Job seeker ID is missing!";
        this.messageType = "alert-danger";
        return;
      }
      try {
        const res = await fetch(`${globalVariable}/admin/giveaccess/${this.form.job_seeker_id}`, {
          method: "PUT",
          headers: {
             Authorization: `Bearer ${localStorage.getItem("agentToken")}`,
              "Content-Type": "application/json",
            },
          });
          const data = await res.json();
          if (res.ok) {
            this.message = "Access granted.";
            this.messageType = "alert-success";
          } else {
            this.message = data.message || "Failed to grant access.";
            this.messageType = "alert-danger";
          }
        } catch (error) {
          console.error("Error granting access:", error);
          this.message = "An error occurred while granting access.";
          this.messageType = "alert-danger";
        }
      }
    },
};
</script>

<style scoped>
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
.btn-primary {
background-color: #E960A6;
color: white;
}
.btn-primary:hover {
    background-color: #E960A6;
    color: teal;
    }
</style>
