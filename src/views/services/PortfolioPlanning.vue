<!-- src/views/services/PortfolioPlanning.vue -->
<template>
  <div class="planning-page">
    <div class="page-header">
      <button @click="router.push('/services/portfolio-workflow')" class="btn-back">← 返回列表</button>
      <div class="title-group">
        <h1>♟️ 專利佈局規劃 (Patent Portfolio)</h1>
        <div class="header-info">
          <span class="status-badge" v-if="jobStatus">{{ jobStatusText }}</span>
        </div>
      </div>
    </div>

    <div class="layout-grid">
      <div class="input-panel" v-if="!jobId || isInit">
        <div class="card">
          <h3>1. 產品/技術描述</h3>
          <p class="hint">請盡可能詳細描述您的產品功能、硬體結構與軟體邏輯。</p>
          <div class="form-group">
            <label>產品名稱</label>
            <input v-model="inputData.product_name" class="input-text" placeholder="例如：AI 智能貓砂盆" />
          </div>
          <div class="form-group">
            <label>技術細節 (核心)</label>
            <textarea 
              v-model="inputData.product_description" 
              class="input-area" 
              rows="8"
              placeholder="例如：本產品包含一個重力感測器...透過 Wi-Fi 連線..."
            ></textarea>
          </div>
        </div>

        <div class="card">
          <h3>2. 商業策略參數</h3>
          <div class="form-group">
            <label>目前預算/融資階段</label>
            <select v-model="inputData.budget_level" class="input-select">
              <option value="bootstrap">自有資金 (預算極有限)</option>
              <option value="seed_round">種子輪 (預算約 30-50萬)</option>
              <option value="series_a">A輪 (預算充裕，需建立護城河)</option>
            </select>
          </div>
          <div class="form-group">
            <label>目標市場 (可多選)</label>
            <div class="checkbox-group">
              <label><input type="checkbox" value="Taiwan" v-model="inputData.target_market"> 台灣</label>
              <label><input type="checkbox" value="USA" v-model="inputData.target_market"> 美國</label>
              <label><input type="checkbox" value="China" v-model="inputData.target_market"> 中國</label>
              <label><input type="checkbox" value="Europe" v-model="inputData.target_market"> 歐洲</label>
              <label><input type="checkbox" value="Japan" v-model="inputData.target_market"> 日本</label>
            </div>
          </div>
        </div>

        <div class="action-area">
          <p class="cost-hint">本次分析將扣除 <strong>{{ COST }}</strong> 點數</p>
          <button @click="handleStartClick" class="btn-primary" :disabled="isUploading">
            {{ isUploading ? '規劃中...' : '🚀 啟動 AI 佈局分析' }}
          </button>
        </div>
      </div>

      <div v-if="jobId && isProcessing" class="processing-panel">
        <div class="spinner-large"></div>
        <h2>AI 正在為您規劃專利戰略...</h2>
        <ul>
          <li>🔍 拆解技術特徵...</li>
          <li>🌍 分析各國申請成本...</li>
          <li>📊 建立最佳申請路徑 (Filing Route)...</li>
        </ul>
      </div>

      <div class="result-panel" v-if="resultData">

        <div class="card result-card risk-card" v-if="resultData.risk_assessment">
          <h3>⚠️ 專利風險預警 (FTO Check)</h3>
          <p class="risk-text">{{ resultData.risk_assessment }}</p>
  
          <div class="design-around-box" v-if="resultData.design_around_suggestion">
            <h4>💡 迴避設計建議：</h4>
            <p>{{ resultData.design_around_suggestion }}</p>
          </div>
        </div>        

        <div class="card result-card summary-card">
          <h3>🧠 核心策略建議</h3>
          <p>{{ resultData.strategy_summary }}</p>
        </div>

        <div class="card result-card">
          <h3>🧱 技術拆解與專利標的 (Tech Decomposition)</h3>
          <table class="tech-table">
            <thead>
              <tr>
                <th>分類</th>
                <th>建議標的</th>
                <th>專利類型</th>
                <th>優先級</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, idx) in resultData.tech_decomposition" :key="idx">
                <td>{{ item.category }}</td>
                <td>{{ item.title }}</td>
                <td><span class="type-tag">{{ item.type }}</span></td>
                <td>
                  <span class="priority-tag" :class="item.priority.toLowerCase()">
                    {{ item.priority }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="card result-card">
          <h3>✈️ 全球佈局路徑 (Filing Route)</h3>
          <div class="route-info">
            <div class="route-step">
              <span class="label">首選策略：</span>
              <strong>{{ resultData.filing_route?.route }}</strong>
            </div>
            <div class="route-step">
              <span class="label">時程規劃：</span>
              <span>{{ resultData.filing_route?.timeline }}</span>
            </div>
            <div class="route-step">
              <span class="label">預估首年成本：</span>
              <span class="cost">{{ resultData.filing_route?.estimated_cost }}</span>
            </div>
          </div>
        </div>

        <div class="back-btn-area">
          <button @click="router.push('/services/portfolio-workflow')" class="btn-text">返回列表</button>
        </div>
      </div>
    </div>

    <div v-if="showConfirmModal" class="modal-overlay">
      <div class="modal-card">
        <div class="modal-header"><h3>💎 確認扣款</h3><button @click="showConfirmModal=false">×</button></div>
        <div class="modal-body">
          <p>啟動專利佈局分析。</p>
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

    <div style="margin-top: 40px;">
      <ServiceTips type="portfolio" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { supabase } from '../../supabase'
import { useUserStore } from '../../stores/user'
import ServiceTips from '../../components/ServiceTips.vue'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const COST = 500 // 佈局分析價格
const jobId = ref(route.query.job_id || null)
const isInit = ref(!route.query.job_id)
const isUploading = ref(false)
const isProcessing = ref(false)
const showConfirmModal = ref(false)
const resultData = ref(null)
const pollTimer = ref(null)
const jobStatus = ref('')

const inputData = ref({
  product_name: '',
  product_description: '',
  budget_level: 'bootstrap',
  target_market: ['Taiwan']
})

const jobStatusText = computed(() => {
  if (jobStatus.value === 'completed') return '✅ 分析完成'
  if (jobStatus.value === 'pending') return '⏳ AI 運算中'
  return ''
})

const handleStartClick = () => {
  if (!inputData.value.product_name || !inputData.value.product_description) {
    return alert('請填寫產品名稱與描述')
  }
  if ((userStore.profile?.credits_balance || 0) < COST) {
    return alert('點數不足')
  }
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
      p_action_type: 'PATENT_PORTFOLIO',
      p_description: `佈局: ${inputData.value.product_name}`,
      p_model_name: 'Portfolio-Engine',
      p_job_id: null, p_project_id: null
    })
    if (resErr || !reserve.success) throw new Error('扣款失敗')
    transactionId = reserve.transaction_id

    // 2. 建立 Job
    const { data: job, error: jobErr } = await supabase.from('saas_jobs').insert({
      user_id: userStore.user.id,
      job_type: 'patent_portfolio',
      status: 'pending',
      payment_status: 'reserved',
      transaction_id: transactionId,
      credits_deducted: COST,
      input_data: { ...inputData.value }
    }).select().single()
    if (jobErr) throw jobErr
    jobId.value = job.id

    // 3. 呼叫 n8n (TODO: 記得填入正確的 Webhook URL)
    fetch(import.meta.env.VITE_N8N_WEBHOOK_PORTFOLIO_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        job_id: job.id, 
        transaction_id: transactionId, 
        ...inputData.value 
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

onMounted(() => {
  if (jobId.value) {
    isProcessing.value = true
    startPolling()
  }
})
onUnmounted(() => { if (pollTimer.value) clearInterval(pollTimer.value) })
</script>

<style scoped>
.planning-page { max-width: 1200px; margin: 0 auto; padding: 2rem; color: #2c3e50; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
.btn-back { background: none; border: none; color: #666; cursor: pointer; }
.title-group h1 { margin: 0; font-size: 1.8rem; }

.layout-grid { display: grid; gap: 30px; } /* 單欄或雙欄可根據需求調整 */

.card { background: white; border-radius: 12px; padding: 24px; border: 1px solid #eee; margin-bottom: 20px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
.card h3 { margin-top: 0; border-left: 4px solid #9C27B0; padding-left: 10px; color: #4a148c; }
.hint { color: #666; font-size: 0.9rem; margin-bottom: 15px; }

.form-group { margin-bottom: 15px; }
.form-group label { display: block; margin-bottom: 5px; font-weight: bold; }
.input-text, .input-select { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; }
.input-area { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; resize: vertical; }

.checkbox-group { display: flex; gap: 15px; flex-wrap: wrap; }
.checkbox-group label { display: flex; align-items: center; gap: 5px; cursor: pointer; }

.action-area { text-align: center; margin-top: 20px; }
.btn-primary { background: #9C27B0; color: white; border: none; padding: 12px 40px; border-radius: 30px; font-size: 1.1rem; font-weight: bold; cursor: pointer; }
.btn-primary:disabled { background: #ccc; cursor: not-allowed; }

.processing-panel { text-align: center; padding: 60px; }
.spinner-large { border: 4px solid #f3f3f3; border-top: 4px solid #9C27B0; border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite; margin: 0 auto 20px; }

/* Result Tables */
.tech-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
.tech-table th { background: #f3e5f5; padding: 10px; text-align: left; color: #4a148c; }
.tech-table td { padding: 10px; border-bottom: 1px solid #eee; }

.type-tag { background: #e3f2fd; color: #1976d2; padding: 2px 8px; border-radius: 4px; font-size: 0.85rem; }
.priority-tag { font-weight: bold; padding: 2px 8px; border-radius: 4px; font-size: 0.85rem; }
.priority-tag.high { background: #ffebee; color: #c62828; }
.priority-tag.medium { background: #fff3e0; color: #ef6c00; }
.priority-tag.low { background: #e8f5e9; color: #2e7d32; }

.route-info { background: #f9f9f9; padding: 15px; border-radius: 8px; }
.route-step { margin-bottom: 10px; display: flex; flex-direction: column; }
.route-step .label { color: #666; font-size: 0.9rem; }
.route-step .cost { color: #c62828; font-weight: bold; }

/* Modal (復用) */
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 999; }
.modal-card { background: white; padding: 20px; border-radius: 12px; width: 90%; max-width: 400px; }
.modal-header { display: flex; justify-content: space-between; margin-bottom: 16px; }
.modal-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
.btn-confirm { background: #9C27B0; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; }
.btn-text { background: none; border: none; color: #666; cursor: pointer; }

@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

/* 新增樣式 */
.risk-card { border-left: 4px solid #f44336 !important; }
.risk-card h3 { color: #d32f2f !important; border-left: none !important; padding-left: 0 !important; }
.risk-text { color: #5d4037; background: #ffebee; padding: 15px; border-radius: 8px; margin-bottom: 15px; }
.design-around-box { background: #e3f2fd; padding: 15px; border-radius: 8px; border: 1px dashed #2196f3; }
.design-around-box h4 { margin: 0 0 5px 0; color: #1565c0; }
</style>