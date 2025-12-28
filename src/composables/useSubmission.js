// src/composables/useSubmission.js

import { ref } from 'vue'
import { usePatentDocx } from './usePatentDocx' // 🆕 引入

const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_SUBMISSION_WEBHOOK_URL

export function useSubmission() {
  const isLoading = ref(false)
  const submissionData = ref(null)
  const error = ref(null)
  
  const { generateApplicationForm } = usePatentDocx() // 🆕 使用

  /**
   * 生成送件資料
   */
  const generateSubmissionData = async (jobId, userId) => {
    isLoading.value = true
    error.value = null

    try {
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          job_id: jobId,
          user_id: userId,
        }),
      })

      if (!response.ok) {
        throw new Error('生成送件資料失敗')
      }

      const data = await response.json()
      submissionData.value = data
      
      return data
    } catch (err) {
      console.error('❌ 生成送件資料失敗:', err)
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 🆕 生成並下載申請書 Word 檔
   */
  const downloadApplicationForm = async (profile, inventors, applicationInfo) => {
    try {
      const result = await generateApplicationForm({
        profile,
        inventors,
        applicationInfo,
        mode: 'download' // 只下載,不上傳
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
    generateSubmissionData,
    downloadApplicationForm, // 🆕 新增
    checkProfileCompleteness,
  }
}
