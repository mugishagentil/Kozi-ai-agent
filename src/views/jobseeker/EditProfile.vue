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
      <div class="container-fluid">
        <h5 class="card-title fw-semibold mb-4" style="color: #E960A6;"><i class="ti ti-user-plus"></i> Update Profile</h5>

        <form @submit.prevent="handleSubmit" class="mx-4">
        
        <div class="form-group row">
          <div class="col-12 col-md-6" v-for="(field, index) in personalFields" :key="index">
            <label :for="field.model" class="form-label">{{ field.label }}</label>
            <input
              v-if="field.model === 'telephone'"
              type="tel"
              v-model="form[field.model]"
              class="form-control"
              :id="field.model"
              @input="handleTelephoneInput"
              maxlength="12"
              pattern="[0-9]*"
              inputmode="numeric"
              placeholder="Enter phone number"
              required
            />
            <input
              v-else
              :type="field.type"
              v-model="form[field.model]"
              class="form-control"
              :id="field.model"
              :max="field.model === 'date_of_birth' ? maxDateOfBirth : null"
              required
            />
          </div>

          <div class="col-12 col-md-6">
            <label class="form-label">Gender</label>
            <select v-model="form.gender" class="form-control"  style="height: 48px; padding-top: 8px; padding-bottom: 8px;" required>
              <option disabled value="">Choose Gender</option>
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
            </select>
          </div>

          <!-- Location Selectors -->
          <div class="col-12 col-md-6">
            <label class="form-label">Province</label>
            <select v-model="form.province" @change="loadDistricts" class="form-control" style="height: 48px; padding-top: 8px; padding-bottom: 8px;" required>
              <option disabled value="">Select Province</option>
              <option v-for="province in provinces" :key="province" :value="province">{{ province }}</option>
            </select>
          </div>

          <div class="col-12 col-md-6">
            <label class="form-label">District</label>
            <select v-model="form.district" @change="loadSectors" :disabled="!form.province" class="form-control" style="height: 48px; padding-top: 8px; padding-bottom: 8px;" required>
              <option disabled value="">Select District</option>
              <option v-for="district in districts" :key="district" :value="district">{{ district }}</option>
            </select>
          </div>

          <div class="col-12 col-md-6">
            <label class="form-label">Sector</label>
            <select v-model="form.sector" @change="loadCells" :disabled="!form.district" class="form-control" style="height: 48px; padding-top: 8px; padding-bottom: 8px;" required>
              <option disabled value="">Select Sector</option>
              <option v-for="sector in sectors" :key="sector" :value="sector">{{ sector }}</option>
            </select>
          </div>

          <div class="col-12 col-md-6">
            <label class="form-label">Cell</label>
            <select v-model="form.cell" @change="loadVillages" :disabled="!form.sector" class="form-control" style="height: 48px; padding-top: 8px; padding-bottom: 8px;" required>
              <option disabled value="">Select Cell</option>
              <option v-for="cell in cells" :key="cell" :value="cell">{{ cell }}</option>
            </select>
          </div>

          <div class="col-12 col-md-6">
            <label class="form-label">Village</label>
            <select v-model="form.village" :disabled="!form.cell" class="form-control" style="height: 48px; padding-top: 8px; padding-bottom: 8px;" required>
              <option disabled value="">Select Village</option>
              <option v-for="village in villages" :key="village" :value="village">{{ village }}</option>
            </select>
          </div>

          <div class="col-12 col-md-6">
            <label class="form-label">Disability</label>
            <select v-model="form.disability" class="form-control" style="height: 48px; padding-top: 8px; padding-bottom: 8px;" required>
              <option disabled value="">Select Disability</option>
              <option>None</option>
              <option>Visual Impairment</option>
              <option>Hearing Impairment</option>
              <option>Physical Disability</option>
              <option>Intellectual Disability</option>
              <option>Mental Health Condition</option>
              <option>Learning Disability</option>
              <option>Speech and Language Disorder</option>
              <option>Autism Spectrum Disorder</option>
              <option>Chronic Illness (e.g. epilepsy, diabetes)</option>
              <option>Neurological Disorder (e.g. cerebral palsy)</option>
              <option>Albinism</option>
              <option>Multiple Disabilities</option>
              <option>Other</option>
            </select>
          </div>

          <div class="col-12 col-md-6">
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

          <div class="col-12 col-md-6">
            <label class="form-label">Category Type</label>
            <select v-model="selectedCategoryType" @change="loadCategories" class="form-control" style="height: 48px; padding-top: 8px; padding-bottom: 8px;" required>
              <option disabled value="">Select Category Type</option>
              <option v-for="type in categoryTypes" :key="type.id" :value="type.id">{{ type.name }}</option>
            </select>
          </div>

          <div class="col-12 col-md-6">
            <label class="form-label">Category</label>
            <select v-model="form.categories_id" class="form-control" style="height: 48px; padding-top: 8px; padding-bottom: 8px;" required>
              <option disabled value="">Select Category</option>
              <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
            </select>
          </div>

          <div class="col-12 col-md-6">
            <label class="form-label">Upload ID Card</label>
            <input 
              type="file" 
              @change="handleFileChange('id', $event)" 
              :required="!form.id_url" 
              class="form-control"
            />
            <small class="form-text text-muted">Maximum file size: 1MB</small>
            <div v-if="form.id_url" class="mt-2">
              <a :href="form.id_url" target="_blank" class="btn btn-outline-secondary btn-sm">View Current Id card</a>
            </div>
          </div>
          <div class="col-12 col-md-6">
            <label class="form-label">Upload Profile Image</label>
            <input 
              type="file" 
              @change="handleFileChange('image', $event)" 
              :required="!form.image_url" 
              class="form-control" 
            />
            <small class="form-text text-muted">Maximum file size: 1MB</small>
            <div v-if="form.image_url" class="mt-2">
              <a :href="form.image_url" target="_blank" class="btn btn-outline-secondary btn-sm">View Current Image</a>
            </div>
          </div>
          <div class="col-12 col-md-6">
            <label class="form-label">Upload CV(Optional)</label>
            <input type="file" @change="handleFileChange('cv', $event)" class="form-control" />
            <small class="form-text text-muted">Maximum file size: 1MB</small>
            <div v-if="form.cv_url" class="mt-2">
              <a :href="form.cv_url" target="_blank" class="btn btn-outline-secondary btn-sm">View Current CV</a>
            </div>
          </div>
          <div class="col-md-12">
            <label class="form-label">Skills and capabilities</label>
            <textarea v-model="form.bio" class="form-control"  style="height: 150px;" required></textarea>
          </div>
        </div>
        <div v-if="message" :class="['alert', messageType]">{{ message }}</div>
        <button type="submit" class="btn btn-primary mb-5" :disabled="isSubmitting">
          <span v-if="isSubmitting" class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
          <span v-if="isSubmitting" class="ms-2">Updating...</span>
          <span v-else>Update Profile</span>
        </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import { globalVariable } from "@/global";
import IndexComponent from "./IndexComponent.vue";
import {
  getProvinces,
  getDistrictsByProvince,
  getSectorsByDistrict,
  getCellsBySector,
  getVillagesByCell
} from 'rwanda-geo-structure';

export default {
  name: "ProfileComponent",
  components: { IndexComponent },
  data() {
    return {
      isSubmitting: false,
      form: {
        first_name: "",
        last_name: "",
        gender: "",
        fathers_name: "",
        mothers_name: "",
        telephone: "",
        province: "",
        district: "",
        sector: "",
        cell: "",
        village: "",
        bio: "",
        salary: "",
        date_of_birth: "",
        disability: "",
        cv: null,
        id: null,
        image: null,
        categories_id: "",
        id_url: null,
        cv_url: null,
        image_url: null,
      },
      uploadsUrl: `${globalVariable}/uploads/profile/`,
      selectedCategoryType: "",
      userId: "",
      userEmail: "",
      message: null,
      messageType: null,
      categoryTypes: [],
      categories: [],
      currentCategoryInfo: null,
      
      // Location data
      provinces: [],
      districts: [],
      sectors: [],
      cells: [],
      villages: [],
      
      personalFields: [
        { label: "First Name", model: "first_name", type: "text" },
        { label: "Last Name", model: "last_name", type: "text" },
        { label: "Father's Name", model: "fathers_name", type: "text" },
        { label: "Mother's Name", model: "mothers_name", type: "text" },
        { label: "Date of Birth", model: "date_of_birth", type: "date" },
        { label: "Telephone", model: "telephone", type: "tel" },
      ],
    };
  },
  computed: {
    maxDateOfBirth() {
      const today = new Date();
      today.setFullYear(today.getFullYear() - 18);
      return today.toISOString().split("T")[0];
    },
  },
  mounted() {
    this.loadProvinces();
    this.getUserIdFromEmail();
    this.loadCategoryTypes();
  },
  methods: {
    // Location methods
    loadProvinces() {
      this.provinces = getProvinces();
    },

    loadDistricts() {
      if (this.form.province) {
        this.districts = getDistrictsByProvince(this.form.province);
        // Reset dependent fields
        this.sectors = [];
        this.cells = [];
        this.villages = [];
        this.form.district = "";
        this.form.sector = "";
        this.form.cell = "";
        this.form.village = "";
      }
    },

    loadSectors() {
      if (this.form.province && this.form.district) {
        this.sectors = getSectorsByDistrict(this.form.province, this.form.district);
        // Reset dependent fields
        this.cells = [];
        this.villages = [];
        this.form.sector = "";
        this.form.cell = "";
        this.form.village = "";
      }
    },

    loadCells() {
      if (this.form.province && this.form.district && this.form.sector) {
        this.cells = getCellsBySector(this.form.province, this.form.district, this.form.sector);
        // Reset dependent fields
        this.villages = [];
        this.form.cell = "";
        this.form.village = "";
      }
    },

    loadVillages() {
      if (this.form.province && this.form.district && this.form.sector && this.form.cell) {
        this.villages = getVillagesByCell(this.form.province, this.form.district, this.form.sector, this.form.cell);
        this.form.village = "";
      }
    },

    // Method to populate location dropdowns when editing existing profile
    async populateLocationData() {
      if (this.form.province) {
        this.districts = getDistrictsByProvince(this.form.province);
        
        if (this.form.district) {
          this.sectors = getSectorsByDistrict(this.form.province, this.form.district);
          
          if (this.form.sector) {
            this.cells = getCellsBySector(this.form.province, this.form.district, this.form.sector);
            
            if (this.form.cell) {
              this.villages = getVillagesByCell(this.form.province, this.form.district, this.form.sector, this.form.cell);
            }
          }
        }
      }
    },

    handleTelephoneInput(event) {
      // Remove any non-numeric characters
      let value = event.target.value.replace(/\D/g, '');
      
      // Limit to 12 digits
      if (value.length > 12) {
        value = value.substring(0, 12);
      }
      
      // Update the form value
      this.form.telephone = value;
      
      // Update the input field value
      event.target.value = value;
    },

    async getUserIdFromEmail() {
      const token = localStorage.getItem("employeeToken");
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
          this.fetchCurrentCategoryInfo();
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
    
    async fetchCurrentCategoryInfo() {
      try {
        const res = await fetch(`${globalVariable}/categoryandtype/${this.userId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("employeeToken")}` },
        });
        const data = await res.json();
        if (res.ok) {
          this.currentCategoryInfo = data;
          this.selectedCategoryType = data.category_types_id;
          this.form.categories_id = data.category_id;
          await this.loadCategories();
        } else {
          console.log("No current category found for user");
        }
      } catch (err) {
        console.error("Error fetching current category info:", err);
      }
    },

    async fetchProfile() {
      try {
        const res = await fetch(`${globalVariable}/seeker/view_profile/${this.userId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("employeeToken")}` },
        });
        const data = await res.json();
        if (res.ok) {
          this.form.date_of_birth = data.date_of_birth ? data.date_of_birth.split("T")[0] : "";
          this.form.salary = data.salary || "";
          Object.keys(this.form).forEach(key => {
            if (key !== "date_of_birth" && key !== "salary") {
              this.form[key] = data[key] || this.form[key];
            }
          });
          this.form.id_url = data.id ? `${globalVariable}/uploads/profile/${data.id}` : null;
          this.form.cv_url = data.cv ? `${globalVariable}/uploads/profile/${data.cv}` : null;
          this.form.image_url = data.image ? `${globalVariable}/uploads/profile/${data.image}` : null;
          
          // Populate location data after form is loaded
          await this.populateLocationData();
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
        if (!this.currentCategoryInfo || this.currentCategoryInfo.category_types_id !== this.selectedCategoryType) {
          this.form.categories_id = "";
        }
      } catch (error) {
        console.error("Failed to load categories:", error);
      }
    },

    handleFileChange(field, event) {
      this.form[field] = event.target.files[0];
    },

    async handleSubmit() {
      this.isSubmitting = true;
      
      const formData = new FormData();
      for (const key of [
        "first_name", "last_name", "gender", "fathers_name", "mothers_name", "telephone",
        "province", "district", "sector", "cell", "village", "bio", "salary",
        "date_of_birth", "disability", "categories_id"
      ]) {
        formData.append(key, this.form[key]);
      }
      if (this.form.image) formData.append("image", this.form.image);
      if (this.form.id) formData.append("id", this.form.id);
      if (this.form.cv) formData.append("cv", this.form.cv);
      formData.append("is_editable", 0);

      try {
        const res = await fetch(`${globalVariable}/seeker/update_profile/${this.userId}`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("employeeToken")}`,
          },
          body: formData,
        });
        const data = await res.json();
        if (res.ok) {
          this.message = "Profile updated successfully.";
          this.$router.push('/dashboard/view-profile');
          this.messageType = "alert-success";
          await this.fetchProfile();
          await this.fetchCurrentCategoryInfo();
        } else {
          this.message = data.message || "Failed to update profile.";
          this.messageType = "alert-danger";
        }
      } catch (error) {
        console.error("Error updating profile:", error);
        this.message = "An error occurred during update.";
        this.messageType = "alert-danger";
      } finally {
        this.isSubmitting = false;
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
        position: relative;
      }
      
      .btn-primary:hover {
        background-color: #E960A6;
        color: teal;
      }

      .btn-primary:disabled {
        background-color: #E960A6;
        opacity: 0.7;
        cursor: not-allowed;
      }

      .spinner-border-sm {
        width: 1rem;
        height: 1rem;
      }
      
      .form-group {
        margin-bottom: 15px;
      }
      
      </style>