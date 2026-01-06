<template>
  <div class="tips-section" v-if="currentTips">
    <h4>💡 {{ title }} - 專家小撇步</h4>
    <ul>
      <li v-for="(tip, index) in currentTips" :key="index" v-html="tip"></li>
    </ul>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  type: {
    type: String,
    required: true
  }
})

// 定義各服務的小撇步內容資料庫
const tipsDatabase = {
  // 1. 專利撰寫
  drafting: [
    '<strong>技術特徵拆解</strong>：描述越具體（包含結構、連接關係、運作原理），AI 生成的權利範圍就越精準。',
    '<strong>實施例</strong>：如果您的發明有多種應用場景，請盡量在描述中列出，這有助於擴大保護範圍。',
    '<strong>迴避設計考量</strong>：撰寫時可思考競爭對手可能的替代方案，並試圖將其納入說明書中。'
  ],
  // 2. OA 答辯
  defense: [
    '<strong>修正與申復</strong>：通常建議同時進行「請求項修正」與「申復理由論述」，成功率較高。',
    '<strong>技術特徵對照</strong>：仔細檢查審查員引用的引證案，找出本案與引證案在「結構」或「功效」上的具體差異。',
    '<strong>避免自認</strong>：在答辯時，避免過度承認先前技術的優點，以免造成後續的禁反言限制。'
  ],
  // 3. 迴避設計
  design_around: [
    '<strong>全要件原則</strong>：迴避設計的核心在於「缺少」對方權利項中的至少一個必要元件。',
    '<strong>替換原則</strong>：嘗試用「功能不同」或「方式不同」的元件來替換原有元件。',
    '<strong>逆向工程</strong>：從對手專利的「實施例」中尋找其未請求保護的漏洞。'
  ],
  // 4. 侵權分析
  infringement: [
    '<strong>文義讀取</strong>：首先判斷產品是否完全符合權利項的所有文字描述。',
    '<strong>均等論</strong>：即使文字不完全符合，若功能、方法、結果實質相同，仍可能構成侵權。',
    '<strong>禁反言</strong>：調閱該專利的歷史檔案，查看專利權人是否曾在答辯中放棄過某些權利範圍。'
  ],
  // 5. 專利鑑價
  valuation: [
    '<strong>剩餘年限</strong>：專利價值與剩餘保護年限成正比，快過期的專利價值通常較低。',
    '<strong>家族佈局</strong>：擁有美、歐、中等多國家族的專利，通常代表技術含金量較高。',
    '<strong>商業化程度</strong>：已進入量產或有授權實績的專利，其估值模型中的風險係數會大幅降低。'
  ],
  // 6. 專利分析 (單篇/地圖)
  analysis: [
    '<strong>核心特徵</strong>：關注獨立項 (Claim 1)，這是專利權力最大的部分。',
    '<strong>引證分析</strong>：查看該專利「引用了誰」以及「被誰引用」，可判斷其技術源流與市場影響力。',
    '<strong>地圖解讀</strong>：技術功效矩陣圖中「空白」的區域，往往代表潛在的藍海研發方向。'
  ],
  // 7. 舉發 (Invalidation)
  invalidation: [
    '<strong>組合核駁</strong>：單一篇前案通常難以完全無效掉目標，嘗試尋找 2-3 篇前案來組合「顯而易見性」。',
    '<strong>非專利文獻</strong>：學術論文、技術手冊、甚至早期的產品型錄，都是非常強力的舉發證據。',
    '<strong>優先權日</strong>：務必確認您找到的證據，其公開日期早於目標專利的申請日/優先權日。'
  ],
  // 8. 迴避設計 (Portfolio)
  portfolio: [
  '<strong>核心技術優先</strong>：對於預算有限的新創，優先保護「核心演算法」或「關鍵硬體結構」，外觀設計可延後。',
  '<strong>美國臨時案 (Provisional)</strong>：這是搶佔「優先權日」最便宜的方式，先卡位，一年內再決定是否轉正式案。',
  '<strong>市場與製造地</strong>：專利是屬地主義，請務必在「主要市場」與「主要競爭對手製造地」進行佈局。'
  ],
}

const currentTips = computed(() => tipsDatabase[props.type])

const titleMap = {
  drafting: '專利撰寫',
  defense: 'OA 答辯',
  design_around: '迴避設計',
  infringement: '侵權分析',
  valuation: '價值評估',
  analysis: '情報分析',
  invalidation: '舉發無效'
}

const title = computed(() => titleMap[props.type] || '操作指引')
</script>

<style scoped>
.tips-section {
  background: #fff8e1; /* 溫暖的黃色背景 */
  border: 1px solid #ffe0b2;
  border-radius: 12px;
  padding: 24px;
  margin-top: 40px;
  box-shadow: 0 2px 8px rgba(255, 160, 0, 0.05);
}

.tips-section h4 {
  margin-top: 0;
  color: #f57c00;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.1rem;
  margin-bottom: 16px;
}

.tips-section ul {
  margin: 0;
  padding-left: 20px;
  color: #5d4037;
}

.tips-section li {
  margin-bottom: 10px;
  line-height: 1.6;
  font-size: 0.95rem;
}

/* 讓強調文字更明顯 */
.tips-section :deep(strong) {
  color: #e65100;
  font-weight: 600;
}
</style>