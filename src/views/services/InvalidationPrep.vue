<!-- src/views/services/InvalidationPrep.vue -->
<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../../supabase'
import { useUserStore } from '../../stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const jobId = ref(route.params.jobId || null)
const isLoading = ref(false)
const isSaving = ref(false)
const activeTab = ref('basic') // 'basic' | 'petitioner' | 'grounds' | 'preview'

// ========== 表單資料 ==========
const formData = ref({
  // 一、被舉發案資訊
  challenged_case_number: '',           // 被舉發案案號
  patent_certificate_number: '',        // 專利證書號數
  invention_name: '',                   // 發明/新型/設計名稱
  patent_type: 'invention',             // 'invention' | 'utility' | 'design'
  
  // 二、舉發人資訊
  petitioners: [
    {
      petitioner_type: 'anyone',        // 'anyone' | 'interested_party'
      is_natural_person: true,
      
      // 自然人
      family_name: '',
      given_name: '',
      english_name: '',
      id_number: '',
      
      // 法人
      company_name: '',
      company_english_name: '',
      tax_id: '',
      representative_name: '',
      representative_english_name: '',
      
      // 共同資訊
      nationality: '中華民國',
      address: '',
      english_address: '',
      phone: '',
      fax: '',
      mobile: '',
      email: '',
      
      is_service_recipient: false       // 是否為應受送達人
    }
  ],
  
  // 代理人資訊
  agents: [
    {
      name: '',
      id_number: '',
      certificate_number: '',
      address: '',
      phone: '',
      extension: '',
      fax: '',
      email: ''
    }
  ],
  
  // 三、被舉發人資訊
  patentees: [
    {
      name: '',
      english_name: ''
    }
  ],
  
  // 四、舉發聲明
  invalidation_claims: {
    // 發明/新型專利
    claim_type: 'partial',              // 'all' | 'partial' | 'full_revocation' | 'extension'
    
    // 部分請求項撤銷
    all_claims_count: 0,
    partial_claims: '',                 // 例如：1-3, 5, 7-10
    partial_claims_count: 0,
    
    // 全部撤銷事由
    full_revocation_grounds: {
      same_day_filing: false,           // 同日申請發明及新型
      utility_expired: false,            // 新型已消滅
      non_applicant: false,              // 非專利申請權人
      not_all_co_owners: false,         // 非全體共有人申請
      reciprocity_issue: false          // 互惠問題
    },
    
    // 延長專利權期間
    extension_start_date: '',
    extension_end_date: ''
  },
  
  // 五、規費
  fees: {
    base_fee: 5000,
    per_claim_fee: 800,
    total_fee: 5000
  },
  
  // 六、附送書件
  attachments: {
    application_copies: 3,
    grounds_and_evidence_copies: 3,
    evidence_count: 0,
    original_documents: 0,
    samples: 0,
    power_of_attorney: false,
    interested_party_proof: false,
    legal_interest_proof: false,
    other_documents: ''
  },
  
  // 舉發理由書內容
  grounds_statement: {
    main_purpose: '',                   // 舉發主旨
    invalidation_statement: '',         // 舉發聲明
    evidence_list: [                    // 舉發證據
      {
        evidence_number: 1,
        description: '',
        patent_number: '',
        publication_date: '',
        title: ''
      }
    ],
    claim_chart: [                      // 請求撤銷之請求項、主張法條及證據
      {
        claim_number: '',
        legal_basis: '',
        evidence_used: ''
      }
    ],
    detailed_reasons: '',               // 詳細理由
    other_requests: ''                  // 其他申請
  },
  
  // 個人資料保護聲明
  privacy_consent: false,
  
  // 備註
  user_notes: ''
})

// ========== 從舉發分析案件載入資料 ==========
const sourceJobId = ref(route.query.source_job_id || null)

const loadFromInvalidationJob = async () => {
  if (!sourceJobId.value) return
  
  try {
    const { data, error } = await supabase
      .from('saas_jobs')
      .select('*')
      .eq('id', sourceJobId.value)
      .eq('job_type', 'patent_invalidation')
      .single()
    
    if (error) throw error
    
    if (data && data.result_data) {
      // 自動填充基本資訊
      formData.value.challenged_case_number = data.input_data?.target_patent || ''
      formData.value.patent_certificate_number = data.input_data?.target_patent || ''
      formData.value.invention_name = data.input_data?.target_title || ''
      
      // 自動填充證據列表
      if (data.result_data.evidence_analysis) {
        formData.value.grounds_statement.evidence_list = data.result_data.evidence_analysis.map((ev, idx) => ({
          evidence_number: idx + 1,
          description: ev.description || '',
          patent_number: ev.patent_number || '',
          publication_date: ev.publication_date || '',
          title: ev.title || ''
        }))
      }
      
      // 自動填充 Claim Chart
      if (data.result_data.claim_chart) {
        formData.value.grounds_statement.claim_chart = data.result_data.claim_chart.map(item => ({
          claim_number: item.claim_number || '',
          legal_basis: item.legal_basis || '',
          evidence_used: item.evidence_used || ''
        }))
      }
      
      // 自動填充詳細理由
      if (data.result_data.detailed_analysis) {
        formData.value.grounds_statement.detailed_reasons = data.result_data.detailed_analysis
      }
      
      alert('✅ 已從舉發分析案件載入資料')
    }
  } catch (err) {
    console.error('❌ 載入舉發分析資料失敗:', err)
    alert('載入失敗：' + err.message)
  }
}

// ========== 載入現有申請書 ==========
const loadExistingJob = async () => {
  if (!jobId.value) return
  
  isLoading.value = true
  try {
    const { data, error } = await supabase
      .from('saas_jobs')
      .select('*')
      .eq('id', jobId.value)
      .eq('job_type', 'patent_invalidation_application')
      .single()
    
    if (error) throw error
    
    if (data && data.input_data) {
      formData.value = { ...formData.value, ...data.input_data }
    }
  } catch (err) {
    console.error('❌ 載入失敗:', err)
    alert('載入失敗：' + err.message)
  } finally {
    isLoading.value = false
  }
}

// ========== 計算規費 ==========
const calculateFees = () => {
  const claims = formData.value.invalidation_claims
  
  if (claims.claim_type === 'partial') {
    // 部分請求項：每件 5000 + 每項 800
    const count = claims.partial_claims_count || 0
    formData.value.fees.total_fee = 5000 + (count * 800)
  } else if (claims.claim_type === 'all') {
    // 全部請求項：每件 5000 + 每項 800
    const count = claims.all_claims_count || 0
    formData.value.fees.total_fee = 5000 + (count * 800)
  } else if (claims.claim_type === 'full_revocation') {
    // 全部撤銷事由
    if (formData.value.patent_type === 'utility') {
      formData.value.fees.total_fee = 9000
    } else if (formData.value.patent_type === 'invention') {
      formData.value.fees.total_fee = 10000
    } else if (formData.value.patent_type === 'design') {
      formData.value.fees.total_fee = 8000
    }
  } else if (claims.claim_type === 'extension') {
    // 延長專利權期間
    formData.value.fees.total_fee = 10000
  }
}

// ========== 新增/移除項目 ==========
const addPetitioner = () => {
  formData.value.petitioners.push({
    petitioner_type: 'anyone',
    is_natural_person: true,
    family_name: '',
    given_name: '',
    english_name: '',
    id_number: '',
    company_name: '',
    company_english_name: '',
    tax_id: '',
    representative_name: '',
    representative_english_name: '',
    nationality: '中華民國',
    address: '',
    english_address: '',
    phone: '',
    fax: '',
    mobile: '',
    email: '',
    is_service_recipient: false
  })
}

const removePetitioner = (index) => {
  if (formData.value.petitioners.length > 1) {
    formData.value.petitioners.splice(index, 1)
  }
}

const addAgent = () => {
  formData.value.agents.push({
    name: '',
    id_number: '',
    certificate_number: '',
    address: '',
    phone: '',
    extension: '',
    fax: '',
    email: ''
  })
}

const removeAgent = (index) => {
  formData.value.agents.splice(index, 1)
}

const addPatentee = () => {
  formData.value.patentees.push({
    name: '',
    english_name: ''
  })
}

const removePatentee = (index) => {
  if (formData.value.patentees.length > 1) {
    formData.value.patentees.splice(index, 1)
  }
}

const addEvidence = () => {
  const nextNumber = formData.value.grounds_statement.evidence_list.length + 1
  formData.value.grounds_statement.evidence_list.push({
    evidence_number: nextNumber,
    description: '',
    patent_number: '',
    publication_date: '',
    title: ''
  })
}

const removeEvidence = (index) => {
  if (formData.value.grounds_statement.evidence_list.length > 1) {
    formData.value.grounds_statement.evidence_list.splice(index, 1)
    // 重新編號
    formData.value.grounds_statement.evidence_list.forEach((ev, idx) => {
      ev.evidence_number = idx + 1
    })
  }
}

const addClaimChartRow = () => {
  formData.value.grounds_statement.claim_chart.push({
    claim_number: '',
    legal_basis: '',
    evidence_used: ''
  })
}

const removeClaimChartRow = (index) => {
  formData.value.grounds_statement.claim_chart.splice(index, 1)
}

// ========== 儲存 ==========
const saveJob = async (status = 'draft') => {
  // 驗證必填欄位
  if (!formData.value.challenged_case_number) {
    alert('❌ 請填寫被舉發案案號')
    activeTab.value = 'basic'
    return
  }
  
  if (!formData.value.patent_certificate_number) {
    alert('❌ 請填寫專利證書號數')
    activeTab.value = 'basic'
    return
  }
  
  if (!formData.value.invention_name) {
    alert('❌ 請填寫發明/新型/設計名稱')
    activeTab.value = 'basic'
    return
  }
  
  if (formData.value.petitioners.length === 0) {
    alert('❌ 請至少填寫一位舉發人')
    activeTab.value = 'petitioner'
    return
  }
  
  const firstPetitioner = formData.value.petitioners[0]
  if (firstPetitioner.is_natural_person) {
    if (!firstPetitioner.family_name || !firstPetitioner.given_name) {
      alert('❌ 請填寫舉發人姓名')
      activeTab.value = 'petitioner'
      return
    }
  } else {
    if (!firstPetitioner.company_name) {
      alert('❌ 請填寫舉發人公司名稱')
      activeTab.value = 'petitioner'
      return
    }
  }
  
  if (!formData.value.privacy_consent) {
    alert('❌ 請確認個人資料保護聲明')
    return
  }
  
  // 計算規費
  calculateFees()
  
  isSaving.value = true
  
  try {
    const jobData = {
      user_id: userStore.user.id,
      job_type: 'patent_invalidation_application',
      status: status,
      input_data: formData.value,
      created_at: jobId.value ? undefined : new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    if (jobId.value) {
      // 更新現有案件
      const { error } = await supabase
        .from('saas_jobs')
        .update(jobData)
        .eq('id', jobId.value)
      
      if (error) throw error
      
      alert('✅ 儲存成功')
    } else {
      // 建立新案件
      const { data, error } = await supabase
        .from('saas_jobs')
        .insert(jobData)
        .select()
        .single()
      
      if (error) throw error
      
      jobId.value = data.id
      alert('✅ 建立成功')
      
      // 更新 URL
      router.replace({ 
        name: 'InvalidationPrep', 
        params: { jobId: data.id } 
      })
    }
  } catch (err) {
    console.error('❌ 儲存失敗:', err)
    alert('儲存失敗：' + err.message)
  } finally {
    isSaving.value = false
  }
}

const saveDraft = () => saveJob('draft')
const submitJob = () => saveJob('pending')

// ========== 預覽 ==========
const previewDocument = () => {
  activeTab.value = 'preview'
}

// ========== 匯出 ==========
const exportDocument = () => {
  alert('📄 匯出功能開發中...')
}

// ========== 返回列表 ==========
const goBack = () => {
  router.push({ name: 'InvalidationWorkflow' })
}

// ========== 初始化 ==========
onMounted(async () => {
  if (sourceJobId.value) {
    await loadFromInvalidationJob()
  } else if (jobId.value) {
    await loadExistingJob()
  }
})
</script>

<template>
  <div class="invalidation-prep-page">
    
    <!-- 頁面標題 -->
    <div class="page-header">
      <div class="header-left">
        <button @click="goBack" class="btn-back">
          ← 返回列表
        </button>
        <div class="header-content">
          <h1>⚔️ 專利舉發申請書</h1>
          <p class="subtitle">Patent Invalidation Application</p>
        </div>
      </div>
      <div class="header-actions">
        <button @click="saveDraft" :disabled="isSaving" class="btn-secondary">
          💾 {{ isSaving ? '儲存中...' : '儲存草稿' }}
        </button>
        <button @click="previewDocument" class="btn-secondary">
          👁️ 預覽
        </button>
        <button @click="exportDocument" class="btn-secondary">
          📄 匯出 Word
        </button>
        <button @click="submitJob" :disabled="isSaving" class="btn-primary">
          ✅ {{ isSaving ? '提交中...' : '完成申請書' }}
        </button>
      </div>
    </div>
    
    <!-- 提示訊息 -->
    <div v-if="sourceJobId" class="info-banner success">
      <div class="banner-icon">✅</div>
      <div class="banner-content">
        <h4>已自動載入舉發分析資料</h4>
        <p>系統已從舉發分析案件中載入相關資料，請檢查並補充完整資訊。</p>
      </div>
    </div>
    
    <div class="info-banner">
      <div class="banner-icon">ℹ️</div>
      <div class="banner-content">
        <h4>填寫說明</h4>
        <p>本申請書格式依據智慧財產局規定，請依序填寫各項資訊。標示 <span class="required">*</span> 為必填欄位。</p>
      </div>
    </div>
    
    <!-- 分頁導航 -->
    <div class="tabs">
      <button 
        @click="activeTab = 'basic'" 
        :class="{ active: activeTab === 'basic' }"
        class="tab-button"
      >
        📋 基本資訊
      </button>
      <button 
        @click="activeTab = 'petitioner'" 
        :class="{ active: activeTab === 'petitioner' }"
        class="tab-button"
      >
        👤 舉發人資訊
      </button>
      <button 
        @click="activeTab = 'grounds'" 
        :class="{ active: activeTab === 'grounds' }"
        class="tab-button"
      >
        📝 舉發理由書
      </button>
      <button 
        @click="activeTab = 'preview'" 
        :class="{ active: activeTab === 'preview' }"
        class="tab-button"
      >
        👁️ 預覽
      </button>
    </div>
    
    <!-- Loading -->
    <div v-if="isLoading" class="loading-container">
      <div class="spinner"></div>
      <p>載入中...</p>
    </div>
    
    <!-- 表單內容 -->
    <div v-else class="form-container">
      
      <!-- ========== 基本資訊 ========== -->
      <div v-show="activeTab === 'basic'" class="form-section">
        
        <div class="section-header">
          <h2>📋 一、被舉發案資訊</h2>
        </div>
        
        <div class="form-grid">
          <div class="form-group full-width">
            <label class="required">被舉發案案號</label>
            <input 
              v-model="formData.challenged_case_number" 
              type="text" 
              placeholder="例如：112345678"
              class="form-input"
            />
            <span class="field-hint">請填寫完整的專利申請案號</span>
          </div>
          
          <div class="form-group full-width">
            <label class="required">專利證書號數</label>
            <input 
              v-model="formData.patent_certificate_number" 
              type="text" 
              placeholder="例如：I123456"
              class="form-input"
            />
            <span class="field-hint">發明：I + 6-7位數字；新型：M + 6-7位數字；設計：D + 6-7位數字</span>
          </div>
          
          <div class="form-group">
            <label class="required">專利類型</label>
            <select v-model="formData.patent_type" class="form-select" @change="calculateFees">
              <option value="invention">發明專利</option>
              <option value="utility">新型專利</option>
              <option value="design">設計專利</option>
            </select>
          </div>
          
          <div class="form-group full-width">
            <label class="required">發明/新型/設計名稱</label>
            <input 
              v-model="formData.invention_name" 
              type="text" 
              placeholder="請填寫專利名稱"
              class="form-input"
            />
          </div>
        </div>
        
        <div class="section-header">
          <h2>⚖️ 四、舉發聲明</h2>
        </div>
        
        <div class="form-group">
          <label class="required">請求撤銷類型</label>
          <div class="radio-group">
            <label class="radio-label">
              <input 
                type="radio" 
                v-model="formData.invalidation_claims.claim_type" 
                value="partial"
                @change="calculateFees"
              />
              <span>部分請求項撤銷</span>
            </label>
            <label class="radio-label">
              <input 
                type="radio" 
                v-model="formData.invalidation_claims.claim_type" 
                value="all"
                @change="calculateFees"
              />
              <span>全部請求項撤銷</span>
            </label>
            <label class="radio-label" v-if="formData.patent_type !== 'design'">
              <input 
                type="radio" 
                v-model="formData.invalidation_claims.claim_type" 
                value="full_revocation"
                @change="calculateFees"
              />
              <span>全部撤銷事由</span>
            </label>
            <label class="radio-label">
              <input 
                type="radio" 
                v-model="formData.invalidation_claims.claim_type" 
                value="extension"
                @change="calculateFees"
              />
              <span>延長專利權期間撤銷</span>
            </label>
          </div>
        </div>
        
        <!-- 部分請求項撤銷 -->
        <div v-if="formData.invalidation_claims.claim_type === 'partial'" class="form-grid">
          <div class="form-group">
            <label>請求撤銷之請求項</label>
            <input 
              v-model="formData.invalidation_claims.partial_claims" 
              type="text" 
              placeholder="例如：1-3, 5, 7-10"
              class="form-input"
            />
            <span class="field-hint">請以逗號分隔，範圍用連字號表示</span>
          </div>
          
          <div class="form-group">
            <label>請求項數量</label>
            <input 
              v-model.number="formData.invalidation_claims.partial_claims_count" 
              type="number" 
              min="1"
              class="form-input"
              @input="calculateFees"
            />
          </div>
        </div>
        
        <!-- 全部請求項撤銷 -->
        <div v-if="formData.invalidation_claims.claim_type === 'all'" class="form-grid">
          <div class="form-group">
            <label>全部請求項數量</label>
            <input 
              v-model.number="formData.invalidation_claims.all_claims_count" 
              type="number" 
              min="1"
              class="form-input"
              @input="calculateFees"
            />
          </div>
        </div>
        
        <!-- 全部撤銷事由 -->
        <div v-if="formData.invalidation_claims.claim_type === 'full_revocation'" class="form-group">
          <label>撤銷事由（可複選）</label>
          <div class="checkbox-group">
            <label class="checkbox-label">
              <input 
                type="checkbox" 
                v-model="formData.invalidation_claims.full_revocation_grounds.same_day_filing"
              />
              <span>同一人於同日就相同創作分別申請發明及新型專利</span>
            </label>
            <label class="checkbox-label">
              <input 
                type="checkbox" 
                v-model="formData.invalidation_claims.full_revocation_grounds.utility_expired"
              />
              <span>新型專利權已當然消滅或撤銷確定</span>
            </label>
            <label class="checkbox-label">
              <input 
                type="checkbox" 
                v-model="formData.invalidation_claims.full_revocation_grounds.non_applicant"
              />
              <span>專利權人為非專利申請權人</span>
            </label>
            <label class="checkbox-label">
              <input 
                type="checkbox" 
                v-model="formData.invalidation_claims.full_revocation_grounds.not_all_co_owners"
              />
              <span>共有專利申請權非由全體共有人提出申請</span>
            </label>
            <label class="checkbox-label">
              <input 
                type="checkbox" 
                v-model="formData.invalidation_claims.full_revocation_grounds.reciprocity_issue"
              />
              <span>專利權人所屬國家對中華民國國民申請專利不予受理</span>
            </label>
          </div>
        </div>
        
        <!-- 延長專利權期間 -->
        <div v-if="formData.invalidation_claims.claim_type === 'extension'" class="form-grid">
          <div class="form-group">
            <label>延長期間起始日</label>
            <input 
              v-model="formData.invalidation_claims.extension_start_date" 
              type="date" 
              class="form-input"
            />
          </div>
          
          <div class="form-group">
            <label>延長期間結束日</label>
            <input 
              v-model="formData.invalidation_claims.extension_end_date" 
              type="date" 
              class="form-input"
            />
          </div>
        </div>
        
        <div class="section-header">
          <h2>💰 五、申請規費</h2>
        </div>
        
        <div class="fee-summary">
          <div class="fee-item">
            <span class="fee-label">基本規費：</span>
            <span class="fee-value">NT$ {{ formData.fees.base_fee.toLocaleString() }}</span>
          </div>
          <div class="fee-item" v-if="formData.invalidation_claims.claim_type === 'partial' || formData.invalidation_claims.claim_type === 'all'">
            <span class="fee-label">請求項規費（{{ formData.invalidation_claims.partial_claims_count || formData.invalidation_claims.all_claims_count }} 項 × NT$ 800）：</span>
            <span class="fee-value">NT$ {{ ((formData.invalidation_claims.partial_claims_count || formData.invalidation_claims.all_claims_count || 0) * 800).toLocaleString() }}</span>
          </div>
          <div class="fee-total">
            <span class="fee-label">總計：</span>
            <span class="fee-value">NT$ {{ formData.fees.total_fee.toLocaleString() }}</span>
          </div>
        </div>
        
        <div class="section-header">
          <h2>📎 六、附送書件</h2>
        </div>
        
        <div class="form-grid">
          <div class="form-group">
            <label>舉發申請書份數</label>
            <input 
              v-model.number="formData.attachments.application_copies" 
              type="number" 
              min="3"
              class="form-input"
            />
            <span class="field-hint">預設 3 份</span>
          </div>
          
          <div class="form-group">
            <label>舉發理由書及證據份數</label>
            <input 
              v-model.number="formData.attachments.grounds_and_evidence_copies" 
              type="number" 
              min="3"
              class="form-input"
            />
            <span class="field-hint">預設 3 份</span>
          </div>
          
          <div class="form-group">
            <label>證據總數</label>
            <input 
              v-model.number="formData.attachments.evidence_count" 
              type="number" 
              min="0"
              class="form-input"
            />
          </div>
          
          <div class="form-group">
            <label>書證原本數量</label>
            <input 
              v-model.number="formData.attachments.original_documents" 
              type="number" 
              min="0"
              class="form-input"
            />
          </div>
          
          <div class="form-group">
            <label>樣品數量</label>
            <input 
              v-model.number="formData.attachments.samples" 
              type="number" 
              min="0"
              class="form-input"
            />
          </div>
        </div>
        
        <div class="form-group">
          <label>其他附送文件</label>
          <div class="checkbox-group">
            <label class="checkbox-label">
              <input 
                type="checkbox" 
                v-model="formData.attachments.power_of_attorney"
              />
              <span>委任書 1 份</span>
            </label>
            <label class="checkbox-label">
              <input 
                type="checkbox" 
                v-model="formData.attachments.interested_party_proof"
              />
              <span>利害關係人證明文件 1 份</span>
            </label>
            <label class="checkbox-label">
              <input 
                type="checkbox" 
                v-model="formData.attachments.legal_interest_proof"
              />
              <span>可回復法律上利益之證明文件 1 份</span>
            </label>
          </div>
        </div>
        
        <div class="form-group full-width">
          <label>其他文件說明</label>
          <textarea 
            v-model="formData.attachments.other_documents" 
            rows="3"
            placeholder="請說明其他附送文件"
            class="form-textarea"
          ></textarea>
        </div>
        
      </div>
      
      <!-- ========== 舉發人資訊 ========== -->
      <div v-show="activeTab === 'petitioner'" class="form-section">
        
        <div class="section-header">
          <h2>👤 二、舉發人資訊</h2>
          <button @click="addPetitioner" class="btn-add">➕ 新增舉發人</button>
        </div>
        
        <div 
          v-for="(petitioner, index) in formData.petitioners" 
          :key="index"
          class="subsection"
        >
          <div class="subsection-header">
            <h3>舉發人 {{ index + 1 }}</h3>
            <button 
              v-if="formData.petitioners.length > 1"
              @click="removePetitioner(index)" 
              class="btn-remove"
            >
              🗑️ 移除
            </button>
          </div>
          
          <div class="form-group">
            <label class="required">舉發人身份</label>
            <div class="radio-group">
              <label class="radio-label">
                <input 
                  type="radio" 
                  v-model="petitioner.petitioner_type" 
                  value="anyone"
                />
                <span>任何人</span>
              </label>
              <label class="radio-label">
                <input 
                  type="radio" 
                  v-model="petitioner.petitioner_type" 
                  value="interested_party"
                />
                <span>利害關係人</span>
              </label>
            </div>
          </div>
          
          <div class="form-group">
            <label class="required">舉發人類型</label>
            <div class="radio-group">
              <label class="radio-label">
                <input 
                  type="radio" 
                  v-model="petitioner.is_natural_person" 
                  :value="true"
                />
                <span>自然人</span>
              </label>
              <label class="radio-label">
                <input 
                  type="radio" 
                  v-model="petitioner.is_natural_person" 
                  :value="false"
                />
                <span>法人/團體</span>
              </label>
            </div>
          </div>
          
          <!-- 自然人資訊 -->
          <div v-if="petitioner.is_natural_person" class="form-grid">
            <div class="form-group">
              <label class="required">姓氏（中文）</label>
              <input 
                v-model="petitioner.family_name" 
                type="text" 
                placeholder="例如：王"
                class="form-input"
              />
            </div>
            
            <div class="form-group">
              <label class="required">名字（中文）</label>
              <input 
                v-model="petitioner.given_name" 
                type="text" 
                placeholder="例如：小明"
                class="form-input"
              />
            </div>
            
            <div class="form-group full-width">
              <label>英文姓名</label>
              <input 
                v-model="petitioner.english_name" 
                type="text" 
                placeholder="例如：Wang, Xiao-Ming"
                class="form-input"
              />
            </div>
            
            <div class="form-group">
              <label class="required">身分證字號</label>
              <input 
                v-model="petitioner.id_number" 
                type="text" 
                placeholder="例如：A123456789"
                class="form-input"
              />
            </div>
          </div>
          
          <!-- 法人資訊 -->
          <div v-else class="form-grid">
            <div class="form-group full-width">
              <label class="required">公司名稱（中文）</label>
              <input 
                v-model="petitioner.company_name" 
                type="text" 
                placeholder="例如：台灣科技股份有限公司"
                class="form-input"
              />
            </div>
            
            <div class="form-group full-width">
              <label>公司名稱（英文）</label>
              <input 
                v-model="petitioner.company_english_name" 
                type="text" 
                placeholder="例如：Taiwan Technology Co., Ltd."
                class="form-input"
              />
            </div>
            
            <div class="form-group">
              <label class="required">統一編號</label>
              <input 
                v-model="petitioner.tax_id" 
                type="text" 
                placeholder="例如：12345678"
                class="form-input"
              />
            </div>
            
            <div class="form-group">
              <label class="required">代表人姓名（中文）</label>
              <input 
                v-model="petitioner.representative_name" 
                type="text" 
                placeholder="例如：王小明"
                class="form-input"
              />
            </div>
            
            <div class="form-group full-width">
              <label>代表人姓名（英文）</label>
              <input 
                v-model="petitioner.representative_english_name" 
                type="text" 
                placeholder="例如：Wang, Xiao-Ming"
                class="form-input"
              />
            </div>
          </div>
          
          <!-- 共同資訊 -->
          <div class="form-grid">
            <div class="form-group">
              <label class="required">國籍</label>
              <input 
                v-model="petitioner.nationality" 
                type="text" 
                placeholder="例如：中華民國"
                class="form-input"
              />
            </div>
            
            <div class="form-group full-width">
              <label class="required">住居所或營業所地址（中文）</label>
              <input 
                v-model="petitioner.address" 
                type="text" 
                placeholder="例如：台北市○○區○○路○○號"
                class="form-input"
              />
            </div>
            
            <div class="form-group full-width">
              <label>地址（英文）</label>
              <input 
                v-model="petitioner.english_address" 
                type="text" 
                placeholder="例如：No. XX, XX Rd., XX Dist., Taipei City"
                class="form-input"
              />
            </div>
            
            <div class="form-group">
              <label class="required">電話</label>
              <input 
                v-model="petitioner.phone" 
                type="tel" 
                placeholder="例如：02-12345678"
                class="form-input"
              />
            </div>
            
            <div class="form-group">
              <label>傳真</label>
              <input 
                v-model="petitioner.fax" 
                type="tel" 
                placeholder="例如：02-12345678"
                class="form-input"
              />
            </div>
            
            <div class="form-group">
              <label>手機</label>
              <input 
                v-model="petitioner.mobile" 
                type="tel" 
                placeholder="例如：0912-345-678"
                class="form-input"
              />
            </div>
            
            <div class="form-group">
              <label>電子郵件</label>
              <input 
                v-model="petitioner.email" 
                type="email" 
                placeholder="例如：example@email.com"
                class="form-input"
              />
            </div>
          </div>
          
          <div class="form-group">
            <label class="checkbox-label">
              <input 
                type="checkbox" 
                v-model="petitioner.is_service_recipient"
              />
              <span>指定為應受送達人</span>
            </label>
          </div>
        </div>
        
        <div class="section-header">
          <h2>👨‍💼 代理人資訊</h2>
          <button @click="addAgent" class="btn-add">➕ 新增代理人</button>
        </div>
        
        <div 
          v-for="(agent, index) in formData.agents" 
          :key="index"
          class="subsection"
        >
          <div class="subsection-header">
            <h3>代理人 {{ index + 1 }}</h3>
            <button 
              @click="removeAgent(index)" 
              class="btn-remove"
            >
              🗑️ 移除
            </button>
          </div>
          
          <div class="form-grid">
            <div class="form-group">
              <label>姓名</label>
              <input 
                v-model="agent.name" 
                type="text" 
                placeholder="請填寫代理人姓名"
                class="form-input"
              />
            </div>
            
            <div class="form-group">
              <label>身分證字號</label>
              <input 
                v-model="agent.id_number" 
                type="text" 
                placeholder="例如：A123456789"
                class="form-input"
              />
            </div>
            
            <div class="form-group">
              <label>證書字號</label>
              <input 
                v-model="agent.certificate_number" 
                type="text" 
                placeholder="請填寫專利代理人證書字號"
                class="form-input"
              />
            </div>
            
            <div class="form-group full-width">
              <label>地址</label>
              <input 
                v-model="agent.address" 
                type="text" 
                placeholder="請填寫代理人地址"
                class="form-input"
              />
            </div>
            
            <div class="form-group">
              <label>聯絡電話</label>
              <input 
                v-model="agent.phone" 
                type="tel" 
                placeholder="例如：02-12345678"
                class="form-input"
              />
            </div>
            
            <div class="form-group">
              <label>分機</label>
              <input 
                v-model="agent.extension" 
                type="text" 
                placeholder="例如：123"
                class="form-input"
              />
            </div>
            
            <div class="form-group">
              <label>傳真</label>
              <input 
                v-model="agent.fax" 
                type="tel" 
                placeholder="例如：02-12345678"
                class="form-input"
              />
            </div>
            
            <div class="form-group">
              <label>電子郵件</label>
              <input 
                v-model="agent.email" 
                type="email" 
                placeholder="例如：agent@email.com"
                class="form-input"
              />
            </div>
          </div>
        </div>
        
        <div class="section-header">
          <h2>🏢 三、被舉發人資訊</h2>
          <button @click="addPatentee" class="btn-add">➕ 新增被舉發人</button>
        </div>
        
        <div 
          v-for="(patentee, index) in formData.patentees" 
          :key="index"
          class="subsection"
        >
          <div class="subsection-header">
            <h3>被舉發人 {{ index + 1 }}</h3>
            <button 
              v-if="formData.patentees.length > 1"
              @click="removePatentee(index)" 
              class="btn-remove"
            >
              🗑️ 移除
            </button>
          </div>
          
          <div class="form-grid">
            <div class="form-group">
              <label class="required">姓名或名稱（中文）</label>
              <input 
                v-model="patentee.name" 
                type="text" 
                placeholder="請填寫被舉發人姓名或公司名稱"
                class="form-input"
              />
            </div>
            
            <div class="form-group">
              <label>姓名或名稱（英文）</label>
              <input 
                v-model="patentee.english_name" 
                type="text" 
                placeholder="請填寫英文姓名或公司名稱"
                class="form-input"
              />
            </div>
          </div>
        </div>
        
      </div>
      
      <!-- ========== 舉發理由書 ========== -->
      <div v-show="activeTab === 'grounds'" class="form-section">
        
        <div class="section-header">
          <h2>📝 專利舉發理由書</h2>
        </div>
        
        <div class="form-group full-width">
          <label class="required">壹、舉發主旨</label>
          <textarea 
            v-model="formData.grounds_statement.main_purpose" 
            rows="5"
            placeholder="例如：第○○○○○○○○號「○○○○○」專利案，申請日為○○年○○月○○日，優先權日為○○年○○月○○日，於○○年○○月○○日核准專利，其是否有應撤銷專利權之情事，自應以核准審定時所適用之○○年○○月○○日修正公布、○○年○○月○○日施行之專利法規定為斷。"
            class="form-textarea"
          ></textarea>
        </div>
        
        <div class="form-group full-width">
          <label class="required">貳、舉發聲明</label>
          <textarea 
            v-model="formData.grounds_statement.invalidation_statement" 
            rows="3"
            placeholder="例如：請求撤銷全部請求項（或請求撤銷第○至○項請求項）"
            class="form-textarea"
          ></textarea>
        </div>
        
        <div class="section-header">
          <h3>參、舉發證據</h3>
          <button @click="addEvidence" class="btn-add">➕ 新增證據</button>
        </div>
        
        <div 
          v-for="(evidence, index) in formData.grounds_statement.evidence_list" 
          :key="index"
          class="subsection"
        >
          <div class="subsection-header">
            <h4>證據 {{ evidence.evidence_number }}</h4>
            <button 
              v-if="formData.grounds_statement.evidence_list.length > 1"
              @click="removeEvidence(index)" 
              class="btn-remove"
            >
              🗑️ 移除
            </button>
          </div>
          
          <div class="form-grid">
            <div class="form-group full-width">
              <label class="required">證據說明</label>
              <input 
                v-model="evidence.description" 
                type="text" 
                placeholder="例如：系爭專利案公告本"
                class="form-input"
              />
            </div>
            
            <div class="form-group">
              <label>專利號/公開號</label>
              <input 
                v-model="evidence.patent_number" 
                type="text" 
                placeholder="例如：I123456"
                class="form-input"
              />
            </div>
            
            <div class="form-group">
              <label>公告/公開日期</label>
              <input 
                v-model="evidence.publication_date" 
                type="date" 
                class="form-input"
              />
            </div>
            
            <div class="form-group full-width">
              <label>專利名稱</label>
              <input 
                v-model="evidence.title" 
                type="text" 
                placeholder="請填寫專利名稱"
                class="form-input"
              />
            </div>
          </div>
        </div>
        
        <div class="section-header">
          <h3>肆、請求撤銷之請求項、主張法條及證據</h3>
          <button @click="addClaimChartRow" class="btn-add">➕ 新增項目</button>
        </div>
        
        <div class="table-container">
          <table class="claim-chart-table">
            <thead>
              <tr>
                <th style="width: 20%">請求撤銷之請求項</th>
                <th style="width: 30%">主張法條</th>
                <th style="width: 40%">證據</th>
                <th style="width: 10%">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, index) in formData.grounds_statement.claim_chart" :key="index">
                <td>
                  <input 
                    v-model="row.claim_number" 
                    type="text" 
                    placeholder="例如：1-3"
                    class="table-input"
                  />
                </td>
                <td>
                  <input 
                    v-model="row.legal_basis" 
                    type="text" 
                    placeholder="例如：專利法第22條第1項第2款"
                    class="table-input"
                  />
                </td>
                <td>
                  <input 
                    v-model="row.evidence_used" 
                    type="text" 
                    placeholder="例如：證據1、證據2"
                    class="table-input"
                  />
                </td>
                <td>
                  <button 
                    @click="removeClaimChartRow(index)" 
                    class="btn-remove-small"
                    title="移除"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div class="form-group full-width">
          <label class="required">伍、詳細理由</label>
          <textarea 
            v-model="formData.grounds_statement.detailed_reasons" 
            rows="15"
            placeholder="請詳細說明舉發理由，包括：&#10;1. 系爭專利請求項與各證據之技術內容比對&#10;2. 說明證據組合如何證明系爭專利不具進步性或新穎性&#10;3. 其他相關論述"
            class="form-textarea"
          ></textarea>
          <span class="field-hint">建議包含：技術內容比對、證據組合說明、法律論述等</span>
        </div>
        
        <div class="form-group full-width">
          <label>陸、其他申請</label>
          <textarea 
            v-model="formData.grounds_statement.other_requests" 
            rows="3"
            placeholder="如有其他申請事項，請在此說明"
            class="form-textarea"
          ></textarea>
        </div>
        
      </div>
      
      <!-- ========== 預覽 ========== -->
      <div v-show="activeTab === 'preview'" class="form-section">
        
        <div class="preview-container">
          <div class="preview-header">
            <h2>📄 專利舉發申請書預覽</h2>
            <p class="preview-note">以下為申請書預覽，實際格式以匯出的 Word 文件為準</p>
          </div>
          
          <div class="preview-document">
            
            <!-- 申請書標題 -->
            <div class="doc-title">
              <h1>專利舉發申請書</h1>
              <p class="doc-subtitle">（本申請書格式、順序，請勿任意更動，※記號部分請勿填寫）</p>
            </div>
            
            <!-- 基本資訊 -->
            <div class="doc-section">
              <p><strong>被舉發案案號：</strong>{{ formData.challenged_case_number }}</p>
              <p><strong>專利證書號數：</strong>{{ formData.patent_certificate_number }}</p>
            </div>
            
            <div class="doc-section">
              <h3>一、發明(新型或設計)名稱：</h3>
              <p>{{ formData.invention_name }}</p>
            </div>
            
            <!-- 舉發人 -->
            <div class="doc-section">
              <h3>二、舉發人：（共 {{ formData.petitioners.length }} 人）</h3>
              <div v-for="(petitioner, index) in formData.petitioners" :key="index" class="doc-subsection">
                <p>
                  <span v-if="petitioner.petitioner_type === 'anyone'">☑ 任何人</span>
                  <span v-else>☑ 利害關係人</span>
                </p>
                <p v-if="petitioner.is_natural_person">
                  <strong>姓名：</strong>{{ petitioner.family_name }}{{ petitioner.given_name }}
                  <span v-if="petitioner.english_name">（{{ petitioner.english_name }}）</span>
                </p>
                <p v-else>
                  <strong>名稱：</strong>{{ petitioner.company_name }}
                  <span v-if="petitioner.company_english_name">（{{ petitioner.company_english_name }}）</span>
                  <br>
                  <strong>代表人：</strong>{{ petitioner.representative_name }}
                  <span v-if="petitioner.representative_english_name">（{{ petitioner.representative_english_name }}）</span>
                </p>
                <p><strong>國籍：</strong>{{ petitioner.nationality }}</p>
                <p><strong>住居所或營業所地址：</strong>{{ petitioner.address }}</p>
                <p v-if="petitioner.english_address"><strong>Address：</strong>{{ petitioner.english_address }}</p>
                <p>
                  <strong>電話：</strong>{{ petitioner.phone }}
                  <span v-if="petitioner.fax"> / <strong>傳真：</strong>{{ petitioner.fax }}</span>
                  <span v-if="petitioner.mobile"> / <strong>手機：</strong>{{ petitioner.mobile }}</span>
                </p>
                <p v-if="petitioner.is_service_recipient" class="highlight">☑ 指定為應受送達人</p>
              </div>
            </div>
            
            <!-- 代理人 -->
            <div v-if="formData.agents.length > 0 && formData.agents[0].name" class="doc-section">
              <h3>◎代理人：</h3>
              <div v-for="(agent, index) in formData.agents" :key="index" class="doc-subsection">
                <p><strong>姓名：</strong>{{ agent.name }}</p>
                <p v-if="agent.certificate_number"><strong>證書字號：</strong>{{ agent.certificate_number }}</p>
                <p v-if="agent.address"><strong>地址：</strong>{{ agent.address }}</p>
                <p v-if="agent.phone">
                  <strong>聯絡電話：</strong>{{ agent.phone }}
                  <span v-if="agent.extension">分機 {{ agent.extension }}</span>
                </p>
              </div>
            </div>
            
            <!-- 被舉發人 -->
            <div class="doc-section">
              <h3>三、被舉發人：（共 {{ formData.patentees.length }} 人）</h3>
              <div v-for="(patentee, index) in formData.patentees" :key="index">
                <p>
                  <strong>姓名或名稱：</strong>{{ patentee.name }}
                  <span v-if="patentee.english_name">（{{ patentee.english_name }}）</span>
                </p>
              </div>
            </div>
            
            <!-- 舉發聲明 -->
            <div class="doc-section">
              <h3>四、舉發聲明：</h3>
              
              <div v-if="formData.invalidation_claims.claim_type === 'partial'">
                <p><strong>(一) 請求撤銷發明(新型)專利權</strong></p>
                <p>1、請求撤銷部分請求項（每件新臺幣 5,000 元，每一請求項再加繳新臺幣 800 元）</p>
                <p>請求撤銷部分請求項：第 {{ formData.invalidation_claims.partial_claims }} 項，共 {{ formData.invalidation_claims.partial_claims_count }} 項</p>
              </div>
              
              <div v-else-if="formData.invalidation_claims.claim_type === 'all'">
                <p><strong>(一) 請求撤銷發明(新型)專利權</strong></p>
                <p>1、請求撤銷全部請求項（每件新臺幣 5,000 元，每一請求項再加繳新臺幣 800 元）</p>
                <p>請求撤銷全部請求項：共 {{ formData.invalidation_claims.all_claims_count }} 項</p>
              </div>
              
              <div v-else-if="formData.invalidation_claims.claim_type === 'full_revocation'">
                <p><strong>2、以下列事由請求撤銷全部專利權</strong></p>
                <p v-if="formData.patent_type === 'utility'">（新型專利每件新臺幣 9,000 元）</p>
                <p v-else-if="formData.patent_type === 'invention'">（發明專利每件新臺幣 10,000 元）</p>
                <div class="doc-checklist">
                  <p v-if="formData.invalidation_claims.full_revocation_grounds.same_day_filing">
                    ☑ 同一人於同日就相同創作分別申請發明及新型專利，已於申請時分別聲明，而其發明及新型專利權同時並存。
                  </p>
                  <p v-if="formData.invalidation_claims.full_revocation_grounds.utility_expired">
                    ☑ 同一人就相同創作，於同日分別申請發明專利及新型專利，其發明專利審定前，新型專利權已當然消滅或撤銷確定。
                  </p>
                  <p v-if="formData.invalidation_claims.full_revocation_grounds.non_applicant">
                    ☑ 專利權人為非專利申請權人。
                  </p>
                  <p v-if="formData.invalidation_claims.full_revocation_grounds.not_all_co_owners">
                    ☑ 共有專利申請權非由全體共有人提出申請。
                  </p>
                  <p v-if="formData.invalidation_claims.full_revocation_grounds.reciprocity_issue">
                    ☑ 專利權人所屬國家對中華民國國民申請專利不予受理。
                  </p>
                </div>
              </div>
              
              <div v-else-if="formData.patent_type === 'design'">
                <p><strong>(二) 請求撤銷設計專利權</strong>（每件新臺幣 8,000 元）</p>
              </div>
              
              <div v-else-if="formData.invalidation_claims.claim_type === 'extension'">
                <p><strong>(三) 請求撤銷延長之專利權期間</strong></p>
                <p>自「{{ formData.invalidation_claims.extension_start_date }}」至「{{ formData.invalidation_claims.extension_end_date }}」（每件新臺幣 10,000 元）</p>
              </div>
            </div>
            
            <!-- 規費 -->
            <div class="doc-section">
              <h3>五、申請規費：</h3>
              <p class="fee-total">共計新臺幣 <strong>{{ formData.fees.total_fee.toLocaleString() }}</strong> 元整。</p>
            </div>
            
            <!-- 附送書件 -->
            <div class="doc-section">
              <h3>六、附送書件：</h3>
              <ol>
                <li>本專利舉發申請書一式 {{ formData.attachments.application_copies }} 份。</li>
                <li>舉發理由書及證據一式 {{ formData.attachments.grounds_and_evidence_copies }} 份。
                  【證據：共 {{ formData.attachments.evidence_count }} 件
                  （書證原本 {{ formData.attachments.original_documents }} 件；樣品 {{ formData.attachments.samples }} 件）】
                </li>
                <li v-if="formData.attachments.power_of_attorney">委任書 1 份。</li>
                <li v-if="formData.attachments.interested_party_proof">利害關係人證明文件 1 份。</li>
                <li v-if="formData.attachments.legal_interest_proof">可回復法律上利益之證明文件 1 份。</li>
                <li v-if="formData.attachments.other_documents">其他：{{ formData.attachments.other_documents }}</li>
              </ol>
            </div>
            
            <!-- 個人資料保護聲明 -->
            <div class="doc-section">
              <h3>七、個人資料保護注意事項：</h3>
              <p>
                <label class="checkbox-label preview-checkbox">
                  <input 
                    type="checkbox" 
                    v-model="formData.privacy_consent"
                    disabled
                  />
                  <span>
                    申請人已詳閱申請須知所定個人資料保護注意事項，並已確認本申請案之附件（除委任書外），
                    不包含應予保密之個人資料；其載有個人資料者，同意智慧財產局提供任何人以自動化或非自動化之方式閱覽、抄錄、攝影或影印。
                  </span>
                </label>
              </p>
            </div>
            
            <!-- 分隔線 -->
            <div class="doc-divider"></div>
            
            <!-- 舉發理由書 -->
            <div class="doc-title">
              <h1>專利舉發理由書</h1>
            </div>
            
            <div class="doc-section">
              <h3>壹、舉發主旨</h3>
              <div class="doc-content" v-html="formData.grounds_statement.main_purpose.replace(/\n/g, '<br>')"></div>
            </div>
            
            <div class="doc-section">
              <h3>貳、舉發聲明</h3>
              <div class="doc-content" v-html="formData.grounds_statement.invalidation_statement.replace(/\n/g, '<br>')"></div>
            </div>
            
            <div class="doc-section">
              <h3>參、舉發證據</h3>
              <div v-for="evidence in formData.grounds_statement.evidence_list" :key="evidence.evidence_number" class="doc-evidence">
                <p>
                  <strong>證據 {{ evidence.evidence_number }}</strong> 為{{ evidence.description }}
                  <span v-if="evidence.patent_number">（{{ evidence.patent_number }}）</span>
                  <span v-if="evidence.publication_date">，{{ evidence.publication_date }} 公告（公開）</span>
                  <span v-if="evidence.title">之「{{ evidence.title }}」專利案</span>
                </p>
              </div>
            </div>
            
            <div class="doc-section">
              <h3>肆、請求撤銷之請求項、主張法條及證據</h3>
              <table class="preview-table">
                <thead>
                  <tr>
                    <th style="width: 20%">請求撤銷之請求項</th>
                    <th style="width: 40%">主張法條</th>
                    <th style="width: 40%">證據</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, index) in formData.grounds_statement.claim_chart" :key="index">
                    <td>{{ row.claim_number }}</td>
                    <td>{{ row.legal_basis }}</td>
                    <td>{{ row.evidence_used }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div class="doc-section">
              <h3>伍、詳細理由</h3>
              <div class="doc-content" v-html="formData.grounds_statement.detailed_reasons.replace(/\n/g, '<br>')"></div>
            </div>
            
            <div v-if="formData.grounds_statement.other_requests" class="doc-section">
              <h3>陸、其他申請</h3>
              <div class="doc-content" v-html="formData.grounds_statement.other_requests.replace(/\n/g, '<br>')"></div>
            </div>
            
          </div>
        </div>
        
      </div>
      
    </div>
    
    <!-- 底部操作按鈕 -->
    <div class="form-footer">
      <button @click="goBack" class="btn-secondary">
        ← 返回列表
      </button>
      <div class="footer-actions">
        <button @click="saveDraft" :disabled="isSaving" class="btn-secondary">
          💾 {{ isSaving ? '儲存中...' : '儲存草稿' }}
        </button>
        <button @click="exportDocument" class="btn-secondary">
          📄 匯出 Word
        </button>
        <button @click="submitJob" :disabled="isSaving" class="btn-primary">
          ✅ {{ isSaving ? '提交中...' : '完成申請書' }}
        </button>
      </div>
    </div>
    
  </div>
</template>

<style scoped>
.invalidation-prep-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
  min-height: 100vh;
  background: #f5f5f5;
}

/* ========== 頁面標題 ========== */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 24px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  flex-wrap: wrap;
  gap: 16px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
}

.btn-back {
  padding: 8px 16px;
  background: #f3f4f6;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-back:hover {
  background: #e5e7eb;
}

.header-content h1 {
  font-size: 28px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 4px 0;
}

.subtitle {
  font-size: 14px;
  color: #666;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

/* ========== 提示訊息 ========== */
.info-banner {
  display: flex;
  gap: 16px;
  padding: 16px 20px;
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  border: 2px solid #3b82f6;
  border-radius: 12px;
  margin-bottom: 24px;
}

.info-banner.success {
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
  border-color: #10b981;
}

.banner-icon {
  font-size: 24px;
}

.banner-content h4 {
  margin: 0 0 4px 0;
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
}

.banner-content p {
  margin: 0;
  font-size: 13px;
  color: #666;
  line-height: 1.5;
}

.required {
  color: #dc2626;
  font-weight: 700;
}

/* ========== 分頁導航 ========== */
.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  background: white;
  padding: 8px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow-x: auto;
}

.tab-button {
  flex: 1;
  min-width: 150px;
  padding: 12px 20px;
  background: transparent;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.3s;
  white-space: nowrap;
}

.tab-button:hover {
  background: #f3f4f6;
  color: #1a1a1a;
}

.tab-button.active {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
}

/* ========== Loading ========== */
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

/* ========== 表單容器 ========== */
.form-container {
  background: white;
  border-radius: 12px;
  padding: 32px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  margin-bottom: 24px;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 16px;
  border-bottom: 2px solid #f3f4f6;
  margin-bottom: 16px;
}

.section-header h2 {
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
}

.section-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
}

.btn-add {
  padding: 8px 16px;
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-add:hover {
  background: linear-gradient(135deg, #059669, #047857);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

/* ========== 子區塊 ========== */
.subsection {
  padding: 20px;
  background: #f9fafb;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  margin-bottom: 16px;
}

.subsection-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e5e7eb;
}

.subsection-header h3,
.subsection-header h4 {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
}

.btn-remove {
  padding: 6px 12px;
  background: #fee2e2;
  color: #dc2626;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-remove:hover {
  background: #fecaca;
  transform: scale(1.05);
}

/* ========== 表單元素 ========== */
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group.full-width {
  grid-column: 1 / -1;
}

.form-group label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.form-input,
.form-select,
.form-textarea {
  padding: 10px 14px;
  border: 2px solid #e5e7eb;
  border-radius: 6px;
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

.form-textarea {
  resize: vertical;
  min-height: 100px;
}

.field-hint {
  font-size: 12px;
  color: #6b7280;
  font-style: italic;
}

/* ========== 單選框和複選框 ========== */
.radio-group,
.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.radio-label,
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  color: #374151;
}

.radio-label input[type="radio"],
.checkbox-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.radio-label:hover,
.checkbox-label:hover {
  color: #1a1a1a;
}

/* ========== 規費摘要 ========== */
.fee-summary {
  padding: 20px;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border: 2px solid #f59e0b;
  border-radius: 8px;
}

.fee-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 14px;
  color: #374151;
}

.fee-total {
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
  margin-top: 12px;
  border-top: 2px solid #f59e0b;
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
}

.fee-label {
  font-weight: 500;
}

.fee-value {
  font-weight: 600;
  color: #92400e;
}

/* ========== 表格 ========== */
.table-container {
  overflow-x: auto;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
}

.claim-chart-table {
  width: 100%;
  border-collapse: collapse;
}

.claim-chart-table thead {
  background: #f3f4f6;
}

.claim-chart-table th {
  padding: 12px;
  text-align: left;
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
  border-bottom: 2px solid #e5e7eb;
}

.claim-chart-table td {
  padding: 12px;
  border-bottom: 1px solid #e5e7eb;
}

.table-input {
  width: 100%;
  padding: 8px;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  font-size: 13px;
}

.table-input:focus {
  outline: none;
  border-color: #3b82f6;
}

.btn-remove-small {
  padding: 4px 8px;
  background: #fee2e2;
  color: #dc2626;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-remove-small:hover {
  background: #fecaca;
}

/* ========== 預覽 ========== */
.preview-container {
  max-width: 900px;
  margin: 0 auto;
}

.preview-header {
  text-align: center;
  margin-bottom: 32px;
}

.preview-header h2 {
  font-size: 24px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 8px 0;
}

.preview-note {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

.preview-document {
  padding: 40px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.doc-title {
  text-align: center;
  margin-bottom: 32px;
  padding-bottom: 16px;
  border-bottom: 2px solid #1a1a1a;
}

.doc-title h1 {
  font-size: 28px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 8px 0;
}

.doc-subtitle {
  font-size: 12px;
  color: #6b7280;
  margin: 0;
}

.doc-section {
  margin-bottom: 24px;
}

.doc-section h3 {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 12px 0;
}

.doc-section p {
  font-size: 14px;
  color: #374151;
  line-height: 1.8;
  margin: 8px 0;
}

.doc-subsection {
  margin-left: 20px;
  margin-bottom: 16px;
  padding-left: 16px;
  border-left: 3px solid #e5e7eb;
}

.doc-content {
  font-size: 14px;
  color: #374151;
  line-height: 1.8;
  white-space: pre-wrap;
}

.doc-evidence {
  margin-bottom: 12px;
  padding: 12px;
  background: #f9fafb;
  border-left: 3px solid #3b82f6;
  border-radius: 4px;
}

.doc-checklist p {
  margin: 8px 0;
  padding-left: 20px;
}

.highlight {
  background: #fef3c7;
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: 600;
}

.preview-table {
  width: 100%;
  border-collapse: collapse;
  margin: 16px 0;
}

.preview-table th,
.preview-table td {
  padding: 12px;
  border: 1px solid #e5e7eb;
  text-align: left;
  font-size: 13px;
}

.preview-table th {
  background: #f3f4f6;
  font-weight: 600;
}

.preview-checkbox {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.preview-checkbox input[type="checkbox"] {
  margin-top: 4px;
}

.doc-divider {
  height: 2px;
  background: #e5e7eb;
  margin: 40px 0;
}

/* ========== 底部操作 ========== */
.form-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 32px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  position: sticky;
  bottom: 24px;
}

.footer-actions {
  display: flex;
  gap: 12px;
}

/* ========== 按鈕樣式 ========== */
.btn-primary {
  padding: 12px 24px;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  padding: 12px 24px;
  background: #f3f4f6;
  color: #1a1a1a;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-secondary:hover:not(:disabled) {
  background: #e5e7eb;
  transform: translateY(-2px);
}

.btn-secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ========== 響應式設計 ========== */
@media (max-width: 768px) {
  .invalidation-prep-page {
    padding: 16px;
  }
  
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    padding: 16px;
  }
  
  .header-left {
    flex-direction: column;
    align-items: flex-start;
    width: 100%;
  }
  
  .header-actions {
    width: 100%;
  }
  
  .header-actions button {
    flex: 1;
  }
  
  .tabs {
    flex-wrap: nowrap;
    overflow-x: auto;
  }
  
  .tab-button {
    min-width: 120px;
  }
  
  .form-container {
    padding: 20px;
  }
  
  .form-grid {
    grid-template-columns: 1fr;
  }
  
  .form-group.full-width {
    grid-column: 1;
  }
  
  .preview-document {
    padding: 20px;
  }
  
  .form-footer {
    flex-direction: column;
    gap: 12px;
    position: static;
  }
  
  .footer-actions {
    width: 100%;
    flex-direction: column;
  }
  
  .footer-actions button {
    width: 100%;
  }
}
</style>



