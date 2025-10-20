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
       <h5 class="card-title fw-semibold mb-4" style="color: #E960A6;"><i class="ti ti-user-plus"></i>  Register New Job Provider</h5>
      <form @submit.prevent="handleSubmit" class="mx-4" enctype="multipart/form-data">
       

        <div class="form-group row">
          <div class="col-md-6">
            <label class="form-label">Select Category</label>
            <select v-model="form.category" class="form-control" style="height: 54px;" required>
              <option value="Individual">Individual</option>
              <option value="Company">Company</option>
            </select>
          </div>

          <!-- Basic fields excluding location fields -->
          <div class="col-md-6" v-for="(field, index) in basicFields" :key="index">
            <label :for="field.model" class="form-label">{{ field.label }}</label>
            <input
              :type="field.type"
              v-model="form[field.model]"
              class="form-control"
              :id="field.model"
              required
            />
          </div>

          <!-- Province Dropdown -->
          <div class="col-md-6">
            <label class="form-label">Province</label>
            <select 
              v-model="form.province" 
              @change="loadDistricts" 
              class="form-control" 
              style="height: 48px; padding-top: 8px; padding-bottom: 8px;" required
            >
              <option value="">Select Province</option>
              <option v-for="province in provinces" :key="province" :value="province">{{ province }}</option>
            </select>
          </div>

          <!-- District Dropdown -->
          <div class="col-md-6">
            <label class="form-label">District</label>
            <select 
              v-model="form.district" 
              @change="loadSectors" 
              class="form-control" 
              style="height: 48px; padding-top: 8px; padding-bottom: 8px;" required
              :disabled="!form.province"
            >
              <option value="">Select District</option>
              <option v-for="district in districts" :key="district" :value="district">{{ district }}</option>
            </select>
          </div>

          <!-- Sector Dropdown -->
          <div class="col-md-6">
            <label class="form-label">Sector</label>
            <select 
              v-model="form.sector" 
              @change="loadCells" 
              class="form-control" 
              style="height: 48px; padding-top: 8px; padding-bottom: 8px;" required
              :disabled="!form.district"
            >
              <option value="">Select Sector</option>
              <option v-for="sector in sectors" :key="sector" :value="sector">{{ sector }}</option>
            </select>
          </div>

          <!-- Cell Dropdown -->
          <div class="col-md-6">
            <label class="form-label">Cell</label>
            <select 
              v-model="form.cell" 
              @change="loadVillages" 
              class="form-control" 
              style="height: 48px; padding-top: 8px; padding-bottom: 8px;" required
              :disabled="!form.sector"
            >
              <option value="">Select Cell</option>
              <option v-for="cell in cells" :key="cell" :value="cell">{{ cell }}</option>
            </select>
          </div>

          <!-- Village Dropdown -->
          <div class="col-md-6">
            <label class="form-label">Village</label>
            <select 
              v-model="form.village" 
              class="form-control" 
              style="height: 48px; padding-top: 8px; padding-bottom: 8px;" required
              :disabled="!form.cell"
            >
              <option value="">Select Village</option>
              <option v-for="village in villages" :key="village" :value="village">{{ village }}</option>
            </select>
          </div>

          <div class="col-md-6">
            <label class="form-label">Gender</label>
            <select v-model="form.gender" class="form-control" style="height: 54px;" required>
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div class="col-md-6">
            <label class="form-label">Upload Profile Image/Logo (optional)</label>
            <input 
              type="file" 
              @change="handleFileChange('image', $event)" 
              class="form-control"
              accept="image/*"
            />
            <div v-if="form.image_url" class="mt-3">
              <img :src="form.image_url" alt="Profile" class="img-thumbnail" style="max-height: 150px;" />
            </div>
          </div>
        </div>

        <!-- <div class="mt-3 text-muted">
          <strong>Role ID:</strong> {{ form.role_id || 'Not loaded' }}
        </div> -->
         <div v-if="message" :class="['alert', messageType]">{{ message }}</div>

        <button type="submit" class="btn btn-primary mb-5">Register</button>
      </form>
    </div>
  </div>
</template>

<script>
import axios from "axios";
import { globalVariable } from "@/global";
import IndexComponent from "./IndexComponent.vue";
// Import your location API functions
import {
  getProvinces,
  getDistrictsByProvince,
  getSectorsByDistrict,
  getCellsBySector,
  getVillagesByCell
} from 'rwanda-geo-structure';

export default {
  name: "RegisterJobProviderComponent",
  components: { IndexComponent },
  data() {
    return {
      form: {
        role_id: null,
        email: "",
        password: "",
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
        image_url: null, // preview URL
      },
      uploadsUrl: `${globalVariable}/uploads/profile/`,
      message: null,
      messageType: null,
      // Location data arrays
      provinces: [],
      districts: [],
      sectors: [],
      cells: [],
      villages: [],
      // Basic fields (excluding location fields)
      basicFields: [
        { label: "Email", model: "email", type: "email" },
        { label: "Password", model: "password", type: "password" },
        { label: "First Name", model: "first_name", type: "text" },
        { label: "Last Name", model: "last_name", type: "text" },
        { label: "Country", model: "country", type: "text" },
        { label: "Telephone", model: "telephone", type: "tel" },
      ],
    };
  },
  methods: {
    handleFileChange(fieldName, event) {
      const file = event.target.files[0];
      if (file) {
        this.form[fieldName] = file;
        if (fieldName === 'image') {
          this.form.image_url = URL.createObjectURL(file);
        }
      }
    },

    async handleSubmit() {
      const formData = new FormData();
      for (const key in this.form) {
        if (this.form[key] !== null && key !== 'image_url') {
          formData.append(key, this.form[key]);
        }
      }

      try {
        const response = await fetch(`${globalVariable}/admin/add_job_provider`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
          },
          body: formData,
        });

        const result = await response.json();
        if (response.ok) {
          this.message = result.message || "Job provider registered successfully.";
          this.messageType = "alert-success";
          this.resetForm();
        } else {
          this.message = result.message || "Failed to register job provider.";
          this.messageType = "alert-danger";
        }
      } catch (error) {
        console.error("Error registering job provider:", error);
        this.message = "An error occurred while submitting the form.";
        this.messageType = "alert-danger";
      }
    },

    resetForm() {
      this.form = {
        role_id: this.form.role_id,
        email: "",
        password: "",
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
        image_url: null,
      };
      // Reset location arrays
      this.districts = [];
      this.sectors = [];
      this.cells = [];
      this.villages = [];
    },

    async loadRoleId() {
      try {
        const token = localStorage.getItem("adminToken");
        if (!token) {
          console.error("No token found in localStorage");
          return;
        }

        const res = await axios.get(`${globalVariable}/admin/role/provider`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        this.form.role_id = res.data.role_id || 2;
        console.log("Role ID set to:", this.form.role_id);
      } catch (err) {
        console.error("Failed to fetch role_id:", err);
        this.form.role_id = 2;
      }
    },

    // Location API methods
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
  },

  mounted() {
    this.loadRoleId();
    this.loadProvinces(); // Load provinces on component mount
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
        