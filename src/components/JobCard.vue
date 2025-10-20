<template>
  <div class="job-card" @click="handleCardClick">
    <div class="job-card-header">
      <div class="company-logo">
        <img 
          :src="job.logo || defaultLogo" 
          :alt="job.company + ' logo'"
          @error="onLogoError"
          class="logo-image"
        />
      </div>
      <div class="job-title-section">
        <h3 class="job-title">{{ job.job_title || 'Job Title' }}</h3>
        <p class="company-name">{{ job.company || 'Company Name' }}</p>
        <div class="employment-badge" v-if="job.employment_type">
          {{ job.employment_type }}
        </div>
      </div>
    </div>
    
    <div class="job-card-body">
      <div class="job-details">
        <div class="detail-item" v-if="job.location">
          <i class="fas fa-map-marker-alt"></i>
          <span>{{ job.location }}</span>
        </div>
        
        <div class="detail-item" v-if="job.salary_min && job.salary_max && job.salary_min !== 1 && job.salary_max !== 1">
          <i class="fas fa-dollar-sign"></i>
          <span>{{ formatSalary(job.salary_min, job.salary_max) }}</span>
        </div>
        
        <div class="detail-item" v-if="job.deadline">
          <i class="fas fa-calendar-alt"></i>
          <span>Deadline: {{ formatDate(job.deadline) }}</span>
        </div>
      </div>
      
      <div class="job-description" v-if="job.description">
        <p>{{ truncateText(job.description, 120) }}</p>
      </div>
    </div>
    
    <div class="job-card-footer">
      <button 
        class="btn-view-details" 
        @click.stop="viewDetails"
        :disabled="!job.job_id"
      >
        <i class="fas fa-eye"></i>
        View Details
      </button>
      <button 
        class="btn-apply" 
        @click.stop="applyJob"
        :disabled="!job.job_id"
      >
        <i class="fas fa-paper-plane"></i>
        Apply
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'JobCard',
  props: {
    job: {
      type: Object,
      required: true,
      default: () => ({})
    }
  },
  data() {
    return {
      defaultLogo: '/logo.png'
    }
  },
  methods: {
    onLogoError(event) {
      event.target.src = this.defaultLogo
    },
    
    formatSalary(min, max) {
      if (min === max) {
        return `${min.toLocaleString()} RWF`
      }
      return `${min.toLocaleString()} - ${max.toLocaleString()} RWF`
    },
    
    formatDate(dateString) {
      if (!dateString) return ''
      try {
        const date = new Date(dateString)
        return date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          year: 'numeric'
        })
      } catch {
        return dateString
      }
    },
    
    truncateText(text, maxLength) {
      if (!text) return ''
      if (text.length <= maxLength) return text
      return text.substring(0, maxLength) + '...'
    },
    
    handleCardClick() {
      if (this.job.job_id) {
        this.viewDetails()
      }
    },
    
    viewDetails() {
      if (this.job.job_id) {
        // Open job details page
        window.open(`/career/${this.job.job_id}`, '_blank')
      }
    },
    
    applyJob() {
      if (this.job.job_id) {
        // Open application page or trigger application flow
        window.open(`/career/${this.job.job_id}`, '_blank')
      }
    }
  }
}
</script>

<style scoped>
.job-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1.25rem;
  margin-bottom: 1rem;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  position: relative;
  overflow: hidden;
}

.job-card:hover {
  border-color: #EA60A6;
  box-shadow: 0 8px 25px rgba(234, 96, 166, 0.15);
  transform: translateY(-2px);
}

.job-card-header {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;
}

.company-logo {
  width: 60px;
  height: 60px;
  border-radius: 8px;
  overflow: hidden;
  background: #f8f9fa;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.logo-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.job-title-section {
  flex: 1;
  min-width: 0;
}

.job-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 0.25rem 0;
  line-height: 1.3;
}

.company-name {
  font-size: 0.9rem;
  color: #6b7280;
  margin: 0 0 0.5rem 0;
  font-weight: 500;
}

.employment-badge {
  display: inline-block;
  background: #f3f4f6;
  color: #374151;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: capitalize;
}

.job-card-body {
  margin-bottom: 1rem;
}

.job-details {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: #6b7280;
}

.detail-item i {
  width: 14px;
  color: #EA60A6;
  font-size: 0.8rem;
}

.job-description {
  margin-top: 0.75rem;
}

.job-description p {
  font-size: 0.85rem;
  color: #6b7280;
  line-height: 1.4;
  margin: 0;
}

.job-card-footer {
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
}

.btn-view-details,
.btn-apply {
  flex: 1;
  padding: 0.6rem 1rem;
  border: none;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.btn-view-details {
  background: #f8f9fa;
  color: #374151;
  border: 1px solid #e5e7eb;
}

.btn-view-details:hover:not(:disabled) {
  background: #e9ecef;
  border-color: #d1d5db;
}

.btn-apply {
  background: linear-gradient(135deg, #EA60A6 0%, #C0126E 100%);
  color: white;
}

.btn-apply:hover:not(:disabled) {
  background: linear-gradient(135deg, #d54f95 0%, #a80e5e 100%);
  transform: translateY(-1px);
}

.btn-view-details:disabled,
.btn-apply:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Dark mode support */
body.dark .job-card {
  background: #1f2937;
  border-color: #374151;
  color: #e5e7eb;
}

body.dark .job-card:hover {
  border-color: #EA60A6;
  box-shadow: 0 8px 25px rgba(234, 96, 166, 0.2);
}

body.dark .job-title {
  color: #f9fafb;
}

body.dark .company-name {
  color: #9ca3af;
}

body.dark .employment-badge {
  background: #374151;
  color: #d1d5db;
}

body.dark .detail-item {
  color: #9ca3af;
}

body.dark .job-description p {
  color: #9ca3af;
}

body.dark .btn-view-details {
  background: #374151;
  color: #d1d5db;
  border-color: #4b5563;
}

body.dark .btn-view-details:hover:not(:disabled) {
  background: #4b5563;
  border-color: #6b7280;
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .job-card {
    padding: 1rem;
    margin-bottom: 0.75rem;
  }
  
  .job-card-header {
    gap: 0.75rem;
  }
  
  .company-logo {
    width: 50px;
    height: 50px;
  }
  
  .job-title {
    font-size: 1rem;
  }
  
  .company-name {
    font-size: 0.85rem;
  }
  
  .job-details {
    gap: 0.4rem;
  }
  
  .detail-item {
    font-size: 0.8rem;
  }
  
  .job-card-footer {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .btn-view-details,
  .btn-apply {
    padding: 0.7rem 1rem;
    font-size: 0.8rem;
  }
}
</style>
