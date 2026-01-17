<!-- src/views/services/DefenseResultPanel.vue -->
<template>
  <div class="result-panel max-w-5xl mx-auto">
    
    <div class="bg-blue-50 p-6 rounded-lg mb-6 border-l-4 border-blue-500 shadow-sm">
      <h3 class="text-lg font-bold text-blue-800 mb-2">📊 AI 分析摘要</h3>
      <p class="text-gray-700 leading-relaxed">{{ resultData.analysis_summary }}</p>
    </div>

    <div class="bg-white rounded-lg shadow overflow-hidden relative">
      <div v-if="isRegenerating" class="absolute inset-0 bg-white/80 z-50 flex flex-col items-center justify-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p class="text-blue-600 font-bold">AI 正在根據您的修正，重新撰寫理由書...</p>
      </div>

      <div class="flex border-b">
        <button 
          class="flex-1 py-4 text-center font-bold transition-colors border-b-2"
          :class="activeTab === 'amendments' ? 'text-blue-600 border-blue-600 bg-blue-50' : 'text-gray-500 border-transparent hover:bg-gray-50'"
          @click="activeTab = 'amendments'"
        >
          📝 請求項修正 (可編輯)
        </button>
        <button 
          class="flex-1 py-4 text-center font-bold transition-colors border-b-2"
          :class="activeTab === 'argument' ? 'text-blue-600 border-blue-600 bg-blue-50' : 'text-gray-500 border-transparent hover:bg-gray-50'"
          @click="activeTab = 'argument'"
        >
          ⚖️ 申復理由書
        </button>
      </div>

      <div class="p-8 min-h-[500px]">
        
        <div v-show="activeTab === 'amendments'">
          <div class="mb-4 flex justify-between items-center">
            <div class="text-sm text-gray-500">
              您可以直接修改下方的請求項內容。修改完成後，請點擊「重新生成理由書」。
            </div>
            <button 
              class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition flex items-center gap-2 shadow-sm"
              @click="handleRegenerate"
              :disabled="!isModified"
            >
              <span>🔄</span> 根據修正重新撰寫理由書
            </button>
          </div>

          <div class="relative">
            <textarea 
              v-model="editableAmendments" 
              class="w-full h-[600px] p-6 border rounded-lg font-mono text-sm leading-relaxed focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50"
              @input="isModified = true"
            ></textarea>
            <div class="absolute top-2 right-2 text-xs text-gray-400 bg-white px-2 py-1 rounded border">Markdown 編輯模式</div>
          </div>
        </div>

        <div v-show="activeTab === 'argument'">
          <div class="flex justify-between items-center mb-6 border-b pb-4">
            <h3 class="text-2xl font-bold">{{ localArgumentTitle }}</h3>
            <span class="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded">Markdown 預覽</span>
          </div>
          
          <div class="markdown-body prose max-w-none">
            <pre class="whitespace-pre-wrap font-sans text-gray-800 leading-relaxed">{{ localArgumentContent }}</pre>
          </div>
        </div>

      </div>

      <div class="bg-gray-50 p-4 border-t flex justify-between items-center">
        <div class="text-sm text-gray-500">
          <span v-if="isModified" class="text-orange-500">⚠️ 修正內容已變更，建議重新生成理由書</span>
          <span v-else class="text-green-600">✅ 內容已同步</span>
        </div>
        <button 
          class="px-6 py-2 rounded bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 transition flex items-center gap-2 shadow-sm"
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
import { ref, watch, onMounted } from 'vue'
import { usePatentDocx } from '../../composables/usePatentDocx'
import { supabase } from '../../supabase' // 用於更新 DB

const props = defineProps({
  resultData: { type: Object, required: true },
  jobId: String
})

const activeTab = ref('amendments') // 預設先讓使用者看修正
const { generateDefenseDocs, isGenerating } = usePatentDocx()

// 本地狀態 (用於編輯)
const editableAmendments = ref('')
const localArgumentContent = ref('')
const localArgumentTitle = ref('')
const isModified = ref(false)
const isRegenerating = ref(false)

// 初始化資料
onMounted(() => {
  editableAmendments.value = props.resultData.amendments?.amended_claims_markdown || ''
  localArgumentContent.value = props.resultData.argument?.content_markdown || ''
  localArgumentTitle.value = props.resultData.argument?.title || '專利申復理由書'
})

// 重新生成邏輯 (HITL 核心)
const handleRegenerate = async () => {
  if (!confirm('確定要根據目前的修正內容，要求 AI 重寫理由書嗎？')) return

  isRegenerating.value = true
  const startTime = Date.now()
  
  try {
    const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_DEFENSE_REGENERATE_URL
    if (!webhookUrl) throw new Error('Webhook URL 未設定')

    // 🆕 先取得當前的最新版本號
    const { data: latestVersion } = await supabase
      .from('defense_modifications')
      .select('version')
      .eq('job_id', props.jobId)
      .order('version', { ascending: false })
      .limit(1)
      .single()
    
    const nextVersion = (latestVersion?.version || 0) + 1

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job_id: props.jobId,
        version: nextVersion,  // 🆕 傳送版本號
        patent_number: props.resultData.application_number,
        invention_title: props.resultData.invention_title,
        
        // 完整的上下文（從 result_data 取得）
        analysis_summary: props.resultData.analysis_summary,
        citation_analyses: props.resultData.citation_analyses,
        first_layer_analyses: props.resultData.first_layer_analyses,
        second_layer_analysis: props.resultData.second_layer_analysis,
        oa_analysis: props.resultData.oa_analysis,
        spec_analysis: props.resultData.spec_analysis,
        
        // 使用者的修改
        original_claims: props.resultData.amendments.original_claims_markdown,
        new_amended_claims: editableAmendments.value,
        user_modification_intent: userModificationIntent.value,
        
        // 追蹤資訊
        user_id: (await supabase.auth.getUser()).data.user?.id,
        time_spent_seconds: Math.floor((Date.now() - startTime) / 1000)
      })
    })

    if (!response.ok) throw new Error('AI 回應錯誤')
    
    const data = await response.json()
    if (data.success && data.new_argument) {
      // 更新前端顯示
      localArgumentContent.value = data.new_argument
      
      // 🆕 不更新 result_data，只更新最新版本的指標
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
    console.error('重新生成失敗:', e)
    alert('❌ 重新生成失敗: ' + e.message)
  } finally {
    isRegenerating.value = false
  }
}

// 下載邏輯 (使用本地更新後的資料)
const handleDownload = async () => {
  // 1. 下載修正稿
  if (editableAmendments.value) {
    await generateDefenseDocs({
      fileName: '修正申請專利範圍(畫線稿)',
      title: '修正後申請專利範圍 (對照版)',
      content: editableAmendments.value,
      metaInfo: {
        '案號': props.resultData.patent_number || '待補',
        '說明': '藍色底線為新增內容，灰色刪除線為刪除內容'
      }
    })
  }

  // 2. 下載理由書 (延遲)
  if (localArgumentContent.value) {
    setTimeout(async () => {
      await generateDefenseDocs({
        fileName: '專利申復理由書',
        title: localArgumentTitle.value,
        content: localArgumentContent.value,
        metaInfo: { '案號': props.resultData.patent_number || '待補' }
      })
    }, 1500)
  }
}
</script>

<style scoped>
.result-panel { background: #fff; border-radius: 8px; overflow: hidden; }
.summary-box { padding: 20px; background: #f8f9fa; border-bottom: 1px solid #eee; }
.summary-text { font-size: 1.1em; color: #333; margin: 10px 0; }
.strategy-tag { display: inline-block; background: #e3f2fd; color: #1976d2; padding: 4px 8px; border-radius: 4px; font-size: 0.85em; }

.tabs { display: flex; border-bottom: 1px solid #ddd; background: #f1f1f1; }
.tabs button { flex: 1; padding: 15px; border: none; background: none; cursor: pointer; font-size: 1em; color: #666; }
.tabs button.active { background: #fff; border-bottom: 3px solid #2196F3; color: #2196F3; font-weight: bold; }

.content-area { padding: 20px; min-height: 400px; }
.info-box { background: #fff3e0; padding: 10px; border-radius: 4px; margin-bottom: 15px; border-left: 4px solid #ff9800; }
.info-box.warning { background: #e8f5e9; border-left-color: #4caf50; }

.markdown-viewer pre { 
  white-space: pre-wrap; 
  font-family: 'Consolas', 'Monaco', monospace; 
  background: #2d2d2d; 
  color: #e0e0e0; 
  padding: 15px; 
  border-radius: 6px; 
  line-height: 1.6;
}

.panel-footer { padding: 20px; border-top: 1px solid #eee; display: flex; justify-content: flex-end; gap: 10px; }
.btn-secondary { padding: 10px 20px; background: #fff; border: 1px solid #ccc; border-radius: 4px; cursor: pointer; }
.btn-primary { padding: 10px 20px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer; }
</style>