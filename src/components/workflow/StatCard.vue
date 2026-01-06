<!-- src/components/submission/StepCard.vue - 簡化版 -->
<script setup>
import { ref } from 'vue'
import FeeBreakdown from './FeeBreakdown.vue'

defineProps({
  step: {
    type: Object,
    required: true
  }
})

const isExpanded = ref(false)
</script>

<template>
  <div class="step-card">
    <div class="step-header" @click="isExpanded = !isExpanded">
      <div class="step-number">{{ step.step }}</div>
      <div class="step-title">{{ step.title }}</div>
      <div class="expand-icon" :class="{ expanded: isExpanded }">▼</div>
    </div>
    
    <transition name="expand">
      <div v-if="isExpanded" class="step-content">
        <p class="step-description">{{ step.description }}</p>
        
        <!-- 繳費方式 -->
        <div v-if="step.payment_methods" class="payment-section">
          <FeeBreakdown v-if="step.fee_breakdown" :feeBreakdown="step.fee_breakdown" />
          
          <div class="payment-methods">
            <div v-for="(method, idx) in step.payment_methods" :key="idx" class="payment-method">
              <h5>{{ method.method }}</h5>
              <p>{{ method.description }}</p>
              
              <div v-if="method.address" class="method-info">
                <strong>地址:</strong> {{ method.address }}
              </div>
              <div v-if="method.hours" class="method-info">
                <strong>時間:</strong> {{ method.hours }}
              </div>
              <div v-if="method.account" class="method-account">
                <div><strong>帳號:</strong> {{ method.account }}</div>
                <div><strong>戶名:</strong> {{ method.account_name }}</div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 郵寄資訊 -->
        <div v-if="step.mailing_info" class="mailing-info">
          <div class="info-box">
            <div><strong>收件人:</strong> {{ step.mailing_info.recipient }}</div>
            <div><strong>地址:</strong> {{ step.mailing_info.address }}</div>
          </div>
          <div class="envelope-notes">
            <h5>信封注意事項:</h5>
            <ul>
              <li v-for="(note, idx) in step.mailing_info.envelope_notes" :key="idx">{{ note }}</li>
            </ul>
          </div>
        </div>
        
        <!-- 注意事項 -->
        <div v-if="step.notes && step.notes.length > 0" class="notes">
          <div class="alert alert-info">
            <div class="alert-icon">ℹ️</div>
            <ul>
              <li v-for="(note, idx) in step.notes" :key="idx">{{ note }}</li>
            </ul>
          </div>
        </div>
      </div>
    </transition>
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
