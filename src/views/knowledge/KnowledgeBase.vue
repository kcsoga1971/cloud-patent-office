<!-- src/views/knowledge/KnowledgeBase.vue -->
<template>
  <div class="knowledge-page">
    
    <div class="hero-section">
      <h1>🧠 個人化專利知識庫</h1>
      <p>您的 AI 專利導師，隨時解答疑惑並協助您晉升專家</p>
      
      <div class="search-box-container">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input 
            v-model="searchQuery" 
            @keyup.enter="handleSearch"
            placeholder="輸入關鍵字 (如：禁反言、專利迴避)..." 
          />
          <button @click="handleSearch" :disabled="knowledgeStore.loading" class="btn-search">
            {{ knowledgeStore.loading ? '搜尋中...' : '搜尋' }}
          </button>
        </div>
      </div>
    </div>

    <div class="status-section">
      <div class="persona-card" :class="knowledgeStore.currentLevel" :style="{ '--accent-color': levelColor }">
        <div class="card-header">
          <div class="badge-icon">{{ levelIcon }}</div>
          <div class="level-meta">
            <h3>目前等級：{{ levelLabel }}</h3>
            <span class="xp-text">{{ knowledgeStore.xp }} / {{ knowledgeStore.nextLevelXp }} XP</span>
          </div>
        </div>
        
        <div class="progress-container">
          <div class="progress-bar" :style="{ width: knowledgeStore.xpProgress + '%' }"></div>
        </div>
        
        <p class="desc">{{ levelDesc }}</p>

        <div class="upgrade-area" v-if="canUpgrade">
          <button @click="openAssessmentModal" class="btn-challenge">
            🏆 挑戰升級試煉 ({{ nextLevelLabel }})
          </button>
          <p class="upgrade-hint">您已具備晉升資格，通過測試可獲得 500 點獎勵！</p>
        </div>
      </div>
    </div>

    <div class="content-section">
      <div class="section-header">
        <h2 v-if="isSearchResult">🔍 關於「{{ searchQuery }}」的結果</h2>
        <h2 v-else>📚 為您推薦 ({{ levelLabel }} 適用)</h2>
        
        <div class="filter-tabs" v-if="!isSearchResult">
          <button 
            v-for="cat in categories" 
            :key="cat" 
            :class="{ active: currentCategory === cat }"
            @click="currentCategory = cat"
          >
            {{ cat }}
          </button>
        </div>
      </div>

      <div v-if="knowledgeStore.loading" class="loading-state">
        <div class="spinner"></div> 載入中...
      </div>

      <div v-else-if="filteredArticles.length > 0" class="articles-grid">
        <div 
          v-for="article in filteredArticles" 
          :key="article.id" 
          class="article-card"
          @click="router.push(`/knowledge/${article.id}`)"
        >
          <div class="card-badges">
            <span class="cat-badge">{{ article.level }}</span>
            <span v-if="article.is_ai_generated" class="ai-badge">🤖 AI 生成</span>
          </div>
          <h3>{{ article.title }}</h3>
          <p class="summary">{{ article.summary || '點擊閱讀詳情...' }}</p>
          <div class="card-footer">
            <span class="date">{{ formatDate(article.created_at) }}</span>
            <span class="read-more">閱讀更多 →</span>
          </div>
        </div>
      </div>

      <div v-else-if="isSearchResult" class="empty-state">
        <div class="icon">🤖</div>
        <h3>知識庫中暫無此條目</h3>
        <p>是否啟動 AI 知識工廠，為您即時撰寫一篇權威指南？</p>
        <button @click="handleAiGenerate" class="btn-generate" :disabled="isGenerating">
          {{ isGenerating ? 'AI 正在撰寫中 (約需 30秒)...' : '✨ 啟動 AI 撰寫' }}
        </button>
      </div>

      <div v-else class="empty-state">
        <p>此分類尚無推薦文章。</p>
      </div>
    </div>

    <div v-if="showAssessment" class="modal-overlay">
      <div class="modal-card">
        <div class="modal-header">
          <h3>🎓 晉升試煉：{{ nextLevelLabel }}</h3>
          <button @click="showAssessment = false">×</button>
        </div>
        
        <div class="modal-body" v-if="!assessmentResult">
          <p class="question-text">{{ currentQuestion }}</p>
          <textarea 
            v-model="userAnswer" 
            placeholder="請輸入您的見解 (AI 將進行評分)..."
            rows="6"
          ></textarea>
        </div>
        
        <div class="modal-body result" v-else>
          <div class="score-circle" :class="{ pass: assessmentResult.passed }">
            {{ assessmentResult.score }}
          </div>
          <h4 v-if="assessmentResult.passed">🎉 恭喜通過！</h4>
          <h4 v-else>💪 再接再厲</h4>
          <p class="feedback">{{ assessmentResult.feedback }}</p>
        </div>

        <div class="modal-footer">
          <button v-if="!assessmentResult" @click="submitAnswer" class="btn-submit" :disabled="isGrading">
            {{ isGrading ? 'AI 評分中...' : '提交答案' }}
          </button>
          <button v-else @click="closeAssessment" class="btn-close">關閉</button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useKnowledgeStore } from '../../stores/knowledge'
import { formatDate } from '../../utils/formatters'

const router = useRouter()
const knowledgeStore = useKnowledgeStore()

const searchQuery = ref('')
const isSearchResult = ref(false)
const isGenerating = ref(false)
const showAssessment = ref(false)
const userAnswer = ref('')
const isGrading = ref(false)
const assessmentResult = ref(null)
const currentCategory = ref('全部')

// 題目庫 (實際可從後端拉)
const questions = {
  novice: "請簡述專利的三大要件（新穎性、進步性、產業利用性）是什麼？",
  intermediate: "如果在收到 OA 核駁時，審查員認為您的發明不具進步性，您可以採取哪兩種主要的答辯策略？",
  expert: "請說明在專利舉發案中，如何運用『組合核駁 (Combination of References)』來攻擊對手專利的進步性？"
}

// 根據 store 狀態計算
const currentQuestion = computed(() => questions[knowledgeStore.currentLevel] || questions['novice'])
const articles = computed(() => knowledgeStore.searchResults)
const canUpgrade = computed(() => knowledgeStore.xpProgress >= 80) // 80% 經驗即可挑戰

// Level UI Mapping
const levelInfo = {
  novice: { label: '新手啟蒙', icon: '🌱', color: '#4CAF50', desc: '我有創意，想了解如何保護它' },
  intermediate: { label: '實務操作', icon: '🔧', color: '#2196F3', desc: '懂技術，遇到專利障礙或需答辯' },
  expert: { label: '專家策略', icon: '🧠', color: '#9C27B0', desc: '需進行高階攻防、鑑價與佈局' },
  master: { label: '大師', icon: '👑', color: '#FFD700', desc: '專利佈局與營運的頂尖高手' }
}

const currentLevelInfo = computed(() => levelInfo[knowledgeStore.currentLevel] || levelInfo.novice)
const levelLabel = computed(() => currentLevelInfo.value.label)
const levelIcon = computed(() => currentLevelInfo.value.icon)
const levelColor = computed(() => currentLevelInfo.value.color)
const levelDesc = computed(() => currentLevelInfo.value.desc)

const nextLevelLabel = computed(() => {
  if (knowledgeStore.currentLevel === 'novice') return '實務操作'
  if (knowledgeStore.currentLevel === 'intermediate') return '專家策略'
  return '大師'
})

// 分類過濾邏輯
const categories = computed(() => ['全部', '基礎觀念', '操作指南', '實務技巧', '法律知識']) // 可動態生成
const filteredArticles = computed(() => {
  if (currentCategory.value === '全部') return articles.value
  // 假設 tags 包含分類資訊，這裡做簡單過濾
  // 實際可能需要從 tags 判斷
  return articles.value
})

// Actions
const handleSearch = async () => {
  if (!searchQuery.value) return
  isSearchResult.value = true
  await knowledgeStore.searchArticles(searchQuery.value)
}

const handleAiGenerate = async () => {
  isGenerating.value = true
  try {
    await knowledgeStore.triggerAiGeneration(searchQuery.value)
    // 輪詢模擬
    setTimeout(async () => {
      await knowledgeStore.searchArticles(searchQuery.value)
      isGenerating.value = false
    }, 5000)
  } catch (e) {
    alert('AI 生成失敗')
    isGenerating.value = false
  }
}

const openAssessmentModal = () => {
  assessmentResult.value = null
  userAnswer.value = ''
  showAssessment.value = true
}

const submitAnswer = async () => {
  if (!userAnswer.value) return alert('請輸入答案')
  isGrading.value = true
  try {
    const result = await knowledgeStore.submitAssessment(currentQuestion.value, userAnswer.value)
    assessmentResult.value = result
  } catch (e) {
    alert('評分系統忙碌中')
  } finally {
    isGrading.value = false
  }
}

const closeAssessment = () => {
  showAssessment.value = false
  if (assessmentResult.value?.passed) {
    knowledgeStore.fetchUserStats()
  }
}

onMounted(async () => {
  await knowledgeStore.fetchUserStats()
  // 載入該等級文章
  await knowledgeStore.searchArticles('') 
})
</script>

<style scoped>
.knowledge-page { max-width: 1200px; margin: 0 auto; padding: 2rem; color: #2c3e50; }

/* Hero */
.hero-section { text-align: center; margin-bottom: 3rem; }
.hero-section h1 { font-size: 2.5rem; margin-bottom: 0.5rem; color: #1e293b; }
.hero-section p { color: #64748b; font-size: 1.1rem; }

/* Search Box */
.search-box-container { margin-top: 30px; display: flex; justify-content: center; }
.search-box { 
  display: flex; align-items: center; background: white; border: 2px solid #e2e8f0; 
  border-radius: 50px; padding: 5px 5px 5px 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
  width: 100%; max-width: 600px; transition: all 0.3s;
}
.search-box:focus-within { border-color: #2196F3; box-shadow: 0 10px 15px -3px rgba(33, 150, 243, 0.1); }
.search-icon { font-size: 1.2rem; color: #94a3b8; margin-right: 10px; }
.search-box input { border: none; outline: none; flex: 1; font-size: 1rem; color: #334155; }
.btn-search { background: #2196F3; color: white; border: none; padding: 10px 24px; border-radius: 30px; font-weight: bold; cursor: pointer; transition: background 0.2s; }
.btn-search:hover { background: #1976D2; }

/* Status Section (Persona Card Style) */
.status-section { margin-bottom: 40px; display: flex; justify-content: center; }
.persona-card { 
  width: 100%; max-width: 800px; background: white; border: 2px solid #e2e8f0; 
  border-left: 6px solid var(--accent-color); border-radius: 16px; padding: 24px;
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); position: relative; overflow: hidden;
}
.card-header { display: flex; align-items: center; gap: 20px; margin-bottom: 20px; }
.badge-icon { 
  font-size: 3rem; background: #f8fafc; width: 80px; height: 80px; 
  display: flex; align-items: center; justify-content: center; border-radius: 50%; 
  border: 2px solid #e2e8f0;
}
.level-meta h3 { margin: 0 0 5px 0; font-size: 1.5rem; color: #1e293b; }
.xp-text { font-size: 0.9rem; color: #64748b; font-weight: 600; }

.progress-container { background: #e2e8f0; height: 10px; border-radius: 5px; overflow: hidden; margin-bottom: 15px; }
.progress-bar { background: var(--accent-color); height: 100%; transition: width 0.5s ease; }

.desc { color: #475569; margin-bottom: 20px; font-size: 1rem; }

.upgrade-area { 
  background: #fff8e1; border: 1px dashed #ffd54f; padding: 15px; border-radius: 8px; 
  text-align: center; margin-top: 15px; 
}
.btn-challenge { background: #FFD700; color: #333; border: none; padding: 10px 30px; border-radius: 30px; font-weight: bold; cursor: pointer; animation: pulse 2s infinite; font-size: 1rem; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
.upgrade-hint { margin: 10px 0 0 0; font-size: 0.9rem; color: #f57f17; }

/* Content Section */
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 15px; }
.section-header h2 { font-size: 1.5rem; margin: 0; color: #1e293b; }

.filter-tabs button {
  background: white; border: 1px solid #cbd5e1; padding: 6px 16px; border-radius: 20px;
  cursor: pointer; margin-left: 8px; color: #64748b; transition: all 0.2s;
}
.filter-tabs button.active { background: #334155; color: white; border-color: #334155; }

/* Article Grid */
.articles-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 24px; }
.article-card { 
  background: white; border: 1px solid #e2e8f0; padding: 24px; border-radius: 12px; 
  cursor: pointer; transition: all 0.2s; display: flex; flex-direction: column;
}
.article-card:hover { transform: translateY(-3px); box-shadow: 0 10px 20px rgba(0,0,0,0.08); border-color: #94a3b8; }

.card-badges { display: flex; gap: 8px; margin-bottom: 12px; }
.cat-badge { background: #eff6ff; color: #2563eb; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: 600; text-transform: uppercase; }
.ai-badge { background: #fce4ec; color: #c2185b; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: 600; }

.article-card h3 { margin: 0 0 12px 0; font-size: 1.2rem; line-height: 1.4; color: #1e293b; }
.summary { color: #64748b; font-size: 0.95rem; line-height: 1.6; flex: 1; margin-bottom: 20px; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }

.card-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 15px; border-top: 1px solid #f1f5f9; color: #94a3b8; font-size: 0.85rem; }
.read-more { color: #2563eb; font-weight: 600; }

/* Empty & Loading */
.loading-state, .empty-state { text-align: center; padding: 60px 0; color: #64748b; }
.empty-state .icon { font-size: 3rem; margin-bottom: 15px; }
.btn-generate { background: linear-gradient(135deg, #9C27B0, #673AB7); color: white; border: none; padding: 12px 30px; border-radius: 30px; margin-top: 20px; cursor: pointer; font-size: 1rem; box-shadow: 0 4px 10px rgba(156, 39, 176, 0.3); transition: transform 0.2s; }
.btn-generate:hover { transform: translateY(-2px); }
.btn-generate:disabled { background: #ccc; cursor: not-allowed; box-shadow: none; }
.spinner { border: 3px solid #f3f3f3; border-top: 3px solid #3b82f6; border-radius: 50%; width: 30px; height: 30px; animation: spin 1s linear infinite; margin: 0 auto 10px; }

/* Modal */
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 999; backdrop-filter: blur(2px); }
.modal-card { background: white; padding: 30px; border-radius: 16px; width: 90%; max-width: 500px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); }
.modal-header { display: flex; justify-content: space-between; margin-bottom: 20px; align-items: center; }
.modal-header h3 { margin: 0; color: #1e293b; }
.modal-header button { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #94a3b8; }

.question-text { font-weight: 600; margin-bottom: 20px; font-size: 1.1rem; line-height: 1.6; color: #334155; }
.modal-body textarea { width: 100%; padding: 15px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 1rem; resize: vertical; outline: none; transition: border-color 0.2s; }
.modal-body textarea:focus { border-color: #2196F3; }

.modal-footer { margin-top: 25px; text-align: right; }
.btn-submit { background: #2196F3; color: white; border: none; padding: 10px 24px; border-radius: 8px; cursor: pointer; font-size: 1rem; font-weight: 600; }
.btn-close { background: #e2e8f0; color: #475569; border: none; padding: 10px 24px; border-radius: 8px; cursor: pointer; font-size: 1rem; font-weight: 600; }

/* Score Result */
.result { text-align: center; }
.score-circle { width: 100px; height: 100px; border-radius: 50%; background: #f1f5f9; color: #64748b; font-size: 2.5rem; font-weight: 800; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; }
.score-circle.pass { background: #ecfdf5; color: #059669; border: 4px solid #059669; }
.feedback { background: #f8fafc; padding: 20px; border-radius: 8px; margin-top: 20px; font-size: 1rem; color: #475569; line-height: 1.6; text-align: left; }

@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
@keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }
</style>