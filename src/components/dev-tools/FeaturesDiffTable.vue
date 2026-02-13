<!-- src/components/dev-tools/FeaturesDiffTable.vue -->
<template>
  <div class="features-diff-table">
    <table>
      <thead>
        <tr>
          <th>特徵 ID</th>
          <th>版本 A</th>
          <th>版本 B</th>
          <th>狀態</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="diff in featureDiffs" :key="diff.id" :class="diff.status">
          <td class="feature-id-cell">
            {{ diff.id }}
          </td>
          <td class="feature-content-cell">
            <div v-if="diff.feature1" class="feature-content">
              <div class="feature-text">{{ diff.feature1.feature_text }}</div>
              <div class="feature-meta">
                <span v-if="diff.feature1.is_essential" class="essential-badge">必要</span>
                <span class="type-badge">{{ diff.feature1.feature_type }}</span>
                <span class="terms-count">
                  術語: {{ countTerms(diff.feature1) }}
                </span>
              </div>
            </div>
            <div v-else class="empty-cell">-</div>
          </td>
          <td class="feature-content-cell">
            <div v-if="diff.feature2" class="feature-content">
              <div class="feature-text">{{ diff.feature2.feature_text }}</div>
              <div class="feature-meta">
                <span v-if="diff.feature2.is_essential" class="essential-badge">必要</span>
                <span class="type-badge">{{ diff.feature2.feature_type }}</span>
                <span class="terms-count">
                  術語: {{ countTerms(diff.feature2) }}
                </span>
              </div>
            </div>
            <div v-else class="empty-cell">-</div>
          </td>
          <td class="status-cell">
            <span :class="['status-badge', diff.status]">
              {{ getStatusLabel(diff.status) }}
            </span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  features1: any[]
  features2: any[]
}>()

// 計算特徵差異
const featureDiffs = computed(() => {
  const diffs = []
  const ids1 = new Set(props.features1.map(f => f.feature_id))
  const ids2 = new Set(props.features2.map(f => f.feature_id))
  const allIds = new Set([...ids1, ...ids2])

  allIds.forEach(id => {
    const feature1 = props.features1.find(f => f.feature_id === id)
    const feature2 = props.features2.find(f => f.feature_id === id)

    let status = 'unchanged'
    if (!feature1) status = 'added'
    else if (!feature2) status = 'removed'
    else if (JSON.stringify(feature1) !== JSON.stringify(feature2)) status = 'modified'

    diffs.push({
      id,
      feature1,
      feature2,
      status
    })
  })

  return diffs.sort((a, b) => a.id.localeCompare(b.id))
})

// 計算術語數量
const countTerms = (feature: any) => {
  if (!feature.english_terms) return 0
  const level1 = feature.english_terms.level_1_specific?.length || 0
  const level2 = feature.english_terms.level_2_general?.length || 0
  const level3 = feature.english_terms.level_3_upper?.length || 0
  return level1 + level2 + level3
}

// 取得狀態標籤
const getStatusLabel = (status: string) => {
  const labels = {
    added: '➕ 新增',
    removed: '➖ 刪除',
    modified: '✏️ 修改',
    unchanged: '✓ 相同'
  }
  return labels[status] || status
}
</script>

<style scoped>
.features-diff-table {
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

tbody tr {
  border-bottom: 1px solid #e5e7eb;
  transition: background 0.2s;
}

tbody tr:hover {
  background: #f9fafb;
}

tbody tr.added {
  background: #d1fae5;
}

tbody tr.removed {
  background: #fee2e2;
}

tbody tr.modified {
  background: #fef3c7;
}

td {
  padding: 1rem;
  vertical-align: top;
}

.feature-id-cell {
  font-weight: 700;
  color: #374151;
  white-space: nowrap;
}

.feature-content-cell {
  max-width: 400px;
}

.feature-content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.feature-text {
  color: #374151;
  line-height: 1.5;
  font-size: 0.875rem;
}

.feature-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.essential-badge,
.type-badge,
.terms-count {
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}

.essential-badge {
  background: #fbbf24;
  color: #78350f;
}

.type-badge {
  background: #e0e7ff;
  color: #3730a3;
}

.terms-count {
  background: #f3f4f6;
  color: #6b7280;
}

.empty-cell {
  color: #9ca3af;
  font-style: italic;
}

.status-cell {
  white-space: nowrap;
}

.status-badge {
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 600;
}

.status-badge.added {
  background: #10b981;
  color: white;
}

.status-badge.removed {
  background: #ef4444;
  color: white;
}

.status-badge.modified {
  background: #f59e0b;
  color: white;
}

.status-badge.unchanged {
  background: #f3f4f6;
  color: #6b7280;
}
</style>

