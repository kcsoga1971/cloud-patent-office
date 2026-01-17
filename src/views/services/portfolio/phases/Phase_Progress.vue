<!-- src/views/services/portfolio/phases/Phase_Progress.vue -->
<script setup>
import { computed } from 'vue'

const props = defineProps(['jobData'])

const progress = computed(() => props.jobData?.progress || {})
const percentage = computed(() => progress.value.percentage || 0)
const message = computed(() => progress.value.message || 'AI 正在進行深度分析...')
const current = computed(() => progress.value.current || 0)
const total = computed(() => progress.value.total || 0)
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
        <h2>AI 正在進行深度分析</h2>
        <p class="subtitle">{{ message }}</p>
      </div>

      <!-- 進度條區 -->
      <div class="progress-section">
        <el-progress 
          :percentage="percentage" 
          :stroke-width="20"
          striped
          striped-flow
          :color="progressColor"
        />
        <div class="progress-label">
          <span class="progress-percent">{{ percentage }}%</span>
          <span v-if="total > 0" class="progress-status">{{ current }} / {{ total }}</span>
        </div>
      </div>

      <!-- 提示文字 -->
      <div class="hint-text">
        <p>⏱️ 請稍候，這可能需要幾分鐘的時間</p>
        <p>💡 您可以離開此頁面，系統會在背景繼續處理</p>
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
  margin-bottom: 32px;
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

/* 提示文字 */
.hint-text {
  padding-top: 24px;
  border-top: 1px dashed #e2e8f0;
}

.hint-text p {
  font-size: 14px;
  color: #94a3b8;
  margin: 8px 0;
}

/* Element Plus 進度條樣式覆蓋 */
:deep(.el-progress-bar__outer) {
  background: #e2e8f0;
  border-radius: 10px;
}

:deep(.el-progress-bar__inner) {
  border-radius: 10px;
}
</style>
