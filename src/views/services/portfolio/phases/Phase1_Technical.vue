<!-- src/views/services/portfolio/phases/Phase1_Technical.vue -->
<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../../../../supabase'
import { ElMessage } from 'element-plus'

const props = defineProps(['jobData'])
const emit = defineEmits(['next'])
const phaseData = ref(null)
const loading = ref(true)
const activeFeature = ref(null)

const loadResult = async () => {
  try {
    const { data } = await supabase.from('job_phase_results')
      .select('phase_data')
      .eq('job_id', props.jobData.id)
      .eq('phase_order', 1)
      .single()
    
    if (data) {
      phaseData.value = typeof data.phase_data === 'string' 
        ? JSON.parse(data.phase_data) 
        : data.phase_data
    }
  } catch (e) {
    ElMessage.error('載入分析結果失敗')
  } finally {
    loading.value = false
  }
}

const startPhase2 = () => {
  ElMessage.success('開始生成變化形式...')
  emit('next', import.meta.env.VITE_N8N_PORTFOLIO_PHASE2_URL)
}

onMounted(loadResult)
</script>

<template>
  <div class="technical-container" v-loading="loading">
    <div class="technical-card">
      <!-- 頂部提示 -->
      <div class="alert-section">
        <div class="alert-icon">🔬</div>
        <div class="alert-content">
          <h3>Phase 1: 技術拆解分析完成</h3>
          <p>AI 已完成技術特徵提取和概念樹構建，識別出 {{ phaseData?.technical_features?.core_features?.length || 0 }} 個核心技術特徵</p>
        </div>
      </div>

      <!-- 技術概覽 -->
      <div class="overview-section">
        <div class="section-header">
          <h3>📋 技術概覽</h3>
        </div>

        <div class="overview-grid">
          <div class="overview-card">
            <div class="card-label">技術領域</div>
            <div class="card-value">{{ phaseData?.technical_overview?.technical_field || '-' }}</div>
          </div>

          <div class="overview-card">
            <div class="card-label">技術問題</div>
            <div class="card-value">{{ phaseData?.technical_overview?.technical_problem || '-' }}</div>
          </div>

          <div class="overview-card full-width">
            <div class="card-label">技術手段</div>
            <div class="card-value">{{ phaseData?.technical_overview?.technical_solution || '-' }}</div>
          </div>
        </div>
      </div>

      <!-- 核心技術特徵 -->
      <div class="features-section">
        <div class="section-header">
          <h3>🌳 核心技術特徵樹</h3>
          <p>點擊展開查看特徵的上位、中位、下位概念</p>
        </div>

        <div class="features-list">
          <div 
            v-for="feature in phaseData?.technical_features?.core_features" 
            :key="feature.feature_id"
            class="feature-card"
            :class="{ expanded: activeFeature === feature.feature_id }"
            @click="activeFeature = activeFeature === feature.feature_id ? null : feature.feature_id"
          >
            <div class="feature-header">
              <div class="feature-title">
                <span class="feature-id">{{ feature.feature_id }}</span>
                <span class="feature-name">{{ feature.feature_name }}</span>
              </div>
              <div class="expand-icon">
                {{ activeFeature === feature.feature_id ? '▼' : '▶' }}
              </div>
            </div>

            <p class="feature-desc">{{ feature.description }}</p>

            <Transition name="expand">
              <div v-if="activeFeature === feature.feature_id" class="feature-tree">
                <div class="tree-level level-1">
                  <div class="level-label">上位概念</div>
                  <div class="level-content">
                    {{ feature.feature_tree?.level_1_broad || '-' }}
                  </div>
                </div>

                <div class="tree-level level-2">
                  <div class="level-label">中位概念</div>
                  <div class="level-content">
                    <div 
                      v-for="(item, idx) in feature.feature_tree?.level_2_intermediate" 
                      :key="idx"
                      class="concept-tag"
                    >
                      {{ item }}
                    </div>
                  </div>
                </div>

                <div class="tree-level level-3">
                  <div class="level-label">下位概念</div>
                  <div class="level-content">
                    <div 
                      v-for="(item, idx) in feature.feature_tree?.level_3_specific" 
                      :key="idx"
                      class="concept-tag"
                    >
                      {{ item }}
                    </div>
                  </div>
                </div>
              </div>
            </Transition>
          </div>
        </div>
      </div>

      <!-- 底部按鈕 -->
      <div class="action-section">
        <el-button 
          type="primary" 
          size="large"
          class="next-btn"
          @click="startPhase2"
        >
          確認並生成變化形式 (Phase 2) →
        </el-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.technical-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
}

.technical-card {
  background: white;
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

/* 提示區 */
.alert-section {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 24px;
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  border-radius: 12px;
  border: 1px solid #93c5fd;
  margin-bottom: 32px;
}

.alert-icon {
  font-size: 40px;
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.alert-content h3 {
  font-size: 18px;
  font-weight: 700;
  color: #1e40af;
  margin: 0 0 4px 0;
}

.alert-content p {
  font-size: 14px;
  color: #2563eb;
  margin: 0;
}

/* 區塊標題 */
.section-header {
  margin-bottom: 24px;
}

.section-header h3 {
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 4px 0;
}

.section-header p {
  font-size: 14px;
  color: #64748b;
  margin: 0;
}

/* 技術概覽 */
.overview-section {
  margin-bottom: 40px;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

.overview-card {
  padding: 24px;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

.overview-card.full-width {
  grid-column: 1 / -1;
}

.card-label {
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 12px;
}

.card-value {
  font-size: 15px;
  color: #1e293b;
  line-height: 1.6;
}

/* 特徵列表 */
.features-section {
  margin-bottom: 40px;
}

.features-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.feature-card {
  background: #f8fafc;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  padding: 24px;
  cursor: pointer;
  transition: all 0.3s;
}

.feature-card:hover {
  border-color: #667eea;
  background: white;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
}

.feature-card.expanded {
  border-color: #667eea;
  background: white;
}

.feature-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.feature-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.feature-id {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 60px;
  padding: 6px 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 700;
}

.feature-name {
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
}

.expand-icon {
  color: #667eea;
  font-size: 14px;
  font-weight: 700;
}

.feature-desc {
  font-size: 14px;
  color: #64748b;
  line-height: 1.6;
  margin: 0;
}

/* 特徵樹 */
.feature-tree {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 2px dashed #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.tree-level {
  padding: 16px;
  border-radius: 8px;
  border-left: 4px solid;
}

.tree-level.level-1 {
  background: #fef3c7;
  border-color: #fbbf24;
}

.tree-level.level-2 {
  background: #dbeafe;
  border-color: #3b82f6;
}

.tree-level.level-3 {
  background: #d1fae5;
  border-color: #10b981;
}

.level-label {
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
  margin-bottom: 8px;
  text-transform: uppercase;
}

.level-content {
  font-size: 14px;
  color: #1e293b;
  line-height: 1.6;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.concept-tag {
  display: inline-block;
  padding: 6px 12px;
  background: white;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* 展開動畫 */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
}

.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  max-height: 500px;
}

/* 底部按鈕 */
.action-section {
  padding-top: 32px;
  border-top: 2px solid #f1f5f9;
  text-align: center;
}

.next-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  font-weight: 600;
  padding: 14px 40px;
  height: auto;
}

.next-btn:hover {
  background: linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%);
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(102, 126, 234, 0.3);
}

/* 響應式 */
@media (max-width: 768px) {
  .overview-grid {
    grid-template-columns: 1fr;
  }

  .feature-title {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
