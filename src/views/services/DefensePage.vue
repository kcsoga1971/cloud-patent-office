<!-- src/views/services/DefensePage.vue -->
<template>
  <div class="defense-page">
    <div class="page-header">
      <button @click="router.push('/services/defense-workflow')" class="btn-back">← 返回案件列表</button>
      
      <div class="title-group">
        <h1>🛡️ 專利核駁答辯 (OA Defense)</h1>
        <div class="header-info">
          <div v-if="userStore.profile" class="credit-badge">
            <span class="icon">💎</span>
            <span class="balance">{{ userStore.profile.credits_balance }} 點</span>
          </div>
          <span class="status-badge" v-if="jobStatus">{{ jobStatusText }}</span>
        </div>
      </div>
    </div>

    <div v-if="!jobId || isInit" class="upload-container">
      <div class="card setup-card">
        <h3>1. 上傳案件資料</h3>

        <div class="form-group">
          <label>案件編號 / 申請號 (選填)</label>
          <input 
            v-model="patentNumber" 
            type="text" 
            placeholder="例如：113119534 或 2024-P001" 
            class="input-text"
          />
          <p class="hint-text">輸入案號可方便您在列表中快速識別案件。</p>
        </div>        
        
        <div class="form-group">
          <label>專利說明書-最新版本 (PDF/Word)</label>
          <input type="file" accept=".pdf,.docx,.doc" @change="(e) => handleFileUpload(e, 'spec')" />
          <p class="hint" v-if="files.spec">✅ 已選擇: {{ files.spec.name }}</p>
        </div>

        <div class="form-group">
          <label>審查意見通知書 (PDF)</label>
          <input type="file" accept=".pdf" @change="(e) => handleFileUpload(e, 'oa')" />
          <p class="hint" v-if="files.oa">✅ 已選擇: {{ files.oa.name }}</p>
        </div>
      </div>

      <div class="card strategy-card">
        <h3>2. 設定答辯策略</h3>
        <div class="radio-group">
          <label class="radio-card" :class="{ active: strategy === 'conservative' }">
            <input type="radio" v-model="strategy" value="conservative">
            <div class="radio-content">
              <strong>🛡️ 保守修正 (Conservative)</strong>
              <p>優先併入附屬項特徵，爭取快速獲准。</p>
            </div>
          </label>
          
          <label class="radio-card" :class="{ active: strategy === 'aggressive' }">
            <input type="radio" v-model="strategy" value="aggressive">
            <div class="radio-content">
              <strong>⚔️ 積極爭辯 (Aggressive)</strong>
              <p>盡量不縮減範圍，主攻審查員邏輯漏洞。</p>
            </div>
          </label>

          <label class="radio-card" :class="{ active: strategy === 'ai_recommended' }">
            <input type="radio" v-model="strategy" value="ai_recommended">
            <div class="radio-content">
              <strong>🤖 AI 智慧推薦</strong>
              <p>由 AI 分析引證案強度後決定。</p>
            </div>
          </label>
        </div>

        <div class="form-group">
          <label>額外備註 (選填)</label>
          <textarea v-model="userNotes" placeholder="例如：請求項 1 的連接結構是核心，不能刪除..."></textarea>
        </div>
      </div>

      <div class="action-footer">
        <div class="cost-info">
          本次分析將扣除 <span class="cost-highlight">{{ DEFENSE_COST }}</span> 點數
        </div>
        <button 
          @click="handleStartClick" 
          class="btn-primary btn-lg" 
          :disabled="!canStart || isUploading || insufficientFunds"
        >
          <span v-if="insufficientFunds">❌ 點數不足</span>
          <span v-else-if="isUploading">⏳ 處理中...</span>
          <span v-else>🚀 開始分析 ({{ DEFENSE_COST }} 點)</span>
        </button>
      </div>
    </div>

    <div v-if="jobId && isProcessing" class="processing-state">
      <div class="spinner-large"></div>
      <h2>AI 正在閱讀審查意見書...</h2>
      <p>這通常需要 1-2 分鐘，請稍候。</p>
      <div class="progress-steps">
        <div class="step completed">上傳檔案</div>
        <div class="step completed">文字提取 (OCR)</div>
        <div class="step active">Gemini 策略分析</div>
        <div class="step">生成答辯稿</div>
      </div>
    </div>

    <div v-if="jobId && !isProcessing && resultData" class="result-container">
      <DefenseResultPanel 
        :result-data="resultData" 
        :job-id="jobId"
        @export="handleExport"
      />
    </div>

    <div v-if="showConfirmModal" class="modal-overlay">
      <div class="modal-card">
        <div class="modal-header">
          <h3>💎 確認扣款</h3>
          <button @click="showConfirmModal = false" class="btn-close">×</button>
        </div>
        
        <div class="modal-body">
          <p>您即將啟動專利答辯分析服務。</p>
          
          <div class="transaction-summary">
            <div class="row">
              <span>目前餘額：</span>
              <span>{{ userStore.profile?.credits_balance }} 點</span>
            </div>
            <div class="row deduct">
              <span>本次扣除：</span>
              <span>- {{ DEFENSE_COST }} 點</span>
            </div>
            <div class="divider"></div>
            <div class="row final">
              <span>剩餘餘額：</span>
              <span>{{ (userStore.profile?.credits_balance || 0) - DEFENSE_COST }} 點</span>
            </div>
          </div>

          <p class="notice">
            ⚠️ AI 分析約需 2-3 分鐘，請勿關閉視窗。<br>
            若分析失敗，系統將自動退還點數。
          </p>
        </div>

        <div class="modal-footer">
          <button @click="showConfirmModal = false" class="btn-text">取消</button>
          <button @click="executeDefenseJob" class="btn-confirm">
            確認支付並開始
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { supabase } from '../../supabase'
import { useUserStore } from '../../stores/user'
import DefenseResultPanel from './DefenseResultPanel.vue'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

// 定義費用
const DEFENSE_COST = 500

// Data
const jobId = ref(route.query.job_id || null)
const isInit = ref(!route.query.job_id)
const isUploading = ref(false)
const isProcessing = ref(false)
const strategy = ref('ai_recommended')
const userNotes = ref('')
const resultData = ref(null)
const pollTimer = ref(null)

const files = ref({ spec: null, oa: null })
const showConfirmModal = ref(false)

// 新增變數
const patentNumber = ref('')

// 檢查餘額
const insufficientFunds = computed(() => {
  const balance = userStore.profile?.credits_balance || 0
  return balance < DEFENSE_COST
})

// Upload Handlers
const handleFileUpload = (event, type) => {
  const file = event.target.files[0]
  if (file) files.value[type] = file
}

const canStart = computed(() => files.value.spec && files.value.oa)

const jobStatus = ref('')
const jobStatusText = computed(() => {
  const map = {
    'pending': '處理中',
    'drafting': '撰寫中',
    'completed': '分析完成',
    'failed': '失敗'
  }
  return map[jobStatus.value] || jobStatus.value
})

// 1. 點擊「開始分析」 (僅檢查)
const handleStartClick = () => {
  if (!userStore.user) return alert('請先登入')
  
  if (insufficientFunds.value) {
    alert(`點數不足！需要 ${DEFENSE_COST} 點，目前僅有 ${userStore.profile?.credits_balance} 點。`)
    return
  }
  
  showConfirmModal.value = true
}

// 2. 執行扣款與任務 (核心邏輯)
const executeDefenseJob = async () => {
  showConfirmModal.value = false // 關閉 Modal
  
  console.log('🚀 準備啟動答辯分析流程...')
  isUploading.value = true
  let transactionId = null
  let jobIdLocal = null

  try {
    // 💰 A. 預扣款 (Reserve Credits)
    console.log('💰 正在預扣點數...')
    const { data: reserveResult, error: reserveError } = await supabase
      .rpc('reserve_credits', {
        p_user_id: userStore.user.id,
        p_credits: DEFENSE_COST,
        p_action_type: 'PATENT_DEFENSE', // 確保資料庫支援此類型，若無請用 TEXT
        p_description: `專利答辯分析`,
        p_model_name: 'Gemini-1.5-Pro',
        p_project_id: null,
        p_job_id: null
      })

    if (reserveError || !reserveResult.success) {
      throw new Error(`預扣款失敗: ${reserveError?.message || reserveResult?.error}`)
    }
    
    transactionId = reserveResult.transaction_id
    console.log('✅ 預扣成功, Transaction ID:', transactionId)

    // 📦 B. 建立 saas_jobs 記錄
    console.log('📦 正在建立案件記錄...')
    const { data: job, error: jobError } = await supabase
      .from('saas_jobs')
      .insert({
        user_id: userStore.user.id,
        job_type: 'patent_defense',
        phase: 'phase7_defense',
        status: 'pending',
        payment_status: 'reserved', // 標記為預扣
        transaction_id: transactionId,
        credits_deducted: DEFENSE_COST,
        // 🎯 重點：將 patentNumber 寫入 my_patent_drafting_number 欄位
        // 雖然欄位名是 drafting，但因為這是通用欄位，我們借用它來存答辯的案號
        my_patent_drafting_number: patentNumber.value || null,      
        input_data: {
          strategy: strategy.value,
          user_notes: userNotes.value,
          // 也可以備份在 input_data 裡
          patent_number: patentNumber.value
        }
      })
      .select()
      .single()

    if (jobError) throw new Error('建立案件失敗: ' + jobError.message)
    
    jobId.value = job.id
    jobIdLocal = job.id // 本地備份 ID 以供錯誤處理使用
    console.log('✅ 案件建立成功, Job ID:', job.id)

    // 🔗 更新 Transaction 的 job_id
    // (如果您的資料庫有 update_transaction_job 函數，若無可省略)
    try {
      await supabase.rpc('update_transaction_job', {
        p_transaction_id: transactionId,
        p_job_id: job.id
      })
    } catch (e) { console.warn('無法更新 Transaction Job ID (非致命錯誤)') }

    // 📂 C. 上傳檔案
    console.log('📂 正在上傳檔案...')
    const getExt = (file) => {
        const parts = file.name.split('.')
        return parts.length > 1 ? '.' + parts.pop() : ''
    }
    const specPath = `defense/${job.id}/spec${getExt(files.value.spec)}`
    const oaPath = `defense/${job.id}/oa${getExt(files.value.oa)}`

    const [uploadSpec, uploadOA] = await Promise.all([
      supabase.storage.from('patent-documents').upload(specPath, files.value.spec),
      supabase.storage.from('patent-documents').upload(oaPath, files.value.oa)
    ])

    if (uploadSpec.error || uploadOA.error) throw new Error('檔案上傳失敗')

    // 💾 D. 更新資料庫檔案路徑
    await supabase.from('saas_jobs').update({
      input_data: {
        ...job.input_data,
        spec_file_path: specPath,
        oa_file_path: oaPath
      }
    }).eq('id', job.id)

    // 🤖 E. 呼叫 n8n Webhook
    console.log('🤖 呼叫 n8n...')
    const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_DEFENSE_URL
    
    fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        job_id: job.id,
        transaction_id: transactionId
      })
    }).catch(err => console.error('Webhook 發送異常:', err))

    // 🏁 流程啟動完成
    isInit.value = false
    isProcessing.value = true
    startPolling()

  } catch (err) {
    console.error('❌ 流程失敗:', err)
    alert('啟動失敗: ' + err.message)
    isUploading.value = false
    
    // 💰 F. 失敗退款邏輯
    if (transactionId) {
      console.log('🔄 啟動失敗，執行退款...')
      await supabase.rpc('refund_credits', {
        p_transaction_id: transactionId,
        p_reason: '系統啟動失敗: ' + err.message
      })
      
      if (jobIdLocal) {
        await supabase.from('saas_jobs')
          .update({ payment_status: 'refunded', status: 'failed' })
          .eq('id', jobIdLocal)
      }
      // 更新餘額顯示
      userStore.fetchUser()
    }
  }
}

// 3. 輪詢狀態 (Polling)
const startPolling = () => {
  if (pollTimer.value) clearInterval(pollTimer.value)
  console.log('🔄 開始輪詢狀態...')
  
  pollTimer.value = setInterval(async () => {
    if (!jobId.value) return

    const { data, error } = await supabase
      .from('saas_jobs')
      .select('*')
      .eq('id', jobId.value)
      .single()

    if (error) return

    jobStatus.value = data.phase // 更新狀態文字

    // 檢查是否完成
    if (data.status === 'completed' && data.result_data) {
      
      // 💰 確認扣款 (Confirm Deduction)
      if (data.payment_status === 'reserved' && data.transaction_id) {
        console.log('✅ 任務完成，確認扣款...')
        await supabase.rpc('confirm_deduction', {
          p_transaction_id: data.transaction_id
        })
        
        await supabase.from('saas_jobs')
          .update({ payment_status: 'completed' })
          .eq('id', jobId.value)
          
        userStore.fetchUser()
      }

      // 解析 JSON
      let parsedResult = data.result_data
      if (typeof parsedResult === 'string') {
        try { parsedResult = JSON.parse(parsedResult) } catch (e) {}
      }

      if (parsedResult && (parsedResult.analysis_summary || parsedResult.argument)) {
        resultData.value = parsedResult
        isProcessing.value = false
        clearInterval(pollTimer.value)
      }
    } 
    else if (data.status === 'failed') {
      clearInterval(pollTimer.value)
      isProcessing.value = false
      alert('AI 分析失敗，請稍後重試。')
    }
  }, 3000)
}

// 4. Load Existing Job
onMounted(() => {
  if (jobId.value) {
    isProcessing.value = true
    startPolling()
  }
})

onUnmounted(() => {
  if (pollTimer.value) clearInterval(pollTimer.value)
})

const handleExport = () => {
  // 這個功能已移至 DefenseResultPanel 內部處理
}
</script>

<style scoped>
/* ========== 1. 整體容器與排版 ========== */
.defense-page {
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem;
  color: #2c3e50;
}

.page-header {
  margin-bottom: 2rem;
}

.btn-back {
  background: none;
  border: none;
  color: #666;
  font-size: 0.9rem;
  cursor: pointer;
  padding: 0;
  margin-bottom: 12px;
  transition: color 0.2s;
}

.btn-back:hover {
  color: #2196F3;
}

.title-group {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.title-group h1 {
  font-size: 1.8rem;
  font-weight: 700;
  margin: 0;
  color: #2c3e50;
}

/* Header 資訊區 (餘額顯示) */
.header-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.credit-badge {
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  color: #0284c7;
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 0.95rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.status-badge {
  background: #f5f5f5;
  color: #666;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 500;
}

/* ========== 2. 卡片通用樣式 ========== */
.upload-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.card {
  background: white;
  border-radius: 16px;
  padding: 28px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
  border: 1px solid #f0f0f0;
  transition: transform 0.2s;
}

.card h3 {
  font-size: 1.2rem;
  margin: 0 0 20px 0;
  color: #34495e;
  font-weight: 600;
  border-left: 4px solid #2196F3;
  padding-left: 12px;
}

/* ========== 3. 表單元素 ========== */
.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-weight: 500;
  margin-bottom: 8px;
  color: #4a5568;
}

.form-group input[type="file"] {
  display: block;
  width: 100%;
  padding: 10px;
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  cursor: pointer;
}

.form-group input[type="file"]:hover {
  background: #f1f5f9;
  border-color: #94a3b8;
}

.form-group textarea {
  width: 100%;
  height: 80px;
  padding: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  resize: vertical;
  font-family: inherit;
}

.hint {
  margin-top: 6px;
  font-size: 0.85rem;
  color: #10b981; /* Green for success */
}

/* ========== 4. 策略選擇 (Radio Cards) ========== */
.radio-group {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  margin-bottom: 24px;
}

.radio-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.radio-card:hover {
  border-color: #90cdf4;
  background: #f8fafc;
}

.radio-card.active {
  border-color: #2196F3;
  background: #eff6ff;
  box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.1);
}

.radio-card input[type="radio"] {
  margin-top: 4px;
  accent-color: #2196F3;
  width: 18px;
  height: 18px;
}

.radio-content strong {
  display: block;
  font-size: 1rem;
  color: #2d3748;
  margin-bottom: 4px;
}

.radio-content p {
  margin: 0;
  font-size: 0.9rem;
  color: #718096;
  line-height: 1.4;
}

/* ========== 5. 底部按鈕區 (Action Footer) ========== */
.action-footer {
  text-align: center;
  margin-top: 20px;
  padding-bottom: 40px;
}

.cost-info {
  margin-bottom: 12px;
  font-size: 1rem;
  color: #64748b;
}

.cost-highlight {
  color: #e53e3e;
  font-weight: 700;
  font-size: 1.2rem;
}

.btn-primary {
  background: linear-gradient(135deg, #2196F3, #1976D2);
  color: white;
  border: none;
  border-radius: 30px; /* 圓潤按鈕 */
  padding: 14px 48px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(33, 150, 243, 0.3);
  transition: all 0.3s;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(33, 150, 243, 0.4);
}

.btn-primary:disabled {
  background: #cbd5e1;
  cursor: not-allowed;
  box-shadow: none;
  transform: none;
}

/* ========== 6. Modal 彈窗樣式 ========== */
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal-card {
  background: white;
  width: 90%;
  max-width: 420px;
  border-radius: 16px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.modal-header {
  padding: 16px 24px;
  background: #f8f9fa;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.15rem;
  color: #1a202c;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-close {
  background: none; border: none; font-size: 1.5rem; color: #a0aec0; cursor: pointer; transition: color 0.2s;
}
.btn-close:hover { color: #4a5568; }

.modal-body { padding: 24px; }

.transaction-summary {
  background: #f7fafc;
  padding: 16px;
  border-radius: 12px;
  margin: 20px 0;
  border: 1px solid #edf2f7;
}

.row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  font-size: 0.95rem;
  color: #4a5568;
}

.row.deduct { color: #e53e3e; }
.row.final { 
  font-weight: 700; 
  color: #2d3748; 
  font-size: 1.1rem; 
  margin-bottom: 0; 
  padding-top: 10px;
  border-top: 1px dashed #cbd5e1;
}

.notice {
  font-size: 0.85rem;
  color: #718096;
  margin-top: 20px;
  line-height: 1.6;
  text-align: center;
  background: #fffaf0;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid #feebc8;
}

.modal-footer {
  padding: 16px 24px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  border-top: 1px solid #eee;
  background: #fff;
}

.btn-text {
  background: none; border: none; color: #64748b; cursor: pointer; font-size: 0.95rem; padding: 10px 20px; font-weight: 500;
}
.btn-text:hover { color: #1e293b; background: #f1f5f9; border-radius: 8px; }

.btn-confirm {
  background: #2196F3;
  color: white;
  border: none;
  padding: 10px 24px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}
.btn-confirm:hover { background: #1976D2; }

/* ========== 7. 處理中畫面 ========== */
.processing-state {
  text-align: center;
  padding: 60px 20px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.05);
}

.spinner-large {
  width: 60px; height: 60px;
  border: 5px solid #f3f3f3;
  border-top: 5px solid #2196F3;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 24px;
}

.progress-steps {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 30px;
}

.step {
  padding: 6px 16px;
  background: #f1f5f9;
  border-radius: 20px;
  color: #94a3b8;
  font-size: 0.9rem;
}
.step.active { background: #e0f2fe; color: #0284c7; font-weight: bold; }
.step.completed { background: #dcfce7; color: #166534; }

@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
@keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

/* RWD */
@media (max-width: 600px) {
  .defense-page { padding: 1rem; }
  .title-group { flex-direction: column; align-items: flex-start; }
  .modal-card { width: 95%; }
}
</style>