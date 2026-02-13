<!-- src/views/ValuationWorkflow.vue -->
<template>
  <div class="dev-tools-page">
    <!-- 頁面標題 -->
    <div class="page-header">
      <h1>🔧 Invalidation Search Strategy Analyzer</h1>
      <p class="subtitle">開發者工具 - 技術特徵提取與檢索策略分析</p>
      <div class="warning-banner">
        ⚠️ 此頁面僅供內部開發與測試使用，請勿分享給外部使用者
      </div>
    </div>

    <!-- 主要功能區 -->
    <div class="main-content">
      <!-- 左側：輸入與控制 -->
      <div class="left-panel">
        <div class="input-section">
          <h2>📝 輸入專利號</h2>
          <input
            v-model="patentNumber"
            type="text"
            placeholder="例如：US10123456B2"
            class="patent-input"
            @keyup.enter="analyzePatent"
          />
          
          <div class="options">
            <label>
              <input v-model="forceRefresh" type="checkbox" />
              強制重新分析（忽略快取）
            </label>
            <label>
              <input v-model="compareVersions" type="checkbox" />
              比較不同 Prompt 版本
            </label>
          </div>

          <button @click="analyzePatent" :disabled="loading" class="analyze-btn">
            {{ loading ? '分析中...' : '🔍 開始分析' }}
          </button>
        </div>

        <!-- 快取統計 -->
        <div class="cache-stats">
          <h3>📊 快取統計</h3>
          <CacheStatistics />
        </div>
      </div>

      <!-- 右側：分析結果 -->
      <div class="right-panel">
        <div v-if="loading" class="loading-state">
          <div class="spinner"></div>
          <p>正在分析專利...</p>
        </div>

        <div v-else-if="analysisResult" class="results">
          <!-- Tab 切換 -->
          <div class="tabs">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              :class="['tab', { active: activeTab === tab.id }]"
              @click="activeTab = tab.id"
            >
              {{ tab.label }}
            </button>
          </div>

          <!-- Tab 內容 -->
          <div class="tab-content">
            <!-- Tab 1: 技術特徵提取 -->
            <div v-if="activeTab === 'features'" class="tab-panel">
              <FeatureExtractionViewer :data="analysisResult" />
            </div>

            <!-- Tab 2: 檢索策略 -->
            <div v-if="activeTab === 'strategies'" class="tab-panel">
              <SearchStrategyViewer :data="analysisResult" />
            </div>

            <!-- Tab 3: 版本比較 -->
            <div v-if="activeTab === 'comparison'" class="tab-panel">
              <PromptVersionComparison
                v-if="compareVersions && versionComparison"
                :data="versionComparison"
              />
              <div v-else class="empty-state">
                請勾選「比較不同 Prompt 版本」並重新分析
              </div>
            </div>

            <!-- Tab 4: 原始 JSON -->
            <div v-if="activeTab === 'raw'" class="tab-panel">
              <pre class="json-viewer">{{ JSON.stringify(analysisResult, null, 2) }}</pre>
            </div>
          </div>

          <!-- 人工標註區 -->
          <div class="feedback-section">
            <h3>✍️ 人工標註與回饋</h3>
            <div class="feedback-form">
              <label>
                <input v-model="feedback.verified" type="checkbox" />
                分析結果正確
              </label>
              <textarea
                v-model="feedback.comments"
                placeholder="請輸入回饋意見（例如：CPC 分類號不正確、缺少某個技術特徵等）"
                rows="4"
              ></textarea>
              <button @click="submitFeedback" class="submit-btn">
                💾 儲存回饋
              </button>
            </div>
          </div>
        </div>

        <div v-else class="empty-state">
          <p>👈 請輸入專利號並點擊「開始分析」</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { supabase } from '../supabase'
import FeatureExtractionViewer from '@/components/dev-tools/FeatureExtractionViewer.vue'
import SearchStrategyViewer from '@/components/dev-tools/SearchStrategyViewer.vue'
import CacheStatistics from '@/components/dev-tools/CacheStatistics.vue'
import PromptVersionComparison from '@/components/dev-tools/PromptVersionComparison.vue'

// 狀態
const patentNumber = ref('')
const loading = ref(false)
const forceRefresh = ref(false)
const compareVersions = ref(false)
const analysisResult = ref(null)
const versionComparison = ref(null)
const activeTab = ref('features')

const tabs = [
  { id: 'features', label: '📋 技術特徵' },
  { id: 'strategies', label: '🔍 檢索策略' },
  { id: 'comparison', label: '📊 版本比較' },
  { id: 'raw', label: '🔧 原始 JSON' }
]

const feedback = reactive({
  verified: false,
  comments: ''
})

// 分析專利
const analyzePatent = async () => {
  if (!patentNumber.value.trim()) {
    alert('請輸入專利號')
    return
  }

  loading.value = true
  analysisResult.value = null
  versionComparison.value = null

  try {
    // 1. 檢查快取（除非強制刷新）
    if (!forceRefresh.value) {
      const { data: cached } = await supabase
        .from('invalidation_smartsearch_cache')
        .select('*')
        .eq('patent_number', patentNumber.value)
        .eq('analysis_type', 'feature_extraction')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (cached) {
        console.log('✅ 使用快取結果')
        analysisResult.value = cached
        
        // 更新使用統計
        await supabase
          .from('invalidation_smartsearch_cache')
          .update({
            usage_count: cached.usage_count + 1,
            last_used_at: new Date().toISOString()
          })
          .eq('id', cached.id)

        loading.value = false
        return
      }
    }

    // 2. 呼叫 n8n webhook 執行分析
    console.log('🔍 執行新的分析')
    const response = await fetch('YOUR_N8N_WEBHOOK_URL', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patent_number: patentNumber.value,
        force_refresh: forceRefresh.value
      })
    })

    const result = await response.json()
    analysisResult.value = result

    // 3. 如果需要比較版本
    if (compareVersions.value) {
      const { data: versions } = await supabase
        .from('invalidation_smartsearch_cache')
        .select('*')
        .eq('patent_number', patentNumber.value)
        .eq('analysis_type', 'feature_extraction')
        .order('prompt_version', { ascending: false })

      versionComparison.value = versions
    }

  } catch (error) {
    console.error('分析失敗:', error)
    alert('分析失敗，請查看 Console')
  } finally {
    loading.value = false
  }
}

// 提交回饋
const submitFeedback = async () => {
  if (!analysisResult.value) return

  try {
    await supabase
      .from('invalidation_smartsearch_cache')
      .update({
        human_verified: feedback.verified,
        human_feedback: feedback.comments,
        verified_by: 'developer', // 可以改為實際的使用者 ID
        verified_at: new Date().toISOString()
      })
      .eq('id', analysisResult.value.id)

    alert('✅ 回饋已儲存')
    feedback.comments = ''
  } catch (error) {
    console.error('儲存回饋失敗:', error)
    alert('❌ 儲存失敗')
  }
}
</script>

<style scoped>
.dev-tools-page {
  padding: 2rem;
  max-width: 1600px;
  margin: 0 auto;
  font-family: 'Inter', sans-serif;
}

.page-header {
  margin-bottom: 2rem;
}

.page-header h1 {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.subtitle {
  color: #666;
  font-size: 1rem;
}

.warning-banner {
  background: #fff3cd;
  border: 1px solid #ffc107;
  padding: 1rem;
  border-radius: 8px;
  margin-top: 1rem;
  color: #856404;
}

.main-content {
  display: grid;
  grid-template-columns: 400px 1fr;
  gap: 2rem;
}

.left-panel,
.right-panel {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.input-section h2 {
  font-size: 1.25rem;
  margin-bottom: 1rem;
}

.patent-input {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1rem;
  margin-bottom: 1rem;
}

.patent-input:focus {
  outline: none;
  border-color: #2563eb;
}

.options {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.options label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.analyze-btn {
  width: 100%;
  padding: 0.75rem;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.analyze-btn:hover:not(:disabled) {
  background: #1d4ed8;
}

.analyze-btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.cache-stats {
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid #e0e0e0;
}

.tabs {
  display: flex;
  gap: 0.5rem;
  border-bottom: 2px solid #e0e0e0;
  margin-bottom: 1.5rem;
}

.tab {
  padding: 0.75rem 1.5rem;
  background: none;
  border: none;
  border-bottom: 3px solid transparent;
  cursor: pointer;
  font-size: 1rem;
  color: #666;
  transition: all 0.2s;
}

.tab:hover {
  color: #2563eb;
}

.tab.active {
  color: #2563eb;
  border-bottom-color: #2563eb;
  font-weight: 600;
}

.tab-panel {
  min-height: 400px;
}

.json-viewer {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 1.5rem;
  border-radius: 8px;
  overflow-x: auto;
  font-family: 'Fira Code', monospace;
  font-size: 0.875rem;
  line-height: 1.5;
}

.feedback-section {
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid #e0e0e0;
}

.feedback-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.feedback-form textarea {
  padding: 0.75rem;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-family: inherit;
  resize: vertical;
}

.submit-btn {
  padding: 0.75rem;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}

.submit-btn:hover {
  background: #059669;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #e0e0e0;
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4rem;
  color: #666;
  font-size: 1.125rem;
}
</style>
