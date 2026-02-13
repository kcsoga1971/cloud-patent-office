<!-- src/components/dev-tools/FeatureDetailViewer.vue -->
<template>
  <div class="feature-detail-viewer">
    <div class="feature-header">
      <div class="feature-id-badge" :class="{ essential: feature.is_essential }">
        {{ feature.feature_id }}
      </div>
      <h3 class="feature-text">{{ feature.feature_text }}</h3>
      <span v-if="feature.is_essential" class="essential-tag">必要特徵</span>
    </div>

    <div class="detail-sections">
      <!-- 基本資訊 -->
      <div class="detail-section">
        <h4>📋 基本資訊</h4>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">特徵 ID：</span>
            <span class="info-value">{{ feature.feature_id }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">原始 ID：</span>
            <span class="info-value">{{ feature.original_feature_id }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">特徵類型：</span>
            <span class="info-value">
              <span class="type-badge" :class="feature.feature_type">
                {{ getFeatureTypeLabel(feature.feature_type) }}
              </span>
            </span>
          </div>
          <div class="info-item">
            <span class="info-label">是否必要：</span>
            <span class="info-value">
              <span :class="['status-badge', feature.is_essential ? 'yes' : 'no']">
                {{ feature.is_essential ? '✓ 是' : '✗ 否' }}
              </span>
            </span>
          </div>
        </div>
      </div>

      <!-- 數值範圍（如果有） -->
      <div v-if="feature.numerical_range" class="detail-section numerical">
        <h4>📊 數值範圍</h4>
        <div class="numerical-display">
          <div class="range-visual">
            <div class="range-bar">
              <div class="range-min">{{ feature.numerical_range.min }}</div>
              <div class="range-line"></div>
              <div class="range-max">{{ feature.numerical_range.max }}</div>
            </div>
            <div class="range-unit">{{ feature.numerical_range.unit }}</div>
          </div>
          <div class="range-details">
            <div class="range-item">
              <span class="range-label">最小值：</span>
              <span class="range-value">{{ feature.numerical_range.min }} {{ feature.numerical_range.unit }}</span>
            </div>
            <div class="range-item">
              <span class="range-label">最大值：</span>
              <span class="range-value">{{ feature.numerical_range.max }} {{ feature.numerical_range.unit }}</span>
            </div>
            <div v-if="feature.numerical_range.preferred_min" class="range-item preferred">
              <span class="range-label">偏好範圍：</span>
              <span class="range-value">
                {{ feature.numerical_range.preferred_min }}-{{ feature.numerical_range.preferred_max }}
                {{ feature.numerical_range.unit }}
              </span>
            </div>
            <div class="range-item">
              <span class="range-label">原始文字：</span>
              <span class="range-value original">{{ feature.numerical_range.original_text }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 上下位概念 -->
      <div v-if="feature.hierarchical_concepts" class="detail-section hierarchical">
        <h4>🌳 上下位概念樹</h4>
        <div class="concept-tree">
          <!-- 上位概念 -->
          <div v-if="feature.hierarchical_concepts.upper_concepts?.length" class="concept-level upper">
            <div class="level-header">
              <span class="level-icon">⬆️</span>
              <span class="level-title">上位概念（更抽象）</span>
            </div>
            <div class="concept-tags">
              <div
                v-for="(concept, index) in feature.hierarchical_concepts.upper_concepts"
                :key="index"
                class="concept-tag upper"
              >
                {{ concept }}
              </div>
            </div>
          </div>

          <!-- 目標概念 -->
          <div class="concept-level target">
            <div class="level-header">
              <span class="level-icon">🎯</span>
              <span class="level-title">目標概念（專利使用）</span>
            </div>
            <div class="concept-tags">
              <div class="concept-tag target-main">
                {{ feature.hierarchical_concepts.target_concept }}
              </div>
            </div>
          </div>

          <!-- 下位概念 -->
          <div v-if="feature.hierarchical_concepts.lower_concepts?.length" class="concept-level lower">
            <div class="level-header">
              <span class="level-icon">⬇️</span>
              <span class="level-title">下位概念（更具體）</span>
            </div>
            <div class="concept-tags">
              <div
                v-for="(concept, index) in feature.hierarchical_concepts.lower_concepts"
                :key="index"
                class="concept-tag lower"
              >
                {{ concept }}
              </div>
            </div>
          </div>

          <!-- 具體實例 -->
          <div v-if="feature.hierarchical_concepts.specific_examples?.length" class="concept-level examples">
            <div class="level-header">
              <span class="level-icon">💡</span>
              <span class="level-title">具體實例</span>
            </div>
            <div class="concept-tags">
              <div
                v-for="(example, index) in feature.hierarchical_concepts.specific_examples"
                :key="index"
                class="concept-tag example"
              >
                {{ example }}
              </div>
            </div>
          </div>
        </div>

        <!-- 概念關係圖 -->
        <div class="concept-diagram">
          <div class="diagram-title">概念層級關係圖</div>
          <div class="diagram-content">
            <svg viewBox="0 0 400 300" class="hierarchy-svg">
              <!-- 上位概念 -->
              <g v-if="feature.hierarchical_concepts.upper_concepts?.length">
                <rect x="150" y="20" width="100" height="40" rx="8" class="node upper" />
                <text x="200" y="45" text-anchor="middle" class="node-text">上位概念</text>
                <line x1="200" y1="60" x2="200" y2="90" class="connector" />
              </g>
              
              <!-- 目標概念 -->
              <g>
                <rect x="150" y="100" width="100" height="40" rx="8" class="node target" />
                <text x="200" y="125" text-anchor="middle" class="node-text">目標概念</text>
                <line x1="200" y1="140" x2="200" y2="170" class="connector" />
              </g>
              
              <!-- 下位概念 -->
              <g v-if="feature.hierarchical_concepts.lower_concepts?.length">
                <rect x="150" y="180" width="100" height="40" rx="8" class="node lower" />
                <text x="200" y="205" text-anchor="middle" class="node-text">下位概念</text>
                <line x1="200" y1="220" x2="200" y2="250" class="connector" />
              </g>
              
              <!-- 具體實例 -->
              <g v-if="feature.hierarchical_concepts.specific_examples?.length">
                <rect x="150" y="260" width="100" height="30" rx="8" class="node example" />
                <text x="200" y="280" text-anchor="middle" class="node-text small">具體實例</text>
              </g>
            </svg>
          </div>
        </div>
      </div>

      <!-- 多層級英文術語 -->
      <div v-if="feature.english_terms" class="detail-section terms">
        <h4>🌐 多層級英文術語</h4>
        <p class="terms-description">
          用於檢索的英文術語，分為 3 個層級以平衡精準度與涵蓋率
        </p>

        <div class="terms-levels">
          <!-- Level 1: 具體術語 -->
          <div class="terms-level level-1">
            <div class="terms-level-header">
              <span class="level-badge">Level 1</span>
              <span class="level-name">具體術語</span>
              <span class="level-desc">精準度最高</span>
            </div>
            <div class="terms-list">
              <code
                v-for="(term, index) in feature.english_terms.level_1_specific"
                :key="index"
                class="term-tag level-1"
              >
                {{ term }}
              </code>
            </div>
          </div>

          <!-- Level 2: 一般術語 -->
          <div class="terms-level level-2">
            <div class="terms-level-header">
              <span class="level-badge">Level 2</span>
              <span class="level-name">一般術語</span>
              <span class="level-desc">平衡精準度與涵蓋率</span>
            </div>
            <div class="terms-list">
              <code
                v-for="(term, index) in feature.english_terms.level_2_general"
                :key="index"
                class="term-tag level-2"
              >
                {{ term }}
              </code>
            </div>
          </div>

          <!-- Level 3: 上位術語 -->
          <div class="terms-level level-3">
            <div class="terms-level-header">
              <span class="level-badge">Level 3</span>
              <span class="level-name">上位術語</span>
              <span class="level-desc">涵蓋率最高</span>
            </div>
            <div class="terms-list">
              <code
                v-for="(term, index) in feature.english_terms.level_3_upper"
                :key="index"
                class="term-tag level-3"
              >
                {{ term }}
              </code>
            </div>
          </div>
        </div>

        <!-- 術語統計 -->
        <div class="terms-stats">
          <div class="stat-card">
            <div class="stat-label">Level 1 術語數</div>
            <div class="stat-value">{{ feature.english_terms.level_1_specific?.length || 0 }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Level 2 術語數</div>
            <div class="stat-value">{{ feature.english_terms.level_2_general?.length || 0 }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Level 3 術語數</div>
            <div class="stat-value">{{ feature.english_terms.level_3_upper?.length || 0 }}</div>
          </div>
          <div class="stat-card total">
            <div class="stat-label">總術語數</div>
            <div class="stat-value">{{ getTotalTerms() }}</div>
          </div>
        </div>
      </div>

      <!-- 檢索建議 -->
      <div class="detail-section recommendations">
        <h4>💡 檢索建議</h4>
        <div class="recommendation-cards">
          <div class="recommendation-card">
            <div class="recommendation-icon">🎯</div>
            <div class="recommendation-content">
              <strong>精準檢索：</strong>
              <p>使用 Level 1 具體術語{{ feature.numerical_range ? ' + 數值範圍' : '' }}</p>
              <code class="search-example">
                {{ generatePreciseQuery() }}
              </code>
            </div>
          </div>

          <div class="recommendation-card">
            <div class="recommendation-icon">⚖️</div>
            <div class="recommendation-content">
              <strong>平衡檢索：</strong>
              <p>使用 Level 1 + Level 2 術語</p>
              <code class="search-example">
                {{ generateBalancedQuery() }}
              </code>
            </div>
          </div>

          <div class="recommendation-card">
            <div class="recommendation-icon">🌐</div>
            <div class="recommendation-content">
              <strong>廣泛檢索：</strong>
              <p>使用 Level 3 上位術語</p>
              <code class="search-example">
                {{ generateBroadQuery() }}
              </code>
            </div>
          </div>
        </div>
      </div>

      <!-- 原始 JSON -->
      <div class="detail-section raw">
        <h4>🔧 原始 JSON 資料</h4>
        <details>
          <summary>展開查看完整 JSON</summary>
          <pre class="json-viewer">{{ JSON.stringify(feature, null, 2) }}</pre>
        </details>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  feature: any
}>()

const getFeatureTypeLabel = (type: string) => {
  const labels = {
    chemical_component: '化學成分',
    parameter: '參數',
    method: '方法',
    effect: '效果',
    structure: '結構',
    function: '功能'
  }
  return labels[type] || type
}

const getTotalTerms = () => {
  const level1 = props.feature.english_terms?.level_1_specific?.length || 0
  const level2 = props.feature.english_terms?.level_2_general?.length || 0
  const level3 = props.feature.english_terms?.level_3_upper?.length || 0
  return level1 + level2 + level3
}

const generatePreciseQuery = () => {
  const terms = props.feature.english_terms?.level_1_specific?.slice(0, 2) || []
  let query = terms.map(t => `"${t}"`).join(' OR ')
  
  if (props.feature.numerical_range) {
    const range = `${props.feature.numerical_range.min}-${props.feature.numerical_range.max}`
    query += ` AND "${range}"`
  }
  
  return query || '(無術語)'
}

const generateBalancedQuery = () => {
  const level1 = props.feature.english_terms?.level_1_specific?.slice(0, 2) || []
  const level2 = props.feature.english_terms?.level_2_general?.slice(0, 2) || []
  const terms = [...level1, ...level2]
  return terms.map(t => `"${t}"`).join(' OR ') || '(無術語)'
}

const generateBroadQuery = () => {
  const terms = props.feature.english_terms?.level_3_upper?.slice(0, 3) || []
  return terms.map(t => `"${t}"`).join(' OR ') || '(無術語)'
}
</script>

<style scoped>
.feature-detail-viewer {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.feature-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  color: white;
}

.feature-id-badge {
  padding: 0.75rem 1rem;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  font-weight: 700;
  font-size: 1.125rem;
  flex-shrink: 0;
}

.feature-id-badge.essential {
  background: #fbbf24;
  color: #78350f;
}

.feature-text {
  flex: 1;
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.essential-tag {
  padding: 0.5rem 1rem;
  background: #fbbf24;
  color: #78350f;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 600;
  flex-shrink: 0;
}

.detail-sections {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.detail-section {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1.5rem;
}

.detail-section h4 {
  margin: 0 0 1rem 0;
  color: #374151;
  font-size: 1.125rem;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.info-item {
  display: flex;
  gap: 0.5rem;
}

.info-label {
  color: #6b7280;
  font-weight: 500;
}

.info-value {
  color: #374151;
  font-weight: 600;
}

.type-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 600;
}

.type-badge.chemical_component {
  background: #dbeafe;
  color: #1e40af;
}

.type-badge.parameter {
  background: #fef3c7;
  color: #92400e;
}

.status-badge {
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

.numerical-display {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.range-visual {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  color: white;
}

.range-bar {
  display: flex;
  align-items: center;
  gap: 1rem;
  width: 100%;
  max-width: 400px;
}

.range-min,
.range-max {
  font-size: 1.5rem;
  font-weight: 700;
  padding: 0.75rem 1rem;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 8px;
}

.range-line {
  flex: 1;
  height: 4px;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 2px;
  position: relative;
}

.range-line::before,
.range-line::after {
  content: '';
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 12px;
  height: 12px;
  background: white;
  border-radius: 50%;
}

.range-line::before {
  left: 0;
}

.range-line::after {
  right: 0;
}

.range-unit {
  font-size: 1.125rem;
  font-weight: 600;
  opacity: 0.9;
}

.range-details {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 8px;
}

.range-item {
  display: flex;
  gap: 0.5rem;
}

.range-item.preferred {
  background: #fef3c7;
  padding: 0.5rem;
  border-radius: 6px;
}

.range-label {
  color: #6b7280;
  font-weight: 500;
  min-width: 100px;
}

.range-value {
  color: #374151;
  font-weight: 600;
}

.range-value.original {
  font-family: 'Fira Code', monospace;
  font-size: 0.875rem;
}

.concept-tree {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.concept-level {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.level-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  color: #374151;
}

.level-icon {
  font-size: 1.25rem;
}

.level-title {
  font-size: 1rem;
}

.concept-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.concept-tag {
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  transition: transform 0.2s;
}

.concept-tag:hover {
  transform: translateY(-2px);
}

.concept-tag.upper {
  background: #dbeafe;
  color: #1e40af;
  border: 2px solid #93c5fd;
}

.concept-tag.target-main {
  background: #fbbf24;
  color: #78350f;
  border: 2px solid #f59e0b;
  font-weight: 700;
  font-size: 1rem;
}

.concept-tag.lower {
  background: #d1fae5;
  color: #065f46;
  border: 2px solid #6ee7b7;
}

.concept-tag.example {
  background: #e0e7ff;
  color: #3730a3;
  border: 2px solid #a5b4fc;
}

.concept-diagram {
  margin-top: 2rem;
  padding: 1.5rem;
  background: #f9fafb;
  border-radius: 12px;
}

.diagram-title {
  text-align: center;
  font-weight: 600;
  color: #374151;
  margin-bottom: 1rem;
}

.hierarchy-svg {
  width: 100%;
  height: auto;
}

.node {
  fill: white;
  stroke-width: 2;
}

.node.upper {
  fill: #dbeafe;
  stroke: #3b82f6;
}

.node.target {
  fill: #fbbf24;
  stroke: #f59e0b;
}

.node.lower {
  fill: #d1fae5;
  stroke: #10b981;
}

.node.example {
  fill: #e0e7ff;
  stroke: #6366f1;
}

.node-text {
  fill: #374151;
  font-size: 12px;
  font-weight: 600;
}

.node-text.small {
  font-size: 10px;
}

.connector {
  stroke: #9ca3af;
  stroke-width: 2;
  stroke-dasharray: 5, 5;
}

.terms-description {
  color: #6b7280;
  margin-bottom: 1rem;
}

.terms-levels {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.terms-level {
  border-radius: 12px;
  padding: 1.5rem;
}

.terms-level.level-1 {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  border: 2px solid #3b82f6;
}

.terms-level.level-2 {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border: 2px solid #f59e0b;
}

.terms-level.level-3 {
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
  border: 2px solid #10b981;
}

.terms-level-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.level-badge {
  padding: 0.375rem 0.75rem;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 700;
}

.level-name {
  font-weight: 600;
  font-size: 1rem;
}

.level-desc {
  margin-left: auto;
  font-size: 0.875rem;
  opacity: 0.8;
}

.terms-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.term-tag {
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  font-family: 'Fira Code', monospace;
  font-size: 0.875rem;
  font-weight: 500;
}

.term-tag.level-1 {
  background: #1e40af;
  color: #dbeafe;
}

.term-tag.level-2 {
  background: #92400e;
  color: #fef3c7;
}

.term-tag.level-3 {
  background: #065f46;
  color: #d1fae5;
}

.terms-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-top: 1.5rem;
}

.stat-card {
  padding: 1rem;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  text-align: center;
}

.stat-card.total {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
}

.stat-label {
  font-size: 0.875rem;
  color: #6b7280;
  margin-bottom: 0.5rem;
}

.stat-card.total .stat-label {
  color: rgba(255, 255, 255, 0.9);
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #374151;
}

.stat-card.total .stat-value {
  color: white;
}

.recommendation-cards {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.recommendation-card {
  display: flex;
  gap: 1rem;
  padding: 1.5rem;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  transition: all 0.2s;
}

.recommendation-card:hover {
  background: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.recommendation-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.recommendation-content {
  flex: 1;
}

.recommendation-content strong {
  display: block;
  margin-bottom: 0.5rem;
  color: #374151;
  font-size: 1rem;
}

.recommendation-content p {
  margin: 0 0 0.75rem 0;
  color: #6b7280;
  font-size: 0.875rem;
}

.search-example {
  display: block;
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 0.75rem;
  border-radius: 6px;
  font-family: 'Fira Code', monospace;
  font-size: 0.875rem;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
}

.json-viewer {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 1rem;
  border-radius: 8px;
  overflow-x: auto;
  font-family: 'Fira Code', monospace;
  font-size: 0.875rem;
  line-height: 1.5;
  margin-top: 1rem;
}

details {
  cursor: pointer;
}

details summary {
  font-weight: 600;
  color: #374151;
  user-select: none;
}

details summary:hover {
  color: #2563eb;
}
</style>
  
