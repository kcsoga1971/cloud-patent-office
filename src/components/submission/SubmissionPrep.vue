<!-- src/views/services/SubmissionPrep.vue -->
<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '../../stores/user'
import { useSubmission } from '../../composables/useSubmission'
import ProfileCompleteness from '../../components/submission/ProfileCompleteness.vue'
import SubmissionGuide from '../../components/submission/SubmissionGuide.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const { 
  isLoading, 
  submissionData, 
  error,
  generateSubmissionData, 
  downloadApplicationForm // 🆕 使用新函數
} = useSubmission()

const jobId = ref(route.params.id || route.query.job_id)

// ========== 生成送件資料 ==========
const handleGenerate = async () => {
  try {
    await generateSubmissionData(jobId.value, userStore.user.id)
    console.log('✅ 送件資料已生成')
  } catch (err) {
    console.error('❌ 生成失敗:', err)
    alert('生成失敗：' + err.message)
  }
}

// ========== 🆕 下載 Word 檔 (使用 docx 生成) ==========
const handleDownload = async () => {
  if (!submissionData.value) return
  
  try {
    const result = await downloadApplicationForm(
      submissionData.value.profile,
      submissionData.value.inventors,
      submissionData.value.application_info
    )
    
    if (result.success) {
      console.log('✅ 申請書已下載:', result.filename)
    }
  } catch (err) {
    console.error('❌ 下載失敗:', err)
    alert('下載失敗：' + err.message)
  }
}

// ========== 返回案件列表 ==========
const goBack = () => {
  router.push('/services/workflow')
}

// ========== 初始化 ==========
onMounted(() => {
  if (!jobId.value) {
    alert('缺少案件 ID')
    router.push('/services/workflow')
  }
})
</script>

<template>
  <div class="submission-prep">
    <!-- 頁面標題 -->
    <div class="page-header">
      <button @click="goBack" class="btn-back">
        ← 返回案件列表
      </button>
      <div class="header-content">
        <h1>📮 準備送件</h1>
        <p class="subtitle">生成專利申請書並查看紙本送件流程</p>
      </div>
    </div>
    
    <!-- 個人資料檢查 -->
    <ProfileCompleteness 
      v-if="submissionData"
      :profile="submissionData.profile"
      :inventors="submissionData.inventors"
    />
    
    <!-- 生成申請書 -->
    <div class="generation-card">
      <div class="card">
        <div class="card-header">
          <h3>📄 生成專利申請書</h3>
        </div>
        <div class="card-body">
          <!-- 未生成狀態 -->
          <div v-if="!submissionData" class="not-generated">
            <p class="info-text">
              點擊下方按鈕生成申請書 Word 檔。系統會自動填入您的個人資料,
              未填寫的欄位將以紅色標示提醒您手動填寫。
            </p>
            <button 
              @click="handleGenerate" 
              :disabled="isLoading"
              class="btn-generate"
            >
              <span v-if="isLoading" class="loading-spinner">⏳</span>
              <span v-else>📄</span>
              {{ isLoading ? '生成中...' : '生成申請書' }}
            </button>
            <p v-if="error" class="error-text">{{ error }}</p>
          </div>
          
          <!-- 已生成狀態 -->
          <div v-else class="generated">
            <div class="success-box">
              <div class="success-icon">✅</div>
              <div class="success-content">
                <h4>申請書已準備完成</h4>
                <p>檔案名稱: {{ submissionData.application_form_filename }}</p>
              </div>
            </div>
            
            <div class="action-buttons">
              <button @click="handleDownload" class="btn-download">
                📥 下載申請書
              </button>
              <button @click="handleGenerate" class="btn-regenerate">
                🔄 重新生成
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 送件流程指南 -->
    <SubmissionGuide 
      v-if="submissionData"
      :guide="submissionData.submission_guide"
    />
  </div>
</template>

<style scoped>
.submission-prep {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.page-header {
  margin-bottom: 2rem;
}

.btn-back {
  background: none;
  border: none;
  color: #3b82f6;
  font-size: 1rem;
  cursor: pointer;
  padding: 0.5rem 0;
  margin-bottom: 1rem;
  display: inline-block;
}

.btn-back:hover {
  text-decoration: underline;
}

.header-content h1 {
  font-size: 2rem;
  font-weight: 700;
  margin: 0 0 0.5rem 0;
}

.subtitle {
  color: #6b7280;
  margin: 0;
}

.generation-card {
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
  padding: 2rem;
}

.not-generated {
  text-align: center;
}

.info-text {
  color: #6b7280;
  margin-bottom: 1.5rem;
  line-height: 1.6;
}

.btn-generate {
  width: 100%;
  max-width: 400px;
  padding: 1rem 2rem;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1.125rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin: 0 auto;
}

.btn-generate:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.btn-generate:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.loading-spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.error-text {
  color: #ef4444;
  margin-top: 1rem;
}

.generated {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.success-box {
  display: flex;
  gap: 1rem;
  padding: 1.5rem;
  background: #d1fae5;
  border: 2px solid #10b981;
  border-radius: 8px;
}

.success-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.success-content h4 {
  margin: 0 0 0.5rem 0;
  color: #065f46;
  font-weight: 600;
}

.success-content p {
  margin: 0;
  color: #047857;
  font-size: 0.875rem;
}

.action-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.btn-download,
.btn-regenerate {
  padding: 0.875rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-download {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
}

.btn-download:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.btn-regenerate {
  background: white;
  border: 2px solid #3b82f6;
  color: #3b82f6;
}

.btn-regenerate:hover {
  background: #eff6ff;
}

@media (max-width: 768px) {
  .submission-prep {
    padding: 1rem;
  }
  
  .action-buttons {
    grid-template-columns: 1fr;
  }
}
</style>
