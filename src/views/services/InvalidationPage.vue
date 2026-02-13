<!-- src/views/services/InvalidationPage.vue -->
<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { supabase } from '../../supabase'
import { useUserStore } from '../../stores/user'
import InvalidationResultPanel from './InvalidationResultPanel.vue'
import ServiceTips from '../../components/ServiceTips.vue'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

// 計費設定
const SEARCH_COST = 2000
const ANALYSIS_COST = 1500

// Data
const jobId = ref(route.query.job_id || null)
const isInit = ref(!route.query.job_id)
const isSearching = ref(false)
const isProcessing = ref(false)
const resultData = ref(null)
const pollTimer = ref(null)
const TIMEOUT_MINUTES = 15

// ✅ 新增：語言切換狀態
const showEnglish = ref(false);

// ========== 步驟 1：系爭專利號 ==========
const targetPatentNumber = ref('')

// ========== 步驟 2：證據來源方式 ==========
const evidenceSourceMethod = ref('search') // 'search' | 'patent_numbers'

// ========== 步驟 3A：證據專利號清單 ==========
const evidencePatentNumbers = ref([{ patent_number: '' }])

// ========== 步驟 3B：AI 檢索結果 ==========
const searchResults = ref([])
const selectedEvidences = ref([])

// Computed
const insufficientFundsForSearch = computed(() => {
  const balance = userStore.profile?.credits_balance || 0
  return balance < SEARCH_COST
})

const insufficientFundsForAnalysis = computed(() => {
  const balance = userStore.profile?.credits_balance || 0
  const totalCost = evidenceSourceMethod.value === 'search' 
    ? SEARCH_COST + ANALYSIS_COST 
    : ANALYSIS_COST
  return balance < totalCost
})

const totalCost = computed(() => {
  return evidenceSourceMethod.value === 'search' 
    ? SEARCH_COST + ANALYSIS_COST 
    : ANALYSIS_COST
})

const canProceed = computed(() => {
  // 檢查系爭專利號
  const hasTarget = targetPatentNumber.value.trim() !== ''
  if (!hasTarget) return false

  // 檢查證據專利
  if (evidenceSourceMethod.value === 'search') {
    // AI 檢索模式：需要先完成檢索並選擇證據
    return selectedEvidences.value.length > 0
  } else if (evidenceSourceMethod.value === 'patent_numbers') {
    // 專利號清單模式：至少一個有效的專利號
    return evidencePatentNumbers.value.some(e => e.patent_number.trim() !== '')
  }

  return false
})

const canStartSearch = computed(() => {
  return targetPatentNumber.value.trim() !== ''
})

// ========== 證據專利：專利號清單 ==========
const addPatentNumberSlot = () => {
  if (evidencePatentNumbers.value.length < 5) {
    evidencePatentNumbers.value.push({ patent_number: '' })
  }
}

const removePatentNumber = (index) => {
  evidencePatentNumbers.value.splice(index, 1)
  if (evidencePatentNumbers.value.length === 0) {
    evidencePatentNumbers.value.push({ patent_number: '' })
  }
}

// ========== 檢索狀態管理 ==========
const currentStep = ref(1)
const currentStepDescription = ref('正在分析系爭專利...')
const progressPercentage = ref(0)
const estimatedTime = ref(120)
const currentKnowledgeIndex = ref(0)

// ✅ 輪詢計時器
let searchPollingInterval = null

// 知識卡片內容（30 張 - 中英雙語版）
const knowledgeCards = [
  // === 基礎概念 ===
  {
    title: '什麼是專利舉發？',
    titleEn: 'What is Patent Invalidation?',
    content: '專利舉發是指任何人認為已核准的專利不符合專利要件，向專利局提出撤銷該專利的程序。常見理由包括：缺乏新穎性、進步性不足、說明書揭露不充分等。',
    contentEn: 'Patent invalidation is a procedure where anyone can challenge a granted patent by filing a request to the patent office to revoke it. Common grounds include: lack of novelty, lack of inventive step, insufficient disclosure in the specification, etc.'
  },
  {
    title: '什麼是「新穎性」？',
    titleEn: 'What is "Novelty"?',
    content: '新穎性是指申請專利的發明在申請日前，未曾公開於世界任何地方。只要找到一篇「單一前案」完全揭露該發明的所有技術特徵，就可以證明該專利缺乏新穎性。',
    contentEn: 'Novelty means the invention has not been publicly disclosed anywhere in the world before the filing date. Finding a single prior art that fully discloses all technical features of the invention can prove lack of novelty.'
  },
  {
    title: '什麼是「進步性」？',
    titleEn: 'What is "Inventive Step"?',
    content: '進步性是指該發明相較於先前技術，具有非顯而易見的技術改進。若能組合多篇前案證明該發明為「所屬技術領域具有通常知識者」容易完成，則可主張缺乏進步性。',
    contentEn: 'Inventive step means the invention has non-obvious technical improvements over prior art. If multiple prior arts can be combined to prove the invention is obvious to a "person skilled in the art," lack of inventive step can be claimed.'
  },
  
  // === 技術特徵解析 ===
  {
    title: '如何解析技術特徵？',
    titleEn: 'How to Analyze Technical Features?',
    content: '技術特徵解析分為三步驟：1) 識別獨立項中的所有技術元件、2) 判斷哪些是「必要技術特徵」、3) 理解各特徵之間的功能關係。AI 會自動標記化學成分、結構元件、方法步驟等。',
    contentEn: 'Technical feature analysis has three steps: 1) Identify all technical elements in independent claims, 2) Determine which are "essential technical features," 3) Understand functional relationships between features. AI automatically tags chemical components, structural elements, method steps, etc.'
  },
  {
    title: '什麼是「必要技術特徵」？',
    titleEn: 'What are "Essential Technical Features"?',
    content: '必要技術特徵是指獨立項中不可或缺的技術元素。舉發時必須證明前案揭露了「全部」必要技術特徵，缺一不可。附屬項的特徵則為「附加特徵」，可選擇性比對。',
    contentEn: 'Essential technical features are indispensable technical elements in independent claims. For invalidation, prior art must disclose "all" essential features without exception. Features in dependent claims are "additional features" and can be selectively compared.'
  },
  {
    title: '如何處理功能性特徵？',
    titleEn: 'How to Handle Functional Features?',
    content: '功能性特徵（如「用於固定的裝置」）需解釋為「能達成該功能的所有實施方式」。比對時，只要前案揭露任何能達成相同功能的結構，即可認定相同。',
    contentEn: 'Functional features (e.g., "device for fixing") should be interpreted as "all embodiments that achieve the function." During comparison, any structure in prior art that achieves the same function can be considered equivalent.'
  },
  {
    title: '數值範圍如何比對？',
    titleEn: 'How to Compare Numerical Ranges?',
    content: '數值範圍比對原則：1) 前案範圍完全包含系爭專利範圍→破壞新穎性、2) 前案範圍部分重疊→可能破壞進步性、3) 前案揭露單一數值落在系爭範圍內→破壞新穎性。',
    contentEn: 'Numerical range comparison principles: 1) Prior art range fully encompasses patent range → destroys novelty, 2) Partial overlap → may destroy inventive step, 3) Single value in prior art falls within patent range → destroys novelty.'
  },
  
  // === 比對技巧 ===
  {
    title: '什麼是「全要件原則」？',
    titleEn: 'What is the "All Elements Rule"?',
    content: '全要件原則是指前案必須揭露系爭專利獨立項的「所有」必要技術特徵，才能破壞新穎性。即使前案揭露 90% 的特徵，只要缺少一個必要特徵，新穎性就不會被破壞。',
    contentEn: 'The all elements rule states that prior art must disclose "all" essential technical features of the independent claim to destroy novelty. Even if prior art discloses 90% of features, missing one essential feature means novelty is not destroyed.'
  },
  {
    title: '什麼是「均等論」？',
    titleEn: 'What is the "Doctrine of Equivalents"?',
    content: '均等論是指前案雖未使用完全相同的技術手段，但使用「實質相同」的替代手段達成相同功能，仍可認定為相同技術特徵。例如：螺絲固定 ≈ 鉚釘固定。',
    contentEn: 'The doctrine of equivalents means that even if prior art does not use identical technical means, using "substantially the same" alternative means to achieve the same function can still be considered the same technical feature. Example: screw fastening ≈ rivet fastening.'
  },
  {
    title: '如何判斷「均等」？',
    titleEn: 'How to Determine "Equivalence"?',
    content: '均等判斷三要件：1) 達成實質相同的功能、2) 以實質相同的方式、3) 達成實質相同的結果。若三者皆符合，且為所屬技術領域通常知識者容易想到的替代方案，即構成均等。',
    contentEn: 'Three requirements for equivalence: 1) Achieves substantially the same function, 2) In substantially the same way, 3) Achieves substantially the same result. If all three are met and it\'s an obvious alternative to a person skilled in the art, equivalence is established.'
  },
  {
    title: '上下位概念如何運用？',
    titleEn: 'How to Use Generic-Specific Concepts?',
    content: '上位概念涵蓋下位概念。例如：系爭專利記載「鹼金屬氫氧化物」（上位），前案揭露「氫氧化鉀」（下位）→可破壞新穎性。反之，系爭專利記載下位，前案僅揭露上位→不破壞新穎性。',
    contentEn: 'Generic concepts encompass specific concepts. Example: Patent claims "alkali metal hydroxide" (generic), prior art discloses "potassium hydroxide" (specific) → can destroy novelty. Conversely, patent claims specific, prior art only discloses generic → does not destroy novelty.'
  },
  
  // === 組合引證 ===
  {
    title: '什麼是「組合引證」？',
    titleEn: 'What is "Combination of References"?',
    content: '組合引證是指結合兩篇以上的前案，共同證明系爭專利缺乏進步性。前提是：1) 前案屬於相同或相近技術領域、2) 前案之間有結合的動機、3) 結合後的技術效果可預期。',
    contentEn: 'Combination of references means combining two or more prior arts to prove lack of inventive step. Prerequisites: 1) Prior arts belong to same or related technical fields, 2) Motivation to combine exists, 3) Technical effects after combination are predictable.'
  },
  {
    title: '如何建立「結合動機」？',
    titleEn: 'How to Establish "Motivation to Combine"?',
    content: '結合動機來源：1) 前案明示或暗示可結合、2) 所屬技術領域的通常知識、3) 解決相同技術問題的需求、4) 市場或產業的發展趨勢。AI 會自動分析前案間的技術關聯性。',
    contentEn: 'Sources of motivation to combine: 1) Prior art explicitly or implicitly suggests combination, 2) Common knowledge in the technical field, 3) Need to solve the same technical problem, 4) Market or industry trends. AI automatically analyzes technical relationships between prior arts.'
  },
  {
    title: '組合引證的限制？',
    titleEn: 'Limitations of Combination?',
    content: '組合引證不得「事後諸葛」。若前案之間存在技術矛盾（如教示相反方向）、或結合後產生無法預期的技術效果，則不得組合。此時系爭專利可能具有進步性。',
    contentEn: 'Combination cannot be based on "hindsight." If prior arts have technical contradictions (e.g., teach opposite directions) or combination produces unpredictable technical effects, combination is not allowed. The patent may have inventive step.'
  },
  {
    title: '主引證 vs 輔引證？',
    titleEn: 'Primary vs Secondary References?',
    content: '主引證應揭露系爭專利的「主要技術構思」，輔引證補充缺少的次要特徵。選擇主引證時，優先考慮：1) 技術領域最接近、2) 揭露特徵最多、3) 申請日最早的前案。',
    contentEn: 'Primary reference should disclose the "main technical concept" of the patent, while secondary references supplement missing minor features. When selecting primary reference, prioritize: 1) Closest technical field, 2) Most disclosed features, 3) Earliest filing date.'
  },
  
  // === 容易實施 ===
  {
    title: '什麼是「容易實施」？',
    titleEn: 'What is "Enablement"?',
    content: '容易實施是指所屬技術領域具有通常知識者，根據前案的揭露內容，無需過度實驗即可實施該發明。若前案僅提供抽象概念，未揭露具體實施方式，則不構成有效前案。',
    contentEn: 'Enablement means a person skilled in the art can practice the invention based on prior art disclosure without undue experimentation. If prior art only provides abstract concepts without specific implementation, it does not constitute valid prior art.'
  },
  {
    title: '如何判斷「容易實施」？',
    titleEn: 'How to Determine "Enablement"?',
    content: '判斷標準：1) 前案是否揭露關鍵參數（如溫度、濃度）、2) 是否提供實施例、3) 是否說明技術效果、4) 所屬技術領域者是否具備實施能力。化學案通常要求更詳細的揭露。',
    contentEn: 'Criteria: 1) Does prior art disclose key parameters (e.g., temperature, concentration), 2) Are examples provided, 3) Are technical effects explained, 4) Can a person skilled in the art practice it. Chemical cases usually require more detailed disclosure.'
  },
  {
    title: '「通常知識者」是誰？',
    titleEn: 'Who is a "Person Skilled in the Art"?',
    content: '通常知識者是一個法律擬制的人，具備該技術領域的普通知識和技能，能理解專利說明書並實施發明。判斷進步性時，以「通常知識者」的角度評估技術是否顯而易見。',
    contentEn: 'A person skilled in the art is a legal fiction possessing ordinary knowledge and skills in the technical field, capable of understanding patent specifications and practicing the invention. When assessing inventive step, evaluate whether the technology is obvious from this person\'s perspective.'
  },
  
  // === 化學案特殊技巧 ===
  {
    title: '化學案的舉發重點？',
    titleEn: 'Key Points for Chemical Patent Invalidation?',
    content: '化學案舉發重點：1) 成分比對（化學式、CAS 號）、2) 濃度範圍比對、3) 製程條件比對（溫度、壓力、時間）、4) 技術效果比對（如去除率、穩定性）。',
    contentEn: 'Key points: 1) Component comparison (chemical formula, CAS number), 2) Concentration range comparison, 3) Process condition comparison (temperature, pressure, time), 4) Technical effect comparison (e.g., removal rate, stability).'
  },
  {
    title: '化學成分如何比對？',
    titleEn: 'How to Compare Chemical Components?',
    content: '化學成分比對層級：1) 化學式完全相同→破壞新穎性、2) 同分異構物→可能均等、3) 同類化合物（如同為醇類）→可能組合、4) 功能相同的替代物→需證明容易替代。',
    contentEn: 'Comparison levels: 1) Identical chemical formula → destroys novelty, 2) Isomers → may be equivalent, 3) Same class of compounds (e.g., both alcohols) → may combine, 4) Functionally equivalent substitutes → need to prove easy substitution.'
  },
  {
    title: '濃度範圍的舉發技巧？',
    titleEn: 'Invalidation Techniques for Concentration Ranges?',
    content: '濃度範圍舉發：1) 前案範圍完全包含→破壞新穎性、2) 前案範圍部分重疊→可主張進步性不足、3) 前案揭露偏好範圍落在系爭範圍內→可破壞新穎性、4) 前案僅揭露單一實施例→需證明可類推。',
    contentEn: 'Techniques: 1) Prior art range fully encompasses → destroys novelty, 2) Partial overlap → may claim lack of inventive step, 3) Prior art preferred range falls within patent range → can destroy novelty, 4) Prior art only discloses single example → need to prove extrapolation.'
  },
  
  // === 機械案特殊技巧 ===
  {
    title: '機械案的舉發重點？',
    titleEn: 'Key Points for Mechanical Patent Invalidation?',
    content: '機械案舉發重點：1) 結構元件比對（零件名稱、形狀）、2) 空間關係比對（連接方式、相對位置）、3) 功能比對（各元件的作用）、4) 技術效果比對（如強度、穩定性）。',
    contentEn: 'Key points: 1) Structural component comparison (part names, shapes), 2) Spatial relationship comparison (connection methods, relative positions), 3) Functional comparison (role of each component), 4) Technical effect comparison (e.g., strength, stability).'
  },
  {
    title: '結構特徵如何比對？',
    titleEn: 'How to Compare Structural Features?',
    content: '結構比對原則：1) 元件名稱不同但功能相同→可能均等、2) 連接方式不同（如焊接 vs 螺接）→需判斷是否容易替代、3) 形狀略有差異→需判斷是否為設計變化。',
    contentEn: 'Comparison principles: 1) Different component names but same function → may be equivalent, 2) Different connection methods (e.g., welding vs screwing) → need to assess if easily substitutable, 3) Slight shape differences → need to assess if design variation.'
  },
  {
    title: '空間關係的重要性？',
    titleEn: 'Importance of Spatial Relationships?',
    content: '空間關係（如「A 位於 B 上方」）是機械案的關鍵特徵。比對時需確認：1) 相對位置是否相同、2) 連接方式是否相同、3) 是否產生相同的技術效果。圖式比對常比文字更直觀。',
    contentEn: 'Spatial relationships (e.g., "A is above B") are key features in mechanical cases. Comparison requires confirming: 1) Same relative positions, 2) Same connection methods, 3) Same technical effects. Drawing comparison is often more intuitive than text.'
  },
  
  // === 電子案特殊技巧 ===
  {
    title: '電子案的舉發重點？',
    titleEn: 'Key Points for Electronics Patent Invalidation?',
    content: '電子案舉發重點：1) 功能模組比對（如處理器、記憶體）、2) 方法步驟比對（演算法流程）、3) 訊號處理比對（輸入輸出關係）、4) 技術效果比對（如速度、準確度）。',
    contentEn: 'Key points: 1) Functional module comparison (e.g., processor, memory), 2) Method step comparison (algorithm flow), 3) Signal processing comparison (input-output relationships), 4) Technical effect comparison (e.g., speed, accuracy).'
  },
  {
    title: '方法步驟如何比對？',
    titleEn: 'How to Compare Method Steps?',
    content: '方法步驟比對：1) 步驟順序是否相同→順序不同可能仍侵權、2) 步驟功能是否相同→功能相同但手段不同可能均等、3) 是否產生相同結果→結果相同是關鍵。',
    contentEn: 'Method step comparison: 1) Same step order → different order may still infringe, 2) Same step function → same function but different means may be equivalent, 3) Same result → same result is key.'
  },
  {
    title: '演算法如何比對？',
    titleEn: 'How to Compare Algorithms?',
    content: '演算法比對難點：1) 數學公式不同但等效→可能均等、2) 實現方式不同（如硬體 vs 軟體）→需判斷是否容易轉換、3) 參數設定不同→需判斷是否為常規調整。',
    contentEn: 'Algorithm comparison challenges: 1) Different but equivalent mathematical formulas → may be equivalent, 2) Different implementations (e.g., hardware vs software) → need to assess if easily convertible, 3) Different parameter settings → need to assess if routine adjustments.'
  },
  
  // === 進階技巧 ===
  {
    title: 'CPC 分類號的重要性？',
    titleEn: 'Importance of CPC Classification?',
    content: 'CPC（Cooperative Patent Classification）是精準檢索的關鍵。相同 CPC 的專利通常技術領域相近，更容易建立「結合動機」。AI 會自動預測系爭專利的 CPC，並優先檢索相同分類的前案。',
    contentEn: 'CPC (Cooperative Patent Classification) is key to precise searching. Patents with the same CPC usually belong to similar technical fields, making it easier to establish "motivation to combine." AI automatically predicts patent CPC and prioritizes searching prior arts with the same classification.'
  },
  {
    title: '如何評估前案的相關性？',
    titleEn: 'How to Assess Prior Art Relevance?',
    content: '前案相關性評估：1) 技術領域相同或相近（30%）、2) 技術特徵重疊程度（40%）、3) 申請日早於系爭專利（必要）、4) 公開可得性（必要）。AI 會自動計算相關性分數。',
    contentEn: 'Prior art relevance assessment: 1) Same or similar technical field (30%), 2) Degree of technical feature overlap (40%), 3) Filing date earlier than patent (required), 4) Public availability (required). AI automatically calculates relevance score.'
  },
  {
    title: '舉發成功率如何提升？',
    titleEn: 'How to Improve Invalidation Success Rate?',
    content: '提升舉發成功率：1) 找到申請日最早的前案、2) 選擇揭露最完整的前案、3) 建立清晰的技術特徵對應表、4) 提供具體的實施例比對、5) 說明結合動機或容易實施的理由。',
    contentEn: 'Improve success rate: 1) Find prior art with earliest filing date, 2) Select prior art with most complete disclosure, 3) Create clear technical feature correspondence table, 4) Provide specific example comparisons, 5) Explain motivation to combine or enablement reasons.'
  },
    // === 🆕 Cloud Patent Office 智慧檢索 ===
  {
    title: 'Cloud Patent Office (CPO)的智慧檢索是什麼？',
    titleEn: 'What is Cloud Patent Office Smart Search?',
    content: 'CPO 採用 AI 驅動的多輪檢索策略，結合關鍵字檢索、語義分析、技術特徵比對，自動找出可能的舉發證據專利。系統會分析目標專利的技術特徵，生成多層次檢索策略，並透過 AI 深度比對篩選出最相關的前案。',
    contentEn: 'Cloud Patent Office uses AI-driven multi-round search strategies, combining keyword search, semantic analysis, and technical feature comparison to automatically identify potential invalidation evidence. The system analyzes the technical features of the target patent, generates multi-level search strategies, and uses AI deep comparison to filter the most relevant prior art.'
  },

  {
    title: 'CPO 智慧檢索的四大階段',
    titleEn: 'Four Stages of Smart Search',
    content: '我們的智慧檢索分為四個階段：\n1️⃣ 特徵提取：AI 自動解析專利的技術特徵與關鍵術語\n2️⃣ 策略生成：根據技術領域生成多層次檢索策略（精確、中等、寬鬆）\n3️⃣ 多源檢索：同時搜尋 Google Patents、專利資料庫，並進行布林檢索與語義檢索\n4️⃣ AI 深度比對：逐一分析候選專利，計算技術特徵覆蓋率，推薦最佳舉發證據',
    contentEn: 'Our smart search consists of four stages:\n1️⃣ Feature Extraction: AI automatically parses technical features and key terms\n2️⃣ Strategy Generation: Generate multi-level search strategies (precise, medium, broad) based on technical field\n3️⃣ Multi-source Search: Simultaneously search Google Patents, patent databases with Boolean and semantic search\n4️⃣ AI Deep Comparison: Analyze each candidate patent, calculate technical feature coverage, and recommend the best invalidation evidence'
  },

  {
    title: '什麼是技術特徵覆蓋率？',
    titleEn: 'What is Technical Feature Coverage Rate?',
    content: '技術特徵覆蓋率是指前案專利揭露目標專利技術特徵的比例。例如，目標專利有 5 個技術特徵，前案專利完全揭露其中 4 個，覆蓋率為 80%。覆蓋率越高，該前案作為舉發證據的價值越大。一般而言，單一證據需達 80% 以上，雙證據組合需達 90% 以上。',
    contentEn: 'Technical feature coverage rate refers to the proportion of target patent features disclosed by prior art. For example, if the target patent has 5 features and the prior art fully discloses 4 of them, the coverage rate is 80%. Higher coverage means greater value as invalidation evidence. Generally, single evidence requires 80%+ coverage, and dual evidence combination requires 90%+ coverage.'
  },

  {
    title: 'AI 如何判斷技術特徵是否被揭露？',
    titleEn: 'How Does AI Determine Feature Disclosure?',
    content: 'CPO所採用的AI判斷 會逐段分析前案專利的說明書、申請專利範圍、圖式說明，判斷每個技術特徵的揭露狀態：\n✅ 完全揭露：前案明確記載相同或等效的技術手段\n⚠️ 部分揭露：前案記載相似但不完全相同的技術\n❌ 未揭露：前案未提及該技術特徵\n\n系統會標註關鍵證據位置（如「Example 1, Table 2」），方便後續撰寫舉發理由書。',
    contentEn: 'AI analyzes the specification, claims, and drawings of prior art paragraph by paragraph to determine the disclosure status of each technical feature:\n✅ Fully Disclosed: Prior art explicitly describes the same or equivalent technical means\n⚠️ Partially Disclosed: Prior art describes similar but not identical technology\n❌ Not Disclosed: Prior art does not mention the feature\n\nThe system marks key evidence locations (e.g., "Example 1, Table 2") for easier drafting of invalidation arguments.'
  },

  {
    title: '單一證據 vs 組合證據',
    titleEn: 'Single Evidence vs Combined Evidence',
    content: '舉發證據可分為兩類：\n\n🔹 單一證據：一篇前案專利即可證明目標專利不具新穎性或進步性（需覆蓋率 ≥ 80%）\n\n🔹 組合證據：結合兩篇或多篇前案專利，共同證明目標專利不具進步性（需覆蓋率 ≥ 90%，且需證明組合動機）\n\n一般而言，單一證據的舉發成功率較高，但實務上常需使用組合證據。',
    contentEn: 'Invalidation evidence can be classified into two types:\n\n🔹 Single Evidence: One prior art patent can prove the target patent lacks novelty or inventive step (requires coverage ≥ 80%)\n\n🔹 Combined Evidence: Combining two or more prior art patents to prove the target patent lacks inventive step (requires coverage ≥ 90% and proof of motivation to combine)\n\nGenerally, single evidence has a higher success rate, but combined evidence is often needed in practice.'
  },

  // === 🆕 專利舉發流程 ===
  {
    title: '專利舉發的完整流程',
    titleEn: 'Complete Patent Invalidation Process',
    content: '專利舉發的標準流程包括：\n1️⃣ 目標專利分析：解析技術特徵與專利範圍\n2️⃣ 前案檢索：尋找可能的舉發證據\n3️⃣ 證據比對：評估前案的覆蓋率與舉發可行性\n4️⃣ 撰寫舉發理由書：說明舉發理由與證據\n5️⃣ 提交舉發申請：向專利局提出舉發\n6️⃣ 答辯與審查：專利權人答辯，審查委員審理\n7️⃣ 舉發決定：專利局作出維持或撤銷的決定',
    contentEn: 'The standard patent invalidation process includes:\n1️⃣ Target Patent Analysis: Parse technical features and patent scope\n2️⃣ Prior Art Search: Find potential invalidation evidence\n3️⃣ Evidence Comparison: Evaluate prior art coverage and invalidation feasibility\n4️⃣ Draft Invalidation Arguments: Explain grounds and evidence\n5️⃣ File Invalidation Request: Submit to patent office\n6️⃣ Response and Examination: Patent owner responds, examiner reviews\n7️⃣ Invalidation Decision: Patent office decides to maintain or revoke'
  },

  {
    title: 'Cloud Patent Office 如何加速舉發流程？',
    titleEn: 'How Cloud Patent Office Accelerates Invalidation?',
    content: '傳統舉發流程需要數週至數月的人工檢索與分析，Cloud Patent Office 透過 AI 自動化，將前案檢索與證據比對縮短至數小時：\n\n⏱️ 傳統方式：2-4 週\n🚀 Cloud Patent Office：2-4 小時\n\n系統自動生成技術特徵比對表、覆蓋率分析、舉發策略建議，大幅降低人力成本與時間成本。',
    contentEn: 'Traditional invalidation processes require weeks to months of manual search and analysis. Cloud Patent Office uses AI automation to reduce prior art search and evidence comparison to hours:\n\n⏱️ Traditional: 2-4 weeks\n🚀 Cloud Patent Office: 2-4 hours\n\nThe system automatically generates technical feature comparison tables, coverage analysis, and invalidation strategy recommendations, significantly reducing labor and time costs.'
  },

  {
    title: '什麼是組合動機？',
    titleEn: 'What is Motivation to Combine?',
    content: '在使用組合證據舉發時，必須證明「所屬技術領域中具有通常知識者有動機將多篇前案組合」。組合動機的判斷標準包括：\n\n✅ 技術領域相同或相關\n✅ 解決相同的技術問題\n✅ 前案之間有引證關係\n✅ 組合後不會產生技術障礙\n\nCloud Patent Office 的 AI 會自動分析組合動機的強度，並提供論述建議。',
    contentEn: 'When using combined evidence for invalidation, you must prove that "a person having ordinary skill in the art would have motivation to combine multiple prior arts." Criteria for motivation to combine include:\n\n✅ Same or related technical field\n✅ Solving the same technical problem\n✅ Citation relationship between prior arts\n✅ No technical obstacles after combination\n\nCloud Patent Office AI automatically analyzes the strength of motivation to combine and provides argumentation suggestions.'
  },

  {
    title: '舉發成功率如何評估？',
    titleEn: 'How to Evaluate Invalidation Success Rate?',
    content: 'Cloud Patent Office 會根據以下因素評估舉發成功率：\n\n📊 技術特徵覆蓋率（權重 40%）\n📊 證據揭露的明確性（權重 30%）\n📊 組合動機的強度（權重 20%）\n📊 專利權人可能的答辯理由（權重 10%）\n\n系統會給出成功率預測（如「85% - 高成功率」），並標註風險點與應對策略。',
    contentEn: 'Cloud Patent Office evaluates invalidation success rate based on:\n\n📊 Technical feature coverage (40% weight)\n📊 Clarity of evidence disclosure (30% weight)\n📊 Strength of motivation to combine (20% weight)\n📊 Potential arguments from patent owner (10% weight)\n\nThe system provides success rate predictions (e.g., "85% - High Success Rate") and highlights risk points with mitigation strategies.'
  }
]

// 當前顯示的知識卡片
const currentKnowledge = computed(() => {
  return knowledgeCards[currentKnowledgeIndex.value]
})

// 每 30 秒切換知識卡片
let knowledgeInterval = null
const startKnowledgeRotation = () => {
  knowledgeInterval = setInterval(() => {
    currentKnowledgeIndex.value = (currentKnowledgeIndex.value + 1) % knowledgeCards.length
  }, 30000) // 30 秒
}

const stopKnowledgeRotation = () => {
  if (knowledgeInterval) {
    clearInterval(knowledgeInterval)
    knowledgeInterval = null
  }
}

// 更新檢索步驟
const updateSearchStep = (step, description, progress) => {
  currentStep.value = step
  currentStepDescription.value = description
  progressPercentage.value = progress
  console.log(`🔄 步驟 ${step}/5: ${description} (${progress}%)`)
}

// ========== 修改 startSearch() ==========
const startSearch = async () => {
  if (!userStore.user) {
    alert('請先登入')
    return
  }
  if (insufficientFundsForSearch.value) {
    alert(`點數不足，檢索需要 ${SEARCH_COST} 點`)
    return
  }
  
  if (!confirm(`確定要開始檢索嗎？將扣除 ${SEARCH_COST} 點`)) return
  
  // ✅ 啟動檢索 UI
  isSearching.value = true
  currentStep.value = 1
  currentStepDescription.value = '正在預扣點數...'
  progressPercentage.value = 5
  estimatedTime.value = 120
  startKnowledgeRotation()
  
  let transactionId = null
  let analysisId = null

  try {
    // A. 預扣款
    updateSearchStep(1, '正在預扣點數...', 10)
    
    const { data: reserveResult, error: reserveError } = await supabase
      .rpc('reserve_credits', {
        p_user_id: userStore.user.id,
        p_credits: SEARCH_COST,
        p_action_type: 'PATENT_INVALIDATION_SEARCH',
        p_description: '專利舉發證據檢索',
        p_model_name: 'Claude-4.5-Sonnet',
        p_project_id: null,
        p_job_id: null
      })

    if (reserveError || !reserveResult?.success) {
      throw new Error(`預扣款失敗: ${reserveError?.message || reserveResult?.error || '未知錯誤'}`)
    }
    
    transactionId = reserveResult.transaction_id
    console.log('✅ 預扣款成功, transaction_id:', transactionId)

    // B. 建立檢索案件
    updateSearchStep(2, '正在建立檢索案件...', 20)
    
    const { data: job, error: jobError } = await supabase
      .from('saas_jobs')
      .insert({
        user_id: userStore.user.id,
        job_type: 'patent_invalidation_search',
        phase: 'phase6_invalidation_search',
        status: 'pending',
        payment_status: 'reserved',
        transaction_id: transactionId,
        credits_deducted: SEARCH_COST,
        input_data: {
          target_patent: {
            patent_number: targetPatentNumber.value.trim()
          }
        }
      })
      .select()
      .single()

    if (jobError) throw new Error('建立檢索案件失敗: ' + jobError.message)
    console.log('✅ 建立檢索案件成功, job_id:', job.id)

    // C. 建立分析記錄
    updateSearchStep(2, '正在建立分析記錄...', 30)
    
    const { data: analysis, error: analysisError } = await supabase
      .from('patent_invalidation_analyses')
      .insert({
        job_id: job.id,
        user_id: userStore.user.id,
        target_patent_number: targetPatentNumber.value.trim(),
        evidence_patents: [],
        analysis_status: 'pending',
        search_status: 'searching'
      })
      .select()
      .single()

    if (analysisError) throw new Error('建立分析記錄失敗: ' + analysisError.message)
    
    analysisId = analysis.id
    console.log('✅ 建立分析記錄成功, analysis_id:', analysisId)

    // D. 步驟 1: 下載系爭專利
    updateSearchStep(3, '正在下載系爭專利...', 40)
    
    const downloadUrl = import.meta.env.VITE_N8N_WEBHOOK_INVALIDATION_DOWNLOAD_URL
    if (!downloadUrl) {
      throw new Error('❌ Download Webhook URL 未設定')
    }

    console.log('🚀 步驟 1/2: 下載系爭專利')
    console.log('   URL:', downloadUrl)
    
    const downloadPayload = {
      job_id: job.id,
      patent_number: targetPatentNumber.value.trim()
    }
    
    console.log('   Payload:', downloadPayload)

    const downloadResponse = await fetch(downloadUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(downloadPayload)
    })

    if (!downloadResponse.ok) {
      const errorText = await downloadResponse.text()
      throw new Error(`下載系爭專利失敗: ${downloadResponse.status} ${errorText}`)
    }

    const downloadResult = await downloadResponse.json()
    console.log('✅ 系爭專利下載完成:', downloadResult)

    // E. 步驟 2: 檢索證據專利（非同步）
    updateSearchStep(4, '正在啟動 AI 智慧檢索...', 50)
    
    const searchUrl = import.meta.env.VITE_N8N_WEBHOOK_INVALIDATION_SEARCH_URL
    if (!searchUrl) {
      throw new Error('❌ Search Webhook URL 未設定')
    }

    console.log('🚀 步驟 2/2: 檢索證據專利')
    console.log('   URL:', searchUrl)
    
    const searchPayload = {
      job_id: job.id,
      analysis_id: analysisId,
      transaction_id: transactionId,
      user_id: userStore.user.id,
      target_patent_number: targetPatentNumber.value.trim()
    }
    
    console.log('   Payload:', searchPayload)

    const searchResponse = await fetch(searchUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(searchPayload)
    })

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text()
      throw new Error(`檢索證據專利失敗: ${searchResponse.status} ${errorText}`)
    }

    const searchResult = await searchResponse.json()
    console.log('✅ Search 回應:', searchResult)
    
    // ✅ F. 檢索已開始（非同步）
    if (searchResult.success) {
      updateSearchStep(5, '🔍 AI 正在分析技術特徵並檢索相關專利...', 60)
      console.log('🔄 檢索已開始，啟動輪詢...')
      
      // ✅ 啟動輪詢，等待檢索完成
      startSearchPolling(analysisId)
      
    } else {
      throw new Error(searchResult.error || '檢索啟動失敗')
    }

  } catch (err) {
    console.error('❌ 檢索失敗:', err)
    alert('檢索失敗: ' + err.message)
    
    // ✅ 停止 UI
    isSearching.value = false
    stopKnowledgeRotation()
    
    // 退款
    if (transactionId) {
      try {
        console.log('🔄 執行退款, transaction_id:', transactionId)
        const { data: refundResult, error: refundError } = await supabase.rpc('refund_credits', {
          p_transaction_id: transactionId,
          p_reason: '檢索失敗: ' + err.message
        })
        
        if (refundError) {
          console.error('❌ 退款失敗:', refundError)
        } else {
          console.log('✅ 退款成功:', refundResult)
        }
      } catch (refundErr) {
        console.error('❌ 退款異常:', refundErr)
      }
    }
  }
}

// ========== 開始輪詢 ==========
const startSearchPolling = (analysisId) => {
  console.log('🔄 開始輪詢檢索結果, analysis_id:', analysisId)
  
  // 清除舊的輪詢
  stopSearchPolling()
  
  let pollingCount = 0
  const maxPollingTime = 2400 // 最多輪詢 40 分鐘
  
  // 每 60 秒查詢一次
  searchPollingInterval = setInterval(async () => {
    pollingCount++
    const elapsedTime = pollingCount * 60
    
    // ✅ 更新進度（60% -> 95%）
    const progress = Math.min(60 + (elapsedTime / maxPollingTime) * 35, 95)
    progressPercentage.value = Math.round(progress)
    estimatedTime.value = Math.max(0, 240 - elapsedTime)
    
    try {
      console.log('🔍 查詢檢索狀態...')
      
      const { data: analysis, error } = await supabase
        .from('patent_invalidation_analyses')
        .select('search_status, evidence_patents')
        .eq('id', analysisId)
        .single()
      
      if (error) {
        console.error('❌ 查詢失敗:', error)
        return
      }
      
      console.log('📊 檢索狀態:', analysis.search_status)
      
      if (analysis.search_status === 'completed') {
        // ✅ 檢索完成
        updateSearchStep(5, '✅ 檢索完成！正在載入結果...', 100)
        
        stopSearchPolling()
        stopKnowledgeRotation()
        
        // 延遲 1 秒後關閉 UI，顯示結果
        setTimeout(() => {
          isSearching.value = false
          
          if (analysis.evidence_patents && Array.isArray(analysis.evidence_patents)) {
            searchResults.value = analysis.evidence_patents
            console.log(`✅ 找到 ${analysis.evidence_patents.length} 篇相關專利`)
            alert(`✅ 檢索完成！找到 ${analysis.evidence_patents.length} 篇相關專利`)
          } else {
            console.warn('⚠️ 檢索完成但沒有結果')
            alert('⚠️ 檢索完成，但沒有找到相關專利')
          }
        }, 1000)
        
      } else if (analysis.search_status === 'failed') {
        // ❌ 檢索失敗
        console.error('❌ 檢索失敗')
        stopSearchPolling()
        isSearching.value = false
        stopKnowledgeRotation()
        alert('❌ 檢索失敗，請重試')
        
      } else if (elapsedTime >= maxPollingTime) {
        // ⏱️ 超時
        console.warn('⏱️ 檢索超時')
        stopSearchPolling()
        isSearching.value = false
        stopKnowledgeRotation()
        alert('⏱️ 檢索超時，請稍後查看結果或重試')
      }
      
    } catch (err) {
      console.error('❌ 輪詢異常:', err)
    }
  }, 60000) // 每 60 秒查詢一次
}

// ========== 停止輪詢 ==========
const stopSearchPolling = () => {
  if (searchPollingInterval) {
    console.log('🛑 停止輪詢')
    clearInterval(searchPollingInterval)
    searchPollingInterval = null
  }
}

// ========== 取消檢索 ==========
const cancelSearch = () => {
  if (confirm('確定要取消檢索嗎？')) {
    stopSearchPolling()
    isSearching.value = false
    stopKnowledgeRotation()
    console.log('🛑 用戶取消檢索')
  }
}

// ========== 組件卸載時清理 ==========
onUnmounted(() => {
  stopSearchPolling()
  stopKnowledgeRotation()
})

// ========== 開始舉發分析 20260201 ==========
const startAnalysis = async () => {
  if (!userStore.user) {
    alert('請先登入')
    return
  }
  if (insufficientFundsForAnalysis.value) {
    alert(`點數不足，分析需要 ${totalCost.value} 點`)
    return
  }
  
  const costMessage = evidenceSourceMethod.value === 'search'
    ? `檢索 ${SEARCH_COST} 點 + 分析 ${ANALYSIS_COST} 點 = ${totalCost.value} 點`
    : `分析 ${ANALYSIS_COST} 點`
  
  if (!confirm(`確定要開始分析嗎？將扣除 ${costMessage}`)) return
  
  isProcessing.value = true
  let transactionId = null

  try {
    // A. 預扣款
    const { data: reserveResult, error: reserveError } = await supabase
      .rpc('reserve_credits', {
        p_user_id: userStore.user.id,
        p_credits: ANALYSIS_COST,
        p_action_type: 'PATENT_INVALIDATION',
        p_description: '專利舉發分析',
        p_model_name: 'Claude-4.5-Sonnet',
        p_project_id: null,
        p_job_id: null
      })

    if (reserveError || !reserveResult?.success) {
      throw new Error(`預扣款失敗: ${reserveError?.message || reserveResult?.error || '未知錯誤'}`)
    }
    
    transactionId = reserveResult.transaction_id
    console.log('✅ 預扣款成功, transaction_id:', transactionId)

    // B. 建立案件
    const { data: job, error: jobError } = await supabase
      .from('saas_jobs')
      .insert({
        user_id: userStore.user.id,
        job_type: 'patent_invalidation',
        phase: 'phase6_invalidation',
        status: 'pending',
        payment_status: 'reserved',
        transaction_id: transactionId,
        credits_deducted: ANALYSIS_COST,
        input_data: {
          target_patent: {
            patent_number: targetPatentNumber.value.trim()
          },
          evidence_source_method: evidenceSourceMethod.value
        }
      })
      .select()
      .single()

    if (jobError) throw new Error('建立案件失敗: ' + jobError.message)
    
    jobId.value = job.id
    console.log('✅ 建立案件成功, job_id:', job.id)

    // C. 處理證據專利
    let evidencePatents = []

    if (evidenceSourceMethod.value === 'search') {
      // ✅ AI 檢索結果（專利已下載）
      evidencePatents = selectedEvidences.value.map((ev) => ({
        patent_number: ev.patent_number
      }))
      console.log('✅ 使用 AI 檢索結果, 證據數量:', evidencePatents.length)
    } else if (evidenceSourceMethod.value === 'patent_numbers') {
      // ✅ 手動輸入專利號（需要下載）
      evidencePatents = evidencePatentNumbers.value
        .filter(e => e.patent_number.trim() !== '')
        .map(e => ({
          patent_number: e.patent_number.trim()
        }))
      console.log('✅ 使用專利號清單, 證據數量:', evidencePatents.length)
    }

    // D. 更新資料庫
    const { error: updateError } = await supabase
      .from('saas_jobs')
      .update({
        input_data: {
          target_patent: {
            patent_number: targetPatentNumber.value.trim()
          },
          evidence_patents: evidencePatents,
          evidence_source_method: evidenceSourceMethod.value
        }
      })
      .eq('id', job.id)
    
    if (updateError) throw new Error('更新案件失敗: ' + updateError.message)
    console.log('✅ 更新案件成功')

    // E. 建立分析記錄
    const { data: analysis, error: analysisError } = await supabase
      .from('patent_invalidation_analyses')
      .insert({
        job_id: job.id,
        user_id: userStore.user.id,
        target_patent_number: targetPatentNumber.value.trim(),
        evidence_patents: evidencePatents,
        analysis_status: 'pending',
        search_status: evidenceSourceMethod.value === 'search' ? 'completed' : 'skipped'
      })
      .select()
      .single()

    if (analysisError) throw new Error('建立分析記錄失敗: ' + analysisError.message)
    console.log('✅ 建立分析記錄成功, analysis_id:', analysis.id)

    // ✅ F. 根據證據來源選擇流程
    if (evidenceSourceMethod.value === 'search') {
      // ========== 情境 A: SmartSearch 流程 ==========
      // 系爭專利和證據專利都已下載，直接呼叫分析
      console.log('🚀 使用 SmartSearch 流程: 直接呼叫分析 Workflow')
      
      const analysisUrl = import.meta.env.VITE_N8N_WEBHOOK_INVALIDATION_ANALYSIS_URL
      if (!analysisUrl) {
        throw new Error('❌ Analysis Webhook URL 未設定 (VITE_N8N_WEBHOOK_INVALIDATION_ANALYSIS_URL)')
      }

      console.log('   URL:', analysisUrl)
      
      const analysisPayload = {
        job_id: job.id,
        target_patent: {
          patent_number: targetPatentNumber.value.trim()
        },
        evidence_patents: evidencePatents
      }
      
      console.log('   Payload:', analysisPayload)

      const analysisResponse = await fetch(analysisUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(analysisPayload)
      })

      if (!analysisResponse.ok) {
        const errorText = await analysisResponse.text()
        console.error('❌ Analysis 回應錯誤:', errorText)
        throw new Error(`分析失敗: ${analysisResponse.status} ${errorText}`)
      }

      const analysisResult = await analysisResponse.json()
      console.log('✅ Analysis 回應:', analysisResult)

    } else {
      // ========== 情境 B: 手動輸入流程 ==========
      // 需要下載專利，呼叫 Orchestrator
      console.log('🚀 使用手動輸入流程: 呼叫 Orchestrator')
      
      const orchestratorUrl = import.meta.env.VITE_N8N_WEBHOOK_INVALIDATION_ORCHESTRATOR_URL
      if (!orchestratorUrl) {
        throw new Error('❌ Orchestrator Webhook URL 未設定 (VITE_N8N_WEBHOOK_INVALIDATION_ORCHESTRATOR_URL)')
      }

      console.log('   URL:', orchestratorUrl)
      
      const orchestratorPayload = {
        job_id: job.id,
        input_data: {
          target_patent: {
            patent_number: targetPatentNumber.value.trim()
          },
          evidence_patents: evidencePatents
        }
      }
      
      console.log('   Payload:', orchestratorPayload)

      const orchestratorResponse = await fetch(orchestratorUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orchestratorPayload)
      })

      if (!orchestratorResponse.ok) {
        const errorText = await orchestratorResponse.text()
        console.error('❌ Orchestrator 回應錯誤:', errorText)
        throw new Error(`Orchestrator 執行失敗: ${orchestratorResponse.status} ${errorText}`)
      }

      const orchestratorResult = await orchestratorResponse.json()
      console.log('✅ Orchestrator 回應:', orchestratorResult)
    }

    // G. 啟動輪詢
    console.log('🔄 啟動輪詢...')
    startPolling()

    alert('📊 分析已開始！系統正在進行舉發分析...')
    console.log('✅ 完整流程啟動成功')

    isInit.value = false
 
  } catch (err) {
    console.error('❌ 流程失敗:', err)
    alert('啟動失敗: ' + err.message)
    isProcessing.value = false
    
    // 退款
    if (transactionId) {
      try {
        console.log('🔄 執行退款, transaction_id:', transactionId)
        const { data: refundResult, error: refundError } = await supabase.rpc('refund_credits', {
          p_transaction_id: transactionId,
          p_reason: '系統啟動失敗: ' + err.message
        })
        
        if (refundError) {
          console.error('❌ 退款失敗:', refundError)
        } else {
          console.log('✅ 退款成功:', refundResult)
        }
      } catch (refundErr) {
        console.error('❌ 退款異常:', refundErr)
      }
    }
  }
}

// ========== 輪詢結果 ==========
const startPolling = () => {
  if (pollTimer.value) {
    clearInterval(pollTimer.value)
  }
  
  let pollCount = 0
  const MAX_POLL_COUNT = 200
  
  console.log('🔄 開始輪詢...')
  
  pollTimer.value = setInterval(async () => {
    pollCount++
    
    if (pollCount > MAX_POLL_COUNT) {
      console.error('❌ 輪詢次數超限')
      clearInterval(pollTimer.value)
      pollTimer.value = null
      isProcessing.value = false
      
      await supabase
        .from('saas_jobs')
        .update({
          status: 'failed',
          error_message: '輪詢超時',
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId.value)
      
      alert('⚠️ 分析超時，請重新提交')
      return
    }
    
    try {
      const { data, error } = await supabase
        .from('saas_jobs')
        .select('*')
        .eq('id', jobId.value)
        .single()

      if (error) {
        console.error('輪詢錯誤:', error)
        return
      }

      const createdAt = new Date(data.created_at)
      const now = new Date()
      const elapsedMinutes = (now - createdAt) / 1000 / 60
      
      console.log(`🔄 輪詢 #${pollCount}: ${data.status} (已執行 ${elapsedMinutes.toFixed(1)} 分鐘)`)

      if (elapsedMinutes > TIMEOUT_MINUTES && data.status !== 'completed') {
        console.error(`❌ 案件執行超時 (${elapsedMinutes.toFixed(1)} 分鐘)`)
        
        await supabase
          .from('saas_jobs')
          .update({
            status: 'failed',
            error_message: `執行超時 (${elapsedMinutes.toFixed(0)} 分鐘)`,
            updated_at: new Date().toISOString()
          })
          .eq('id', jobId.value)
        
        alert(`⚠️ 分析超時 (${elapsedMinutes.toFixed(0)} 分鐘)，請重新提交`)
        isProcessing.value = false
        
        clearInterval(pollTimer.value)
        pollTimer.value = null
        return
      }

      if (data.status === 'completed' && data.result_data) {
        let parsedResult = data.result_data
        if (typeof parsedResult === 'string') {
          try {
            parsedResult = JSON.parse(parsedResult)
          } catch (e) {
            console.error('解析結果失敗:', e)
          }
        }
        
        resultData.value = parsedResult
        isProcessing.value = false
        
        console.log('✅ 分析完成!')
        
        clearInterval(pollTimer.value)
        pollTimer.value = null
      } else if (data.status === 'failed') {
        alert('分析失敗: ' + (data.error_message || '未知錯誤'))
        isProcessing.value = false
        
        clearInterval(pollTimer.value)
        pollTimer.value = null
      }
    } catch (err) {
      console.error('輪詢異常:', err)
    }
  }, 60000)
}

// ========== 生命週期 ==========
onMounted(async () => {
  console.log('📍 InvalidationPage mounted, job_id:', jobId.value)
  
  if (jobId.value) {
    try {
      const { data, error } = await supabase
        .from('saas_jobs')
        .select('*')
        .eq('id', jobId.value)
        .single()
      
      if (error) {
        console.error('❌ 載入案件失敗:', error)
        isInit.value = true
        return
      }
      
      console.log('📊 案件資料:', data)

      // 載入輸入資料
      if (data.input_data) {
        const input = data.input_data
        
        // 載入系爭專利號
        if (input.target_patent?.patent_number) {
          targetPatentNumber.value = input.target_patent.patent_number
          console.log('✅ 載入系爭專利號:', targetPatentNumber.value)
        }
        
        // 載入證據來源方式
        if (input.evidence_source_method) {
          evidenceSourceMethod.value = input.evidence_source_method
          console.log('✅ 載入證據來源方式:', evidenceSourceMethod.value)
        }
        
        // 載入證據專利
        if (input.evidence_patents && Array.isArray(input.evidence_patents)) {
          evidencePatentNumbers.value = input.evidence_patents.map(e => ({
            patent_number: e.patent_number || ''
          }))
          console.log('✅ 載入證據專利號:', evidencePatentNumbers.value)
        }
      }

      // 根據案件狀態決定顯示內容
      if (data.status === 'completed') {
        if (data.result_data) {
          let parsedResult = data.result_data
          if (typeof parsedResult === 'string') {
            try {
              parsedResult = JSON.parse(parsedResult)
            } catch (e) {
              console.error('解析結果失敗:', e)
            }
          }
          resultData.value = parsedResult
          isInit.value = false
          isProcessing.value = false
          console.log('✅ 顯示已完成的結果')
        }
      } else if (data.status === 'pending' || data.status === 'processing') {
        isProcessing.value = true
        isInit.value = true
        console.log('⏳ 案件分析中，啟動輪詢...')
        startPolling()
      } else if (data.status === 'failed') {
        console.error('❌ 案件執行失敗')
        isInit.value = true
        isProcessing.value = false
        alert('⚠️ 案件執行失敗\n\n' + (data.error_message || '未知錯誤'))
      }
      
    } catch (err) {
      console.error('❌ 載入異常:', err)
      isInit.value = true
    }
  } else {
    console.log('📝 新建案件模式')
    isInit.value = true
  }
})

onUnmounted(() => {
  if (pollTimer.value) {
    clearInterval(pollTimer.value)
    pollTimer.value = null
  }
})
</script>

<template>
  <div class="invalidation-page">
    <!-- 返回按鈕 -->
    <button 
      v-if="!isProcessing && !resultData"
      @click="router.push('/services/invalidation-workflow')" 
      class="back-button"
    >
      ← 返回案件列表
    </button>

    <!-- ========== 1️⃣ 初始輸入介面 ========== -->
    <div v-if="isInit && !isProcessing && !isSearching && !resultData" class="init-container">
      
      <!-- 載入案件提示 -->
      <div v-if="jobId" class="loaded-job-banner">
        <div class="banner-icon">📋</div>
        <div class="banner-content">
          <h3>已載入案件資料</h3>
          <p>案件 ID: {{ jobId.slice(0, 8) }}... | 您可以查看或修改以下資料</p>
        </div>
      </div>

      <!-- 頁面標題 -->
      <div class="page-header">
        <div class="header-icon">⚖️</div>
        <div class="header-content">
          <h1>專利舉發 (Patent Invalidation)</h1>
          <p class="subtitle">AI 智能分析系爭專利與證據專利，自動生成舉發理由書</p>
        </div>
        <div class="header-badges">
          <div class="cost-badge">
            <span class="icon">🔍</span>
            <span class="cost">AI 檢索: {{ SEARCH_COST }} 點</span>
          </div>
          <div class="cost-badge">
            <span class="icon">📊</span>
            <span class="cost">舉發分析: {{ ANALYSIS_COST }} 點</span>
          </div>
          <div class="balance-badge">
            <span class="label">餘額：</span>
            <span class="value">{{ userStore.profile?.credits_balance || 0 }} 點</span>
          </div>
        </div>
      </div>

      <!-- 步驟 1：系爭專利號輸入 -->
      <div class="section-card" :class="{ 'has-data': targetPatentNumber }">
        <div class="card-header">
          <div class="step-badge">步驟 1</div>
          <div class="header-text">
            <h2>輸入系爭專利號（被舉發專利）</h2>
            <p class="card-description">
              {{ targetPatentNumber ? '✅ 已輸入系爭專利號' : '請輸入專利號碼' }}
            </p>
          </div>
        </div>
        
        <div class="patent-number-input">
          <div class="input-wrapper">
            <input 
              v-model="targetPatentNumber"
              type="text" 
              placeholder="例如：US11734097B1、TWI572490、KR10-1397251"
              class="input-field"
              :class="{ 'has-value': targetPatentNumber }"
            />
            <span v-if="targetPatentNumber" class="input-status">✅</span>
          </div>
          <p class="input-hint">
            💡 支援格式：US11734097B1、US-11734097-B1、TWI572490、KR10-1397251、JP2024-123456
          </p>
        </div>
      </div>

      <!-- 步驟 2：證據來源選擇 -->
      <div class="section-card" :class="{ 'has-data': evidenceSourceMethod }">
        <div class="card-header">
          <div class="step-badge">步驟 2</div>
          <div class="header-text">
            <h2>選擇證據專利來源方式</h2>
            <p class="card-description">
              {{ evidenceSourceMethod ? '✅ 已選擇證據來源方式' : '請選擇如何提供證據專利' }}
            </p>
          </div>
        </div>
        
        <div class="evidence-source-selection">
          <button 
            class="source-button"
            :class="{ active: evidenceSourceMethod === 'search' }"
            @click="evidenceSourceMethod = 'search'; searchResults = []; selectedEvidences = []"
            type="button"
          >
            <div class="source-icon">🔍</div>
            <div class="source-content">
              <h3>AI 自動檢索（推薦）</h3>
              <p>系統自動搜尋相關證據專利</p>
              <span class="source-cost">+{{ SEARCH_COST }} 點</span>
            </div>
            <span v-if="evidenceSourceMethod === 'search'" class="selected-badge">✓ 已選擇</span>
          </button>
          
          <button 
            class="source-button"
            :class="{ active: evidenceSourceMethod === 'patent_numbers' }"
            @click="evidenceSourceMethod = 'patent_numbers'"
            type="button"
          >
            <div class="source-icon">🔢</div>
            <div class="source-content">
              <h3>輸入專利號清單</h3>
              <p>我已知道證據專利號</p>
              <span class="source-cost">免費</span>
            </div>
            <span v-if="evidenceSourceMethod === 'patent_numbers'" class="selected-badge">✓ 已選擇</span>
          </button>
        </div>
      </div>

      <!-- 步驟 3A：AI 檢索模式 -->
      <div v-if="evidenceSourceMethod === 'search'" class="section-card">
        <div class="card-header">
          <div class="step-badge">步驟 3</div>
          <div class="header-text">
            <h2>AI 檢索證據專利</h2>
            <p class="card-description">系統將自動搜尋相關證據專利</p>
          </div>
        </div>
        
        <!-- 檢索按鈕 -->
        <div v-if="searchResults.length === 0" class="action-section">
          <button 
            @click="startSearch" 
            :disabled="!canStartSearch || insufficientFundsForSearch || isSearching"
            class="btn-start-search"
            :class="{ 
              'disabled': !canStartSearch || insufficientFundsForSearch,
              'loading': isSearching
            }"
            type="button"
          >
            <span v-if="isSearching">⏳ 檢索中...</span>
            <span v-else-if="insufficientFundsForSearch">❌ 點數不足</span>
            <span v-else-if="!canStartSearch">📤 請先完成步驟 1</span>
            <span v-else>🔍 開始 AI 檢索（{{ SEARCH_COST }} 點）</span>
          </button>
        </div>

        <!-- 檢索中的提示 -->
        <div v-if="isSearching" class="searching-overlay">
          <div class="searching-content">
            <div class="spinner"></div>
            <p>🔍 正在檢索相關專利...</p>
            <p class="text-sm text-gray-500">這可能需要 20-40 分鐘</p>
          </div>
        </div>

        <!-- 檢索結果 -->
        <div v-if="searchResults.length > 0" class="search-results-section">
          <div class="results-header">
            <h3>✅ 找到 {{ searchResults.length }} 篇相關專利</h3>
            <p>請選擇 1-5 篇作為證據專利（已選擇 {{ selectedEvidences.length }} 篇）</p>
          </div>
          
          <div class="search-results">
            <div 
              v-for="result in searchResults" 
              :key="result.patent_number"
              class="result-item"
              :class="{ selected: selectedEvidences.includes(result) }"
            >
              <input 
                type="checkbox" 
                v-model="selectedEvidences" 
                :value="result"
                :disabled="selectedEvidences.length >= 5 && !selectedEvidences.includes(result)"
                :id="`result-${result.patent_number}`"
              />
              <label :for="`result-${result.patent_number}`" class="result-label">
                <div class="result-header">
                  <span class="patent-number">{{ result.patent_number }}</span>
                  <span class="relevance-score">
                    相關度: {{ (result.relevance_score * 100).toFixed(0) }}%
                  </span>
                </div>
                <div class="result-title">{{ result.title }}</div>
                <div class="result-abstract">{{ result.abstract }}</div>
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- 步驟 3B：專利號清單模式 -->
      <div v-if="evidenceSourceMethod === 'patent_numbers'" class="section-card" :class="{ 'has-data': evidencePatentNumbers.some(e => e.patent_number) }">
        <div class="card-header">
          <div class="step-badge">步驟 3</div>
          <div class="header-text">
            <h2>輸入證據專利號清單</h2>
            <p class="card-description">
              {{ evidencePatentNumbers.some(e => e.patent_number) ? 
                 `✅ 已輸入 ${evidencePatentNumbers.filter(e => e.patent_number).length} 個專利號` : 
                 '請輸入 1-5 個證據專利號' }}
            </p>
          </div>
        </div>
        
        <div class="patent-number-list">
          <div 
            v-for="(evidence, index) in evidencePatentNumbers" 
            :key="index"
            class="patent-number-item"
            :class="{ 'has-value': evidence.patent_number }"
          >
            <div class="item-header">
              <span class="item-number">證據 {{ index + 1 }}</span>
              <button 
                v-if="evidencePatentNumbers.length > 1" 
                @click="removePatentNumber(index)"
                class="btn-remove-small"
                type="button"
              >
                🗑️
              </button>
            </div>
            <div class="input-wrapper">
              <input 
                v-model="evidence.patent_number"
                type="text" 
                placeholder="例如：US11734097B1"
                class="input-field-small"
                :class="{ 'has-value': evidence.patent_number }"
              />
              <span v-if="evidence.patent_number" class="input-status">✅</span>
            </div>
          </div>
        </div>
        
        <button 
          v-if="evidencePatentNumbers.length < 5" 
          @click="addPatentNumberSlot"
          class="btn-add-evidence"
          type="button"
        >
          ➕ 新增證據專利號
        </button>
      </div>

      <!-- 步驟 4：開始分析 -->
      <div v-if="evidenceSourceMethod !== 'search' || searchResults.length > 0" class="action-section final-action">
        <div class="cost-summary">
          <div class="summary-item">
            <span class="label">系爭專利：</span>
            <span class="value">{{ targetPatentNumber || '未輸入' }}</span>
          </div>
          <div class="summary-item">
            <span class="label">證據來源：</span>
            <span class="value">
              {{ evidenceSourceMethod === 'search' ? `AI 檢索 (已選 ${selectedEvidences.length} 篇)` : 
                 `專利號清單 (${evidencePatentNumbers.filter(e => e.patent_number).length} 個)` }}
            </span>
          </div>
          <div class="summary-item total">
            <span class="label">總費用：</span>
            <span class="value">{{ totalCost }} 點</span>
          </div>
        </div>
        
        <button 
          @click="startAnalysis" 
          :disabled="!canProceed || insufficientFundsForAnalysis || isProcessing"
          class="btn-start-analysis"
          :class="{ 
            'disabled': !canProceed || insufficientFundsForAnalysis,
            'loading': isProcessing
          }"
          type="button"
        >
          <span v-if="isProcessing">⏳ 處理中...</span>
          <span v-else-if="insufficientFundsForAnalysis">❌ 點數不足（需要 {{ totalCost }} 點）</span>
          <span v-else-if="!canProceed">📤 請完成所有步驟</span>
          <span v-else>🚀 開始 AI 舉發分析（{{ totalCost }} 點）</span>
        </button>
      </div>

      <!-- ServiceTips -->
      <ServiceTips type="invalidation" />
    </div>

    <!-- ========== 2️⃣ 處理中介面 ========== -->
    <div v-else-if="isProcessing && !resultData" class="status-container">
      <div class="status-card">
        <div class="spinner-large"></div>
        <h2>🤖 AI 正在分析舉發案件...</h2>
        <p class="status-description">正在比對技術特徵、分析進步性、生成舉發理由書</p>
        <p class="status-time">這通常需要 5-10 分鐘，請稍候</p>
        
        <div class="processing-info">
          <div class="info-item">
            <span class="info-label">系爭專利：</span>
            <span class="info-value">{{ targetPatentNumber }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">證據數量：</span>
            <span class="info-value">
              {{ evidenceSourceMethod === 'search' ? selectedEvidences.length :
                 evidencePatentNumbers.filter(e => e.patent_number).length }} 篇
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- ========== 3️⃣ 結果顯示介面 ========== -->
    <InvalidationResultPanel 
      v-else-if="resultData"
      :result-data="resultData"
      :job-id="jobId"
    />
  </div>

  <!-- ✅ 檢索中的全螢幕遮罩 -->
  <div v-if="isSearching" class="search-overlay">
    <div class="search-container-large">
      
      <!-- ========== 上方區域（再縮小一半） ========== -->
      <div class="search-header-mini">
        <!-- 動畫圖示 + 標題（一行顯示） -->
        <div class="search-title-row">
          <div class="spinner-mini"></div>
          <h2 class="search-title-mini">🔍 AI 智慧檢索進行中</h2>
        </div>
        
        <!-- 當前步驟 + 進度條（緊湊） -->
        <div class="search-progress-compact">
          <div class="progress-info">
            <span class="step-badge-mini">{{ currentStep }}/5</span>
            <span class="step-text-mini">{{ currentStepDescription }}</span>
            <span class="progress-text-mini">{{ progressPercentage }}% · 還需 {{ estimatedTime }}s</span>
          </div>
          <div class="progress-bar-mini">
            <div class="progress-fill" :style="{ width: progressPercentage + '%' }"></div>
          </div>
        </div>
      </div>
      
      <!-- ========== 知識卡片區域（方案 1：單欄 + 切換） ========== -->
      <div class="knowledge-card-large">
        <!-- 精簡標題列（只佔 10%） -->
        <div class="knowledge-header-minimal">
          <span class="knowledge-icon-small">💡</span>
          <h3 class="knowledge-title-inline">{{ currentKnowledge.title }}</h3>
          <div class="language-toggle">
            <button 
              :class="['lang-btn', { active: showEnglish === false }]"
              @click="showEnglish = false"
            >中</button>
            <button 
              :class="['lang-btn', { active: showEnglish === true }]"
              @click="showEnglish = true"
            >EN</button>
          </div>
        </div>
        
        <!-- 內容區（佔 90% 空間） -->
        <div class="knowledge-content-full">
          <p class="knowledge-text-large">
            {{ showEnglish ? currentKnowledge.contentEn : currentKnowledge.content }}
          </p>
        </div>
      </div>
      
      <!-- 取消按鈕 -->
      <button @click="cancelSearch" class="btn-cancel-mini">取消檢索</button>
    </div>
  </div>

</template>

<style scoped>
/* ========== 基礎佈局 ========== */
.invalidation-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.back-button {
  margin-bottom: 1rem;
  padding: 0.5rem 1rem;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.95rem;
  color: #374151;
}

.back-button:hover {
  background: #f9fafb;
  border-color: #d1d5db;
}

/* ========== 頁面標題 ========== */
.page-header {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 1rem;
  color: white;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.header-icon {
  font-size: 3rem;
  line-height: 1;
}

.header-content {
  flex: 1;
}

.header-content h1 {
  font-size: 1.75rem;
  font-weight: bold;
  margin: 0 0 0.5rem 0;
  line-height: 1.2;
}

.subtitle {
  margin: 0;
  opacity: 0.9;
  font-size: 0.95rem;
  line-height: 1.4;
}

.header-badges {
  display: flex;
  gap: 0.75rem;
  flex-direction: column;
  align-items: flex-end;
}

.cost-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 0.5rem;
  font-weight: bold;
  font-size: 0.9rem;
  white-space: nowrap;
}

.cost-badge .icon {
  font-size: 1.1rem;
}

.balance-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 0.5rem;
  font-weight: bold;
  white-space: nowrap;
}

.balance-badge .label {
  opacity: 0.9;
}

.balance-badge .value {
  font-size: 1.1rem;
}

/* ========== 模式選擇（原本沒用到，但保留） ========== */
.mode-selection {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.mode-button {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 1rem;
  cursor: pointer;
  transition: all 0.3s;
  text-align: left;
}

.mode-button:hover {
  border-color: #667eea;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
  transform: translateY(-2px);
}

.mode-button.active {
  border-color: #667eea;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
}

.mode-icon {
  font-size: 2.5rem;
  line-height: 1;
}

.mode-content {
  flex: 1;
}

.mode-content h3 {
  font-size: 1.25rem;
  font-weight: bold;
  margin: 0 0 0.5rem 0;
  color: #1f2937;
  line-height: 1.3;
}

.mode-content p {
  margin: 0 0 0.5rem 0;
  color: #6b7280;
  font-size: 0.9rem;
  line-height: 1.4;
}

.mode-cost {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  background: #667eea;
  color: white;
  border-radius: 0.5rem;
  font-size: 0.85rem;
  font-weight: bold;
}

/* ========== Section Card ========== */
.section-card {
  background: white;
  border-radius: 1rem;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.step-badge {
  padding: 0.5rem 1rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 0.5rem;
  font-weight: bold;
  font-size: 0.9rem;
  white-space: nowrap;
}

.header-text {
  flex: 1;
}

.header-text h2 {
  font-size: 1.25rem;
  font-weight: bold;
  margin: 0 0 0.25rem 0;
  color: #1f2937;
  line-height: 1.3;
}

.card-description {
  margin: 0;
  color: #6b7280;
  font-size: 0.9rem;
  line-height: 1.4;
}

/* ========== 🆕 輸入方式選擇標籤 ========== */
.input-method-tabs {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}

.tab-button {
  flex: 1;
  padding: 0.875rem 1.25rem;
  border: 2px solid #e5e7eb;
  border-radius: 0.625rem;
  background: white;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 0.95rem;
  font-weight: 500;
  color: #374151;
}

.tab-button.active {
  border-color: #667eea;
  background: rgba(102, 126, 234, 0.1);
  color: #667eea;
}

.tab-button:hover:not(.active) {
  border-color: #cbd5e1;
  background: #f8fafc;
}

/* ========== 🆕 專利號輸入 ========== */
.patent-number-input {
  margin-bottom: 1rem;
}

.input-field {
  width: 100%;
  padding: 0.875rem 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 0.625rem;
  font-size: 0.95rem;
  transition: all 0.3s;
}

.input-field:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.input-hint {
  margin-top: 0.5rem;
  font-size: 0.85rem;
  color: #6b7280;
  line-height: 1.4;
}

/* ========== Upload Zone ========== */
.upload-zone {
  border: 2px dashed #d1d5db;
  border-radius: 0.75rem;
  padding: 1rem;
  transition: all 0.3s;
  background: #fafafa;
}

.upload-zone:hover {
  border-color: #667eea;
  background: rgba(102, 126, 234, 0.05);
}

.upload-zone.has-file {
  border-color: #10b981;
  background: rgba(16, 185, 129, 0.05);
}

.file-input {
  display: none;
}

.upload-area {
  display: flex;
  align-items: center;
  gap: 1rem;
  cursor: pointer;
}

.upload-icon {
  font-size: 2.5rem;
  line-height: 1;
}

.success-icon {
  color: #10b981;
}

.upload-content {
  flex: 1;
}

.upload-content h3 {
  font-size: 1.1rem;
  font-weight: bold;
  margin: 0 0 0.25rem 0;
  color: #1f2937;
  line-height: 1.3;
}

.upload-hint {
  margin: 0;
  color: #6b7280;
  font-size: 0.9rem;
  line-height: 1.4;
}

.file-name {
  margin: 0;
  color: #10b981;
  font-weight: 600;
  font-size: 0.9rem;
  line-height: 1.4;
  word-break: break-all;
}

/* ========== 🆕 證據來源選擇 ========== */
.evidence-source-selection {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.source-button {
  padding: 1.25rem;
  border: 2px solid #e5e7eb;
  border-radius: 0.75rem;
  background: white;
  cursor: pointer;
  transition: all 0.3s;
  text-align: center;
}

.source-button:hover {
  border-color: #667eea;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
  transform: translateY(-2px);
}

.source-button.active {
  border-color: #667eea;
  background: rgba(102, 126, 234, 0.1);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
}

.source-icon {
  font-size: 2.25rem;
  margin-bottom: 0.75rem;
  line-height: 1;
}

.source-content h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
  color: #1f2937;
  font-weight: bold;
  line-height: 1.3;
}

.source-content p {
  margin: 0 0 0.75rem 0;
  font-size: 0.85rem;
  color: #6b7280;
  line-height: 1.4;
}

.source-cost {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  background: #fef3c7;
  color: #92400e;
  border-radius: 0.375rem;
  font-size: 0.8rem;
  font-weight: bold;
}

/* ========== Evidence List ========== */
.evidence-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1rem;
}

.evidence-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  transition: all 0.3s;
}

.evidence-item.has-file {
  background: rgba(16, 185, 129, 0.05);
  border-color: #10b981;
}

.evidence-number {
  padding: 0.5rem 0.75rem;
  background: #667eea;
  color: white;
  border-radius: 0.5rem;
  font-weight: bold;
  font-size: 0.85rem;
  white-space: nowrap;
}

.upload-label {
  flex: 1;
  cursor: pointer;
  font-size: 0.9rem;
  line-height: 1.4;
}

.btn-remove {
  padding: 0.5rem;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  font-size: 1.2rem;
  transition: all 0.2s;
  line-height: 1;
}

.btn-remove:hover {
  background: #dc2626;
  transform: scale(1.05);
}

/* ========== 🆕 專利號清單 / PDF 清單 ========== */
.patent-number-list, 
.pdf-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.patent-number-item, 
.pdf-item {
  padding: 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 0.625rem;
  background: #f9fafb;
  transition: all 0.3s;
}

.pdf-item.has-file {
  border-color: #10b981;
  background: rgba(16, 185, 129, 0.05);
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.item-number {
  font-weight: 600;
  color: #1f2937;
  font-size: 0.9rem;
}

.btn-remove-small {
  padding: 0.25rem 0.5rem;
  border: none;
  background: #fee2e2;
  color: #ef4444;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.9rem;
}

.btn-remove-small:hover {
  background: #fecaca;
}

.input-field-small {
  width: 100%;
  padding: 0.625rem 0.875rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  font-size: 0.9rem;
  transition: all 0.3s;
}

.input-field-small:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1);
}

.upload-label-small {
  display: block;
  padding: 0.75rem;
  border: 2px dashed #cbd5e1;
  border-radius: 0.5rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  background: white;
  font-size: 0.9rem;
  color: #6b7280;
}

.upload-label-small:hover {
  border-color: #667eea;
  background: rgba(102, 126, 234, 0.05);
  color: #667eea;
}

.btn-add-evidence {
  padding: 0.75rem 1.5rem;
  background: white;
  border: 2px dashed #d1d5db;
  border-radius: 0.5rem;
  color: #667eea;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 0.95rem;
}

.btn-add-evidence:hover {
  border-color: #667eea;
  background: rgba(102, 126, 234, 0.05);
}

/* ========== 🆕 檢索結果區域 ========== */
.search-results-section {
  margin-top: 1.25rem;
}

.results-header {
  margin-bottom: 1rem;
}

.results-header h3 {
  margin: 0 0 0.25rem 0;
  color: #1f2937;
  font-size: 1.125rem;
  font-weight: bold;
  line-height: 1.3;
}

.results-header p {
  margin: 0;
  color: #6b7280;
  font-size: 0.9rem;
  line-height: 1.4;
}

/* ========== Search Results ========== */
.search-results {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.result-item {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background: #f9fafb;
  border: 2px solid #e5e7eb;
  border-radius: 0.75rem;
  transition: all 0.3s;
}

.result-item:has(input:checked) {
  border-color: #667eea;
  background: rgba(102, 126, 234, 0.05);
}

.result-item input[type="checkbox"] {
  width: 1.25rem;
  height: 1.25rem;
  cursor: pointer;
  accent-color: #667eea;
  flex-shrink: 0;
  margin-top: 0.25rem;
}

.result-item input[type="checkbox"]:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.result-label {
  flex: 1;
  cursor: pointer;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  gap: 1rem;
  flex-wrap: wrap;
}

.patent-number {
  font-weight: bold;
  color: #667eea;
  font-size: 1rem;
  line-height: 1.3;
}

.relevance-score {
  padding: 0.25rem 0.75rem;
  background: #10b981;
  color: white;
  border-radius: 0.5rem;
  font-size: 0.85rem;
  font-weight: bold;
  white-space: nowrap;
}

.result-title {
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 0.5rem;
  font-size: 0.95rem;
  line-height: 1.4;
}

.result-abstract {
  color: #6b7280;
  font-size: 0.85rem;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ========== Action Section ========== */
.action-section {
  display: flex;
  justify-content: center;
  margin-top: 2rem;
}

/* ========== 🆕 最終操作區域 ========== */
.final-action {
  background: #f9fafb;
  padding: 1.5rem;
  border-radius: 0.75rem;
  border: 2px solid #e5e7eb;
}

.cost-summary {
  margin-bottom: 1.25rem;
  padding: 1rem;
  background: white;
  border-radius: 0.5rem;
  border: 1px solid #e5e7eb;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid #f3f4f6;
}

.summary-item:last-child {
  border-bottom: none;
}

.summary-item.total {
  margin-top: 0.5rem;
  padding-top: 1rem;
  border-top: 2px solid #e5e7eb;
  font-weight: 600;
  font-size: 1rem;
}

.summary-item .label {
  color: #6b7280;
  font-size: 0.9rem;
}

.summary-item .value {
  color: #1f2937;
  font-weight: 500;
  font-size: 0.9rem;
}

.btn-start-analysis,
.btn-start-search {
  padding: 1rem 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 0.75rem;
  font-size: 1.1rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  white-space: nowrap;
}

.btn-start-analysis:hover:not(:disabled),
.btn-start-search:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(102, 126, 234, 0.3);
}

.btn-start-analysis:disabled,
.btn-start-search:disabled {
  background: #d1d5db;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
  opacity: 0.6;
}

.btn-start-analysis.loading,
.btn-start-search.loading {
  background: #f59e0b;
}

/* ========== Status Container ========== */
.status-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  padding: 2rem;
}

.status-card {
  text-align: center;
  padding: 3rem;
  background: white;
  border-radius: 1rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
  max-width: 500px;
}

.spinner-large {
  width: 4rem;
  height: 4rem;
  margin: 0 auto 1.5rem;
  border: 4px solid #e5e7eb;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.status-card h2 {
  font-size: 1.5rem;
  font-weight: bold;
  margin: 0 0 1rem 0;
  color: #1f2937;
  line-height: 1.3;
}

.status-description {
  margin: 0 0 0.5rem 0;
  color: #6b7280;
  line-height: 1.5;
}

.status-time {
  margin: 0;
  color: #9ca3af;
  font-size: 0.9rem;
  line-height: 1.4;
}

/* ========== 響應式設計 ========== */
@media (max-width: 768px) {
  .invalidation-page {
    padding: 1rem;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .header-badges {
    align-items: flex-start;
    width: 100%;
  }

  .mode-selection {
    grid-template-columns: 1fr;
  }

  .mode-button {
    padding: 1rem;
  }

  .mode-icon {
    font-size: 2rem;
  }

  .evidence-source-selection {
    grid-template-columns: 1fr;
  }

  .section-card {
    padding: 1rem;
  }

  .card-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .result-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .btn-start-analysis,
  .btn-start-search {
    width: 100%;
    font-size: 1rem;
    padding: 0.875rem 1.5rem;
  }

  .status-card {
    padding: 2rem 1rem;
  }
}

/* 🆕 載入案件橫幅 */
.loaded-job-banner {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;
  background: linear-gradient(135deg, #e0f2fe 0%, #dbeafe 100%);
  border: 2px solid #3b82f6;
  border-radius: 12px;
  margin-bottom: 24px;
}

.banner-icon {
  font-size: 32px;
}

.banner-content h3 {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 700;
  color: #1e40af;
}

.banner-content p {
  margin: 0;
  font-size: 13px;
  color: #3b82f6;
}

/* 🆕 有資料的卡片樣式 */
.section-card.has-data {
  border-color: #10b981;
  background: linear-gradient(to bottom, #f0fdf4 0%, white 100%);
}

/* 🆕 輸入框包裝器 */
.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-wrapper .input-status {
  position: absolute;
  right: 12px;
  font-size: 20px;
}

.input-field.has-value,
.input-field-small.has-value {
  border-color: #10b981;
  background: #f0fdf4;
}

/* 🆕 已選擇標記 */
.selected-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  background: #10b981;
  color: white;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

/* 🆕 移除檔案按鈕 */
.btn-remove-file {
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 6px 12px;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-remove-file:hover {
  background: #dc2626;
}

/* 🆕 檔案大小顯示 */
.file-size {
  font-size: 12px;
  color: #64748b;
  margin-top: 4px;
}

/* 🆕 已選中的搜尋結果 */
.result-item.selected {
  border-color: #10b981;
  background: #f0fdf4;
}

/* 🆕 專利號項目有值時 */
.patent-number-item.has-value {
  border-color: #10b981;
  background: #f0fdf4;
}

/* 🆕 處理中資訊 */
.processing-info {
  margin-top: 32px;
  padding: 20px;
  background: #f8fafc;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
}

.info-label {
  color: #64748b;
  font-weight: 500;
}

.info-value {
  color: #1e293b;
  font-weight: 600;
}

/* 🆕 檔案資訊 */
.file-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.searching-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.searching-content {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  text-align: center;
}

.spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* ========== 檢索進度 UI（優化版） ========== */

/* 檢索遮罩 */
.search-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.95), rgba(139, 92, 246, 0.95));
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  animation: fadeIn 0.3s ease;
  padding: 2rem;
}

/* 檢索容器 */
.search-container-large {
  background: white;
  padding: 1.5rem;
  border-radius: 24px;
  max-width: 900px;
  width: 95%;
  max-height: 90vh;
  overflow-y: auto;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.5s ease;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* ========== 上方區域（縮小一半） ========== */
.search-header-mini {
  padding: 0.75rem 1rem;
  background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* 標題列（圖示 + 標題一行顯示） */
.search-title-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  justify-content: center;
}

.spinner-mini {
  width: 24px;
  height: 24px;
  border: 3px solid #e5e7eb;
  border-top: 3px solid #6366f1;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  flex-shrink: 0;
}

.search-title-mini {
  font-size: 1rem;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
  line-height: 1;
}

/* 進度資訊（緊湊版） */
.search-progress-compact {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.progress-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.step-badge-mini {
  background: #6366f1;
  color: white;
  padding: 0.125rem 0.5rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1.5;
}

.step-text-mini {
  font-size: 0.875rem;
  color: #4b5563;
  font-weight: 500;
}

.progress-text-mini {
  font-size: 0.75rem;
  color: #6b7280;
}

/* 進度條（迷你版） */
.progress-bar-mini {
  width: 100%;
  height: 6px;
  background: #e5e7eb;
  border-radius: 999px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #6366f1, #8b5cf6);
  border-radius: 999px;
  transition: width 0.5s ease;
}

/* ========== 知識卡片區域（方案 1） ========== */
.knowledge-card-large {
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  padding: 1.5rem;
  border-radius: 20px;
  text-align: left;
  animation: slideIn 0.5s ease;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-height: 400px;
  overflow: hidden;
}

/* 精簡標題列（只佔 10%） */
.knowledge-header-minimal {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid #fbbf24;
  flex-shrink: 0;
}

.knowledge-icon-small {
  font-size: 1.5rem;
  line-height: 1;
  flex-shrink: 0;
}

.knowledge-title-inline {
  flex: 1;
  font-size: 1.125rem;
  font-weight: 700;
  color: #92400e;
  margin: 0;
  line-height: 1.3;
  word-wrap: break-word;
}

/* 語言切換按鈕 */
.language-toggle {
  display: flex;
  gap: 0.25rem;
  background: rgba(255, 255, 255, 0.5);
  padding: 0.25rem;
  border-radius: 8px;
  flex-shrink: 0;
}

.lang-btn {
  padding: 0.25rem 0.75rem;
  border: none;
  background: transparent;
  color: #92400e;
  font-size: 0.875rem;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.lang-btn:hover {
  background: rgba(255, 255, 255, 0.7);
}

.lang-btn.active {
  background: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* 內容區（佔 90% 空間） */
.knowledge-content-full {
  flex: 1;
  display: flex;
  align-items: flex-start;
  padding: 0.5rem 0;
  overflow-y: auto;
  min-height: 0;
}

.knowledge-text-large {
  font-size: 1.125rem;
  color: #78350f;
  line-height: 1.8;
  word-wrap: break-word;
  overflow-wrap: break-word;
  word-break: break-word;
  white-space: normal;
  margin: 0;
}

/* 自定義滾動條 */
.knowledge-content-full::-webkit-scrollbar {
  width: 6px;
}

.knowledge-content-full::-webkit-scrollbar-track {
  background: rgba(251, 191, 36, 0.2);
  border-radius: 3px;
}

.knowledge-content-full::-webkit-scrollbar-thumb {
  background: #fbbf24;
  border-radius: 3px;
}

.knowledge-content-full::-webkit-scrollbar-thumb:hover {
  background: #f59e0b;
}

/* 取消按鈕（迷你版） */
.btn-cancel-mini {
  padding: 0.5rem 1.5rem;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  align-self: center;
}

.btn-cancel-mini:hover {
  background: #dc2626;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

/* 響應式設計 */
@media (max-width: 768px) {
  .search-container-large {
    padding: 1rem;
  }
  
  .knowledge-card-large {
    padding: 1rem;
    min-height: 300px;
  }
  
  .knowledge-title-inline {
    font-size: 1rem;
  }
  
  .knowledge-text-large {
    font-size: 1rem;
  }
  
  .progress-info {
    font-size: 0.75rem;
  }
}

/* 動畫 */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from {
    transform: translateY(50px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes slideIn {
  from {
    transform: translateX(-20px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

</style>

