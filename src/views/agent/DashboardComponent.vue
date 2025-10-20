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
      <div class="container-fluid">
        <div class="row">
          <!-- My Seekers Card -->
          <div class="col-xl-6 col-md-6 mb-4">
            <div class="card border-left-primary py-3 shadow-lg">
              <div class="card-body">
                <div class="row no-gutters align-items-center">
                  <div class="col mr-2">
                    <div class="text-xs font-weight-bold text-primary text-uppercase mb-1">
                      My seekers
                    </div>
                    <div class="h5 mb-0 font-weight-bold text-gray-800">
                      {{ jobs.length}}
                    </div>
                  </div>
                  <div class="col-auto">
                    <i class="ti ti-notebook fa-2x" style="color:#FFE338;"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- All Seekers Card -->
          <div class="col-xl-6 col-md-6 mb-4">
            <div class="card border-right-success py-3" style="box-shadow: rgba(0, 0, 0, 0.2) 0px 5px 15px;">
              <div class="card-body">
                <div class="row no-gutters align-items-center">
                  <div class="col mr-2">
                    <div class="text-xs font-weight-bold text-success text-uppercase mb-1">
                      All job Seekers
                    </div>
                    <div class="h5 mb-0 font-weight-bold text-gray-800">
                      {{ blogsCount }}
                    </div>
                  </div>
                  <div class="col-auto">
                    <i class="ti ti-archive fa-2x" style="color:#FFE338;"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Benefits Section -->
        <div class="row">
          <h3 style="text-align:center;color:#5F9EA0; font-family:'Michroma', sans-serif;">
            Benefits of Kozi Caretakers
          </h3>
          <hr style="margin: 20px auto;border: 0;height: 1px;width: 60%;background: #EA60A7;">

          <div class="col-md-6 other-div3">
            <h3 style="color:#5F9EA0; margin-left: 60px;">Benefits of Kozi Caretakers</h3>
            <hr style="margin: 20px auto;border: 0;height: 1px;width: 60%;background: #EA60A7;">
            <br />
            Wide Range of Opportunities: Discover diverse job listings tailored to your skills, spanning from housekeeping to specialized services.<br><br>
            Continuous Skill Enhancement: Engage in our comprehensive training programs and workshops to sharpen your professional skills.<br><br>
            Community Support: Connect with a supportive community of fellow job seekers to share experiences and gain valuable advice.<br><br>
            Exclusive Access: Gain access to exclusive job listings available only to Kozi Caretaker members, enhancing your employment opportunities.<br><br>
            Thank you for choosing Kozi Caretakers. Together, we're transforming homes and empowering lives.
          </div>

          <div class="col-md-6 other-div3">
            <h3 style="color:#5F9EA0; margin-left: 60px;">Benefits of registering seeker</h3>
            <hr style="margin: 20px auto;border: 0;height: 1px;width: 60%;background: #EA60A7;">
            <br />
            <strong>Flexibility:</strong> Agents can work at their own pace and choose their working hours, providing flexibility that can be appealing to a wide range of individuals, including students, part-time workers, and stay-at-home parents.<br><br>
            <strong>Skill Development:</strong> Agents gain experience in communication, sales, and marketing, which can enhance their professional skills and future career prospects.<br><br>
            <strong>Networking Opportunities:</strong> Agents can expand their professional network by interacting with job seekers and potential employers.<br><br>
            <strong>Recognition and Rewards:</strong> Top-performing agents can be recognized and rewarded with additional bonuses, certificates, or public acknowledgment, boosting their morale and motivation.
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { globalVariable } from "@/global";
import IndexComponent from "./IndexComponent.vue";
import axios from "axios";

export default {
  name: "WelcomeComponent",
  components: {
    IndexComponent,
  },
  data() {
    return {
      productsCount: 0,
      blogsCount: 0,
      jobs: [],
      userEmail: "",
    };
  },
  mounted() {
    this.userEmail = localStorage.getItem("userEmail") || "";

    axios
      .get(`${globalVariable}/providers/count`)
      .then((response) => {
        if (response.data.count !== undefined) {
          this.productsCount = response.data.count;
        } else {
          console.error("Error fetching product count:", response.data.error || "Unknown error");
        }
      })
      .catch((error) => {
        console.error("Error fetching product count:", error);
      });

    axios
      .get(`${globalVariable}/seekers/count`)
      .then((response) => {
        if (response.data.count !== undefined) {
          this.blogsCount = response.data.count;
        } else {
          console.error("Error fetching blogs count:", response.data.error || "Unknown error");
        }
      })
      .catch((error) => {
        console.error("Error fetching blogs count:", error);
      });

    this.fetchJobsByUser();
  },
  methods: {
    async fetchJobsByUser() {
      try {
        const token = localStorage.getItem("agentToken");
        if (!this.userEmail) return;
        const res = await fetch(`${globalVariable}/admin/registered-seekers/${this.userEmail}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) {
          this.jobs = data;
        } else {
          console.error("Failed to fetch jobs:", data.message);
        }
      } catch (err) {
        console.error("Error fetching jobs for user:", err);
      }
    },
  },
};
</script>


  
  <style scoped>
  .card {
    border-left: 5px solid #E960A6; 
  }

  .shadow-lg {
    box-shadow: rgba(0, 0, 0, 0.2) 0px 5px 15px;
  }

  .other-div3 {
  margin-bottom: 30px;
}

@media (min-width: 768px) {
            .other-div1, .other-div2 {
                flex: 1 1 calc(50% - 10px);
            }
        }
        .other-div3 {
            width: 48%;
            background-color: #fff;
            box-shadow: 0px 0px 10px 0px rgba(0, 0, 0, 0.5);
            border-radius: 10px;
            margin-bottom: 1rem;
            padding: 1rem;
            box-sizing: border-box;
        }
        @media (max-width: 768px) {
            .other-div3 {
                width: 100%;
            }
        }
  </style>

