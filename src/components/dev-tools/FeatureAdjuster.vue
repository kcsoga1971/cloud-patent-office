<!-- src/components/dev-tools/FeatureAdjuster.vue -->
<template>
  <div class="feature-adjuster">
    <div class="adjuster-header">
      <h3>🔧 技術特徵調整器</h3>
      <p class="subtitle">手動調整技術特徵、英文術語、數值範圍，並重新生成檢索策略</p>
    </div>

    <div class="adjuster-layout">
      <!-- 左側：特徵列表 -->
      <div class="features-list-panel">
        <div class="panel-header">
          <h4>📋 技術特徵列表</h4>
          <button @click="addNewFeature" class="add-feature-btn">
            ➕ 新增特徵
          </button>
        </div>

        <div class="features-list">
          <div
            v-for="(feature, index) in features"
            :key="feature.feature_id"
            :class="['feature-item', { selected: selectedFeatureIndex === index }]"
            @click="selectFeature(index)"
          >
            <div class="feature-item-header">
              <span class="feature-id">{{ feature.feature_id }}</span>
              <span v-if="feature.is_essential" class="essential-badge">必要</span>
              <button @click.stop="deleteFeature(index)" class="delete-btn">🗑️</button>
            </div>
            <div class="feature-text-preview">
              {{ feature.feature_text }}
            </div>
            <div v-if="feature.modified" class="modified-indicator">
              ✏️ 已修改
            </div>
          </div>
        </div>
      </div>

      <!-- 右側：特徵編輯器 -->
      <div v-if="selectedFeature" class="feature-editor-panel">
        <div class="panel-header">
          <h4>✏️ 編輯特徵：{{ selectedFeature.feature_id }}</h4>
          <div class="editor-actions">
            <button @click="resetFeature" class="reset-btn">
              ↺ 重置
            </button>
            <button @click="saveFeature" class="save-btn">
              💾 儲存
            </button>
          </div>
        </div>

        <div class="editor-sections">
          <!-- 基本資訊 -->
          <div class="editor-section">
            <h5>📋 基本資訊</h5>
            <div class="form-group">
              <label>特徵描述：</label>
              <textarea
                v-model="selectedFeature.feature_text"
                class="feature-textarea"
                rows="3"
              ></textarea>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>特徵類型：</label>
                <select v-model="selectedFeature.feature_type" class="form-select">
                  <option value="chemical_component">化學成分</option>
                  <option value="parameter">參數</option>
                  <option value="method">方法</option>
                  <option value="effect">效果</option>
                  <option value="structure">結構</option>
                  <option value="function">功能</option>
                </select>
              </div>
              <div class="form-group">
                <label>
                  <input v-model="selectedFeature.is_essential" type="checkbox" />
                  必要特徵
                </label>
              </div>
            </div>
          </div>

          <!-- 數值範圍 -->
          <div class="editor-section">
            <h5>📊 數值範圍</h5>
            <div class="form-group">
              <label>
                <input v-model="hasNumericalRange" type="checkbox" />
                包含數值範圍
              </label>
            </div>
            <div v-if="hasNumericalRange" class="numerical-form">
              <div class="form-row">
                <div class="form-group">
                  <label>最小值：</label>
                  <input
                    v-model.number="selectedFeature.numerical_range.min"
                    type="number"
                    class="form-input"
                  />
                </div>
                <div class="form-group">
                  <label>最大值：</label>
                  <input
                    v-model.number="selectedFeature.numerical_range.max"
                    type="number"
                    class="form-input"
                  />
                </div>
                <div class="form-group">
                  <label>單位：</label>
                  <input
                    v-model="selectedFeature.numerical_range.unit"
                    type="text"
                    class="form-input"
                    placeholder="例如：wt%, °C"
                  />
                </div>
              </div>
              <div class="form-group">
                <label>原始文字：</label>
                <input
                  v-model="selectedFeature.numerical_range.original_text"
                  type="text"
                  class="form-input"
                  placeholder="例如：5 to 25 wt%"
                />
              </div>
            </div>
          </div>

          <!-- 英文術語 -->
          <div class="editor-section">
            <h5>🌐 英文術語（3 個層級）</h5>
            
            <!-- Level 1 -->
            <div class="terms-editor">
              <div class="terms-level-header">
                <span class="level-badge level-1">Level 1</span>
                <span>具體術語</span>
              </div>
              <div class="terms-input-group">
                <input
                  v-model="newTerm.level1"
                  type="text"
                  class="term-input"
                  placeholder="輸入術語後按 Enter"
                  @keyup.enter="addTerm('level_1_specific')"
                />
                <button @click="addTerm('level_1_specific')" class="add-term-btn">
                  ➕
                </button>
              </div>
              <div class="terms-tags">
                <span
                  v-for="(term, index) in selectedFeature.english_terms.level_1_specific"
                  :key="index"
                  class="term-tag level-1"
                >
                  {{ term }}
                  <button @click="removeTerm('level_1_specific', index)" class="remove-term-btn">
                    ✕
                  </button>
                </span>
              </div>
            </div>

            <!-- Level 2 -->
            <div class="terms-editor">
              <div class="terms-level-header">
                <span class="level-badge level-2">Level 2</span>
                <span>一般術語</span>
              </div>
              <div class="terms-input-group">
                <input
                  v-model="newTerm.level2"
                  type="text"
                  class="term-input"
                  placeholder="輸入術語後按 Enter"
                  @keyup.enter="addTerm('level_2_general')"
                />
                <button @click="addTerm('level_2_general')" class="add-term-btn">
                  ➕
                </button>
              </div>
              <div class="terms-tags">
                <span
                  v-for="(term, index) in selectedFeature.english_terms.level_2_general"
                  :key="index"
                  class="term-tag level-2"
                >
                  {{ term }}
                  <button @click="removeTerm('level_2_general', index)" class="remove-term-btn">
                    ✕
                  </button>
                </span>
              </div>
            </div>

            <!-- Level 3 -->
            <div class="terms-editor">
              <div class="terms-level-header">
                <span class="level-badge level-3">Level 3</span>
                <span>上位術語</span>
              </div>
              <div class="terms-input-group">
                <input
                  v-model="newTerm.level3"
                  type="text"
                  class="term-input"
                  placeholder="輸入術語後按 Enter"
                  @keyup.enter="addTerm('level_3_upper')"
                />
                <button @click="addTerm('level_3_upper')" class="add-term-btn">
                  ➕
                </button>
              </div>
              <div class="terms-tags">
                <span
                  v-for="(term, index) in selectedFeature.english_terms.level_3_upper"
                  :key="index"
                  class="term-tag level-3"
                >
                  {{ term }}
                  <button @click="removeTerm('level_3_upper', index)" class="remove-term-btn">
                    ✕
                  </button>
                </span>
              </div>
            </div>
          </div>

          <!-- 上下位概念 -->
          <div class="editor-section">
            <h5>🌳 上下位概念</h5>
            <div class="concept-editor">
              <div class="concept-group">
                <label>上位概念：</label>
                <div class="concept-input-group">
                  <input
                    v-model="newConcept.upper"
                    type="text"
                    class="concept-input"
                    placeholder="輸入概念後按 Enter"
                    @keyup.enter="addConcept('upper_concepts')"
                  />
                  <button @click="addConcept('upper_concepts')" class="add-concept-btn">
                    ➕
                  </button>
                </div>
                <div class="concept-tags">
                  <span
                    v-for="(concept, index) in selectedFeature.hierarchical_concepts.upper_concepts"
                    :key="index"
                    class="concept-tag upper"
                  >
                    {{ concept }}
                    <button @click="removeConcept('upper_concepts', index)" class="remove-concept-btn">
                      ✕
                    </button>
                  </span>
                </div>
              </div>

              <div class="concept-group">
                <label>目標概念：</label>
                <input
                  v-model="selectedFeature.hierarchical_concepts.target_concept"
                  type="text"
                  class="concept-input"
                />
              </div>

              <div class="concept-group">
                <label>下位概念：</label>
                <div class="concept-input-group">
                  <input
                    v-model="newConcept.lower"
                    type="text"
                    class="concept-input"
                    placeholder="輸入概念後按 Enter"
                    @keyup.enter="addConcept('lower_concepts')"
                  />
                  <button @click="addConcept('lower_concepts')" class="add-concept-btn">
                    ➕
                  </button>
                </div>
                <div class="concept-tags">
                  <span
                    v-for="(concept, index) in selectedFeature.hierarchical_concepts.lower_concepts"
                    :key="index"
                    class="concept-tag lower"
                  >
                    {{ concept }}
                    <button @click="removeConcept('lower_concepts', index)" class="remove-concept-btn">
                      ✕
                    </button>
                  </span>
                </div>
              </div>

              <div class="concept-group">
                <label>具體實例：</label>
                <div class="concept-input-group">
                  <input
                    v-model="newConcept.example"
                    type="text"
                    class="concept-input"
                    placeholder="輸入實例後按 Enter"
                    @keyup.enter="addConcept('specific_examples')"
                  />
                  <button @click="addConcept('specific_examples')" class="add-concept-btn">
                    ➕
                  </button>
                </div>
                <div class="concept-tags">
                  <span
                    v-for="(example, index) in selectedFeature.hierarchical_concepts.specific_examples"
                    :key="index"
                    class="concept-tag example"
                  >
                    {{ example }}
                    <button @click="removeConcept('specific_examples', index)" class="remove-concept-btn">
                      ✕
                    </button>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="empty-editor">
        <p>👈 請選擇一個技術特徵進行編輯</p>
      </div>
    </div>

    <!-- 底部：重新生成檢索策略 -->
    <div class="regenerate-section">
      <div class="regenerate-header">
        <h4>🔄 重新生成檢索策略</h4>
        <p>根據調整後的技術特徵，重新生成 3 個層級的檢索策略</p>
      </div>
      <div class="regenerate-actions">
        <button @click="regenerateStrategies" :disabled="regenerating" class="regenerate-btn">
          {{ regenerating ? '生成中...' : '🚀 重新生成檢索策略' }}
        </button>
      </div>

      <!-- 生成的檢索策略 -->
      <div v-if="generatedStrategies" class="generated-strategies">
        <h5>✅ 生成的檢索策略</h5>
        <SearchStrategyViewer :data="{ independent_claims: [{ search_strategies: generatedStrategies }] }" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import SearchStrategyViewer from './SearchStrategyViewer.vue'

const props = defineProps<{
  initialFeatures: any[]
  technicalDomain: string
  predictedCpc: any[]
}>()

const features = ref(JSON.parse(JSON.stringify(props.initialFeatures)))
const selectedFeatureIndex = ref(0)
const regenerating = ref(false)
const generatedStrategies = ref(null)

const newTerm = ref({
  level1: '',
  level2: '',
  level3: ''
})

const newConcept = ref({
  upper: '',
  lower: '',
  example: ''
})

const selectedFeature = computed(() => {
  return features.value[selectedFeatureIndex.value]
})

const hasNumericalRange = computed({
  get() {
    return !!selectedFeature.value?.numerical_range
  },
  set(value) {
    if (value && !selectedFeature.value.numerical_range) {
      selectedFeature.value.numerical_range = {
        min: 0,
        max: 100,
        unit: '',
        original_text: ''
      }
    } else if (!value) {
      delete selectedFeature.value.numerical_range
    }
  }
})

// 選擇特徵
const selectFeature = (index: number) => {
  selectedFeatureIndex.value = index
}

// 新增特徵
const addNewFeature = () => {
  const newFeature = {
    feature_id: `1-${String.fromCharCode(65 + features.value.length)}`,
    original_feature_id: String.fromCharCode(65 + features.value.length),
    feature_text: '新技術特徵',
    feature_type: 'chemical_component',
    is_essential: true,
    english_terms: {
      level_1_specific: [],
      level_2_general: [],
      level_3_upper: []
    },
    hierarchical_concepts: {
      upper_concepts: [],
      target_concept: '',
      lower_concepts: [],
      specific_examples: []
    },
    modified: true
  }
  
  features.value.push(newFeature)
  selectedFeatureIndex.value = features.value.length - 1
}

// 刪除特徵
const deleteFeature = (index: number) => {
  if (confirm('確定要刪除這個技術特徵嗎？')) {
    features.value.splice(index, 1)
    if (selectedFeatureIndex.value >= features.value.length) {
      selectedFeatureIndex.value = features.value.length - 1
    }
  }
}

// 新增術語
const addTerm = (level: string) => {
  let termValue = ''
  if (level === 'level_1_specific') termValue = newTerm.value.level1
  else if (level === 'level_2_general') termValue = newTerm.value.level2
  else if (level === 'level_3_upper') termValue = newTerm.value.level3
  
  if (termValue.trim()) {
    if (!selectedFeature.value.english_terms[level]) {
      selectedFeature.value.english_terms[level] = []
    }
    selectedFeature.value.english_terms[level].push(termValue.trim())
    
    if (level === 'level_1_specific') newTerm.value.level1 = ''
    else if (level === 'level_2_general') newTerm.value.level2 = ''
    else if (level === 'level_3_upper') newTerm.value.level3 = ''
    
    markAsModified()
  }
}

// 刪除術語
const removeTerm = (level: string, index: number) => {
  selectedFeature.value.english_terms[level].splice(index, 1)
  markAsModified()
}

// 新增概念
const addConcept = (type: string) => {
  let conceptValue = ''
  if (type === 'upper_concepts') conceptValue = newConcept.value.upper
  else if (type === 'lower_concepts') conceptValue = newConcept.value.lower
  else if (type === 'specific_examples') conceptValue = newConcept.value.example
  
  if (conceptValue.trim()) {
    if (!selectedFeature.value.hierarchical_concepts[type]) {
      selectedFeature.value.hierarchical_concepts[type] = []
    }
    selectedFeature.value.hierarchical_concepts[type].push(conceptValue.trim())
    
    if (type === 'upper_concepts') newConcept.value.upper = ''
    else if (type === 'lower_concepts') newConcept.value.lower = ''
    else if (type === 'specific_examples') newConcept.value.example = ''
    
    markAsModified()
  }
}

// 刪除概念
const removeConcept = (type: string, index: number) => {
  selectedFeature.value.hierarchical_concepts[type].splice(index, 1)
  markAsModified()
}

// 標記為已修改
const markAsModified = () => {
  selectedFeature.value.modified = true
}

// 重置特徵
const resetFeature = () => {
  if (confirm('確定要重置這個特徵嗎？所有修改將會遺失。')) {
    features.value[selectedFeatureIndex.value] = JSON.parse(
      JSON.stringify(props.initialFeatures[selectedFeatureIndex.value])
    )
  }
}

// 儲存特徵
const saveFeature = () => {
  alert('✅ 特徵已儲存')
  selectedFeature.value.modified = false
}

// 重新生成檢索策略
const regenerateStrategies = async () => {
  regenerating.value = true
  
  try {
    // 呼叫 API 重新生成檢索策略
    const response = await fetch('/api/regenerate-strategies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        features: features.value,
        technical_domain: props.technicalDomain,
        predicted_cpc: props.predictedCpc
      })
    })
    
    const result = await response.json()
    generatedStrategies.value = result.search_strategies
    
    alert('✅ 檢索策略已重新生成')
  } catch (error) {
    console.error('生成失敗:', error)
    alert('❌ 生成失敗')
  } finally {
    regenerating.value = false
  }
}

// 監聽特徵變化
watch(selectedFeature, () => {
  if (selectedFeature.value) {
    markAsModified()
  }
}, { deep: true })
</script>

<style scoped>
.feature-adjuster {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.adjuster-header h3 {
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
}

.subtitle {
  color: #6b7280;
  font-size: 0.95rem;
}

.adjuster-layout {
  display: grid;
  grid-template-columns: 350px 1fr;
  gap: 1.5rem;
  min-height: 600px;
}

.features-list-panel,
.feature-editor-panel {
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

.add-feature-btn {
  padding: 0.5rem 1rem;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
}

.add-feature-btn:hover {
  background: #059669;
}

.features-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  overflow-y: auto;
}

.feature-item {
  padding: 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.feature-item:hover {
  border-color: #2563eb;
  background: #f9fafb;
}

.feature-item.selected {
  border-color: #2563eb;
  background: #eff6ff;
}

.feature-item-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.feature-id {
  font-weight: 700;
  color: #374151;
}

.essential-badge {
  padding: 0.25rem 0.5rem;
  background: #fbbf24;
  color: #78350f;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}

.delete-btn {
  margin-left: auto;
  padding: 0.25rem 0.5rem;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  opacity: 0.6;
}

.delete-btn:hover {
  opacity: 1;
}

.feature-text-preview {
  font-size: 0.875rem;
  color: #6b7280;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.modified-indicator {
  margin-top: 0.5rem;
  font-size: 0.75rem;
  color: #f59e0b;
  font-weight: 600;
}

.editor-actions {
  display: flex;
  gap: 0.5rem;
}

.reset-btn,
.save-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
}

.reset-btn {
  background: #f3f4f6;
  color: #374151;
}

.reset-btn:hover {
  background: #e5e7eb;
}

.save-btn {
  background: #2563eb;
  color: white;
}

.save-btn:hover {
  background: #1d4ed8;
}

.editor-sections {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  overflow-y: auto;
}

.editor-section {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1.5rem;
}

.editor-section h5 {
  margin: 0 0 1rem 0;
  color: #374151;
  font-size: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.form-group label {
  font-weight: 600;
  color: #374151;
  font-size: 0.875rem;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.feature-textarea,
.form-input,
.form-select {
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  background: white;
}

.feature-textarea {
  resize: vertical;
  font-family: inherit;
}

.feature-textarea:focus,
.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: #2563eb;
}

.numerical-form {
  margin-top: 1rem;
}

.terms-editor {
  margin-bottom: 1.5rem;
}

.terms-level-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  font-weight: 600;
  color: #374151;
}

.level-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 700;
}

.level-badge.level-1 {
  background: #dbeafe;
  color: #1e40af;
}

.level-badge.level-2 {
  background: #fef3c7;
  color: #92400e;
}

.level-badge.level-3 {
  background: #d1fae5;
  color: #065f46;
}

.terms-input-group,
.concept-input-group {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.term-input,
.concept-input {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
}

.add-term-btn,
.add-concept-btn {
  padding: 0.5rem 1rem;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
}

.add-term-btn:hover,
.add-concept-btn:hover {
  background: #059669;
}

.terms-tags,
.concept-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.term-tag,
.concept-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
}

.term-tag.level-1 {
  background: #dbeafe;
  color: #1e40af;
}

.term-tag.level-2 {
  background: #fef3c7;
  color: #92400e;
}

.term-tag.level-3 {
  background: #d1fae5;
  color: #065f46;
}

.concept-tag.upper {
  background: #dbeafe;
  color: #1e40af;
}

.concept-tag.lower {
  background: #d1fae5;
  color: #065f46;
}

.concept-tag.example {
  background: #e0e7ff;
  color: #3730a3;
}

.remove-term-btn,
.remove-concept-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  opacity: 0.6;
  padding: 0;
}

.remove-term-btn:hover,
.remove-concept-btn:hover {
  opacity: 1;
}

.concept-editor {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.concept-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.concept-group label {
  font-weight: 600;
  color: #374151;
  font-size: 0.875rem;
}

.empty-editor {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f9fafb;
  border: 2px dashed #d1d5db;
  border-radius: 12px;
  color: #6b7280;
  font-size: 1.125rem;
}

.regenerate-section {
  background: white;
  border: 2px solid #2563eb;
  border-radius: 12px;
  padding: 1.5rem;
}

.regenerate-header {
  margin-bottom: 1.5rem;
}

.regenerate-header h4 {
  margin: 0 0 0.5rem 0;
  color: #2563eb;
  font-size: 1.25rem;
}

.regenerate-header p {
  margin: 0;
  color: #6b7280;
  font-size: 0.95rem;
}

.regenerate-actions {
  display: flex;
  justify-content: center;
  margin-bottom: 1.5rem;
}

.regenerate-btn {
  padding: 1rem 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.regenerate-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(102, 126, 234, 0.5);
}

.regenerate-btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
  box-shadow: none;
}

.generated-strategies {
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 2px solid #e5e7eb;
}

.generated-strategies h5 {
  margin: 0 0 1rem 0;
  color: #10b981;
  font-size: 1.125rem;
}
</style>
