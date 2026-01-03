<!-- src/views/services/PatentAnalysis.vue -->
<template>
  <div class="analysis-page">
    <div class="page-header">
      <button @click="router.push('/services/patent-analysis-workflow')" class="btn-back">← 返回列表</button>
      <div class="title-group">
        <h1>📊 專利分析中心</h1>
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
      
      <div class="service-selector">
        <div 
          v-for="opt in analysisOptions" 
          :key="opt.id"
          class="option-card"
          :class="{ active: selectedOption === opt.id }"
          @click="selectedOption = opt.id"
        >
          <div class="opt-icon">{{ opt.icon }}</div>
          <div class="opt-content">
            <h4>{{ opt.title }}</h4>
            <p>{{ opt.desc }}</p>
            <span class="price-tag">💎 {{ opt.cost.toLocaleString() }} 點</span>
          </div>
        </div>
      </div>

      <div class="card input-card">
        <h3>🚀 設定分析參數：{{ currentOption.title }}</h3>
        
        <div v-if="['single_analysis', 'tech_map'].includes(selectedOption)">
          <div class="form-group">
            <label>專利公開/公告號</label>
            <input v-model="inputData.patent_number" type="text" placeholder="例如：US20240123456A1, CN112233445A" class="input-text" />
          </div>
          <div class="form-group">
            <label>或 上傳專利 PDF</label>
            <input type="file" accept=".pdf" @change="handleFileUpload" />
            <p class="hint" v-if="inputFile">✅ 已選擇: {{ inputFile.name }}</p>
          </div>
        </div>

        <div v-else>
          <div class="form-group">
            <label>技術關鍵字 (Keywords)</label>
            <input v-model="inputData.keywords" type="text" placeholder="例如：Solid state battery, electrolyte" class="input-text" />
          </div>
          <div class="form-group">
            <label>競爭對手/申請人 (Assignee)</label>
            <input v-model="inputData.assignee" type="text" placeholder="例如：Toyota, Samsung SDI" class="input-text" />
          </div>
          <div class="form-group">
            <label>分析備註 (選填)</label>
            <textarea v-model="inputData.notes" rows="3" placeholder="例如：請著重分析 2020 年後的趨勢..."></textarea>
          </div>
          <div class="info-box">
            ℹ️ 地圖分析需要大量運算資源，預計交付時間為 3~7 個工作天。
          </div>
        </div>

        <div class="action-footer">
          <div class="cost-info">本次將扣除 <span class="cost-highlight">{{ currentOption.cost.toLocaleString() }}</span> 點數</div>
          <button 
            @click="handleStartClick" 
            class="btn-primary btn-lg" 
            :disabled="!canStart || isUploading || insufficientFunds"
          >
            <span v-if="insufficientFunds">❌ 點數不足</span>
            <span v-else-if="isUploading">⏳ 處理中...</span>
            <span v-else>🚀 開始分析</span>
          </button>
        </div>
      </div>
    </div>

    <div v-if="jobId && isProcessing" class="processing-state">
      <div class="spinner-large"></div>
      <h2>AI 正在進行{{ currentOptionTitle }}...</h2>
      <p>系統正在檢索資料庫、拆解技術特徵並生成視覺化圖表。</p>
    </div>

    <!-- 在 processing-state 後添加 -->
    <div v-if="jobStatus === 'failed'" class="error-state">
      <div class="error-icon">❌</div>
      <h2>分析失敗</h2>
      <p>{{ errorMessage || '系統處理時發生錯誤，請稍後再試' }}</p>
      <div class="actions">
        <button @click="resetJob" class="btn-primary">重新開始</button>
        <button @click="router.push('/services/patent-analysis-workflow')" class="btn-secondary">
          返回列表
        </button>
      </div>
    </div>

    <div v-if="resultData" class="result-container">
      <div class="result-header">
       <h3>📊 分析結果</h3>
        <button 
          v-if="selectedOption === 'single_analysis'" 
          class="btn-secondary" 
          @click="handleDownloadReport"
        >
          📥 下載完整報告
        </button>
      </div>

      <!-- Tech Map 專用顯示 -->
      <div v-if="selectedOption === 'tech_map'" class="card result-card">
        <h4>🕸️ 技術圖譜已生成</h4>
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-value">{{ resultData.feature_count }}</span>
            <span class="stat-label">技術特徵</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ resultData.flow_count }}</span>
            <span class="stat-label">流程關係</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ resultData.stage_count }}</span>
            <span class="stat-label">技術階段</span>
          </div>
        </div>
        <div class="action-buttons">
          <a 
            :href="resultData.techmap_url" 
            target="_blank" 
            class="btn-primary"
          >
            🔗 開啟互動式技術圖譜
          </a>
        </div>
      </div>

      <!-- Full Analysis 專用顯示 -->
      <div v-if="selectedOption === 'single_analysis'" class="result-grid">
        <div class="card result-card">
          <h4>📝 分析摘要</h4>
          <div class="markdown-body" v-html="renderMarkdown(resultData.analysis_summary || '分析完成')"></div>
          <div class="quality-score">
            <span>品質評分：</span>
            <span class="score">{{ resultData.quality_score }} / 10</span>
          </div>
        </div>

        <div class="card result-card">
          <h4>📊 報告檔案</h4>
          <div class="file-links">
            <a :href="resultData.full_analysis_url" target="_blank" class="file-link">
              📄 完整分析報告 (HTML)
            </a>
            <a :href="resultData.techmap_url" target="_blank" class="file-link">
              🗺️ 技術圖譜 (HTML)
            </a>
            <a :href="resultData.text_url" target="_blank" class="file-link">
              📝 純文字報告 (TXT)
            </a>
          </div>
        </div>
      </div>

      <!-- Landscape 專用顯示 -->
      <div v-if="['landscape_basic', 'landscape_deep'].includes(selectedOption)" class="card result-card">
        <h4>🗺️ 專利地圖分析</h4>
        <p>地圖分析報告已生成，請查看以下檔案：</p>
        <div class="file-links">
          <a :href="resultData.report_url" target="_blank" class="btn-primary">
            📊 查看完整報告
          </a>
        </div>
      </div>

      <div class="actions">
        <button @click="router.push('/services/patent-analysis-workflow')" class="btn-secondary">
          返回列表
        </button>
      </div>
    </div>

    <div v-if="showConfirmModal" class="modal-overlay">
      <div class="modal-card">
        <div class="modal-header"><h3>💎 確認扣款</h3><button @click="showConfirmModal=false">×</button></div>
        <div class="modal-body">
          <p>啟動服務：{{ currentOption.title }}</p>
          <div class="row"><span>目前餘額：</span><span>{{ userStore.profile?.credits_balance }}</span></div>
          <div class="row deduct"><span>本次扣除：</span><span>- {{ currentOption.cost }}</span></div>
          <div class="divider"></div>
          <div class="row final"><span>剩餘：</span><span>{{ (userStore.profile?.credits_balance || 0) - currentOption.cost }}</span></div>
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
import { usePatentDocx } from '../../composables/usePatentDocx'
import { marked } from 'marked' // 需安裝: npm install marked

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const { generateAnalysisReport } = usePatentDocx()

// 設定選項
const analysisOptions = [
  { id: 'single_analysis', title: '單篇詳細分析', cost: 100, icon: '📄', desc: '權利範圍解讀、強度評分' },
  { id: 'tech_map', title: '技術圖譜分析', cost: 50, icon: '🕸️', desc: '生成技術流程圖 (Flowchart)' },
  { id: 'landscape_basic', title: '地圖初步分析', cost: 10000, icon: '🗺️', desc: '檢索統計、趨勢分析 (1週)' },
  { id: 'landscape_deep', title: '地圖詳細分析', cost: 50000, icon: '🔭', desc: 'AI 逐篇深度比對 (1週)' }
]

const selectedOption = ref('single_analysis')
const currentOption = computed(() => analysisOptions.find(o => o.id === selectedOption.value))
const currentOptionTitle = computed(() => currentOption.value?.title || '分析')

const jobId = ref(route.query.job_id || null)
const isInit = ref(!route.query.job_id)
const isUploading = ref(false)
const isProcessing = ref(false)
const showConfirmModal = ref(false)
const inputFile = ref(null)
const pollTimer = ref(null)
const jobStatus = ref('')
const resultData = ref(null)

const inputData = ref({
  patent_number: '',
  keywords: '',
  assignee: '',
  notes: ''
})

const insufficientFunds = computed(() => (userStore.profile?.credits_balance || 0) < currentOption.value.cost)
const canStart = computed(() => {
  if (['single_analysis', 'tech_map'].includes(selectedOption.value)) {
    return inputData.value.patent_number || inputFile.value
  }
  return inputData.value.keywords.length > 2
})
const jobStatusText = computed(() => jobStatus.value === 'completed' ? '分析完成' : '處理中')

const handleFileUpload = (e) => { inputFile.value = e.target.files[0] }
const renderMarkdown = (text) => marked(text || '')

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
      p_credits: currentOption.value.cost,
      p_action_type: 'PATENT_ANALYSIS',
      p_description: `${currentOption.value.title}: ${inputData.value.patent_number || inputData.value.keywords}`,
      p_model_name: 'Analysis-AI',
      p_job_id: null,
      p_project_id: null
    })
    
    if (resErr || !reserve.success) {
      throw new Error(resErr?.message || '扣款失敗')
    }
    
    transactionId = reserve.transaction_id
    console.log('✅ 扣款成功:', transactionId)

    // 2. 建立 Job
    const { data: job, error: jobErr } = await supabase.from('saas_jobs').insert({
      user_id: userStore.user.id,
      job_type: 'patent_analysis', // 統一類型
      status: 'pending',
      payment_status: 'reserved',
      transaction_id: transactionId,
      credits_deducted: currentOption.value.cost,
      input_data: {
        analysis_type: selectedOption.value, // ✅ 區分子類型
        patent_number: inputData.value.patent_number,
        keywords: inputData.value.keywords,
        assignee: inputData.value.assignee,
        notes: inputData.value.notes
      }
    }).select().single()
    
    if (jobErr) throw jobErr
    
    jobId.value = job.id
    console.log('✅ Job 建立成功:', job.id)

    // 3. 上傳檔案 (如果有)
    if (inputFile.value) {
      try {
        const filePath = `analysis/${job.id}/source.pdf`
        const { error: uploadError } = await supabase.storage
          .from('patent-documents')
          .upload(filePath, inputFile.value)
        
        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage
          .from('patent-documents')
          .getPublicUrl(filePath)

        const updatedInputData = {
          ...job.input_data,
          file_path: filePath,
          file_url: urlData.publicUrl,
          file_name: inputFile.value.name
        }

        await supabase.from('saas_jobs')
          .update({ input_data: updatedInputData })
          .eq('id', job.id)

        console.log('✅ 檔案上傳成功')
      } catch (uploadErr) {
        console.error('❌ 檔案上傳失敗:', uploadErr)
        throw new Error('檔案上傳失敗')
      }
    }

    // 4. 調用 n8n Router Webhook
    const webhookPayload = {
      job_id: job.id,
      transaction_id: transactionId,
      analysis_type: selectedOption.value,
      patent_number: inputData.value.patent_number,
      keywords: inputData.value.keywords,
      assignee: inputData.value.assignee,
      notes: inputData.value.notes
    }

    console.log('📡 調用 Webhook:', webhookPayload)

    const response = await fetch(import.meta.env.VITE_N8N_WEBHOOK_ROUTER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhookPayload)
    })

    if (!response.ok) {
      throw new Error(`Webhook 調用失敗: ${response.status}`)
    }

    const webhookResult = await response.json()
    console.log('✅ Webhook 回應:', webhookResult)

    // 5. 開始輪詢
    isInit.value = false
    isProcessing.value = true
    isUploading.value = false
    startPolling()

  } catch (err) {
    console.error('❌ 執行失敗:', err)
    alert('啟動失敗: ' + err.message)
    isUploading.value = false
    
    // 退款
    if (transactionId) {
      await supabase.rpc('refund_credits', { 
        p_transaction_id: transactionId, 
        p_reason: err.message 
      })
      console.log('✅ 已退款')
    }
  }
}

const startPolling = () => {
  if (pollTimer.value) clearInterval(pollTimer.value)
  
  pollTimer.value = setInterval(async () => {
    if (!jobId.value) return
    
    try {
      const { data, error } = await supabase
        .from('saas_jobs')
        .select('*')
        .eq('id', jobId.value)
        .single()
      
      if (error) throw error
      
      jobStatus.value = data.status
      console.log('📊 Job 狀態:', data.status)

      // 處理完成
      if (data.status === 'completed' && data.result_data) {
        // 確認扣款
        if (data.payment_status === 'reserved') {
          await supabase.rpc('confirm_deduction', { 
            p_transaction_id: data.transaction_id 
          })
          await supabase.from('saas_jobs')
            .update({ payment_status: 'completed' })
            .eq('id', jobId.value)
          userStore.fetchUser()
          console.log('✅ 扣款已確認')
        }

        // 解析 result_data
        let parsed = data.result_data
        if (typeof parsed === 'string') {
          try { 
            parsed = JSON.parse(parsed) 
          } catch (e) {
            console.error('❌ 解析 result_data 失敗:', e)
            parsed = {}
          }
        }

        // 根據分析類型處理
        const analysisType = data.input_data?.analysis_type
        
        if (analysisType === 'tech_map') {
          resultData.value = {
            techmap_url: parsed.techmap_url,
            feature_count: parsed.feature_count || 0,
            flow_count: parsed.flow_count || 0,
            stage_count: parsed.stage_count || 0
          }
        } else if (analysisType === 'single_analysis') {
          resultData.value = {
            full_analysis_url: parsed.full_analysis_url,
            techmap_url: parsed.techmap_url,
            text_url: parsed.text_url,
            analysis_summary: parsed.analysis_summary,
            quality_score: parsed.quality_score
          }
        } else {
          resultData.value = parsed
        }

        isProcessing.value = false
        clearInterval(pollTimer.value)
        console.log('✅ 分析完成')
      }

      // 處理失敗
      if (data.status === 'failed') {
        errorMessage.value = data.error_message || '未知錯誤'
        isProcessing.value = false
        clearInterval(pollTimer.value)
        console.error('❌ 分析失敗:', errorMessage.value)
      }

    } catch (err) {
      console.error('❌ 輪詢錯誤:', err)
    }
  }, 3000) // 每 3 秒輪詢一次
}

const handleDownloadReport = async () => {
  if (!resultData.value) return
  await generateAnalysisReport({
    fileName: `專利分析報告_${jobId.value.slice(0,6)}`,
    type: selectedOption.value,
    resultData: resultData.value
  })
}

onMounted(() => { if (jobId.value) { isProcessing.value = true; startPolling() } })
onUnmounted(() => { if (pollTimer.value) clearInterval(pollTimer.value) })
</script>

<style scoped>
/* 頁面特定樣式 */
.analysis-page { max-width: 1100px; margin: 0 auto; padding: 2rem; color: #2c3e50; }
.page-header { margin-bottom: 2rem; }
.btn-back { background: none; border: none; color: #666; cursor: pointer; }
.title-group { display: flex; justify-content: space-between; align-items: center; }
.title-group h1 { font-size: 1.8rem; margin: 0; }
.header-info { display: flex; gap: 12px; align-items: center; }
.credit-badge { background: #f0f9ff; color: #0284c7; padding: 6px 12px; border-radius: 20px; font-weight: 600; }

.service-selector { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px; }
.option-card { background: white; border: 2px solid #eee; border-radius: 12px; padding: 16px; cursor: pointer; transition: all 0.2s; display: flex; align-items: flex-start; gap: 12px; }
.option-card:hover { transform: translateY(-2px); border-color: #90caf9; }
.option-card.active { border-color: #2196F3; background: #e3f2fd; }
.opt-icon { font-size: 2rem; }
.opt-content h4 { margin: 0 0 4px 0; font-size: 1rem; color: #333; }
.opt-content p { margin: 0 0 8px 0; font-size: 0.85rem; color: #666; line-height: 1.4; }
.price-tag { background: #fff; padding: 2px 8px; border-radius: 10px; font-size: 0.8rem; font-weight: bold; color: #1976D2; border: 1px solid #bbdefb; }

.card { background: white; border-radius: 16px; padding: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid #eee; }
.card h3, .card h4 { margin-top: 0; color: #34495e; border-left: 4px solid #2196F3; padding-left: 10px; }
.form-group { margin-bottom: 16px; }
.form-group label { display: block; margin-bottom: 8px; font-weight: 500; }
.input-text, textarea { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px; font-family: inherit; }
.hint { color: #2e7d32; font-size: 0.9rem; margin-top: 4px; }
.info-box { background: #e3f2fd; color: #0d47a1; padding: 12px; border-radius: 8px; font-size: 0.9rem; margin-top: 10px; }

.action-footer { display: flex; flex-direction: column; align-items: center; gap: 12px; margin-top: 20px; }
.cost-highlight { color: #d32f2f; font-weight: bold; font-size: 1.2rem; }
.btn-primary { background: linear-gradient(135deg, #2196F3, #1976D2); color: white; border: none; padding: 12px 36px; border-radius: 30px; font-size: 1.1rem; font-weight: bold; cursor: pointer; box-shadow: 0 4px 10px rgba(33, 150, 243, 0.3); }
.btn-primary:disabled { background: #ccc; cursor: not-allowed; box-shadow: none; }

.mermaid-box { background: #f8f9fa; padding: 16px; border-radius: 8px; overflow-x: auto; font-family: monospace; font-size: 0.9rem; border: 1px solid #ddd; margin: 10px 0; }
.btn-link { display: inline-block; background: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 8px; font-weight: bold; }

/* Modal 與 Loading 樣式 (同前) */
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 999; }
.modal-card { background: white; padding: 20px; border-radius: 12px; width: 90%; max-width: 400px; }
.modal-header { display: flex; justify-content: space-between; margin-bottom: 16px; }
.modal-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
.processing-state { text-align: center; padding: 60px 0; }
.spinner-large { border: 4px solid #f3f3f3; border-top: 4px solid #2196F3; border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite; margin: 0 auto 20px; }
</style>