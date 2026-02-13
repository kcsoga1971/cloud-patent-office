<!-- src/components/dev-tools/PromptVersionComparison.vue -->
<template>
  <div class="version-comparison">
    <div class="comparison-header">
      <h3>📊 Prompt 版本比較</h3>
      <p class="description">
        比較不同 Prompt 版本對同一專利的分析結果，用於評估 Prompt 改進效果
      </p>
    </div>

    <div v-if="data && data.length > 1" class="comparison-content">
      <!-- 版本選擇器 -->
      <div class="version-selector">
        <div class="version-pills">
          <button
            v-for="(version, index) in data"
            :key="version.id"
            :class="['version-pill', { active: selectedVersions.includes(index) }]"
            @click="toggleVersion(index)"
          >
            <span class="version-label">{{ version.prompt_version }}</span>
            <span class="version-date">{{ formatDate(version.created_at) }}</span>
          </button>
        </div>
        <div class="selection-hint">
          點擊選擇要比較的版本（最多 3 個）
        </div>
      </div>

      <!-- 比較表格 -->
      <div v-if="selectedVersions.length >= 2" class="comparison-table">
        <table>
          <thead>
            <tr>
              <th class="metric-column">比較項目</th>
              <th v-for="index in selectedVersions" :key="index">
                {{ data[index].prompt_version }}
              </th>
            </tr>
          </thead>
          <tbody>
            <!-- 基本資訊 -->
            <tr class="section-header">
              <td colspan="100%">📋 基本資訊</td>
            </tr>
            <tr>
              <td class="metric-name">技術領域</td>
              <td v-for="index in selectedVersions" :key="index">
                <span class="domain-badge" :class="data[index].technical_domain">
                  {{ data[index].technical_domain }}
                </span>
              </td>
            </tr>
            <tr>
              <td class="metric-name">領域信心度</td>
              <td v-for="index in selectedVersions" :key="index">
                <div class="confidence-bar">
                  <div
                    class="confidence-fill"
                    :style="{ width: `${data[index].domain_confidence * 100}%` }"
                  ></div>
                  <span class="confidence-text">
                    {{ (data[index].domain_confidence * 100).toFixed(1) }}%
                  </span>
                </div>
              </td>
            </tr>

            <!-- CPC 預測 -->
            <tr class="section-header">
              <td colspan="100%">🏷️ CPC 預測</td>
            </tr>
            <tr>
              <td class="metric-name">主要 CPC</td>
              <td v-for="index in selectedVersions" :key="index">
                <code class="cpc-code">
                  {{ data[index].predicted_cpc?.[0]?.code || 'N/A' }}
                </code>
              </td>
            </tr>
            <tr>
              <td class="metric-name">CPC 信心度</td>
              <td v-for="index in selectedVersions" :key="index">
                {{ ((data[index].predicted_cpc?.[0]?.confidence || 0) * 100).toFixed(1) }}%
              </td>
            </tr>
            <tr>
              <td class="metric-name">CPC 數量</td>
              <td v-for="index in selectedVersions" :key="index">
                {{ data[index].predicted_cpc?.length || 0 }}
              </td>
            </tr>

            <!-- 技術特徵 -->
            <tr class="section-header">
              <td colspan="100%">📝 技術特徵</td>
            </tr>
            <tr>
              <td class="metric-name">總特徵數</td>
              <td v-for="index in selectedVersions" :key="index">
                <strong>{{ data[index].total_features }}</strong>
              </td>
            </tr>
            <tr>
              <td class="metric-name">必要特徵數</td>
              <td v-for="index in selectedVersions" :key="index">
                <strong>{{ data[index].essential_features }}</strong>
              </td>
            </tr>
            <tr>
              <td class="metric-name">獨立項數量</td>
              <td v-for="index in selectedVersions" :key="index">
                {{ data[index].independent_claims?.length || 0 }}
              </td>
            </tr>
            <tr>
              <td class="metric-name">附屬項數量</td>
              <td v-for="index in selectedVersions" :key="index">
                {{ data[index].dependent_claims?.length || 0 }}
              </td>
            </tr>

            <!-- 品質指標 -->
            <tr class="section-header">
              <td colspan="100%">✨ 品質指標</td>
            </tr>
            <tr>
              <td class="metric-name">包含數值範圍</td>
              <td v-for="index in selectedVersions" :key="index">
                <span :class="['status-badge', data[index].has_numerical_ranges ? 'yes' : 'no']">
                  {{ data[index].has_numerical_ranges ? '✓ 是' : '✗ 否' }}
                </span>
              </td>
            </tr>
            <tr>
              <td class="metric-name">包含上下位概念</td>
              <td v-for="index in selectedVersions" :key="index">
                <span :class="['status-badge', data[index].has_hierarchical_concepts ? 'yes' : 'no']">
                  {{ data[index].has_hierarchical_concepts ? '✓ 是' : '✗ 否' }}
                </span>
              </td>
            </tr>
            <tr>
              <td class="metric-name">包含多層級術語</td>
              <td v-for="index in selectedVersions" :key="index">
                <span :class="['status-badge', data[index].has_multilevel_terms ? 'yes' : 'no']">
                  {{ data[index].has_multilevel_terms ? '✓ 是' : '✗ 否' }}
                </span>
              </td>
            </tr>
            <tr>
              <td class="metric-name">品質分數</td>
              <td v-for="index in selectedVersions" :key="index">
                <div class="score-display">
                  <div class="score-bar">
                    <div
                      class="score-fill"
                      :style="{ width: `${(data[index].extraction_quality_score || 0) * 100}%` }"
                    ></div>
                  </div>
                  <span class="score-text">
                    {{ ((data[index].extraction_quality_score || 0) * 100).toFixed(1) }}
                  </span>
                </div>
              </td>
            </tr>

            <!-- 人工審核 -->
            <tr class="section-header">
              <td colspan="100%">✍️ 人工審核</td>
            </tr>
            <tr>
              <td class="metric-name">已驗證</td>
              <td v-for="index in selectedVersions" :key="index">
                <span :class="['status-badge', data[index].human_verified ? 'yes' : 'no']">
                  {{ data[index].human_verified ? '✓ 是' : '✗ 否' }}
                </span>
              </td>
            </tr>
            <tr>
              <td class="metric-name">回饋意見</td>
              <td v-for="index in selectedVersions" :key="index">
                <div class="feedback-cell">
                  {{ data[index].human_feedback || '-' }}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 詳細差異分析 -->
      <div v-if="selectedVersions.length === 2" class="diff-analysis">
        <h4>🔍 詳細差異分析</h4>
        <DiffViewer
          :version1="data[selectedVersions[0]]"
          :version2="data[selectedVersions[1]]"
        />
      </div>
    </div>

    <div v-else-if="data && data.length === 1" class="single-version">
      <p>⚠️ 只有一個版本的分析結果</p>
      <p class="hint">請使用不同的 Prompt 版本重新分析，以進行比較</p>
    </div>

    <div v-else class="empty-state">
      <p>📭 沒有可比較的版本</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  data: any[]
}>()

const selectedVersions = ref<number[]>([0, 1])

const toggleVersion = (index: number) => {
  const currentIndex = selectedVersions.value.indexOf(index)
  
  if (currentIndex > -1) {
    // 取消選擇（但至少保留 1 個）
    if (selectedVersions.value.length > 1) {
      selectedVersions.value.splice(currentIndex, 1)
    }
  } else {
    // 新增選擇（最多 3 個）
    if (selectedVersions.value.length < 3) {
      selectedVersions.value.push(index)
      selectedVersions.value.sort((a, b) => a - b)
    } else {
      alert('最多只能選擇 3 個版本進行比較')
    }
  }
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<style scoped>
.version-comparison {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.comparison-header h3 {
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
}

.description {
  color: #6b7280;
  font-size: 0.95rem;
}

.version-selector {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1.5rem;
}

.version-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.version-pill {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 0.75rem 1rem;
  background: white;
  border: 2px solid #d1d5db;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.version-pill:hover {
  border-color: #2563eb;
  box-shadow: 0 2px 4px rgba(37, 99, 235, 0.1);
}

.version-pill.active {
  background: #2563eb;
  border-color: #2563eb;
  color: white;
}

.version-label {
  font-weight: 600;
  font-size: 1rem;
}

.version-date {
  font-size: 0.75rem;
  opacity: 0.7;
  margin-top: 0.25rem;
}

.selection-hint {
  font-size: 0.875rem;
  color: #6b7280;
  text-align: center;
}

.comparison-table {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 8px;
  overflow: hidden;
}

thead {
  background: #f3f4f6;
}

th {
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  color: #374151;
  border-bottom: 2px solid #e5e7eb;
}

th.metric-column {
  width: 200px;
  position: sticky;
  left: 0;
  background: #f3f4f6;
  z-index: 10;
}

tbody tr {
  border-bottom: 1px solid #e5e7eb;
}

tbody tr:hover {
  background: #f9fafb;
}

.section-header td {
  background: #eff6ff;
  color: #1e40af;
  font-weight: 600;
  padding: 0.75rem 1rem;
}

td {
  padding: 1rem;
  vertical-align: middle;
}

.metric-name {
  font-weight: 500;
  color: #6b7280;
  position: sticky;
  left: 0;
  background: white;
  z-index: 5;
}

tbody tr:hover .metric-name {
  background: #f9fafb;
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

.confidence-bar {
  position: relative;
  height: 24px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
}

.confidence-fill {
  height: 100%;
  background: linear-gradient(90deg, #10b981, #059669);
  transition: width 0.3s;
}

.confidence-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 0.75rem;
  font-weight: 600;
  color: #374151;
}

.cpc-code {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 0.375rem 0.75rem;
  border-radius: 4px;
  font-family: 'Fira Code', monospace;
  font-size: 0.875rem;
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

.score-display {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.score-bar {
  flex: 1;
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
}

.score-fill {
  height: 100%;
  background: linear-gradient(90deg, #f59e0b, #10b981);
  transition: width 0.3s;
}

.score-text {
  font-weight: 600;
  color: #374151;
  min-width: 50px;
  text-align: right;
}

.feedback-cell {
  max-width: 300px;
  font-size: 0.875rem;
  color: #6b7280;
  line-height: 1.5;
}

.diff-analysis {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1.5rem;
  margin-top: 1.5rem;
}

.diff-analysis h4 {
  margin: 0 0 1rem 0;
  color: #374151;
}

.single-version,
.empty-state {
  text-align: center;
  padding: 3rem;
  background: #fef3c7;
  border: 1px solid #fbbf24;
  border-radius: 8px;
}

.single-version p,
.empty-state p {
  margin: 0.5rem 0;
  color: #92400e;
}

.hint {
  font-size: 0.875rem;
  color: #b45309;
}
</style>
