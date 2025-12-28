<!-- src/views/services/DesignAround.vue -->
<template>
  <div class="service-placeholder">
    <div class="icon">📝</div>
    <h1>專利迴避設計</h1>
    <p>此功能開發中，敬請期待...</p>
    <button @click="router.push('/dashboard')" class="btn-back">
      返回案件總覽
    </button>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
const router = useRouter()
</script>

<style scoped>
.service-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  text-align: center;
}

.icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

h1 {
  font-size: 2rem;
  color: #1e293b;
  margin-bottom: 0.5rem;
}

p {
  color: #64748b;
  margin-bottom: 2rem;
}

.btn-back {
  padding: 0.75rem 1.5rem;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s;
}

.btn-back:hover {
  background: #1d4ed8;
}
</style>