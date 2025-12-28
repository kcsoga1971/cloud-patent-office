<!-- src/views/services/PatentDraftingWorkflow.vue -->
<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../../supabase'
import { useUserStore } from '../../stores/user'
import JobCard from '../../components/workflow/JobCard.vue'

const router = useRouter()
const userStore = useUserStore()

// ========== 資料 ==========
const allJobs = ref([])
const isLoading = ref(true)
const activeFilter = ref('all')  // 'all', 'phase1', 'phase2', 'revised', 'checked'

// ========== 載入所有案件 ==========
onMounted(async () => {
  await loadAllJobs()
})

const loadAllJobs = async () => {
  isLoading.value = true
  
  try {
    const { data, error } = await supabase
      .from('saas_jobs')
      .select('*')
      .eq('user_id', userStore.user.id)
      .in('phase', ['phase1_completed', 'phase2_completed'])  // 只顯示已完成 Phase 1 或 Phase 2 的
      .order('updated_at', { ascending: false })
    
    if (error) throw error
    
    allJobs.value = data || []
    console.log('✅ 已載入', allJobs.value.length, '個案件')
    
  } catch (err) {
    console.error('❌ 載入案件失敗:', err)
    alert('載入案件失敗：' + err.message)
  } finally {
    isLoading.value = false
  }
}

// ========== 過濾案件 ==========
//const filteredJobs = computed(() => {
//  if (activeFilter.value === 'all') {
//    return allJobs.value
//  }
  
//  return allJobs.value.filter(job => {
//    switch (activeFilter.value) {
//      case 'phase1':
//        return job.phase === 'phase1_completed'
//      case 'phase2':
//        return job.phase === 'phase2_completed' && (!job.current_version || job.current_version === 1)
//      case 'revised':
//        return job.current_version > 1 && job.status !== 'checked'
//      case 'checked':
//        return job.status === 'checked'
//      default:
//        return true
//    }
//  })
//})

// 修改 filteredJobs (加入對應的 filter case)
// ========== 過濾案件邏輯 (對應七大狀態) ==========
const filteredJobs = computed(() => {
  // 1. 全部案件
  if (activeFilter.value === 'all') {
    return allJobs.value
  }
  
  return allJobs.value.filter(job => {
    const { phase, status } = job
    
    switch (activeFilter.value) {
      // 2. 待撰寫 (Phase 1 完成)
      case 'pending_draft':
        return phase === 'phase1_completed'
        
      // 3. 初稿完成 (Phase 2 完成且未檢查)
      case 'draft_done':
        return phase === 'phase2_completed' && status !== 'checked'
        
      // 4. 初稿已檢查 (Phase 2 完成且已檢查)
      case 'draft_checked':
        return phase === 'phase2_completed' && status === 'checked'
        
      // 5. 修訂稿完成 (Phase 4 完成且未檢查)
      case 'revision_done':
        return phase === 'phase4_revised' && status !== 'checked'
        
      // 6. 修訂稿已檢查 (Phase 4 完成且已檢查)
      case 'revision_checked':
        return phase === 'phase4_revised' && status === 'checked'
        
      // 7. 已送件 (Phase 6)
      case 'filed':
        return phase === 'phase6_filed' || status === 'completed'
        
      default:
        return true
    }
  })
})

// ========== 統計資料 ==========
//const stats = computed(() => ({
//  total: allJobs.value.length,
//  phase1: allJobs.value.filter(j => j.phase === 'phase1_completed').length,
//  phase2: allJobs.value.filter(j => j.phase === 'phase2_completed' && (!j.current_version || j.current_version === 1)).length,
//  revised: allJobs.value.filter(j => j.current_version > 1 && j.status !== 'checked').length,
//  checked: allJobs.value.filter(j => j.status === 'checked').length
//}))

// 修改 統計資料stats 計算屬性-調整為Phase 1, Phase 2, Phase 4, Phase 6 狀態分類
const stats = computed(() => {
  const jobs = allJobs.value
  return {
    // 1. 全部案件
    total: jobs.length,
    // 2. 待撰寫初稿
    pending_draft: jobs.filter(j => j.phase === 'phase1_completed').length,
    // 3. 初稿已完成 (Phase 2 且未檢查)
    draft_done: jobs.filter(j => j.phase === 'phase2_completed' && j.status !== 'checked').length,
    // 4. 初稿已檢查 (Phase 2 且已檢查)
    draft_checked: jobs.filter(j => j.phase === 'phase2_completed' && j.status === 'checked').length,
    // 5. 修訂稿已完成 (Phase 4 且未檢查)
    revision_done: jobs.filter(j => j.phase === 'phase4_revised' && j.status !== 'checked').length,
    // 6. 修訂稿已檢查 (Phase 4 且已檢查)
    revision_checked: jobs.filter(j => j.phase === 'phase4_revised' && j.status === 'checked').length,
    // 7. 已完稿
    filed: jobs.filter(j => j.phase === 'phase6_filed').length
  }
})


// ========== 導航函數 ==========
const goToPhase2 = (jobId) => {
  router.push({
    path: '/services/drafting',
    query: { job_id: jobId, phase: '2' }
  })
}

const goToRevision = (jobId) => {
  router.push(`/services/revision/${jobId}`)  // ✅ 簡潔版
}

const goToCheck = (jobId) => {
  router.push(`/services/qc/${jobId}`)  // ✅ 簡潔版
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

// ========== 處理案件更新 ==========
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
    <!-- 標題列 -->
    <div class="header">
      <div class="header-left">
        <h1>📋 專利說明書案件管理</h1>
        <p class="subtitle">管理您的專利撰寫案件，隨時修改、檢查或匯出</p>
      </div>
      <div class="header-actions">
        <button @click="loadAllJobs" class="btn-secondary">
          🔄 重新整理
        </button>
        <button @click="startNewDraft" class="btn-new">
          ➕ 開始新案件
        </button>
      </div>
    </div>
    
    <!-- 統計卡片 -->
    <div class="dashboard-grid">
      
      <div class="stat-section total-section">
        <div 
          class="stat-card total" 
          :class="{ active: activeFilter === 'all' }"
          @click="activeFilter = 'all'"
        >
          <div class="stat-icon">📊</div>
          <div class="stat-content">
            <span class="stat-label">全部案件</span>
            <span class="stat-value">{{ stats.total }}</span>
          </div>
        </div>
      </div>

      <div class="stat-section">
        <h4 class="section-title">📝 初稿階段</h4>
        <div class="card-group">
          <div 
            class="stat-card" 
            :class="{ active: activeFilter === 'pending_draft' }"
            @click="activeFilter = 'pending_draft'"
          >
            <div class="stat-top">
              <span class="stat-value">{{ stats.pending_draft }}</span>
              <span class="stat-icon">⏳</span>
            </div>
            <span class="stat-label">待撰寫初稿</span>
          </div>

          <div 
            class="stat-card purple" 
            :class="{ active: activeFilter === 'draft_done' }"
            @click="activeFilter = 'draft_done'"
          >
            <div class="stat-top">
              <span class="stat-value">{{ stats.draft_done }}</span>
              <span class="stat-icon">📄</span>
            </div>
            <span class="stat-label">初稿完成</span>
          </div>

          <div 
            class="stat-card green" 
            :class="{ active: activeFilter === 'draft_checked' }"
            @click="activeFilter = 'draft_checked'"
          >
            <div class="stat-top">
              <span class="stat-value">{{ stats.draft_checked }}</span>
              <span class="stat-icon">✅</span>
            </div>
            <span class="stat-label">初稿已檢查</span>
          </div>
        </div>
      </div>

      <div class="stat-section">
        <h4 class="section-title">🔄 修訂與送件</h4>
        <div class="card-group">
          <div 
            class="stat-card orange" 
            :class="{ active: activeFilter === 'revision_done' }"
            @click="activeFilter = 'revision_done'"
          >
            <div class="stat-top">
              <span class="stat-value">{{ stats.revision_done }}</span>
              <span class="stat-icon">✏️</span>
            </div>
            <span class="stat-label">修訂稿完成</span>
          </div>

          <div 
            class="stat-card dark-green" 
            :class="{ active: activeFilter === 'revision_checked' }"
            @click="activeFilter = 'revision_checked'"
          >
            <div class="stat-top">
              <span class="stat-value">{{ stats.revision_checked }}</span>
              <span class="stat-icon">✅</span>
            </div>
            <span class="stat-label">修訂稿已檢查</span>
          </div>

          <div 
            class="stat-card grey" 
            :class="{ active: activeFilter === 'filed' }"
            @click="activeFilter = 'filed'"
          >
            <div class="stat-top">
              <span class="stat-value">{{ stats.filed }}</span>
              <span class="stat-icon">🗂️</span>
            </div>
            <span class="stat-label">已送件</span>
          </div>
        </div>
      </div>
      
    </div>
    
    <!-- 載入中 -->
    <div v-if="isLoading" class="loading">
      <div class="spinner"></div>
      <p>載入中...</p>
    </div>
    
    <!-- 案件清單 -->
    <div v-else-if="filteredJobs.length > 0" class="jobs-list">
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
    
    <!-- 空狀態 -->
    <div v-else class="empty-state">
      <div class="empty-icon">📭</div>
      <p>在此分類下沒有找到案件</p>
      <button v-if="activeFilter !== 'all'" @click="activeFilter = 'all'" class="btn-text">
        顯示全部案件
      </button>
    </div>
  </div>
</template>

<style scoped>
.dashboard-grid {
  display: flex;
  flex-direction: column;
  gap: 24px;
  margin-bottom: 30px;
}

.stat-section {
  background: #f8f9fa;
  padding: 20px; /* 增加區塊內距 */
  border-radius: 16px; /* 更圓潤一點 */
  border: 1px solid #e0e0e0;
}

.total-section {
  background: transparent;
  padding: 0;
  border: none;
}

.section-title {
  margin: 0 0 16px 0; /* 標題與卡片的距離拉大 */
  font-size: 1rem;
  color: #555;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-group {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px; /* 卡片間距加大 */
}

/* === 卡片核心樣式修正 === */
.stat-card {
  background: white;
  padding: 20px; /* ✅ 增加卡片內距 */
  border-radius: 12px;
  cursor: pointer;
  border: 2px solid transparent;
  box-shadow: 0 4px 10px rgba(0,0,0,0.05); /* 陰影更柔和 */
  transition: all 0.25s ease;
  display: flex;
  flex-direction: column;
  /* ✅ 移除固定 height: 80px，改用最小高度 */
  min-height: 100px; 
  justify-content: space-between;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(0,0,0,0.1);
}

/* 針對全部案件的特殊樣式 */
.stat-card.total {
  flex-direction: row;
  align-items: center;
  min-height: auto; /* 這裡不需要最小高度 */
  padding: 24px; /* 更大的內距 */
  border-color: #ddd;
  background: #fff;
}
.stat-card.total .stat-content {
  display: flex;
  flex-direction: column;
  margin-left: 16px;
  justify-content: center;
}
.stat-card.total .stat-value {
  font-size: 2rem;
  margin-bottom: 0;
}
.stat-card.total .stat-icon {
  font-size: 1.8rem;
  background: #f5f5f5;
  padding: 12px;
  border-radius: 50%;
}

/* === 卡片內部排版修正 === */
.stat-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start; /* 對齊上方 */
  margin-bottom: 16px; /* ✅ 拉大數字與下方標籤的距離 */
}

.stat-value {
  font-size: 1.8rem; /* 數字加大 */
  font-weight: 700;
  color: #2c3e50;
  line-height: 1;
}

.stat-icon {
  font-size: 1.5rem;
  opacity: 0.7;
}

.stat-label {
  font-size: 0.95rem;
  color: #666;
  font-weight: 500;
  /* 確保文字不換行，避免跑版 */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* === 狀態顏色與激活樣式 === */
.stat-card.active { border-color: #2196F3; background-color: #e3f2fd; }
.stat-card.purple.active { border-color: #9C27B0; background-color: #f3e5f5; }
.stat-card.green.active { border-color: #4CAF50; background-color: #e8f5e9; }
.stat-card.dark-green.active { border-color: #2E7D32; background-color: #e8f5e9; }
.stat-card.orange.active { border-color: #FF9800; background-color: #fff3e0; }
.stat-card.grey.active { border-color: #607D8B; background-color: #eceff1; }

/* RWD */
@media (max-width: 768px) {
  .card-group {
    grid-template-columns: 1fr;
  }
  .stat-card {
    min-height: auto; /* 手機版可以更緊湊 */
    flex-direction: row;
    align-items: center;
    padding: 16px;
  }
  .stat-top {
    margin-bottom: 0;
    order: 2; /* 數字和圖標換到右邊 */
    gap: 12px;
    align-items: center;
  }
  .stat-label {
    font-size: 1rem;
    order: 1; /* 標籤換到左邊 */
  }
  .stat-value {
    font-size: 1.5rem;
  }
}
</style>