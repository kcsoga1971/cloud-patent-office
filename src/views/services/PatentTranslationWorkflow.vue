<!-- src/views/services/PatentTranslationWorkflow.vue -->
<template>
  <div class="workflow-container">
    <!-- 頁面標題 -->
    <div class="page-header">
      <div class="header-left">
        <div class="header-icon">🌐</div>
        <div class="header-content">
          <h1>專利翻譯記錄 (Translation Workflow)</h1>
          <p class="subtitle">歷史翻譯記錄與管理</p>
        </div>
      </div>
      <div class="header-actions">
        <button @click="loadJobs" class="btn-refresh">
          🔄 重新整理
        </button>
        <router-link to="/services/translation" class="btn-new">
          ➕ 新增翻譯
        </router-link>
      </div>
    </div>

    <!-- 篩選器 -->
    <div class="filters-section">
      <div class="filters-grid">
        <!-- 搜尋 -->
        <div class="filter-item">
          <label class="filter-label">🔍 搜尋</label>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="文件編號、Job ID..."
            class="filter-input"
          />
        </div>

        <!-- 狀態篩選 -->
        <div class="filter-item">
          <label class="filter-label">📊 狀態</label>
          <select v-model="filterStatus" class="filter-select">
            <option value="">全部狀態</option>
            <option value="completed">已完成</option>
            <option value="processing">處理中</option>
            <option value="failed">失敗</option>
          </select>
        </div>

        <!-- 品質篩選 -->
        <div class="filter-item">
          <label class="filter-label">⭐ 品質</label>
          <select v-model="filterQuality" class="filter-select">
            <option value="">全部等級</option>
            <option value="excellent">優秀 (95%+)</option>
            <option value="high">良好 (80-95%)</option>
            <option value="medium">中等 (60-80%)</option>
            <option value="low">較低 (<60%)</option>
          </select>
        </div>

        <!-- 排序 -->
        <div class="filter-item">
          <label class="filter-label">🔢 排序</label>
          <select v-model="sortBy" class="filter-select">
            <option value="date_desc">最新優先</option>
            <option value="date_asc">最舊優先</option>
            <option value="quality_desc">品質最高</option>
            <option value="quality_asc">品質最低</option>
          </select>
        </div>
      </div>
    </div>

    <!-- 載入中 -->
    <div v-if="isLoading" class="loading-state">
      <div class="spinner"></div>
      <p>載入中...</p>
    </div>

    <!-- 空狀態 -->
    <div v-else-if="filteredJobs.length === 0" class="empty-state">
      <div class="empty-icon">📭</div>
      <h3>尚無翻譯記錄</h3>
      <p>開始您的第一個專利翻譯</p>
      <router-link to="/services/translation" class="btn-start">
        開始第一個翻譯
      </router-link>
    </div>

    <!-- 工作列表 -->
    <div v-else class="jobs-section">
      <div class="section-header">
        <h3>📋 翻譯記錄</h3>
        <span class="job-count">共 {{ filteredJobs.length }} 筆記錄</span>
      </div>

      <div class="job-list">
        <div
          v-for="job in filteredJobs"
          :key="job.job_id"
          class="job-card"
          @click="viewJobDetails(job.job_id)"
        >
          <!-- 卡片標題 -->
          <div class="card-header">
            <div class="job-id-badge">
              {{ job.job_id }}
            </div>
            <span class="status-badge" :class="getStatusClass(job.status)">
              {{ getStatusLabel(job.status) }}
            </span>
          </div>

          <!-- 卡片內容 -->
          <div class="card-body">
            <h3 class="job-title">{{ job.document_id }}</h3>

            <div class="job-info">
              <div class="info-item">
                <span class="info-label">🌍 語言</span>
                <span class="info-value">{{ formatLanguagePair(job.language_pair) }}</span>
              </div>

              <div class="info-item">
                <span class="info-label">📄 類型</span>
                <span class="info-value">{{ formatDocType(job.document_type) }}</span>
              </div>

              <div class="info-item">
                <span class="info-label">📊 品質</span>
                <span class="info-value quality-score">
                  {{ (job.average_quality_score * 100).toFixed(0) }}%
                </span>
              </div>

              <div class="info-item">
                <span class="info-label">📝 段落</span>
                <span class="info-value">{{ job.total_segments }}</span>
              </div>
            </div>

            <div class="job-meta">
              <span class="meta-item">
                📅 {{ formatDate(job.created_at) }}
              </span>
            </div>
          </div>

          <!-- 卡片操作 -->
          <div class="card-footer">
            <button
              @click.stop="viewJobDetails(job.job_id)"
              class="btn-action btn-view"
            >
              查看詳情
            </button>
            <button
              @click.stop="downloadJob(job.job_id)"
              class="btn-action btn-download"
            >
              下載
            </button>
            <button
              @click.stop="duplicateJob(job)"
              class="btn-action btn-duplicate"
            >
              複製
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// State
const searchQuery = ref('')
const filterStatus = ref('')
const filterQuality = ref('')
const sortBy = ref('date_desc')
const isLoading = ref(false)

// Mock data
const jobs = ref([
  {
    job_id: 'trans_001',
    document_id: 'US10123456B2',
    language_pair: 'en_to_zh',
    document_type: 'claims',
    status: 'completed',
    average_quality_score: 0.92,
    overall_quality_level: 'high',
    total_segments: 12,
    created_at: '2024-02-14T10:30:00'
  },
  {
    job_id: 'trans_002',
    document_id: 'EP3456789A1',
    language_pair: 'en_to_ja',
    document_type: 'description',
    status: 'completed',
    average_quality_score: 0.85,
    overall_quality_level: 'high',
    total_segments: 25,
    created_at: '2024-02-13T14:15:00'
  }
])

onMounted(() => {
  loadJobs()
})

const loadJobs = async () => {
  isLoading.value = true
  // TODO: 從 API 載入資料
  setTimeout(() => {
    isLoading.value = false
  }, 500)
}

// Computed
const filteredJobs = computed(() => {
  let filtered = jobs.value

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(job =>
      job.document_id.toLowerCase().includes(query) ||
      job.job_id.toLowerCase().includes(query)
    )
  }

  if (filterStatus.value) {
    filtered = filtered.filter(job => job.status === filterStatus.value)
  }

  if (filterQuality.value) {
    filtered = filtered.filter(job => job.overall_quality_level === filterQuality.value)
  }

  // 排序
  switch (sortBy.value) {
    case 'date_desc':
      filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      break
    case 'date_asc':
      filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      break
    case 'quality_desc':
      filtered.sort((a, b) => b.average_quality_score - a.average_quality_score)
      break
    case 'quality_asc':
      filtered.sort((a, b) => a.average_quality_score - b.average_quality_score)
      break
  }

  return filtered
})

// Methods
const formatLanguagePair = (pair) => {
  const map = {
    en_to_zh: 'EN→ZH',
    zh_to_en: 'ZH→EN',
    en_to_ja: 'EN→JA',
    ja_to_en: 'JA→EN',
    en_to_de: 'EN→DE',
    de_to_en: 'DE→EN'
  }
  return map[pair] || pair
}

const formatDocType = (type) => {
  const map = {
    claims: '請求項',
    description: '說明書',
    abstract: '摘要',
    full: '完整文件'
  }
  return map[type] || type
}

const formatDate = (dateStr) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getStatusClass = (status) => {
  const map = {
    completed: 'status-success',
    processing: 'status-warning',
    failed: 'status-error'
  }
  return map[status] || 'status-default'
}

const getStatusLabel = (status) => {
  const map = {
    completed: '✅ 已完成',
    processing: '⏳ 處理中',
    failed: '❌ 失敗'
  }
  return map[status] || status
}

const viewJobDetails = (jobId) => {
  router.push(`/services/translation/${jobId}`)
}

const downloadJob = async (jobId) => {
  try {
    const apiUrl = import.meta.env.VITE_TRANSLATION_API_URL
    const response = await fetch(`${apiUrl}/api/v1/jobs/${jobId}/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ format: 'docx' })
    })

    if (response.ok) {
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `translation_${jobId}.docx`
      a.click()
    }
  } catch (error) {
    console.error('下載錯誤:', error)
    alert('下載失敗')
  }
}

const duplicateJob = (job) => {
  router.push({
    name: 'translation',
    query: {
      duplicate: job.job_id,
      language_pair: job.language_pair,
      document_type: job.document_type
    }
  })
}
</script>

<style scoped>
/* 🎨 基礎容器 */
.workflow-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
  background: #f8fafc;
  min-height: 100vh;
}

/* 🎨 頁面標題 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  padding: 32px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.25);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 24px;
}

.header-icon {
  font-size: 56px;
  width: 88px;
  height: 88px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.header-content h1 {
  font-size: 28px;
  font-weight: 700;
  color: white;
  margin: 0 0 8px 0;
}

.subtitle {
  font-size: 15px;
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.btn-refresh,
.btn-new {
  padding: 12px 24px;
  background: white;
  color: #667eea;
  border: none;
  border-radius: 8px;
  font-weight: 700;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.3s;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  display: inline-block;
}

.btn-refresh:hover,
.btn-new:hover {
  background: #f8f9ff;
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
}

/* 🎨 篩選器區域 */
.filters-section {
  background: white;
  border-radius: 16px;
  border: 2px solid #e2e8f0;
  padding: 24px;
  margin-bottom: 24px;
}

.filters-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

.filter-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-label {
  font-size: 14px;
  font-weight: 600;
  color: #475569;
}

.filter-input,
.filter-select {
  padding: 12px 16px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.3s;
}

.filter-input:focus,
.filter-select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

/* 🎨 載入狀態 */
.loading-state {
  text-align: center;
  padding: 80px 20px;
  background: white;
  border-radius: 16px;
  border: 2px solid #e2e8f0;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #f3f4f6;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 🎨 空狀態 */
.empty-state {
  text-align: center;
  padding: 80px 20px;
  background: white;
  border-radius: 16px;
  border: 2px dashed #e2e8f0;
}

.empty-icon {
  font-size: 80px;
  margin-bottom: 24px;
  opacity: 0.5;
}

.empty-state h3 {
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 12px 0;
}

.empty-state p {
  font-size: 15px;
  color: #64748b;
  margin: 0 0 24px 0;
}

.btn-start {
  display: inline-block;
  padding: 16px 32px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.btn-start:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(102, 126, 234, 0.4);
}

/* 🎨 工作區域 */
.jobs-section {
  background: white;
  border-radius: 16px;
  border: 2px solid #e2e8f0;
  padding: 32px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid #f1f5f9;
}

.section-header h3 {
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

.job-count {
  font-size: 14px;
  color: #64748b;
  font-weight: 600;
  padding: 6px 16px;
  background: #f8fafc;
  border-radius: 12px;
}

/* 🎨 工作列表 */
.job-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 20px;
}

.job-card {
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s;
}

.job-card:hover {
  border-color: #667eea;
  box-shadow: 0 8px 16px rgba(102, 126, 234, 0.15);
  transform: translateY(-4px);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  background: linear-gradient(135deg, #f8f9ff 0%, #f0f4ff 100%);
  border-bottom: 2px solid #e2e8f0;
}

.job-id-badge {
  font-size: 13px;
  font-family: 'Monaco', 'Courier New', monospace;
  color: #667eea;
  padding: 6px 12px;
  background: white;
  border-radius: 6px;
  font-weight: 700;
}

.status-badge {
  padding: 6px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 700;
}

.status-success {
  background: #d1fae5;
  color: #065f46;
}

.status-warning {
  background: #fef3c7;
  color: #92400e;
}

.status-error {
  background: #fee2e2;
  color: #991b1b;
}

.card-body {
  padding: 24px;
}

.job-title {
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 16px 0;
}

.job-info {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-label {
  font-size: 12px;
  color: #64748b;
  font-weight: 600;
}

.info-value {
  font-size: 15px;
  color: #1e293b;
  font-weight: 600;
}

.quality-score {
  color: #10b981;
}

.job-meta {
  padding-top: 12px;
  border-top: 1px solid #f1f5f9;
}

.meta-item {
  font-size: 13px;
  color: #64748b;
}

.card-footer {
  display: flex;
  gap: 8px;
  padding: 16px 24px;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
}

.btn-action {
  flex: 1;
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-view {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-download {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
}

.btn-duplicate {
  background: linear-gradient(135deg, #64748b 0%, #475569 100%);
  color: white;
}

.btn-action:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

/* 🎨 響應式 */
@media (max-width: 1200px) {
  .filters-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .job-list {
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 20px;
  }

  .header-left {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-actions {
    width: 100%;
    flex-direction: column;
  }

  .btn-refresh,
  .btn-new {
    width: 100%;
    text-align: center;
  }

  .filters-grid {
    grid-template-columns: 1fr;
  }

  .job-list {
    grid-template-columns: 1fr;
  }

  .job-info {
    grid-template-columns: 1fr;
  }
}
</style>
