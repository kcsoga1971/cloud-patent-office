<!-- src/views/services/design-around/phases/Phase1_Review.vue -->
<script setup>
import { ref, onMounted, computed } from 'vue'
import { supabase } from '../../../../supabase'
import { ElMessage } from 'element-plus'

const props = defineProps(['jobData'])
const emit = defineEmits(['next'])

const patents = ref([])
const loading = ref(false)
const selectedRows = ref([])

const loadPatents = async () => {
  loading.value = true
  const { data } = await supabase
    .from('design_around_patents')
    .select('*')
    .eq('job_id', props.jobData.id)
  
  patents.value = data || []
  // 預設全選
  selectedRows.value = [...patents.value]
  loading.value = false
}

const handleSelectionChange = (val) => {
  selectedRows.value = val
}

const confirmPhase2 = async () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('至少選擇一篇專利')
    return
  }
  
  const confirm = window.confirm(`確定要對這 ${selectedRows.value.length} 篇專利進行深度分析嗎？這將消耗較多 Token。`)
  if (!confirm) return

  // 1. 標記未選中的專利為 'skipped'
  const allIds = patents.value.map(p => p.id)
  const selectedIds = selectedRows.value.map(p => p.id)
  const skippedIds = allIds.filter(id => !selectedIds.includes(id))

  if (skippedIds.length > 0) {
    await supabase.from('design_around_patents')
      .update({ status: 'skipped' })
      .in('id', skippedIds)
  }

  ElMessage.success('開始深度分析...')
  
  // 2. 觸發 Phase 2 Webhook
  emit('next', import.meta.env.VITE_N8N_DESIGN_AROUND_PHASE2_URL)
}

const selectAll = () => {
  selectedRows.value = [...patents.value]
}

const clearSelection = () => {
  selectedRows.value = []
}

onMounted(loadPatents)
</script>

<template>
  <div class="review-container">
    <div class="review-card">
      <!-- 頂部提示 -->
      <div class="alert-section">
        <div class="alert-icon">✅</div>
        <div class="alert-content">
          <h3>Phase 1 資料收集完成</h3>
          <p>AI 已完成初步收集。請勾選您認為相關的專利，進入 Phase 2 深度解析。</p>
        </div>
      </div>

      <!-- 統計與操作區 -->
      <div class="header-section">
        <div class="stats-info">
          <div class="stat-badge">
            <span class="badge-label">總計</span>
            <span class="badge-value">{{ patents.length }}</span>
          </div>
          <div class="stat-badge selected">
            <span class="badge-label">已選</span>
            <span class="badge-value">{{ selectedRows.length }}</span>
          </div>
        </div>

        <div class="action-buttons">
          <el-button @click="selectAll" size="default">全選</el-button>
          <el-button @click="clearSelection" size="default">清空</el-button>
          <el-button 
            type="primary" 
            size="default"
            class="confirm-btn"
            @click="confirmPhase2"
            :disabled="selectedRows.length === 0"
          >
            開始深度分析 ({{ selectedRows.length }}) →
          </el-button>
        </div>
      </div>

      <!-- 表格區 -->
      <div class="table-section">
        <el-table 
          :data="patents" 
          v-loading="loading"
          @selection-change="handleSelectionChange"
          :default-sort="{ prop: 'search_relevance_score', order: 'descending' }"
          stripe
          class="custom-table"
        >
          <el-table-column type="selection" width="55" fixed />
          
          <el-table-column prop="patent_number" label="專利案號" width="150" fixed>
            <template #default="{row}">
              <div class="patent-number">
                <span class="number-text">{{ row.patent_number }}</span>
              </div>
            </template>
          </el-table-column>
          
          <el-table-column prop="patent_title" label="專利標題" min-width="300" show-overflow-tooltip>
            <template #default="{row}">
              <div class="patent-title">
                {{ row.patent_title || '未提供標題' }}
              </div>
            </template>
          </el-table-column>
          
          <el-table-column label="來源" width="120" align="center">
            <template #default="{row}">
              <el-tag 
                :type="row.source_type === 'uploaded' ? 'success' : 'warning'"
                effect="light"
                size="small"
              >
                {{ row.source_type === 'uploaded' ? '📤 上傳' : '🔍 檢索' }}
              </el-tag>
            </template>
          </el-table-column>
          
          <el-table-column label="相關度" width="120" align="center" sortable prop="search_relevance_score">
            <template #default="{row}">
              <div v-if="row.search_relevance_score" class="relevance-score">
                <el-progress 
                  :percentage="Math.round(row.search_relevance_score * 100)" 
                  :stroke-width="8"
                  :show-text="false"
                  :color="getScoreColor(row.search_relevance_score)"
                />
                <span class="score-text">{{ Math.round(row.search_relevance_score * 100) }}%</span>
              </div>
              <span v-else class="no-score">-</span>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  methods: {
    getScoreColor(score) {
      if (score >= 0.8) return '#10b981'
      if (score >= 0.6) return '#f59e0b'
      return '#ef4444'
    }
  }
}
</script>

<style scoped>
.review-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
}

.review-card {
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

/* 頭部區 */
.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 2px solid #f1f5f9;
}

.stats-info {
  display: flex;
  gap: 12px;
}

.stat-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 20px;
  background: #f8fafc;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
}

.stat-badge.selected {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  border-color: #93c5fd;
}

.badge-label {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
}

.badge-value {
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
  margin-top: 4px;
}

.action-buttons {
  display: flex;
  gap: 12px;
}

.confirm-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  font-weight: 600;
}

.confirm-btn:hover {
  background: linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%);
}

/* 表格區 */
.table-section {
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
}

.patent-number {
  font-family: 'Courier New', monospace;
  font-weight: 600;
  color: #667eea;
  font-size: 13px;
}

.patent-title {
  font-size: 14px;
  color: #334155;
  line-height: 1.5;
}

.relevance-score {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.score-text {
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
}

.no-score {
  color: #94a3b8;
  font-size: 14px;
}

/* Element Plus 表格樣式覆蓋 */
:deep(.el-table) {
  font-size: 14px;
}

:deep(.el-table th) {
  background: #f8fafc;
  color: #475569;
  font-weight: 600;
}

:deep(.el-table__row:hover) {
  background: #f8f9ff;
}

/* 響應式 */
@media (max-width: 768px) {
  .header-section {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }

  .action-buttons {
    width: 100%;
    flex-direction: column;
  }

  .action-buttons .el-button {
    width: 100%;
  }
}
</style>
