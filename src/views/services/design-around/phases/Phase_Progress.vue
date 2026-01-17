<!-- src/views/services/design-around/phases/Phase_Progress.vue -->
<script setup>
import { computed } from 'vue'

const props = defineProps(['jobData'])
const emit = defineEmits(['next'])

// 判斷是哪個階段，顯示對應標題
const isPhase2_3 = computed(() => props.jobData.current_phase === 'design_around_patent_analysis')

const title = computed(() => isPhase2_3.value ? 'AI 正在深度解析專利...' : 'AI 正在進行風險評估...')

// 從 jobData.progress (JSON) 讀取 n8n 寫入的進度
const progress = computed(() => props.jobData.progress || {})

const percentage = computed(() => progress.value.percentage || 0)
const progressMessage = computed(() => progress.value.message || '初始化中...')
const processedCount = computed(() => progress.value.current || 0)
const totalCount = computed(() => progress.value.total || 0)

const estimatedTime = computed(() => {
  const remaining = totalCount.value - processedCount.value
  if (remaining <= 0) return '即將完成'
  const seconds = remaining * 45
  return seconds > 60 ? `${Math.ceil(seconds/60)} 分鐘` : `${seconds} 秒`
})

const isPhaseDone = computed(() => {
  return props.jobData.progress?.percentage === 100
})

const nextButtonText = computed(() => {
  if (props.jobData.current_phase === 'design_around_risk_evaluation') {
    return '生成最終報告 →'
  }
  return '繼續下一步 →'
})

const triggerNext = () => {
  if (props.jobData.current_phase === 'design_around_risk_evaluation') {
    emit('next', import.meta.env.VITE_N8N_DESIGN_AROUND_PHASE8_URL)
  }
}
</script>

<template>
  <div class="progress-container">
    <div class="progress-card">
      <!-- 動畫區 -->
      <div class="animation-section">
        <div class="pulse-wrapper">
          <div class="pulse-circle"></div>
          <div class="pulse-circle-outer"></div>
        </div>
        <div class="icon-overlay">🤖</div>
      </div>

      <!-- 標題區 -->
      <div class="title-section">
        <h2>{{ title }}</h2>
        <p class="subtitle">{{ progressMessage }}</p>
      </div>

      <!-- 進度條區 -->
      <div class="progress-section">
        <el-progress 
          :percentage="percentage" 
          :status="percentage === 100 ? 'success' : ''"
          :stroke-width="20"
          striped
          striped-flow
          :color="progressColor"
        />
        <div class="progress-label">
          <span class="progress-percent">{{ percentage }}%</span>
          <span class="progress-status">{{ percentage === 100 ? '✅ 完成' : '⏳ 處理中' }}</span>
        </div>
      </div>

      <!-- 統計區 -->
      <div class="stats-section">
        <div class="stat-card">
          <div class="stat-icon">📊</div>
          <div class="stat-content">
            <span class="stat-label">處理進度</span>
            <span class="stat-value">{{ processedCount }} / {{ totalCount }}</span>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">⏱️</div>
          <div class="stat-content">
            <span class="stat-label">預估時間</span>
            <span class="stat-value">{{ estimatedTime }}</span>
          </div>
        </div>
      </div>

      <!-- 完成後的按鈕 -->
      <div v-if="isPhaseDone" class="action-section">
        <el-button 
          type="primary" 
          size="large" 
          class="next-btn"
          @click="triggerNext"
        >
          {{ nextButtonText }}
        </el-button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  computed: {
    progressColor() {
      return [
        { color: '#667eea', percentage: 30 },
        { color: '#764ba2', percentage: 70 },
        { color: '#f093fb', percentage: 100 }
      ]
    }
  }
}
</script>

<style scoped>
.progress-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 24px;
}

.progress-card {
  background: white;
  border-radius: 16px;
  padding: 48px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  text-align: center;
}

/* 動畫區 */
.animation-section {
  position: relative;
  margin-bottom: 32px;
}

.pulse-wrapper {
  width: 120px;
  height: 120px;
  margin: 0 auto;
  position: relative;
}

.pulse-circle {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  animation: pulse 2s infinite;
}

.pulse-circle-outer {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  opacity: 0.3;
  animation: pulse-outer 2s infinite;
}

@keyframes pulse {
  0%, 100% { 
    transform: translate(-50%, -50%) scale(0.95);
    opacity: 0.8;
  }
  50% { 
    transform: translate(-50%, -50%) scale(1.05);
    opacity: 1;
  }
}

@keyframes pulse-outer {
  0% { 
    transform: translate(-50%, -50%) scale(1);
    opacity: 0.3;
  }
  100% { 
    transform: translate(-50%, -50%) scale(1.5);
    opacity: 0;
  }
}

.icon-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 48px;
  z-index: 10;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translate(-50%, -50%) translateY(0); }
  50% { transform: translate(-50%, -50%) translateY(-10px); }
}

/* 標題區 */
.title-section {
  margin-bottom: 40px;
}

.title-section h2 {
  font-size: 28px;
  font-weight: 700;
  color: #2c3e50;
  margin: 0 0 12px 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.subtitle {
  font-size: 16px;
  color: #64748b;
  margin: 0;
}

/* 進度條區 */
.progress-section {
  margin-bottom: 40px;
}

.progress-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
  padding: 0 4px;
}

.progress-percent {
  font-size: 20px;
  font-weight: 700;
  color: #667eea;
}

.progress-status {
  font-size: 14px;
  font-weight: 600;
  color: #64748b;
}

/* 統計區 */
.stats-section {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  margin-bottom: 32px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: linear-gradient(135deg, #f8f9ff 0%, #f0f4ff 100%);
  border-radius: 12px;
  border: 1px solid #e0e7ff;
  transition: all 0.3s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
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
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.stat-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: left;
}

.stat-label {
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
}

/* 按鈕區 */
.action-section {
  margin-top: 32px;
  padding-top: 32px;
  border-top: 2px dashed #e2e8f0;
}

.next-btn {
  width: 100%;
  height: 56px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border: none;
  border-radius: 12px;
  font-size: 17px;
  font-weight: 600;
  box-shadow: 0 8px 16px rgba(16, 185, 129, 0.3);
  transition: all 0.3s;
}

.next-btn:hover {
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
  transform: translateY(-2px);
  box-shadow: 0 12px 24px rgba(16, 185, 129, 0.4);
}

/* Element Plus 進度條樣式覆蓋 */
:deep(.el-progress-bar__outer) {
  background: #e2e8f0;
  border-radius: 10px;
}

:deep(.el-progress-bar__inner) {
  border-radius: 10px;
  transition: all 0.4s ease;
}

/* 響應式 */
@media (max-width: 768px) {
  .progress-card {
    padding: 32px 24px;
  }

  .stats-section {
    grid-template-columns: 1fr;
  }

  .title-section h2 {
    font-size: 24px;
  }
}
</style>
