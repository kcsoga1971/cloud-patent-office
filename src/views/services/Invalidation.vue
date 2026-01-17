<!-- src/views/services/Invalidation.vue -->
<template>
  <div class="invalidation-page">
    <div class="page-header">
      <button @click="router.push('/services/invalidation-workflow')" class="btn-back">← 返回列表</button>
      <div class="title-group">
        <h1>⚔️ 專利舉發分析 (Invalidation)</h1>
        <div class="header-info">
          <div v-if="userStore.profile" class="credit-badge">
            <span class="icon">💎</span>
            <span class="balance">{{ userStore.profile.credits_balance }} 點</span>
          </div>
          <span class="status-badge" v-if="jobStatus">{{ jobStatusText }}</span>
        </div>
      </div>
    </div>

    <div v-if="!jobId || isInit" class="setup-container">
      
      <div class="card target-card">
        <div class="card-header-icon">🛡️</div>
        <h3>1. 系爭專利 (Target Patent)</h3>
        <p class="desc">您想要無效/舉發的目標專利。</p>
        <div class="form-group">
          <label>專利公告號 (例如：US9876543B2)</label>
          <input v-model="targetNumber" type="text" class="input-text" placeholder="輸入專利號..." />
        </div>
      </div>

      <div class="card evidence-card">
        <div class="card-header-icon">⚔️</div>
        <h3>2. 證據/引證案 (Prior Art / Evidence 1)</h3>
        <p class="desc">用來證明目標專利不具新穎性或進步性的主要證據。</p>
        
        <div class="tabs">
          <button :class="{ active: evidenceType === 'number' }" @click="evidenceType = 'number'">輸入專利號</button>
          <button :class="{ active: evidenceType === 'file' }" @click="evidenceType = 'file'">上傳 PDF</button>
        </div>

        <div v-if="evidenceType === 'number'" class="tab-content">
          <div class="form-group">
            <label>引證案專利號 (例如：US8765432B2)</label>
            <input v-model="evidenceNumber" type="text" class="input-text" placeholder="輸入引證案號..." />
          </div>
        </div>

        <div v-else class="tab-content">
          <div class="form-group">
            <label>上傳證據文件 (PDF)</label>
            <input type="file" accept=".pdf" @change="handleFileUpload" />
            <p class="hint" v-if="evidenceFile">✅ 已選擇: {{ evidenceFile.name }}</p>
          </div>
        </div>
      </div>

      <div class="action-footer">
        <div class="cost-info">
          舉發比對分析將扣除 <span class="cost-highlight">{{ COST }}</span> 點數
        </div>
        <button 
          @click="handleStartClick" 
          class="btn-primary btn-lg" 
          :disabled="!canStart || isUploading || insufficientFunds"
        >
          <span v-if="insufficientFunds">❌ 點數不足</span>
          <span v-else-if="isUploading">⏳ 處理中...</span>
          <span v-else>🚀 開始舉發比對</span>
        </button>
      </div>
    </div>

    <div v-if="jobId && isProcessing" class="processing-state">
      <div class="spinner-large"></div>
      <h2>AI 正在撰寫舉發理由書...</h2>
      <p>正在進行：請求項拆解 ➔ 證據特徵比對 ➔ 法律理由論述</p>
    </div>

    <div v-if="resultData" class="result-container">
      <div class="result-header">
        <h3>📊 分析結果</h3>
        <div class="actions">
          <button class="btn-secondary" @click="handleDownloadReport">📥 下載理由書 (Word)</button>
        </div>
      </div>

      <div class="card result-card conclusion">
        <h4>🎯 舉發成功率預估：{{ resultData.conclusion?.success_rate }}</h4>
        <p>{{ resultData.conclusion?.summary }}</p>
      </div>

      <div class="card result-card">
        <h4>🔎 證據比對表 (Claim Chart)</h4>
        <div class="table-wrapper">
          <table class="claim-chart">
            <thead>
              <tr>
                <th width="40%">系爭專利特徵 (Target)</th>
                <th width="40%">證據揭露內容 (Evidence)</th>
                <th width="20%">比對結果</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in resultData.claim_chart" :key="idx">
                <td>{{ row.target_element }}</td>
                <td>{{ row.evidence_disclosure }}</td>
                <td :class="getMatchClass(row.match_result)">{{ row.match_result }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="back-action">
        <button @click="router.push('/services/invalidation-workflow')" class="btn-text">返回列表</button>
      </div>
    </div>

    <div v-if="showConfirmModal" class="modal-overlay">
      <div class="modal-card">
        <div class="modal-header"><h3>💎 確認扣款</h3><button @click="showConfirmModal=false">×</button></div>
        <div class="modal-body">
          <p>啟動專利舉發分析。</p>
          <div class="row"><span>目前餘額：</span><span>{{ userStore.profile?.credits_balance }}</span></div>
          <div class="row deduct"><span>本次扣除：</span><span>- {{ COST }}</span></div>
          <hr>
          <div class="row final"><span>剩餘：</span><span>{{ (userStore.profile?.credits_balance || 0) - COST }}</span></div>
        </div>
        <div class="modal-footer">
          <button @click="showConfirmModal=false" class="btn-text">取消</button>
          <button @click="executeJob" class="btn-confirm">確認支付</button>
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
import { usePatentDocx } from '../../composables/usePatentDocx' // 需實作 generateInvalidationReport

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const { generateInvalidationReport } = usePatentDocx()

const COST = 2000 // 舉發是高價值服務
const jobId = ref(route.query.job_id || null)
const isInit = ref(!route.query.job_id)
const isUploading = ref(false)
const isProcessing = ref(false)
const showConfirmModal = ref(false)
const resultData = ref(null)
const pollTimer = ref(null)
const jobStatus = ref('')

const targetNumber = ref('')
const evidenceType = ref('number') // number or file
const evidenceNumber = ref('')
const evidenceFile = ref(null)

const insufficientFunds = computed(() => (userStore.profile?.credits_balance || 0) < COST)
const canStart = computed(() => {
  const hasTarget = targetNumber.value.length > 5
  const hasEvidence = evidenceType.value === 'number' ? evidenceNumber.value.length > 5 : evidenceFile.value
  return hasTarget && hasEvidence
})
const jobStatusText = computed(() => jobStatus.value === 'completed' ? '分析完成' : '處理中')

const handleFileUpload = (e) => { evidenceFile.value = e.target.files[0] }

const handleStartClick = () => {
  if (!userStore.user) return alert('請先登入')
  if (insufficientFunds.value) return alert('點數不足')
  showConfirmModal.value = true
}

const executeJob = async () => {
  showConfirmModal.value = false
  isUploading.value = true
  let transactionId = null

  try {
    // 1. 扣點
    const { data: reserve, error: resErr } = await supabase.rpc('reserve_credits', {
      p_user_id: userStore.user.id,
      p_credits: COST,
      p_action_type: 'PATENT_INVALIDATION',
      p_description: `舉發: ${targetNumber.value} vs ${evidenceNumber.value || 'Evidence File'}`,
      p_model_name: 'Invalidation-Engine',
      p_job_id: null, p_project_id: null
    })
    if (resErr || !reserve.success) throw new Error('扣款失敗')
    transactionId = reserve.transaction_id

    // 2. 建立 Job
    const { data: job, error: jobErr } = await supabase.from('saas_jobs').insert({
      user_id: userStore.user.id,
      job_type: 'patent_invalidation',
      status: 'pending',
      payment_status: 'reserved',
      transaction_id: transactionId,
      credits_deducted: COST,
      input_data: {
        target_patent: targetNumber.value,
        evidence_type: evidenceType.value,
        evidence_patent: evidenceNumber.value
      }
    }).select().single()
    if (jobErr) throw jobErr
    jobId.value = job.id

    // 3. 上傳檔案 (如果是 File 模式)
    let filePath = null
    if (evidenceType.value === 'file' && evidenceFile.value) {
      filePath = `invalidation/${job.id}/evidence.pdf`
      await supabase.storage.from('patent-documents').upload(filePath, evidenceFile.value)
      await supabase.from('saas_jobs').update({
        input_data: { ...job.input_data, evidence_file_path: filePath }
      }).eq('id', job.id)
    }

    // 4. 呼叫 n8n
    fetch(import.meta.env.VITE_N8N_WEBHOOK_INVALIDATION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        job_id: job.id, 
        transaction_id: transactionId,
        target_patent: targetNumber.value,
        evidence_type: evidenceType.value,
        evidence_patent: evidenceNumber.value,
        evidence_file_path: filePath
      })
    })

    isInit.value = false
    isProcessing.value = true
    startPolling()

  } catch (err) {
    console.error(err)
    alert('啟動失敗: ' + err.message)
    isUploading.value = false
    if (transactionId) await supabase.rpc('refund_credits', { p_transaction_id: transactionId, p_reason: err.message })
  }
}

const startPolling = () => {
  if (pollTimer.value) clearInterval(pollTimer.value)
  pollTimer.value = setInterval(async () => {
    if (!jobId.value) return
    const { data } = await supabase.from('saas_jobs').select('*').eq('id', jobId.value).single()
    jobStatus.value = data.status
    if (data.status === 'completed' && data.result_data) {
      if (data.payment_status === 'reserved') {
        await supabase.rpc('confirm_deduction', { p_transaction_id: data.transaction_id })
        await supabase.from('saas_jobs').update({ payment_status: 'completed' }).eq('id', jobId.value)
        userStore.fetchUser()
      }
      let parsed = data.result_data
      if (typeof parsed === 'string') { try { parsed = JSON.parse(parsed) } catch (e) {} }
      resultData.value = parsed
      isProcessing.value = false
      clearInterval(pollTimer.value)
    }
  }, 3000)
}

const handleDownloadReport = async () => {
  if (!resultData.value) return
  await generateInvalidationReport({
    fileName: `舉發理由書_${targetNumber.value}`,
    targetNumber: targetNumber.value,
    resultData: resultData.value
  })
}

const getMatchClass = (result) => {
  if (result === 'Disclosed' || result === 'Yes') return 'match-yes' // 紅色 (對專利權人來說是危險)
  if (result === 'Not Disclosed' || result === 'No') return 'match-no' // 綠色 (安全)
  return 'match-partial'
}

onMounted(() => { if (jobId.value) { isProcessing.value = true; startPolling() } })
onUnmounted(() => { if (pollTimer.value) clearInterval(pollTimer.value) })
</script>

<style scoped>
/* 樣式參考之前的，增加一些舉發專用的 */
.invalidation-page { max-width: 1100px; margin: 0 auto; padding: 2rem; color: #2c3e50; }
.setup-container { display: flex; flex-direction: column; gap: 24px; }
.card { background: white; border-radius: 16px; padding: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid #eee; position: relative; }
.card-header-icon { position: absolute; top: 20px; right: 20px; font-size: 2rem; opacity: 0.2; }
.card h3 { margin-top: 0; color: #34495e; border-left: 4px solid #d32f2f; padding-left: 10px; } /* 紅色系代表攻擊 */
.desc { color: #666; font-size: 0.9rem; margin-bottom: 16px; }
.form-group { margin-bottom: 16px; }
.input-text { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 1rem; }

/* Tabs */
.tabs { display: flex; gap: 10px; margin-bottom: 16px; }
.tabs button { padding: 8px 16px; border: 1px solid #ddd; background: #f5f5f5; border-radius: 20px; cursor: pointer; }
.tabs button.active { background: #d32f2f; color: white; border-color: #d32f2f; font-weight: bold; }

/* 結果表格 */
.claim-chart { width: 100%; border-collapse: collapse; margin-top: 10px; }
.claim-chart th { background: #f8f9fa; padding: 12px; text-align: left; border-bottom: 2px solid #eee; }
.claim-chart td { padding: 12px; border-bottom: 1px solid #eee; vertical-align: top; }
.match-yes { color: #d32f2f; font-weight: bold; background: #ffebee; }
.match-no { color: #388e3c; font-weight: bold; background: #e8f5e9; }
.match-partial { color: #f57c00; font-weight: bold; background: #fff3e0; }

.conclusion { background: #fff8e1; border-color: #ffe0b2; }
.conclusion h4 { color: #f57c00; margin-top: 0; }

/* Modal & Loading 同前 */
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 999; }
.modal-card { background: white; padding: 24px; border-radius: 12px; width: 90%; max-width: 400px; }
.modal-header { display: flex; justify-content: space-between; margin-bottom: 16px; }
.modal-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
.processing-state { text-align: center; padding: 60px 0; }
.spinner-large { border: 4px solid #f3f3f3; border-top: 4px solid #d32f2f; border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite; margin: 0 auto 20px; }
.btn-primary { background: #d32f2f; color: white; border: none; padding: 12px 40px; border-radius: 30px; font-size: 1.1rem; font-weight: bold; cursor: pointer; }
.btn-confirm { background: #d32f2f; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; }
</style>