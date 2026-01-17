<!-- src/views/auth/Login.vue -->
<template>
  <div class="login-wrapper">
    <div class="login-card">
      <div class="header">
        <h2 class="title">我的雲端AI專利管理師</h2>
        <p class="subtitle">Cloud Patent Office</p>
      </div>

      <div v-if="message" :class="['alert', isError ? 'alert-error' : 'alert-success']">
        {{ message }}
      </div>

      <form @submit.prevent="handleAuth" class="auth-form">
        
        <div class="form-group">
          <label for="email">電子信箱</label>
          <!-- 修改處 1: 加入 name="email" 和 id="email" -->
          <input 
            id="email"
            name="email"
            type="email" 
            v-model="email" 
            placeholder="請輸入 Email" 
            required 
            :disabled="loading"
          />
        </div>

        <div class="form-group">
          <label for="password">密碼</label>
          <!-- 修改處 2: 加入 name="password" 和 id="password" -->
          <input 
            id="password"
            name="password"
            type="password" 
            v-model="password" 
            placeholder="請輸入密碼 (至少 6 碼)" 
            required 
            minlength="6"
            :disabled="loading"
          />
        </div>

        <!-- 修改處 3: 加入 name="submit-btn" 確保按鈕也能被精準抓到 -->
        <button type="submit" name="submit-btn" class="btn-submit" :disabled="loading">
          <span v-if="loading">⏳ 處理中...</span>
          <span v-else>{{ isLoginMode ? '登入系統' : '註冊新帳號' }}</span>
        </button>

      </form>

      <div class="toggle-mode">
        <p v-if="isLoginMode">
          還沒有帳號嗎？ 
          <a href="#" @click.prevent="toggleMode">立即註冊</a>
        </p>
        <p v-else>
          已經有帳號了？ 
          <a href="#" @click.prevent="toggleMode">返回登入</a>
        </p>
      </div>
      
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../../supabase' 
import { useUserStore } from '../../stores/user'

const router = useRouter()
const userStore = useUserStore()

// 狀態變數
const email = ref('')
const password = ref('')
const loading = ref(false)
const message = ref('')
const isError = ref(false)
const isLoginMode = ref(true) // 預設為登入模式

// 切換模式 (登入 <-> 註冊)
const toggleMode = () => {
  isLoginMode.value = !isLoginMode.value
  message.value = ''
  isError.value = false
}

// 處理送出
const handleAuth = async () => {
  loading.value = true
  message.value = ''
  isError.value = false

  try {
    if (isLoginMode.value) {
      // === 登入流程 ===
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.value,
        password: password.value
      })
      
      if (error) throw error
      
      // 登入成功
      userStore.setUser(data.user)
      router.push('/') // 跳轉到首頁或 Dashboard
      
    } else {
      // === 註冊流程 ===
      const { data, error } = await supabase.auth.signUp({
        email: email.value,
        password: password.value
      })

      if (error) throw error

      // 註冊成功後的處理
      if (data.user && !data.session) {
        // 如果 Supabase 設定開啟了 "Confirm Email"，會進入這裡
        message.value = '註冊成功！請前往信箱點擊驗證連結以啟用帳號。'
        isError.value = false
      } else {
        // 如果無需驗證，直接登入
        userStore.setUser(data.user)
        message.value = '註冊成功！正在進入系統...'
        setTimeout(() => router.push('/'), 1000)
      }
    }

  } catch (error) {
    isError.value = true
    if (error.message.includes('Invalid login credentials')) {
      message.value = '帳號或密碼錯誤，請重試。'
    } else if (error.message.includes('User already registered')) {
      message.value = '此 Email 已經註冊過了，請直接登入。'
    } else {
      message.value = '錯誤：' + error.message
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #f1f5f9; /* 淡灰色背景 */
}

.login-card {
  background: white;
  width: 100%;
  max-width: 400px;
  padding: 2.5rem;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.header {
  text-align: center;
  margin-bottom: 2rem;
}

.title {
  font-size: 1.8rem;
  font-weight: 800;
  color: #1e293b;
  margin: 0;
}

.subtitle {
  color: #64748b;
  font-size: 0.9rem;
  letter-spacing: 1px;
  text-transform: uppercase;
  margin-top: 0.5rem;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-size: 0.9rem;
  font-weight: 600;
  color: #334155;
}

.form-group input {
  padding: 0.75rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 1rem;
  transition: border-color 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.btn-submit {
  margin-top: 1rem;
  padding: 0.75rem;
  background-color: #2563eb;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-submit:hover:not(:disabled) {
  background-color: #1d4ed8;
}

.btn-submit:disabled {
  background-color: #94a3b8;
  cursor: not-allowed;
}

.toggle-mode {
  text-align: center;
  margin-top: 1.5rem;
  font-size: 0.9rem;
  color: #64748b;
}

.toggle-mode a {
  color: #2563eb;
  text-decoration: none;
  font-weight: 600;
}

.toggle-mode a:hover {
  text-decoration: underline;
}

/* 訊息樣式 */
.alert {
  padding: 0.75rem;
  border-radius: 6px;
  margin-bottom: 1.5rem;
  font-size: 0.9rem;
  text-align: center;
}
.alert-error {
  background-color: #fef2f2;
  color: #b91c1c;
  border: 1px solid #fecaca;
}
.alert-success {
  background-color: #ecfdf5;
  color: #047857;
  border: 1px solid #a7f3d0;
}
</style>