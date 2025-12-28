import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

// ================================================================
// 常數定義區
// ================================================================

const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages"
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models"
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ================================================================
// 模型配置（與 Phase 1 相同）
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
    thinkingTokens: 0
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
// Phase 2 Prompt（你原本的完整 PROMPT_PHASE2）
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
// Helper Functions
// ================================================================

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

function fillTemplate(template: string, data: Record<string, any>): string {
  let result = template
  
  for (const [key, value] of Object.entries(data)) {
    const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
    result = result.replace(placeholder, value || '')
  }
  
  return result
}

function validateInputs(inputs: Record<string, any>, requiredFields: string[]): void {
  const missingFields = requiredFields.filter(field => !inputs[field])
  
  if (missingFields.length > 0) {
    throw new Error(`缺少必填欄位: ${missingFields.join(', ')}`)
  }
}

// ================================================================
// API 呼叫函數
// ================================================================

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
      stream: true,
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
      }
    }
  }
  
  console.log(`✅ 完整回應長度: ${fullResponse.length} 字元`)
  
  if (!fullResponse) {
    throw new Error('Claude API 沒有回傳任何內容')
  }
  
  return fullResponse
}

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
      return await callClaudeStreaming(apiKey, prompt, temperature, modelName)
    case 'openai':
      return await callOpenAI(apiKey, prompt, temperature, modelName)
    default:
      throw new Error(`不支援的 AI Provider: ${provider}`)
  }
}

// ================================================================
// Main Server Logic
// ================================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('未授權：缺少 Authorization Header')
    }

    const token = authHeader.replace('Bearer ', '')
    
    console.log('🔑 收到 Token (前 30 字元):', token.substring(0, 30) + '...')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      console.error('❌ Token 驗證失敗:', authError)
      throw new Error('未授權：Token 無效或已過期')
    }

    console.log('✅ 使用者驗證成功:', user.email)

    const { job_id, inputs, analysis_result, model_name } = await req.json()

    if (!analysis_result) {
      throw new Error('缺少 Phase 1 分析結果 (analysis_result)')
    }

    const modelConfig = MODEL_CONFIGS[model_name || 'gemini-flash-2.5']
    if (!modelConfig) {
      throw new Error(`不支援的模型: ${model_name}`)
    }

    const provider = modelConfig.provider

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
    // Phase 2: DRAFT
    // ================================================================
    
    console.log('📝 Phase 2: 開始撰寫專利說明書...')

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

    validateInputs(phase2Inputs, ['title', 'field'])

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
    
    const phase2Prompt = fillTemplate(PROMPT_PHASE2, {
      ...phase2Inputs,
      analysis_json: JSON.stringify(analysis_result, null, 2)
    })

    console.log(`🤖 呼叫 ${provider.toUpperCase()} API (Phase 2)...`)
    console.log(`📏 Prompt 長度: ${phase2Prompt.length} 字元`)
    console.log(`🎯 模型: ${modelConfig.apiModel}`)
    console.log(`🌡️ Temperature: 0.3`)

    const aiResponse = await callAI(provider, apiKey, phase2Prompt, 0.3, modelConfig.apiModel)
    
    console.log(`✅ AI 回應成功`)
    console.log(`📏 回應長度: ${aiResponse.length} 字元`)

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

  } catch (error) {
    console.error('❌ Phase 2 錯誤:', error)
    
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
}, { timeout: 300000 })  // ✅ Phase 2 需要 5 分鐘
