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
        <!-- Spinner Overlay -->
        <div v-if="isLoading" class="spinner-overlay">
          <div class="spinner-border text-pink" role="status">
            <span class="sr-only">Loading...</span>
          </div>
        </div>
        <h5 class="card-title fw-semibold mb-4" style="color: #E960A6;">
          <i class="ti ti-users"></i> All seekers
        </h5>
        <!-- Live Search Input -->
        <div class="row mb-3">
          <div class="col-md-6">
            <input
              type="text"
              v-model="searchQuery"
              class="form-control"
              placeholder="Search by name"
            />
          </div>
          <div class="col-md-6">
            <select v-model="selectedCategoryId" class="form-control">
              <option disabled value="">SELECT CATEGORY</option>
              <option value="">All Categories</option>
              <option
                v-for="category in categories"
                :key="category.id"
                :value="category.id"
              >
                {{ category.name }}
              </option>
            </select>
          </div>
        </div>

        <!-- Job Cards -->
        <div class="row">
          <div
            class="col-md-4 mb-4"
            v-for="job in filteredJobs"
            :key="job.id"
          >
            <a :href="`seekers/${job.users_id}`">
              <div class="card h-100 text-center p-3">
                <img
                  :src="uploadsUrl + job.image"
                  @error="setDefaultImage"
                  alt="Profile"
                  class="card-img-top mx-auto"
                  style="width: 250px; height: 250px; object-fit: cover;"
                />
                <div class="card-body">
                  <h6 class="card-title">
                    <b style="font-size: 20px;">{{ job.first_name }} {{ job.last_name }}</b>
                    <img style="margin-left: 5px;"
                      v-if="job.verification_badge === 1"
                      :src="profileImage"
                      width="25"
                      height="25"
                      class="rounded-circle"
                      alt="User profile"
                    />
                  </h6>
                  <p>{{ categoryNames[job.categories_id] || "Loading category..." }}</p>
                  <p class="card-text">
                    <template v-if="job.verification_badge === 1">
                      <i class="fa-solid fa-star" style="color: gold;"></i>
                      <i class="fa-solid fa-star" style="color: gold;"></i>
                      <i class="fa-solid fa-star" style="color: gold;"></i>
                      <i class="fa-solid fa-star" style="color: gold;"></i>
                      <i class="fa-solid fa-star" style="color: gold;"></i>
                    </template>
                    <template v-else>
                      <i class="fa-solid fa-star" style="color: gold;"></i>
                      <i class="fa-solid fa-star" style="color: gold;"></i>
                      <i class="fa-solid fa-star"></i>
                      <i class="fa-solid fa-star"></i>
                      <i class="fa-solid fa-star"></i>
                    </template>
                  </p>
                </div>
              </div>
            </a>
          </div>
        </div>

        <!-- Pagination Controls -->
        <div class="d-flex justify-content-center mt-4">
          <nav>
            <ul class="pagination">
              <li class="page-item" :class="{ disabled: currentPage === 1 }">
                <button class="page-link" @click="goToPage(currentPage - 1)">Previous</button>
              </li>
              <li
                v-for="page in visiblePageNumbers"
                :key="page"
                class="page-item"
                :class="{ active: page === currentPage }"
              >
                <button class="page-link" @click="goToPage(page)">{{ page }}</button>
              </li>
              <li class="page-item" :class="{ disabled: currentPage === totalPages }">
                <button class="page-link" @click="goToPage(currentPage + 1)">Next</button>
              </li>
            </ul>
          </nav>
        </div>

        <!-- Message -->
        <div v-if="message" :class="['alert', messageType]">{{ message }}</div>
      </div>
    </div>
  </div>
</template>

<script>
import { reactive } from "vue";
import { globalVariable } from "@/global";
import IndexComponent from "./IndexComponent.vue";

export default {
  name: "AllSeekers",
  components: {
    IndexComponent,
  },
  data() {
    return {
      jobs: [],
      searchQuery: "",
      selectedCategoryId: "",
      categories: [],
      categoryNames: reactive({}),
      uploadsUrl: `${globalVariable}/uploads/profile/`,
      profileImage: require("@/assets/img/badge.png"),
      currentPage: 1,
      perPage: 6,
      message: "",
      messageType: "",
      isLoading: false, // 🔥 spinner state
    };
  },
  computed: {
    visiblePageNumbers() {
      const pages = [];
      const total = this.totalPages;
      const current = this.currentPage;
      const maxVisible = 5;

      let start = current - Math.floor(maxVisible / 2);
      let end = current + Math.floor(maxVisible / 2);

      if (start < 1) {
        start = 1;
        end = Math.min(maxVisible, total);
      }
      if (end > total) {
        end = total;
        start = Math.max(1, end - maxVisible + 1);
      }
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      return pages;
    },

    filteredJobs() {
      const query = this.searchQuery.toLowerCase();
      return this.jobs
        .filter((job) => {
          const fullName = `${job.first_name} ${job.last_name}`.toLowerCase();
          const category = this.categoryNames[job.categories_id]?.toLowerCase() || '';
          const matchesName = fullName.includes(query) || category.includes(query);
          const matchesCategory = !this.selectedCategoryId || job.categories_id === this.selectedCategoryId;
          return matchesName && matchesCategory;
        })
        .slice((this.currentPage - 1) * this.perPage, this.currentPage * this.perPage);
    },
    totalPages() {
      const query = this.searchQuery.toLowerCase();
      const filteredCount = this.jobs.filter((job) => {
        const fullName = `${job.first_name} ${job.last_name}`.toLowerCase();
        const category = this.categoryNames[job.categories_id]?.toLowerCase() || '';
        const matchesName = fullName.includes(query) || category.includes(query);
        const matchesCategory = !this.selectedCategoryId || job.categories_id === this.selectedCategoryId;
        return matchesName && matchesCategory;
      }).length;
      return Math.ceil(filteredCount / this.perPage);
    },
  },
  methods: {
    async fetchJobs() {
      this.isLoading = true; // 🔥 show spinner
      try {
        const token = localStorage.getItem("employerToken");
        if (!token) {
          this.message = "Authentication required.";
          this.messageType = "alert-danger";
          return;
        }

        const response = await fetch(`${globalVariable}/job_seekers`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();

        if (!response.ok) {
          this.message = data.message || "Failed to fetch jobs.";
          this.messageType = "alert-danger";
        } else {
          this.jobs = data;
          const uniqueCategoryIds = [...new Set(data.map((job) => job.categories_id))];
          for (const id of uniqueCategoryIds) {
            if (id) this.fetchCategoryName(id);
          }
        }
      } catch (error) {
        console.error("Error fetching jobs:", error);
        this.message = "Error fetching jobs.";
        this.messageType = "alert-danger";
      } finally {
        this.isLoading = false; // 🔥 hide spinner
      }
    },

    async fetchCategoryName(categoryId) {
      if (this.categoryNames[categoryId]) return;
      try {
        const response = await fetch(`${globalVariable}/category_name/${categoryId}`);
        const data = await response.json();
        if (response.ok && Array.isArray(data) && data.length > 0 && data[0].name) {
          this.categoryNames[categoryId] = data[0].name;
        } else {
          this.categoryNames[categoryId] = "Unknown";
        }
      } catch (error) {
        console.error(`Error fetching category name for ID ${categoryId}:`, error);
        this.categoryNames[categoryId] = "Unknown";
      }
    },

    async fetchCategories() {
      this.isLoading = true; // 🔥 spinner while fetching categories
      try {
        const token = localStorage.getItem("employerToken");
        const response = await fetch(`${globalVariable}/name_and_id`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (response.ok) {
          this.categories = data;
        } else {
          console.error("Failed to load categories:", data.message);
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
      } finally {
        this.isLoading = false;
      }
    },

    setDefaultImage(event) {
      event.target.src = require("@/assets/img/sample.png");
    },

    goToPage(page) {
      if (page >= 1 && page <= this.totalPages) {
        this.currentPage = page;
      }
    },
  },
  watch: {
    searchQuery() {
      this.currentPage = 1;
    },
    selectedCategoryId() {
      this.currentPage = 1;
    },
  },
  mounted() {
    this.fetchJobs();
    this.fetchCategories();
  },
};
</script>

<style scoped>
/* 🔥 Spinner Styles */
.spinner-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1050;
}
.spinner-border {
  width: 3rem;
  height: 3rem;
  border-width: 0.4em;
}
.text-pink {
  color: #EA60A7 !important;
}
</style>