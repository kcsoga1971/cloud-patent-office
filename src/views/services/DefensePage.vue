<!-- src/views/services/DefensePage.vue -->
<template>
  <div class="defense-page">
    <!-- 返回按鈕 -->
    <button @click="router.push('/services/defense-workflow')" class="btn-back">
      ← 返回案件列表
    </button>

    <!-- 頁面標題 -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-icon">🛡️</div>
        <div class="header-text">
          <h1>專利核駁答辯 (OA Defense)</h1>
          <p class="subtitle">AI 智能分析審查意見，自動生成答辯策略與申復理由書</p>
        </div>
      </div>
      <div class="header-badges">
        <div class="cost-badge">
          <span class="icon">💎</span>
          <span class="cost">{{ DEFENSE_COST }} 點</span>
        </div>
        <div class="balance-badge">
          <span class="label">餘額：</span>
          <span class="value">{{ userStore.profile?.credits_balance || 0 }} 點</span>
        </div>
      </div>
    </div>

    <!-- ========== 1️⃣ 初始上傳介面 ========== -->
    <div v-if="isInit && !isProcessing && !isUploading && !resultData" class="init-container">
      
      <!-- 流程步驟指示 -->
      <div class="process-indicator">
        <div class="step" :class="{ active: true, completed: files.spec && files.oa }">
          <div class="step-number">1</div>
          <div class="step-label">上傳文件</div>
        </div>
        <div class="step-line"></div>
        <div class="step" :class="{ active: files.spec && files.oa, completed: strategy }">
          <div class="step-number">2</div>
          <div class="step-label">選擇策略</div>
        </div>
        <div class="step-line"></div>
        <div class="step" :class="{ active: strategy }">
          <div class="step-number">3</div>
          <div class="step-label">補充資訊</div>
        </div>
        <div class="step-line"></div>
        <div class="step">
          <div class="step-number">4</div>
          <div class="step-label">開始分析</div>
        </div>
      </div>

      <!-- 步驟 1：上傳文件 -->
      <div class="section-card">
        <div class="card-header">
          <h2><span class="step-badge">步驟 1</span> 上傳專利文件</h2>
          <p class="card-description">請上傳專利說明書與審查意見書（PDF 格式）</p>
        </div>
        
        <div class="upload-grid">
          <!-- 說明書上傳 -->
          <div class="upload-card" :class="{ 'has-file': files.spec }">
            <input 
              type="file" 
              accept=".pdf" 
              @change="handleFileUpload($event, 'spec')"
              class="file-input"
              id="spec-upload"
            />
            <label for="spec-upload" class="upload-area">
              <div class="upload-icon">
                <span v-if="!files.spec">📄</span>
                <span v-else class="success-icon">✅</span>
              </div>
              <div class="upload-content">
                <h3>專利說明書</h3>
                <p v-if="!files.spec" class="upload-hint">點擊或拖放 PDF 檔案</p>
                <p v-else class="file-name">{{ files.spec.name }}</p>
                <span class="upload-size" v-if="files.spec">
                  {{ (files.spec.size / 1024 / 1024).toFixed(2) }} MB
                </span>
              </div>
              <div class="upload-action">
                <span v-if="!files.spec" class="btn-upload">選擇檔案</span>
                <span v-else class="btn-change">更換檔案</span>
              </div>
            </label>
          </div>

          <!-- 審查意見書上傳 -->
          <div class="upload-card" :class="{ 'has-file': files.oa }">
            <input 
              type="file" 
              accept=".pdf" 
              @change="handleFileUpload($event, 'oa')"
              class="file-input"
              id="oa-upload"
            />
            <label for="oa-upload" class="upload-area">
              <div class="upload-icon">
                <span v-if="!files.oa">📋</span>
                <span v-else class="success-icon">✅</span>
              </div>
              <div class="upload-content">
                <h3>審查意見書</h3>
                <p v-if="!files.oa" class="upload-hint">點擊或拖放 PDF 檔案</p>
                <p v-else class="file-name">{{ files.oa.name }}</p>
                <span class="upload-size" v-if="files.oa">
                  {{ (files.oa.size / 1024 / 1024).toFixed(2) }} MB
                </span>
              </div>
              <div class="upload-action">
                <span v-if="!files.oa" class="btn-upload">選擇檔案</span>
                <span v-else class="btn-change">更換檔案</span>
              </div>
            </label>
          </div>
        </div>
      </div>

      <!-- 步驟 2：選擇答辯策略 -->
      <div class="section-card" :class="{ disabled: !canStart }">
        <div class="card-header">
          <h2><span class="step-badge">步驟 2</span> 選擇答辯策略</h2>
          <p class="card-description">根據您的需求選擇合適的答辯策略</p>
        </div>
        
        <div class="strategy-grid">
          <label class="strategy-card" :class="{ selected: strategy === 'ai_recommended' }">
            <input type="radio" value="ai_recommended" v-model="strategy" />
            <div class="strategy-icon">🤖</div>
            <div class="strategy-content">
              <h3>AI 智能推薦</h3>
              <p>由 AI 分析案件特性後自動選擇最佳策略</p>
              <ul class="strategy-features">
                <li>✓ 智能分析核駁理由</li>
                <li>✓ 自動評估成功率</li>
                <li>✓ 平衡風險與效益</li>
              </ul>
            </div>
            <div class="strategy-badge">推薦</div>
          </label>
          
          <label class="strategy-card" :class="{ selected: strategy === 'conservative' }">
            <input type="radio" value="conservative" v-model="strategy" />
            <div class="strategy-icon">🛡️</div>
            <div class="strategy-content">
              <h3>保守策略</h3>
              <p>著重於修正與補充，降低風險</p>
              <ul class="strategy-features">
                <li>✓ 主動修正請求項</li>
                <li>✓ 補充技術特徵</li>
                <li>✓ 提高核准機率</li>
              </ul>
            </div>
          </label>
          
          <label class="strategy-card" :class="{ selected: strategy === 'aggressive' }">
            <input type="radio" value="aggressive" v-model="strategy" />
            <div class="strategy-icon">⚔️</div>
            <div class="strategy-content">
              <h3>積極策略</h3>
              <p>強力辯駁審查意見，爭取最大權利範圍</p>
              <ul class="strategy-features">
                <li>✓ 主張原請求項有效</li>
                <li>✓ 詳細技術辯駁</li>
                <li>✓ 保持最大保護範圍</li>
              </ul>
            </div>
          </label>
        </div>
      </div>

      <!-- 步驟 3：補充資訊（選填） -->
      <div class="section-card optional" :class="{ disabled: !canStart }">
        <div class="card-header">
          <h2><span class="step-badge">步驟 3</span> 補充資訊 <span class="optional-badge">選填</span></h2>
          <p class="card-description">提供額外資訊以協助 AI 更精準分析</p>
        </div>
        
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">
              <span class="label-icon">🔢</span>
              專利編號
            </label>
            <input 
              v-model="patentNumber" 
              type="text" 
              placeholder="例如：TW202012345"
              class="form-input"
            />
            <p class="form-hint">方便日後追蹤與管理</p>
          </div>

          <div class="form-group full-width">
            <label class="form-label">
              <span class="label-icon">📝</span>
              補充說明
            </label>
            <textarea 
              v-model="userNotes" 
              placeholder="您可以在此補充任何特殊要求或背景資訊，例如：&#10;• 特定技術領域的專業術語&#10;• 與競爭對手的差異重點&#10;• 希望強調的技術特徵&#10;• 其他需要 AI 注意的事項"
              class="form-textarea"
              rows="5"
            ></textarea>
            <p class="form-hint">這些資訊將協助 AI 產生更符合您需求的答辯內容</p>
          </div>
        </div>
      </div>

      <!-- 步驟 4：開始分析 -->
      <div class="action-section">
        <div class="action-card">
          <div class="action-info">
            <div class="info-item">
              <span class="info-label">所需點數：</span>
              <span class="info-value">{{ DEFENSE_COST }} 點</span>
            </div>
            <div class="info-item">
              <span class="info-label">當前餘額：</span>
              <span class="info-value" :class="{ insufficient: insufficientFunds }">
                {{ userStore.profile?.credits_balance || 0 }} 點
              </span>
            </div>
            <div class="info-item">
              <span class="info-label">預計時間：</span>
              <span class="info-value">2-5 分鐘</span>
            </div>
          </div>

          <button 
            @click="handleStartClick" 
            :disabled="!canStart || insufficientFunds"
            class="btn-start-analysis"
            :class="{ 
              disabled: !canStart || insufficientFunds,
              ready: canStart && !insufficientFunds 
            }"
          >
            <span v-if="insufficientFunds" class="btn-content">
              <span class="btn-icon">❌</span>
              <span class="btn-text">點數不足，需要 {{ DEFENSE_COST }} 點</span>
            </span>
            <span v-else-if="!canStart" class="btn-content">
              <span class="btn-icon">📤</span>
              <span class="btn-text">請先完成步驟 1：上傳兩份文件</span>
            </span>
            <span v-else class="btn-content">
              <span class="btn-icon">🚀</span>
              <span class="btn-text">開始 AI 答辯分析</span>
              <span class="btn-cost">（{{ DEFENSE_COST }} 點）</span>
            </span>
          </button>

          <p v-if="insufficientFunds" class="insufficient-hint">
            💡 點數不足？<router-link to="/credits/purchase" class="link-purchase">前往購買點數</router-link>
          </p>
        </div>
      </div>

    </div>

    <!-- ========== 2️⃣ 上傳中介面 ========== -->
    <div v-else-if="isUploading" class="status-container">
      <div class="status-card">
        <div class="spinner-large"></div>
        <h2>📤 正在上傳檔案...</h2>
        <p class="status-description">請稍候，系統正在處理您的文件</p>
        <div class="progress-bar">
          <div class="progress-fill" style="width: 60%"></div>
        </div>
      </div>
    </div>

    <!-- ========== 3️⃣ AI 分析中介面 ========== -->
    <div v-else-if="isProcessing && !resultData" class="status-container">
      <div class="status-card">
        <div class="spinner-large"></div>
        <h2>🤖 AI 正在分析審查意見...</h2>
        <p class="status-text">{{ jobStatusText }}</p>
        <p class="status-description">這通常需要 2-5 分鐘，請稍候</p>
        
        <!-- 流程進度指示 -->
        <div class="analysis-steps">
          <div class="analysis-step completed">
            <div class="step-icon">✅</div>
            <div class="step-label">上傳檔案</div>
          </div>
          <div class="analysis-step completed">
            <div class="step-icon">✅</div>
            <div class="step-label">文字提取 (OCR)</div>
          </div>
          <div class="analysis-step active">
            <div class="step-icon">🔄</div>
            <div class="step-label">Gemini 策略分析</div>
          </div>
          <div class="analysis-step">
            <div class="step-icon">⏳</div>
            <div class="step-label">生成答辯稿</div>
          </div>
        </div>

        <button @click="router.push('/services/defense-workflow')" class="btn-secondary">
          返回案件列表
        </button>
      </div>
    </div>

    <!-- ========== 4️⃣ 結果顯示介面 ========== -->
    <DefenseResultPanel 
      v-else-if="resultData"
      :result-data="resultData"
      :job-id="jobId"
    />

    <!-- ========== 5️⃣ 錯誤狀態 ========== -->
    <div v-else class="status-container">
      <div class="status-card error">
        <div class="error-icon">⚠️</div>
        <h2>狀態異常</h2>
        <p>請重新整理頁面或返回案件列表</p>
        <button @click="router.push('/services/defense-workflow')" class="btn-secondary">
          返回案件列表
        </button>
      </div>
    </div>

    <!-- 確認彈窗 -->
    <div v-if="showConfirmModal" class="modal-overlay" @click.self="showConfirmModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h2>🔔 確認啟動答辯分析</h2>
          <button @click="showConfirmModal = false" class="modal-close">✕</button>
        </div>
        
        <div class="modal-body">
          <div class="confirm-info">
            <div class="info-row">
              <span class="info-label">費用：</span>
              <span class="info-value highlight">{{ DEFENSE_COST }} 點</span>
            </div>
            <div class="info-row">
              <span class="info-label">當前餘額：</span>
              <span class="info-value">{{ userStore.profile?.credits_balance || 0 }} 點</span>
            </div>
            <div class="info-row">
              <span class="info-label">扣款後餘額：</span>
              <span class="info-value">{{ (userStore.profile?.credits_balance || 0) - DEFENSE_COST }} 點</span>
            </div>
            <div class="divider"></div>
            <div class="info-row">
              <span class="info-label">答辯策略：</span>
              <span class="info-value">
                {{ strategy === 'ai_recommended' ? '🤖 AI 智能推薦' : 
                   (strategy === 'conservative' ? '🛡️ 保守策略' : '⚔️ 積極策略') }}
              </span>
            </div>
            <div class="info-row" v-if="patentNumber">
              <span class="info-label">專利編號：</span>
              <span class="info-value">{{ patentNumber }}</span>
            </div>
          </div>
          
          <div class="warning-box">
            <span class="warning-icon">⚠️</span>
            <p>確認後將立即扣點並開始分析，此操作無法取消</p>
          </div>
        </div>

        <div class="modal-actions">
          <button @click="showConfirmModal = false" class="btn-cancel">取消</button>
          <button @click="executeDefenseJob" class="btn-confirm">
            <span class="btn-icon">🚀</span>
            確認啟動
          </button>
        </div>
      </div>
    </div>

    <ServiceTips type="defense" />
  </div>
</template>

<!-- src/views/services/DefensePage.vue -->
<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { supabase } from '../../supabase'
import { useUserStore } from '../../stores/user'
import DefenseResultPanel from './DefenseResultPanel.vue'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

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
const patentNumber = ref('')

const insufficientFunds = computed(() => {
  const balance = userStore.profile?.credits_balance || 0
  return balance < DEFENSE_COST
})

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

const handleStartClick = () => {
  if (!userStore.user) return alert('請先登入')
  
  if (insufficientFunds.value) {
    alert(`點數不足！需要 ${DEFENSE_COST} 點，目前僅有 ${userStore.profile?.credits_balance} 點。`)
    return
  }
  
  showConfirmModal.value = true
}

// ========== 🆕 載入現有案件資料 ==========
const loadExistingJob = async () => {
  if (!jobId.value) return
  
  console.log('📂 載入現有案件:', jobId.value)
  
  try {
    const { data, error } = await supabase
      .from('saas_jobs')
      .select('*')
      .eq('id', jobId.value)
      .single()
    
    if (error) throw error
    
    console.log('✅ 案件資料:', data)
    
    // ✅ 關鍵：先設定狀態
    jobStatus.value = data.phase || data.status
    patentNumber.value = data.my_patent_drafting_number || ''
    
    if (data.input_data) {
      strategy.value = data.input_data.strategy || 'ai_recommended'
      userNotes.value = data.input_data.user_notes || ''
    }
    
    // 檢查是否已完成
    if (data.status === 'completed' && data.result_data) {
      console.log('✅ 案件已完成，載入結果')
      
      let parsedResult = data.result_data
      if (typeof parsedResult === 'string') {
        try { 
          parsedResult = JSON.parse(parsedResult) 
        } catch (e) {
          console.error('❌ 解析結果失敗:', e)
        }
      }
      
      if (parsedResult && (parsedResult.analysis_summary || parsedResult.argument)) {
        resultData.value = parsedResult
        isProcessing.value = false  // ✅ 設為 false
        isInit.value = false         // ✅ 設為 false
        return
      }
    }
    
    // 處理中狀態
    const processingStatuses = ['pending', 'drafting', 'reserved', 'processing']
    
    if (processingStatuses.includes(data.status)) {
      console.log('⏳ 案件處理中，開始輪詢...')
      console.log('📊 當前狀態:', {
        status: data.status,
        phase: data.phase,
        payment_status: data.payment_status
      })
      
      // ✅ 關鍵：設定正確的狀態
      isInit.value = false          // ✅ 不是初始狀態
      isProcessing.value = true     // ✅ 是處理中狀態
      isUploading.value = false     // ✅ 不是上傳中
      
      startPolling()
      return
    }
    
    // 失敗狀態
    if (data.status === 'failed') {
      console.error('❌ 案件失敗')
      alert('此案件分析失敗，請重新建立。')
      isProcessing.value = false
      isInit.value = true
      return
    }
    
    // 未知狀態
    console.warn('⚠️ 未知狀態:', data.status)
    alert(`案件狀態異常：${data.status}`)
    isProcessing.value = false
    isInit.value = true
    
  } catch (err) {
    console.error('❌ 載入案件失敗:', err)
    alert('載入案件失敗：' + err.message)
    isProcessing.value = false
    isInit.value = true
  }
}

const executeDefenseJob = async () => {
  showConfirmModal.value = false
  
  console.log('🚀 準備啟動答辯分析流程...')
  isUploading.value = true
  let transactionId = null
  let jobIdLocal = null

  try {
    // 💰 A. 預扣款
    console.log('💰 正在預扣點數...')
    const { data: reserveResult, error: reserveError } = await supabase
      .rpc('reserve_credits', {
        p_user_id: userStore.user.id,
        p_credits: DEFENSE_COST,
        p_action_type: 'PATENT_DEFENSE',
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
        payment_status: 'reserved',
        transaction_id: transactionId,
        credits_deducted: DEFENSE_COST,
        my_patent_drafting_number: patentNumber.value || null,
        input_data: {
          strategy: strategy.value,
          user_notes: userNotes.value,
          patent_number: patentNumber.value
        }
      })
      .select()
      .single()

    if (jobError) throw new Error('建立案件失敗: ' + jobError.message)
    
    jobId.value = job.id
    jobIdLocal = job.id
    console.log('✅ 案件建立成功, Job ID:', job.id)

    // 🔗 更新 Transaction 的 job_id
    try {
      await supabase.rpc('update_transaction_job', {
        p_transaction_id: transactionId,
        p_job_id: job.id
      })
    } catch (e) { 
      console.warn('⚠️ 無法更新 Transaction Job ID (非致命錯誤)', e) 
    }

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

    if (uploadSpec.error) throw new Error('說明書上傳失敗: ' + uploadSpec.error.message)
    if (uploadOA.error) throw new Error('審查意見書上傳失敗: ' + uploadOA.error.message)

    console.log('✅ 檔案上傳成功')

    // 💾 D. 更新資料庫檔案路徑
    await supabase.from('saas_jobs').update({
      input_data: {
        ...job.input_data,
        spec_file_path: specPath,
        oa_file_path: oaPath
      }
    }).eq('id', job.id)

    // 🤖 E. 呼叫 n8n Webhook
    console.log('🤖 準備呼叫 n8n Webhook...')
    const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_DEFENSE_URL

    if (!webhookUrl) {
      throw new Error('❌ 環境變數 VITE_N8N_WEBHOOK_DEFENSE_URL 未設定')
    }

    console.log('📡 Webhook URL:', webhookUrl)
    console.log('📦 發送資料:', { 
      job_id: job.id, 
      transaction_id: transactionId,
      user_id: userStore.user.id
    })

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ 
          job_id: job.id,
          transaction_id: transactionId,
          user_id: userStore.user.id,
          strategy: strategy.value,
          user_notes: userNotes.value
        })
      })

      console.log('📡 Webhook 回應狀態:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Webhook 回應錯誤:', errorText)
        throw new Error(`Webhook 呼叫失敗: ${response.status}`)
      }

      const webhookResult = await response.json()
      console.log('✅ Webhook 回應成功:', webhookResult)

    } catch (webhookError) {
      console.error('❌ Webhook 呼叫異常:', webhookError)
    }

    // 🏁 流程啟動完成
    isInit.value = false
    isProcessing.value = true
    isUploading.value = false
    startPolling()

  } catch (err) {
    console.error('❌ 流程失敗:', err)
    alert('啟動失敗: ' + err.message)
    isUploading.value = false
    
    // 💰 F. 失敗退款邏輯
    if (transactionId) {
      console.log('🔄 啟動失敗，執行退款...')
      try {
        await supabase.rpc('refund_credits', {
          p_transaction_id: transactionId,
          p_reason: '系統啟動失敗: ' + err.message
        })
        
        if (jobIdLocal) {
          await supabase.from('saas_jobs')
            .update({ 
              payment_status: 'refunded', 
              status: 'failed',
              error_message: err.message
            })
            .eq('id', jobIdLocal)
        }
        
        await userStore.fetchUser()
        console.log('✅ 退款完成')
      } catch (refundError) {
        console.error('❌ 退款失敗:', refundError)
      }
    }
  }
}

const startPolling = () => {
  if (pollTimer.value) clearInterval(pollTimer.value)
  console.log('🔄 開始輪詢狀態...')
  
  let pollCount = 0
  const maxPolls = 120 // 最多輪詢 120 次（6 分鐘）
  
  pollTimer.value = setInterval(async () => {
    if (!jobId.value) {
      console.warn('⚠️ jobId 不存在，停止輪詢')
      clearInterval(pollTimer.value)
      return
    }

    pollCount++
    console.log(`🔄 輪詢第 ${pollCount} 次...`)

    const { data, error } = await supabase
      .from('saas_jobs')
      .select('*')
      .eq('id', jobId.value)
      .single()

    if (error) {
      console.error('❌ 輪詢查詢失敗:', error)
      return
    }

    console.log('📊 輪詢狀態:', {
      status: data.status,
      phase: data.phase,
      has_result: !!data.result_data
    })

    jobStatus.value = data.phase || data.status

    // ✅ 檢查是否完成
    if (data.status === 'completed' && data.result_data) {
      console.log('✅ 任務完成！')
      
      // 💰 確認扣款（如果有 transaction_id）
      if (data.payment_status === 'reserved' && data.transaction_id) {
        console.log('💰 確認扣款...')
        try {
          await supabase.rpc('confirm_deduction', {
            p_transaction_id: data.transaction_id
          })
          
          await supabase.from('saas_jobs')
            .update({ payment_status: 'completed' })
            .eq('id', jobId.value)
            
          await userStore.fetchUser()
          console.log('✅ 扣款確認完成')
        } catch (deductError) {
          console.error('❌ 扣款確認失敗:', deductError)
        }
      }

      // 解析結果
      let parsedResult = data.result_data
      if (typeof parsedResult === 'string') {
        try { 
          parsedResult = JSON.parse(parsedResult) 
        } catch (e) {
          console.error('❌ 解析結果失敗:', e)
        }
      }

      if (parsedResult && (parsedResult.analysis_summary || parsedResult.argument)) {
        resultData.value = parsedResult
        isProcessing.value = false
        clearInterval(pollTimer.value)
        console.log('🎉 結果載入完成！')
      } else {
        console.warn('⚠️ 結果格式異常:', parsedResult)
      }
    } 
    // ✅ 檢查是否失敗
    else if (data.status === 'failed') {
      console.error('❌ 任務失敗')
      clearInterval(pollTimer.value)
      isProcessing.value = false
      alert('AI 分析失敗，請稍後重試。')
    }
    // ✅ 超時處理
    else if (pollCount >= maxPolls) {
      console.error('⏰ 輪詢超時')
      clearInterval(pollTimer.value)
      isProcessing.value = false
      alert('分析時間過長，請稍後重新整理頁面查看結果。')
    }
  }, 3000) // 每 3 秒輪詢一次
}

// ========== 🆕 初始化邏輯 ==========
onMounted(async () => {
  if (jobId.value) {
    // 如果有 job_id，載入現有案件
    await loadExistingJob()
  }
  // 否則顯示上傳介面
})

onUnmounted(() => {
  if (pollTimer.value) clearInterval(pollTimer.value)
})

const handleExport = () => {
  // 這個功能已移至 DefenseResultPanel 內部處理
}
</script>

<style scoped>
.defense-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem;
}

/* 返回按鈕 */
.btn-back {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  margin-bottom: 2rem;
}

.btn-back:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateX(-4px);
}

/* 頁面標題 */
.page-header {
  background: white;
  border-radius: 20px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1.5rem;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.header-icon {
  font-size: 3.5rem;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.header-text h1 {
  font-size: 2rem;
  color: #2d3748;
  margin: 0 0 0.5rem 0;
  font-weight: 700;
}

.subtitle {
  color: #718096;
  margin: 0;
  font-size: 1rem;
}

.header-badges {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.cost-badge, .balance-badge {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

.balance-badge {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  box-shadow: 0 4px 15px rgba(245, 87, 108, 0.4);
}

/* 初始容器 */
.init-container {
  max-width: 1200px;
  margin: 0 auto;
}

/* 流程指示器 */
.process-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border-radius: 20px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  opacity: 0.4;
  transition: all 0.3s ease;
}

.step.active {
  opacity: 1;
}

.step.completed {
  opacity: 1;
}

.step-number {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: #e2e8f0;
  color: #a0aec0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.25rem;
  transition: all 0.3s ease;
}

.step.active .step-number {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
  animation: pulse 2s ease-in-out infinite;
}

.step.completed .step-number {
  background: #48bb78;
  color: white;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.step-label {
  font-size: 0.9rem;
  font-weight: 600;
  color: #4a5568;
  text-align: center;
}

.step-line {
  width: 80px;
  height: 3px;
  background: #e2e8f0;
  margin: 0 1rem;
}

/* 卡片區塊 */
.section-card {
  background: white;
  border-radius: 20px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.section-card.disabled {
  opacity: 0.6;
  pointer-events: none;
}

.section-card.optional {
  border: 2px dashed #e2e8f0;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.05);
}

.card-header {
  margin-bottom: 2rem;
}

.card-header h2 {
  font-size: 1.5rem;
  color: #2d3748;
  margin: 0 0 0.5rem 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.step-badge {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
}

.optional-badge {
  background: #f7fafc;
  color: #718096;
  padding: 0.25rem 0.75rem;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 600;
  border: 1px solid #e2e8f0;
}

.card-description {
  color: #718096;
  margin: 0;
  font-size: 0.95rem;
}

/* 上傳網格 */
.upload-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.upload-card {
  position: relative;
  border: 3px dashed #cbd5e0;
  border-radius: 16px;
  transition: all 0.3s ease;
  overflow: hidden;
}

.upload-card:hover {
  border-color: #667eea;
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.2);
  transform: translateY(-2px);
}

.upload-card.has-file {
  border-color: #48bb78;
  border-style: solid;
  background: linear-gradient(135deg, #f0fff4 0%, #c6f6d5 100%);
}

.file-input {
  display: none;
}

.upload-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  cursor: pointer;
  gap: 1rem;
  min-height: 200px;
  justify-content: center;
}

.upload-icon {
  font-size: 3rem;
  margin-bottom: 0.5rem;
}

.success-icon {
  animation: bounceIn 0.5s ease;
}

@keyframes bounceIn {
  0% { transform: scale(0); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

.upload-content {
  text-align: center;
}

.upload-content h3 {
  font-size: 1.25rem;
  color: #2d3748;
  margin: 0 0 0.5rem 0;
  font-weight: 600;
}

.upload-hint {
  color: #a0aec0;
  font-size: 0.9rem;
  margin: 0;
}

.file-name {
  color: #2d3748;
  font-weight: 600;
  margin: 0 0 0.25rem 0;
  word-break: break-all;
}

.upload-size {
  color: #718096;
  font-size: 0.85rem;
}

.upload-action {
  margin-top: 1rem;
}

.btn-upload, .btn-change {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 0.75rem 2rem;
  border-radius: 12px;
  font-weight: 600;
  display: inline-block;
  transition: all 0.3s ease;
}

.btn-change {
  background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
}

.upload-card:hover .btn-upload,
.upload-card:hover .btn-change {
  transform: scale(1.05);
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

/* 策略網格 */
.strategy-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
}

.strategy-card {
  position: relative;
  background: #f7fafc;
  border: 3px solid #e2e8f0;
  border-radius: 16px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.strategy-card input[type="radio"] {
  display: none;
}

.strategy-card:hover {
  border-color: #667eea;
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.2);
}

.strategy-card.selected {
  border-color: #667eea;
  background: linear-gradient(135deg, #f0f4ff 0%, #e9d5ff 100%);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
}

.strategy-icon {
  font-size: 2.5rem;
  text-align: center;
}

.strategy-content h3 {
  font-size: 1.25rem;
  color: #2d3748;
  margin: 0 0 0.5rem 0;
  font-weight: 600;
}

.strategy-content p {
  color: #718096;
  font-size: 0.9rem;
  margin: 0 0 1rem 0;
  line-height: 1.6;
}

.strategy-features {
  list-style: none;
  padding: 0;
  margin: 0;
}

.strategy-features li {
  color: #4a5568;
  font-size: 0.875rem;
  padding: 0.25rem 0;
  line-height: 1.6;
}

.strategy-badge {
  position: absolute;
  top: -12px;
  right: 20px;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
  padding: 0.35rem 0.75rem;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 700;
  box-shadow: 0 4px 15px rgba(245, 87, 108, 0.4);
}

/* 表單網格 */
.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group.full-width {
  grid-column: 1 / -1;
}

.form-label {
  font-weight: 600;
  color: #2d3748;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.95rem;
}

.label-icon {
  font-size: 1.25rem;
}

.form-input, .form-textarea {
  padding: 0.875rem 1rem;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  font-size: 0.95rem;
  transition: all 0.3s ease;
  font-family: inherit;
}

.form-input:focus, .form-textarea:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-textarea {
  resize: vertical;
  line-height: 1.6;
}

.form-hint {
  color: #a0aec0;
  font-size: 0.85rem;
  margin: 0;
}

/* 操作區域 */
.action-section {
  margin-top: 2rem;
}

.action-card {
  background: white;
  border-radius: 20px;
  padding: 2rem;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
}

.action-info {
  display: flex;
  justify-content: space-around;
  padding: 1.5rem;
  background: #f7fafc;
  border-radius: 12px;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.info-label {
  color: #718096;
  font-size: 0.875rem;
}

.info-value {
  color: #2d3748;
  font-size: 1.25rem;
  font-weight: 700;
}

.info-value.insufficient {
  color: #f56565;
}

.info-value.highlight {
  color: #667eea;
}

.btn-start-analysis {
  width: 100%;
  padding: 1.25rem 2rem;
  border: none;
  border-radius: 16px;
  font-size: 1.125rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  background: #e2e8f0;
  color: #a0aec0;
}

.btn-start-analysis.ready {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
}

.btn-start-analysis.ready:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 35px rgba(102, 126, 234, 0.5);
}

.btn-start-analysis.disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.btn-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
}

.btn-icon {
  font-size: 1.5rem;
}

.btn-cost {
  opacity: 0.9;
  font-size: 0.95rem;
}

.insufficient-hint {
  text-align: center;
  color: #718096;
  margin-top: 1rem;
  font-size: 0.95rem;
}

.link-purchase {
  color: #667eea;
  font-weight: 600;
  text-decoration: none;
  border-bottom: 2px solid #667eea;
  transition: all 0.3s ease;
}

.link-purchase:hover {
  color: #764ba2;
  border-color: #764ba2;
}

/* 狀態容器 */
.status-container {
  max-width: 600px;
  margin: 4rem auto;
}

.status-card {
  background: white;
  border-radius: 20px;
  padding: 3rem 2rem;
  text-align: center;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
}

.status-card h2 {
  font-size: 1.75rem;
  color: #2d3748;
  margin: 1.5rem 0 0.5rem 0;
}

.status-text {
  color: #667eea;
  font-weight: 600;
  font-size: 1.125rem;
  margin: 0.5rem 0;
}

.status-description {
  color: #718096;
  margin: 0.5rem 0 2rem 0;
}

.spinner-large {
  width: 80px;
  height: 80px;
  border: 6px solid #e2e8f0;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #e2e8f0;
  border-radius: 4px;
  overflow: hidden;
  margin-top: 2rem;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  animation: progress 2s ease-in-out infinite;
}

@keyframes progress {
  0% { width: 0%; }
  100% { width: 100%; }
}

.analysis-steps {
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin: 2rem 0;
  flex-wrap: wrap;
}

.analysis-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  opacity: 0.4;
}

.analysis-step.completed,
.analysis-step.active {
  opacity: 1;
}

.analysis-step .step-icon {
  font-size: 2rem;
}

.analysis-step.active .step-icon {
  animation: bounce 1s ease-in-out infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.analysis-step .step-label {
  font-size: 0.875rem;
  color: #4a5568;
  text-align: center;
}

.btn-secondary {
  background: #e2e8f0;
  color: #4a5568;
  border: none;
  padding: 0.875rem 2rem;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 1.5rem;
}

.btn-secondary:hover {
  background: #cbd5e0;
  transform: translateY(-2px);
}

/* 錯誤狀態 */
.status-card.error {
  border: 3px solid #fc8181;
}

.error-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

/* 確認彈窗 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background: white;
  border-radius: 20px;
  max-width: 500px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: modalSlideIn 0.3s ease;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  border-bottom: 2px solid #e2e8f0;
}

.modal-header h2 {
  font-size: 1.5rem;
  color: #2d3748;
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #a0aec0;
  cursor: pointer;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.modal-close:hover {
  background: #f7fafc;
  color: #4a5568;
}

.modal-body {
  padding: 2rem;
}

.confirm-info {
  background: #f7fafc;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 0.75rem 0;
  border-bottom: 1px solid #e2e8f0;
}

.info-row:last-child {
  border-bottom: none;
}

.info-row .info-label {
  color: #718096;
  font-weight: 500;
}

.info-row .info-value {
  color: #2d3748;
  font-weight: 600;
}

.info-row .info-value.highlight {
  color: #667eea;
  font-size: 1.125rem;
}

.divider {
  height: 2px;
  background: #e2e8f0;
  margin: 0.5rem 0;
}

.warning-box {
  background: #fff5f5;
  border: 2px solid #fc8181;
  border-radius: 12px;
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.warning-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.warning-box p {
  color: #c53030;
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.5;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  padding: 1.5rem 2rem;
  border-top: 2px solid #e2e8f0;
}

.btn-cancel, .btn-confirm {
  flex: 1;
  padding: 0.875rem 1.5rem;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 1rem;
}

.btn-cancel {
  background: #e2e8f0;
  color: #4a5568;
}

.btn-cancel:hover {
  background: #cbd5e0;
}

.btn-confirm {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

.btn-confirm:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
}

/* 響應式設計 */
@media (max-width: 768px) {
  .defense-page {
    padding: 1rem;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-content {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-icon {
    font-size: 2.5rem;
  }

  .header-text h1 {
    font-size: 1.5rem;
  }

  .process-indicator {
    overflow-x: auto;
    justify-content: flex-start;
  }

  .step-line {
    width: 40px;
  }

  .upload-grid,
  .strategy-grid {
    grid-template-columns: 1fr;
  }

  .action-info {
    flex-direction: column;
  }
}
</style>