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
      <!-- <h5 class="text-center">Logged in as:</h5>
      <h6 class="text-center text-muted">{{ userEmail }}</h6>
      <h6 class="text-center text-muted">{{ userId}}</h6>
      <h6 class="text-center text-muted">{{  userIdurl}}</h6> -->
      <h5 class="card-title fw-semibold mb-4" style="color: #E960A6;">
        <i class="ti ti-user-plus"></i> Open Ticket
      </h5>

      <!-- Search Input -->
      <div class="d-flex justify-content-center mb-3">
        <input
          v-model="searchQuery"
          type="text"
          class="form-control"
          style="max-width: 550px"
          placeholder="Search by name or telephone..."
        />
      </div>
      
      <!-- Loading Spinner -->
      <div v-if="isLoading" class="d-flex justify-content-center my-5">
        <div class="text-center">
          <div
            class="spinner-border text-primary"
            role="status"
            style="width: 3rem; height: 3rem;"
          >
            <span class="visually-hidden">Loading...</span>
          </div>
          <div class="mt-2">
            <p class="text-muted">Loading tickets...</p>
          </div>
        </div>
      </div>

      <!-- No tickets found -->
      <div v-if="!isLoading && filteredJobs.length === 0" class="d-flex justify-content-center my-4">
        <div class="alert alert-danger text-center" style="width: 40rem;">
          No Open Ticket found.
        </div>
      </div>

      <!-- Tickets Table -->
      <div v-else-if="!isLoading" class="table-responsive">
        <table class="table table-bordered">
          <thead class="table-light">
            <tr>
              <th>ID</th>
              <th>NAMES</th>
              <th>MESSAGE</th>
              <th>TELEPHONE</th>
              <th>MESSAGE ON</th>
              <th>FEEDBACK</th>
              <th>FEEDBACK MADE BY</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(approved, index) in displayedJobs" :key="approved.message_id">
              <td>{{ (currentPage - 1) * perPage + index + 1 }}</td>
              <td>{{ approved.first_name }} {{ approved.last_name }}</td>
              <td>{{ approved.message }}</td>
              <td>{{ approved.telephone }}</td>
              <td>{{ formatDateTime(approved.msg_created_at) }}</td>
              <td>
                <div class="feedback-text" :title="approved.feedback">
                  {{ approved.feedback ? (approved.feedback.length > 50 ? approved.feedback.substring(0, 50) + '...' : approved.feedback) : 'No feedback yet' }}
                </div>
              </td>
              <td>{{ approved.feedback_made_by || '-' }}</td>
              
              <td>
                <button
                  @click="openFeedbackModal(approved)"
                  class="btn btn-primary btn-sm"
                >
                  <i class="ti ti-edit"></i> 
                  {{ approved.feedback ? 'Edit' : 'Add' }} Feedback
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="!isLoading && totalPages > 1" class="d-flex flex-column align-items-center my-3">
        <nav aria-label="Page navigation">
          <ul class="pagination">
            <li :class="['page-item', { disabled: currentPage === 1 }]">
              <button class="page-link" @click="changePage(currentPage - 1)">Previous</button>
            </li>

            <li
              v-for="page in pagesToShow"
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

      <!-- Success/Error Messages -->
      <div v-if="feedbackStatus.message" class="alert" :class="feedbackStatus.success ? 'alert-success' : 'alert-danger'">
        {{ feedbackStatus.message }}
      </div>

      <!-- Custom CSS Modal - Simplified -->
      <div v-if="showFeedbackModal" class="modal-overlay" @click="closeFeedbackModal">
        <div class="feedback-modal" @click.stop>
          <div class="modal-header">
            <h3 class="modal-title">
              <i class="ti ti-message-circle"></i>
              {{ selectedMessage?.feedback ? 'Edit Feedback' : 'Add Feedback' }}
            </h3>
            <button class="close-btn" @click="closeFeedbackModal">&times;</button>
          </div>

          <div class="modal-body">
            <!-- Current Feedback (if exists) -->
            <div v-if="selectedMessage?.feedback" class="info-card current-feedback">
              <div class="card-header current">
                <h4><i class="ti ti-message-check"></i> Current Feedback</h4>
              </div>
              <div class="card-content">
                <div class="current-feedback-text">{{ selectedMessage.feedback }}</div>
                <small class="feedback-author">
                  <i class="ti ti-user"></i>
                  By: {{ selectedMessage.feedback_made_by }}
                </small>
              </div>
            </div>

            <!-- Feedback Input -->
            <div class="info-card feedback-input">
              <div class="card-header" :class="selectedMessage?.feedback ? 'update' : 'new'">
                <h4>
                  <i class="ti ti-edit"></i>
                  {{ selectedMessage?.feedback ? 'Update Feedback' : 'New Feedback' }}
                </h4>
              </div>
              <div class="card-content">
                <div class="form-group">
                  <label class="form-label">
                    <strong>Your Feedback:</strong>
                  </label>
                  <textarea
                    v-model="feedbackForm.feedback"
                    class="feedback-textarea"
                    rows="6"
                    placeholder="Enter your feedback for this message..."
                    :disabled="isSubmittingFeedback"
                  ></textarea>
                  <div class="char-count">
                    Character count: {{ feedbackForm.feedback.length }}
                  </div>
                </div>
                <div class="attribution-info">
                  <small>
                    <i class="ti ti-info-circle"></i>
                    Feedback will be attributed to: <strong>{{ userEmail }}</strong>
                  </small>
                </div>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button 
              class="btn btn-cancel"
              @click="closeFeedbackModal"
              :disabled="isSubmittingFeedback"
            >
              <i class="ti ti-x"></i>
              Cancel
            </button>
            <button 
              class="btn btn-primary"
              @click="saveFeedback"
              :disabled="isSubmittingFeedback || !feedbackForm.feedback.trim()"
            >
              <span v-if="isSubmittingFeedback" class="spinner"></span>
              <i v-else class="ti ti-check"></i>
              {{ isSubmittingFeedback ? 'Saving...' : 'Save Feedback' }}
            </button>
          </div>
        </div>
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
      form: {
        users_id: null,
        job_title: "",
        company: "",
        deadline_date: "",
        job_description: "",
        logo: "",
        location: "",
      },
      jobs: [],
      isSubmitting: false,
      status: {
        success: false,
        message: "",
      },
      userEmail: "",
      userId: "",
      showModal: false,
      selectedAboutId: null,

      // Search & Pagination
      searchQuery: "",
      currentPage: 1,
      perPage: 20,
      isLoading: true,

      // Feedback functionality
      selectedMessage: null,
      showFeedbackModal: false,
      isSubmittingFeedback: false,
      feedbackForm: {
        feedback: "",
      },
      feedbackStatus: {
        success: false,
        message: "",
      },
    };
  },

  computed: {
    pagesToShow() {
      const total = this.totalPages;
      const current = this.currentPage;
      const delta = 2; // how many pages to show before and after current
      const range = [];

      for (let i = Math.max(1, current - delta); i <= Math.min(total, current + delta); i++) {
        range.push(i);
      }

      return range;
    },
    filteredJobs() {
      const query = this.searchQuery.toLowerCase();
      return this.jobs.filter((job) => {
        const fullName = `${job.first_name} ${job.last_name}`.toLowerCase();
        return (
          fullName.includes(query) || job.telephone.toLowerCase().includes(query)
        );
      });
    },
    displayedJobs() {
      const start = (this.currentPage - 1) * this.perPage;
      const end = start + this.perPage;
      return this.filteredJobs.slice(start, end);
    },
    totalPages() {
      return Math.ceil(this.filteredJobs.length / this.perPage);
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

    handleFileUpload(event) {
      this.form.logo = event.target.files[0];
    },

    async fetchJobsByUser() {
      this.isLoading = true;
      try {
        const token = localStorage.getItem("adminToken");
        if (!this.userId) return;
        const res = await fetch(`${globalVariable}/admin/seekers_messages`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) throw new Error("Failed to fetch jobs");
        const data = await res.json();
        this.jobs = data;
      } catch (err) {
        console.error("Error fetching jobs for user:", err);
      } finally {
        this.isLoading = false;
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
          this.status = {
            success: false,
            message: data.message || "Unable to get user ID.",
          };
        }
      } catch (err) {
        console.error("Error getting users_id:", err);
        this.status = {
          success: false,
          message: "Failed to fetch user ID.",
        };
      }
    },

    formatDateTime(datetime) {
      if (!datetime) return '';
      const date = new Date(datetime);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      let hours = date.getHours();
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      return `${year}-${month}-${day} ${String(hours).padStart(2, '0')}:${minutes}:${seconds} ${ampm}`;
    },

    // Feedback Methods
    openFeedbackModal(message) {
      this.selectedMessage = { ...message };
      this.feedbackForm.feedback = message.feedback || "";
      this.showFeedbackModal = true;
      this.clearFeedbackStatus();
      
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    },

    closeFeedbackModal() {
      this.selectedMessage = null;
      this.feedbackForm.feedback = "";
      this.showFeedbackModal = false;
      this.clearFeedbackStatus();
      
      // Restore body scroll
      document.body.style.overflow = 'auto';
    },

    async saveFeedback() {
      if (!this.feedbackForm.feedback.trim()) {
        this.feedbackStatus = {
          success: false,
          message: "Please enter feedback before saving.",
        };
        return;
      }

      if (!this.selectedMessage) {
        this.feedbackStatus = {
          success: false,
          message: "No message selected.",
        };
        return;
      }

      this.isSubmittingFeedback = true;
      try {
        const token = localStorage.getItem("adminToken");
        const response = await fetch(`${globalVariable}/admin/feedback_update/${this.selectedMessage.message_id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            feedback: this.feedbackForm.feedback,
            feedback_made_by: this.userEmail,
          }),
        });

        const data = await response.json();

        if (response.ok) {
          // Update the local job data
          const jobIndex = this.jobs.findIndex(job => job.message_id === this.selectedMessage.message_id);
          if (jobIndex !== -1) {
            this.jobs[jobIndex].feedback = this.feedbackForm.feedback;
            this.jobs[jobIndex].feedback_made_by = this.userEmail;
          }

          this.feedbackStatus = {
            success: true,
            message: "Feedback saved successfully!",
          };

          // Close modal after a brief delay to show success message
          setTimeout(() => {
            this.closeFeedbackModal();
            // Clear success message after closing modal
            setTimeout(() => {
              this.clearFeedbackStatus();
            }, 3000);
          }, 1500);
        } else {
          this.feedbackStatus = {
            success: false,
            message: data.message || "Failed to save feedback.",
          };
        }
      } catch (error) {
        console.error("Error saving feedback:", error);
        this.feedbackStatus = {
          success: false,
          message: "An error occurred while saving feedback.",
        };
      } finally {
        this.isSubmittingFeedback = false;
      }
    },

    clearFeedbackStatus() {
      this.feedbackStatus = {
        success: false,
        message: "",
      };
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

/* Custom Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  overflow-y: auto;
  padding: 20px;
}

.feedback-modal {
  background: white;
  border-radius: 12px;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3);
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  animation: modalSlideIn 0.3s ease-out;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-30px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 2px solid #f0f0f0;
  background: linear-gradient(135deg, #E960A6, #d155a0);
  color: white;
  border-radius: 12px 12px 0 0;
}

.modal-title {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  font-size: 2rem;
  color: white;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.1);
}

.modal-body {
  padding: 24px;
  max-height: 60vh;
  overflow-y: auto;
}

.info-card {
  background: #f8f9fa;
  border-radius: 8px;
  margin-bottom: 20px;
  border: 1px solid #e9ecef;
  overflow: hidden;
}

.card-header {
  padding: 12px 16px;
  background: #e9ecef;
  border-bottom: 1px solid #dee2e6;
}

.card-header.current {
  background: linear-gradient(135deg, #17a2b8, #138496);
  color: white;
}

.card-header.update {
  background: linear-gradient(135deg, #ffc107, #e0a800);
  color: #212529;
}

.card-header.new {
  background: linear-gradient(135deg, #28a745, #1e7e34);
  color: white;
}

.card-header h4 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.card-content {
  padding: 16px;
}

.current-feedback-text {
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 8px;
  line-height: 1.5;
}

.feedback-author {
  color: #6c757d;
  font-style: italic;
}

.form-group {
  margin-bottom: 16px;
}

.form-label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #495057;
}

.feedback-textarea {
  width: 100%;
  padding: 12px;
  border: 2px solid #dee2e6;
  border-radius: 6px;
  font-size: 14px;
  font-family: inherit;
  line-height: 1.5;
  resize: vertical;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}

.feedback-textarea:focus {
  outline: none;
  border-color: #E960A6;
  box-shadow: 0 0 0 3px rgba(233, 96, 166, 0.1);
}

.feedback-textarea:disabled {
  background-color: #f8f9fa;
  cursor: not-allowed;
}

.char-count {
  font-size: 12px;
  color: #6c757d;
  text-align: right;
  margin-top: 4px;
}

.attribution-info {
  background: #e7f3ff;
  border-left: 4px solid #0066cc;
  padding: 8px 12px;
  color: #0066cc;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  border-top: 2px solid #f0f0f0;
  background: #f8f9fa;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none !important;
}

.btn:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.btn-primary {
  background: linear-gradient(135deg, #E960A6, #d155a0);
  color: white;
}

.btn-cancel {
  background: linear-gradient(135deg, #6c757d, #5a6268);
  color: white;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Responsive Design */
@media (max-width: 768px) {
  .modal-overlay {
    padding: 10px;
  }
  
  .feedback-modal {
    max-height: 95vh;
  }
  
  .modal-footer {
    flex-direction: column;
  }
  
  .btn {
    width: 100%;
    justify-content: center;
  }
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
  background-color: teal;
  color: #E960A6;
}

.form-group {
  margin-bottom: 15px;
}
</style>