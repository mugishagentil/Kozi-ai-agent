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
      <h5 class="card-title fw-semibold mb-4">Update seeker</h5>
      <form @submit.prevent="handleSubmit" class="mx-4">
        
        <div class="form-group row">
          <div class="col-md-6" v-for="(field, index) in personalFields" :key="index">
            <label :for="field.model" class="form-label">{{ field.label }}</label>
            <input :type="field.type" v-model="form[field.model]" class="form-control" :id="field.model" required />
          </div>

          <div class="col-md-6">
            <label class="form-label">Gender</label>
            <select v-model="form.gender" class="form-control" required style="height: 48px; padding-top: 8px; padding-bottom: 8px;">
              <option disabled value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div class="col-md-6">
            <label class="form-label">Disability</label>
            <select v-model="form.disability" class="form-control" required style="height: 48px; padding-top: 8px; padding-bottom: 8px;">
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

          <!-- Rwanda Geographic Structure Dropdowns -->
          <div class="col-md-6">
            <label class="form-label">Province</label>
            <select 
              v-model="form.province" 
              @change="loadDistricts" 
              class="form-control" 
              required style="height: 48px; padding-top: 8px; padding-bottom: 8px;"
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
              class="form-control" 
              required style="height: 48px; padding-top: 8px; padding-bottom: 8px;"
              :disabled="!form.province"
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
              class="form-control" 
              required style="height: 48px; padding-top: 8px; padding-bottom: 8px;"
              :disabled="!form.district"
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
              class="form-control" 
              required style="height: 48px; padding-top: 8px; padding-bottom: 8px;"
              :disabled="!form.sector"
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
              class="form-control" 
              required style="height: 48px; padding-top: 8px; padding-bottom: 8px;"
              :disabled="!form.cell"
            >
              <option disabled value="">Select Village</option>
              <option v-for="village in villages" :key="village" :value="village">
                {{ village }}
              </option>
            </select>
          </div>

          <!-- Category selection -->
          <div class="col-md-6">
            <label class="form-label">Category Type</label>
            <select v-model="selectedCategoryType" @change="onCategoryTypeChange" class="form-control" required style="height: 48px; padding-top: 8px; padding-bottom: 8px;">
              <option disabled value="">Select Category Type</option>
              <option v-for="type in categoryTypes" :key="type.id" :value="type.id">{{ type.name }}</option>
            </select>
          </div>

          <div class="col-md-6">
            <label class="form-label">Category</label>
            <select v-model="form.categories_id" style="height: 48px; padding-top: 8px; padding-bottom: 8px;" class="form-control" required>
              <option disabled value="">Select Category</option>
              <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
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
            <label class="form-label">Upload CV</label>
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
            <label class="form-label">Bio</label>
            <textarea v-model="form.bio" class="form-control" rows="10" required></textarea>
          </div>
        </div>

        <button type="submit" class="btn btn-primary mb-3">Update</button>

        <div v-if="message" :class="['alert', messageType]">{{ message }}</div>
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
        gender: "",
        fathers_name: "",
        mothers_name: "",
        telephone: "",
        email: "",
        province: "",
        district: "",
        sector: "",
        cell: "",
        village: "",
        bio: "",
        salary: "",
        date_of_birth: "",
        disability: "",
        created_at: "",
        cv: null,
        id: null,
        image: null,
        categories_id: "",
        id_url: null,
        userIdurl: null,
        users_id: null,
        cv_url: null,
        image_url: null,
      },
      selectedCategoryType: "",
      userId: "",
      userEmail: "",
      message: null,
      messageType: null,
      categoryTypes: [],
      categories: [],
      
      // Rwanda geographic data
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
        { label: "Telephone", model: "telephone", type: "text" },
        { label: "Email", model: "email", type: "text" },
        { label: "Date of Birth", model: "date_of_birth", type: "date" },
      ],
    };
  },
  mounted() {
    this.loadProvinces();
    this.getUserIdFromEmail();
    this.loadCategoryTypes();
    this.userIdurl = this.$route.params.id;
  },
  methods: {
    // Rwanda geographic methods
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
          if (this.districts.length > 0 && !this.districts.includes(this.form.district)) {
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
          if (this.sectors.length > 0 && !this.sectors.includes(this.form.sector)) {
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
          if (this.cells.length > 0 && !this.cells.includes(this.form.cell)) {
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
          if (this.villages.length > 0 && !this.villages.includes(this.form.village)) {
            this.form.village = "";
          }
        }
      } catch (error) {
        console.error("Error loading villages:", error);
        this.message = "Failed to load villages.";
        this.messageType = "alert-warning";
      }
    },

    // Method to populate cascading dropdowns when loading existing data
    async populateGeographicHierarchy() {
      try {
        if (this.form.province) {
          this.loadDistricts();
          
          if (this.form.district) {
            // Wait a bit for districts to load then load sectors
            setTimeout(() => {
              this.loadSectors();
              
              if (this.form.sector) {
                setTimeout(() => {
                  this.loadCells();
                  
                  if (this.form.cell) {
                    setTimeout(() => {
                      this.loadVillages();
                    }, 100);
                  }
                }, 100);
              }
            }, 100);
          }
        }
      } catch (error) {
        console.error("Error populating geographic hierarchy:", error);
      }
    },

    async getUserIdFromEmail() {
      const token = localStorage.getItem("agentToken");
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
        const res = await fetch(`${globalVariable}/seeker/view_profile/${this.userIdurl}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("agentToken")}` },
        });
        const data = await res.json();
        if (res.ok) {
          // Fix date_of_birth format for input[type=date]
          this.form.date_of_birth = data.date_of_birth ? data.date_of_birth.split("T")[0] : "";

          // salary matches your option values, just assign it directly
          this.form.salary = data.salary || "";

          // Map other fields except date_of_birth, salary
          Object.keys(this.form).forEach(key => {
            if (key !== "date_of_birth" && key !== "salary") {
              this.form[key] = data[key] || this.form[key];
            }
          });

          // Fix case of ID field to map correctly to id_url
          this.form.id_url = data.ID ? `${globalVariable}/uploads/profile/${data.ID}` : null;
          this.form.cv_url = data.cv ? `${globalVariable}/uploads/profile/${data.cv}` : null;
          this.form.image_url = data.image ? `${globalVariable}/uploads/profile/${data.image}` : null;

          // Populate geographic hierarchy after form data is loaded
          await this.populateGeographicHierarchy();

          // Load current category info using the new method
          await this.loadCurrentCategoryInfo();
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

    // NEW: Improved method to load current category information
    async loadCurrentCategoryInfo() {
      try {
        // Use the new endpoint to get current category info
        const res = await fetch(`${globalVariable}/categoryandtype/${this.userIdurl}`);
        const data = await res.json();
        if (res.ok) {
          // Set the current category_type first using category_types_id
          this.selectedCategoryType = data.category_types_id;
          
          // Load categories for this category type
          await this.loadCategories();
          
          // Then set the current category_id after categories are loaded
          this.form.categories_id = data.category_id;
        } else {
          console.error("Failed to load current category info:", data.message);
        }
      } catch (error) {
        console.error("Error loading current category info:", error);
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
      if (!this.selectedCategoryType) return;
      
      try {
        const res = await fetch(`${globalVariable}/categories/${this.selectedCategoryType}`);
        const data = await res.json();
        this.categories = data;
        
        // Don't reset categories_id when loading categories for existing data
        // Only reset when user manually changes category type
      } catch (error) {
        console.error("Failed to load categories:", error);
      }
    },

    // Handle category type change (when user manually changes it)
    async onCategoryTypeChange() {
      await this.loadCategories();
      // Reset category selection when user changes category type
      this.form.categories_id = "";
    },

    // REMOVED: The old determineCategoryType method since we're using loadCurrentCategoryInfo now

    handleFileChange(field, event) {
      const file = event.target.files[0];
      if (file) {
        // Check file size (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
          this.message = `File ${file.name} is too large. Maximum size is 10MB.`;
          this.messageType = "alert-danger";
          return;
        }
        
        this.form[field] = file;
        
        // Create preview URLs for images
        if (field === 'image' && file.type.startsWith('image/')) {
          this.form.image_url = URL.createObjectURL(file);
        }
      }
    },

    async handleSubmit() {
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

      // Always set is_editable = 0 on update
      formData.append("is_editable", 0);

      try {
        const res = await fetch(`${globalVariable}/seeker/update_profile/${this.userIdurl}`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("agentToken")}`,
          },
          body: formData,
        });
        const data = await res.json();
        if (res.ok) {
          this.message = "Profile updated successfully.";
          this.messageType = "alert-success";
          await this.fetchProfile(); // refresh profile info after update
        } else {
          this.message = data.message || "Failed to update profile.";
          this.messageType = "alert-danger";
        }
      } catch (error) {
        console.error("Error updating profile:", error);
        this.message = "An error occurred during update.";
        this.messageType = "alert-danger";
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
      


      