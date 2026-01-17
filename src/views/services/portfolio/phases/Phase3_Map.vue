<!-- src/views/services/portfolio/phases/Phase3_Map.vue -->
<script setup>
import { ref, onMounted, computed } from 'vue'
import { supabase } from '../../../../supabase'
import { ElMessage, ElMessageBox } from 'element-plus'

const props = defineProps(['jobData'])
const emit = defineEmits(['next'])
const mapData = ref(null)
const loading = ref(true)
const activeTab = ref('white_spaces')

const loadResult = async () => {
  try {
    const { data } = await supabase.from('job_phase_results')
      .select('phase_data')
      .eq('job_id', props.jobData.id)
      .eq('phase_order', 3)
      .single()
    
    if (data) {
      mapData.value = typeof data.phase_data === 'string' 
        ? JSON.parse(data.phase_data) 
        : data.phase_data
    }
  } catch (e) {
    ElMessage.error('載入競爭地圖失敗')
  } finally {
    loading.value = false
  }
}

const stats = computed(() => ({
  conflicts: mapData.value?.conflict_zones?.total_conflicting_variations || 0,
  whiteSpaces: mapData.value?.white_spaces?.total_white_spaces || 0,
  offensive: mapData.value?.offensive_zones?.total_offensive_zones || 0
}))

const whiteSpaceOpportunities = computed(() => {
  return mapData.value?.white_spaces?.top_10_opportunities || []
})

const conflictDetails = computed(() => {
  return mapData.value?.conflict_zones?.conflict_details || []
})

const offensiveZones = computed(() => {
  return mapData.value?.offensive_zones?.offensive_details || []
})

const getScoreColor = (score) => {
  if (score >= 8) return '#10b981'
  if (score >= 6) return '#f59e0b'
  return '#ef4444'
}

const getMarketDemandTag = (demand) => {
  const map = {
    'high': { type: 'success', text: '高需求' },
    'medium': { type: 'warning', text: '中需求' },
    'low': { type: 'info', text: '低需求' }
  }
  return map[demand?.toLowerCase()] || { type: 'info', text: demand }
}

const startPhase4 = async () => {
  try {
    await ElMessageBox.confirm(
      '確定要進入佈局策略規劃階段嗎？系統將基於競爭地圖制定專利申請策略。',
      '確認進入 Phase 4',
      {
        confirmButtonText: '開始規劃',
        cancelButtonText: '取消',
        type: 'info'
      }
    )
    
    ElMessage.success('開始制定佈局策略...')
    emit('next', import.meta.env.VITE_N8N_PORTFOLIO_PHASE4_URL)
  } catch {
    // 用戶取消
  }
}

onMounted(loadResult)
</script>

<template>
  <div class="map-container" v-loading="loading">
    <div class="map-card">
      <!-- 頂部提示 -->
      <div class="alert-section">
        <div class="alert-icon">🗺️</div>
        <div class="alert-content">
          <h3>Phase 3: 競爭分析與專利地圖完成</h3>
          <p>AI 已完成競爭對手專利分析，識別出衝突區域、空白機會和進攻佈局點</p>
        </div>
        <el-button 
          type="primary" 
          size="large"
          class="alert-btn"
          @click="startPhase4"
        >
          制定佈局策略 (Phase 4) →
        </el-button>
      </div>

      <!-- 統計卡片 -->
      <div class="stats-grid">
        <div class="stat-card danger">
          <div class="stat-icon">🔴</div>
          <div class="stat-content">
            <span class="stat-value">{{ stats.conflicts }}</span>
            <span class="stat-label">衝突熱區</span>
            <span class="stat-desc">需迴避的技術方案</span>
          </div>
        </div>

        <div class="stat-card success">
          <div class="stat-icon">🟢</div>
          <div class="stat-content">
            <span class="stat-value">{{ stats.whiteSpaces }}</span>
            <span class="stat-label">空白區域</span>
            <span class="stat-desc">可申請的技術機會</span>
          </div>
        </div>

        <div class="stat-card primary">
          <div class="stat-icon">🔵</div>
          <div class="stat-content">
            <span class="stat-value">{{ stats.offensive }}</span>
            <span class="stat-label">進攻佈局</span>
            <span class="stat-desc">包圍競爭對手的策略點</span>
          </div>
        </div>
      </div>

      <!-- 標籤頁內容 -->
      <div class="tabs-section">
        <div class="custom-tabs">
          <div 
            class="tab-item"
            :class="{ active: activeTab === 'white_spaces' }"
            @click="activeTab = 'white_spaces'"
          >
            <span class="tab-icon">🟢</span>
            <span>高價值空白機會</span>
            <span class="tab-badge">{{ whiteSpaceOpportunities.length }}</span>
          </div>
          <div 
            class="tab-item"
            :class="{ active: activeTab === 'conflicts' }"
            @click="activeTab = 'conflicts'"
          >
            <span class="tab-icon">🔴</span>
            <span>衝突風險</span>
            <span class="tab-badge">{{ conflictDetails.length }}</span>
          </div>
          <div 
            class="tab-item"
            :class="{ active: activeTab === 'offensive' }"
            @click="activeTab = 'offensive'"
          >
            <span class="tab-icon">🔵</span>
            <span>進攻佈局</span>
            <span class="tab-badge">{{ offensiveZones.length }}</span>
          </div>
        </div>

        <div class="tab-content">
          <!-- 空白機會 -->
          <div v-show="activeTab === 'white_spaces'" class="opportunities-section">
            <div class="section-header">
              <h4>🟢 高價值空白機會</h4>
              <p>以下技術方案未被競爭對手覆蓋，建議優先申請專利</p>
            </div>

            <div class="opportunities-grid">
              <div 
                v-for="(opp, idx) in whiteSpaceOpportunities" 
                :key="idx"
                class="opportunity-card"
              >
                <div class="card-header">
                  <span class="rank-badge">#{{ idx + 1 }}</span>
                  <div class="score-badge" :style="{ background: getScoreColor(opp.overall_score) }">
                    <span class="score-value">{{ opp.overall_score }}</span>
                    <span class="score-label">分</span>
                  </div>
                </div>

                <div class="card-body">
                  <h5 class="opp-title">{{ opp.variation_description }}</h5>

                  <div class="metrics-row">
                    <div class="metric-item">
                      <span class="metric-label">市場需求</span>
                      <el-tag 
                        :type="getMarketDemandTag(opp.market_value?.market_demand).type"
                        size="small"
                      >
                        {{ getMarketDemandTag(opp.market_value?.market_demand).text }}
                      </el-tag>
                    </div>

                    <div class="metric-item">
                      <span class="metric-label">技術可行性</span>
                      <span class="metric-value">{{ opp.technical_feasibility?.feasibility_score || 'N/A' }}</span>
                    </div>
                  </div>

                  <div class="action-box">
                    <strong>📌 建議行動：</strong>
                    <p>{{ opp.recommended_action }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 衝突風險 -->
          <div v-show="activeTab === 'conflicts'" class="conflicts-section">
            <div class="section-header">
              <h4>🔴 衝突風險分析</h4>
              <p>以下技術方案與競爭對手專利存在衝突，建議迴避或修改</p>
            </div>

            <div class="conflicts-list">
              <div 
                v-for="(conflict, idx) in conflictDetails" 
                :key="idx"
                class="conflict-card"
              >
                <div class="conflict-header">
                  <span class="conflict-number">#{{ idx + 1 }}</span>
                  <el-tag type="danger" size="small">衝突</el-tag>
                </div>

                <div class="conflict-body">
                  <h5 class="conflict-title">{{ conflict.variation_description }}</h5>

                  <div class="competitor-info">
                    <strong>⚠️ 衝突對手：</strong>
                    <div class="competitors-list">
                      <el-tag 
                        v-for="(patent, pIdx) in conflict.conflicting_patents?.slice(0, 3)" 
                        :key="pIdx"
                        type="warning"
                        effect="plain"
                        size="small"
                      >
                        {{ patent.competitor_name }} - {{ patent.patent_number }}
                      </el-tag>
                    </div>
                  </div>

                  <div class="action-box danger">
                    <strong>🛡️ 建議行動：</strong>
                    <p>{{ conflict.recommended_action }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 進攻佈局 -->
          <div v-show="activeTab === 'offensive'" class="offensive-section">
            <div class="section-header">
              <h4>🔵 進攻佈局策略</h4>
              <p>通過包圍競爭對手專利，建立技術壁壘</p>
            </div>

            <div class="offensive-grid">
              <div 
                v-for="(zone, idx) in offensiveZones" 
                :key="idx"
                class="offensive-card"
              >
                <div class="offensive-header">
                  <span class="offensive-badge">進攻點 {{ idx + 1 }}</span>
                </div>

                <div class="offensive-body">
                  <h5>{{ zone.variation_description }}</h5>

                  <div class="target-info">
                    <strong>🎯 目標對手：</strong>
                    <p>{{ zone.target_competitor || '未指定' }}</p>
                  </div>

                  <div class="action-box primary">
                    <strong>⚔️ 策略：</strong>
                    <p>{{ zone.offensive_strategy || zone.recommended_action }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.map-container {
  max-width: 1600px;
  margin: 0 auto;
  padding: 24px;
}

.map-card {
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
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-radius: 12px;
  border: 1px solid #fbbf24;
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

.alert-content {
  flex: 1;
}

.alert-content h3 {
  font-size: 18px;
  font-weight: 700;
  color: #92400e;
  margin: 0 0 4px 0;
}

.alert-content p {
  font-size: 14px;
  color: #b45309;
  margin: 0;
}

.alert-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  font-weight: 600;
  white-space: nowrap;
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
  gap: 20px;
  padding: 24px;
  border-radius: 12px;
  border: 2px solid;
  transition: all 0.3s;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
}

.stat-card.danger {
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
  border-color: #fca5a5;
}

.stat-card.success {
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
  border-color: #6ee7b7;
}

.stat-card.primary {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  border-color: #93c5fd;
}

.stat-icon {
  font-size: 40px;
  width: 64px;
  height: 64px;
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
  font-size: 32px;
  font-weight: 700;
  color: #1e293b;
}

.stat-label {
  font-size: 15px;
  font-weight: 700;
  color: #475569;
}

.stat-desc {
  font-size: 12px;
  color: #64748b;
}

/* 標籤頁 */
.tabs-section {
  background: #f8fafc;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
}

.custom-tabs {
  display: flex;
  background: white;
  border-bottom: 2px solid #e2e8f0;
}

.tab-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px 24px;
  cursor: pointer;
  border-bottom: 3px solid transparent;
  transition: all 0.3s;
  font-weight: 600;
  color: #64748b;
}

.tab-item:hover {
  background: #f8fafc;
  color: #667eea;
}

.tab-item.active {
  color: #667eea;
  border-bottom-color: #667eea;
  background: #f8f9ff;
}

.tab-icon {
  font-size: 18px;
}

.tab-badge {
  padding: 2px 8px;
  background: #e2e8f0;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 700;
}

.tab-item.active .tab-badge {
  background: #667eea;
  color: white;
}

.tab-content {
  padding: 32px;
}

/* 區塊標題 */
.section-header {
  margin-bottom: 24px;
}

.section-header h4 {
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

/* 機會網格 */
.opportunities-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}

.opportunity-card {
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s;
}

.opportunity-card:hover {
  border-color: #10b981;
  box-shadow: 0 8px 16px rgba(16, 185, 129, 0.15);
  transform: translateY(-4px);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
  border-bottom: 2px solid #6ee7b7;
}

.rank-badge {
  font-size: 14px;
  font-weight: 700;
  color: #065f46;
}

.score-badge {
  display: flex;
  align-items: baseline;
  gap: 2px;
  padding: 6px 12px;
  border-radius: 8px;
  color: white;
  font-weight: 700;
}

.score-value {
  font-size: 20px;
}

.score-label {
  font-size: 12px;
}

.card-body {
  padding: 20px;
}

.opp-title {
  font-size: 15px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 16px 0;
  line-height: 1.5;
}

.metrics-row {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.metric-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.metric-label {
  font-size: 12px;
  color: #64748b;
  font-weight: 600;
}

.metric-value {
  font-size: 16px;
  font-weight: 700;
  color: #1e293b;
}

.action-box {
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
  border-left: 4px solid #10b981;
}

.action-box.danger {
  background: #fef2f2;
  border-color: #ef4444;
}

.action-box.primary {
  background: #eff6ff;
  border-color: #3b82f6;
}

.action-box strong {
  display: block;
  font-size: 13px;
  color: #475569;
  margin-bottom: 6px;
}

.action-box p {
  font-size: 13px;
  color: #64748b;
  margin: 0;
  line-height: 1.5;
}

/* 衝突列表 */
.conflicts-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.conflict-card {
  background: white;
  border: 2px solid #fca5a5;
  border-radius: 12px;
  overflow: hidden;
}

.conflict-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
}

.conflict-number {
  font-size: 14px;
  font-weight: 700;
  color: #991b1b;
}

.conflict-body {
  padding: 20px;
}

.conflict-title {
  font-size: 16px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 16px 0;
}

.competitor-info {
  margin-bottom: 16px;
}

.competitor-info strong {
  display: block;
  font-size: 13px;
  color: #475569;
  margin-bottom: 8px;
}

.competitors-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

/* 進攻網格 */
.offensive-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}

.offensive-card {
  background: white;
  border: 2px solid #93c5fd;
  border-radius: 12px;
  overflow: hidden;
}

.offensive-header {
  padding: 16px 20px;
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
}

.offensive-badge {
  font-size: 14px;
  font-weight: 700;
  color: #1e40af;
}

.offensive-body {
  padding: 20px;
}

.offensive-body h5 {
  font-size: 15px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 16px 0;
}

.target-info {
  margin-bottom: 16px;
}

.target-info strong {
  display: block;
  font-size: 13px;
  color: #475569;
  margin-bottom: 6px;
}

.target-info p {
  font-size: 14px;
  color: #64748b;
  margin: 0;
}

/* 響應式 */
@media (max-width: 1200px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .opportunities-grid,
  .offensive-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .alert-section {
    flex-direction: column;
    align-items: flex-start;
  }

  .alert-btn {
    width: 100%;
  }

  .custom-tabs {
    flex-direction: column;
  }

  .tab-item {
    border-bottom: 1px solid #e2e8f0;
    border-left: 3px solid transparent;
  }

  .tab-item.active {
    border-left-color: #667eea;
    border-bottom-color: #e2e8f0;
  }
}
</style>
