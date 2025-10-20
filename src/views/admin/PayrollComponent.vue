<template>
  <IndexComponent />
  <!-- Show nothing if user is not admin -->
  <div v-if="!isAdmin && userEmail" class="d-flex justify-content-center align-items-center" style="height: 50vh;">
    <div class="text-center">
      <i class="ti ti-lock" style="font-size: 4rem; color: #E960A6; margin-bottom: 1rem;"></i>
      <h3 class="text" style="color: #E960A6;">Access Denied</h3>
      <p class="text-muted">You don't have permission to access this page.</p>
    </div>
  </div>

  <!-- Show loading state while checking user -->
  <div v-else-if="!userEmail" class="d-flex justify-content-center align-items-center" style="height: 50vh;">
    <div class="text-center">
      <div class="spinner-border text-primary" role="status">
        <span class="sr-only">Loading...</span>
      </div>
      <p class="mt-3 text-muted">Checking permissions...</p>
    </div>
  </div>

  <!-- Admin content -->
  <div
    v-else
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
        <i class="ti ti-user-plus"></i> {{ form.id ? 'Update Payroll' : 'Register New Payroll' }}
      </h5>

      <form class="mx-4" @submit.prevent="submitForm">
        <div
          v-if="status.message"
          :class="['alert mt-3', status.success ? 'alert-success' : 'alert-danger']"
        >
          {{ status.message }}
        </div>

        <div class="form-group row">
          <div class="col-md-6">
            <label class="form-label">Seeker's name</label>
            <input type="text" v-model="form.seekers_name" class="form-control" required />
          </div>
          <div class="col-md-6">
            <label class="form-label">Provider's name</label>
            <input type="text" v-model="form.providers_name" class="form-control" required />
          </div>
          <div class="col-md-12">
            <label class="form-label">Provider's email</label>
            <input type="email" v-model="form.providers_email" class="form-control" required />
          </div>
        </div>
        
        <div class="form-group row">
          <div class="col-md-6">
            <label class="form-label">Job Title</label>
            <input type="text" v-model="form.title" class="form-control" required />
          </div>
          <div class="col-md-6">
            <label class="form-label">Accommodation Preference</label>
            <select v-model="form.accommodation" class="form-control" style="height: 48px; padding-top: 8px; padding-bottom: 8px;" required>
              <option value="" disabled>Choose Mode</option>
              <option value="Stay in">Stay In</option>
              <option value="Stay out">Stay out</option>
            </select>
          </div>
        </div>

        <div class="form-group row">
          <div class="col-md-6">
            <label class="form-label">Address</label>
            <input type="text" v-model="form.address" class="form-control" required />
          </div>
          <div class="col-md-6">
            <label class="form-label">Salary(RWF)</label>
            <input type="number" v-model="form.salary" class="form-control" required />
          </div>
        </div>

        <div class="form-group row">
          <div class="col-md-6">
            <label class="form-label">Starting Date</label>
            <input 
              type="date" 
              v-model="form.starting_date" 
              class="form-control" 
              required 
              @change="validateDates"
            />
          </div>
          <div class="col-md-6">
            <label class="form-label">Payment Date (Day of Month)</label>
            <input 
              type="date" 
              v-model="form.salary_date" 
              class="form-control" 
              required 
              :min="form.starting_date"
              @change="validateDates"
            />
            <small v-if="validationErrors.salary_date" class="text-danger">
              {{ validationErrors.salary_date }}
            </small>
          </div>
        </div>
     
        <div class="d-flex gap-2">
          <button 
            type="submit" 
            class="btn btn-primary mt-3" 
            :disabled="isSubmitting"
          >
            <span
              v-if="isSubmitting"
              class="spinner-border spinner-border-sm me-2"
              role="status"
              aria-hidden="true"
            ></span>
            {{ isSubmitting ? "Processing..." : form.id ? "Update Payroll" : "Submit Payroll" }}
          </button>
          
          <button 
            v-if="form.id" 
            type="button" 
            class="btn btn-secondary mt-3" 
            @click="cancelEdit"
          >
            Cancel
          </button>
        </div>
      </form>

      <!-- Confirmation Modal -->
      <div v-if="showModal" class="modal-overlay">
        <div class="modal-content">
          <h5>Are you sure you want to delete this payroll record?</h5>
          <div>
            <button class="btn btn-danger mt-3" @click="confirmDeletePayroll">Yes, Delete</button>
            &nbsp;
            <button class="btn btn-cancel mt-3" style="background-color: teal; color: white;" @click="closeModal">
              Cancel
            </button>
          </div>
        </div>
      </div>

      <hr class="my-4" />
      <!-- Search and Filter -->
      <div class="row mb-3 mx-4">
        <div class="col-md-8">
          <input v-model="searchQuery" class="form-control" placeholder="Search by seekers, provider, job title or address" />
        </div>
        <div class="col-md-4">
          <select v-model="filterStatus" style="height: 48px; padding-top: 8px; padding-bottom: 8px;" class="form-control">
            <option value="">Accommodation Preference</option>
            <option value="Stay in">Stay in</option>
            <option value="Stay out">Stay out</option>
          </select>
        </div>
      </div>
      
      <div v-if="filteredPayrolls.length === 0" class="text-muted px-4">.</div>
      <div v-if="filteredPayrolls.length === 0" class="d-flex justify-content-center my-4">
        <div class="btn btn-danger text-center" style="width: 40rem;">
          No payroll records available yet.
        </div>
      </div>

<div class="table-responsive" v-else>
        <table class="table table-bordered" style="min-width: 1200px;">
          <thead class="table-light">
            <tr>
              <th style="width: 50px;">Id</th>
              <th style="min-width: 120px;">S.name</th>
              <th style="min-width: 120px;">P.name</th>
              <th style="min-width: 180px;">P.email</th>
              <th style="min-width: 100px;">Job title</th>
              <th style="min-width: 100px;">Accommodation</th>
              <th style="min-width: 150px;">Address</th>
              <th style="min-width: 80px;">Salary</th>
              <th style="min-width: 100px;">Revenue Share</th>
              <th style="min-width: 100px;">Starting Date</th>
              <th style="min-width: 100px;">Payment Day</th>
              <th style="min-width: 120px;">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(payroll, index) in paginatedPayrolls" :key="payroll.id">
              <td>{{ (currentPage - 1) * itemsPerPage + index + 1 }}</td>
              <td v-html="highlightMatch(payroll.seekers_name)"></td>
              <td v-html="highlightMatch(payroll.providers_name)"></td>
              <td v-html="highlightMatch(payroll.providers_email)"></td>
              <td v-html="highlightMatch(payroll.title)"></td>
              <td v-html="highlightMatch(payroll.accommodation)"></td>
              <td v-html="highlightMatch(payroll.address)"></td>
              <td v-html="highlightMatch(payroll.salary)"></td>
              <td v-html="highlightMatch(Math.round(Number(payroll.salary) * 0.18))"></td>
              <td v-html="highlightMatch(formatDate(payroll.starting_date))"></td>
              <td v-html="highlightMatch(formatSalaryDateOrdinal(payroll.salary_date))"></td>
              <td>
                <button 
                  class="btn btn-primary btn-sm" 
                  @click="editPayroll(payroll)"
                >
                  Edit
                </button>
                <button 
                  class="btn btn-primary btn-sm" 
                  @click="openModal(payroll.id)"
                >
                  Delete
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      

      <!-- Pagination -->
      <nav class="mt-3" v-if="totalPages > 1">
        <ul class="pagination justify-content-center">
          <li class="page-item" :class="{ disabled: currentPage === 1 }">
            <button class="page-link" @click="changePage(currentPage - 1)">Previous</button>
          </li>
          <li
            v-for="page in pagesToShow"
            :key="page"
            :class="['page-item', { active: currentPage === page }]"
          >
            <button class="page-link" @click="changePage(page)">{{ page }}</button>
          </li>
          <li class="page-item" :class="{ disabled: currentPage === totalPages }">
            <button class="page-link" @click="changePage(currentPage + 1)">Next</button>
          </li>
        </ul>
      </nav>
    </div>
  </div>
</template>

<script>
import IndexComponent from "./IndexComponent.vue";
import { globalVariable } from "@/global";

export default {
  name: "PayrollWrapper",
  components: { IndexComponent },
  data() {
    return {
      form: {
        id: null,
        seekers_name: "",
        providers_name: "",
        providers_email: "",
        title: "",
        accommodation: "",
        address: "",
        salary: "",
        starting_date: "",
        salary_date: "",
      },
      payrolls: [],
      isSubmitting: false,
      status: {
        success: false,
        message: "",
      },
      userEmail: "",
      userId: "",
      showModal: false,
      selectedPayrollId: null,

      // Search, Filter & Pagination
      searchQuery: "",
      filterStatus: "",
      currentPage: 1,
      itemsPerPage: 10,
      
      // Validation errors
      validationErrors: {
        salary_date: ""
      }
    };
  },
  computed: {
    isAdmin() {
      return this.userEmail.toLowerCase() === "admin@kozi.rw";
    },
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
    filteredPayrolls() {
      const query = this.searchQuery.toLowerCase();
      return this.payrolls.filter((payroll) => {
        const seekersName = (payroll.seekers_name || "").toLowerCase();
        const providersName = (payroll.providers_name || "").toLowerCase();
           const providersEmail = (payroll.providers_email || "").toLowerCase();
        const title = (payroll.title || "").toLowerCase();
        const address = (payroll.address || "").toLowerCase();
        const formattedSalaryDate = this.formatSalaryDateOrdinal(payroll.salary_date).toLowerCase();

        const matchesSearch =
          seekersName.includes(query) || 
          providersName.includes(query) || 
          providersEmail.includes(query) ||
          title.includes(query) || 
          address.includes(query) ||
          formattedSalaryDate.includes(query);

        const matchesStatus =
          this.filterStatus === ""
            ? true
            : payroll.accommodation === this.filterStatus;

        return matchesSearch && matchesStatus;
      });
    },
    totalPages() {
      return Math.ceil(this.filteredPayrolls.length / this.itemsPerPage);
    },
    paginatedPayrolls() {
      const start = (this.currentPage - 1) * this.itemsPerPage;
      return this.filteredPayrolls.slice(start, start + this.itemsPerPage);
    },
  },
  mounted() {
    this.userEmail = localStorage.getItem("userEmail") || "";
    if (this.userEmail) {
      this.getUserIdFromEmail();
      // Only fetch payrolls if user is admin
      if (this.isAdmin) {
        this.fetchPayrolls();
      }
    }
  },
  methods: {
    // Cancel edit mode and reset form
    cancelEdit() {
      this.resetForm();
      this.status.message = "";
    },

    // Reset form to initial state
    resetForm() {
      this.form = {
        id: null,
        seekers_name: "",
        providers_name: "",
        providers_email: "",
        title: "",
        accommodation: "",
        address: "",
        salary: "",
        starting_date: "",
        salary_date: "",
      };
      
      // Clear validation errors
      this.validationErrors = {
        salary_date: ""
      };
    },

    // Validate that payment date is not less than starting date
    validateDates() {
      this.validationErrors.salary_date = "";
      
      if (this.form.starting_date && this.form.salary_date) {
        const startingDate = new Date(this.form.starting_date);
        const salaryDate = new Date(this.form.salary_date);
        
        if (salaryDate < startingDate) {
          this.validationErrors.salary_date = "Payment date cannot be earlier than starting date";
          return false;
        }
      }
      return true;
    },

    // Format date to show only YYYY-MM-DD
    formatDate(dateString) {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toISOString().split('T')[0];
    },
    
    // Format salary date to show day/month format (e.g., "31/12" for December 31st)
    formatSalaryDate(dateString) {
      if (!dateString) return '';
      const date = new Date(dateString);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      return `${day}/${month}`;
    },
    
    // Alternative: Format salary date to show full date in DD/MM/YYYY format
    formatSalaryDateFull(dateString) {
      if (!dateString) return '';
      const date = new Date(dateString);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    },
    
    // Format salary date as ordinal (e.g., "15th of every month")
    formatSalaryDateOrdinal(dateString) {
      if (!dateString) return '';
      const date = new Date(dateString);
      const day = date.getDate();
      
      const getOrdinal = (n) => {
        const s = ["th", "st", "nd", "rd"];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
      };
      
      return `${getOrdinal(day)} /month`;
    },

    openModal(id) {
      this.selectedPayrollId = id;
      this.showModal = true;
    },
    closeModal() {
      this.showModal = false;
      this.selectedPayrollId = null;
    },
    changePage(page) {
      if (page >= 1 && page <= this.totalPages) {
        this.currentPage = page;
      }
    },
    async confirmDeletePayroll() {
      const token = localStorage.getItem("adminToken");

      try {
        const res = await fetch(`${globalVariable}/admin/payroll/delete/${this.selectedPayrollId}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        const result = await res.json();

        if (res.ok) {
          this.status = {
            success: true,
            message: result.message || "Payroll record deleted successfully.",
          };
          this.fetchPayrolls();
        } else {
          this.status = {
            success: false,
            message: result.message || "Failed to delete payroll record.",
          };
        }
      } catch (err) {
        console.error("Delete error:", err);
        this.status = {
          success: false,
          message: "Unexpected error occurred while deleting.",
        };
      } finally {
        this.closeModal();
      }
    },
    async fetchPayrolls() {
      // Only fetch if user is admin
      if (!this.isAdmin) return;
      
      try {
        const token = localStorage.getItem("adminToken");
        const res = await fetch(`${globalVariable}/admin/payroll`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) throw new Error("Failed to fetch payrolls");
        const data = await res.json();
        this.payrolls = data;
        console.log("Payrolls loaded:", this.payrolls);
      } catch (err) {
        console.error("Error fetching payrolls:", err);
      }
    },
    async submitForm() {
      // Double check admin status
      if (!this.isAdmin) {
        this.status = {
          success: false,
          message: "Access denied: Admin privileges required.",
        };
        return;
      }

      console.log("Form data before submission:", this.form); // Debug log
      
      // Validate dates before submitting
      if (!this.validateDates()) {
        this.status = {
          success: false,
          message: "Please correct the validation errors before submitting.",
        };
        return;
      }

      this.isSubmitting = true;
      this.status.message = "";

      try {
        const token = localStorage.getItem("adminToken");

        const payload = {
          seekers_name: this.form.seekers_name,
          providers_name: this.form.providers_name,
          providers_email: this.form.providers_email,
          title: this.form.title,
          accommodation: this.form.accommodation,
          address: this.form.address,
          salary: this.form.salary,
          starting_date: this.form.starting_date,
          salary_date: this.form.salary_date,
        };

        // Add ID to payload if updating
        if (this.form.id) {
          payload.id = this.form.id;
        }

        const url = this.form.id
          ? `${globalVariable}/admin/payroll/${this.form.id}`
          : `${globalVariable}/admin/payroll`;

        const method = this.form.id ? "PUT" : "POST";

        console.log("API Call:", { method, url, payload }); // Debug log

        const response = await fetch(url, {
          method,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          const result = await response.json();
          this.status = {
            success: true,
            message: result.message || (this.form.id ? "Payroll updated successfully!" : "Payroll added successfully!"),
          };

          // Reset form
          this.resetForm();
          
          // Refresh the list
          this.fetchPayrolls();
        } else {
          const error = await response.text();
          this.status = {
            success: false,
            message: "Failed: " + error,
          };
        }
      } catch (err) {
        console.error("Error:", err);
        this.status = {
          success: false,
          message: "Unexpected error occurred.",
        };
      } finally {
        this.isSubmitting = false;
      }
    },
    editPayroll(payroll) {
      console.log("Editing payroll:", payroll); // Debug log
      
      const startingDate = payroll.starting_date
        ? new Date(payroll.starting_date).toISOString().split("T")[0]
        : "";
      
      const salaryDate = payroll.salary_date
        ? new Date(payroll.salary_date).toISOString().split("T")[0]
        : "";

      // Ensure we're setting the ID properly
      this.form = {
        id: payroll.id, // Make sure this is set
        seekers_name: payroll.seekers_name || "",
        providers_name: payroll.providers_name || "",
        providers_email: payroll.providers_email || "",
        title: payroll.title || "",
        accommodation: payroll.accommodation || "",
        address: payroll.address || "",
        salary: payroll.salary || "",
        starting_date: startingDate,
        salary_date: salaryDate,
      };
      
      // Clear validation errors when editing
      this.validationErrors = {
        salary_date: ""
      };
      
      console.log("Form after edit:", this.form); // Debug log
      
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    goToMore(id) {
      this.$router.push({ name: "admin/payroll-details", params: { id: id } });
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
    highlightMatch(text) {
      if (text === null || text === undefined) return "";
      const str = String(text); // convert to string
      if (!this.searchQuery) return str;
      const regex = new RegExp(`(${this.searchQuery})`, "gi");
      return str.replace(regex, `<span class="highlight-teal">$1</span>`);
    },
  },
};
</script>

<style scoped>

.btn-cancel {
  background-color: teal;
  color: white;
}

.btn-cancel:hover {
  background-color: teal;
  color: #E960A6;
}

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
        
.highlight-teal {
  background-color: #20c997;
  color: white;
  padding: 0 2px;
  border-radius: 3px;
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