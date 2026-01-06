<!-- src/views/dashboard/DashboardHome.vue -->
<template>
  <div class="dashboard-container">
    
    <div class="welcome-section">
      <div class="welcome-text">
        <h1>Hi, {{ userStore.user?.email?.split('@')[0] }} 👋</h1>
        <p class="slogan">專利細節交給 AI，您專注於改變世界。</p>
        <p class="sub-slogan">目前您已運用平台為公司創造了 <span class="highlight">Level {{ levelLabel }}</span> 的潛在價值。</p>
      </div>
      
      <div class="level-badge" @click="router.push('/knowledge')">
        <div class="icon">{{ levelIcon }}</div>
        <div class="info">
          <span class="label">平台駕馭等級</span>
          <span class="value">{{ levelLabel }}</span>
        </div>
        <div class="progress-mini">
          <div class="bar" :style="{ width: knowledgeStore.xpProgress + '%' }"></div>
        </div>
        <span class="arrow">→ 如何進階？</span>
      </div>
    </div>

    <div class="nav-grid">
      
      <div class="group-section">
        <h3>🚀 產品上市 & 基礎保護</h3>
        <p class="section-desc">產品開發階段，利用 AI 快速建立保護網，避免創意被抄襲。</p>
        <div class="cards-row">
          
          <div class="feature-card">
            <div class="card-icon bg-blue">🔍</div>
            <div class="card-content">
              <h4>確保創意安全 (FTO)</h4>
              <p>在投入模具費前，確認沒有踩到別人的地雷。</p>
            </div>
            <div class="actions">
              <button class="btn-learn" @click="goToKnowledge('why-search-first')">💡 為什麼要查？</button>
              <button class="btn-start" @click="router.push('/services/patent-search')">開始檢索</button>
            </div>
          </div>

          <div class="feature-card">
            <div class="card-icon bg-green">📋</div>
            <h4>低成本快速申請</h4>
            <p>只要輸入技術特徵，AI 自動生成標準專利文件，讓您快速取得「申請日」。</p>
            <div class="actions">
              <button class="btn-learn" @click="goToKnowledge('ai-drafting-benefits')">💡 如何讓 AI 寫更好？</button>
              <button class="btn-start" @click="router.push('/services/drafting-workflow')">生成說明書</button>
            </div>
          </div>

        </div>
      </div>

      <div class="group-section">
        <h3>💰 募資 & 公司資產加值</h3>
        <p class="section-desc">面對投資人 (VC) 時，拿出數據證明您的技術價值與護城河。</p>
        <div class="cards-row">
          
          <div class="feature-card">
            <div class="card-icon bg-purple">💎</div>
            <h4>技術鑑價報告</h4>
            <p>產出 AI 估值報告，向投資人證明您的技術值多少錢。</p>
            <div class="actions">
              <button class="btn-learn" @click="goToKnowledge('valuation-for-vc')">💡 投資人看什麼？</button>
              <button class="btn-start" @click="router.push('/services/valuation-workflow')">計算身價</button>
            </div>
          </div>

          <div class="feature-card">
            <div class="card-icon bg-indigo">♟️</div>
            <h4>專利佈局藍圖</h4>
            <p>展現您的全球視野。用最少預算，規劃出讓競爭對手難以跨越的壁壘。</p>
            <div class="actions">
              <button class="btn-learn" @click="goToKnowledge('lean-portfolio')">💡 精實佈局策略</button>
              <button class="btn-start" @click="router.push('/services/portfolio-workflow')">規劃藍圖</button>
            </div>
          </div>

        </div>
      </div>

      <div class="group-section">
        <h3>🛡️ 市場競爭 & 風險排除</h3>
        <p class="section-desc">遇到大公司專利擋路？利用 AI 找出活路或進行反擊。</p>
        <div class="cards-row">
          
          <div class="feature-card">
            <div class="card-icon bg-orange">🎯</div>
            <h4>繞過對手專利</h4>
            <p>發現地雷？AI 幫您分析對手漏洞，提供「改良設計」建議，合法上市。</p>
            <div class="actions">
              <button class="btn-learn" @click="goToKnowledge('design-around-biz')">💡 什麼是迴避設計？</button>
              <button class="btn-start" @click="router.push('/services/design-around-workflow')">尋找方案</button>
            </div>
          </div>

          <div class="feature-card">
            <div class="card-icon bg-red">🛡️</div>
            <h4>官方核駁應對</h4>
            <p>收到專利局的拒絕信？別擔心，AI 幫您生成答辯理由，爭取核准。</p>
            <div class="actions">
              <button class="btn-learn" @click="goToKnowledge('oa-strategy')">💡 答辯策略</button>
              <button class="btn-start" @click="router.push('/services/defense-workflow')">生成答辯</button>
            </div>
          </div>

        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../../stores/user'
import { useKnowledgeStore } from '../../stores/knowledge'

const router = useRouter()
const userStore = useUserStore()
const knowledgeStore = useKnowledgeStore()

onMounted(() => {
  knowledgeStore.fetchUserStats()
})

// 定義「平台運用等級」
const levelLabel = computed(() => {
  const map = { 
    novice: '1 (探索者)', 
    intermediate: '2 (實踐者)', 
    expert: '3 (增值者)', 
    master: '4 (領航者)' 
  }
  return map[knowledgeStore.currentLevel] || '1 (探索者)'
})

const levelIcon = computed(() => {
  // 對應等級的象徵：種子 -> 工具 -> 鑽石 -> 皇冠
  const map = { novice: '🌱', intermediate: '🔨', expert: '💎', master: '👑' }
  return map[knowledgeStore.currentLevel] || '🌱'
})

const goToKnowledge = (topicId) => {
  // 這裡未來會連結到具體的「商業應用教學文章」
  // 例如：「如何利用鑑價報告提高 A 輪估值？」
  router.push('/knowledge')
}
</script>

<style scoped>
.dashboard-container { padding: 2rem; max-width: 1200px; margin: 0 auto; color: #2c3e50; }

/* 1. Welcome Section - 強調賦能 */
.welcome-section { 
  display: flex; justify-content: space-between; align-items: center; 
  margin-bottom: 3rem; background: linear-gradient(120deg, #2c3e50 0%, #3498db 100%);
  padding: 40px; border-radius: 20px; color: white;
  box-shadow: 0 10px 25px rgba(44, 62, 80, 0.2);
}
.welcome-text h1 { margin: 0 0 10px 0; font-size: 2.2rem; font-weight: 700; }
.slogan { font-size: 1.2rem; opacity: 0.9; margin-bottom: 5px; }
.sub-slogan { font-size: 0.95rem; opacity: 0.8; }
.highlight { color: #FFD700; font-weight: bold; }

/* Level Badge - 就像遊戲的戰力指數 */
.level-badge { 
  background: rgba(255, 255, 255, 0.15); backdrop-filter: blur(10px);
  padding: 15px 25px; border-radius: 15px; border: 1px solid rgba(255,255,255,0.2);
  display: flex; align-items: center; gap: 15px; cursor: pointer;
  transition: all 0.2s; min-width: 250px;
}
.level-badge:hover { background: rgba(255, 255, 255, 0.25); transform: translateY(-2px); }
.level-badge .icon { font-size: 2.5rem; }
.level-badge .info { display: flex; flex-direction: column; flex: 1; }
.level-badge .label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; opacity: 0.8; }
.level-badge .value { font-weight: bold; font-size: 1.1rem; }
.progress-mini { width: 100%; height: 4px; background: rgba(0,0,0,0.2); border-radius: 2px; margin-top: 8px; overflow: hidden; }
.progress-mini .bar { height: 100%; background: #FFD700; }
.arrow { margin-left: 10px; font-size: 0.8rem; opacity: 0.7; }

/* 2. Group Sections */
.group-section { margin-bottom: 50px; }
.group-section h3 { 
  font-size: 1.4rem; color: #2c3e50; margin-bottom: 5px; 
  display: flex; align-items: center; gap: 10px;
}
.section-desc { color: #64748b; margin-bottom: 20px; font-size: 1rem; }

.cards-row { display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 25px; }

/* Feature Card - 強調解決方案 */
.feature-card { 
  background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 25px;
  transition: all 0.3s ease; display: flex; flex-direction: column; height: 100%;
  position: relative; overflow: hidden;
}
.feature-card:hover { 
  border-color: #3498db; box-shadow: 0 15px 30px rgba(0,0,0,0.08); 
  transform: translateY(-5px);
}

.card-icon { 
  width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center;
  font-size: 1.5rem; margin-bottom: 15px; 
}
.bg-blue { background: #e3f2fd; color: #1976d2; }
.bg-green { background: #e8f5e9; color: #2e7d32; }
.bg-purple { background: #f3e5f5; color: #7b1fa2; }
.bg-indigo { background: #e8eaf6; color: #3f51b5; }
.bg-orange { background: #fff3e0; color: #ef6c00; }
.bg-red { background: #ffebee; color: #c62828; }

.feature-card h4 { margin: 0 0 10px 0; font-size: 1.2rem; color: #2c3e50; font-weight: 700; }
.feature-card p { color: #64748b; font-size: 0.95rem; line-height: 1.6; margin-bottom: 25px; flex: 1; }

/* Actions */
.actions { display: flex; gap: 10px; margin-top: auto; }
.btn-learn { 
  flex: 1; padding: 10px; border: 1px solid #cbd5e1; background: transparent; color: #64748b; 
  border-radius: 8px; cursor: pointer; font-size: 0.85rem; font-weight: 500; transition: all 0.2s;
}
.btn-learn:hover { background: #f1f5f9; color: #334155; }

.btn-start { 
  flex: 1.2; padding: 10px; background: #2c3e50; color: white; border: none; 
  border-radius: 8px; cursor: pointer; font-size: 0.9rem; font-weight: 600; transition: all 0.2s;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}
.btn-start:hover { background: #34495e; transform: translateY(-1px); }

/* RWD */
@media (max-width: 768px) {
  .welcome-section { flex-direction: column; text-align: center; gap: 20px; padding: 30px; }
  .level-badge { width: 100%; }
  .cards-row { grid-template-columns: 1fr; }
}
</style>