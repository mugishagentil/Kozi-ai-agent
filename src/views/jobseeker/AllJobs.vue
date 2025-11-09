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
        <div class="job-header">
          <h1>See Our Current Job Openings</h1>
        </div>
        <div class="custom-main-container">
          <!-- Left Side: Jobs -->
          <div class="custom-col-left">
            <div v-if="jobs.length > 0">
              <div class="custom-job-item" v-for="job in paginatedJobs" :key="job.id">
                <img
                :src="uploadsUrl + job.logo"
                @error="onLogoError($event)"
                alt=" kozi Logo"
                class="custom-job-logo"
                width="250"
                />
                <div class="custom-job-content">
                  <h3>{{ job.job_title }}</h3>
                  <p v-html="truncateHTML(job.job_description, 200)"></p>
                  <div class="custom-job-meta">
                    <p><strong>Published:</strong> {{ formatDate(job.published_date) }}</p>
                    <p><strong>Deadline:</strong> {{ formatDate(job.deadline_date) }}</p>
                    <p><strong>Working Mode:</strong> {{ job.location || 'Not specified' }}</p>
                  </div>
                  <div class="custom-job-buttons">
                    <button @click="shareJob(job)" class="custom-btn-apply">Share Job</button>
                    <a :href="`/career/${job.job_id}`" class="custom-btn-apply" target="_blank">Read More</a>
                  </div>
                </div>
              </div>
            </div>

            <!-- Pagination -->
             <nav aria-label="Page navigation">
              <ul class="pagination justify-content-center">
                <li :class="['page-item', { disabled: currentPage === 1 }]">
                  <button class="page-link" @click="changePage(currentPage - 1)">Previous</button>
                </li>

    <li
      v-for="page in pagesToShow"
      :key="page"
      :class="['page-item', { active: currentPage === page }]"
    >
      <button class="page-link" @click="changePage(page)">{{ page }}</button>
    </li>

    <li :class="['page-item', { disabled: currentPage === totalPages }]">
      <button class="page-link" @click="changePage(currentPage + 1)">Next</button>
    </li>
  </ul>
</nav>

          </div>

          <!-- Right Side: Ads -->
          <div class="custom-col-right">
  <div v-if="paginatedAdverts.length > 0">
    <a
      v-for="adv in paginatedAdverts"
      :key="adv.id"
      :href="adv.link"
      target="_blank"
      rel="noopener noreferrer"
      class="custom-ad-link"
      style="display: block; margin-bottom: 16px;"
    >
      <div class="custom-ad-space" style="cursor: pointer;">
        <img :src="advert_url + adv.logo" alt="Ad Banner" class="custom-ad-img" />
        <div class="custom-ad-overlay">Visit Us</div>
        <div class="custom-ad-breakdown"></div>
      </div>
    </a>
  </div>
  <p v-else>No adverts found.</p>
</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { globalVariable } from "@/global";
import IndexComponent from "./IndexComponent.vue";

export default {
  components: {
    IndexComponent,
  },
  data() {
    return {
      jobs: [],
      adverts: [],
      message: null,
      messageType: null,
      uploadsUrl: globalVariable + '/uploads/logo/',
      advert_url: globalVariable + '/uploads/logo/',
      defaultImage: require("@/assets/img/logo.png"),
      backendUrl: process.env.VUE_APP_BACKEND_URL || 'http://localhost:5050',
      currentPage: 1,
      jobsPerPage: 4,
      advertsPerPage: 3,
    };
  },
  computed: {
    paginatedJobs() {
      const start = (this.currentPage - 1) * this.jobsPerPage;
      const end = start + this.jobsPerPage;
      return this.jobs.slice(start, end);
    },
    totalPages() {
      return Math.ceil(this.jobs.length / this.jobsPerPage);
    },
    pagesToShow() {
  const total = this.totalPages;
  const current = this.currentPage;
  const maxVisible = 5;
  const pages = [];

  let start = Math.max(1, current - Math.floor(maxVisible / 2));
  let end = start + maxVisible - 1;

  if (end > total) {
    end = total;
    start = Math.max(1, end - maxVisible + 1);
  }

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  return pages;
},



    paginatedAdverts() {
      const startIndex = (this.currentPage - 1) * this.advertsPerPage;
      const result = [];

      for (let i = 0; i < this.advertsPerPage; i++) {
        const index = (startIndex + i) % this.adverts.length;
        if (this.adverts.length > 0) {
          result.push(this.adverts[index]);
        }
      }

      return result;
    },
  },
  mounted() {
    this.fetchJobs();
    this.fetchAdverts();
  },
  methods: {
     onLogoError(event) {
    event.target.src = this.defaultImage;
  },
    changePage(page) {
      if (page >= 1 && page <= this.totalPages) {
        this.currentPage = page;
      }
    },
    async fetchJobs() {
      try {
        const token = localStorage.getItem("employeeToken");
        if (!token) {
          this.message = "Authentication required.";
          this.messageType = "alert-danger";
          return;
        }
        // Use new backend proxy endpoint that includes logos
        const response = await fetch(`${this.backendUrl}/api/jobs/list`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();
        if (!response.ok) {
          this.message = data.message || "Failed to fetch jobs.";
          this.messageType = "alert-danger";
        } else {
          this.jobs = data;
          console.log('Jobs loaded with logos:', this.jobs);
        }
      } catch (error) {
        console.error("Error fetching jobs:", error);
        this.message = "Error fetching jobs.";
        this.messageType = "alert-danger";
      }
    },
    async fetchAdverts() {
      try {
        const token = localStorage.getItem("employeeToken");
        if (!token) {
          this.message = "Authentication required.";
          this.messageType = "alert-danger";
          return;
        }
        const response = await fetch(`${globalVariable}/admin/select_advert`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();
        if (!response.ok) {
          this.message = data.message || "Failed to fetch adverts.";
          this.messageType = "alert-danger";
        } else {
          this.adverts = data;
        }
      } catch (error) {
        console.error("Error fetching adverts:", error);
        this.message = "Error fetching adverts.";
        this.messageType = "alert-danger";
      }
    },
    shareJob(job) {
      const jobUrl = `${window.location.origin}/career/${job.job_id}`;
      const shareData = {
        title: job.job_title,
        text: `Check out this job: ${job.job_title}`,
        url: jobUrl,
      };

      if (navigator.share) {
        navigator
          .share(shareData)
          .then(() => console.log("Job shared successfully"))
          .catch((error) => console.error("Error sharing job:", error));
      } else {
        navigator.clipboard.writeText(jobUrl).then(() => {
          alert("Job link copied to clipboard!");
        });
      }
    },
    formatDate(dateStr) {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    },
    truncateHTML(html, limit) {
      const div = document.createElement("div");
      div.innerHTML = html;
      const text = div.textContent || div.innerText || "";
      let truncated = text.slice(0, limit);
      if (text.length > limit) {
        truncated += "...";
      }
      return truncated;
    },
  },
};
</script>


<style scoped>
/* Existing styles remain unchanged */

.pagination-controls {
  margin-top: 20px;
  text-align: center;
}

.pagination-controls button {
  margin: 0 5px;
  padding: 8px 12px;
  border: 1px solid #ddd;
  background: #fff;
  color: #333;
  cursor: pointer;
  border-radius: 4px;
  transition: 0.3s ease;
}

.pagination-controls button:hover {
  background: #ea60a7;
  color: white;
}

.pagination-controls button.active {
  background: #ea60a7;
  color: white;
  font-weight: bold;
}

/* Keep all your previously defined styles unchanged */



.custom-ad-space:hover {
  transform: scale(1.02);
}

.custom-ad-img {
  width: 100%;
  border-radius: 8px 8px 0 0;
  display: block;
}

.custom-ad-overlay {
  position: absolute;
  top: 8px;
  left: 8px;
  background-color: rgba(255, 255, 255, 0.85);
  color: #000;
  padding: 4px 10px;
  border-radius: 4px;
  font-weight: bold;
  font-size: 0.85rem;
}

.custom-ad-breakdown {
  padding: 10px;
  font-size: 0.95rem;
  color: #333;
  background-color: #f9f9f9;
}

.page-wrapper {
  background: #f5f6fa;
 
}

.container-fluid {
  padding: 30px;
}

.job-header h1 {
  font-size: 28px;
  margin-bottom: 25px;
  color: #2c3e50;
  text-align: center;
}

.custom-main-container {
  display: flex;
  gap: 30px;
  flex-wrap: wrap;
}

.custom-col-left {
  flex: 1 1 70%;
  background: #fff;
  padding: 25px;
  border-radius: 10px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.custom-job-item {
  display: flex;
  gap: 20px;
  padding: 20px 0;
  border-bottom: 1px solid #e0e0e0;
}

.custom-job-item:last-child {
  border-bottom: none;
}

.custom-job-logo {
  width: 60px;
  height: 60px;
  object-fit: contain;
  border-radius: 8px;
 
}

/* Job Content */
.custom-job-content h3 {
  font-size: 20px;
  color: #2d3436;
  margin-bottom: 10px;
}

.custom-job-content p {
  font-size: 15px;
  color: #636e72;
  line-height: 1.6;
}

/* Meta Info */
.custom-job-meta {
  margin-top: 10px;
  font-size: 14px;
  color: #e17055;
}

.custom-job-meta p {
  margin: 2px 0;
}

/* Buttons */
.custom-job-buttons {
  margin-top: 10px;
}

.custom-btn-share,
.custom-btn-apply {
  background-color: #ea60a7;
  color: #fff;
  border: none;
  padding: 10px 16px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  margin-right: 10px;
  transition: all 0.3s ease;
}

.custom-btn-apply {
  text-decoration: none;
  display: inline-block;
}

.custom-btn-share:hover,
.custom-btn-apply:hover {
  background-color: #fff;
  color: #ea60a7;
  border: 1px solid #ea60a7;
}

.custom-btn-explore {
  margin-top: 25px;
  background-color: #ea60a7;
  color: white;
  font-size: 16px;
  padding: 14px 24px;
  border: none;
  border-radius: 6px;
  width: 100%;
  text-align: center;
  transition: all 0.3s ease;
}

.custom-btn-explore:hover {
  background: #fff;
  color: #ea60a7;
  border: 1px solid #ea60a7;
}

/* Right: Vertical Ads */
.custom-col-right {
  flex: 1 1 25%;
  display: flex;
  flex-direction: column;
  gap: 25px;
}

.custom-ad-space {
  width: 100%;
  height: 400px;
  position: relative;
  overflow: hidden;
  border-radius: 10px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border: 1px solid #ddd;
  transition: all 0.3s ease;
}

.custom-ad-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.custom-ad-space:hover {
  transform: scale(1.03);
  filter: brightness(1.1);
}

.custom-ad-overlay {
  position: absolute;
  top: -100%;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 15px;
  font-weight: bold;
  opacity: 0;
  transition: all 0.4s ease;
}

.custom-ad-space:hover .custom-ad-overlay {
  top: 0;
  opacity: 1;
}

/* Responsive */
@media screen and (max-width: 992px) {
  .custom-main-container {
    flex-direction: column;
  }

  .custom-col-left,
  .custom-col-right {
    flex: 1 1 100%;
  }

  .custom-ad-space {
    height: 250px;
  }
}

</style>