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
          <div v-if="job">
            <div class="card p-4">
              <div class="row">
                <div class="col-md-4 text-center">
                  <img
                    :src="uploadsUrl + job.image"
                    @error="setDefaultImage"
                    alt="Profile"
                    class="card-img-top mx-auto"
                    style="width: 250px; height: 250px; object-fit: cover;"
                  />
                </div>
                <div class="col-md-8">
                  <h3><strong>{{ job.first_name }} {{ job.last_name }}</strong>  
                    <img style="margin-left: 5px;"
                        v-if="job.verification_badge === 1"
                        :src="profileImage"
                        width="25"
                        height="25"
                        class="rounded-circle"
                        alt="verification badge"
                      /> 
                  </h3>
                  
                  <!-- Remove nested container to fix horizontal scroll -->
                  <div class="row">
                    <div class="col-md-2 mt-2"><strong>Bio</strong></div>
                    <div class="col-md-10 mt-2">{{ job.bio }}</div>

                    <div class="col-md-2 mt-2"><strong>Salary</strong></div>
                    <div class="col-md-10 mt-2">{{ job.salary }}</div>

                    <div class="col-md-2 mt-2"><strong>Address</strong></div>
                    <div class="col-md-10 mt-2">{{ job.province }} - {{ job.district }}</div>

                    <div class="col-md-2 mt-2"><strong>Category</strong></div>
                    <div class="col-md-10 mt-2">{{ categoryNames[job.categories_id] || 'Loading category...' }}</div>

                    <div class="col-md-2 mt-2"></div>
                    <div class="col-md-10 mt-2">
                      <button class="btn btn-primary mt-3" @click="showHireModal = true">Hire</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Quick Support Button -->
            <button class="btn btn-primary mt-3" @click="showSupportModal = true">Quick support</button>

            <!-- Related Jobs -->
            <div class="container mt-4">
              <h4>Similar {{ categoryNames[job.categories_id] || 'Loading category...' }} category</h4>
              <div class="row">
                <div v-if="noRelatedJobsFound" class="col-12 text-center mt-4">
                  <p class="alert alert-danger">No other {{ categoryNames[job.categories_id] || 'Loading category...' }} found in this category.</p>
                </div>
                
                <div v-else class="col-md-4 mb-4" v-for="relatedJob in paginatedJobs" :key="relatedJob.id">
                  <a :href="`/employer/seekers/${relatedJob.users_id}`">
                    <div class="card h-100 text-center p-3">
                      <img
                        :src="uploadsUrl + relatedJob.image"
                        @error="setDefaultImage"
                        alt="Profile"
                        class="card-img-top mx-auto"
                        style="width: 250px; height: 250px; object-fit: cover;"
                      />
                      <div class="card-body">
                        <h5 class="card-title"><b>{{ relatedJob.first_name }} {{ relatedJob.last_name }}
                          <img style="margin-left: 5px;"
                        v-if="relatedJob.verification_badge === 1"
                        :src="profileImage"
                        width="25"
                        height="25"
                        class="rounded-circle"
                        alt="verification badge"
                      /> 
                      
                        </b></h5>
                        <p>{{ categoryNames[relatedJob.categories_id] || 'Loading category...' }}</p>
                        <p class="card-text">
                    <!-- Stars for verified users (5 gold stars) -->
                    <template v-if="relatedJob.verification_badge === 1">
                      <i class="fa-solid fa-star" style="color: gold;"></i>
                      <i class="fa-solid fa-star" style="color: gold;"></i>
                      <i class="fa-solid fa-star" style="color: gold;"></i>
                      <i class="fa-solid fa-star" style="color: gold;"></i>
                      <i class="fa-solid fa-star" style="color: gold;"></i>
                    </template>
                    <!-- Stars for non-verified users (2 gold, 3 normal) -->
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
            </div>

            <div class="d-flex justify-content-center mt-4" v-if="totalPages > 1">
              <ul class="pagination">
                <li class="page-item" :class="{ disabled: currentPage === 1 }">
                  <a class="page-link" href="#" @click.prevent="changePage(currentPage - 1)">Previous</a>
                </li>
                <li
                v-for="page in visiblePages"
                :key="page"
                class="page-item"
                :class="{ active: currentPage === page }"
                >
                <a class="page-link" href="#" @click.prevent="changePage(page)">
                  {{ page }}
                </a>
              </li>
              <li class="page-item" :class="{ disabled: currentPage === totalPages }">
                <a class="page-link" href="#" @click.prevent="changePage(currentPage + 1)">Next</a>
              </li>
            </ul>
          </div>

            <!-- Hire Modal -->
            <div v-if="showHireModal" class="modal fade show d-block" tabindex="-1" style="background: rgba(0,0,0,0.5); justify-content: center;">
              <div class="modal-dialog">
                <div class="modal-content">
                  <div class="modal-header">
                    <h5 class="modal-title">Hire {{ job.first_name }} {{ job.last_name }}</h5>
                    <button type="button" class="btn-close" @click="closeHireModal"><i class="fa-solid fa-x"></i></button>
                  </div>
                  <div v-if="message" class="mt-3">
                    <div :class="['alert', messageType]" role="alert">
                      {{ message }}
                    </div>
                  </div>
                  <div class="modal-body">
                    <div class="mb-3">
                      <label class="form-label">When do you need the worker? <span class="text-danger">*</span></label>
                      <select v-model="hireForm.when" class="form-control" required>
                        <option disabled value="">Select one</option>
                        <option>ASAP</option>
                        <option>After 3 days</option>
                        <option>Next week</option>
                        <option>Next month</option>
                      </select>
                    </div>
                    <div class="mb-3">
                      <label class="form-label">Working Mode <span class="text-danger">*</span></label>
                      <select v-model="hireForm.workingMode" class="form-control" required>
                        <option disabled value="">Select one</option>
                        <option value="full-time">Full-time</option>
                        <option value="part-time">Part-time</option>
                      </select>
                    </div>
                    <div class="mb-3">
                      <label class="form-label">Accommodation Preference <span class="text-danger">*</span></label>
                      <select v-model="hireForm.accommodation" class="form-control" required>
                        <option disabled value="">Select one</option>
                        <option value="stay-in">Stay-in</option>
                        <option value="stay-out">Stay-out</option>
                      </select>
                    </div>
                    <div class="mb-3">
                      <label class="form-label">Job Description <span class="text-danger">*</span></label>
                      <textarea class="form-control" rows="3" v-model="hireForm.jobDescription" placeholder="Brief job description..." required  style="height: 100px;"></textarea>
                    </div>
                  </div>
                  <div class="modal-footer">
                    <button class="btn btn-primary" @click="closeHireModal">Cancel</button>
                    <button class="btn btn-primary"   @click="submitHire" :disabled="!canSubmitHire || loading">
                      <span v-if="loading" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      {{ loading ? 'Submitting...' : 'Submit' }}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Quick Support Modal -->
            <div v-if="showSupportModal" class="modal fade show d-block" tabindex="-1" style="background: rgba(0,0,0,0.5);">
              <div class="modal-dialog">
                <div class="modal-content" style="margin-top: 10rem;">
                  <div class="modal-header">
                    <h5 class="modal-title">Support Inquiry About {{ job.first_name }} {{ job.last_name }}</h5>
                    <button type="button" class="btn-close" @click="closeSupportModal"><i class="fa-solid fa-x"></i></button>
                  </div>
                  <div v-if="supportResponse.message" class="m-3">
                    <div :class="['alert', supportResponse.type]" role="alert">
                      {{ supportResponse.message }}
                    </div>
                  </div>
                  <div class="modal-body">
                    <div class="mb-3">
                      <label class="form-label">Your Message <span class="text-danger">*</span></label>
                      <textarea
                      class="form-control"
                      v-model="supportMessage"
                      placeholder="Write your inquiry about this job seeker..."
                      style="height: 100px;"
                      ></textarea>

                    </div>
                  </div>
                  <div class="modal-footer">
                    <button class="btn btn-primary" @click="closeSupportModal">Cancel</button>
                    <button class="btn btn-primary" :disabled="!supportMessage" @click="submitQuickSupport">
                      Send Message
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <!-- End Modals -->
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
  name: "DetailsComponent",
  components: { IndexComponent },
  data() {
    return {
      job: null,
      jobs: [],
      categoryNames: {},
      uploadsUrl: `${globalVariable}/uploads/profile/`,
       profileImage: require("@/assets/img/badge.png"),
      noRelatedJobsFound: false,
      message: "",
      messageType: "",
      userEmail: "",
      userId: null,
      loading: false,

      jobsPerPage: 9,
      currentPage: 1,

      // Hire
      showHireModal: false,
      hireForm: {
        when: "",
        workingMode: "",
        accommodation: "",
        jobDescription: ""
      },

      // Support
      showSupportModal: false,
      supportMessage: "",
      supportResponse: {
        message: "",
        type: ""
      },

      providerDetails: {
        job_provider_id: null,
        provider_first_name: "",
        provider_last_name: ""
      }
    };
  },
  computed: {
    visiblePages() {
  const total = this.totalPages;
  const current = this.currentPage;
  const range = 3;

  let start = Math.max(current - Math.floor(range / 2), 1);
  let end = start + range - 1;

  if (end > total) {
    end = total;
    start = Math.max(end - range + 1, 1);
  }

  const pages = [];
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }
  return pages;
},

  canSubmitHire() {
    return (
      this.hireForm.when &&
      this.hireForm.workingMode &&
      this.hireForm.accommodation &&
      this.hireForm.jobDescription
    );
  },
  paginatedJobs() {
    const start = (this.currentPage - 1) * this.jobsPerPage;
    return this.jobs.slice(start, start + this.jobsPerPage);
  },
  totalPages() {
    return Math.ceil(this.jobs.length / this.jobsPerPage);
  }
},

  methods: {

    changePage(page) {
  if (page >= 1 && page <= this.totalPages) {
    this.currentPage = page;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
},

    async getUserIdFromEmail() {
      const token = localStorage.getItem("employerToken");
      if (!token) return;
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        this.userEmail = payload.email;
        const res = await fetch(`${globalVariable}/get_user_id_by_email/${this.userEmail}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
          this.userId = data.users_id;
          this.fetchProviderDetails();
        }
      } catch (err) {
        console.error("Error getting user ID:", err);
      }
    },

    async fetchProviderDetails() {
      const token = localStorage.getItem("employerToken");
      try {
        const res = await fetch(`${globalVariable}/provider/job_provider_id/${this.userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        this.providerDetails = Array.isArray(data) ? data[0] : data;
      } catch (error) {
        console.error("Error fetching provider:", error);
      }
    },

    async fetchJobSeeker() {
      const token = localStorage.getItem("employerToken");
      const userId = this.$route.params.users_id;
      try {
        const res = await fetch(`${globalVariable}/provider/job_seeker/${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        this.job = data;
        const categoryId = Number(data.categories_id);
        if (categoryId) {
          this.fetchCategoryName(categoryId);
          this.fetchUsersByCategory(categoryId);
        }
      } catch (error) {
        console.error("Error fetching job seeker:", error);
      }
    },

    async fetchCategoryName(categoryId) {
      if (this.categoryNames[categoryId]) return;
      try {
        const res = await fetch(`${globalVariable}/category_name/${categoryId}`);
        const data = await res.json();
        this.categoryNames[categoryId] = data[0]?.name || "Unknown";
      } catch {
        this.categoryNames[categoryId] = "Unknown";
      }
    },

    async fetchUsersByCategory(categoryId) {
      const token = localStorage.getItem("employerToken");
      try {
        const res = await fetch(`${globalVariable}/select_user_based_on_category/${categoryId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        this.jobs = data.filter(job => job.users_id !== this.job.users_id);
        this.noRelatedJobsFound = this.jobs.length === 0;

        const uniqueIds = [...new Set(this.jobs.map(j => j.categories_id))];
        for (const id of uniqueIds) {
          if (id && !this.categoryNames[id]) this.fetchCategoryName(id);
        }
      } catch (e) {
        console.error("Error fetching related jobs:", e);
      }
    },

    setDefaultImage(event) {
      event.target.src = require("@/assets/img/sample.png");
    },

    closeHireModal() {
      this.showHireModal = false;
      this.hireForm = { when: "", workingMode: "", accommodation: "", jobDescription: "" };
    },

    async submitHire() {
      if (!this.canSubmitHire) return;
      this.loading = true;
      const token = localStorage.getItem("employerToken");
      const payload = {
        job_seeker_id: this.job?.job_seeker_id,
        job_provider_id: this.providerDetails?.job_provider_id,
        provider_first_name: this.providerDetails?.provider_first_name,
        provider_last_name: this.providerDetails?.provider_last_name,
        seeker_first_name: this.job?.first_name,
        seeker_last_name: this.job?.last_name,
        when_need_worker: this.hireForm?.when,
        working_mode: this.hireForm?.workingMode,
        accommodation_preference: this.hireForm?.accommodation,
        job_description: this.hireForm?.jobDescription
      };

      try {
        const res = await fetch(`${globalVariable}/provider/hire`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        this.message = res.ok ? "Hire request submitted successfully!" : data.message || "Error occurred.";
        this.messageType = res.ok ? "alert-success" : "alert-danger";
      } catch (e) {
        this.message = "Network error.";
        this.messageType = "alert-danger";
      } finally {
        this.loading = false;
      }
    },

    closeSupportModal() {
      this.showSupportModal = false;
      this.supportMessage = "";
      this.supportResponse = { message: "", type: "" };
    },

    async submitQuickSupport() {
      const token = localStorage.getItem("employerToken");
      const payload = {
        job_seeker_id: this.job?.job_seeker_id,
        job_provider_id: this.providerDetails?.job_provider_id,
        provider_first_name: this.providerDetails?.provider_first_name,
        provider_last_name: this.providerDetails?.provider_last_name,
        seeker_first_name: this.job?.first_name,
        seeker_last_name: this.job?.last_name,
        message: this.supportMessage
      };

      try {
        const res = await fetch(`${globalVariable}/provider/quicksupport`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        this.supportResponse = {
          message: res.ok ? "Message sent successfully." : data.message || "Error sending message.",
          type: res.ok ? "alert-success" : "alert-danger"
        };
        if (res.ok) this.supportMessage = "";
      } catch {
        this.supportResponse = { message: "Network error occurred.", type: "alert-danger" };
      }
    }
  },

  mounted() {
    this.getUserIdFromEmail();
    this.fetchJobSeeker();
  },

  watch: {
    "$route.params.users_id"() {
      this.fetchJobSeeker();
    }
  }
};
</script>



<style scoped>

/* Prevent horizontal scroll */
.page-wrapper,
.body-wrapper,
.container-fluid,
.card {
  max-width: 100%;
  overflow-x: hidden;
}

.pagination .page-item .page-link {
  color: #E960A6;
  border: 1px solid #dee2e6;
  margin: 0 2px;
}
.pagination .page-item.active .page-link {
  background-color: #E960A6;
  border-color: #E960A6;
  color: white;
}
.pagination .page-item.disabled .page-link {
  color: #ccc;
  pointer-events: none;
  background-color: #f9f9f9;
}

.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0,0,0,0.5);
  z-index: 1050;
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal-dialog {
  background: white;
  border-radius: 8px;
  width: 100%;
  max-width: 700px;
}
.btn-close {
  background: none;
  border: none;
  font-size: 1.2rem;
}

.card {
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}
.btn-primary {
  background-color: #E960A6;
  color: white;
}
.btn-primary:hover {
  background-color: #E960A6;
  color: teal;
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

.spinner-border {
  transition: opacity 0.2s ease;
}

/* Responsive fixes for mobile */
@media (max-width: 768px) {
  .col-md-2 {
    flex: 0 0 100%;
    max-width: 100%;
    margin-bottom: 0.5rem;
    font-weight: bold;
  }
  
  .col-md-10 {
    flex: 0 0 100%;
    max-width: 100%;
    margin-bottom: 1rem;
  }
  
  .col-md-4,
  .col-md-8 {
    flex: 0 0 100%;
    max-width: 100%;
    padding: 0 15px;
  }
  
  .card {
    margin: 0;
    border-radius: 0;
  }
  
  .body-wrapper {
    margin-left: 0 !important;
    padding: 10px !important;
  }
  
  .row {
    margin-left: 0;
    margin-right: 0;
  }
}
</style>