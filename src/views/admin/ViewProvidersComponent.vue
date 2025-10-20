<template>
  <IndexComponent />
  <div
    class="page-wrapper"
    id="main-wrapper"
    data-layout="vertical"
    data-navbarbg="skin6"
    data-sidebartype="full"
    data-sidebar-description="fixed"
    data-header-description="fixed">
    <div class="body-wrapper">
      
      <h5 class="card-title fw-semibold mb-4" style="color: #E960A6;">
        <i class="ti ti-user-plus"></i>
        Job Provider's profile
      </h5>
      <div class="card-body">
        <!-- <h5 class="text-center">Logged in as:</h5>
        <h6 class="text-center text-muted">{{ userEmail }}</h6>
        <h6 class="text-center text-muted">User ID: {{ userid }}</h6>
        <h6 class="text-center text-muted">User ID (URL): {{ userIdurl }}</h6>
        <h6 class="text-center text-muted">Status: {{ status === 1 ? 'Approved' : 'Unapproved' }}</h6> -->
      </div>

      <div class="mx-4">
        <div v-if="message" :class="['alert', messageType]">{{ message }}</div>

        <div class="form-group row">
          <div class="col-md-6" v-for="(field, index) in personalFields" :key="index">
            <label class="form-label">{{ field.label }}</label>
            <p class="form-control-plaintext">
              {{ field.isDate ? formatDate(form[field.model]) : form[field.model] }}
            </p>
          </div>
          <div class="col-md-6">
            <strong>Profile Image:</strong><br />
            <a :href="uploadsUrl + form.image" target="_blank">
              <img :src="uploadsUrl + form.image" alt="Profile" class="img-thumbnail" width="250" />
            </a>
          </div>
        </div>

        <!-- Approve/Unapprove button -->
        <div v-if="status === 0 || status === 1">
          <button
            @click="handleStatusChange"
            class="btn mt-3"
            :class="status === 0 ? 'btn-primary' : 'btn-unpproved'">
            {{ status === 0 ? 'Approve' : 'Unapprove' }}
          </button>
        </div><br><br>

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
        first_name: "",
        email: "",
        category: "",
        last_name: "",
        fathers_name: "",
        mothers_name: "",
        telephone: "",
        province: "",
        district: "",
        sector: "",
        cell: "",
        gender: "",
        created_at: "",
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
      personalFields: [
        { label: "Category", model: "category" },
        { label: "Email", model: "email" },
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
        { label: "Registered on", model: "created_at", isDate: true },
      ],
    };
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
      return date.toISOString().slice(0, 19).replace('T', ' ');
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
        const res = await fetch(`${globalVariable}/admin/job_providers/${this.userIdurl}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("adminToken")}` },
        });
        const data = await res.json();
        if (res.ok) {
          this.form = { ...this.form, ...data };
          if (data.image) {
            this.form.image = data.image;
          }
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

    async handleStatusChange() {
      const token = localStorage.getItem("adminToken");
      const url =
        this.status === 0
          ? `${globalVariable}/admin/approve/${this.userIdurl}`
          : `${globalVariable}/admin/unapproved/${this.userIdurl}`;

      try {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();
        console.log("API Response:", res.status, data); // 🔍 Debug line

        if (res.ok) {
          this.message = data.message || "Status updated successfully.";
          this.messageType = "alert-success";
          this.fetchStatus();
        } else {
          this.message = data.message || "Failed to update status.";
          this.messageType = "alert-danger";
        }
      } catch (error) {
        console.error("Error updating status:", error); // 🔍 log actual error
        this.message = "Server error updating status.";
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

    async determineCategoryType(categoriesId) {
      // Add your category type determination logic here if needed
      // This method was referenced but not implemented in your original code
      console.log("Determining category type for:", categoriesId);
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