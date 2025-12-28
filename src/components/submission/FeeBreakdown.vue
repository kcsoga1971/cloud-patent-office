<!-- src/components/submission/FeeBreakdown.vue -->
<script setup>
defineProps({
  feeBreakdown: {
    type: Object,
    required: true
  }
})

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('zh-TW').format(amount)
}
</script>

<template>
  <div class="fee-breakdown">
    <div class="card">
      <div class="card-header">
        <h4>💰 規費明細</h4>
      </div>
      <div class="card-body">
        <div class="fee-items">
          <div class="fee-item">
            <span class="fee-label">基本申請費 (含10項請求項)</span>
            <span class="fee-value">NT$ {{ formatCurrency(feeBreakdown.base_fee) }}</span>
          </div>
          
          <div class="fee-item">
            <span class="fee-label">實體審查費 (含10項請求項)</span>
            <span class="fee-value">NT$ {{ formatCurrency(feeBreakdown.exam_fee) }}</span>
          </div>
          
          <div v-if="feeBreakdown.extra_claims > 0" class="fee-item highlight">
            <span class="fee-label">超過10項請求項加收</span>
            <span class="fee-value">NT$ {{ formatCurrency(feeBreakdown.extra_claims) }}</span>
          </div>
          
          <div class="fee-item total">
            <span class="fee-label">總計</span>
            <span class="fee-value">NT$ {{ formatCurrency(feeBreakdown.total) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fee-breakdown {
  margin-bottom: 1.5rem;
}

.card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  overflow: hidden;
}

.card-header {
  padding: 1rem 1.5rem;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

.card-header h4 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.card-body {
  padding: 1.5rem;
}

.fee-items {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.fee-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
}

.fee-item.highlight {
  color: #f59e0b;
}

.fee-item.total {
  padding-top: 0.75rem;
  border-top: 2px solid #e5e7eb;
  font-weight: 700;
  font-size: 1.125rem;
  color: #3b82f6;
}

.fee-label {
  flex: 1;
}

.fee-value {
  font-family: 'Courier New', monospace;
  font-weight: 600;
}
</style>
