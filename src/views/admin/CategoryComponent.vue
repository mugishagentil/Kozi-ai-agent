<template>
  <div>
    <IndexComponent />
    <div class="page-wrapper" id="main-wrapper" data-layout="vertical" data-navbarbg="skin6"
      data-sidebartype="full" data-sidebar-description="fixed" data-header-description="fixed"
      style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; z-index: 1;">
      <div class="body-wrapper" style="margin-top: 70px; margin-left: 270px; background: white; min-height: calc(100vh - 70px); padding: 20px; overflow-y: auto; max-height: calc(100vh - 70px);">
        <div v-if="userEmail" class="card-body">
          <!-- <h5 class="text-center">Logged in as:</h5>
          <h6 class="text-center text-muted">{{ userEmail }}</h6>
          <p><strong>users_id:</strong> {{ userId }}</p> -->
        </div>

         <h5  class="card-title fw-semibold mb-4" style="color: #E960A6;">
          <i class="ti ti-briefcase"></i>
          {{ form.id ? "Update Category" : "Add Category" }}
        </h5>

        <form class="mx-4" @submit.prevent="submitForm">
          <div v-if="status.message" :class="['alert mt-3', status.success ? 'alert-success' : 'alert-danger']">
            {{ status.message }}
          </div>

          <div class="form-group row">
            <div class="col-md-12">
              <label class="form-label">Category Type</label>
              <div class="position-relative">
                <select v-model="form.category_type" style="height: 54px;" class="form-control"  required>
                  <option value="">Select Category Type</option>
                  <option v-for="type in categoryTypes" :key="type.id" :value="type.id">
                    {{ type.name }}
                  </option>
                </select>
                <div v-if="loadingCategoryTypes" class="spinner-overlay">
                  <div class="red-spinner"></div>
                </div>
              </div>
            </div>
          </div>

          <div class="form-group row">
            <div class="col-md-12">
              <label class="form-label">Category Name</label>
              <input v-model="form.name" type="text" class="form-control" placeholder="Enter category name" required />
            </div>
          </div>

          <div class="form-group row">
            <div class="col-md-12">
              <label class="form-label">Logo</label>
              <div v-if="form.logo && typeof form.logo === 'string'" class="mb-2">
                <img :src="uploadsUrl + form.logo" alt="Current Logo" class="custom-job-logo" width="150" />
              </div>
              <input type="file" @change="handleFileUpload" class="form-control" :required="!form.id" />
            </div>
          </div>

          <button type="submit" class="btn btn-primary mt-3" :disabled="!isAdmin || isSubmitting">
            <span v-if="isSubmitting" class="red-spinner-inline me-2"></span>
            {{ isSubmitting ? "Submitting..." : form.id ? "Update Category" : "Submit Category" }}
          </button>
        </form>

        <!-- Confirmation Modal -->
        <div v-if="showModal" class="modal-overlay">
          <div class="modal-content">
            <h5>Are you sure you want to delete this category?</h5>
            <div>
              <button class="btn btn-danger mt-3" @click="confirmDeleteCategory" :disabled="isDeletingCategory">
                <span v-if="isDeletingCategory" class="red-spinner-inline me-2"></span>
                {{ isDeletingCategory ? "Deleting..." : "Yes, Delete" }}
              </button>
              &nbsp;
              <button class="btn btn-cancel mt-3" style="background-color: teal; color: white;" @click="closeModal">
                Cancel
              </button>
            </div>
          </div>
        </div>

        <hr class="my-4" />
        <h5 class="fw-semibold mb-3">Categories by Type</h5>

        <!-- Loading spinner for categories -->
        <div v-if="loadingCategories" class="text-center py-4">
          <div class="red-spinner-large"></div>
          <p class="text-muted mt-2">Loading categories...</p>
        </div>

        <div v-else-if="categoriesWithTypes.length === 0" class="text-muted px-4">No categories available yet.</div>

        <div v-else v-for="categoryType in categoriesWithTypes" :key="categoryType.type_id" class="mb-4">
          <h6 class="fw-bold text-primary">{{ categoryType.type_name }}</h6>
          
          <div v-if="categoryType.categories.length === 0" class="text-muted px-3 mb-3">
            No categories in this type yet.
          </div>
          
          <div v-else class="table-responsive">
            <table class="table table-bordered">
              <thead class="table-light">
                <tr>
                  <th>Id</th>
                  <th>Category Name</th>
                  <th>Logo</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(category,index) in categoryType.categories" :key="category.id">
                  <td>{{ index+1 }}</td>
                  <td>{{ category.name }}</td>
                  <td>
                    <img v-if="category.logo" :src="uploadsUrl + category.logo" alt="Logo" class="custom-job-logo" width="100" />
                    <span v-else class="text-muted">No logo</span>
                  </td>
                  <td style="padding: 10px;">
                    <button class="btn btn-primary btn-sm me-2" @click="editCategory(category, categoryType.type_id)" :disabled="!isAdmin">Edit</button>
                    <button class="btn btn-danger btn-sm" @click="openModal(category.id)" :disabled="!isAdmin">Delete</button>
                  </td>

                 
                </tr>
              </tbody>
            </table>
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
  name: "CategoryWrapper",
  components: { IndexComponent },
  data() {
    return {
      uploadsUrl: globalVariable + "/uploads/logo/",
      form: {
        id: null,
        category_type: "",
        name: "",
        logo: "",
      },
      categoryTypes: [],
      categoriesWithTypes: [],
      isSubmitting: false,
      loadingCategoryTypes: false,
      loadingCategories: false,
      isDeletingCategory: false,
      status: {
        success: false,
        message: "",
      },
      userEmail: "",
      userId: "",
      showModal: false,
      selectedCategoryId: null,
    };
  },
  computed: {
    isAdmin() {
    return this.userEmail.toLowerCase() === "admin@kozi.rw";
  }},
  mounted() {
    this.userEmail = localStorage.getItem("userEmail") || "";
    if (this.userEmail) {
      this.getUserIdFromEmail();
    }
    this.fetchCategoryTypes();
    this.fetchCategoriesWithTypes();
  },
  methods: {
    handleFileUpload(event) {
      this.form.logo = event.target.files[0];
    },
    openModal(id) {
      this.selectedCategoryId = id;
      this.showModal = true;
    },
    closeModal() {
      this.showModal = false;
      this.selectedCategoryId = null;
    },
    async fetchCategoryTypes() {
      this.loadingCategoryTypes = true;
      try {
        const res = await fetch(`${globalVariable}/category-types`);
        if (!res.ok) throw new Error("Failed to fetch category types");
        const data = await res.json();
        this.categoryTypes = data;
      } catch (err) {
        console.error("Error fetching category types:", err);
        this.status = {
          success: false,
          message: "Failed to fetch category types.",
        };
      } finally {
        this.loadingCategoryTypes = false;
      }
    },
    async fetchCategoriesWithTypes() {
      this.loadingCategories = true;
      try {
        const res = await fetch(`${globalVariable}/category-types-with-categories`);
        if (!res.ok) throw new Error("Failed to fetch categories with types");
        const data = await res.json();
        this.categoriesWithTypes = data;
      } catch (err) {
        console.error("Error fetching categories with types:", err);
        this.status = {
          success: false,
          message: "Failed to fetch categories.",
        };
      } finally {
        this.loadingCategories = false;
      }
    },
    async confirmDeleteCategory() {
      this.isDeletingCategory = true;
      const token = localStorage.getItem("adminToken");
      try {
        const res = await fetch(`${globalVariable}/admin/category_delete/${this.selectedCategoryId}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const result = await res.json();

        if (res.ok) {
          this.status = {
            success: true,
            message: result.message || "Category deleted successfully.",
          };
          this.fetchCategoriesWithTypes();
        } else {
          this.status = {
            success: false,
            message: result.message || "Failed to delete category.",
          };
        }
      } catch (err) {
        console.error("Delete error:", err);
        this.status = {
          success: false,
          message: "Unexpected error occurred while deleting.",
        };
      } finally {
        this.isDeletingCategory = false;
        this.closeModal();
      }
    },
    async submitForm() {
      this.isSubmitting = true;
      this.status.message = "";

      try {
        const formData = new FormData();
        formData.append("category_type", this.form.category_type);
        formData.append("name", this.form.name);
        if (this.form.logo && typeof this.form.logo !== "string") {
          formData.append("logo", this.form.logo);
        }

        const token = localStorage.getItem("adminToken");

        const url = this.form.id
          ? `${globalVariable}/admin/update_category/${this.form.id}`
          : `${globalVariable}/admin/add_category`;

        const method = this.form.id ? "PUT" : "POST";

        const response = await fetch(url, {
          method,
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        const result = await response.json();

        if (response.ok) {
          this.status = {
            success: true,
            message: result.message || (this.form.id ? "Category updated!" : "Category added!"),
          };

          this.form = { id: null, category_type: "", name: "", logo: "" };
          this.fetchCategoriesWithTypes();
        } else {
          this.status = {
            success: false,
            message: result.message || "Failed to submit category.",
          };
        }
      } catch (err) {
        console.error("Error submitting category:", err);
        this.status = {
          success: false,
          message: "Unexpected error occurred.",
        };
      } finally {
        this.isSubmitting = false;
      }
    },
    editCategory(category, categoryTypeId) {
      this.form = {
        id: category.id,
        category_type: categoryTypeId,
        name: category.name,
        logo: category.logo,
      };
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    async getUserIdFromEmail() {
      const token = localStorage.getItem("adminToken");
      if (!token) return;

      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        if (!this.userEmail) this.userEmail = payload.email;

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
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 20px;
  border-radius: 8px;
  text-align: center;
  max-width: 400px;
  width: 90%;
}

.custom-job-logo {
  border-radius: 4px;
  border: 1px solid #ddd;
}

/* Red Spinner Styles */
.position-relative {
  position: relative;
}

.spinner-overlay {
  position: absolute;
  top: 0;
  right: 10px;
  height: 100%;
  display: flex;
  align-items: center;
  pointer-events: none;
}

.red-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid #dc3545;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.red-spinner-inline {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid #dc3545;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  vertical-align: middle;
}

.red-spinner-large {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #dc3545;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>