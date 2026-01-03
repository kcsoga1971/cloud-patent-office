<!-- src/views/services/PatentSearch.vue -->
<template>
  <div class="search-portal-page">
    <div class="page-header">
      <div class="title-group">
        <h1>🌍 全球專利檢索入口</h1>
        <p class="subtitle">彙整全球主流專利資料庫，協助您快速查找技術前案</p>
      </div>
    </div>

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

    <div class="portal-grid">
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

const quickKeyword = ref('')

const handleQuickSearch = () => {
  if (!quickKeyword.value.trim()) return
  // 直接開新分頁跳轉 Google Patents
  const url = `https://patents.google.com/?q=${encodeURIComponent(quickKeyword.value)}`
  window.open(url, '_blank')
}

const openLink = (url) => {
  window.open(url, '_blank')
}

// 定義外部連結資料
const searchSites = [
  {
    name: 'Google Patents',
    region: 'Global',
    icon: '🌐',
    desc: '速度最快、介面最友善的全球專利檢索引擎，適合初步檢索與閱讀。',
    url: 'https://patents.google.com/'
  },
  {
    name: '中華民國專利檢索 (GPSS)',
    region: 'Taiwan',
    icon: '🇹🇼',
    desc: '台灣智慧財產局官方系統。查詢台灣專利法律狀態、年費繳納情形最準確。點擊“04 Search 檢索 全球專利檢索系統”後可進入',
    url: 'https://tiponet.tipo.gov.tw/gpss'
  },
  {
    name: 'USPTO Patent Center',
    region: 'USA',
    icon: '🇺🇸',
    desc: '美國專利商標局官方系統。查詢美國專利詳細審查歷程 (File Wrapper) 必用。',
    url: 'https://ppubs.uspto.gov/basic/'
  },
  {
    name: 'Espacenet (EPO)',
    region: 'Europe',
    icon: '🇪🇺',
    desc: '歐洲專利局提供。擁有強大的分類號檢索功能與全球專利家族資料。',
    url: 'https://worldwide.espacenet.com/'
  },
  {
    name: 'CNIPA 專利檢索',
    region: 'China',
    icon: '🇨🇳',
    desc: '中國國家知識產權局。查詢中國專利全文與法律狀態。',
    url: 'https://pss-system.cponline.cnipa.gov.cn/'
  },
  {
    name: 'WIPO PATENTSCOPE',
    region: 'Global (PCT)',
    icon: '🇺🇳',
    desc: '世界智慧財產權組織。專門查詢 PCT 國際申請案的進度與文件。',
    url: 'https://patentscope.wipo.int/search/en/search.jsf'
  },
  {
    name: 'J-PlatPat',
    region: 'Japan',
    icon: '🇯🇵',
    desc: '日本特許廳官方平台。查詢日本專利最權威的來源。',
    url: 'https://www.j-platpat.inpit.go.jp/'
  },
  {
    name: 'KIPRIS',
    region: 'Korea',
    icon: '🇰🇷',
    desc: '韓國專利資訊檢索服務。提供韓國專利的英文檢索介面。',
    url: 'http://eng.kipris.or.kr/'
  }
]
</script>

<style scoped>
.search-portal-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  color: #2c3e50;
}

.page-header {
  text-align: center;
  margin-bottom: 3rem;
}

.page-header h1 {
  font-size: 2.2rem;
  margin-bottom: 0.5rem;
  color: #2c3e50;
}

.subtitle {
  color: #666;
  font-size: 1.1rem;
}

/* 快速搜尋框 */
.search-box-container {
  max-width: 700px;
  margin: 0 auto 4rem auto;
}

.search-bar {
  display: flex;
  align-items: center;
  background: white;
  border: 2px solid #e0e0e0;
  border-radius: 50px;
  padding: 8px 8px 8px 24px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  transition: all 0.3s;
}

.search-bar:focus-within {
  border-color: #2196F3;
  box-shadow: 0 6px 16px rgba(33, 150, 243, 0.15);
}

.search-icon {
  font-size: 1.2rem;
  margin-right: 12px;
  color: #999;
}

.search-bar input {
  border: none;
  outline: none;
  font-size: 1rem;
  flex: 1;
  color: #333;
}

.btn-search {
  background: #2196F3;
  color: white;
  border: none;
  padding: 10px 24px;
  border-radius: 30px;
  font-weight: bold;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-search:hover {
  background: #1976D2;
}

/* Grid Layout */
.portal-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
  margin-bottom: 4rem;
}

/* Site Card */
.site-card {
  background: white;
  border: 1px solid #eee;
  border-radius: 16px;
  padding: 24px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}

.site-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px rgba(0,0,0,0.08);
  border-color: #bbdefb;
}

.card-top {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.site-icon {
  font-size: 2.5rem;
  background: #f8f9fa;
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
}

.site-info h3 {
  margin: 0 0 6px 0;
  font-size: 1.1rem;
  color: #333;
}

.region-badge {
  background: #e3f2fd;
  color: #1976D2;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 600;
}

.site-desc {
  color: #666;
  font-size: 0.95rem;
  line-height: 1.5;
  margin-bottom: 20px;
  min-height: 3rem; /* 保持高度一致 */
}

.card-footer {
  text-align: right;
}

.visit-link {
  color: #2196F3;
  font-weight: 600;
  font-size: 0.9rem;
}

/* Tips Section */
.tips-section {
  background: #fff8e1;
  border-radius: 12px;
  padding: 24px;
  border: 1px solid #ffe0b2;
}

.tips-section h4 {
  margin-top: 0;
  color: #f57c00;
  display: flex;
  align-items: center;
  gap: 8px;
}

.tips-section ul {
  margin: 0;
  padding-left: 20px;
  color: #5d4037;
}

.tips-section li {
  margin-bottom: 8px;
  line-height: 1.5;
}
</style>