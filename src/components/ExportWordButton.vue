<template>
  <button
    @click="exportWord"
    :disabled="isExporting || !canExport"
    class="btn-export"
  >
    <span v-if="isExporting">
      <i class="fas fa-spinner fa-spin"></i> 匯出中...
    </span>
    <span v-else>
      <i class="fas fa-file-word"></i> 匯出 Word
    </span>
  </button>
</template>

<script setup>
import { ref, computed } from 'vue'
import { supabase } from '@/supabase'

const props = defineProps({
  jobId: {
    type: String,
    required: true
  },
  type: {
    type: String,
    default: 'invention', // 'invention' 或 'utility'
    validator: (value) => ['invention', 'utility'].includes(value)
  },
  phase: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['export-success', 'export-error'])

const isExporting = ref(false)

const canExport = computed(() => {
  return props.phase === 'phase2_completed'
})

const exportWord = async () => {
  if (!canExport.value) {
    alert('請先完成專利撰寫（Phase 2）')
    return
  }

  isExporting.value = true

  try {
    console.log('🚀 開始匯出 Word...')
    console.log('📋 Job ID:', props.jobId)
    console.log('📋 Type:', props.type)

    const response = await fetch(import.meta.env.VITE_N8N_WEBHOOK_PHASE3_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job_id: props.jobId,
        type: props.type
      })
    })

    if (!response.ok) {
      throw new Error(`匯出失敗: ${response.status}`)
    }

    const result = await response.json()

    console.log('✅ 匯出成功:', result)

    // 下載檔案
    if (result.download_url) {
      window.open(result.download_url, '_blank')
    }

    emit('export-success', result)

  } catch (error) {
    console.error('❌ 匯出錯誤:', error)
    emit('export-error', error)
    alert('匯出失敗: ' + error.message)
  } finally {
    isExporting.value = false
  }
}
</script>

<style scoped>
.btn-export {
  padding: 12px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-export:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-export:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-export i {
  margin-right: 8px;
}
</style>
