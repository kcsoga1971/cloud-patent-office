<!-- src/views/services/SubmissionPrep.vue - 最終版 -->
<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../../supabase'
import { useUserStore } from '../../stores/user'
import { Document, Paragraph, TextRun, AlignmentType, Packer } from 'docx'
import { saveAs } from 'file-saver'
import SubmissionGuide from '../../components/submission/SubmissionGuide.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const jobId = ref(route.params.jobId)
const isLoading = ref(true)
const isSaving = ref(false)

// ========== 送件指引資料 ==========
const submissionGuide = ref({
  title: '📮 紙本送件流程指引',
  steps: [
    {
      step: 1,
      title: '準備申請文件',
      description: '請確認以下文件已準備齊全',
      notes: [
        '申請書 1 份（本系統已為您生成）',
        '說明書 1 份',
        '申請專利範圍 1 份',
        '摘要 1 份',
        '圖式 1 份（如有）',
        '委任書 1 份（如委任專利代理人）'
      ]
    },
    {
      step: 2,
      title: '繳納申請規費',
      description: '請選擇以下任一方式繳納規費',
      fee_breakdown: {
        base_fee: 3500,
        exam_fee: 7000,
        extra_claims: 0,
        total: 10500
      },
      payment_methods: [
        {
          method: '臨櫃繳費',
          description: '親至智慧財產局櫃檯繳費',
          address: '台北市大安區辛亥路二段 185 號 3 樓',
          hours: '週一至週五 08:30-17:30'
        },
        {
          method: '郵政劃撥',
          description: '至郵局辦理劃撥',
          account: '19825982',
          account_name: '經濟部智慧財產局'
        },
        {
          method: '線上繳費',
          description: '透過智慧財產局網站線上繳費',
          notes: ['需先註冊會員', '可使用信用卡或 ATM 轉帳']
        }
      ]
    },
    {
      step: 3,
      title: '郵寄申請文件',
      description: '將所有文件以掛號郵寄至智慧財產局',
      mailing_info: {
        recipient: '經濟部智慧財產局 專利一組',
        address: '106 台北市大安區辛亥路二段 185 號 3 樓',
        envelope_notes: [
          '請在信封上註明「發明專利申請」',
          '建議使用掛號郵寄，以確保文件送達',
          '保留郵寄收據，作為申請日證明'
        ]
      }
    },
    {
      step: 4,
      title: '等待受理通知',
      description: '智慧財產局收件後會寄發受理通知',
      notes: [
        '通常 7-14 個工作天會收到受理通知',
        '受理通知會載明申請案號及申請日',
        '請妥善保存受理通知，後續查詢需使用申請案號'
      ]
    }
  ],
  tips: [
    '建議先完成「實體審查」申請，可加速審查流程',
    '如有優先權主張，需在申請日起 16 個月內補正優先權證明文件',
    '申請日以智慧財產局收件日為準',
    '可透過智慧財產局網站查詢案件進度'
  ]
})

// ========== 申請書表單資料 ==========
const formData = ref({
  // 一、發明名稱
  title_zh: '',
  title_en: '',
  
  // 二、申請人
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
  
  // 三、發明人
  inventors: [{
    id_number: '',
    nationality: '中華民國',
    family_name: '',
    given_name: ''
  }],
  
  // 四、聲明事項
  declarations: {
    grace_period: false,
    grace_period_details: '',
    priority_claim: false,
    priority_details: [],
    biological_material: false,
    dual_application: false
  },
  
  // 五、頁數與規費
  pages: {
    abstract: 1,
    description: 0,
    claims: 0,
    figures: 0,
    total: 0,
    claim_count: 0,
    figure_count: 0,
    fee: 3500
  },
  
  // 七、附送書件
  attachments: {
    abstract: true,
    description: true,
    claims: true,
    figures: true,
    power_of_attorney: false,
    priority_document: false,
    grace_period_document: false,
    biological_deposit: false,
    other: ''
  }
})

// ========== 從資料庫載入已有資料 ==========
const loadExistingData = async () => {
  isLoading.value = true
  
  try {
    // 1. 載入案件資料
    const { data: job, error: jobError } = await supabase
      .from('saas_jobs')
      .select('*')
      .eq('id', jobId.value)
      .single()
    
    if (jobError) throw jobError
    
    // 2. 載入使用者 profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userStore.user.id)
      .single()
    
    if (profileError) throw profileError
    
    // 3. 載入發明人資料
    const { data: inventors, error: inventorsError } = await supabase
      .from('inventors')
      .select('*')
      .eq('id', userStore.user.id)
    
    if (inventorsError) throw inventorsError
    
    // ========== 自動填入已有資料 ==========
    
    // 發明名稱
    if (job.input_data?.title) {
      formData.value.title_zh = job.input_data.title
    }
    
    // 申請人資料（從 profile 帶入）
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
    
    // 發明人資料
    if (inventors && inventors.length > 0) {
      formData.value.inventors = inventors.map(inv => ({
        id_number: inv.id_number || '',
        nationality: inv.nationality || '中華民國',
        family_name: inv.family_name || '',
        given_name: inv.given_name || ''
      }))
    }
    
    // 頁數資料
    if (job.description_pages) {
      formData.value.pages.description = job.description_pages
    }
    if (job.claims_pages) {
      formData.value.pages.claims = job.claims_pages
    }
    if (job.claims_count) {
      formData.value.pages.claim_count = job.claims_count
    }
    if (job.figures_count) {
      formData.value.pages.figure_count = job.figures_count
    }
    
    // 計算總頁數
    calculateTotalPages()
    
  } catch (err) {
    console.error('❌ 載入資料失敗:', err)
    alert('載入失敗：' + err.message)
  } finally {
    isLoading.value = false
  }
}

// ========== 計算總頁數 ==========
const calculateTotalPages = () => {
  formData.value.pages.total = 
    Number(formData.value.pages.abstract) +
    Number(formData.value.pages.description) +
    Number(formData.value.pages.claims) +
    Number(formData.value.pages.figures)
}

// ========== 監聽頁數變化 ==========
watch(() => [
  formData.value.pages.abstract,
  formData.value.pages.description,
  formData.value.pages.claims,
  formData.value.pages.figures
], () => {
  calculateTotalPages()
}, { deep: true })

// ========== 新增申請人 ==========
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

// ========== 刪除申請人 ==========
const removeApplicant = (index) => {
  if (formData.value.applicants.length > 1) {
    formData.value.applicants.splice(index, 1)
  }
}

// ========== 新增發明人 ==========
const addInventor = () => {
  formData.value.inventors.push({
    id_number: '',
    nationality: '中華民國',
    family_name: '',
    given_name: ''
  })
}

// ========== 刪除發明人 ==========
const removeInventor = (index) => {
  if (formData.value.inventors.length > 1) {
    formData.value.inventors.splice(index, 1)
  }
}

// ========== 儲存資料到平台（可選） ==========
const saveToProfile = async () => {
  if (!confirm('是否要將此次填寫的資料儲存到您的個人檔案？\n下次就可以自動帶入，節省填寫時間。')) {
    return
  }
  
  isSaving.value = true
  
  try {
    const applicant = formData.value.applicants[0]
    
    // 更新 profile
    const { error: profileError } = await supabase
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
    
    if (profileError) throw profileError
    
    // 儲存發明人資料
    for (const inventor of formData.value.inventors) {
      const { error: invError } = await supabase
        .from('inventors')
        .upsert({
          id: userStore.user.id,
          family_name: inventor.family_name,
          given_name: inventor.given_name,
          id_number: inventor.id_number,
          nationality: inventor.nationality
        })
      
      if (invError) throw invError
    }
    
    alert('✅ 資料已儲存到您的個人檔案')
    
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
            margin: {
              top: 1440,
              right: 1440,
              bottom: 1440,
              left: 1440
            }
          }
        },
        children: [
          // 標題
          new Paragraph({
            text: '發明專利申請書',
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            style: 'Heading1'
          }),
          
          new Paragraph({
            text: '（本申請書格式、順序，請勿任意更動，※記號部分請勿填寫）',
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 }
          }),
          
          new Paragraph({
            text: '※ 申請案號：                    ※案由：10000',
            spacing: { after: 100 }
          }),
          
          new Paragraph({
            text: '※ 申請日：',
            spacing: { after: 200 }
          }),
          
          new Paragraph({
            text: '☑ 本案一併申請實體審查',
            spacing: { after: 400 }
          }),
          
          // 一、發明名稱
          new Paragraph({
            text: '一、發明名稱：（中文/英文）',
            spacing: { before: 200, after: 100 }
          }),
          
          new Paragraph({
            text: `中文：${formData.value.title_zh || '【請填寫】'}`,
            indent: { left: 720 }
          }),
          
          new Paragraph({
            text: `英文：${formData.value.title_en || '【請填寫】'}`,
            indent: { left: 720 },
            spacing: { after: 200 }
          }),
          
          // 二、申請人
          new Paragraph({
            text: `二、申請人：（共 ${formData.value.applicants.length} 人）`,
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
          
          // 三、發明人
          new Paragraph({
            text: `三、發明人：（共 ${formData.value.inventors.length} 人）`,
            spacing: { before: 200, after: 100 }
          }),
          
          // 發明人資料
          ...formData.value.inventors.flatMap((inventor, index) => [
            new Paragraph({
              text: `（第 ${index + 1} 發明人）`,
              indent: { left: 720 },
              spacing: { before: 100 }
            }),
            new Paragraph({
              text: `ID：${inventor.id_number || '【請填寫】'}`,
              indent: { left: 720 }
            }),
            new Paragraph({
              text: `國籍：${inventor.nationality}`,
              indent: { left: 720 }
            }),
            new Paragraph({
              text: `姓：${inventor.family_name || '【請填寫】'}`,
              indent: { left: 720 }
            }),
            new Paragraph({
              text: `名：${inventor.given_name || '【請填寫】'}`,
              indent: { left: 720 },
              spacing: { after: 200 }
            })
          ]),
          
          // 五、頁數與規費
          new Paragraph({
            text: '五、說明書頁數、請求項數及申請規費：',
            spacing: { before: 200, after: 100 }
          }),
          
          new Paragraph({
            text: `摘要：(${formData.value.pages.abstract})頁，說明書：（${formData.value.pages.description || '【請填寫】'}）頁，申請專利範圍：(${formData.value.pages.claims || '【請填寫】'})頁，圖式：（${formData.value.pages.figures || '【請填寫】'}）頁，合計共（${formData.value.pages.total || '【請填寫】'}）頁。`,
            indent: { left: 720 },
            spacing: { after: 100 }
          }),
          
          new Paragraph({
            text: `申請專利範圍之請求項共（${formData.value.pages.claim_count || '【請填寫】'}）項，圖式共(${formData.value.pages.figure_count || '【請填寫】'})圖。`,
            indent: { left: 720 },
            spacing: { after: 100 }
          }),
          
          new Paragraph({
            text: `規費：共計新臺幣 ${formData.value.pages.fee} 元整。(規費請參見申請須知)`,
            indent: { left: 720 },
            spacing: { after: 200 }
          }),
          
          // 七、附送書件
          new Paragraph({
            text: '七、附送書件：',
            spacing: { before: 200, after: 100 }
          }),
          
          new Paragraph({
            text: '☑ 1、摘要 1 份。',
            indent: { left: 720 }
          }),
          new Paragraph({
            text: '☑ 2、說明書 1 份。',
            indent: { left: 720 }
          }),
          new Paragraph({
            text: '☑ 3、申請專利範圍 1 份。',
            indent: { left: 720 }
          }),
          new Paragraph({
            text: '☑ 4、必要圖式 1 份。',
            indent: { left: 720 }
          }),
          new Paragraph({
            text: formData.value.attachments.power_of_attorney ? '☑ 5、委任書 1 份。' : '☐ 5、委任書 1 份。',
            indent: { left: 720 }
          })
        ]
      }]
    })
    
    const blob = await Packer.toBlob(doc)
    const filename = `專利申請書_${formData.value.title_zh || '未命名'}_${new Date().toISOString().split('T')[0]}.docx`
    saveAs(blob, filename)
    
    alert('✅ 申請書已下載！')
    
  } catch (err) {
    console.error('❌ 下載失敗:', err)
    alert('下載失敗：' + err.message)
  }
}

// ========== 返回 ==========
const goBack = () => {
  router.push({ name: 'PatentDraftingWorkflow' })
}

// ========== 初始化 ==========
onMounted(() => {
  loadExistingData()
})
</script>

<template>
  <div class="application-form-page">
    <!-- 頁面標題 -->
    <div class="page-header">
      <button @click="goBack" class="btn-back">
        ← 返回案件列表
      </button>
      <div class="header-content">
        <h1>📮 發明專利申請書</h1>
        <p class="subtitle">填寫申請書資料，系統會自動帶入您已儲存的資料</p>
      </div>
    </div>
    
    <!-- Loading -->
    <div v-if="isLoading" class="loading-container">
      <div class="spinner"></div>
      <p>載入中...</p>
    </div>
    
    <!-- 申請書表單 -->
    <div v-else class="form-container">
      
      <!-- 提示訊息 -->
      <div class="info-box">
        <div class="info-icon">💡</div>
        <div class="info-content">
          <h4>使用說明</h4>
          <ul>
            <li>✅ 系統已自動帶入您之前儲存的資料</li>
            <li>📝 您可以直接修改或補充資料</li>
            <li>💾 填寫完成後，可選擇「儲存到個人檔案」，下次就能自動帶入</li>
            <li>📥 點擊「下載申請書」即可產生 Word 檔</li>
          </ul>
        </div>
      </div>
      
      <!-- 申請書表單 -->
      <div class="application-form">
        
        <!-- 一、發明名稱 -->
        <section class="form-section">
          <h3>一、發明名稱：（中文/英文）</h3>
          <div class="form-group">
            <label>中文名稱 <span class="required">*</span></label>
            <input 
              v-model="formData.title_zh" 
              type="text" 
              placeholder="請輸入發明名稱（中文）"
              class="form-input"
            />
          </div>
          <div class="form-group">
            <label>英文名稱</label>
            <input 
              v-model="formData.title_en" 
              type="text" 
              placeholder="請輸入發明名稱（英文）"
              class="form-input"
            />
          </div>
        </section>
        
        <!-- 二、申請人 -->
        <section class="form-section">
          <div class="section-header">
            <h3>二、申請人：（共 {{ formData.applicants.length }} 人）</h3>
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
        
        <!-- 三、發明人 -->
        <section class="form-section">
          <div class="section-header">
            <h3>三、發明人：（共 {{ formData.inventors.length }} 人）</h3>
            <button @click="addInventor" class="btn-add">➕ 新增發明人</button>
          </div>
          
          <div 
            v-for="(inventor, index) in formData.inventors" 
            :key="index"
            class="inventor-card"
          >
            <div class="card-header">
              <h4>第 {{ index + 1 }} 發明人</h4>
              <button 
                v-if="formData.inventors.length > 1"
                @click="removeInventor(index)" 
                class="btn-remove"
              >
                🗑️ 刪除
              </button>
            </div>
            
            <div class="form-group">
              <label>身分證字號 <span class="required">*</span></label>
              <input 
                v-model="inventor.id_number" 
                type="text" 
                placeholder="請輸入身分證字號"
                class="form-input"
              />
            </div>
            
            <div class="form-group">
              <label>國籍 <span class="required">*</span></label>
              <select v-model="inventor.nationality" class="form-select">
                <option value="中華民國">中華民國</option>
                <option value="美國">美國</option>
                <option value="日本">日本</option>
                <option value="其他">其他</option>
              </select>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label>姓 (Family name) <span class="required">*</span></label>
                <input 
                  v-model="inventor.family_name" 
                  type="text" 
                  placeholder="請輸入姓氏"
                  class="form-input"
                />
              </div>
              <div class="form-group">
                <label>名 (Given name) <span class="required">*</span></label>
                <input 
                  v-model="inventor.given_name" 
                  type="text" 
                  placeholder="請輸入名字"
                  class="form-input"
                />
              </div>
            </div>
          </div>
        </section>
        
        <!-- 五、頁數與規費 -->
        <section class="form-section">
          <h3>五、說明書頁數、請求項數及申請規費：</h3>
          
          <div class="form-row">
            <div class="form-group">
              <label>摘要頁數</label>
              <input 
                v-model.number="formData.pages.abstract" 
                type="number" 
                min="1"
                class="form-input"
              />
            </div>
            <div class="form-group">
              <label>說明書頁數 <span class="required">*</span></label>
              <input 
                v-model.number="formData.pages.description" 
                type="number" 
                min="1"
                placeholder="請輸入"
                class="form-input"
              />
            </div>
            <div class="form-group">
              <label>申請專利範圍頁數 <span class="required">*</span></label>
              <input 
                v-model.number="formData.pages.claims" 
                type="number" 
                min="1"
                placeholder="請輸入"
                class="form-input"
              />
            </div>
            <div class="form-group">
              <label>圖式頁數</label>
              <input 
                v-model.number="formData.pages.figures" 
                type="number" 
                min="0"
                placeholder="請輸入"
                class="form-input"
              />
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label>請求項數 <span class="required">*</span></label>
              <input 
                v-model.number="formData.pages.claim_count" 
                type="number" 
                min="1"
                placeholder="請輸入"
                class="form-input"
              />
            </div>
            <div class="form-group">
              <label>圖式數量</label>
              <input 
                v-model.number="formData.pages.figure_count" 
                type="number" 
                min="0"
                placeholder="請輸入"
                class="form-input"
              />
            </div>
            <div class="form-group">
              <label>總頁數（自動計算）</label>
              <input 
                :value="formData.pages.total" 
                type="number" 
                readonly
                class="form-input readonly"
              />
            </div>
            <div class="form-group">
              <label>申請規費（元）</label>
              <input 
                v-model.number="formData.pages.fee" 
                type="number" 
                class="form-input"
              />
            </div>
          </div>
        </section>
        
        <!-- 七、附送書件 -->
        <section class="form-section">
          <h3>七、附送書件：</h3>
          <div class="checkbox-list">
            <label class="checkbox-label">
              <input type="checkbox" v-model="formData.attachments.abstract" checked disabled />
              1、摘要 1 份（必要）
            </label>
            <label class="checkbox-label">
              <input type="checkbox" v-model="formData.attachments.description" checked disabled />
              2、說明書 1 份（必要）
            </label>
            <label class="checkbox-label">
              <input type="checkbox" v-model="formData.attachments.claims" checked disabled />
              3、申請專利範圍 1 份（必要）
            </label>
            <label class="checkbox-label">
              <input type="checkbox" v-model="formData.attachments.figures" checked disabled />
              4、必要圖式 1 份（必要）
            </label>
            <label class="checkbox-label">
              <input type="checkbox" v-model="formData.attachments.power_of_attorney" />
              5、委任書 1 份
            </label>
            <label class="checkbox-label">
              <input type="checkbox" v-model="formData.attachments.priority_document" />
              10、優先權證明文件正本 1 份
            </label>
            <label class="checkbox-label">
              <input type="checkbox" v-model="formData.attachments.grace_period_document" />
              12、優惠期證明文件 1 份
            </label>
          </div>
        </section>
        
      </div>
      
      <!-- 操作按鈕 -->
      <div class="action-buttons">
        <button @click="saveToProfile" :disabled="isSaving" class="btn-save">
          {{ isSaving ? '儲存中...' : '💾 儲存到個人檔案' }}
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
          <li>若選擇「儲存到個人檔案」，下次填寫時會自動帶入這些資料</li>
          <li>您的資料僅儲存在本平台，不會外洩</li>
        </ul>
      </div>
      
    </div>
  </div>
</template>

<style scoped>
.application-form-page {
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
.form-select {
  width: 100%;
  padding: 12px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.3s;
}

.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-input.readonly {
  background: #f9fafb;
  cursor: not-allowed;
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
.inventor-card {
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

.btn-save,
.btn-download {
  padding: 14px 32px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-save {
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  color: white;
}

.btn-save:hover:not(:disabled) {
  background: linear-gradient(135deg, #7c3aed, #6d28d9);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
}

.btn-save:disabled {
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
  .application-form-page {
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
  
  .btn-save,
  .btn-download {
    width: 100%;
  }
}
</style>

