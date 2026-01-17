<!-- src/views/services/DesignAroundWorkspace.vue -->
<script setup>
import { ref, onMounted, onUnmounted, computed, defineAsyncComponent } from 'vue'
import { supabase } from '@/lib/supabase'
import { ElMessage } from 'element-plus'
import axios from 'axios'

// 非同步引入組件，優化效能
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

// === 狀態映射表 (State Machine) ===
// key: 資料庫中的 current_phase
const PHASE_MAP = {
  // 初始狀態
  'init': { step: 0, comp: Phase1Input, title: '專案啟動' },
  
  // Phase 1 剛跑完，等待使用者審核
  'design_around_patent_collection': { step: 1, comp: Phase1Review, title: '資料審核' },
  
  // Phase 2&3 正在跑 (Auto)
  'design_around_patent_analysis': { step: 2, comp: PhaseProgress, title: 'AI 深度分析中...' },
  
  // Phase 4 跑完，顯示矩陣，等待使用者看過
  'design_around_portfolio_analysis': { step: 3, comp: Phase4Portfolio, title: '組合策略分析' },
  
  // Phase 5 跑完，顯示方案，等待使用者挑選
  'design_around_ideation': { step: 4, comp: Phase5Ideation, title: '迴避方案生成' },
  
  // Phase 6&7 正在跑 (Auto)
  'design_around_risk_evaluation': { step: 5, comp: PhaseProgress, title: '風險評估中...' },
  
  // 全部完成
  'completed': { step: 6, comp: Phase8Report, title: '最終報告' }
}

// 計算屬性
const currentPhaseKey = computed(() => jobData.value?.current_phase || 'init')
const currentConfig = computed(() => PHASE_MAP[currentPhaseKey.value] || PHASE_MAP['init'])
const currentComponent = computed(() => currentConfig.value.comp)

// 資料讀取與輪詢
const fetchJob = async () => {
  if (!props.jobId) return
  const { data, error } = await supabase.from('saas_jobs').select('*').eq('id', props.jobId).single()
  if (data) {
    jobData.value = data
    // 如果是「進行中」的自動化階段，加快輪詢速度 (3s)
    // 如果是「等待使用者」的階段，可以慢一點或暫停 (這裡保持輪詢以防後端更新)
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
  if (pollTimer.value) { clearInterval(pollTimer.value); pollTimer.value = null }
}

// === 核心動作：觸發下一個 Phase ===
const handleTriggerNext = async (webhookKey, payload = {}) => {
  isTriggering.value = true
  try {
    // 1. 取得 Webhook URL
    const url = import.meta.env[`VITE_N8N_${webhookKey}`]
    if (!url) throw new Error(`Webhook ${webhookKey} 未設定`)

    // 2. 發送請求
    await axios.post(url, { job_id: props.jobId, ...payload })
    
    ElMessage.success('指令已發送，AI 開始作業...')
    
    // 3. 立即刷新並確保輪詢開啟
    await fetchJob()
    startPolling(3000)
    
  } catch (e) {
    ElMessage.error('觸發失敗: ' + e.message)
  } finally {
    isTriggering.value = false
  }
}

// 監聽 ID 變化
onMounted(() => { if(props.jobId) fetchJob() })
onUnmounted(() => stopPolling())
</script>

<template>
  <div class="workspace">
    <header class="ws-header">
      <div class="left">
        <el-button link @click="$emit('back')">← 返回</el-button>
        <span class="job-id" v-if="jobData">#{{ jobData.id.slice(0,8) }}</span>
      </div>
      <div class="center">
        <el-steps :active="currentConfig.step" finish-status="success" simple class="custom-steps">
          <el-step title="收集" />
          <el-step title="分析" />
          <el-step title="策略" />
          <el-step title="生成" />
          <el-step title="評估" />
          <el-step title="報告" />
        </el-steps>
      </div>
      <div class="right">
        <span class="status-badge" :class="jobData?.status">{{ currentConfig.title }}</span>
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
.workspace { display: flex; flex-direction: column; height: 100%; background: #f5f7fa; }
.ws-header { background: #fff; padding: 10px 20px; border-bottom: 1px solid #e4e7ed; display: flex; align-items: center; justify-content: space-between; height: 60px; }
.custom-steps { min-width: 500px; background: transparent !important; padding: 0; }
.ws-content { flex: 1; padding: 20px; overflow-y: auto; }
.status-badge { padding: 4px 12px; border-radius: 12px; font-size: 12px; background: #e6f7ff; color: #1890ff; font-weight: bold; }
.status-badge.completed { background: #f6ffed; color: #52c41a; }
</style>
