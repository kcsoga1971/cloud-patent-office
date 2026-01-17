<!-- src/views/services/InvalidationPage.vue -->
<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { supabase } from '../../supabase'
import { useUserStore } from '../../stores/user'
import InvalidationResultPanel from './InvalidationResultPanel.vue'
import ServiceTips from '../../components/ServiceTips.vue'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const INVALIDATION_COST = 800

// Data
const jobId = ref(route.query.job_id || null)
const isInit = ref(!route.query.job_id)
const isUploading = ref(false)
const isProcessing = ref(false)
const resultData = ref(null)
const pollTimer = ref(null)

const files = ref({ target: null })
const evidenceFiles = ref([{ file: null, patent_number: '' }])

const insufficientFunds = computed(() => {
  const balance = userStore.profile?.credits_balance || 0
  return balance < INVALIDATION_COST
})

const canStart = computed(() => {
  return files.value.target && evidenceFiles.value.some(e => e.file)
})

const handleFileUpload = (event, type) => {
  const file = event.target.files[0]
  if (file && file.type === 'application/pdf') {
    files.value[type] = file
  } else {
    alert('請上傳 PDF 格式檔案')
  }
}

const handleEvidenceUpload = (event, index) => {
  const file = event.target.files[0]
  if (file && file.type === 'application/pdf') {
    evidenceFiles.value[index].file = file
  } else {
    alert('請上傳 PDF 格式檔案')
  }
}

const addEvidenceSlot = () => {
  if (evidenceFiles.value.length < 3) {
    evidenceFiles.value.push({ file: null, patent_number: '' })
  }
}

const removeEvidence = (index) => {
  evidenceFiles.value.splice(index, 1)
  if (evidenceFiles.value.length === 0) {
    evidenceFiles.value.push({ file: null, patent_number: '' })
  }
}

const handleStartClick = async () => {
  if (!userStore.user) {
    alert('請先登入')
    return
  }
  if (insufficientFunds.value) {
    alert('點數不足，請先儲值')
    return
  }
  
  if (!confirm(`確定要開始分析嗎？將扣除 ${INVALIDATION_COST} 點`)) return
  
  await executeInvalidationJob()
}

const executeInvalidationJob = async () => {
  isUploading.value = true
  let transactionId = null
  let jobIdLocal = null

  try {
    // A. 預扣款
    const { data: reserveResult, error: reserveError } = await supabase
      .rpc('reserve_credits', {
        p_user_id: userStore.user.id,
        p_credits: INVALIDATION_COST,
        p_action_type: 'PATENT_INVALIDATION',
        p_description: `專利舉發分析`,
        p_model_name: 'Claude-4.5-Sonnet',
        p_project_id: null,
        p_job_id: null
      })

    if (reserveError || !reserveResult.success) {
      throw new Error(`預扣款失敗: ${reserveError?.message || reserveResult?.error}`)
    }
    
    transactionId = reserveResult.transaction_id

    // B. 建立案件
    const { data: job, error: jobError } = await supabase
      .from('saas_jobs')
      .insert({
        user_id: userStore.user.id,
        job_type: 'patent_invalidation',
        phase: 'phase6_invalidation',
        status: 'pending',
        payment_status: 'reserved',
        transaction_id: transactionId,
        credits_deducted: INVALIDATION_COST,
        input_data: {
          evidence_patents: []
        }
      })
      .select()
      .single()

    if (jobError) throw new Error('建立案件失敗: ' + jobError.message)
    
    jobId.value = job.id
    jobIdLocal = job.id

    // C. 上傳檔案
    const targetPath = `invalidation/${job.id}/target.pdf`
    const { error: targetUploadError } = await supabase.storage
      .from('patent-documents')
      .upload(targetPath, files.value.target)
    
    if (targetUploadError) throw new Error('系爭專利上傳失敗')

    const evidencePatents = []
    for (let i = 0; i < evidenceFiles.value.length; i++) {
      if (evidenceFiles.value[i].file) {
        const evidencePath = `invalidation/${job.id}/evidence_${i + 1}.pdf`
        const { error: evidenceUploadError } = await supabase.storage
          .from('patent-documents')
          .upload(evidencePath, evidenceFiles.value[i].file)
        
        if (evidenceUploadError) throw new Error(`證據 ${i + 1} 上傳失敗`)
        
        evidencePatents.push({
          file_path: evidencePath,
          patent_number: evidenceFiles.value[i].patent_number || `證據 ${i + 1}`
        })
      }
    }

    // D. 更新資料庫
    await supabase.from('saas_jobs').update({
      input_data: {
        target_patent_file_path: targetPath,
        evidence_patents: evidencePatents
      }
    }).eq('id', job.id)

    // E. 呼叫 n8n Webhook
    const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_INVALIDATION_URL
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        job_id: job.id,
        transaction_id: transactionId,
        user_id: userStore.user.id
      })
    })

    isInit.value = false
    isProcessing.value = true
    isUploading.value = false
    startPolling()

  } catch (err) {
    console.error('❌ 流程失敗:', err)
    alert('啟動失敗: ' + err.message)
    isUploading.value = false
    
    if (transactionId) {
      await supabase.rpc('refund_credits', {
        p_transaction_id: transactionId,
        p_reason: '系統啟動失敗: ' + err.message
      })
    }
  }
}

const startPolling = () => {
  pollTimer.value = setInterval(async () => {
    const { data } = await supabase
      .from('saas_jobs')
      .select('*')
      .eq('id', jobId.value)
      .single()

    if (data && data.status === 'completed' && data.result_data) {
      let parsedResult = data.result_data
      if (typeof parsedResult === 'string') {
        try {
          parsedResult = JSON.parse(parsedResult)
        } catch (e) {
          console.error('解析失敗:', e)
        }
      }
      
      resultData.value = parsedResult
      isProcessing.value = false
      clearInterval(pollTimer.value)
    }
  }, 3000)
}

onMounted(async () => {
  if (jobId.value) {
    const { data } = await supabase
      .from('saas_jobs')
      .select('*')
      .eq('id', jobId.value)
      .single()
    
    if (data && data.status === 'completed' && data.result_data) {
      let parsedResult = data.result_data
      if (typeof parsedResult === 'string') {
        try {
          parsedResult = JSON.parse(parsedResult)
        } catch (e) {
          console.error('解析失敗:', e)
        }
      }
      resultData.value = parsedResult
    } else {
      isProcessing.value = true
      startPolling()
    }
  }
})
</script>

<template>
  <div class="invalidation-page">
    <!-- 返回按鈕 -->
    <button 
      v-if="!isProcessing && !resultData"
      @click="router.push('/services/invalidation-workflow')" 
      class="back-button"
    >
      ← 返回案件列表
    </button>

    <!-- ========== 1️⃣ 初始上傳介面 ========== -->
    <div v-if="isInit && !isProcessing && !isUploading && !resultData" class="init-container">
      
      <!-- 頁面標題 -->
      <div class="page-header">
        <div class="header-icon">⚖️</div>
        <div class="header-content">
          <h1>專利舉發 (Patent Invalidation)</h1>
          <p class="subtitle">AI 智能分析系爭專利與證據專利，自動生成舉發理由書</p>
        </div>
        <div class="header-badges">
          <div class="cost-badge">
            <span class="icon">💎</span>
            <span class="cost">{{ INVALIDATION_COST }} 點</span>
          </div>
          <div class="balance-badge">
            <span class="label">餘額：</span>
            <span class="value">{{ userStore.profile?.credits_balance || 0 }} 點</span>
          </div>
        </div>
      </div>

      <!-- 步驟 1：上傳系爭專利 -->
      <div class="section-card">
        <div class="card-header">
          <div class="step-badge">步驟 1</div>
          <div class="header-text">
            <h2>上傳系爭專利</h2>
            <p class="card-description">請上傳要舉發的專利（PDF 格式）</p>
          </div>
        </div>
        
        <div class="upload-zone" :class="{ 'has-file': files.target }">
          <input 
            type="file" 
            accept=".pdf" 
            @change="handleFileUpload($event, 'target')"
            class="file-input"
            id="target-upload"
          />
          <label for="target-upload" class="upload-area">
            <div class="upload-icon">
              <span v-if="!files.target">📄</span>
              <span v-else class="success-icon">✅</span>
            </div>
            <div class="upload-content">
              <h3>系爭專利</h3>
              <p v-if="!files.target" class="upload-hint">點擊或拖放 PDF 檔案</p>
              <p v-else class="file-name">{{ files.target.name }}</p>
            </div>
          </label>
        </div>
      </div>

      <!-- 步驟 2：上傳證據專利 -->
      <div class="section-card">
        <div class="card-header">
          <div class="step-badge">步驟 2</div>
          <div class="header-text">
            <h2>上傳證據專利</h2>
            <p class="card-description">請上傳 1-3 份證據專利（PDF 格式）</p>
          </div>
        </div>
        
        <div class="evidence-list">
          <div 
            v-for="(evidence, index) in evidenceFiles" 
            :key="index"
            class="evidence-item"
            :class="{ 'has-file': evidence.file }"
          >
            <div class="evidence-number">證據 {{ index + 1 }}</div>
            <input 
              type="file" 
              accept=".pdf" 
              @change="handleEvidenceUpload($event, index)"
              class="file-input"
              :id="`evidence-${index}`"
            />
            <label :for="`evidence-${index}`" class="upload-label">
              <span v-if="!evidence.file" class="upload-hint">📎 點擊上傳 PDF</span>
              <span v-else class="file-name">✅ {{ evidence.file.name }}</span>
            </label>
            <button 
              v-if="evidence.file" 
              @click="removeEvidence(index)"
              class="btn-remove"
            >
              🗑️
            </button>
          </div>
        </div>
        
        <button 
          v-if="evidenceFiles.length < 3" 
          @click="addEvidenceSlot"
          class="btn-add-evidence"
        >
          ➕ 新增證據專利
        </button>
      </div>

      <!-- 步驟 3：開始分析 -->
      <div class="action-section">
        <button 
          @click="handleStartClick" 
          :disabled="!canStart || insufficientFunds || isUploading"
          class="btn-start-analysis"
          :class="{ 
            'disabled': !canStart || insufficientFunds,
            'loading': isUploading
          }"
        >
          <span v-if="isUploading">⏳ 上傳中...</span>
          <span v-else-if="insufficientFunds">❌ 點數不足</span>
          <span v-else-if="!canStart">📤 請先上傳檔案</span>
          <span v-else>🚀 開始 AI 舉發分析（{{ INVALIDATION_COST }} 點）</span>
        </button>
      </div>

      <!-- ServiceTips -->
      <ServiceTips type="invalidation" />
    </div>

    <!-- ========== 2️⃣ 處理中介面 ========== -->
    <div v-else-if="isProcessing && !resultData" class="status-container">
      <div class="status-card">
        <div class="spinner-large"></div>
        <h2>🤖 AI 正在分析舉發案件...</h2>
        <p class="status-description">正在比對技術特徵、分析進步性、生成舉發理由書</p>
        <p class="status-time">這通常需要 3-8 分鐘，請稍候</p>
      </div>
    </div>

    <!-- ========== 3️⃣ 結果顯示介面 ========== -->
    <InvalidationResultPanel 
      v-else-if="resultData"
      :result-data="resultData"
      :job-id="jobId"
    />
  </div>
</template>

<style scoped>
.invalidation-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

/* 返回按鈕 */
.back-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  color: #64748b;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  margin-bottom: 24px;
}

.back-button:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
  color: #475569;
}

/* 頁面標題 */
.page-header {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 32px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  margin-bottom: 32px;
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.25);
}

.header-icon {
  font-size: 64px;
  width: 96px;
  height: 96px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.header-content {
  flex: 1;
}

.header-content h1 {
  font-size: 28px;
  font-weight: 700;
  color: white;
  margin: 0 0 8px 0;
}

.subtitle {
  font-size: 15px;
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
}

.header-badges {
  display: flex;
  gap: 12px;
}

.cost-badge,
.balance-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.cost-badge .icon {
  font-size: 20px;
}

.cost-badge .cost {
  font-size: 18px;
  font-weight: 700;
  color: #667eea;
}

.balance-badge .label {
  font-size: 13px;
  color: #64748b;
}

.balance-badge .value {
  font-size: 18px;
  font-weight: 700;
  color: #10b981;
}

/* 區塊卡片 */
.section-card {
  background: white;
  border-radius: 16px;
  padding: 32px;
  margin-bottom: 24px;
  border: 2px solid #e2e8f0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.step-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 16px;
  font-weight: 700;
  font-size: 14px;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
  flex-shrink: 0;
}

.header-text h2 {
  font-size: 22px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 4px 0;
}

.card-description {
  font-size: 14px;
  color: #64748b;
  margin: 0;
}

/* 上傳區域 */
.upload-zone {
  border: 2px dashed #cbd5e1;
  border-radius: 12px;
  padding: 32px;
  transition: all 0.3s;
  background: #f8fafc;
}

.upload-zone:hover {
  border-color: #667eea;
  background: #f8f9ff;
}

.upload-zone.has-file {
  border-color: #10b981;
  background: #f0fdf4;
}

.file-input {
  display: none;
}

.upload-area {
  display: flex;
  align-items: center;
  gap: 24px;
  cursor: pointer;
}

.upload-icon {
  font-size: 48px;
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

.success-icon {
  font-size: 48px;
}

.upload-content h3 {
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 8px 0;
}

.upload-hint {
  font-size: 14px;
  color: #64748b;
  margin: 0;
}

.file-name {
  font-size: 14px;
  color: #10b981;
  font-weight: 600;
  margin: 0;
}

/* 證據列表 */
.evidence-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 20px;
}

.evidence-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: #f8fafc;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  transition: all 0.3s;
}

.evidence-item:hover {
  border-color: #cbd5e1;
}

.evidence-item.has-file {
  border-color: #10b981;
  background: #f0fdf4;
}

.evidence-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 48px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 8px;
  font-weight: 700;
  font-size: 13px;
  flex-shrink: 0;
}

.upload-label {
  flex: 1;
  padding: 12px 20px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  text-align: center;
}

.upload-label:hover {
  border-color: #667eea;
  background: #f8f9ff;
}

.btn-remove {
  padding: 8px 16px;
  background: #fee2e2;
  border: 1px solid #fca5a5;
  border-radius: 8px;
  color: #dc2626;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-remove:hover {
  background: #fecaca;
}

.btn-add-evidence {
  width: 100%;
  padding: 16px;
  background: white;
  border: 2px dashed #cbd5e1;
  border-radius: 12px;
  color: #667eea;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-add-evidence:hover {
  border-color: #667eea;
  background: #f8f9ff;
}

/* 操作區域 */
.action-section {
  margin-top: 32px;
  text-align: center;
}

.btn-start-analysis {
  padding: 20px 48px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.btn-start-analysis:hover:not(.disabled):not(.loading) {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(102, 126, 234, 0.4);
}

.btn-start-analysis.disabled {
  background: #e2e8f0;
  color: #94a3b8;
  cursor: not-allowed;
  box-shadow: none;
}

.btn-start-analysis.loading {
  background: #94a3b8;
  cursor: wait;
}

/* 處理中狀態 */
.status-container {
  min-height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-card {
  text-align: center;
  padding: 60px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.spinner-large {
  width: 64px;
  height: 64px;
  border: 4px solid #f3f4f6;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 24px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.status-card h2 {
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 12px 0;
}

.status-description {
  font-size: 15px;
  color: #64748b;
  margin: 0 0 8px 0;
}

.status-time {
  font-size: 14px;
  color: #94a3b8;
  margin: 0;
}

/* 響應式 */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-badges {
    width: 100%;
    flex-direction: column;
  }

  .cost-badge,
  .balance-badge {
    width: 100%;
    justify-content: space-between;
  }

  .upload-area {
    flex-direction: column;
    text-align: center;
  }

  .evidence-item {
    flex-direction: column;
  }

  .upload-label {
    width: 100%;
  }
}
</style>
