<!-- src/views/knowledge/KnowledgeDetail.vue -->
<template>
  <div class="article-page">
    <button @click="router.back()" class="btn-back">← 返回知識庫</button>
    
    <div v-if="isLoading" class="loading-state">
      <div class="spinner"></div>
      <p>文章載入中...</p>
    </div>

    <div v-else-if="article" class="article-container">
      <div class="article-header">
        <div class="badges">
          <span class="category-tag">{{ article.level }}</span>
          <span v-if="article.is_ai_generated" class="ai-tag">🤖 AI 生成</span>
        </div>
        <h1>{{ article.title }}</h1>
        <div class="meta">
          <span>📅 更新於：{{ formatDate(article.created_at) }}</span>
          <span v-if="article.verified">✅ 專家已審核</span>
        </div>
      </div>
      
      <div class="markdown-body" v-html="renderedContent"></div>
      
      <div class="article-footer">
        <p>覺得這篇文章有幫助嗎？快去試試看我們的工具吧！</p>
        <button @click="router.push('/services/drafting-workflow')" class="btn-cta">🚀 立即體驗專利工具</button>
      </div>
    </div>
    
    <div v-else class="not-found">
      <p>❌ 找不到該文章，可能已被移除。</p>
      <button @click="router.push('/knowledge')">回首頁</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../../supabase'
import { marked } from 'marked' // 已安裝
import { formatDate } from '../../utils/formatters' // 剛剛建立的

const route = useRoute()
const router = useRouter()
const article = ref(null)
const isLoading = ref(true)

const fetchArticle = async () => {
  const id = route.params.id
  if (!id) return

  isLoading.value = true
  try {
    const { data, error } = await supabase
      .from('knowledge_articles')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    article.value = data
  } catch (err) {
    console.error('文章載入失敗:', err)
  } finally {
    isLoading.value = false
  }
}

// 將 Markdown 轉為 HTML
const renderedContent = computed(() => {
  return article.value ? marked(article.value.content || '') : ''
})

onMounted(() => {
  fetchArticle()
})
</script>

<style scoped>
.article-page { max-width: 900px; margin: 0 auto; padding: 2rem; color: #2c3e50; }
.btn-back { background: none; border: none; color: #666; cursor: pointer; margin-bottom: 20px; font-size: 0.9rem; transition: color 0.2s; }
.btn-back:hover { color: #2196F3; }

.loading-state, .not-found { text-align: center; padding: 60px 0; color: #666; }
.spinner { border: 3px solid #f3f3f3; border-top: 3px solid #3498db; border-radius: 50%; width: 30px; height: 30px; animation: spin 1s linear infinite; margin: 0 auto 15px; }

.article-header { text-align: center; margin-bottom: 40px; padding-bottom: 30px; border-bottom: 1px solid #eee; }
.badges { display: flex; gap: 10px; justify-content: center; margin-bottom: 15px; }
.category-tag { background: #e3f2fd; color: #1565c0; padding: 4px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: bold; text-transform: uppercase; }
.ai-tag { background: #fce4ec; color: #c2185b; padding: 4px 12px; border-radius: 20px; font-size: 0.85rem; }

.article-header h1 { font-size: 2.2rem; margin: 10px 0; line-height: 1.4; color: #1e293b; }
.meta { color: #888; font-size: 0.9rem; display: flex; gap: 20px; justify-content: center; margin-top: 10px; }

/* Markdown 樣式優化 */
.markdown-body { font-size: 1.1rem; line-height: 1.8; color: #333; text-align: left; }
.markdown-body :deep(h2) { margin-top: 40px; margin-bottom: 20px; color: #1565c0; font-size: 1.6rem; border-left: 4px solid #1565c0; padding-left: 15px; }
.markdown-body :deep(h3) { margin-top: 30px; margin-bottom: 15px; color: #424242; font-size: 1.3rem; font-weight: bold; }
.markdown-body :deep(ul), .markdown-body :deep(ol) { margin-bottom: 20px; padding-left: 20px; }
.markdown-body :deep(li) { margin-bottom: 8px; }
.markdown-body :deep(p) { margin-bottom: 20px; }
.markdown-body :deep(strong) { color: #d32f2f; }
.markdown-body :deep(blockquote) { border-left: 4px solid #ddd; padding-left: 15px; color: #666; font-style: italic; margin: 20px 0; }

.article-footer { margin-top: 60px; padding: 40px; background: #f8f9fa; border-radius: 12px; text-align: center; }
.btn-cta { background: linear-gradient(135deg, #2196F3, #1976D2); color: white; border: none; padding: 12px 30px; border-radius: 30px; font-size: 1.1rem; margin-top: 15px; cursor: pointer; transition: transform 0.2s; }
.btn-cta:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(33, 150, 243, 0.3); }

@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
</style>