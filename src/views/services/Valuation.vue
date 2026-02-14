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
      
      <!-- Knowledge Carousel -->
      <div class="knowledge-carousel">
        <transition name="fade" mode="out-in">
          <div :key="currentCardIndex" class="knowledge-card">
            <div class="card-icon">{{ knowledgeCards[currentCardIndex].icon }}</div>
            <div class="card-content">
              <h3 class="card-title">{{ knowledgeCards[currentCardIndex].title }}</h3>
              <p class="card-desc">{{ knowledgeCards[currentCardIndex].desc }}</p>
            </div>
          </div>
        </transition>
        <div class="carousel-indicators">
          <div 
            v-for="(card, index) in knowledgeCards" 
            :key="index" 
            class="indicator" 
            :class="{ active: index === currentCardIndex }"
          ></div>
        </div>
      </div>
    </div>

    <!-- Error State with Retry -->
    <div v-if="jobStatus === 'failed' && errorMessage" class="error-state">
      <div class="error-icon">❌</div>
      <h2>處理失敗</h2>
      <p class="error-message">{{ errorMessage }}</p>
      <div class="error-actions">
        <button v-if="retryAvailable" @click="retryJob" class="btn-retry">
          🔄 重試
        </button>
        <button @click="router.push('/services/valuation-workflow')" class="btn-back-to-list">
          返回列表
        </button>
      </div>
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

      <!-- Research Data Sources Card -->
      <div v-if="resultData.research_data" class="card research-card">
        <h3>📚 研究資料來源</h3>
        
        <div class="research-summary">
          <div class="confidence-badge" :class="resultData.research_data.data_confidence.toLowerCase()">
            <span class="badge-icon">{{ confidenceBadgeIcon(resultData.research_data.data_confidence) }}</span>
            <span class="badge-text">數據信心度: {{ confidenceBadgeText(resultData.research_data.data_confidence) }}</span>
          </div>
          
          <div class="research-text">
            <p>{{ resultData.research_data.research_summary }}</p>
          </div>
        </div>

        <div v-if="resultData.research_data.comparable_deals?.length" class="comparable-deals">
          <h4>💼 可比較交易案例</h4>
          <ul class="deal-list">
            <li v-for="(deal, index) in resultData.research_data.comparable_deals.slice(0, 5)" :key="index" class="deal-item">
              <strong>{{ deal.description }}</strong>
              <span v-if="deal.value" class="deal-value">{{ deal.value }}</span>
              <div v-if="deal.source" class="deal-source">來源: {{ deal.source }}</div>
            </li>
          </ul>
        </div>

        <div v-if="resultData.research_data.litigation_references?.length" class="litigation-refs">
          <h4>⚖️ 相關訴訟參考</h4>
          <ul class="litigation-list">
            <li v-for="(litigation, index) in resultData.research_data.litigation_references.slice(0, 3)" :key="index" class="litigation-item">
              <strong>{{ litigation.case }}</strong>
              <span v-if="litigation.damages" class="litigation-damages">損害賠償: {{ litigation.damages }}</span>
              <div v-if="litigation.source" class="litigation-source">來源: {{ litigation.source }}</div>
            </li>
          </ul>
        </div>

        <div v-if="resultData.research_data.sources?.length" class="sources-section">
          <h4>🔗 參考資料來源</h4>
          <div class="sources-grid">
            <a 
              v-for="(source, index) in resultData.research_data.sources.slice(0, 8)" 
              :key="index" 
              :href="source" 
              target="_blank" 
              rel="noopener noreferrer"
              class="source-link"
            >
              <span class="source-icon">🌐</span>
              <span class="source-text">{{ getDomainName(source) }}</span>
              <span class="external-icon">↗</span>
            </a>
          </div>
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
const errorMessage = ref('')
const retryAvailable = ref(false)
const pollingStartTime = ref(null)
const currentCardIndex = ref(0)
const knowledgeCarouselTimer = ref(null)

const inputData = ref({
  patent_number: '',
  market_size: 10000000,
  stage: 'production'
})

const insufficientFunds = computed(() => (userStore.profile?.credits_balance || 0) < COST)
const canStart = computed(() => inputData.value.patent_number.length > 5 && inputData.value.market_size > 0)
const jobStatusText = computed(() => jobStatus.value === 'completed' ? '分析完成' : '處理中')

const knowledgeCards = [
  {
    icon: '⚖️',
    title: '三法估值模型',
    desc: '專業的專利鑑價採用成本法、市場法、收益法三種獨立方法交叉驗證，確保估值結果的可靠性。我們的 AI 同時執行三種分析，為您提供全方位的價值評估。'
  },
  {
    icon: '💰',
    title: '成本法 (Cost Approach)',
    desc: '基於研發投入、申請費用和維護成本，計算重新創造該項技術所需的總投資。適合用於早期階段或獨特技術的專利估值。'
  },
  {
    icon: '📊',
    title: '市場法 (Market Approach)',
    desc: '參考同領域可比較的專利授權交易和技術移轉案例，結合產業權利金費率，推算專利的市場公允價值。'
  },
  {
    icon: '📈',
    title: '收益法 (Income Approach)',
    desc: '預測專利在剩餘保護期間可產生的授權收入或成本節省，折算為淨現值 (NPV)。這是最常被法院和投資人採用的估值方法。'
  },
  {
    icon: '🏷️',
    title: 'IPC 分類與產業對標',
    desc: '系統自動識別專利的國際分類碼 (IPC)，對標相應產業的市場規模、成長率和權利金費率，確保估值基於正確的產業背景。'
  },
  {
    icon: '🔍',
    title: '權利範圍分析',
    desc: 'AI 自動讀取專利請求項 (Claims)，分析權利範圍的廣度、獨立項數量和從屬關係，評估法律保護強度對價值的影響。'
  },
  {
    icon: '🤖',
    title: '雲端專利鑑價特色',
    desc: '傳統鑑價需要 2-4 週、費用數十萬元。我們的 AI 多代理系統在幾秒內完成初步估值，為您的商業決策提供即時參考。'
  },
  {
    icon: '📋',
    title: '專業報告輸出',
    desc: '一鍵下載 Word 格式的鑑價預分析報告，包含完整的三法估值、質化分析和方法論說明，可直接用於內部決策和技術盤點。'
  },
  {
    icon: '⚠️',
    title: '鑑價 vs 鑑定',
    desc: '本服務為 AI 輔助的「價值預分析」，可作為初步參考和談判籌碼。如需具有法律效力的鑑定報告，建議在本報告基礎上委託認證鑑價師簽證。'
  },
  {
    icon: '🌐',
    title: '多國專利支援',
    desc: '支援美國 (US)、台灣 (TW)、中國 (CN)、歐洲 (EP)、韓國 (KR)、日本 (JP)等主要國家的專利鑑價，自動適配各國專利資料庫。'
  }
]

const handleStartClick = () => {
  if (!userStore.user) return alert('請先登入')
  if (insufficientFunds.value) return alert('點數不足')
  showConfirmModal.value = true
}

const executeJob = async (isRetry = false) => {
  // If no jobId exists, force new job creation (not retry)
  if (!jobId.value) isRetry = false
  if (!isRetry) {
    showConfirmModal.value = false
  }
  isUploading.value = true
  errorMessage.value = ''
  retryAvailable.value = false
  let transactionId = null

  try {
    let job
    
    if (!isRetry) {
      // 1. 扣點 (only for new jobs, not retries)
      const { data: reserve, error: resErr } = await supabase.rpc('reserve_credits', {
        p_user_id: userStore.user.id,
        p_credits: COST,
        p_action_type: 'PATENT_VALUATION',
        p_description: `鑑價: ${inputData.value.patent_number}`,
        p_model_name: 'Valuation-Engine',
        p_job_id: null, p_project_id: null
      })
      console.log('📦 reserve_credits response:', JSON.stringify(reserve), 'error:', resErr)
      if (resErr || !reserve?.success) throw new Error(`扣款失敗: ${resErr?.message || JSON.stringify(reserve)}`)
      transactionId = reserve.transaction_id
      if (!transactionId) throw new Error('扣款成功但未取得 transaction_id')

      // 2. 建立 Job
      const { data: newJob, error: jobErr } = await supabase.from('saas_jobs').insert({
        user_id: userStore.user.id,
        job_type: 'patent_valuation',
        status: 'pending',
        payment_status: 'reserved',
        transaction_id: transactionId,
        credits_deducted: COST,
        input_data: { ...inputData.value }
      }).select().single()
      console.log('📦 saas_jobs insert:', JSON.stringify(newJob), 'error:', jobErr)
      if (jobErr) throw new Error(`建立案件失敗: ${jobErr.message}`)
      if (!newJob) throw new Error('建立案件失敗: RLS 阻擋，請檢查 saas_jobs 權限')
      job = newJob
      jobId.value = job.id
    } else {
      // For retries, get existing job
      const { data: existingJob } = await supabase.from('saas_jobs').select('*').eq('id', jobId.value).single()
      if (!existingJob) throw new Error('找不到原始案件，請重新建立')
      job = existingJob
      transactionId = job.transaction_id
    }

    // 3. 呼叫 Valuation API with timeout
    isInit.value = false
    isProcessing.value = true
    startKnowledgeCarousel()
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60000) // 60 second timeout

    const apiUrl = import.meta.env.VITE_VALUATION_API_URL || 'https://cpo.twcio.com/valuation-api/api/v1/analyze_valuation'
    
    const apiRes = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patent_number: inputData.value.patent_number,
        market_size: Number(inputData.value.market_size),
        stage: inputData.value.stage
      }),
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
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
    stopKnowledgeCarousel()

  } catch (err) {
    console.error('❌ 鑑價執行失敗:', err)
    
    // Update job status to failed
    if (jobId.value) {
      await supabase.from('saas_jobs').update({
        status: 'failed',
        error_message: err.message
      }).eq('id', jobId.value)
    }

    // Refund credits
    if (transactionId) {
      await supabase.rpc('refund_credits', { 
        p_transaction_id: transactionId, 
        p_reason: `API錯誤: ${err.message}` 
      })
      userStore.fetchUser()
    }

    // Set error state
    errorMessage.value = err.name === 'AbortError' ? 
      'API 請求超時，請稍後重試' : 
      `鑑價失敗: ${err.message}`
    
    jobStatus.value = 'failed'
    retryAvailable.value = true
    isProcessing.value = false
    isUploading.value = false
    stopKnowledgeCarousel()
  }
}

const startPolling = () => {
  if (pollTimer.value) clearInterval(pollTimer.value)
  pollingStartTime.value = Date.now()
  
  pollTimer.value = setInterval(async () => {
    if (!jobId.value) return
    
    const { data } = await supabase.from('saas_jobs').select('*').eq('id', jobId.value).single()
    if (!data) { clearInterval(pollTimer.value); return }
    jobStatus.value = data.status
    
    // Check for timeout (2 minutes)
    const pollingDuration = Date.now() - pollingStartTime.value
    if (pollingDuration > 120000 && data.status === 'pending') {
      console.warn('⏰ 輪詢超時')
      clearInterval(pollTimer.value)
      
      // Update job to failed and refund
      await supabase.from('saas_jobs').update({
        status: 'failed',
        error_message: '處理超時'
      }).eq('id', jobId.value)
      
      if (data.transaction_id) {
        await supabase.rpc('refund_credits', { 
          p_transaction_id: data.transaction_id, 
          p_reason: '處理超時' 
        })
        userStore.fetchUser()
      }
      
      errorMessage.value = '超時：處理時間過長，請稍後重試'
      jobStatus.value = 'failed'
      retryAvailable.value = true
      isProcessing.value = false
      stopKnowledgeCarousel()
      return
    }
    
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
      stopKnowledgeCarousel()
      clearInterval(pollTimer.value)
    } else if (data.status === 'failed') {
      errorMessage.value = data.error_message || '處理失敗'
      retryAvailable.value = true
      isProcessing.value = false
      stopKnowledgeCarousel()
      clearInterval(pollTimer.value)
    }
  }, 3000)
}

const startKnowledgeCarousel = () => {
  currentCardIndex.value = 0
  if (knowledgeCarouselTimer.value) clearInterval(knowledgeCarouselTimer.value)
  
  knowledgeCarouselTimer.value = setInterval(() => {
    currentCardIndex.value = (currentCardIndex.value + 1) % knowledgeCards.length
  }, 30000) // Change every 30 seconds
}

const stopKnowledgeCarousel = () => {
  if (knowledgeCarouselTimer.value) {
    clearInterval(knowledgeCarouselTimer.value)
    knowledgeCarouselTimer.value = null
  }
}

const retryJob = () => {
  errorMessage.value = ''
  retryAvailable.value = false
  executeJob(true) // true indicates this is a retry
}

const handleDownloadReport = async () => {
  if (!resultData.value) return
  
  try {
    console.log('🏗️ 開始生成鑑價報告...')
    await generateValuationReport(inputData.value.patent_number, resultData.value)
    console.log('✅ 鑑價報告下載完成')
  } catch (err) {
    console.error('❌ 報告生成失敗:', err)
    alert('報告生成失敗: ' + err.message)
  }
}

const confidenceBadgeIcon = (confidence) => {
  switch (confidence) {
    case 'High': return '🟢'
    case 'Medium': return '🟡'
    case 'Low': return '🔴'
    default: return '⚪'
  }
}

const confidenceBadgeText = (confidence) => {
  switch (confidence) {
    case 'High': return '高'
    case 'Medium': return '中'
    case 'Low': return '低'
    default: return '未知'
  }
}

const getDomainName = (url) => {
  try {
    return new URL(url).hostname.replace('www.', '')
  } catch {
    return url.length > 40 ? url.substring(0, 40) + '...' : url
  }
}

onMounted(() => { 
  if (jobId.value) { 
    isProcessing.value = true
    startPolling()
    startKnowledgeCarousel()
  } 
})
onUnmounted(() => { 
  if (pollTimer.value) clearInterval(pollTimer.value)
  stopKnowledgeCarousel()
})
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

/* Modal & Loading */
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 999; }
.modal-card { background: white; padding: 20px; border-radius: 12px; width: 90%; max-width: 400px; }
.modal-header { display: flex; justify-content: space-between; margin-bottom: 16px; }
.modal-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
.processing-state { text-align: center; padding: 60px 0; max-width: 800px; margin: 0 auto; }
.spinner-large { border: 4px solid #f3f3f3; border-top: 4px solid #2196F3; border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite; margin: 0 auto 20px; }

/* Knowledge Carousel */
.knowledge-carousel { margin-top: 40px; }

.knowledge-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 24px;
  margin: 0 auto 20px;
  max-width: 600px;
  display: flex;
  align-items: flex-start;
  gap: 20px;
  text-align: left;
}

.card-icon {
  font-size: 48px;
  flex-shrink: 0;
  width: 64px;
  text-align: center;
}

.card-content {
  flex: 1;
}

.card-title {
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 12px 0;
}

.card-desc {
  font-size: 14px;
  color: #475569;
  line-height: 1.6;
  margin: 0;
}

.carousel-indicators {
  display: flex;
  justify-content: center;
  gap: 8px;
}

.indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #cbd5e1;
  transition: background 0.3s;
}

.indicator.active {
  background: #2196F3;
}

/* Fade Transition for Carousel */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

/* Error State */
.error-state {
  text-align: center;
  padding: 60px 20px;
  color: #dc2626;
}

.error-icon {
  font-size: 64px;
  margin-bottom: 20px;
}

.error-state h2 {
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 12px 0;
}

.error-message {
  font-size: 16px;
  color: #475569;
  margin: 0 0 24px 0;
  max-width: 500px;
  margin-left: auto;
  margin-right: auto;
}

.error-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

.btn-retry {
  padding: 12px 24px;
  background: #2196F3;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-retry:hover {
  background: #1976D2;
  transform: translateY(-2px);
}

.btn-back-to-list {
  padding: 12px 24px;
  background: #f8fafc;
  color: #475569;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-back-to-list:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

/* Research Data Card Styles */
.research-card {
  border-left: 4px solid #2196F3;
}

.research-summary {
  margin-bottom: 20px;
}

.confidence-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 15px;
}

.confidence-badge.high {
  background-color: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.confidence-badge.medium {
  background-color: #fff3cd;
  color: #856404;
  border: 1px solid #ffeeba;
}

.confidence-badge.low {
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.research-text {
  color: #555;
  line-height: 1.6;
  margin-bottom: 15px;
}

.comparable-deals, .litigation-refs {
  margin-bottom: 20px;
}

.comparable-deals h4, .litigation-refs h4 {
  color: #333;
  margin-bottom: 10px;
  font-size: 1rem;
}

.deal-list, .litigation-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.deal-item, .litigation-item {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 12px 15px;
  margin-bottom: 8px;
  transition: background-color 0.2s;
}

.deal-item:hover, .litigation-item:hover {
  background: #e9ecef;
}

.deal-value, .litigation-damages {
  display: block;
  color: #28a745;
  font-weight: 600;
  margin-top: 4px;
}

.deal-source, .litigation-source {
  font-size: 0.8rem;
  color: #6c757d;
  margin-top: 4px;
}

.sources-section {
  margin-top: 20px;
}

.sources-section h4 {
  color: #333;
  margin-bottom: 12px;
  font-size: 1rem;
}

.sources-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 10px;
}

.source-link {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  text-decoration: none;
  color: #495057;
  font-size: 0.85rem;
  transition: all 0.2s;
}

.source-link:hover {
  background: #e9ecef;
  color: #2196F3;
  transform: translateY(-1px);
}

.source-icon {
  flex-shrink: 0;
}

.source-text {
  flex-grow: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.external-icon {
  flex-shrink: 0;
  color: #6c757d;
  font-size: 0.7rem;
}
</style>