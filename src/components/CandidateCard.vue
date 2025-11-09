<template>
  <div class="candidate-card" @click="handleCardClick">
    <div class="candidate-card-header">
      <div class="candidate-photo">
        <img 
          :src="profileImageUrl" 
          :alt="candidate.first_name + ' ' + candidate.last_name"
          @error="onPhotoError"
          class="photo-image"
        />
        <div v-if="candidate.verification_badge" class="verification-badge">
          <i class="fas fa-check-circle"></i>
        </div>
      </div>
      <div class="candidate-info">
        <h3 class="candidate-name">
          {{ candidate.first_name }} {{ candidate.last_name }}
        </h3>
        <p class="candidate-category">{{ getCategoryName(candidate.categories_id) }}</p>
        <div class="professional-badge" v-if="candidate.verification_badge">
          <i class="fas fa-star"></i>
          <span>Verified Professional</span>
        </div>
      </div>
    </div>
    
    <div class="candidate-card-body">
      <div class="candidate-details">
        <div class="detail-item" v-if="candidate.province || candidate.district">
          <i class="fas fa-map-marker-alt"></i>
          <span>{{ getLocation(candidate) }}</span>
        </div>
        
        <div class="detail-item" v-if="candidate.phone">
          <i class="fas fa-phone"></i>
          <span>{{ candidate.phone }}</span>
        </div>
        
        <div class="detail-item" v-if="candidate.email">
          <i class="fas fa-envelope"></i>
          <span>{{ candidate.email }}</span>
        </div>
      </div>
      
      <div class="candidate-description" v-if="candidate.bio">
        <p>{{ truncateText(candidate.bio, 100) }}</p>
      </div>
    </div>
    
    <div class="candidate-card-footer">
      <button 
        class="btn-view-profile" 
        @click.stop="viewProfile"
        :disabled="!candidate.users_id"
      >
        <i class="fas fa-user"></i>
        View Profile
      </button>
      <button 
        class="btn-contact" 
        @click.stop="contactCandidate"
        :disabled="!candidate.users_id"
      >
        <i class="fas fa-briefcase"></i>
        Hire Me
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'CandidateCard',
  props: {
    candidate: {
      type: Object,
      required: true,
      default: () => ({})
    }
  },
  data() {
    return {
      defaultPhoto: '/logo.png',
      uploadsUrl: 'https://apis.kozi.rw/uploads/profile/',
      categories: {
        // Add category mappings if needed
        1: 'Sales',
        2: 'Construction', 
        3: 'Hospitality',
        4: 'Healthcare',
        5: 'Security',
        6: 'Cleaning',
        7: 'Driving',
        8: 'Accounting',
        9: 'IT',
        10: 'Education'
      }
    }
  },
  computed: {
    profileImageUrl() {
      if (this.candidate.image) {
        // If image already starts with http, use it as is
        if (this.candidate.image.startsWith('http')) {
          return this.candidate.image
        }
        // Otherwise, prepend the uploads URL
        return this.uploadsUrl + this.candidate.image
      }
      return this.defaultPhoto
    }
  },
  methods: {
    onPhotoError(event) {
      event.target.src = this.defaultPhoto
    },
    
    getCategoryName(categoryId) {
      return this.categories[categoryId] || 'General'
    },
    
    getLocation(candidate) {
      if (candidate.district && candidate.province) {
        return `${candidate.district}, ${candidate.province}`
      }
      return candidate.district || candidate.province || 'Location not specified'
    },
    
    truncateText(text, maxLength) {
      if (!text) return ''
      if (text.length <= maxLength) return text
      return text.substring(0, maxLength) + '...'
    },
    
    handleCardClick() {
      if (this.candidate.users_id) {
        this.viewProfile()
      }
    },
    
    viewProfile() {
      if (this.candidate.users_id) {
        // Open candidate profile page
        window.open(`/seekers/${this.candidate.users_id}`, '_blank')
      }
    },
    
    contactCandidate() {
      if (this.candidate.users_id) {
        // Open contact/message page
        window.open(`/seekers/${this.candidate.users_id}`, '_blank')
      }
    }
  }
}
</script>

<style scoped>
.candidate-card {
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

.candidate-card:hover {
  border-color: #EA60A6;
  box-shadow: 0 8px 25px rgba(234, 96, 166, 0.15);
  transform: translateY(-2px);
}

.candidate-card-header {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;
}

.candidate-photo {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  overflow: hidden;
  background: #f8f9fa;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  position: relative;
}

.photo-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.verification-badge {
  position: absolute;
  bottom: -2px;
  right: -2px;
  background: #10b981;
  color: white;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  border: 2px solid white;
}

.candidate-info {
  flex: 1;
  min-width: 0;
}

.candidate-name {
  font-size: 1.1rem;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 0.25rem 0;
  line-height: 1.3;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.candidate-category {
  font-size: 0.9rem;
  color: #6b7280;
  margin: 0 0 0.5rem 0;
  font-weight: 500;
}

.professional-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  background: #fef3c7;
  color: #d97706;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
}

.professional-badge i {
  font-size: 0.7rem;
}

.candidate-card-body {
  margin-bottom: 1rem;
}

.candidate-details {
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

.candidate-description {
  margin-top: 0.75rem;
}

.candidate-description p {
  font-size: 0.85rem;
  color: #6b7280;
  line-height: 1.4;
  margin: 0;
}

.candidate-card-footer {
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
}

.btn-view-profile,
.btn-contact {
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

.btn-view-profile {
  background: #f8f9fa;
  color: #374151;
  border: 1px solid #e5e7eb;
}

.btn-view-profile:hover:not(:disabled) {
  background: #e9ecef;
  border-color: #d1d5db;
}

.btn-contact {
  background: linear-gradient(135deg, #EA60A6 0%, #C0126E 100%);
  color: white;
}

.btn-contact:hover:not(:disabled) {
  background: linear-gradient(135deg, #d54f95 0%, #a80e5e 100%);
  transform: translateY(-1px);
}

.btn-view-profile:disabled,
.btn-contact:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Dark mode support */
body.dark .candidate-card {
  background: #1f2937;
  border-color: #374151;
  color: #e5e7eb;
}

body.dark .candidate-card:hover {
  border-color: #EA60A6;
  box-shadow: 0 8px 25px rgba(234, 96, 166, 0.2);
}

body.dark .candidate-name {
  color: #f9fafb;
}

body.dark .candidate-category {
  color: #9ca3af;
}

body.dark .detail-item {
  color: #9ca3af;
}

body.dark .candidate-description p {
  color: #9ca3af;
}

body.dark .btn-view-profile {
  background: #374151;
  color: #d1d5db;
  border-color: #4b5563;
}

body.dark .btn-view-profile:hover:not(:disabled) {
  background: #4b5563;
  border-color: #6b7280;
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .candidate-card {
    padding: 1rem;
    margin-bottom: 0.75rem;
  }
  
  .candidate-card-header {
    gap: 0.75rem;
  }
  
  .candidate-photo {
    width: 50px;
    height: 50px;
  }
  
  .candidate-name {
    font-size: 1rem;
  }
  
  .candidate-category {
    font-size: 0.85rem;
  }
  
  .candidate-details {
    gap: 0.4rem;
  }
  
  .detail-item {
    font-size: 0.8rem;
  }
  
  .candidate-card-footer {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .btn-view-profile,
  .btn-contact {
    padding: 0.7rem 1rem;
    font-size: 0.8rem;
  }
}
</style>
