import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages"
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models"
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ================================================================
// 模型配置（與 draft-patent 相同）
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
  // ... 其他模型配置（與 draft-patent 相同）
}

// ================================================================
// Phase 2a Prompt（思考階段）
// ================================================================

const PROMPT_PHASE2A = `
# Role Definition (角色定義)
你是一位擁有 20 年經驗的台灣資深專利代理人。你將根據 Phase 1 的分析筆記，進行深度思考並產出專利說明書的撰寫架構。

# Task (任務)
**根據 Phase 1 的分析筆記，產出結構化的撰寫架構（JSON 格式）。**

⚠️ 重要：此階段僅產出架構，不撰寫完整說明書正文。

# Input Data (輸入資料)

## 原始使用者輸入
- 發明名稱: {{title}}
- 技術領域: {{field}}
- 痛點: {{problem}}
- 解決方案: {{solution}}
- 核心特徵: {{features}}
- 附屬特徵: {{supplementary_features}}

## Phase 1 分析筆記 (JSON 格式)
{{analysis_json}}

---

# Thinking Process (思考流程)

## Step 1: 先前技術詳細分析

根據 Phase 1 的 prior_art_analysis，擴充先前技術的描述：

**背景說明**（500-800 字）：
- 技術領域的發展歷史
- 現有技術的主流方案
- 市場上的常見產品

**現有技術 1-3**（每個 300-500 字）：
- 技術名稱
- 核心特徵（3-5 項）
- 連接關係
- 運作方式
- 存在的問題

---

## Step 2: 實施方式架構規劃

根據 Phase 1 的 term_mapping_table 與 differentiation_analysis，為每個上位化元件規劃詳細描述：

**元件 A**：
- 上位化用語：[從 Phase 1 取得]
- 功能描述：[200-300 字]
- 具體實施例：[至少 3 個]
- 技術細節：[300-500 字]
  - 若為電子裝置：處理器規格、記憶體容量、通訊協定
  - 若為機械結構：材質、尺寸範圍、連接方式
  - 若為化學配方：成分比例、製備方法、反應條件

**元件 B**：
- [同上]

**元件 C**：
- [同上]

**連接關係**：
- 元件 A 與 B 的連接方式（3-5 種）
- 元件 B 與 C 的連接方式（3-5 種）
- 訊號流向或資料傳遞路徑

**運作流程**：
- 步驟 1：[具體描述]
- 步驟 2：[具體描述]
- 步驟 3：[具體描述]

---

## Step 3: 申請專利範圍佈局

根據 Phase 1 的 claim_layout_strategy，規劃請求項結構：

**獨立項 (Claim 1)**：
- 前言：一種 {{title}}，其包含：
- 元件 A：一 [上位化用語]，用以 [功能描述]；
- 元件 B：一 [上位化用語]，[連接關係] 該 [元件A]，用以 [功能描述]；
- 元件 C：一 [上位化用語]，[連接關係] 該 [元件B]，用以 [功能描述]。

**附屬項 2-10**：
- 請求項 2：細化元件 A 的結構或類型
- 請求項 3：細化元件 B 的連接方式
- 請求項 4：細化元件 C 的功能
- 請求項 5：增加附屬元件 D
- 請求項 6：具體實施方式 1
- 請求項 7：具體實施方式 2
- 請求項 8：參數範圍限定
- 請求項 9：應用場景 1
- 請求項 10：應用場景 2

每個附屬項需包含：
- 依附對象（如請求項 1）
- 細化特徵（具體描述）
- 撰寫理由（為何這樣佈局）

---

# Output Format (輸出格式)

請以 JSON 格式輸出思考架構：

\`\`\`json
{
  "prior_art_detail": {
    "background": "技術領域背景說明（500-800字）",
    "existing_tech_1": {
      "name": "習知技術A",
      "core_features": ["特徵1", "特徵2", "特徵3"],
      "connection_type": "串聯/並聯",
      "operation": "運作方式描述（300-500字）",
      "problems": ["問題1", "問題2"]
    },
    "existing_tech_2": {
      "name": "習知技術B",
      "core_features": ["特徵1", "特徵2", "特徵3"],
      "connection_type": "串聯/並聯",
      "operation": "運作方式描述（300-500字）",
      "problems": ["問題1", "問題2"]
    }
  },
  "embodiment_structure": {
    "component_A": {
      "generalized_term": "上位化用語",
      "function": "功能描述（200-300字）",
      "examples": ["實施例1", "實施例2", "實施例3"],
      "technical_details": "技術細節（300-500字）",
      "sub_components": [
        {
          "name": "子元件11",
          "function": "功能描述"
        }
      ]
    },
    "component_B": {
      "generalized_term": "上位化用語",
      "function": "功能描述（200-300字）",
      "examples": ["實施例1", "實施例2", "實施例3"],
      "technical_details": "技術細節（300-500字）"
    },
    "component_C": {
      "generalized_term": "上位化用語",
      "function": "功能描述（200-300字）",
      "examples": ["實施例1", "實施例2", "實施例3"],
      "technical_details": "技術細節（300-500字）"
    },
    "connections": {
      "A_to_B": {
        "type": "連接/耦接",
        "methods": ["方式1", "方式2", "方式3"],
        "signal_flow": "訊號流向描述"
      },
      "B_to_C": {
        "type": "連接/耦接",
        "methods": ["方式1", "方式2", "方式3"],
        "signal_flow": "訊號流向描述"
      }
    },
    "operation_flow": [
      {
        "step": 1,
        "description": "步驟描述（100-200字）",
        "components_involved": ["元件A", "元件B"]
      },
      {
        "step": 2,
        "description": "步驟描述（100-200字）",
        "components_involved": ["元件B", "元件C"]
      }
    ]
  },
  "claim_strategy": {
    "independent_claim": {
      "preamble": "一種{{title}}，其包含：",
      "elements": [
        {
          "element": "一[上位元件A]",
          "function": "用以[功能描述]"
        },
        {
          "element": "一[上位元件B]",
          "connection": "[連接關係]該[上位元件A]",
          "function": "用以[功能描述]"
        },
        {
          "element": "一[上位元件C]",
          "connection": "[連接關係]該[上位元件B]",
          "function": "用以[功能描述]"
        }
      ]
    },
    "dependent_claims": [
      {
        "claim_no": 2,
        "depends_on": 1,
        "feature": "細化元件A的結構",
        "content": "其中該[上位元件A]包含[子元件11]與[子元件12]",
        "reasoning": "增加結構限定，提供中等保護範圍"
      },
      {
        "claim_no": 3,
        "depends_on": 1,
        "feature": "細化連接方式",
        "content": "其中該[上位元件B]係透過[具體連接方式]連接該[上位元件A]",
        "reasoning": "限定連接方式，針對特定實施例"
      }
      // ... 請求項 4-10
    ]
  },
  "invention_content": {
    "purpose": "解決[問題1]、[問題2]與[問題3]",
    "technical_means": "透過[手段1]、[手段2]與[手段3]",
    "effects": [
      {
        "effect": "功效1",
        "description": "具體描述（100-150字）",
        "quantified": "相較於現有技術提升XX%"
      },
      {
        "effect": "功效2",
        "description": "具體描述（100-150字）"
      }
    ]
  },
  "abstract": {
    "field": "技術領域（1句）",
    "problem": "解決的問題（1-2句）",
    "means": "技術手段（2-3句）",
    "effect": "核心功效（1-2句）"
  }
}
\`\`\`

# Quality Check (品質檢查)

輸出前請自我檢查：
- prior_art_detail 是否包含 2-3 個現有技術？
- embodiment_structure 是否涵蓋所有核心元件？
- 每個元件是否有至少 3 個具體實施例？
- claim_strategy 是否包含獨立項 + 5-10 個附屬項？
- 技術細節是否足夠詳細（可據以實施）？

⚠️ 重要提醒：
此階段僅產出 JSON 架構，不撰寫完整說明書正文。
輸出的 JSON 將作為 Phase 2b 的輸入資料。
請直接輸出 JSON，不要包含任何其他文字說明。
`

// ================================================================
// Helper Functions（與 draft-patent 相同）
// ================================================================

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
    
    return JSON.parse(cleanJson)
    
  } catch (error) {
    console.error('❌ JSON Parse Error:', error)
    throw new Error(`AI 輸出格式錯誤: ${error.message}`)
  }
}

async function callClaudeStreaming(apiKey: string, prompt: string, temperature: number, modelName: string): Promise<string> {
  console.log('🚀 呼叫 Claude API (Streaming)...')
  
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
    throw new Error(`Claude API Error (${res.status}): ${errorText}`)
  }
  
  let fullResponse = ''
  const reader = res.body?.getReader()
  const decoder = new TextDecoder()
  
  if (!reader) throw new Error('無法讀取回應')
  
  let lastLogTime = Date.now()
  let chunkCount = 0
  const startTime = Date.now()
  
  while (true) {
    const { done, value } = await reader.read()
    
    if (done) {
      console.log(`✅ Streaming 完成 (${Date.now() - startTime}ms)`)
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
            console.log(`📊 進度: ${chunkCount} chunks, ${fullResponse.length} 字元`)
            lastLogTime = now
          }
        }
        
      } catch (e) {
        // Ignore parsing errors
      }
    }
  }
  
  return fullResponse
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

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      throw new Error('未授權：Token 無效或已過期')
    }

    console.log('✅ 使用者驗證成功:', user.email)

    const { job_id, inputs, analysis_result, model_name } = await req.json()

    if (!analysis_result) {
      throw new Error('缺少 Phase 1 分析結果')
    }

    const modelConfig = MODEL_CONFIGS[model_name || 'claude-haiku-4.5']
    if (!modelConfig) {
      throw new Error(`不支援的模型: ${model_name}`)
    }

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY 環境變數未設定')
    }

    console.log(`📊 Phase 2a (THINK): 使用 ${modelConfig.displayName}`)

    const phase2aInputs = {
      title: inputs.title || '',
      field: inputs.field || '',
      problem: inputs.problem || '',
      solution: inputs.solution || '',
      features: Array.isArray(inputs.features) 
        ? inputs.features.join('\n') 
        : (inputs.features || ''),
      supplementary_features: inputs.supplementary_features || '無'
    }

    const phase2aPrompt = fillTemplate(PROMPT_PHASE2A, {
      ...phase2aInputs,
      analysis_json: JSON.stringify(analysis_result, null, 2)
    })

    console.log(`🤖 呼叫 Claude API (Phase 2a)...`)
    console.log(`📏 Prompt 長度: ${phase2aPrompt.length} 字元`)

    const aiResponse = await callClaudeStreaming(apiKey, phase2aPrompt, 0.2, modelConfig.apiModel)
    
    console.log(`✅ AI 回應成功，開始解析 JSON...`)
    
    const thinkingJson = cleanAndParseJson(aiResponse)
    
    console.log('✅ JSON 解析成功')

    // 更新 saas_jobs，儲存思考結果
    const { error: updateError } = await supabase
      .from('saas_jobs')
      .update({
        status: 'thinking_completed',
        result_data: { 
          analysis: analysis_result,
          thinking: thinkingJson,
          model_used: modelConfig.name
        }
      })
      .eq('id', job_id)

    if (updateError) {
      throw new Error(`資料庫更新失敗: ${updateError.message}`)
    }

    console.log('✅ Phase 2a 完成，思考架構已儲存')

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: thinkingJson,
        message: 'Phase 2a (THINK) 完成'
      }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('❌ Phase 2a 錯誤:', error)
    
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
}, { timeout: 180000 })  // Phase 2a 最多 3 分鐘
