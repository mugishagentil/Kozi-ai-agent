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
      <!-- <div v-if="userEmail" class="card-body">
        <h5 class="text-center">Logged in as:</h5>
        <h6 class="text-center text-muted">{{ userEmail }}</h6>
        <p><strong>users_id:</strong> {{ userId }}</p>
        <h6 class="text-center text-muted">
          Status:
          <span :class="[getStatusLabel(jobStatus).colorClass, 'fw-bold']">
            {{ getStatusLabel(jobStatus).text }}
          </span>
        </h6>
      </div> -->

      <div v-if="jobStatus === 0" class="alert alert-warning text-center mx-4">
        Your account is pending approval. You cannot add or edit jobs until approved.
      </div>

      <h5 class="card-title fw-semibold mb-4" style="color: #E960A6;">
        <i class="ti ti-settings"></i> Add Jobs
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
            <label class="form-label">Job Title</label>
            <input type="text" v-model="form.job_title" class="form-control" :disabled="jobStatus === 0" required />
          </div>
          <div class="col-md-6">
            <label class="form-label">Company Name / Your name</label>
            <input type="text" v-model="form.company" class="form-control" :disabled="jobStatus === 0" required />
          </div>
        </div>

        <div class="form-group row">
          <div class="col-md-6">
          <label class="form-label">Working Mode</label>
          <select v-model="form.location" class="form-control" :disabled="jobStatus === 0" required>
          <option value="" disabled>Choose mode</option>
          <option value="Remote">Remote</option>
          <option value="Full Time">Full Time</option>
          </select>
          </div>
          <div class="col-md-6">
            <label class="form-label">Deadline Date</label>
            <input type="date" v-model="form.deadline_date" class="form-control" :disabled="jobStatus === 0" :min="minDeadlineDate" required />
          </div>
        </div>

        <div class="form-group row">
          
          <div class="col-md-6">
  <label class="form-label">Category</label>
  <select 
    v-model="form.category_id" 
    class="form-control" 
    style="height: 48px; padding-top: 8px; padding-bottom: 8px;" 
    :disabled="jobStatus === 0" 
    required
    @change="onCategoryChange"
  >
    <option disabled value="">Select Category</option>
    <option 
      v-for="cat in categories" 
      :key="cat.id" 
      :value="cat.id"
    >
      {{ cat.name }}
    </option>
  </select>
  <!-- Debug display -->
  <!-- <small class="text-muted">Selected ID: {{ form.category_id }}</small> -->
</div>

          <div class="col-md-6">
            <label class="form-label">logo If applicable</label>
            <div v-if="form.logo && typeof form.logo === 'string'" class="mb-2">
              <img :src="uploadsUrl + form.logo" alt="Current Logo" class="custom-job-logo" width="150" />
            </div>
            <input type="file" @change="handleFileUpload" class="form-control"  :disabled="jobStatus === 0" />
            <small class="form-text text-muted">Maximum file size: 1MB</small>
          </div>
        </div>

        <div class="form-group row">
          <div class="col-md-12">
            <label class="form-label">Job Description</label>
            <textarea
              v-model="form.job_description"
              class="form-control"
              style="height: 100px;"
              :disabled="jobStatus === 0"
              required
            ></textarea>
          </div>
        </div>
        <div class="form-group row">
          <div class="col-md-12">
            <label class="form-label">Requirements</label>
            <textarea
              v-model="form.requirements"
              class="form-control"
              style="height: 100px;"
              :disabled="jobStatus === 0"
              required
            ></textarea>
          </div>
        </div>
        <div class="form-group row">
          <div class="col-md-12">
            <label class="form-label">Responsability</label>
            <textarea
              v-model="form.responsability"
              class="form-control"
              style="height: 100px;"
              :disabled="jobStatus === 0"
              required
            ></textarea>
          </div>
        </div>

        <div class="form-group row">
          <div class="col-md-6">
            <label class="form-label">Salary Min</label>
            <input type="number" v-model="form.salary_min" class="form-control" :disabled="jobStatus === 0" required />
          </div>
          <div class="col-md-6">
            <label class="form-label">salary Max</label>
            <input type="number" v-model="form.salary_max" class="form-control" :disabled="jobStatus === 0" required />
          </div>
        </div>
        <div class="form-group row">
          <div class="col-md-12">
            <label class="form-label">conclusion </label>
            <textarea
              v-model="form.conclusion"
              class="form-control"
              style="height: 100px;"
              :disabled="jobStatus === 0"
              required
            ></textarea>
          </div>
        </div>


        <button type="submit" class="btn btn-primary mt-3" :disabled="isSubmitting || jobStatus === 0">
          <span
            v-if="isSubmitting"
            class="spinner-border spinner-border-sm me-2"
            role="status"
            aria-hidden="true"
          ></span>
          {{ isSubmitting ? "Submitting..." : form.job_id ? "Update Job" : "Submit Job" }}
        </button>
      </form>

      <hr class="my-4" />
      <h5 class="fw-semibold mb-3">Your Jobs</h5>

      <div v-if="jobs.length === 0" class="text-muted">No jobs available yet.</div>

      <div class="table-responsive">
        <table class="table table-bordered">
          <thead class="table-light">
            <tr>
              <th>Id</th>
              <th>Title</th>
              <th>Company</th>
              <th>Description</th>
              <th>Requirements</th>
              <th>Responsability</th>
              <th>salary-min</th>
              <th>salary-max</th>
              <th>Working mode</th>
              <th>Category</th>
              <th>Deadline</th>
              <th>Conclusion</th>
              <th>Logo</th>
              <th>Status</th>
              
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(job, index) in jobs" :key="job.job_id">
              <td>{{ index + 1 }}</td>
              <td>{{ job.job_title }}</td>
              <td>{{ job.job_description }}</td>
              <td>{{ job.requirements }}</td>
              <td>{{ job.responsability }}</td>
              <td>{{ job.company }}</td>
              
              <td>{{ job.salary_max }}</td>
              <td>{{ job.salary_min }}</td>
              <td>{{ job.location }}</td>
              <td>{{ getCategoryName(job.category_id) }}</td>
              
               <td>{{ job.deadline_date ? job.deadline_date.substring(0, 10) : "" }}</td>
               <td>{{ job.conclusion }}</td>
              <td>
                <img
    :src="uploadsUrl + job.logo"
    @error="onLogoError($event)"
    alt="Logo"
    class="custom-job-logo"
    width="100"
    height="50"
  />

              </td>

              <td>
                <span :class="[getStatusLabel(job.status).colorClass, 'fw-bold']">
                  {{ getStatusLabel(job.status).text }}
                </span>
              </td>
              
              <td>
                <button class="btn btn-primary mt-3" @click="editJob(job)" :disabled="jobStatus === 0">Edit</button>
              </td>
            </tr>
          </tbody>
        </table>
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
    defaultImage: require("@/assets/img/logo.png"),
    form: {
      job_id: null,
      job_title: "",
      company: "",
      deadline_date: "",
      job_description: "",
      requirements: "",
      responsability: "",
      salary_min: "",
      salary_max: "",
      conclusion: "",
      logo: "",
      location: "",
      category_id: "",
    },
    jobs: [],
    categories: [],
    categoryNames: {},
    // Remove this unused variable: selectedCategoryId: null,
    isSubmitting: false,
    status: {
      success: false,
      message: "",
    },
    userEmail: "",
    userId: "",
    jobStatus: null,
    minDeadlineDate: "",
  };
},

  mounted() {
    const token = localStorage.getItem("employerToken");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        this.userEmail = payload.email;
      } catch (e) {
        console.error("Invalid token format", e);
      }
    }
    this.setMinDeadlineDate();
    this.fetchCategories();
    if (this.userEmail) {
      this.getUserIdFromEmail();
    }
  },
  methods: {

    onLogoError(event) {
    event.target.src = this.defaultImage;
  },

    onCategoryChange() {
  console.log("Category changed to:", this.form.category_id);
  console.log("Category type:", typeof this.form.category_id);
},
    handleFileUpload(event) {
      this.form.logo = event.target.files[0];
    },
    setMinDeadlineDate() {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      this.minDeadlineDate = tomorrow.toISOString().split("T")[0];
    },

async submitForm() {
  this.isSubmitting = true;
  this.status.message = "";

  try {
    // Debug: Check form values before submission
    console.log("Form data before submit:", this.form);
    console.log("Category ID value:", this.form.category_id);
    console.log("Category ID type:", typeof this.form.category_id);
    
    // Validate required fields
    if (!this.form.category_id || this.form.category_id === "") {
      this.status = {
        success: false,
        message: "Please select a category.",
      };
      this.isSubmitting = false;
      return;
    }

    const formData = new FormData();
  

    formData.append("job_title", this.form.job_title);
    formData.append("company", this.form.company);
    formData.append("location", this.form.location);
    formData.append("job_description", this.form.job_description);
    formData.append("requirements", this.form.requirements);
    formData.append("responsability", this.form.responsability);
    formData.append("salary_min", this.form.salary_max);
    formData.append("salary_max", this.form.salary_max);
    formData.append("conclusion", this.form.conclusion);
    formData.append("deadline_date", this.form.deadline_date);
    formData.append("users_id", this.userId);
    
    // Ensure category_id is a string/number, not undefined
    const categoryId = this.form.category_id;
    if (categoryId !== undefined && categoryId !== null && categoryId !== "") {
      formData.append("category_id", categoryId);
      console.log("Category ID being sent:", categoryId);
    } else {
      console.error("Category ID is undefined or empty:", categoryId);
      this.status = {
        success: false,
        message: "Category ID is missing.",
      };
      this.isSubmitting = false;
      return;
    }
    
    if (this.form.logo && typeof this.form.logo !== "string") {
      formData.append("logo", this.form.logo);
    }

    // Debug: Log all FormData entries
    console.log("FormData entries:");
    for (let [key, value] of formData.entries()) {
      console.log(key + ": " + value);
    }

    const token = localStorage.getItem("employerToken");

    const url = this.form.job_id
      ? `${globalVariable}/admin/update_job/${this.form.job_id}`
      : `${globalVariable}/admin/add_jobs`;
    const method = this.form.job_id ? "PUT" : "POST";

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (response.ok) {
      const result = await response.json();
      this.status = {
        success: true,
        message: result.message || (this.form.job_id ? "Job updated!" : "Job added!"),
      };

      this.form = {
        job_id: null,
        job_title: "",
        company: "",
        deadline_date: this.minDeadlineDate,
        job_description: "",
        requirements: "",
        responsability: "",
        salary_min: "",
        salary_max: "",
        conclusion: "",
        logo: "",
        location: "",
        category_id: "", // Reset category_id
      };

      this.fetchJobsByUser();
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


    async fetchCategoryNameByUserId() {
      try {
        const res = await fetch(`${globalVariable}/category/${this.userId}`);
        const data = await res.json();
        if (res.ok && data.name) {
          return data.name;
        } else {
          return "Unknown";
        }
      } catch (error) {
        console.error("Failed to fetch category name:", error);
        return "Error fetching category";
      }
    },
    getCategoryName(categoryId) {
      return this.categoryNames[categoryId] || "Unknown";
    },
    async fetchJobsByUser() {
      try {
        const token = localStorage.getItem("employerToken");
        if (!this.userId) return;

        const res = await fetch(`${globalVariable}/provider/jobs/${this.userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error("Failed to fetch jobs");

        const data = await res.json();
        this.jobs = data;
      } catch (err) {
        console.error("Error fetching jobs for user:", err);
      }
    },
    async fetchUserStatus() {
      const token = localStorage.getItem("employerToken");
      if (!this.userId || !token) return;

      try {
        const res = await fetch(`${globalVariable}/provider/status/${this.userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();

        if (res.ok) {
          this.jobStatus = data.status;
        } else {
          console.error("Error fetching job status:", data.message);
        }
      } catch (error) {
        console.error("Network error while fetching job status:", error);
      }
    },
   async fetchCategories() {
  try {
    const token = localStorage.getItem("employerToken");
    const response = await fetch(`${globalVariable}/name_and_id`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json();
    if (response.ok) {
      this.categories = data;
      
      // Debug: Log the categories to see the structure
      console.log("Categories fetched:", data);
      console.log("First category structure:", data[0]);
      
      data.forEach(category => {
        this.categoryNames[category.id] = category.name;
      });
    } else {
      console.error("Failed to load categories:", data.message);
    }
  } catch (error) {
    console.error("Error fetching categories:", error);
  }
},
    editJob(job) {
      const deadlineDate = job.deadline_date
        ? new Date(job.deadline_date).toISOString().split("T")[0]
        : "";

      this.form = {
        job_id: job.job_id,
        job_title: job.job_title,
        company: job.company,
        deadline_date: deadlineDate,
        job_description: job.job_description,
        requirements: job.requirements,
        responsability: job.responsability,
        salary_min: job.salary_min,
        salary_max: job.salary_max,
        conclusion: job.conclusion,
        logo: job.logo,
        location: job.location,
        category_id: job.category_id,
      };
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    async getUserIdFromEmail() {
      const token = localStorage.getItem("employerToken");
      if (!token || !this.userEmail) return;

      try {
        const res = await fetch(`${globalVariable}/get_user_id_by_email/${this.userEmail}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (res.ok) {
          this.userId = data.users_id;
          this.fetchJobsByUser();
          this.fetchUserStatus();
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
    getStatusLabel(status) {
      if (status === 0) {
        return { text: "Pending", colorClass: "text-danger" };
      } else if (status === 1) {
        return { text: "Approved", colorClass: "text-success" };
      } else {
        return { text: "Unknown", colorClass: "text-muted" };
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