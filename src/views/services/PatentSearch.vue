<!-- src/views/services/PatentSearch.vue -->
<template>
  <div class="search-portal-page">
    
    <!-- 🎨 風格 B：漸層標題區 -->
    <div class="page-header">
      <div class="header-icon">🌍</div>
      <div class="header-content">
        <h1>專利情報與檢索中心 (Patent Search)</h1>
        <p class="subtitle">AI 智能檢索與傳統資料庫完美結合</p>
      </div>
    </div>

    <!-- 🎨 保持原有的路徑選擇器 -->
    <div class="path-selector">
      
      <div 
        class="path-card" 
        :class="{ active: currentMode === 'scan' }"
        @click="currentMode = 'scan'"
      >
        <div class="icon">🐣</div>
        <h3>創意初步掃描</h3>
        <p>我有個點子，想知道有沒有人做過，跟現有技術差在哪？</p>
        <span class="tag">適合新手 / 快速驗證</span>
      </div>

      <div 
        class="path-card" 
        @click="router.push('/services/portfolio-workflow')"
      >
        <div class="icon">♟️</div>
        <h3>專利佈局規劃</h3>
        <p>我的產品已定型，需要完整的技術拆解、國別與預算規劃。</p>
        <span class="tag expert">適合老手 / 申請前夕</span>
      </div>

      <div 
        class="path-card" 
        :class="{ active: currentMode === 'manual' }"
        @click="scrollToLinks"
      >
        <div class="icon">🔍</div>
        <h3>專業資料庫</h3>
        <p>我習慣自己使用 Google Patents 或官方局進行布林檢索。</p>
        <span class="tag tool">工具連結</span>
      </div>
    </div>

    <!-- AI 快篩區域 -->
    <div v-if="currentMode === 'scan'" class="scan-section">
      <div class="scan-input-box">
        <h3>🚀 AI 創意快篩 (Lite)</h3>
        <p class="desc">
          請用白話文描述您的創意，AI 將為您找出 **最相關的 5 篇專利**，並進行 **技術差異性比對**。
        </p>
        
        <textarea 
          v-model="scanInput" 
          placeholder="例如：這是一個可以自動清洗的貓砂盆，利用重力感測器偵測貓咪離開後，透過旋轉機構將結塊貓砂篩選至底部的集便盒..."
          rows="5"
        ></textarea>
        
        <div class="action-row">
          <span class="cost-hint">本次體驗將扣除 <strong>50</strong> 點數 (推廣價)</span>
          <button 
            @click="runSimpleScan" 
            class="btn-scan"
            :disabled="isScanning"
          >
            {{ isScanning ? 'AI 正在閱讀專利中...' : '🔍 啟動快篩比對' }}
          </button>
        </div>
      </div>

      <div v-if="scanResult" class="scan-result-area">
        <div class="result-header">
          <h4>📊 分析結果：{{ scanResult.overall_comment }}</h4>
        </div>

        <div class="patent-list">
          <div v-for="(pat, idx) in scanResult.patents" :key="idx" class="mini-patent-card">
            <div class="rank">#{{ idx + 1 }}</div>
            <div class="content">
              <a :href="pat.link" target="_blank" class="pat-title">{{ pat.title }} ↗</a>
              <div class="comparison">
                <span class="badge diff">差異點</span>
                <p>{{ pat.difference_analysis }}</p>
              </div>
            </div>
            <div class="similarity-score">
              <span class="score">{{ pat.similarity }}%</span>
              <span class="label">相似度</span>
            </div>
          </div>
        </div>

        <div class="next-step-guidance">
          <h3>🤔 下一步該怎麼做？</h3>
          <div class="guidance-options">
            <div class="option">
              <p>覺得相似度太高 (危險)？</p>
              <button @click="goToDesignAround">🛡️ 進行「迴避設計」</button>
            </div>
            <div class="option">
              <p>覺得差異明顯 (安全)？</p>
              <button @click="goToPortfolio">♟️ 進行「專利佈局」</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="divider">或是使用傳統搜尋</div>

    <!-- 快速搜尋框 -->
    <div class="search-box-container">
      <div class="search-bar">
        <span class="search-icon">🔍</span>
        <input 
          v-model="quickKeyword" 
          @keyup.enter="handleQuickSearch"
          type="text" 
          placeholder="輸入關鍵字或專利號，按下 Enter 立即前往 Google Patents 搜尋..." 
        />
        <button @click="handleQuickSearch" class="btn-search">搜尋</button>
      </div>
    </div>

    <!-- 專業資料庫連結 -->
    <div id="external-links" class="portal-grid">
      <div 
        v-for="site in searchSites" 
        :key="site.name" 
        class="site-card"
        @click="openLink(site.url)"
      >
        <div class="card-top">
          <div class="site-icon">{{ site.icon }}</div>
          <div class="site-info">
            <h3>{{ site.name }}</h3>
            <span class="region-badge">{{ site.region }}</span>
          </div>
        </div>
        <p class="site-desc">{{ site.desc }}</p>
        <div class="card-footer">
          <span class="visit-link">前往網站 →</span>
        </div>
      </div>
    </div>

    <!-- 檢索小撇步 -->
    <div class="tips-section">
      <h4>💡 檢索小撇步</h4>
      <ul>
        <li><strong>初步檢索</strong>：建議優先使用 <strong>Google Patents</strong>，速度快且支援多國語言翻譯。</li>
        <li><strong>法律狀態</strong>：若需確認專利是否仍有效，請務必前往各國<strong>官方局 (TIPO, USPTO)</strong> 查詢。</li>
        <li><strong>完整性</strong>：進行FTO (自由運營) 分析時，建議交叉比對至少兩個資料庫。</li>
      </ul>
    </div>

  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../../stores/user'
import { supabase } from '../../supabase'

const router = useRouter()
const userStore = useUserStore()

const currentMode = ref('scan') 
const scanInput = ref('')
const isScanning = ref(false)
const scanResult = ref(null)
const quickKeyword = ref('')

const runSimpleScan = async () => {
  if (!scanInput.value.trim()) return alert('請輸入描述')
  
  if (!userStore.user) {
    alert('請先登入才能使用 AI 快篩功能')
    router.push('/auth/login')
    return
  }

  if(!confirm('確定扣除 50 點進行快篩？')) return

  isScanning.value = true
  scanResult.value = null 

  try {
    const { data: reserve, error: reserveErr } = await supabase.rpc('reserve_credits', {
      p_user_id: userStore.user.id,
      p_credits: 50,
      p_action_type: 'PATENT_SCAN_LITE',
      p_description: 'AI 創意快篩',
      p_model_name: 'gpt-4o-mini',
      p_job_id: null,
      p_project_id: null
    })

    if (reserveErr || !reserve.success) throw new Error(reserveErr?.message || reserve.error)
    const transactionId = reserve.transaction_id

    const response = await fetch(import.meta.env.VITE_N8N_WEBHOOK_SCAN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        description: scanInput.value,
        user_id: userStore.user.id
      })
    })

    if (!response.ok) throw new Error('AI 分析服務暫時無法使用')
    
    const data = await response.json()
    scanResult.value = data

    await supabase.rpc('confirm_deduction', { p_transaction_id: transactionId })
    userStore.fetchUser()

  } catch (e) {
    console.error(e)
    alert('快篩失敗：' + e.message)
  } finally {
    isScanning.value = false
  }
}

const goToDesignAround = () => {
  router.push({
    path: '/services/design-around-workflow',
    query: { prefill: encodeURIComponent(scanInput.value) }
  })
}

const goToPortfolio = () => {
  router.push({
    path: '/services/portfolio-planning',
    query: { prefill_desc: encodeURIComponent(scanInput.value) }
  })
}

const scrollToLinks = () => {
  currentMode.value = 'manual'
  setTimeout(() => {
    document.getElementById('external-links').scrollIntoView({ behavior: 'smooth' })
  }, 100)
}

const handleQuickSearch = () => {
  if (!quickKeyword.value.trim()) return
  const url = `https://patents.google.com/?q=${encodeURIComponent(quickKeyword.value)}`
  window.open(url, '_blank')
}

const openLink = (url) => {
  window.open(url, '_blank')
}

const searchSites = [
  { name: 'Google Patents', region: 'Global', icon: '🌐', desc: '速度最快、介面最友善的全球專利檢索引擎。', url: 'https://patents.google.com/' },
  { name: '中華民國專利檢索 (GPSS)', region: 'Taiwan', icon: '🇹🇼', desc: '台灣智慧財產局官方系統。查詢法律狀態最準確。', url: 'https://tiponet.tipo.gov.tw/gpss' },
  { name: 'USPTO Patent Center', region: 'USA', icon: '🇺🇸', desc: '美國專利商標局官方系統。', url: 'https://ppubs.uspto.gov/basic/' },
  { name: 'Espacenet (EPO)', region: 'Europe', icon: '🇪🇺', desc: '歐洲專利局提供，強大的專利家族資料。', url: 'https://worldwide.espacenet.com/' },
  { name: 'CNIPA 專利檢索', region: 'China', icon: '🇨🇳', desc: '中國國家知識產權局。', url: 'https://pss-system.cponline.cnipa.gov.cn/' },
  { name: 'WIPO PATENTSCOPE', region: 'Global (PCT)', icon: '🇺🇳', desc: '查詢 PCT 國際申請案。', url: 'https://patentscope.wipo.int/search/en/search.jsf' },
  { name: 'J-PlatPat', region: 'Japan', icon: '🇯🇵', desc: '日本特許廳官方平台。', url: 'https://www.j-platpat.inpit.go.jp/' },
  { name: 'KIPRIS', region: 'Korea', icon: '🇰🇷', desc: '韓國專利資訊檢索服務。', url: 'http://eng.kipris.or.kr/' }
]
</script>

<style scoped>
.search-portal-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
}

/* ========== 🎨 風格 B：漸層標題 ========== */
.page-header {
  display: flex;
  align-items: center;
  gap: 24px;
  margin-bottom: 32px;
  padding: 32px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.25);
}

.header-icon {
  font-size: 56px;
  width: 88px;
  height: 88px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.header-content {
  flex: 1;
}

.header-content h1 {
  font-size: 28px;
  font-weight: 700;
  color: white;
  margin: 0 0 8px 0;
}

.subtitle {
  font-size: 15px;
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
}

/* ========== 路徑選擇器 ========== */
.path-selector {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 40px;
}

.path-card {
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 16px;
  padding: 24px;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.path-card:hover {
  border-color: #667eea;
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
}

.path-card.active {
  border-color: #667eea;
  background: linear-gradient(135deg, #f8f9ff 0%, #f0f4ff 100%);
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.2);
}

.path-card .icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.path-card h3 {
  margin: 0 0 12px 0;
  font-size: 18px;
  color: #1e293b;
  font-weight: 700;
}

.path-card p {
  font-size: 14px;
  color: #64748b;
  line-height: 1.6;
  margin-bottom: 16px;
  flex: 1;
}

.path-card .tag {
  background: #e2e8f0;
  color: #475569;
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.path-card .tag.expert {
  background: #fff3e0;
  color: #e65100;
}

.path-card .tag.tool {
  background: #f1f5f9;
  color: #334155;
}

/* ========== AI 快篩區域 ========== */
.scan-section {
  animation: fadeIn 0.3s ease;
  margin-bottom: 60px;
}

.scan-input-box {
  background: white;
  padding: 40px;
  border-radius: 20px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
  border: 2px solid #e2e8f0;
  text-align: center;
  max-width: 900px;
  margin: 0 auto;
}

.scan-input-box h3 {
  color: #667eea;
  margin-top: 0;
  font-size: 24px;
  font-weight: 700;
}

.scan-input-box .desc {
  color: #64748b;
  margin-bottom: 24px;
  line-height: 1.6;
}

.scan-input-box textarea {
  width: 100%;
  padding: 16px;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  font-size: 15px;
  margin-bottom: 24px;
  outline: none;
  transition: border 0.2s;
  font-family: inherit;
}

.scan-input-box textarea:focus {
  border-color: #667eea;
}

.action-row {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.cost-hint {
  font-size: 13px;
  color: #ef4444;
  background: #fee2e2;
  padding: 6px 16px;
  border-radius: 20px;
  font-weight: 600;
}

.btn-scan {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 14px 48px;
  border-radius: 30px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);
  transition: all 0.3s;
}

.btn-scan:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
}

.btn-scan:disabled {
  background: #cbd5e1;
  cursor: not-allowed;
  box-shadow: none;
  transform: none;
}

/* ========== 分析結果 ========== */
.scan-result-area {
  margin-top: 40px;
  border-top: 2px dashed #e2e8f0;
  padding-top: 40px;
}

.result-header h4 {
  font-size: 20px;
  color: #1e293b;
  text-align: center;
  margin-bottom: 24px;
  font-weight: 700;
}

.patent-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 900px;
  margin: 0 auto;
}

.mini-patent-card {
  display: flex;
  align-items: flex-start;
  background: white;
  padding: 20px;
  border-radius: 12px;
  border: 2px solid #e2e8f0;
  gap: 16px;
  transition: all 0.3s;
}

.mini-patent-card:hover {
  border-color: #667eea;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
}

.mini-patent-card .rank {
  background: #f1f5f9;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-weight: 700;
  color: #64748b;
  font-size: 14px;
  flex-shrink: 0;
}

.mini-patent-card .content {
  flex: 1;
}

.pat-title {
  font-weight: 700;
  color: #667eea;
  text-decoration: none;
  display: block;
  margin-bottom: 12px;
  font-size: 16px;
}

.pat-title:hover {
  color: #5568d3;
}

.comparison {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  font-size: 14px;
  line-height: 1.6;
  color: #334155;
}

.badge.diff {
  background: #dcfce7;
  color: #166534;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  white-space: nowrap;
  margin-top: 2px;
  font-weight: 600;
}

.similarity-score {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 70px;
  flex-shrink: 0;
}

.similarity-score .score {
  font-size: 24px;
  font-weight: 800;
  color: #dc2626;
}

.similarity-score .label {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 4px;
}

/* ========== 下一步指引 ========== */
.next-step-guidance {
  text-align: center;
  margin-top: 48px;
  background: #fff7ed;
  padding: 32px;
  border-radius: 16px;
  border: 2px solid #ffedd5;
  max-width: 900px;
  margin-left: auto;
  margin-right: auto;
}

.next-step-guidance h3 {
  margin-top: 0;
  color: #9a3412;
  font-size: 18px;
  margin-bottom: 24px;
  font-weight: 700;
}

.guidance-options {
  display: flex;
  justify-content: center;
  gap: 32px;
}

.option p {
  font-size: 14px;
  color: #7c2d12;
  margin-bottom: 12px;
  font-weight: 600;
}

.option button {
  background: white;
  border: 2px solid #fb923c;
  color: #ea580c;
  padding: 10px 24px;
  border-radius: 20px;
  cursor: pointer;
  font-weight: 700;
  transition: all 0.3s;
}

.option button:hover {
  background: #ea580c;
  color: white;
  transform: translateY(-2px);
}

/* ========== 分隔線 ========== */
.divider {
  text-align: center;
  margin: 60px 0;
  color: #94a3b8;
  font-size: 14px;
  position: relative;
  font-weight: 600;
}

.divider::before,
.divider::after {
  content: '';
  position: absolute;
  top: 50%;
  width: 40%;
  height: 1px;
  background: #e2e8f0;
}

.divider::before {
  left: 0;
}

.divider::after {
  right: 0;
}

/* ========== 快速搜尋框 ========== */
.search-box-container {
  max-width: 800px;
  margin: 0 auto 60px auto;
}

.search-bar {
  display: flex;
  align-items: center;
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 50px;
  padding: 8px 8px 8px 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  transition: all 0.3s;
}

.search-bar:focus-within {
  border-color: #667eea;
  box-shadow: 0 6px 16px rgba(102, 126, 234, 0.15);
}

.search-icon {
  font-size: 20px;
  margin-right: 12px;
  color: #94a3b8;
}

.search-bar input {
  border: none;
  outline: none;
  font-size: 15px;
  flex: 1;
  color: #1e293b;
}

.btn-search {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 12px 32px;
  border-radius: 30px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-search:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

/* ========== 資料庫卡片 ========== */
.portal-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
  margin-bottom: 60px;
}

.site-card {
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 16px;
  padding: 24px;
  cursor: pointer;
  transition: all 0.3s;
}

.site-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.08);
  border-color: #667eea;
}

.card-top {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.site-icon {
  font-size: 40px;
  background: #f8fafc;
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
}

.site-info h3 {
  margin: 0 0 8px 0;
  font-size: 16px;
  color: #1e293b;
  font-weight: 700;
}

.region-badge {
  background: #e0e7ff;
  color: #4338ca;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
}

.site-desc {
  color: #64748b;
  font-size: 14px;
  line-height: 1.6;
  margin-bottom: 20px;
  min-height: 3rem;
}

.card-footer {
  text-align: right;
}

.visit-link {
  color: #667eea;
  font-weight: 700;
  font-size: 14px;
}

/* ========== 檢索小撇步 ========== */
.tips-section {
  background: #fff8e1;
  border-radius: 16px;
  padding: 32px;
  border: 2px solid #ffe0b2;
}

.tips-section h4 {
  margin-top: 0;
  color: #f57c00;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 700;
}

.tips-section ul {
  margin: 0;
  padding-left: 24px;
  color: #5d4037;
}

.tips-section li {
  margin-bottom: 12px;
  line-height: 1.6;
}

/* ========== 動畫 ========== */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ========== 響應式 ========== */
@media (max-width: 1200px) {
  .path-selector {
    grid-template-columns: repeat(2, 1fr);
  }

  .portal-grid {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 20px;
  }

  .path-selector {
    grid-template-columns: 1fr;
  }

  .guidance-options {
    flex-direction: column;
    gap: 20px;
  }

  .portal-grid {
    grid-template-columns: 1fr;
  }

  .divider::before,
  .divider::after {
    width: 35%;
  }
}
</style>
