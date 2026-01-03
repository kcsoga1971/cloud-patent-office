// src/data/knowledgeData.js

export const userLevels = [
  {
    id: 'novice',
    label: '🌱 專利小白',
    desc: '我有創意，想了解如何保護它',
    recommended_tools: ['drafting', 'search'],
    color: '#4CAF50'
  },
  {
    id: 'intermediate',
    label: '🔧 研發/工程師',
    desc: '懂技術，遇到專利障礙或需答辯',
    recommended_tools: ['defense', 'design_around', 'analysis'],
    color: '#2196F3'
  },
  {
    id: 'expert',
    label: '⚖️ 專利專家',
    desc: '需進行高階攻防、鑑價與佈局',
    recommended_tools: ['invalidation', 'valuation', 'landscape'],
    color: '#9C27B0'
  }
]

export const articles = [
  // --- Novice ---
  {
    id: 'patent-101',
    title: '專利入門：把點子變資產的第一步',
    summary: '不用懂法律，只要會描述技術。教您如何利用 AI 將一句話擴寫成完整的專利說明書。',
    level: 'novice',
    category: '基礎觀念',
    related_tool: 'drafting'
  },
  {
    id: 'search-basics',
    title: '不要閉門造車！申請前必做的前案檢索',
    summary: '如何使用我們的「全球檢索入口」確認您的創意是否已被他人申請？避免白花錢。',
    level: 'novice',
    category: '操作指南',
    related_tool: 'search'
  },
  
  // --- Intermediate ---
  {
    id: 'oa-response',
    title: '收到核駁通知怎麼辦？AI 答辯全攻略',
    summary: '審查員說「不具進步性」是什麼意思？利用 Defense 模組自動生成三種答辯策略。',
    level: 'intermediate',
    category: '實務技巧',
    related_tool: 'defense'
  },
  {
    id: 'design-around-guide',
    title: '合法抄襲？迴避設計的黃金法則',
    summary: '全要件原則解析。如何利用 AI 找出對手專利的漏洞，進行改良式創新。',
    level: 'intermediate',
    category: '法律知識',
    related_tool: 'design_around'
  },

  // --- Expert ---
  {
    id: 'invalidation-strategy',
    title: '專利殺手：如何撰寫無效舉發理由書？',
    summary: '利用 AI 自動進行「多篇引證案組合」，擊破對手的進步性防線。',
    level: 'expert',
    category: '高階攻防',
    related_tool: 'invalidation'
  },
  {
    id: 'valuation-methodology',
    title: 'AI 專利鑑價模型白皮書',
    summary: '解構我們的收益法模型。法律強度、技術生命週期與市場參數如何共同決定專利價值。',
    level: 'expert',
    category: '方法論',
    related_tool: 'valuation'
  }
]