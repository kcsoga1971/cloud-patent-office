<!-- src/views/services/PatentTranslation.vue -->
<template>
  <div class="translation-container">
    <!-- 頁面標題 -->
    <div class="page-header">
      <div class="header-left">
        <div class="header-icon">🌐</div>
        <div class="header-content">
          <h1>專利翻譯服務 (Patent Translation)</h1>
          <p class="subtitle">AI 驅動的專業專利翻譯，符合專利法規要求</p>
        </div>
      </div>
      <div class="header-actions">
        <router-link to="/services/translation/workflow" class="btn-workflow">
          📋 翻譯記錄
        </router-link>
      </div>
    </div>

    <!-- 主內容區 -->
    <div class="content-grid">
      <!-- 左側：配置面板 -->
      <div class="config-panel">
        <div class="panel-card sticky-panel">
          <div class="panel-header">
            <h2>⚙️ 翻譯設定</h2>
          </div>

          <div class="panel-body">
            <!-- 專利 ID -->
            <div class="form-group">
              <label class="form-label">
                <span class="label-icon">📄</span>
                專利編號
              </label>
              <input
                v-model="form.documentId"
                type="text"
                placeholder="例如：US10123456B2"
                class="form-input"
              />
            </div>

            <!-- 語言對 -->
            <div class="form-group">
              <label class="form-label">
                <span class="label-icon">🌍</span>
                翻譯語言
              </label>
              <select v-model="form.languagePair" class="form-select">
                <option value="en_to_zh">英文 → 繁體中文</option>
                <option value="zh_to_en">繁體中文 → 英文</option>
                <option value="en_to_ja">英文 → 日文</option>
                <option value="ja_to_en">日文 → 英文</option>
                <option value="en_to_de">英文 → 德文</option>
                <option value="de_to_en">德文 → 英文</option>
              </select>
            </div>

            <!-- 文件類型 -->
            <div class="form-group">
              <label class="form-label">
                <span class="label-icon">📋</span>
                文件類型
              </label>
              <select v-model="form.documentType" class="form-select">
                <option value="claims">專利請求項 (Claims)</option>
                <option value="description">說明書 (Description)</option>
                <option value="abstract">摘要 (Abstract)</option>
                <option value="full">完整文件 (Full Document)</option>
              </select>
            </div>

            <!-- 選項 -->
            <div class="form-group">
              <label class="form-label">
                <span class="label-icon">✨</span>
                進階選項
              </label>
              <div class="checkbox-group">
                <label class="checkbox-item">
                  <input
                    v-model="form.enforcePatentRules"
                    type="checkbox"
                    class="checkbox-input"
                  />
                  <span class="checkbox-label">遵循專利法規</span>
                </label>
                <label class="checkbox-item">
                  <input
                    v-model="form.enableAutoReview"
                    type="checkbox"
                    class="checkbox-input"
                  />
                  <span class="checkbox-label">自動品質審查</span>
                </label>
                <label class="checkbox-item">
                  <input
                    v-model="form.preserveFormatting"
                    type="checkbox"
                    class="checkbox-input"
                  />
                  <span class="checkbox-label">保留原始格式</span>
                </label>
              </div>
            </div>

            <!-- 開始翻譯按鈕 -->
            <button
              @click="handleStartTranslation"
              :disabled="isTranslating || !form.content.trim()"
              class="btn-primary"
              :class="{ 'btn-disabled': isTranslating || !form.content.trim() }"
            >
              <span v-if="isTranslating" class="btn-loading">
                <span class="spinner-small"></span>
                翻譯中...
              </span>
              <span v-else>
                🚀 開始翻譯
              </span>
            </button>

            <!-- 檔案上傳 -->
            <div class="upload-section">
              <div class="divider">
                <span>或</span>
              </div>
              <label class="upload-area" @click="$refs.fileInput.click()">
                <input
                  type="file"
                  accept=".txt"
                  @change="handleFileUpload"
                  class="file-input"
                  ref="fileInput"
                />
                <div class="upload-icon">📁</div>
                <div class="upload-text">
                  <p class="upload-title">上傳 TXT 檔案</p>
                  <p class="upload-hint">點擊選擇檔案</p>
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- 右側：編輯器區域 -->
      <div class="editor-area">
        <!-- 原文 & 譯文編輯器 -->
        <div class="editor-grid">
          <!-- 原文編輯器 -->
          <div class="editor-card">
            <div class="editor-header source-header">
              <div class="header-title">
                <span class="header-icon">📝</span>
                <span>原文</span>
              </div>
              <span class="language-badge">
                {{ form.languagePair.split('_')[0].toUpperCase() }}
              </span>
            </div>
            <textarea
              v-model="form.content"
              placeholder="請在此貼上專利內容..."
              class="editor-textarea"
              rows="15"
            />
            <div class="editor-footer">
              <span class="char-count">{{ form.content.length }} 字元</span>
            </div>
          </div>

          <!-- 譯文編輯器 -->
          <div class="editor-card">
            <div class="editor-header target-header">
              <div class="header-title">
                <span class="header-icon">✨</span>
                <span>譯文</span>
              </div>
              <span class="language-badge">
                {{ form.languagePair.split('_')[2].toUpperCase() }}
              </span>
            </div>

            <!-- 翻譯中狀態 -->
            <div v-if="isTranslating" class="translation-loading">
              <div class="loading-content">
                <div class="spinner"></div>
                <p class="loading-text">正在翻譯中...</p>
                <div class="progress-bar">
                  <div class="progress-fill" :style="{ width: translationProgress + '%' }"></div>
                </div>
                <p class="progress-text">{{ translationProgress }}%</p>
              </div>
            </div>

            <!-- 翻譯結果 -->
            <div v-else-if="translationResult" class="translation-result">
              <div
                v-for="(segment, index) in translationResult.segments"
                :key="index"
                class="segment-item"
              >
                <div class="segment-header">
                  <span class="segment-number">段落 {{ index + 1 }}</span>
                  <span class="quality-badge" :class="getQualityClass(segment.quality_level)">
                    {{ segment.quality_level.toUpperCase() }}
                  </span>
                </div>
                <p class="segment-text">{{ segment.target_text }}</p>
                <div class="segment-footer">
                  <span class="quality-score">品質：{{ (segment.quality_score * 100).toFixed(0) }}%</span>
                </div>
              </div>
            </div>

            <!-- 空狀態 -->
            <div v-else class="translation-empty">
              <div class="empty-icon">💬</div>
              <p class="empty-text">翻譯結果將顯示在此</p>
            </div>
          </div>
        </div>

        <!-- 品質報告 -->
        <div v-if="translationResult" class="quality-report">
          <div class="report-header">
            <h3>📊 品質報告</h3>
          </div>

          <div class="report-stats">
            <div class="stat-item stat-primary">
              <div class="stat-icon">🎯</div>
              <div class="stat-content">
                <span class="stat-label">整體品質</span>
                <span class="stat-value">{{ (translationResult.average_quality_score * 100).toFixed(0) }}%</span>
              </div>
            </div>

            <div class="stat-item stat-success">
              <div class="stat-icon">📄</div>
              <div class="stat-content">
                <span class="stat-label">段落總數</span>
                <span class="stat-value">{{ translationResult.total_segments }}</span>
              </div>
            </div>

            <div class="stat-item stat-info">
              <div class="stat-icon">⭐</div>
              <div class="stat-content">
                <span class="stat-label">品質等級</span>
                <span class="stat-value">{{ translationResult.overall_quality_level.toUpperCase() }}</span>
              </div>
            </div>

            <div class="stat-item stat-warning">
              <div class="stat-icon">✅</div>
              <div class="stat-content">
                <span class="stat-label">狀態</span>
                <span class="stat-value">{{ translationResult.status.toUpperCase() }}</span>
              </div>
            </div>
          </div>

          <!-- 匯出選項 -->
          <div class="export-actions">
            <button @click="handleExportWord" class="btn-export btn-export-word">
              <span class="btn-icon">📄</span>
              匯出 Word
            </button>
            <button @click="handleCopyToClipboard" class="btn-export btn-export-copy">
              <span class="btn-icon">📋</span>
              複製全文
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'

// State
const form = reactive({
  documentId: '',
  languagePair: 'en_to_zh',
  documentType: 'claims',
  content: '',
  enforcePatentRules: true,
  enableAutoReview: true,
  preserveFormatting: true
})

const isTranslating = ref(false)
const translationProgress = ref(0)
const translationResult = ref(null)
const fileInput = ref(null)

// Methods
const handleStartTranslation = async () => {
  if (!form.content.trim()) return

  isTranslating.value = true
  translationProgress.value = 0
  translationResult.value = null

  try {
    // 模擬進度
    const progressInterval = setInterval(() => {
      translationProgress.value += Math.random() * 30
      if (translationProgress.value > 90) translationProgress.value = 90
    }, 300)

    // 呼叫翻譯 API
    const apiUrl = import.meta.env.VITE_TRANSLATION_API_URL
    const response = await fetch(`${apiUrl}/api/v1/translate_patent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        document_id: form.documentId || `doc_${Date.now()}`,
        content: form.content,
        language_pair: form.languagePair,
        document_type: form.documentType,
        enforce_patent_rules: form.enforcePatentRules,
        enable_auto_review: form.enableAutoReview,
        preserve_formatting: form.preserveFormatting
      })
    })

    const data = await response.json()
    clearInterval(progressInterval)
    translationProgress.value = 100

    if (data.success) {
      translationResult.value = data.job_data
      setTimeout(() => {
        translationProgress.value = 0
      }, 1000)
    } else {
      alert(`錯誤：${data.error}`)
    }
  } catch (error) {
    console.error('翻譯錯誤:', error)
    alert('翻譯失敗，請重試')
  } finally {
    isTranslating.value = false
  }
}

const handleFileUpload = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return

  if (!file.name.endsWith('.txt')) {
    alert('請上傳 .txt 檔案')
    return
  }

  const text = await file.text()
  form.content = text
}

const handleExportWord = async () => {
  if (!translationResult.value) return

  try {
    const apiUrl = import.meta.env.VITE_TRANSLATION_API_URL
    const response = await fetch(`${apiUrl}/api/v1/jobs/${translationResult.value.job_id}/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        format: 'docx',
        include_source: true,
        include_metadata: true
      })
    })

    if (response.ok) {
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `translation_${translationResult.value.job_id}.docx`
      a.click()
    } else {
      alert('匯出失敗')
    }
  } catch (error) {
    console.error('匯出錯誤:', error)
    alert('匯出失敗')
  }
}

const handleCopyToClipboard = () => {
  if (!translationResult.value) return

  const text = translationResult.value.segments
    .map(s => s.target_text)
    .join('\n\n')

  navigator.clipboard.writeText(text).then(() => {
    alert('✅ 已複製到剪貼簿！')
  })
}

const getQualityClass = (quality) => {
  switch (quality) {
    case 'excellent':
      return 'quality-excellent'
    case 'high':
      return 'quality-high'
    case 'medium':
      return 'quality-medium'
    default:
      return 'quality-low'
  }
}
</script>

<style scoped>
.translation-container {
  max-width: 1600px;
  margin: 0 auto;
  padding: 24px;
}

/* 頁面標題 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  padding: 32px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.25);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 24px;
}

.header-icon {
  font-size: 56px;
  width: 88px;
  height: 88px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.header-content h1 {
  font-size: 28px;
  font-weight: 700;
  color: white;
  margin: 0 0 8px 0;
}

.subtitle {
  font-size: 15px;
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
}

.btn-workflow {
  padding: 12px 24px;
  background: white;
  color: #667eea;
  border-radius: 8px;
  font-weight: 700;
  text-decoration: none;
  transition: all 0.3s;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.btn-workflow:hover {
  background: #f8f9ff;
  transform: translateY(-2px);
}

/* 內容網格 */
.content-grid {
  display: grid;
  grid-template-columns: 380px 1fr;
  gap: 24px;
}

/* 配置面板 */
.config-panel {
  position: relative;
}

.panel-card {
  background: white;
  border-radius: 16px;
  border: 2px solid #e2e8f0;
  overflow: hidden;
}

.sticky-panel {
  position: sticky;
  top: 24px;
}

.panel-header {
  padding: 20px 24px;
  background: linear-gradient(135deg, #f8f9ff 0%, #f0f4ff 100%);
  border-bottom: 2px solid #e2e8f0;
}

.panel-header h2 {
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

.panel-body {
  padding: 24px;
}

/* 表單組件 */
.form-group {
  margin-bottom: 20px;
}

.form-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #475569;
  margin-bottom: 8px;
}

.label-icon {
  font-size: 16px;
}

.form-input,
.form-select {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.3s;
}

.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

/* 複選框組 */
.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-input {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.checkbox-label {
  font-size: 14px;
  color: #475569;
}

/* 主要按鈕 */
.btn-primary {
  width: 100%;
  padding: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.btn-primary:hover:not(.btn-disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(102, 126, 234, 0.4);
}

.btn-disabled {
  background: #cbd5e1;
  cursor: not-allowed;
  box-shadow: none;
}

.btn-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.spinner-small {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* 上傳區域 */
.upload-section {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 2px solid #f1f5f9;
}

.divider {
  text-align: center;
  margin-bottom: 16px;
  color: #94a3b8;
  font-size: 13px;
  font-weight: 600;
}

.upload-area {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  border: 2px dashed #cbd5e1;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.upload-area:hover {
  border-color: #667eea;
  background: #f8f9ff;
}

.file-input {
  display: none;
}

.upload-icon {
  font-size: 32px;
}

.upload-text {
  flex: 1;
}

.upload-title {
  font-size: 14px;
  font-weight: 600;
  color: #475569;
  margin: 0 0 4px 0;
}

.upload-hint {
  font-size: 12px;
  color: #94a3b8;
  margin: 0;
}

/* 編輯器區域 */
.editor-area {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.editor-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
}

.editor-card {
  background: white;
  border-radius: 16px;
  border: 2px solid #e2e8f0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  color: white;
  font-weight: 600;
}

.source-header {
  background: linear-gradient(135deg, #64748b 0%, #475569 100%);
}

.target-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
}

.language-badge {
  padding: 4px 12px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  font-size: 12px;
  font-weight: 700;
}

.editor-textarea {
  flex: 1;
  padding: 20px;
  border: none;
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.6;
  resize: none;
}

.editor-textarea:focus {
  outline: none;
}

.editor-footer {
  padding: 12px 20px;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
  text-align: right;
}

.char-count {
  font-size: 12px;
  color: #94a3b8;
  font-weight: 600;
}

/* 翻譯載入狀態 */
.translation-loading {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

.loading-content {
  text-align: center;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #f3f4f6;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-text {
  font-size: 15px;
  color: #475569;
  font-weight: 600;
  margin: 0 0 16px 0;
}

.progress-bar {
  width: 200px;
  height: 8px;
  background: #f1f5f9;
  border-radius: 4px;
  overflow: hidden;
  margin: 0 auto 8px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  transition: width 0.3s;
}

.progress-text {
  font-size: 13px;
  color: #94a3b8;
  font-weight: 600;
  margin: 0;
}

/* 翻譯結果 */
.translation-result {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  max-height: 600px;
}

.segment-item {
  padding: 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  margin-bottom: 12px;
  transition: all 0.3s;
}

.segment-item:hover {
  border-color: #667eea;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.1);
}

.segment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.segment-number {
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
}

.quality-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 700;
}

.quality-excellent {
  background: #d1fae5;
  color: #065f46;
}

.quality-high {
  background: #dbeafe;
  color: #1e40af;
}

.quality-medium {
  background: #fef3c7;
  color: #92400e;
}

.quality-low {
  background: #fee2e2;
  color: #991b1b;
}

.segment-text {
  font-size: 14px;
  line-height: 1.6;
  color: #1e293b;
  margin: 0 0 12px 0;
}

.segment-footer {
  text-align: right;
}

.quality-score {
  font-size: 12px;
  color: #64748b;
  font-weight: 600;
}

/* 空狀態 */
.translation-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-text {
  font-size: 14px;
  color: #94a3b8;
  margin: 0;
}

/* 品質報告 */
.quality-report {
  background: white;
  border-radius: 16px;
  border: 2px solid #e2e8f0;
  overflow: hidden;
}

.report-header {
  padding: 20px 24px;
  background: linear-gradient(135deg, #f8f9ff 0%, #f0f4ff 100%);
  border-bottom: 2px solid #e2e8f0;
}

.report-header h3 {
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

.report-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  padding: 24px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  border-radius: 12px;
}

.stat-primary {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
}

.stat-success {
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
}

.stat-info {
  background: linear-gradient(135deg, #e9d5ff 0%, #d8b4fe 100%);
}

.stat-warning {
  background: linear-gradient(135deg, #fed7aa 0%, #fdba74 100%);
}

.stat-icon {
  font-size: 32px;
}

.stat-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  font-size: 12px;
  color: #64748b;
  font-weight: 600;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
}

/* 匯出按鈕 */
.export-actions {
  display: flex;
  gap: 16px;
  padding: 24px;
  border-top: 2px solid #f1f5f9;
}

.btn-export {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 24px;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-export-word {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.btn-export-word:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(16, 185, 129, 0.4);
}

.btn-export-copy {
  background: linear-gradient(135deg, #64748b 0%, #475569 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(100, 116, 139, 0.3);
}

.btn-export-copy:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(100, 116, 139, 0.4);
}

/* 響應式 */
@media (max-width: 1400px) {
  .content-grid {
    grid-template-columns: 1fr;
  }

  .sticky-panel {
    position: static;
  }

  .editor-grid {
    grid-template-columns: 1fr;
  }

  .report-stats {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 20px;
  }

  .header-left {
    flex-direction: column;
    align-items: flex-start;
  }

  .report-stats {
    grid-template-columns: 1fr;
  }

  .export-actions {
    flex-direction: column;
  }
}
</style>
