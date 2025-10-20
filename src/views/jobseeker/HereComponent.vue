<template>
    <div
      class="page-wrapper"
      id="main-wrapper"
      data-layout="vertical"
      data-navbarbg="skin6"
      data-sidebartype="full"
      data-sidebar-position="fixed"
      data-header-position="fixed"
    >
      <SidebarComponent />
      <div class="body-wrapper">
        <HeaderComponent />
        <div class="container-fluid">
          <div class="row">
            <div class="col-xl-4 col-md-6 mb-4">
              <div class="card border-left-primary py-3 shadow-lg">
                <div class="card-body">
                  <div class="row no-gutters align-items-center">
                    <div class="col mr-2">
                      <div class="text-xs font-weight-bold text-primary text-uppercase mb-1">
                        All Job providers
                      </div>
                      <div class="h5 mb-0 font-weight-bold text-gray-800">
                        {{ productsCount }}
                      </div>
                    </div>
                    <div class="col-auto">
                      <i class="ti ti-notebook fa-2x" style="color:#FFE338;"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="col-xl-4 col-md-6 mb-4">
              <div
                class="card border-right-success py-3"
                style="box-shadow: rgba(0, 0, 0, 0.2) 0px 5px 15px;"
              >
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
  
            <!-- Team Card -->
            <div class="col-xl-4 col-md-6 mb-4">
              <div class="card border-left-success py-3">
                <div class="card-body">
                  <div class="row no-gutters align-items-center">
                    <div class="col mr-2">
                      <div class="text-xs font-weight-bold text-primary text-uppercase mb-1">
                        All jobs
                      </div>
                      <div class="h5 mb-0 font-weight-bold text-gray-800">
                        {{ teamCount }}
                      </div>
                    </div>
                    <div class="col-auto">
                      <i class="ti ti-users fa-2x" style="color:#FFE338;"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
  
          <!-- Display logged-in user's email -->
          <div class="row mt-4">
            
            <div class="row">
              <!-- Benefits Section -->
              <h3 style="text-align:center;color:#5F9EA0; font-family:'Michroma', sans-serif;">
                Payment Status & Benefits of Kozi Caretakers
              </h3>
  
              <hr style="margin: 20px auto;border: 0;height: 1px;width: 60%;background: #EA60A7;">
  
              <div class="col-md-6 other-div3">
              
                <img :src="require('@/assets/img/registration3.jpg')" width="100%" height="500px" class=""/>
              </div>
  
              <!-- Progress Section -->
              <div class="col-md-6 other-div3">
                <h2 style="color:#5F9EA0; margin-left: 100PX;">How It Works</h2>
                  <hr style="margin: 20px auto;border: 0;height: 1px;width: 60%;background: #EA60A7;">
                  <p style="text-align:center; font-weight:bold; color:#EA60A7;">
                    N.B:A one-time payment grants access to exclusive premium features for only  advanced workers!
                  </p>
                <br />
                <strong> Step 1:</strong>
                Dial the MoMo Pay code *182*8*1*067788#.<br><br>
                <strong> Step 2:</strong> Enter the amount: 1,500 RWF.<br><br>
                <strong>Step 3:</strong> Confirm the name: SANSON GROUP Ltd.<br><br>
                <strong>Step 4:</strong> Enter your MoMo PIN.<br><br>
                <strong>Step 4:</strong> Wait up to 5 minutes for approval.<br><br>
                <span style="font-size: 14px;">Track your progress and take the next step in your career journey with us!</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script>
  import { globalVariable } from "@/global";
  import HeaderComponent from "./HeaderComponent.vue";
  import SidebarComponent from "./SidebarComponent.vue";
  import axios from "axios";
  
  export default {
    name: "WelcomeComponent",
    components: {
      SidebarComponent,
      HeaderComponent,
    },
    setup() {
      return { globalVariable };
    },
    data() {
      return {
        productsCount: 0, 
        blogsCount: 0,    
        teamCount: 0,     
        userEmail: "",   
      };
    },
    mounted() {
  
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
  
      axios
        .get(`${globalVariable}/jobs/count`)
        .then((response) => {
          if (response.data.count !== undefined) {
            this.teamCount = response.data.count;
          } else {
            console.error("Error fetching team count:", response.data.error || "Unknown error");
          }
        })
        .catch((error) => {
          console.error("Error fetching blogs count:", error);
        });
  
      // Get the logged-in user's email from localStorage
      this.userEmail = localStorage.getItem("userEmail") || "No email found";                    
    },
  };
  </script>
  
    
    <style scoped>
    .card {
      border-left: 5px solid #E960A6; /* Primary border color */
    }
  
    .shadow-lg {
      box-shadow: rgba(0, 0, 0, 0.2) 0px 5px 15px;
    }
    </style>
    