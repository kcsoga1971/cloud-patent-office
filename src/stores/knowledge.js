// src/stores/knowledge.js
import { defineStore } from 'pinia'
import { supabase } from '../supabase'
import { useUserStore } from './user'

export const useKnowledgeStore = defineStore('knowledge', {
  state: () => ({
    articles: [],
    searchResults: [],
    currentLevel: 'novice',
    xp: 0,
    loading: false
  }),

  getters: {
    // 計算下一級所需 XP
    nextLevelXp: (state) => {
      if (state.currentLevel === 'novice') return 200
      if (state.currentLevel === 'intermediate') return 500
      if (state.currentLevel === 'expert') return 1000
      return 99999 // Master
    },
    // 計算進度條百分比
    xpProgress: (state) => {
      const target = state.nextLevelXp
      return Math.min((state.xp / target) * 100, 100)
    }
  },

  actions: {
    // 1. 初始化：讀取使用者等級與經驗值
    async fetchUserStats() {
      const userStore = useUserStore()
      if (!userStore.user) return

      const { data, error } = await supabase
        .from('profiles')
        .select('patent_level, patent_xp')
        .eq('id', userStore.user.id)
        .single()

      if (data) {
        this.currentLevel = data.patent_level || 'novice'
        this.xp = data.patent_xp || 0
      }
    },

    // 2. 搜尋文章 (本地 + 遠端)
    async searchArticles(query) {
      this.loading = true
      let queryBuilder = supabase
        .from('knowledge_articles')
        .select('*')
        .eq('status', 'published') // 只找已發布的
        .order('created_at', { ascending: false })

      if (query) {
        // 使用 Supabase 的全文檢索
        queryBuilder = queryBuilder.textSearch('title', query)
      }

      const { data, error } = await queryBuilder
      
      if (error) console.error(error)
      this.searchResults = data || []
      this.loading = false
      return this.searchResults
    },

    // 3. 觸發 AI 知識生成 (呼叫 n8n)
    async triggerAiGeneration(query) {
      const userStore = useUserStore()
      try {
        // 呼叫 n8n Webhook (Knowledge Factory)
        const response = await fetch(import.meta.env.VITE_N8N_WEBHOOK_GEN_KNOWLEDGE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            query: query, 
            user_id: userStore.user?.id 
          })
        })
        return await response.json()
      } catch (e) {
        console.error('AI Generation Failed:', e)
        throw e
      }
    },

    // 4. 提交評測答案 (呼叫 n8n)
    async submitAssessment(question, answer) {
      const userStore = useUserStore()
      try {
        // 呼叫 n8n Webhook (Assessment Engine)
        const response = await fetch(import.meta.env.VITE_N8N_WEBHOOK_GRADE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userStore.user?.id,
            current_level: this.currentLevel,
            question: question,
            answer: answer
          })
        })
        const result = await response.json()
        
        // 如果通過，重新拉取最新 XP
        if (result.passed) {
          await this.fetchUserStats()
        }
        return result
      } catch (e) {
        console.error('Grading Failed:', e)
        throw e
      }
    }
  }
})