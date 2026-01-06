<!-- src/views/services/ReexaminationPrep.vue -->
<script setup>
import { ref, onMounted, computed } from 'vue'
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
  patent_type: 'invention', // 'invention' | 'design'
  application_number: '',
  rejection_notice_number: '',
  rejection_date: '',
  reexamination_reason: '',
  
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
  
  // 再審查理由
  reexamination_grounds: {
    new_evidence: false,
    new_evidence_description: '',
    legal_argument: false,
    legal_argument_description: '',
    procedural_error: false,
    procedural_error_description: ''
  },
  
  // 附送書件
  attachments: {
    rejection_notice: true,
    reexamination_statement: false,
    new_evidence_documents: false,
    other: ''
  },
  
  // 使用者備註
  user_notes: ''
})

// ========== 從資料庫載入已有資料 ==========
const loadExistingData = async () => {
  isLoading.value = true
  
  try {
    if (isNewCase.value) {
      await loadUserProfile()
      isLoading.value = false
      return
    }
    
    const { data: job, error: jobError } = await supabase
      .from('saas_jobs')
      .select('*')
      .eq('id', jobId.value)
      .single()
    
    if (jobError) throw jobError
    
    if (job.input_data) {
      Object.assign(formData.value, job.input_data)
    }
    
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
      job_type: 'patent_reexamination',
      status: 'draft',
      input_data: formData.value,
      updated_at: new Date().toISOString()
    }
    
    if (isNewCase.value) {
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
          new Paragraph({
            text: '專利再審查申請書',
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 }
          }),
          
          new Paragraph({
            text: `（${formData.value.patent_type === 'invention' ? '發明' : '設計'}）`,
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 }
          }),
          
          new Paragraph({
            text: '（本申請書格式、順序，請勿任意更動，※記號部分請勿填寫）',
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 }
          }),
          
          new Paragraph({
            children: [
              new TextRun({ text: '申請案號：' }),
              new TextRun({ 
                text: formData.value.application_number || '【請填寫】',
                bold: !formData.value.application_number
              })
            ],
            spacing: { after: 200 }
          }),
          
          new Paragraph({
            children: [
              new TextRun({ text: '核駁審定書文號：' }),
              new TextRun({ 
                text: formData.value.rejection_notice_number || '【請填寫】',
                bold: !formData.value.rejection_notice_number
              })
            ],
            spacing: { after: 200 }
          }),
          
          new Paragraph({
            children: [
              new TextRun({ text: '核駁審定日期：' }),
              new TextRun({ 
                text: formData.value.rejection_date || '【請填寫】',
                bold: !formData.value.rejection_date
              })
            ],
            spacing: { after: 400 }
          }),
          
          new Paragraph({
            text: `一、申請人：（共 ${formData.value.applicants.length} 人）`,
            spacing: { before: 200, after: 100 }
          }),
          
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
                text: `代表人：${applicant.representative || '【請填寫】'}`,
                indent: { left: 720 }
              })
            ]),
            new Paragraph({
              text: `地址（中文）：${applicant.address_zh || '【請填寫】'}`,
              indent: { left: 720 }
            }),
            new Paragraph({
              text: `聯絡電話：${applicant.phone || '【請填寫】'}`,
              indent: { left: 720 },
              spacing: { after: 200 }
            })
          ]),
          
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
          
          new Paragraph({
            text: '三、再審查理由：',
            spacing: { before: 200, after: 100 }
          }),
          
          new Paragraph({
            text: formData.value.reexamination_reason || '【請填寫再審查理由】',
            indent: { left: 720 },
            spacing: { after: 200 }
          }),
          
          ...(formData.value.reexamination_grounds.new_evidence ? [
            new Paragraph({
              text: '☑ 提出新證據',
              indent: { left: 720 }
            }),
            new Paragraph({
              text: formData.value.reexamination_grounds.new_evidence_description || '【請說明新證據內容】',
              indent: { left: 1440 },
              spacing: { after: 100 }
            })
          ] : []),
          
          ...(formData.value.reexamination_grounds.legal_argument ? [
            new Paragraph({
              text: '☑ 提出新的法律論述',
              indent: { left: 720 }
            }),
            new Paragraph({
              text: formData.value.reexamination_grounds.legal_argument_description || '【請說明法律論述】',
              indent: { left: 1440 },
              spacing: { after: 100 }
            })
          ] : []),
          
          ...(formData.value.reexamination_grounds.procedural_error ? [
            new Paragraph({
              text: '☑ 指出審查程序瑕疵',
              indent: { left: 720 }
            }),
            new Paragraph({
              text: formData.value.reexamination_grounds.procedural_error_description || '【請說明程序瑕疵】',
              indent: { left: 1440 },
              spacing: { after: 200 }
            })
          ] : []),
          
          new Paragraph({
            text: '四、附送書件：',
            spacing: { before: 200, after: 100 }
          }),
          
          new Paragraph({
            text: '☑ 1、核駁審定書影本 1 份。',
            indent: { left: 720 }
          }),
          
          new Paragraph({
            text: formData.value.attachments.reexamination_statement 
              ? '☑ 2、再審查理由書 1 份。' 
              : '☐ 2、再審查理由書 1 份。',
            indent: { left: 720 }
          }),
          
          new Paragraph({
            text: formData.value.attachments.new_evidence_documents 
              ? '☑ 3、新證據文件 1 份。' 
              : '☐ 3、新證據文件 1 份。',
            indent: { left: 720 }
          }),
          
          ...(formData.value.attachments.other ? [
            new Paragraph({
              text: `4、其他：${formData.value.attachments.other}`,
              indent: { left: 720 }
            })
          ] : []),
          
          new Paragraph({
            text: '',
            spacing: { before: 400 }
          }),
          
          new Paragraph({
            text: '備註：',
            spacing: { after: 100 }
          }),
          
          new Paragraph({
            text: '1. 再審查應於核駁審定書送達後 2 個月內提出。',
            indent: { left: 720 }
          }),
          
          new Paragraph({
            text: '2. 再審查以一次為限。',
            indent: { left: 720 }
          })
        ]
      }]
    })
    
    const blob = await Packer.toBlob(doc)
    const filename = `專利再審查申請書_${formData.value.application_number || '未命名'}_${new Date().toISOString().split('T')[0]}.docx`
    saveAs(blob, filename)
    
    await saveDraft()
    
    alert('✅ 申請書已下載！')
    
  } catch (err) {
    console.error('❌ 下載失敗:', err)
    alert('下載失敗：' + err.message)
  }
}

const goBack = () => {
  router.push({ name: 'ReexaminationWorkflow' })
}

onMounted(() => {
  loadExistingData()
})
</script>

<template>
  <div class="reexamination-prep-page">
    <div class="page-header">
      <button @click="goBack" class="btn-back">
        ← 返回案件列表
      </button>
      <div class="header-content">
        <h1>🔄 專利再審查申請書</h1>
        <p class="subtitle">填寫再審查申請書資料，系統會自動帶入您已儲存的資料</p>
      </div>
    </div>
    
    <div v-if="isLoading" class="loading-container">
      <div class="spinner"></div>
      <p>載入中...</p>
    </div>
    
    <div v-else class="form-container">
      
      <div class="info-box">
        <div class="info-icon">💡</div>
        <div class="info-content">
          <h4>使用說明</h4>
          <ul>
            <li>⏰ 再審查應於核駁審定書送達後 <strong>2 個月內</strong>提出</li>
            <li>🔢 再審查以 <strong>一次為限</strong></li>
            <li>📝 請詳細說明再審查理由，並提供充分證據</li>
          </ul>
        </div>
      </div>
      
      <div class="application-form">
        
        <section class="form-section">
          <h3>基本資訊</h3>
          
          <div class="form-group">
            <label>專利類型 <span class="required">*</span></label>
            <div class="radio-group">
              <label>
                <input type="radio" value="invention" v-model="formData.patent_type" />
                發明專利
              </label>
              <label>
                <input type="radio" value="design" v-model="formData.patent_type" />
                設計專利
              </label>
            </div>
          </div>
          
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
              <label>核駁審定書文號 <span class="required">*</span></label>
              <input 
                v-model="formData.rejection_notice_number" 
                type="text" 
                placeholder="例：智專三(一)10812345678號"
                class="form-input"
              />
            </div>
          </div>
          
          <div class="form-group">
            <label>核駁審定日期 <span class="required">*</span></label>
            <input 
              v-model="formData.rejection_date" 
              type="date" 
              class="form-input"
            />
          </div>
          
          <div class="form-group">
            <label>案件備註</label>
            <textarea 
              v-model="formData.user_notes" 
              placeholder="您可以在此記錄案件相關資訊"
              class="form-textarea"
              rows="3"
            ></textarea>
          </div>
        </section>
        
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
            
            <template v-if="applicant.is_natural_person">
              <div class="form-row">
                <div class="form-group">
                  <label>姓 <span class="required">*</span></label>
                  <input 
                    v-model="applicant.family_name" 
                    type="text" 
                    placeholder="請輸入姓氏"
                    class="form-input"
                  />
                </div>
                <div class="form-group">
                  <label>名 <span class="required">*</span></label>
                  <input 
                    v-model="applicant.given_name" 
                    type="text" 
                    placeholder="請輸入名字"
                    class="form-input"
                  />
                </div>
              </div>
            </template>
            
            <template v-else>
              <div class="form-group">
                <label>公司名稱（中文） <span class="required">*</span></label>
                <input 
                  v-model="applicant.company_name" 
                  type="text" 
                  placeholder="請輸入公司名稱"
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
                placeholder="請輸入地址"
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
        
        <section class="form-section">
          <h3>三、再審查理由 <span class="required">*</span></h3>
          
          <div class="form-group">
            <label>再審查理由概述</label>
            <textarea 
              v-model="formData.reexamination_reason" 
              placeholder="請簡要說明提出再審查的理由"
              class="form-textarea"
              rows="5"
            ></textarea>
          </div>
          
          <div class="reexamination-grounds">
            <div class="ground-item">
              <label class="checkbox-label">
                <input type="checkbox" v-model="formData.reexamination_grounds.new_evidence" />
                <strong>提出新證據</strong>
              </label>
              <textarea 
                v-if="formData.reexamination_grounds.new_evidence"
                v-model="formData.reexamination_grounds.new_evidence_description" 
                placeholder="請說明新證據的內容及其對本案的影響"
                class="form-textarea"
                rows="4"
              ></textarea>
            </div>
            
            <div class="ground-item">
              <label class="checkbox-label">
                <input type="checkbox" v-model="formData.reexamination_grounds.legal_argument" />
                <strong>提出新的法律論述</strong>
              </label>
              <textarea 
                v-if="formData.reexamination_grounds.legal_argument"
                v-model="formData.reexamination_grounds.legal_argument_description" 
                placeholder="請說明新的法律論述"
                class="form-textarea"
                rows="4"
              ></textarea>
            </div>
            
            <div class="ground-item">
              <label class="checkbox-label">
                <input type="checkbox" v-model="formData.reexamination_grounds.procedural_error" />
                <strong>指出審查程序瑕疵</strong>
              </label>
              <textarea 
                v-if="formData.reexamination_grounds.procedural_error"
                v-model="formData.reexamination_grounds.procedural_error_description" 
                placeholder="請說明審查程序的瑕疵"
                class="form-textarea"
                rows="4"
              ></textarea>
            </div>
          </div>
        </section>
        
        <section class="form-section">
          <h3>四、附送書件</h3>
          
          <div class="checkbox-list">
            <label class="checkbox-label">
              <input type="checkbox" v-model="formData.attachments.rejection_notice" checked disabled />
              核駁審定書影本 1 份（必要）
            </label>
            <label class="checkbox-label">
              <input type="checkbox" v-model="formData.attachments.reexamination_statement" />
              再審查理由書 1 份
            </label>
            <label class="checkbox-label">
              <input type="checkbox" v-model="formData.attachments.new_evidence_documents" />
              新證據文件 1 份
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
      
      <div class="action-buttons">
        <button @click="saveDraft" :disabled="isSaving" class="btn-save-draft">
          {{ isSaving ? '儲存中...' : '📝 儲存草稿' }}
        </button>
        <button @click="downloadApplicationForm" class="btn-download">
          📥 下載申請書 Word 檔
        </button>
      </div>
      
      <div class="help-box">
        <h4>📌 注意事項</h4>
        <ul>
          <li>標註 <span class="required">*</span> 的欄位為必填項目</li>
          <li>再審查應於核駁審定書送達後 2 個月內提出</li>
          <li>再審查以一次為限，請審慎評估</li>
          <li>建議提供充分的新證據或法律論述</li>
        </ul>
      </div>
      
    </div>
  </div>
</template>

<style scoped>
.reexamination-prep-page {
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

.info-box {
  display: flex;
  gap: 16px;
  padding: 20px;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border: 2px solid #f59e0b;
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

.form-container {
  background: white;
  border-radius: 12px;
  padding: 32px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.application-form {
  margin-bottom: 32px;
}

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

.reexamination-grounds {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.ground-item {
  padding: 16px;
  background: #f9fafb;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
}

.ground-item .checkbox-label {
  margin-bottom: 12px;
}

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

.action-buttons {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 32px;
}

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
  .reexamination-prep-page {
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
  
  .btn-save-draft,
  .btn-download {
    width: 100%;
  }
}
</style>
