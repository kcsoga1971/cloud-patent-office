<!-- src/views/services/DefenseWorkflow.vue -->
<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../../supabase'
import { useUserStore } from '../../stores/user'
import { formatDate } from '../../utils/formatters' // 假設您有這個工具，若無可刪除或自己寫個簡單的

const router = useRouter()
const userStore = useUserStore()

// ========== 資料 ==========
const allJobs = ref([])
const isLoading = ref(true)
const activeFilter = ref('all') // 'all', 'processing', 'completed'

// ========== 載入所有答辯案件 ==========
onMounted(async () => {
  await loadDefenseJobs()
})

// ========== 載入或輸入答辯案件編號 ==========
const getJobTitle = (job) => {
  // 如果有使用者備註，優先顯示
  if (job.input_data?.user_notes) {
    return job.input_data.user_notes.length > 20 
      ? job.input_data.user_notes.substring(0, 20) + '...' 
      : job.input_data.user_notes
  }
  
  // 如果 AI 分析完成了，嘗試從結果中抓取標題 (例如申復書的標題)
  if (job.result_data && typeof job.result_data === 'object') {
     // 假設 AI 回傳的 JSON 有 analysis_summary，可以擷取前幾個字
     if (job.result_data.analysis_summary) {
       return '答辯分析：' + job.result_data.analysis_summary.substring(0, 15) + '...'
     }
  }

  // 預設標題
  return '專利核駁答辯分析'
}

const loadDefenseJobs = async () => {
  isLoading.value = true
  
  try {
    const { data, error } = await supabase
      .from('saas_jobs')
      .select('*')
      .eq('user_id', userStore.user.id)
      .eq('job_type', 'patent_defense') // 🎯 只抓取答辯案件
      .order('updated_at', { ascending: false })
    
    if (error) throw error
    
    allJobs.value = data || []
    
  } catch (err) {
    console.error('❌ 載入案件失敗:', err)
    // 這裡不一定要 alert，避免使用者一進來就被彈窗干擾
    console.warn('載入案件失敗：' + err.message)
  } finally {
    isLoading.value = false
  }
}

// ========== 過濾邏輯 ==========
const filteredJobs = computed(() => {
  if (activeFilter.value === 'all') return allJobs.value
  
  return allJobs.value.filter(job => {
    // 根據 n8n 回傳的狀態
    // status: 'pending' (處理中), 'completed' (AI完成), 'exported' (已匯出)
    if (activeFilter.value === 'processing') {
      return job.status === 'pending' || job.status === 'drafting' || job.status === 'reserved'
    }
    if (activeFilter.value === 'completed') {
      return job.status === 'completed' || job.status === 'exported'
    }
    return true
  })
})

// ========== 統計資料 ==========
const stats = computed(() => {
  const jobs = allJobs.value
  return {
    total: jobs.length,
    processing: jobs.filter(j => j.status === 'pending' || j.status === 'drafting' || j.status === 'reserved').length,
    completed: jobs.filter(j => j.status === 'completed' || j.status === 'exported').length
  }
})

// ========== 導航 ==========
const goToDefenseDetail = (jobId) => {
  // 導向到 DefensePage，並帶入 job_id
  router.push({
    path: '/services/defense',
    query: { job_id: jobId }
  })
}

const startNewDefense = () => {
  router.push('/services/defense') // 不帶 ID 代表新案件
}

// ========== 狀態顯示輔助函式 ==========
const getStatusInfo = (job) => {
  if (job.status === 'completed') return { label: '✅ 分析完成', class: 'status-success' }
  if (job.status === 'exported') return { label: '📤 已匯出', class: 'status-info' }
  if (job.status === 'pending') return { label: '⏳ AI 分析中', class: 'status-warning' }
  if (job.status === 'reserved') return { label: '💰 已付款待執行', class: 'status-warning' }
  if (job.status === 'failed') return { label: '❌ 失敗', class: 'status-error' }
  return { label: '📝 處理中', class: 'status-default' }
}
</script>

<template>
  <div class="workflow-container">
    <div class="header">
      <div class="header-left">
        <h1>🛡️ 專利答辯案件管理</h1>
        <p class="subtitle">追蹤您的 OA 答辯分析進度與歷史紀錄</p>
      </div>
      <div class="header-actions">
        <button @click="loadDefenseJobs" class="btn-secondary">🔄 重新整理</button>
        <button @click="startNewDefense" class="btn-new">➕ 新增答辯</button>
      </div>
    </div>

    <div class="dashboard-grid">
      <div 
        class="stat-card" 
        :class="{ active: activeFilter === 'all' }"
        @click="activeFilter = 'all'"
      >
        <span class="stat-value">{{ stats.total }}</span>
        <span class="stat-label">全部案件</span>
      </div>
      
      <div 
        class="stat-card orange" 
        :class="{ active: activeFilter === 'processing' }"
        @click="activeFilter = 'processing'"
      >
        <span class="stat-value">{{ stats.processing }}</span>
        <span class="stat-label">⏳ 分析中</span>
      </div>

      <div 
        class="stat-card green" 
        :class="{ active: activeFilter === 'completed' }"
        @click="activeFilter = 'completed'"
      >
        <span class="stat-value">{{ stats.completed }}</span>
        <span class="stat-label">✅ 已完成</span>
      </div>
    </div>

    <div v-if="isLoading" class="loading">
      <div class="spinner"></div>
      <p>載入中...</p>
    </div>

    <div v-else-if="filteredJobs.length > 0" class="job-list">
      <div 
        v-for="job in filteredJobs" 
        :key="job.id" 
        class="defense-job-card"
        @click="goToDefenseDetail(job.id)"
      >
        <div class="card-header">
          <div class="job-id-badge">
            <span v-if="job.my_patent_drafting_number" class="id-text">
              📁 {{ job.my_patent_drafting_number }}
            </span>
            <span v-else class="id-text uuid">
              #{{ job.id.slice(0,8) }}
            </span>
          </div>

          <div class="status-badge" :class="getStatusInfo(job).class">
            {{ getStatusInfo(job).label }}
          </div>
        </div>
        
        <h3 class="job-title">
          {{ getJobTitle(job) }}
        </h3>
        
        <div class="job-meta">
          <span>📅 {{ formatDate(job.created_at) }}</span>
          <span>🤖 {{ job.input_data?.strategy === 'conservative' ? '保守策略' : (job.input_data?.strategy === 'aggressive' ? '積極策略' : 'AI 推薦') }}</span>
        </div>

        <div class="card-footer">
          <button class="btn-view">查看詳情 →</button>
        </div>
      </div>
    </div>

    <div v-else class="empty-state">
      <p>📭 尚無案件紀錄</p>
      <button @click="startNewDefense" class="btn-primary">開始第一個答辯分析</button>
    </div>
  </div>
</template>

<style scoped>
.workflow-container {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 2rem;
}

.header h1 {
  font-size: 24px;
  font-weight: 700;
  color: #2c3e50;
  margin-bottom: 8px;
}

.subtitle {
  color: #666;
  font-size: 14px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  background: white;
  padding: 20px;
  border-radius: 12px;
  border: 1px solid #eee;
  cursor: pointer;
  text-align: center;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(0,0,0,0.02);
}
.stat-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
.stat-card.active { border-color: #2196F3; background: #e3f2fd; }
.stat-card.orange.active { border-color: #FF9800; background: #fff3e0; }
.stat-card.green.active { border-color: #4CAF50; background: #e8f5e9; }

.stat-value { font-size: 2rem; font-weight: bold; display: block; color: #2c3e50; }
.stat-label { color: #666; font-size: 14px; }

/* 列表卡片樣式 */
.job-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.defense-job-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #eee;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}
.defense-job-card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  border-color: #2196F3;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.job-id { 
  font-family: monospace; 
  color: #888; 
  font-size: 12px;
  background: #f5f5f5;
  padding: 2px 6px;
  border-radius: 4px;
}

.status-badge {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
}
.status-success { background: #e8f5e9; color: #2e7d32; }
.status-warning { background: #fff3e0; color: #f57c00; }
.status-error { background: #ffebee; color: #c62828; }
.status-info { background: #e3f2fd; color: #1565c0; }
.status-default { background: #f5f5f5; color: #666; }

.job-title { 
  margin: 0 0 12px 0; 
  font-size: 1.1rem; 
  color: #333; 
  line-height: 1.4;
}

.job-meta { 
  display: flex; 
  flex-direction: column;
  gap: 4px; 
  font-size: 0.85rem; 
  color: #666; 
  margin-bottom: 16px; 
}

.card-footer { text-align: right; }
.btn-view { background: none; border: none; color: #2196F3; font-weight: 600; cursor: pointer; }

.btn-new { 
  background: linear-gradient(135deg, #2196F3, #1976D2); 
  color: white; 
  border: none; 
  padding: 10px 20px; 
  border-radius: 8px; 
  cursor: pointer; 
  font-weight: 500;
}
.btn-new:hover { background: linear-gradient(135deg, #1976D2, #1565C0); }

.btn-secondary { 
  background: white; 
  border: 1px solid #ddd; 
  padding: 10px 20px; 
  border-radius: 8px; 
  cursor: pointer; 
  color: #666;
}
.btn-secondary:hover { background: #f5f5f5; }

.btn-primary {
  background: #2196F3;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
}

/* 載入與空狀態 */
.loading, .empty-state { 
  text-align: center; 
  padding: 60px 0; 
  color: #666; 
}

.spinner { 
  border: 3px solid #f3f3f3; 
  border-top: 3px solid #3498db; 
  border-radius: 50%; 
  width: 30px; 
  height: 30px; 
  animation: spin 1s linear infinite; 
  margin: 0 auto 10px; 
}
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

/* RWD */
@media (max-width: 768px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
  .job-list {
    grid-template-columns: 1fr;
  }
  .header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
}

.job-id-badge {
  background: #f0f4f8;
  padding: 4px 10px;
  border-radius: 6px;
  font-family: 'Courier New', monospace;
  font-weight: 600;
  color: #2c3e50;
  border: 1px solid #dae1e7;
}

.id-text.uuid {
  color: #999;
  font-weight: normal;
}
</style>