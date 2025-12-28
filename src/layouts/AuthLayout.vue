<!-- src/layouts/AuthLayout.vue -->
<template>
  <div class="auth-layout">
    <div class="auth-card">
      <div class="brand">
        <h2>⚖️ 雲端專利事務所</h2>
        <p>AI 驅動的專利自動化專家</p>
      </div>
      <router-view />
    </div>
  </div>
</template>

<style scoped>
.auth-layout {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #f3f4f6; /* 淺灰色背景 */
  background-image: radial-gradient(#e5e7eb 1px, transparent 1px);
  background-size: 20px 20px;
}

.auth-card {
  background: white;
  padding: 3rem;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.05);
  width: 100%;
  max-width: 420px;
  text-align: center;
}

.brand {
  margin-bottom: 2rem;
}

.brand h2 {
  margin: 0;
  color: #111827;
  font-size: 1.5rem;
}

.brand p {
  margin: 0.5rem 0 0;
  color: #6b7280;
  font-size: 0.9rem;
}
</style>