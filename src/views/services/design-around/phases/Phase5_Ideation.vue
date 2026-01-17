<!-- src/views/services/design-around/phases/Phase5_Ideation.vue -->
<script setup>
import { ref, onMounted, computed } from 'vue'
import { supabase } from '../../../../supabase'
import { ElMessage } from 'element-plus'

const props = defineProps(['jobData'])
const emit = defineEmits(['next'])

const solutions = ref([])
const selectedIds = ref([])
const loading = ref(true)

const loadSolutions = async () => {
  try {
    const { data } = await supabase
      .from('job_phase_results')
      .select('phase_data')
      .eq('job_id', props.jobData.id)
      .eq('phase_order', 4)
      .single()
    
    if (data) {
      const res = typeof data.phase_data === 'string' ? JSON.parse(data.phase_data) : data.phase_data
      solutions.value = res.all_solutions || []
    }
  } catch (e) {
    ElMessage.error('載入方案失敗')
  } finally {
    loading.value = false
  }
}

const toggleSelect = (id) => {
  const idx = selectedIds.value.indexOf(id)
  if (idx > -1) {
    selectedIds.value.splice(idx, 1)
  } else {
    selectedIds.value.push(id)
  }
}

const isSelected = (id) => selectedIds.value.includes(id)

const selectAll = () => {
  selectedIds.value = solutions.value.map(s => s.solution_id)
}

const clearSelection = () => {
  selectedIds.value = []
}

const startPhase6 = () => {
  if (selectedIds.value.length === 0) {
    ElMessage.warning('請至少選擇一個方案進行評估')
    return
  }
  
  ElMessage.success(`開始評估 ${selectedIds.value.length} 個方案...`)
  emit('next', import.meta.env.VITE_N8N_DESIGN_AROUND_PHASE6_URL, { 
    selected_solution_ids: selectedIds.value 
  })
}

const getStrategyColor = (strategy) => {
  const colorMap = {
    'alternative_implementation': 'primary',
    'feature_removal': 'warning',
    'workaround': 'success',
    'replacement': 'info'
  }
  return colorMap[strategy] || 'default'
}

const getStrategyLabel = (strategy) => {
  const labelMap = {
    'alternative_implementation': '替代實現',
    'feature_removal': '特徵移除',
    'workaround': '繞道方案',
    'replacement': '技術替換'
  }
  return labelMap[strategy] || strategy
}

onMounted(loadSolutions)
</script>

<template>
  <div class="ideation-container" v-loading="loading">
    <div class="ideation-card">
      <!-- 頂部提示 -->
      <div class="alert-section">
        <div class="alert-icon">💡</div>
        <div class="alert-content">
          <h3>Phase 5 創意生成完成</h3>
          <p>AI 已生成 {{ solutions.length }} 個迴避設計方案，請選擇您想要深入評估的方案</p>
        </div>
      </div>

      <!-- 操作欄 -->
      <div class="action-bar">
        <div class="selection-info">
          <div class="info-badge">
            <span class="badge-label">總方案數</span>
            <span class="badge-value">{{ solutions.length }}</span>
          </div>
          <div class="info-badge selected">
            <span class="badge-label">已選擇</span>
            <span class="badge-value">{{ selectedIds.length }}</span>
          </div>
        </div>

        <div class="action-buttons">
          <el-button @click="selectAll" size="default">全選</el-button>
          <el-button @click="clearSelection" size="default">清空</el-button>
          <el-button 
            type="primary" 
            size="default"
            class="evaluate-btn"
            :disabled="selectedIds.length === 0"
            @click="startPhase6"
          >
            評估選定方案 ({{ selectedIds.length }}) →
          </el-button>
        </div>
      </div>

      <!-- 方案網格 -->
      <div class="solutions-grid">
        <div 
          v-for="sol in solutions" 
          :key="sol.solution_id"
          class="solution-card"
          :class="{ selected: isSelected(sol.solution_id) }"
          @click="toggleSelect(sol.solution_id)"
        >
          <!-- 卡片頭部 -->
          <div class="card-header">
            <el-tag 
              :type="getStrategyColor(sol.design_around_strategy)"
              size="small"
              effect="light"
            >
              {{ getStrategyLabel(sol.design_around_strategy) }}
            </el-tag>
            
            <div class="checkbox-wrapper" @click.stop>
              <el-checkbox 
                :model-value="isSelected(sol.solution_id)"
                @change="toggleSelect(sol.solution_id)"
              />
            </div>
          </div>

          <!-- 方案標題 -->
          <h3 class="solution-title">{{ sol.solution_name }}</h3>

          <!-- 方案描述 -->
          <p class="solution-desc">
            {{ sol.technical_description.substring(0, 120) }}{{ sol.technical_description.length > 120 ? '...' : '' }}
          </p>

          <!-- 評分指標 -->
          <div class="metrics-section">
            <div class="metric-item">
              <span class="metric-label">創新度</span>
              <div class="metric-bar">
                <el-progress 
                  :percentage="sol.innovation_score * 10" 
                  :stroke-width="8"
                  :show-text="false"
                  color="#f59e0b"
                />
                <span class="metric-value">{{ sol.innovation_score }}/10</span>
              </div>
            </div>

            <div class="metric-item">
              <span class="metric-label">可行性</span>
              <div class="metric-bar">
                <el-progress 
                  :percentage="sol.feasibility_score * 10" 
                  :stroke-width="8"
                  :show-text="false"
                  color="#10b981"
                />
                <span class="metric-value">{{ sol.feasibility_score }}/10</span>
              </div>
            </div>
          </div>

          <!-- 選中標記 -->
          <div v-if="isSelected(sol.solution_id)" class="selected-badge">
            <span>✓ 已選擇</span>
          </div>
        </div>
      </div>

      <!-- 空狀態 -->
      <div v-if="!loading && solutions.length === 0" class="empty-state">
        <div class="empty-icon">📭</div>
        <p>尚無生成的方案</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ideation-container {
  max-width: 1600px;
  margin: 0 auto;
  padding: 24px;
}

.ideation-card {
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
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-radius: 12px;
  border: 1px solid #fbbf24;
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
  color: #92400e;
  margin: 0 0 4px 0;
}

.alert-content p {
  font-size: 14px;
  color: #b45309;
  margin: 0;
}

/* 操作欄 */
.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 2px solid #f1f5f9;
}

.selection-info {
  display: flex;
  gap: 12px;
}

.info-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 20px;
  background: #f8fafc;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
}

.info-badge.selected {
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

.evaluate-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  font-weight: 600;
}

.evaluate-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%);
}

/* 方案網格 */
.solutions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 24px;
}

.solution-card {
  position: relative;
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  padding: 24px;
  cursor: pointer;
  transition: all 0.3s;
}

.solution-card:hover {
  border-color: #667eea;
  box-shadow: 0 8px 16px rgba(102, 126, 234, 0.15);
  transform: translateY(-4px);
}

.solution-card.selected {
  border-color: #667eea;
  background: linear-gradient(135deg, #f8f9ff 0%, #f0f4ff 100%);
  box-shadow: 0 8px 16px rgba(102, 126, 234, 0.2);
}

/* 卡片頭部 */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.checkbox-wrapper {
  display: flex;
  align-items: center;
}

/* 方案標題 */
.solution-title {
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 12px 0;
  line-height: 1.4;
}

/* 方案描述 */
.solution-desc {
  font-size: 14px;
  color: #64748b;
  line-height: 1.6;
  margin: 0 0 20px 0;
  min-height: 60px;
}

/* 評分指標 */
.metrics-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid #e2e8f0;
}

.metric-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.metric-label {
  font-size: 12px;
  color: #64748b;
  font-weight: 600;
}

.metric-bar {
  display: flex;
  align-items: center;
  gap: 12px;
}

.metric-bar :deep(.el-progress) {
  flex: 1;
}

.metric-value {
  font-size: 14px;
  font-weight: 700;
  color: #1e293b;
  min-width: 50px;
  text-align: right;
}

/* 選中標記 */
.selected-badge {
  position: absolute;
  top: -12px;
  right: -12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
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
}

/* 響應式 */
@media (max-width: 1200px) {
  .solutions-grid {
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  }
}

@media (max-width: 768px) {
  .action-bar {
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

  .solutions-grid {
    grid-template-columns: 1fr;
  }
}
</style>
