<!-- src/components/ComparisonTableEditor.vue -->
<template>
  <div class="comparison-table-editor">
    <div class="overflow-x-auto">
      <table class="min-w-full border-collapse border border-gray-300">
        <thead class="bg-gray-100">
          <tr>
            <th class="border border-gray-300 px-4 py-2 text-left">技術特徵 ID</th>
            <th class="border border-gray-300 px-4 py-2 text-left">系爭專利技術特徵</th>
            <th class="border border-gray-300 px-4 py-2 text-left">證據專利揭露</th>
            <th class="border border-gray-300 px-4 py-2 text-left">證據位置</th>
            <th class="border border-gray-300 px-4 py-2 text-left">揭露程度</th>
            <th class="border border-gray-300 px-4 py-2 text-left">相似度</th>
            <th class="border border-gray-300 px-4 py-2 text-left">差異說明</th>
            <th class="border border-gray-300 px-4 py-2 text-center">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, index) in localTable" :key="index" class="hover:bg-gray-50">
            <td class="border border-gray-300 px-2 py-2">
              <input 
                v-model="row.target_feature_id" 
                class="w-20 px-2 py-1 border rounded text-sm"
                placeholder="A"
              />
            </td>
            <td class="border border-gray-300 px-2 py-2">
              <textarea 
                v-model="row.target_description" 
                class="w-full px-2 py-1 border rounded text-sm"
                rows="2"
                placeholder="系爭專利的技術特徵描述"
              ></textarea>
            </td>
            <td class="border border-gray-300 px-2 py-2">
              <textarea 
                v-model="row.evidence_description" 
                class="w-full px-2 py-1 border rounded text-sm"
                rows="2"
                placeholder="證據專利的揭露內容"
              ></textarea>
            </td>
            <td class="border border-gray-300 px-2 py-2">
              <input 
                v-model="row.evidence_location" 
                class="w-full px-2 py-1 border rounded text-sm"
                placeholder="請求項 1，段落 [0015]"
              />
            </td>
            <td class="border border-gray-300 px-2 py-2">
              <select 
                v-model="row.disclosure_level" 
                class="w-full px-2 py-1 border rounded text-sm"
              >
                <option value="Disclosed">✅ 已揭露</option>
                <option value="Partially Disclosed">⚠️ 部分揭露</option>
                <option value="Suggested">💡 暗示</option>
                <option value="Not Disclosed">❌ 未揭露</option>
              </select>
            </td>
            <td class="border border-gray-300 px-2 py-2">
              <input 
                v-model.number="row.similarity_score" 
                type="number" 
                step="0.1" 
                min="0" 
                max="1"
                class="w-20 px-2 py-1 border rounded text-sm"
              />
            </td>
            <td class="border border-gray-300 px-2 py-2">
              <textarea 
                v-model="row.notes" 
                class="w-full px-2 py-1 border rounded text-sm"
                rows="2"
                placeholder="差異說明或備註"
              ></textarea>
            </td>
            <td class="border border-gray-300 px-2 py-2 text-center">
              <button 
                @click="deleteRow(index)" 
                class="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
              >
                刪除
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <div class="mt-4 flex justify-between items-center">
      <button 
        @click="addRow" 
        class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-2"
      >
        <span>➕</span> 新增技術特徵
      </button>
      
      <div class="text-sm text-gray-500">
        共 {{ localTable.length }} 個技術特徵
      </div>
    </div>
    
    <!-- 修改說明（選填） -->
    <div class="mt-6 p-4 bg-gray-50 rounded-lg">
      <label class="block text-sm font-bold text-gray-700 mb-2">
        修改說明（選填）
      </label>
      <textarea 
        v-model="modificationIntent"
        @input="emitModificationIntent"
        class="w-full px-3 py-2 border rounded-lg text-sm"
        rows="3"
        placeholder="請說明您修改比對表的原因或意圖，例如：&#10;• 調整證據 1 的揭露位置，更精確地對應到段落 [0023]&#10;• 將特徵 B 的揭露程度從「已揭露」改為「部分揭露」，因為證據專利僅揭露上位概念&#10;• 新增特徵 E，這是系爭專利的核心技術特徵"
      ></textarea>
      <p class="text-xs text-gray-500 mt-2">
        💡 這些說明將協助 AI 更精準地重新撰寫理由書
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: { type: Array, required: true }
})

const emit = defineEmits(['update:modelValue', 'input', 'update:modificationIntent'])

const localTable = ref([...props.modelValue])
const modificationIntent = ref('')

// 監聽本地表格變化
watch(localTable, (newVal) => {
  emit('update:modelValue', newVal)
  emit('input')
}, { deep: true })

// 發送修改說明
const emitModificationIntent = () => {
  emit('update:modificationIntent', modificationIntent.value)
}

// 新增行
const addRow = () => {
  localTable.value.push({
    target_feature_id: '',
    target_description: '',
    evidence_feature_id: '',
    evidence_description: '',
    evidence_location: '',
    disclosure_level: 'Not Disclosed',
    similarity_score: 0,
    notes: ''
  })
}

// 刪除行
const deleteRow = (index) => {
  if (confirm('確定要刪除這個技術特徵嗎？')) {
    localTable.value.splice(index, 1)
  }
}
</script>

<style scoped>
.comparison-table-editor {
  width: 100%;
}

table {
  font-size: 0.875rem;
}

th {
  font-weight: 600;
  background-color: #f3f4f6;
}

input, textarea, select {
  font-size: 0.875rem;
}

input:focus, textarea:focus, select:focus {
  outline: none;
  border-color: #3b82f6;
  ring: 2px;
  ring-color: #3b82f6;
}
</style>
