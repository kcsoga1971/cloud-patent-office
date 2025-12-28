import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ================================================================
// 模型配置（與 Phase 2a 相同）
// ================================================================

interface ModelConfig {
  name: string
  provider: 'gemini' | 'claude' | 'openai'
  apiModel: string
  costPerRequest: number
  displayName: string
  tier: 'economy' | 'standard' | 'premium'
}

const MODEL_CONFIGS: Record<string, ModelConfig> = {
  'claude-haiku-4.5': {
    name: 'claude-haiku-4.5',
    provider: 'claude',
    apiModel: 'claude-haiku-4-5-20251001',
    costPerRequest: 50,
    displayName: 'Claude Haiku 4.5',
    tier: 'economy'
  },
  'claude-sonnet-4.5': {
    name: 'claude-sonnet-4.5',
    provider: 'claude',
    apiModel: 'claude-sonnet-4-5-20250929',
    costPerRequest: 150,
    displayName: 'Claude Sonnet 4.5',
    tier: 'standard'
  },
  'claude-opus-4.5': {
    name: 'claude-opus-4.5',
    provider: 'claude',
    apiModel: 'claude-opus-4-5-20251101',
    costPerRequest: 300,
    displayName: 'Claude Opus 4.5',
    tier: 'premium'
  }
}

// ================================================================
// Phase 2b Prompt（撰寫階段）
// ================================================================

const PROMPT_PHASE2B = `
# Role Definition (角色定義)
你是一位擁有 20 年經驗的台灣資深專利代理人。你將根據 Phase 2a 的思考架構，快速撰寫完整的專利說明書。

# Task (任務)
**根據 Phase 2a 的思考架構（JSON），撰寫完整的專利說明書（Markdown 格式）。**

⚠️ 重要：此階段僅需「填空」，不要重新思考，直接使用 Phase 2a 的架構內容。

# Input Data (輸入資料)

## Phase 1 分析筆記
{{analysis_json}}

## Phase 2a 思考架構
{{thinking_json}}

---

# Drafting Rules (撰寫原則)

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

## 原則 2：用語精準度原則

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

# Output Structure (輸出結構)

請依序撰寫以下章節，直接輸出 Markdown 內容（不要包含 \`\`\`markdown 標記）：

---

## 【發明名稱】
{{title}}

---

## 【摘要】

[直接使用 thinking_json.abstract 的內容，組合成 250-500 字的摘要]

{{thinking_json.abstract.field}}

{{thinking_json.abstract.problem}}

{{thinking_json.abstract.means}}

{{thinking_json.abstract.effect}}

---

## 【技術領域】

本發明係關於一種 {{field}}，特別是指一種 [從 thinking_json.abstract.field 提取更具體的技術範疇]。

---

## 【先前技術】

### 背景說明

[直接使用 thinking_json.prior_art_detail.background]

### 現有技術描述

[逐一撰寫 thinking_json.prior_art_detail.existing_tech_1, existing_tech_2]

習知的 {{thinking_json.prior_art_detail.existing_tech_1.name}} 通常包含 [列出 core_features]，其運作方式為 {{thinking_json.prior_art_detail.existing_tech_1.operation}}。

習知的 {{thinking_json.prior_art_detail.existing_tech_2.name}} 則採用 [列出 core_features]，其運作方式為 {{thinking_json.prior_art_detail.existing_tech_2.operation}}。

### 現有技術的問題

然而,上述現有技術存在以下缺點：

[逐一列出 thinking_json.prior_art_detail.existing_tech_1.problems 與 existing_tech_2.problems]

1. **[問題一]**：[具體描述]
2. **[問題二]**：[具體描述]
3. **[問題三]**：[具體描述]

因此，如何解決上述問題，實為本技術領域亟待解決之課題。

---

## 【發明內容】

### 發明目的

有鑑於此，本發明之主要目的在於 {{thinking_json.invention_content.purpose}}。

### 技術手段

為達成上述目的，本發明提供一種 {{title}}，其包含：

[直接使用 thinking_json.claim_strategy.independent_claim.elements，逐項撰寫]

{{thinking_json.claim_strategy.independent_claim.elements[0].element}}，{{thinking_json.claim_strategy.independent_claim.elements[0].function}}；

{{thinking_json.claim_strategy.independent_claim.elements[1].element}}，{{thinking_json.claim_strategy.independent_claim.elements[1].connection}}，{{thinking_json.claim_strategy.independent_claim.elements[1].function}}；及

{{thinking_json.claim_strategy.independent_claim.elements[2].element}}，{{thinking_json.claim_strategy.independent_claim.elements[2].connection}}，{{thinking_json.claim_strategy.independent_claim.elements[2].function}}。

### 有益效果

本發明具有以下有益效果：

[逐一撰寫 thinking_json.invention_content.effects]

1. **{{thinking_json.invention_content.effects[0].effect}}**：{{thinking_json.invention_content.effects[0].description}} [若有 quantified，加入：{{thinking_json.invention_content.effects[0].quantified}}]

2. **{{thinking_json.invention_content.effects[1].effect}}**：{{thinking_json.invention_content.effects[1].description}}

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

請參閱第1圖，本發明提供一種 {{title}}，其包含 [列出主要元件]。

#### [上位元件A] 10

[使用 thinking_json.embodiment_structure.component_A]

{{thinking_json.embodiment_structure.component_A.generalized_term}} 10 用以 {{thinking_json.embodiment_structure.component_A.function}}。

在本實施例中，{{thinking_json.embodiment_structure.component_A.generalized_term}} 10 可為 [列出 thinking_json.embodiment_structure.component_A.examples] 等。本發明所屬技術領域中具有通常知識者應理解，凡能達成 [功能描述] 之元件，均屬本發明之範疇。

具體而言，{{thinking_json.embodiment_structure.component_A.technical_details}}

[若有 sub_components，逐一描述]

#### [上位元件B] 20

[使用 thinking_json.embodiment_structure.component_B，同上]

{{thinking_json.embodiment_structure.component_B.generalized_term}} 20 與 [上位元件A] 10 {{thinking_json.embodiment_structure.connections.A_to_B.type}}，用以 {{thinking_json.embodiment_structure.component_B.function}}。

在本實施例中，{{thinking_json.embodiment_structure.component_B.generalized_term}} 20 可為 [列出 examples] 等。

{{thinking_json.embodiment_structure.component_B.generalized_term}} 20 與 [上位元件A] 10 之間的連接方式可為 [列出 thinking_json.embodiment_structure.connections.A_to_B.methods]。

{{thinking_json.embodiment_structure.component_B.technical_details}}

#### [上位元件C] 30

[使用 thinking_json.embodiment_structure.component_C，同上]

### 運作流程

請參閱第3圖，本發明之運作流程如下：

[逐一撰寫 thinking_json.embodiment_structure.operation_flow]

首先，{{thinking_json.embodiment_structure.operation_flow[0].description}}

接著，{{thinking_json.embodiment_structure.operation_flow[1].description}}

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

**⚠️ 注意：以下請求項必須嚴格遵守「前述基礎原則」**

### 請求項 1

[直接使用 thinking_json.claim_strategy.independent_claim]

{{thinking_json.claim_strategy.independent_claim.preamble}}

[逐項撰寫 elements]

{{thinking_json.claim_strategy.independent_claim.elements[0].element}}，{{thinking_json.claim_strategy.independent_claim.elements[0].function}}；

{{thinking_json.claim_strategy.independent_claim.elements[1].element}}，{{thinking_json.claim_strategy.independent_claim.elements[1].connection}}，{{thinking_json.claim_strategy.independent_claim.elements[1].function}}；及

{{thinking_json.claim_strategy.independent_claim.elements[2].element}}，{{thinking_json.claim_strategy.independent_claim.elements[2].connection}}，{{thinking_json.claim_strategy.independent_claim.elements[2].function}}。

### 請求項 2-N

[逐一撰寫 thinking_json.claim_strategy.dependent_claims]

### 請求項 {{thinking_json.claim_strategy.dependent_claims[0].claim_no}}

如請求項 {{thinking_json.claim_strategy.dependent_claims[0].depends_on}} 所述之 {{title}}，{{thinking_json.claim_strategy.dependent_claims[0].content}}。

### 請求項 {{thinking_json.claim_strategy.dependent_claims[1].claim_no}}

如請求項 {{thinking_json.claim_strategy.dependent_claims[1].depends_on}} 所述之 {{title}}，{{thinking_json.claim_strategy.dependent_claims[1].content}}。

[繼續撰寫剩餘請求項...]

---

## 【圖式繪製建議】

[根據 Phase 1 的 drawing_suggestions 詳細描述]

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

**繪製要點**：
- 各方塊應清楚標示元件編號與名稱
- 連接線應標示訊號類型或資料流向
- 整體佈局應清晰易讀

---

# Quality Check (品質檢查)

撰寫完成後，請自我檢查：

### 申請專利範圍檢查
- ✅ 每個「該」都有對應的「一」
- ✅ 獨立項使用上位化用語
- ✅ 附屬項正確依附

### 實施方式檢查
- ✅ 將上位化用語與具體實施例連結
- ✅ 補充了必要的技術細節
- ✅ 使用正確的連接用語（連接/耦接）

### 全文檢查
- ✅ 元件名稱全文統一
- ✅ 發明內容對應先前技術問題
- ✅ 元件編號與圖示對應
- ✅ 避免中國大陸用語

---

**請直接輸出完整的 Markdown 格式專利說明書，不要包含任何其他說明文字。**
`

// ================================================================
// Helper Functions
// ================================================================

function fillTemplate(template: string, data: Record<string, any>): string {
  let result = template
  
  // 處理簡單的 {{key}} 替換
  for (const [key, value] of Object.entries(data)) {
    const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
    const replacement = typeof value === 'string' ? value : JSON.stringify(value)
    result = result.replace(placeholder, replacement)
  }
  
  // 處理巢狀的 {{thinking_json.xxx}} 替換
  const nestedPattern = /\{\{thinking_json\.([^}]+)\}\}/g
  result = result.replace(nestedPattern, (match, path) => {
    try {
      const keys = path.split('.')
      let value = data.thinking_json
      
      for (const key of keys) {
        // 處理陣列索引，例如 elements[0]
        const arrayMatch = key.match(/^(\w+)\[(\d+)\]$/)
        if (arrayMatch) {
          const [, arrayName, index] = arrayMatch
          value = value[arrayName][parseInt(index)]
        } else {
          value = value[key]
        }
        
        if (value === undefined) return match
      }
      
      return typeof value === 'string' ? value : JSON.stringify(value)
    } catch (e) {
      return match
    }
  })
  
  return result
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
      p_description: `使用 ${modelName} 生成專利說明書 (Phase 2b)`,
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

    const { job_id, inputs, thinking_result, analysis_result, model_name } = await req.json()

    if (!thinking_result) {
      throw new Error('缺少 Phase 2a 思考結果 (thinking_result)')
    }

    if (!analysis_result) {
      throw new Error('缺少 Phase 1 分析結果 (analysis_result)')
    }

    const modelConfig = MODEL_CONFIGS[model_name || 'claude-haiku-4.5']
    if (!modelConfig) {
      throw new Error(`不支援的模型: ${model_name}`)
    }

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY 環境變數未設定')
    }

    console.log(`📊 Phase 2b (WRITE): 使用 ${modelConfig.displayName}`)

    // ⚠️ Phase 2b 扣除點數
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

    const phase2bPrompt = fillTemplate(PROMPT_PHASE2B, {
      title: inputs.title || '',
      field: inputs.field || '',
      analysis_json: analysis_result,
      thinking_json: thinking_result
    })

    console.log(`🤖 呼叫 Claude API (Phase 2b)...`)
    console.log(`📏 Prompt 長度: ${phase2bPrompt.length} 字元`)

    const aiResponse = await callClaudeStreaming(apiKey, phase2bPrompt, 0.3, modelConfig.apiModel)
    
    console.log(`✅ AI 回應成功`)
    console.log(`📏 回應長度: ${aiResponse.length} 字元`)

    // 更新 saas_jobs，儲存最終結果
    const { error: updateError } = await supabase
      .from('saas_jobs')
      .update({
        status: 'completed',
        result_data: { 
          analysis: analysis_result,
          thinking: thinking_result,
          draft: aiResponse,
          model_used: modelConfig.name
        }, 
        completed_at: new Date().toISOString()
      })
      .eq('id', job_id)

    if (updateError) {
      throw new Error(`資料庫更新失敗: ${updateError.message}`)
    }

    console.log('✅ Phase 2b 完成，專利說明書已儲存')

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: aiResponse,
        credits_deducted: requiredCredits,
        remaining_credits: deductResult.new_balance,
        message: 'Phase 2b (WRITE) 完成，專利說明書已生成'
      }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('❌ Phase 2b 錯誤:', error)
    
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
}, { timeout: 180000 })  // Phase 2b 最多 180 秒
