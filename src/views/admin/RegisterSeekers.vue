<template>
  <IndexComponent />
  <div
    class="page-wrapper"
    id="main-wrapper"
    data-layout="vertical"
    data-navbarbg="skin6"
    data-sidebartype="full"
    style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; z-index: 1;"
  >
    <div class="body-wrapper" style="margin-top: 70px; margin-left: 270px; background: white; min-height: calc(100vh - 70px); padding: 20px; overflow-y: auto; max-height: calc(100vh - 70px);">
       <h5 class="card-title fw-semibold mb-4" style="color: #E960A6;"><i class="ti ti-user-plus"></i>  Register New seekers</h5>

      <form @submit.prevent="handleSubmit" class="mx-4">
        
        <div class="form-group row">
          <div
            class="col-md-6"
            v-for="(field, index) in personalFields"
            :key="index"
          >
            <label :for="field.model" class="form-label">{{ field.label }}</label>
            <input
              :type="field.type"
              v-model="form[field.model]"
              class="form-control"
              :id="field.model"
              required
            />
          </div>

          <div class="col-md-6">
            <label class="form-label">Date of Birth</label>
            <input
              type="date"
              v-model="form.date_of_birth"
              class="form-control"
              :max="maxDateOfBirth"
              required
            />
          </div>

          <div class="col-md-6">
            <label class="form-label">Gender</label>
            <select v-model="form.gender" class="form-control" style="height: 48px; padding-top: 8px; padding-bottom: 8px;" required>
              <option disabled value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <!-- Location Selectors -->
          <div class="col-md-6">
            <label class="form-label">Province</label>
            <select 
              v-model="form.province" 
              @change="loadDistricts" 
              class="form-control" 
              style="height: 48px; padding-top: 8px; padding-bottom: 8px;" 
              required
            >
              <option disabled value="">Select Province</option>
              <option v-for="province in provinces" :key="province" :value="province">
                {{ province }}
              </option>
            </select>
          </div>

          <div class="col-md-6">
            <label class="form-label">District</label>
            <select 
              v-model="form.district" 
              @change="loadSectors" 
              :disabled="!form.province"
              class="form-control" 
              style="height: 48px; padding-top: 8px; padding-bottom: 8px;" 
              required
            >
              <option disabled value="">Select District</option>
              <option v-for="district in districts" :key="district" :value="district">
                {{ district }}
              </option>
            </select>
          </div>

          <div class="col-md-6">
            <label class="form-label">Sector</label>
            <select 
              v-model="form.sector" 
              @change="loadCells" 
              :disabled="!form.district"
              class="form-control" 
              style="height: 48px; padding-top: 8px; padding-bottom: 8px;" 
              required
            >
              <option disabled value="">Select Sector</option>
              <option v-for="sector in sectors" :key="sector" :value="sector">
                {{ sector }}
              </option>
            </select>
          </div>

          <div class="col-md-6">
            <label class="form-label">Cell</label>
            <select 
              v-model="form.cell" 
              @change="loadVillages" 
              :disabled="!form.sector"
              class="form-control" 
              style="height: 48px; padding-top: 8px; padding-bottom: 8px;" 
              required
            >
              <option disabled value="">Select Cell</option>
              <option v-for="cell in cells" :key="cell" :value="cell">
                {{ cell }}
              </option>
            </select>
          </div>

          <div class="col-md-6">
            <label class="form-label">Village</label>
            <select 
              v-model="form.village" 
              :disabled="!form.cell"
              class="form-control" 
              style="height: 48px; padding-top: 8px; padding-bottom: 8px;" 
              required
            >
              <option disabled value="">Select Village</option>
              <option v-for="village in villages" :key="village" :value="village">
                {{ village }}
              </option>
            </select>
          </div>

          <div class="col-md-6">
            <label class="form-label">Disability</label>
            <select v-model="form.disability" class="form-control" style="height: 48px; padding-top: 8px; padding-bottom: 8px;" required>
              <option disabled value="">Select Disability</option>
              <option value="None">None</option>
              <option value="Visual Impairment">Visual Impairment</option>
              <option value="Hearing Impairment">Hearing Impairment</option>
              <option value="Physical Disability">Physical Disability</option>
              <option value="Intellectual Disability">Intellectual Disability</option>
              <option value="Mental Health Condition">Mental Health Condition</option>
              <option value="Learning Disability">Learning Disability</option>
              <option value="Speech and Language Disorder">Speech and Language Disorder</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div class="col-md-6">
            <label class="form-label">Expected Salary</label>
            <select v-model="form.salary" class="form-control" style="height: 48px; padding-top: 8px; padding-bottom: 8px;" required>
              <option disabled value="">Select Salary</option>
              <option>35,000 Frw - 50,000 Frw</option>
              <option>51,000 Frw - 80,000 Frw</option>
              <option>81,000 Frw - 100,000 Frw</option>
              <option>101,000 Frw - 150,000 Frw</option>
              <option>150,001+ Frw</option>
            </select>
          </div>
          
          <div class="col-md-6">
            <label class="form-label">Category Type</label>
            <select
              v-model="selectedCategoryType"
              @change="loadCategories"
              class="form-control" 
              style="height: 48px; padding-top: 8px; padding-bottom: 8px;"
              required
            >
              <option disabled value="">Select Category Type</option>
              <option v-for="type in categoryTypes" :key="type.id" :value="type.id">
                {{ type.name }}
              </option>
            </select>
          </div>

          <div class="col-md-6">
            <label class="form-label">Category</label>
            <select v-model="form.categories_id" class="form-control" style="height: 48px; padding-top: 8px; padding-bottom: 8px;" required>
              <option disabled value="">Select Category</option>
              <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                {{ cat.name }}
              </option>
            </select>
          </div>

          <!-- File Uploads -->
          <div class="col-md-6">
            <label class="form-label">Upload ID Card</label>
            <input 
              type="file" 
              @change="handleFileChange('id', $event)" 
              class="form-control"
              accept=".pdf,.jpg,.jpeg,.png"
            />
            <div v-if="form.id_url" class="mt-2">
              <a :href="form.id_url" target="_blank" class="btn btn-outline-primary btn-sm">View Current ID</a>
            </div>
          </div>

          <div class="col-md-6">
            <label class="form-label">Upload Profile Image</label>
            <input 
              type="file" 
              @change="handleFileChange('image', $event)" 
              class="form-control"
              accept="image/*"
            />
            <div v-if="form.image_url" class="mt-2">
              <img :src="form.image_url" alt="Profile" class="img-thumbnail" style="max-height: 150px;" />
            </div>
          </div>

          <div class="col-md-6">
            <label class="form-label">Upload CV(Optional)</label>
            <input 
              type="file" 
              @change="handleFileChange('cv', $event)" 
              class="form-control"
              accept=".pdf,.doc,.docx"
            />
            <div v-if="form.cv_url" class="mt-2">
              <a :href="form.cv_url" target="_blank" class="btn btn-outline-secondary btn-sm">View Current CV</a>
            </div>
          </div>

          <div class="col-md-12">
            <label class="form-label">Skills and Capabilities</label>
            <textarea v-model="form.bio" class="form-control" style="height: 100px;" required></textarea>
          </div>
        </div>
        <div v-if="message" :class="['alert', messageType]">{{ message }}</div>

        <div class="d-flex gap-2 mt-3">
          <button type="submit" class="btn btn-primary mb-3" :disabled="isSubmitting">
            {{ isSubmitting ? 'Saving...' : 'Add User' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import axios from "axios";
import IndexComponent from "./IndexComponent.vue";
import { globalVariable } from "@/global";
import {
  getProvinces,
  getDistrictsByProvince,
  getSectorsByDistrict,
  getCellsBySector,
  getVillagesByCell
} from 'rwanda-geo-structure';

export default {
  components: { IndexComponent },
  data() {
    return {
      userEmail: "",
      userId: "",
      message: "",
      messageType: "",
      categoryTypes: [],
      categories: [],
      selectedCategoryType: "",
      isSubmitting: false,
      
      // Location data
      provinces: [],
      districts: [],
      sectors: [],
      cells: [],
      villages: [],
      
      form: {
        email: "",
        first_name: "",
        last_name: "",
        gender: "",
        password: "",
        fathers_name: "",
        mothers_name: "",
        telephone: "",
        province: "",
        district: "",
        sector: "",
        cell: "",
        village: "",
        date_of_birth: "",
        bio: "",
        salary: "",
        disability: "",
        categories_id: "",
        role_id: "",
        picture: "",
        verifiedEmail: true,
        token: "",
        verification_code: "",
        job_seeker_id: "js-" + Date.now(),
        created_at: new Date().toISOString().slice(0, 19).replace("T", " "),
        created_by: "admin",
        is_editable: true,
        id: null,
        image: null,
        cv: null,
        id_url: "",
        image_url: "",
        cv_url: "",
      },
      personalFields: [
        { label: "First Name", model: "first_name", type: "text" },
        { label: "Last Name", model: "last_name", type: "text" },
        { label: "Email", model: "email", type: "email" },
        { label: "Password", model: "password", type: "password" },
        { label: "Father's Name", model: "fathers_name", type: "text" },
        { label: "Mother's Name", model: "mothers_name", type: "text" },
        { label: "Telephone", model: "telephone", type: "text" },
      ],
    };
  },
  computed: {
    maxDateOfBirth() {
      const today = new Date();
      today.setFullYear(today.getFullYear() - 18);
      return today.toISOString().split("T")[0];
    }
  },

  mounted() {
    this.loadCategoryTypes();
    this.loadRoleId();
    this.loadProvinces();
    this.userEmail = localStorage.getItem("userEmail") || "";
    if (this.userEmail) {
      this.getUserIdFromEmail();
    }
  },

  methods: {
    // Location methods
    loadProvinces() {
      try {
        this.provinces = getProvinces();
      } catch (error) {
        console.error("Error loading provinces:", error);
        this.message = "Failed to load provinces.";
        this.messageType = "alert-warning";
      }
    },

    loadDistricts() {
      try {
        if (this.form.province) {
          this.districts = getDistrictsByProvince(this.form.province);
          // Clear dependent fields
          this.sectors = [];
          this.cells = [];
          this.villages = [];
          this.form.district = "";
          this.form.sector = "";
          this.form.cell = "";
          this.form.village = "";
        }
      } catch (error) {
        console.error("Error loading districts:", error);
        this.message = "Failed to load districts.";
        this.messageType = "alert-warning";
      }
    },

    loadSectors() {
      try {
        if (this.form.province && this.form.district) {
          this.sectors = getSectorsByDistrict(this.form.province, this.form.district);
          // Clear dependent fields
          this.cells = [];
          this.villages = [];
          this.form.sector = "";
          this.form.cell = "";
          this.form.village = "";
        }
      } catch (error) {
        console.error("Error loading sectors:", error);
        this.message = "Failed to load sectors.";
        this.messageType = "alert-warning";
      }
    },

    loadCells() {
      try {
        if (this.form.province && this.form.district && this.form.sector) {
          this.cells = getCellsBySector(this.form.province, this.form.district, this.form.sector);
          // Clear dependent fields
          this.villages = [];
          this.form.cell = "";
          this.form.village = "";
        }
      } catch (error) {
        console.error("Error loading cells:", error);
        this.message = "Failed to load cells.";
        this.messageType = "alert-warning";
      }
    },

    loadVillages() {
      try {
        if (this.form.province && this.form.district && this.form.sector && this.form.cell) {
          this.villages = getVillagesByCell(this.form.province, this.form.district, this.form.sector, this.form.cell);
          this.form.village = "";
        }
      } catch (error) {
        console.error("Error loading villages:", error);
        this.message = "Failed to load villages.";
        this.messageType = "alert-warning";
      }
    },

    async loadCategoryTypes() {
      try {
        console.log("Loading category types from:", `${globalVariable}/category-types`);
        const res = await axios.get(`${globalVariable}/category-types`);
        this.categoryTypes = res.data;
        console.log("Category types loaded:", this.categoryTypes);
      } catch (error) {
        console.error("Error loading category types:", error);
        this.handleError(error, "Failed to load category types.");
      }
    },

    async loadCategories() {
      if (!this.selectedCategoryType) return;
      try {
        console.log("Loading categories for type:", this.selectedCategoryType);
        const res = await axios.get(`${globalVariable}/categories/${this.selectedCategoryType}`);
        this.categories = res.data;
        console.log("Categories loaded:", this.categories);
      } catch (err) {
        console.error("Failed to load categories:", err);
        this.message = "Failed to load categories.";
        this.messageType = "alert-warning";
      }
    },

    async loadRoleId() {
      try {
        const token = localStorage.getItem("adminToken");
        if (!token) {
          console.error("No token found in localStorage");
          this.message = "Authentication token not found. Please log in again.";
          this.messageType = "alert-danger";
          return;
        }

        console.log("Loading role ID...");
        const res = await axios.get(`${globalVariable}/admin/role/job_seekers`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log("API role_id response:", res.data);

        this.form.role_id = res.data.role_id || 1;
        console.log("Role ID set to:", this.form.role_id);
      } catch (err) {
        console.error("Failed to fetch role_id:", err);
        this.form.role_id = 1;
        this.message = "Could not load role ID, using default.";
        this.messageType = "alert-warning";
      }
    },

    handleFileChange(type, event) {
      const file = event.target.files[0];
      if (file) {
        console.log(`File selected for ${type}:`, file.name, file.size, 'bytes');
        
        // Check file size (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
          this.message = `File ${file.name} is too large. Maximum size is 10MB.`;
          this.messageType = "alert-danger";
          return;
        }

        if (type === "id") {
          this.form.id = file;
          this.form.id_url = URL.createObjectURL(file);
        } else if (type === "image") {
          this.form.image = file;
          this.form.image_url = URL.createObjectURL(file);
          this.form.picture = this.form.image_url;
        } else if (type === "cv") {
          this.form.cv = file;
          this.form.cv_url = URL.createObjectURL(file);
        }
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
        } else {
          this.message = data.message || "Unable to get user ID.";
        }
      } catch (err) {
        console.error("Error getting users_id:", err);
      }
    },

    handleError(error, defaultMessage) {
      console.error("API Error:", error);
      if (error.response) {
        console.error("Response data:", error.response.data);
        console.error("Response status:", error.response.status);
        this.message = error.response.data.message || error.response.data.error || defaultMessage;
      } else if (error.request) {
        console.error("No response received:", error.request);
        this.message = "No response from server. Please check your connection.";
      } else {
        console.error("Error setting up request:", error.message);
        this.message = error.message || defaultMessage;
      }
      this.messageType = "alert-danger";
    },

    validateForm() {
      const requiredFields = [
        'role_id', 'email', 'first_name', 'last_name', 'gender', 'password',
        'fathers_name', 'mothers_name', 'telephone', 'province', 'district',
        'sector', 'cell', 'village', 'bio', 'salary', 'date_of_birth',
        'disability', 'categories_id'
      ];
      const missingFields = [];

      for (const field of requiredFields) {
        if (!this.form[field] || this.form[field] === '') {
          missingFields.push(field);
        }
      }

      if (missingFields.length > 0) {
        this.message = `Missing required fields: ${missingFields.join(', ')}`;
        this.messageType = "alert-danger";
        return false;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(this.form.email)) {
        this.message = "Please enter a valid email address";
        this.messageType = "alert-danger";
        return false;
      }

      return true;
    },

    async handleSubmit() {
      if (this.isSubmitting) return;
      
      this.isSubmitting = true;
      this.message = "";

      try {
        // Validate form
        if (!this.validateForm()) {
          return;
        }

        // Ensure role_id is loaded
        if (!this.form.role_id) {
          await this.loadRoleId();
        }

        console.log("Form data before submit:", {
          ...this.form,
          id: this.form.id ? this.form.id.name : null,
          image: this.form.image ? this.form.image.name : null,
          cv: this.form.cv ? this.form.cv.name : null
        });

        const formData = new FormData();

        // Add required fields
        formData.append("role_id", this.form.role_id);
        formData.append("email", this.form.email);
        formData.append("first_name", this.form.first_name);
        formData.append("last_name", this.form.last_name);
        formData.append("gender", this.form.gender);
        formData.append("password", this.form.password);
        formData.append("full_name", `${this.form.first_name} ${this.form.last_name}`);
        formData.append("verifiedEmail", this.form.verifiedEmail);
        formData.append("token", this.form.token || "");
        formData.append("verification_code", this.form.verification_code || "");
        formData.append("fathers_name", this.form.fathers_name);
        formData.append("mothers_name", this.form.mothers_name);
        formData.append("telephone", this.form.telephone);
        formData.append("province", this.form.province);
        formData.append("district", this.form.district);
        formData.append("sector", this.form.sector);
        formData.append("cell", this.form.cell);
        formData.append("village", this.form.village);
        formData.append("bio", this.form.bio);
        formData.append("salary", this.form.salary);
        formData.append("date_of_birth", this.form.date_of_birth);
        formData.append("disability", this.form.disability);
        formData.append("categories_id", this.form.categories_id);
        formData.append("created_at", this.form.created_at);
        formData.append("created_by", this.form.created_by);
        formData.append("is_editable", this.form.is_editable);

        // Add files
        if (this.form.image) {
          formData.append("image", this.form.image);
        }
        if (this.form.id) {
          formData.append("id", this.form.id);
        }
        if (this.form.cv) {
          formData.append("cv", this.form.cv);
        }

        const token = localStorage.getItem("adminToken");
        if (!token) {
          this.message = "Authentication token not found. Please log in again.";
          this.messageType = "alert-danger";
          return;
        }

        console.log("Submitting to:", `${globalVariable}/admin/add_job_seekers`);
        const res = await axios.post(`${globalVariable}/admin/add_job_seekers`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        });

        console.log("Success response:", res.data);
        this.message = res.data.message || "Job seeker saved successfully!";
        this.messageType = "alert-success";
        this.resetForm();
      } catch (error) {
        this.handleError(error, "Failed to save job seeker.");
      } finally {
        this.isSubmitting = false;
      }
    },

    resetForm() {
      for (const key in this.form) {
        if (key !== "role_id") {
          if (typeof this.form[key] === 'string') {
            this.form[key] = "";
          } else if (this.form[key] === null || this.form[key] === undefined) {
            this.form[key] = null;
          }
        }
      }
      this.form.id = null;
      this.form.image = null;
      this.form.cv = null;
      this.form.id_url = "";
      this.form.image_url = "";
      this.form.cv_url = "";
      this.selectedCategoryType = "";
      this.categories = [];
      
      // Reset location data
      this.districts = [];
      this.sectors = [];
      this.cells = [];
      this.villages = [];
      
      // Regenerate unique IDs
      this.form.job_seeker_id = "js-" + Date.now();
      this.form.created_at = new Date().toISOString().slice(0, 19).replace("T", " ");
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