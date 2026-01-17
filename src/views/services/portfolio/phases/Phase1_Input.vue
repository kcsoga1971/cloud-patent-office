<!-- src/views/services/portfolio/phases/Phase1_Input.vue -->
<script setup>
import { ref, reactive, computed } from 'vue'
import { supabase } from '../../../../supabase'
import { useUserStore } from '@/stores/user'
import { ElMessage } from 'element-plus'

const emit = defineEmits(['next'])
const userStore = useUserStore()
const loading = ref(false)
const activeStep = ref(0)

const form = reactive({
  project_name: '',
  technical_solution_description: '',
  technical_documents: [],
  existing_patents: []
})

const handleFileChange = (file) => {
  form.technical_documents.push({ 
    file: file.raw, 
    name: file.name, 
    description: file.name,
    size: file.size
  })
  return false
}

const removeFile = (idx) => {
  form.technical_documents.splice(idx, 1)
}

const addPatent = () => {
  form.existing_patents.push({ patent_number: '', is_core: false })
}

const removePatent = (idx) => {
  form.existing_patents.splice(idx, 1)
}

const canProceedStep0 = computed(() => {
  return form.project_name && form.technical_solution_description
})

const canProceedStep1 = computed(() => {
  return form.technical_documents.length > 0
})

const nextStep = () => {
  if (activeStep.value === 0 && !canProceedStep0.value) {
    ElMessage.warning('請填寫完整的專案資訊')
    return
  }
  if (activeStep.value === 1 && !canProceedStep1.value) {
    ElMessage.warning('請至少上傳一份技術文件')
    return
  }
  activeStep.value++
}

const prevStep = () => {
  activeStep.value--
}

const startAnalysis = async () => {
  if (!canProceedStep0.value) {
    ElMessage.warning('請填寫完整資訊')
    return
  }
  
  loading.value = true
  try {
    // 1. Upload files
    const uploadedDocs = []
    for (const doc of form.technical_documents) {
      const path = `portfolio/${Date.now()}_${doc.name}`
      const { error: uploadError } = await supabase.storage
        .from('patent-documents')
        .upload(path, doc.file)
      
      if (uploadError) throw uploadError
      
      const { data } = supabase.storage
        .from('patent-documents')
        .getPublicUrl(path)
      
      uploadedDocs.push({ 
        url: data.publicUrl, 
        type: 'pdf', 
        description: doc.description 
      })
    }

    // 2. Create Job
    const { data: job, error } = await supabase.from('saas_jobs').insert({
      user_id: userStore.user.id,
      job_type: 'patent_portfolio',
      status: 'processing',
      current_phase: 'patent_portfolio_technical_analysis',
      input_data: {
        project_name: form.project_name,
        technical_solution_description: form.technical_solution_description,
        technical_documents: uploadedDocs,
        existing_patents: form.existing_patents
      }
    }).select().single()
    
    if (error) throw error

    ElMessage.success('專案建立成功，開始分析...')

    // 3. Trigger Phase 1
    emit('next', import.meta.env.VITE_N8N_PORTFOLIO_PHASE1_URL, { job_id: job.id })
  } catch (e) {
    ElMessage.error('啟動失敗: ' + e.message)
  } finally {
    loading.value = false
  }
}

const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}
</script>

<template>
  <div class="input-container">
    <div class="input-card">
      <!-- 頂部標題 -->
      <div class="card-header">
        <div class="icon-badge">♟️</div>
        <div class="title-section">
          <h2>專利佈局專案設定</h2>
          <p>建立新的專利佈局專案，從技術拆解到全球佈局策略</p>
        </div>
      </div>

      <!-- 步驟指示器 -->
      <div class="steps-indicator">
        <div 
          v-for="(step, idx) in ['基本資訊', '技術文件', '確認啟動']" 
          :key="idx"
          class="step-dot"
          :class="{ 
            active: idx === activeStep,
            completed: idx < activeStep 
          }"
        >
          <div class="dot">
            <span v-if="idx < activeStep">✓</span>
            <span v-else>{{ idx + 1 }}</span>
          </div>
          <span class="step-label">{{ step }}</span>
        </div>
      </div>

      <!-- 步驟內容 -->
      <div class="steps-content">
        <!-- Step 0: 基本資訊 -->
        <div v-show="activeStep === 0" class="step-panel">
          <div class="panel-header">
            <h3>📝 基本資訊</h3>
            <p>請提供專案名稱和技術方案的詳細描述</p>
          </div>

          <el-form label-position="top" size="large">
            <el-form-item label="專案名稱" required class="form-item">
              <el-input 
                v-model="form.project_name"
                placeholder="例如：智能手機散熱技術專利佈局"
                clearable
              >
                <template #prefix>
                  <span class="input-icon">📋</span>
                </template>
              </el-input>
            </el-form-item>

            <el-form-item label="技術方案描述" required class="form-item">
              <el-input 
                v-model="form.technical_solution_description"
                type="textarea"
                :rows="8"
                placeholder="請詳細描述：&#10;1. 要解決的技術問題&#10;2. 採用的技術手段&#10;3. 達到的技術效果&#10;4. 與現有技術的區別"
                show-word-limit
                maxlength="2000"
              />
              <div class="form-tip">
                <span class="tip-icon">💡</span>
                描述越詳細，AI 分析結果越精準
              </div>
            </el-form-item>
          </el-form>
        </div>

        <!-- Step 1: 技術文件 -->
        <div v-show="activeStep === 1" class="step-panel">
          <div class="panel-header">
            <h3>📄 技術文件上傳</h3>
            <p>上傳技術規格書、設計文件或相關專利文件</p>
          </div>

          <el-upload
            class="custom-upload"
            drag
            action="#"
            :auto-upload="false"
            :on-change="handleFileChange"
            :show-file-list="false"
            multiple
            accept=".pdf,.doc,.docx"
          >
            <div class="upload-content">
              <div class="upload-icon">📁</div>
              <div class="upload-text">
                <p class="upload-main">拖曳技術文件至此或 <em>點擊上傳</em></p>
                <p class="upload-hint">支援 PDF、DOC、DOCX 格式，可同時上傳多個檔案</p>
              </div>
            </div>
          </el-upload>

          <!-- 檔案列表 -->
          <div v-if="form.technical_documents.length > 0" class="files-list">
            <div class="list-header">
              <span>已上傳 {{ form.technical_documents.length }} 個檔案</span>
            </div>
            <div 
              v-for="(doc, idx) in form.technical_documents" 
              :key="idx"
              class="file-item"
            >
              <div class="file-icon">📄</div>
              <div class="file-info">
                <span class="file-name">{{ doc.name }}</span>
                <span class="file-size">{{ formatFileSize(doc.size) }}</span>
              </div>
              <el-button 
                type="danger" 
                circle 
                size="small"
                @click="removeFile(idx)"
              >
                ✕
              </el-button>
            </div>
          </div>
        </div>

        <!-- Step 2: 確認 -->
        <div v-show="activeStep === 2" class="step-panel">
          <div class="panel-header">
            <h3>✅ 確認並啟動</h3>
            <p>檢查資訊並選擇性添加現有專利</p>
          </div>

          <!-- 摘要資訊 -->
          <div class="summary-card">
            <div class="summary-item">
              <span class="summary-label">專案名稱</span>
              <span class="summary-value">{{ form.project_name }}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">技術描述</span>
              <span class="summary-value">{{ form.technical_solution_description.substring(0, 100) }}...</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">上傳檔案</span>
              <span class="summary-value">{{ form.technical_documents.length }} 個檔案</span>
            </div>
          </div>

          <!-- 現有專利（選填） -->
          <div class="patents-section">
            <div class="section-title">
              <h4>🔖 現有專利（選填）</h4>
              <el-button 
                type="primary" 
                plain 
                size="small"
                @click="addPatent"
              >
                ➕ 新增專利
              </el-button>
            </div>

            <div v-if="form.existing_patents.length > 0" class="patents-list">
              <div 
                v-for="(p, idx) in form.existing_patents" 
                :key="idx"
                class="patent-item"
              >
                <el-input 
                  v-model="p.patent_number"
                  placeholder="專利號，例如：US1234567"
                  class="patent-input"
                />
                <el-checkbox 
                  v-model="p.is_core"
                  label="核心專利"
                  border
                />
                <el-button 
                  type="danger" 
                  circle 
                  size="small"
                  @click="removePatent(idx)"
                >
                  ✕
                </el-button>
              </div>
            </div>

            <div v-else class="empty-patents">
              <span>暫無專利，可選擇性添加現有專利以輔助分析</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 底部按鈕 -->
      <div class="action-buttons">
        <el-button 
          v-if="activeStep > 0"
          size="large"
          @click="prevStep"
        >
          ← 上一步
        </el-button>

        <div class="flex-spacer"></div>

        <el-button 
          v-if="activeStep < 2"
          type="primary"
          size="large"
          class="next-btn"
          :disabled="activeStep === 0 ? !canProceedStep0 : !canProceedStep1"
          @click="nextStep"
        >
          下一步 →
        </el-button>

        <el-button 
          v-else
          type="primary"
          size="large"
          class="submit-btn"
          :loading="loading"
          @click="startAnalysis"
        >
          {{ loading ? '處理中...' : '🚀 啟動分析' }}
        </el-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.input-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 24px;
}

.input-card {
  background: white;
  border-radius: 16px;
  padding: 48px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

/* 卡片頭部 */
.card-header {
  display: flex;
  align-items: center;
  gap: 24px;
  margin-bottom: 40px;
  padding-bottom: 32px;
  border-bottom: 2px solid #f1f5f9;
}

.icon-badge {
  width: 72px;
  height: 72px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
  box-shadow: 0 8px 16px rgba(102, 126, 234, 0.3);
}

.title-section h2 {
  font-size: 28px;
  font-weight: 700;
  color: #2c3e50;
  margin: 0 0 8px 0;
}

.title-section p {
  font-size: 14px;
  color: #64748b;
  margin: 0;
}

/* 步驟指示器 */
.steps-indicator {
  display: flex;
  justify-content: space-between;
  margin-bottom: 48px;
  position: relative;
}

.steps-indicator::before {
  content: '';
  position: absolute;
  top: 20px;
  left: 10%;
  right: 10%;
  height: 3px;
  background: #e2e8f0;
  z-index: 0;
}

.step-dot {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  position: relative;
  z-index: 1;
  flex: 1;
}

.dot {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: #94a3b8;
  transition: all 0.3s;
}

.step-dot.active .dot {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  transform: scale(1.2);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.step-dot.completed .dot {
  background: #10b981;
  color: white;
}

.step-label {
  font-size: 13px;
  font-weight: 600;
  color: #94a3b8;
}

.step-dot.active .step-label {
  color: #667eea;
}

.step-dot.completed .step-label {
  color: #10b981;
}

/* 步驟內容 */
.steps-content {
  min-height: 400px;
}

.step-panel {
  animation: fadeIn 0.3s;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.panel-header {
  margin-bottom: 32px;
}

.panel-header h3 {
  font-size: 22px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 8px 0;
}

.panel-header p {
  font-size: 14px;
  color: #64748b;
  margin: 0;
}

/* 表單樣式 */
.form-item {
  margin-bottom: 32px;
}

:deep(.el-input__wrapper) {
  border-radius: 12px;
  padding: 12px 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border: 1px solid #e2e8f0;
}

:deep(.el-input__wrapper:hover) {
  border-color: #667eea;
}

:deep(.el-textarea__inner) {
  border-radius: 12px;
  padding: 16px;
  border: 1px solid #e2e8f0;
  font-family: inherit;
}

.input-icon {
  font-size: 18px;
  margin-right: 4px;
}

.form-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding: 10px 14px;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-radius: 8px;
  font-size: 13px;
  color: #92400e;
  border: 1px solid #fbbf24;
}

.tip-icon {
  font-size: 16px;
}

/* 上傳區域 */
.custom-upload {
  margin-bottom: 24px;
}

:deep(.el-upload-dragger) {
  border: 2px dashed #cbd5e1;
  border-radius: 12px;
  background: #f8fafc;
  padding: 40px;
}

:deep(.el-upload-dragger:hover) {
  border-color: #667eea;
  background: linear-gradient(135deg, #f8f9ff 0%, #f0f4ff 100%);
}

.upload-content {
  text-align: center;
}

.upload-icon {
  font-size: 56px;
  margin-bottom: 16px;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

.upload-main {
  font-size: 16px;
  color: #475569;
  margin: 0 0 8px 0;
  font-weight: 500;
}

.upload-main em {
  color: #667eea;
  font-style: normal;
  font-weight: 600;
}

.upload-hint {
  font-size: 13px;
  color: #94a3b8;
  margin: 0;
}

/* 檔案列表 */
.files-list {
  background: #f8fafc;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #e2e8f0;
}

.list-header {
  font-size: 14px;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e2e8f0;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: white;
  border-radius: 8px;
  margin-bottom: 12px;
  transition: all 0.2s;
}

.file-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.file-icon {
  font-size: 28px;
}

.file-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.file-name {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
}

.file-size {
  font-size: 12px;
  color: #94a3b8;
}

/* 摘要卡片 */
.summary-card {
  background: linear-gradient(135deg, #f8f9ff 0%, #f0f4ff 100%);
  border-radius: 12px;
  padding: 24px;
  border: 1px solid #e0e7ff;
  margin-bottom: 32px;
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
}

.summary-item:last-child {
  margin-bottom: 0;
}

.summary-label {
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
}

.summary-value {
  font-size: 15px;
  color: #1e293b;
  line-height: 1.6;
}

/* 專利區域 */
.patents-section {
  background: #f8fafc;
  border-radius: 12px;
  padding: 24px;
  border: 1px solid #e2e8f0;
}

.section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-title h4 {
  font-size: 16px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

.patents-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.patent-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: white;
  border-radius: 8px;
}

.patent-input {
  flex: 1;
}

.empty-patents {
  text-align: center;
  padding: 32px;
  color: #94a3b8;
  font-size: 14px;
}

/* 底部按鈕 */
.action-buttons {
  display: flex;
  gap: 12px;
  margin-top: 48px;
  padding-top: 32px;
  border-top: 2px solid #f1f5f9;
}

.flex-spacer {
  flex: 1;
}

.next-btn,
.submit-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  font-weight: 600;
  padding: 12px 32px;
  height: auto;
}

.next-btn:hover:not(:disabled),
.submit-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%);
}

/* 響應式 */
@media (max-width: 768px) {
  .input-card {
    padding: 32px 24px;
  }

  .card-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .steps-indicator::before {
    display: none;
  }
}
</style>
