<!-- src/views/NotFound.vue -->
<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const goHome = () => {
  router.push({ name: 'Home' })
}

const goBack = () => {
  router.back()
}
</script>

<template>
  <div class="not-found-page">
    <div class="not-found-container">
      <div class="error-code">404</div>
      <h1>找不到頁面</h1>
      <p>抱歉，您訪問的頁面不存在或已被移除。</p>
      
      <div class="action-buttons">
        <button @click="goBack" class="btn-back">
          ← 返回上一頁
        </button>
        <button @click="goHome" class="btn-home">
          🏠 回到首頁
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.not-found-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.not-found-container {
  text-align: center;
  background: white;
  padding: 60px 40px;
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  max-width: 500px;
  width: 100%;
}

.error-code {
  font-size: 120px;
  font-weight: 900;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1;
  margin-bottom: 20px;
}

h1 {
  font-size: 32px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 16px 0;
}

p {
  font-size: 16px;
  color: #666;
  margin: 0 0 40px 0;
  line-height: 1.6;
}

.action-buttons {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
}

.btn-back,
.btn-home {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-back {
  background: #f3f4f6;
  color: #1a1a1a;
}

.btn-back:hover {
  background: #e5e7eb;
  transform: translateY(-2px);
}

.btn-home {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-home:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

@media (max-width: 768px) {
  .not-found-container {
    padding: 40px 24px;
  }
  
  .error-code {
    font-size: 80px;
  }
  
  h1 {
    font-size: 24px;
  }
  
  .action-buttons {
    flex-direction: column;
  }
  
  .btn-back,
  .btn-home {
    width: 100%;
  }
}
</style>
