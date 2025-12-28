<!-- src/views/services/RevisionPanel.vue -->
<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../../supabase'
import { useUserStore } from '../../stores/user' // ✅ 引入 UserStore 用於餘額檢查

const props = defineProps({
  jobId: { type: String, required: true },
  currentDraft: { type: String, required: true },
  modelName: { type: String, default: 'claude-sonnet-4.5' },
  status: { type: String, default: '' }
})

const emit = defineEmits(['revision-complete'])
const userStore = useUserStore() // ✅ 初始化 Store

// ========== 狀態管理 ==========
const revisionMode = ref('text')
const isRevising = ref(false)
const revisionInstructions = ref('')
const uploadedFile = ref(null)
const uploadedFileUrl = ref('')
const revisionResult = ref(null)
const errorMessage = ref('')

// QC 建議相關
const hasQCSuggestions = ref(false)
const qcReportData = ref(null)

// 版本歷史
const versions = ref([])
const isLoadingVersions = ref(false)

// ✅ 扣點確認彈窗狀態
const showConfirmModal = ref(false)
const REVISION_COST = 100 // 設定修訂費用

// ========== 輔助函數 ==========
const getRevisionTypeText = (type) => {
  const typeMap = {
    'phase2_generated': '初次生成',
    'user_revision': '使用者修訂',
    'ai_revision': 'AI 修訂 (基於 QC)',
    'manual_edit': '手動編輯'
  }
  return typeMap[type] || type
}

const formatDate = (dateString) => {
  if (!dateString) return '未知'
  const date = new Date(dateString)
  return date.toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// ========== 生命周期 ==========
onMounted(async () => {
  await loadVersionHistory()
  await detectQCReport()
  // 更新使用者餘額，確保彈窗顯示的是最新的數據
  await userStore.fetchUser()
})

// ========== 1. 版本歷史與 QC 偵測 ==========

const loadVersionHistory = async () => {
  isLoadingVersions.value = true
  try {
    const { data, error } = await supabase
      .from('draft_versions')
      .select('*')
      .eq('job_id', props.jobId)
      .order('version', { ascending: false })
    
    if (error) throw error
    versions.value = data || []
  } catch (err) {
    console.error('❌ 載入版本歷史失敗:', err)
  } finally {
    isLoadingVersions.value = false
  }
}

// 偵測是否有 QC 報告 (控制按鈕顯示)
const detectQCReport = async () => {
  // 只有當前狀態是 checked 才去查，節省資源
  if (props.status !== 'checked') return
  
  try {
    const { data } = await supabase
      .from('qc_reports')
      .select('*')
      .eq('job_id', props.jobId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
      
    if (data && data.ai_analysis) {
      if (typeof data.ai_analysis === 'string') {
        data.ai_analysis = JSON.parse(data.ai_analysis)
      }
      qcReportData.value = data.ai_analysis
      hasQCSuggestions.value = true
    }
  } catch (e) {
    console.log('查無 QC 報告', e)
  }
}

// 當使用者點擊「帶入 QC 建議」按鈕時執行
const prefillQCSuggestions = () => {
  if (!qcReportData.value) return
  
  const analysis = qcReportData.value
  const issues = analysis.critical_issues || []
  const suggestions = analysis.priority_improvements || []
  
  let text = "請協助修訂以下內容：\n\n"
  
  // 1. QC 建議部分
  text += "【基於 QC 檢查的修訂建議】\n"
  if (issues.length > 0) {
    issues.forEach((issue, idx) => {
      text += `${idx + 1}. [嚴重問題] ${issue}\n`
    })
  }
  if (suggestions.length > 0) {
    suggestions.forEach((item, idx) => {
      text += `${idx + 1}. [優化建議] ${item.item}: ${item.reason}\n`
    })
  }
  
  text += "\n【使用者的額外指示】\n"
  text += "(請在此輸入您的其他要求...)\n"
  
  // 智慧合併：如果原本就有字，詢問是否覆蓋
  if (revisionInstructions.value.trim()) {
    if (!confirm('指令框已有內容，是否要覆蓋？\n(點擊「取消」將附加在後方)')) {
      revisionInstructions.value += "\n\n" + text
      return
    }
  }
  
  revisionInstructions.value = text
}

// ========== 2. 檔案上傳 ==========
const handleFileUpload = async (event) => {
  const file = event.target.files[0]
  if (!file) return
  if (!file.name.endsWith('.docx')) {
    alert('請上傳 .docx 格式的檔案')
    return
  }
  uploadedFile.value = file
  try {
    const fileName = `revisions/${props.jobId}/${Date.now()}-${file.name}`
    const { data, error } = await supabase.storage.from('patent-documents').upload(fileName, file)
    if (error) throw error
    uploadedFileUrl.value = data.path
  } catch (err) {
    alert('檔案上傳失敗：' + err.message)
  }
}

// ========== 3. 提交修訂邏輯 (含彈窗與前端扣點) ==========

// 第一步：驗證並開啟確認彈窗
const requestRevision = () => {
  errorMessage.value = ''
  
  // 基礎驗證
  if (revisionMode.value === 'text' && !revisionInstructions.value.trim()) {
    alert('請輸入修改指令')
    return
  }
  if (revisionMode.value === 'file' && !uploadedFileUrl.value) {
    alert('請先上傳 Word 檔案')
    return
  }
  
  // 餘額驗證 (第一道防線)
  const currentBalance = userStore.profile?.credits_balance || 0
  if (currentBalance < REVISION_COST) {
    alert(`點數不足！本次修訂需要 ${REVISION_COST} 點，您目前只有 ${currentBalance} 點。`)
    return
  }

  // 開啟確認彈窗
  showConfirmModal.value = true
}

// 第二步：使用者確認後執行 (扣點 + 呼叫 AI)
const submitRevision = async () => {
  // 關閉彈窗
  showConfirmModal.value = false
  isRevising.value = true
  let transactionId = null
  
  try {
    const { data: { session } } = await supabase.auth.getSession()
    
    // A. 預扣款 (Reserve)
    console.log('💰 執行修訂預扣款...')
    const { data: reserveResult, error: reserveError } = await supabase
      .rpc('reserve_credits', {
        p_user_id: session.user.id,
        p_credits: REVISION_COST,
        p_action_type: 'PATENT_REVISION',
        p_description: `專利修訂 (v${(versions.value[0]?.version || 1) + 1})`,
        p_model_name: props.modelName,
        p_job_id: props.jobId
      })

    if (reserveError || !reserveResult.success) {
      throw new Error(reserveResult?.error || reserveError?.message || '扣款失敗')
    }
    
    transactionId = reserveResult.transaction_id
    
    // B. 呼叫 n8n
    console.log('🔄 呼叫 AI 修訂...')
    const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_PHASE4_URL
    if (!webhookUrl) throw new Error('未設定 VITE_N8N_WEBHOOK_PHASE4_URL')

    // 判斷修訂類型
    let revisionType = 'user_revision'
    if (revisionMode.value === 'text' && revisionInstructions.value.includes('QC 檢查建議')) {
      revisionType = 'ai_revision'
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job_id: props.jobId,
        user_id: session.user.id,
        transaction_id: transactionId,
        instructions: revisionMode.value === 'text' ? revisionInstructions.value : null,
        file_url: revisionMode.value === 'file' ? uploadedFileUrl.value : null,
        model_name: props.modelName,
        revision_type: revisionType
      })
    })
    
    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`修訂請求失敗: ${errText}`)
    }
    
    const data = await response.json()
    
    // C. 確認扣款 (Confirm)
    console.log('✅ AI 成功回應，確認扣款...')
    await supabase.rpc('confirm_deduction', { p_transaction_id: transactionId })
    
    // D. 完成更新 UI
    revisionResult.value = data
    await loadVersionHistory()
    emit('revision-complete', data)
    
    revisionInstructions.value = ''
    uploadedFile.value = null
    uploadedFileUrl.value = ''
    
    // 更新餘額顯示
    await userStore.fetchUser()
    
  } catch (err) {
    console.error('❌ 修訂失敗:', err)
    errorMessage.value = err.message
    
    // E. 失敗退款 (Refund)
    if (transactionId) {
      await supabase.rpc('refund_credits', {
        p_transaction_id: transactionId,
        p_reason: 'System Error: ' + err.message
      })
      alert('修訂失敗，點數已自動退回。')
    } else {
      alert('修訂失敗：' + err.message)
    }
  } finally {
    isRevising.value = false
  }
}

// ========== 其他功能 ==========
const viewVersion = (version) => { alert(`版本 ${version.version}\n\n${version.changes_summary || '無摘要'}`) }
const restoreVersion = (version) => { alert('還原功能開發中...') }

const canSubmit = computed(() => {
  if (isRevising.value) return false
  if (revisionMode.value === 'text') return revisionInstructions.value.trim().length > 0
  if (revisionMode.value === 'file') return uploadedFileUrl.value.length > 0
  return false
})
</script>

<template>
  <div class="revision-panel">
    <h3>📝 智慧修訂</h3>
    
    <div class="mode-selector">
      <button 
        @click="revisionMode = 'text'" 
        :class="{ active: revisionMode === 'text' }"
        class="mode-btn"
      >
        💬 文字指令
      </button>
      <button 
        @click="revisionMode = 'file'" 
        :class="{ active: revisionMode === 'file' }"
        class="mode-btn"
      >
        📄 上傳 Word
      </button>
    </div>
    
    <div v-if="revisionMode === 'text'" class="text-mode">
      <div class="input-header">
        <label>修改指令</label>
        <button 
          v-if="hasQCSuggestions" 
          @click="prefillQCSuggestions" 
          class="btn-text-action"
          title="將 QC 檢查出的問題自動轉為修改指令"
        >
          📋 帶入 QC 建議
        </button>
      </div>
      
      <textarea 
        v-model="revisionInstructions"
        placeholder="請輸入您的修改指示，或點擊上方按鈕帶入 QC 建議..."
        rows="10"
        :disabled="isRevising"
      ></textarea>
      
      <div v-if="hasQCSuggestions && !revisionInstructions" class="suggestion-hint">
        💡 系統偵測到有 QC 檢查報告，您可以點擊上方按鈕快速帶入建議。
      </div>
      
      <div class="examples">
        <p><strong>範例指令：</strong></p>
        <ul>
          <li>請加強【先前技術】的說明，增加 2-3 個現有技術的案例</li>
          <li>請將【實施方式】的第 3-5 段改寫得更詳細</li>
          <li>請在【發明內容】中補充更多技術特徵</li>
          <li>請調整【摘要】，使其更簡潔明瞭</li>
        </ul>
      </div>
    </div>
    
    <div v-if="revisionMode === 'file'" class="file-mode">
      <label>上傳修改後的 Word 檔案</label>
      <input 
        type="file" 
        accept=".docx"
        @change="handleFileUpload"
        :disabled="isRevising"
      />
      
      <div v-if="uploadedFile" class="file-info">
        <p>✅ 已上傳：{{ uploadedFile.name }}</p>
      </div>
      
      <div class="instructions">
        <p><strong>使用說明：</strong></p>
        <ol>
          <li>先下載當前版本的 Word 檔案</li>
          <li>在 Word 中進行修改</li>
          <li>上傳修改後的檔案</li>
          <li>系統會自動比對並智慧合併</li>
        </ol>
      </div>
    </div>
    
    <div class="actions">
      <button 
        @click="requestRevision" 
        :disabled="!canSubmit" 
        class="btn-submit"
      >
        <span v-if="!isRevising">🚀 開始修訂 ({{ REVISION_COST }} 點)</span>
        <span v-else>⏳ 修訂中...</span>
      </button>
    </div>
    
    <div v-if="errorMessage" class="error-message">
      {{ errorMessage }}
    </div>
    
    <div v-if="revisionResult" class="revision-result">
      <h4>✅ 修訂完成</h4>
      <div class="result-info">
        <p><strong>版本：</strong>v{{ revisionResult.version }}</p>
        <p><strong>修改摘要：</strong></p>
        <pre>{{ revisionResult.changes_summary }}</pre>
      </div>
    </div>
    
    <div class="version-history">
      <h4>📚 版本歷史</h4>
      
      <div v-if="isLoadingVersions" class="loading">
        載入中...
      </div>
      
      <div v-else-if="versions.length === 0" class="no-versions">
        尚無版本記錄
      </div>
      
      <div v-else class="version-list">
        <div 
          v-for="version in versions" 
          :key="version.id" 
          class="version-item"
        >
          <div class="version-header">
            <span class="version-number">v{{ version.version }}</span>
            <span class="version-type">{{ getRevisionTypeText(version.revision_type) }}</span>
            <span class="version-date">{{ formatDate(version.created_at) }}</span>
          </div>
          
          <p class="version-summary">{{ version.changes_summary || '無摘要' }}</p>
          
          <div class="version-actions">
            <button @click="viewVersion(version)" class="btn-view">查看</button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showConfirmModal" class="modal-overlay">
      <div class="modal-content">
        <div class="modal-header">
          <h3>💰 確認扣點</h3>
        </div>
        <div class="modal-body">
          <p class="confirm-text">本次修訂將執行以下操作：</p>
          <div class="cost-summary">
            <div class="cost-item">
              <span>本次費用：</span>
              <span class="cost-value highlight">-{{ REVISION_COST }} 點</span>
            </div>
            <div class="cost-item">
              <span>目前餘額：</span>
              <span class="cost-value">{{ userStore.profile?.credits_balance || 0 }} 點</span>
            </div>
            <div class="cost-divider"></div>
            <div class="cost-item total">
              <span>扣除後餘額：</span>
              <span class="cost-value" :class="{'warning': (userStore.profile?.credits_balance || 0) - REVISION_COST < 0}">
                {{ (userStore.profile?.credits_balance || 0) - REVISION_COST }} 點
              </span>
            </div>
          </div>
          <p class="modal-note">⚠️ 點數一經扣除，若非系統錯誤恕不退還。</p>
        </div>
        <div class="modal-footer">
          <button @click="showConfirmModal = false" class="btn-cancel">取消</button>
          <button @click="submitRevision" class="btn-confirm">確認並開始</button>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
/* 主要面板樣式 */
.revision-panel {
  background: white;
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.revision-panel h3 {
  margin: 0 0 24px 0;
  font-size: 24px;
  color: #1a1a1a;
}

/* 模式選擇 */
.mode-selector {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.mode-btn {
  flex: 1;
  padding: 16px;
  background: #f5f5f5;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.mode-btn:hover {
  background: #e8e8e8;
}

.mode-btn.active {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border-color: #667eea;
}

/* 文字模式 */
.input-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.text-mode label,
.file-mode label {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.btn-text-action {
  background-color: #e3f2fd;
  color: #1976d2;
  border: 1px solid #bbdefb;
  padding: 6px 16px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 0.9em;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-text-action:hover {
  background-color: #bbdefb;
  transform: translateY(-1px);
}

.suggestion-hint {
  background-color: #fff3e0;
  color: #e65100;
  padding: 12px;
  border-radius: 8px;
  margin-top: 12px;
  font-size: 0.95em;
  border: 1px solid #ffe0b2;
}

.text-mode textarea {
  width: 100%;
  padding: 16px;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  font-size: 15px;
  line-height: 1.6;
  resize: vertical;
  font-family: inherit;
}

.text-mode textarea:focus {
  outline: none;
  border-color: #667eea;
}

.examples {
  margin-top: 20px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 12px;
  border: 1px solid #eee;
}

.examples p {
  margin: 0 0 12px 0;
  font-weight: 600;
}

.examples ul {
  margin: 0;
  padding-left: 20px;
}

.examples li {
  margin-bottom: 8px;
  color: #666;
  line-height: 1.6;
}

/* 檔案模式 */
.file-mode input[type="file"] {
  width: 100%;
  padding: 16px;
  border: 2px dashed #e0e0e0;
  border-radius: 12px;
  cursor: pointer;
  margin-top: 8px;
}

.file-info {
  margin-top: 12px;
  padding: 12px;
  background: #e8f5e9;
  border-radius: 8px;
  color: #2e7d32;
  font-weight: 500;
}

.instructions {
  margin-top: 20px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 12px;
}

.instructions p {
  margin: 0 0 12px 0;
  font-weight: 600;
}

.instructions ol {
  margin: 0;
  padding-left: 20px;
}

.instructions li {
  margin-bottom: 8px;
  color: #666;
  line-height: 1.6;
}

/* 按鈕區 */
.actions {
  margin-top: 32px;
}

.btn-submit {
  width: 100%;
  padding: 16px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-submit:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.3);
}

.btn-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: #ccc;
}

/* 錯誤訊息 */
.error-message {
  margin-top: 16px;
  padding: 16px;
  background: #ffebee;
  border-left: 4px solid #f44336;
  border-radius: 8px;
  color: #c62828;
}

/* 修訂結果 */
.revision-result {
  margin-top: 24px;
  padding: 24px;
  background: #e8f5e9;
  border-radius: 12px;
  border: 1px solid #c8e6c9;
}

.revision-result h4 {
  margin: 0 0 16px 0;
  color: #2e7d32;
}

.result-info p {
  margin: 8px 0;
}

.result-info pre {
  margin: 12px 0 0 0;
  padding: 16px;
  background: white;
  border-radius: 8px;
  white-space: pre-wrap;
  font-size: 14px;
  line-height: 1.6;
  border: 1px solid #e0e0e0;
}

/* 版本歷史 */
.version-history {
  margin-top: 40px;
  padding-top: 32px;
  border-top: 2px solid #e0e0e0;
}

.version-history h4 {
  margin: 0 0 20px 0;
  font-size: 20px;
  color: #333;
}

.loading,
.no-versions {
  text-align: center;
  padding: 40px;
  color: #999;
  font-style: italic;
}

.version-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.version-item {
  padding: 20px;
  background: #f8f9fa;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  transition: all 0.3s;
}

.version-item:hover {
  border-color: #667eea;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.version-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.version-number {
  padding: 4px 12px;
  background: #667eea;
  color: white;
  border-radius: 12px;
  font-weight: 600;
  font-size: 14px;
}

.version-type {
  padding: 4px 12px;
  background: #e0e0e0;
  border-radius: 12px;
  font-size: 13px;
  color: #666;
}

.version-date {
  margin-left: auto;
  font-size: 13px;
  color: #999;
}

.version-summary {
  margin: 0 0 16px 0;
  color: #555;
  line-height: 1.6;
}

.version-actions {
  display: flex;
  gap: 8px;
}

.btn-view,
.btn-restore {
  padding: 8px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
  background: white;
}

.btn-view { color: #667eea; }
.btn-view:hover { background: #667eea; color: white; border-color: #667eea; }

.btn-restore { color: #ff9800; }
.btn-restore:hover { background: #ff9800; color: white; border-color: #ff9800; }

/* ✅ 彈窗樣式 (Modal) */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal-content {
  background: white;
  padding: 0;
  border-radius: 16px;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  animation: slideIn 0.2s ease-out;
  overflow: hidden;
}

@keyframes slideIn {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid #eee;
  background: #f8f9fa;
}

.modal-header h3 {
  margin: 0;
  color: #333;
  font-size: 1.25rem;
}

.modal-body {
  padding: 24px;
}

.confirm-text {
  font-size: 16px;
  color: #333;
  margin-bottom: 16px;
}

.cost-summary {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 12px;
  margin: 16px 0;
}

.cost-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
  color: #666;
  font-size: 15px;
}

.cost-value {
  font-weight: 600;
  color: #333;
}

.cost-value.highlight {
  color: #e53935;
}

.cost-divider {
  height: 1px;
  background: #e0e0e0;
  margin: 12px 0;
}

.cost-item.total {
  margin-top: 12px;
  margin-bottom: 0;
  font-size: 1.1em;
  color: #333;
}

.cost-value.warning {
  color: #d32f2f;
}

.modal-note {
  font-size: 0.85em;
  color: #999;
  margin-top: 16px;
  text-align: center;
}

.modal-footer {
  display: flex;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid #eee;
  background: #f8f9fa;
}

.btn-cancel {
  flex: 1;
  padding: 12px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  color: #666;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-cancel:hover {
  background: #f5f5f5;
}

.btn-confirm {
  flex: 1;
  padding: 12px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-confirm:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}
</style>
