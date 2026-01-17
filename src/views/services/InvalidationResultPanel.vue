<!-- src/views/services/InvalidationResultPanel.vue -->
<template>
  <div class="result-panel max-w-5xl mx-auto">
    
    <!-- 分析摘要 -->
    <div class="bg-blue-50 p-6 rounded-lg mb-6 border-l-4 border-blue-500 shadow-sm">
      <h3 class="text-lg font-bold text-blue-800 mb-2">📊 舉發分析摘要</h3>
      <div class="space-y-2">
        <p class="text-gray-700 leading-relaxed">
          {{ resultData.conclusion?.key_arguments?.join('、') || '分析完成' }}
        </p>
        <div class="flex items-center gap-4 mt-4">
          <div class="success-probability">
            <span class="text-sm text-gray-600">舉發成功機率：</span>
            <span class="text-2xl font-bold text-green-600">
              {{ ((resultData.conclusion?.success_probability || 0) * 100).toFixed(0) }}%
            </span>
          </div>
          <div class="inventive-step-status">
            <span class="text-sm text-gray-600">進步性判斷：</span>
            <span 
              class="px-3 py-1 rounded-full text-sm font-bold"
              :class="resultData.inventive_step_analysis?.inventive_step_conclusion?.has_inventive_step 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'"
            >
              {{ resultData.inventive_step_analysis?.inventive_step_conclusion?.has_inventive_step 
                ? '✅ 具備進步性' 
                : '❌ 不具進步性' }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Tab 切換 -->
    <div class="bg-white rounded-lg shadow overflow-hidden relative">
      
      <!-- Loading 遮罩 -->
      <div v-if="isRegenerating" class="absolute inset-0 bg-white/80 z-50 flex flex-col items-center justify-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p class="text-blue-600 font-bold">AI 正在根據您的修正，重新撰寫舉發理由書...</p>
      </div>

      <div class="flex border-b">
        <button 
          class="flex-1 py-4 text-center font-bold transition-colors border-b-2"
          :class="activeTab === 'comparison' ? 'text-blue-600 border-blue-600 bg-blue-50' : 'text-gray-500 border-transparent hover:bg-gray-50'"
          @click="activeTab = 'comparison'"
        >
          📊 技術特徵比對表 (可編輯)
        </button>
        <button 
          class="flex-1 py-4 text-center font-bold transition-colors border-b-2"
          :class="activeTab === 'brief' ? 'text-blue-600 border-blue-600 bg-blue-50' : 'text-gray-500 border-transparent hover:bg-gray-50'"
          @click="activeTab = 'brief'"
        >
          📝 舉發理由書
        </button>
      </div>

      <div class="p-8 min-h-[500px]">
        
        <!-- Tab 1: 技術特徵比對表 -->
        <div v-show="activeTab === 'comparison'">
          <div class="mb-4 flex justify-between items-center">
            <div class="text-sm text-gray-500">
              您可以直接修改下方的比對表。修改完成後，請點擊「重新生成理由書」。
            </div>
            <button 
              class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition flex items-center gap-2 shadow-sm"
              @click="handleRegenerate"
              :disabled="!isModified"
            >
              <span>🔄</span> 根據修正重新撰寫理由書
            </button>
          </div>

          <!-- 比對表編輯器 -->
          <ComparisonTableEditor 
            v-model="editableComparisonTable"
            @input="isModified = true"
          />
        </div>

        <!-- Tab 2: 舉發理由書 -->
        <div v-show="activeTab === 'brief'">
          <div class="flex justify-between items-center mb-6 border-b pb-4">
            <h3 class="text-2xl font-bold">{{ localBriefTitle }}</h3>
            <span class="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded">Markdown 預覽</span>
          </div>
          
          <div class="markdown-body prose max-w-none">
            <pre class="whitespace-pre-wrap font-sans text-gray-800 leading-relaxed">{{ localBriefContent }}</pre>
          </div>
        </div>

      </div>

      <!-- 底部操作列 -->
      <div class="bg-gray-50 p-4 border-t flex justify-between items-center">
        <div class="text-sm text-gray-500">
          <span v-if="isModified" class="text-orange-500">⚠️ 比對表已變更，建議重新生成理由書</span>
          <span v-else class="text-green-600">✅ 內容已同步</span>
        </div>
        <button 
          class="px-6 py-2 rounded bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 transition flex items-center gap-2 shadow-sm"
          @click="handleDownload"
          :disabled="isGenerating || isRegenerating"
        >
          <span v-if="isGenerating">⏳ 打包中...</span>
          <span v-else>📥 下載 Word 舉發理由書</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../../supabase'
import { usePatentDocx } from '../../composables/usePatentDocx'
import ComparisonTableEditor from '../../components/ComparisonTableEditor.vue'

const props = defineProps({
  resultData: { type: Object, required: true },
  jobId: String
})

const activeTab = ref('comparison')
const { generateDefenseDocs, isGenerating } = usePatentDocx()

// 本地狀態
const editableComparisonTable = ref([])
const localBriefContent = ref('')
const localBriefTitle = ref('專利舉發理由書')
const isModified = ref(false)
const isRegenerating = ref(false)
const userModificationIntent = ref('')

// 初始化資料
onMounted(() => {
  console.log('📊 InvalidationResultPanel mounted')
  console.log('Result Data:', props.resultData)
  
  // 初始化比對表
  if (props.resultData.feature_comparisons && props.resultData.feature_comparisons.length > 0) {
    const firstComparison = props.resultData.feature_comparisons[0]
    editableComparisonTable.value = firstComparison.comparison?.comparison_table || []
    console.log('✅ 比對表初始化成功:', editableComparisonTable.value.length, '筆')
  } else {
    console.warn('⚠️ 沒有比對表資料')
  }
  
  // 初始化理由書
  localBriefContent.value = props.resultData.invalidation_brief || ''
  console.log('✅ 理由書初始化成功，長度:', localBriefContent.value.length)
})

// 重新生成理由書
const handleRegenerate = async () => {
  if (!confirm('確定要根據目前的比對表，要求 AI 重寫理由書嗎？')) return

  isRegenerating.value = true
  const startTime = Date.now()
  
  try {
    console.log('🔄 開始重新生成理由書...')
    
    // 1. 取得最新版本號
    const { data: latestVersion, error: versionError } = await supabase
      .from('invalidation_modifications')
      .select('version')
      .eq('job_id', props.jobId)
      .order('version', { ascending: false })
      .limit(1)
      .single()
    
    if (versionError && versionError.code !== 'PGRST116') {
      console.error('❌ 查詢版本號失敗:', versionError)
    }
    
    const nextVersion = latestVersion ? latestVersion.version + 1 : 1
    console.log('📌 下一個版本號:', nextVersion)

    // 2. 呼叫 n8n Webhook
    const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_INVALIDATION_REGENERATE_URL
    console.log('📡 Webhook URL:', webhookUrl)
    
    const payload = {
      job_id: props.jobId,
      version: nextVersion,
      target_patent_number: props.resultData.target_patent_number || props.resultData.target_analysis?.patent_info?.patent_number,
      target_analysis: props.resultData.target_analysis,
      evidence_analyses: props.resultData.evidence_analyses,
      original_comparison_table: props.resultData.feature_comparisons[0]?.comparison?.comparison_table,
      modified_comparison_table: editableComparisonTable.value,
      original_combination_analysis: props.resultData.combination_analysis,
      original_inventive_step_analysis: props.resultData.inventive_step_analysis,
      user_modification_intent: userModificationIntent.value,
      user_id: (await supabase.auth.getUser()).data.user?.id,
      time_spent_seconds: Math.floor((Date.now() - startTime) / 1000)
    }
    
    console.log('📦 發送資料:', {
      job_id: payload.job_id,
      version: payload.version,
      modified_rows: payload.modified_comparison_table.length
    })

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    console.log('📡 Webhook 回應狀態:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Webhook 回應錯誤:', errorText)
      throw new Error(`AI 回應錯誤: ${response.status}`)
    }
    
    const data = await response.json()
    console.log('✅ Webhook 回應成功:', data)
    
    if (data.success && data.new_argument) {
      // 3. 更新前端顯示
      localBriefContent.value = data.new_argument
      console.log('✅ 理由書已更新，長度:', localBriefContent.value.length)
      
      // 4. 更新資料庫
      const { error: updateError } = await supabase.from('saas_jobs')
        .update({ 
          latest_invalidation_modification_version: nextVersion,
          updated_at: new Date().toISOString()
        })
        .eq('id', props.jobId)
      
      if (updateError) {
        console.error('❌ 更新 saas_jobs 失敗:', updateError)
      } else {
        console.log('✅ saas_jobs 已更新')
      }
        
      isModified.value = false
      activeTab.value = 'brief'
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

// 下載 Word
const handleDownload = async () => {
  console.log('📥 開始下載舉發理由書...')
  
  try {
    await generateDefenseDocs({
      fileName: '專利舉發理由書',
      title: localBriefTitle.value,
      content: localBriefContent.value,
      metaInfo: {
        '系爭專利號': props.resultData.target_patent_number || '待補',
        '舉發成功機率': `${((props.resultData.conclusion?.success_probability || 0) * 100).toFixed(0)}%`
      }
    })
    
    console.log('✅ 下載完成')
  } catch (e) {
    console.error('❌ 下載失敗:', e)
    alert('下載失敗：' + e.message)
  }
}
</script>

<style scoped>
.result-panel {
  padding: 2rem 0;
}

.success-probability {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.inventive-step-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.markdown-body pre {
  background: transparent;
  border: none;
  padding: 0;
  margin: 0;
  font-family: inherit;
}
</style>

