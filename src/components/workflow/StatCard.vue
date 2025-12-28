<!-- src/components/workflow/StatCard.vue -->
<script setup>
defineProps({
  icon: String,
  title: String,
  count: Number,
  description: String,
  disabled: {
    type: Boolean,
    default: false
  }
})
</script>

<template>
  <div class="card" :class="{ disabled }">
    <div class="card-icon">{{ icon }}</div>
    <div class="card-title">{{ title }}</div>
    <div class="card-count">{{ count }}</div>
    <div class="card-desc">{{ description }}</div>
  </div>
</template>

<style scoped>
.card {
  background: white;
  border-radius: 16px;
  padding: 32px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  transition: all 0.3s;
}

.card:not(.disabled):hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.12);
}

.card.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.card-icon {
  font-size: 56px;
  margin-bottom: 16px;
}

.card-title {
  font-size: 18px;
  font-weight: bold;
  color: #333;
  margin-bottom: 8px;
}

.card-count {
  font-size: 48px;
  font-weight: bold;
  color: #667eea;
  margin: 12px 0;
}

.card-desc {
  font-size: 14px;
  color: #666;
}
</style>
