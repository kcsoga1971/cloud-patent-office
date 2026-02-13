<!-- src/views/services/DefenseResultPanel.vue -->
<template>
  <div class="result-panel">
    
    <!-- AI 分析摘要 -->
    <div class="summary-section">
      <h3 class="summary-title">📊 AI 分析摘要</h3>
      <p class="summary-text">{{ getSummary() }}</p>
    </div>

    <!-- 主內容區 -->
    <div class="content-container">
      <!-- 載入遮罩 -->
      <div v-if="isRegenerating" class="loading-overlay">
        <div class="spinner"></div>
        <p class="loading-text">AI 正在根據您的修正，重新撰寫理由書...</p>
      </div>

      <!-- Tab 切換 -->
      <div class="tabs">
        <button 
          class="tab-button"
          :class="{ active: activeTab === 'amendments' }"
          @click="activeTab = 'amendments'"
        >
          📝 請求項修正 (可編輯)
        </button>
        <button 
          class="tab-button"
          :class="{ active: activeTab === 'argument' }"
          @click="activeTab = 'argument'"
        >
          ⚖️ 申復理由書
        </button>
      </div>

      <!-- Tab 內容 -->
      <div class="tab-content">
        
        <!-- 請求項修正 -->
        <div v-show="activeTab === 'amendments'" class="amendments-panel">
          <div class="panel-header">
            <div class="hint-text">
              您可以直接修改下方的請求項內容。修改完成後，請點擊「重新生成理由書」。
            </div>
            <button 
              class="btn-regenerate"
              :class="{ disabled: !isModified }"
              @click="handleRegenerate"
              :disabled="!isModified"
            >
              <span class="btn-icon">🔄</span>
              <span class="btn-text">根據修正重新撰寫理由書</span>
            </button>
          </div>

          <div class="editor-container">
            <textarea 
              v-model="editableAmendments" 
              class="markdown-editor"
              @input="isModified = true"
              placeholder="請輸入修正後的請求項內容..."
            ></textarea>
            <div class="editor-badge">Markdown 編輯模式</div>
          </div>
        </div>

        <!-- 申復理由書 -->
        <div v-show="activeTab === 'argument'" class="argument-panel">
          <div class="argument-header">
            <h3 class="argument-title">{{ localArgumentTitle }}</h3>
            <span class="preview-badge">Markdown 預覽</span>
          </div>
          
          <div class="markdown-preview">
            <pre class="markdown-content">{{ localArgumentContent }}</pre>
          </div>
        </div>

      </div>

      <!-- 底部操作區 -->
      <div class="panel-footer">
        <div class="status-text">
          <span v-if="isModified" class="status-warning">
            ⚠️ 修正內容已變更，建議重新生成理由書
          </span>
          <span v-else class="status-success">
            ✅ 內容已同步
          </span>
        </div>
        <button 
          class="btn-download"
          @click="handleDownload"
          :disabled="isGenerating || isRegenerating"
        >
          <span v-if="isGenerating">⏳ 打包中...</span>
          <span v-else>📥 下載 Word 定稿</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { usePatentDocx } from '../../composables/usePatentDocx'
import { supabase } from '../../supabase'

const props = defineProps({
  resultData: { type: Object, required: true },
  jobId: String
})

const activeTab = ref('amendments')
const { generateDefenseDocs, isGenerating } = usePatentDocx()

// 本地狀態
const editableAmendments = ref('')
const localArgumentContent = ref('')
const localArgumentTitle = ref('專利申復理由書')
const isModified = ref(false)
const isRegenerating = ref(false)

// 🆕 取得摘要（相容多種資料結構）
const getSummary = () => {
  if (props.resultData.analysis_summary) {
    return props.resultData.analysis_summary
  }
  if (props.resultData.oa_analysis?.overall_conclusion) {
    return props.resultData.oa_analysis.overall_conclusion
  }
  return '審查意見分析完成，請查看詳細內容。'
}

// 🆕 初始化資料（相容多種資料結構）
onMounted(() => {
  console.log('📊 DefenseResultPanel mounted')
  console.log('📦 resultData:', props.resultData)
  
  // 嘗試從多個可能的位置取得資料
  if (props.resultData.amendments?.amended_claims_markdown) {
    editableAmendments.value = props.resultData.amendments.amended_claims_markdown
  } else if (props.resultData.amended_claims) {
    editableAmendments.value = props.resultData.amended_claims
  } else {
    editableAmendments.value = '# 修正後的請求項\n\n（請在此編輯修正內容）'
  }
  
  if (props.resultData.argument?.content_markdown) {
    localArgumentContent.value = props.resultData.argument.content_markdown
    localArgumentTitle.value = props.resultData.argument.title || '專利申復理由書'
  } else if (props.resultData.defense_argument) {
    localArgumentContent.value = props.resultData.defense_argument
  } else {
    localArgumentContent.value = '申復理由書內容將在此顯示...'
  }
  
  console.log('✅ 資料初始化完成')
})

// 重新生成邏輯
const handleRegenerate = async () => {
  if (!confirm('確定要根據目前的修正內容，要求 AI 重寫理由書嗎？')) return

  isRegenerating.value = true
  const startTime = Date.now()
  
  try {
    const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_DEFENSE_REGENERATE_URL
    if (!webhookUrl) {
      throw new Error('Webhook URL 未設定（環境變數 VITE_N8N_WEBHOOK_DEFENSE_REGENERATE_URL）')
    }

    console.log('🚀 開始重新生成理由書...')
    console.log('📡 Webhook URL:', webhookUrl)

    // 取得當前版本號
    const { data: latestVersion } = await supabase
      .from('defense_modifications')
      .select('version')
      .eq('job_id', props.jobId)
      .order('version', { ascending: false })
      .limit(1)
      .single()
    
    const nextVersion = (latestVersion?.version || 0) + 1
    console.log('📌 版本號:', nextVersion)

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job_id: props.jobId,
        version: nextVersion,
        patent_number: props.resultData.application_number || props.resultData.oa_analysis?.application_number,
        invention_title: props.resultData.invention_name || props.resultData.oa_analysis?.invention_name,
        
        // 完整的上下文
        analysis_summary: getSummary(),
        oa_analysis: props.resultData.oa_analysis,
        spec_analysis: props.resultData.spec_analysis,
        citation_analyses: props.resultData.citation_analyses,
        
        // 使用者的修改
        original_claims: props.resultData.amendments?.original_claims_markdown || '',
        new_amended_claims: editableAmendments.value,
        
        // 追蹤資訊
        user_id: (await supabase.auth.getUser()).data.user?.id,
        time_spent_seconds: Math.floor((Date.now() - startTime) / 1000)
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Webhook 呼叫失敗: ${response.status} - ${errorText}`)
    }
    
    const data = await response.json()
    console.log('✅ Webhook 回應:', data)
    
    if (data.success && data.new_argument) {
      // 更新前端顯示
      localArgumentContent.value = data.new_argument
      
      // 更新資料庫
      await supabase.from('saas_jobs')
        .update({ 
          latest_modification_version: nextVersion,
          updated_at: new Date().toISOString()
        })
        .eq('id', props.jobId)
        
      isModified.value = false
      activeTab.value = 'argument'
      alert(`✅ 理由書已更新（版本 ${nextVersion}）！`)
    } else {
      throw new Error('AI 未回傳有效內容')
    }

  } catch (e) {
    console.error('❌ 重新生成失敗:', e)
    alert('❌ 重新生成失敗: ' + e.message)
  } finally {
    isRegenerating.value = false
  }
}

// 下載邏輯
const handleDownload = async () => {
  console.log('📥 開始下載文件...')
  
  try {
    // 1. 下載修正稿
    if (editableAmendments.value && editableAmendments.value !== '# 修正後的請求項\n\n（請在此編輯修正內容）') {
      console.log('📄 生成修正稿...')
      await generateDefenseDocs({
        fileName: '修正申請專利範圍(畫線稿)',
        title: '修正後申請專利範圍 (對照版)',
        content: editableAmendments.value,
        metaInfo: {
          '案號': props.resultData.application_number || props.resultData.oa_analysis?.application_number || '待補',
          '說明': '藍色底線為新增內容，灰色刪除線為刪除內容'
        }
      })
    }

    // 2. 下載理由書 (延遲)
    if (localArgumentContent.value && localArgumentContent.value !== '申復理由書內容將在此顯示...') {
      console.log('📄 生成理由書...')
      setTimeout(async () => {
        await generateDefenseDocs({
          fileName: '專利申復理由書',
          title: localArgumentTitle.value,
          content: localArgumentContent.value,
          metaInfo: { 
            '案號': props.resultData.application_number || props.resultData.oa_analysis?.application_number || '待補' 
          }
        })
      }, 1500)
    }
    
    console.log('✅ 下載完成')
  } catch (e) {
    console.error('❌ 下載失敗:', e)
    alert('下載失敗: ' + e.message)
  }
}
</script>

<style scoped>
.result-panel {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
}

/* ========== 摘要區 ========== */
.summary-section {
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
  border-left: 4px solid #2196F3;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 32px;
  box-shadow: 0 2px 8px rgba(33, 150, 243, 0.15);
}

.summary-title {
  font-size: 18px;
  font-weight: 700;
  color: #1565c0;
  margin: 0 0 12px 0;
}

.summary-text {
  font-size: 15px;
  color: #424242;
  line-height: 1.6;
  margin: 0;
}

/* ========== 主容器 ========== */
.content-container {
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  position: relative;
}

/* ========== 載入遮罩 ========== */
.loading-overlay {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.95);
  z-index: 50;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #e3f2fd;
  border-top: 4px solid #2196F3;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-text {
  font-size: 16px;
  font-weight: 600;
  color: #2196F3;
}

/* ========== Tab 切換 ========== */
.tabs {
  display: flex;
  border-bottom: 2px solid #e0e0e0;
  background: #fafafa;
}

.tab-button {
  flex: 1;
  padding: 16px;
  border: none;
  background: none;
  font-size: 16px;
  font-weight: 600;
  color: #757575;
  cursor: pointer;
  transition: all 0.3s;
  border-bottom: 3px solid transparent;
}

.tab-button:hover {
  background: #f5f5f5;
  color: #424242;
}

.tab-button.active {
  background: white;
  color: #2196F3;
  border-bottom-color: #2196F3;
}

/* ========== Tab 內容 ========== */
.tab-content {
  min-height: 500px;
}

/* ========== 請求項修正面板 ========== */
.amendments-panel {
  padding: 24px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e0e0e0;
}

.hint-text {
  font-size: 14px;
  color: #757575;
}

.btn-regenerate {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: linear-gradient(135deg, #4caf50 0%, #388e3c 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 2px 8px rgba(76, 175, 80, 0.3);
}

.btn-regenerate:hover:not(.disabled) {
  background: linear-gradient(135deg, #66bb6a 0%, #4caf50 100%);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4);
}

.btn-regenerate.disabled {
  background: #e0e0e0;
  color: #9e9e9e;
  cursor: not-allowed;
  box-shadow: none;
}

.btn-icon {
  font-size: 16px;
}

.btn-text {
  font-size: 14px;
}

/* ========== 編輯器 ========== */
.editor-container {
  position: relative;
}

.markdown-editor {
  width: 100%;
  height: 600px;
  padding: 20px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.6;
  background: #fafafa;
  resize: vertical;
  transition: all 0.3s;
}

.markdown-editor:focus {
  outline: none;
  border-color: #2196F3;
  background: white;
  box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.1);
}

.editor-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  font-size: 12px;
  color: #9e9e9e;
  background: white;
  padding: 4px 12px;
  border-radius: 4px;
  border: 1px solid #e0e0e0;
}

/* ========== 申復理由書面板 ========== */
.argument-panel {
  padding: 24px;
}

.argument-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid #e0e0e0;
}

.argument-title {
  font-size: 24px;
  font-weight: 700;
  color: #212121;
  margin: 0;
}

.preview-badge {
  font-size: 12px;
  color: #757575;
  background: #f5f5f5;
  padding: 6px 12px;
  border-radius: 4px;
}

.markdown-preview {
  background: #fafafa;
  border-radius: 8px;
  padding: 20px;
  border: 1px solid #e0e0e0;
}

.markdown-content {
  white-space: pre-wrap;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 14px;
  line-height: 1.8;
  color: #424242;
  margin: 0;
}

/* ========== 底部操作區 ========== */
.panel-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-top: 2px solid #e0e0e0;
  background: #fafafa;
}

.status-text {
  font-size: 14px;
  font-weight: 600;
}

.status-warning {
  color: #ff9800;
}

.status-success {
  color: #4caf50;
}

.btn-download {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: white;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #424242;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-download:hover:not(:disabled) {
  background: #f5f5f5;
  border-color: #2196F3;
  color: #2196F3;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.btn-download:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ========== 響應式 ========== */
@media (max-width: 768px) {
  .panel-header {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }

  .btn-regenerate {
    width: 100%;
    justify-content: center;
  }

  .panel-footer {
    flex-direction: column;
    gap: 12px;
  }

  .btn-download {
    width: 100%;
    justify-content: center;
  }
}
</style>
