// src/composables/useSubmission.js

import { ref } from 'vue'
import { supabase } from '../supabase'
import { usePatentDocx } from './usePatentDocx'

export function useSubmission() {
  const isLoading = ref(false)
  const submissionData = ref(null)
  const error = ref(null)
  const showPageCountsEditor = ref(false) // 🆕 控制是否顯示頁數編輯器
  
  const { generateApplicationForm } = usePatentDocx()

  /**
   * 🆕 生成送件資料（前端直接處理，不再呼叫 n8n）
   */
  const generateSubmissionData = async (jobId, userId) => {
    isLoading.value = true
    error.value = null

    try {
      // 1. 載入案件資料
      const { data: jobData, error: jobError } = await supabase
        .from('saas_jobs')
        .select('*')
        .eq('id', jobId)
        .single()
      
      if (jobError) throw jobError

      // 2. 載入申請人資料
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (profileError) throw profileError

      // 3. 載入發明人資料
      const { data: inventors, error: inventorsError } = await supabase
        .from('inventors')
        .select('*')
        .eq('id', userId)
        .order('created_at', { ascending: true })
      
      if (inventorsError) throw inventorsError

      // 4. ✅ 檢查是否已完成頁數設定
      if (!jobData.page_counts_completed) {
        // 需要使用者填寫圖式資訊
        showPageCountsEditor.value = true
        submissionData.value = {
          job: jobData,
          profile,
          inventors,
          needsPageCounts: true
        }
        return submissionData.value
      }

      // 5. 準備申請書資料
      const applicationInfo = {
        invention_name_zh: jobData.input_data?.title || '未命名專利',
        invention_name_en: jobData.input_data?.title_en || '',
        abstract_pages: jobData.abstract_pages,
        specification_pages: jobData.specification_pages,
        claims_pages: jobData.claims_pages,
        figures_pages: jobData.figures_pages,
        total_pages: jobData.total_pages,
        claim_count: jobData.claim_count,
        figure_count: jobData.figure_count,
        application_fee: calculateFee(jobData)
      }

      // 6. 準備送件指南
      const submissionGuide = generateSubmissionGuide(applicationInfo)

      submissionData.value = {
        job: jobData,
        profile,
        inventors,
        application_info: applicationInfo,
        submission_guide: submissionGuide,
        application_form_filename: `專利申請書_${applicationInfo.invention_name_zh}_${Date.now()}.docx`,
        needsPageCounts: false
      }
      
      return submissionData.value

    } catch (err) {
      console.error('❌ 生成送件資料失敗:', err)
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 🆕 計算規費
   */
  const calculateFee = (jobData) => {
    const baseFee = 3500
    const extraClaimsFee = Math.max(0, (jobData.claim_count || 0) - 10) * 800
    const extraPagesFee = Math.max(0, (jobData.total_pages || 0) - 20) * 500
    
    return baseFee + extraClaimsFee + extraPagesFee
  }

  /**
   * 🆕 生成送件指南
   */
  const generateSubmissionGuide = (applicationInfo) => {
    return {
      title: '📮 紙本送件流程指南',
      steps: [
        {
          step: 1,
          title: '準備申請文件',
          description: '確認所有文件已備妥並符合規範',
          checklist: [
            { item: '專利申請書 1 份', status: 'auto_generated', required: true },
            { item: '摘要 1 份', status: 'auto_generated', required: true },
            { item: '說明書 1 份', status: 'auto_generated', required: true },
            { item: '申請專利範圍 1 份', status: 'auto_generated', required: true },
            { item: '圖式 1 份', status: 'need_prepare', required: true },
            { item: '委任書（如委任代理人）', status: 'optional', required: false }
          ],
          requirements: [
            'A4 白色紙張，單面列印',
            '左側及上方各留 2 公分空白',
            '文字使用標楷體或新細明體，12 號字',
            '圖式需清晰可辨，符號與說明書一致'
          ]
        },
        {
          step: 2,
          title: '繳納規費',
          description: '申請前需先繳納申請費及實體審查費',
          fee_breakdown: {
            base_fee: 3500,
            exam_fee: 7000,
            extra_claims: Math.max(0, (applicationInfo.claim_count - 10) * 800),
            total: applicationInfo.application_fee + 7000
          },
          payment_methods: [
            {
              method: '臨櫃繳費',
              description: '至智慧財產局櫃台繳費',
              address: '台北市辛亥路 2 段 185 號 3 樓',
              hours: '週一至週五 08:30-17:30'
            },
            {
              method: '郵政劃撥',
              description: '使用郵政劃撥繳費',
              account: '19826641',
              account_name: '經濟部智慧財產局專戶',
              notes: [
                '劃撥單備註欄請註明「發明專利申請費」',
                '保留劃撥收據正本，併同申請書送件'
              ]
            },
            {
              method: '銀行匯款',
              description: '透過銀行匯款',
              bank: '土地銀行城中分行',
              account: '005-005-50002-7',
              account_name: '經濟部智慧財產局專戶',
              notes: [
                '匯款後請保留匯款單據',
                '併同申請書一起送件'
              ]
            }
          ]
        },
        {
          step: 3,
          title: '郵寄或親送',
          description: '將文件送至智慧財產局',
          actions: [
            {
              action: '掛號郵寄',
              timing: '建議使用',
              description: '以掛號方式郵寄，保留郵寄證明',
              notes: [
                '申請日以郵戳日期為準',
                '建議使用雙掛號確保安全',
                '保留郵局收據作為證明'
              ]
            },
            {
              action: '親自送件',
              timing: '可選擇',
              description: '親自至智慧財產局送件',
              notes: [
                '申請日以收件日期為準',
                '可當場確認文件是否齊全',
                '取得收件證明'
              ]
            }
          ],
          mailing_info: {
            recipient: '經濟部智慧財產局 專利一組',
            address: '台北市辛亥路 2 段 185 號 3 樓',
            envelope_notes: [
              '信封正面註明「發明專利申請」',
              '註明申請人姓名及聯絡電話',
              '使用 A4 大小信封'
            ]
          }
        },
        {
          step: 4,
          title: '後續追蹤',
          description: '送件後注意事項',
          actions: [
            {
              action: '查詢申請案進度',
              timing: '送件後 2-3 週',
              description: '可透過智慧財產局網站查詢',
              url: 'https://twpat.tipo.gov.tw',
              notes: [
                '系統會給予申請案號',
                '可使用申請案號查詢進度'
              ]
            },
            {
              action: '注意補正通知',
              timing: '隨時',
              description: '若文件有缺漏，智慧局會發補正通知',
              notes: [
                '收到補正通知後，需在期限內補正',
                '逾期未補正可能導致不受理'
              ]
            }
          ],
          contact: {
            phone: '(02) 2376-7170',
            email: 'patent@tipo.gov.tw',
            hours: '週一至週五 08:30-12:30, 13:30-17:30'
          }
        }
      ],
      tips: [
        '建議在送件前先影印一份完整文件留存',
        '圖式建議使用專業繪圖軟體製作，確保清晰度',
        '如有疑問可先致電智慧財產局諮詢',
        '委任專利代理人可提高申請品質'
      ],
      warnings: [
        '申請日以郵戳或收件日為準，請注意時效',
        '規費繳納後無法退費，請確認後再送件',
        '文件格式不符可能導致補正或不受理'
      ]
    }
  }

  /**
   * 生成並下載申請書 Word 檔
   */
  const downloadApplicationForm = async (profile, inventors, applicationInfo) => {
    try {
      const result = await generateApplicationForm({
        profile,
        inventors,
        applicationInfo,
        mode: 'download' // 只下載，不上傳
      })
      
      return result
    } catch (err) {
      console.error('❌ 生成申請書失敗:', err)
      throw err
    }
  }

  /**
   * 檢查個人資料完整度
   */
  const checkProfileCompleteness = (profile, inventors) => {
    const required = {
      applicant: [
        { field: 'full_name', label: '姓名（中文）', filled: !!profile.full_name },
        { field: 'full_name_en', label: '姓名（英文）', filled: !!profile.full_name_en },
        { field: 'id_number', label: '身分證字號', filled: !!profile.id_number },
        { field: 'address', label: '地址（中文）', filled: !!profile.address },
        { field: 'address_en', label: '地址（英文）', filled: !!profile.address_en },
        { field: 'phone', label: '聯絡電話', filled: !!profile.phone },
      ],
      inventors: inventors && inventors.length > 0,
    }

    if (profile.is_company) {
      required.applicant = [
        { field: 'company_name', label: '公司名稱（中文）', filled: !!profile.company_name },
        { field: 'company_name_en', label: '公司名稱（英文）', filled: !!profile.company_name_en },
        { field: 'id_number', label: '統一編號', filled: !!profile.id_number },
        { field: 'representative_name', label: '代表人姓名（中文）', filled: !!profile.representative_name },
        { field: 'representative_name_en', label: '代表人姓名（英文）', filled: !!profile.representative_name_en },
        { field: 'address', label: '地址（中文）', filled: !!profile.address },
        { field: 'address_en', label: '地址（英文）', filled: !!profile.address_en },
        { field: 'phone', label: '聯絡電話', filled: !!profile.phone },
      ]
    }

    const missingApplicant = required.applicant.filter(item => !item.filled)
    
    return {
      applicant: {
        total: required.applicant.length,
        filled: required.applicant.length - missingApplicant.length,
        missing: missingApplicant,
        percentage: Math.round(
          ((required.applicant.length - missingApplicant.length) / required.applicant.length) * 100
        ),
      },
      inventors: {
        hasInventors: required.inventors,
        count: inventors ? inventors.length : 0,
      },
      overall: {
        ready: missingApplicant.length === 0 && required.inventors,
      },
    }
  }

  return {
    isLoading,
    submissionData,
    error,
    showPageCountsEditor, // 🆕
    generateSubmissionData,
    downloadApplicationForm,
    checkProfileCompleteness,
  }
}
