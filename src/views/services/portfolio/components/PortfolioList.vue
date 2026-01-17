<!-- src/views/services/portfolio/components/PortfolioList.vue -->
<script setup>
import { ref, onMounted, computed } from 'vue'
import { supabase } from '../../../../supabase'
import { useUserStore } from '@/stores/user'
import { ElMessage } from 'element-plus'

const emit = defineEmits(['create', 'select'])
const userStore = useUserStore()
const jobs = ref([])
const loading = ref(false)

const fetchJobs = async () => {
  loading.value = true
  try {
    const { data, error } = await supabase
      .from('saas_jobs')
      .select('*')
      .eq('user_id', userStore.user?.id)
      .eq('job_type', 'patent_portfolio')
      .order('updated_at', { ascending: false })

    if (error) throw error
    jobs.value = data || []
  } catch (e) {
    ElMessage.error('載入專案失敗')
  } finally {
    loading.value = false
  }
}

const formatPhase = (phase) => {
  const map = {
    'init': '初始化',
    'patent_portfolio_technical_analysis': '技術拆解',
    'patent_portfolio_variation_generation': '變化生成',
    'patent_portfolio_conflict_analysis': '競爭分析',
    'patent_portfolio_layout_strategy': '佈局策略',
    'patent_portfolio_draft_generation': '說明書生成',
    'patent_portfolio_report_generation': '報告生成',
    'patent_portfolio_report': '報告完成',
    'completed': '已完成'
  }
  return map[phase] || phase || '初始化'
}

const getStatusConfig = (status) => {
  const map = {
    'processing': { type: 'warning', text: '處理中', icon: '⏳' },
    'completed': { type: 'success', text: '已完成', icon: '✅' },
    'failed': { type: 'danger', text: '失敗', icon: '❌' },
    'pending': { type: 'info', text: '等待中', icon: '⏸️' }
  }
  return map[status] || { type: 'info', text: status, icon: '❓' }
}

const getPhaseProgress = (phase) => {
  const phaseOrder = {
    'init': 0,
    'patent_portfolio_technical_analysis': 1,
    'patent_portfolio_variation_generation': 2,
    'patent_portfolio_conflict_analysis': 3,
    'patent_portfolio_layout_strategy': 4,
    'patent_portfolio_draft_generation': 5,
    'patent_portfolio_report_generation': 6,
    'patent_portfolio_report': 6,
    'completed': 6
  }
  const current = phaseOrder[phase] || 0
  return Math.round((current / 6) * 100)
}

const stats = computed(() => ({
  total: jobs.value.length,
  processing: jobs.value.filter(j => j.status === 'processing').length,
  completed: jobs.value.filter(j => j.status === 'completed').length
}))

onMounted(fetchJobs)
</script>

<template>
  <div class="list-container">
    <!-- 頂部區域 -->
    <div class="page-header">
      <div class="header-icon">♟️</div>
      <div class="header-content">
        <h1>專利佈局策略中心</h1>
        <p class="subtitle">管理您的佈局專案，從技術拆解到全球佈局規劃</p>
      </div>
      
      <div class="header-actions">
        <button 
          @click="fetchJobs"
          :disabled="loading"
          class="btn-refresh"
        >
          🔄 重新整理
        </button>
        <button 
          @click="$emit('create')"
          class="btn-new"
        >
          ➕ 新增佈局專案
        </button>
      </div>
    </div>

    <!-- 統計卡片 -->
    <div class="stats-grid">
      <div class="stat-card total">
        <div class="stat-icon">📊</div>
        <div class="stat-content">
          <span class="stat-value">{{ stats.total }}</span>
          <span class="stat-label">總專案數</span>
        </div>
      </div>

      <div class="stat-card processing">
        <div class="stat-icon">⏳</div>
        <div class="stat-content">
          <span class="stat-value">{{ stats.processing }}</span>
          <span class="stat-label">進行中</span>
        </div>
      </div>

      <div class="stat-card completed">
        <div class="stat-icon">✅</div>
        <div class="stat-content">
          <span class="stat-value">{{ stats.completed }}</span>
          <span class="stat-label">已完成</span>
        </div>
      </div>
    </div>

    <!-- 專案列表 -->
    <div class="projects-section">
      <div class="section-header">
        <h3>專案列表</h3>
        <span class="project-count">共 {{ jobs.length }} 個專案</span>
      </div>

      <div v-loading="loading" class="projects-grid">
        <!-- 專案卡片 -->
        <div 
          v-for="job in jobs" 
          :key="job.id"
          class="project-card"
          @click="$emit('select', job.id)"
        >
          <!-- 卡片頭部 -->
          <div class="card-header">
            <div class="project-meta">
              <span class="project-id">#{{ job.id.slice(0, 8) }}</span>
              <span class="project-date">{{ new Date(job.created_at).toLocaleDateString('zh-TW') }}</span>
            </div>
            <el-tag 
              :type="getStatusConfig(job.status).type"
              size="small"
              effect="dark"
            >
              {{ getStatusConfig(job.status).icon }} {{ getStatusConfig(job.status).text }}
            </el-tag>
          </div>

          <!-- 專案名稱 -->
          <h3 class="project-title">
            {{ job.input_data?.project_name || job.input_data?.product_name || '未命名專案' }}
          </h3>

          <!-- 當前階段 -->
          <div class="phase-section">
            <div class="phase-label">
              <span class="label-text">當前階段</span>
              <el-tag size="small" effect="light">
                {{ formatPhase(job.current_phase) }}
              </el-tag>
            </div>
            
            <!-- 進度條 -->
            <div class="progress-bar">
              <el-progress 
                :percentage="getPhaseProgress(job.current_phase)"
                :stroke-width="6"
                :show-text="false"
                :color="job.status === 'completed' ? '#10b981' : '#667eea'"
              />
            </div>
          </div>

          <!-- 卡片底部 -->
          <div class="card-footer">
            <span class="update-time">
              更新於 {{ new Date(job.updated_at).toLocaleString('zh-TW', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }}
            </span>
            <div class="arrow-icon">→</div>
          </div>
        </div>

        <!-- 空狀態 -->
        <div v-if="!loading && jobs.length === 0" class="empty-state">
          <div class="empty-icon">📋</div>
          <h3>尚無專案</h3>
          <p>點擊右上角「新增佈局專案」開始您的第一個專案</p>
          <button 
            @click="$emit('create')"
            class="btn-start"
          >
            開始第一個專案
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.list-container {
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

.btn-refresh:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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
  transition: all 0.3s;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
}

.stat-card.total {
  border-left: 4px solid #3b82f6;
}

.stat-card.processing {
  border-left: 4px solid #f59e0b;
}

.stat-card.completed {
  border-left: 4px solid #10b981;
}

.stat-icon {
  font-size: 32px;
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
  border-radius: 12px;
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

/* ========== 專案區域 ========== */
.projects-section {
  background: white;
  border-radius: 16px;
  padding: 32px;
  border: 2px solid #e2e8f0;
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

.project-count {
  font-size: 14px;
  color: #64748b;
  font-weight: 600;
  padding: 6px 16px;
  background: #f8fafc;
  border-radius: 12px;
}

/* ========== 專案網格 ========== */
.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}

.project-card {
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  padding: 24px;
  cursor: pointer;
  transition: all 0.3s;
}

.project-card:hover {
  border-color: #667eea;
  box-shadow: 0 8px 16px rgba(102, 126, 234, 0.15);
  transform: translateY(-4px);
}

/* 卡片頭部 */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.project-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.project-id {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: #667eea;
  font-weight: 600;
}

.project-date {
  font-size: 12px;
  color: #94a3b8;
}

/* 專案標題 */
.project-title {
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 20px 0;
  line-height: 1.4;
}

/* 階段區域 */
.phase-section {
  margin-bottom: 20px;
}

.phase-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.label-text {
  font-size: 13px;
  color: #64748b;
  font-weight: 600;
}

.progress-bar {
  margin-top: 8px;
}

/* 卡片底部 */
.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16px;
  border-top: 1px solid #e2e8f0;
}

.update-time {
  font-size: 12px;
  color: #94a3b8;
}

.arrow-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #667eea;
  color: white;
  border-radius: 8px;
  font-size: 18px;
  font-weight: 700;
  transition: all 0.3s;
}

.project-card:hover .arrow-icon {
  background: #5568d3;
  transform: translateX(4px);
}

/* ========== 空狀態 ========== */
.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  padding: 80px 20px;
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

  .projects-grid {
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

  .projects-grid {
    grid-template-columns: 1fr;
  }

  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
}
</style>

