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
// 模型配置（與原本相同）
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
// Helper Functions
// ================================================================

async function getUserCredits(supabase: any, userId: string): Promise<number> {
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

function fillTemplate(template: string, data: Record<string, any>): string {
  let result = template
  
  for (const [key, value] of Object.entries(data)) {
    const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
    result = result.replace(placeholder, value || '')
  }
  
  return result
}

function cleanAndParseJson(text: string): any {
  try {
    let cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim()
    
    const jsonMatch = cleanJson.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      cleanJson = jsonMatch[0]
    }
    
    cleanJson = cleanJson.replace(/,(\s*[}\]])/g, '$1')
    cleanJson = cleanJson.replace(/"([^"]+)"\s*:\s*"([^"]+)"\s*:/g, '"$1": "$2",')
    
    const lines = cleanJson.split('\n')
    cleanJson = lines.map(line => {
      const quotes = (line.match(/"/g) || []).length
      if (quotes % 2 !== 0 && !line.trim().endsWith('"')) {
        return line + '"'
      }
      return line
    }).join('\n')
    
    const openBraces = (cleanJson.match(/\{/g) || []).length
    const closeBraces = (cleanJson.match(/\}/g) || []).length
    if (openBraces > closeBraces) {
      console.warn(`⚠️ 偵測到 ${openBraces - closeBraces} 個未閉合的物件，嘗試修復...`)
      cleanJson += '}'.repeat(openBraces - closeBraces)
    }
    
    const openBrackets = (cleanJson.match(/\[/g) || []).length
    const closeBrackets = (cleanJson.match(/\]/g) || []).length
    if (openBrackets > closeBrackets) {
      console.warn(`⚠️ 偵測到 ${openBrackets - closeBrackets} 個未閉合的陣列，嘗試修復...`)
      cleanJson += ']'.repeat(openBrackets - closeBrackets)
    }
    
    try {
      return JSON.parse(cleanJson)
    } catch (firstError) {
      console.warn('⚠️ 第一次解析失敗，嘗試更激進的修復...')
      
      const lastCommaIndex = cleanJson.lastIndexOf(',')
      if (lastCommaIndex > 0) {
        const truncated = cleanJson.substring(0, lastCommaIndex)
        
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

function validateInputs(inputs: Record<string, any>, requiredFields: string[]): void {
  const missingFields = requiredFields.filter(field => !inputs[field])
  
  if (missingFields.length > 0) {
    throw new Error(`缺少必填欄位: ${missingFields.join(', ')}`)
  }
}

// ================================================================
// API 呼叫函數
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
      stream: false,
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

    const { job_id, inputs, model_name } = await req.json()

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
    // Phase 1: ANALYZE
    // ================================================================
    
    console.log('📊 Phase 1: 開始專利分析...')

    const phase1Inputs = {
      title: inputs.title || '',
      field: inputs.field || '',
      problem: inputs.problem || '',
      solution: inputs.solution || '',
      features: Array.isArray(inputs.features) ? inputs.features : [],
      supplementary_features: inputs.supplementary_features || '',
      figures: inputs.figures || ''
    }

    validateInputs(phase1Inputs, ['title', 'field', 'solution'])

    let requiredCredits = modelConfig.costPerRequest
    const currentCredits = await getUserCredits(supabase, user.id)

    let mcpPriorArt = '無'
    
    if (inputs.enable_mcp === true) {
      console.log('🔍 啟用專利檢索...')
      
      const mcpCost = 20
      
      if (currentCredits < requiredCredits + mcpCost) {
        throw new Error(
          `點數不足：需要 ${requiredCredits + mcpCost} 點（模型 ${requiredCredits} + 檢索 ${mcpCost}），目前僅有 ${currentCredits} 點`
        )
      }
      
      try {
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
        
        requiredCredits += mcpCost
        
      } catch (mcpError) {
        console.error('⚠️ 專利檢索失敗:', mcpError)
        mcpPriorArt = '【專利檢索暫時無法使用】\n' + mcpError.message
      }
    } else {
      console.log('⏭️ 未啟用專利檢索')
    }

    if (currentCredits < requiredCredits) {
      throw new Error(
        `點數不足：需要 ${requiredCredits} 點，目前僅有 ${currentCredits} 點`
      )
    }

    const finalPhase1Inputs = {
      ...phase1Inputs,
      mcp_prior_art: mcpPriorArt
    }

    const phase1Prompt = fillTemplate(PROMPT_PHASE1, finalPhase1Inputs)

    console.log(`🤖 呼叫 ${provider.toUpperCase()} API (Phase 1)...`)
    
    const aiResponse = await callAI(
      provider, 
      apiKey, 
      phase1Prompt,
      0.2, 
      modelConfig.apiModel
    )
    
    console.log(`✅ ${provider.toUpperCase()} 回應成功，開始解析 JSON...`)
    
    const cleanedJson = cleanAndParseJson(aiResponse)
    
    console.log('✅ JSON 解析成功')

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

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: cleanedJson,
        credits_required: requiredCredits,
        current_credits: currentCredits,
        mcp_enabled: inputs.enable_mcp === true,
        message: 'Phase 1 分析完成'
      }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('❌ Phase 1 錯誤:', error)
    
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
}, { timeout: 120000 })  // ✅ Phase 1 只需要 2 分鐘
