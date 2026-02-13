<!-- src/components/dev-tools/PromptEditor.vue -->
<template>
  <div class="prompt-editor">
    <div class="editor-header">
      <h3>✏️ Prompt 線上編輯器</h3>
      <p class="subtitle">即時編輯 Prompt 並測試效果，無需重新部署</p>
    </div>

    <div class="editor-layout">
      <!-- 左側：Prompt 編輯器 -->
      <div class="editor-panel">
        <div class="panel-header">
          <h4>📝 編輯 Prompt</h4>
          <div class="editor-actions">
            <select v-model="selectedPromptType" class="prompt-selector">
              <option value="feature_extraction">技術特徵提取</option>
              <option value="search_strategy">檢索策略生成</option>
              <option value="feature_analysis">段落級比對</option>
            </select>
            <button @click="loadTemplate" class="load-template-btn">
              📋 載入範本
            </button>
            <button @click="savePrompt" class="save-btn">
              💾 儲存
            </button>
          </div>
        </div>

        <div class="editor-container">
          <textarea
            v-model="promptText"
            class="prompt-textarea"
            placeholder="在此輸入 Prompt..."
            spellcheck="false"
          ></textarea>
          <div class="editor-stats">
            <span>字數: {{ promptText.length }}</span>
            <span>行數: {{ promptText.split('\n').length }}</span>
          </div>
        </div>

        <!-- 變數說明 -->
        <div class="variables-guide">
          <details>
            <summary>📚 可用變數說明</summary>
            <div class="variables-list">
              <div class="variable-item">
                <code>{{ '{{ $json.target_patent_number }}' }}</code>
                <span>系爭專利號</span>
              </div>
              <div class="variable-item">
                <code>{{ '{{ JSON.stringify($json.target_analysis, null, 2) }}' }}</code>
                <span>系爭專利分析結果</span>
              </div>
              <div class="variable-item">
                <code>{{ '{{ $json.features_data.technical_domain }}' }}</code>
                <span>技術領域</span>
              </div>
              <div class="variable-item">
                <code>{{ '{{ $json.features_data.independent_claims[0].features }}' }}</code>
                <span>獨立項技術特徵</span>
              </div>
            </div>
          </details>
        </div>

        <!-- Prompt 版本管理 -->
        <div class="version-management">
          <h4>📦 版本管理</h4>
          <div class="version-input">
            <input
              v-model="promptVersion"
              type="text"
              placeholder="例如：v2.1"
              class="version-input-field"
            />
            <input
              v-model="versionDescription"
              type="text"
              placeholder="版本說明（例如：改善數值範圍提取）"
              class="version-desc-field"
            />
          </div>
        </div>
      </div>

      <!-- 右側：測試與結果 -->
      <div class="test-panel">
        <div class="panel-header">
          <h4>🧪 測試 Prompt</h4>
        </div>

        <!-- 測試輸入 -->
        <div class="test-input">
          <label>測試專利號：</label>
          <input
            v-model="testPatentNumber"
            type="text"
            placeholder="例如：US10123456B2"
            class="test-patent-input"
          />
          <button @click="testPrompt" :disabled="testing" class="test-btn">
            {{ testing ? '測試中...' : '🚀 執行測試' }}
          </button>
        </div>

        <!-- 測試結果 -->
        <div v-if="testResult" class="test-result">
          <div class="result-tabs">
            <button
              v-for="tab in resultTabs"
              :key="tab.id"
              :class="['result-tab', { active: activeResultTab === tab.id }]"
              @click="activeResultTab = tab.id"
            >
              {{ tab.label }}
            </button>
          </div>

          <div class="result-content">
            <!-- 結構化結果 -->
            <div v-if="activeResultTab === 'structured'" class="structured-result">
              <div class="result-section">
                <h5>🎯 技術領域</h5>
                <div class="domain-display">
                  <span class="domain-badge" :class="testResult.technical_domain">
                    {{ testResult.technical_domain }}
                  </span>
                  <span class="confidence">
                    信心度: {{ (testResult.domain_confidence * 100).toFixed(1) }}%
                  </span>
                </div>
              </div>

              <div class="result-section">
                <h5>🏷️ CPC 預測</h5>
                <div class="cpc-list">
                  <div v-for="cpc in testResult.predicted_cpc" :key="cpc.code" class="cpc-item">
                    <code>{{ cpc.code }}</code>
                    <span>{{ cpc.title }}</span>
                    <span class="cpc-confidence">{{ (cpc.confidence * 100).toFixed(1) }}%</span>
                  </div>
                </div>
              </div>

              <div class="result-section">
                <h5>📋 技術特徵</h5>
                <div class="features-summary">
                  <div class="summary-item">
                    <span class="summary-label">總特徵數：</span>
                    <span class="summary-value">{{ testResult.total_features }}</span>
                  </div>
                  <div class="summary-item">
                    <span class="summary-label">必要特徵數：</span>
                    <span class="summary-value">{{ testResult.essential_features }}</span>
                  </div>
                  <div class="summary-item">
                    <span class="summary-label">包含數值範圍：</span>
                    <span :class="['summary-value', testResult.has_numerical_ranges ? 'yes' : 'no']">
                      {{ testResult.has_numerical_ranges ? '✓ 是' : '✗ 否' }}
                    </span>
                  </div>
                  <div class="summary-item">
                    <span class="summary-label">包含上下位概念：</span>
                    <span :class="['summary-value', testResult.has_hierarchical_concepts ? 'yes' : 'no']">
                      {{ testResult.has_hierarchical_concepts ? '✓ 是' : '✗ 否' }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 原始 JSON -->
            <div v-if="activeResultTab === 'json'" class="json-result">
              <pre class="json-viewer">{{ JSON.stringify(testResult, null, 2) }}</pre>
            </div>

            <!-- 與舊版本比較 -->
            <div v-if="activeResultTab === 'compare' && comparisonResult" class="comparison-result">
              <DiffViewer
                :version1="comparisonResult.old_version"
                :version2="testResult"
              />
            </div>
          </div>
        </div>

        <div v-else class="empty-result">
          <p>👈 請輸入專利號並執行測試</p>
        </div>
      </div>
    </div>

    <!-- 儲存成功提示 -->
    <Transition name="toast">
      <div v-if="showToast" class="toast" :class="toastType">
        {{ toastMessage }}
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { supabase } from '../../supabase'
import DiffViewer from './DiffViewer.vue'

const selectedPromptType = ref('feature_extraction')
const promptText = ref('')
const promptVersion = ref('v2.1')
const versionDescription = ref('')
const testPatentNumber = ref('')
const testing = ref(false)
const testResult = ref(null)
const comparisonResult = ref(null)
const activeResultTab = ref('structured')
const showToast = ref(false)
const toastMessage = ref('')
const toastType = ref('success')

const resultTabs = [
  { id: 'structured', label: '📊 結構化結果' },
  { id: 'json', label: '🔧 原始 JSON' },
  { id: 'compare', label: '📊 與舊版比較' }
]

// 載入範本
const loadTemplate = async () => {
  try {
    // 從資料庫載入最新的 Prompt 範本
    const { data } = await supabase
      .from('prompt_templates')
      .select('*')
      .eq('prompt_type', selectedPromptType.value)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (data) {
      promptText.value = data.prompt_text
      promptVersion.value = data.version
      versionDescription.value = data.description
      showToastMessage('✅ 範本載入成功', 'success')
    } else {
      // 如果沒有範本，載入預設範本
      promptText.value = getDefaultTemplate(selectedPromptType.value)
      showToastMessage('📋 載入預設範本', 'info')
    }
  } catch (error) {
    console.error('載入範本失敗:', error)
    promptText.value = getDefaultTemplate(selectedPromptType.value)
    showToastMessage('⚠️ 載入範本失敗，使用預設範本', 'warning')
  }
}

// 取得預設範本
const getDefaultTemplate = (type: string) => {
  const templates = {
    feature_extraction: `# Role: 專利舉發專家 (Patent Invalidation Expert)

你是一位擁有 15 年以上經驗的專利舉發專家，專精於分析申請專利範圍（Claims）並提取技術特徵。

---

# Mission: 技術領域判斷 + CPC預測 + 技術特徵提取（含上下位概念）

請根據以下系爭專利的技術分析，完成三個任務：
1. 判斷技術領域
2. 預測核心 CPC/IPC 分類號
3. 提取技術特徵（含數值範圍和上下位概念）

【系爭專利分析】
{{ JSON.stringify($json.target_analysis, null, 2) }}

---

請以 JSON 格式輸出（直接輸出 JSON，不要使用 \`\`\`json 標記）。`,
    
    search_strategy: `# Role: 檢索策略專家

請為以下技術特徵生成 3 個層級的檢索策略...`,
    
    feature_analysis: `# Role: 專利技術特徵比對專家

請針對以下目標專利的技術特徵，從證據專利中找出「揭露該特徵的具體段落」...`
  }
  
  return templates[type] || ''
}

// 儲存 Prompt
const savePrompt = async () => {
  if (!promptText.value.trim()) {
    showToastMessage('❌ Prompt 不能為空', 'error')
    return
  }

  if (!promptVersion.value.trim()) {
    showToastMessage('❌ 請輸入版本號', 'error')
    return
  }

  try {
    const { error } = await supabase
      .from('prompt_templates')
      .insert({
        prompt_type: selectedPromptType.value,
        prompt_text: promptText.value,
        version: promptVersion.value,
        description: versionDescription.value,
        created_by: 'developer' // 可以改為實際的使用者 ID
      })

    if (error) throw error

    showToastMessage('✅ Prompt 儲存成功', 'success')
  } catch (error) {
    console.error('儲存失敗:', error)
    showToastMessage('❌ 儲存失敗', 'error')
  }
}

// 測試 Prompt
const testPrompt = async () => {
  if (!testPatentNumber.value.trim()) {
    showToastMessage('❌ 請輸入測試專利號', 'error')
    return
  }

  testing.value = true
  testResult.value = null
  comparisonResult.value = null

  try {
    // 1. 取得專利資料
    const { data: patentData } = await supabase
      .from('patent_cache')
      .select('*')
      .eq('publication_number', testPatentNumber.value)
      .single()

    if (!patentData) {
      showToastMessage('❌ 找不到該專利，請先執行專利分析', 'error')
      testing.value = false
      return
    }

    // 2. 呼叫測試 API（使用自訂 Prompt）
    const response = await fetch('/api/test-prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt_text: promptText.value,
        prompt_type: selectedPromptType.value,
        patent_data: patentData,
        version: promptVersion.value
      })
    })

    const result = await response.json()
    testResult.value = result

    // 3. 載入舊版本進行比較
    const { data: oldVersion } = await supabase
      .from('invalidation_smartsearch_cache')
      .select('*')
      .eq('patent_number', testPatentNumber.value)
      .eq('analysis_type', 'feature_extraction')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (oldVersion) {
      comparisonResult.value = {
        old_version: oldVersion,
        new_version: result
      }
    }

    showToastMessage('✅ 測試完成', 'success')
  } catch (error) {
    console.error('測試失敗:', error)
    showToastMessage('❌ 測試失敗', 'error')
  } finally {
    testing.value = false
  }
}

// 顯示提示訊息
const showToastMessage = (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
  toastMessage.value = message
  toastType.value = type
  showToast.value = true
  
  setTimeout(() => {
    showToast.value = false
  }, 3000)
}
</script>

<style scoped>
.prompt-editor {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.editor-header h3 {
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
}

.subtitle {
  color: #6b7280;
  font-size: 0.95rem;
}

.editor-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  min-height: 600px;
}

.editor-panel,
.test-panel {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #e5e7eb;
}

.panel-header h4 {
  margin: 0;
  color: #374151;
  font-size: 1.125rem;
}

.editor-actions {
  display: flex;
  gap: 0.5rem;
}

.prompt-selector {
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
}

.load-template-btn,
.save-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.load-template-btn {
  background: #f3f4f6;
  color: #374151;
}

.load-template-btn:hover {
  background: #e5e7eb;
}

.save-btn {
  background: #2563eb;
  color: white;
}

.save-btn:hover {
  background: #1d4ed8;
}

.editor-container {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.prompt-textarea {
  flex: 1;
  padding: 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-family: 'Fira Code', monospace;
  font-size: 0.875rem;
  line-height: 1.6;
  resize: none;
  background: #f9fafb;
}

.prompt-textarea:focus {
  outline: none;
  border-color: #2563eb;
  background: white;
}

.editor-stats {
  display: flex;
  gap: 1rem;
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: #6b7280;
}

.variables-guide {
  margin-top: 1rem;
}

.variables-guide details {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1rem;
}

.variables-guide summary {
  cursor: pointer;
  font-weight: 600;
  color: #374151;
  user-select: none;
}

.variables-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 1rem;
}

.variable-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  background: white;
  border-radius: 6px;
}

.variable-item code {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 0.375rem 0.75rem;
  border-radius: 4px;
  font-size: 0.875rem;
  flex-shrink: 0;
}

.variable-item span {
  color: #6b7280;
  font-size: 0.875rem;
}

.version-management {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

.version-management h4 {
  margin: 0 0 0.75rem 0;
  color: #374151;
  font-size: 1rem;
}

.version-input {
  display: flex;
  gap: 0.5rem;
}

.version-input-field,
.version-desc-field {
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
}

.version-input-field {
  width: 120px;
}

.version-desc-field {
  flex: 1;
}

.test-input {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-bottom: 1.5rem;
}

.test-input label {
  font-weight: 600;
  color: #374151;
  white-space: nowrap;
}

.test-patent-input {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
}

.test-btn {
  padding: 0.5rem 1rem;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

.test-btn:hover:not(:disabled) {
  background: #059669;
}

.test-btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.test-result {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.result-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  border-bottom: 2px solid #e5e7eb;
}

.result-tab {
  padding: 0.75rem 1rem;
  background: none;
  border: none;
  border-bottom: 3px solid transparent;
  cursor: pointer;
  font-size: 0.875rem;
  color: #6b7280;
  transition: all 0.2s;
}

.result-tab:hover {
  color: #2563eb;
}

.result-tab.active {
  color: #2563eb;
  border-bottom-color: #2563eb;
  font-weight: 600;
}

.result-content {
  flex: 1;
  overflow-y: auto;
}

.structured-result {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.result-section {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1rem;
}

.result-section h5 {
  margin: 0 0 0.75rem 0;
  color: #374151;
  font-size: 1rem;
}

.domain-display {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.domain-badge {
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-weight: 600;
}

.domain-badge.Chemical {
  background: #dbeafe;
  color: #1e40af;
}

.domain-badge.Mechanical {
  background: #fef3c7;
  color: #92400e;
}

.domain-badge.Electrical {
  background: #ddd6fe;
  color: #5b21b6;
}

.confidence {
  font-size: 0.875rem;
  color: #6b7280;
}

.cpc-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.cpc-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: white;
  border-radius: 6px;
}

.cpc-item code {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.875rem;
}

.cpc-item span {
  font-size: 0.875rem;
  color: #374151;
}

.cpc-confidence {
  margin-left: auto;
  font-weight: 600;
  color: #6b7280;
}

.features-summary {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  padding: 0.75rem;
  background: white;
  border-radius: 6px;
}

.summary-label {
  color: #6b7280;
  font-size: 0.875rem;
}

.summary-value {
  font-weight: 600;
  color: #374151;
}

.summary-value.yes {
  color: #059669;
}

.summary-value.no {
  color: #dc2626;
}

.json-result {
  background: #1e1e1e;
  border-radius: 8px;
  padding: 1rem;
  overflow-x: auto;
}

.json-viewer {
  color: #d4d4d4;
  font-family: 'Fira Code', monospace;
  font-size: 0.875rem;
  line-height: 1.5;
  margin: 0;
}

.empty-result {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  font-size: 1.125rem;
}

.toast {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  padding: 1rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
}

.toast.success {
  background: #10b981;
  color: white;
}

.toast.error {
  background: #ef4444;
  color: white;
}

.toast.warning {
  background: #f59e0b;
  color: white;
}

.toast.info {
  background: #3b82f6;
  color: white;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(1rem);
}
</style>


