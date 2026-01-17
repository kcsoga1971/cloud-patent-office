<!-- src/views/services/portfolio/phases/Phase6_Report.vue -->
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
    const { data } = await supabase.from('job_phase_results')
      .select('phase_data')
      .eq('job_id', props.jobData.id)
      .eq('phase_order', 6)
      .single()
    
    if (data) {
      report.value = typeof data.phase_data === 'string' 
        ? JSON.parse(data.phase_data) 
        : data.phase_data
    }
  } catch (e) {
    ElMessage.error('載入報告失敗')
  } finally {
    loading.value = false
  }
}

const executiveSummary = computed(() => {
  return report.value?.key_highlights?.executive_summary || ''
})

const keyMetrics = computed(() => {
  return report.value?.key_highlights?.key_metrics || {}
})

const immediateActions = computed(() => {
  return report.value?.action_items?.immediate_actions || []
})

const shortTermActions = computed(() => {
  return report.value?.action_items?.short_term_actions || []
})

const longTermActions = computed(() => {
  return report.value?.action_items?.long_term_actions || []
})

const strategicRecommendations = computed(() => {
  return report.value?.strategic_recommendations || []
})

const downloadReport = () => {
  ElMessage.info('下載功能開發中...')
}

const getPriorityColor = (priority) => {
  const map = {
    'high': '#ef4444',
    'medium': '#f59e0b',
    'low': '#3b82f6'
  }
  return map[priority?.toLowerCase()] || '#64748b'
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
            <h1>{{ report?.report_title || '專利佈局策略報告' }}</h1>
            <p class="report-meta">
              <span>📅 生成日期：{{ new Date(report?.generated_at || Date.now()).toLocaleDateString('zh-TW') }}</span>
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

      <!-- 關鍵指標 -->
      <div class="metrics-section">
        <div class="metric-card">
          <div class="metric-icon">🎯</div>
          <div class="metric-info">
            <span class="metric-value">{{ keyMetrics.total_patents || 0 }}</span>
            <span class="metric-label">建議申請專利數</span>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-icon">🔥</div>
          <div class="metric-info">
            <span class="metric-value">{{ keyMetrics.p0_count || 0 }}</span>
            <span class="metric-label">P0 最高優先級</span>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-icon">⚡</div>
          <div class="metric-info">
            <span class="metric-value">{{ keyMetrics.p1_count || 0 }}</span>
            <span class="metric-label">P1 高優先級</span>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-icon">🌍</div>
          <div class="metric-info">
            <span class="metric-value">{{ keyMetrics.target_regions || 0 }}</span>
            <span class="metric-label">目標佈局區域</span>
          </div>
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
            :class="{ active: activeTab === 'actions' }"
            @click="activeTab = 'actions'"
          >
            <span class="tab-icon">✅</span>
            <span>行動計劃</span>
          </div>
          <div 
            class="tab-item"
            :class="{ active: activeTab === 'strategy' }"
            @click="activeTab = 'strategy'"
          >
            <span class="tab-icon">🎯</span>
            <span>策略建議</span>
          </div>
        </div>

        <div class="tab-content">
          <!-- 執行摘要 -->
          <div v-show="activeTab === 'summary'" class="summary-section">
            <div class="section-header">
              <h3>📋 執行摘要</h3>
              <p>本報告總結了專利佈局分析的核心發現與建議</p>
            </div>

            <div class="summary-content">
              <div class="summary-text">
                {{ executiveSummary }}
              </div>

              <!-- 關鍵發現 -->
              <div v-if="report?.key_highlights?.key_findings" class="findings-section">
                <h4>🔍 關鍵發現</h4>
                <div class="findings-grid">
                  <div 
                    v-for="(finding, idx) in report.key_highlights.key_findings" 
                    :key="idx"
                    class="finding-card"
                  >
                    <div class="finding-number">{{ idx + 1 }}</div>
                    <div class="finding-content">
                      <h5>{{ finding.title || `發現 ${idx + 1}` }}</h5>
                      <p>{{ finding.description || finding }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 行動計劃 -->
          <div v-show="activeTab === 'actions'" class="actions-section">
            <div class="section-header">
              <h3>✅ 行動計劃</h3>
              <p>按優先級和時間軸規劃的具體行動項目</p>
            </div>

            <!-- 立即行動 -->
            <div class="action-group immediate">
              <div class="group-header">
                <span class="group-icon">🚨</span>
                <h4>立即行動（0-1 個月）</h4>
                <span class="action-count">{{ immediateActions.length }} 項</span>
              </div>

              <div class="actions-list">
                <div 
                  v-for="(action, idx) in immediateActions" 
                  :key="idx"
                  class="action-card"
                >
                  <div class="action-header">
                    <span class="action-number">#{{ idx + 1 }}</span>
                    <el-tag 
                      type="danger" 
                      size="small"
                      effect="dark"
                    >
                      高優先級
                    </el-tag>
                  </div>
                  <h5 class="action-title">{{ action.action }}</h5>
                  <div class="action-meta">
                    <span class="meta-item">👤 負責人：{{ action.owner || '待指派' }}</span>
                    <span class="meta-item">📅 期限：{{ action.deadline || '立即' }}</span>
                  </div>
                  <div v-if="action.description" class="action-desc">
                    {{ action.description }}
                  </div>
                </div>
              </div>
            </div>

            <!-- 短期行動 -->
            <div v-if="shortTermActions.length > 0" class="action-group short-term">
              <div class="group-header">
                <span class="group-icon">⚡</span>
                <h4>短期行動（1-3 個月）</h4>
                <span class="action-count">{{ shortTermActions.length }} 項</span>
              </div>

              <div class="actions-list">
                <div 
                  v-for="(action, idx) in shortTermActions" 
                  :key="idx"
                  class="action-card"
                >
                  <div class="action-header">
                    <span class="action-number">#{{ idx + 1 }}</span>
                    <el-tag 
                      type="warning" 
                      size="small"
                    >
                      中優先級
                    </el-tag>
                  </div>
                  <h5 class="action-title">{{ action.action }}</h5>
                  <div class="action-meta">
                    <span class="meta-item">👤 {{ action.owner || '待指派' }}</span>
                    <span class="meta-item">📅 {{ action.deadline || '1-3 個月' }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 長期行動 -->
            <div v-if="longTermActions.length > 0" class="action-group long-term">
              <div class="group-header">
                <span class="group-icon">🎯</span>
                <h4>長期規劃（3-12 個月）</h4>
                <span class="action-count">{{ longTermActions.length }} 項</span>
              </div>

              <div class="actions-list">
                <div 
                  v-for="(action, idx) in longTermActions" 
                  :key="idx"
                  class="action-card"
                >
                  <div class="action-header">
                    <span class="action-number">#{{ idx + 1 }}</span>
                    <el-tag 
                      type="info" 
                      size="small"
                    >
                      規劃中
                    </el-tag>
                  </div>
                  <h5 class="action-title">{{ action.action }}</h5>
                  <div class="action-meta">
                    <span class="meta-item">👤 {{ action.owner || '待指派' }}</span>
                    <span class="meta-item">📅 {{ action.deadline || '長期' }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 策略建議 -->
          <div v-show="activeTab === 'strategy'" class="strategy-section">
            <div class="section-header">
              <h3>🎯 策略建議</h3>
              <p>基於競爭分析和市場評估的專利佈局策略</p>
            </div>

            <div class="strategies-list">
              <div 
                v-for="(strategy, idx) in strategicRecommendations" 
                :key="idx"
                class="strategy-card"
              >
                <div class="strategy-header">
                  <span class="strategy-number">策略 {{ idx + 1 }}</span>
                  <el-tag 
                    :type="strategy.priority === 'high' ? 'danger' : strategy.priority === 'medium' ? 'warning' : 'info'"
                    size="small"
                  >
                    {{ strategy.priority === 'high' ? '高優先級' : strategy.priority === 'medium' ? '中優先級' : '低優先級' }}
                  </el-tag>
                </div>

                <h4 class="strategy-title">{{ strategy.title || strategy.strategy }}</h4>
                
                <div class="strategy-content">
                  <div class="content-section">
                    <strong>📌 策略描述：</strong>
                    <p>{{ strategy.description || strategy.rationale }}</p>
                  </div>

                  <div v-if="strategy.expected_outcome" class="content-section">
                    <strong>🎯 預期成果：</strong>
                    <p>{{ strategy.expected_outcome }}</p>
                  </div>

                  <div v-if="strategy.implementation_steps" class="content-section">
                    <strong>📋 實施步驟：</strong>
                    <ol class="steps-list">
                      <li v-for="(step, sIdx) in strategy.implementation_steps" :key="sIdx">
                        {{ step }}
                      </li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>

            <!-- 空狀態 -->
            <div v-if="strategicRecommendations.length === 0" class="empty-state">
              <div class="empty-icon">📋</div>
              <p>暫無策略建議</p>
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

.header-actions .el-button {
  background: white;
  color: #667eea;
  border: none;
  font-weight: 600;
}

.header-actions .el-button:hover {
  background: #f8f9ff;
}

/* 關鍵指標 */
.metrics-section {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  padding: 32px 40px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.metric-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: white;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  transition: all 0.3s;
}

.metric-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
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

.metric-value {
  font-size: 28px;
  font-weight: 700;
  color: #1e293b;
}

.metric-label {
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
}

/* 標籤頁 */
.tabs-section {
  border-top: 1px solid #e2e8f0;
}

.custom-tabs {
  display: flex;
  background: white;
  border-bottom: 2px solid #e2e8f0;
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
  background: #f8f9ff;
}

.tab-item.active {
  color: #667eea;
  border-bottom-color: #667eea;
  background: #f8f9ff;
}

.tab-icon {
  font-size: 18px;
}

.tab-content {
  padding: 40px;
}

/* 區塊標題 */
.section-header {
  margin-bottom: 32px;
}

.section-header h3 {
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 8px 0;
}

.section-header p {
  font-size: 14px;
  color: #64748b;
  margin: 0;
}

/* 執行摘要 */
.summary-content {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.summary-text {
  font-size: 16px;
  line-height: 1.8;
  color: #334155;
  white-space: pre-line;
  padding: 24px;
  background: linear-gradient(135deg, #f8f9ff 0%, #f0f4ff 100%);
  border-radius: 12px;
  border: 1px solid #e0e7ff;
}

.findings-section h4 {
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 20px 0;
}

.findings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.finding-card {
  display: flex;
  gap: 16px;
  padding: 20px;
  background: white;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  transition: all 0.3s;
}

.finding-card:hover {
  border-color: #667eea;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
}

.finding-number {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 10px;
  font-weight: 700;
  font-size: 18px;
  flex-shrink: 0;
}

.finding-content h5 {
  font-size: 15px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 8px 0;
}

.finding-content p {
  font-size: 14px;
  color: #64748b;
  line-height: 1.6;
  margin: 0;
}

/* 行動計劃 */
.actions-section {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.action-group {
  padding: 24px;
  border-radius: 12px;
  border: 2px solid;
}

.action-group.immediate {
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
  border-color: #fca5a5;
}

.action-group.short-term {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-color: #fbbf24;
}

.action-group.long-term {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  border-color: #93c5fd;
}

.group-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 2px dashed rgba(0, 0, 0, 0.1);
}

.group-icon {
  font-size: 24px;
}

.group-header h4 {
  flex: 1;
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

.action-count {
  font-size: 14px;
  font-weight: 600;
  color: #64748b;
  padding: 4px 12px;
  background: white;
  border-radius: 12px;
}

.actions-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.action-card {
  background: white;
  border-radius: 10px;
  padding: 20px;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.action-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.action-number {
  font-size: 13px;
  font-weight: 700;
  color: #667eea;
  padding: 4px 10px;
  background: #f0f4ff;
  border-radius: 6px;
}

.action-title {
  font-size: 16px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 12px 0;
}

.action-meta {
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
}

.meta-item {
  font-size: 13px;
  color: #64748b;
}

.action-desc {
  font-size: 14px;
  color: #475569;
  line-height: 1.6;
  padding: 12px;
  background: #f8fafc;
  border-radius: 6px;
  margin-top: 12px;
}

/* 策略建議 */
.strategies-list {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.strategy-card {
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  padding: 24px;
  transition: all 0.3s;
}

.strategy-card:hover {
  border-color: #667eea;
  box-shadow: 0 8px 16px rgba(102, 126, 234, 0.15);
}

.strategy-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.strategy-number {
  font-size: 14px;
  font-weight: 700;
  color: #667eea;
  padding: 6px 16px;
  background: #f0f4ff;
  border-radius: 8px;
}

.strategy-title {
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 20px 0;
}

.strategy-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.content-section {
  padding: 16px;
  background: #f8fafc;
  border-radius: 8px;
  border-left: 4px solid #667eea;
}

.content-section strong {
  display: block;
  font-size: 14px;
  color: #475569;
  margin-bottom: 8px;
}

.content-section p {
  font-size: 14px;
  color: #64748b;
  line-height: 1.6;
  margin: 0;
}

.steps-list {
  margin: 0;
  padding-left: 20px;
}

.steps-list li {
  font-size: 14px;
  color: #64748b;
  line-height: 1.8;
  margin-bottom: 8px;
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
  opacity: 0.5;
}

/* 響應式 */
@media (max-width: 1200px) {
  .metrics-section {
    grid-template-columns: repeat(2, 1fr);
  }

  .findings-grid {
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

  .metrics-section {
    grid-template-columns: 1fr;
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

  .tab-content {
    padding: 24px;
  }
}
</style>
