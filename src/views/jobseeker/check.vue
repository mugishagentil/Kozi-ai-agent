<template>
    <div>
      <h1>Job Listings</h1>
      <table v-if="jobs.length > 0">
        <thead>
          <tr>
            <th>Job ID</th>
            <th>Title</th>
            <th>company</th>
            <th>Description</th>
            <th>Salary</th>
            <th>Location</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="job in jobs" :key="job.id">
            <td>{{ job.job_id }}</td>
            <td>{{ job.job_title }}</td>
            <td>{{ job.company }}</td>
            <td>{{ job.job_description }}</td>
            <td>{{ job.job_salary }}</td>
            
          </tr>
        </tbody>
      </table>
      <p v-else>No jobs found.</p>
  
      <div v-if="message" :class="['alert', messageType]">{{ message }}</div>
    </div>
  </template>
  
  <script>
  import { globalVariable } from "@/global";
  
  export default {
    data() {
      return {
        jobs: [],
        message: null,
        messageType: null,
        backendUrl: process.env.VUE_APP_BACKEND_URL || 'http://localhost:5050',
      };
    },
    mounted() {
      this.fetchJobs();
    },
    methods: {
      async fetchJobs() {
        try {
          const token = localStorage.getItem("employeeToken");
          if (!token) {
            this.message = "Authentication required.";
            this.messageType = "alert-danger";
            return;
          }
  
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
          }
        } catch (error) {
          console.error("Error fetching jobs:", error);
          this.message = "Error fetching jobs.";
          this.messageType = "alert-danger";
        }
      },
    },
  };
  </script>
  
  <style scoped>
  table {
    width: 100%;
    border-collapse: collapse;
  }
  table th,
  table td {
    padding: 10px;
    border: 1px solid #ddd;
  }
  table th {
    background-color: #f9f9f9;
  }
  .alert {
    margin-top: 20px;
    padding: 15px;
    border-radius: 5px;
  }
  .alert-danger {
    background-color: #f8d7da;
    color: #721c24;
  }
  </style>
  