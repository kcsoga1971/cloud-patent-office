<!-- src/layouts/MainLayout.vue -->
<template>
  <div class="app-container">
    <aside class="sidebar">
      <div class="logo">
        <span>⚖️ 雲端專利</span>
      </div>
      
      <nav class="nav-menu">
        <router-link to="/dashboard" class="nav-item">
          <span class="icon">🏠</span> 儀表板首頁
        </router-link>
        <router-link to="/projects" class="nav-item">
          <span class="icon">📁</span> 專案管理
        </router-link>
        
        <div class="menu-label">AI 服務中心</div>
        
        <router-link to="/services/drafting-workflow" class="nav-item">
          <span class="nav-icon">📋</span> 專利撰寫工作流程
        </router-link>
        
        <router-link to="/services/patent-search" class="nav-item">
          <span class="icon">🔍</span> 各國專利檢索
        </router-link>
        
        <router-link to="/services/design-around" class="nav-item">
          <span class="icon">🎯</span> 專利迴避設計
        </router-link>
        
        <router-link to="/services/defense-workflow" class="nav-item">
          <span class="icon">🛡️</span> 專利答辯
        </router-link>

        <router-link to="/services/portfolio" class="nav-item">
          <span class="icon">♟️</span> 專利佈局
        </router-link>        
        
        <router-link to="/services/patent-analysis-workflow" class="nav-item">
          <span class="icon">📊</span> 專利分析
        </router-link>
        
        <router-link to="/services/infringement-workflow" class="nav-item">
          <span class="icon">⚖️</span> 專利侵權分析
        </router-link>
        
        <router-link to="/services/valuation-workflow" class="nav-item">
          <span class="icon">💎</span> 專利鑑價
        </router-link>
        
        <router-link to="/services/invalidation-workflow" class="nav-item">
          <span class="icon">⚔️</span> 專利舉發
        </router-link>

        <router-link to="/services/translation/workflow" class="nav-item">
          <span class="icon">🌐</span> 專利翻譯
        </router-link>

        <router-link to="/services/case-management" class="nav-item">
          <span class="icon">🗂️</span> 專利案件管理
        </router-link>

        <div class="menu-label">知識與學習</div>

        <router-link to="/knowledge" class="nav-item">
          <span class="icon">📚</span> 專利知識庫
        </router-link>
        
        <div class="menu-label">系統設定</div>
        
        <router-link to="/credits" class="nav-item">
          <span class="icon">💰</span> 點數管理
        </router-link>
        
        <router-link to="/settings" class="nav-item">
          <span class="icon">⚙️</span> 設定
        </router-link>
      </nav>

      <div class="user-panel">
        <div class="user-info" v-if="userStore.user">
          <div class="email">{{ userStore.user.email }}</div>
          <div class="credits">
            剩餘點數: 
            <span class="credit-count">
              {{ userStore.profile?.credits_balance ?? '--' }}
            </span>
          </div>
        </div>
        <button @click="handleLogout" class="logout-btn">登出系統</button>
      </div>
    </aside>

    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { useUserStore } from '../stores/user'
import { useRouter } from 'vue-router'

const userStore = useUserStore()
const router = useRouter()

const handleLogout = async () => {
  if (confirm('確定要登出嗎？')) {
    await userStore.signOut()
    router.push('/auth/login')
  }
}
</script>

<style scoped>
/* ========== 容器設定 ========== */
.app-container {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

/* ========== 側邊欄：固定式設計 ========== */
.sidebar {
  position: fixed; /* ✅ 固定在左側 */
  left: 0;
  top: 0;
  width: 260px;
  height: 100vh; /* ✅ 佔滿整個視窗高度 */
  background-color: #1e293b;
  color: #f8fafc;
  display: flex;
  flex-direction: column;
  padding: 1.5rem;
  border-right: 1px solid #334155;
  overflow-y: auto; /* ✅ 如果內容太多，允許側邊欄內部捲動 */
  z-index: 1000; /* ✅ 確保在最上層 */
}

/* 美化捲軸 */
.sidebar::-webkit-scrollbar {
  width: 6px;
}
.sidebar::-webkit-scrollbar-thumb {
  background-color: #334155;
  border-radius: 3px;
}
.sidebar::-webkit-scrollbar-track {
  background-color: transparent;
}

/* ========== Logo 區域 ========== */
.logo {
  font-size: 1.25rem;
  font-weight: bold;
  margin-bottom: 2rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0; /* ✅ 防止被壓縮 */
}

/* ========== 導航選單：均勻分配 ========== */
.nav-menu {
  flex: 1; /* ✅ 佔據剩餘空間 */
  display: flex;
  flex-direction: column;
  gap: 0.25rem; /* ✅ 減少間距，讓選項更緊湊 */
  overflow-y: auto; /* ✅ 如果選項太多，允許捲動 */
  padding-right: 0.5rem; /* ✅ 避免捲軸遮住文字 */
}

/* 隱藏 nav-menu 的捲軸 */
.nav-menu::-webkit-scrollbar {
  width: 4px;
}
.nav-menu::-webkit-scrollbar-thumb {
  background-color: #334155;
  border-radius: 2px;
}

/* ========== 分類標籤 ========== */
.menu-label {
  font-size: 0.7rem;
  color: #94a3b8;
  margin-top: 1rem;
  margin-bottom: 0.25rem;
  padding-left: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
  flex-shrink: 0; /* ✅ 防止被壓縮 */
}

/* ========== 導航項目 ========== */
.nav-item {
  display: flex;
  align-items: center;
  padding: 0.65rem 1rem; /* ✅ 減少上下間距 */
  color: #cbd5e1;
  text-decoration: none;
  border-radius: 0.5rem;
  transition: all 0.2s;
  font-size: 0.9rem; /* ✅ 稍微縮小字體 */
  flex-shrink: 0; /* ✅ 防止被壓縮 */
  white-space: nowrap; /* ✅ 防止文字換行 */
}

.nav-item .icon, 
.nav-item .nav-icon {
  margin-right: 0.75rem;
  font-size: 1rem;
  width: 1.5rem;
  text-align: center;
  flex-shrink: 0; /* ✅ 圖標不縮小 */
}

.nav-item:hover {
  background-color: #334155;
  color: white;
  transform: translateX(4px); /* ✅ 滑鼠懸停時微微右移 */
}

.router-link-active {
  background-color: #2563eb;
  color: white;
  font-weight: 600;
}

/* ========== 用戶面板：固定在底部 ========== */
.user-panel {
  border-top: 1px solid #334155;
  padding-top: 1rem;
  margin-top: 1rem;
  flex-shrink: 0; /* ✅ 防止被壓縮 */
}

.user-info {
  margin-bottom: 1rem;
}

.email {
  font-size: 0.85rem;
  color: #e2e8f0;
  margin-bottom: 0.25rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.credits {
  font-size: 0.8rem;
  color: #94a3b8;
}

.credit-count {
  color: #fbbf24;
  font-weight: bold;
}

.logout-btn {
  width: 100%;
  padding: 0.5rem;
  background-color: transparent;
  border: 1px solid #ef4444;
  color: #ef4444;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.9rem;
  font-weight: 500;
}

.logout-btn:hover {
  background-color: #ef4444;
  color: white;
}

/* ========== 主內容區域：自動適應 ========== */
.main-content {
  margin-left: 260px; /* ✅ 留出側邊欄的空間 */
  flex: 1;
  background-color: #f9fafb;
  overflow-y: auto;
  padding: 2rem;
  width: calc(100vw - 260px); /* ✅ 確保不超出視窗 */
}

/* ========== 響應式設計 ========== */
@media (max-width: 768px) {
  .sidebar {
    width: 220px; /* ✅ 手機版縮小側邊欄 */
  }
  
  .main-content {
    margin-left: 220px;
    width: calc(100vw - 220px);
    padding: 1rem;
  }
  
  .nav-item {
    font-size: 0.85rem;
    padding: 0.6rem 0.75rem;
  }
  
  .logo {
    font-size: 1.1rem;
  }
}

@media (max-width: 480px) {
  .sidebar {
    width: 200px;
  }
  
  .main-content {
    margin-left: 200px;
    width: calc(100vw - 200px);
  }
}
</style>

