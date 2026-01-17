<!-- src/views/services/Infringement.vue -->
<template>
  <div class="infringement-page">
    <div class="page-header">
      <button @click="router.push('/services/infringement-workflow')" class="btn-back">← 返回列表</button>
      <div class="title-group">
        <h1>⚖️ 專利侵權分析 (Infringement Analysis)</h1>
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
        <h3>1. 專利目標 (Target Patent)</h3>
        <div class="form-group">
          <label>專利案號</label>
          <input v-model="targetNumber" type="text" placeholder="例如：US9876543B2" class="input-text" />
        </div>
        <div class="form-group">
          <label>上傳專利全文 (PDF)</label>
          <input type="file" accept=".pdf" @change="handleFileUpload" />
          <p class="hint" v-if="targetFile">✅ 已選擇: {{ targetFile.name }}</p>
        </div>
      </div>

      <div class="card product-card">
        <h3>2. 待鑑定對象 (Accused Product)</h3>
        <div class="form-group">
          <label>產品/技術名稱</label>
          <input v-model="productName" type="text" placeholder="例如：XYZ 高效能馬達" class="input-text" />
        </div>
        <div class="form-group">
          <label>技術特徵描述 (或貼上規格書內容)</label>
          <textarea 
            v-model="productDesc" 
            placeholder="請詳細描述產品的結構、成分或步驟。描述越詳細，比對越準確..."
            rows="6"
          ></textarea>
        </div>
      </div>

      <div class="disclaimer-box">
        <span class="icon">⚠️</span>
        <p>
          注意：這份專利侵權分析報告是由 AI 自動生成，僅供初步技術比對參考，<strong>不具備法律效力</strong>。<br>
          均等論與禁反言的判斷涉及複雜的法律攻防與歷史卷宗 (File Wrapper) 審閱。若涉及真實訴訟風險，建議務必諮詢專業專利律師或事務所。
        </p>
      </div>

      <div class="action-footer">
        <div class="cost-info">
          深度侵權比對分析將扣除 <span class="cost-highlight">{{ COST }}</span> 點數
        </div>
        <button 
          @click="handleStartClick" 
          class="btn-primary btn-lg" 
          :disabled="!canStart || isUploading || insufficientFunds"
        >
          <span v-if="insufficientFunds">❌ 點數不足</span>
          <span v-else-if="isUploading">⏳ 處理中...</span>
          <span v-else>🚀 開始分析 ({{ COST }} 點)</span>
        </button>
      </div>
    </div>

    <div v-if="jobId && isProcessing" class="processing-state">
      <div class="spinner-large"></div>
      <h2>AI 正在製作比對表 (Claim Chart)...</h2>
      <p>正在進行文義讀取、均等論測試與禁反言風險評估...</p>
      <div class="progress-steps">
        <div class="step completed">上傳資料</div>
        <div class="step active">權利項拆解</div>
        <div class="step">全要件比對</div>
        <div class="step">報告生成</div>
      </div>
    </div>

    <div v-if="resultData" class="result-container">
      
      <div class="result-header">
        <div class="header-left">
          <h3>📊 分析結果</h3>
          <span class="risk-badge" :class="getRiskClass(resultData.overall_conclusion?.result)">
            {{ resultData.overall_conclusion?.result || '評估中' }}
          </span>
        </div>
        <button class="btn-secondary btn-sm" @click="handleDownloadReport" :disabled="isReportGenerating">
          <span v-if="isReportGenerating">⏳ 生成中...</span>
          <span v-else>📥 下載完整報告 (Word)</span>
        </button>
      </div>

      <div class="warning-banner">
        ⚠️ 本報告為 AI 輔助分析，非正式法律意見。正式鑑定請洽詢專利師。
      </div>

      <div class="conclusion-card">
        <h4>📝 綜合結論 (風險分: {{ resultData.overall_conclusion?.risk_score }}/100)</h4>
        <p>{{ resultData.overall_conclusion?.summary }}</p>
      </div>

      <div class="chart-section">
        <h4>🔎 詳細比對表 (Claim Chart)</h4>
        <div class="table-wrapper">
          <table class="claim-chart">
            <thead>
              <tr>
                <th width="5%">#</th>
                <th width="30%">專利要件 (Element)</th>
                <th width="30%">產品特徵 (Product)</th>
                <th width="15%">文義讀取?</th>
                <th width="20%">均等論/禁反言</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in resultData.claim_chart" :key="idx">
                <td>{{ row.element_id || idx + 1 }}</td>
                <td>{{ row.element_text }}</td>
                <td>{{ row.product_feature }}</td>
                <td :class="getMatchClass(row.literal_match)">
                  {{ row.literal_match }}
                </td>
                <td class="doe-cell">
                  <div v-if="row.literal_match === 'No'">
                    <strong>均等:</strong> {{ row.doe_analysis?.conclusion }}<br>
                    <small style="color: #666">FWR三部測試</small>
                  </div>
                  <div v-else>
                    <span style="color: #ccc">-</span>
                  </div>
                  <div v-if="row.estoppel_risk && row.estoppel_risk !== 'Low'" class="risk-tag">
                    ⚠️ 禁反言風險: {{ row.estoppel_risk }}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="actions">
        <button @click="router.push('/services/infringement-workflow')" class="btn-secondary">返回列表</button>
      </div>
    </div>

    <div v-if="showConfirmModal" class="modal-overlay">
      <div class="modal-card">
        <div class="modal-header"><h3>💎 確認扣款</h3><button @click="showConfirmModal=false">×</button></div>
        <div class="modal-body">
          <p>啟動全方位專利侵權分析 (含均等論評估)。</p>
          <div class="row"><span>目前餘額：</span><span>{{ userStore.profile?.credits_balance }}</span></div>
          <div class="row deduct"><span>本次扣除：</span><span>- {{ COST }}</span></div>
          <div class="divider"></div>
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
import { usePatentDocx } from '../../composables/usePatentDocx' // 引入下載

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
// 3. 匯出邏輯引入
const { generateInfringementReport, isGenerating: isReportGenerating } = usePatentDocx()

const COST = 800 // 設定扣點
const jobId = ref(route.query.job_id || null)
const isInit = ref(!route.query.job_id)
const isUploading = ref(false)
const isProcessing = ref(false)
const showConfirmModal = ref(false)
const targetFile = ref(null)
const targetNumber = ref('')
const productName = ref('')
const productDesc = ref('')
const resultData = ref(null)
const pollTimer = ref(null)
const jobStatus = ref('')

// 餘額檢查
const insufficientFunds = computed(() => (userStore.profile?.credits_balance || 0) < COST)
const canStart = computed(() => targetFile.value && productDesc.value.length > 10)
const jobStatusText = computed(() => jobStatus.value === 'completed' ? '分析完成' : '處理中')

const handleFileUpload = (e) => {
  const file = e.target.files[0]
  if (file) targetFile.value = file
}

const handleStartClick = () => {
  if (!userStore.user) return alert('請先登入')
  if (insufficientFunds.value) return alert('點數不足')
  showConfirmModal.value = true
}

// 2. 執行任務 (含扣點)
const executeJob = async () => {
  showConfirmModal.value = false
  isUploading.value = true
  let transactionId = null

  try {
    // A. 預扣款
    const { data: reserve, error: resErr } = await supabase.rpc('reserve_credits', {
      p_user_id: userStore.user.id,
      p_credits: COST,
      p_action_type: 'PATENT_INFRINGEMENT',
      p_description: `侵權分析: ${targetNumber.value}`,
      p_model_name: 'Claude-3.5-Sonnet',
      p_job_id: null, p_project_id: null
    })
    if (resErr || !reserve.success) throw new Error('扣款失敗')
    transactionId = reserve.transaction_id

    // B. 建立 Job
    const { data: job, error: jobErr } = await supabase.from('saas_jobs').insert({
      user_id: userStore.user.id,
      job_type: 'patent_infringement',
      status: 'pending',
      payment_status: 'reserved',
      transaction_id: transactionId,
      credits_deducted: COST,
      my_patent_drafting_number: targetNumber.value,
      input_data: {
        target_patent_number: targetNumber.value,
        product_name: productName.value,
        product_description: productDesc.value
      }
    }).select().single()
    if (jobErr) throw jobErr
    jobId.value = job.id

    // C. 上傳檔案
    const filePath = `infringement/${job.id}/target.pdf`
    await supabase.storage.from('patent-documents').upload(filePath, targetFile.value)
    
    await supabase.from('saas_jobs').update({
      input_data: { ...job.input_data, target_file_path: filePath }
    }).eq('id', job.id)

    // D. 呼叫 n8n
    fetch(import.meta.env.VITE_N8N_WEBHOOK_INFRINGEMENT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_id: job.id, transaction_id: transactionId })
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
        // 確認扣款
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

// 3. 匯出處理
const handleDownloadReport = async () => {
  if (!resultData.value) return
  await generateInfringementReport({
    fileName: `侵權分析報告_${targetNumber.value}`,
    targetNumber: targetNumber.value,
    productName: productName.value,
    resultData: resultData.value
  })
}

const getRiskClass = (result) => {
  if (result?.includes('文義') || result?.includes('均等')) return 'badge-high'
  if (result?.includes('不構成')) return 'badge-low'
  return 'badge-medium'
}

const getMatchClass = (result) => {
  if (result === 'Yes') return 'match-yes'
  if (result === 'No') return 'match-no'
  return 'match-partial'
}

onMounted(() => { if (jobId.value) { isProcessing.value = true; startPolling() } })
onUnmounted(() => { if (pollTimer.value) clearInterval(pollTimer.value) })
</script>

<style scoped>
/* 復用基礎樣式 */
.infringement-page { max-width: 1100px; margin: 0 auto; padding: 2rem; color: #2c3e50; }
.page-header { margin-bottom: 2rem; }
.btn-back { background: none; border: none; color: #666; cursor: pointer; }
.title-group { display: flex; justify-content: space-between; align-items: center; }
.title-group h1 { font-size: 1.8rem; margin: 0; }
.header-info { display: flex; gap: 12px; align-items: center; }
.credit-badge { background: #f0f9ff; color: #0284c7; padding: 6px 12px; border-radius: 20px; font-weight: 600; }

.upload-container { display: flex; flex-direction: column; gap: 24px; }
.card { background: white; border-radius: 16px; padding: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid #eee; }
.card h3 { margin-top: 0; color: #34495e; border-left: 4px solid #2196F3; padding-left: 10px; }
.form-group { margin-bottom: 16px; }
.form-group label { display: block; margin-bottom: 8px; font-weight: 500; }
.input-text, textarea { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px; font-family: inherit; }
.hint { color: #2e7d32; font-size: 0.9rem; margin-top: 4px; }

/* 警語樣式 */
.disclaimer-box { background: #fff3cd; border: 1px solid #ffeeba; color: #856404; padding: 15px; border-radius: 8px; display: flex; align-items: flex-start; gap: 12px; font-size: 0.9rem; line-height: 1.5; }
.disclaimer-box .icon { font-size: 1.5rem; }
.warning-banner { background: #e53935; color: white; text-align: center; padding: 10px; border-radius: 8px; font-weight: bold; margin-bottom: 20px; }

/* 結果區 */
.result-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.risk-badge { padding: 6px 12px; border-radius: 6px; font-weight: bold; margin-left: 12px; }
.badge-high { background: #ffebee; color: #c62828; border: 1px solid #ef5350; }
.badge-medium { background: #fff3e0; color: #ef6c00; border: 1px solid #ffa726; }
.badge-low { background: #e8f5e9; color: #2e7d32; border: 1px solid #66bb6a; }

.conclusion-card { background: #f8f9fa; padding: 20px; border-radius: 12px; margin-bottom: 30px; border: 1px solid #eee; }

/* Claim Chart 表格優化 */
.table-wrapper { overflow-x: auto; border-radius: 8px; border: 1px solid #eee; }
.claim-chart { width: 100%; border-collapse: collapse; min-width: 800px; }
.claim-chart th { background: #f1f5f9; padding: 12px; text-align: left; font-weight: 600; color: #475569; }
.claim-chart td { padding: 16px 12px; border-bottom: 1px solid #eee; vertical-align: top; line-height: 1.5; }
.match-yes { color: #c62828; font-weight: bold; background: #fff5f5; }
.match-no { color: #2e7d32; font-weight: bold; background: #f0fdf4; }
.doe-cell { font-size: 0.85rem; color: #555; }
.risk-tag { margin-top: 6px; background: #fff3cd; color: #856404; padding: 2px 6px; border-radius: 4px; display: inline-block; font-size: 0.8rem; }

/* Modal 與 Loading */
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 999; }
.modal-card { background: white; padding: 20px; border-radius: 12px; width: 90%; max-width: 400px; }
.modal-header { display: flex; justify-content: space-between; margin-bottom: 16px; }
.modal-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
.processing-state { text-align: center; padding: 60px 0; }
.spinner-large { border: 4px solid #f3f3f3; border-top: 4px solid #2196F3; border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite; margin: 0 auto 20px; }
</style>