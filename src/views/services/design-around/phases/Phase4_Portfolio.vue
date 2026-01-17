<!-- src/views/services/design-around/phases/Phase4_Portfolio.vue -->
<script setup>
import { ref, onMounted, computed } from 'vue'
import { supabase } from '../../../../supabase'
import { ElMessage } from 'element-plus'

const props = defineProps(['jobData'])
const emit = defineEmits(['next'])

const analysisData = ref(null)
const loading = ref(true)

const loadResult = async () => {
  try {
    const { data } = await supabase
      .from('job_phase_results')
      .select('phase_data')
      .eq('job_id', props.jobData.id)
      .eq('phase_order', 3)
      .single()
    
    if (data) {
      analysisData.value = typeof data.phase_data === 'string' ? JSON.parse(data.phase_data) : data.phase_data
    }
  } catch (e) {
    ElMessage.error('載入分析結果失敗')
  } finally {
    loading.value = false
  }
}

const matrix = computed(() => analysisData.value?.portfolio_analysis?.technical_feature_matrix || [])
const opportunities = computed(() => analysisData.value?.portfolio_analysis?.design_around_opportunities || [])

const essentialCount = computed(() => matrix.value.filter(f => f.is_essential).length)
const avoidableCount = computed(() => matrix.value.filter(f => !f.is_essential).length)

const startPhase5 = () => {
  ElMessage.success('開始生成迴避方案...')
  emit('next', import.meta.env.VITE_N8N_DESIGN_AROUND_PHASE5_URL)
}

onMounted(loadResult)
</script>

<template>
  <div class="portfolio-container" v-loading="loading">
    <div class="portfolio-card">
      <!-- 頂部提示 -->
      <div class="alert-section">
        <div class="alert-icon">🧩</div>
        <div class="alert-content">
          <h3>Phase 4 組合分析完成</h3>
          <p>AI 已完成技術特徵矩陣分析，識別出 {{ opportunities.length }} 個迴避機會</p>
        </div>
      </div>

      <!-- 統計卡片 -->
      <div class="stats-grid">
        <div class="stat-card essential">
          <div class="stat-icon">🔴</div>
          <div class="stat-content">
            <span class="stat-value">{{ essentialCount }}</span>
            <span class="stat-label">必要特徵</span>
          </div>
        </div>
        
        <div class="stat-card avoidable">
          <div class="stat-icon">🟢</div>
          <div class="stat-content">
            <span class="stat-value">{{ avoidableCount }}</span>
            <span class="stat-label">可迴避特徵</span>
          </div>
        </div>
        
        <div class="stat-card opportunities">
          <div class="stat-icon">💡</div>
          <div class="stat-content">
            <span class="stat-value">{{ opportunities.length }}</span>
            <span class="stat-label">迴避機會</span>
          </div>
        </div>
      </div>

      <!-- 主要內容區 -->
      <div class="content-grid">
        <!-- 左側：技術特徵矩陣 -->
        <div class="matrix-section">
          <div class="section-header">
            <h3>🧩 技術特徵矩陣</h3>
            <p>分析專利組合中的技術特徵及其屬性</p>
          </div>
          
          <div class="table-wrapper">
            <el-table 
              :data="matrix" 
              height="500" 
              stripe
              class="custom-table"
            >
              <el-table-column prop="feature_description" label="特徵描述" min-width="300">
                <template #default="{row}">
                  <div class="feature-desc">
                    {{ row.feature_description }}
                  </div>
                </template>
              </el-table-column>
              
              <el-table-column label="屬性" width="150" align="center">
                <template #default="{row}">
                  <el-tag 
                    v-if="row.is_essential" 
                    type="danger" 
                    effect="dark"
                    size="default"
                  >
                    🔴 必要
                  </el-tag>
                  <el-tag 
                    v-else 
                    type="success" 
                    effect="dark"
                    size="default"
                  >
                    🟢 可迴避
                  </el-tag>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>

        <!-- 右側：迴避機會 -->
        <div class="opportunities-section">
          <div class="section-header">
            <h3>💡 發現迴避機會</h3>
            <p>AI 識別出的潛在替代方案</p>
          </div>

          <div class="opportunities-list">
            <div 
              v-for="(opp, idx) in opportunities" 
              :key="idx" 
              class="opportunity-card"
            >
              <div class="opp-header">
                <span class="opp-number">#{{ idx + 1 }}</span>
                <el-tag type="warning" size="small" effect="light">迴避機會</el-tag>
              </div>
              
              <div class="opp-content">
                <div class="opp-target">
                  <strong>針對特徵：</strong>
                  <p>{{ opp.feature_to_avoid }}</p>
                </div>
                
                <div class="opp-approach">
                  <strong>替代方案：</strong>
                  <p>{{ opp.alternative_approach }}</p>
                </div>
              </div>
            </div>
          </div>

          <el-button 
            type="primary" 
            size="large" 
            class="generate-btn"
            @click="startPhase5"
          >
            針對這些機會生成方案 (Phase 5) →
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.portfolio-container {
  max-width: 1600px;
  margin: 0 auto;
  padding: 24px;
}

.portfolio-card {
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
  background: linear-gradient(135deg, #ddd6fe 0%, #c4b5fd 100%);
  border-radius: 12px;
  border: 1px solid #a78bfa;
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
  color: #5b21b6;
  margin: 0 0 4px 0;
}

.alert-content p {
  font-size: 14px;
  color: #6d28d9;
  margin: 0;
}

/* 統計卡片 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 32px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  border-radius: 12px;
  border: 1px solid;
  transition: all 0.3s;
}

.stat-card.essential {
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
  border-color: #fca5a5;
}

.stat-card.avoidable {
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
  border-color: #6ee7b7;
}

.stat-card.opportunities {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-color: #fbbf24;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.stat-icon {
  font-size: 32px;
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border-radius: 12px;
}

.stat-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #1e293b;
}

.stat-label {
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
}

/* 內容網格 */
.content-grid {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 24px;
}

/* 區塊標題 */
.section-header {
  margin-bottom: 20px;
}

.section-header h3 {
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 4px 0;
}

.section-header p {
  font-size: 13px;
  color: #64748b;
  margin: 0;
}

/* 矩陣區 */
.matrix-section {
  background: #f8fafc;
  padding: 24px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

.table-wrapper {
  border-radius: 8px;
  overflow: hidden;
}

.feature-desc {
  font-size: 14px;
  color: #334155;
  line-height: 1.6;
}

/* 機會區 */
.opportunities-section {
  display: flex;
  flex-direction: column;
}

.opportunities-list {
  flex: 1;
  max-height: 500px;
  overflow-y: auto;
  padding-right: 8px;
  margin-bottom: 20px;
}

.opportunity-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 16px;
  transition: all 0.3s;
}

.opportunity-card:hover {
  border-color: #667eea;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
}

.opp-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.opp-number {
  font-size: 18px;
  font-weight: 700;
  color: #667eea;
}

.opp-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.opp-target,
.opp-approach {
  font-size: 14px;
}

.opp-target strong,
.opp-approach strong {
  display: block;
  color: #475569;
  margin-bottom: 4px;
}

.opp-target p,
.opp-approach p {
  color: #64748b;
  margin: 0;
  line-height: 1.6;
}

.generate-btn {
  width: 100%;
  height: 56px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  box-shadow: 0 8px 16px rgba(102, 126, 234, 0.3);
}

.generate-btn:hover {
  background: linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%);
  transform: translateY(-2px);
  box-shadow: 0 12px 24px rgba(102, 126, 234, 0.4);
}

/* 響應式 */
@media (max-width: 1200px) {
  .content-grid {
    grid-template-columns: 1fr;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>
