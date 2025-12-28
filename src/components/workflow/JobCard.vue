<!-- src/components/workflow/JobCard.vue -->
<script setup>
import { ref, computed } from 'vue'
import { supabase } from '../../supabase'
import { formatDate } from '../../utils/formatters'

const props = defineProps({
  job: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['continuePhase2', 'revise', 'check', 'export', 'prepareSubmission', 'updated'])

// ========== 編號編輯狀態 ==========
const isEditingNumber = ref(false)
const editingNumber = ref('')
const isSaving = ref(false)

// ========== 計算案件狀態 ==========
const jobStatus = computed(() => {
  const { phase, status, current_version: ver } = props.job
  
  // 7. 已完稿
  if (phase === 'phase6_filed') 
    return { label: '🎉 已完稿送件', color: '#607D8B', icon: '📁' }
    
  // 6. 修訂稿已檢查
  if (phase === 'phase4_revised' && status === 'checked')
    return { label: `✅ 修訂稿已檢查 (v${ver})`, color: '#2E7D32', icon: '✅' } // 深綠
    
  // 5. 修訂稿已完成 (未檢查)
  if (phase === 'phase4_revised')
    return { label: `✏️ 修訂稿待檢查 (v${ver})`, color: '#FF9800', icon: '✏️' }
    
  // 4. 初稿已檢查
  if (phase === 'phase2_completed' && status === 'checked')
    return { label: '✅ 初稿已檢查', color: '#4CAF50', icon: '✅' } // 淺綠
    
  // 3. 初稿已完成
  if (phase === 'phase2_completed')
    return { label: '📄 初稿完成 (v1)', color: '#9C27B0', icon: '📄' }
    
  // 2. 待撰寫
  return { label: '📝 待撰寫 Phase 2', color: '#2196F3', icon: '⏳' }
})

// ========== ✅ 只保留這一個 buttons 定義 ==========
const buttons = computed(() => {
  const phase = props.job.phase
  const status = props.job.status
  
  if (phase === 'phase1_completed') {
    return [
      { label: '📝 繼續撰寫 Phase 2', event: 'continuePhase2', class: 'btn-primary' }
    ]
  }
  
  if (status === 'checked') {
    return [
      { label: '📮 準備送件', event: 'prepareSubmission', class: 'btn-success' },
      { label: '📄 匯出最終版本', event: 'export', class: 'btn-success' },
      { label: '✏️ 再次修改', event: 'revise', class: 'btn-secondary' }
    ]
  }
  
  return [
    { label: '🔍 檢查錯誤', event: 'check', class: 'btn-primary' },
    { 
      label: '📮 準備送件', 
      event: 'prepareSubmission', 
      class: 'btn-warning',
      needsWarning: true
    },
    { label: '📄 匯出 Word/PDF', event: 'export', class: 'btn-secondary' },
    { label: '✏️ 修改說明書', event: 'revise', class: 'btn-secondary' }
  ]
})

// ========== 描述文字 ==========
const description = computed(() => {
  const inputData = props.job.input_data || {}
  const problem = inputData.problem || ''
  return problem.substring(0, 120) + (problem.length > 120 ? '...' : '')
})

// ========== 編號編輯功能 ==========
const startEditNumber = () => {
  editingNumber.value = props.job.my_patent_drafting_number || ''
  isEditingNumber.value = true
  
  // 自動聚焦到輸入框
  setTimeout(() => {
    const input = document.querySelector('.number-input')
    if (input) input.focus()
  }, 50)
}

const cancelEditNumber = () => {
  isEditingNumber.value = false
  editingNumber.value = ''
}

const saveNumber = async () => {
  if (isSaving.value) return
  
  const newNumber = editingNumber.value.trim()
  
  // 如果沒有變更,直接取消
  if (newNumber === (props.job.my_patent_drafting_number || '')) {
    cancelEditNumber()
    return
  }
  
  isSaving.value = true
  
  try {
    const { error } = await supabase
      .from('saas_jobs')
      .update({ 
        my_patent_drafting_number: newNumber || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', props.job.id)
    
    if (error) throw error
    
    console.log('✅ 案件編號已更新:', newNumber)
    
    // 通知父組件更新
    emit('updated')
    
    // 關閉編輯模式
    isEditingNumber.value = false
    
  } catch (err) {
    console.error('❌ 更新案件編號失敗:', err)
    alert('更新失敗：' + err.message)
  } finally {
    isSaving.value = false
  }
}

// ========== 警告處理函數-警示使用者先檢查再送件 ==========
const handlePrepareSubmissionWithWarning = () => {
  const confirmed = confirm(
    '⚠️ 您尚未執行錯誤檢查\n\n' +
    '建議先進行檢查以確保文件品質。\n\n' +
    '確定要直接進入送件準備嗎？'
  )
  
  if (confirmed) {
    emit('prepareSubmission', props.job.id)
  }
}

// ========== 🔧 處理按鈕點擊 ==========
const handleButtonClick = (btn) => {
  // 如果需要警告
  if (btn.needsWarning) {
    const confirmed = confirm(
      '⚠️ 您尚未執行錯誤檢查\n\n' +
      '建議先進行檢查以確保文件品質。\n' +
      '未檢查的文件可能在送件時被退件。\n\n' +
      '確定要直接進入送件準備嗎？'
    )
    
    if (!confirmed) return  // 取消就不執行
  }
  
  // 執行事件
  emit(btn.event, props.job.id)
}

// ========== 按 Enter 儲存,按 Esc 取消 ==========
const handleKeydown = (e) => {
  if (e.key === 'Enter') {
    saveNumber()
  } else if (e.key === 'Escape') {
    cancelEditNumber()
  }
}
</script>

<template>
  <div class="job-card" :style="{ borderLeftColor: jobStatus.color }">
    <!-- 狀態標籤 -->
    <div class="status-badge" :style="{ background: jobStatus.color }">
      {{ jobStatus.icon }} {{ jobStatus.label }}
    </div>
    
    <div class="card-content">
      <!-- ========== 案件編號 ========== -->
      <div class="job-number-section">
        <!-- 顯示模式 -->
        <div v-if="!isEditingNumber" class="number-display">
          <span class="number-label">📋 案件編號：</span>
          <span v-if="job.my_patent_drafting_number" class="number-value">
            {{ job.my_patent_drafting_number }}
          </span>
          <span v-else class="number-empty">未設定</span>
          <button @click="startEditNumber" class="btn-edit-number" title="編輯案件編號">
            ✏️
          </button>
        </div>
        
        <!-- 編輯模式 -->
        <div v-else class="number-edit">
          <input 
            v-model="editingNumber"
            @keydown="handleKeydown"
            class="number-input"
            type="text"
            placeholder="例如：2025-P001"
            maxlength="50"
            :disabled="isSaving"
          />
          <button 
            @click="saveNumber" 
            class="btn-save"
            :disabled="isSaving"
          >
            {{ isSaving ? '⏳' : '✓' }}
          </button>
          <button 
            @click="cancelEditNumber" 
            class="btn-cancel"
            :disabled="isSaving"
          >
            ✕
          </button>
        </div>
      </div>
      
      <!-- 標題 -->
      <h3 class="job-title">
        {{ job.input_data?.title || job.project_name || '未命名發明' }}
      </h3>
      
      <!-- 元資訊 -->
      <div class="job-meta">
        <span class="meta-item">
          📅 {{ formatDate(job.updated_at || job.created_at) }}
        </span>
        <span class="meta-item">
          🤖 {{ job.model_name || 'Claude Sonnet 4.5' }}
        </span>
        <span v-if="job.current_version > 1" class="meta-item">
          🔢 版本 {{ job.current_version }}
        </span>
      </div>
      
      <!-- 描述 -->
      <p class="job-desc">{{ description }}</p>
      
      <!-- 按鈕組 -->
      <div class="job-actions">
        <button 
          v-for="btn in buttons" 
          :key="btn.label"
          :class="['btn', btn.class]"
          @click="handleButtonClick(btn)"
        >
          {{ btn.label }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.job-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  border-left: 4px solid #e0e0e0;
  position: relative;
}

.job-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  transform: translateY(-2px);
}

/* ========== 狀態標籤 ========== */
.status-badge {
  position: absolute;
  top: 20px;
  right: 20px;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  color: white;
  white-space: nowrap;
}

/* ========== 內容區 ========== */
.card-content {
  padding-right: 140px; /* 為狀態標籤留空間 */
}

/* ========== 案件編號區 ========== */
.job-number-section {
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.number-display {
  display: flex;
  align-items: center;
  gap: 8px;
}

.number-label {
  font-size: 13px;
  color: #666;
  font-weight: 500;
}

.number-value {
  font-size: 14px;
  color: #1a1a1a;
  font-weight: 600;
  font-family: 'Courier New', monospace;
  background: #f5f5f5;
  padding: 4px 12px;
  border-radius: 6px;
}

.number-empty {
  font-size: 13px;
  color: #999;
  font-style: italic;
}

.btn-edit-number {
  padding: 4px 8px;
  background: transparent;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-edit-number:hover {
  background: #f5f5f5;
  border-color: #2196F3;
}

/* ========== 編輯模式 ========== */
.number-edit {
  display: flex;
  gap: 8px;
  align-items: center;
}

.number-input {
  flex: 1;
  padding: 8px 12px;
  border: 2px solid #2196F3;
  border-radius: 6px;
  font-size: 14px;
  font-family: 'Courier New', monospace;
  outline: none;
  transition: all 0.3s ease;
}

.number-input:focus {
  border-color: #1976D2;
  box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.1);
}

.number-input:disabled {
  background: #f5f5f5;
  cursor: not-allowed;
}

.btn-save,
.btn-cancel {
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 36px;
}

.btn-save {
  background: #4CAF50;
  color: white;
}

.btn-save:hover:not(:disabled) {
  background: #388E3C;
}

.btn-save:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.btn-cancel {
  background: #f44336;
  color: white;
}

.btn-cancel:hover:not(:disabled) {
  background: #d32f2f;
}

.btn-cancel:disabled {
  background: #ccc;
  cursor: not-allowed;
}

/* ========== 標題 ========== */
.job-title {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 12px 0;
  line-height: 1.4;
}

.job-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 12px;
}

.meta-item {
  font-size: 13px;
  color: #666;
  display: flex;
  align-items: center;
  gap: 4px;
}

.job-desc {
  font-size: 14px;
  color: #666;
  line-height: 1.6;
  margin: 0 0 20px 0;
}

/* ========== 按鈕組 ========== */
.job-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.btn-primary {
  background: linear-gradient(135deg, #2196F3, #1976D2);
  color: white;
}

.btn-primary:hover {
  background: linear-gradient(135deg, #1976D2, #1565C0);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(33, 150, 243, 0.4);
}

.btn-success {
  background: linear-gradient(135deg, #4CAF50, #388E3C);
  color: white;
}

.btn-success:hover {
  background: linear-gradient(135deg, #388E3C, #2E7D32);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4);
}

.btn-info {
  background: linear-gradient(135deg, #9C27B0, #7B1FA2);
  color: white;
}

.btn-info:hover {
  background: linear-gradient(135deg, #7B1FA2, #6A1B9A);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(156, 39, 176, 0.4);
}

.btn-secondary {
  background: white;
  color: #666;
  border: 1px solid #e0e0e0;
}

.btn-secondary:hover {
  background: #f5f5f5;
  border-color: #ccc;
}

/* ========== 響應式 ========== */
@media (max-width: 768px) {
  .card-content {
    padding-right: 0;
  }
  
  .status-badge {
    position: static;
    display: inline-block;
    margin-bottom: 12px;
  }
  
  .job-actions {
    flex-direction: column;
  }
  
  .btn {
    width: 100%;
  }
  
  .number-edit {
    flex-direction: column;
  }
  
  .number-input {
    width: 100%;
  }
  
  .btn-save,
  .btn-cancel {
    width: 100%;
  }
}

/* 警告按鈕樣式 */
.btn-warning {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: white;
  border: 2px solid #f59e0b;
}

.btn-warning:hover {
  background: linear-gradient(135deg, #d97706, #b45309);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
}
</style>

