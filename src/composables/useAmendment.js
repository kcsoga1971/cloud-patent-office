// src/composables/useAmendment.js

export function useAmendment() {
  
  const createAmendmentJob = async (userId, amendmentData) => {
    try {
      const { data, error } = await supabase
        .from('saas_jobs')
        .insert({
          user_id: userId,
          job_type: 'patent_amendment', // 🎯 關鍵：設定 job_type
          status: 'pending',
          input_data: amendmentData, // 🎯 直接存 JSON
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()
      
      if (error) throw error
      
      return { success: true, data }
      
    } catch (err) {
      console.error('❌ 建立修正案件失敗:', err)
      return { success: false, error: err.message }
    }
  }
  
  return {
    createAmendmentJob
  }
}
