<!-- src/components/submission/SubmissionGuide.vue -->
<script setup>
import StepCard from './StepCard.vue'

defineProps({
  guide: {
    type: Object,
    required: true
  }
})
</script>

<template>
  <div class="submission-guide">
    <!-- 標題 -->
    <div class="guide-header">
      <h2>{{ guide.title }}</h2>
    </div>
    
    <!-- 步驟列表 -->
    <div class="steps-list">
      <StepCard 
        v-for="step in guide.steps" 
        :key="step.step"
        :step="step"
      />
    </div>
    
    <!-- 小提示 -->
    <div v-if="guide.tips && guide.tips.length > 0" class="tips-section">
      <div class="card">
        <div class="card-header">
          <h3>💡 小提示</h3>
        </div>
        <div class="card-body">
          <ul class="tips-list">
            <li v-for="(tip, idx) in guide.tips" :key="idx">{{ tip }}</li>
          </ul>
        </div>
      </div>
    </div>
    
    <!-- 警告 -->
    <div v-if="guide.warnings && guide.warnings.length > 0" class="warnings-section">
      <div class="alert alert-warning">
        <div class="alert-icon">⚠️</div>
        <div class="alert-content">
          <h4>重要提醒</h4>
          <ul>
            <li v-for="(warning, idx) in guide.warnings" :key="idx">{{ warning }}</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.submission-guide {
  margin-top: 2rem;
}

.guide-header {
  margin-bottom: 2rem;
}

.guide-header h2 {
  font-size: 1.875rem;
  font-weight: 700;
  color: #111827;
}

.steps-list {
  margin-bottom: 2rem;
}

.tips-section,
.warnings-section {
  margin-top: 2rem;
}

.card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  overflow: hidden;
}

.card-header {
  padding: 1rem 1.5rem;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

.card-header h3 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
}

.card-body {
  padding: 1.5rem;
}

.tips-list {
  margin: 0;
  padding-left: 1.25rem;
}

.tips-list li {
  margin-bottom: 0.5rem;
}

.alert {
  padding: 1.5rem;
  border-radius: 12px;
  display: flex;
  gap: 1rem;
}

.alert-warning {
  background: #fef3c7;
  border: 2px solid #f59e0b;
}

.alert-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.alert-content {
  flex: 1;
}

.alert-content h4 {
  margin: 0 0 0.75rem 0;
  font-weight: 700;
  color: #92400e;
}

.alert-content ul {
  margin: 0;
  padding-left: 1.25rem;
}

.alert-content li {
  margin-bottom: 0.5rem;
  color: #78350f;
}
</style>
