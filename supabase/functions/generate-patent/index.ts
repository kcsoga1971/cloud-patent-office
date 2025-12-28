import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

// 🆕 匯入專利檢索模組
import { 
  searchPatents, 
  formatPatentResults, 
  buildSearchQuery 
} from "../_shared/patent-search.ts"

// ================================================================
// 常數定義區
// ================================================================

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models"
const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages"
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ================================================================
// 模型配置與點數定義
// ================================================================

interface ModelConfig {
  name: string
  provider: 'gemini' | 'claude' | 'openai'
  apiModel: string
  costPerRequest: number
  displayName: string
  tier: 'economy' | 'standard' | 'premium'
  description: string
  thinking?: boolean
  thinkingTokens?: number
}

const MODEL_CONFIGS: Record<string, ModelConfig> = {
  // ============================================
  // 低成本層 (50 點) - 3 個推薦模型
  // ============================================
  'claude-haiku-4.5': {
    name: 'claude-haiku-4.5',
    provider: 'claude',
    apiModel: 'claude-haiku-4-5-20251001',
    costPerRequest: 50,
    displayName: 'Claude Haiku 4.5',
    tier: 'economy',
    description: '⚡ 最新快速版 (2025-10-15)',
    thinking: false
  },
  'gpt-5-mini': {
    name: 'gpt-5-mini',
    provider: 'openai',
    apiModel: 'gpt-5-mini',
    costPerRequest: 50,
    displayName: 'GPT-5 Mini',
    tier: 'economy',
    description: '🔥 低成本推理 (384 tokens thinking)',
    thinking: true,
    thinkingTokens: 384
  },
  'gemini-flash-2.5': {
    name: 'gemini-flash-2.5',
    provider: 'gemini',
    apiModel: 'gemini-2.5-flash',
    costPerRequest: 50,
    displayName: 'Gemini 2.5 Flash',
    tier: 'economy',
    description: '🚀 明確推理 (265 tokens thinking)',
    thinking: true,
    thinkingTokens: 265
  },

  // ============================================
  // 中等成本層 (150 點) - 3 個推薦模型
  // ============================================
  'claude-sonnet-4.5': {
    name: 'claude-sonnet-4.5',
    provider: 'claude',
    apiModel: 'claude-sonnet-4-5-20250929',
    costPerRequest: 150,
    displayName: 'Claude Sonnet 4.5',
    tier: 'standard',
    description: '💎 高品質進階 (2025-09-29)',
    thinking: false
  },
  'gemini-pro-2.5': {
    name: 'gemini-pro-2.5',
    provider: 'gemini',
    apiModel: 'gemini-2.5-pro',
    costPerRequest: 150,
    displayName: 'Gemini 2.5 Pro',
    tier: 'standard',
    description: '🧠 最深度推理 (1318 tokens thinking)',
    thinking: true,
    thinkingTokens: 1318
  },
  'gpt-5': {
    name: 'gpt-5',
    provider: 'openai',
    apiModel: 'gpt-5',
    costPerRequest: 150,
    displayName: 'GPT-5',
    tier: 'standard',
    description: '🚀 明確推理 (960 tokens thinking)',
    thinking: true,
    thinkingTokens: 960
  },

  // ============================================
  // 高成本層 (300 點) - 3 個推薦模型
  // ============================================
  'claude-opus-4.5': {
    name: 'claude-opus-4.5',
    provider: 'claude',
    apiModel: 'claude-opus-4-5-20251101',
    costPerRequest: 300,
    displayName: 'Claude Opus 4.5',
    tier: 'premium',
    description: '👑 最高品質 (2025-11-24)',
    thinking: false
  },
  'gpt-5.2': {
    name: 'gpt-5.2',
    provider: 'openai',
    apiModel: 'gpt-5.2',
    costPerRequest: 300,
    displayName: 'GPT-5.2',
    tier: 'premium',
    description: '⚡ 最新版本 (2025-12-11)',
    thinking: true,
    thinkingTokens: 0 // 內部推理，不顯示
  },
  'gemini-3-pro': {
    name: 'gemini-3-pro',
    provider: 'gemini',
    apiModel: 'gemini-3-pro-preview',
    costPerRequest: 300,
    displayName: 'Gemini 3 Pro',
    tier: 'premium',
    description: '🚀 實驗版 (900 tokens thinking)',
    thinking: true,
    thinkingTokens: 900
  }
}

// ================================================================
// Phase 1 Prompt: 專利分析師
// ================================================================

const PROMPT_PHASE1 = `
# Role Definition (角色定義)
你是一位擁有 20 年經驗的台灣資深專利代理人與技術專家。你具備極強的邏輯分析能力，能將發明人提供的技術揭露資料進行深度分析，為後續專利說明書撰寫奠定基礎。

# Task (任務)
**你的任務是進行技術分析，產出結構化的分析筆記，供後續撰寫使用。**
**嚴禁直接撰寫專利說明書正文。**

# Input Data (使用者輸入)
- 發明名稱: {{title}}
- 技術領域: {{field}}
- 痛點 (Problem): {{problem}}
- 解決方案 (Solution): {{solution}}
- 核心特徵: {{features}}
- [選填] 附屬特徵: {{supplementary_features}}
- [選填] 參考專利資料 (MCP Injected): {{mcp_prior_art}}
- [選填] 圖示: {{figures}}

---

# Analysis Process (分析流程)

## Step 1: 輸入品質分級 (Input Grading)

判斷使用者輸入屬於哪一級，決定補強策略：

| 等級 | 型態 | 包含內容 | 補強策略 |
|------|------|----------|----------|
| **L1** | 簡易型 | 僅有元件名稱 | 需大幅補強連接關係、運作流程與技術功效 |
| **L2** | 中等型 | 元件 + 連接關係 | 需補強技術功效與具體實施細節 |
| **L3** | 詳細型 | 元件 + 連接 + 功效 | 專注於上位化與權利範圍佈局 |
| **L4** | 精確型 | 含圖示與詳細參數 | 優化用語，確保邏輯無漏洞 |

**執行動作**：
- 標註目前等級 (L1/L2/L3/L4)
- 列出已提供的資訊
- 列出需補強的項目

---

## Step 1.5: 適格性檢查 (Subject Matter Eligibility)

檢查使用者的輸入是否違反專利法規定：
- 純自然法則（如：E=mc²）
- 單純的數學公式或演算法（無技術應用）
- 違反公共秩序或善良風俗
- 人體或動物的診斷、治療或手術方法

**執行動作**：
- 若違反：標註「⚠️ 不可專利」，並說明理由
- 若符合：標註「✅ 符合專利適格性」，繼續執行

---

## Step 2: 先前技術解析 (Prior Art Analysis)

### 情況 A：有 MCP 資料
- 分析 {{mcp_prior_art}} 中的技術特徵
- 識別現有技術的缺點
- 建立「現有技術特徵表」

### 情況 B：無 MCP 資料
- 運用知識庫，模擬 3 個該領域的「通用現有技術概念」
- 指出其缺點（對應使用者的痛點）
- 建立「假設現有技術特徵表」

**⚠️ 重要指令**：
在模擬現有技術時，**嚴禁**編造具體的專利號碼（如 US1234567）。
請使用泛稱，例如：
- 「習知技術」
- 「傳統[某領域]裝置」
- 「一般市售之[產品]」
- 「現有的[技術類型]」

**執行動作**：
- 撰寫「先前技術摘要」（200-300字）
- 列出現有技術的核心特徵（3-5項）
- 明確指出現有技術的問題點（2-3項）

---

## Step 3: 上位化術語映射 (Term Mapping) - **最關鍵步驟**

建立對照表，將使用者的「具體實作」轉換為「專利功能性用語」。

### 映射表格式

| 使用者用語 | ❌ 錯誤寫法 | ✅ 請求項用語 | 📝 實施例擴充描述 |
|-----------|-----------|-------------|-----------------|
| [具體名稱] | [太窄的寫法] | [上位化用語] | [可為...、...或...等] |

### 標準範例參考

| 使用者用語 | ❌ 錯誤寫法 | ✅ 請求項用語 | 📝 實施例擴充描述 |
|-----------|-----------|-------------|-----------------|
| 螺絲 | 螺絲 | 固定單元 | 可為螺絲、鉚釘、卡扣、黏著劑或磁吸件等 |
| Arduino | Arduino控制板 | 控制單元 | 可為微控制器、單晶片、PLC或FPGA等 |
| 藍牙 | 藍牙模組 | 無線通訊單元 | 可為藍牙、Wi-Fi、Zigbee或LoRa等 |
| MySQL | MySQL資料庫 | 資料儲存單元 | 可為關聯式資料庫、NoSQL資料庫或雲端儲存等 |
| Python程式 | Python程式 | 程式模組 | 可使用Python、Java、C++或其他程式語言實現 |
| 溫度感測器 | 溫度感測器 | 感測單元 | 可為溫度感測器、濕度感測器、壓力感測器等 |
| 馬達 | 馬達 | 驅動源 | 可為電動馬達、氣壓缸、液壓缸或伺服馬達等 |

**執行指令**：
- 針對使用者輸入的每個具體元件，建立映射條目
- 確保「✅ 請求項用語」足夠上位化
- 「📝 實施例擴充描述」至少列出 3 個替代方案

---

## Step 4: 差異技術特徵與請求項佈局

### 4.1 差異分析

找出「本發明 vs 先前技術」的差異點：

**差異元件**：
- [列出新增或改良的元件，使用上位化用語]

**差異連接關係**：
- [列出不同的連接方式或拓撲結構]

**差異技術功效**：
- [列出新的或改善的功效，盡可能量化]

### 4.2 請求項佈局策略

**獨立項 (Claim 1) 規劃**：
- 列出達成發明目的之「最少必要元件」（3-5個）
- 確認每個元件都使用上位化用語
- 確認包含核心差異特徵

**附屬項規劃**（建議 5-10 項）：
- 請求項 2：[細化元件A的結構或類型]
- 請求項 3：[細化元件B的連接方式]
- 請求項 4：[細化技術功效或參數範圍]
- 請求項 5：[增加附屬元件D]
- 請求項 6：[具體實施方式1]
- 請求項 7：[具體實施方式2]

---

# Output Format (輸出格式)

請以 JSON 格式輸出分析結果，結構如下：

{
  "analysis_metadata": {
    "input_quality_level": "L1/L2/L3/L4",
    "eligibility_check": "✅ 符合專利適格性 / ⚠️ 不可專利：[理由]",
    "provided_info": ["元件列表", "連接關係"],
    "missing_info": ["技術功效", "圖示"],
    "補強策略": "需補強..."
  },
  "prior_art_analysis": {
    "summary": "先前技術摘要（200-300字）",
    "existing_technologies": [
      {
        "name": "習知技術A",
        "core_features": ["特徵1", "特徵2", "特徵3"],
        "connection_type": "串聯/並聯",
        "effects": "基本功能描述"
      }
    ],
    "common_problems": [
      "問題1：具體描述",
      "問題2：具體描述"
    ]
  },
  "term_mapping_table": [
    {
      "user_term": "使用者用語",
      "wrong_term": "❌ 錯誤寫法",
      "correct_claim_term": "✅ 請求項用語",
      "embodiment_expansion": "📝 可為...、...或...等"
    }
  ],
  "differentiation_analysis": {
    "differential_components": [
      {
        "component": "上位化元件名稱",
        "prior_art": "無 / 有但不同",
        "invention": "本發明的實現方式",
        "difference": "差異說明"
      }
    ],
    "differential_connections": [
      {
        "connection": "連接關係描述",
        "prior_art": "先前技術的連接方式",
        "invention": "本發明的連接方式",
        "difference": "差異說明"
      }
    ],
    "differential_effects": [
      {
        "effect": "功效描述",
        "prior_art": "先前技術的效果",
        "invention": "本發明的效果（盡可能量化）",
        "improvement": "改善百分比或具體數據"
      }
    ]
  },
  "claim_layout_strategy": {
    "independent_claim": {
      "minimum_elements": [
        "上位元件A：功能描述",
        "上位元件B：功能描述",
        "上位元件C：功能描述"
      ],
      "core_differentiation": "核心差異特徵說明"
    },
    "dependent_claims": [
      {
        "claim_number": 2,
        "depends_on": 1,
        "feature": "細化元件A的類型",
        "content": "其中該[上位元件A]包含..."
      }
    ]
  },
  "drawing_suggestions": [
    {
      "figure_number": "第1圖",
      "type": "系統架構方塊圖",
      "required_elements": ["10-上位元件A", "20-上位元件B"],
      "connection_indicators": "實線箭頭表示訊號流向",
      "highlight_features": "使用粗線標示差異元件"
    }
  ],
  "enablement_補充建議": {
    "device_type": "電子裝置/機械結構/化學配方/軟體系統",
    "必要補充元件": [
      "處理器（規格建議）",
      "記憶體（容量建議）"
    ],
    "技術細節建議": [
      "通訊協定：UART/I2C/SPI",
      "材質：不鏽鋼/鋁合金/ABS"
    ]
  }
}

# Quality Check (品質檢查)
輸出前請自我檢查：
- 術語映射表是否涵蓋所有具體元件？
- 上位化用語是否足夠寬廣（避免過窄）？
- 差異分析是否明確指出「新增」或「改良」？
- 獨立項元件是否為「最少必要」？
- 附屬項是否由寬到窄排列？
- 是否避免編造專利號碼？
- 技術功效是否盡可能量化？

⚠️ 重要提醒：
此階段僅產出分析筆記，不撰寫專利說明書正文。
輸出的 JSON 將作為 Phase 2 的輸入資料。
請直接輸出 JSON，不要包含任何其他文字說明。
`

// ================================================================
// Phase 2 Prompt: 專利說明書撰寫師
// ================================================================

const PROMPT_PHASE2 = `
# Role Definition (角色定義)
你是一位擁有 20 年經驗的台灣資深專利代理人。你將根據前期的技術分析筆記，撰寫符合台灣專利法規、具備防禦力且權利範圍極大化的專利說明書。

# Task (任務)
**根據 Phase 1 的分析筆記，撰寫完整的專利說明書（Markdown 格式）。**

# Input Data (輸入資料)

## 原始使用者輸入
- 發明名稱: {{title}}
- 技術領域: {{field}}
- 痛點: {{problem}}
- 解決方案: {{solution}}
- 核心特徵: {{features}}
- 附屬特徵: {{supplementary_features}}
- 圖示: {{figures}}

## Phase 1 分析筆記 (JSON 格式)
{{analysis_json}}

---

# Drafting Rules (撰寫原則)

## 原則 0.5：用語精準度原則 - 適用於整份說明書

### 連接關係用語
- **訊號傳遞或無線傳輸** → 使用「耦接 (Coupled)」或「通訊連接」
- **實體固定或電路導通** → 使用「連接 (Connected)」或「固接」

### 避免中國大陸用語
- ❌ 信息 → ✅ 資訊
- ❌ 硬盤 → ✅ 硬碟
- ❌ 總線 → ✅ 匯流排
- ❌ 內存 → ✅ 記憶體
- ❌ 軟件 → ✅ 軟體
- ❌ 網絡 → ✅ 網路

---

## 原則 1：前述基礎 (Antecedent Basis) - 僅適用於申請專利範圍

**⚠️ 重要：此原則僅適用於「申請專利範圍」章節**

### 申請專利範圍撰寫規則
- 第一次提及用「一」
- 第二次後用「該」
- 嚴禁出現未定義的元件

### 實施方式撰寫規則
- 可自由使用「該」、「所述」、「上述」
- 可使用「本實施例」、「在一實施例中」
- 重點在於清楚描述技術內容

---

## 原則 2：上位化原則 (Generalization)

### 請求項撰寫
- 必須使用 Phase 1 的「✅ 請求項用語」
- 禁止使用具體實施例名稱

### 實施方式撰寫
- 連結上位化用語與具體實施例
- 標準寫法：「該[上位化用語]10可為[具體實施例1]、[具體實施例2]或[具體實施例3]等，本發明所屬技術領域中具有通常知識者應理解，凡能達成[功能描述]之元件，均屬本發明之範疇。」

---

## 原則 3：可據以實施 (Auto-Enablement)

根據 Phase 1 的「enablement_補充建議」，在實施方式中補充必要細節：

**電子裝置**：處理器規格、記憶體容量、電源規格、通訊協定
**機械結構**：材質、尺寸範圍、連接方式、組裝步驟
**通訊系統**：發射端、接收端、傳輸介面、通訊協定
**化學配方**：成分重量百分比、製備方法、反應條件

⚠️ **注意**：補強內容寫在「實施方式」中，**不可**寫入獨立項

---

## 原則 4：問題與手段鏡像 (Problem-Solution Mapping)

根據 Phase 1 的「prior_art_analysis.common_problems」與「differentiation_analysis」：

**結構**：
先前技術問題 X（來自 Phase 1）
→ 本發明手段 Y（來自差異分析）
→ 達成功效 Z（來自差異功效）
→ 解決問題 X

---

## 原則 5：獨立項格式要求

- 採用「條列式」撰寫
- 格式：「一種[發明名稱]，其包含：一[元件A]...；一[元件B]...；及一[元件C]...。」
- 除非使用者明確要求，否則不使用「其特徵在於」語法

---

# Output Structure (輸出結構)

請依序撰寫以下章節，直接輸出 Markdown 內容（不要包含 \`\`\`markdown 標記）：

## 【發明名稱】
{{title}}

---

## 【摘要】
字數：250-500 字
內容：
- 技術領域（1句）
- 解決的問題（1-2句）
- 技術手段（2-3句，使用上位化用語）
- 核心功效（1-2句，盡可能量化）

---

## 【技術領域】
本發明係關於一種 {{field}}，特別是指一種 [更具體的技術範疇]。

---

## 【先前技術】

### 背景說明
[根據 Phase 1 的 prior_art_analysis.summary 撰寫]

### 現有技術描述
[根據 Phase 1 的 existing_technologies 撰寫]

習知的 [技術A] 通常包含 [元件1]、[元件2] 及 [元件3]，其運作方式為 [描述]。

### 現有技術的問題
然而，上述現有技術存在以下缺點：

[根據 Phase 1 的 common_problems 逐項列出]

1. **[問題一]**：[具體描述]
2. **[問題二]**：[具體描述]
3. **[問題三]**：[具體描述]

因此，如何解決上述問題，實為本技術領域亟待解決之課題。

---

## 【發明內容】

### 發明目的
有鑑於此，本發明之主要目的在於提供一種 {{title}}，以解決上述現有技術之問題。

### 技術手段
為達成上述目的，本發明提供一種 {{title}}，其包含：

[根據 Phase 1 的 claim_layout_strategy.independent_claim.minimum_elements 撰寫]

一 [上位元件A]，用以 [功能描述]；

一 [上位元件B]，[連接關係] 該 [上位元件A]，用以 [功能描述]；及

一 [上位元件C]，[連接關係] 該 [上位元件B]，用以 [功能描述]。

### 有益效果
本發明具有以下有益效果：

[根據 Phase 1 的 differentiation_analysis.differential_effects 撰寫]

1. **[功效一]**：透過 [技術手段]，本發明能 [具體功效描述]，從而解決現有技術 [問題一] 之缺點。[若有量化數據，加入：相較於現有技術提升 XX%]

2. **[功效二]**：藉由 [技術手段]，本發明可達成 [具體功效描述]。

3. **[功效三]**：本發明之 [差異特徵] 使得 [具體功效描述]，有效改善現有技術 [問題三] 之問題。

---

## 【圖式簡單說明】

[根據 Phase 1 的 drawing_suggestions 撰寫]

- **第1圖**：本發明之系統架構示意圖。
- **第2圖**：本發明之 [元件A] 的細部結構示意圖。
- **第3圖**：本發明之運作流程示意圖。
- **第4圖**：本發明之實施例應用示意圖。

---

## 【實施方式】

以下配合圖式及元件符號，詳細說明本發明之較佳實施例，使本發明所屬技術領域中具有通常知識者能據以實施。

### 較佳實施例

請參閱第1圖，本發明提供一種 {{title}}，其包含 [上位元件A] 10、[上位元件B] 20 及 [上位元件C] 30。

#### [上位元件A] 10

[根據 Phase 1 的 term_mapping_table 找到對應的上位化用語與實施例擴充]

[上位元件A] 10 用以 [功能描述]。在本實施例中，[上位元件A] 10 可為 [具體實施例1]、[具體實施例2] 或 [具體實施例3] 等。本發明所屬技術領域中具有通常知識者應理解，凡能達成 [功能描述] 之元件，均屬本發明之範疇。

具體而言，[上位元件A] 10 包含 [子元件11] 與 [子元件12]。[子元件11] 用以 [功能描述]，[子元件12] 用以 [功能描述]。

[根據 Phase 1 的 enablement_補充建議，補充技術細節]

#### [上位元件B] 20

[上位元件B] 20 與 [上位元件A] 10 [連接/耦接]，用以 [功能描述]。

在本實施例中，[上位元件B] 20 可為 [具體實施例1]、[具體實施例2] 或 [具體實施例3] 等。

[上位元件B] 20 與 [上位元件A] 10 之間的連接方式可為 [具體連接方式1]、[具體連接方式2] 或其他適當的連接方式。

#### [上位元件C] 30

[上位元件C] 30 與 [上位元件B] 20 [連接/耦接]，用以 [功能描述]。

### 運作流程

請參閱第3圖，本發明之運作流程如下：

首先，[上位元件A] 10 執行 [動作描述]，並將 [資料/訊號] 傳送至 [上位元件B] 20。

接著，[上位元件B] 20 接收 [資料/訊號] 後，進行 [處理動作描述]。

然後，[上位元件C] 30 依據 [條件] 執行 [動作描述]。

### 技術細節補充

[根據 Phase 1 的 enablement_補充建議.device_type 補充對應細節]

**若為電子裝置**：
本實施例中，[上位元件A] 10 可包含處理器、記憶體及電源模組。處理器可為 32 位元微控制器，記憶體容量可為 256KB Flash 及 64KB RAM，電源規格可為 DC 5V, 1A。[上位元件A] 10 與 [上位元件B] 20 之間的通訊協定可採用 UART、I2C 或 SPI 等標準協定。

**若為機械結構**：
本實施例中，[上位元件A] 10 的材質可為不鏽鋼、鋁合金或 ABS 塑膠等。尺寸範圍可為長度 10-50cm，寬度 5-20cm。[上位元件A] 10 與 [上位元件B] 20 之間的連接方式可採用螺紋連接、卡扣固定或焊接等方式。

**若為化學配方**：
本實施例中，各成分的重量百分比範圍為：成分 A 佔 30-50%，成分 B 佔 10-20%，成分 C 佔 20-40%，其餘為溶劑。製備方法包含混合、加熱至 60-80°C 並持續攪拌 30-60 分鐘。反應條件可為常壓或 1-3 atm 的加壓環境。

### 其他實施例

本發明並不限於上述實施例。例如，[上位元件A] 10 亦可採用 [其他實施方式]，[上位元件B] 20 與 [上位元件C] 30 之間亦可增設 [附加元件]，以達成 [其他功效]。

此外，本發明亦可應用於 [其他應用場景]，透過調整 [參數] 或 [配置]，即可適應不同的使用需求。

---

## 【符號說明】

[根據實施方式中使用的編號，建立符號說明表]

| 編號 | 名稱 | 說明 |
|------|------|------|
| 10 | [上位元件A] | [簡要說明] |
| 11 | [子元件11] | [簡要說明] |
| 12 | [子元件12] | [簡要說明] |
| 20 | [上位元件B] | [簡要說明] |
| 30 | [上位元件C] | [簡要說明] |

---

## 【申請專利範圍】

**⚠️ 注意：以下請求項必須嚴格遵守「前述基礎原則」與「上位化原則」**

### 請求項 1

[根據 Phase 1 的 claim_layout_strategy.independent_claim 撰寫]

一種 {{title}}，其包含：

一 [上位元件A]，用以 [功能描述]；

一 [上位元件B]，[連接關係] 該 [上位元件A]，用以 [功能描述]；及

一 [上位元件C]，[連接關係] 該 [上位元件B]，用以 [功能描述]。

### 請求項 2-N

[根據 Phase 1 的 claim_layout_strategy.dependent_claims 逐項撰寫]

### 請求項 2
如請求項1所述之 {{title}}，其中該 [上位元件A] 包含 [子元件11] 與 [子元件12]。

### 請求項 3
如請求項1所述之 {{title}}，其中該 [上位元件B] 係透過 [具體連接方式] 連接該 [上位元件A]。

### 請求項 4
如請求項1所述之 {{title}}，其中該 [上位元件C] 進一步包含 [附加子元件]，用以 [功能描述]。

### 請求項 5
如請求項1所述之 {{title}}，更包含：

一 [附加元件D]，[連接關係] 該 [上位元件C]，用以 [功能描述]。

---

## 【圖式繪製建議】

[根據 Phase 1 的 drawing_suggestions 詳細描述每一張圖]

### 第1圖：系統架構示意圖

**圖式類型**：方塊圖 (Block Diagram)

**必要元件與標號**：
- 10：[上位元件A]
- 11：[子元件11]
- 12：[子元件12]
- 20：[上位元件B]
- 30：[上位元件C]

**連接關係標示**：
- 實線箭頭：表示訊號/資料流向
- 虛線箭頭：表示回饋迴路或控制訊號
- 雙向箭頭：表示雙向通訊

**差異特徵標示**：
- 使用粗線或不同顏色標示差異元件
- 標註關鍵連接關係

**繪製要點**：
- 各方塊應清楚標示元件編號與名稱
- 連接線應標示訊號類型或資料流向
- 整體佈局應清晰易讀

---

# Quality Check (品質檢查)

撰寫完成後，請自我檢查：

### 申請專利範圍檢查
- 每個「該」都有對應的「一」
- 獨立項使用 Phase 1 的上位化用語
- 獨立項僅包含最少必要元件
- 附屬項由寬到窄排列

### 實施方式檢查
- 將上位化用語與具體實施例連結
- 補充了必要的技術細節
- 使用正確的連接用語（連接/耦接）

### 全文檢查
- 元件名稱全文統一
- 發明內容對應先前技術問題
- 元件編號與圖示對應
- 避免中國大陸用語
- 符號說明完整

---

**請直接輸出完整的 Markdown 格式專利說明書，不要包含任何其他說明文字。**
`

// ================================================================
// Helper Functions (輔助函數)
// ================================================================

/**
 * 檢查並扣除點數（使用 RPC 函數）
 * @param supabase - Supabase Client
 * @param userId - 使用者 ID
 * @param credits - 要扣除的點數
 * @param modelName - 使用的模型名稱
 * @param jobId - Job ID
 * @param projectId - Project ID
 * @returns 扣除結果
 */
async function deductCreditsWithLog(
  supabase: any,
  userId: string,
  credits: number,
  modelName: string,
  jobId: string,
  projectId: string
): Promise<{ success: boolean; new_balance: number; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('deduct_credits_with_log', {
      p_user_id: userId,
      p_credits: credits,
      p_action_type: 'patent_generation',
      p_description: `使用 ${modelName} 生成專利說明書`,
      p_model_name: modelName,
      p_job_id: jobId,
      p_project_id: projectId
    })

    if (error) {
      return { success: false, new_balance: 0, error: error.message }
    }

    return { 
      success: true, 
      new_balance: data.new_balance 
    }
  } catch (err) {
    return { 
      success: false, 
      new_balance: 0, 
      error: err.message 
    }
  }
}

/**
 * 取得使用者當前點數
 * @param supabase - Supabase Client
 * @param userId - 使用者 ID
 * @returns 點數餘額
 */
async function getUserCredits(
  supabase: any,
  userId: string
): Promise<number> {
  const { data, error } = await supabase
    .from('profiles')
    .select('credits_balance')
    .eq('id', userId)
    .single()

  if (error || !data) {
    throw new Error('無法取得使用者點數')
  }

  return data.credits_balance || 0
}

/**
 * 填充 Prompt 模板變數
 * @param template - 包含 {{variable}} 的模板字串
 * @param data - 資料物件
 * @returns 填充後的字串
 */
function fillTemplate(template: string, data: Record<string, any>): string {
  let result = template
  
  // 替換所有 {{variable}} 格式的變數
  for (const [key, value] of Object.entries(data)) {
    const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
    result = result.replace(placeholder, value || '')
  }
  
  return result
}

/**
 * 清理並解析 JSON
 * @param text - 可能包含 Markdown 標記的 JSON 文字
 * @returns 解析後的 JSON 物件
 */
function cleanAndParseJson(text: string): any {
  try {
    // 1. 移除 Markdown 標記
    let cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim()
    
    // 2. 提取 JSON 物件
    const jsonMatch = cleanJson.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      cleanJson = jsonMatch[0]
    }
    
    // 3. 修復常見錯誤
    // 移除尾部逗號
    cleanJson = cleanJson.replace(/,(\s*[}\]])/g, '$1')
    
    // ✅ 修復 "key": "value": 的錯誤（多餘的冒號）
    cleanJson = cleanJson.replace(/"([^"]+)"\s*:\s*"([^"]+)"\s*:/g, '"$1": "$2",')
    
    // ✅ 修復未閉合的字串（在行尾加引號）
    const lines = cleanJson.split('\n')
    cleanJson = lines.map(line => {
      // 檢查是否有未配對的引號
      const quotes = (line.match(/"/g) || []).length
      if (quotes % 2 !== 0 && !line.trim().endsWith('"')) {
        return line + '"'
      }
      return line
    }).join('\n')
    
    // 修復未閉合的物件
    const openBraces = (cleanJson.match(/\{/g) || []).length
    const closeBraces = (cleanJson.match(/\}/g) || []).length
    if (openBraces > closeBraces) {
      console.warn(`⚠️ 偵測到 ${openBraces - closeBraces} 個未閉合的物件，嘗試修復...`)
      cleanJson += '}'.repeat(openBraces - closeBraces)
    }
    
    // 修復未閉合的陣列
    const openBrackets = (cleanJson.match(/\[/g) || []).length
    const closeBrackets = (cleanJson.match(/\]/g) || []).length
    if (openBrackets > closeBrackets) {
      console.warn(`⚠️ 偵測到 ${openBrackets - closeBrackets} 個未閉合的陣列，嘗試修復...`)
      cleanJson += ']'.repeat(openBrackets - closeBrackets)
    }
    
    // 4. 嘗試解析
    try {
      return JSON.parse(cleanJson)
    } catch (firstError) {
      console.warn('⚠️ 第一次解析失敗，嘗試更激進的修復...')
      
      // ✅ 更激進的修復：移除最後一個不完整的屬性
      const lastCommaIndex = cleanJson.lastIndexOf(',')
      if (lastCommaIndex > 0) {
        const truncated = cleanJson.substring(0, lastCommaIndex)
        
        // 補齊閉合符號
        const openBraces2 = (truncated.match(/\{/g) || []).length
        const closeBraces2 = (truncated.match(/\}/g) || []).length
        const openBrackets2 = (truncated.match(/\[/g) || []).length
        const closeBrackets2 = (truncated.match(/\]/g) || []).length
        
        let fixed = truncated
        fixed += ']'.repeat(Math.max(0, openBrackets2 - closeBrackets2))
        fixed += '}'.repeat(Math.max(0, openBraces2 - closeBraces2))
        
        console.log('🔧 嘗試截斷並修復 JSON...')
        return JSON.parse(fixed)
      }
      
      throw firstError
    }
    
  } catch (error) {
    console.error('❌ JSON Parse Error:', error)
    console.error('📄 Original text (first 1000 chars):', text.substring(0, 1000))
    console.error('📄 Original text (last 500 chars):', text.substring(text.length - 500))
    
    throw new Error(`AI 輸出格式錯誤，無法解析為 JSON: ${error.message}`)
  }
}

/**
 * 驗證必填欄位
 * @param inputs - 輸入資料
 * @param requiredFields - 必填欄位列表
 */
function validateInputs(inputs: Record<string, any>, requiredFields: string[]): void {
  const missingFields = requiredFields.filter(field => !inputs[field])
  
  if (missingFields.length > 0) {
    throw new Error(`缺少必填欄位: ${missingFields.join(', ')}`)
  }
}

// ================================================================
// API 呼叫函數（✅ 只保留這一次定義）
// ================================================================

async function callGemini(apiKey: string, prompt: string, temperature: number, modelName: string): Promise<string> {
  const url = `${GEMINI_API_URL}/${modelName}:generateContent?key=${apiKey}`
  
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: temperature,
        maxOutputTokens: 8192
      }
    })
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Gemini API Error (${res.status}): ${errorText}`)
  }

  const data = await res.json()
  
  if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
    throw new Error('Gemini 回應格式異常')
  }

  return data.candidates[0].content.parts[0].text
}

// 原本的 callClaude（用於 Phase 1）
async function callClaude(apiKey: string, prompt: string, temperature: number, modelName: string): Promise<string> {
  const res = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: modelName,
      max_tokens: 16000,
      temperature: temperature,
      stream: false,  // ✅ 不使用 Streaming
      messages: [{ role: 'user', content: prompt }]
    })
  })
  
  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Claude API Error (${res.status}): ${errorText}`)
  }
  
  const data = await res.json()
  
  if (!data.content?.[0]?.text) {
    throw new Error('Claude 回應格式異常')
  }
  
  return data.content[0].text
}

// 新的 callClaudeStreaming（用於 Phase 2）
async function callClaudeStreaming(apiKey: string, prompt: string, temperature: number, modelName: string): Promise<string> {
  console.log('🚀 準備呼叫 Claude API (Streaming)...')
  console.log(`📏 Prompt 長度: ${prompt.length} 字元`)
  console.log(`🎯 模型: ${modelName}`)
  
  const startTime = Date.now()
  
  const res = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: modelName,
      max_tokens: 16000,
      temperature: temperature,
      stream: true,  // ✅ 啟用 Streaming
      messages: [{ role: 'user', content: prompt }]
    })
  })
  
  if (!res.ok) {
    const errorText = await res.text()
    console.error(`❌ Claude API 錯誤 (${res.status}):`, errorText)
    throw new Error(`Claude API Error (${res.status}): ${errorText}`)
  }
  
  let fullResponse = ''
  const reader = res.body?.getReader()
  const decoder = new TextDecoder()
  
  if (!reader) {
    throw new Error('無法讀取回應')
  }
  
  console.log('📥 開始接收 Streaming 回應...')
  
  let lastLogTime = Date.now()
  let chunkCount = 0
  
  while (true) {
    const { done, value } = await reader.read()
    
    if (done) {
      const elapsed = Date.now() - startTime
      console.log(`✅ Streaming 完成 (${elapsed}ms，共 ${chunkCount} 個 chunk)`)
      break
    }
    
    const chunk = decoder.decode(value)
    const lines = chunk.split('\n').filter(line => line.trim().startsWith('data:'))
    
    for (const line of lines) {
      const data = line.replace('data:', '').trim()
      
      if (data === '[DONE]') continue
      
      try {
        const parsed = JSON.parse(data)
        
        if (parsed.type === 'content_block_delta') {
          fullResponse += parsed.delta.text
          chunkCount++
          
          // 每 10 秒輸出一次進度
          const now = Date.now()
          if (now - lastLogTime > 10000) {
            const elapsed = now - startTime
            console.log(`📊 進度: ${chunkCount} chunks, ${fullResponse.length} 字元 (${Math.round(elapsed/1000)}s)`)
            lastLogTime = now
          }
        }
        
        if (parsed.type === 'message_stop') {
          console.log('✅ Claude 訊息接收完成')
        }
        
        if (parsed.type === 'error') {
          console.error('❌ Claude 回傳錯誤:', parsed)
          throw new Error(`Claude API Error: ${parsed.error?.message || 'Unknown error'}`)
        }
        
      } catch (e) {
        if (e.message?.includes('Claude API Error')) {
          throw e
        }
        // 忽略 JSON 解析錯誤
      }
    }
  }
  
  console.log(`✅ 完整回應長度: ${fullResponse.length} 字元`)
  
  if (!fullResponse) {
    throw new Error('Claude API 沒有回傳任何內容')
  }
  
  return fullResponse
}

async function callOpenAI(apiKey: string, prompt: string, temperature: number, modelName: string): Promise<string> {
  const res = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: modelName,
      messages: [{ role: 'user', content: prompt }],
      temperature: temperature,
      max_tokens: 16000
    })
  })
  
  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`OpenAI API Error (${res.status}): ${errorText}`)
  }
  
  const data = await res.json()
  
  if (!data.choices?.[0]?.message?.content) {
    throw new Error('OpenAI 回應格式異常')
  }
  
  return data.choices[0].message.content
}

async function callAI(
  provider: 'gemini' | 'claude' | 'openai', 
  apiKey: string, 
  prompt: string, 
  temperature: number,
  modelName: string
): Promise<string> {
  console.log(`🤖 使用 ${provider.toUpperCase()} API (${modelName})...`)
  
  switch (provider) {
    case 'gemini':
      return await callGemini(apiKey, prompt, temperature, modelName)
    case 'claude':
      return await callClaude(apiKey, prompt, temperature, modelName)
    case 'openai':
      return await callOpenAI(apiKey, prompt, temperature, modelName)
    default:
      throw new Error(`不支援的 AI Provider: ${provider}`)
  }
}

// ================================================================
// Main Server Logic (主要伺服器邏輯)
// ================================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 🆕 1. 取得並驗證 Authorization Header
    const authHeader = req.headers.get('Authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('未授權：缺少 Authorization Header')
    }

    const token = authHeader.replace('Bearer ', '')
    
    console.log('🔑 收到 Token (前 30 字元):', token.substring(0, 30) + '...')

    // 🆕 2. 使用 Service Role Key 建立 Supabase Client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''  // ✅ 改用 SERVICE_ROLE_KEY
    )

    // 🆕 3. 驗證 Token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      console.error('❌ Token 驗證失敗:', authError)
      throw new Error('未授權：Token 無效或已過期')
    }

    console.log('✅ 使用者驗證成功:', user.email)

    // 解析請求內容
    const { action, job_id, inputs, analysis_result, model_name } = await req.json()

    // 🆕 驗證並取得模型配置
    const modelConfig = MODEL_CONFIGS[model_name || 'gemini-flash-2.5']
    if (!modelConfig) {
      throw new Error(`不支援的模型: ${model_name}`)
    }

    const provider = modelConfig.provider

    // ✅ 根據 provider 選擇正確的 API Key

    let apiKey: string | undefined

    switch (provider) {
      case 'gemini':
        apiKey = Deno.env.get('GEMINI_API_KEY')
        break
      case 'claude':
        apiKey = Deno.env.get('ANTHROPIC_API_KEY')
        break
      case 'openai':
        apiKey = Deno.env.get('OPENAI_API_KEY')
        break
      default:
        throw new Error(`不支援的 Provider: ${provider}`)
    }

    if (!apiKey) {
      throw new Error(`${provider.toUpperCase()}_API_KEY 環境變數未設定`)
    }

    console.log(`📊 使用模型: ${modelConfig.displayName} (${provider.toUpperCase()})`)

// ================================================================
// 🚀 Phase 1: ANALYZE
// ================================================================
if (action === 'ANALYZE') {
  console.log('📊 Phase 1: 開始專利分析...')

  // ✅ 1. 先定義 phase1Inputs（在驗證前）
  const phase1Inputs = {
    title: inputs.title || '',
    field: inputs.field || '',
    problem: inputs.problem || '',
    solution: inputs.solution || '',
    features: Array.isArray(inputs.features) ? inputs.features : [],
    supplementary_features: inputs.supplementary_features || '',
    figures: inputs.figures || ''
  }

  // ✅ 2. 驗證必填欄位
  validateInputs(phase1Inputs, ['title', 'field', 'solution'])

  // ✅ 3. 計算基礎點數
  let requiredCredits = modelConfig.costPerRequest
  const currentCredits = await getUserCredits(supabase, user.id)

  // ✅ 4. 專利檢索（如果啟用）
  let mcpPriorArt = '無'
  
  if (inputs.enable_mcp === true) {
    console.log('🔍 啟用專利檢索...')
    
    const mcpCost = 20
    
    // 檢查點數是否足夠（基礎 + MCP）
    if (currentCredits < requiredCredits + mcpCost) {
      throw new Error(
        `點數不足：需要 ${requiredCredits + mcpCost} 點（模型 ${requiredCredits} + 檢索 ${mcpCost}），目前僅有 ${currentCredits} 點`
      )
    }
    
    try {
      // ✅ 修正：buildSearchQuery 接受 3 個字串參數
      const searchQuery = buildSearchQuery(
        phase1Inputs.title,
        phase1Inputs.field,
        phase1Inputs.solution
      )
      
      console.log(`🔍 搜尋關鍵字: "${searchQuery}"`)
      
      const searchResults = await searchPatents(
        searchQuery,
        Deno.env.get('GOOGLE_SEARCH_API_KEY') ?? '',
        Deno.env.get('GOOGLE_SEARCH_ENGINE_ID') ?? '',
        5
      )
      
      mcpPriorArt = formatPatentResults(searchResults)
      
      console.log(`✅ 專利檢索完成，找到 ${searchResults.length} 筆結果`)
      
      // ✅ 增加總點數消耗
      requiredCredits += mcpCost
      
    } catch (mcpError) {
      console.error('⚠️ 專利檢索失敗:', mcpError)
      mcpPriorArt = '【專利檢索暫時無法使用】\n' + mcpError.message
    }
  } else {
    console.log('⏭️ 未啟用專利檢索')
  }

  // ✅ 5. 檢查點數是否足夠（最終檢查）
  if (currentCredits < requiredCredits) {
    throw new Error(
      `點數不足：需要 ${requiredCredits} 點，目前僅有 ${currentCredits} 點`
    )
  }

  // ✅ 6. 更新 phase1Inputs，加入檢索結果
  const finalPhase1Inputs = {
    ...phase1Inputs,
    mcp_prior_art: mcpPriorArt
  }

  // ✅ 7. 填充 Prompt
  const phase1Prompt = fillTemplate(PROMPT_PHASE1, finalPhase1Inputs)

  console.log(`🤖 呼叫 ${provider.toUpperCase()} API (Phase 1)...`)
  
  // ✅ 8. 呼叫 AI（使用 phase1Prompt）
  const aiResponse = await callAI(
    provider, 
    apiKey, 
    phase1Prompt,  // ✅ 使用正確的變數名稱
    0.2, 
    modelConfig.apiModel
  )
  
  console.log(`✅ ${provider.toUpperCase()} 回應成功，開始解析 JSON...`)
  
  const cleanedJson = cleanAndParseJson(aiResponse)
  
  console.log('✅ JSON 解析成功')

  // ✅ 9. 更新資料庫
  const { error: updateError } = await supabase
    .from('saas_jobs')
    .update({
      status: 'analysis_completed',
      result_data: { 
        analysis: cleanedJson,
        model_used: modelConfig.name
      }
    })
    .eq('id', job_id)

  if (updateError) {
    throw new Error(`資料庫更新失敗: ${updateError.message}`)
  }

  console.log('✅ Phase 1 完成，分析結果已儲存')

  // ✅ 10. 返回結果
  return new Response(
    JSON.stringify({ 
      success: true, 
      data: cleanedJson,
      credits_required: requiredCredits,
      current_credits: currentCredits,
      mcp_enabled: inputs.enable_mcp === true,
      message: 'Phase 1 分析完成，請檢視結果後執行 Phase 2'
    }), 
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  )
}

// ================================================================
// 🚀 Phase 2: DRAFT
// ================================================================
else if (action === 'DRAFT') {
  console.log('📝 Phase 2: 開始撰寫專利說明書...')
  
  if (!analysis_result) {
    throw new Error('缺少 Phase 1 分析結果 (analysis_result)')
  }
  
  // ✅ 1. 定義 phase2Inputs
  const phase2Inputs = {
    title: inputs.title || '',
    field: inputs.field || '',
    problem: inputs.problem || '',
    solution: inputs.solution || '',
    features: Array.isArray(inputs.features) 
      ? inputs.features.join('\n') 
      : (inputs.features || ''),
    supplementary_features: inputs.supplementary_features || '無',
    figures: inputs.figures || '無'
  }

  // ✅ 2. 驗證必填欄位
  validateInputs(phase2Inputs, ['title', 'field'])

  // ✅ 3. 計算點數並扣除
  const requiredCredits = modelConfig.costPerRequest
  
  console.log(`💳 扣除 ${requiredCredits} 點數...`)
  
  const deductResult = await deductCreditsWithLog(
    supabase,
    user.id,
    requiredCredits,
    modelConfig.displayName,
    job_id,
    inputs.project_id
  )

  if (!deductResult.success) {
    throw new Error(deductResult.error || '點數扣除失敗')
  }

  console.log(`✅ 點數扣除成功，剩餘 ${deductResult.new_balance} 點`)
  
  // ✅ 4. 填充 Prompt（加入 analysis_result）
  const phase2Prompt = fillTemplate(PROMPT_PHASE2, {
    ...phase2Inputs,
    analysis_json: JSON.stringify(analysis_result, null, 2)
  })

  // ✅ 5. 呼叫 AI（使用 phase2Prompt）
  console.log(`🤖 呼叫 ${provider.toUpperCase()} API (Phase 2)...`)
  console.log(`📏 Prompt 長度: ${phase2Prompt.length} 字元`)
  console.log(`🎯 模型: ${modelConfig.apiModel}`)
  console.log(`🌡️ Temperature: 0.3`)

  // ✅ Phase 2 使用 Streaming（回應較長）
  const aiResponse = provider === 'claude'
    ? await callClaudeStreaming(apiKey, phase2Prompt, 0.3, modelConfig.apiModel)
    : await callAI(provider, apiKey, phase2Prompt, 0.3, modelConfig.apiModel)
  
  console.log(`✅ AI 回應成功`)
  console.log(`📏 回應長度: ${aiResponse.length} 字元`)

  // ✅ 6. 更新資料庫
  const { error: updateError } = await supabase
    .from('saas_jobs')
    .update({
      status: 'completed',
      result_data: { 
        analysis: analysis_result,
        draft: aiResponse,
        model_used: modelConfig.name
      }, 
      completed_at: new Date().toISOString()
    })
    .eq('id', job_id)

  if (updateError) {
    throw new Error(`資料庫更新失敗: ${updateError.message}`)
  }

  console.log('✅ Phase 2 完成，專利說明書已儲存')

  // ✅ 7. 返回結果
  return new Response(
    JSON.stringify({ 
      success: true, 
      data: aiResponse,
      credits_deducted: requiredCredits,
      remaining_credits: deductResult.new_balance,
      message: 'Phase 2 完成，專利說明書已生成'
    }), 
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  )
}

// ================================================================
// ❌ 無效的 action
// ================================================================
else {
  throw new Error(`無效的 action 參數: ${action}。有效值為 'ANALYZE' 或 'DRAFT'`)
}

  } catch (error) {
    console.error('❌ Edge Function 執行錯誤:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        details: error.stack
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
}, { timeout: 300000 })


/* Deno Deploy 會自動處理以下內容，無需額外設定 */