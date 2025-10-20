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
        <i class="ti ti-user-plus"></i> Settings
      </h5>
      
      <!-- User Info Card -->
      <div class="card mb-4">
        <div class="card-body">
          <h5 class="text-center">Logged in as:</h5>
          <h6 class="text-center text-muted">{{ userEmail }}</h6>
        </div>
      </div>

      <!-- Settings Content -->

      <!-- Danger Zone -->
      <div class="card border-danger">
        <div class="card-header bg-danger text-white">
          <h6 class="card-title mb-0 text-white">Danger Zone</h6>
        </div>
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-center">
            <div>
                <h6 class="text-danger mb-1">Delete Account</h6>
                <p class="text-muted mb-0">
                     Once you delete your account, it will be permanently removed and cannot be recovered.
                    </p>
                </div>
            <button 
              type="button" 
              class="btn btn-outline-danger"
              @click="showDeleteConfirmation = true"
              :disabled="isDeleting"
            >
              <i class="ti ti-user-x"></i>
              Delete Account
            </button>
          </div>
        </div>
      </div>

      <!-- Delete Confirmation Modal -->
      <div 
        class="modal fade" 
        :class="{ show: showDeleteConfirmation }" 
        :style="{ display: showDeleteConfirmation ? 'block' : 'none' }"
        tabindex="-1"
        v-if="showDeleteConfirmation"
      >
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header border-bottom-danger">
              <h5 class="modal-title text-danger">
                <i class="ti ti-alert-triangle me-2"></i>
                Confirm Account Deletion
              </h5>
              <button 
                type="button" 
                class="btn-close" 
                @click="closeDeleteModal"
                :disabled="isDeleting"
              ></button>
            </div>
            <div class="modal-body">
              <div class="text-center mb-4">
                <div class="text-danger mb-3">
                  <i class="ti ti-alert-circle" style="font-size: 3rem;"></i>
                </div>
                <h6 class="text-danger">Are you absolutely sure?</h6>
                <p class="text-muted">
  This action will permanently delete your account <strong>{{ userEmail }}</strong>. 
  Once deleted, your account cannot be recovered.
</p>
              </div>
              
              <div class="alert alert-warning">
  <strong>Warning:</strong> This will permanently delete your account and:
  <ul class="mb-0 mt-2">
    <li>Your access to the platform</li>
    <li>Your job applications visibility</li>
    <li>Your profile visibility</li>
    <li>All platform features</li>
  </ul>
</div>


              <div class="mb-3">
                <label class="form-label">
                  Type <strong>DELETE</strong> to confirm:
                </label>
                <input 
                  type="text" 
                  class="form-control"
                  v-model="deleteConfirmationText"
                  placeholder="Type DELETE here"
                  :disabled="isDeleting"
                >
              </div>
            </div>
            <div class="modal-footer">
              <button 
                type="button" 
                class="btn btn-secondary" 
                @click="closeDeleteModal"
                :disabled="isDeleting"
              >
                Cancel
              </button>
              <button 
                type="button" 
                class="btn btn-danger"
                :disabled="deleteConfirmationText !== 'DELETE' || isDeleting"
                @click="deleteAccount"
              >
                <span v-if="isDeleting">
                  <i class="ti ti-loader-2 spin me-1"></i>
                  Deliting...
                </span>
                <span v-else>
                  <i class="ti ti-user-x me-1"></i>
                  Delete Account
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal Backdrop -->
      <div 
        class="modal-backdrop fade show" 
        v-if="showDeleteConfirmation"
        @click="closeDeleteModal"
      ></div>

      <!-- Alert Messages -->
      <div v-if="message" :class="`alert ${messageType} alert-dismissible fade show mt-3`" role="alert">
        {{ message }}
        <button type="button" class="btn-close" @click="clearMessage"></button>
      </div>
    </div>
  </div>
  <br><br><br><br>
</template>

<script>
import { globalVariable } from "@/global";
import IndexComponent from "./IndexComponent.vue";

export default {
  name: "SettingsComponent",
  components: { IndexComponent },
  data() {
    return {
      userEmail: '',
      userId: null,
      showDeleteConfirmation: false,
      deleteConfirmationText: '',
      isDeleting: false,
      message: null,
      messageType: ''
    };
  },
  mounted() {
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
    async getUserIdFromEmail() {
      const token = localStorage.getItem("employerToken");
      if (!token) {
        this.showMessage("No authentication token found. Please login again.", "alert-danger");
        return;
      }
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        this.userEmail = payload.email;
        
        if (!this.userEmail) {
          this.showMessage("Unable to get email from token. Please login again.", "alert-danger");
          return;
        }
        
        const res = await fetch(`${globalVariable}/get_user_id_by_email/${this.userEmail}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        const data = await res.json();
        
        if (res.ok) {
          this.userId = data.users_id;
          this.fetchProfile();
          this.fetchCategoryNameByUserId(); 
        } else {
          this.showMessage(data.message || "Unable to get user ID.", "alert-danger");
        }
      } catch (err) {
        console.error("Error getting users_id:", err);
        this.showMessage("Failed to fetch user ID. Please try again.", "alert-danger");
      }
    },

    async fetchProfile() {
      // Add your profile fetching logic here
      console.log('Fetching profile...');
    },

    async fetchCategoryNameByUserId() {
      // Add your category fetching logic here
      console.log('Fetching categories...');
    },

    async loadCategoryTypes() {
      // Add your category types loading logic here
      console.log('Loading category types...');
    },
    
    closeDeleteModal() {
      if (!this.isDeleting) {
        this.showDeleteConfirmation = false;
        this.deleteConfirmationText = "";
      }
    },
    
    clearMessage() {
      this.message = null;
      this.messageType = '';
    },
    
    showMessage(msg, type) {
      this.message = msg;
      this.messageType = type;
    },
    
    async deleteAccount() {
      // Validation
      if (this.deleteConfirmationText !== 'DELETE') {
        this.showMessage("Please type 'DELETE' to confirm.", "alert-warning");
        return;
      }
      
      if (!this.userEmail) {
        this.showMessage("User email not found. Please refresh and try again.", "alert-danger");
        return;
      }
      
      this.isDeleting = true;
      this.clearMessage();
      
      try {
        const token = localStorage.getItem("employerToken");
        
        if (!token) {
          this.showMessage("Authentication token not found. Please login again.", "alert-danger");
          this.isDeleting = false;
          return;
        }
        
        const apiUrl = `${globalVariable}/seeker/delete_my_account/${encodeURIComponent(this.userEmail)}`;
        console.log('Making request to:', apiUrl);
        
        const res = await fetch(apiUrl, {
          method: 'PUT', // Changed to PUT to match your backend
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        });
        
        const data = await res.json();
        console.log('Response:', data);
        
        if (res.ok) {
          this.showMessage(data.message || "Account deactivated successfully!", "alert-success");
          this.closeDeleteModal();
          
          // Clear auth token and redirect after showing success message
          setTimeout(() => {
            localStorage.removeItem("authToken");
            this.$router.push('/login');
          }, 3000);
        } else {
          this.showMessage(data.message || "Failed to deactivate account. Please try again.", "alert-danger");
          this.isDeleting = false;
        }
      } catch (err) {
        console.error("Error deactivating account:", err);
        this.showMessage("Network error occurred. Please check your connection and try again.", "alert-danger");
        this.isDeleting = false;
      }
    }
  }
};
</script>

<style scoped>
.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.modal {
  background: rgba(0, 0, 0, 0.5);
}

.border-bottom-danger {
  border-bottom-color: #dc3545 !important;
}

.btn:disabled {
  cursor: not-allowed;
}
</style>

<style scoped>
.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.modal.show {
  background-color: rgba(0, 0, 0, 0.5);
}

.border-bottom-danger {
  border-bottom-color: #dc3545 !important;
}
</style>