<!-- src/views/services/RevisionPage.vue -->
<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../../supabase'
import { useUserStore } from '../../stores/user'
// ✅ 修正路徑
import RevisionPanel from './RevisionPanel.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const jobId = route.params.jobId
const job = ref(null)
const isLoading = ref(true)
const currentVersion = ref(1)

// 載入案件資料
onMounted(async () => {
  try {
    console.log('🔍 載入案件:', jobId)
    
    // 1. 載入 Job 資料
    const { data: jobData, error: jobError } = await supabase
      .from('saas_jobs')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', userStore.user.id)
      .single()
    
    if (jobError) throw jobError
    
    console.log('✅ Job 資料:', jobData)
    
    // 2. 檢查 Phase
    if (jobData.phase !== 'phase2_completed') {
      alert(`⚠️ 此案件目前狀態為 ${jobData.phase}，尚未完成 Phase 2，無法修改`)
      router.push('/services/workflow')
      return
    }
    
    // 3. 載入最新版本號
    const { data: versionData, error: versionError } = await supabase
      .from('draft_versions')
      .select('version')
      .eq('job_id', jobId)
      .order('version', { ascending: false })
      .limit(1)
      .single()
    
    if (!versionError && versionData) {
      currentVersion.value = versionData.version
      console.log('✅ 當前版本:', currentVersion.value)
    } else {
      console.log('ℹ️ 尚無版本記錄，使用預設版本 1')
    }
    
    job.value = jobData
    console.log('✅ 案件載入成功')
    
  } catch (err) {
    console.error('❌ 載入失敗:', err)
    alert('載入失敗：' + err.message)
    router.push('/services/workflow')
  } finally {
    isLoading.value = false
  }
})

// 修訂完成處理
const handleRevisionComplete = async (revisionData) => {
  console.log('✅ 修訂完成:', revisionData)
  
  // 更新版本號
  currentVersion.value = revisionData.version
  
  // 更新草稿內容
  if (job.value && job.value.result_data) {
    job.value.result_data.draft = revisionData.revised_draft
  }
  
  // 顯示成功訊息
  alert(`✅ 修訂完成！\n\n版本：v${revisionData.version}\n\n變更摘要：\n${revisionData.changes_summary}`)
  
  // 選項 1: 留在當前頁面 (可以繼續修改)
  // 不做任何跳轉
  
  // 選項 2: 跳回案件列表
  // router.push('/services/workflow')
}

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return '未知'
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<template>
  <div class="revision-page">
    <!-- 頁面標題 -->
    <div class="page-header">
      <button @click="router.push('/services/workflow')" class="btn-back">
        ← 返回案件列表
      </button>
      <div class="title-group">
        <h1>✏️ 修改專利說明書</h1>
        <span v-if="job" class="version-badge">v{{ currentVersion }}</span>
      </div>
    </div>

    <!-- 載入中 -->
    <div v-if="isLoading" class="loading-state">
      <div class="loader"></div>
      <p>載入中...</p>
    </div>

    <!-- 主要內容 -->
    <div v-else-if="job" class="page-content">
      <!-- 案件資訊卡片 -->
      <div class="job-info-card">
        <h3>📋 {{ job.input_data?.title || '未命名專利' }}</h3>
        <div class="meta-info">
          <span class="meta-item">
            <span class="meta-icon">🤖</span>
            <span class="meta-label">模型：</span>
            <span class="meta-value">{{ job.model_name || '未知' }}</span>
          </span>
          <span class="meta-item">
            <span class="meta-icon">📅</span>
            <span class="meta-label">更新時間：</span>
            <span class="meta-value">{{ formatDate(job.updated_at) }}</span>
          </span>
          <span class="meta-item">
            <span class="meta-icon">📊</span>
            <span class="meta-label">狀態：</span>
            <span class="meta-value phase-badge">{{ job.phase }}</span>
          </span>
          <span class="meta-item">
            <span class="meta-icon">🔢</span>
            <span class="meta-label">版本：</span>
            <span class="meta-value">v{{ currentVersion }}</span>
          </span>
        </div>
      </div>

      <!-- 當前草稿預覽 -->
      <div class="draft-preview-card">
        <div class="card-header">
          <h3>📄 當前草稿</h3>
          <button 
            @click="() => {
              const pre = document.querySelector('.draft-content pre')
              if (pre) {
                pre.classList.toggle('expanded')
              }
            }"
            class="btn-expand"
          >
            展開/收合
          </button>
        </div>
        <div class="draft-content">
          <pre>{{ job.result_data?.draft || job.result_data?.markdown_content || '無草稿資料' }}</pre>
        </div>
      </div>

      <!-- 修訂面板 -->
      <div class="revision-panel-wrapper">
        <RevisionPanel 
          :job-id="job.id"
          :current-draft="job.result_data?.draft || job.result_data?.markdown_content"
          :model-name="job.model_name"
          :status="job.status" @revision-complete="handleRevisionComplete"
        />
      </div>
    </div>

    <!-- 錯誤狀態 -->
    <div v-else class="error-state">
      <div class="error-icon">⚠️</div>
      <h3>載入失敗</h3>
      <p>找不到該案件或您無權訪問</p>
      <button @click="router.push('/services/workflow')" class="btn-primary">
        返回案件列表
      </button>
    </div>
  </div>
</template>

<style scoped>
.revision-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 40px 20px;
  min-height: 100vh;
  background: #f5f7fa;
}

/* ========== 頁面標題 ========== */
.page-header {
  display: flex;
  align-items: center;
  gap: 24px;
  margin-bottom: 32px;
}

.btn-back {
  padding: 12px 24px;
  background: white;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
  color: #333;
}

.btn-back:hover {
  background: #f5f5f5;
  border-color: #667eea;
  transform: translateX(-4px);
}

.title-group {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
}

.title-group h1 {
  margin: 0;
  font-size: 32px;
  color: #1a1a1a;
  font-weight: 700;
}

.version-badge {
  padding: 8px 20px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border-radius: 20px;
  font-size: 16px;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

/* ========== 載入狀態 ========== */
.loading-state {
  text-align: center;
  padding: 80px 20px;
}

.loader {
  width: 60px;
  height: 60px;
  border: 5px solid #f3f3f3;
  border-top: 5px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 24px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* ========== 主要內容 ========== */
.page-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.job-info-card,
.draft-preview-card,
.revision-panel-wrapper {
  background: white;
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

/* ========== 案件資訊卡片 ========== */
.job-info-card h3 {
  margin: 0 0 20px 0;
  font-size: 24px;
  color: #1a1a1a;
  font-weight: 600;
}

.meta-info {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
}

.meta-icon {
  font-size: 20px;
}

.meta-label {
  font-size: 14px;
  color: #666;
  font-weight: 500;
}

.meta-value {
  font-size: 14px;
  color: #1a1a1a;
  font-weight: 600;
}

.phase-badge {
  padding: 4px 12px;
  background: #e3f2fd;
  color: #1976d2;
  border-radius: 12px;
  font-size: 12px;
}

/* ========== 草稿預覽卡片 ========== */
.draft-preview-card {
  position: relative;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.card-header h3 {
  margin: 0;
  font-size: 20px;
  color: #1a1a1a;
}

.btn-expand {
  padding: 8px 16px;
  background: #f0f0f0;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-expand:hover {
  background: #e0e0e0;
}

.draft-content {
  max-height: 500px;
  overflow-y: auto;
  background: #f8f9fa;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  padding: 24px;
  transition: max-height 0.3s;
}

.draft-content pre {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.8;
  color: #333;
}

.draft-content pre.expanded {
  max-height: none;
}

/* ========== 錯誤狀態 ========== */
.error-state {
  text-align: center;
  padding: 80px 20px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.error-icon {
  font-size: 64px;
  margin-bottom: 20px;
}

.error-state h3 {
  margin: 0 0 12px 0;
  font-size: 24px;
  color: #f44336;
}

.error-state p {
  margin: 0 0 24px 0;
  color: #666;
}

.btn-primary {
  padding: 12px 32px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.3);
}

/* ========== 響應式設計 ========== */
@media (max-width: 768px) {
  .revision-page {
    padding: 20px 16px;
  }
  
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
  
  .title-group {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .title-group h1 {
    font-size: 24px;
  }
  
  .job-info-card,
  .draft-preview-card,
  .revision-panel-wrapper {
    padding: 20px;
  }
  
  .meta-info {
    grid-template-columns: 1fr;
  }
}
</style>

