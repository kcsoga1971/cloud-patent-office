<!-- src/views/services/portfolio/phases/Phase4_Strategy.vue -->
<script setup>
import { ref, onMounted, computed } from 'vue'
import { supabase } from '../../../../supabase'
import { ElMessage, ElMessageBox } from 'element-plus'

const props = defineProps(['jobData'])
const emit = defineEmits(['next'])
const strategyData = ref(null)
const selectedPatents = ref([])
const loading = ref(true)
const COST_PER_DRAFT = 300

const loadResult = async () => {
  try {
    const { data } = await supabase.from('job_phase_results')
      .select('phase_data')
      .eq('job_id', props.jobData.id)
      .eq('phase_order', 4)
      .single()
    
    if (data) {
      strategyData.value = typeof data.phase_data === 'string' 
        ? JSON.parse(data.phase_data) 
        : data.phase_data
    }
  } catch (e) {
    ElMessage.error('載入佈局策略失敗')
  } finally {
    loading.value = false
  }
}

const p0Patents = computed(() => {
  return strategyData.value?.patent_application_priorities?.p0_highest_priority?.patents || []
})

const p1Patents = computed(() => {
  return strategyData.value?.patent_application_priorities?.p1_high_priority?.patents || []
})

const allPatents = computed(() => [...p0Patents.value, ...p1Patents.value])

const totalCost = computed(() => selectedPatents.value.length * COST_PER_DRAFT)

const toggleSelect = (p) => {
  const idx = selectedPatents.value.findIndex(x => x.patent_id === p.patent_id)
  if (idx > -1) {
    selectedPatents.value.splice(idx, 1)
  } else {
    selectedPatents.value.push(p)
  }
}

const isSelected = (p) => {
  return selectedPatents.value.some(x => x.patent_id === p.patent_id)
}

const selectAll = () => {
  selectedPatents.value = [...allPatents.value]
}

const clearSelection = () => {
  selectedPatents.value = []
}

const selectP0Only = () => {
  selectedPatents.value = [...p0Patents.value]
}

const startPhase5 = async () => {
  if (selectedPatents.value.length === 0) {
    ElMessage.warning('請至少選擇一個專利方案')
    return
  }

  try {
    await ElMessageBox.confirm(
      `即將生成 ${selectedPatents.value.length} 篇說明書，需扣除 ${totalCost.value} 點。確定要繼續嗎？`,
      '確認扣款',
      {
        confirmButtonText: '確認生成',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    ElMessage.success('開始生成說明書...')
    emit('next', import.meta.env.VITE_N8N_PORTFOLIO_PHASE5_URL, { 
      selected_ids: selectedPatents.value.map(p => p.patent_id) 
    })
  } catch {
    // 用戶取消
  }
}

onMounted(loadResult)
</script>

<template>
  <div class="strategy-container" v-loading="loading">
    <div class="strategy-card">
      <!-- 頂部提示 -->
      <div class="alert-section">
        <div class="alert-icon">♟️</div>
        <div class="alert-content">
          <h3>Phase 4: 佈局策略規劃完成</h3>
          <p>AI 已完成專利申請優先級分析，識別出 {{ p0Patents.length }} 個最高優先級和 {{ p1Patents.length }} 個高優先級方案</p>
        </div>
      </div>

      <!-- 操作欄 -->
      <div class="action-bar">
        <div class="selection-info">
          <div class="info-badge">
            <span class="badge-label">已選擇</span>
            <span class="badge-value">{{ selectedPatents.length }}</span>
          </div>
          <div class="cost-badge">
            <span class="cost-label">預估費用</span>
            <span class="cost-value">{{ totalCost }} 點</span>
          </div>
        </div>

        <div class="action-buttons">
          <el-button @click="selectP0Only" size="default">僅選 P0</el-button>
          <el-button @click="selectAll" size="default">全選</el-button>
          <el-button @click="clearSelection" size="default">清空</el-button>
          <el-button 
            type="primary"
            size="default"
            class="generate-btn"
            :disabled="selectedPatents.length === 0"
            @click="startPhase5"
          >
            生成說明書 ({{ selectedPatents.length }}) →
          </el-button>
        </div>
      </div>

      <!-- P0 最高優先級 -->
      <div class="priority-section p0">
        <div class="section-header">
          <div class="header-left">
            <span class="priority-icon">🔥</span>
            <h3>P0 最高優先級</h3>
            <el-tag type="danger" effect="dark">立即申請</el-tag>
          </div>
          <span class="patent-count">{{ p0Patents.length }} 個方案</span>
        </div>

        <div class="patents-grid">
          <div 
            v-for="p in p0Patents" 
            :key="p.patent_id"
            class="patent-card p0"
            :class="{ selected: isSelected(p) }"
            @click="toggleSelect(p)"
          >
            <div class="card-header">
              <el-tag type="danger" size="small" effect="dark">P0</el-tag>
              <div class="checkbox-wrapper" @click.stop>
                <el-checkbox 
                  :model-value="isSelected(p)"
                  @change="toggleSelect(p)"
                />
              </div>
            </div>

            <h4 class="patent-theme">{{ p.patent_theme }}</h4>
            
            <div class="patent-reason">
              <span class="reason-label">📌 申請理由：</span>
              <p class="reason-text">{{ p.application_reason }}</p>
            </div>

            <div v-if="p.market_potential" class="patent-metrics">
              <div class="metric-item">
                <span class="metric-label">市場潛力</span>
                <el-progress 
                  :percentage="p.market_potential * 10"
                  :stroke-width="6"
                  :show-text="false"
                  color="#ef4444"
                />
              </div>
            </div>

            <div v-if="isSelected(p)" class="selected-badge">
              ✓ 已選擇
            </div>
          </div>
        </div>
      </div>

      <!-- P1 高優先級 -->
      <div class="priority-section p1">
        <div class="section-header">
          <div class="header-left">
            <span class="priority-icon">⚡</span>
            <h3>P1 高優先級</h3>
            <el-tag type="warning" effect="dark">建議申請</el-tag>
          </div>
          <span class="patent-count">{{ p1Patents.length }} 個方案</span>
        </div>

        <div class="patents-grid">
          <div 
            v-for="p in p1Patents" 
            :key="p.patent_id"
            class="patent-card p1"
            :class="{ selected: isSelected(p) }"
            @click="toggleSelect(p)"
          >
            <div class="card-header">
              <el-tag type="warning" size="small" effect="dark">P1</el-tag>
              <div class="checkbox-wrapper" @click.stop>
                <el-checkbox 
                  :model-value="isSelected(p)"
                  @change="toggleSelect(p)"
                />
              </div>
            </div>

            <h4 class="patent-theme">{{ p.patent_theme }}</h4>
            
            <div class="patent-reason">
              <span class="reason-label">📌 申請理由：</span>
              <p class="reason-text">{{ p.application_reason }}</p>
            </div>

            <div v-if="p.market_potential" class="patent-metrics">
              <div class="metric-item">
                <span class="metric-label">市場潛力</span>
                <el-progress 
                  :percentage="p.market_potential * 10"
                  :stroke-width="6"
                  :show-text="false"
                  color="#f59e0b"
                />
              </div>
            </div>

            <div v-if="isSelected(p)" class="selected-badge">
              ✓ 已選擇
            </div>
          </div>
        </div>
      </div>

      <!-- 空狀態 -->
      <div v-if="!loading && allPatents.length === 0" class="empty-state">
        <div class="empty-icon">📋</div>
        <p>尚無專利方案</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.strategy-container {
  max-width: 1600px;
  margin: 0 auto;
  padding: 24px;
}

.strategy-card {
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
  background: linear-gradient(135deg, #ddd6fe 0%, #c4b5fd 100%);
  border-radius: 12px;
  border: 1px solid #a78bfa;
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
  color: #5b21b6;
  margin: 0 0 4px 0;
}

.alert-content p {
  font-size: 14px;
  color: #6d28d9;
  margin: 0;
}

/* 操作欄 */
.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  padding: 20px;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

.selection-info {
  display: flex;
  gap: 12px;
}

.info-badge,
.cost-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 20px;
  background: white;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
}

.cost-badge {
  border-color: #fbbf24;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
}

.badge-label,
.cost-label {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
}

.badge-value {
  font-size: 24px;
  font-weight: 700;
  color: #667eea;
  margin-top: 4px;
}

.cost-value {
  font-size: 24px;
  font-weight: 700;
  color: #92400e;
  margin-top: 4px;
}

.action-buttons {
  display: flex;
  gap: 12px;
}

.generate-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  font-weight: 600;
}

.generate-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%);
}

/* 優先級區塊 */
.priority-section {
  margin-bottom: 40px;
  padding: 24px;
  border-radius: 12px;
  border: 2px solid;
}

.priority-section.p0 {
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
  border-color: #fca5a5;
}

.priority-section.p1 {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-color: #fbbf24;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px dashed rgba(0, 0, 0, 0.1);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.priority-icon {
  font-size: 28px;
}

.section-header h3 {
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

.patent-count {
  font-size: 14px;
  font-weight: 600;
  color: #64748b;
  padding: 6px 16px;
  background: white;
  border-radius: 12px;
}

/* 專利網格 */
.patents-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}

.patent-card {
  position: relative;
  background: white;
  border: 2px solid;
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s;
}

.patent-card.p0 {
  border-color: #fca5a5;
}

.patent-card.p1 {
  border-color: #fbbf24;
}

.patent-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
}

.patent-card.p0:hover {
  border-color: #ef4444;
  box-shadow: 0 8px 16px rgba(239, 68, 68, 0.2);
}

.patent-card.p1:hover {
  border-color: #f59e0b;
  box-shadow: 0 8px 16px rgba(245, 158, 11, 0.2);
}

.patent-card.selected {
  background: #f8f9ff;
}

.patent-card.p0.selected {
  border-color: #ef4444;
  background: #fef2f2;
}

.patent-card.p1.selected {
  border-color: #f59e0b;
  background: #fffbeb;
}

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

.patent-theme {
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 16px 0;
  line-height: 1.4;
}

.patent-reason {
  margin-bottom: 16px;
}

.reason-label {
  display: block;
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
  margin-bottom: 8px;
}

.reason-text {
  font-size: 14px;
  color: #475569;
  line-height: 1.6;
  margin: 0;
}

.patent-metrics {
  padding-top: 16px;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
}

.metric-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.metric-label {
  font-size: 12px;
  color: #64748b;
  font-weight: 600;
}

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
  opacity: 0.5;
}

/* 響應式 */
@media (max-width: 1200px) {
  .patents-grid {
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
    flex-wrap: wrap;
  }

  .action-buttons .el-button {
    flex: 1;
    min-width: 120px;
  }

  .patents-grid {
    grid-template-columns: 1fr;
  }
}
</style>
