<!-- src/views/services/DefenseResultPanel.vue -->
<template>
  <div class="result-panel">
    <div class="summary-box">
      <h3>📊 AI 分析摘要</h3>
      <p class="summary-text">{{ resultData.analysis_summary }}</p>
      <div class="strategy-tag">
        策略：{{ resultData.strategy_explanation || 'AI 自動判斷' }}
      </div>
    </div>

    <div class="tabs">
      <button 
        :class="{ active: activeTab === 'amendments' }" 
        @click="activeTab = 'amendments'"
      >
        📝 請求項修正
      </button>
      <button 
        :class="{ active: activeTab === 'argument' }" 
        @click="activeTab = 'argument'"
      >
        ⚖️ 申復理由書
      </button>

    <div class="panel-footer">
      <button 
        class="btn-secondary" 
        @click="handleDownload" 
        :disabled="isGenerating"
      >
        <span v-if="isGenerating">📄 生成中...</span>
        <span v-else>📄 下載 Word 定稿 (修正稿 + 理由書)</span>
      </button>
      <button class="btn-primary">✏️ 進入編輯模式</button>
    </div>      

    </div>

    <div class="content-area">
      
      <div v-if="activeTab === 'amendments'" class="tab-content amendments">
        <div class="info-box" v-if="resultData.amendments.needed">
          <strong>💡 修正依據：</strong> {{ resultData.amendments.amendment_basis }}
        </div>
        <div class="info-box warning" v-else>
          AI 建議本次**不需修正**申請專利範圍。
        </div>

        <div class="markdown-viewer">
          <pre>{{ resultData.amendments.amended_claims_markdown }}</pre>
        </div>
      </div>

      <div v-if="activeTab === 'argument'" class="tab-content argument">
        <h3>{{ resultData.argument.title }}</h3>
        <div class="markdown-viewer">
          <pre>{{ resultData.argument.content_markdown }}</pre>
        </div>
      </div>
    </div>

    <div class="panel-footer">
      <button class="btn-secondary" @click="$emit('export')">📄 下載 Word 定稿</button>
      <button class="btn-primary">✏️ 進入編輯模式</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { usePatentDocx } from '../../composables/usePatentDocx'

const props = defineProps({
  resultData: { type: Object, required: true },
  jobId: String
})

const { generateDefenseDocs, isGenerating } = usePatentDocx()

// 處理下載邏輯
const handleDownload = async () => {
  const amendments = props.resultData.amendments?.amended_claims_markdown || ''
  const argument = props.resultData.argument?.content_markdown || ''

  // 1. 下載修正對照表 (畫線稿)
  if (amendments) {
    await generateDefenseDocs({
      fileName: '修正申請專利範圍(畫線稿)',
      title: '修正後申請專利範圍 (對照版)',
      content: amendments,
      metaInfo: {
        '案號': '第 113119534 號 (範例)', // 這裡若有真實資料可傳入
        '說明': '藍色底線為新增內容，灰色刪除線為刪除內容'
      }
    })
  }

  // 2. 下載申復理由書
  if (argument) {
    // 稍微延遲一下，避免瀏覽器擋下第二個下載
    setTimeout(async () => {
      await generateDefenseDocs({
        fileName: '專利申復理由書',
        title: '專利申復理由書',
        content: argument
      })
    }, 1000)
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