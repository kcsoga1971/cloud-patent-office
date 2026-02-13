<!-- src/components/dev-tools/FeatureExtractionViewer.vue -->
 <template>
  <div class="feature-viewer">
    <div class="domain-section">
      <h3>🎯 技術領域判斷</h3>
      <div class="domain-card">
        <div class="domain-badge" :class="data.technical_domain">
          {{ data.technical_domain }}
        </div>
        <div class="confidence">
          信心度: {{ (data.domain_confidence * 100).toFixed(1) }}%
        </div>
        <p class="reasoning">{{ data.domain_reasoning }}</p>
      </div>
    </div>

    <div class="cpc-section">
      <h3>🏷️ CPC 分類號預測</h3>
      <div v-for="cpc in data.predicted_cpc" :key="cpc.code" class="cpc-card">
        <div class="cpc-code">{{ cpc.code }}</div>
        <div class="cpc-title">{{ cpc.title }}</div>
        <div class="cpc-confidence">
          信心度: {{ (cpc.confidence * 100).toFixed(1) }}%
        </div>
        <p class="cpc-reasoning">{{ cpc.reasoning }}</p>
      </div>
    </div>

    <div class="features-section">
      <h3>📋 技術特徵（獨立項 1）</h3>
      <div v-for="feature in data.independent_claims[0].features" :key="feature.feature_id" class="feature-card">
        <div class="feature-header">
          <span class="feature-id">{{ feature.feature_id }}</span>
          <span v-if="feature.is_essential" class="essential-badge">必要特徵</span>
        </div>
        <div class="feature-text">{{ feature.feature_text }}</div>
        
        <!-- 數值範圍 -->
        <div v-if="feature.numerical_range" class="numerical-range">
          <strong>數值範圍:</strong>
          {{ feature.numerical_range.min }}-{{ feature.numerical_range.max }}
          {{ feature.numerical_range.unit }}
        </div>

        <!-- 上下位概念 -->
        <div v-if="feature.hierarchical_concepts" class="hierarchical">
          <div class="concept-level">
            <strong>上位概念:</strong>
            <span v-for="c in feature.hierarchical_concepts.upper_concepts" :key="c" class="concept-tag">
              {{ c }}
            </span>
          </div>
          <div class="concept-level">
            <strong>目標概念:</strong>
            <span class="concept-tag target">{{ feature.hierarchical_concepts.target_concept }}</span>
          </div>
          <div class="concept-level">
            <strong>下位概念:</strong>
            <span v-for="c in feature.hierarchical_concepts.lower_concepts" :key="c" class="concept-tag">
              {{ c }}
            </span>
          </div>
        </div>

        <!-- 英文術語 -->
        <div v-if="feature.english_terms" class="english-terms">
          <details>
            <summary>📝 英文術語（3 個層級）</summary>
            <div class="term-level">
              <strong>Level 1 (具體):</strong>
              <code v-for="t in feature.english_terms.level_1_specific" :key="t">{{ t }}</code>
            </div>
            <div class="term-level">
              <strong>Level 2 (一般):</strong>
              <code v-for="t in feature.english_terms.level_2_general" :key="t">{{ t }}</code>
            </div>
            <div class="term-level">
              <strong>Level 3 (上位):</strong>
              <code v-for="t in feature.english_terms.level_3_upper" :key="t">{{ t }}</code>
            </div>
          </details>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  data: any
}>()
</script>

<style scoped>
/* 樣式省略，可根據需求調整 */
.feature-viewer {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.domain-badge {
  display: inline-block;
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

.feature-card {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.essential-badge {
  background: #fee2e2;
  color: #991b1b;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
}

.concept-tag {
  display: inline-block;
  background: #f3f4f6;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  margin: 0.25rem;
  font-size: 0.875rem;
}

.concept-tag.target {
  background: #dbeafe;
  color: #1e40af;
  font-weight: 600;
}

code {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.875rem;
  margin: 0.25rem;
  display: inline-block;
}
</style>
