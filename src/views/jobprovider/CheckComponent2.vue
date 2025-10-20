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
    <div class="body-wrapper" style="margin-top: -3rem;">
      <div class="container-fluid">
        <div class="row">
          <div v-if="job">
            <div class="card p-4">
              <div class="row">
                <div class="col-md-4 text-center">
                  <img :src="uploadsUrl + job.image" @error="setDefaultImage" alt="Profile" class="img-thumbnail" style="width: 250px; height: 250px; object-fit: cover;" />
                </div>
                <div class="col-md-8">
                  <h3><strong>{{ job.first_name }} {{ job.last_name }}</strong></h3>
                  <h3>this is job provider_id<strong>{{ job.job_provider_id }} </strong></h3>

                  <div class="container">
                    <div class="row">
                      <div class="col-md-2 mt-2"><strong>Bio</strong></div>
                      <div class="col-md-10 mt-2">{{ job.bio }}</div>

                      <div class="col-md-2 mt-2"><strong>Salary</strong></div>
                      <div class="col-md-10 mt-2">{{ job.salary }}</div>

                      <div class="col-md-2 mt-2"><strong>Location</strong></div>
                      <div class="col-md-10 mt-2">{{ job.province }} - {{ job.district }}</div>
                      <div class="col-md-2 mt-2"><strong>Category_id</strong></div>
                      <div class="col-md-10 mt-2">{{ job.categories_id }}</div>
                      

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
            </div>

            <!-- Related Jobs -->
            <div class="container mt-4">
              <h4>Similar {{ categoryNames[job.categories_id] || 'Loading category...' }} category</h4>
              <div class="row">
                <div v-if="noRelatedJobsFound" class="col-12 text-center mt-4">
                  <p>No other {{ categoryNames[job.categories_id] || 'Loading category...' }} found in this category.</p>
                </div>

                <div v-else class="col-md-4 mb-4" v-for="job in jobs" :key="job.id">
                  <a :href="`${job.users_id}`">
                    <div class="card h-100 text-center p-3">
                      <img :src="uploadsUrl + job.image" @error="setDefaultImage" alt="Profile" class="card-img-top mx-auto" style="width: 250px; height: 250px; object-fit: cover;" />
                      <div class="card-body">
                        <h5 class="card-title"><b>{{ job.first_name }} {{ job.last_name }}</b></h5>
                        <p>{{ categoryNames[job.categories_id] || 'Loading category...' }}</p>
                        <p class="card-text"><span style="color: gold;">★</span><span>★</span><span>★</span></p>
                      </div>
                    </div>
                  </a>
                </div>
              </div>
            </div>

            <!-- Hire Modal -->
            <div v-if="showHireModal" class="modal fade show d-block" tabindex="-1" style="background: rgba(0,0,0,0.5);">
              <div class="modal-dialog">
                <div class="modal-content">
                  <div class="modal-header">
                    <h5 class="modal-title">Hire {{ job.first_name }} {{ job.last_name }}</h5>
                    <button type="button" class="btn-close" @click="closeHireModal"></button>
                  </div>
                  <div class="modal-body">
                    <div class="mb-3">
                      <label class="form-label">When do you need the worker?</label>
                      <select v-model="hireForm.when" class="form-select">
                        <option disabled value="">Select one</option>
                        <option>ASAP</option>
                        <option>After 3 days</option>
                        <option>Next week</option>
                        <option>Next month</option>
                      </select>
                    </div>

                    <div class="mb-3">
                      <label class="form-label">Working Mode</label>
                      <select v-model="hireForm.workingMode" class="form-select">
                        <option disabled value="">Select one</option>
                        <option value="fulltime">Full-time</option>
                        <option value="parttime">Part-time</option>
                      </select>
                    </div>

                    <div class="mb-3">
                      <label class="form-label">Accommodation Preference</label>
                      <select v-model="hireForm.accommodation" class="form-select">
                        <option disabled value="">Select one</option>
                        <option value="stayin">Stay-in</option>
                        <option value="stayout">Stay-out</option>
                      </select>
                    </div>

                    <div class="mb-3">
                      <label class="form-label">Job Description</label>
                      <textarea class="form-control" rows="3" v-model="hireForm.jobDescription" placeholder="Brief job description..."></textarea>
                    </div>
                  </div>
                  <div class="modal-footer">
                    <button class="btn btn-secondary" @click="closeHireModal">Cancel</button>
                    <button class="btn btn-primary" @click="submitHire">Submit</button>
                  </div>
                </div>
              </div>
            </div>
            <!-- End of Modal -->
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
  components: {
    IndexComponent,

  },
  data() {
    return {
      job: null,
      jobs: [],
      categoryNames: {},
      uploadsUrl: `${globalVariable}/uploads/profile/`,
      noRelatedJobsFound: false,
      showHireModal: false,
      hireForm: {
        when: "",
        workingMode: "",
        accommodation: "",
        jobDescription: "",
      },
    };
  },
  methods: {
    async fetchJobSeeker() {
      const token = localStorage.getItem("employerToken");
      const userId = this.$route.params.users_id;

      try {
        const response = await fetch(`${globalVariable}/provider/job_seeker/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();

        if (response.ok) {
          this.job = data;
          if (data.categories_id) {
            this.fetchCategoryName(data.categories_id);
            this.fetchUsersByCategory(data.categories_id);
          }
        } else {
          console.error("Failed to fetch details");
        }
      } catch (error) {
        console.error("Error fetching job seeker:", error);
      }
    },

    async fetchUsersByCategory(categoryId) {
      try {
        const token = localStorage.getItem("employerToken");
        const response = await fetch(`${globalVariable}/select_user_based_on_category/${categoryId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await response.json();
        if (!response.ok) return;

        this.jobs = data.filter(job => job.users_id !== this.job.users_id);
        this.noRelatedJobsFound = this.jobs.length === 0;

        const uniqueCategoryIds = [...new Set(this.jobs.map(job => job.categories_id))];
        for (const id of uniqueCategoryIds) {
          if (id && !this.categoryNames[id]) this.fetchCategoryName(id);
        }
      } catch (error) {
        console.error("Error fetching related jobs:", error);
        this.noRelatedJobsFound = true;
      }
    },

async fetchCategoryName(categoryId) {
  if (this.categoryNames[categoryId]) return;
  try {
    const response = await fetch(`${globalVariable}/category_name/${categoryId}`);
    const data = await response.json();
    if (response.ok && Array.isArray(data) && data.length > 0) {
      this.categoryNames[categoryId] = data[0].name;
    } else {
      this.categoryNames[categoryId] = "Unknown";
    }
  } catch (error) {
    console.error(`Error fetching category name for ID ${categoryId}:`, error);
    this.categoryNames[categoryId] = "Unknown";
  }
},


    setDefaultImage(event) {
      event.target.src = require("@/assets/img/sample.png");
    },

    closeHireModal() {
      this.showHireModal = false;
      this.hireForm = {
        when: "",
        workingMode: "",
        accommodation: "",
        jobDescription: "",
      };
    },

    async submitHire() {
      const token = localStorage.getItem("employerToken");
      const userData = localStorage.getItem("userData");

      let jobProvider;
      try {
        jobProvider = JSON.parse(userData);
      } catch (e) {
        alert("Please log in again.");
        return;
      }

      const payload = {
        job_seeker_id: this.job.users_id,
        job_provider_id: jobProvider.id,
        provider_first_name: jobProvider.first_name,
        provider_last_name: jobProvider.last_name,
        seeker_first_name: this.job.first_name,
        seeker_last_name: this.job.last_name,
        when_need_worker: this.hireForm.when,
        working_mode: this.hireForm.workingMode,
        accommodation_preference: this.hireForm.accommodation,
        job_description: this.hireForm.jobDescription,
      };

      try {
        const response = await fetch(`${globalVariable}/provider/hire`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        const data = await response.json();
        if (response.ok) {
          alert("Hire request submitted successfully!");
          this.closeHireModal();
        } else {
          alert(`Error: ${data.message || "Failed to hire."}`);
        }
      } catch (error) {
        console.error("Error submitting hire request:", error);
        alert("Something went wrong.");
      }
    },
  },
  mounted() {
    this.fetchJobSeeker();
  },
};
</script>

<style scoped>
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
</style>