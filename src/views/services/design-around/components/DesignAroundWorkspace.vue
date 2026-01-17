<!-- src/views/services/design-around/components/DesignAroundWorkspace.vue -->
<script setup>
import { ref, onMounted, onUnmounted, computed, defineAsyncComponent } from 'vue'
import { supabase } from '@/supabase'
import { ElMessage } from 'element-plus'
import axios from 'axios'

const Phase1Input = defineAsyncComponent(() => import('../phases/Phase1_Input.vue'))
const Phase1Review = defineAsyncComponent(() => import('../phases/Phase1_Review.vue'))
const PhaseProgress = defineAsyncComponent(() => import('../phases/Phase_Progress.vue'))
const Phase4Portfolio = defineAsyncComponent(() => import('../phases/Phase4_Portfolio.vue'))
const Phase5Ideation = defineAsyncComponent(() => import('../phases/Phase5_Ideation.vue'))
const Phase8Report = defineAsyncComponent(() => import('../phases/Phase8_Report.vue'))

const props = defineProps(['jobId'])
const emit = defineEmits(['back'])

const jobData = ref(null)
const pollTimer = ref(null)
const isTriggering = ref(false)

const PHASE_MAP = {
  'init': { step: 0, comp: Phase1Input, title: '專案啟動' },
  'design_around_patent_collection': { step: 1, comp: Phase1Review, title: '資料審核' },
  'design_around_patent_analysis': { step: 2, comp: PhaseProgress, title: 'AI 深度分析中...' },
  'design_around_portfolio_analysis': { step: 3, comp: Phase4Portfolio, title: '組合策略分析' },
  'design_around_ideation': { step: 4, comp: Phase5Ideation, title: '迴避方案生成' },
  'design_around_risk_evaluation': { step: 5, comp: PhaseProgress, title: '風險評估中...' },
  'completed': { step: 6, comp: Phase8Report, title: '最終報告' }
}

const currentPhaseKey = computed(() => jobData.value?.current_phase || 'init')
const currentConfig = computed(() => PHASE_MAP[currentPhaseKey.value] || PHASE_MAP['init'])
const currentComponent = computed(() => currentConfig.value.comp)

const fetchJob = async () => {
  if (!props.jobId) return
  const { data, error } = await supabase
    .from('saas_jobs')
    .select('*')
    .eq('id', props.jobId)
    .single()
  
  if (data) {
    jobData.value = data
    if (['design_around_patent_analysis', 'design_around_risk_evaluation'].includes(data.current_phase)) {
      if (!pollTimer.value) startPolling(3000)
    } else if (data.status === 'completed') {
      stopPolling()
    } else {
      if (!pollTimer.value) startPolling(5000)
    }
  }
}

const startPolling = (interval) => {
  stopPolling()
  pollTimer.value = setInterval(fetchJob, interval)
}

const stopPolling = () => {
  if (pollTimer.value) {
    clearInterval(pollTimer.value)
    pollTimer.value = null
  }
}

const handleTriggerNext = async (webhookUrl, payload = {}) => {
  if (!webhookUrl) {
    ElMessage.error('系統錯誤：未設定 Webhook URL')
    return
  }

  isTriggering.value = true
  try {
    await axios.post(webhookUrl, { job_id: props.jobId, ...payload })
    ElMessage.success('指令已發送，AI 開始作業...')
    await fetchJob()
    startPolling(3000)
  } catch (e) {
    ElMessage.error('觸發失敗: ' + e.message)
  } finally {
    isTriggering.value = false
  }
}

onMounted(() => { if(props.jobId) fetchJob() })
onUnmounted(() => stopPolling())
</script>

<template>
  <div class="workspace">
    <header class="ws-header">
      <div class="left">
        <button @click="$emit('back')" class="btn-back">← 返回</button>
        <span class="job-id" v-if="jobData">#{{ jobData.id.slice(0,8) }}</span>
      </div>
      <div class="center">
        <div class="custom-steps">
          <div 
            v-for="(step, idx) in ['收集', '分析', '策略', '生成', '評估', '報告']" 
            :key="idx"
            class="step-item"
            :class="{ 
              active: idx === currentConfig.step, 
              done: idx < currentConfig.step 
            }"
          >
            <div class="step-circle">{{ idx + 1 }}</div>
            <div class="step-label">{{ step }}</div>
          </div>
        </div>
      </div>
      <div class="right">
        <span class="status-badge">{{ currentConfig.title }}</span>
      </div>
    </header>

    <main class="ws-content" v-loading="isTriggering">
      <component 
        :is="currentComponent"
        :job-data="jobData"
        @next="handleTriggerNext"
        @refresh="fetchJob"
      />
    </main>
  </div>
</template>

<style scoped>
.workspace { 
  display: flex; 
  flex-direction: column; 
  height: 100%; 
  background: #f5f7fa; 
}

.ws-header { 
  background: #fff; 
  padding: 16px 24px; 
  border-bottom: 1px solid #e4e7ed; 
  display: flex; 
  align-items: center; 
  justify-content: space-between; 
}

.btn-back {
  background: none;
  border: 1px solid #ddd;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  color: #666;
  font-weight: 500;
}

.btn-back:hover {
  background: #f5f5f5;
}

.job-id {
  margin-left: 12px;
  font-family: monospace;
  color: #999;
  font-size: 14px;
}

.custom-steps {
  display: flex;
  gap: 24px;
  align-items: center;
}

.step-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.step-circle {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #e4e7ed;
  color: #909399;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
  transition: all 0.3s;
}

.step-item.active .step-circle {
  background: #2196F3;
  color: white;
}

.step-item.done .step-circle {
  background: #67C23A;
  color: white;
}

.step-label {
  font-size: 12px;
  color: #909399;
}

.step-item.active .step-label {
  color: #2196F3;
  font-weight: 600;
}

.status-badge { 
  padding: 6px 16px; 
  border-radius: 12px; 
  font-size: 13px; 
  background: #e6f7ff; 
  color: #1890ff; 
  font-weight: 600; 
}

.ws-content { 
  flex: 1; 
  padding: 24px; 
  overflow-y: auto; 
}

@media (max-width: 768px) {
  .ws-header {
    flex-direction: column;
    gap: 12px;
  }
  
  .custom-steps {
    gap: 12px;
  }
  
  .step-label {
    display: none;
  }
}
</style>


