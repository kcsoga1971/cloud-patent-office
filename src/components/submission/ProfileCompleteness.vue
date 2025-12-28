<!-- src/components/submission/ProfileCompleteness.vue -->
<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useSubmission } from '../../composables/useSubmission'

const props = defineProps({
  profile: {
    type: Object,
    required: true
  },
  inventors: {
    type: Array,
    default: () => []
  }
})

const router = useRouter()
const { checkProfileCompleteness } = useSubmission()

const completeness = computed(() => 
  checkProfileCompleteness(props.profile, props.inventors)
)

const goToSettings = () => {
  router.push('/settings/profile')
}
</script>

<template>
  <div class="profile-completeness">
    <div class="card">
      <div class="card-header">
        <h3>📋 個人資料完整度檢查</h3>
      </div>
      
      <div class="card-body">
        <!-- 申請人資料 -->
        <div class="section">
          <div class="section-header">
            <h4>申請人資料</h4>
            <span class="count">
              {{ completeness.applicant.filled }} / {{ completeness.applicant.total }}
            </span>
          </div>
          
          <div class="progress-bar">
            <div 
              class="progress-fill" 
              :style="{ width: completeness.applicant.percentage + '%' }"
            ></div>
          </div>
          
          <div v-if="completeness.applicant.missing.length > 0" class="alert alert-warning">
            <div class="alert-icon">⚠️</div>
            <div class="alert-content">
              <p class="alert-title">以下欄位尚未填寫,申請書將標示為紅色提示:</p>
              <ul class="missing-list">
                <li v-for="item in completeness.applicant.missing" :key="item.field">
                  {{ item.label }}
                </li>
              </ul>
            </div>
          </div>
        </div>

        <!-- 發明人資料 -->
        <div class="section">
          <div class="section-header">
            <h4>發明人資料</h4>
            <span v-if="completeness.inventors.hasInventors" class="status-icon success">✓</span>
            <span v-else class="status-icon error">✗</span>
          </div>
          
          <div v-if="completeness.inventors.hasInventors" class="info-text">
            已設定 {{ completeness.inventors.count }} 位發明人
          </div>
          <div v-else class="alert alert-error">
            <div class="alert-icon">❌</div>
            <div class="alert-content">
              尚未設定發明人資料,申請書將提示您手動填寫
            </div>
          </div>
        </div>

        <!-- 整體狀態 -->
        <div class="section overall-status">
          <div v-if="completeness.overall.ready" class="alert alert-success">
            <div class="alert-icon">✅</div>
            <div class="alert-content">
              個人資料已完整,可以生成申請書
            </div>
          </div>
          <div v-else class="alert alert-warning">
            <div class="alert-icon">⚠️</div>
            <div class="alert-content">
              建議先完善個人資料,以減少手動填寫的欄位
            </div>
          </div>
        </div>

        <!-- 前往設定按鈕 -->
        <button @click="goToSettings" class="btn-settings">
          前往設定個人資料
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.profile-completeness {
  margin-bottom: 2rem;
}

.card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  overflow: hidden;
}

.card-header {
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.card-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.card-body {
  padding: 1.5rem;
}

.section {
  margin-bottom: 1.5rem;
}

.section:last-child {
  margin-bottom: 0;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.section-header h4 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.count {
  font-size: 0.875rem;
  color: #6b7280;
}

.progress-bar {
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 1rem;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #2563eb);
  transition: width 0.3s ease;
}

.alert {
  padding: 1rem;
  border-radius: 8px;
  display: flex;
  gap: 0.75rem;
  margin-top: 0.75rem;
}

.alert-warning {
  background: #fef3c7;
  border: 1px solid #fbbf24;
}

.alert-error {
  background: #fee2e2;
  border: 1px solid #ef4444;
}

.alert-success {
  background: #d1fae5;
  border: 1px solid #10b981;
}

.alert-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
}

.alert-content {
  flex: 1;
}

.alert-title {
  margin: 0 0 0.5rem 0;
  font-weight: 600;
}

.missing-list {
  margin: 0;
  padding-left: 1.25rem;
}

.missing-list li {
  margin-bottom: 0.25rem;
}

.info-text {
  color: #6b7280;
  font-size: 0.875rem;
}

.status-icon {
  font-size: 1.25rem;
}

.status-icon.success {
  color: #10b981;
}

.status-icon.error {
  color: #ef4444;
}

.overall-status {
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

.btn-settings {
  width: 100%;
  padding: 0.75rem;
  background: white;
  border: 2px solid #3b82f6;
  color: #3b82f6;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-settings:hover {
  background: #3b82f6;
  color: white;
}
</style>
