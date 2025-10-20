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
      <h5 class="card-title fw-semibold mb-4">Update Agent Profile</h5>
      <!-- <div v-if="userEmail" class="mx-4 mb-4">
        <p><strong>Your email:</strong> {{ userEmail }}</p>
        <p><strong>users_id:</strong> {{ userId }}</p>
        <p><strong>users_idURL:</strong> {{ userIdurl }}</p>
      </div> -->
      <form @submit.prevent="handleSubmit" class="mx-4" enctype="multipart/form-data">
        <div v-if="message" :class="['alert', messageType]">{{ message }}</div>
        <div class="form-group row">
          
          <div class="col-md-6" v-for="(field, index) in personalFields" :key="index">
            <label :for="field.model" class="form-label">{{ field.label }}</label>
            <input :type="field.type" v-model="form[field.model]" class="form-control" :id="field.model" required />
          </div>
          <div class="col-md-6">
            <label class="form-label">Gender</label>
            <select v-model="form.gender" class="form-control" required>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

        </div>

        <button type="submit" class="btn btn-primary mb-3">Update Profile</button>
      </form>
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
        last_name: "",
        country: "",
        category: "",
        telephone: "",
        province: "",
        district: "",
        sector: "",
        cell: "",
        village: "",
        gender: "",
        image: null, 
        image_url: "", 
      },
      uploadsUrl: `${globalVariable}/uploads/profile/`,
      userId: "",
      userIdurl: null,
      userEmail: "",
      message: null,
      messageType: null,
      personalFields: [
        { label: "Email", model: "email", type: "text" },

        { label: "First Name", model: "first_name", type: "text" },
        { label: "Last Name", model: "last_name", type: "text" },
        { label: "Country", model: "country", type: "text" },
        { label: "Province", model: "province", type: "text" },
        { label: "District", model: "district", type: "text" },
        { label: "Sector", model: "sector", type: "text" },
        { label: "Cell", model: "cell", type: "text" },
        { label: "Village", model: "village", type: "text" },
        { label: "Telephone", model: "telephone", type: "text" }
      ],
    };
  },
  mounted() {
    this.getUserIdFromEmail();
    this.userIdurl = this.$route.params.id;
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
          if (data.image) {
            this.form.image = data.image; // Keep filename
            this.form.image_url = this.uploadsUrl + data.image;
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
    
    async handleSubmit() {
      const formData = new FormData();
      for (const key in this.form) {
        if (key === "image" && typeof this.form.image === "string") {
          formData.append("existing_image", this.form.image); 
        } else if (this.form[key] !== null) {
          formData.append(key, this.form[key]);
        }
      }

      try {
        const response = await fetch(`${globalVariable}/admin/update_agent/${this.userIdurl}`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
          },
          body: formData,
        });

        const result = await response.json();
        if (response.ok) {
          this.message = result.message;
          this.messageType = "alert-success";
          this.fetchProfile();
        } else {
          this.message = result.message || "Failed to update profile.";
          this.messageType = "alert-danger";
        }
      } catch (error) {
        console.error("Error updating profile:", error);
        this.message = "An error occurred while updating profile.";
        this.messageType = "alert-danger";
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
        
        .form-group {
          margin-bottom: 15px;
        }
        
        </style>
        