<!-- src/views/services/design-around/components/DesignAroundList.vue -->
<script setup>
import { ref, onMounted, computed } from 'vue'
import { supabase } from '@/supabase'
import { useUserStore } from '@/stores/user'

const emit = defineEmits(['create', 'select'])
const userStore = useUserStore()
const jobs = ref([])
const isLoading = ref(false)
const activeFilter = ref('all')

const loadJobs = async () => {
  isLoading.value = true
  try {
    const { data, error } = await supabase
      .from('saas_jobs')
      .select('*')
      .eq('user_id', userStore.user?.id)
      .eq('job_type', 'design_around')
      .order('created_at', { ascending: false })

    if (error) throw error
    jobs.value = data || []
  } catch (e) {
    console.error('載入失敗:', e)
  } finally {
    isLoading.value = false
  }
}

const stats = computed(() => ({
  total: jobs.value.length,
  processing: jobs.value.filter(j => ['processing', 'pending'].includes(j.status)).length,
  completed: jobs.value.filter(j => j.status === 'completed').length
}))

const filteredJobs = computed(() => {
  if (activeFilter.value === 'all') return jobs.value
  if (activeFilter.value === 'processing') {
    return jobs.value.filter(j => ['processing', 'pending'].includes(j.status))
  }
  if (activeFilter.value === 'completed') {
    return jobs.value.filter(j => j.status === 'completed')
  }
  return jobs.value
})

const getStatusInfo = (job) => {
  const map = {
    'pending': { label: '待處理', icon: '⏳', class: 'status-info' },
    'processing': { label: '分析中', icon: '⏳', class: 'status-warning' },
    'pending_approval': { label: '待審核', icon: '📋', class: 'status-info' },
    'completed': { label: '已完成', icon: '✅', class: 'status-success' },
    'failed': { label: '失敗', icon: '❌', class: 'status-error' }
  }
  return map[job.status] || { label: job.status, icon: '📝', class: 'status-default' }
}

const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-TW', { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit' 
  })
}

const getJobTitle = (job) => {
  return job.input_data?.project_name || '未命名專案'
}

const getPhaseInfo = (phase) => {
  const map = {
    'init': { label: '初始化', icon: '🚀', color: '#94a3b8' },
    'design_around_patent_collection': { label: '資料收集', icon: '📋', color: '#3b82f6' },
    'design_around_patent_analysis': { label: '深度分析', icon: '🔍', color: '#8b5cf6' },
    'design_around_portfolio_analysis': { label: '組合策略', icon: '🎯', color: '#f59e0b' },
    'design_around_ideation': { label: '方案生成', icon: '💡', color: '#10b981' },
    'design_around_risk_evaluation': { label: '風險評估', icon: '⚖️', color: '#ef4444' },
    'completed': { label: '已完成', icon: '✅', color: '#22c55e' }
  }
  return map[phase] || { label: phase, icon: '📝', color: '#64748b' }
}

onMounted(() => {
  loadJobs()
})
</script>

<template>
  <div class="workflow-container">
    <!-- 🎨 風格 B：漸層標題區 -->
    <div class="page-header">
      <div class="header-icon">🛡️</div>
      <div class="header-content">
        <h1>專利迴避設計 (Design Around)</h1>
        <p class="subtitle">AI 智能分析專利風險並生成創新迴避方案</p>
      </div>
      <div class="header-actions">
        <button @click="loadJobs" class="btn-refresh">
          🔄 重新整理
        </button>
        <button @click="emit('create')" class="btn-new">
          ➕ 新建專案
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
          <span class="stat-label">全部專案</span>
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
          <span class="stat-label">進行中</span>
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

    <!-- 專案列表 -->
    <div v-else-if="filteredJobs.length > 0" class="jobs-section">
      <div class="section-header">
        <h3>📋 迴避設計專案列表</h3>
        <span class="job-count">共 {{ filteredJobs.length }} 個專案</span>
      </div>

      <div class="job-list">
        <div 
          v-for="job in filteredJobs" 
          :key="job.id" 
          class="job-card"
          @click="emit('select', job.id)"
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

          <!-- 階段標籤 -->
          <div 
            class="phase-badge" 
            :style="{ 
              background: `${getPhaseInfo(job.current_phase).color}15`,
              color: getPhaseInfo(job.current_phase).color,
              borderColor: `${getPhaseInfo(job.current_phase).color}40`
            }"
          >
            <span class="phase-icon">{{ getPhaseInfo(job.current_phase).icon }}</span>
            <span class="phase-label">{{ getPhaseInfo(job.current_phase).label }}</span>
          </div>

          <div class="job-meta">
            <span class="meta-item">
              📅 {{ formatDate(job.created_at) }}
            </span>
          </div>

          <div class="card-footer">
            <button class="btn-view">
              查看詳情 →
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 空狀態 -->
    <div v-else class="empty-state">
      <div class="empty-icon">📭</div>
      <h3>尚無迴避設計專案</h3>
      <p>開始您的第一個專利迴避分析</p>
      <button @click="emit('create')" class="btn-start">
        開始第一個專案
      </button>
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

.status-badge.status-info {
  background: #dbeafe;
  color: #1e40af;
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

/* ========== 🎨 階段標籤（新增） ========== */
.phase-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid;
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 12px;
}

.phase-icon {
  font-size: 16px;
}

.phase-label {
  letter-spacing: 0.5px;
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



