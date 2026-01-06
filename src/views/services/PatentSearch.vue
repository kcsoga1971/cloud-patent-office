<!-- src/views/services/PatentSearch.vue -->
<template>
  <div class="search-portal-page">
    
    <div class="header-section">
      <h1>🌍 專利情報與檢索中心</h1>
      <p>無論您是剛萌發創意，還是準備佈局全球，這裡都是您的第一站。</p>
    </div>

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
import { useRouter } from 'vue-router' // ✅ 關鍵修正：確保這裡有引入
import { useUserStore } from '../../stores/user' // ✅ 若要檢查登入，需引入 store
import { supabase } from '../../supabase' // ✅ 若要呼叫 RPC，需引入 supabase

const router = useRouter()
const userStore = useUserStore() // ✅ 使用 store

const currentMode = ref('scan') 
const scanInput = ref('')
const isScanning = ref(false)
const scanResult = ref(null)
const quickKeyword = ref('')

// 修改 runSimpleScan
const runSimpleScan = async () => {
  if (!scanInput.value.trim()) return alert('請輸入描述')
  
  // 1. 檢查登入 (這是一項收費功能)
  if (!userStore.user) {
    alert('請先登入才能使用 AI 快篩功能')
    router.push('/auth/login')
    return
  }

  if(!confirm('確定扣除 50 點進行快篩？')) return

  isScanning.value = true
  scanResult.value = null 

  try {
    // 2. 執行扣款 (Reserve Credits)
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

    // 3. 呼叫 n8n Webhook
    // 請確認您已經設定 VITE_N8N_WEBHOOK_SCAN_URL 環境變數
    // 例如: https://your-n8n.com/webhook/patent-idea-scan
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
    
    // 4. 更新結果
    scanResult.value = data

    // 5. 確認扣款 (Confirm Deduction)
    await supabase.rpc('confirm_deduction', { p_transaction_id: transactionId })
    
    // 更新本地餘額顯示
    userStore.fetchUser()

  } catch (e) {
    console.error(e)
    alert('快篩失敗：' + e.message)
    // 如果有 transactionId，這裡應該要退款 (省略，視需要加上)
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

// === 傳統搜尋功能 ===
const scrollToLinks = () => {
  currentMode.value = 'manual'
  // 稍微延遲讓 DOM 更新後再滾動
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
.search-portal-page { max-width: 1200px; margin: 0 auto; padding: 2rem; color: #2c3e50; }

.header-section { text-align: center; margin-bottom: 3rem; }
.header-section h1 { font-size: 2.2rem; color: #1e293b; margin-bottom: 0.5rem; }
.header-section p { color: #64748b; font-size: 1.1rem; }

/* === Path Selector === */
.path-selector { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px; }
.path-card { 
  background: white; border: 2px solid #e2e8f0; border-radius: 16px; padding: 20px; 
  cursor: pointer; transition: all 0.2s; position: relative; overflow: hidden;
  display: flex; flex-direction: column; align-items: center; text-align: center;
}
.path-card:hover { border-color: #94a3b8; transform: translateY(-3px); box-shadow: 0 10px 20px rgba(0,0,0,0.05); }
.path-card.active { border-color: #2563eb; background-color: #eff6ff; box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1); }

.path-card .icon { font-size: 2.5rem; margin-bottom: 10px; }
.path-card h3 { margin: 0 0 8px 0; font-size: 1.2rem; color: #1e293b; }
.path-card p { font-size: 0.9rem; color: #64748b; line-height: 1.5; margin-bottom: 15px; flex: 1; }
.path-card .tag { 
  background: #e2e8f0; color: #475569; padding: 4px 10px; border-radius: 20px; 
  font-size: 0.75rem; font-weight: 600;
}
.path-card .tag.expert { background: #fff3e0; color: #e65100; }
.path-card .tag.tool { background: #f1f5f9; color: #334155; }

/* === Scan Section (Lite Analysis) === */
.scan-section { animation: fadeIn 0.3s ease; margin-bottom: 4rem; }
.scan-input-box { 
  background: white; padding: 30px; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;
  text-align: center; max-width: 800px; margin: 0 auto;
}
.scan-input-box h3 { color: #2563eb; margin-top: 0; font-size: 1.5rem; }
.scan-input-box .desc { color: #64748b; margin-bottom: 20px; }
.scan-input-box textarea { 
  width: 100%; padding: 15px; border: 1px solid #cbd5e1; border-radius: 12px; 
  font-size: 1rem; margin-bottom: 20px; outline: none; transition: border 0.2s;
}
.scan-input-box textarea:focus { border-color: #2563eb; }

.action-row { display: flex; flex-direction: column; align-items: center; gap: 10px; }
.cost-hint { font-size: 0.85rem; color: #ef4444; background: #fee2e2; padding: 4px 12px; border-radius: 20px; }
.btn-scan { 
  background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; border: none; 
  padding: 12px 40px; border-radius: 30px; font-size: 1.1rem; font-weight: bold; 
  cursor: pointer; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3); transition: transform 0.1s;
}
.btn-scan:hover { transform: translateY(-2px); }
.btn-scan:disabled { background: #cbd5e1; cursor: not-allowed; box-shadow: none; transform: none; }

/* === Scan Result === */
.scan-result-area { margin-top: 30px; border-top: 2px dashed #e2e8f0; padding-top: 30px; }
.result-header h4 { font-size: 1.2rem; color: #0f172a; text-align: center; margin-bottom: 20px; }

.patent-list { display: flex; flex-direction: column; gap: 15px; max-width: 800px; margin: 0 auto; }
.mini-patent-card { 
  display: flex; align-items: flex-start; background: white; padding: 15px; 
  border-radius: 12px; border: 1px solid #e2e8f0; gap: 15px;
}
.mini-patent-card .rank { 
  background: #f1f5f9; width: 30px; height: 30px; display: flex; align-items: center; 
  justify-content: center; border-radius: 50%; font-weight: bold; color: #64748b; font-size: 0.9rem;
}
.mini-patent-card .content { flex: 1; }
.pat-title { font-weight: bold; color: #2563eb; text-decoration: none; display: block; margin-bottom: 8px; }
.comparison { display: flex; gap: 8px; align-items: flex-start; font-size: 0.9rem; line-height: 1.5; color: #334155; }
.badge.diff { background: #dcfce7; color: #166534; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; white-space: nowrap; margin-top: 2px; }

.similarity-score { display: flex; flex-direction: column; align-items: center; min-width: 60px; }
.similarity-score .score { font-size: 1.2rem; font-weight: 800; color: #dc2626; }
.similarity-score .label { font-size: 0.7rem; color: #94a3b8; }

/* === Guidance (Call to Action) === */
.next-step-guidance { 
  text-align: center; margin-top: 40px; background: #fff7ed; padding: 25px; 
  border-radius: 16px; border: 1px solid #ffedd5; max-width: 800px; margin-left: auto; margin-right: auto;
}
.next-step-guidance h3 { margin-top: 0; color: #9a3412; font-size: 1.1rem; margin-bottom: 20px; }
.guidance-options { display: flex; justify-content: center; gap: 30px; }
.option p { font-size: 0.9rem; color: #7c2d12; margin-bottom: 10px; }
.option button { 
  background: white; border: 1px solid #fb923c; color: #ea580c; padding: 8px 20px; 
  border-radius: 20px; cursor: pointer; font-weight: 600; transition: all 0.2s;
}
.option button:hover { background: #ea580c; color: white; }

/* === Divider & Search Box === */
.divider { text-align: center; margin: 3rem 0; color: #94a3b8; font-size: 0.9rem; position: relative; }
.divider::before, .divider::after { content: ''; position: absolute; top: 50%; width: 40%; height: 1px; background: #e2e8f0; }
.divider::before { left: 0; }
.divider::after { right: 0; }

.search-box-container { max-width: 700px; margin: 0 auto 3rem auto; }
.search-bar { 
  display: flex; align-items: center; background: white; border: 2px solid #e0e0e0; 
  border-radius: 50px; padding: 8px 8px 8px 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); transition: all 0.3s;
}
.search-bar:focus-within { border-color: #2196F3; box-shadow: 0 6px 16px rgba(33, 150, 243, 0.15); }
.search-icon { font-size: 1.2rem; margin-right: 12px; color: #999; }
.search-bar input { border: none; outline: none; font-size: 1rem; flex: 1; color: #333; }
.btn-search { 
  background: #2196F3; color: white; border: none; padding: 10px 24px; 
  border-radius: 30px; font-weight: bold; cursor: pointer; transition: background 0.2s;
}
.btn-search:hover { background: #1976D2; }

/* === Portal Grid === */
.portal-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 24px; margin-bottom: 4rem; }
.site-card { 
  background: white; border: 1px solid #eee; border-radius: 16px; padding: 24px; 
  cursor: pointer; transition: all 0.2s ease; position: relative; overflow: hidden;
}
.site-card:hover { transform: translateY(-5px); box-shadow: 0 10px 20px rgba(0,0,0,0.08); border-color: #bbdefb; }
.card-top { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; }
.site-icon { font-size: 2.5rem; background: #f8f9fa; width: 64px; height: 64px; display: flex; align-items: center; justify-content: center; border-radius: 12px; }
.site-info h3 { margin: 0 0 6px 0; font-size: 1.1rem; color: #333; }
.region-badge { background: #e3f2fd; color: #1976D2; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: 600; }
.site-desc { color: #666; font-size: 0.95rem; line-height: 1.5; margin-bottom: 20px; min-height: 3rem; }
.card-footer { text-align: right; }
.visit-link { color: #2196F3; font-weight: 600; font-size: 0.9rem; }

/* === Tips === */
.tips-section { background: #fff8e1; border-radius: 12px; padding: 24px; border: 1px solid #ffe0b2; }
.tips-section h4 { margin-top: 0; color: #f57c00; display: flex; align-items: center; gap: 8px; }
.tips-section ul { margin: 0; padding-left: 20px; color: #5d4037; }
.tips-section li { margin-bottom: 8px; line-height: 1.5; }

@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

/* RWD */
@media (max-width: 768px) {
  .path-selector { grid-template-columns: 1fr; }
  .guidance-options { flex-direction: column; gap: 20px; }
}
</style>