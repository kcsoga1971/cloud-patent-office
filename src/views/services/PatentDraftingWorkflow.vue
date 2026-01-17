<!-- src/views/services/PatentDraftingWorkflow.vue -->
<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { supabase } from '../../supabase'
import { useRouter } from 'vue-router'
import JobCard from '../../components/workflow/JobCard.vue'
import ServiceTips from '../../components/ServiceTips.vue'

const router = useRouter()
const allJobs = ref([])
const activeFilter = ref('all')
const showConfirmModal = ref(false)
const isLoading = ref(false)

// ========== 載入案件 ==========
const loadAllJobs = async () => {
  try {
    isLoading.value = true
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('❌ 未登入')
      return
    }

    const { data, error } = await supabase
      .from('saas_jobs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error
    
    allJobs.value = data || []
    console.log('✅ 已載入', data.length, '個案件')
    
  } catch (error) {
    console.error('❌ 載入案件失敗:', error)
  } finally {
    isLoading.value = false
  }
}

// ========== 統計資料 ==========
const stats = computed(() => {
  const jobs = allJobs.value
  
  return {
    total: jobs.length,
    pending_draft: jobs.filter(j => 
      j.phase === 'phase1_completed' && 
      j.status === 'completed'
    ).length,
    draft_done: jobs.filter(j => 
      j.phase === 'phase2_completed' && 
      j.status === 'completed'
    ).length,
    draft_checked: jobs.filter(j => 
      j.phase === 'phase2_completed' && 
      j.status === 'checked'
    ).length,
    revision_done: jobs.filter(j => 
      j.phase === 'phase4_revised' &&
      j.status === 'completed'
    ).length,
    revision_checked: jobs.filter(j => 
      j.phase === 'phase4_revised' &&
      j.status === 'checked'
    ).length,
    filed: jobs.filter(j => 
      j.phase === 'phase6_filed' && 
      j.status === 'filed'
    ).length
  }
})

// ========== 過濾案件邏輯 ==========
const filteredJobs = computed(() => {
  if (activeFilter.value === 'all') {
    return allJobs.value
  }
  
  return allJobs.value.filter(job => {
    const { phase, status } = job
    
    switch (activeFilter.value) {
      case 'pending_draft':
        return phase === 'phase1_completed' && status === 'completed'
      case 'draft_done':
        return phase === 'phase2_completed' && status === 'completed'
      case 'draft_checked':
        return phase === 'phase2_completed' && status === 'checked'
      case 'revision_done':
        return phase === 'phase4_revised' && status === 'completed'
      case 'revision_checked':
        return phase === 'phase4_revised' && status === 'checked'
      case 'filed':
        return phase === 'phase6_filed' && status === 'filed'
      default:
        return true
    }
  })
})

// ========== 初始化 ==========
onMounted(() => {
  console.log('🚀 PatentDraftingWorkflow 已掛載')
  loadAllJobs()
})

// ========== 導航函數 ==========
const goToPhase2 = (jobId) => {
  router.push({
    path: '/services/drafting',
    query: { job_id: jobId, phase: '2' }
  })
}

const goToRevision = (jobId) => {
  router.push(`/services/revision/${jobId}`)
}

const goToCheck = (jobId) => {
  router.push(`/services/qc/${jobId}`)
}

const goToExport = (jobId) => {
  router.push({
    path: '/services/drafting',
    query: { job_id: jobId, phase: '3' }
  })
}

const startNewDraft = () => {
  router.push('/services/drafting')
}

const handleJobUpdated = async () => {
  console.log('🔄 案件已更新,重新載入清單')
  await loadAllJobs()
}

const goToSubmission = (jobId) => {
  router.push(`/services/submission/${jobId}`)
}
</script>

<template>
  <div class="workflow-container">
    <!-- 🎨 風格 B：漸層標題區 -->
    <div class="page-header">
      <div class="header-icon">📋</div>
      <div class="header-content">
        <h1>專利撰寫工作流程 (Patent Drafting)</h1>
        <p class="subtitle">AI 智能協助專利說明書撰寫、修訂與品質檢查</p>
      </div>
      <div class="header-actions">
        <button @click="loadAllJobs" class="btn-refresh">
          🔄 重新整理
        </button>
        <button @click="startNewDraft" class="btn-new">
          ➕ 開始新案件
        </button>
      </div>
    </div>

    <!-- 🎨 風格 B：統計卡片區 -->
    <div class="stats-container">
      <!-- 全部案件（大卡片） -->
      <div 
        class="stat-card-large" 
        :class="{ active: activeFilter === 'all' }"
        @click="activeFilter = 'all'"
      >
        <div class="large-icon">📊</div>
        <div class="large-content">
          <span class="large-value">{{ stats.total }}</span>
          <span class="large-label">全部案件</span>
        </div>
      </div>

      <!-- 初稿階段 -->
      <div class="stat-section">
        <h4 class="section-title">📝 初稿階段</h4>
        <div class="stat-grid">
          <div 
            class="stat-card draft-pending" 
            :class="{ active: activeFilter === 'pending_draft' }"
            @click="activeFilter = 'pending_draft'"
          >
            <div class="card-icon">⏳</div>
            <div class="card-content">
              <span class="card-value">{{ stats.pending_draft }}</span>
              <span class="card-label">待撰寫初稿</span>
            </div>
          </div>

          <div 
            class="stat-card draft-done" 
            :class="{ active: activeFilter === 'draft_done' }"
            @click="activeFilter = 'draft_done'"
          >
            <div class="card-icon">📄</div>
            <div class="card-content">
              <span class="card-value">{{ stats.draft_done }}</span>
              <span class="card-label">初稿完成</span>
            </div>
          </div>

          <div 
            class="stat-card draft-checked" 
            :class="{ active: activeFilter === 'draft_checked' }"
            @click="activeFilter = 'draft_checked'"
          >
            <div class="card-icon">✅</div>
            <div class="card-content">
              <span class="card-value">{{ stats.draft_checked }}</span>
              <span class="card-label">初稿已檢查</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 修訂與送件 -->
      <div class="stat-section">
        <h4 class="section-title">🔄 修訂與送件</h4>
        <div class="stat-grid">
          <div 
            class="stat-card revision-done" 
            :class="{ active: activeFilter === 'revision_done' }"
            @click="activeFilter = 'revision_done'"
          >
            <div class="card-icon">✏️</div>
            <div class="card-content">
              <span class="card-value">{{ stats.revision_done }}</span>
              <span class="card-label">修訂稿完成</span>
            </div>
          </div>

          <div 
            class="stat-card revision-checked" 
            :class="{ active: activeFilter === 'revision_checked' }"
            @click="activeFilter = 'revision_checked'"
          >
            <div class="card-icon">✅</div>
            <div class="card-content">
              <span class="card-value">{{ stats.revision_checked }}</span>
              <span class="card-label">修訂稿已檢查</span>
            </div>
          </div>

          <div 
            class="stat-card filed" 
            :class="{ active: activeFilter === 'filed' }"
            @click="activeFilter = 'filed'"
          >
            <div class="card-icon">🗂️</div>
            <div class="card-content">
              <span class="card-value">{{ stats.filed }}</span>
              <span class="card-label">已送件</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 載入中 -->
    <div v-if="isLoading" class="loading-state">
      <div class="spinner"></div>
      <p>載入中...</p>
    </div>
    
    <!-- 案件清單 -->
    <div v-else-if="filteredJobs.length > 0" class="jobs-section">
      <div class="section-header">
        <h3>📋 案件列表</h3>
        <span class="job-count">共 {{ filteredJobs.length }} 個案件</span>
      </div>

      <div class="jobs-list">
        <JobCard 
          v-for="job in filteredJobs" 
          :key="job.id"
          :job="job"
          @continue-phase2="goToPhase2"
          @revise="goToRevision"
          @check="goToCheck"
          @export="goToExport"
          @updated="handleJobUpdated"
          @prepare-submission="goToSubmission"
        />
      </div>
    </div>
    
    <!-- 空狀態 -->
    <div v-else class="empty-state">
      <div class="empty-icon">📭</div>
      <h3>在此分類下沒有找到案件</h3>
      <button v-if="activeFilter !== 'all'" @click="activeFilter = 'all'" class="btn-show-all">
        顯示全部案件
      </button>
    </div>

    <!-- ServiceTips -->
    <ServiceTips type="drafting" />
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

/* ========== 🎨 統計卡片區 ========== */
.stats-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
  margin-bottom: 32px;
}

/* 全部案件（大卡片） */
.stat-card-large {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 32px;
  background: white;
  border-radius: 16px;
  border: 2px solid #e2e8f0;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.stat-card-large:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
}

.stat-card-large.active {
  border-color: #667eea;
  background: linear-gradient(135deg, #f8f9ff 0%, #f0f4ff 100%);
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.2);
}

.large-icon {
  font-size: 48px;
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.large-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.large-value {
  font-size: 48px;
  font-weight: 700;
  color: #1e293b;
  line-height: 1;
}

.large-label {
  font-size: 18px;
  color: #64748b;
  font-weight: 600;
}

/* 分組區域 */
.stat-section {
  background: white;
  padding: 24px;
  border-radius: 16px;
  border: 2px solid #e2e8f0;
}

.section-title {
  margin: 0 0 20px 0;
  font-size: 18px;
  color: #1e293b;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

/* 小卡片 */
.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: #f8fafc;
  border-radius: 12px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.3s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.card-icon {
  font-size: 32px;
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.card-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.card-value {
  font-size: 28px;
  font-weight: 700;
  color: #1e293b;
  line-height: 1;
}

.card-label {
  font-size: 13px;
  color: #64748b;
  font-weight: 600;
}

/* 不同狀態的顏色 */
.stat-card.draft-pending.active {
  background: #fef3c7;
  border-color: #f59e0b;
}

.stat-card.draft-done.active {
  background: #e0e7ff;
  border-color: #6366f1;
}

.stat-card.draft-checked.active {
  background: #d1fae5;
  border-color: #10b981;
}

.stat-card.revision-done.active {
  background: #fed7aa;
  border-color: #f97316;
}

.stat-card.revision-checked.active {
  background: #bbf7d0;
  border-color: #22c55e;
}

.stat-card.filed.active {
  background: #e2e8f0;
  border-color: #64748b;
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

.jobs-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
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
  margin: 0 0 24px 0;
}

.btn-show-all {
  padding: 12px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-show-all:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

/* ========== 響應式 ========== */
@media (max-width: 1200px) {
  .stat-grid {
    grid-template-columns: repeat(2, 1fr);
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

  .stat-card-large {
    flex-direction: column;
    text-align: center;
  }

  .stat-grid {
    grid-template-columns: 1fr;
  }

  .stat-card {
    justify-content: center;
  }
}
</style>
