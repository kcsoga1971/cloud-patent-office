<template>
  <div class="smart-tips" :class="currentLevel">
    <div class="tip-header">
      <span class="icon">{{ levelIcon }}</span>
      <h4>{{ title }}</h4>
      <button v-if="currentLevel !== 'novice'" @click="isExpanded = !isExpanded" class="toggle-btn">
        {{ isExpanded ? '收起' : '展開' }}
      </button>
    </div>

    <div v-if="isExpanded" class="tip-content">
      <ul>
        <li v-for="(tip, idx) in activeTips" :key="idx" v-html="tip"></li>
      </ul>
      
      <div class="recommendation">
        <span>📚 推薦閱讀：</span>
        <a @click.prevent="goToArticle" href="#">{{ recommendedArticle.title }}</a>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useKnowledgeStore } from '../stores/knowledge'
import { useRouter } from 'vue-router'

const props = defineProps({ type: String }) // e.g., 'drafting'
const store = useKnowledgeStore()
const router = useRouter()
const isExpanded = ref(true)

// 資料庫：包含不同等級的提示
const tipsDB = {
  drafting: {
    novice: [
      '<strong>什麼是請求項？</strong> 它是專利最重要的部分，定義了您的權利範圍。',
      '<strong>怎麼寫？</strong> 請用「條列式」列出您產品的所有零件。'
    ],
    practitioner: [
      '<strong>連接關係</strong>：請檢查每一個元件是否都有描述它與其他元件的連接方式。',
      '<strong>實施例擴充</strong>：AI 會根據您的描述生成多個實施例，請確認這些實施例是否涵蓋了變形設計。'
    ],
    strategist: [
      '<strong>功能性限定</strong>：考慮使用「功能手段用語 (Means-plus-function)」來擴大解釋範圍。',
      '<strong>上位概念化</strong>：檢查是否將「螺絲」寫死，應改為「固接元件」以涵蓋焊接、黏合等方式。'
    ]
  },
  // ... 其他類型的提示
}

const currentLevel = computed(() => store.currentLevel)

const activeTips = computed(() => {
  // 如果是大師級，預設可能不顯示，或是顯示極高深的內容
  if (currentLevel.value === 'master') return [] 
  return tipsDB[props.type]?.[currentLevel.value] || tipsDB[props.type]?.['novice']
})

const levelIcon = computed(() => {
  const icons = { novice: '🌱', practitioner: '🔨', strategist: '🧠', master: '👑' }
  return icons[currentLevel.value]
})

const title = computed(() => {
  const titles = {
    novice: '新手引導',
    practitioner: '實務技巧',
    strategist: '專家建議',
    master: '大師筆記'
  }
  return titles[currentLevel.value]
})

// 根據等級推薦不同深度的文章
const recommendedArticle = computed(() => {
  if (currentLevel.value === 'novice') return { title: '專利說明書結構詳解', id: 'patent-101' }
  return { title: '如何佈局高價值專利組合？', id: 'portfolio-strategy' }
})

const goToArticle = () => {
  router.push(`/knowledge/${recommendedArticle.value.id}`)
}

onMounted(() => {
  // 大師級預設收起
  if (currentLevel.value === 'master') isExpanded.value = false
})
</script>

<style scoped>
.smart-tips {
  border-radius: 12px; padding: 20px; margin-top: 30px; transition: all 0.3s;
}
/* 不同等級不同顏色 */
.smart-tips.novice { background: #e8f5e9; border: 1px solid #c8e6c9; } /* 綠色：友善 */
.smart-tips.practitioner { background: #e3f2fd; border: 1px solid #bbdefb; } /* 藍色：專業 */
.smart-tips.strategist { background: #fff3e0; border: 1px solid #ffe0b2; } /* 橘色：警示/重點 */
.smart-tips.master { background: #f3e5f5; border: 1px solid #e1bee7; } /* 紫色：尊榮 */

.tip-header { display: flex; align-items: center; gap: 10px; cursor: pointer; }
.tip-header h4 { margin: 0; flex: 1; color: #333; }
.toggle-btn { background: none; border: none; color: #666; cursor: pointer; font-size: 0.85rem; }

.tip-content ul { margin: 15px 0 0; padding-left: 20px; }
.tip-content li { margin-bottom: 8px; font-size: 0.95rem; line-height: 1.6; }

.recommendation { margin-top: 15px; padding-top: 15px; border-top: 1px dashed rgba(0,0,0,0.1); font-size: 0.9rem; }
.recommendation a { color: #1565c0; text-decoration: none; font-weight: bold; }
</style>