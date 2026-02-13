<!-- src/components/PatentEvidenceSearch.vue -->
<!-- AI 證據專利搜尋元件 — 串接 Patent Invalidation Engine API -->
<script setup>
import { ref, computed, onUnmounted } from 'vue'

const emit = defineEmits(['search-complete', 'skip'])

// Config
const API_BASE = import.meta.env.VITE_PATENT_ENGINE_URL || '/api/patent-engine'

// State
const step = ref('input') // input | searching | results
const claimsText = ref('')
const patentId = ref('')
const filingDateCutoff = ref('')
const domainHints = ref('')
const targetCount = ref(30)
const maxRounds = ref(5)

// Search state
const workflowId = ref(null)
const progress = ref(null)
const pollTimer = ref(null)
const error = ref(null)

// Results
const collectedPatents = ref([])
const selectedPatents = ref(new Set())
const discardedCount = ref(0)
const totalTime = ref(0)

const canSearch = computed(() => {
  return claimsText.value.trim().length >= 50 && patentId.value.trim().length > 0
})

const selectedCount = computed(() => selectedPatents.value.size)

const gradeAPatents = computed(() => collectedPatents.value.filter(p => p.grade === 'A'))
const gradeBPatents = computed(() => collectedPatents.value.filter(p => p.grade === 'B'))

// Start search
const startSearch = async () => {
  error.value = null
  step.value = 'searching'
  
  try {
    const hints = domainHints.value
      .split(/[,，、\n]/)
      .map(s => s.trim())
      .filter(Boolean)

    const body = {
      patent_id: patentId.value.trim(),
      claims_text: claimsText.value.trim(),
      target_count: targetCount.value,
      max_rounds: maxRounds.value,
      ...(filingDateCutoff.value && { filing_date_cutoff: filingDateCutoff.value }),
      ...(hints.length > 0 && {
        patent_context: { domain_hints: hints }
      })
    }

    const res = await fetch(`${API_BASE}/api/v1/search/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })

    if (!res.ok) throw new Error(`API 錯誤: ${res.status}`)
    
    const data = await res.json()
    if (!data.success) throw new Error(data.error || '啟動搜尋失敗')
    
    workflowId.value = data.data.workflow_id
    startPolling()
  } catch (err) {
    error.value = err.message
    step.value = 'input'
  }
}

// Poll progress
const startPolling = () => {
  pollTimer.value = setInterval(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/search/progress/${workflowId.value}`)
      const data = await res.json()
      progress.value = data.data

      if (data.data.status === 'completed' || data.data.status === 'failed') {
        clearInterval(pollTimer.value)
        pollTimer.value = null

        if (data.data.status === 'completed') {
          await fetchResults()
        } else {
          error.value = '搜尋失敗'
          step.value = 'input'
        }
      }
    } catch (err) {
      console.error('Polling error:', err)
    }
  }, 3000)
}

// Fetch final results
const fetchResults = async () => {
  try {
    const res = await fetch(`${API_BASE}/api/v1/search/result/${workflowId.value}`)
    const data = await res.json()
    
    collectedPatents.value = data.data.collected_patents || []
    discardedCount.value = data.data.discarded_count || 0
    totalTime.value = data.data.total_time_ms || 0

    // Auto-select all Grade A patents
    collectedPatents.value.forEach(p => {
      if (p.grade === 'A') {
        selectedPatents.value.add(p.patent_number)
      }
    })

    step.value = 'results'
  } catch (err) {
    error.value = '取得結果失敗: ' + err.message
    step.value = 'input'
  }
}

// Toggle selection
const toggleSelect = (patentNumber) => {
  if (selectedPatents.value.has(patentNumber)) {
    selectedPatents.value.delete(patentNumber)
  } else {
    selectedPatents.value.add(patentNumber)
  }
  // Force reactivity
  selectedPatents.value = new Set(selectedPatents.value)
}

const selectAllGradeA = () => {
  gradeAPatents.value.forEach(p => selectedPatents.value.add(p.patent_number))
  selectedPatents.value = new Set(selectedPatents.value)
}

const selectAll = () => {
  collectedPatents.value.forEach(p => selectedPatents.value.add(p.patent_number))
  selectedPatents.value = new Set(selectedPatents.value)
}

const clearSelection = () => {
  selectedPatents.value = new Set()
}

// Confirm selection
const confirmSelection = () => {
  const selected = collectedPatents.value.filter(p => selectedPatents.value.has(p.patent_number))
  emit('search-complete', {
    workflow_id: workflowId.value,
    patents: selected,
    patent_id: patentId.value,
    claims_text: claimsText.value
  })
}

// Cleanup
onUnmounted(() => {
  if (pollTimer.value) clearInterval(pollTimer.value)
})
</script>

<template>
  <div class="evidence-search">
    <!-- ========== 輸入階段 ========== -->
    <div v-if="step === 'input'" class="search-input-section">
      <div class="section-header">
        <div class="step-icon">🔍</div>
        <div>
          <h2>AI 證據專利搜尋</h2>
          <p class="description">輸入系爭專利的請求項，AI 將自動搜尋可用於舉發的先前技術</p>
        </div>
      </div>

      <!-- 專利號 -->
      <div class="form-group">
        <label>系爭專利號 <span class="required">*</span></label>
        <input 
          v-model="patentId"
          type="text" 
          placeholder="例如：TWI572490B、US10123456B2"
          class="form-input"
        />
      </div>

      <!-- Claims -->
      <div class="form-group">
        <label>請求項文字 <span class="required">*</span></label>
        <textarea 
          v-model="claimsText"
          placeholder="請貼上系爭專利的請求項全文（至少 50 字）..."
          class="form-textarea"
          rows="8"
        ></textarea>
        <span class="char-count">{{ claimsText.length }} 字</span>
      </div>

      <!-- Domain Hints -->
      <div class="form-group">
        <label>
          行業關鍵字提示
          <span class="hint">（選填，用逗號分隔）</span>
        </label>
        <input 
          v-model="domainHints"
          type="text" 
          placeholder="例如：color resist stripping, TFT-LCD, photoresist"
          class="form-input"
        />
        <p class="field-help">
          💡 Claims 通常使用抽象語言，提供行業關鍵字可大幅提升搜尋精準度
        </p>
      </div>

      <!-- 申請日 -->
      <div class="form-row">
        <div class="form-group half">
          <label>申請日截止 <span class="hint">（選填）</span></label>
          <input 
            v-model="filingDateCutoff"
            type="date"
            class="form-input"
          />
          <p class="field-help">只搜尋此日期前的專利</p>
        </div>
        <div class="form-group half">
          <label>目標數量</label>
          <select v-model="targetCount" class="form-input">
            <option :value="10">10 篇</option>
            <option :value="20">20 篇</option>
            <option :value="30">30 篇（推薦）</option>
            <option :value="50">50 篇</option>
          </select>
        </div>
      </div>

      <!-- Error -->
      <div v-if="error" class="error-banner">
        ❌ {{ error }}
      </div>

      <!-- Actions -->
      <div class="action-row">
        <button 
          @click="startSearch" 
          :disabled="!canSearch"
          class="btn-search"
        >
          🚀 開始 AI 搜尋證據
        </button>
        <button @click="emit('skip')" class="btn-skip">
          跳過，直接上傳證據 →
        </button>
      </div>
    </div>

    <!-- ========== 搜尋中 ========== -->
    <div v-else-if="step === 'searching'" class="searching-section">
      <div class="search-status-card">
        <div class="spinner-large"></div>
        <h2>🤖 AI 正在搜尋證據專利...</h2>
        
        <div v-if="progress" class="progress-info">
          <div class="progress-bar-container">
            <div 
              class="progress-bar-fill"
              :style="{ width: Math.max(progress.progress_pct, 5) + '%' }"
            ></div>
          </div>
          <div class="progress-details">
            <span>第 {{ progress.current_round }} / {{ progress.max_rounds }} 輪</span>
            <span>已收集 {{ progress.collected }} / {{ progress.target }} 篇</span>
            <span>{{ progress.current_action }}</span>
          </div>
        </div>
        
        <p class="search-time-hint">通常需要 3-5 分鐘，請稍候</p>
      </div>
    </div>

    <!-- ========== 搜尋結果 ========== -->
    <div v-else-if="step === 'results'" class="results-section">
      <!-- 摘要 -->
      <div class="results-summary">
        <div class="summary-stat">
          <span class="stat-number">{{ collectedPatents.length }}</span>
          <span class="stat-label">找到的證據</span>
        </div>
        <div class="summary-stat grade-a">
          <span class="stat-number">{{ gradeAPatents.length }}</span>
          <span class="stat-label">Grade A（高度相關）</span>
        </div>
        <div class="summary-stat grade-b">
          <span class="stat-number">{{ gradeBPatents.length }}</span>
          <span class="stat-label">Grade B（部分相關）</span>
        </div>
        <div class="summary-stat">
          <span class="stat-number">{{ (totalTime / 1000).toFixed(0) }}s</span>
          <span class="stat-label">搜尋耗時</span>
        </div>
      </div>

      <!-- 操作列 -->
      <div class="selection-toolbar">
        <div class="selection-info">
          已選擇 <strong>{{ selectedCount }}</strong> 篇
        </div>
        <div class="selection-actions">
          <button @click="selectAllGradeA" class="btn-sm">選 Grade A</button>
          <button @click="selectAll" class="btn-sm">全選</button>
          <button @click="clearSelection" class="btn-sm btn-outline">清除</button>
        </div>
      </div>

      <!-- 專利列表 -->
      <div class="patent-list">
        <!-- Grade A -->
        <div v-if="gradeAPatents.length" class="grade-group">
          <h3 class="grade-header grade-a-header">⭐ Grade A — 高度相關</h3>
          <div 
            v-for="patent in gradeAPatents" 
            :key="patent.patent_number"
            class="patent-card"
            :class="{ selected: selectedPatents.has(patent.patent_number) }"
            @click="toggleSelect(patent.patent_number)"
          >
            <div class="patent-checkbox">
              <input 
                type="checkbox" 
                :checked="selectedPatents.has(patent.patent_number)"
                @click.stop="toggleSelect(patent.patent_number)"
              />
            </div>
            <div class="patent-info">
              <div class="patent-number">{{ patent.patent_number }}</div>
              <div class="patent-title">{{ patent.title || '（標題載入中）' }}</div>
              <div class="patent-meta">
                <span v-if="patent.filing_date">📅 {{ patent.filing_date }}</span>
                <span class="grade-badge grade-a">A</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Grade B -->
        <div v-if="gradeBPatents.length" class="grade-group">
          <h3 class="grade-header grade-b-header">📋 Grade B — 部分相關</h3>
          <div 
            v-for="patent in gradeBPatents" 
            :key="patent.patent_number"
            class="patent-card"
            :class="{ selected: selectedPatents.has(patent.patent_number) }"
            @click="toggleSelect(patent.patent_number)"
          >
            <div class="patent-checkbox">
              <input 
                type="checkbox" 
                :checked="selectedPatents.has(patent.patent_number)"
                @click.stop="toggleSelect(patent.patent_number)"
              />
            </div>
            <div class="patent-info">
              <div class="patent-number">{{ patent.patent_number }}</div>
              <div class="patent-title">{{ patent.title || '（標題載入中）' }}</div>
              <div class="patent-meta">
                <span v-if="patent.filing_date">📅 {{ patent.filing_date }}</span>
                <span class="grade-badge grade-b">B</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 確認按鈕 -->
      <div class="confirm-row">
        <button @click="step = 'input'" class="btn-back">
          ← 重新搜尋
        </button>
        <button 
          @click="confirmSelection" 
          :disabled="selectedCount === 0"
          class="btn-confirm"
        >
          ✅ 使用已選的 {{ selectedCount }} 篇進行舉發分析
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.evidence-search {
  margin-bottom: 32px;
}

/* Section header */
.section-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.step-icon {
  font-size: 48px;
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.section-header h2 {
  font-size: 22px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 4px 0;
}

.description {
  font-size: 14px;
  color: #64748b;
  margin: 0;
}

/* Form */
.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
  font-size: 14px;
}

.required { color: #ef4444; }

.hint {
  font-weight: 400;
  color: #9ca3af;
  font-size: 13px;
}

.form-input {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 15px;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.form-input:focus {
  outline: none;
  border-color: #667eea;
}

.form-textarea {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  font-family: 'Noto Sans TC', sans-serif;
  resize: vertical;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.form-textarea:focus {
  outline: none;
  border-color: #667eea;
}

.char-count {
  display: block;
  text-align: right;
  font-size: 12px;
  color: #9ca3af;
  margin-top: 4px;
}

.field-help {
  font-size: 13px;
  color: #6b7280;
  margin: 6px 0 0;
}

.form-row {
  display: flex;
  gap: 16px;
}

.form-group.half {
  flex: 1;
}

/* Error */
.error-banner {
  padding: 12px 16px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #dc2626;
  font-size: 14px;
  margin-bottom: 16px;
}

/* Actions */
.action-row {
  display: flex;
  gap: 16px;
  align-items: center;
  margin-top: 24px;
}

.btn-search {
  padding: 16px 32px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.btn-search:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(102, 126, 234, 0.4);
}

.btn-search:disabled {
  background: #e2e8f0;
  color: #94a3b8;
  cursor: not-allowed;
  box-shadow: none;
}

.btn-skip {
  padding: 12px 24px;
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  color: #64748b;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-skip:hover {
  border-color: #cbd5e1;
  color: #475569;
}

/* Searching */
.search-status-card {
  text-align: center;
  padding: 60px 40px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.spinner-large {
  width: 64px;
  height: 64px;
  border: 4px solid #f3f4f6;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 24px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.progress-bar-container {
  width: 100%;
  height: 8px;
  background: #e2e8f0;
  border-radius: 4px;
  margin: 24px 0 12px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea, #764ba2);
  border-radius: 4px;
  transition: width 0.5s ease;
}

.progress-details {
  display: flex;
  justify-content: center;
  gap: 24px;
  font-size: 14px;
  color: #64748b;
}

.search-time-hint {
  font-size: 13px;
  color: #9ca3af;
  margin-top: 16px;
}

/* Results */
.results-summary {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
}

.summary-stat {
  flex: 1;
  padding: 20px;
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  text-align: center;
}

.summary-stat.grade-a { border-color: #10b981; background: #f0fdf4; }
.summary-stat.grade-b { border-color: #f59e0b; background: #fffbeb; }

.stat-number {
  display: block;
  font-size: 28px;
  font-weight: 700;
  color: #1e293b;
}

.stat-label {
  display: block;
  font-size: 13px;
  color: #64748b;
  margin-top: 4px;
}

/* Selection toolbar */
.selection-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f8fafc;
  border-radius: 8px;
  margin-bottom: 16px;
}

.selection-actions {
  display: flex;
  gap: 8px;
}

.btn-sm {
  padding: 6px 14px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.btn-sm.btn-outline {
  background: white;
  color: #64748b;
  border: 1px solid #e2e8f0;
}

/* Patent list */
.grade-group { margin-bottom: 24px; }

.grade-header {
  font-size: 16px;
  font-weight: 700;
  padding: 8px 0;
  margin-bottom: 12px;
  border-bottom: 2px solid #e2e8f0;
}

.grade-a-header { color: #059669; border-color: #10b981; }
.grade-b-header { color: #d97706; border-color: #f59e0b; }

.patent-card {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 16px;
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 10px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.patent-card:hover { border-color: #667eea; background: #f8f9ff; }
.patent-card.selected { border-color: #667eea; background: #eef2ff; }

.patent-checkbox {
  padding-top: 2px;
}

.patent-checkbox input[type="checkbox"] {
  width: 20px;
  height: 20px;
  cursor: pointer;
}

.patent-number {
  font-size: 15px;
  font-weight: 700;
  color: #1e293b;
}

.patent-title {
  font-size: 14px;
  color: #475569;
  margin: 4px 0;
}

.patent-meta {
  display: flex;
  gap: 12px;
  align-items: center;
  font-size: 13px;
  color: #6b7280;
}

.grade-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 700;
}

.grade-badge.grade-a { background: #d1fae5; color: #065f46; }
.grade-badge.grade-b { background: #fef3c7; color: #92400e; }

/* Confirm row */
.confirm-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 2px solid #e2e8f0;
}

.btn-back {
  padding: 12px 24px;
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  color: #64748b;
  font-weight: 600;
  cursor: pointer;
}

.btn-confirm {
  padding: 16px 32px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.btn-confirm:disabled {
  background: #e2e8f0;
  color: #94a3b8;
  cursor: not-allowed;
  box-shadow: none;
}

/* Responsive */
@media (max-width: 768px) {
  .results-summary { flex-direction: column; }
  .form-row { flex-direction: column; }
  .action-row { flex-direction: column; }
  .confirm-row { flex-direction: column; gap: 12px; }
  .progress-details { flex-direction: column; gap: 4px; }
}
</style>
