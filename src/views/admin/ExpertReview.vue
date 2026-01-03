<!-- src/views/admin/ExpertReview.vue -->
<template>
  <div class="admin-page">
    <div class="header">
      <h1>👨‍⚖️ 專利知識審核中心 (Expert Review)</h1>
      <div class="stats">
        <span class="badge pending">待審核: {{ pendingCount }}</span>
        <span class="badge published">已發布: {{ publishedCount }}</span>
      </div>
    </div>

    <div class="layout">
      <div class="list-panel">
        <h3>待審核佇列</h3>
        <div v-if="isLoading" class="loading">載入中...</div>
        <div v-else-if="pendingArticles.length === 0" class="empty">目前沒有待審核文章 🎉</div>
        
        <div 
          v-for="article in pendingArticles" 
          :key="article.id" 
          class="list-item"
          :class="{ active: currentArticle?.id === article.id }"
          @click="selectArticle(article)"
        >
          <div class="item-title">{{ article.title }}</div>
          <div class="item-meta">
            <span class="tag ai">🤖 AI 生成</span>
            <span class="date">{{ formatDate(article.created_at) }}</span>
          </div>
        </div>
      </div>

      <div class="editor-panel" v-if="currentArticle">
        <div class="editor-header">
          <input v-model="editForm.title" class="title-input" placeholder="文章標題" />
          <div class="actions">
            <button @click="handleReject" class="btn-reject">❌ 駁回</button>
            <button @click="handlePublish" class="btn-publish">✅ 核准並發布</button>
          </div>
        </div>

        <div class="editor-body">
          <label>文章內容 (Markdown 編輯)</label>
          <textarea v-model="editForm.content" class="content-editor"></textarea>
        </div>

        <div class="preview-area">
          <label>預覽效果</label>
          <div class="markdown-preview" v-html="renderedContent"></div>
        </div>
        
        <div class="meta-inputs">
          <div class="form-group">
            <label>適用等級</label>
            <select v-model="editForm.level">
              <option value="novice">新手 (Novice)</option>
              <option value="intermediate">進階 (Intermediate)</option>
              <option value="expert">專家 (Expert)</option>
            </select>
          </div>
          <div class="form-group">
            <label>專家點評/審核註記 (內部用)</label>
            <input v-model="editForm.reviewer_comment" type="text" placeholder="例如：修正了關於新穎性的錯誤描述..." />
          </div>
        </div>
      </div>

      <div class="empty-selection" v-else>
        <p>請從左側選擇一篇文章進行審核</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../../supabase'
import { useUserStore } from '../../stores/user'
import { marked } from 'marked'
import { formatDate } from '../../utils/formatters'

const userStore = useUserStore()
const articles = ref([])
const currentArticle = ref(null)
const isLoading = ref(true)

// 編輯表單
const editForm = ref({
  title: '',
  content: '',
  level: 'novice',
  reviewer_comment: ''
})

// 載入文章
const loadArticles = async () => {
  isLoading.value = true
  const { data, error } = await supabase
    .from('knowledge_articles')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (data) articles.value = data
  isLoading.value = false
}

const pendingArticles = computed(() => articles.value.filter(a => a.status === 'pending_review'))
const pendingCount = computed(() => pendingArticles.value.length)
const publishedCount = computed(() => articles.value.filter(a => a.status === 'published').length)

const renderedContent = computed(() => marked(editForm.value.content || ''))

const selectArticle = (article) => {
  currentArticle.value = article
  // 複製資料到編輯表單，以免直接修改原始資料
  editForm.value = {
    title: article.title,
    content: article.content,
    level: article.level || 'novice',
    reviewer_comment: ''
  }
}

// 核准發布
const handlePublish = async () => {
  if (!confirm('確定內容正確並發布此文章？')) return

  const { error } = await supabase
    .from('knowledge_articles')
    .update({
      title: editForm.value.title,
      content: editForm.value.content,
      level: editForm.value.level,
      reviewer_comment: editForm.value.reviewer_comment,
      status: 'published',
      verified: true,
      reviewer_id: userStore.user.id
    })
    .eq('id', currentArticle.value.id)

  if (!error) {
    alert('✅ 文章已發布！使用者現在可以看到這篇文章了。')
    currentArticle.value = null
    loadArticles() // 重新整理
  } else {
    alert('錯誤: ' + error.message)
  }
}

// 駁回 (刪除或標記為 rejected)
const handleReject = async () => {
  if (!confirm('確定要駁回此文章嗎？(這將標記為 Rejected)')) return

  const { error } = await supabase
    .from('knowledge_articles')
    .update({ status: 'rejected' })
    .eq('id', currentArticle.value.id)

  if (!error) {
    currentArticle.value = null
    loadArticles()
  }
}

onMounted(() => {
  // 簡單的權限檢查
  if (userStore.profile?.role !== 'expert') {
    alert('權限不足：僅限專家存取')
    // router.push('/') // 實際專案應導回首頁
  }
  loadArticles()
})
</script>

<style scoped>
.admin-page { max-width: 1400px; margin: 0 auto; padding: 20px; height: 100vh; display: flex; flex-direction: column; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 10px; }
.badge { padding: 5px 12px; border-radius: 20px; font-size: 0.9rem; font-weight: bold; margin-left: 10px; }
.badge.pending { background: #fff3e0; color: #f57c00; }
.badge.published { background: #e8f5e9; color: #2e7d32; }

.layout { display: flex; gap: 20px; flex: 1; overflow: hidden; }

/* 左側列表 */
.list-panel { width: 300px; background: white; border: 1px solid #eee; border-radius: 8px; overflow-y: auto; display: flex; flex-direction: column; }
.list-panel h3 { padding: 15px; margin: 0; background: #f8f9fa; border-bottom: 1px solid #eee; font-size: 1rem; }
.list-item { padding: 15px; border-bottom: 1px solid #f0f0f0; cursor: pointer; transition: all 0.2s; }
.list-item:hover { background: #f5f9ff; }
.list-item.active { background: #e3f2fd; border-left: 4px solid #2196F3; }
.item-title { font-weight: bold; margin-bottom: 5px; font-size: 0.95rem; }
.item-meta { display: flex; justify-content: space-between; font-size: 0.8rem; color: #888; }
.tag.ai { background: #fce4ec; color: #c2185b; padding: 2px 6px; border-radius: 4px; }

/* 右側編輯器 */
.editor-panel { flex: 1; background: white; border: 1px solid #eee; border-radius: 8px; display: flex; flex-direction: column; overflow: hidden; }
.editor-header { padding: 15px; border-bottom: 1px solid #eee; display: flex; gap: 10px; background: #fafafa; }
.title-input { flex: 1; padding: 8px; font-size: 1.2rem; border: 1px solid #ddd; border-radius: 4px; }
.btn-publish { background: #2e7d32; color: white; border: none; padding: 8px 20px; border-radius: 4px; cursor: pointer; }
.btn-reject { background: #c62828; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer; }

.editor-body { padding: 15px; flex: 1; display: flex; flex-direction: column; }
.content-editor { flex: 1; width: 100%; padding: 15px; border: 1px solid #ddd; border-radius: 4px; font-family: monospace; line-height: 1.5; resize: none; }

.preview-area { height: 200px; padding: 15px; background: #f8f9fa; border-top: 1px solid #eee; overflow-y: auto; }
.markdown-preview { font-size: 0.9rem; line-height: 1.6; }

.meta-inputs { padding: 15px; background: #fff; border-top: 1px solid #eee; display: flex; gap: 20px; }
.form-group { display: flex; flex-direction: column; flex: 1; }
.form-group label { font-size: 0.8rem; color: #666; margin-bottom: 5px; }
.form-group input, .form-group select { padding: 8px; border: 1px solid #ddd; border-radius: 4px; }

.empty-selection { flex: 1; display: flex; align-items: center; justify-content: center; color: #999; background: #f9f9f9; border: 2px dashed #ddd; border-radius: 8px; }
</style>