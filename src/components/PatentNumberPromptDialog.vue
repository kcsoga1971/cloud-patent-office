<!-- src/components/PatentNumberPromptDialog.vue -->
<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  isOpen: Boolean,
  errorDetails: Object,
  role: String, // 'target' | 'evidence'
  evidenceIndex: Number
})

const emit = defineEmits(['close', 'submit'])

const patentNumber = ref('')

const title = computed(() => {
  return props.role === 'target' 
    ? '⚠️ 系爭專利 PDF 提取失敗' 
    : `⚠️ 證據專利 ${props.evidenceIndex + 1} PDF 提取失敗`
})

const handleSubmit = () => {
  if (!patentNumber.value.trim()) {
    alert('請輸入專利號碼')
    return
  }
  
  emit('submit', {
    patent_number: patentNumber.value.trim(),
    role: props.role,
    evidence_index: props.evidenceIndex
  })
  
  patentNumber.value = ''
}

const handleClose = () => {
  patentNumber.value = ''
  emit('close')
}
</script>

<template>
  <div v-if="isOpen" class="dialog-overlay" @click.self="handleClose">
    <div class="dialog-container">
      <!-- 標題 -->
      <div class="dialog-header">
        <h2>{{ title }}</h2>
        <button @click="handleClose" class="btn-close">✕</button>
      </div>
      
      <!-- 內容 -->
      <div class="dialog-content">
        <!-- 錯誤訊息 -->
        <div class="error-message">
          <div class="error-icon">❌</div>
          <div class="error-text">
            <p class="error-title">{{ errorDetails?.message || 'PDF 文字提取失敗' }}</p>
            <p class="error-description">
              {{ errorDetails?.suggestion || '建議改用專利號碼，透過 Google Patents 下載標準格式的專利文件' }}
            </p>
          </div>
        </div>
        
        <!-- 建議步驟 -->
        <div class="steps-section">
          <p class="steps-title">📋 操作步驟:</p>
          <ol class="steps-list">
            <li v-for="(step, index) in errorDetails?.next_steps || defaultSteps" :key="index">
              {{ step }}
            </li>
          </ol>
        </div>
        
        <!-- 專利號碼輸入 -->
        <div class="input-section">
          <label class="input-label">請輸入專利號碼</label>
          <input 
            v-model="patentNumber"
            type="text" 
            placeholder="例如: US11734097B1 或 US-11734097-B1"
            class="input-field"
            @keydown.enter="handleSubmit"
          />
          <p class="input-hint">
            💡 支援格式: US11734097B1、US-11734097-B1、patent/US11734097B1/en
          </p>
        </div>
      </div>
      
      <!-- 按鈕 -->
      <div class="dialog-footer">
        <button @click="handleClose" class="btn-cancel">取消</button>
        <button 
          @click="handleSubmit" 
          :disabled="!patentNumber.trim()"
          class="btn-submit"
        >
          使用專利號碼下載
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      defaultSteps: [
        '1. 請提供專利號碼（例如: US1234567）',
        '2. 系統將自動從 Google Patents 下載',
        '3. 下載的文件格式更標準，提取成功率接近 100%'
      ]
    }
  }
}
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog-container {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
}

.dialog-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #111827;
}

.btn-close {
  background: none;
  border: none;
  font-size: 24px;
  color: #6b7280;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s;
}

.btn-close:hover {
  background: #f3f4f6;
  color: #111827;
}

.dialog-content {
  padding: 24px;
}

.error-message {
  display: flex;
  gap: 16px;
  padding: 16px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  margin-bottom: 20px;
}

.error-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.error-text {
  flex: 1;
}

.error-title {
  font-weight: 600;
  color: #991b1b;
  margin: 0 0 8px 0;
}

.error-description {
  color: #7f1d1d;
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
}

.steps-section {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
}

.steps-title {
  font-weight: 600;
  color: #1e40af;
  margin: 0 0 12px 0;
}

.steps-list {
  margin: 0;
  padding-left: 20px;
  color: #1e3a8a;
}

.steps-list li {
  margin-bottom: 8px;
  font-size: 14px;
  line-height: 1.5;
}

.steps-list li:last-child {
  margin-bottom: 0;
}

.input-section {
  margin-bottom: 0;
}

.input-label {
  display: block;
  font-weight: 500;
  color: #374151;
  margin-bottom: 8px;
}

.input-field {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  transition: all 0.2s;
}

.input-field:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.input-hint {
  margin: 8px 0 0 0;
  font-size: 12px;
  color: #6b7280;
}

.dialog-footer {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding: 16px 24px;
  border-top: 1px solid #e5e7eb;
}

.btn-cancel,
.btn-submit {
  padding: 10px 20px;
  border-radius: 6px;
  font-weight: 500;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel {
  background: white;
  border: 1px solid #d1d5db;
  color: #374151;
}

.btn-cancel:hover {
  background: #f9fafb;
}

.btn-submit {
  background: #3b82f6;
  border: 1px solid #3b82f6;
  color: white;
}

.btn-submit:hover:not(:disabled) {
  background: #2563eb;
}

.btn-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
