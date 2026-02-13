<!-- src/views/services/InvalidationWorkflow.vue -->
<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../../supabase'
import { useUserStore } from '../../stores/user'
import { formatDate } from '../../utils/formatters'
import ServiceTips from '../../components/ServiceTips.vue'

const router = useRouter()
const userStore = useUserStore()

const allJobs = ref([])
const isLoading = ref(true)
const activeFilter = ref('all')

onMounted(async () => {
  await loadJobs()
})

const loadJobs = async () => {
  isLoading.value = true
  try {
    const { data, error } = await supabase
      .from('saas_jobs')
      .select('*')
      .eq('user_id', userStore.user.id)
      .eq('job_type', 'patent_invalidation')
      .order('updated_at', { ascending: false })
    
    if (error) throw error
    allJobs.value = data || []
  } catch (err) {
    console.error('❌ 載入失敗:', err)
  } finally {
    isLoading.value = false
  }
}

const filteredJobs = computed(() => {
  if (activeFilter.value === 'all') return allJobs.value
  return allJobs.value.filter(job => {
    if (activeFilter.value === 'processing') return job.status === 'pending'
    if (activeFilter.value === 'completed') return job.status === 'completed'
    return true
  })
})

const stats = computed(() => {
  const jobs = allJobs.value
  return {
    total: jobs.length,
    processing: jobs.filter(j => j.status === 'pending').length,
    completed: jobs.filter(j => j.status === 'completed').length
  }
})

const goToDetail = (jobId) => {
  router.push({ path: '/services/invalidation', query: { job_id: jobId } })
}

const startNewJob = () => {
  router.push('/services/invalidation')
}

const getStatusInfo = (job) => {
  if (job.status === 'completed') return { label: '已完成', icon: '✅', class: 'status-success' }
  if (job.status === 'pending') return { label: '分析中', icon: '⏳', class: 'status-warning' }
  if (job.status === 'failed') return { label: '失敗', icon: '❌', class: 'status-error' }
  return { label: '處理中', icon: '📝', class: 'status-default' }
}

const getJobTitle = (job) => {
  const input = job.input_data || {}
  
  let targetDisplay = '未命名專利'
  
  // 🎯 優先顯示專利號
  if (input.target_patent_number) {
    targetDisplay = input.target_patent_number
  } 
  // 🎯 其次顯示檔案路徑中的檔案名
  else if (input.target_patent?.file_path) {
    const fileName = input.target_patent.file_path.split('/').pop()
    targetDisplay = fileName.replace('.pdf', '')
  }
  // 🎯 最後嘗試從 target_patent 物件取得 patent_number
  else if (input.target_patent?.patent_number) {
    targetDisplay = input.target_patent.patent_number
  }
  
  const evidenceCount = input.evidence_patents?.length || 0
  return `${targetDisplay} (${evidenceCount} 篇證據)`
}

// 🆕 取得證據資訊
const getEvidenceInfo = (job) => {
  const input = job.input_data || {}
  const evidences = input.evidence_patents || []
  
  if (evidences.length === 0) return ''
  
  // 取前 3 篇證據
  const displayEvidences = evidences.slice(0, 3).map(e => {
    if (e.patent_number) return e.patent_number
    if (e.file_path) {
      const fileName = e.file_path.split('/').pop()
      return fileName.replace('.pdf', '')
    }
    return '未命名'
  })
  
  const moreCount = evidences.length - 3
  const moreText = moreCount > 0 ? ` +${moreCount}篇` : ''
  
  return displayEvidences.join(', ') + moreText
}

const getJobDescription = (job) => {
  const result = job.result_data
  if (result && result.conclusion) {
    const probability = ((result.conclusion.success_probability || 0) * 100).toFixed(0)
    return `舉發成功機率：${probability}%`
  }
  return '分析中...'
}

const TIMEOUT_MINUTES = 15

const isJobTimeout = (job) => {
  if (job.status !== 'pending' && job.status !== 'processing') {
    return false
  }
  
  const createdAt = new Date(job.created_at)
  const now = new Date()
  const elapsedMinutes = (now - createdAt) / 1000 / 60
  
  return elapsedMinutes > TIMEOUT_MINUTES
}

const getElapsedTime = (job) => {
  const createdAt = new Date(job.created_at)
  const now = new Date()
  const elapsedMinutes = (now - createdAt) / 1000 / 60
  
  if (elapsedMinutes > 60) {
    return `${(elapsedMinutes / 60).toFixed(1)} 小時`
  }
  return `${elapsedMinutes.toFixed(0)} 分鐘`
}

// 🆕 刪除案件
const deleteJob = async (jobId, event) => {
  // 阻止事件冒泡 (避免觸發 goToDetail)
  event.stopPropagation()
  
  if (!confirm('⚠️ 確定要刪除此案件嗎？\n\n此操作無法復原，所有相關資料將被永久刪除。')) {
    return
  }
  
  try {
    console.log('🗑️ 開始刪除案件:', jobId)
    
    // 1. 刪除 saas_jobs 記錄
    const { error: jobError } = await supabase
      .from('saas_jobs')
      .delete()
      .eq('id', jobId)
      .eq('user_id', userStore.user.id) // 🔒 確保只能刪除自己的案件
    
    if (jobError) {
      throw new Error('刪除案件失敗: ' + jobError.message)
    }
    
    // 2. 刪除 patent_invalidation_analyses 記錄
    const { error: analysisError } = await supabase
      .from('patent_invalidation_analyses')
      .delete()
      .eq('job_id', jobId)
      .eq('user_id', userStore.user.id) // 🔒 確保只能刪除自己的記錄
    
    if (analysisError) {
      console.warn('⚠️ 刪除分析記錄失敗:', analysisError.message)
      // 不拋出錯誤,因為主要記錄已刪除
    }
    
    console.log('✅ 案件刪除成功')
    
    // 3. 重新載入列表
    await loadJobs()
    
    alert('✅ 案件已刪除')
    
  } catch (error) {
    console.error('❌ 刪除失敗:', error)
    alert('刪除失敗: ' + error.message)
  }
}

</script>

<template>
  <div class="workflow-container">
    <!-- 頁面標題 -->
    <div class="page-header">
      <div class="header-left">
        <div class="header-icon">⚔️</div>
        <div class="header-content">
          <h1>專利舉發分析 (Invalidation)</h1>
          <p class="subtitle">自動化生成專利無效/舉發理由書與證據比對表 (Claim Chart)</p>
        </div>
      </div>
      <div class="header-actions">
        <button @click="loadJobs" class="btn-refresh">
          🔄 重新整理
        </button>
        <button @click="startNewJob" class="btn-new">
          ➕ 新增舉發案
        </button>
      </div>
    </div>

    <!-- 統計卡片 -->
    <div class="stats-grid">
      <div 
        class="stat-card total" 
        :class="{ active: activeFilter === 'all' }" 
        @click="activeFilter = 'all'"
      >
        <div class="stat-icon">📊</div>
        <div class="stat-content">
          <span class="stat-value">{{ stats.total }}</span>
          <span class="stat-label">全部案件</span>
        </div>
      </div>

      <div 
        class="stat-card processing" 
        :class="{ active: activeFilter === 'processing' }" 
        @click="activeFilter = 'processing'"
      >
        <div class="stat-icon">⏳</div>
        <div class="stat-content">
          <span class="stat-value">{{ stats.processing }}</span>
          <span class="stat-label">分析中</span>
        </div>
      </div>

      <div 
        class="stat-card completed" 
        :class="{ active: activeFilter === 'completed' }" 
        @click="activeFilter = 'completed'"
      >
        <div class="stat-icon">✅</div>
        <div class="stat-content">
          <span class="stat-value">{{ stats.completed }}</span>
          <span class="stat-label">已完成</span>
        </div>
      </div>
    </div>

    <!-- 載入中 -->
    <div v-if="isLoading" class="loading-state">
      <div class="spinner"></div>
      <p>載入中...</p>
    </div>

    <!-- 案件列表 -->
    <div v-else-if="filteredJobs.length > 0" class="jobs-section">
      <div class="section-header">
        <h3>📋 案件列表</h3>
        <span class="job-count">共 {{ filteredJobs.length }} 個案件</span>
      </div>

      <div class="job-list">
        <div 
          v-for="job in filteredJobs" 
          :key="job.id" 
          class="job-card"
          :class="{ 'job-timeout': isJobTimeout(job) }"
          @click="goToDetail(job.id)"
        >
          <div class="card-header">
            <div class="job-id-badge">
              #{{ job.id.slice(0, 8) }}
            </div>
            <div class="status-badge" :class="getStatusInfo(job).class">
              <span class="status-icon">{{ getStatusInfo(job).icon }}</span>
              <span class="status-text">{{ getStatusInfo(job).label }}</span>
            </div>
          </div>
          
          <h3 class="job-title">{{ getJobTitle(job) }}</h3>
          
          <!-- 🆕 顯示證據資訊 -->
          <div v-if="getEvidenceInfo(job)" class="evidence-info">
            📄 證據: {{ getEvidenceInfo(job) }}
          </div>

          <div class="job-description">
            {{ getJobDescription(job) }}
          </div>

          <!-- 🆕 超時警告 -->
          <div v-if="isJobTimeout(job)" class="timeout-warning">
            ⚠️ 此案件可能已超時 (已執行 {{ getElapsedTime(job) }})
            <div class="timeout-hint">
              可能原因：n8n 執行失敗、PDF 解析失敗或 API 超時
            </div>
          </div>

          <div class="job-meta">
            <span class="meta-item">
              📅 {{ formatDate(job.created_at) }}
            </span>
            <span v-if="job.updated_at !== job.created_at" class="meta-item">
              🔄 {{ formatDate(job.updated_at) }}
            </span>
          </div>

          <div class="card-footer">
            <button class="btn-view">
              查看理由書 →
            </button>
    
            <!-- 🆕 刪除按鈕 -->
            <button 
              class="btn-delete"
              @click="deleteJob(job.id, $event)"
              title="刪除此案件 (無法復原)"
            >
              🗑️
            </button>

          </div>
        </div>
      </div>
    </div>

    <!-- 空狀態 -->
    <div v-else class="empty-state">
      <div class="empty-icon">📭</div>
      <h3>尚無舉發分析案件</h3>
      <p>開始您的第一個專利舉發分析</p>
      <button @click="startNewJob" class="btn-start">
        開始第一個分析
      </button>
    </div>

    <!-- ServiceTips -->
    <ServiceTips type="invalidation" />
  </div>
</template>

<style scoped>
.workflow-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
}

/* 頁面標題 */
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

.btn-refresh {
  padding: 12px 24px;
  background: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  color: #667eea;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-refresh:hover {
  background: #f8f9ff;
  transform: translateY(-2px);
}

.btn-new {
  padding: 12px 24px;
  background: white;
  border: none;
  border-radius: 8px;
  color: #667eea;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.btn-new:hover {
  background: #f8f9ff;
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
}

/* 統計卡片 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 32px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 24px;
  background: white;
  border-radius: 12px;
  border: 2px solid #e2e8f0;
  cursor: pointer;
  transition: all 0.3s;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
}

.stat-card.active {
  border-color: #667eea;
  background: linear-gradient(135deg, #f8f9ff 0%, #f0f4ff 100%);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
}

.stat-card.total .stat-icon {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.stat-card.processing .stat-icon {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
}

.stat-card.completed .stat-icon {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
}

.stat-icon {
  font-size: 32px;
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.stat-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: #1e293b;
}

.stat-label {
  font-size: 14px;
  color: #64748b;
  font-weight: 500;
}

/* 載入狀態 */
.loading-state {
  text-align: center;
  padding: 80px 20px;
  color: #94a3b8;
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

/* 案件區域 */
.jobs-section {
  background: white;
  border-radius: 16px;
  padding: 32px;
  border: 2px solid #e2e8f0;
  margin-bottom: 32px;
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

/* 案件列表 */
.job-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}

.job-card {
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  padding: 24px;
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
  margin-bottom: 16px;
}

.job-id-badge {
  font-size: 12px;
  font-family: 'Monaco', 'Courier New', monospace;
  color: #667eea;
  padding: 6px 12px;
  background: #f0f4ff;
  border-radius: 6px;
  font-weight: 700;
}

.status-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
}

.status-badge.status-success {
  background: #d1fae5;
  color: #065f46;
}

.status-badge.status-warning {
  background: #fef3c7;
  color: #92400e;
}

.status-badge.status-error {
  background: #fee2e2;
  color: #991b1b;
}

.status-badge.status-default {
  background: #f1f5f9;
  color: #475569;
}

.status-icon {
  font-size: 14px;
}

.job-title {
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 12px 0;
  line-height: 1.4;
}

.job-description {
  font-size: 14px;
  color: #10b981;
  font-weight: 600;
  margin-bottom: 16px;
  padding: 12px;
  background: #f0fdf4;
  border-radius: 8px;
  border: 1px solid #d1fae5;
}

.job-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
  padding-top: 16px;
  border-top: 1px solid #f1f5f9;
}

.meta-item {
  font-size: 13px;
  color: #64748b;
}

.card-footer {
  text-align: right;
}

.btn-view {
  background: none;
  border: none;
  color: #667eea;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-view:hover {
  color: #5568d3;
}

/* 空狀態 */
.empty-state {
  text-align: center;
  padding: 80px 20px;
  background: white;
  border-radius: 16px;
  border: 2px dashed #e2e8f0;
  margin-bottom: 32px;
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
  padding: 16px 32px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.btn-start:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(102, 126, 234, 0.4);
}

/* 響應式 */
@media (max-width: 1200px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .job-list {
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
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
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .job-list {
    grid-template-columns: 1fr;
  }

  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
}

/* 🆕 超時警告 */
.timeout-warning {
  background: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 8px;
  padding: 12px;
  margin: 12px 0;
  font-size: 13px;
  color: #856404;
  line-height: 1.5;
}

.timeout-hint {
  margin-top: 4px;
  font-size: 12px;
  opacity: 0.8;
}

/* 🆕 證據資訊 */
.evidence-info {
  font-size: 13px;
  color: #64748b;
  margin-bottom: 12px;
  padding: 10px 12px;
  background: #f8fafc;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.job-meta {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
  font-size: 12px;
  color: #999;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.card-footer {
  display: flex;
  justify-content: space-between; /* ✅ 保持 space-between */
  align-items: center;
  gap: 12px; /* 🔧 增加間距 */
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}

.btn-view {
  flex: 1;
  padding: 8px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-view:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

/* 空狀態 */
.empty-state {
  text-align: center;
  padding: 80px 20px;
  background: white;
  border-radius: 12px;
  border: 2px dashed #e0e0e0;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.empty-state h3 {
  margin: 0 0 8px 0;
  font-size: 20px;
  color: #333;
}

.empty-state p {
  margin: 0 0 24px 0;
  color: #666;
}

.btn-start {
  padding: 12px 32px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-start:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

/* 🆕 刪除按鈕 */
.btn-delete {
  padding: 8px 16px; /* 🔧 增加寬度 */
  background: #f44336;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px; /* 🔧 改為 14px */
  font-weight: 500; /* 🆕 新增 */
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px; /* 🆕 圖示與文字間距 */
  white-space: nowrap; /* 🆕 防止換行 */
}

.btn-delete:hover {
  background: #d32f2f;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(244, 67, 54, 0.3);
}

.btn-delete:active {
  transform: translateY(0);
}

/* 🆕 超時案件樣式 */
.job-card.job-timeout {
  border-color: #ff9800;
  background: #fff8f0;
}

.job-card.job-timeout:hover {
  border-color: #f57c00;
  box-shadow: 0 8px 16px rgba(255, 152, 0, 0.2);
}

</style>
