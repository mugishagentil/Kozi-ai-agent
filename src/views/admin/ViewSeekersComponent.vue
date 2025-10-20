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
        <i class="ti ti-user-plus"></i> My profile
      </h5>

      <div class="mx-4">
        <div v-if="message" :class="['alert', messageType]">{{ message }}</div>
        <div class="form-group row">
          <div
  :class="field.model === 'bio' ? 'col-md-12' : 'col-md-6'"
  v-for="(field, index) in personalFields"
  :key="index"
>
  <label class="form-label">{{ field.label }}</label>
  <p class="form-control-plaintext">
    {{ field.model === 'category'
      ? categoryName
      : field.model === 'date_of_birth'
      ? formatDate(form[field.model])
      : field.model === 'created_at'
      ? formatDateTime(form[field.model])
      : form[field.model] }}
  </p>
</div>


          <div class="col-md-6">
            <strong>Cv</strong><br />
            <a
              v-if="form.cv"
              :href="uploadsUrl + form.cv"
              target="_blank"
              rel="noopener noreferrer"
              class="btn btn-primary btn-sm mt-2"
            >
              View Current Cv
            </a>
            <hr>
          </div>

          <div class="col-md-6">
            <strong>Profile Image</strong><br />
            <a :href="uploadsUrl + form.image" target="_blank">
              <img :src="uploadsUrl + form.image" alt="Profile" class="img-thumbnail" width="100" />
            </a>
          </div>

          <div class="col-md-6">
            <strong>ID card</strong><br />
            <a :href="uploadsUrl + form.id" target="_blank">
              <img :src="uploadsUrl + form.id" alt="ID" class="img-thumbnail" width="100" />
            </a>
          </div>

          <div class="col-md-6">
            <button
              @click="toggleAccess"
              class="btn mt-3"
              :class="form.is_editable === 0 ? 'btn-primary' : 'btn-warning'"
              :disabled="!isAdmin || isLoading"
            >
              {{ form.is_editable === 0 ? 'Give Access' : 'Remove Access' }}
            </button>

            <button
              @click="toggleApproval"
              class="btn mt-3 ms-2"
              :class="form.verification_badge === 0 ? 'btn-success' : 'btn-danger'"
              :disabled="!isAdmin || isLoading"
            >
              {{ form.verification_badge === 0 ? 'Approve User' : 'Unapprove User' }}
            </button>
          </div>
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
        created_at: "",
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
        is_editable: 0,
        verification_badge: 0,
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
      isLoading: false,
      personalFields: [
        { label: "First Name", model: "first_name" },
        { label: "Last Name", model: "last_name" },
        { label: "Email", model: "email" },
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
        { label: "Registered on", model: "created_at" },
      ],
    };
  },
  computed: {
    isAdmin() {
      return this.userEmail?.toLowerCase() === "admin@kozi.rw";
    }
  },
  mounted() {
    this.userIdurl = this.$route.params.id;
    this.getUserIdFromEmail();
    this.loadCategoryTypes();
  },
  methods: {
    formatDate(dateString) {
      if (!dateString) return '';
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    },
    formatDateTime(dateString) {
      if (!dateString) return '';
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    },
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
          headers: { Authorization: `Bearer ${localStorage.getItem("adminToken")}` },
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
    async toggleAccess() {
      if (this.form.is_editable === 0) {
        await this.giveAccess();
      } else {
        await this.unGiveAccess();
      }
    },
    async toggleApproval() {
      if (this.form.verification_badge === 0) {
        await this.approveUser();
      } else {
        await this.unApproveUser();
      }
    },
    async approveUser() {
      if (!this.form.job_seeker_id) {
        this.message = "Job seeker ID is missing!";
        this.messageType = "alert-danger";
        return;
      }
      this.isLoading = true;
      try {
        const res = await fetch(`${globalVariable}/admin/approve_job_seeker/${this.form.job_seeker_id}`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
            "Content-Type": "application/json",
          },
        });
        const data = await res.json();
        if (res.ok) {
          this.form.verification_badge = 1;
          this.message = "User approved successfully.";
          this.messageType = "alert-success";
        } else {
          this.message = data.message || "Failed to approve user.";
          this.messageType = "alert-danger";
        }
      } catch (error) {
        console.error("Error approving user:", error);
        this.message = "An error occurred while approving user.";
        this.messageType = "alert-danger";
      } finally {
        this.isLoading = false;
      }
    },
    async unApproveUser() {
      if (!this.form.job_seeker_id) {
        this.message = "Job seeker ID is missing!";
        this.messageType = "alert-danger";
        return;
      }
      this.isLoading = true;
      try {
        const res = await fetch(`${globalVariable}/admin/unapprove_job_seeker/${this.form.job_seeker_id}`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
            "Content-Type": "application/json",
          },
        });
        const data = await res.json();
        if (res.ok) {
          this.form.verification_badge = 0;
          this.message = "User unapproved successfully.";
          this.messageType = "alert-success";
        } else {
          this.message = data.message || "Failed to unapprove user.";
          this.messageType = "alert-danger";
        }
      } catch (error) {
        console.error("Error unapproving user:", error);
        this.message = "An error occurred while unapproving user.";
        this.messageType = "alert-danger";
      } finally {
        this.isLoading = false;
      }
    },
    async giveAccess() {
      if (!this.form.job_seeker_id) {
        this.message = "Job seeker ID is missing!";
        this.messageType = "alert-danger";
        return;
      }
      this.isLoading = true;
      try {
        const res = await fetch(`${globalVariable}/admin/giveaccess/${this.form.job_seeker_id}`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
            "Content-Type": "application/json",
          },
        });
        const data = await res.json();
        if (res.ok) {
          this.form.is_editable = 1;
          this.message = "Access granted successfully.";
          this.messageType = "alert-success";
        } else {
          this.message = data.message || "Failed to grant access.";
          this.messageType = "alert-danger";
        }
      } catch (error) {
        console.error("Error granting access:", error);
        this.message = "An error occurred while granting access.";
        this.messageType = "alert-danger";
      } finally {
        this.isLoading = false;
      }
    },
    async unGiveAccess() {
      if (!this.form.job_seeker_id) {
        this.message = "Job seeker ID is missing!";
        this.messageType = "alert-danger";
        return;
      }
      this.isLoading = true;
      try {
        const res = await fetch(`${globalVariable}/admin/ungiveaccess/${this.form.job_seeker_id}`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
            "Content-Type": "application/json",
          },
        });
        const data = await res.json();
        if (res.ok) {
          this.form.is_editable = 0;
          this.message = data.message;
          this.messageType = "alert-success";
        } else {
          this.message = data.message || "Failed to remove access.";
          this.messageType = "alert-danger";
        }
      } catch (error) {
        console.error("Error removing access:", error);
        this.message = "An error occurred while removing access.";
        this.messageType = "alert-danger";
      } finally {
        this.isLoading = false;
      }
    }
  }
};
</script>


<style scoped>
.btn-unpproved {
  background-color: #dc3545;
  border-color: #dc3545;
  color: white;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>

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

    .btn-unpproved {
        background-color: teal;
        color: white;
      
    }
    .btn-unpproved:hover {
        background-color: teal;
        color: #E960A6;
      }
      
</style>
