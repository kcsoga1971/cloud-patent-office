<!-- src/views/services/portfolio/phases/Phase5_Drafting.vue -->
<script setup>
import { ref, onMounted, computed } from 'vue'
import { supabase } from '../../../../supabase'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'

const props = defineProps(['jobData'])
const emit = defineEmits(['next'])
const router = useRouter()
const phaseData = ref(null)
const loading = ref(true)

const loadResult = async () => {
  try {
    const { data } = await supabase.from('job_phase_results')
      .select('phase_data')
      .eq('job_id', props.jobData.id)
      .eq('phase_order', 5)
      .single()
    
    if (data) {
      phaseData.value = typeof data.phase_data === 'string' 
        ? JSON.parse(data.phase_data) 
        : data.phase_data
    }
  } catch (e) {
    ElMessage.error('載入說明書列表失敗')
  } finally {
    loading.value = false
  }
}

const drafts = computed(() => phaseData.value?.all_drafts || [])

const stats = computed(() => ({
  total: drafts.value.length,
  p0: drafts.value.filter(d => d.priority === 'P0').length,
  p1: drafts.value.filter(d => d.priority === 'P1').length,
  completed: drafts.value.filter(d => d.draft_status === 'completed').length
}))

const openDraft = (id) => {
  if (!id) {
    ElMessage.warning('草稿 ID 不存在')
    return
  }
  const route = router.resolve({ path: `/services/drafting/edit/${id}` })
  window.open(route.href, '_blank')
}

const getPriorityConfig = (priority) => {
  const map = {
    'P0': { type: 'danger', icon: '🔥', color: '#ef4444' },
    'P1': { type: 'warning', icon: '⚡', color: '#f59e0b' }
  }
  return map[priority] || { type: 'info', icon: '📄', color: '#3b82f6' }
}

const getStatusConfig = (status) => {
  const map = {
    'completed': { type: 'success', text: '已完成', icon: '✅' },
    'processing': { type: 'warning', text: '處理中', icon: '⏳' },
    'failed': { type: 'danger', text: '失敗', icon: '❌' }
  }
  return map[status] || { type: 'info', text: status, icon: '❓' }
}

const startPhase6 = async () => {
  try {
    await ElMessageBox.confirm(
      '確定要生成最終報告嗎？報告將包含完整的佈局策略和說明書摘要。',
      '確認生成報告',
      {
        confirmButtonText: '生成報告',
        cancelButtonText: '取消',
        type: 'info'
      }
    )
    
    ElMessage.success('開始生成最終報告...')
    emit('next', import.meta.env.VITE_N8N_PORTFOLIO_PHASE6_URL)
  } catch {
    // 用戶取消
  }
}

onMounted(loadResult)
</script>

<template>
  <div class="drafting-container" v-loading="loading">
    <div class="drafting-card">
      <!-- 頂部提示 -->
      <div class="alert-section">
        <div class="alert-icon">📝</div>
        <div class="alert-content">
          <h3>Phase 5: 專利說明書生成完成</h3>
          <p>AI 已完成 {{ stats.completed }} / {{ stats.total }} 篇說明書的生成，您可以查看和編輯每篇草稿</p>
        </div>
        <el-button 
          type="primary" 
          size="large"
          class="alert-btn"
          @click="startPhase6"
        >
          生成最終報告 (Phase 6) →
        </el-button>
      </div>

      <!-- 統計卡片 -->
      <div class="stats-grid">
        <div class="stat-card total">
          <div class="stat-icon">📊</div>
          <div class="stat-content">
            <span class="stat-value">{{ stats.total }}</span>
            <span class="stat-label">總說明書數</span>
          </div>
        </div>

        <div class="stat-card p0">
          <div class="stat-icon">🔥</div>
          <div class="stat-content">
            <span class="stat-value">{{ stats.p0 }}</span>
            <span class="stat-label">P0 優先級</span>
          </div>
        </div>

        <div class="stat-card p1">
          <div class="stat-icon">⚡</div>
          <div class="stat-content">
            <span class="stat-value">{{ stats.p1 }}</span>
            <span class="stat-label">P1 優先級</span>
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

      <!-- 說明書列表 -->
      <div class="drafts-section">
        <div class="section-header">
          <h3>📋 說明書列表</h3>
          <p>點擊「查看草稿」可在新視窗中編輯說明書</p>
        </div>

        <div class="drafts-list">
          <div 
            v-for="(draft, idx) in drafts" 
            :key="draft.draft_job_id || idx"
            class="draft-card"
            :class="draft.priority?.toLowerCase()"
          >
            <div class="draft-header">
              <div class="header-left">
                <span class="draft-number">#{{ idx + 1 }}</span>
                <el-tag 
                  :type="getPriorityConfig(draft.priority).type"
                  size="small"
                  effect="dark"
                >
                  {{ getPriorityConfig(draft.priority).icon }} {{ draft.priority }}
                </el-tag>
              </div>
              <el-tag 
                :type="getStatusConfig(draft.draft_status).type"
                size="small"
              >
                {{ getStatusConfig(draft.draft_status).icon }} {{ getStatusConfig(draft.draft_status).text }}
              </el-tag>
            </div>

            <h4 class="draft-title">{{ draft.patent_theme }}</h4>

            <div v-if="draft.technical_summary" class="draft-summary">
              <span class="summary-label">技術摘要：</span>
              <p class="summary-text">{{ draft.technical_summary.substring(0, 150) }}...</p>
            </div>

            <div class="draft-footer">
              <div class="draft-meta">
                <span v-if="draft.created_at" class="meta-item">
                  📅 {{ new Date(draft.created_at).toLocaleDateString('zh-TW') }}
                </span>
              </div>
              <el-button 
                type="primary"
                size="default"
                :disabled="!draft.draft_job_id"
                @click="openDraft(draft.draft_job_id)"
              >
                查看草稿 →
              </el-button>
            </div>
          </div>
        </div>

        <!-- 空狀態 -->
        <div v-if="!loading && drafts.length === 0" class="empty-state">
          <div class="empty-icon">📭</div>
          <p>尚無生成的說明書</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.drafting-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
}

.drafting-card {
  background: white;
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

/* 提示區 */
.alert-section {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 24px;
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
  border-radius: 12px;
  border: 1px solid #6ee7b7;
  margin-bottom: 32px;
}

.alert-icon {
  font-size: 40px;
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.alert-content {
  flex: 1;
}

.alert-content h3 {
  font-size: 18px;
  font-weight: 700;
  color: #065f46;
  margin: 0 0 4px 0;
}

.alert-content p {
  font-size: 14px;
  color: #047857;
  margin: 0;
}

.alert-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  font-weight: 600;
  white-space: nowrap;
}

/* 統計卡片 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 32px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  border-radius: 12px;
  border: 2px solid;
  transition: all 0.3s;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
}

.stat-card.total {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  border-color: #93c5fd;
}

.stat-card.p0 {
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
  border-color: #fca5a5;
}

.stat-card.p1 {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-color: #fbbf24;
}

.stat-card.completed {
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
  border-color: #6ee7b7;
}

.stat-icon {
  font-size: 32px;
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border-radius: 12px;
}

.stat-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #1e293b;
}

.stat-label {
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
}

/* 說明書區域 */
.drafts-section {
  background: #f8fafc;
  border-radius: 12px;
  padding: 24px;
  border: 1px solid #e2e8f0;
}

.section-header {
  margin-bottom: 24px;
}

.section-header h3 {
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 4px 0;
}

.section-header p {
  font-size: 14px;
  color: #64748b;
  margin: 0;
}

/* 草稿列表 */
.drafts-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.draft-card {
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  padding: 24px;
  transition: all 0.3s;
}

.draft-card:hover {
  border-color: #667eea;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
}

.draft-card.p0 {
  border-left: 4px solid #ef4444;
}

.draft-card.p1 {
  border-left: 4px solid #f59e0b;
}

.draft-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.draft-number {
  font-size: 14px;
  font-weight: 700;
  color: #667eea;
  padding: 4px 12px;
  background: #f0f4ff;
  border-radius: 6px;
}

.draft-title {
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 16px 0;
  line-height: 1.4;
}

.draft-summary {
  margin-bottom: 20px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.summary-label {
  display: block;
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
  margin-bottom: 8px;
}

.summary-text {
  font-size: 14px;
  color: #475569;
  line-height: 1.6;
  margin: 0;
}

.draft-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16px;
  border-top: 1px solid #e2e8f0;
}

.draft-meta {
  display: flex;
  gap: 16px;
}

.meta-item {
  font-size: 13px;
  color: #94a3b8;
}

/* 空狀態 */
.empty-state {
  text-align: center;
  padding: 80px 20px;
  color: #94a3b8;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.5;
}

/* 響應式 */
@media (max-width: 1200px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .alert-section {
    flex-direction: column;
    align-items: flex-start;
  }

  .alert-btn {
    width: 100%;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .draft-footer {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }

  .draft-footer .el-button {
    width: 100%;
  }
}
</style>
