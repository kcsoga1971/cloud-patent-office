<!-- src/views/services/AmendmentPrep.vue -->
<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../../supabase'
import { useUserStore } from '../../stores/user'
import { Document, Paragraph, TextRun, AlignmentType, Packer } from 'docx'
import { saveAs } from 'file-saver'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const jobId = ref(route.params.jobId)
const isLoading = ref(true)
const isSaving = ref(false)
const isNewCase = ref(!jobId.value)

// ========== 申請書表單資料 ==========
const formData = ref({
  // 基本資訊
  application_number: '',
  office_action_number: '',
  office_action_date: '',
  deadline: '',
  amendment_reason: '依據審查意見通知函辦理',
  
  // 申請人資料
  applicants: [{
    nationality: '中華民國',
    is_natural_person: true,
    id_number: '',
    family_name: '',
    given_name: '',
    company_name: '',
    company_name_en: '',
    representative: '',
    address_zh: '',
    address_en: '',
    phone: '',
    is_service_recipient: true
  }],
  
  // 代理人資料
  agent: {
    has_agent: false,
    name: '',
    id_number: '',
    address: '',
    phone: ''
  },
  
  // 修正內容
  amendments: {
    description: false,
    description_details: '',
    claims: false,
    claims_details: '',
    drawings: false,
    drawings_details: '',
    abstract: false,
    abstract_details: ''
  },
  
  // 同時辦理事項
  concurrent_changes: {
    address: false,
    agent: false,
    representative: false,
    name: false
  },
  
  // 附送書件
  attachments: {
    amendment_pages: '',
    amendment_comparison: false,
    response_statement: false,
    other: ''
  },
  
  // 使用者備註
  user_notes: ''
})

// ========== 計算剩餘天數 ==========
const daysRemaining = computed(() => {
  if (!formData.value.deadline) return null
  const today = new Date()
  const deadlineDate = new Date(formData.value.deadline)
  const diffTime = deadlineDate - today
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
})

const deadlineStatus = computed(() => {
  const days = daysRemaining.value
  if (days === null) return null
  if (days < 0) return { text: '已逾期', class: 'critical' }
  if (days <= 3) return { text: `剩 ${days} 天`, class: 'critical' }
  if (days <= 7) return { text: `剩 ${days} 天`, class: 'warning' }
  if (days <= 14) return { text: `剩 ${days} 天`, class: 'normal' }
  return { text: `剩 ${days} 天`, class: 'safe' }
})

// ========== 從資料庫載入已有資料 ==========
const loadExistingData = async () => {
  isLoading.value = true
  
  try {
    // 如果是新案件，只載入使用者 profile
    if (isNewCase.value) {
      await loadUserProfile()
      isLoading.value = false
      return
    }
    
    // 載入現有案件
    const { data: job, error: jobError } = await supabase
      .from('saas_jobs')
      .select('*')
      .eq('id', jobId.value)
      .single()
    
    if (jobError) throw jobError
    
    // 填入案件資料
    if (job.input_data) {
      Object.assign(formData.value, job.input_data)
    }
    
    // 如果沒有申請人資料，載入使用者 profile
    if (!formData.value.applicants[0].family_name) {
      await loadUserProfile()
    }
    
  } catch (err) {
    console.error('❌ 載入資料失敗:', err)
    alert('載入失敗：' + err.message)
  } finally {
    isLoading.value = false
  }
}

// ========== 載入使用者 Profile ==========
const loadUserProfile = async () => {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userStore.user.id)
      .single()
    
    if (error) throw error
    
    if (profile) {
      formData.value.applicants[0] = {
        nationality: profile.nationality || '中華民國',
        is_natural_person: !profile.company_name,
        id_number: profile.id_number || '',
        family_name: profile.family_name || '',
        given_name: profile.given_name || '',
        company_name: profile.company_name || '',
        company_name_en: profile.company_name_en || '',
        representative: profile.representative_name || '',
        address_zh: profile.address || '',
        address_en: profile.address_en || '',
        phone: profile.phone || '',
        is_service_recipient: true
      }
    }
  } catch (err) {
    console.error('❌ 載入 Profile 失敗:', err)
  }
}

// ========== 新增/刪除申請人 ==========
const addApplicant = () => {
  formData.value.applicants.push({
    nationality: '中華民國',
    is_natural_person: true,
    id_number: '',
    family_name: '',
    given_name: '',
    company_name: '',
    company_name_en: '',
    representative: '',
    address_zh: '',
    address_en: '',
    phone: '',
    is_service_recipient: false
  })
}

const removeApplicant = (index) => {
  if (formData.value.applicants.length > 1) {
    formData.value.applicants.splice(index, 1)
  }
}

// ========== 儲存草稿 ==========
const saveDraft = async () => {
  isSaving.value = true
  
  try {
    const jobData = {
      user_id: userStore.user.id,
      job_type: 'patent_amendment',
      status: 'draft',
      input_data: formData.value,
      updated_at: new Date().toISOString()
    }
    
    if (isNewCase.value) {
      // 新增案件
      const { data, error } = await supabase
        .from('saas_jobs')
        .insert({
          ...jobData,
          created_at: new Date().toISOString()
        })
        .select()
        .single()
      
      if (error) throw error
      
      jobId.value = data.id
      isNewCase.value = false
      
      alert('✅ 草稿已儲存')
      
    } else {
      // 更新現有案件
      const { error } = await supabase
        .from('saas_jobs')
        .update(jobData)
        .eq('id', jobId.value)
      
      if (error) throw error
      
      alert('✅ 草稿已更新')
    }
    
  } catch (err) {
    console.error('❌ 儲存失敗:', err)
    alert('儲存失敗：' + err.message)
  } finally {
    isSaving.value = false
  }
}

// ========== 儲存到個人檔案 ==========
const saveToProfile = async () => {
  if (!confirm('是否要將申請人資料儲存到您的個人檔案？\n下次就可以自動帶入。')) {
    return
  }
  
  try {
    const applicant = formData.value.applicants[0]
    
    const { error } = await supabase
      .from('profiles')
      .update({
        nationality: applicant.nationality,
        id_number: applicant.id_number,
        family_name: applicant.family_name,
        given_name: applicant.given_name,
        company_name: applicant.company_name,
        company_name_en: applicant.company_name_en,
        representative_name: applicant.representative,
        address: applicant.address_zh,
        address_en: applicant.address_en,
        phone: applicant.phone,
        updated_at: new Date().toISOString()
      })
      .eq('id', userStore.user.id)
    
    if (error) throw error
    
    alert('✅ 資料已儲存到個人檔案')
    
  } catch (err) {
    console.error('❌ 儲存失敗:', err)
    alert('儲存失敗：' + err.message)
  }
}

// ========== 下載 Word 申請書 ==========
const downloadApplicationForm = async () => {
  try {
    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
          }
        },
        children: [
          // 標題
          new Paragraph({
            text: '專利修正申請書',
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 }
          }),
          
          new Paragraph({
            text: '（本申請書格式、順序，請勿任意更動，※記號部分請勿填寫）',
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 }
          }),
          
          // 申請案號
          new Paragraph({
            children: [
              new TextRun({ text: '申請案號：' }),
              new TextRun({ 
                text: formData.value.application_number || '【請填寫】',
                bold: !formData.value.application_number
              }),
              new TextRun({ text: '                    ' }),
              new TextRun({ text: '※案    由：21002' })
            ],
            spacing: { after: 200 }
          }),
          
          // 依據
          new Paragraph({
            children: [
              new TextRun({ text: '依據：' }),
              new TextRun({ 
                text: formData.value.office_action_date 
                  ? `${formData.value.office_action_date.split('-')[0]}年${formData.value.office_action_date.split('-')[1]}月${formData.value.office_action_date.split('-')[2]}日`
                  : '   年 月 日'
              }),
              new TextRun({ text: '（' }),
              new TextRun({ 
                text: formData.value.office_action_number || '【請填寫來函文號】'
              }),
              new TextRun({ text: '）字第      號函辦理。' })
            ],
            spacing: { after: 200 }
          }),
          
          // 同時辦理事項
          new Paragraph({
            children: [
              new TextRun({ text: '同時辦理事項：變更申請人之  ' }),
              new TextRun({ text: formData.value.concurrent_changes.address ? '☑' : '☐' }),
              new TextRun({ text: '地址  ' }),
              new TextRun({ text: formData.value.concurrent_changes.agent ? '☑' : '☐' }),
              new TextRun({ text: '代理人   ' }),
              new TextRun({ text: formData.value.concurrent_changes.representative ? '☑' : '☐' }),
              new TextRun({ text: '代表人   ' }),
              new TextRun({ text: formData.value.concurrent_changes.name ? '☑' : '☐' }),
              new TextRun({ text: '姓名或名稱' })
            ],
            spacing: { after: 400 }
          }),
          
          // 一、申請人
          new Paragraph({
            text: `一、申請人：（共 ${formData.value.applicants.length} 人）`,
            spacing: { before: 200, after: 100 }
          }),
          
          // 申請人資料
          ...formData.value.applicants.flatMap((applicant, index) => [
            new Paragraph({
              text: `（第 ${index + 1} 申請人）`,
              indent: { left: 720 },
              spacing: { before: 100 }
            }),
            new Paragraph({
              text: `國籍：${applicant.nationality}`,
              indent: { left: 720 }
            }),
            new Paragraph({
              text: `身分種類：${applicant.is_natural_person ? '☑ 自然人' : '☑ 法人、公司、機關、學校'}`,
              indent: { left: 720 }
            }),
            new Paragraph({
              text: `ID：${applicant.id_number || '【請填寫】'}`,
              indent: { left: 720 }
            }),
            ...(applicant.is_natural_person ? [
              new Paragraph({
                text: `姓：${applicant.family_name || '【請填寫】'}`,
                indent: { left: 720 }
              }),
              new Paragraph({
                text: `名：${applicant.given_name || '【請填寫】'}`,
                indent: { left: 720 }
              })
            ] : [
              new Paragraph({
                text: `名稱（中文）：${applicant.company_name || '【請填寫】'}`,
                indent: { left: 720 }
              }),
              new Paragraph({
                text: `名稱（英文）：${applicant.company_name_en || '【請填寫】'}`,
                indent: { left: 720 }
              }),
              new Paragraph({
                text: `代表人：${applicant.representative || '【請填寫】'}`,
                indent: { left: 720 }
              })
            ]),
            new Paragraph({
              text: `地址（中文）：${applicant.address_zh || '【請填寫】'}`,
              indent: { left: 720 }
            }),
            new Paragraph({
              text: `地址（英文）：${applicant.address_en || '【請填寫】'}`,
              indent: { left: 720 }
            }),
            new Paragraph({
              text: applicant.is_service_recipient ? '☑ 註記此申請人為應受送達人' : '☐ 註記此申請人為應受送達人',
              indent: { left: 720 }
            }),
            new Paragraph({
              text: `聯絡電話及分機：${applicant.phone || '【請填寫】'}`,
              indent: { left: 720 },
              spacing: { after: 200 }
            })
          ]),
          
          // 二、代理人
          ...(formData.value.agent.has_agent ? [
            new Paragraph({
              text: '二、代理人：',
              spacing: { before: 200, after: 100 }
            }),
            new Paragraph({
              text: `姓名：${formData.value.agent.name || '【請填寫】'}`,
              indent: { left: 720 }
            }),
            new Paragraph({
              text: `ID：${formData.value.agent.id_number || '【請填寫】'}`,
              indent: { left: 720 }
            }),
            new Paragraph({
              text: `地址：${formData.value.agent.address || '【請填寫】'}`,
              indent: { left: 720 }
            }),
            new Paragraph({
              text: `聯絡電話：${formData.value.agent.phone || '【請填寫】'}`,
              indent: { left: 720 },
              spacing: { after: 200 }
            })
          ] : []),
          
          // 三、修正事項
          new Paragraph({
            text: '三、修正事項：',
            spacing: { before: 200, after: 100 }
          }),
          
          ...(formData.value.amendments.description ? [
            new Paragraph({
              text: '☑ 說明書',
              indent: { left: 720 }
            }),
            new Paragraph({
              text: formData.value.amendments.description_details || '【請說明修正內容】',
              indent: { left: 1440 },
              spacing: { after: 100 }
            })
          ] : [
            new Paragraph({
              text: '☐ 說明書',
              indent: { left: 720 }
            })
          ]),
          
          ...(formData.value.amendments.claims ? [
            new Paragraph({
              text: '☑ 申請專利範圍',
              indent: { left: 720 }
            }),
            new Paragraph({
              text: formData.value.amendments.claims_details || '【請說明修正內容】',
              indent: { left: 1440 },
              spacing: { after: 100 }
            })
          ] : [
            new Paragraph({
              text: '☐ 申請專利範圍',
              indent: { left: 720 }
            })
          ]),
          
          ...(formData.value.amendments.drawings ? [
            new Paragraph({
              text: '☑ 圖式',
              indent: { left: 720 }
            }),
            new Paragraph({
              text: formData.value.amendments.drawings_details || '【請說明修正內容】',
              indent: { left: 1440 },
              spacing: { after: 100 }
            })
          ] : [
            new Paragraph({
              text: '☐ 圖式',
              indent: { left: 720 }
            })
          ]),
          
          ...(formData.value.amendments.abstract ? [
            new Paragraph({
              text: '☑ 摘要',
              indent: { left: 720 }
            }),
            new Paragraph({
              text: formData.value.amendments.abstract_details || '【請說明修正內容】',
              indent: { left: 1440 },
              spacing: { after: 200 }
            })
          ] : [
            new Paragraph({
              text: '☐ 摘要',
              indent: { left: 720 },
              spacing: { after: 200 }
            })
          ]),
          
          // 四、附送書件
          new Paragraph({
            text: '四、附送書件：',
            spacing: { before: 200, after: 100 }
          }),
          
          new Paragraph({
            text: `1、修正後全份說明書、申請專利範圍或圖式 ${formData.value.attachments.amendment_pages || '【請填寫】'} 份。`,
            indent: { left: 720 }
          }),
          
          new Paragraph({
            text: formData.value.attachments.amendment_comparison 
              ? '☑ 2、修正對照表 1 份。' 
              : '☐ 2、修正對照表 1 份。',
            indent: { left: 720 }
          }),
          
          new Paragraph({
            text: formData.value.attachments.response_statement 
              ? '☑ 3、申復理由書 1 份。' 
              : '☐ 3、申復理由書 1 份。',
            indent: { left: 720 }
          }),
          
          ...(formData.value.attachments.other ? [
            new Paragraph({
              text: `4、其他：${formData.value.attachments.other}`,
              indent: { left: 720 }
            })
          ] : []),
          
          // 備註
          new Paragraph({
            text: '',
            spacing: { before: 400 }
          }),
          
          new Paragraph({
            text: '備註：',
            spacing: { after: 100 }
          }),
          
          new Paragraph({
            text: '1. 本申請書應以電腦打字或正楷書寫。',
            indent: { left: 720 }
          }),
          
          new Paragraph({
            text: '2. 修正後全份說明書、申請專利範圍或圖式，應依專利法施行細則第 16 條規定辦理。',
            indent: { left: 720 }
          }),
          
          new Paragraph({
            text: '3. 修正對照表應載明修正前後之對照內容。',
            indent: { left: 720 }
          })
        ]
      }]
    })
    
    const blob = await Packer.toBlob(doc)
    const filename = `專利修正申請書_${formData.value.application_number || '未命名'}_${new Date().toISOString().split('T')[0]}.docx`
    saveAs(blob, filename)
    
    // 儲存草稿
    await saveDraft()
    
    alert('✅ 申請書已下載！')
    
  } catch (err) {
    console.error('❌ 下載失敗:', err)
    alert('下載失敗：' + err.message)
  }
}

// ========== 返回 ==========
const goBack = () => {
  router.push({ name: 'AmendmentWorkflow' })
}

// ========== 初始化 ==========
onMounted(() => {
  loadExistingData()
})
</script>

<template>
  <div class="amendment-prep-page">
    <!-- 頁面標題 -->
    <div class="page-header">
      <button @click="goBack" class="btn-back">
        ← 返回案件列表
      </button>
      <div class="header-content">
        <h1>📝 專利修正申請書</h1>
        <p class="subtitle">填寫修正申請書資料，系統會自動帶入您已儲存的資料</p>
      </div>
    </div>
    
    <!-- Loading -->
    <div v-if="isLoading" class="loading-container">
      <div class="spinner"></div>
      <p>載入中...</p>
    </div>
    
    <!-- 申請書表單 -->
    <div v-else class="form-container">
      
      <!-- 期限提醒 -->
      <div v-if="deadlineStatus" class="deadline-alert" :class="deadlineStatus.class">
        <div class="alert-icon">⏰</div>
        <div class="alert-content">
          <h4>回覆期限提醒</h4>
          <p>{{ deadlineStatus.text }} - {{ formData.deadline }}</p>
        </div>
      </div>
      
      <!-- 提示訊息 -->
      <div class="info-box">
        <div class="info-icon">💡</div>
        <div class="info-content">
          <h4>使用說明</h4>
          <ul>
            <li>✅ 系統已自動帶入您之前儲存的資料</li>
            <li>📝 您可以直接修改或補充資料</li>
            <li>💾 填寫完成後，可選擇「儲存草稿」或「下載申請書」</li>
            <li>📥 下載申請書時會自動儲存草稿</li>
          </ul>
        </div>
      </div>
      
      <!-- 申請書表單 -->
      <div class="application-form">
        
        <!-- 基本資訊 -->
        <section class="form-section">
          <h3>基本資訊</h3>
          
          <div class="form-row">
            <div class="form-group">
              <label>申請案號 <span class="required">*</span></label>
              <input 
                v-model="formData.application_number" 
                type="text" 
                placeholder="例：112345678"
                class="form-input"
              />
            </div>
            
            <div class="form-group">
              <label>來函文號 <span class="required">*</span></label>
              <input 
                v-model="formData.office_action_number" 
                type="text" 
                placeholder="例：智專三(一)10812345678號"
                class="form-input"
              />
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label>來函日期 <span class="required">*</span></label>
              <input 
                v-model="formData.office_action_date" 
                type="date" 
                class="form-input"
              />
            </div>
            
            <div class="form-group">
              <label>回覆期限 <span class="required">*</span></label>
              <input 
                v-model="formData.deadline" 
                type="date" 
                class="form-input"
              />
            </div>
          </div>
          
          <div class="form-group">
            <label>修正理由</label>
            <input 
              v-model="formData.amendment_reason" 
              type="text" 
              placeholder="例：依據審查意見通知函辦理"
              class="form-input"
            />
          </div>
          
          <div class="form-group">
            <label>案件備註</label>
            <textarea 
              v-model="formData.user_notes" 
              placeholder="您可以在此記錄案件相關資訊，方便日後查找"
              class="form-textarea"
              rows="3"
            ></textarea>
          </div>
        </section>
        
        <!-- 一、申請人 -->
        <section class="form-section">
          <div class="section-header">
            <h3>一、申請人：（共 {{ formData.applicants.length }} 人）</h3>
            <button @click="addApplicant" class="btn-add">➕ 新增申請人</button>
          </div>
          
          <div 
            v-for="(applicant, index) in formData.applicants" 
            :key="index"
            class="applicant-card"
          >
            <div class="card-header">
              <h4>第 {{ index + 1 }} 申請人</h4>
              <button 
                v-if="formData.applicants.length > 1"
                @click="removeApplicant(index)" 
                class="btn-remove"
              >
                🗑️ 刪除
              </button>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label>國籍 <span class="required">*</span></label>
                <select v-model="applicant.nationality" class="form-select">
                  <option value="中華民國">中華民國</option>
                  <option value="美國">美國</option>
                  <option value="日本">日本</option>
                  <option value="其他">其他</option>
                </select>
              </div>
              
              <div class="form-group">
                <label>身分種類 <span class="required">*</span></label>
                <div class="radio-group">
                  <label>
                    <input type="radio" :value="true" v-model="applicant.is_natural_person" />
                    自然人
                  </label>
                  <label>
                    <input type="radio" :value="false" v-model="applicant.is_natural_person" />
                    法人/公司
                  </label>
                </div>
              </div>
            </div>
            
            <div class="form-group">
              <label>身分證字號/統一編號 <span class="required">*</span></label>
              <input 
                v-model="applicant.id_number" 
                type="text" 
                placeholder="請輸入身分證字號或統一編號"
                class="form-input"
              />
            </div>
            
            <!-- 自然人 -->
            <template v-if="applicant.is_natural_person">
              <div class="form-row">
                <div class="form-group">
                  <label>姓 (Family name) <span class="required">*</span></label>
                  <input 
                    v-model="applicant.family_name" 
                    type="text" 
                    placeholder="請輸入姓氏"
                    class="form-input"
                  />
                </div>
                <div class="form-group">
                  <label>名 (Given name) <span class="required">*</span></label>
                  <input 
                    v-model="applicant.given_name" 
                    type="text" 
                    placeholder="請輸入名字"
                    class="form-input"
                  />
                </div>
              </div>
            </template>
            
            <!-- 法人 -->
            <template v-else>
              <div class="form-group">
                <label>公司名稱（中文） <span class="required">*</span></label>
                <input 
                  v-model="applicant.company_name" 
                  type="text" 
                  placeholder="請輸入公司名稱（中文）"
                  class="form-input"
                />
              </div>
              <div class="form-group">
                <label>公司名稱（英文）</label>
                <input 
                  v-model="applicant.company_name_en" 
                  type="text" 
                  placeholder="請輸入公司名稱（英文）"
                  class="form-input"
                />
              </div>
              <div class="form-group">
                <label>代表人 <span class="required">*</span></label>
                <input 
                  v-model="applicant.representative" 
                  type="text" 
                  placeholder="請輸入代表人姓名"
                  class="form-input"
                />
              </div>
            </template>
            
            <div class="form-group">
              <label>地址（中文） <span class="required">*</span></label>
              <input 
                v-model="applicant.address_zh" 
                type="text" 
                placeholder="請輸入地址（中文）"
                class="form-input"
              />
            </div>
            
            <div class="form-group">
              <label>地址（英文）</label>
              <input 
                v-model="applicant.address_en" 
                type="text" 
                placeholder="請輸入地址（英文）"
                class="form-input"
              />
            </div>
            
            <div class="form-group">
              <label>聯絡電話 <span class="required">*</span></label>
              <input 
                v-model="applicant.phone" 
                type="tel" 
                placeholder="請輸入聯絡電話"
                class="form-input"
              />
            </div>
            
            <div class="form-group">
              <label class="checkbox-label">
                <input type="checkbox" v-model="applicant.is_service_recipient" />
                註記此申請人為應受送達人
              </label>
            </div>
          </div>
        </section>
        
        <!-- 二、代理人 -->
        <section class="form-section">
          <div class="section-header">
            <h3>二、代理人</h3>
            <label class="checkbox-label">
              <input type="checkbox" v-model="formData.agent.has_agent" />
              委任代理人
            </label>
          </div>
          
          <div v-if="formData.agent.has_agent" class="agent-card">
            <div class="form-group">
              <label>代理人姓名 <span class="required">*</span></label>
              <input 
                v-model="formData.agent.name" 
                type="text" 
                placeholder="請輸入代理人姓名"
                class="form-input"
              />
            </div>
            
            <div class="form-group">
              <label>代理人身分證字號 <span class="required">*</span></label>
              <input 
                v-model="formData.agent.id_number" 
                type="text" 
                placeholder="請輸入代理人身分證字號"
                class="form-input"
              />
            </div>
            
            <div class="form-group">
              <label>代理人地址 <span class="required">*</span></label>
              <input 
                v-model="formData.agent.address" 
                type="text" 
                placeholder="請輸入代理人地址"
                class="form-input"
              />
            </div>
            
            <div class="form-group">
              <label>代理人電話 <span class="required">*</span></label>
              <input 
                v-model="formData.agent.phone" 
                type="tel" 
                placeholder="請輸入代理人電話"
                class="form-input"
              />
            </div>
          </div>
        </section>
        
        <!-- 三、修正事項 -->
        <section class="form-section">
          <h3>三、修正事項</h3>
          
          <div class="amendments-list">
            <div class="amendment-item">
              <label class="checkbox-label">
                <input type="checkbox" v-model="formData.amendments.description" />
                <strong>說明書</strong>
              </label>
              <textarea 
                v-if="formData.amendments.description"
                v-model="formData.amendments.description_details" 
                placeholder="請說明修正內容，例：修正說明書第5頁第3行..."
                class="form-textarea"
                rows="3"
              ></textarea>
            </div>
            
            <div class="amendment-item">
              <label class="checkbox-label">
                <input type="checkbox" v-model="formData.amendments.claims" />
                <strong>申請專利範圍</strong>
              </label>
              <textarea 
                v-if="formData.amendments.claims"
                v-model="formData.amendments.claims_details" 
                placeholder="請說明修正內容，例：修正請求項1、3、5..."
                class="form-textarea"
                rows="3"
              ></textarea>
            </div>
            
            <div class="amendment-item">
              <label class="checkbox-label">
                <input type="checkbox" v-model="formData.amendments.drawings" />
                <strong>圖式</strong>
              </label>
              <textarea 
                v-if="formData.amendments.drawings"
                v-model="formData.amendments.drawings_details" 
                placeholder="請說明修正內容，例：修正圖式第2圖..."
                class="form-textarea"
                rows="3"
              ></textarea>
            </div>
            
            <div class="amendment-item">
              <label class="checkbox-label">
                <input type="checkbox" v-model="formData.amendments.abstract" />
                <strong>摘要</strong>
              </label>
              <textarea 
                v-if="formData.amendments.abstract"
                v-model="formData.amendments.abstract_details" 
                placeholder="請說明修正內容..."
                class="form-textarea"
                rows="3"
              ></textarea>
            </div>
          </div>
        </section>
        
        <!-- 同時辦理事項 -->
        <section class="form-section">
          <h3>同時辦理事項</h3>
          <p class="section-desc">若需同時變更申請人資料，請勾選：</p>
          
          <div class="checkbox-list">
            <label class="checkbox-label">
              <input type="checkbox" v-model="formData.concurrent_changes.address" />
              變更申請人地址
            </label>
            <label class="checkbox-label">
              <input type="checkbox" v-model="formData.concurrent_changes.agent" />
              變更代理人
            </label>
            <label class="checkbox-label">
              <input type="checkbox" v-model="formData.concurrent_changes.representative" />
              變更代表人
            </label>
            <label class="checkbox-label">
              <input type="checkbox" v-model="formData.concurrent_changes.name" />
              變更姓名或名稱
            </label>
          </div>
        </section>
        
        <!-- 四、附送書件 -->
        <section class="form-section">
          <h3>四、附送書件</h3>
          
          <div class="form-group">
            <label>修正後全份說明書、申請專利範圍或圖式 <span class="required">*</span></label>
            <input 
              v-model="formData.attachments.amendment_pages" 
              type="text" 
              placeholder="請輸入份數，例：1"
              class="form-input"
            />
          </div>
          
          <div class="checkbox-list">
            <label class="checkbox-label">
              <input type="checkbox" v-model="formData.attachments.amendment_comparison" />
              修正對照表 1 份
            </label>
            <label class="checkbox-label">
              <input type="checkbox" v-model="formData.attachments.response_statement" />
              申復理由書 1 份
            </label>
          </div>
          
          <div class="form-group">
            <label>其他附件</label>
            <input 
              v-model="formData.attachments.other" 
              type="text" 
              placeholder="如有其他附件，請說明"
              class="form-input"
            />
          </div>
        </section>
        
      </div>
      
      <!-- 操作按鈕 -->
      <div class="action-buttons">
        <button @click="saveToProfile" class="btn-save-profile">
          💾 儲存到個人檔案
        </button>
        <button @click="saveDraft" :disabled="isSaving" class="btn-save-draft">
          {{ isSaving ? '儲存中...' : '📝 儲存草稿' }}
        </button>
        <button @click="downloadApplicationForm" class="btn-download">
          📥 下載申請書 Word 檔
        </button>
      </div>
      
      <!-- 說明 -->
      <div class="help-box">
        <h4>📌 注意事項</h4>
        <ul>
          <li>標註 <span class="required">*</span> 的欄位為必填項目</li>
          <li>下載的 Word 檔可以直接列印送件，或繼續編輯補充</li>
          <li>「儲存草稿」可以暫存您的填寫進度，下次繼續編輯</li>
          <li>「儲存到個人檔案」會將申請人資料儲存，下次自動帶入</li>
        </ul>
      </div>
      
    </div>
  </div>
</template>

<style scoped>
/* 使用與 SubmissionPrep.vue 相同的樣式 */
.amendment-prep-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
  min-height: 100vh;
  background: #f5f5f5;
}

.page-header {
  margin-bottom: 32px;
}

.btn-back {
  background: none;
  border: none;
  color: #3b82f6;
  font-size: 16px;
  cursor: pointer;
  padding: 8px 0;
  margin-bottom: 16px;
  transition: color 0.3s;
}

.btn-back:hover {
  color: #2563eb;
  text-decoration: underline;
}

.header-content h1 {
  font-size: 32px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 8px 0;
}

.subtitle {
  font-size: 16px;
  color: #666;
  margin: 0;
}

/* Loading */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  background: white;
  border-radius: 12px;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 期限提醒 */
.deadline-alert {
  display: flex;
  gap: 16px;
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 24px;
  border: 2px solid;
}

.deadline-alert.safe {
  background: #f0fdf4;
  border-color: #10b981;
}

.deadline-alert.normal {
  background: #eff6ff;
  border-color: #3b82f6;
}

.deadline-alert.warning {
  background: #fffbeb;
  border-color: #f59e0b;
}

.deadline-alert.critical {
  background: #fef2f2;
  border-color: #ef4444;
}

.alert-icon {
  font-size: 32px;
}

.alert-content h4 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
}

.alert-content p {
  margin: 0;
  font-size: 16px;
}

/* Info Box */
.info-box {
  display: flex;
  gap: 16px;
  padding: 20px;
  background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
  border: 2px solid #0ea5e9;
  border-radius: 12px;
  margin-bottom: 24px;
}

.info-icon {
  font-size: 32px;
}

.info-content h4 {
  margin: 0 0 12px 0;
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
}

.info-content ul {
  margin: 0;
  padding-left: 20px;
}

.info-content li {
  margin-bottom: 8px;
  color: #666;
  font-size: 14px;
}

/* Form Container */
.form-container {
  background: white;
  border-radius: 12px;
  padding: 32px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.application-form {
  margin-bottom: 32px;
}

/* Form Section */
.form-section {
  margin-bottom: 40px;
  padding-bottom: 40px;
  border-bottom: 2px solid #e5e7eb;
}

.form-section:last-child {
  border-bottom: none;
}

.form-section h3 {
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 20px 0;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-header h3 {
  margin: 0;
}

.section-desc {
  font-size: 14px;
  color: #666;
  margin: 0 0 16px 0;
}

/* Form Group */
.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 8px;
}

.required {
  color: #ef4444;
  font-weight: bold;
}

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  padding: 12px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.3s;
  font-family: inherit;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

/* Radio Group */
.radio-group {
  display: flex;
  gap: 20px;
}

.radio-group label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

/* Checkbox */
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  color: #374151;
}

.checkbox-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Cards */
.applicant-card,
.agent-card {
  background: #f9fafb;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e5e7eb;
}

.card-header h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
}

/* Amendments */
.amendments-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.amendment-item {
  padding: 16px;
  background: #f9fafb;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
}

.amendment-item .checkbox-label {
  margin-bottom: 12px;
}

/* Buttons */
.btn-add,
.btn-remove {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-add {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
}

.btn-add:hover {
  background: linear-gradient(135deg, #059669, #047857);
  transform: translateY(-1px);
}

.btn-remove {
  background: #fee2e2;
  color: #dc2626;
}

.btn-remove:hover {
  background: #fecaca;
}

/* Action Buttons */
.action-buttons {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 32px;
}

.btn-save-profile,
.btn-save-draft,
.btn-download {
  padding: 14px 32px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-save-profile {
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  color: white;
}

.btn-save-profile:hover {
  background: linear-gradient(135deg, #7c3aed, #6d28d9);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
}

.btn-save-draft {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
}

.btn-save-draft:hover:not(:disabled) {
  background: linear-gradient(135deg, #059669, #047857);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
}

.btn-save-draft:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-download {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
}

.btn-download:hover {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

/* Help Box */
.help-box {
  background: #fffbeb;
  border: 2px solid #fbbf24;
  border-radius: 12px;
  padding: 20px;
}

.help-box h4 {
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
}

.help-box ul {
  margin: 0;
  padding-left: 20px;
}

.help-box li {
  margin-bottom: 8px;
  color: #666;
  font-size: 14px;
}

@media (max-width: 768px) {
  .amendment-prep-page {
    padding: 16px;
  }
  
  .form-container {
    padding: 20px;
  }
  
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .action-buttons {
    flex-direction: column;
  }
  
  .btn-save-profile,
  .btn-save-draft,
  .btn-download {
    width: 100%;
  }
}
</style>
