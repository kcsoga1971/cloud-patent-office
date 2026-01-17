<!-- src/views/services/PortfolioWorkflow.vue -->
<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../../supabase'
import { useUserStore } from '../../stores/user'
import { formatDate } from '../../utils/formatters'
import ServiceTips from '../../components/ServiceTips.vue'

const router = useRouter()
const userStore = useUserStore()

// ========== 狀態管理 ==========
const currentView = ref('dashboard') // 'dashboard' | 'wizard' | 'report'
const isLoading = ref(false)
const allJobs = ref([])
const activeFilter = ref('all')

// ========== Wizard 狀態 ==========
const wizardStep = ref(1)
const inputData = ref({
  product_name: '',
  technical_field: '',
  technical_problem: '',
  technical_solution: '',
  core_features: [],
  supplementary_features: '',
  budget_level: 'seed_round',
  target_markets: ['Taiwan', 'USA'],
  timeline_urgency: 'normal',
  competitive_landscape: ''
})
const wizardLoading = ref(false)
const COST_PHASE_1_TO_4 = 1000 // Phase 1-4 的費用
const COST_PER_DRAFT = 300 // 每篇專利說明書的費用
const COST_REPORT = 200 // Phase 6 報告生成費用

// ========== Report 狀態 ==========
const currentJobId = ref(null)
const jobData = ref(null)
const phaseResults = ref({})
const pollTimer = ref(null)
const currentPhase = ref('') // 當前執行的 Phase
const isPhaseProcessing = ref(false)

// Phase 5 專利選擇
const selectedPatentsForDrafting = ref([])
const draftingProgress = ref([]) // 記錄每篇專利的生成進度

// ====================================================
// 🟢 Dashboard 邏輯
// ====================================================

const loadJobs = async () => {
  if (!userStore.user) return
  isLoading.value = true
  try {
    const { data, error } = await supabase
      .from('saas_jobs')
      .select('*')
      .eq('user_id', userStore.user.id)
      .eq('job_type', 'patent_portfolio')
      .order('updated_at', { ascending: false })
    
    if (error) throw error
    allJobs.value = data || []
  } catch (err) {
    console.error('載入失敗', err)
  } finally {
    isLoading.value = false
  }
}

const stats = computed(() => {
  const jobs = allJobs.value
  return {
    total: jobs.length,
    processing: jobs.filter(j => ['pending', 'processing'].includes(j.status)).length,
    completed: jobs.filter(j => j.status === 'completed').length
  }
})

const filteredJobs = computed(() => {
  let jobs = allJobs.value
  if (activeFilter.value === 'processing') {
    jobs = jobs.filter(j => ['pending', 'processing'].includes(j.status))
  } else if (activeFilter.value === 'completed') {
    jobs = jobs.filter(j => j.status === 'completed')
  }
  return jobs
})

const getStatusInfo = (job) => {
  if (job.status === 'completed') return { label: '✅ 策略完成', class: 'status-success' }
  if (job.status === 'failed') return { label: '❌ 失敗', class: 'status-error' }
  return { label: '⏳ AI 分析中', class: 'status-processing' }
}

const getJobTitle = (job) => {
  return job.input_data?.product_name || '未命名專案'
}

const goToDetail = (jobId) => {
  currentJobId.value = jobId
  currentView.value = 'report'
  loadJobDetail(jobId)
}

const startNewAnalysis = () => {
  wizardStep.value = 1
  inputData.value = {
    product_name: '',
    technical_field: '',
    technical_problem: '',
    technical_solution: '',
    core_features: [],
    supplementary_features: '',
    budget_level: 'seed_round',
    target_markets: ['Taiwan', 'USA'],
    timeline_urgency: 'normal',
    competitive_landscape: ''
  }
  currentView.value = 'wizard'
}

// ====================================================
// 🟡 Wizard 邏輯
// ====================================================

const addFeature = () => {
  const feature = prompt('請輸入核心技術特徵：')
  if (feature && feature.trim()) {
    inputData.value.core_features.push(feature.trim())
  }
}

const removeFeature = (index) => {
  inputData.value.core_features.splice(index, 1)
}

const executeAnalysis = async () => {
  if (!userStore.user) return alert('請先登入')
  if (!inputData.value.product_name) return alert('請輸入產品名稱')
  if (!inputData.value.technical_solution) return alert('請輸入技術方案')
  
  if (!confirm(`即將啟動專利佈局分析 (Phase 1-4)，需扣除 ${COST_PHASE_1_TO_4} 點。確定嗎？`)) return
  
  wizardLoading.value = true
  let transactionId = null

  try {
    // 1. 扣點
    const { data: reserve } = await supabase.rpc('reserve_credits', {
      p_user_id: userStore.user.id, 
      p_credits: COST_PHASE_1_TO_4,
      p_action_type: 'PATENT_PORTFOLIO', 
      p_description: `專利佈局 Phase 1-4: ${inputData.value.product_name}`,
      p_model_name: 'Claude-Sonnet-4.5', 
      p_job_id: null, 
      p_project_id: null
    })
    transactionId = reserve.transaction_id

    // 2. 建立 Job
    const { data: job } = await supabase.from('saas_jobs').insert({
      user_id: userStore.user.id,
      job_type: 'patent_portfolio',
      status: 'processing',
      current_phase: 'patent_portfolio_technical_analysis',
      payment_status: 'reserved',
      transaction_id: transactionId,
      input_data: { ...inputData.value }
    }).select().single()
    
    currentJobId.value = job.id

    // 3. 呼叫 Phase 1
    await callPhase1()

    // 轉跳到報告頁
    currentView.value = 'report'
    startPolling()

  } catch (e) {
    console.error(e)
    alert('啟動失敗: ' + e.message)
    wizardLoading.value = false
  }
}

// ====================================================
// 🔵 Phase 呼叫邏輯
// ====================================================

const callPhase1 = async () => {
  currentPhase.value = 'phase1'
  isPhaseProcessing.value = true
  
  await fetch(import.meta.env.VITE_N8N_WEBHOOK_PORTFOLIO_PHASE1_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      job_id: currentJobId.value,
      ...inputData.value
    })
  })
}

const callPhase2 = async () => {
  if (!confirm('Phase 1 技術拆解已完成。確定要繼續 Phase 2 (變化形式生成) 嗎？')) return
  
  currentPhase.value = 'phase2'
  isPhaseProcessing.value = true
  
  await supabase.from('saas_jobs').update({
    current_phase: 'patent_portfolio_variation_generation'
  }).eq('id', currentJobId.value)
  
  await fetch(import.meta.env.VITE_N8N_WEBHOOK_PORTFOLIO_PHASE2_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ job_id: currentJobId.value })
  })
}

const callPhase3 = async () => {
  if (!confirm('Phase 2 變化形式已生成。確定要繼續 Phase 3 (競爭分析) 嗎？')) return
  
  currentPhase.value = 'phase3'
  isPhaseProcessing.value = true
  
  await supabase.from('saas_jobs').update({
    current_phase: 'patent_portfolio_conflict_analysis'
  }).eq('id', currentJobId.value)
  
  await fetch(import.meta.env.VITE_N8N_WEBHOOK_PORTFOLIO_PHASE3_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ job_id: currentJobId.value })
  })
}

const callPhase4 = async () => {
  if (!confirm('Phase 3 競爭分析已完成。確定要繼續 Phase 4 (佈局策略) 嗎？')) return
  
  currentPhase.value = 'phase4'
  isPhaseProcessing.value = true
  
  await supabase.from('saas_jobs').update({
    current_phase: 'patent_portfolio_layout_strategy'
  }).eq('id', currentJobId.value)
  
  await fetch(import.meta.env.VITE_N8N_WEBHOOK_PORTFOLIO_PHASE4_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ job_id: currentJobId.value })
  })
}

const startPhase5 = async () => {
  if (selectedPatentsForDrafting.value.length === 0) {
    return alert('請至少選擇一篇專利進行說明書生成')
  }
  
  const totalCost = selectedPatentsForDrafting.value.length * COST_PER_DRAFT
  
  if (!confirm(`即將生成 ${selectedPatentsForDrafting.value.length} 篇專利說明書，需扣除 ${totalCost} 點。確定嗎？`)) return
  
  // 扣點
  const { data: reserve } = await supabase.rpc('reserve_credits', {
    p_user_id: userStore.user.id, 
    p_credits: totalCost,
    p_action_type: 'PATENT_DRAFTING', 
    p_description: `專利佈局 Phase 5: 生成 ${selectedPatentsForDrafting.value.length} 篇說明書`,
    p_model_name: 'Claude-Sonnet-4.5', 
    p_job_id: currentJobId.value, 
    p_project_id: null
  })
  
  // 初始化進度追蹤
  draftingProgress.value = selectedPatentsForDrafting.value.map(p => ({
    patent_id: p.patent_id,
    patent_theme: p.patent_theme,
    status: 'pending',
    draft_job_id: null
  }))
  
  // 逐篇生成
  for (let i = 0; i < selectedPatentsForDrafting.value.length; i++) {
    await generateSingleDraft(i)
  }
  
  alert('所有專利說明書已生成完成！')
}

const generateSingleDraft = async (index) => {
  const patent = selectedPatentsForDrafting.value[index]
  draftingProgress.value[index].status = 'processing'
  
  // 找到對應的變化形式
  const phase2Data = phaseResults.value.patent_portfolio_variation_generation
  const variation = phase2Data?.all_variations?.find(v => v.variation_id === patent.source_variation_id)
  
  if (!variation) {
    draftingProgress.value[index].status = 'failed'
    return
  }
  
  // 建立 Drafting Job
  const { data: draftJob } = await supabase.from('saas_jobs').insert({
    user_id: userStore.user.id,
    job_type: 'patent_drafting',
    status: 'pending',
    input_data: {
      title: patent.patent_theme,
      field: jobData.value.input_data.technical_field,
      problem: jobData.value.input_data.technical_problem,
      solution: variation.variation_description,
      features: [variation.variation_description],
      from_portfolio: true,
      portfolio_job_id: currentJobId.value,
      patent_id: patent.patent_id
    }
  }).select().single()
  
  draftingProgress.value[index].draft_job_id = draftJob.id
  
  // 呼叫 Drafting Phase 2
  await fetch(import.meta.env.VITE_N8N_WEBHOOK_DRAFTING_PHASE2_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ job_id: draftJob.id })
  })
  
  // 輪詢等待完成
  await waitForDraftCompletion(draftJob.id, index)
}

const waitForDraftCompletion = async (draftJobId, index) => {
  return new Promise((resolve) => {
    const timer = setInterval(async () => {
      const { data } = await supabase
        .from('saas_jobs')
        .select('status')
        .eq('id', draftJobId)
        .single()
      
      if (data.status === 'completed') {
        draftingProgress.value[index].status = 'completed'
        clearInterval(timer)
        resolve()
      } else if (data.status === 'failed') {
        draftingProgress.value[index].status = 'failed'
        clearInterval(timer)
        resolve()
      }
    }, 3000)
  })
}

const callPhase6 = async () => {
  if (!confirm(`Phase 5 說明書生成已完成。確定要生成最終報告嗎？(${COST_REPORT} 點)`)) return
  
  // 扣點
  const { data: reserve } = await supabase.rpc('reserve_credits', {
    p_user_id: userStore.user.id, 
    p_credits: COST_REPORT,
    p_action_type: 'PATENT_PORTFOLIO_REPORT', 
    p_description: `專利佈局 Phase 6: 報告生成`,
    p_model_name: 'Claude-Sonnet-4.5', 
    p_job_id: currentJobId.value, 
    p_project_id: null
  })
  
  currentPhase.value = 'phase6'
  isPhaseProcessing.value = true
  
  await supabase.from('saas_jobs').update({
    current_phase: 'patent_portfolio_report'
  }).eq('id', currentJobId.value)
  
  await fetch(import.meta.env.VITE_N8N_WEBHOOK_PORTFOLIO_PHASE6_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ job_id: currentJobId.value })
  })
}

// ====================================================
// 🔵 Report 邏輯
// ====================================================

const loadJobDetail = async (id) => {
  try {
    const { data: job } = await supabase
      .from('saas_jobs')
      .select('*')
      .eq('id', id)
      .single()
    
    if (job) {
      jobData.value = job
      currentPhase.value = job.current_phase
      
      // 載入所有 Phase 結果
      const { data: phases } = await supabase
        .from('job_phase_results')
        .select('*')
        .eq('job_id', id)
        .order('phase_order', { ascending: true })
      
      if (phases) {
        phaseResults.value = {}
        phases.forEach(phase => {
          let phaseData = phase.phase_data
          if (typeof phaseData === 'string') {
            try {
              phaseData = JSON.parse(phaseData)
            } catch (e) {
              console.error('解析 Phase 資料失敗:', e)
            }
          }
          phaseResults.value[phase.phase_name] = phaseData
        })
      }
      
      // 如果還在跑，繼續輪詢
      if (['pending', 'processing'].includes(job.status)) {
        startPolling()
      }
    }
  } catch (e) {
    console.error('載入 Job 失敗:', e)
  }
}

const startPolling = () => {
  if (pollTimer.value) clearInterval(pollTimer.value)
  pollTimer.value = setInterval(async () => {
    if (!currentJobId.value) return
    
    const { data: job } = await supabase
      .from('saas_jobs')
      .select('*')
      .eq('id', currentJobId.value)
      .single()
    
    if (job) {
      jobData.value = job
      currentPhase.value = job.current_phase
      
      // 載入最新的 Phase 結果
      const { data: phases } = await supabase
        .from('job_phase_results')
        .select('*')
        .eq('job_id', currentJobId.value)
        .order('phase_order', { ascending: true })
      
      if (phases) {
        phaseResults.value = {}
        phases.forEach(phase => {
          let phaseData = phase.phase_data
          if (typeof phaseData === 'string') {
            try {
              phaseData = JSON.parse(phaseData)
            } catch (e) {}
          }
          phaseResults.value[phase.phase_name] = phaseData
        })
      }
      
      // 檢查當前 Phase 是否完成
      const currentPhaseName = job.current_phase
      if (phaseResults.value[currentPhaseName]) {
        isPhaseProcessing.value = false
      }
      
      if (job.status === 'completed') {
        userStore.fetchUser()
        clearInterval(pollTimer.value)
        wizardLoading.value = false
        loadJobs()
      }
    }
  }, 3000)
}

// 切換專利選擇
const togglePatentSelection = (patent) => {
  const index = selectedPatentsForDrafting.value.findIndex(p => p.patent_id === patent.patent_id)
  if (index > -1) {
    selectedPatentsForDrafting.value.splice(index, 1)
  } else {
    selectedPatentsForDrafting.value.push(patent)
  }
}

const isPatentSelected = (patent) => {
  return selectedPatentsForDrafting.value.some(p => p.patent_id === patent.patent_id)
}

// 查看草稿
const viewDraft = (draftJobId) => {
  router.push({ path: '/services/drafting-workflow', query: { job_id: draftJobId } })
}

onMounted(() => loadJobs())
onUnmounted(() => { if (pollTimer.value) clearInterval(pollTimer.value) })
</script>

<template>
  <div class="workflow-container">
    
    <!-- ========== Dashboard 視圖 ========== -->
    <div v-if="currentView === 'dashboard'">
      <div class="header">
        <div class="header-left">
          <h1>♟️ 專利佈局策略中心</h1>
          <p class="subtitle">針對新創產品進行技術拆解、競爭分析與全球佈局規劃</p>
        </div>
        <div class="header-actions">
          <button @click="loadJobs" class="btn-secondary">🔄 重新整理</button>
          <button @click="startNewAnalysis" class="btn-primary">➕ 新增佈局專案</button>
        </div>
      </div>

      <div class="dashboard-grid">
        <div class="stat-card" :class="{ active: activeFilter === 'all' }" @click="activeFilter = 'all'">
          <span class="stat-value">{{ stats.total }}</span>
          <span class="stat-label">全部專案</span>
        </div>
        <div class="stat-card orange" :class="{ active: activeFilter === 'processing' }" @click="activeFilter = 'processing'">
          <span class="stat-value">{{ stats.processing }}</span>
          <span class="stat-label">⏳ 分析中</span>
        </div>
        <div class="stat-card green" :class="{ active: activeFilter === 'completed' }" @click="activeFilter = 'completed'">
          <span class="stat-value">{{ stats.completed }}</span>
          <span class="stat-label">✅ 已完成</span>
        </div>
      </div>

      <div v-if="isLoading" class="loading"><div class="spinner"></div>載入中...</div>
      
      <div v-else-if="filteredJobs.length > 0" class="job-list">
        <div v-for="job in filteredJobs" :key="job.id" class="job-card" @click="goToDetail(job.id)">
          <div class="card-header">
            <span class="uuid">#{{ job.id.slice(0,8) }}</span>
            <span class="status-badge" :class="getStatusInfo(job).class">{{ getStatusInfo(job).label }}</span>
          </div>
          <h3 class="job-title">{{ getJobTitle(job) }}</h3>
          <div class="job-meta">
            <span>📅 {{ formatDate(job.created_at) }}</span>
            <span class="tag" v-if="job.input_data?.budget_level">
              💰 {{ job.input_data.budget_level }}
            </span>
            <span class="tag" v-if="job.input_data?.target_markets">
              🌍 {{ job.input_data.target_markets.join(', ') }}
            </span>
          </div>
        </div>
      </div>

      <div v-else class="empty-state">
        <p>📭 目前沒有專利佈局專案</p>
        <button @click="startNewAnalysis" class="btn-primary">開始第一個佈局規劃</button>
      </div>

      <div class="tips-area">
        <ServiceTips type="portfolio" />
      </div>
    </div>

    <!-- ========== Wizard 視圖 ========== -->
    <div v-if="currentView === 'wizard'" class="wizard-container">
      <div class="page-header">
        <button @click="currentView = 'dashboard'" class="btn-back">← 取消並返回</button>
        <h1>🧙 專利佈局精靈</h1>
      </div>

      <div class="stepper">
        <div class="step" :class="{ active: wizardStep >= 1 }">1. 技術資訊</div>
        <div class="line"></div>
        <div class="step" :class="{ active: wizardStep >= 2 }">2. 商業參數</div>
        <div class="line"></div>
        <div class="step" :class="{ active: wizardStep >= 3 }">3. 確認送出</div>
      </div>

      <!-- Step 1: 技術資訊 -->
      <div v-if="wizardStep === 1" class="step-content">
        <div class="form-card">
          <h3>📝 技術資訊輸入</h3>
          
          <div class="form-group">
            <label>產品/技術名稱 *</label>
            <input v-model="inputData.product_name" placeholder="例如：AI 智能貓砂盆" class="input-text">
          </div>

          <div class="form-group">
            <label>技術領域 *</label>
            <input v-model="inputData.technical_field" placeholder="例如：物聯網家電、寵物照護" class="input-text">
          </div>

          <div class="form-group">
            <label>技術問題 (Pain Point)</label>
            <textarea v-model="inputData.technical_problem" rows="3" placeholder="現有技術存在什麼問題？"></textarea>
          </div>

          <div class="form-group">
            <label>技術方案 (Solution) *</label>
            <textarea v-model="inputData.technical_solution" rows="5" placeholder="請詳細描述您的技術實施方式..."></textarea>
          </div>

          <div class="form-group">
            <label>核心技術特徵</label>
            <div class="features-list">
              <div v-for="(feature, idx) in inputData.core_features" :key="idx" class="feature-tag">
                {{ feature }}
                <button @click="removeFeature(idx)" class="btn-remove">×</button>
              </div>
              <button @click="addFeature" class="btn-add-feature">+ 新增特徵</button>
            </div>
          </div>

          <div class="form-group">
            <label>補充說明</label>
            <textarea v-model="inputData.supplementary_features" rows="3" placeholder="其他補充資訊..."></textarea>
          </div>

          <div class="wizard-actions">
            <button @click="wizardStep = 2" class="btn-next" :disabled="!inputData.product_name || !inputData.technical_solution">
              下一步 →
            </button>
          </div>
        </div>
      </div>

      <!-- Step 2: 商業參數 -->
      <div v-if="wizardStep === 2" class="step-content">
        <div class="form-card">
          <h3>💼 商業策略參數</h3>
          
          <div class="form-group">
            <label>預算/融資階段</label>
            <select v-model="inputData.budget_level" class="input-select">
              <option value="bootstrap">Bootstrap (自有資金，預算極有限)</option>
              <option value="seed_round">Seed Round (種子輪，30-50萬)</option>
              <option value="series_a">Series A (A輪，預算充裕)</option>
            </select>
          </div>

          <div class="form-group">
            <label>目標市場 (可多選)</label>
            <div class="checkbox-group">
              <label><input type="checkbox" value="Taiwan" v-model="inputData.target_markets"> 🇹🇼 台灣</label>
              <label><input type="checkbox" value="USA" v-model="inputData.target_markets"> 🇺🇸 美國</label>
              <label><input type="checkbox" value="China" v-model="inputData.target_markets"> 🇨🇳 中國</label>
              <label><input type="checkbox" value="Europe" v-model="inputData.target_markets"> 🇪🇺 歐洲</label>
              <label><input type="checkbox" value="Japan" v-model="inputData.target_markets"> 🇯🇵 日本</label>
            </div>
          </div>

          <div class="form-group">
            <label>時程急迫性</label>
            <select v-model="inputData.timeline_urgency" class="input-select">
              <option value="urgent">急迫 (3個月內需申請)</option>
              <option value="normal">正常 (6-12個月)</option>
              <option value="flexible">彈性 (可配合策略調整)</option>
            </select>
          </div>

          <div class="form-group">
            <label>競爭態勢描述 (選填)</label>
            <textarea v-model="inputData.competitive_landscape" rows="3" placeholder="是否知道競爭對手的專利佈局？"></textarea>
          </div>

          <div class="wizard-actions">
            <button @click="wizardStep = 1" class="btn-text">上一步</button>
            <button @click="wizardStep = 3" class="btn-next">下一步 →</button>
          </div>
        </div>
      </div>

      <!-- Step 3: 確認送出 -->
      <div v-if="wizardStep === 3" class="step-content">
        <div class="form-card">
          <h3>✅ 確認資訊</h3>
          
          <div class="summary-section">
            <h4>技術資訊</h4>
            <p><strong>產品名稱：</strong>{{ inputData.product_name }}</p>
            <p><strong>技術領域：</strong>{{ inputData.technical_field }}</p>
            <p><strong>核心特徵：</strong>{{ inputData.core_features.join(', ') || '無' }}</p>
          </div>

          <div class="summary-section">
            <h4>商業參數</h4>
            <p><strong>預算階段：</strong>{{ inputData.budget_level }}</p>
            <p><strong>目標市場：</strong>{{ inputData.target_markets.join(', ') }}</p>
            <p><strong>時程急迫性：</strong>{{ inputData.timeline_urgency }}</p>
          </div>

          <div class="cost-warning">
            <p>⚠️ 本次分析 (Phase 1-4) 將扣除 <strong>{{ COST_PHASE_1_TO_4 }}</strong> 點數</p>
            <p>包含：技術拆解、變化形式生成、競爭分析、佈局策略</p>
            <p class="hint">💡 Phase 5 (說明書生成) 和 Phase 6 (報告) 將在後續確認</p>
          </div>

          <div class="wizard-actions">
            <button @click="wizardStep = 2" class="btn-text">上一步</button>
            <button @click="executeAnalysis" class="btn-primary" :disabled="wizardLoading">
              {{ wizardLoading ? '啟動分析中...' : `🚀 啟動分析 (${COST_PHASE_1_TO_4} 點)` }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ========== Report 視圖 ========== -->
    <div v-if="currentView === 'report'" class="report-container">
      <div class="page-header">
        <button @click="currentView = 'dashboard'" class="btn-back">← 返回儀表板</button>
        <div class="title-group">
          <h1>📊 專利佈局策略報告</h1>
          <span class="status-tag" :class="jobData?.status">{{ jobData?.current_phase }}</span>
        </div>
      </div>

      <!-- Phase 1: 技術拆解 -->
      <div class="phase-section">
        <div class="phase-header">
          <h3>1️⃣ Phase 1: 技術拆解與特徵識別</h3>
          <span v-if="phaseResults.patent_portfolio_technical_analysis" class="phase-status completed">✅ 完成</span>
          <span v-else-if="currentPhase === 'patent_portfolio_technical_analysis'" class="phase-status processing">⏳ 處理中</span>
          <span v-else class="phase-status pending">⏸️ 等待中</span>
        </div>
        
        <div v-if="phaseResults.patent_portfolio_technical_analysis" class="phase-content">
          <div class="tech-features">
            <h4>核心技術特徵</h4>
            <div class="features-grid">
              <div v-for="(feature, idx) in phaseResults.patent_portfolio_technical_analysis.core_technical_features" :key="idx" class="feature-card">
                <h5>{{ feature.feature_name }}</h5>
                <p>{{ feature.description }}</p>
                <span class="category-tag">{{ feature.category }}</span>
              </div>
            </div>
          </div>
          
          <div class="action-bar" v-if="!phaseResults.patent_portfolio_variation_generation && !isPhaseProcessing">
            <button @click="callPhase2" class="btn-continue">繼續 Phase 2 →</button>
          </div>
        </div>
      </div>

      <!-- Phase 2: 變化形式生成 -->
      <div class="phase-section" v-if="phaseResults.patent_portfolio_technical_analysis">
        <div class="phase-header">
          <h3>2️⃣ Phase 2: 技術變化形式生成</h3>
          <span v-if="phaseResults.patent_portfolio_variation_generation" class="phase-status completed">✅ 完成</span>
          <span v-else-if="currentPhase === 'patent_portfolio_variation_generation'" class="phase-status processing">⏳ 處理中</span>
          <span v-else class="phase-status pending">⏸️ 等待中</span>
        </div>
        
        <div v-if="phaseResults.patent_portfolio_variation_generation" class="phase-content">
          <p class="phase-summary">已生成 {{ phaseResults.patent_portfolio_variation_generation.total_variations }} 種技術變化形式</p>
          
          <div class="variations-list">
            <div v-for="variation in phaseResults.patent_portfolio_variation_generation.all_variations?.slice(0, 5)" :key="variation.variation_id" class="variation-card">
              <h5>{{ variation.variation_description }}</h5>
              <p class="variation-type">類型: {{ variation.variation_type }}</p>
            </div>
          </div>
          
          <div class="action-bar" v-if="!phaseResults.patent_portfolio_conflict_analysis && !isPhaseProcessing">
            <button @click="callPhase3" class="btn-continue">繼續 Phase 3 →</button>
          </div>
        </div>
      </div>

      <!-- Phase 3: 競爭分析 -->
      <div class="phase-section" v-if="phaseResults.patent_portfolio_variation_generation">
        <div class="phase-header">
          <h3>3️⃣ Phase 3: 專利地圖與衝突分析</h3>
          <span v-if="phaseResults.patent_portfolio_conflict_analysis" class="phase-status completed">✅ 完成</span>
          <span v-else-if="currentPhase === 'patent_portfolio_conflict_analysis'" class="phase-status processing">⏳ 處理中</span>
          <span v-else class="phase-status pending">⏸️ 等待中</span>
        </div>
        
        <div v-if="phaseResults.patent_portfolio_conflict_analysis" class="phase-content">
          <div class="conflict-zones">
            <div class="zone-card red">
              <h4>🔴 衝突區域</h4>
              <p>{{ phaseResults.patent_portfolio_conflict_analysis.conflict_zones?.length || 0 }} 個</p>
            </div>
            <div class="zone-card green">
              <h4>🟢 空白區域</h4>
              <p>{{ phaseResults.patent_portfolio_conflict_analysis.white_space_zones?.length || 0 }} 個</p>
            </div>
            <div class="zone-card blue">
              <h4>🔵 進攻區域</h4>
              <p>{{ phaseResults.patent_portfolio_conflict_analysis.attack_zones?.length || 0 }} 個</p>
            </div>
          </div>
          
          <div class="action-bar" v-if="!phaseResults.patent_portfolio_layout_strategy && !isPhaseProcessing">
            <button @click="callPhase4" class="btn-continue">繼續 Phase 4 →</button>
          </div>
        </div>
      </div>

      <!-- Phase 4: 佈局策略 -->
      <div class="phase-section" v-if="phaseResults.patent_portfolio_conflict_analysis">
        <div class="phase-header">
          <h3>4️⃣ Phase 4: 專利佈局策略</h3>
          <span v-if="phaseResults.patent_portfolio_layout_strategy" class="phase-status completed">✅ 完成</span>
          <span v-else-if="currentPhase === 'patent_portfolio_layout_strategy'" class="phase-status processing">⏳ 處理中</span>
          <span v-else class="phase-status pending">⏸️ 等待中</span>
        </div>
        
        <div v-if="phaseResults.patent_portfolio_layout_strategy" class="phase-content">
          
          <!-- P0 專利 -->
          <div class="priority-group p0">
            <h4>P0 - 最高優先級 (立即申請)</h4>
            <div class="patents-grid">
              <div v-for="patent in phaseResults.patent_portfolio_layout_strategy.patent_application_priorities?.p0_highest_priority?.patents || []" :key="patent.patent_id" 
                   class="patent-card p0"
                   :class="{ selected: isPatentSelected(patent) }"
                   @click="togglePatentSelection(patent)">
                <div class="patent-header">
                  <input type="checkbox" :checked="isPatentSelected(patent)" @click.stop="togglePatentSelection(patent)">
                  <span class="patent-id">{{ patent.patent_id }}</span>
                  <span class="priority-badge p0">P0</span>
                </div>
                <h5>{{ patent.patent_theme }}</h5>
                <p class="patent-reason">{{ patent.application_reason }}</p>
                <div class="patent-meta">
                  <span class="value-tag">戰略價值: {{ patent.strategic_value }}</span>
                  <span class="value-tag">市場價值: {{ patent.market_value }}</span>
                </div>
                <div class="cost-tag">{{ COST_PER_DRAFT }} 點/篇</div>
              </div>
            </div>
          </div>

          <!-- P1 專利 -->
          <div class="priority-group p1">
            <h4>P1 - 高優先級 (6個月內)</h4>
            <div class="patents-grid">
              <div v-for="patent in phaseResults.patent_portfolio_layout_strategy.patent_application_priorities?.p1_high_priority?.patents || []" :key="patent.patent_id" 
                   class="patent-card p1"
                   :class="{ selected: isPatentSelected(patent) }"
                   @click="togglePatentSelection(patent)">
                <div class="patent-header">
                  <input type="checkbox" :checked="isPatentSelected(patent)" @click.stop="togglePatentSelection(patent)">
                  <span class="patent-id">{{ patent.patent_id }}</span>
                  <span class="priority-badge p1">P1</span>
                </div>
                <h5>{{ patent.patent_theme }}</h5>
                <p class="patent-reason">{{ patent.application_reason }}</p>
                <div class="patent-meta">
                  <span class="value-tag">戰略價值: {{ patent.strategic_value }}</span>
                  <span class="value-tag">市場價值: {{ patent.market_value }}</span>
                </div>
                <div class="cost-tag">{{ COST_PER_DRAFT }} 點/篇</div>
              </div>
            </div>
          </div>

          <div class="selection-summary" v-if="selectedPatentsForDrafting.length > 0">
            <p>已選擇 <strong>{{ selectedPatentsForDrafting.length }}</strong> 篇專利</p>
            <p>總費用: <strong>{{ selectedPatentsForDrafting.length * COST_PER_DRAFT }}</strong> 點</p>
          </div>
          
          <div class="action-bar">
            <button @click="startPhase5" class="btn-continue" :disabled="selectedPatentsForDrafting.length === 0">
              開始生成說明書 ({{ selectedPatentsForDrafting.length * COST_PER_DRAFT }} 點) →
            </button>
          </div>
        </div>
      </div>

      <!-- Phase 5: 說明書生成進度 -->
      <div class="phase-section" v-if="draftingProgress.length > 0">
        <div class="phase-header">
          <h3>5️⃣ Phase 5: 專利說明書生成</h3>
        </div>
        
        <div class="phase-content">
          <div class="drafting-progress-list">
            <div v-for="(progress, idx) in draftingProgress" :key="idx" class="progress-item">
              <div class="progress-header">
                <span class="progress-number">{{ idx + 1 }}</span>
                <h5>{{ progress.patent_theme }}</h5>
                <span class="progress-status" :class="progress.status">
                  <span v-if="progress.status === 'pending'">⏸️ 等待中</span>
                  <span v-else-if="progress.status === 'processing'">⏳ 生成中</span>
                  <span v-else-if="progress.status === 'completed'">✅ 完成</span>
                  <span v-else>❌ 失敗</span>
                </span>
              </div>
              <button v-if="progress.status === 'completed'" @click="viewDraft(progress.draft_job_id)" class="btn-view-draft">
                查看草稿 →
              </button>
            </div>
          </div>
          
          <div class="action-bar" v-if="draftingProgress.every(p => p.status === 'completed')">
            <button @click="callPhase6" class="btn-continue">生成最終報告 ({{ COST_REPORT }} 點) →</button>
          </div>
        </div>
      </div>

      <!-- Phase 6: 最終報告 -->
      <div class="phase-section" v-if="phaseResults.patent_portfolio_report">
        <div class="phase-header">
          <h3>6️⃣ Phase 6: 完整策略報告</h3>
          <span class="phase-status completed">✅ 完成</span>
        </div>
        
        <div class="phase-content">
          <div class="report-section executive-summary">
            <h4>📋 執行摘要</h4>
            <div class="summary-card">
              <p class="summary-text">
                {{ phaseResults.patent_portfolio_report.report_content?.executive_summary?.project_overview || '無資料' }}
              </p>
              
              <div class="key-findings">
                <h5>關鍵發現</h5>
                <ul>
                  <li v-for="(finding, idx) in phaseResults.patent_portfolio_report.report_content?.executive_summary?.key_findings || []" :key="idx">
                    {{ finding }}
                  </li>
                </ul>
              </div>

              <div class="core-recommendations">
                <h5>核心建議</h5>
                <ul>
                  <li v-for="(rec, idx) in phaseResults.patent_portfolio_report.report_content?.executive_summary?.core_recommendations || []" :key="idx">
                    {{ rec }}
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div class="download-area">
            <button class="btn-download">📥 下載完整報告 (Word)</button>
          </div>
        </div>
      </div>

    </div>

  </div>
</template>

<style scoped>
/* 基礎樣式 (保持原有樣式) */
.workflow-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
}

/* Phase Section */
.phase-section {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
}

.phase-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 2px solid #F3F4F6;
}

.phase-header h3 {
  font-size: 20px;
  color: #1F2937;
  margin: 0;
}

.phase-status {
  padding: 6px 16px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 500;
}

.phase-status.completed {
  background: #D1FAE5;
  color: #065F46;
}

.phase-status.processing {
  background: #FEF3C7;
  color: #92400E;
}

.phase-status.pending {
  background: #F3F4F6;
  color: #6B7280;
}

.phase-content {
  padding: 20px 0;
}

.action-bar {
  display: flex;
  justify-content: center;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #E5E7EB;
}

.btn-continue {
  background: #4F46E5;
  color: white;
  padding: 12px 32px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  font-weight: 500;
}

.btn-continue:hover {
  background: #4338CA;
}

.btn-continue:disabled {
  background: #D1D5DB;
  cursor: not-allowed;
}

/* Tech Features */
.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  margin-top: 16px;
}

.feature-card {
  background: #F9FAFB;
  padding: 16px;
  border-radius: 8px;
  border-left: 4px solid #4F46E5;
}

.feature-card h5 {
  font-size: 16px;
  margin-bottom: 8px;
  color: #1F2937;
}

.feature-card p {
  font-size: 14px;
  color: #6B7280;
  line-height: 1.5;
  margin-bottom: 12px;
}

.category-tag {
  background: #EEF2FF;
  color: #4F46E5;
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
}

/* Variations */
.variations-list {
  display: grid;
  gap: 12px;
  margin-top: 16px;
}

.variation-card {
  background: #F9FAFB;
  padding: 16px;
  border-radius: 8px;
}

.variation-card h5 {
  font-size: 15px;
  margin-bottom: 8px;
  color: #1F2937;
}

.variation-type {
  font-size: 13px;
  color: #6B7280;
}

/* Conflict Zones */
.conflict-zones {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-top: 16px;
}

.zone-card {
  padding: 24px;
  border-radius: 12px;
  text-align: center;
}

.zone-card.red {
  background: #FEE2E2;
  border: 2px solid #FCA5A5;
}

.zone-card.green {
  background: #D1FAE5;
  border: 2px solid #6EE7B7;
}

.zone-card.blue {
  background: #DBEAFE;
  border: 2px solid #93C5FD;
}

.zone-card h4 {
  font-size: 16px;
  margin-bottom: 12px;
}

.zone-card p {
  font-size: 24px;
  font-weight: bold;
  color: #1F2937;
}

/* Patent Cards with Selection */
.patent-card {
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
}

.patent-card.selected {
  border-color: #4F46E5;
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
  transform: translateY(-2px);
}

.patent-card.selected::after {
  content: '✓';
  position: absolute;
  top: 12px;
  right: 12px;
  width: 32px;
  height: 32px;
  background: #4F46E5;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: bold;
}

.patent-header input[type="checkbox"] {
  margin-right: 8px;
}

.cost-tag {
  background: #FEF3C7;
  color: #92400E;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  text-align: center;
  margin-top: 12px;
}

.selection-summary {
  background: #EEF2FF;
  padding: 20px;
  border-radius: 8px;
  text-align: center;
  margin-top: 24px;
}

.selection-summary p {
  font-size: 16px;
  color: #1F2937;
  margin: 4px 0;
}

.selection-summary strong {
  color: #4F46E5;
  font-size: 20px;
}

/* Drafting Progress */
.drafting-progress-list {
  display: grid;
  gap: 16px;
  margin-top: 16px;
}

.progress-item {
  background: #F9FAFB;
  padding: 20px;
  border-radius: 8px;
  border-left: 4px solid #D1D5DB;
}

.progress-item .progress-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.progress-number {
  width: 32px;
  height: 32px;
  background: #4F46E5;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.progress-item h5 {
  flex: 1;
  font-size: 16px;
  color: #1F2937;
  margin: 0;
}

.progress-status {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 500;
}

.progress-status.completed {
  background: #D1FAE5;
  color: #065F46;
}

.progress-status.processing {
  background: #FEF3C7;
  color: #92400E;
}

.progress-status.pending {
  background: #F3F4F6;
  color: #6B7280;
}

.btn-view-draft {
  background: #4F46E5;
  color: white;
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.btn-view-draft:hover {
  background: #4338CA;
}

/* Report Section */
.report-section {
  margin-top: 24px;
}

.summary-card {
  background: #F9FAFB;
  padding: 24px;
  border-radius: 8px;
}

.summary-text {
  line-height: 1.6;
  color: #374151;
  margin-bottom: 20px;
}

.key-findings, .core-recommendations {
  margin-top: 20px;
}

.key-findings h5, .core-recommendations h5 {
  font-size: 16px;
  margin-bottom: 12px;
  color: #4F46E5;
}

.key-findings ul, .core-recommendations ul {
  list-style: none;
  padding: 0;
}

.key-findings li, .core-recommendations li {
  padding: 8px 0;
  padding-left: 24px;
  position: relative;
}

.key-findings li::before {
  content: "🔍";
  position: absolute;
  left: 0;
}

.core-recommendations li::before {
  content: "💡";
  position: absolute;
  left: 0;
}

/* Download */
.download-area {
  text-align: center;
  margin-top: 32px;
}

.btn-download {
  background: #10B981;
  color: white;
  padding: 14px 32px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  font-weight: 500;
}

.btn-download:hover {
  background: #059669;
}

/* 其他樣式保持原有設定 */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.header-left h1 {
  font-size: 28px;
  margin-bottom: 8px;
}

.subtitle {
  color: #666;
  font-size: 14px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  background: white;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  padding: 24px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
}

.stat-card:hover, .stat-card.active {
  border-color: #4F46E5;
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.15);
}

.stat-value {
  display: block;
  font-size: 36px;
  font-weight: bold;
  color: #1F2937;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: #6B7280;
}

.job-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.job-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s;
}

.job-card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  transform: translateY(-2px);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.uuid {
  font-size: 12px;
  color: #999;
  font-family: monospace;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-success { background: #D1FAE5; color: #065F46; }
.status-processing { background: #FEF3C7; color: #92400E; }
.status-error { background: #FEE2E2; color: #991B1B; }

.job-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 12px;
  color: #1F2937;
}

.job-meta {
  display: flex;
  gap: 12px;
  font-size: 13px;
  color: #6B7280;
  flex-wrap: wrap;
}

.tag {
  background: #F3F4F6;
  padding: 4px 8px;
  border-radius: 6px;
}

/* Wizard */
.wizard-container {
  max-width: 800px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 32px;
}

.page-header h1 {
  font-size: 28px;
  margin-top: 12px;
}

.btn-back {
  background: none;
  border: none;
  color: #6B7280;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.btn-back:hover {
  color: #4F46E5;
}

.stepper {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 40px 0;
}

.step {
  padding: 12px 24px;
  background: #F3F4F6;
  border-radius: 8px;
  font-size: 14px;
  color: #9CA3AF;
  font-weight: 500;
}

.step.active {
  background: #4F46E5;
  color: white;
}

.line {
  width: 60px;
  height: 2px;
  background: #E5E7EB;
  margin: 0 8px;
}

.step-content {
  animation: fadeIn 0.3s;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.form-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  padding: 32px;
  margin-bottom: 20px;
}

.form-card h3 {
  font-size: 20px;
  margin-bottom: 24px;
  color: #1F2937;
}

.form-group {
  margin-bottom: 24px;
}

.form-group label {
  display: block;
  font-weight: 500;
  margin-bottom: 8px;
  color: #374151;
  font-size: 14px;
}

.input-text, .input-select, textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #D1D5DB;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
}

.input-text:focus, .input-select:focus, textarea:focus {
  outline: none;
  border-color: #4F46E5;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}

textarea {
  resize: vertical;
}

.features-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.feature-tag {
  background: #EEF2FF;
  color: #4F46E5;
  padding: 8px 12px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.btn-remove {
  background: none;
  border: none;
  color: #EF4444;
  font-size: 18px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  font-weight: bold;
}

.btn-remove:hover {
  color: #DC2626;
}

.btn-add-feature {
  background: #F3F4F6;
  border: 1px dashed #9CA3AF;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  color: #6B7280;
}

.btn-add-feature:hover {
  background: #E5E7EB;
  border-color: #6B7280;
}

.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.checkbox-group label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: normal;
  cursor: pointer;
}

.checkbox-group input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.wizard-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid #E5E7EB;
}

.btn-next {
  background: #4F46E5;
  color: white;
  padding: 12px 32px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s;
}

.btn-next:hover {
  background: #4338CA;
  transform: translateX(4px);
}

.btn-next:disabled {
  background: #D1D5DB;
  cursor: not-allowed;
  transform: none;
}

.btn-text {
  background: none;
  border: none;
  color: #6B7280;
  cursor: pointer;
  font-size: 14px;
  padding: 8px 16px;
}

.btn-text:hover {
  color: #4F46E5;
}

.summary-section {
  background: #F9FAFB;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.summary-section h4 {
  font-size: 16px;
  margin-bottom: 12px;
  color: #4F46E5;
}

.summary-section p {
  font-size: 14px;
  color: #374151;
  margin: 8px 0;
  line-height: 1.6;
}

.summary-section strong {
  color: #1F2937;
  font-weight: 600;
}

.cost-warning {
  background: #FEF3C7;
  border: 2px solid #FCD34D;
  padding: 20px;
  border-radius: 8px;
  margin-top: 24px;
}

.cost-warning p {
  margin: 8px 0;
  color: #92400E;
  font-size: 14px;
}

.cost-warning strong {
  font-size: 18px;
  color: #78350F;
}

.cost-warning .hint {
  font-size: 13px;
  color: #A16207;
  margin-top: 12px;
}

/* Report Container */
.report-container {
  max-width: 1200px;
  margin: 0 auto;
}

.title-group {
  display: flex;
  align-items: center;
  gap: 16px;
}

.title-group h1 {
  font-size: 28px;
  margin: 0;
}

.status-tag {
  padding: 6px 16px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 500;
  background: #EEF2FF;
  color: #4F46E5;
}

/* Priority Groups */
.priority-group {
  margin-bottom: 32px;
}

.priority-group h4 {
  font-size: 18px;
  margin-bottom: 16px;
  padding: 12px 16px;
  border-radius: 8px;
}

.priority-group.p0 h4 {
  background: #FEE2E2;
  color: #991B1B;
}

.priority-group.p1 h4 {
  background: #FEF3C7;
  color: #92400E;
}

.patents-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.patent-card {
  background: white;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  padding: 20px;
  transition: all 0.3s;
}

.patent-card.p0 {
  border-color: #FCA5A5;
}

.patent-card.p1 {
  border-color: #FCD34D;
}

.patent-card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.patent-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.patent-id {
  font-family: monospace;
  font-size: 13px;
  color: #6B7280;
}

.priority-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.priority-badge.p0 {
  background: #FEE2E2;
  color: #991B1B;
}

.priority-badge.p1 {
  background: #FEF3C7;
  color: #92400E;
}

.patent-card h5 {
  font-size: 16px;
  margin-bottom: 12px;
  color: #1F2937;
  line-height: 1.4;
}

.patent-reason {
  font-size: 14px;
  color: #6B7280;
  line-height: 1.5;
  margin-bottom: 16px;
}

.patent-meta {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.value-tag {
  background: #F3F4F6;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  color: #6B7280;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #9CA3AF;
}

.empty-state p {
  font-size: 18px;
  margin-bottom: 20px;
}

/* Loading */
.loading {
  text-align: center;
  padding: 40px;
  color: #9CA3AF;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #F3F4F6;
  border-top-color: #4F46E5;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Buttons */
.btn-primary {
  background: #4F46E5;
  color: white;
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s;
}

.btn-primary:hover {
  background: #4338CA;
}

.btn-primary:disabled {
  background: #D1D5DB;
  cursor: not-allowed;
}

.btn-secondary {
  background: white;
  color: #6B7280;
  padding: 10px 20px;
  border: 1px solid #D1D5DB;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.btn-secondary:hover {
  background: #F9FAFB;
  border-color: #9CA3AF;
}

/* Tips Area */
.tips-area {
  margin-top: 40px;
}

/* Responsive */
@media (max-width: 768px) {
  .header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .dashboard-grid {
    grid-template-columns: 1fr;
  }

  .job-list {
    grid-template-columns: 1fr;
  }

  .patents-grid {
    grid-template-columns: 1fr;
  }

  .stepper {
    flex-direction: column;
    gap: 12px;
  }

  .line {
    width: 2px;
    height: 30px;
  }

  .wizard-actions {
    flex-direction: column;
    gap: 12px;
  }

  .btn-next, .btn-continue {
    width: 100%;
  }
}
</style>

