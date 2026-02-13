<!-- src/components/dev-tools/SearchStrategyViewer.vue -->
<template>
  <div class="strategy-viewer">
    <div class="viewer-header">
      <h3>🔍 檢索策略分析</h3>
      <p class="description">
        系統為每個獨立項生成了 3 個層級的檢索策略，平衡精準度與涵蓋率
      </p>
    </div>

    <!-- 獨立項選擇 -->
    <div v-if="data.independent_claims?.length > 1" class="claim-selector">
      <label>選擇請求項：</label>
      <select v-model="selectedClaimIndex">
        <option v-for="(claim, index) in data.independent_claims" :key="index" :value="index">
          請求項 {{ claim.claim_number }}
        </option>
      </select>
    </div>

    <!-- 檢索策略卡片 -->
    <div v-if="selectedClaim?.search_strategies" class="strategies-container">
      <div
        v-for="strategy in selectedClaim.search_strategies"
        :key="strategy.level"
        class="strategy-card"
        :class="strategy.level"
      >
        <!-- 策略標題 -->
        <div class="strategy-header">
          <div class="strategy-level">
            <span class="level-badge" :class="strategy.level">
              {{ getLevelIcon(strategy.level) }} {{ strategy.level.toUpperCase() }}
            </span>
            <span class="strategy-name">{{ strategy.strategy_name }}</span>
          </div>
          <div class="metrics">
            <span class="metric precision" :class="strategy.expected_precision">
              精準度: {{ strategy.expected_precision }}
            </span>
            <span class="metric recall" :class="strategy.expected_recall">
              涵蓋率: {{ strategy.expected_recall }}
            </span>
          </div>
        </div>

        <!-- 策略描述 -->
        <div class="strategy-description">
          <p>{{ strategy.description }}</p>
        </div>

        <!-- 檢索式 -->
        <div class="query-section">
          <div class="query-header">
            <strong>🔎 檢索式：</strong>
            <button @click="copyToClipboard(strategy.query)" class="copy-btn" title="複製">
              📋
            </button>
          </div>
          <pre class="query-box">{{ strategy.query }}</pre>
        </div>

        <!-- Google Patents 檢索式 -->
        <div class="query-section">
          <div class="query-header">
            <strong>🌐 Google Patents 檢索式：</strong>
            <button @click="copyToClipboard(strategy.google_patents_query)" class="copy-btn" title="複製">
              📋
            </button>
            <a
              :href="`https://www.google.com/search?q=${encodeURIComponent(strategy.google_patents_query)}`"
              target="_blank"
              class="test-btn"
            >
              🚀 測試檢索
            </a>
          </div>
          <pre class="query-box">{{ strategy.google_patents_query }}</pre>
        </div>

        <!-- 檢索式分析 -->
        <div class="query-analysis">
          <details>
            <summary>📊 檢索式分析</summary>
            <div class="analysis-content">
              <div class="analysis-item">
                <strong>CPC 過濾器：</strong>
                <code>{{ extractCPCFilter(strategy.query) || '無' }}</code>
              </div>
              <div class="analysis-item">
                <strong>技術特徵數量：</strong>
                <span>{{ countFeatures(strategy.query) }} 個</span>
              </div>
              <div class="analysis-item">
                <strong>術語數量：</strong>
                <span>{{ countTerms(strategy.query) }} 個</span>
              </div>
              <div class="analysis-item">
                <strong>邏輯運算子：</strong>
                <span>{{ countOperators(strategy.query) }}</span>
              </div>
            </div>
          </details>
        </div>
      </div>
    </div>

    <!-- 空狀態 -->
    <div v-else class="empty-state">
      <p>⚠️ 沒有找到檢索策略資料</p>
      <p class="hint">請確認 Build Golden Search Strategies 節點是否正確執行</p>
    </div>

    <!-- 檢索建議 -->
    <div class="recommendations">
      <h4>💡 檢索建議</h4>
      <ul>
        <li>
          <strong>Golden 策略：</strong>適合初步檢索，精準度高但可能遺漏部分相關專利
        </li>
        <li>
          <strong>Medium 策略：</strong>平衡精準度與涵蓋率，建議優先使用
        </li>
        <li>
          <strong>Broad 策略：</strong>涵蓋率最高，適合確保沒有遺漏重要證據
        </li>
        <li>
          <strong>化學案特別注意：</strong>檢索式應包含數值範圍關鍵字（如 "wt%", "ppm"）
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  data: any
}>()

const selectedClaimIndex = ref(0)

const selectedClaim = computed(() => {
  return props.data.independent_claims?.[selectedClaimIndex.value]
})

// 取得層級圖示
const getLevelIcon = (level: string) => {
  const icons = {
    golden: '🥇',
    medium: '🥈',
    broad: '🥉'
  }
  return icons[level] || '🔍'
}

// 複製到剪貼簿
const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    alert('✅ 已複製到剪貼簿')
  } catch (err) {
    console.error('複製失敗:', err)
    alert('❌ 複製失敗')
  }
}

// 提取 CPC 過濾器
const extractCPCFilter = (query: string) => {
  const match = query.match(/\(CPC:[^)]+\)/)
  return match ? match[0] : null
}

// 計算技術特徵數量（AND 連接的群組）
const countFeatures = (query: string) => {
  const features = query.split(' AND ').filter(part => !part.includes('CPC:'))
  return features.length
}

// 計算術語數量（OR 連接的術語）
const countTerms = (query: string) => {
  const terms = query.match(/"[^"]+"/g)
  return terms ? terms.length : 0
}

// 計算邏輯運算子
const countOperators = (query: string) => {
  const andCount = (query.match(/AND/g) || []).length
  const orCount = (query.match(/OR/g) || []).length
  return `${andCount} AND, ${orCount} OR`
}
</script>

<style scoped>
.strategy-viewer {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.viewer-header h3 {
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
}

.description {
  color: #666;
  font-size: 0.95rem;
}

.claim-selector {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 8px;
}

.claim-selector select {
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 1rem;
}

.strategies-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.strategy-card {
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  padding: 1.5rem;
  background: white;
  transition: all 0.3s;
}

.strategy-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.strategy-card.golden {
  border-color: #fbbf24;
  background: linear-gradient(to bottom, #fffbeb 0%, white 100%);
}

.strategy-card.medium {
  border-color: #60a5fa;
  background: linear-gradient(to bottom, #eff6ff 0%, white 100%);
}

.strategy-card.broad {
  border-color: #34d399;
  background: linear-gradient(to bottom, #ecfdf5 0%, white 100%);
}

.strategy-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.strategy-level {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.level-badge {
  display: inline-block;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-weight: 700;
  font-size: 0.875rem;
  letter-spacing: 0.5px;
}

.level-badge.golden {
  background: #fbbf24;
  color: #78350f;
}

.level-badge.medium {
  background: #60a5fa;
  color: #1e3a8a;
}

.level-badge.broad {
  background: #34d399;
  color: #064e3b;
}

.strategy-name {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
}

.metrics {
  display: flex;
  gap: 0.75rem;
}

.metric {
  padding: 0.375rem 0.75rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
}

.metric.precision.high {
  background: #dcfce7;
  color: #166534;
}

.metric.precision.medium {
  background: #fef3c7;
  color: #92400e;
}

.metric.precision.low {
  background: #fee2e2;
  color: #991b1b;
}

.metric.recall.very_high,
.metric.recall.high {
  background: #dcfce7;
  color: #166534;
}

.metric.recall.medium {
  background: #fef3c7;
  color: #92400e;
}

.strategy-description {
  padding: 1rem;
  background: #f9fafb;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.strategy-description p {
  margin: 0;
  color: #4b5563;
  line-height: 1.6;
}

.query-section {
  margin-bottom: 1rem;
}

.query-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.query-header strong {
  color: #1f2937;
}

.copy-btn,
.test-btn {
  padding: 0.25rem 0.75rem;
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  text-decoration: none;
  color: #374151;
  transition: all 0.2s;
}

.copy-btn:hover,
.test-btn:hover {
  background: #e5e7eb;
  border-color: #9ca3af;
}

.test-btn {
  background: #2563eb;
  color: white;
  border-color: #2563eb;
}

.test-btn:hover {
  background: #1d4ed8;
  border-color: #1d4ed8;
}

.query-box {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 1rem;
  border-radius: 8px;
  overflow-x: auto;
  font-family: 'Fira Code', 'Courier New', monospace;
  font-size: 0.875rem;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
}

.query-analysis {
  margin-top: 1rem;
}

.query-analysis details {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1rem;
}

.query-analysis summary {
  cursor: pointer;
  font-weight: 600;
  color: #374151;
  user-select: none;
}

.query-analysis summary:hover {
  color: #2563eb;
}

.analysis-content {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.analysis-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.analysis-item strong {
  min-width: 120px;
  color: #6b7280;
  font-size: 0.875rem;
}

.analysis-item code {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.875rem;
}

.analysis-item span {
  color: #374151;
  font-weight: 600;
}

.recommendations {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  padding: 1.5rem;
  margin-top: 1rem;
}

.recommendations h4 {
  margin-top: 0;
  margin-bottom: 1rem;
  color: #1e40af;
}

.recommendations ul {
  margin: 0;
  padding-left: 1.5rem;
}

.recommendations li {
  margin-bottom: 0.75rem;
  color: #1e3a8a;
  line-height: 1.6;
}

.recommendations strong {
  color: #1e40af;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  background: #fef3c7;
  border: 1px solid #fbbf24;
  border-radius: 8px;
}

.empty-state p {
  margin: 0.5rem 0;
  color: #92400e;
}

.empty-state .hint {
  font-size: 0.875rem;
  color: #b45309;
}
</style>

