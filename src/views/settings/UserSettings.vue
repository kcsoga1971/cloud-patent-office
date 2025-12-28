<template>
  <div class="settings-page">
    <div class="page-header">
      <h1>⚙️ 帳戶設定</h1>
      <p>管理您的個人資訊和偏好設定</p>
    </div>

    <div class="settings-container">
      <!-- 個人資訊 -->
      <div class="settings-section">
        <h2>👤 個人資訊</h2>
        <div class="form-group">
          <label>姓名</label>
          <input type="text" v-model="userInfo.name" placeholder="請輸入姓名">
        </div>
        <div class="form-group">
          <label>Email</label>
          <input type="email" v-model="userInfo.email" disabled>
        </div>
        <div class="form-group">
          <label>公司/組織</label>
          <input type="text" v-model="userInfo.company" placeholder="請輸入公司名稱">
        </div>
        <button class="btn-primary">儲存變更</button>
      </div>

      <!-- 通知設定 -->
      <div class="settings-section">
        <h2>🔔 通知設定</h2>
        <div class="toggle-group">
          <label>
            <input type="checkbox" v-model="notifications.email">
            <span>Email 通知</span>
          </label>
          <label>
            <input type="checkbox" v-model="notifications.browser">
            <span>瀏覽器推播</span>
          </label>
          <label>
            <input type="checkbox" v-model="notifications.updates">
            <span>產品更新通知</span>
          </label>
        </div>
      </div>

      <!-- 安全設定 -->
      <div class="settings-section">
        <h2>🔒 安全設定</h2>
        <div class="form-group">
          <label>變更密碼</label>
          <input type="password" placeholder="目前密碼">
          <input type="password" placeholder="新密碼">
          <input type="password" placeholder="確認新密碼">
        </div>
        <button class="btn-primary">更新密碼</button>
      </div>

      <!-- 偏好設定 -->
      <div class="settings-section">
        <h2>🎨 偏好設定</h2>
        <div class="form-group">
          <label>介面語言</label>
          <select v-model="preferences.language">
            <option value="zh-TW">繁體中文</option>
            <option value="zh-CN">简体中文</option>
            <option value="en">English</option>
          </select>
        </div>
        <div class="form-group">
          <label>主題模式</label>
          <select v-model="preferences.theme">
            <option value="light">淺色模式</option>
            <option value="dark">深色模式</option>
            <option value="auto">自動</option>
          </select>
        </div>
      </div>

      <!-- 危險區域 -->
      <div class="settings-section danger-zone">
        <h2>⚠️ 危險區域</h2>
        <p>以下操作無法復原，請謹慎操作</p>
        <button class="btn-danger">刪除帳戶</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const userInfo = ref({
  name: '',
  email: 'user@example.com',
  company: ''
})

const notifications = ref({
  email: true,
  browser: false,
  updates: true
})

const preferences = ref({
  language: 'zh-TW',
  theme: 'light'
})
</script>

<style scoped>
.settings-page {
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 2rem;
}

.page-header h1 {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.page-header p {
  color: #666;
}

.settings-container {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.settings-section {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.settings-section h2 {
  margin-bottom: 1.5rem;
  font-size: 1.25rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1rem;
  margin-bottom: 0.5rem;
}

.form-group input:disabled {
  background: #f5f5f5;
  cursor: not-allowed;
}

.toggle-group {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.toggle-group label {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
}

.toggle-group input[type="checkbox"] {
  width: auto;
  cursor: pointer;
}

.btn-primary {
  background: #667eea;
  color: white;
  border: none;
  padding: 0.75rem 2rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.3s;
}

.btn-primary:hover {
  background: #5568d3;
}

.danger-zone {
  border: 2px solid #f44336;
}

.danger-zone p {
  color: #666;
  margin-bottom: 1rem;
}

.btn-danger {
  background: #f44336;
  color: white;
  border: none;
  padding: 0.75rem 2rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.3s;
}

.btn-danger:hover {
  background: #d32f2f;
}
</style>
