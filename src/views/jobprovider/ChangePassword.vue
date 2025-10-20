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
      <h2 style="margin-left:2rem;margin-right:2rem;">Change Password</h2>
      <form @submit.prevent="changePassword" style="margin-left:2rem;margin-right:2rem;">
        <div class="form-group">
          <label for="current_password" class="form-label">Current password:</label>
          <input
            type="password"
            v-model="currentPassword"
            class="form-control"
            id="current_password"
            required
          />
        </div>
        <div class="form-group">
          <label for="new_password" class="form-label">New password:</label>
          <input
            type="password"
            v-model="newPassword"
            class="form-control"
            id="new_password"
            required
          />
        </div>
        <div class="form-group">
          <label for="confirm_password" class="form-label">Confirm New Password:</label>
          <input
            type="password"
            v-model="confirmPassword"
            class="form-control"
            id="confirm_password"
            required
          />
        </div>
        <button type="submit" class="btn btn-primary" :disabled="loading">
          {{ loading ? 'Changing...' : 'Change' }}
        </button>
        <br><br>
        <p class="alert alert-danger" v-if="passwordMessage" :class="passwordMessageClass" style="margin-left:5rem;">
        {{ passwordMessage }}
      </p>
      </form>

      
    </div>
  </div>
</template>

<script>
import axios from "axios";
import { globalVariable } from "@/global";
import IndexComponent from "./IndexComponent.vue";

export default {
  name: "MainWrapper",
  components: {
    IndexComponent,
  },
  data() {
    return {
      userEmail: null,
      users_id: null,
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
      passwordMessage: "",
      passwordMessageClass: "",
      feedback: "",
      feedbackColor: "green",
      loading: false,
    };
  },
  computed: {
    applyStatusClass() {
      return this.feedbackColor === "green" ? "alert-success" : "alert-danger";
    },
  },
  mounted() {
    const token = localStorage.getItem("employerToken");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        this.userEmail = payload.email;
        this.getUserIdFromEmail();
      } catch (e) {
        console.error("Invalid JWT token:", e);
      }
    }
  },
  methods: {
    async getUserIdFromEmail() {
      const token = localStorage.getItem("employerToken");
      if (!token || !this.userEmail) return;

      try {
        const res = await fetch(`${globalVariable}/get_user_id_by_email/${this.userEmail}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) {
          this.users_id = data.users_id;
        } else {
          this.feedback = data.message || "Unable to get user ID.";
          this.feedbackColor = "red";
        }
      } catch (err) {
        console.error("Error getting users_id:", err);
        this.feedback = "Failed to fetch user ID.";
        this.feedbackColor = "red";
      }
    },

    async changePassword() {
      if (this.newPassword !== this.confirmPassword) {
        this.passwordMessage = "New passwords do not match.";
        this.passwordMessageClass = "text-danger";
        return;
      }

      this.loading = true;

      try {
        const token = localStorage.getItem("employerToken");

        const response = await axios.post(
          `${globalVariable}/change-password`,
          {
            current_password: this.currentPassword,
            new_password: this.newPassword,
            confirm_password: this.confirmPassword,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.data.success) {
          this.passwordMessage = response.data.message;
          this.passwordMessageClass = "text-success";
          this.currentPassword = "";
          this.newPassword = "";
          this.confirmPassword = "";
        } else {
          this.passwordMessage = response.data.message;
          this.passwordMessageClass = "text-danger";
        }
      } catch (error) {
        console.error("Error:", error);
        this.passwordMessage =
          error.response?.data?.message || "An error occurred.";
        this.passwordMessageClass = "text-danger";
      } finally {
        this.loading = false;
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
        border-color: black;
        box-shadow: 0 0 5px rgba(0, 123, 255, 0.5);
        outline: none;
      }
      
      .form-label {
        font-weight: bold;
        margin-bottom: 5px;
        display: block;
      }
      
      .btn-primary {
        background-color:white;
        color: black;
        
      }
      
      .btn-primary:hover {
        background-color: #EA60A7;
        color: white;
        border: none;
      }
      
      
      .form-group {
        margin-bottom: 15px;
      }
      
      
      </style>
      