<template>
  <div class="design-around-page">
    <div class="page-header">
      <button @click="router.push('/services/design-around-workflow')" class="btn-back">← 返回列表</button>
      <div class="title-group">
        <h1>🛡️ 專利迴避設計 (Design Around)</h1>
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
        <h3>1. 設定迴避目標</h3>
        
        <div class="form-group">
          <label>目標專利案號 (Target Patent Number)</label>
          <input v-model="targetNumber" type="text" placeholder="例如：US7654321B2 或 TW I123456" class="input-text" />
        </div>

        <div class="form-group">
          <label>上傳目標專利全文 (PDF)</label>
          <input type="file" accept=".pdf" @change="handleFileUpload" />
          <p class="hint" v-if="targetFile">✅ 已選擇: {{ targetFile.name }}</p>
        </div>
      </div>

      <div class="card idea-card">
        <h3>2. 您的技術構想 (My Idea)</h3>
        <p class="subtitle">請簡述您目前的技術方案，AI 將協助您分析是否落入目標專利範圍。</p>
        <textarea 
          v-model="myIdea" 
          placeholder="例如：我想設計一種新型咖啡機，使用旋轉離心力過濾，而不是傳統的濾紙..."
          rows="5"
        ></textarea>
      </div>

      <div class="action-footer">
        <div class="cost-info">
          深度迴避分析將扣除 <span class="cost-highlight">{{ COST }}</span> 點數
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
      <h2>AI 正在拆解專利權利範圍...</h2>
      <p>正在進行全要件原則 (All-Elements Rule) 比對，請稍候 (約 2 分鐘)。</p>
      <div class="progress-steps">
        <div class="step completed">上傳資料</div>
        <div class="step active">權利項拆解</div>
        <div class="step">侵權比對</div>
        <div class="step">生成迴避策略</div>
      </div>
    </div>

    <div v-if="resultData" class="result-container">
      
      <div class="risk-card" :class="getRiskClass(resultData.infringement_risk_assessment?.risk_level)">
        <h3>⚖️ 侵權風險評估: {{ resultData.infringement_risk_assessment?.risk_level || '未知' }}</h3>
        <p>{{ resultData.infringement_risk_assessment?.reason }}</p>
      </div>

      <div class="analysis-section">
        <h4>🔍 目標專利構成要件拆解</h4>
        <div class="elements-box">
          <div v-for="(el, idx) in resultData.target_claim_analysis?.elements" :key="idx" class="element-tag">
            {{ el }}
          </div>
        </div>
      </div>

      <h4 class="strategy-title">💡 AI 建議迴避策略</h4>
      <div class="strategies-grid">
        <div v-for="(strategy, idx) in resultData.strategies" :key="idx" class="strategy-card">
          <div class="strategy-header">
            <span class="strategy-type">{{ strategy.type }}</span>
            <span class="success-rate">成功率: {{ strategy.success_rate }}</span>
          </div>
          <h5>{{ strategy.title }}</h5>
          <p class="desc">{{ strategy.description }}</p>
          
          <div class="pros-cons">
            <div class="pros">👍 {{ strategy.pros }}</div>
            <div class="cons">⚠️ {{ strategy.cons }}</div>
          </div>
          
          <button class="btn-adopt" @click="adoptStrategy(strategy)">
            採用此方案並撰寫草稿 →
          </button>
        </div>
      </div>

      <div class="actions">
        <button @click="router.push('/services/design-around-workflow')" class="btn-secondary">返回列表</button>
      </div>

      <div class="result-header">
        <h3>📊 分析結果</h3>
        <button 
          class="btn-secondary btn-sm" 
          @click="handleDownloadReport" 
          :disabled="isReportGenerating"
        >
          <span v-if="isReportGenerating">⏳ 生成中...</span>
          <span v-else>📥 下載完整分析報告 (Word)</span>
        </button>
      </div>

      <div class="strategies-grid">
        <div v-for="(strategy, idx) in resultData.strategies" :key="idx" class="strategy-card">
          <button class="btn-adopt" @click="adoptStrategy(strategy)">
            ✨ 採用此方案並撰寫專利草稿 →
          </button>
        </div>
      </div>
    </div>

    <div v-if="showConfirmModal" class="modal-overlay">
      <div class="modal-card">
        <div class="modal-header"><h3>💎 確認扣款</h3><button @click="showConfirmModal=false">×</button></div>
        <div class="modal-body">
          <p>啟動迴避設計分析。</p>
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
import { usePatentDocx } from '../../composables/usePatentDocx' // 引入

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const COST = 800 // 迴避設計費用
const jobId = ref(route.query.job_id || null)
const isInit = ref(!route.query.job_id)
const isUploading = ref(false)
const isProcessing = ref(false)
const showConfirmModal = ref(false)
const targetFile = ref(null)
const targetNumber = ref('')
const myIdea = ref('')
const resultData = ref(null)
const pollTimer = ref(null)
const jobStatus = ref('')

const insufficientFunds = computed(() => (userStore.profile?.credits_balance || 0) < COST)
const canStart = computed(() => targetFile.value && myIdea.value.trim().length > 10)
const jobStatusText = computed(() => jobStatus.value === 'completed' ? '分析完成' : '處理中')

// File Upload
const handleFileUpload = (e) => {
  const file = e.target.files[0]
  if (file) targetFile.value = file
}

// Start Click
const handleStartClick = () => {
  if (!userStore.user) return alert('請先登入')
  if (insufficientFunds.value) return alert('點數不足')
  showConfirmModal.value = true
}

// Execute Job
const executeJob = async () => {
  showConfirmModal.value = false
  isUploading.value = true
  let transactionId = null

  try {
    // 1. Reserve Credits
    const { data: reserve, error: resErr } = await supabase.rpc('reserve_credits', {
      p_user_id: userStore.user.id,
      p_credits: COST,
      p_action_type: 'PATENT_DESIGN_AROUND',
      p_description: `迴避設計: ${targetNumber.value}`,
      p_model_name: 'Claude-3.5-Sonnet',
      p_job_id: null, p_project_id: null
    })
    if (resErr || !reserve.success) throw new Error('扣款失敗')
    transactionId = reserve.transaction_id

    // 2. Create Job
    const { data: job, error: jobErr } = await supabase.from('saas_jobs').insert({
      user_id: userStore.user.id,
      job_type: 'patent_design_around',
      status: 'pending',
      payment_status: 'reserved',
      transaction_id: transactionId,
      credits_deducted: COST,
      my_patent_drafting_number: targetNumber.value, // 存入案號
      input_data: {
        target_patent_number: targetNumber.value,
        my_idea: myIdea.value
      }
    }).select().single()
    if (jobErr) throw jobErr
    jobId.value = job.id

    // 3. Upload File
    const filePath = `design-around/${job.id}/target.pdf`
    const { error: upErr } = await supabase.storage.from('patent-documents').upload(filePath, targetFile.value)
    if (upErr) throw upErr

    // 4. Update Job with File Path
    await supabase.from('saas_jobs').update({
      input_data: { ...job.input_data, target_file_path: filePath }
    }).eq('id', job.id)

    // 5. Call Webhook
    fetch(import.meta.env.VITE_N8N_WEBHOOK_DESIGN_AROUND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_id: job.id, transaction_id: transactionId })
    })

    // 6. UI Transition
    isInit.value = false
    isProcessing.value = true
    startPolling()

  } catch (err) {
    console.error(err)
    alert('啟動失敗: ' + err.message)
    isUploading.value = false
    if (transactionId) {
      await supabase.rpc('refund_credits', { p_transaction_id: transactionId, p_reason: err.message })
    }
  }
}

// Polling
const startPolling = () => {
  if (pollTimer.value) clearInterval(pollTimer.value)
  pollTimer.value = setInterval(async () => {
    if (!jobId.value) return
    const { data } = await supabase.from('saas_jobs').select('*').eq('id', jobId.value).single()
    
    jobStatus.value = data.status
    if (data.status === 'completed' && data.result_data) {
      // Confirm Deduction
      if (data.payment_status === 'reserved') {
        await supabase.rpc('confirm_deduction', { p_transaction_id: data.transaction_id })
        await supabase.from('saas_jobs').update({ payment_status: 'completed' }).eq('id', jobId.value)
        userStore.fetchUser()
      }
      
      // Parse Result
      let parsed = data.result_data
      if (typeof parsed === 'string') {
        try { parsed = JSON.parse(parsed) } catch (e) {}
      }
      resultData.value = parsed
      isProcessing.value = false
      clearInterval(pollTimer.value)
    }
  }, 3000)
}

const getRiskClass = (level) => {
  if (level === 'High') return 'risk-high'
  if (level === 'Medium') return 'risk-medium'
  return 'risk-low'
}

// Load existing
onMounted(() => {
  if (jobId.value) {
    isProcessing.value = true
    startPolling()
  }
})
onUnmounted(() => { if (pollTimer.value) clearInterval(pollTimer.value) })

// 初始化 composable
const { generateDesignAroundReport, isGenerating: isReportGenerating } = usePatentDocx()

// 1. 下載報告的功能
const handleDownloadReport = async () => {
  if (!resultData.value) return
  
  await generateDesignAroundReport({
    fileName: `迴避設計報告_${targetNumber.value}`,
    targetNumber: targetNumber.value,
    myIdea: myIdea.value,
    resultData: resultData.value
  })
}

// 2. 採用策略並導引至 Drafting (這是您提到的 "導引到新生成專利說明書")
const adoptStrategy = async (strategy) => {
  if (!confirm(`確定要採用「${strategy.title}」並開始撰寫專利草稿嗎？`)) return

  try {
    // 建立一個新的 Drafting Job
    // 注意：這裡我們直接建立一個 type='DRAFT_GENERATION' 的 Job
    // 並且把迴避策略當作 input_data 寫進去
    const { data: newJob, error } = await supabase
      .from('saas_jobs')
      .insert({
        user_id: userStore.user.id,
        project_id: null, // 或指定專案
        job_type: 'DRAFT_GENERATION', // 這是撰寫模組的類型
        status: 'pending', // 讓使用者去 Drafting 頁面觸發
        input_data: {
          title: `基於迴避設計之改良方案 - ${strategy.title}`,
          field: '請填寫技術領域', // 可以讓使用者後續補充
          problem: `目標專利 ${targetNumber.value} 存在權利範圍限制...`,
          solution: strategy.description, // 核心：將迴避策略作為解決方案
          features: [strategy.title, '...'], // 核心特徵
          enable_mcp: false // 預設不開搜尋
        }
      })
      .select()
      .single()

    if (error) throw error

    // 導航到 Drafting 頁面 (編輯模式)
    // 我們需要在 router 設定這個路徑，或者讓 Drafting 頁面支援讀取現有 Job
    router.push({ 
      path: '/services/drafting', 
      query: { job_id: newJob.id, mode: 'continue' } // 帶參數過去
    })

  } catch (err) {
    console.error('建立草稿失敗:', err)
    alert('建立失敗: ' + err.message)
  }
}
</script>

<style scoped>
/* 基礎排版復用 DefensePage 的 CSS */
.design-around-page { max-width: 1000px; margin: 0 auto; padding: 2rem; color: #2c3e50; }
.page-header { margin-bottom: 2rem; }
.btn-back { background: none; border: none; color: #666; cursor: pointer; }
.title-group { display: flex; justify-content: space-between; align-items: center; }
.title-group h1 { font-size: 1.8rem; margin: 0; }
.header-info { display: flex; gap: 12px; align-items: center; }
.credit-badge { background: #f0f9ff; color: #0284c7; padding: 6px 12px; border-radius: 20px; font-weight: 600; }

/* 卡片與表單 */
.upload-container { display: flex; flex-direction: column; gap: 24px; }
.card { background: white; border-radius: 16px; padding: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid #eee; }
.card h3 { margin-top: 0; color: #34495e; border-left: 4px solid #2196F3; padding-left: 10px; }
.form-group { margin-bottom: 16px; }
.form-group label { display: block; margin-bottom: 8px; font-weight: 500; }
.input-text, textarea { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px; font-family: inherit; }
.hint { color: #2e7d32; font-size: 0.9rem; margin-top: 4px; }

/* 結果區塊 */
.risk-card { padding: 20px; border-radius: 12px; margin-bottom: 24px; border: 1px solid transparent; }
.risk-high { background: #ffebee; border-color: #ef5350; color: #c62828; }
.risk-medium { background: #fff3e0; border-color: #ffa726; color: #ef6c00; }
.risk-low { background: #e8f5e9; border-color: #66bb6a; color: #2e7d32; }

.elements-box { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
.element-tag { background: #f5f5f5; padding: 6px 12px; border-radius: 20px; font-size: 0.9rem; color: #555; border: 1px solid #ddd; }

.strategies-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-top: 16px; }
.strategy-card { background: white; border: 1px solid #e0e0e0; border-radius: 12px; padding: 20px; transition: transform 0.2s; display: flex; flex-direction: column; }
.strategy-card:hover { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(0,0,0,0.1); border-color: #2196F3; }
.strategy-header { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 0.85rem; color: #666; }
.strategy-type { background: #e3f2fd; color: #1565c0; padding: 2px 8px; border-radius: 4px; }
.strategy-card h5 { margin: 0 0 10px 0; font-size: 1.1rem; color: #333; }
.desc { font-size: 0.95rem; color: #555; flex-grow: 1; margin-bottom: 16px; }
.pros-cons { background: #f9f9f9; padding: 10px; border-radius: 8px; font-size: 0.9rem; margin-bottom: 16px; }
.pros { color: #2e7d32; margin-bottom: 4px; }
.cons { color: #c62828; }
.btn-adopt { width: 100%; background: #2196F3; color: white; border: none; padding: 10px; border-radius: 8px; cursor: pointer; font-weight: 600; }
.btn-adopt:hover { background: #1976D2; }

/* Modal 與 Loading 樣式可復用之前的 */
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 999; }
.modal-card { background: white; padding: 20px; border-radius: 12px; width: 90%; max-width: 400px; }
.modal-header { display: flex; justify-content: space-between; margin-bottom: 16px; }
.modal-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
.processing-state { text-align: center; padding: 60px 0; }
.spinner-large { border: 4px solid #f3f3f3; border-top: 4px solid #2196F3; border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite; margin: 0 auto 20px; }
</style>