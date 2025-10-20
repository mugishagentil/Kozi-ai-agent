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
    style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; z-index: 1;">
    <div class="body-wrapper" style="margin-top: 70px; margin-left: 270px; background: white; min-height: calc(100vh - 70px); padding: 20px; overflow-y: auto; max-height: calc(100vh - 70px);">
      <!-- <h5 class="text-center">Logged in as:</h5>
      <h6 class="text-center text-muted">{{ userEmail }}</h6>
      <p><strong>users_id:</strong> {{ userId }}</p> -->
      <h5 class="card-title fw-semibold mb-4" style="color: #E960A6;"><i class="ti ti-message-chatbot"></i>  Request support</h5>
      <div class="mx-4">
        <div class="form-group row" style="display: none;">
          <div class="col-md-6">
            <label class="form-label">Names</label>
            <input type="text" v-model="form.name" class="form-control" />
          </div>
          <div class="col-md-6">
            <label class="form-label">Telephone</label>
            <input type="text" v-model="form.telephone" class="form-control" />
          </div>
        </div>

        <div class="form-group row">
          <div class="col-md-6" style="display: none;">
            <label class="form-label">Email</label>
            <input type="text" v-model="form.email" class="form-control" />
          </div>
          <div class="col-md-6">
            <label class="form-label">Priority</label>
            <select v-model="form.priority" style="height: 48px; padding-top: 8px; padding-bottom: 8px;" class="form-control">
              <option value="quick-support">Quick support</option>
              <option value="normal support">Normal support</option>
            </select>
          </div>
          <div class="col-md-6">
            <label class="form-label">Subject</label>
            <input type="text" v-model="form.subject" class="form-control" />
          </div>
        </div>

        <div class="form-group row">
          <div class="col-md-12">
            <label class="form-label">Message</label>
            <textarea
              v-model="form.message"
              style="height: 150px;"
              class="form-control"
            ></textarea>
          </div>
        </div>

        <!-- Success/Error message -->
        <div
          v-if="responseMessage"
          :class="['alert mt-3', messageType === 'success' ? 'alert-success' : 'alert-danger']"
          role="alert"
        >
          {{ responseMessage }}
        </div>

        <!-- Submit Button -->
        <button
          @click="submitForm"
          class="btn btn-primary mt-3"
          :disabled="loading"
          style="background-color:#E960A6;"
        >
          <span v-if="loading" class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
          <span v-if="!loading">Submit</span>
          <span v-else class="ms-2">Sending...</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import IndexComponent from "./IndexComponent.vue";
import { globalVariable } from "@/global";

export default {
  components: {
    IndexComponent,
  },
  data() {
    return {
      form: {
        name: "",
        telephone: "",
        subject: "",
        email: "",
        priority: "quick-support",
        message: "",
      },
      loading: false,
      responseMessage: "",
      messageType: "", // 'success' or 'danger'
      userEmail: "",
      userId: null,
      providerDetails: null,
    };
  },
  async mounted() {
    const token = localStorage.getItem("employerToken");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        this.userEmail = payload.email;
        this.form.email = this.userEmail; // Pre-fill email from token
      } catch (e) {
        console.error("Invalid token format", e);
      }
    }
    
    if (this.userEmail) {
      await this.getUserIdFromEmail();
    }
  },
  methods: {
    async submitForm() {
      this.loading = true;
      this.responseMessage = "";
      this.messageType = "";
      try {
        const response = await fetch(`${globalVariable}/support/send-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(this.form),
        });

        const data = await response.json();
        this.responseMessage = data.message || "Message sent successfully!";
        this.messageType = "success";

        // Clear form but keep user details
        this.form = {
          name: this.form.name, // Keep name
          telephone: this.form.telephone, // Keep telephone
          email: this.form.email, // Keep email
          priority: "quick-support",
          subject: "",
          message: "", // Only clear message
        };
      } catch (err) {
        console.error("Full error:", err);
        this.responseMessage = "Error sending message: " + err.message;
        this.messageType = "danger";
      } finally {
        this.loading = false;
      }
    },

    async getUserIdFromEmail() {
      const token = localStorage.getItem("employerToken");
      if (!token) return;
      
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        this.userEmail = payload.email;
        
        const res = await fetch(`${globalVariable}/get_user_id_by_email/${this.userEmail}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const data = await res.json();
        if (res.ok) {
          this.userId = data.users_id;
          await this.fetchProviderDetails();
        }
      } catch (err) {
        console.error("Error getting user ID:", err);
      }
    },

    async fetchProviderDetails() {
      const token = localStorage.getItem("employerToken");
      if (!token || !this.userId) return;

      try {
        const res = await fetch(`${globalVariable}/provider/job_provider_id/${this.userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const data = await res.json();
        if (res.ok) {
          this.providerDetails = data;
          
          // Auto-populate form fields with provider details
          this.form.name = `${data.provider_first_name} ${data.provider_last_name}`;
          // Email is already set from token
          // You'll need to add telephone field to your API response if you want to auto-populate it
          // For now, telephone will remain empty unless you modify the API endpoint
        }
      } catch (error) {
        console.error("Error fetching provider details:", error);
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

.custom-select,
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