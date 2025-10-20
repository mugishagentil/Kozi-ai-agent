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
           <h5 class="card-title fw-semibold mb-4" style="color: #E960A6;"><i class="ti ti-category-2"></i>   All Categories</h5>
        </div>

        <div class="row">
          <div
            class="col-6 col-sm-6 col-md-4 col-lg-3 col-xl-3 mb-4"
            v-for="category in paginatedCategories"
            :key="category.id"
          >
            <router-link :to="`/employer/category/${category.id}`">
              <div class="card h-70 text-center p-3">
                <!-- Fixed image display with proper fallback -->
                <img 
                  :src="getCategoryImage(category.logo)" 
                  :alt="category.name" 
                  class="category-logo rounded-circle img-fluid" 
                  @error="handleImageError"
                />
                
                <div class="card-body px-2">
                  <h5 class="card-title mb-1"><b>{{ category.name }}</b></h5>
                  <p class="mb-0">{{ userCounts[category.id] || 0 }}</p>

                  
                </div>
              </div>
            </router-link>
          </div>
        </div>

        <!-- Pagination -->
        <div class="row">
          <div class="col-12">
            <nav aria-label="Categories pagination">
              <ul class="pagination justify-content-center">
                <!-- Previous Button -->
                <li class="page-item" :class="{ disabled: currentPage === 1 }">
                  <a 
                    class="page-link" 
                    href="#" 
                    @click.prevent="changePage(currentPage - 1)"
                    :tabindex="currentPage === 1 ? -1 : 0"
                  >
                    Previous
                  </a>
                </li>

                <!-- Page Numbers -->
                <li 
                  class="page-item" 
                  v-for="page in visiblePages" 
                  :key="page"
                  :class="{ active: page === currentPage }"
                >
                  <a 
                    class="page-link" 
                    href="#" 
                    @click.prevent="changePage(page)"
                  >
                    {{ page }}
                  </a>
                </li>

                <!-- Next Button -->
                <li class="page-item" :class="{ disabled: currentPage === totalPages }">
                  <a 
                    class="page-link" 
                    href="#" 
                    @click.prevent="changePage(currentPage + 1)"
                    :tabindex="currentPage === totalPages ? -1 : 0"
                  >
                    Next
                  </a>
                </li>
              </ul>
            </nav>
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
  name: "WelcomeComponent",
  components: {
    IndexComponent

  },
  data() {
    return {
      uploadsUrl: globalVariable + "/uploads/logo/",
      categories: [],
      userCounts: {}, // Store user counts by category id
      message: "",
      messageType: "",
      defaultImage: require('@/assets/img/user-1.jpg'), // Default fallback image
      currentPage: 1,
      itemsPerPage: 12,
    };
  },
  computed: {
    // Responsive items per page based on screen size
    responsiveItemsPerPage() {
      if (typeof window !== 'undefined') {
        const width = window.innerWidth;
        if (width < 576) return 4; // Mobile: 2 per row × 2 rows = 4 items
        if (width < 768) return 6; // Small tablets: 2 per row × 3 rows = 6 items
        if (width < 992) return 8; // Tablets: 2 per row × 4 rows = 8 items
        return 12; // Desktop: 4 per row × 3 rows = 12 items
      }
      return 12;
    },

    totalPages() {
      return Math.ceil(this.categories.length / this.responsiveItemsPerPage);
    },
    
    paginatedCategories() {
      const start = (this.currentPage - 1) * this.responsiveItemsPerPage;
      const end = start + this.responsiveItemsPerPage;
      return this.categories.slice(start, end);
    },

    visiblePages() {
      const pages = [];
      const total = this.totalPages;
      const current = this.currentPage;
      
      // Show maximum 5 page numbers
      let start = Math.max(1, current - 2);
      let end = Math.min(total, current + 2);
      
      // Adjust if we're near the beginning or end
      if (end - start < 4) {
        if (start === 1) {
          end = Math.min(total, start + 4);
        } else if (end === total) {
          start = Math.max(1, end - 4);
        }
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      return pages;
    }
  },
  methods: {
    getCategoryImage(logo) {

      console.log('Logo value:', logo);
      console.log('Full URL would be:', this.uploadsUrl + logo);

      if (logo && logo.trim() !== '') {
        return this.uploadsUrl + logo;
      }

      console.log('Using default image');
      return this.defaultImage;
    },

    handleImageError(event) {

      console.log('Image failed to load:', event.target.src);

      event.target.src = this.defaultImage;
    },

    changePage(page) {
      if (page >= 1 && page <= this.totalPages) {
        this.currentPage = page;
        // Scroll to top when changing pages
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },

    handleResize() {
      // Reset to first page when screen size changes to prevent empty pages
      this.$nextTick(() => {
        if (this.currentPage > this.totalPages) {
          this.currentPage = 1;
        }
      });
    },

    async fetchCategory() {
      try {
        const token = localStorage.getItem("employerToken");
        if (!token) {
          this.message = "Authentication required.";
          this.messageType = "alert-danger";
          return;
        }

        const response = await fetch(`${globalVariable}/name_and_id`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          this.message = data.message || "Failed to fetch categories.";
          this.messageType = "alert-danger";
        } else {
          // Debug: Log the fetched categories
          console.log('Fetched categories:', data);
          this.categories = data;

          // Fetch user count for each category
          for (const category of data) {
            this.fetchUserCount(category.id);
          }
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
        this.message = "Error fetching categories.";
        this.messageType = "alert-danger";
      }
    },

    async fetchUserCount(categoryId) {
      try {
        const token = localStorage.getItem("employerToken");

        const response = await fetch(
          `${globalVariable}/seekers/category/count/${categoryId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (response.ok) {
          this.userCounts[categoryId] = data.count || 0;
        } else {
          console.warn(`Failed to fetch user count for category ${categoryId}`);
          this.userCounts[categoryId] = 0;
        }
      } catch (error) {
        console.error(`Error fetching user count for category ${categoryId}:`, error);
        this.userCounts[categoryId] = 0;
      }
    },
  },
  mounted() {
    this.fetchCategory();
    // Add resize listener for responsive pagination
    window.addEventListener('resize', this.handleResize);
  },
  
  beforeUnmount() {
    // Clean up resize listener
    window.removeEventListener('resize', this.handleResize);
  },
};
</script>

<style scoped>
/* Responsive Card Styles */
.card {
  transition: box-shadow 0.3s ease;
  height: 100%;
  min-height: 280px;
}

.card:hover {
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

.card img {
  object-fit: cover;
  max-width: 100%;
  height: auto;
  aspect-ratio: 1;
}

.category-logo {
  transition: transform 0.3s ease;
  border: 2px solid #f0f0f0;
  width: 100%;
  max-width: 180px;
  height: auto;
  margin: 0 auto;
}

.category-logo:hover {
  transform: scale(1.05);
}

.card-title {
  font-size: 1rem;
  line-height: 1.2;
}

/* Mobile Responsive Styles */
@media (max-width: 575.98px) {
  .card {
    min-height: 220px;
  }
  
  .category-logo {
    max-width: 120px;
  }
  
  .card-title {
    font-size: 0.9rem;
  }
  
  .card-body {
    padding: 0.75rem 0.5rem;
  }
  
  .pagination {
    margin-top: 1rem;
  }
  
  .page-link {
    padding: 0.375rem 0.5rem;
    font-size: 0.875rem;
  }
}

/* Small tablets */
@media (min-width: 576px) and (max-width: 767.98px) {
  .card {
    min-height: 250px;
  }
  
  .category-logo {
    max-width: 150px;
  }
}

/* Tablets */
@media (min-width: 768px) and (max-width: 991.98px) {
  .card {
    min-height: 260px;
  }
  
  .category-logo {
    max-width: 160px;
  }
}

/* Desktop */
@media (min-width: 992px) {
  .card {
    min-height: 280px;
  }
  
  .category-logo {
    max-width: 180px;
  }
}

/* Pagination Styles */
.pagination {
  margin-top: 2rem;
  flex-wrap: wrap;
  justify-content: center;
}

.page-link {
  color: #E960A6;
  border-color: #E960A6;
  padding: 0.5rem 0.75rem;
  margin: 0.125rem;
  border-radius: 0.375rem;
  min-width: 44px;
  text-align: center;
}

.page-link:hover {
  color: #fff;
  background-color: #E960A6;
  border-color: #E960A6;
}

.page-item.active .page-link {
  background-color: #E960A6;
  border-color: #E960A6;
  color: #fff;
}

.page-item.disabled .page-link {
  color: #6c757d;
  background-color: #fff;
  border-color: #dee2e6;
}

.page-item.disabled .page-link:hover {
  color: #6c757d;
  background-color: #fff;
  border-color: #dee2e6;
}

/* Responsive Pagination */


@media (min-width: 576px) and (max-width: 767.98px) {
  .page-link {
    padding: 0.4rem 0.6rem;
    font-size: 0.9rem;
    min-width: 40px;
  }
}
</style>