<!-- src/components/submission/StepCard.vue -->
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

const getStatusIcon = (status) => {
  switch (status) {
    case 'auto_generated': return '✅'
    case 'need_prepare': return '⚠️'
    case 'optional': return 'ℹ️'
    default: return '•'
  }
}
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
        
        <!-- 檢查清單 -->
        <div v-if="step.checklist" class="checklist">
          <div v-for="(item, idx) in step.checklist" :key="idx" class="checklist-item">
            <span class="check-icon">{{ getStatusIcon(item.status) }}</span>
            <span class="check-text" :class="{ required: item.required }">
              {{ item.item }}
            </span>
            <span v-if="!item.required" class="badge">選填</span>
          </div>
        </div>
        
        <!-- 要求列表 -->
        <div v-if="step.requirements" class="requirements">
          <h5>規範要求:</h5>
          <ul>
            <li v-for="(req, idx) in step.requirements" :key="idx">{{ req }}</li>
          </ul>
        </div>
        
        <!-- 動作列表 -->
        <div v-if="step.actions" class="actions">
          <div v-for="(action, idx) in step.actions" :key="idx" class="action-item">
            <div class="action-header">
              <strong>{{ action.action }}</strong>
              <span class="action-timing">{{ action.timing }}</span>
            </div>
            <p v-if="action.description" class="action-desc">{{ action.description }}</p>
            <a v-if="action.url" :href="action.url" target="_blank" class="action-link">
              前往網站 →
            </a>
            <ul v-if="action.notes" class="action-notes">
              <li v-for="(note, noteIdx) in action.notes" :key="noteIdx">{{ note }}</li>
            </ul>
          </div>
        </div>
        
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
                <div v-if="method.bank"><strong>銀行:</strong> {{ method.bank }}</div>
              </div>
              
              <ul v-if="method.notes" class="method-notes">
                <li v-for="(note, noteIdx) in method.notes" :key="noteIdx">{{ note }}</li>
              </ul>
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
        
        <!-- 聯絡資訊 -->
        <div v-if="step.contact" class="contact-info">
          <h5>聯絡資訊</h5>
          <div><strong>電話:</strong> {{ step.contact.phone }}</div>
          <div><strong>Email:</strong> {{ step.contact.email }}</div>
          <div><strong>服務時間:</strong> {{ step.contact.hours }}</div>
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
.step-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  margin-bottom: 1rem;
  overflow: hidden;
}

.step-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  cursor: pointer;
  transition: background 0.2s;
}

.step-header:hover {
  background: #f9fafb;
}

.step-number {
  width: 40px;
  height: 40px;
  background: #3b82f6;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.125rem;
  flex-shrink: 0;
}

.step-title {
  flex: 1;
  font-weight: 600;
  font-size: 1.125rem;
}

.expand-icon {
  transition: transform 0.3s;
  color: #6b7280;
}

.expand-icon.expanded {
  transform: rotate(180deg);
}

.step-content {
  padding: 0 1.5rem 1.5rem;
}

.step-description {
  color: #6b7280;
  margin-bottom: 1.5rem;
}

.checklist {
  margin-bottom: 1.5rem;
}

.checklist-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0;
}

.check-icon {
  font-size: 1.25rem;
}

.check-text.required {
  font-weight: 600;
}

.badge {
  padding: 0.125rem 0.5rem;
  background: #e5e7eb;
  border-radius: 4px;
  font-size: 0.75rem;
  color: #6b7280;
}

.requirements {
  background: #f9fafb;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.requirements h5 {
  margin: 0 0 0.5rem 0;
  font-weight: 600;
}

.requirements ul {
  margin: 0;
  padding-left: 1.25rem;
}

.requirements li {
  margin-bottom: 0.25rem;
}

.actions {
  margin-bottom: 1.5rem;
}

.action-item {
  border-left: 4px solid #3b82f6;
  padding-left: 1rem;
  margin-bottom: 1rem;
}

.action-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.action-timing {
  font-size: 0.875rem;
  color: #6b7280;
}

.action-desc {
  margin: 0.5rem 0;
  font-size: 0.875rem;
}

.action-link {
  color: #3b82f6;
  text-decoration: none;
  font-size: 0.875rem;
}

.action-link:hover {
  text-decoration: underline;
}

.action-notes {
  margin: 0.5rem 0 0 0;
  padding-left: 1.25rem;
  font-size: 0.875rem;
  color: #6b7280;
}

.payment-section {
  margin-bottom: 1.5rem;
}

.payment-methods {
  display: grid;
  gap: 1rem;
  margin-top: 1rem;
}

.payment-method {
  background: #f9fafb;
  padding: 1rem;
  border-radius: 8px;
}

.payment-method h5 {
  margin: 0 0 0.5rem 0;
  font-weight: 600;
}

.method-info {
  margin: 0.5rem 0;
  font-size: 0.875rem;
}

.method-account {
  background: white;
  padding: 0.75rem;
  border-radius: 4px;
  margin: 0.5rem 0;
  font-family: 'Courier New', monospace;
  font-size: 0.875rem;
}

.method-notes {
  margin: 0.5rem 0 0 0;
  padding-left: 1.25rem;
  font-size: 0.875rem;
  color: #6b7280;
}

.mailing-info {
  margin-bottom: 1.5rem;
}

.info-box {
  background: #f9fafb;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.info-box div {
  margin-bottom: 0.5rem;
}

.envelope-notes h5 {
  margin: 0 0 0.5rem 0;
  font-weight: 600;
}

.envelope-notes ul {
  margin: 0;
  padding-left: 1.25rem;
}

.contact-info {
  background: #f9fafb;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.contact-info h5 {
  margin: 0 0 0.5rem 0;
  font-weight: 600;
}

.contact-info div {
  margin-bottom: 0.25rem;
  font-size: 0.875rem;
}

.notes {
  margin-top: 1rem;
}

.alert {
  padding: 1rem;
  border-radius: 8px;
  display: flex;
  gap: 0.75rem;
}

.alert-info {
  background: #dbeafe;
  border: 1px solid #3b82f6;
}

.alert-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
}

.alert ul {
  margin: 0;
  padding-left: 1.25rem;
  flex: 1;
}

.alert li {
  margin-bottom: 0.25rem;
}

.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease;
  max-height: 2000px;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
}
</style>
