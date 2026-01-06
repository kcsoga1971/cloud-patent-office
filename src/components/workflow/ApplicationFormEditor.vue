<!-- src/components/workflow/ApplicationFormEditor.vue -->
<template>
  <div class="application-form-editor">
    <div class="editor-header">
      <h2>📋 專利申請書資料確認</h2>
      <p class="subtitle">請確認以下資訊，並補充圖式相關資料</p>
    </div>

    <!-- 系統自動計算的資料（唯讀） -->
    <div class="section auto-calculated">
      <h3>✅ 系統自動計算（無需修改）</h3>
      
      <div class="info-grid">
        <div class="info-item">
          <label>摘要頁數</label>
          <div class="value readonly">{{ jobData.abstract_pages || 1 }} 頁</div>
        </div>
        
        <div class="info-item">
          <label>說明書頁數</label>
          <div class="value readonly">{{ jobData.specification_pages || 0 }} 頁</div>
        </div>
        
        <div class="info-item">
          <label>申請專利範圍頁數</label>
          <div class="value readonly">{{ jobData.claims_pages || 0 }} 頁</div>
        </div>
        
        <div class="info-item">
          <label>請求項數量</label>
          <div class="value readonly">{{ jobData.claim_count || 0 }} 項</div>
        </div>
      </div>
    </div>

    <!-- 使用者手動填入的資料 -->
    <div class="section user-input">
      <h3>✏️ 請手動填入圖式資訊</h3>
      
      <div class="help-text">
        <span class="icon">💡</span>
        <div>
          <strong>提示：</strong>請根據您實際準備的專利圖式填寫以下資訊。
          圖式應由專業繪圖軟體製作，確保符合智慧財產局的規範。
        </div>
      </div>
      
      <div class="form-grid">
        <div class="form-item">
          <label>
            圖式頁數 <span class="required">*</span>
          </label>
          <input 
            v-model.number="formData.figures_pages"
            type="number"
            min="0"
            placeholder="例如：5"
            class="input"
            :class="{ error: errors.figures_pages }"
          />
          <span v-if="errors.figures_pages" class="error-msg">
            {{ errors.figures_pages }}
          </span>
          <span class="hint">通常每張圖佔 1 頁</span>
        </div>
        
        <div class="form-item">
          <label>
            圖式數量 <span class="required">*</span>
          </label>
          <input 
            v-model.number="formData.figure_count"
            type="number"
            min="1"
            placeholder="例如：5"
            class="input"
            :class="{ error: errors.figure_count }"
          />
          <span v-if="errors.figure_count" class="error-msg">
            {{ errors.figure_count }}
          </span>
          <span class="hint">圖1、圖2、圖3... 共幾張圖</span>
        </div>
      </div>
    </div>

    <!-- 總頁數計算（自動） -->
    <div class="section total-summary">
      <h3>📊 總計</h3>
      
      <div class="total-grid">
        <div class="total-item">
          <span class="label">總頁數</span>
          <span class="value large">{{ calculatedTotalPages }} 頁</span>
        </div>
        
        <div class="calculation-detail">
          <div class="calc-row">
            <span>摘要：</span>
            <span>{{ jobData.abstract_pages || 1 }} 頁</span>
          </div>
          <div class="calc-row">
            <span>說明書：</span>
            <span>{{ jobData.specification_pages || 0 }} 頁</span>
          </div>
          <div class="calc-row">
            <span>申請專利範圍：</span>
            <span>{{ jobData.claims_pages || 0 }} 頁</span>
          </div>
          <div class="calc-row">
            <span>圖式：</span>
            <span>{{ formData.figures_pages || 0 }} 頁</span>
          </div>
          <div class="calc-row total">
            <span>合計：</span>
            <span>{{ calculatedTotalPages }} 頁</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 規費計算 -->
    <div class="section fee-summary">
      <h3>💰 規費試算</h3>
      
      <div class="fee-grid">
        <div class="fee-item">
          <span class="label">基本規費</span>
          <span class="value">NT$ 3,500</span>
        </div>
        
        <div class="fee-item" v-if="extraClaimsFee > 0">
          <span class="label">超過 10 項請求項加收</span>
          <span class="value">NT$ {{ extraClaimsFee.toLocaleString() }}</span>
          <span class="detail">
            ({{ jobData.claim_count - 10 }} 項 × $800)
          </span>
        </div>
        
        <div class="fee-item" v-if="extraPagesFee > 0">
          <span class="label">超過 20 頁加收</span>
          <span class="value">NT$ {{ extraPagesFee.toLocaleString() }}</span>
          <span class="detail">
            ({{ calculatedTotalPages - 20 }} 頁 × $500)
          </span>
        </div>
        
        <div class="fee-item total">
          <span class="label">總規費</span>
          <span class="value large">NT$ {{ totalFee.toLocaleString() }}</span>
        </div>
      </div>
    </div>

    <!-- 操作按鈕 -->
    <div class="actions">
      <button 
        @click="handleSave" 
        class="btn btn-primary"
        :disabled="!isValid || isSaving"
      >
        {{ isSaving ? '⏳ 儲存中...' : '✅ 確認並生成申請書' }}
      </button>
      
      <button 
        @click="$emit('cancel')" 
        class="btn btn-secondary"
        :disabled="isSaving"
      >
        取消
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { supabase } from '../../supabase'

const props = defineProps({
  jobData: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['saved', 'cancel'])

// ========== 表單資料 ==========
const formData = ref({
  figures_pages: props.jobData.figures_pages || null,
  figure_count: props.jobData.figure_count || null
})

const errors = ref({
  figures_pages: '',
  figure_count: ''
})

const isSaving = ref(false)

// ========== 計算屬性 ==========
const calculatedTotalPages = computed(() => {
  const abstract = props.jobData.abstract_pages || 1
  const spec = props.jobData.specification_pages || 0
  const claims = props.jobData.claims_pages || 0
  const figures = formData.value.figures_pages || 0
  
  return abstract + spec + claims + figures
})

const extraClaimsFee = computed(() => {
  const claimCount = props.jobData.claim_count || 0
  return Math.max(0, claimCount - 10) * 800
})

const extraPagesFee = computed(() => {
  return Math.max(0, calculatedTotalPages.value - 20) * 500
})

const totalFee = computed(() => {
  return 3500 + extraClaimsFee.value + extraPagesFee.value
})

const isValid = computed(() => {
  return formData.value.figures_pages !== null && 
         formData.value.figures_pages >= 0 &&
         formData.value.figure_count !== null && 
         formData.value.figure_count >= 1
})

// ========== 驗證 ==========
watch(() => formData.value.figures_pages, (val) => {
  if (val === null || val === '') {
    errors.value.figures_pages = '請填寫圖式頁數'
  } else if (val < 0) {
    errors.value.figures_pages = '頁數不能為負數'
  } else {
    errors.value.figures_pages = ''
  }
})

watch(() => formData.value.figure_count, (val) => {
  if (val === null || val === '') {
    errors.value.figure_count = '請填寫圖式數量'
  } else if (val < 1) {
    errors.value.figure_count = '至少需要 1 張圖'
  } else {
    errors.value.figure_count = ''
  }
})

// ========== 儲存 ==========
const handleSave = async () => {
  if (!isValid.value) return
  
  isSaving.value = true
  
  try {
    const { error } = await supabase
      .from('saas_jobs')
      .update({
        figures_pages: formData.value.figures_pages,
        figure_count: formData.value.figure_count,
        total_pages: calculatedTotalPages.value,
        page_counts_completed: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', props.jobData.id)
    
    if (error) throw error
    
    console.log('✅ 頁數資訊已儲存')
    
    // 回傳完整資料
    emit('saved', {
      ...props.jobData,
      figures_pages: formData.value.figures_pages,
      figure_count: formData.value.figure_count,
      total_pages: calculatedTotalPages.value,
      application_fee: totalFee.value
    })
    
  } catch (err) {
    console.error('❌ 儲存失敗:', err)
    alert('儲存失敗：' + err.message)
  } finally {
    isSaving.value = false
  }
}
</script>

<style scoped>
.application-form-editor {
  max-width: 900px;
  margin: 0 auto;
  padding: 24px;
}

.editor-header {
  text-align: center;
  margin-bottom: 32px;
}

.editor-header h2 {
  font-size: 28px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 8px 0;
}

.subtitle {
  font-size: 14px;
  color: #666;
  margin: 0;
}

.section {
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.section h3 {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 16px 0;
  color: #1a1a1a;
}

/* 自動計算區塊 */
.auto-calculated {
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border: 2px solid #0ea5e9;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.info-item label {
  display: block;
  font-size: 13px;
  color: #666;
  margin-bottom: 4px;
}

.value {
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
}

.value.readonly {
  color: #0ea5e9;
}

/* 使用者輸入區塊 */
.user-input {
  border: 2px solid #f59e0b;
  background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
}

.help-text {
  display: flex;
  gap: 12px;
  padding: 12px;
  background: white;
  border-radius: 8px;
  margin-bottom: 20px;
  border-left: 4px solid #f59e0b;
}

.help-text .icon {
  font-size: 24px;
}

.help-text strong {
  color: #92400e;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.form-item label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
  margin-bottom: 8px;
}

.required {
  color: #ef4444;
}

.input {
  width: 100%;
  padding: 10px 12px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 16px;
  transition: all 0.3s;
}

.input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.input.error {
  border-color: #ef4444;
}

.error-msg {
  display: block;
  color: #ef4444;
  font-size: 12px;
  margin-top: 4px;
}

.hint {
  display: block;
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

/* 總計區塊 */
.total-summary {
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
  border: 2px solid #22c55e;
}

.total-grid {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 24px;
  align-items: center;
}

.total-item {
  text-align: center;
  padding: 20px;
  background: white;
  border-radius: 8px;
}

.total-item .label {
  display: block;
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}

.value.large {
  font-size: 32px;
  color: #22c55e;
}

.calculation-detail {
  background: white;
  padding: 16px;
  border-radius: 8px;
}

.calc-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 14px;
  color: #666;
}

.calc-row.total {
  border-top: 2px solid #e5e7eb;
  margin-top: 8px;
  padding-top: 12px;
  font-weight: 600;
  font-size: 16px;
  color: #1a1a1a;
}

/* 規費區塊 */
.fee-summary {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border: 2px solid #f59e0b;
}

.fee-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.fee-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: white;
  border-radius: 8px;
}

.fee-item .label {
  font-size: 14px;
  color: #666;
}

.fee-item .value {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
}

.fee-item .detail {
  font-size: 12px;
  color: #999;
  margin-left: 8px;
}

.fee-item.total {
  background: #f59e0b;
  color: white;
}

.fee-item.total .label,
.fee-item.total .value {
  color: white;
}

/* 操作按鈕 */
.actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 32px;
}

.btn {
  padding: 12px 32px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-primary {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.btn-primary:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.btn-secondary {
  background: white;
  color: #666;
  border: 2px solid #e5e7eb;
}

.btn-secondary:hover:not(:disabled) {
  background: #f9fafb;
  border-color: #d1d5db;
}

@media (max-width: 768px) {
  .total-grid {
    grid-template-columns: 1fr;
  }
  
  .form-grid {
    grid-template-columns: 1fr;
  }
  
  .actions {
    flex-direction: column;
  }
  
  .btn {
    width: 100%;
  }
}
</style>
