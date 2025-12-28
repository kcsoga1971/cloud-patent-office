<!-- src/views/services/QCPanel.vue -->
<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../../supabase'

const props = defineProps({
  jobId: { type: String, required: true },
  draft: { type: String, required: true },
  modelName: { type: String, default: 'claude-sonnet-4.5' },
  status: { type: String, default: '' } // ✅ 新增：接收案件狀態
})

const emit = defineEmits(['qc-complete'])

// ========== 狀態管理 ==========
const isChecking = ref(false)
const qcReport = ref(null)
const errorMessage = ref('')
const isLoadingReport = ref(false) // ✅ 新增：載入狀態

// ========== 輔助函數 ==========
const getDimensionName = (key) => {
  const names = {
    structure: '結構完整性',
    numbering: '段落編號規範',
    claims: '請求項品質',
    description: '技術描述品質',
    compliance: '專利規範符合度'
  }
  return names[key] || key
}

const getGradeColor = (grade) => {
  if (!grade) return '#999'
  if (grade.startsWith('A')) return '#4caf50'
  if (grade.startsWith('B')) return '#2196f3'
  if (grade.startsWith('C')) return '#ff9800'
  return '#f44336'
}

const getPriorityColor = (priority) => {
  if (priority === 'high') return '#f44336'
  if (priority === 'medium') return '#ff9800'
  return '#4caf50'
}

// ========== 🔍 超級偵錯版：載入既有報告函數 ==========
const fetchExistingReport = async () => {
  isLoadingReport.value = true
  console.log('🚀 [Debug] 準備開始查詢 Supabase...')
  console.log('👉 [Debug] 前端目前的 Job ID:', props.jobId) 
  
  if (!props.jobId) {
    console.error('❌ [Debug] 嚴重錯誤：jobId 是空的！無法查詢')
    isLoadingReport.value = false
    return
  }

  try {
    // 步驟 1: 先不要用 .single()，直接查陣列，看看有沒有抓到東西
    const { data, error } = await supabase
      .from('qc_reports')
      .select('*')
      .eq('job_id', props.jobId)
      .order('created_at', { ascending: false })
    
    console.log('📡 [Debug] Supabase 回傳原始 Data:', data)
    console.log('📡 [Debug] Supabase 回傳 Error:', error)

    if (error) {
      console.error('❌ [Debug] 查詢過程發生錯誤:', error.message)
      throw error
    }

    if (data && data.length > 0) {
      console.log(`✅ [Debug] 成功找到 ${data.length} 筆報告，取第一筆(最新)`)
      const latestReport = data[0]
      
      // 處理 JSON 欄位
      if (typeof latestReport.ai_analysis === 'string') {
        try {
          latestReport.ai_analysis = JSON.parse(latestReport.ai_analysis)
        } catch (e) {
          console.error('⚠️ [Debug] JSON 解析警告:', e)
        }
      }
      
      qcReport.value = latestReport
      console.log('🎉 [Debug] qcReport 變數已更新，畫面應該要顯示了！')
    } else {
      console.warn('⚠️ [Debug] 查詢成功，但資料庫裡「找不到」這個 Job ID 的報告')
      console.warn('💡 [Debug] 請檢查：您現在網址上的 ID，跟資料庫裡的 job_id 真的一樣嗎？')
    }
    
  } catch (err) {
    console.error('❌ [Debug] 程式執行崩潰:', err)
  } finally {
    isLoadingReport.value = false
  }
}

// ========== ✅ 新增：在掛載時執行載入 ==========
onMounted(() => {
  // ✅ 修正邏輯：只有當狀態是 'checked' 時，才嘗試去載入歷史報告
  if (props.status === 'checked') {
    console.log('✅ 案件狀態為 checked，開始載入報告...')
    fetchExistingReport()
  } else {
    console.log('ℹ️ 案件狀態未檢查，等待使用者操作...')
  }
})

// ========== 執行 QC 檢查 ==========
const runQCCheck = async () => {
  errorMessage.value = ''
  isChecking.value = true
  
  try {
    console.log('🔍 開始 QC 檢查...')
    
    // 取得當前使用者
    const { data: { session } } = await supabase.auth.getSession()
    
    // 使用環境變數
    const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_PHASE5_URL
    
    if (!webhookUrl) {
      throw new Error('未設定 VITE_N8N_WEBHOOK_PHASE5_URL')
    }
    
    console.log('📡 Webhook URL:', webhookUrl)
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job_id: props.jobId,
        user_id: session?.user.id,
        draft: props.draft,
        model_name: props.modelName
      })
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`QC 檢查請求失敗 (${response.status}): ${errorText}`)
    }
    
    const data = await response.json()
    
    console.log('✅ QC 檢查完成:', data)
    
    // 更新當前顯示的報告
    qcReport.value = data.qc_report
    
    // 通知父組件
    emit('qc-complete', data.qc_report)
    
    // 檢查完後再次確認資料庫狀態（確保資料一致性）
    await fetchExistingReport()
    
  } catch (err) {
    console.error('❌ QC 檢查失敗:', err)
    errorMessage.value = err.message
    alert('QC 檢查失敗：' + err.message)
  } finally {
    isChecking.value = false
  }
}
</script>

<template>
  <div class="qc-panel">
    <h3>🔍 品質檢查（QC）</h3>
    
    <div v-if="isLoadingReport" class="loading-state">
      <div class="loader-small"></div>
      <p>正在載入歷史報告...</p>
    </div>
    
    <!-- 檢查說明 -->
    <div v-if="!qcReport" class="qc-intro">
      <p class="intro-text">對專利說明書進行全面的品質檢查，包括：</p>
      <div class="check-items">
        <div class="check-item">
          <span class="check-icon">✅</span>
          <span class="check-label">結構完整性</span>
        </div>
        <div class="check-item">
          <span class="check-icon">✅</span>
          <span class="check-label">段落編號規範</span>
        </div>
        <div class="check-item">
          <span class="check-icon">✅</span>
          <span class="check-label">請求項品質</span>
        </div>
        <div class="check-item">
          <span class="check-icon">✅</span>
          <span class="check-label">技術描述品質</span>
        </div>
        <div class="check-item">
          <span class="check-icon">✅</span>
          <span class="check-label">專利規範符合度</span>
        </div>
      </div>
      
      <button 
        @click="runQCCheck"
        :disabled="isChecking"
        class="btn-check"
      >
        <span v-if="!isChecking">🚀 開始檢查</span>
        <span v-else>⏳ 檢查中...</span>
      </button>
    </div>
    
    <!-- QC 報告 -->
    <div v-if="qcReport" class="qc-report">
      <!-- 總分與等級 -->
      <div class="score-section">
        <div class="score-card">
          <div class="score-circle" :style="{ borderColor: getGradeColor(qcReport.grade) }">
            <div class="score-value">{{ qcReport.overall_score }}</div>
            <div class="score-label">總分</div>
          </div>
          <div class="grade-info">
            <div class="grade-badge" :style="{ background: getGradeColor(qcReport.grade) }">
              {{ qcReport.grade }}
            </div>
            <p class="grade-desc">
              <span v-if="qcReport.grade.startsWith('A')">優秀 - 可直接提交</span>
              <span v-else-if="qcReport.grade.startsWith('B')">良好 - 建議微調</span>
              <span v-else-if="qcReport.grade.startsWith('C')">尚可 - 需要改進</span>
              <span v-else>不足 - 必須修改</span>
            </p>
          </div>
        </div>
      </div>
      
      <!-- 各維度評分 -->
      <div class="dimensions-section">
        <h4>📊 各維度評分</h4>
        <div class="dimensions-grid">
          <div 
            v-for="(dimension, key) in qcReport.ai_analysis.dimensions" 
            :key="key"
            class="dimension-card"
          >
            <div class="dimension-header">
              <span class="dimension-name">{{ getDimensionName(key) }}</span>
              <span class="dimension-score">
                {{ dimension.score }} / {{ dimension.max_score }}
              </span>
            </div>
            
            <div class="progress-bar">
              <div 
                class="progress-fill"
                :style="{ 
                  width: (dimension.score / dimension.max_score * 100) + '%',
                  background: dimension.score / dimension.max_score >= 0.8 ? '#4caf50' : 
                             dimension.score / dimension.max_score >= 0.6 ? '#ff9800' : '#f44336'
                }"
              ></div>
            </div>
            
            <div v-if="dimension.issues && dimension.issues.length > 0" class="dimension-issues">
              <p class="issues-title">❌ 問題：</p>
              <ul class="issues-list">
                <li v-for="(issue, idx) in dimension.issues" :key="idx">{{ issue }}</li>
              </ul>
            </div>
            
            <div v-if="dimension.suggestions && dimension.suggestions.length > 0" class="dimension-suggestions">
              <p class="suggestions-title">💡 建議：</p>
              <ul class="suggestions-list">
                <li v-for="(suggestion, idx) in dimension.suggestions" :key="idx">{{ suggestion }}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 關鍵問題 -->
      <div v-if="qcReport.ai_analysis.critical_issues?.length > 0" class="critical-section">
        <h4>🚨 關鍵問題</h4>
        <div class="critical-list">
          <div 
            v-for="(issue, idx) in qcReport.ai_analysis.critical_issues" 
            :key="idx"
            class="critical-item"
          >
            <span class="critical-icon">⚠️</span>
            <span class="critical-text">{{ issue }}</span>
          </div>
        </div>
      </div>
      
      <!-- 優先改進項目 -->
      <div v-if="qcReport.ai_analysis.priority_improvements?.length > 0" class="improvements-section">
        <h4>🎯 優先改進項目</h4>
        <div class="improvements-list">
          <div 
            v-for="(item, idx) in qcReport.ai_analysis.priority_improvements" 
            :key="idx"
            class="improvement-card"
          >
            <div class="improvement-header">
              <span 
                class="priority-badge"
                :style="{ background: getPriorityColor(item.priority) }"
              >
                {{ item.priority === 'high' ? '高' : item.priority === 'medium' ? '中' : '低' }}
              </span>
              <span class="improvement-title">{{ item.item }}</span>
            </div>
            <p class="improvement-reason">{{ item.reason }}</p>
            <p class="improvement-time">⏱️ 預估時間：{{ item.estimated_time }}</p>
          </div>
        </div>
      </div>
      
      <!-- 優點 -->
      <div v-if="qcReport.ai_analysis.strengths?.length > 0" class="strengths-section">
        <h4>✨ 優點</h4>
        <div class="strengths-list">
          <div 
            v-for="(strength, idx) in qcReport.ai_analysis.strengths" 
            :key="idx"
            class="strength-item"
          >
            <span class="strength-icon">👍</span>
            <span class="strength-text">{{ strength }}</span>
          </div>
        </div>
      </div>
      
      <!-- 提交準備度 -->
      <div class="readiness-section">
        <h4>📋 提交準備度</h4>
        <div class="readiness-content">
          <div class="readiness-bar">
            <div 
              class="readiness-fill"
              :style="{ 
                width: qcReport.ai_analysis.submission_readiness + '%',
                background: qcReport.ai_analysis.submission_readiness >= 80 ? '#4caf50' : 
                           qcReport.ai_analysis.submission_readiness >= 60 ? '#ff9800' : '#f44336'
              }"
            ></div>
          </div>
          <div class="readiness-info">
            <span class="readiness-percent">{{ qcReport.ai_analysis.submission_readiness }}%</span>
            <span 
              class="readiness-status"
              :style="{ 
                color: qcReport.ai_analysis.ready_for_submission ? '#4caf50' : '#ff9800'
              }"
            >
              <span v-if="qcReport.ai_analysis.ready_for_submission">✅ 可提交</span>
              <span v-else>⚠️ 建議修改後再提交</span>
            </span>
          </div>
        </div>
      </div>
      
      <!-- 操作按鈕 -->
      <div class="actions">
        <button @click="qcReport = null" class="btn-recheck">
          🔄 重新檢查
        </button>
        <button 
          @click="$router.push(`/services/revision/${props.jobId}`)" 
          class="btn-revise"
        >
          ✏️ 前往修改
        </button>
      </div>
    </div>
    
    <!-- 錯誤訊息 -->
    <div v-if="errorMessage" class="error-message">
      <span class="error-icon">⚠️</span>
      <span class="error-text">{{ errorMessage }}</span>
    </div>
  </div>
</template>

<style scoped>
.qc-panel {
  background: white;
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.qc-panel h3 {
  margin: 0 0 24px 0;
  font-size: 24px;
  color: #1a1a1a;
}

/* ========== 檢查說明 ========== */
.qc-intro {
  text-align: center;
  padding: 40px 20px;
}

.intro-text {
  margin: 0 0 32px 0;
  font-size: 16px;
  color: #666;
}

.check-items {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 40px;
}

.check-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 12px;
}

.check-icon {
  font-size: 24px;
}

.check-label {
  font-size: 15px;
  font-weight: 500;
  color: #333;
}

.btn-check {
  padding: 16px 48px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-check:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.3);
}

.btn-check:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ========== QC 報告 ========== */
.qc-report {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

/* ========== 總分區域 ========== */
.score-section {
  padding: 32px;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  border-radius: 16px;
}

.score-card {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 48px;
}

.score-circle {
  width: 140px;
  height: 140px;
  border: 8px solid;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: white;
}

.score-value {
  font-size: 48px;
  font-weight: bold;
  color: #1a1a1a;
}

.score-label {
  font-size: 14px;
  color: #666;
  margin-top: 4px;
}

.grade-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.grade-badge {
  padding: 12px 32px;
  color: white;
  border-radius: 24px;
  font-size: 32px;
  font-weight: bold;
}

.grade-desc {
  margin: 0;
  font-size: 16px;
  color: #666;
  font-weight: 500;
}

/* ========== 維度評分 ========== */
.dimensions-section h4,
.critical-section h4,
.improvements-section h4,
.strengths-section h4,
.readiness-section h4 {
  margin: 0 0 20px 0;
  font-size: 20px;
  color: #1a1a1a;
}

.dimensions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.dimension-card {
  padding: 24px;
  background: #f8f9fa;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
}

.dimension-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.dimension-name {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.dimension-score {
  font-size: 16px;
  font-weight: bold;
  color: #667eea;
}

.progress-bar {
  height: 10px;
  background: #e0e0e0;
  border-radius: 5px;
  overflow: hidden;
  margin-bottom: 16px;
}

.progress-fill {
  height: 100%;
  transition: width 0.3s ease;
}

.dimension-issues,
.dimension-suggestions {
  margin-top: 16px;
}

.issues-title,
.suggestions-title {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.issues-list,
.suggestions-list {
  margin: 0;
  padding-left: 20px;
}

.issues-list li,
.suggestions-list li {
  margin-bottom: 6px;
  font-size: 14px;
  color: #666;
  line-height: 1.6;
}

/* ========== 關鍵問題 ========== */
.critical-section {
  padding: 24px;
  background: #fff3e0;
  border-left: 4px solid #ff9800;
  border-radius: 12px;
}

.critical-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.critical-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  background: white;
  border-radius: 8px;
}

.critical-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.critical-text {
  font-size: 15px;
  color: #e65100;
  line-height: 1.6;
}

/* ========== 改進項目 ========== */
.improvements-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.improvement-card {
  padding: 20px;
  background: #f8f9fa;
  border-radius: 12px;
}

.improvement-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.priority-badge {
  padding: 4px 12px;
  color: white;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.improvement-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.improvement-reason,
.improvement-time {
  margin: 8px 0 0 0;
  font-size: 14px;
  color: #666;
  line-height: 1.6;
}

/* ========== 優點 ========== */
.strengths-section {
  padding: 24px;
  background: #e8f5e9;
  border-left: 4px solid #4caf50;
  border-radius: 12px;
}

.strengths-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.strength-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  background: white;
  border-radius: 8px;
}

.strength-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.strength-text {
  font-size: 15px;
  color: #2e7d32;
  line-height: 1.6;
}

/* ========== 提交準備度 ========== */
.readiness-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.readiness-bar {
  height: 24px;
  background: #e0e0e0;
  border-radius: 12px;
  overflow: hidden;
}

.readiness-fill {
  height: 100%;
  transition: width 0.3s ease;
}

.readiness-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.readiness-percent {
  font-size: 24px;
  font-weight: bold;
  color: #1a1a1a;
}

.readiness-status {
  font-size: 18px;
  font-weight: 600;
}

/* ========== 操作按鈕 ========== */
.actions {
  display: flex;
  gap: 16px;
  justify-content: center;
  padding-top: 24px;
  border-top: 2px solid #e0e0e0;
}

.btn-recheck,
.btn-revise {
  padding: 12px 32px;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-recheck {
  background: #6c757d;
  color: white;
}

.btn-recheck:hover {
  background: #5a6268;
  transform: translateY(-2px);
}

.btn-revise {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
}

.btn-revise:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.3);
}

/* ========== 錯誤訊息 ========== */
.error-message {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #ffebee;
  border-left: 4px solid #f44336;
  border-radius: 8px;
  margin-top: 16px;
}

.error-icon {
  font-size: 24px;
}

.error-text {
  font-size: 15px;
  color: #c62828;
  line-height: 1.6;
}

/* ========== 響應式設計 ========== */
@media (max-width: 768px) {
  .qc-panel {
    padding: 20px;
  }
  
  .score-card {
    flex-direction: column;
    gap: 24px;
  }
  
  .dimensions-grid {
    grid-template-columns: 1fr;
  }
  
  .actions {
    flex-direction: column;
  }
  
  .btn-recheck,
  .btn-revise {
    width: 100%;
  }
}
</style>

