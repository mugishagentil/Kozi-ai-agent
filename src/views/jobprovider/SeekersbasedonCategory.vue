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
    <div class="body-wrapper" style="margin-top: -4rem;">
      <div class="container-fluid">
        <div class="row">
          <h3 style="text-align:center;color:#5F9EA0; font-family:'Michroma', sans-serif;">
            <p style="text-transform: uppercase;">
              ALL WORKERS IN {{ categoryNames[category_id] || 'Loading category...' }}
            </p>
          </h3>
        </div>

        <!-- Loader -->
        <div v-if="loading" class="text-center my-5">
          <div class="spinner-border" role="status" style="width: 4rem; height: 4rem; color: #EA60A7;">
            <span class="visually-hidden">Loading...</span>
          </div>
        </div>

        <!-- Workers Grid -->
        <div v-else class="row">
          <div
            class="col-md-4 mb-4"
            v-for="job in paginatedSeekers"
            :key="job.users_id"
          >
            <router-link :to="`/employer/seekers/${job.users_id}`">
              <div class="card h-100 text-center p-3">
                <img
                  :src="uploadsUrl + job.image"
                  @error="setDefaultImage"
                  alt="Profile"
                  class="card-img-top mx-auto"
                  style="width: 250px; height: 250px; object-fit: cover;"
                />
                <div class="card-body">
                  <b style="font-size: 20px;">{{ job.first_name }} {{ job.last_name }}</b>
                  <img
                    style="margin-left: 5px;"
                    v-if="job.verification_badge === 1"
                    :src="profileImage"
                    width="25"
                    height="25"
                    class="rounded-circle"
                    alt="User profile"
                  /><br>
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
                </div>
              </div>
            </router-link>
          </div>
        </div>

        <!-- Pagination -->
        <div v-if="totalPages > 1" class="d-flex justify-content-center mt-4">
          <nav>
            <ul class="pagination">
              <!-- Previous Button -->
              <li class="page-item" :class="{ disabled: currentPage === 1 }">
                <button 
                  class="page-link" 
                  @click="changePage(currentPage - 1)"
                  :disabled="currentPage === 1"
                >
                  Previous
                </button>
              </li>

              <!-- Page Numbers (Limited to 5 pages) -->
              <li
                v-for="page in visiblePages"
                :key="page"
                class="page-item"
                :class="{ active: currentPage === page }"
              >
                <button class="page-link" @click="changePage(page)">{{ page }}</button>
              </li>

              <!-- Next Button -->
              <li class="page-item" :class="{ disabled: currentPage === totalPages }">
                <button 
                  class="page-link" 
                  @click="changePage(currentPage + 1)"
                  :disabled="currentPage === totalPages"
                >
                  Next
                </button>
              </li>
            </ul>
          </nav>
        </div>

      </div>
    </div>
  </div>
</template>

<script>
import IndexComponent from "./IndexComponent.vue";
import { globalVariable } from "@/global";

export default {
  name: "WelcomeComponent",
  components: { IndexComponent },
  data() {
    return {
      jobSeekers: [],
      message: "",
      messageType: "",
      category_id: null,
      categoryNames: {},
      profileImage: require("@/assets/img/badge.png"),
      uploadsUrl: `${globalVariable}/uploads/profile/`,
      loading: false,

      // Pagination
      currentPage: 1,
      perPage: 12,
      maxVisiblePages: 5, // Maximum number of page buttons to show
    };
  },
  computed: {
    totalPages() {
      return Math.ceil(this.jobSeekers.length / this.perPage);
    },
    paginatedSeekers() {
      const start = (this.currentPage - 1) * this.perPage;
      const end = start + this.perPage;
      return this.jobSeekers.slice(start, end);
    },
    visiblePages() {
      const total = this.totalPages;
      const current = this.currentPage;
      const maxVisible = this.maxVisiblePages;
      
      if (total <= maxVisible) {
        // If total pages is less than or equal to maxVisible, show all pages
        return Array.from({ length: total }, (_, i) => i + 1);
      }
      
      // Calculate the start and end page numbers
      let start = Math.max(1, current - Math.floor(maxVisible / 2));
      let end = Math.min(total, start + maxVisible - 1);
      
      // Adjust start if we're near the end
      if (end - start + 1 < maxVisible) {
        start = Math.max(1, end - maxVisible + 1);
      }
      
      return Array.from({ length: end - start + 1 }, (_, i) => start + i);
    },
  },
  methods: {
    async FetchSeeker() {
      this.loading = true;
      try {
        const token = localStorage.getItem("employerToken");
        if (!token) {
          this.message = "Authentication required.";
          this.messageType = "alert-danger";
          this.loading = false;
          return;
        }

        const response = await fetch(
          `${globalVariable}/select_user_based_on_category/${this.category_id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const data = await response.json();
        if (!response.ok) {
          this.message = data.message || "Failed to fetch job seekers.";
          this.messageType = "alert-danger";
        } else {
          this.jobSeekers = data;
          for (const job of data) {
            this.fetchCategoryName(job.categories_id);
          }
        }
      } catch (error) {
        console.error("Error fetching job seekers:", error);
        this.message = "Error fetching job seekers.";
        this.messageType = "alert-danger";
      } finally {
        this.loading = false;
      }
    },
    setDefaultImage(event) {
      event.target.src = require("@/assets/img/sample.png");
    },
    async fetchCategoryName(category_id) {
      if (this.categoryNames[category_id]) return;

      try {
        const response = await fetch(`${globalVariable}/category_name/${category_id}`);
        const data = await response.json();

        if (response.ok && Array.isArray(data) && data.length > 0 && data[0].name) {
          this.categoryNames[category_id] = data[0].name;
        } else {
          this.categoryNames[category_id] = "Unknown";
        }
      } catch (error) {
        console.error(`Error fetching category name for ID ${category_id}:`, error);
        this.categoryNames[category_id] = "Unknown";
      }
    },
    changePage(page) {
      if (page >= 1 && page <= this.totalPages) {
        this.currentPage = page;
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    },
  },
  mounted() {
    this.category_id = this.$route.params.category_id;
    this.FetchSeeker();
    this.fetchCategoryName(this.category_id);
  },
};
</script>