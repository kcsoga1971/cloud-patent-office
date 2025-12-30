<!-- src/layouts/MainLayout.vue -->
<template>
  <div class="app-container">
    <aside class="sidebar">
      <div class="logo">
        <span>⚖️ 雲端專利</span>
      </div>
      
      <nav class="nav-menu">
        <!-- 主要功能 -->
        <router-link to="/dashboard" class="nav-item">
          <span class="icon">🏠</span> 案件總覽
        </router-link>
        <router-link to="/projects" class="nav-item">
          <span class="icon">📁</span> 專案管理
        </router-link>
        
        <!-- AI 服務中心 -->
        <div class="menu-label">AI 服務中心</div>
        
        <!-- 🎯 改為連結到工作流程頁面 -->
        <router-link to="/services/workflow" class="nav-item">
          <span class="nav-icon">📋</span>
          <span class="nav-text">專利撰寫工作流程</span>
        </router-link>
        
        <router-link to="/services/search" class="nav-item">
          <span class="icon">🔍</span> 專利詳細檢索
        </router-link>
        
        <router-link to="/services/design-around-workflow" class="nav-item">
          <span class="icon">🎯</span> 專利迴避設計
        </router-link>
        
        <router-link to="/services/defense-workflow" class="nav-item">
          🛡️ 專利答辯
        </router-link>
        
        <router-link to="/services/analysis" class="nav-item">
          <span class="icon">📊</span> 專利分析
        </router-link>
        
        <router-link to="/services/infringement-workflow" class="nav-item">
          <span class="icon">🛡️</span> 專利侵權分析
        </router-link>
        
        <router-link to="/services/valuation" class="nav-item">
          <span class="icon">💎</span> 專利鑑價
        </router-link>
        
        <router-link to="/services/invalidation" class="nav-item">
          <span class="icon">⚔️</span> 專利舉發
        </router-link>
        
        <router-link to="/services/case-management" class="nav-item">
          <span class="icon">📋</span> 專利案件管理
        </router-link>
        
        <!-- 系統功能 -->
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
/* 保持原有樣式 */
.app-container {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.sidebar {
  width: 260px;
  background-color: #1e293b;
  color: #f8fafc;
  display: flex;
  flex-direction: column;
  padding: 1.5rem;
  border-right: 1px solid #334155;
  overflow-y: auto; /* 🎯 新增：允許側邊欄滾動 */
}

.logo {
  font-size: 1.25rem;
  font-weight: bold;
  margin-bottom: 2.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.nav-menu {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.menu-label {
  font-size: 0.75rem;
  color: #94a3b8;
  margin-top: 1.5rem;
  margin-bottom: 0.5rem;
  padding-left: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600; /* 🎯 新增：讓標籤更明顯 */
}

.nav-item {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  color: #cbd5e1;
  text-decoration: none;
  border-radius: 0.5rem;
  transition: all 0.2s;
  font-size: 0.95rem;
}

.nav-item .icon {
  margin-right: 0.75rem;
  font-size: 1.1rem; /* 🎯 圖示稍微大一點 */
}

.nav-item:hover {
  background-color: #334155;
  color: white;
}

.router-link-active {
  background-color: #2563eb;
  color: white;
}

.user-panel {
  border-top: 1px solid #334155;
  padding-top: 1.5rem;
  margin-top: 1rem;
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
}

.logout-btn:hover {
  background-color: #ef4444;
  color: white;
}

.main-content {
  flex: 1;
  background-color: #f9fafb;
  overflow-y: auto;
  padding: 2rem;
}
</style>
