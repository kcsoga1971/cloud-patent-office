<!-- src/views/services/ValuationWorkflow.vue -->
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
const showDeleteModal = ref(false)
const deleteJobId = ref(null)
const isDeleting = ref(false)

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
      .eq('job_type', 'patent_valuation')
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
  router.push({ path: '/services/valuation', query: { job_id: jobId } })
}

const startNewJob = () => {
  router.push('/services/valuation')
}

const getStatusInfo = (job) => {
  if (job.status === 'completed') return { label: '已完成', icon: '✅', class: 'status-success' }
  if (job.status === 'pending') return { label: '估算中', icon: '⏳', class: 'status-warning' }
  if (job.status === 'failed') return { label: '失敗', icon: '❌', class: 'status-error' }
  return { label: '處理中', icon: '📝', class: 'status-default' }
}

const getJobTitle = (job) => {
  const patentNo = job.input_data?.patent_number || '未命名案件'
  return `${patentNo}`
}

const getValuationResult = (job) => {
  if (job.status !== 'completed' || !job.result_data) return null
  
  let data = job.result_data
  if (typeof data === 'string') {
    try { data = JSON.parse(data) } catch (e) { return null }
  }
  
  return data.valuation_result?.estimated_value_avg || null
}

const confirmDeleteJob = (jobId) => {
  deleteJobId.value = jobId
  showDeleteModal.value = true
}

const deleteJob = async () => {
  if (!deleteJobId.value) return
  
  isDeleting.value = true
  try {
    const job = allJobs.value.find(j => j.id === deleteJobId.value)
    if (!job) throw new Error('找不到該案件')

    // If job is pending/failed and payment is reserved, refund credits
    if ((job.status === 'pending' || job.status === 'failed') && 
        job.payment_status === 'reserved' && 
        job.transaction_id) {
      console.log('🔄 退費中...')
      const { error: refundError } = await supabase.rpc('refund_credits', {
        p_transaction_id: job.transaction_id,
        p_reason: '用戶刪除案件'
      })
      if (refundError) {
        console.warn('退費失敗:', refundError)
        // Continue with deletion even if refund fails
      }
    }

    // Delete job from database
    const { error } = await supabase
      .from('saas_jobs')
      .delete()
      .eq('id', deleteJobId.value)
    
    if (error) throw error

    // Refresh the list
    await loadJobs()
    showDeleteModal.value = false
    deleteJobId.value = null
    
    console.log('✅ 案件刪除成功')
  } catch (err) {
    console.error('❌ 刪除失敗:', err)
    alert('刪除失敗: ' + err.message)
  } finally {
    isDeleting.value = false
  }
}
</script>

<template>
  <div class="workflow-container">
    <!-- 🎨 風格 B：漸層標題區 -->
    <div class="page-header">
      <div class="header-icon">💎</div>
      <div class="header-content">
        <h1>專利鑑價 (Patent Valuation)</h1>
        <p class="subtitle">AI 智能評估專利價值與市場潛力</p>
      </div>
      <div class="header-actions">
        <button @click="loadJobs" class="btn-refresh">
          🔄 重新整理
        </button>
        <button @click="startNewJob" class="btn-new">
          ➕ 新增鑑價
        </button>
      </div>
    </div>

    <!-- 🎨 風格 B：三大卡片 -->
    <div class="stats-grid">
      <div 
        class="stat-card all" 
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
          <span class="stat-label">估算中</span>
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
        <h3>📋 鑑價案件列表</h3>
        <span class="job-count">共 {{ filteredJobs.length }} 個案件</span>
      </div>

      <div class="job-list">
        <div 
          v-for="job in filteredJobs" 
          :key="job.id" 
          class="job-card"
          @click="goToDetail(job.id)"
        >
          <div class="card-header">
            <div class="job-id-badge">
              #{{ job.id.slice(0, 8) }}
            </div>
            <div class="card-header-right">
              <div class="status-badge" :class="getStatusInfo(job).class">
                <span class="status-icon">{{ getStatusInfo(job).icon }}</span>
                <span class="status-text">{{ getStatusInfo(job).label }}</span>
              </div>
              <button 
                @click.stop="confirmDeleteJob(job.id)" 
                class="btn-delete"
                title="刪除案件"
              >
                🗑️
              </button>
            </div>
          </div>
          
          <h3 class="job-title">{{ getJobTitle(job) }}</h3>

          <div class="job-meta">
            <span class="meta-item">
              📅 {{ formatDate(job.created_at) }}
            </span>
            <div v-if="getValuationResult(job)" class="valuation-tag">
              💵 估值：{{ getValuationResult(job) }}
            </div>
          </div>

          <div class="card-footer">
            <button class="btn-view">
              查看鑑價報告 →
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 空狀態 -->
    <div v-else class="empty-state">
      <div class="empty-icon">📭</div>
      <h3>尚無鑑價案件</h3>
      <p>開始您的第一個專利價值評估</p>
      <button @click="startNewJob" class="btn-start">
        開始第一個鑑價
      </button>
    </div>

    <!-- ServiceTips -->
    <ServiceTips type="valuation" />

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteModal" class="modal-overlay">
      <div class="modal-card">
        <div class="modal-header">
          <h3>🗑️ 刪除確認</h3>
          <button @click="showDeleteModal = false" class="btn-close">×</button>
        </div>
        <div class="modal-body">
          <p>確定要刪除此鑑價案件嗎？</p>
          <p class="warning-text">此操作無法復原。如果是未完成的案件且已預付點數，系統將自動退費。</p>
        </div>
        <div class="modal-footer">
          <button @click="showDeleteModal = false" class="btn-cancel">取消</button>
          <button 
            @click="deleteJob" 
            :disabled="isDeleting"
            class="btn-confirm-delete"
          >
            {{ isDeleting ? '刪除中...' : '確認刪除' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.workflow-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
}

/* ========== 🎨 風格 B：漸層標題 ========== */
.page-header {
  display: flex;
  align-items: center;
  gap: 24px;
  margin-bottom: 32px;
  padding: 32px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.25);
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

.header-content {
  flex: 1;
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

/* ========== 🎨 風格 B：三大統計卡片 ========== */
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

.stat-card.all .stat-icon {
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

/* ========== 載入狀態 ========== */
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

/* ========== 案件區域 ========== */
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

/* ========== 案件列表 ========== */
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

.card-header-right {
  display: flex;
  align-items: center;
  gap: 8px;
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
  margin: 0 0 16px 0;
  line-height: 1.4;
}

.job-meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
  padding-top: 16px;
  border-top: 1px solid #f1f5f9;
}

.meta-item {
  font-size: 13px;
  color: #64748b;
}

.valuation-tag {
  color: #065f46;
  font-weight: 700;
  background: #d1fae5;
  padding: 6px 12px;
  border-radius: 8px;
  display: inline-block;
  font-size: 13px;
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

.btn-delete {
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  opacity: 0.7;
  transition: all 0.3s;
}

.btn-delete:hover {
  opacity: 1;
  background: #fee2e2;
}

/* Delete Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 2px solid #f1f5f9;
}

.modal-header h3 {
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

.btn-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #64748b;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.3s;
}

.btn-close:hover {
  background: #f1f5f9;
  color: #1e293b;
}

.modal-body {
  margin-bottom: 24px;
}

.modal-body p {
  margin: 0 0 12px 0;
  color: #1e293b;
  line-height: 1.5;
}

.warning-text {
  font-size: 14px;
  color: #dc2626;
  background: #fef2f2;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid #fecaca;
}

.modal-footer {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn-cancel {
  padding: 12px 24px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  color: #64748b;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-cancel:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

.btn-confirm-delete {
  padding: 12px 24px;
  background: #dc2626;
  border: none;
  border-radius: 8px;
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-confirm-delete:hover {
  background: #b91c1c;
}

.btn-confirm-delete:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ========== 空狀態 ========== */
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

/* ========== 響應式 ========== */
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
</style>
