<!-- src/components/dev-tools/DiffViewer.vue -->
<template>
  <div class="diff-viewer">
    <div class="diff-header">
      <div class="version-info">
        <div class="version-label">版本 A</div>
        <div class="version-meta">
          {{ version1.prompt_version }} 
          <span class="version-date">{{ formatDate(version1.created_at) }}</span>
        </div>
      </div>
      <div class="diff-icon">⇄</div>
      <div class="version-info">
        <div class="version-label">版本 B</div>
        <div class="version-meta">
          {{ version2.prompt_version }}
          <span class="version-date">{{ formatDate(version2.created_at) }}</span>
        </div>
      </div>
    </div>

    <!-- 差異摘要 -->
    <div class="diff-summary">
      <div class="summary-card">
        <div class="summary-icon added">+</div>
        <div class="summary-content">
          <div class="summary-label">新增</div>
          <div class="summary-value">{{ diffStats.added }}</div>
        </div>
      </div>
      <div class="summary-card">
        <div class="summary-icon modified">~</div>
        <div class="summary-content">
          <div class="summary-label">修改</div>
          <div class="summary-value">{{ diffStats.modified }}</div>
        </div>
      </div>
      <div class="summary-card">
        <div class="summary-icon removed">-</div>
        <div class="summary-content">
          <div class="summary-label">刪除</div>
          <div class="summary-value">{{ diffStats.removed }}</div>
        </div>
      </div>
      <div class="summary-card">
        <div class="summary-icon unchanged">=</div>
        <div class="summary-content">
          <div class="summary-label">相同</div>
          <div class="summary-value">{{ diffStats.unchanged }}</div>
        </div>
      </div>
    </div>

    <!-- 差異詳情 -->
    <div class="diff-sections">
      <!-- 技術領域差異 -->
      <div v-if="hasDiff('technical_domain')" class="diff-section">
        <h4>🎯 技術領域</h4>
        <div class="diff-row">
          <div class="diff-cell old">
            <span class="domain-badge" :class="version1.technical_domain">
              {{ version1.technical_domain }}
            </span>
            <span class="confidence">({{ (version1.domain_confidence * 100).toFixed(1) }}%)</span>
          </div>
          <div class="diff-arrow">→</div>
          <div class="diff-cell new">
            <span class="domain-badge" :class="version2.technical_domain">
              {{ version2.technical_domain }}
            </span>
            <span class="confidence">({{ (version2.domain_confidence * 100).toFixed(1) }}%)</span>
          </div>
        </div>
        <div v-if="version1.domain_reasoning !== version2.domain_reasoning" class="reasoning-diff">
          <details>
            <summary>查看推理差異</summary>
            <div class="reasoning-comparison">
              <div class="reasoning-old">
                <strong>版本 A：</strong>
                <p>{{ version1.domain_reasoning }}</p>
              </div>
              <div class="reasoning-new">
                <strong>版本 B：</strong>
                <p>{{ version2.domain_reasoning }}</p>
              </div>
            </div>
          </details>
        </div>
      </div>

      <!-- CPC 預測差異 -->
      <div v-if="hasDiff('predicted_cpc')" class="diff-section">
        <h4>🏷️ CPC 預測</h4>
        <div class="cpc-comparison">
          <div class="cpc-column">
            <div class="column-header">版本 A</div>
            <div v-for="cpc in version1.predicted_cpc" :key="cpc.code" class="cpc-item">
              <code class="cpc-code">{{ cpc.code }}</code>
              <span class="cpc-confidence">{{ (cpc.confidence * 100).toFixed(1) }}%</span>
              <span v-if="!findCPCInVersion2(cpc.code)" class="diff-badge removed">刪除</span>
            </div>
          </div>
          <div class="cpc-column">
            <div class="column-header">版本 B</div>
            <div v-for="cpc in version2.predicted_cpc" :key="cpc.code" class="cpc-item">
              <code class="cpc-code">{{ cpc.code }}</code>
              <span class="cpc-confidence">{{ (cpc.confidence * 100).toFixed(1) }}%</span>
              <span v-if="!findCPCInVersion1(cpc.code)" class="diff-badge added">新增</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 技術特徵差異 -->
      <div v-if="hasDiff('features')" class="diff-section">
        <h4>📋 技術特徵差異</h4>
        <div class="features-diff">
          <div class="feature-stats">
            <div class="stat-item">
              <span class="stat-label">版本 A 特徵數：</span>
              <span class="stat-value">{{ version1.total_features }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">版本 B 特徵數：</span>
              <span class="stat-value">{{ version2.total_features }}</span>
            </div>
            <div class="stat-item" :class="{ highlight: version1.total_features !== version2.total_features }">
              <span class="stat-label">差異：</span>
              <span class="stat-value">{{ version2.total_features - version1.total_features }}</span>
            </div>
          </div>

          <!-- 逐特徵比較 -->
          <div class="feature-comparison">
            <FeaturesDiffTable
              :features1="getFeatures(version1)"
              :features2="getFeatures(version2)"
            />
          </div>
        </div>
      </div>

      <!-- 品質指標差異 -->
      <div class="diff-section">
        <h4>✨ 品質指標差異</h4>
        <table class="quality-diff-table">
          <thead>
            <tr>
              <th>指標</th>
              <th>版本 A</th>
              <th>版本 B</th>
              <th>變化</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>數值範圍</td>
              <td>
                <span :class="['status-badge', version1.has_numerical_ranges ? 'yes' : 'no']">
                  {{ version1.has_numerical_ranges ? '✓' : '✗' }}
                </span>
              </td>
              <td>
                <span :class="['status-badge', version2.has_numerical_ranges ? 'yes' : 'no']">
                  {{ version2.has_numerical_ranges ? '✓' : '✗' }}
                </span>
              </td>
              <td>
                <span v-if="version1.has_numerical_ranges !== version2.has_numerical_ranges" class="change-indicator">
                  {{ version2.has_numerical_ranges ? '✓ 改善' : '✗ 退步' }}
                </span>
                <span v-else class="no-change">-</span>
              </td>
            </tr>
            <tr>
              <td>上下位概念</td>
              <td>
                <span :class="['status-badge', version1.has_hierarchical_concepts ? 'yes' : 'no']">
                  {{ version1.has_hierarchical_concepts ? '✓' : '✗' }}
                </span>
              </td>
              <td>
                <span :class="['status-badge', version2.has_hierarchical_concepts ? 'yes' : 'no']">
                  {{ version2.has_hierarchical_concepts ? '✓' : '✗' }}
                </span>
              </td>
              <td>
                <span v-if="version1.has_hierarchical_concepts !== version2.has_hierarchical_concepts" class="change-indicator">
                  {{ version2.has_hierarchical_concepts ? '✓ 改善' : '✗ 退步' }}
                </span>
                <span v-else class="no-change">-</span>
              </td>
            </tr>
            <tr>
              <td>多層級術語</td>
              <td>
                <span :class="['status-badge', version1.has_multilevel_terms ? 'yes' : 'no']">
                  {{ version1.has_multilevel_terms ? '✓' : '✗' }}
                </span>
              </td>
              <td>
                <span :class="['status-badge', version2.has_multilevel_terms ? 'yes' : 'no']">
                  {{ version2.has_multilevel_terms ? '✓' : '✗' }}
                </span>
              </td>
              <td>
                <span v-if="version1.has_multilevel_terms !== version2.has_multilevel_terms" class="change-indicator">
                  {{ version2.has_multilevel_terms ? '✓ 改善' : '✗ 退步' }}
                </span>
                <span v-else class="no-change">-</span>
              </td>
            </tr>
            <tr>
              <td>品質分數</td>
              <td>{{ ((version1.extraction_quality_score || 0) * 100).toFixed(1) }}%</td>
              <td>{{ ((version2.extraction_quality_score || 0) * 100).toFixed(1) }}%</td>
              <td>
                <span :class="['change-indicator', getScoreChangeClass()]">
                  {{ getScoreChange() }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 原始 JSON 比較 -->
      <div class="diff-section">
        <h4>🔧 原始 JSON 比較</h4>
        <details>
          <summary>展開查看完整 JSON diff</summary>
          <div class="json-diff">
            <div class="json-column">
              <div class="json-header">版本 A</div>
              <pre class="json-content">{{ JSON.stringify(version1, null, 2) }}</pre>
            </div>
            <div class="json-column">
              <div class="json-header">版本 B</div>
              <pre class="json-content">{{ JSON.stringify(version2, null, 2) }}</pre>
            </div>
          </div>
        </details>
      </div>
    </div>

    <!-- 結論與建議 -->
    <div class="diff-conclusion">
      <h4>📊 差異分析結論</h4>
      <div class="conclusion-content">
        <div v-if="isImprovement" class="conclusion-card improvement">
          <div class="conclusion-icon">✓</div>
          <div class="conclusion-text">
            <strong>版本 B 整體表現更佳</strong>
            <p>{{ getImprovementSummary() }}</p>
          </div>
        </div>
        <div v-else-if="isRegression" class="conclusion-card regression">
          <div class="conclusion-icon">✗</div>
          <div class="conclusion-text">
            <strong>版本 B 表現退步</strong>
            <p>{{ getRegressionSummary() }}</p>
          </div>
        </div>
        <div v-else class="conclusion-card neutral">
          <div class="conclusion-icon">~</div>
          <div class="conclusion-text">
            <strong>兩版本表現相當</strong>
            <p>沒有明顯的改善或退步</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  version1: any
  version2: any
}>()

// 計算差異統計
const diffStats = computed(() => {
  let added = 0
  let modified = 0
  let removed = 0
  let unchanged = 0

  // 技術領域
  if (props.version1.technical_domain !== props.version2.technical_domain) {
    modified++
  } else {
    unchanged++
  }

  // CPC 預測
  const cpc1Codes = new Set(props.version1.predicted_cpc?.map(c => c.code) || [])
  const cpc2Codes = new Set(props.version2.predicted_cpc?.map(c => c.code) || [])
  
  cpc2Codes.forEach(code => {
    if (!cpc1Codes.has(code)) added++
  })
  cpc1Codes.forEach(code => {
    if (!cpc2Codes.has(code)) removed++
    else unchanged++
  })

  // 技術特徵
  if (props.version1.total_features !== props.version2.total_features) {
    const diff = props.version2.total_features - props.version1.total_features
    if (diff > 0) added += diff
    else removed += Math.abs(diff)
  }

  // 品質指標
  if (props.version1.has_numerical_ranges !== props.version2.has_numerical_ranges) modified++
  if (props.version1.has_hierarchical_concepts !== props.version2.has_hierarchical_concepts) modified++
  if (props.version1.has_multilevel_terms !== props.version2.has_multilevel_terms) modified++

  return { added, modified, removed, unchanged }
})

// 判斷是否有差異
const hasDiff = (field: string) => {
  switch (field) {
    case 'technical_domain':
      return props.version1.technical_domain !== props.version2.technical_domain ||
             props.version1.domain_confidence !== props.version2.domain_confidence
    case 'predicted_cpc':
      return JSON.stringify(props.version1.predicted_cpc) !== JSON.stringify(props.version2.predicted_cpc)
    case 'features':
      return props.version1.total_features !== props.version2.total_features
    default:
      return false
  }
}

// CPC 查找
const findCPCInVersion2 = (code: string) => {
  return props.version2.predicted_cpc?.some(c => c.code === code)
}

const findCPCInVersion1 = (code: string) => {
  return props.version1.predicted_cpc?.some(c => c.code === code)
}

// 取得技術特徵
const getFeatures = (version: any) => {
  return version.independent_claims?.[0]?.features || []
}

// 品質分數變化
const getScoreChange = () => {
  const score1 = (props.version1.extraction_quality_score || 0) * 100
  const score2 = (props.version2.extraction_quality_score || 0) * 100
  const diff = score2 - score1
  
  if (Math.abs(diff) < 0.1) return '-'
  return diff > 0 ? `+${diff.toFixed(1)}%` : `${diff.toFixed(1)}%`
}

const getScoreChangeClass = () => {
  const score1 = props.version1.extraction_quality_score || 0
  const score2 = props.version2.extraction_quality_score || 0
  const diff = score2 - score1
  
  if (diff > 0.05) return 'positive'
  if (diff < -0.05) return 'negative'
  return 'neutral'
}

// 判斷是否改善
const isImprovement = computed(() => {
  const score1 = props.version1.extraction_quality_score || 0
  const score2 = props.version2.extraction_quality_score || 0
  
  return score2 > score1 + 0.05 ||
         (props.version2.has_numerical_ranges && !props.version1.has_numerical_ranges) ||
         (props.version2.has_hierarchical_concepts && !props.version1.has_hierarchical_concepts)
})

const isRegression = computed(() => {
  const score1 = props.version1.extraction_quality_score || 0
  const score2 = props.version2.extraction_quality_score || 0
  
  return score2 < score1 - 0.05 ||
         (!props.version2.has_numerical_ranges && props.version1.has_numerical_ranges) ||
         (!props.version2.has_hierarchical_concepts && props.version1.has_hierarchical_concepts)
})

const getImprovementSummary = () => {
  const improvements = []
  
  if (props.version2.has_numerical_ranges && !props.version1.has_numerical_ranges) {
    improvements.push('新增了數值範圍提取')
  }
  if (props.version2.has_hierarchical_concepts && !props.version1.has_hierarchical_concepts) {
    improvements.push('新增了上下位概念')
  }
  if (props.version2.has_multilevel_terms && !props.version1.has_multilevel_terms) {
    improvements.push('新增了多層級術語')
  }
  
  const score1 = props.version1.extraction_quality_score || 0
  const score2 = props.version2.extraction_quality_score || 0
  if (score2 > score1) {
    improvements.push(`品質分數提升 ${((score2 - score1) * 100).toFixed(1)}%`)
  }
  
  return improvements.join('、')
}

const getRegressionSummary = () => {
  const regressions = []
  
  if (!props.version2.has_numerical_ranges && props.version1.has_numerical_ranges) {
    regressions.push('遺失了數值範圍提取')
  }
  if (!props.version2.has_hierarchical_concepts && props.version1.has_hierarchical_concepts) {
    regressions.push('遺失了上下位概念')
  }
  
  const score1 = props.version1.extraction_quality_score || 0
  const score2 = props.version2.extraction_quality_score || 0
  if (score2 < score1) {
    regressions.push(`品質分數下降 ${((score1 - score2) * 100).toFixed(1)}%`)
  }
  
  return regressions.join('、')
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-TW', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<style scoped>
.diff-viewer {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.diff-header {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 1rem;
  align-items: center;
  padding: 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  color: white;
}

.version-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.version-label {
  font-size: 0.875rem;
  opacity: 0.9;
}

.version-meta {
  font-size: 1.125rem;
  font-weight: 600;
}

.version-date {
  font-size: 0.875rem;
  opacity: 0.8;
  margin-left: 0.5rem;
}

.diff-icon {
  font-size: 2rem;
  text-align: center;
}

.diff-summary {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

.summary-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
}

.summary-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 1.25rem;
  font-weight: 700;
}

.summary-icon.added {
  background: #d1fae5;
  color: #065f46;
}

.summary-icon.modified {
  background: #fef3c7;
  color: #92400e;
}

.summary-icon.removed {
  background: #fee2e2;
  color: #991b1b;
}

.summary-icon.unchanged {
  background: #f3f4f6;
  color: #6b7280;
}

.summary-content {
  display: flex;
  flex-direction: column;
}

.summary-label {
  font-size: 0.875rem;
  color: #6b7280;
}

.summary-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #374151;
}

.diff-sections {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.diff-section {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1.5rem;
}

.diff-section h4 {
  margin: 0 0 1rem 0;
  color: #374151;
  font-size: 1.125rem;
}

.diff-row {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 1rem;
  align-items: center;
}

.diff-cell {
  padding: 1rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.diff-cell.old {
  background: #fee2e2;
  border: 1px solid #fecaca;
}

.diff-cell.new {
  background: #d1fae5;
  border: 1px solid #a7f3d0;
}

.diff-arrow {
  font-size: 1.5rem;
  color: #6b7280;
}

.domain-badge {
  display: inline-block;
  padding: 0.375rem 0.75rem;
  border-radius: 16px;
  font-size: 0.875rem;
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

.reasoning-diff {
  margin-top: 1rem;
}

.reasoning-diff details {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1rem;
}

.reasoning-diff summary {
  cursor: pointer;
  font-weight: 600;
  color: #374151;
}

.reasoning-comparison {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-top: 1rem;
}

.reasoning-old,
.reasoning-new {
  padding: 1rem;
  border-radius: 8px;
}

.reasoning-old {
  background: #fee2e2;
  border: 1px solid #fecaca;
}

.reasoning-new {
  background: #d1fae5;
  border: 1px solid #a7f3d0;
}

.reasoning-old p,
.reasoning-new p {
  margin: 0.5rem 0 0 0;
  color: #374151;
  line-height: 1.6;
}

.cpc-comparison {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.cpc-column {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1rem;
}

.column-header {
  font-weight: 600;
  color: #374151;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #e5e7eb;
}

.cpc-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: white;
  border-radius: 6px;
  margin-bottom: 0.5rem;
}

.cpc-code {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-family: 'Fira Code', monospace;
  font-size: 0.875rem;
}

.cpc-confidence {
  font-size: 0.875rem;
  color: #6b7280;
}

.diff-badge {
  margin-left: auto;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}

.diff-badge.added {
  background: #d1fae5;
  color: #065f46;
}

.diff-badge.removed {
  background: #fee2e2;
  color: #991b1b;
}

.features-diff {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.feature-stats {
  display: flex;
  gap: 2rem;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 8px;
}

.stat-item {
  display: flex;
  gap: 0.5rem;
}

.stat-item.highlight {
  padding: 0.5rem;
  background: #fef3c7;
  border-radius: 6px;
}

.stat-label {
  color: #6b7280;
}

.stat-value {
  font-weight: 600;
  color: #374151;
}

.quality-diff-table {
  width: 100%;
  border-collapse: collapse;
}

.quality-diff-table th,
.quality-diff-table td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
}

.quality-diff-table th {
  background: #f9fafb;
  font-weight: 600;
  color: #374151;
}

.status-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 600;
}

.status-badge.yes {
  background: #d1fae5;
  color: #065f46;
}

.status-badge.no {
  background: #fee2e2;
  color: #991b1b;
}

.change-indicator {
  font-weight: 600;
}

.change-indicator.positive {
  color: #059669;
}

.change-indicator.negative {
  color: #dc2626;
}

.change-indicator.neutral {
  color: #6b7280;
}

.no-change {
  color: #9ca3af;
}

.json-diff {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-top: 1rem;
}

.json-column {
  display: flex;
  flex-direction: column;
}

.json-header {
  padding: 0.75rem;
  background: #374151;
  color: white;
  font-weight: 600;
  border-radius: 8px 8px 0 0;
}

.json-content {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 1rem;
  border-radius: 0 0 8px 8px;
  overflow-x: auto;
  font-family: 'Fira Code', monospace;
  font-size: 0.75rem;
  line-height: 1.5;
  max-height: 400px;
  overflow-y: auto;
}

.diff-conclusion {
  background: #f9fafb;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  padding: 1.5rem;
}

.diff-conclusion h4 {
  margin: 0 0 1rem 0;
  color: #374151;
}

.conclusion-card {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1.5rem;
  border-radius: 8px;
}

.conclusion-card.improvement {
  background: #d1fae5;
  border: 2px solid #10b981;
}

.conclusion-card.regression {
  background: #fee2e2;
  border: 2px solid #ef4444;
}

.conclusion-card.neutral {
  background: #f3f4f6;
  border: 2px solid #9ca3af;
}

.conclusion-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 1.5rem;
  font-weight: 700;
  flex-shrink: 0;
}

.conclusion-card.improvement .conclusion-icon {
  background: #10b981;
  color: white;
}

.conclusion-card.regression .conclusion-icon {
  background: #ef4444;
  color: white;
}

.conclusion-card.neutral .conclusion-icon {
  background: #9ca3af;
  color: white;
}

.conclusion-text strong {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 1.125rem;
}

.conclusion-text p {
  margin: 0;
  color: #374151;
  line-height: 1.6;
}
</style>
