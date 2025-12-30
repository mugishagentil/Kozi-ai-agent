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
      <!-- <p style="margin: 0.5rem 0; font-size: 0.9rem;"><strong>Your email:</strong> {{ userEmail }}</p>
      <p style="margin: 0.5rem 0; font-size: 0.9rem;"><strong>User ID:</strong> {{ userId }}</p> -->

      <div class="container-fluid">
        <!-- Stats Cards Row -->
        <div class="stats-cards-container">
          <!-- Job Providers Card -->
          <div class="stats-card">
            <div class="card-content">
              <div class="card-info">
                <div class="card-label">All Job Providers</div>
                <div class="card-value">{{ productsCount }}</div>
              </div>
              <div class="card-icon">
                <i class="ti ti-notebook"></i>
              </div>
            </div>
            <div class="card-gradient-bg"></div>
          </div>

          <!-- Job Seekers Card -->
          <div class="stats-card">
            <div class="card-content">
              <div class="card-info">
                <div class="card-label">All Job Seekers</div>
                <div class="card-value">{{ blogsCount }}</div>
              </div>
              <div class="card-icon">
                <i class="ti ti-archive"></i>
              </div>
            </div>
            <div class="card-gradient-bg"></div>
          </div>

          <!-- All Jobs Card -->
          <div class="stats-card">
            <div class="card-content">
              <div class="card-info">
                <div class="card-label">All Jobs</div>
                <div class="card-value">{{ teamCount }}</div>
              </div>
              <div class="card-icon">
                <i class="ti ti-users"></i>
              </div>
            </div>
            <div class="card-gradient-bg"></div>
          </div>
        </div>

        <!-- Payment Status & Benefits Section -->
        <div class="benefits-section">
          <h3 class="section-title">
            Payment Status & Benefits of Kozi Caretakers
          </h3>
          <hr class="section-divider">

          <div class="benefits-content">
            <!-- Image Section with Payment Button -->
            <div class="image-column">
              <div class="image-wrapper">
                <img :src="require('@/assets/img/payment-post.jpg')" alt="Registration" class="responsive-image" />
                
                <!-- Status Badge Overlay -->
                <div class="status-badge" :class="paymentStatusTone">
                  <div class="status-icon-wrapper">
                    <i :class="paymentStatusIconClass"></i>
                  </div>
                  <div class="status-text-wrapper">
                    <div class="status-label">{{ paymentStatusLabel }}</div>
                    <div class="status-message">{{ paymentStatusNoteText }}</div>
                  </div>
                </div>
              </div>

              <!-- Payment Button -->
              <div class="payment-action">
                <div v-if="paymentStatus === 'approved'" class="approved-banner">
                  <i class="fa-solid fa-circle-check"></i>
                  <span>Access Granted ✓</span>
                </div>
                <button
                  v-else
                  type="button"
                  class="pay-button"
                  @click="showPayment = true"
                  :disabled="paymentStatus === 'pending' || checkingPayment || paying"
                >
                  <i v-if="checkingPayment || paymentStatus === 'pending' || paying" class="fa-solid fa-spinner fa-spin"></i>
                  <i v-else class="fa-solid fa-wallet"></i>
                  <span v-if="checkingPayment">Checking Status...</span>
                  <span v-else-if="paymentStatus === 'pending'">Processing Payment...</span>
                  <span v-else-if="paying">Processing...</span>
                  <span v-else>Unlock Premium Access</span>
                </button>
              </div>
            </div>

            <!-- Instructions Section -->
            <div class="benefits-instructions">
              <h2 class="instructions-title">How It Works</h2>
              <hr class="instructions-divider" />

              <div class="premium-notice">
                <p>
                  <strong>N.B:</strong> A one-time payment grants access to exclusive premium features for only advanced workers!
                </p>
              </div>

              <div class="steps-container">
                <div class="step-item" v-for="(step, index) in steps" :key="index">
                  <div class="step-icon">{{ step.icon }}</div>
                  <div class="step-content">
                    <div class="step-number">STEP {{ index + 1 }}</div>
                    <div class="step-text">{{ step.text }}</div>
                  </div>
                </div>
              </div>

              <div class="footer-note">
                🚀 Track your progress and accelerate your career journey with us!
              </div>
            </div>
          </div>
        </div>

        <!-- Payment Modal -->
        <div v-if="showPayment" class="modal-overlay" @click="closePayment">
          <div class="modal-card" @click.stop>
            <div class="modal-header">
              <h4>Complete Payment</h4>
              <button class="close-btn" @click="closePayment">×</button>
            </div>
            <div class="modal-body">
              <div class="modal-row">
                <label>
                  <i class="fa-solid fa-envelope"></i>
                  Email
                </label>
                <input type="text" :value="userEmail" readonly />
              </div>
              <div class="modal-row">
                <label>
                  <i class="fa-solid fa-user"></i>
                  Name
                </label>
                <input type="text" :value="`${firstName} ${lastName}`.trim()" readonly />
              </div>
              <div class="modal-row">
                <label>
                  <i class="fa-solid fa-dollar-sign"></i>
                  Amount (RWF)
                </label>
                <input type="number" :value="amount" readonly />
              </div>
              <div class="modal-row">
                <label>
                  <i class="fa-solid fa-phone"></i>
                  MoMo Number
                </label>
                <input
                  type="tel"
                  v-model="msisdn"
                  placeholder="07XXXXXXXX"
                  class="editable-input"
                />
              </div>
              <p class="helper-text">💡 Charges included. Payment method: MoMo.</p>
              <div v-if="payFeedback" :class="['pay-alert', payFeedbackColor === 'green' ? 'success' : 'error']">
                {{ payFeedback }}
              </div>
            </div>
            <div class="modal-footer">
              <button class="secondary" @click="closePayment" :disabled="paying">Cancel</button>
              <button class="primary" @click="initiatePayment" :disabled="paying || !amount || !msisdn">
                <i v-if="paying" class="fa-solid fa-spinner fa-spin"></i>
                <i v-else class="fa-solid fa-circle-check"></i>
                <span v-if="!paying">Pay now</span>
                <span v-else>Processing…</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { globalVariable } from "@/global";
import IndexComponent from "./IndexComponent.vue";
import axios from "axios";

export default {
  name: "WelcomeComponent",
  components: {
    IndexComponent,
  },
  data() {
    return {
      productsCount: 0,
      blogsCount: 0,
      teamCount: 0,
      userEmail: "",
      userId: "",
      firstName: "",
      lastName: "",
      job_seeker_id: "",
      showPayment: false,
      amount: 1500,
      msisdn: "",
      paying: false,
      payFeedback: "",
      payFeedbackColor: "green",
      paymentStatus: "unknown",
      paymentStatusNote: "",
      checkingPayment: false,
      steps: [
        { icon: "💰", text: 'Click "Unlock Premium Access" button' },
        { icon: "📱", text: "Enter your MoMo number (07XXXXXXXX)" },
        { icon: "🔐", text: "Confirm payment with your MoMo PIN" },
        { icon: "⚡", text: "Instant access within 60 seconds" },
      ],
    };
  },
  computed: {
    paymentStatusLabel() {
      switch (this.paymentStatus) {
        case "approved":
          return "Payment approved";
        case "pending":
          return "Payment pending";
        case "failed":
          return "Payment failed";
        default:
          return "Payment required";
      }
    },
    paymentStatusIconClass() {
      switch (this.paymentStatus) {
        case "approved":
          return "fa-solid fa-circle-check";
        case "pending":
          return "fa-solid fa-clock";
        case "failed":
          return "fa-solid fa-circle-exclamation";
        default:
          return "fa-solid fa-wallet";
      }
    },
    paymentStatusTone() {
      switch (this.paymentStatus) {
        case "approved":
          return "status-approved";
        case "pending":
          return "status-pending";
        case "failed":
          return "status-failed";
        default:
          return "status-default";
      }
    },
    paymentStatusNoteText() {
      if (this.paymentStatusNote) return this.paymentStatusNote;
      switch (this.paymentStatus) {
        case "approved":
          return "Access already granted.";
        case "pending":
          return "We are waiting for confirmation.";
        case "failed":
          return "Previous attempt failed; you can try again.";
        default:
          return "Make a one-time payment to unlock premium access.";
      }
    },
  },
  mounted() {
    this.fetchDashboardCounts();
    this.checkProfileStatus();
    this.getUserIdFromEmail();
  },
  methods: {
    async fetchDashboardCounts() {
      try {
        const providerRes = await axios.get(`${globalVariable}/providers/counts`);
        this.productsCount = providerRes.data.count || 0;

        const seekersRes = await axios.get(`${globalVariable}/seekers/count`);
        this.blogsCount = seekersRes.data.count || 0;

        const jobsRes = await axios.get(`${globalVariable}/jobs/count`);
        this.teamCount = jobsRes.data.count || 0;
      } catch (error) {
        console.error("Error fetching dashboard counts:", error);
      }
    },

    async getUserIdFromEmail() {
      const token = localStorage.getItem("employeeToken") || localStorage.getItem("authToken");
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
          await Promise.all([this.fetchProfile(), this.fetchPaymentStatus()]);
        }
      } catch (err) {
        console.error("Error getting userId:", err);
      }
    },
    async fetchProfile() {
      try {
        const token = localStorage.getItem("employeeToken") || localStorage.getItem("authToken");
        const res = await fetch(`${globalVariable}/seeker/view_profile/${this.userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) {
          this.firstName = data.first_name || "";
          this.lastName = data.last_name || "";
          this.job_seeker_id = data.job_seeker_id || "";
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
      }
    },
    async fetchPaymentStatus() {
      if (!this.userId) return;
      this.checkingPayment = true;
      try {
        const token = localStorage.getItem("employeeToken") || localStorage.getItem("authToken");
        const res = await fetch(`${globalVariable}/jobseeker/payment/status/${this.userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) {
          let rawStatus = "";
          if (Array.isArray(data) && data.length > 0) {
            rawStatus = data[0].payment || data[0].status || "";
          } else if (data && typeof data === "object") {
            rawStatus = data.payment || data.status || "";
          }

          const normalized = (rawStatus || "").toString().toLowerCase();
          if (normalized === "approved") {
            this.paymentStatus = "approved";
            this.paymentStatusNote = data.message || "Access already granted.";
          } else if (normalized === "pending") {
            this.paymentStatus = "pending";
            this.paymentStatusNote = data.message || "We are waiting for confirmation.";
          } else if (normalized === "") {
            this.paymentStatus = "unknown";
            this.paymentStatusNote = data.message || "Payment required to unlock access.";
          } else if (normalized === "failed") {
            this.paymentStatus = "failed";
            this.paymentStatusNote = data.message || "Previous attempt failed; you can try again.";
          } else {
            this.paymentStatus = "unknown";
            this.paymentStatusNote = data.message || "Payment required to unlock access.";
          }
        } else {
          this.paymentStatus = "unknown";
          this.paymentStatusNote = data.message || "Could not check payment status.";
        }
      } catch (err) {
        console.error("Error fetching payment status:", err);
        this.paymentStatus = "unknown";
        this.paymentStatusNote = "Could not check payment status.";
      } finally {
        this.checkingPayment = false;
      }
    },
    closePayment() {
      this.showPayment = false;
      this.payFeedback = "";
      this.payFeedbackColor = "green";
      this.amount = 1500;
      this.msisdn = "";
    },
    async initiatePayment() {
      if (this.paymentStatus === "approved") {
        this.payFeedback = "Payment already approved.";
        this.payFeedbackColor = "green";
        return;
      }
      if (this.paymentStatus === "pending") {
        this.payFeedback = "Payment is already pending confirmation.";
        this.payFeedbackColor = "green";
        return;
      }

      if (!this.userEmail || !this.firstName || !this.lastName || !this.amount || !this.msisdn) {
        this.payFeedback = "Missing required fields.";
        this.payFeedbackColor = "red";
        return;
      }

      this.paying = true;
      this.payFeedback = "Initiating payment...";
      this.paymentStatus = "pending";
      this.paymentStatusNote = "Awaiting confirmation.";

      const payload = {
        email: this.userEmail,
        cname: `${this.firstName} ${this.lastName}`.trim(),
        amount: this.amount,
        cnumber: "0789524429",
        msisdn: this.msisdn,
        currency: "RWF",
        pmethod: "momo",
        chargesIncluded: "true",
      };

      try {
        const res = await fetch("https://xentripay.com/api/collections/initiate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-XENTRIPAY-KEY": "3a2a72448d744d69b596b92523739386",
          },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (res.ok && data.success === 1 && data.refid) {
          this.payFeedback = data.reply || "Payment initiated. Complete on your phone.";
          this.payFeedbackColor = "green";
          await this.pollPaymentStatus(data.refid);
        } else {
          this.payFeedback = data.reply || data.message || "Payment initiation failed.";
          this.payFeedbackColor = "red";
          this.paying = false;
        }
      } catch (err) {
        console.error("Payment initiation error:", err);
        this.payFeedback = "Network or server error during payment.";
        this.payFeedbackColor = "red";
        this.paying = false;
      }
    },
    async pollPaymentStatus(refid) {
      const maxAttempts = 12;
      let attempts = 0;

      this.payFeedback = "Checking payment status...";

      const checkStatus = async () => {
        try {
          const res = await fetch(`https://xentripay.com/api/collections/status/${refid}`, {
            headers: {
              "X-XENTRIPAY-KEY": "3a2a72448d744d69b596b92523739386",
            },
          });

          const data = await res.json();
          
          if (data.status === "SUCCESS") {
            this.payFeedback = "Payment successful! ✓";
            this.payFeedbackColor = "green";
            this.paymentStatus = "approved";
            this.paymentStatusNote = "Access already granted.";
            await this.updatePaymentStatus();
            this.paying = false;
            return true;
          } else if (data.status === "FAILED") {
            this.payFeedback = "Payment failed. Please try again.";
            this.payFeedbackColor = "red";
            this.paymentStatus = "failed";
            this.paymentStatusNote = "Last attempt failed.";
            this.paying = false;
            return true;
          } else if (data.status === "PENDING") {
            attempts++;
            if (attempts >= maxAttempts) {
              this.payFeedback = "Payment status check timed out. Please verify manually.";
              this.payFeedbackColor = "red";
              this.paymentStatusNote = "Please confirm if payment went through.";
              this.paying = false;
              return true;
            }
            this.payFeedback = `Waiting for payment confirmation... (${attempts}/${maxAttempts})`;
            setTimeout(() => checkStatus(), 5000);
            return false;
          }
        } catch (err) {
          console.error("Status check error:", err);
          this.payFeedback = "Error checking payment status.";
          this.payFeedbackColor = "red";
          this.paying = false;
          return true;
        }
      };

      await checkStatus();
    },
    async updatePaymentStatus() {
      try {
        const token = localStorage.getItem("employeeToken") || localStorage.getItem("authToken");
        const res = await fetch(`${globalVariable}/admin/approve_job_seeker/${this.job_seeker_id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();
        if (res.ok) {
          console.log("Payment approved successfully");
          this.payFeedback = data.message || "Payment approved! You will receive a confirmation email.";
          this.paymentStatus = "approved";
          this.paymentStatusNote = data.message || "Access already granted.";
        } else {
          console.error("Failed to approve payment:", data.message);
        }
      } catch (err) {
        console.error("Error updating payment status:", err);
      }
    },
    async checkProfileStatus() {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        this.userEmail = payload.email;

        // 1. Get userId from email
        const res = await axios.get(`${globalVariable}/get_user_id_by_email/${this.userEmail}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        this.userId = res.data.users_id;

        // 2. Check if profile is complete
        const checkRes = await axios.get(`${globalVariable}/seekers/check_columns/${this.userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const isComplete = checkRes.data.isComplete;

        // 3. Redirect if profile is incomplete
        if (!isComplete) {
          this.$router.push("/dashboard/Edit-Profile");
        }
      } catch (error) {
        console.error("Error checking profile completeness:", error);
      }
    },
  },
};
</script>


<style scoped>
/* Stats Cards Container */
.stats-cards-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;
  padding: 0 1rem;
}

/* Individual Stats Card */
.stats-card {
  position: relative;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 20px;
  padding: 2rem;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.stats-card:hover {
  transform: translateY(-10px);
  box-shadow: 0 30px 60px rgba(0, 0, 0, 0.15);
}

.stats-card:nth-child(1) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.stats-card:nth-child(2) {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.stats-card:nth-child(3) {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.card-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  z-index: 2;
}

.card-info {
  flex: 1;
}

.card-label {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.8);
  text-transform: uppercase;
  font-weight: 600;
  letter-spacing: 0.5px;
  margin-bottom: 0.5rem;
}

.card-value {
  font-size: 2.5rem;
  font-weight: 700;
  color: white;
  line-height: 1;
}

.card-icon {
  font-size: 3rem;
  color: rgba(255, 255, 255, 0.3);
  margin-left: 1rem;
}

.card-gradient-bg {
  position: absolute;
  top: 0;
  right: 0;
  width: 100px;
  height: 100px;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
  border-radius: 50%;
  transform: translate(30px, -30px);
}

/* Benefits Section */
.benefits-section {
  margin-top: 3rem;
  padding: 0 1rem;
}

.section-title {
  text-align: center;
  color: #5F9EA0;
  font-family: 'Michroma', sans-serif;
  font-size: 1.8rem;
  margin-bottom: 1rem;
  font-weight: 600;
}

.section-divider {
  margin: 20px auto;
  border: 0;
  height: 2px;
  width: 60%;
  background: linear-gradient(90deg, #EA60A7, #5F9EA0);
  border-radius: 2px;
}

.benefits-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3rem;
  align-items: center;
  margin-top: 2rem;
}

.benefits-image {
  width: 100%;
}

/* Image Column Container */
.image-column {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Image Wrapper */
.image-wrapper {
  position: relative;
  width: 100%;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.15);
}

.responsive-image {
  width: 100%;
  height: 600px;
  object-fit: cover;
  display: block;
}

/* Status Badge Overlay */
.status-badge {
  position: absolute;
  top: 2rem;
  left: 2rem;
  right: 2rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  border-radius: 15px;
  backdrop-filter: blur(10px);
  background: rgba(255, 255, 255, 0.95);
  border: 2px solid;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  animation: slideDown 0.5s ease;
}

@keyframes slideDown {
  from {
    transform: translateY(-20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.status-approved {
  border-color: #28a745;
  background: rgba(40, 167, 69, 0.95);
}

.status-approved .status-label,
.status-approved .status-message {
  color: white;
}

.status-approved .status-icon-wrapper {
  color: white;
}

.status-pending {
  border-color: #ffc107;
  background: rgba(255, 193, 7, 0.1);
}

.status-failed {
  border-color: #dc3545;
  background: rgba(220, 53, 69, 0.1);
}

.status-default {
  border-color: #EA60A7;
  background: rgba(234, 96, 167, 0.1);
}

.status-icon-wrapper {
  font-size: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-approved .status-icon-wrapper {
  color: white;
}

.status-pending .status-icon-wrapper {
  color: #ffc107;
}

.status-failed .status-icon-wrapper {
  color: #dc3545;
}

.status-default .status-icon-wrapper {
  color: #EA60A7;
}

.status-text-wrapper {
  flex: 1;
}

.status-label {
  font-size: 1.1rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
  color: #333;
}

.status-message {
  font-size: 0.9rem;
  color: #666;
  font-weight: 500;
}

/* Payment Action Area */
.payment-action {
  width: 100%;
}

.pay-button {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 1.25rem 2rem;
  background: linear-gradient(135deg, #EA60A7 0%, #FF6B9D 100%);
  color: #fff;
  border: none;
  border-radius: 14px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 8px 25px rgba(234, 96, 167, 0.4);
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.pay-button:hover:not(:disabled) {
  transform: translateY(-3px);
  box-shadow: 0 12px 35px rgba(234, 96, 167, 0.5);
}

.pay-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.pay-button i {
  font-size: 1.3rem;
}

.approved-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 1.25rem 2rem;
  background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
  color: #fff;
  border-radius: 14px;
  font-size: 1.1rem;
  font-weight: 600;
  box-shadow: 0 8px 25px rgba(40, 167, 69, 0.3);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.approved-banner i {
  font-size: 1.3rem;
}

.benefits-instructions {
  padding: 2rem;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 15px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

.instructions-title {
  color: #5F9EA0;
  font-size: 1.5rem;
  margin-bottom: 1rem;
  font-weight: 600;
}

.instructions-divider {
  margin: 15px 0;
  border: 0;
  height: 2px;
  width: 60%;
  background: linear-gradient(90deg, #EA60A7, #5F9EA0);
  border-radius: 2px;
}

.premium-notice {
  background: linear-gradient(135deg, #EA60A7, #f093fb);
  color: white;
  padding: 1rem;
  border-radius: 10px;
  margin-bottom: 2rem;
  text-align: center;
}

.premium-notice p {
  margin: 0;
  font-weight: 500;
}

.steps-container {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  margin: 2rem 0;
}

.step-item {
  display: flex;
  align-items: flex-start;
  gap: 1.25rem;
  background: white;
  padding: 1.5rem 1.25rem;
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  min-width: 0;
  width: 100%;
  margin: 0;
}

.step-item:hover {
  transform: translateX(8px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
}

.step-icon {
  font-size: 2.25rem;
  flex-shrink: 0;
  line-height: 1;
  width: 3rem;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
}

.step-content {
  flex: 1;
  min-width: 0;
  overflow-wrap: break-word;
  word-wrap: break-word;
}

.step-number {
  font-size: 0.75rem;
  font-weight: 700;
  color: #5F9EA0;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 0.25rem;
  line-height: 1.2;
}

.step-text {
  font-size: 0.95rem;
  color: #333;
  font-weight: 500;
  line-height: 1.5;
  margin: 0;
  word-break: break-word;
}

.footer-note {
  text-align: center;
  padding: 1.25rem;
  background: rgba(95, 158, 160, 0.1);
  border-radius: 12px;
  color: #666;
  font-size: 0.95rem;
  font-weight: 500;
}

/* Modal Overlay */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
  backdrop-filter: blur(4px);
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* Modal Card */
.modal-card {
  background: #fff;
  border-radius: 20px;
  width: 100%;
  max-width: 500px;
  box-shadow: 0 25px 70px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  animation: modalSlideUp 0.3s ease;
}

@keyframes modalSlideUp {
  from {
    transform: translateY(30px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* Modal Header */
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem 2rem;
  background: linear-gradient(135deg, #EA60A7 0%, #FF6B9D 100%);
  color: white;
}

.modal-header h4 {
  margin: 0;
  font-size: 1.3rem;
  font-weight: 600;
}

.close-btn {
  border: none;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s ease;
  line-height: 1;
  padding: 0;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* Modal Body */
.modal-body {
  padding: 2rem;
  max-height: 60vh;
  overflow-y: auto;
}

.modal-row {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.modal-row label {
  font-weight: 600;
  color: #333;
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.modal-row label i {
  color: #EA60A7;
  font-size: 16px;
}

.modal-row input {
  padding: 0.9rem 1rem;
  border: 2px solid #e1e4e8;
  border-radius: 10px;
  font-size: 1rem;
  transition: all 0.2s ease;
  background: #f8f9fa;
  color: #666;
  cursor: not-allowed;
}

.modal-row input.editable-input {
  background: #fff;
  color: #333;
  cursor: text;
}

.modal-row input.editable-input:focus {
  outline: none;
  border-color: #EA60A7;
  box-shadow: 0 0 0 3px rgba(234, 96, 167, 0.1);
}

.modal-row input::placeholder {
  color: #999;
}

.helper-text {
  margin: -0.5rem 0 1rem;
  color: #666;
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

/* Payment Alert */
.pay-alert {
  padding: 1rem 1.25rem;
  border-radius: 10px;
  font-weight: 500;
  margin-top: 1rem;
  animation: alertSlide 0.3s ease;
  font-size: 0.95rem;
  border: 2px solid;
}

@keyframes alertSlide {
  from {
    transform: translateY(-10px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.pay-alert.success {
  background: #d4edda;
  color: #155724;
  border-color: #c3e6cb;
}

.pay-alert.error {
  background: #f8d7da;
  color: #721c24;
  border-color: #f5c6cb;
}

/* Modal Footer */
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1.5rem 2rem;
  background: #f8f9fa;
  border-top: 1px solid #e9ecef;
}

.modal-footer button {
  padding: 0.9rem 2rem;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  font-weight: 600;
  font-size: 1rem;
  transition: all 0.2s ease;
  min-width: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.modal-footer button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.modal-footer .secondary {
  background: #e9ecef;
  color: #495057;
  border: 2px solid #dee2e6;
}

.modal-footer .secondary:hover:not(:disabled) {
  background: #dee2e6;
}

.modal-footer .primary {
  background: linear-gradient(135deg, #EA60A7 0%, #FF6B9D 100%);
  color: #fff;
  box-shadow: 0 4px 15px rgba(234, 96, 167, 0.3);
}

.modal-footer .primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(234, 96, 167, 0.4);
}

.modal-footer .primary:active:not(:disabled) {
  transform: translateY(0);
}

.modal-footer button i {
  font-size: 18px;
}

/* Mobile Responsiveness - Keep cards in single row */
@media (max-width: 768px) {
  /* Override body-wrapper styles on mobile */
  .body-wrapper {
    margin-left: 0 !important;
    margin-top: 70px !important;
    max-height: calc(100vh - 70px) !important;
    overflow-y: auto !important;
  }

  .stats-cards-container {
    grid-template-columns: repeat(3, 1fr);
    gap: 0.8rem;
    padding: 0 0.5rem;
  }
  
  .stats-card {
    padding: 1rem;
  }
  
  .card-value {
    font-size: 1.5rem;
  }
  
  .card-icon {
    font-size: 2rem;
  }
  
  .card-label {
    font-size: 0.7rem;
  }
  
  .benefits-content {
    grid-template-columns: 1fr;
    gap: 2rem;
    display: flex;
    flex-direction: column;
  }

  /* Hide image on mobile */
  .image-wrapper {
    display: none;
  }

  /* Reorder: Instructions first, then button */
  .benefits-instructions {
    order: 1;
  }

  .image-column {
    order: 2;
  }

  .payment-action {
    order: 1;
  }
  
  .section-title {
    font-size: 1.4rem;
  }
  
  .benefits-instructions {
    padding: 1.5rem;
  }
  
  .instructions-title {
    font-size: 1.3rem;
  }
  
  .step-item {
    flex-direction: row;
    padding: 1rem;
    gap: 0.85rem;
  }

  .step-icon {
    font-size: 1.8rem;
    width: 2rem;
  }
  
  .step-text {
    font-size: 0.9rem;
  }
}

@media (max-width: 480px) {
  .stats-cards-container {
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
    padding: 0 0.25rem;
  }
  
  .stats-card {
    padding: 0.8rem;
  }
  
  .card-content {
    flex-direction: column;
    text-align: center;
  }
  
  .card-value {
    font-size: 1.3rem;
  }
  
  .card-icon {
    font-size: 1.8rem;
    margin-left: 0;
    margin-top: 0.5rem;
  }
  
  .card-label {
    font-size: 0.65rem;
    line-height: 1.2;
  }
  
  .benefits-instructions {
    padding: 1rem;
  }
  
  .section-title {
    font-size: 1.2rem;
    padding: 0 1rem;
  }
}

/* Very small screens optimization */
@media (max-width: 320px) {
  .stats-cards-container {
    gap: 0.3rem;
  }
  
  .stats-card {
    padding: 0.6rem;
  }
  
  .card-value {
    font-size: 1.1rem;
  }
  
  .card-icon {
    font-size: 1.5rem;
  }
  
  .card-label {
    font-size: 0.6rem;
  }
}

/* Animation for cards loading */
@keyframes cardSlideIn {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.stats-card {
  animation: cardSlideIn 0.6s ease-out;
}

.stats-card:nth-child(1) {
  animation-delay: 0.1s;
}

.stats-card:nth-child(2) {
  animation-delay: 0.2s;
}

.stats-card:nth-child(3) {
  animation-delay: 0.3s;
}
</style>