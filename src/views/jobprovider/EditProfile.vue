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
     <h5 class="card-title fw-semibold mb-4" style="color: #E960A6;"><i class="ti ti-user-plus"></i>  Update Profile</h5>

      <form @submit.prevent="handleSubmit" class="mx-4" enctype="multipart/form-data">
        
        <div class="form-group row">
          <div class="col-md-6">
            <label class="form-label">Select Category</label>
            <select v-model="form.category" @change="handleCategoryChange" class="form-control" style="height: 54px;" required>
              <option value="Individual">Individual</option>
              <option value="Company">Company</option>
            </select>
          </div>
          <div class="col-md-6" v-for="(field, index) in currentFields" :key="index">
            <label :for="field.model" class="form-label">{{ field.label }}</label>
            <input :type="field.type" v-model="form[field.model]" class="form-control" :id="field.model" required />
          </div>
          
          <!-- Location Cascade Dropdowns -->
          <div class="col-md-6">
            <label class="form-label">Province</label>
            <select v-model="form.province" @change="loadDistricts"  class="form-control" style="height: 48px; padding-top: 8px; padding-bottom: 8px;" required>
              <option value="">Select Province</option>
              <option v-for="province in provinces" :key="province" :value="province">{{ province }}</option>
            </select>
          </div>
          
          <div class="col-md-6">
            <label class="form-label">District</label>
            <select v-model="form.district" @change="loadSectors" class="form-control" :disabled="!form.province" style="height: 48px; padding-top: 8px; padding-bottom: 8px;" required>
              <option value="">Select District</option>
              <option v-for="district in districts" :key="district" :value="district">{{ district }}</option>
            </select>
          </div>
          
          <div class="col-md-6">
            <label class="form-label">Sector</label>
            <select v-model="form.sector" @change="loadCells" class="form-control" :disabled="!form.district" style="height: 48px; padding-top: 8px; padding-bottom: 8px;" required>
              <option value="">Select Sector</option>
              <option v-for="sector in sectors" :key="sector" :value="sector">{{ sector }}</option>
            </select>
          </div>
          
          <div class="col-md-6">
            <label class="form-label">Cell</label>
            <select v-model="form.cell" @change="loadVillages" class="form-control" :disabled="!form.sector" style="height: 48px; padding-top: 8px; padding-bottom: 8px;" required>
              <option value="">Select Cell</option>
              <option v-for="cell in cells" :key="cell" :value="cell">{{ cell }}</option>
            </select>
          </div>
          
          <div class="col-md-6">
            <label class="form-label">Village</label>
            <select v-model="form.village" class="form-control" :disabled="!form.cell" style="height: 48px; padding-top: 8px; padding-bottom: 8px;" required>
              <option value="">Select Village</option>
              <option v-for="village in villages" :key="village" :value="village">{{ village }}</option>
            </select>
          </div>
          
          <div class="col-md-6 mt-3">
            <label class="form-label">Gender</label>
            <select v-model="form.gender" class="form-control" :disabled="form.category === 'Company'" required>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
          
          <div class="col-md-6 mt-3">
          <label class="form-label">{{ uploadLabel }}</label>
          <input type="file" @change="handleFileChange('image', $event)" class="form-control" />
           <small class="form-text text-muted">Maximum file size: 1MB</small>
          <!-- Show current image if available -->
          <a :href="uploadsUrl + form.image" target="_blank" v-if="form.image && typeof form.image === 'string'">
              <img :src="uploadsUrl + form.image" alt="Profile" class="img-thumbnail" width="250" />
            </a>
            <!-- Show preview of new image -->
            <img v-if="form.image_url" :src="form.image_url" alt="Profile Preview" class="img-thumbnail" width="250" />
            <br>    
        </div>
        </div>
        <div v-if="message" :class="['alert', messageType]">{{ message }}</div>
        <!-- Profile Image Display -->
        <button type="submit" class="btn btn-primary mb-5" :disabled="isSubmitting">
          <span v-if="isSubmitting" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
          {{ isSubmitting ? 'Updating Profile...' : 'Update Profile' }}
        </button>
      </form>
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
      userEmail: "",
      message: null,
      messageType: null,
      isSubmitting: false,
      // Location data arrays
      provinces: [],
      districts: [],
      sectors: [],
      cells: [],
      villages: [],
      // Field definitions for different categories
      individualFields: [
        { label: "First Name", model: "first_name", type: "text" },
        { label: "Last Name", model: "last_name", type: "text" },
        { label: "Country", model: "country", type: "text" },
        { label: "Telephone", model: "telephone", type: "text" }
      ],
      companyFields: [
        { label: "Company First Name", model: "first_name", type: "text" },
        { label: "Company Last Name", model: "last_name", type: "text" },
        { label: "Country", model: "country", type: "text" },
        { label: "Telephone", model: "telephone", type: "text" }
      ],
    };
  },
  computed: {
    currentFields() {
      return this.form.category === 'Company' ? this.companyFields : this.individualFields;
    },
    uploadLabel() {
      return this.form.category === 'Company' ? 'Upload Logo' : 'Upload Profile Image';
    }
  },
  mounted() {
    this.getUserIdFromEmail();
    this.loadProvinces();
  },
  methods: {
    handleCategoryChange() {
      // Set gender to "Other" when Company is selected
      if (this.form.category === 'Company') {
        this.form.gender = 'Other';
      } else {
        // Reset gender when switching back to Individual (optional)
        this.form.gender = '';
      }
    },
    
    async getUserIdFromEmail() {
      const token = localStorage.getItem("employerToken");
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
        const res = await fetch(`${globalVariable}/provider/view_profile/${this.userId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("employerToken")}` },
        });
        const data = await res.json();
        if (res.ok) {
          this.form = { ...this.form, ...data };
          // Check if image_url is returned from the backend
          if (data.image_url) {
            this.form.image_url = data.image_url;
          }
          // Load location data based on existing profile data
          if (this.form.province) {
            this.loadDistricts();
          }
          if (this.form.district) {
            this.loadSectors();
          }
          if (this.form.sector) {
            this.loadCells();
          }
          if (this.form.cell) {
            this.loadVillages();
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

    // Location loading methods
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
          // Clear dependent fields if province changes
          if (!this.districts.includes(this.form.district)) {
            this.sectors = [];
            this.cells = [];
            this.villages = [];
            this.form.district = "";
            this.form.sector = "";
            this.form.cell = "";
            this.form.village = "";
          }
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
          // Clear dependent fields if district changes
          if (!this.sectors.includes(this.form.sector)) {
            this.cells = [];
            this.villages = [];
            this.form.sector = "";
            this.form.cell = "";
            this.form.village = "";
          }
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
          // Clear dependent fields if sector changes
          if (!this.cells.includes(this.form.cell)) {
            this.villages = [];
            this.form.cell = "";
            this.form.village = "";
          }
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
          // Clear village if cell changes
          if (!this.villages.includes(this.form.village)) {
            this.form.village = "";
          }
        }
      } catch (error) {
        console.error("Error loading villages:", error);
        this.message = "Failed to load villages.";
        this.messageType = "alert-warning";
      }
    },

    handleFileChange(fieldName, event) {
      const file = event.target.files[0];
      if (file) {
        this.form[fieldName] = file;
        this.form.image_url = URL.createObjectURL(file); 
      }
    },

    async handleSubmit() {
      // Set loading state to true
      this.isSubmitting = true;
      
      // Clear any previous messages
      this.message = null;
      this.messageType = null;

      const formData = new FormData();

      for (const key in this.form) {
        if (key === "image") {
          if (this.form.image instanceof File) {
            formData.append("image", this.form.image); // send new image
          } else {
            // Do not append if it's just a string, instead send filename separately
            formData.append("image_name", this.form.image); 
          }
        } else if (key !== "image_url") { // Don't send image_url to backend
          if (this.form[key] !== null && this.form[key] !== undefined) {
            formData.append(key, this.form[key]);
          }
        }
      }

      try {
        const response = await fetch(`${globalVariable}/provider/update_profile/${this.userId}`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("employerToken")}`,
          },
          body: formData,
        });

        const result = await response.json();
        if (response.ok) {
          this.message = result.message;
          this.messageType = "alert-success";
          this.$router.push('/employer/view-profile');
          this.fetchProfile();
        } else {
          this.message = result.message || "Failed to update profile.";
          this.messageType = "alert-danger";
        }
      } catch (error) {
        console.error("Error updating profile:", error);
        this.message = "An error occurred while updating profile.";
        this.messageType = "alert-danger";
      } finally {
        // Reset loading state
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
    transition: all 0.3s ease;
    position: relative;
  }
  
  .btn-primary:hover:not(:disabled) {
    background-color: #d14d95;
    color: white;
  }
  
  .btn-primary:disabled {
    background-color: #E960A6;
    opacity: 0.7;
    cursor: not-allowed;
  }
  
  .form-group {
    margin-bottom: 15px;
  }
  
  /* Spinner animation */
  .spinner-border {
    width: 1rem;
    height: 1rem;
  }
  
  .me-2 {
    margin-right: 0.5rem;
  }
</style>