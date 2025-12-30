<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../../supabase'
import { useUserStore } from '../../stores/user'
import { formatDate } from '../../utils/formatters'

const router = useRouter()
const userStore = useUserStore()

// ========== 資料 ==========
const allJobs = ref([])
const isLoading = ref(true)
const activeFilter = ref('all') // 'all', 'processing', 'completed'

// ========== 載入案件 ==========
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
      .eq('job_type', 'patent_design_around') // 🎯 鎖定迴避設計類型
      .order('updated_at', { ascending: false })
    
    if (error) throw error
    allJobs.value = data || []
  } catch (err) {
    console.error('❌ 載入失敗:', err)
  } finally {
    isLoading.value = false
  }
}

// ========== 篩選邏輯 ==========
const filteredJobs = computed(() => {
  if (activeFilter.value === 'all') return allJobs.value
  return allJobs.value.filter(job => {
    if (activeFilter.value === 'processing') return job.status === 'pending' || job.status === 'analyzing'
    if (activeFilter.value === 'completed') return job.status === 'completed'
    return true
  })
})

// ========== 統計 ==========
const stats = computed(() => {
  const jobs = allJobs.value
  return {
    total: jobs.length,
    processing: jobs.filter(j => j.status === 'pending' || j.status === 'analyzing').length,
    completed: jobs.filter(j => j.status === 'completed').length
  }
})

// ========== 導航 ==========
const goToDetail = (jobId) => {
  router.push({ path: '/services/design-around', query: { job_id: jobId } })
}

const startNewJob = () => {
  router.push('/services/design-around')
}

// ========== 輔助顯示 ==========
const getStatusInfo = (job) => {
  if (job.status === 'completed') return { label: '✅ 分析完成', class: 'status-success' }
  if (job.status === 'pending') return { label: '⏳ AI 分析中', class: 'status-warning' }
  if (job.status === 'failed') return { label: '❌ 失敗', class: 'status-error' }
  return { label: '📝 處理中', class: 'status-default' }
}

const getJobTitle = (job) => {
  // 優先顯示目標專利案號，其次顯示使用者備註
  const targetId = job.input_data?.target_patent_number
  const note = job.input_data?.user_notes
  
  if (targetId) return `迴避目標：${targetId}`
  if (note) return note.length > 20 ? note.substring(0, 20) + '...' : note
  return '專利迴避設計專案'
}
</script>

<template>
  <div class="workflow-container">
    <div class="header">
      <div class="header-left">
        <h1>🛡️ 專利迴避設計管理</h1>
        <p class="subtitle">管理您的迴避設計專案，查看侵權風險與迴避策略</p>
      </div>
      <div class="header-actions">
        <button @click="loadJobs" class="btn-secondary">🔄 重新整理</button>
        <button @click="startNewJob" class="btn-new">➕ 新增迴避專案</button>
      </div>
    </div>

    <div class="dashboard-grid">
      <div class="stat-card" :class="{ active: activeFilter === 'all' }" @click="activeFilter = 'all'">
        <span class="stat-value">{{ stats.total }}</span>
        <span class="stat-label">全部專案</span>
      </div>
      <div class="stat-card orange" :class="{ active: activeFilter === 'processing' }" @click="activeFilter = 'processing'">
        <span class="stat-value">{{ stats.processing }}</span>
        <span class="stat-label">⏳ 分析中</span>
      </div>
      <div class="stat-card green" :class="{ active: activeFilter === 'completed' }" @click="activeFilter = 'completed'">
        <span class="stat-value">{{ stats.completed }}</span>
        <span class="stat-label">✅ 已完成</span>
      </div>
    </div>

    <div v-if="isLoading" class="loading">
      <div class="spinner"></div>
      <p>載入中...</p>
    </div>

    <div v-else-if="filteredJobs.length > 0" class="job-list">
      <div v-for="job in filteredJobs" :key="job.id" class="job-card" @click="goToDetail(job.id)">
        <div class="card-header">
          <div class="job-id-badge">
            <span v-if="job.my_patent_drafting_number">📁 {{ job.my_patent_drafting_number }}</span>
            <span v-else class="uuid">#{{ job.id.slice(0,8) }}</span>
          </div>
          <div class="status-badge" :class="getStatusInfo(job).class">
            {{ getStatusInfo(job).label }}
          </div>
        </div>
        
        <h3 class="job-title">{{ getJobTitle(job) }}</h3>
        
        <div class="job-meta">
          <span>📅 {{ formatDate(job.created_at) }}</span>
          <span v-if="job.result_data?.infringement_risk">
            ⚠️ 風險：{{ job.result_data.infringement_risk.risk_level || '評估中' }}
          </span>
        </div>

        <div class="card-footer">
          <button class="btn-view">查看策略 →</button>
        </div>
      </div>
    </div>

    <div v-else class="empty-state">
      <p>📭 尚無迴避設計專案</p>
      <button @click="startNewJob" class="btn-primary">開始第一個迴避設計</button>
    </div>
  </div>
</template>

<style scoped>
/* 復用之前的 Workflow CSS */
.workflow-container { padding: 2rem; max-width: 1200px; margin: 0 auto; }
.header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 2rem; }
.header h1 { font-size: 24px; font-weight: 700; color: #2c3e50; margin: 0 0 8px 0; }
.subtitle { color: #666; font-size: 14px; margin: 0; }
.header-actions { display: flex; gap: 12px; }

.dashboard-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px; }
.stat-card { background: white; padding: 20px; border-radius: 12px; border: 1px solid #eee; cursor: pointer; text-align: center; transition: all 0.2s; }
.stat-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
.stat-card.active { border-color: #2196F3; background: #e3f2fd; }
.stat-card.orange.active { border-color: #FF9800; background: #fff3e0; }
.stat-card.green.active { border-color: #4CAF50; background: #e8f5e9; }
.stat-value { font-size: 2rem; font-weight: bold; color: #2c3e50; }
.stat-label { color: #666; }

.job-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; }
.job-card { background: white; border-radius: 12px; padding: 20px; border: 1px solid #eee; cursor: pointer; transition: all 0.2s; }
.job-card:hover { border-color: #2196F3; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }

.card-header { display: flex; justify-content: space-between; margin-bottom: 12px; }
.job-id-badge { background: #f0f4f8; padding: 4px 8px; border-radius: 6px; font-size: 12px; font-family: monospace; color: #555; }
.status-badge { padding: 4px 10px; border-radius: 12px; font-size: 0.8rem; font-weight: 600; }
.status-success { background: #e8f5e9; color: #2e7d32; }
.status-warning { background: #fff3e0; color: #f57c00; }
.status-error { background: #ffebee; color: #c62828; }
.status-default { background: #f5f5f5; color: #666; }

.job-title { margin: 0 0 12px 0; font-size: 1.1rem; color: #333; line-height: 1.4; }
.job-meta { display: flex; flex-direction: column; gap: 6px; font-size: 0.9rem; color: #666; margin-bottom: 16px; }
.card-footer { text-align: right; }
.btn-view { background: none; border: none; color: #2196F3; font-weight: 600; cursor: pointer; }

.btn-new { background: #2196F3; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; }
.btn-secondary { background: white; border: 1px solid #ddd; padding: 10px 20px; border-radius: 8px; cursor: pointer; }
.loading, .empty-state { text-align: center; padding: 60px 0; color: #666; }
.spinner { border: 3px solid #f3f3f3; border-top: 3px solid #3498db; border-radius: 50%; width: 30px; height: 30px; animation: spin 1s linear infinite; margin: 0 auto 10px; }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
</style>