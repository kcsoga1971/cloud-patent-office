<!-- src/views/services/RectificationWorkflow.vue -->
<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../../supabase'
import { useUserStore } from '../../stores/user'

const router = useRouter()
const userStore = useUserStore()

const isLoading = ref(true)
const allJobs = ref([])
const searchQuery = ref('')
const statusFilter = ref('all')
const sortBy = ref('updated_at')

const loadJobs = async () => {
  isLoading.value = true
  
  try {
    const { data, error } = await supabase
      .from('saas_jobs')
      .select('*')
      .eq('user_id', userStore.user.id)
      .eq('job_type', 'patent_rectification')
      .order('updated_at', { ascending: false })
    
    if (error) throw error
    
    allJobs.value = data || []
    
  } catch (err) {
    console.error('❌ 載入案件失敗:', err)
    alert('載入失敗：' + err.message)
  } finally {
    isLoading.value = false
  }
}

const filteredJobs = computed(() => {
  let jobs = allJobs.value
  
  if (statusFilter.value !== 'all') {
    jobs = jobs.filter(job => job.status === statusFilter.value)
  }
  
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    jobs = jobs.filter(job => {
      const appNum = job.input_data?.application_number?.toLowerCase() || ''
      const patentNum = job.input_data?.patent_number?.toLowerCase() || ''
      const notes = job.input_data?.user_notes?.toLowerCase() || ''
      return appNum.includes(query) || patentNum.includes(query) || notes.includes(query)
    })
  }
  
  jobs = [...jobs].sort((a, b) => {
    if (sortBy.value === 'created_at') {
      return new Date(b.created_at) - new Date(a.created_at)
    } else {
      return new Date(b.updated_at) - new Date(a.updated_at)
    }
  })
  
  return jobs
})

const stats = computed(() => {
  return {
    total: allJobs.value.length,
    draft: allJobs.value.filter(j => j.status === 'draft').length,
    pending: allJobs.value.filter(j => j.status === 'pending').length,
    completed: allJobs.value.filter(j => j.status === 'completed').length
  }
})

const getStatusLabel = (status) => {
  const labels = {
    'draft': '草稿',
    'pending': '進行中',
    'completed': '已完成',
    'cancelled': '已取消'
  }
  return labels[status] || status
}

const getStatusClass = (status) => {
  const classes = {
    'draft': 'status-draft',
    'pending': 'status-pending',
    'completed': 'status-completed',
    'cancelled': 'status-cancelled'
  }
  return classes[status] || ''
}

const getRectificationTimingLabel = (timing) => {
  const labels = {
    'before_grant': '核准審定書送達後、證書發給前',
    'after_grant': '證書發給後、舉發案審定前',
    'during_opposition': '舉發案審定後'
  }
  return labels[timing] || timing
}

const getRectificationTypeLabel = (type) => {
  const labels = {
    'obvious_error': '明顯錯誤之訂正',
    'scope_reduction': '縮減申請專利範圍'
  }
  return labels[type] || type
}

const formatDate = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

const createNewCase = () => {
  router.push({ name: 'RectificationPrep' })
}

const editCase = (jobId) => {
  router.push({ name: 'RectificationPrep', params: { jobId } })
}

const deleteCase = async (jobId) => {
  if (!confirm('確定要刪除此案件嗎？此操作無法復原。')) {
    return
  }
  
  try {
    const { error } = await supabase
      .from('saas_jobs')
      .delete()
      .eq('id', jobId)
    
    if (error) throw error
    
    alert('✅ 案件已刪除')
    await loadJobs()
    
  } catch (err) {
    console.error('❌ 刪除失敗:', err)
    alert('刪除失敗：' + err.message)
  }
}

const duplicateCase = async (job) => {
  try {
    const newJob = {
      user_id: userStore.user.id,
      job_type: 'patent_rectification',
      status: 'draft',
      input_data: {
        ...job.input_data,
        application_number: '',
        patent_number: '',
        opposition_numbers: [''],
        user_notes: `複製自案件：${job.input_data?.patent_number || job.input_data?.application_number || '未命名'}`
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    const { data, error } = await supabase
      .from('saas_jobs')
      .insert(newJob)
      .select()
      .single()
    
    if (error) throw error
    
    alert('✅ 案件已複製')
    router.push({ name: 'RectificationPrep', params: { jobId: data.id } })
    
  } catch (err) {
    console.error('❌ 複製失敗:', err)
    alert('複製失敗：' + err.message)
  }
}

onMounted(() => {
  loadJobs()
})
</script>

<template>
  <div class="rectification-workflow-page">
    
    <div class="page-header">
      <div class="header-content">
        <h1>✏️ 專利更正案件管理</h1>
        <p class="subtitle">管理您的專利更正申請案件</p>
      </div>
      <button @click="createNewCase" class="btn-create">
        ➕ 建立新案件
      </button>
    </div>
    
    <div class="info-banner">
      <div class="banner-icon">ℹ️</div>
      <div class="banner-content">
        <h4>更正注意事項</h4>
        <ul>
          <li>更正不得超出申請時說明書、申請專利範圍或圖式所揭露之範圍</li>
          <li>更正不得實質擴大或變更公告時之申請專利範圍</li>
        </ul>
      </div>
    </div>
    
    <div class="stats-cards">
      <div class="stat-card">
        <div class="stat-icon">📊</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.total }}</div>
          <div class="stat-label">總案件數</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon">📝</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.draft }}</div>
          <div class="stat-label">草稿</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon">⏳</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.pending }}</div>
          <div class="stat-label">進行中</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon">✅</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.completed }}</div>
          <div class="stat-label">已完成</div>
        </div>
      </div>
    </div>
    
    <div class="filters-section">
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="搜尋申請案號、專利證書號或備註..."
          class="search-input"
        />
      </div>
      
      <div class="filter-controls">
        <select v-model="statusFilter" class="filter-select">
          <option value="all">全部狀態</option>
          <option value="draft">草稿</option>
          <option value="pending">進行中</option>
          <option value="completed">已完成</option>
        </select>
        
        <select v-model="sortBy" class="filter-select">
          <option value="updated_at">最近更新</option>
          <option value="created_at">建立時間</option>
        </select>
      </div>
    </div>
    
    <div v-if="isLoading" class="loading-container">
      <div class="spinner"></div>
      <p>載入中...</p>
    </div>
    
    <div v-else-if="filteredJobs.length === 0" class="empty-state">
      <div class="empty-icon">📭</div>
      <h3>{{ searchQuery || statusFilter !== 'all' ? '找不到符合條件的案件' : '尚無案件' }}</h3>
      <p>{{ searchQuery || statusFilter !== 'all' ? '請嘗試調整搜尋或篩選條件' : '點擊上方按鈕建立您的第一個專利更正案件' }}</p>
      <button v-if="!searchQuery && statusFilter === 'all'" @click="createNewCase" class="btn-create-empty">
        ➕ 建立新案件
      </button>
    </div>
    
    <div v-else class="jobs-list">
      <div 
        v-for="job in filteredJobs" 
        :key="job.id"
        class="job-card"
      >
        <div class="job-header">
          <div class="job-title-section">
            <h3 class="job-title">
              {{ job.input_data?.patent_number || job.input_data?.application_number || '未命名案件' }}
            </h3>
            <span class="status-badge" :class="getStatusClass(job.status)">
              {{ getStatusLabel(job.status) }}
            </span>
          </div>
          
          <div class="job-actions">
            <button @click="editCase(job.id)" class="btn-action btn-edit" title="編輯">
              ✏️
            </button>
            <button @click="duplicateCase(job)" class="btn-action btn-duplicate" title="複製">
              📋
            </button>
            <button @click="deleteCase(job.id)" class="btn-action btn-delete" title="刪除">
              🗑️
            </button>
          </div>
        </div>
        
        <div class="job-content">
          <div class="job-info-grid">
            <div class="info-item">
              <span class="info-label">申請案號</span>
              <span class="info-value">{{ job.input_data?.application_number || '-' }}</span>
            </div>
            
            <div class="info-item">
              <span class="info-label">專利證書號數</span>
              <span class="info-value">{{ job.input_data?.patent_number || '-' }}</span>
            </div>
            
            <div class="info-item">
              <span class="info-label">更正時機</span>
              <span class="info-value">
                {{ getRectificationTimingLabel(job.input_data?.rectification_timing) }}
              </span>
            </div>
            
            <div class="info-item">
              <span class="info-label">更正類型</span>
              <span class="info-value">
                {{ getRectificationTypeLabel(job.input_data?.rectification_type) }}
              </span>
            </div>
          </div>
          
          <!-- 舉發案號 -->
          <div v-if="job.input_data?.opposition_numbers?.filter(n => n).length > 0" class="job-opposition">
            <span class="opposition-label">📋 舉發案號：</span>
            <div class="opposition-tags">
              <span 
                v-for="(num, index) in job.input_data.opposition_numbers.filter(n => n)" 
                :key="index"
                class="opposition-tag"
              >
                {{ num }}
              </span>
            </div>
          </div>
          
          <!-- 更正理由摘要 -->
          <div v-if="job.input_data?.rectification_reason" class="job-reason">
            <span class="reason-label">📄 更正理由：</span>
            <span class="reason-text">{{ job.input_data.rectification_reason.substring(0, 100) }}{{ job.input_data.rectification_reason.length > 100 ? '...' : '' }}</span>
          </div>
          
          <!-- 更正事項 -->
          <div class="job-rectifications">
            <span class="rectifications-label">✏️ 更正事項：</span>
            <div class="rectifications-tags">
              <span v-if="job.input_data?.rectifications?.claims" class="rectification-tag">
                ✓ 申請專利範圍
              </span>
              <span v-if="job.input_data?.rectifications?.description" class="rectification-tag">
                ✓ 說明書
              </span>
              <span v-if="job.input_data?.rectifications?.drawings" class="rectification-tag">
                ✓ 圖式
              </span>
              <span v-if="!job.input_data?.rectifications?.claims && !job.input_data?.rectifications?.description && !job.input_data?.rectifications?.drawings" class="rectification-tag-empty">
                未設定
              </span>
            </div>
          </div>
          
          <div v-if="job.input_data?.user_notes" class="job-notes">
            <span class="notes-label">📌 備註：</span>
            <span class="notes-text">{{ job.input_data.user_notes }}</span>
          </div>
        </div>
        
        <div class="job-footer">
          <div class="job-meta">
            <span class="meta-item">
              <span class="meta-icon">📅</span>
              建立：{{ formatDate(job.created_at) }}
            </span>
            <span class="meta-item">
              <span class="meta-icon">🔄</span>
              更新：{{ formatDate(job.updated_at) }}
            </span>
          </div>
          
          <button @click="editCase(job.id)" class="btn-view">
            查看詳情 →
          </button>
        </div>
      </div>
    </div>
    
  </div>
</template>

<style scoped>
.rectification-workflow-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
  min-height: 100vh;
  background: #f5f5f5;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
}

.header-content h1 {
  font-size: 32px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 8px 0;
}

.subtitle {
  font-size: 16px;
  color: #666;
  margin: 0;
}

.btn-create {
  padding: 12px 24px;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-create:hover {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

/* 提醒橫幅 */
.info-banner {
  display: flex;
  gap: 16px;
  padding: 20px;
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  border: 2px solid #3b82f6;
  border-radius: 12px;
  margin-bottom: 24px;
}

.banner-icon {
  font-size: 32px;
}

.banner-content h4 {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
}

.banner-content ul {
  margin: 0;
  padding-left: 20px;
}

.banner-content li {
  font-size: 14px;
  color: #666;
  margin-bottom: 4px;
}

/* 統計卡片 */
.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.3s;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

.stat-icon {
  font-size: 40px;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: #1a1a1a;
  line-height: 1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: #666;
}

/* 搜尋和篩選 */
.filters-section {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.search-box {
  flex: 1;
  min-width: 300px;
  position: relative;
}

.search-icon {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 20px;
}

.search-input {
  width: 100%;
  padding: 12px 16px 12px 48px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.3s;
}

.search-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.filter-controls {
  display: flex;
  gap: 12px;
}

.filter-select {
  padding: 12px 16px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  background: white;
  cursor: pointer;
  transition: all 0.3s;
}

.filter-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* Loading */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  background: white;
  border-radius: 12px;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 空狀態 */
.empty-state {
  text-align: center;
  padding: 80px 20px;
  background: white;
  border-radius: 12px;
}

.empty-icon {
  font-size: 80px;
  margin-bottom: 24px;
}

.empty-state h3 {
  font-size: 24px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 12px 0;
}

.empty-state p {
  font-size: 16px;
  color: #666;
  margin: 0 0 24px 0;
}

.btn-create-empty {
  padding: 12px 24px;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-create-empty:hover {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

/* 案件列表 */
.jobs-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.job-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.3s;
}

.job-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  transform: translateY(-2px);
}

.job-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 2px solid #f3f4f6;
}

.job-title-section {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.job-title {
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.status-draft {
  background: #e5e7eb;
  color: #6b7280;
}

.status-pending {
  background: #dbeafe;
  color: #1e40af;
}

.status-completed {
  background: #d1fae5;
  color: #065f46;
}

.status-cancelled {
  background: #fee2e2;
  color: #991b1b;
}

.job-actions {
  display: flex;
  gap: 8px;
}

.btn-action {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-edit {
  background: #dbeafe;
}

.btn-edit:hover {
  background: #bfdbfe;
  transform: scale(1.1);
}

.btn-duplicate {
  background: #e0e7ff;
}

.btn-duplicate:hover {
  background: #c7d2fe;
  transform: scale(1.1);
}

.btn-delete {
  background: #fee2e2;
}

.btn-delete:hover {
  background: #fecaca;
  transform: scale(1.1);
}

.job-content {
  margin-bottom: 20px;
}

.job-info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-label {
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
}

.info-value {
  font-size: 14px;
  color: #1a1a1a;
  font-weight: 500;
}

.job-opposition {
  padding: 12px;
  background: #fef3c7;
  border-left: 3px solid #f59e0b;
  border-radius: 4px;
  margin-bottom: 12px;
}

.opposition-label {
  font-size: 12px;
  font-weight: 600;
  color: #92400e;
  display: block;
  margin-bottom: 8px;
}

.opposition-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.opposition-tag {
  padding: 4px 12px;
  background: white;
  border: 1px solid #fbbf24;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  color: #92400e;
}

.job-reason {
  padding: 12px;
  background: #f0f9ff;
  border-left: 3px solid #3b82f6;
  border-radius: 4px;
  margin-bottom: 12px;
}

.reason-label {
  font-size: 12px;
  font-weight: 600;
  color: #1e40af;
  margin-right: 8px;
}

.reason-text {
  font-size: 14px;
  color: #374151;
}

.job-rectifications {
  padding: 12px;
  background: #f0fdf4;
  border-left: 3px solid #10b981;
  border-radius: 4px;
  margin-bottom: 12px;
}

.rectifications-label {
  font-size: 12px;
  font-weight: 600;
  color: #065f46;
  display: block;
  margin-bottom: 8px;
}

.rectifications-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.rectification-tag {
  padding: 4px 12px;
  background: white;
  border: 1px solid #10b981;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  color: #065f46;
}

.rectification-tag-empty {
  padding: 4px 12px;
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
}

.job-notes {
  padding: 12px;
  background: #f9fafb;
  border-left: 3px solid #6366f1;
  border-radius: 4px;
}

.notes-label {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  margin-right: 8px;
}

.notes-text {
  font-size: 14px;
  color: #374151;
}

.job-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16px;
  border-top: 1px solid #f3f4f6;
}

.job-meta {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #6b7280;
}

.meta-icon {
  font-size: 14px;
}

.btn-view {
  padding: 8px 16px;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-view:hover {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  transform: translateX(4px);
}

@media (max-width: 768px) {
  .rectification-workflow-page {
    padding: 16px;
  }
  
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .btn-create {
    width: 100%;
  }
  
  .stats-cards {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .filters-section {
    flex-direction: column;
  }
  
  .search-box {
    min-width: 100%;
  }
  
  .filter-controls {
    width: 100%;
  }
  
  .filter-select {
    flex: 1;
  }
  
  .job-header {
    flex-direction: column;
    gap: 12px;
  }
  
  .job-actions {
    width: 100%;
    justify-content: flex-end;
  }
  
  .job-info-grid {
    grid-template-columns: 1fr;
  }
  
  .job-footer {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }
  
  .btn-view {
    width: 100%;
  }
}
</style>
