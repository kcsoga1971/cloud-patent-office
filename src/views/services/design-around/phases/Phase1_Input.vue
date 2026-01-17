<!-- src/views/services/design-around/phases/Phase1_Input.vue -->
<script setup>
import { ref, reactive } from 'vue'
import { supabase } from '../../../../supabase'
import { useUserStore } from '@/stores/user'
import { ElMessage } from 'element-plus'

const emit = defineEmits(['next'])
const userStore = useUserStore()
const loading = ref(false)
const fileList = ref([])

const form = reactive({
  project_name: '',
  target_patent_numbers: '',
  product_description_url: '',
  expand_search: true
})

// 1. 上傳檔案到 Storage
const uploadFiles = async () => {
  const uploadedPdfs = []
  for (const file of fileList.value) {
    const fileName = `${Date.now()}_${file.name}`
    const { error } = await supabase.storage.from('patent-documents').upload(fileName, file.raw)
    if (error) throw error
    
    const { data } = supabase.storage.from('patent-documents').getPublicUrl(fileName)
    uploadedPdfs.push({ url: data.publicUrl, is_primary: true })
  }
  return uploadedPdfs
}

// 2. 建立 Job 並觸發 Phase 1
const startAnalysis = async () => {
  if (!form.project_name) {
    ElMessage.warning('請輸入專案名稱')
    return
  }
  
  if (fileList.value.length === 0 && !form.target_patent_numbers) {
    ElMessage.warning('請至少上傳一個 PDF 或輸入專利案號')
    return
  }
  
  loading.value = true
  
  try {
    // A. 建立 Job 紀錄
    const { data: job, error } = await supabase.from('saas_jobs').insert({
      user_id: userStore.user.id,
      job_type: 'design_around',
      status: 'processing',
      current_phase: 'init',
      input_data: { ...form }
    }).select().single()
    
    if (error) throw error

    // B. 上傳檔案
    const uploadedPdfs = fileList.value.length > 0 ? await uploadFiles() : []

    // C. 準備 Payload
    const payload = {
      job_id: job.id,
      input_data: {
        uploaded_pdfs: uploadedPdfs,
        patent_numbers: form.target_patent_numbers
          .split(',')
          .map(n => ({ patent_number: n.trim(), is_primary: true }))
          .filter(n => n.patent_number),
        product_description_url: form.product_description_url,
        expand_search: form.expand_search,
        cost_limit: { max_patents: 50, auto_approve: false }
      }
    }

    ElMessage.success('專案建立成功，開始分析...')
    
    // D. 呼叫 n8n
    emit('next', import.meta.env.VITE_N8N_DESIGN_AROUND_PHASE_1_WEBHOOK, payload)

  } catch (e) {
    ElMessage.error('啟動失敗: ' + e.message)
  } finally {
    loading.value = false
  }
}

const handleFileChange = (file) => {
  fileList.value.push(file)
  return false // 阻止自動上傳
}

const handleRemove = (file) => {
  const index = fileList.value.findIndex(f => f.uid === file.uid)
  if (index > -1) {
    fileList.value.splice(index, 1)
  }
}
</script>

<template>
  <div class="phase-container">
    <div class="phase-card">
      <!-- 頂部標題區 -->
      <div class="card-header">
        <div class="icon-badge">🚀</div>
        <h2>專案啟動設定</h2>
        <p class="subtitle">上傳目標專利文件，開始 AI 智能迴避分析</p>
      </div>

      <!-- 表單區 -->
      <el-form :model="form" label-position="top" size="large" class="custom-form">
        
        <!-- 專案名稱 -->
        <el-form-item label="專案名稱" required class="form-item">
          <el-input 
            v-model="form.project_name" 
            placeholder="例如：5G 通訊技術迴避方案"
            clearable
            class="custom-input"
          >
            <template #prefix>
              <span class="input-icon">📝</span>
            </template>
          </el-input>
        </el-form-item>

        <!-- 檔案上傳 -->
        <el-form-item label="目標專利檔案 (PDF)" class="form-item">
          <el-upload
            class="custom-upload"
            drag
            action="#"
            :auto-upload="false"
            :on-change="handleFileChange"
            :on-remove="handleRemove"
            :file-list="fileList"
            multiple
            accept=".pdf"
          >
            <div class="upload-content">
              <div class="upload-icon">📁</div>
              <div class="upload-text">
                <p class="upload-main">拖曳檔案至此或 <em>點擊上傳</em></p>
                <p class="upload-hint">支援 PDF 格式，可同時上傳多個檔案</p>
              </div>
            </div>
          </el-upload>
        </el-form-item>

        <!-- 專利案號 -->
        <el-form-item label="目標專利案號 (選填)" class="form-item">
          <el-input 
            v-model="form.target_patent_numbers" 
            placeholder="US1234567, TWI123456 (逗號分隔)"
            type="textarea"
            :rows="3"
            class="custom-input"
          />
          <div class="form-tip">
            <span class="tip-icon">💡</span>
            如果已上傳 PDF，此欄位可留空
          </div>
        </el-form-item>

        <!-- 擴展檢索開關 -->
        <el-form-item label="擴展檢索" class="form-item switch-item">
          <div class="switch-container">
            <el-switch 
              v-model="form.expand_search"
              size="large"
              active-text="允許 AI 自動檢索相關專利"
              inactive-text="僅分析指定專利"
            />
          </div>
        </el-form-item>

        <!-- 提交按鈕 -->
        <el-form-item class="form-item submit-item">
          <el-button 
            type="primary" 
            size="large" 
            class="submit-btn"
            @click="startAnalysis" 
            :loading="loading"
          >
            <span v-if="!loading">確認並開始分析 →</span>
            <span v-else>處理中...</span>
          </el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<style scoped>
.phase-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 24px;
}

.phase-card {
  background: white;
  border-radius: 16px;
  padding: 48px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

/* 頂部標題 */
.card-header {
  text-align: center;
  margin-bottom: 48px;
}

.icon-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  font-size: 32px;
  margin-bottom: 16px;
  box-shadow: 0 8px 16px rgba(102, 126, 234, 0.3);
}

.card-header h2 {
  font-size: 28px;
  font-weight: 700;
  color: #2c3e50;
  margin: 0 0 8px 0;
  letter-spacing: -0.5px;
}

.subtitle {
  font-size: 15px;
  color: #64748b;
  margin: 0;
  line-height: 1.6;
}

/* 表單樣式 */
.custom-form {
  max-width: 100%;
}

.form-item {
  margin-bottom: 32px;
}

/* 輸入框 */
:deep(.custom-input .el-input__wrapper) {
  border-radius: 12px;
  padding: 12px 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border: 1px solid #e2e8f0;
  transition: all 0.3s;
}

:deep(.custom-input .el-input__wrapper:hover) {
  border-color: #667eea;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
}

:deep(.custom-input .el-input__wrapper.is-focus) {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.input-icon {
  font-size: 18px;
  margin-right: 4px;
}

/* 上傳區域 */
.custom-upload {
  width: 100%;
}

:deep(.el-upload-dragger) {
  border: 2px dashed #cbd5e1;
  border-radius: 12px;
  background: #f8fafc;
  padding: 32px;
  transition: all 0.3s;
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

/* 提示文字 */
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

/* 開關區域 */
.switch-item {
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  padding: 20px;
  border-radius: 12px;
  border: 1px solid #bae6fd;
}

.switch-container {
  display: flex;
  align-items: center;
}

:deep(.el-switch) {
  height: 28px;
}

:deep(.el-switch__label) {
  font-size: 14px;
  font-weight: 500;
  color: #334155;
}

:deep(.el-switch__label.is-active) {
  color: #667eea;
}

/* 提交按鈕 */
.submit-item {
  margin-top: 40px;
  margin-bottom: 0;
}

.submit-btn {
  width: 100%;
  height: 56px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 12px;
  font-size: 17px;
  font-weight: 600;
  letter-spacing: 0.5px;
  box-shadow: 0 8px 16px rgba(102, 126, 234, 0.3);
  transition: all 0.3s;
}

.submit-btn:hover {
  background: linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%);
  transform: translateY(-2px);
  box-shadow: 0 12px 24px rgba(102, 126, 234, 0.4);
}

.submit-btn:active {
  transform: translateY(0);
}

/* Label 樣式 */
:deep(.el-form-item__label) {
  font-weight: 600;
  color: #1e293b;
  font-size: 15px;
  margin-bottom: 8px;
}

/* 檔案列表美化 */
:deep(.el-upload-list__item) {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px;
  margin-top: 8px;
  transition: all 0.2s;
}

:deep(.el-upload-list__item:hover) {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

:deep(.el-upload-list__item-name) {
  color: #334155;
  font-weight: 500;
}

/* 響應式 */
@media (max-width: 768px) {
  .phase-card {
    padding: 32px 24px;
  }

  .card-header h2 {
    font-size: 24px;
  }

  .icon-badge {
    width: 56px;
    height: 56px;
    font-size: 28px;
  }
}
</style>

