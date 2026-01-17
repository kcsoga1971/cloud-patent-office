<!-- src/views/services/portfolio/components/PortfolioWorkspace.vue -->
<script setup>
import { ref, onMounted, onUnmounted, computed, defineAsyncComponent } from 'vue'
import { supabase } from '../../../../supabase'
import { ElMessage } from 'element-plus'
import axios from 'axios'

// 非同步引入各階段組件
const PhaseInput = defineAsyncComponent(() => import('../phases/Phase1_Input.vue'))
const Phase1 = defineAsyncComponent(() => import('../phases/Phase1_Technical.vue'))
const Phase2 = defineAsyncComponent(() => import('../phases/Phase2_Variations.vue'))
const Phase3 = defineAsyncComponent(() => import('../phases/Phase3_Map.vue'))
const Phase4 = defineAsyncComponent(() => import('../phases/Phase4_Strategy.vue'))
const Phase5 = defineAsyncComponent(() => import('../phases/Phase5_Drafting.vue'))
const Phase6 = defineAsyncComponent(() => import('../phases/Phase6_Report.vue'))
const PhaseProgress = defineAsyncComponent(() => import('../phases/Phase_Progress.vue'))

const props = defineProps(['jobId'])
const emit = defineEmits(['back'])
const jobData = ref(null)
const pollTimer = ref(null)
const isTriggering = ref(false)

// 狀態機映射表
const PHASE_MAP = {
  'init': { step: 0, comp: PhaseInput, title: '專案啟動', icon: '🚀' },
  'patent_portfolio_technical_analysis': { step: 1, comp: Phase1, title: '技術拆解', icon: '🔬' },
  'patent_portfolio_variation_generation': { step: 2, comp: Phase2, title: '變化生成', icon: '🎨' },
  'patent_portfolio_conflict_analysis': { step: 3, comp: Phase3, title: '競爭地圖', icon: '🗺️' },
  'patent_portfolio_layout_strategy': { step: 4, comp: Phase4, title: '佈局策略', icon: '♟️' },
  'patent_portfolio_draft_generation': { step: 5, comp: Phase5, title: '說明書生成', icon: '📝' },
  'patent_portfolio_report_generation': { step: 6, comp: PhaseProgress, title: '報告生成中', icon: '⏳' },
  'patent_portfolio_report': { step: 6, comp: Phase6, title: '最終報告', icon: '📊' },
  'completed': { step: 7, comp: Phase6, title: '已完成', icon: '✅' }
}

const STEPS = [
  { title: '拆解', icon: '🔬' },
  { title: '變化', icon: '🎨' },
  { title: '競爭', icon: '🗺️' },
  { title: '佈局', icon: '♟️' },
  { title: '生成', icon: '📝' },
  { title: '報告', icon: '📊' }
]

const fetchJob = async () => {
  if (!props.jobId) return
  const { data } = await supabase.from('saas_jobs').select('*').eq('id', props.jobId).single()
  if (data) {
    jobData.value = data
    const interval = (data.status === 'processing' && data.current_phase !== 'patent_portfolio_draft_generation') ? 3000 : 5000
    if (data.status !== 'completed' && !pollTimer.value) startPolling(interval)
    if (data.status === 'completed') stopPolling()
  }
}

const startPolling = (interval) => {
  stopPolling()
  pollTimer.value = setInterval(fetchJob, interval)
}

const stopPolling = () => {
  if (pollTimer.value) { clearInterval(pollTimer.value); pollTimer.value = null }
}

const currentComponent = computed(() => {
  if (!jobData.value) return PhaseInput
  
  const phaseKey = jobData.value.current_phase
  
  if (jobData.value.status === 'processing' && phaseKey !== 'patent_portfolio_draft_generation') {
    return PhaseProgress
  }
  
  const config = PHASE_MAP[phaseKey]
  return config ? config.comp : PhaseInput
})

const activeStep = computed(() => PHASE_MAP[jobData.value?.current_phase]?.step || 0)

const currentPhaseInfo = computed(() => {
  const phase = jobData.value?.current_phase
  return PHASE_MAP[phase] || PHASE_MAP['init']
})

const statusConfig = computed(() => {
  const status = jobData.value?.status
  const map = {
    'processing': { type: 'warning', text: '處理中', color: '#f59e0b' },
    'completed': { type: 'success', text: '已完成', color: '#10b981' },
    'failed': { type: 'danger', text: '失敗', color: '#ef4444' },
    'pending': { type: 'info', text: '等待中', color: '#3b82f6' }
  }
  return map[status] || map['pending']
})

const handleNextPhase = async (webhookUrl, payload = {}) => {
  isTriggering.value = true
  try {
    await axios.post(webhookUrl, { job_id: props.jobId, ...payload })
    ElMessage.success('已啟動下一階段任務')
    await fetchJob()
    startPolling(3000)
  } catch (e) {
    ElMessage.error('啟動失敗: ' + e.message)
  } finally {
    isTriggering.value = false
  }
}

onMounted(() => { if (props.jobId) fetchJob() })
onUnmounted(() => stopPolling())
</script>

<template>
  <div class="workspace-container">
    <!-- 頂部導航欄 -->
    <header class="workspace-header">
      <div class="header-left">
        <el-button 
          class="back-btn"
          size="large"
          @click="$emit('back')"
        >
          ← 返回列表
        </el-button>
        
        <div class="project-info">
          <span class="project-id">#{{ jobData?.id?.slice(0, 8) || '...' }}</span>
          <span class="project-name">{{ jobData?.input_data?.project_name || '載入中...' }}</span>
        </div>
      </div>

      <div class="header-right">
        <div class="status-badge" :style="{ background: statusConfig.color }">
          <span class="status-icon">{{ currentPhaseInfo.icon }}</span>
          <span class="status-text">{{ currentPhaseInfo.title }}</span>
        </div>
      </div>
    </header>

    <!-- 步驟進度條 -->
    <div class="steps-section">
      <div class="steps-container">
        <div 
          v-for="(step, idx) in STEPS" 
          :key="idx"
          class="step-item"
          :class="{ 
            active: idx === activeStep,
            completed: idx < activeStep 
          }"
        >
          <div class="step-circle">
            <span v-if="idx < activeStep" class="check-icon">✓</span>
            <span v-else class="step-icon">{{ step.icon }}</span>
          </div>
          <span class="step-title">{{ step.title }}</span>
          <div v-if="idx < STEPS.length - 1" class="step-line"></div>
        </div>
      </div>
    </div>

    <!-- 主要內容區 -->
    <main class="workspace-content" v-loading="isTriggering">
      <Transition name="fade" mode="out-in">
        <component 
          :is="currentComponent" 
          :job-data="jobData" 
          @next="handleNextPhase" 
          @refresh="fetchJob"
        />
      </Transition>
    </main>
  </div>
</template>

<style scoped>
.workspace-container {
  min-height: 100vh;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
}

/* 頂部導航 */
.workspace-header {
  background: white;
  border-bottom: 2px solid #e2e8f0;
  padding: 20px 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 24px;
}

.back-btn {
  font-weight: 600;
  color: #667eea;
  border: 1px solid #e2e8f0;
}

.back-btn:hover {
  background: #f8f9ff;
  border-color: #667eea;
}

.project-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.project-id {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: #94a3b8;
  font-weight: 600;
}

.project-name {
  font-size: 16px;
  font-weight: 700;
  color: #1e293b;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 20px;
  color: white;
  font-weight: 600;
  font-size: 14px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.status-icon {
  font-size: 18px;
}

/* 步驟進度條 */
.steps-section {
  background: white;
  padding: 32px;
  border-bottom: 1px solid #e2e8f0;
}

.steps-container {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
}

.step-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  position: relative;
  flex: 1;
}

.step-circle {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  transition: all 0.3s;
  position: relative;
  z-index: 2;
}

.step-item.active .step-circle {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  box-shadow: 0 8px 16px rgba(102, 126, 234, 0.4);
  transform: scale(1.1);
}

.step-item.completed .step-circle {
  background: #10b981;
}

.check-icon {
  color: white;
  font-size: 28px;
  font-weight: 700;
}

.step-icon {
  filter: grayscale(1);
  opacity: 0.5;
}

.step-item.active .step-icon,
.step-item.completed .step-icon {
  filter: none;
  opacity: 1;
}

.step-title {
  font-size: 14px;
  font-weight: 600;
  color: #94a3b8;
  transition: all 0.3s;
}

.step-item.active .step-title {
  color: #667eea;
  font-size: 15px;
}

.step-item.completed .step-title {
  color: #10b981;
}

.step-line {
  position: absolute;
  top: 28px;
  left: 50%;
  width: 100%;
  height: 3px;
  background: #e2e8f0;
  z-index: 1;
  transition: all 0.3s;
}

.step-item.completed .step-line {
  background: #10b981;
}

/* 主要內容區 */
.workspace-content {
  flex: 1;
  padding: 32px;
  overflow-y: auto;
}

/* 過渡動畫 */
.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

/* 響應式 */
@media (max-width: 1024px) {
  .steps-container {
    overflow-x: auto;
    justify-content: flex-start;
    gap: 40px;
  }

  .step-item {
    flex: 0 0 auto;
    min-width: 80px;
  }

  .step-line {
    width: 40px;
    left: calc(100% - 20px);
  }
}

@media (max-width: 768px) {
  .workspace-header {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }

  .header-left {
    width: 100%;
    flex-direction: column;
    align-items: flex-start;
  }

  .steps-section {
    padding: 20px;
  }

  .step-circle {
    width: 48px;
    height: 48px;
    font-size: 20px;
  }

  .step-title {
    font-size: 12px;
  }

  .workspace-content {
    padding: 20px;
  }
}
</style>
