<template>
  <IndexComponent />
  <div class="page-wrapper" id="main-wrapper" data-layout="vertical" data-navbarbg="skin6" data-sidebartype="full" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; z-index: 1;">
    <div class="body-wrapper" style="margin-top: 70px; margin-left: 270px; background: white; min-height: calc(100vh - 70px); padding: 20px; overflow-y: auto; max-height: calc(100vh - 70px);">
       <h5 class="card-title fw-semibold mb-4" style="color: #E960A6;"><i class="ti ti-user-plus"></i>  Register New Job Provider</h5>

      <form @submit.prevent="handleSubmit" class="mx-4" enctype="multipart/form-data">
        

        <div class="form-group row">
          <div class="col-md-6" v-for="(field, index) in personalFields" :key="index">
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
            <label class="form-label">Gender</label>
            <select v-model="form.gender" class="form-control" required>
              <option value="" disabled>Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
        <div v-if="message" :class="['alert', messageType]">{{ message }}</div>

        <!-- <div class="mt-3 text-muted">
          <strong>Role ID:</strong> {{ form.role_id || 'Not loaded' }}
        </div> -->

        <button type="submit" class="btn btn-primary mb-3">Register</button>
      </form>
    </div>
  </div>
</template>
<script>
import axios from "axios";
import { globalVariable } from "@/global";
import IndexComponent from "./IndexComponent.vue";

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
        telephone: "",
        province: "",
        district: "",
        sector: "",
        cell: "",
        village: "",
        gender: "",
      },
      message: null,
      messageType: null,
      personalFields: [
        { label: "Email", model: "email", type: "text" },
        { label: "Password", model: "password", type: "password" },
        { label: "First Name", model: "first_name", type: "text" },
        { label: "Last Name", model: "last_name", type: "text" },
        { label: "Country", model: "country", type: "text" },
        { label: "Province", model: "province", type: "text" },
        { label: "District", model: "district", type: "text" },
        { label: "Sector", model: "sector", type: "text" },
        { label: "Cell", model: "cell", type: "text" },
        { label: "Village", model: "village", type: "text" },
        { label: "Telephone", model: "telephone", type: "text" },
      ],
    };
  },
  methods: {
    async handleSubmit() {
      const formData = new FormData();
      Object.entries(this.form).forEach(([key, value]) => {
        formData.append(key, value);
      });

      try {
        const response = await fetch(`${globalVariable}/admin/add_agent`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
          },
          body: formData,
        });

        const result = await response.json();
        if (response.ok) {
          this.message = result.message || "Agent registered successfully.";
          this.messageType = "alert-success";
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

    async loadRoleId() {
      try {
        const token = localStorage.getItem("adminToken");
        const res = await axios.get(`${globalVariable}/admin/role/agent`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        this.form.role_id = res.data.role_id || 3;
      } catch (err) {
        console.error("Failed to fetch role_id:", err);
        this.form.role_id = 3;
      }
    },
  },
  mounted() {
    this.loadRoleId();
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
        