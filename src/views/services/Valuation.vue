<!-- src/views/services/Valuation.vue -->
<template>
  <div class="valuation-page">
    <div class="page-header">
      <button @click="router.push('/services/valuation-workflow')" class="btn-back">← 返回列表</button>
      <div class="title-group">
        <h1>💰 專利鑑價預分析 (Patent Valuation)</h1>
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
      
      <div class="disclaimer-box">
        <span class="icon">⚠️</span>
        <p>
          <strong>免責聲明：</strong><br>
          本報告為 AI 輔助之「價值預分析」，僅供內部決策、技術盤點或初步交易參考。
          <strong>本報告不具備會計師或認證鑑價師簽證效力</strong>，不可用於正式法庭訴訟、稅務申報或銀行融資抵押。
        </p>
      </div>

      <div class="card setup-card">
        <h3>1. 專利標的</h3>
        <div class="form-group">
          <label>專利公開/公告號 (必填)</label>
          <input v-model="inputData.patent_number" type="text" placeholder="例如：US9876543B2" class="input-text" />
        </div>
      </div>

      <div class="card market-card">
        <h3>2. 市場與商業參數 (影響估值模型)</h3>
        <p class="section-desc">請提供您對該技術應用產品的預估，AI 將據此計算收益法模型。</p>
        
        <div class="form-group">
          <label>預估目標市場年營收 (Annual Market Revenue, USD)</label>
          <input v-model="inputData.market_size" type="number" placeholder="例如：10000000 (1千萬美元)" class="input-text" />
          <p class="hint">若不確定，請輸入保守估計值。</p>
        </div>

        <div class="form-group">
          <label>技術成熟度 (TRL)</label>
          <select v-model="inputData.stage" class="input-select">
            <option value="concept">概念階段 (Concept)</option>
            <option value="prototype">原型階段 (Prototype)</option>
            <option value="production">量產階段 (Production)</option>
          </select>
        </div>
      </div>

      <div class="action-footer">
        <div class="cost-info">鑑價預分析將扣除 <span class="cost-highlight">{{ COST }}</span> 點數</div>
        <button 
          @click="handleStartClick" 
          class="btn-primary btn-lg" 
          :disabled="!canStart || isUploading || insufficientFunds"
        >
          <span v-if="insufficientFunds">❌ 點數不足</span>
          <span v-else-if="isUploading">⏳ 處理中...</span>
          <span v-else>🚀 開始鑑價</span>
        </button>
      </div>
    </div>

    <div v-if="jobId && isProcessing" class="processing-state">
      <div class="spinner-large"></div>
      <h2>AI 正在進行多維度鑑價...</h2>
      <p>正在分析權利範圍、檢索產業權利金費率，並建構財務模型。</p>
    </div>

    <div v-if="resultData" class="result-container">
      
      <div class="valuation-summary-card">
        <div class="val-header">預估專利價值區間 (Estimated Value)</div>
        <div class="val-amount">
          {{ resultData.valuation_model?.estimated_value_min }} ~ {{ resultData.valuation_model?.estimated_value_max }}
        </div>
        <div class="val-avg">
          平均估值：{{ resultData.valuation_model?.estimated_value_avg }}
        </div>
        <div class="val-basis">
          計算基礎：年營收 {{ resultData.valuation_model?.market_size_input }} × 
          費率 {{ resultData.valuation_model?.royalty_rate_range }} × 
          強度係數 {{ resultData.valuation_model?.strength_factor }}
        </div>
      </div>

      <div class="card analysis-card">
        <h3>📊 質化分析指標</h3>
        <div class="score-grid">
          <div class="score-item">
            <div class="score-label">法律強度</div>
            <div class="progress-bar">
              <div class="fill legal" :style="{ width: resultData.qualitative_analysis?.legal_score + '%' }"></div>
            </div>
            <div class="score-val">{{ resultData.qualitative_analysis?.legal_score }}/100</div>
          </div>
          <div class="score-item">
            <div class="score-label">技術價值</div>
            <div class="progress-bar">
              <div class="fill tech" :style="{ width: resultData.qualitative_analysis?.tech_score + '%' }"></div>
            </div>
            <div class="score-val">{{ resultData.qualitative_analysis?.tech_score }}/100</div>
          </div>
          <div class="score-item">
            <div class="score-label">商業潛力</div>
            <div class="progress-bar">
              <div class="fill comm" :style="{ width: resultData.qualitative_analysis?.commercial_score + '%' }"></div>
            </div>
            <div class="score-val">{{ resultData.qualitative_analysis?.commercial_score }}/100</div>
          </div>
        </div>
        
        <div class="analysis-text">
          <h4>⚖️ 法律面分析</h4>
          <p>{{ resultData.qualitative_analysis?.legal_analysis }}</p>
          <h4>🔬 技術面分析</h4>
          <p>{{ resultData.qualitative_analysis?.tech_analysis }}</p>
        </div>
      </div>

      <div class="actions">
        <button class="btn-secondary" @click="handleDownloadReport">📥 下載鑑價報告 (Word)</button>
        <button @click="router.push('/services/valuation-workflow')" class="btn-text">返回列表</button>
      </div>
    </div>

    <div v-if="showConfirmModal" class="modal-overlay">
      <div class="modal-card">
        <div class="modal-header"><h3>💎 確認扣款</h3><button @click="showConfirmModal=false">×</button></div>
        <div class="modal-body">
          <p>啟動專利鑑價分析。</p>
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
import { usePatentDocx } from '../../composables/usePatentDocx' // 需新增鑑價報告下載邏輯

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const { generateValuationReport } = usePatentDocx() // 記得在 composable 實作這個

const COST = 1500 // 鑑價比較貴
const jobId = ref(route.query.job_id || null)
const isInit = ref(!route.query.job_id)
const isUploading = ref(false)
const isProcessing = ref(false)
const showConfirmModal = ref(false)
const resultData = ref(null)
const pollTimer = ref(null)
const jobStatus = ref('')

const inputData = ref({
  patent_number: '',
  market_size: 10000000,
  stage: 'production'
})

const insufficientFunds = computed(() => (userStore.profile?.credits_balance || 0) < COST)
const canStart = computed(() => inputData.value.patent_number.length > 5 && inputData.value.market_size > 0)
const jobStatusText = computed(() => jobStatus.value === 'completed' ? '分析完成' : '處理中')

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
      p_action_type: 'PATENT_VALUATION',
      p_description: `鑑價: ${inputData.value.patent_number}`,
      p_model_name: 'Valuation-Engine',
      p_job_id: null, p_project_id: null
    })
    if (resErr || !reserve.success) throw new Error('扣款失敗')
    transactionId = reserve.transaction_id

    // 2. 建立 Job
    const { data: job, error: jobErr } = await supabase.from('saas_jobs').insert({
      user_id: userStore.user.id,
      job_type: 'patent_valuation',
      status: 'pending',
      payment_status: 'reserved',
      transaction_id: transactionId,
      credits_deducted: COST,
      input_data: { ...inputData.value }
    }).select().single()
    if (jobErr) throw jobErr
    jobId.value = job.id

    // 3. 呼叫 Valuation API (直接)
    isInit.value = false
    isProcessing.value = true

    const apiUrl = import.meta.env.VITE_VALUATION_API_URL || 'https://cpo.twcio.com/valuation-api/api/v1/analyze_valuation'
    const apiRes = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patent_number: inputData.value.patent_number,
        market_size: Number(inputData.value.market_size),
        stage: inputData.value.stage
      })
    })
    const apiData = await apiRes.json()
    
    if (!apiData.success) throw new Error(apiData.message || '鑑價分析失敗')

    const d = apiData.data
    // 轉換為前端顯示格式
    const costVal = d.cost_method?.total_cost_valuation || 0
    const marketVal = d.market_method?.market_valuation || 0
    const incomeVal = d.income_method?.income_valuation || 0
    const avgVal = d.weighted_average_valuation || ((costVal + marketVal + incomeVal) / 3)
    const minVal = Math.min(costVal, marketVal, incomeVal)
    const maxVal = Math.max(costVal, marketVal, incomeVal)

    const mappedResult = {
      valuation_model: {
        estimated_value_min: `$${minVal.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
        estimated_value_max: `$${maxVal.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
        estimated_value_avg: `$${avgVal.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
        market_size_input: `$${Number(inputData.value.market_size).toLocaleString('en-US')}`,
        royalty_rate_range: `${(d.market_method?.adjusted_royalty_rate || 5).toFixed(1)}%`,
        strength_factor: d.strength_multiplier?.toFixed(2) || '1.00',
      },
      qualitative_analysis: {
        legal_score: Math.round((d.legal_analysis?.strength_score || 0.5) * 100),
        tech_score: Math.round((d.confidence_percentage || 50)),
        commercial_score: Math.round((d.market_analysis?.growth_rate || 5) * 10),
        legal_analysis: d.legal_analysis?.explanation || '',
        tech_analysis: d.market_analysis?.explanation || '',
      },
      cost_method: d.cost_method,
      market_method: d.market_method,
      income_method: d.income_method,
      valuation_summary: d.valuation_summary,
      confidence_level: d.confidence_level,
      confidence_percentage: d.confidence_percentage,
      methodology_explanation: d.methodology_explanation,
    }

    // 存入 DB
    await supabase.from('saas_jobs').update({
      status: 'completed',
      result_data: mappedResult,
      payment_status: 'completed'
    }).eq('id', job.id)

    // 確認扣款
    await supabase.rpc('confirm_deduction', { p_transaction_id: transactionId })
    userStore.fetchUser()

    resultData.value = mappedResult
    jobStatus.value = 'completed'
    isProcessing.value = false

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
  // TODO: 實作 docx 生成邏輯
  alert('報告下載功能即將上線') 
}

onMounted(() => { if (jobId.value) { isProcessing.value = true; startPolling() } })
onUnmounted(() => { if (pollTimer.value) clearInterval(pollTimer.value) })
</script>

<style scoped>
/* 基本樣式 */
.valuation-page { max-width: 1000px; margin: 0 auto; padding: 2rem; color: #2c3e50; }
.setup-container { display: flex; flex-direction: column; gap: 24px; }
.card { background: white; border-radius: 16px; padding: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid #eee; }
.card h3 { margin-top: 0; color: #34495e; border-left: 4px solid #2196F3; padding-left: 10px; }
.form-group { margin-bottom: 16px; }
.input-text, .input-select { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px; }
.disclaimer-box { background: #fff3cd; border: 1px solid #ffeeba; color: #856404; padding: 15px; border-radius: 8px; display: flex; gap: 10px; font-size: 0.9rem; }

/* 鑑價結果卡片 */
.valuation-summary-card { background: linear-gradient(135deg, #1e3c72, #2a5298); color: white; padding: 30px; border-radius: 16px; text-align: center; margin-bottom: 24px; box-shadow: 0 8px 20px rgba(30, 60, 114, 0.3); }
.val-header { font-size: 1.1rem; opacity: 0.9; margin-bottom: 10px; }
.val-amount { font-size: 2.5rem; font-weight: 700; margin-bottom: 10px; letter-spacing: 1px; }
.val-avg { font-size: 1.2rem; background: rgba(255,255,255,0.2); display: inline-block; padding: 4px 12px; border-radius: 20px; margin-bottom: 15px; }
.val-basis { font-size: 0.9rem; opacity: 0.8; }

/* 評分條 */
.score-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px; }
.score-item { text-align: center; }
.score-label { font-weight: bold; margin-bottom: 8px; color: #555; }
.progress-bar { background: #eee; height: 10px; border-radius: 5px; overflow: hidden; margin-bottom: 6px; }
.fill { height: 100%; border-radius: 5px; }
.fill.legal { background: #4CAF50; }
.fill.tech { background: #2196F3; }
.fill.comm { background: #FF9800; }
.score-val { font-size: 0.9rem; font-weight: bold; color: #333; }

/* Modal & Loading 同前... */
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 999; }
.modal-card { background: white; padding: 20px; border-radius: 12px; width: 90%; max-width: 400px; }
.modal-header { display: flex; justify-content: space-between; margin-bottom: 16px; }
.modal-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
.processing-state { text-align: center; padding: 60px 0; }
.spinner-large { border: 4px solid #f3f3f3; border-top: 4px solid #2196F3; border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite; margin: 0 auto 20px; }
</style>