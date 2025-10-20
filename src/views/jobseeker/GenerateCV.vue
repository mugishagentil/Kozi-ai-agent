<template>
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
  <div class="cv-builder" style="margin-top: 70px; margin-left: 270px; background: white; min-height: calc(100vh - 70px); padding: 20px; overflow-y: auto; max-height: calc(100vh - 70px);">
    <h5 class="card-title fw-semibold mb-4" style="color: #E960A6;">
      <i class="ti ti-file-text"></i> Generate CV
    </h5>
    
    <div v-if="message" :class="['alert', messageType]">{{ message }}</div>

    <!-- Summary Section -->
    <div class="card mb-4">
      <div class="card-header">
        <h6><i class="ti ti-user"></i> Professional Summary</h6>
      </div>
      <div class="card-body">
        <textarea 
          v-model="cvData.summary" 
          class="form-control" 
          placeholder="Write your professional summary..."
          rows="4"
        ></textarea>
        <button @click="saveSummary" class="btn btn-primary btn-sm mt-2">Save Summary</button>
      </div>
    </div>

    <!-- Education Section -->
    <div class="card mb-4">
      <div class="card-header d-flex justify-content-between">
        <h6><i class="ti ti-school"></i> Education</h6>
        <button @click="showEducationForm = !showEducationForm" class="btn btn-outline-primary btn-sm">
          Add Education
        </button>
      </div>
      <div class="card-body">
        <!-- Add Education Form -->
        <div v-if="showEducationForm" class="border p-3 mb-3 rounded">
          <div class="row">
            <div class="col-md-6">
              <input v-model="newEducation.institution" class="form-control mb-2" placeholder="Institution">
            </div>
            <div class="col-md-6">
              <input v-model="newEducation.degree" class="form-control mb-2" placeholder="Degree">
            </div>
            <div class="col-md-6">
              <input v-model="newEducation.field_of_study" class="form-control mb-2" placeholder="Field of Study">
            </div>
            <div class="col-md-3">
              <input v-model="newEducation.start_year" class="form-control mb-2" placeholder="Start Year" type="number">
            </div>
            <div class="col-md-3">
              <input v-model="newEducation.end_year" class="form-control mb-2" placeholder="End Year" type="number">
            </div>
          </div>
          <button @click="addEducation" class="btn btn-success btn-sm me-2">Save</button>
          <button @click="cancelEducation" class="btn btn-secondary btn-sm">Cancel</button>
        </div>

        <!-- Education List -->
        <div v-for="edu in education" :key="edu.id" class="border p-2 mb-2 rounded">
          <div class="d-flex justify-content-between">
            <div>
              <strong>{{ edu.degree }} in {{ edu.field_of_study }}</strong><br>
              <small>{{ edu.institution }} ({{ edu.start_year }}-{{ edu.end_year }})</small>
            </div>
            <button @click="deleteEducation(edu.id)" class="btn btn-danger btn-sm">Delete</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Experience Section -->
    <div class="card mb-4">
      <div class="card-header d-flex justify-content-between">
        <h6><i class="ti ti-briefcase"></i> Experience</h6>
        <button @click="showExperienceForm = !showExperienceForm" class="btn btn-outline-primary btn-sm">
          Add Experience
        </button>
      </div>
      <div class="card-body">
        <!-- Add Experience Form -->
        <div v-if="showExperienceForm" class="border p-3 mb-3 rounded">
          <div class="row">
            <div class="col-md-6">
              <input v-model="newExperience.company" class="form-control mb-2" placeholder="Company">
            </div>
            <div class="col-md-6">
              <input v-model="newExperience.position" class="form-control mb-2" placeholder="Position">
            </div>
            <div class="col-md-6">
              <input v-model="newExperience.start_date" class="form-control mb-2" type="date">
            </div>
            <div class="col-md-6">
              <input v-model="newExperience.end_date" class="form-control mb-2" type="date">
            </div>
            <div class="col-md-12">
              <textarea v-model="newExperience.description" class="form-control mb-2" placeholder="Job description..." rows="3"></textarea>
            </div>
          </div>
          <button @click="addExperience" class="btn btn-success btn-sm me-2">Save</button>
          <button @click="cancelExperience" class="btn btn-secondary btn-sm">Cancel</button>
        </div>

        <!-- Experience List -->
        <div v-for="exp in experience" :key="exp.id" class="border p-2 mb-2 rounded">
          <div class="d-flex justify-content-between">
            <div>
              <strong>{{ exp.position }}</strong> at {{ exp.company }}<br>
              <small>{{ formatDate(exp.start_date) }} - {{ formatDate(exp.end_date) }}</small><br>
              <p class="mt-2 mb-0">{{ exp.description }}</p>
            </div>
            <button @click="deleteExperience(exp.id)" class="btn btn-danger btn-sm">Delete</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Projects Section -->
    <div class="card mb-4">
      <div class="card-header d-flex justify-content-between">
        <h6><i class="ti ti-code"></i> Projects</h6>
        <button @click="showProjectForm = !showProjectForm" class="btn btn-outline-primary btn-sm">
          Add Project
        </button>
      </div>
      <div class="card-body">
        <!-- Add Project Form -->
        <div v-if="showProjectForm" class="border p-3 mb-3 rounded">
          <div class="row">
            <div class="col-md-6">
              <input v-model="newProject.title" class="form-control mb-2" placeholder="Project Title">
            </div>
            <div class="col-md-6">
              <input v-model="newProject.technologies" class="form-control mb-2" placeholder="Technologies Used">
            </div>
            <div class="col-md-12">
              <textarea v-model="newProject.description" class="form-control mb-2" placeholder="Project description..." rows="3"></textarea>
            </div>
            <div class="col-md-12">
              <input v-model="newProject.link" class="form-control mb-2" placeholder="Project Link (optional)" type="url">
            </div>
          </div>
          <button @click="addProject" class="btn btn-success btn-sm me-2">Save</button>
          <button @click="cancelProject" class="btn btn-secondary btn-sm">Cancel</button>
        </div>

        <!-- Projects List -->
        <div v-for="project in projects" :key="project.id" class="border p-2 mb-2 rounded">
          <div class="d-flex justify-content-between">
            <div>
              <strong>{{ project.title }}</strong><br>
              <small>Technologies: {{ project.technologies }}</small><br>
              <p class="mt-2 mb-1">{{ project.description }}</p>
              <a v-if="project.link" :href="project.link" target="_blank" class="btn btn-link btn-sm p-0">View Project</a>
            </div>
            <button @click="deleteProject(project.id)" class="btn btn-danger btn-sm">Delete</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Languages Section -->
    <div class="card mb-4">
      <div class="card-header d-flex justify-content-between">
        <h6><i class="ti ti-language"></i> Languages</h6>
        <button @click="showLanguageForm = !showLanguageForm" class="btn btn-outline-primary btn-sm">
          Add Language
        </button>
      </div>
      <div class="card-body">
        <!-- Add Language Form -->
        <div v-if="showLanguageForm" class="border p-3 mb-3 rounded">
          <div class="row">
            <div class="col-md-6">
              <input v-model="newLanguage.language" class="form-control mb-2" placeholder="Language">
            </div>
            <div class="col-md-6">
              <select v-model="newLanguage.proficiency" class="form-control mb-2">
                <option value="">Select Proficiency</option>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
                <option value="Native">Native</option>
              </select>
            </div>
          </div>
          <button @click="addLanguage" class="btn btn-success btn-sm me-2">Save</button>
          <button @click="cancelLanguage" class="btn btn-secondary btn-sm">Cancel</button>
        </div>

        <!-- Languages List -->
        <div v-for="lang in languages" :key="lang.id" class="border p-2 mb-2 rounded d-flex justify-content-between">
          <div>
            <strong>{{ lang.language }}</strong> - {{ lang.proficiency }}
          </div>
          <button @click="deleteLanguage(lang.id)" class="btn btn-danger btn-sm">Delete</button>
        </div>
      </div>
    </div>

    <!-- Generate CV Button -->
    <div class="text-center">
      <button @click="generateCV" class="btn btn-success btn-lg">
        <i class="ti ti-download"></i> Generate CV
      </button>
    </div>
  </div>
  </div>
</template>

<script>
import { globalVariable } from "@/global";

export default {
  name: "CVGenerator",
  data() {
    return {
      userId: "",
      message: null,
      messageType: null,
      
      // CV Data
      cvData: {
        summary: ""
      },
      
      // Lists
      education: [],
      experience: [],
      projects: [],
      languages: [],
      
      // Form visibility
      showEducationForm: false,
      showExperienceForm: false,
      showProjectForm: false,
      showLanguageForm: false,
      
      // New item forms
      newEducation: {
        institution: "",
        degree: "",
        field_of_study: "",
        start_year: "",
        end_year: ""
      },
      newExperience: {
        company: "",
        position: "",
        start_date: "",
        end_date: "",
        description: ""
      },
      newProject: {
        title: "",
        description: "",
        technologies: "",
        link: ""
      },
      newLanguage: {
        language: "",
        proficiency: ""
      }
    };
  },
  
  mounted() {
    this.getUserId();
    this.loadCVData();
  },
  
  methods: {
    async getUserId() {
      const token = localStorage.getItem("employeeToken");
      if (!token) return;
      
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        const email = payload.email;
        
        const res = await fetch(`${globalVariable}/get_user_id_by_email/${email}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        
        if (res.ok) {
          this.userId = data.users_id;
        }
      } catch (err) {
        console.error("Error getting user ID:", err);
      }
    },
    
    async loadCVData() {
      // Load all CV sections
      await this.loadEducation();
      await this.loadExperience();
      await this.loadProjects();
      await this.loadLanguages();
    },
    
    // Summary methods
    async saveSummary() {
      try {
        const res = await fetch(`${globalVariable}/api/cv/summary`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem("employeeToken")}`
          },
          body: JSON.stringify({
            users_id: this.userId,
            summary: this.cvData.summary
          })
        });
        
        const data = await res.json();
        if (res.ok) {
          this.showMessage("Summary saved successfully!", "alert-success");
        } else {
          this.showMessage(data.message, "alert-danger");
        }
      } catch (error) {
        this.showMessage("Error saving summary", "alert-danger");
      }
    },
    
    // Education methods
    async loadEducation() {
      try {
        const res = await fetch(`${globalVariable}/api/cv/education/${this.userId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("employeeToken")}` }
        });
        if (res.ok) {
          this.education = await res.json();
        }
      } catch (error) {
        console.error("Error loading education:", error);
      }
    },
    
    async addEducation() {
      try {
        const res = await fetch(`${globalVariable}/api/cv/education`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem("employeeToken")}`
          },
          body: JSON.stringify({
            users_id: this.userId,
            ...this.newEducation
          })
        });
        
        if (res.ok) {
          this.showMessage("Education added successfully!", "alert-success");
          this.cancelEducation();
          this.loadEducation();
        }
      } catch (error) {
        this.showMessage("Error adding education", "alert-danger");
      }
    },
    
    async deleteEducation(id) {
      try {
        const res = await fetch(`${globalVariable}/api/cv/education/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${localStorage.getItem("employeeToken")}` }
        });
        
        if (res.ok) {
          this.showMessage("Education deleted successfully!", "alert-success");
          this.loadEducation();
        }
      } catch (error) {
        this.showMessage("Error deleting education", "alert-danger");
      }
    },
    
    cancelEducation() {
      this.showEducationForm = false;
      this.newEducation = {
        institution: "",
        degree: "",
        field_of_study: "",
        start_year: "",
        end_year: ""
      };
    },
    
    // Experience methods
    async loadExperience() {
      try {
        const res = await fetch(`${globalVariable}/api/cv/experience/${this.userId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("employeeToken")}` }
        });
        if (res.ok) {
          this.experience = await res.json();
        }
      } catch (error) {
        console.error("Error loading experience:", error);
      }
    },
    
    async addExperience() {
      try {
        const res = await fetch(`${globalVariable}/api/cv/experience`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem("employeeToken")}`
          },
          body: JSON.stringify({
            users_id: this.userId,
            ...this.newExperience
          })
        });
        
        if (res.ok) {
          this.showMessage("Experience added successfully!", "alert-success");
          this.cancelExperience();
          this.loadExperience();
        }
      } catch (error) {
        this.showMessage("Error adding experience", "alert-danger");
      }
    },
    
    async deleteExperience(id) {
      try {
        const res = await fetch(`${globalVariable}/api/cv/experience/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${localStorage.getItem("employeeToken")}` }
        });
        
        if (res.ok) {
          this.showMessage("Experience deleted successfully!", "alert-success");
          this.loadExperience();
        }
      } catch (error) {
        this.showMessage("Error deleting experience", "alert-danger");
      }
    },
    
    cancelExperience() {
      this.showExperienceForm = false;
      this.newExperience = {
        company: "",
        position: "",
        start_date: "",
        end_date: "",
        description: ""
      };
    },
    
    // Project methods
    async loadProjects() {
      try {
        const res = await fetch(`${globalVariable}/api/cv/projects/${this.userId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("employeeToken")}` }
        });
        if (res.ok) {
          this.projects = await res.json();
        }
      } catch (error) {
        console.error("Error loading projects:", error);
      }
    },
    
    async addProject() {
      try {
        const res = await fetch(`${globalVariable}/api/cv/projects`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem("employeeToken")}`
          },
          body: JSON.stringify({
            users_id: this.userId,
            ...this.newProject
          })
        });
        
        if (res.ok) {
          this.showMessage("Project added successfully!", "alert-success");
          this.cancelProject();
          this.loadProjects();
        }
      } catch (error) {
        this.showMessage("Error adding project", "alert-danger");
      }
    },
    
    async deleteProject(id) {
      try {
        const res = await fetch(`${globalVariable}/api/cv/projects/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${localStorage.getItem("employeeToken")}` }
        });
        
        if (res.ok) {
          this.showMessage("Project deleted successfully!", "alert-success");
          this.loadProjects();
        }
      } catch (error) {
        this.showMessage("Error deleting project", "alert-danger");
      }
    },
    
    cancelProject() {
      this.showProjectForm = false;
      this.newProject = {
        title: "",
        description: "",
        technologies: "",
        link: ""
      };
    },
    
    // Language methods
    async loadLanguages() {
      try {
        const res = await fetch(`${globalVariable}/api/cv/languages/${this.userId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("employeeToken")}` }
        });
        if (res.ok) {
          this.languages = await res.json();
        }
      } catch (error) {
        console.error("Error loading languages:", error);
      }
    },
    
    async addLanguage() {
      try {
        const res = await fetch(`${globalVariable}/api/cv/languages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem("employeeToken")}`
          },
          body: JSON.stringify({
            users_id: this.userId,
            ...this.newLanguage
          })
        });
        
        if (res.ok) {
          this.showMessage("Language added successfully!", "alert-success");
          this.cancelLanguage();
          this.loadLanguages();
        }
      } catch (error) {
        this.showMessage("Error adding language", "alert-danger");
      }
    },
    
    async deleteLanguage(id) {
      try {
        const res = await fetch(`${globalVariable}/api/cv/languages/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${localStorage.getItem("employeeToken")}` }
        });
        
        if (res.ok) {
          this.showMessage("Language deleted successfully!", "alert-success");
          this.loadLanguages();
        }
      } catch (error) {
        this.showMessage("Error deleting language", "alert-danger");
      }
    },
    
    cancelLanguage() {
      this.showLanguageForm = false;
      this.newLanguage = {
        language: "",
        proficiency: ""
      };
    },
    
    // Utility methods
    formatDate(dateString) {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleDateString();
    },
    
    showMessage(msg, type) {
      this.message = msg;
      this.messageType = type;
      setTimeout(() => {
        this.message = null;
        this.messageType = null;
      }, 3000);
    },
    
    generateCV() {
      // You can implement PDF generation or redirect to CV preview here
      this.showMessage("CV generation feature coming soon!", "alert-info");
    }
  }
};
</script>

<style scoped>
.cv-builder {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
}

.card {
  border: 1px solid #dee2e6;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.card-header {
  background-color: #f8f9fa;
  border-bottom: 1px solid #dee2e6;
  padding: 1rem;
}

.card-header h6 {
  margin: 0;
  color: #495057;
}

.btn {
  border-radius: 4px;
}

.border {
  border: 1px solid #dee2e6 !important;
}

.rounded {
  border-radius: 6px !important;
}
</style>

<style scoped>
.cv-builder {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
}

.card {
  border: 1px solid #dee2e6;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.card-header {
  background-color: #f8f9fa;
  border-bottom: 1px solid #dee2e6;
  padding: 1rem;
}

.card-header h6 {
  margin: 0;
  color: #495057;
}

.btn {
  border-radius: 4px;
}

.border {
  border: 1px solid #dee2e6 !important;
}

.rounded {
  border-radius: 6px !important;
}
</style>

