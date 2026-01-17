<!-- src/views/services/design-around/phases/Phase8_Report.vue -->
<script setup>
import { ref, onMounted, computed } from 'vue'
import { supabase } from '../../../../supabase'
import { ElMessage } from 'element-plus'

const props = defineProps(['jobData'])
const report = ref(null)
const loading = ref(true)
const activeTab = ref('summary')

const loadReport = async () => {
  try {
    const { data } = await supabase
      .from('saas_jobs')
      .select('result_data')
      .eq('id', props.jobData.id)
      .single()
    
    if (data?.result_data) {
      report.value = typeof data.result_data === 'string' 
        ? JSON.parse(data.result_data) 
        : data.result_data
    }
  } catch (e) {
    ElMessage.error('載入報告失敗')
  } finally {
    loading.value = false
  }
}

const topSolution = computed(() => {
  return report.value?.report?.section_4_design_around_solutions?.top_5_solutions?.[0]
})

const allSolutions = computed(() => {
  return report.value?.report?.section_4_design_around_solutions?.top_5_solutions || []
})

const downloadReport = () => {
  // TODO: 實作下載 PDF 功能
  ElMessage.info('下載功能開發中...')
}

const getRiskColor = (risk) => {
  if (risk.includes('低') || risk.includes('Low')) return 'success'
  if (risk.includes('中') || risk.includes('Medium')) return 'warning'
  return 'danger'
}

onMounted(loadReport)
</script>

<template>
  <div class="report-container" v-loading="loading">
    <div class="report-card">
      <!-- 報告頭部 -->
      <div class="report-header">
        <div class="header-content">
          <div class="icon-badge">📊</div>
          <div class="title-section">
            <h1>{{ report?.report?.metadata?.report_title || '專利迴避設計分析報告' }}</h1>
            <p class="report-meta">
              <span>📅 生成日期：{{ new Date(report?.report?.metadata?.generated_date || Date.now()).toLocaleDateString('zh-TW') }}</span>
              <span>🏢 專案：{{ jobData.input_data?.project_name || '未命名專案' }}</span>
            </p>
          </div>
        </div>
        
        <div class="header-actions">
          <el-button type="primary" size="large" @click="downloadReport">
            📥 下載完整報告
          </el-button>
        </div>
      </div>

      <!-- 標籤頁 -->
      <div class="tabs-section">
        <div class="custom-tabs">
          <div 
            class="tab-item"
            :class="{ active: activeTab === 'summary' }"
            @click="activeTab = 'summary'"
          >
            <span class="tab-icon">📋</span>
            <span>執行摘要</span>
          </div>
          <div 
            class="tab-item"
            :class="{ active: activeTab === 'best' }"
            @click="activeTab = 'best'"
          >
            <span class="tab-icon">🏆</span>
            <span>最佳方案</span>
          </div>
          <div 
            class="tab-item"
            :class="{ active: activeTab === 'all' }"
            @click="activeTab = 'all'"
          >
            <span class="tab-icon">📊</span>
            <span>所有方案</span>
          </div>
        </div>
      </div>

      <!-- 內容區 -->
      <div class="content-section">
        <!-- 執行摘要 -->
        <div v-show="activeTab === 'summary'" class="tab-content">
          <div class="summary-card">
            <div class="card-header">
              <h2>📋 執行摘要</h2>
              <p>本報告總結了專利迴避設計分析的核心發現與建議</p>
            </div>
            
            <div class="summary-content">
              <div class="summary-text">
                {{ report?.report?.executive_summary?.full_summary || '暫無摘要內容' }}
              </div>

              <!-- 關鍵指標 -->
              <div class="key-metrics">
                <div class="metric-card">
                  <div class="metric-icon">🎯</div>
                  <div class="metric-info">
                    <span class="metric-label">分析專利數</span>
                    <span class="metric-value">{{ report?.report?.executive_summary?.key_findings?.total_patents || 0 }}</span>
                  </div>
                </div>

                <div class="metric-card">
                  <div class="metric-icon">💡</div>
                  <div class="metric-info">
                    <span class="metric-label">生成方案數</span>
                    <span class="metric-value">{{ allSolutions.length }}</span>
                  </div>
                </div>

                <div class="metric-card">
                  <div class="metric-icon">✅</div>
                  <div class="metric-info">
                    <span class="metric-label">推薦方案</span>
                    <span class="metric-value">{{ report?.report?.executive_summary?.recommendations?.length || 0 }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 最佳方案 -->
        <div v-show="activeTab === 'best'" class="tab-content">
          <div v-if="topSolution" class="best-solution-card">
            <div class="best-badge">
              <span>🏆 最佳推薦方案</span>
            </div>

            <h2 class="solution-name">{{ topSolution.solution_name }}</h2>

            <div class="solution-strategy">
              <el-tag type="primary" size="large" effect="dark">
                {{ topSolution.design_around_strategy }}
              </el-tag>
            </div>

            <div class="solution-section">
              <h3>📝 技術描述</h3>
              <p class="description-text">{{ topSolution.technical_description }}</p>
            </div>

            <div class="solution-section">
              <h3>⚖️ 風險評估</h3>
              <div class="risk-assessment">
                <el-tag 
                  :type="getRiskColor(topSolution.infringement_risk)"
                  size="large"
                  effect="dark"
                >
                  {{ topSolution.infringement_risk }}
                </el-tag>
                <p class="risk-text">{{ topSolution.risk_analysis || '風險分析中...' }}</p>
              </div>
            </div>

            <div class="solution-section">
              <h3>🎯 實施建議</h3>
              <div class="recommendation-box">
                <div class="rec-item">
                  <strong>✅ 建議實施：</strong>
                  <p>{{ topSolution.recommendation?.implement || '請參考詳細報告' }}</p>
                </div>
                <div class="rec-item">
                  <strong>⚠️ 注意事項：</strong>
                  <p>{{ topSolution.recommendation?.caution || '請參考詳細報告' }}</p>
                </div>
              </div>
            </div>

            <!-- 評分指標 -->
            <div class="scores-grid">
              <div class="score-card">
                <span class="score-label">創新度</span>
                <div class="score-bar">
                  <el-progress 
                    :percentage="(topSolution.innovation_score || 0) * 10"
                    :stroke-width="12"
                    color="#f59e0b"
                  />
                </div>
              </div>

              <div class="score-card">
                <span class="score-label">可行性</span>
                <div class="score-bar">
                  <el-progress 
                    :percentage="(topSolution.feasibility_score || 0) * 10"
                    :stroke-width="12"
                    color="#10b981"
                  />
                </div>
              </div>

              <div class="score-card">
                <span class="score-label">成本效益</span>
                <div class="score-bar">
                  <el-progress 
                    :percentage="(topSolution.cost_effectiveness || 0) * 10"
                    :stroke-width="12"
                    color="#3b82f6"
                  />
                </div>
              </div>
            </div>
          </div>

          <div v-else class="empty-state">
            <div class="empty-icon">📭</div>
            <p>尚無最佳方案資料</p>
          </div>
        </div>

        <!-- 所有方案 -->
        <div v-show="activeTab === 'all'" class="tab-content">
          <div class="solutions-list">
            <div 
              v-for="(sol, idx) in allSolutions" 
              :key="idx"
              class="solution-item"
            >
              <div class="item-header">
                <div class="rank-badge" :class="{ top: idx === 0 }">
                  {{ idx === 0 ? '🏆' : `#${idx + 1}` }}
                </div>
                <h3>{{ sol.solution_name }}</h3>
                <el-tag 
                  :type="getRiskColor(sol.infringement_risk)"
                  size="small"
                >
                  {{ sol.infringement_risk }}
                </el-tag>
              </div>

              <p class="item-desc">{{ sol.technical_description }}</p>

              <div class="item-metrics">
                <div class="mini-metric">
                  <span class="mini-label">創新</span>
                  <span class="mini-value">{{ sol.innovation_score }}/10</span>
                </div>
                <div class="mini-metric">
                  <span class="mini-label">可行</span>
                  <span class="mini-value">{{ sol.feasibility_score }}/10</span>
                </div>
                <div class="mini-metric">
                  <span class="mini-label">成本</span>
                  <span class="mini-value">{{ sol.cost_effectiveness || 'N/A' }}</span>
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
.report-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
}

.report-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

/* 報告頭部 */
.report-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 40px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 24px;
}

.icon-badge {
  width: 80px;
  height: 80px;
  background: white;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
}

.title-section h1 {
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 8px 0;
  color: white;
}

.report-meta {
  display: flex;
  gap: 24px;
  font-size: 14px;
  opacity: 0.9;
  margin: 0;
}

/* 標籤頁 */
.tabs-section {
  border-bottom: 2px solid #f1f5f9;
  background: #f8fafc;
}

.custom-tabs {
  display: flex;
  padding: 0 40px;
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 24px;
  cursor: pointer;
  border-bottom: 3px solid transparent;
  transition: all 0.3s;
  font-weight: 600;
  color: #64748b;
}

.tab-item:hover {
  color: #667eea;
  background: white;
}

.tab-item.active {
  color: #667eea;
  border-bottom-color: #667eea;
  background: white;
}

.tab-icon {
  font-size: 18px;
}

/* 內容區 */
.content-section {
  padding: 40px;
}

.tab-content {
  animation: fadeIn 0.3s;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* 執行摘要 */
.summary-card {
  background: linear-gradient(135deg, #f8f9ff 0%, #f0f4ff 100%);
  border-radius: 12px;
  padding: 32px;
  border: 1px solid #e0e7ff;
}

.card-header h2 {
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 4px 0;
}

.card-header p {
  font-size: 14px;
  color: #64748b;
  margin: 0 0 24px 0;
}

.summary-text {
  font-size: 15px;
  line-height: 1.8;
  color: #334155;
  white-space: pre-line;
  margin-bottom: 32px;
  padding: 24px;
  background: white;
  border-radius: 8px;
}

.key-metrics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.metric-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: white;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

.metric-icon {
  font-size: 32px;
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.metric-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.metric-label {
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
}

.metric-value {
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
}

/* 最佳方案 */
.best-solution-card {
  position: relative;
  padding: 32px;
  background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
  border-radius: 12px;
  border: 2px solid #fbbf24;
}

.best-badge {
  display: inline-flex;
  align-items: center;
  padding: 8px 20px;
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
  border-radius: 20px;
  font-weight: 700;
  font-size: 14px;
  margin-bottom: 20px;
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
}

.solution-name {
  font-size: 32px;
  font-weight: 700;
  color: #78350f;
  margin: 0 0 16px 0;
}

.solution-strategy {
  margin-bottom: 32px;
}

.solution-section {
  margin-bottom: 32px;
  padding: 24px;
  background: white;
  border-radius: 12px;
}

.solution-section h3 {
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 16px 0;
}

.description-text {
  font-size: 15px;
  line-height: 1.8;
  color: #334155;
  margin: 0;
}

.risk-assessment {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.risk-text {
  font-size: 14px;
  color: #64748b;
  margin: 0;
  line-height: 1.6;
}

.recommendation-box {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.rec-item strong {
  display: block;
  color: #1e293b;
  margin-bottom: 8px;
}

.rec-item p {
  margin: 0;
  color: #64748b;
  line-height: 1.6;
}

.scores-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-top: 32px;
}

.score-card {
  background: white;
  padding: 20px;
  border-radius: 12px;
}

.score-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 12px;
}

/* 所有方案列表 */
.solutions-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.solution-item {
  padding: 24px;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  transition: all 0.3s;
}

.solution-item:hover {
  border-color: #667eea;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
}

.item-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
}

.rank-badge {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e2e8f0;
  border-radius: 8px;
  font-weight: 700;
  color: #475569;
}

.rank-badge.top {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
  font-size: 20px;
}

.item-header h3 {
  flex: 1;
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

.item-desc {
  font-size: 14px;
  color: #64748b;
  line-height: 1.6;
  margin: 0 0 16px 0;
}

.item-metrics {
  display: flex;
  gap: 20px;
}

.mini-metric {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mini-label {
  font-size: 12px;
  color: #94a3b8;
}

.mini-value {
  font-size: 16px;
  font-weight: 700;
  color: #1e293b;
}

/* 空狀態 */
.empty-state {
  text-align: center;
  padding: 80px 20px;
  color: #94a3b8;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

/* 響應式 */
@media (max-width: 1200px) {
  .key-metrics,
  .scores-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .report-header {
    flex-direction: column;
    gap: 24px;
    align-items: flex-start;
  }

  .header-content {
    flex-direction: column;
    align-items: flex-start;
  }

  .custom-tabs {
    flex-direction: column;
    padding: 0;
  }

  .tab-item {
    border-bottom: 1px solid #e2e8f0;
    border-left: 3px solid transparent;
  }

  .tab-item.active {
    border-left-color: #667eea;
    border-bottom-color: #e2e8f0;
  }

  .content-section {
    padding: 24px;
  }
}
</style>
