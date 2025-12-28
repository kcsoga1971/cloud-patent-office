// 檔案路徑: src/stores/user.js
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../supabase'

export const useUserStore = defineStore('user', () => {
  const user = ref(null)       // 存放 Supabase Auth 使用者資訊 (uid, email)
  const profile = ref(null)    // 存放我們的 profiles 表格資訊 (點數餘額)
  const isLoading = ref(true)  // 是否正在檢查登入狀態

  // 內部 helper: 根據 ID 抓取點數資料 (避免重複寫程式碼)
  const _fetchProfile = async (userId) => {
    console.log('🔍 開始抓取 profile，userId:', userId)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
    
      console.log('📊 Profile 查詢結果:', { data, error })
    
      if (error) {
        console.error('❌ Profile 查詢錯誤:', error)
        return
      }
    
      if (data) {
        profile.value = data
        console.log('✅ Profile 設定成功:', data)
      } else {
        console.warn('⚠️ 找不到 profile 資料')
      }
    } catch (error) {
      console.error('❌ Fetch profile 例外:', error)
    }
  }

  // 1. 抓取當前用戶 (初始化用)
  const fetchUser = async () => {
    isLoading.value = true
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()

      if (authUser) {
        user.value = authUser
        await _fetchProfile(authUser.id) // 呼叫 helper 抓點數
      } else {
        user.value = null
        profile.value = null
      }
    } catch (error) {
      console.error('Auth error:', error)
    } finally {
      isLoading.value = false
    }
  }

  // 2. 設定用戶 (這是 Login.vue 需要呼叫的函式！)
  // 我們加上 async，這樣登入時可以順便等待點數抓完
  const setUser = async (userData) => {
    user.value = userData
    
    if (userData) {
      // 如果是用戶登入，順便抓取點數
      await _fetchProfile(userData.id)
    } else {
      // 如果是清空用戶
      profile.value = null
    }
  }

  // 3. 登出
  const signOut = async () => {
    await supabase.auth.signOut()
    user.value = null
    profile.value = null
  }

  // 記得要把 setUser 匯出 (return) 讓外部使用
  return { 
    user, 
    profile, 
    isLoading, 
    fetchUser, 
    setUser, // <--- 關鍵：補上這個
    signOut 
  }
})