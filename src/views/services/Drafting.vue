<!-- src/views/services/Drafting.vue -->
<template>
  <div class="drafting-page">
    <div class="header">
      <div class="title-group">
        <h2>📝 AI 專利說明書撰寫</h2>
        <span class="badge">Beta</span>
      </div>
      <div class="user-credits" v-if="userStore.profile">
        <span class="credit-icon">💎</span>
        <span>剩餘點數: {{ userStore.profile.credits_balance }}</span>
      </div>
      <p class="subtitle">只要回答幾個簡單的問題,AI 將為您生成符合格式的專利申請書初稿。</p>
    </div>

    <div v-if="userStore.isLoading" class="loading-state">
      <div class="loader"></div>
      <p>正在確認帳戶資訊...</p>
    </div>

    <div v-else-if="userStore.user" class="content-wrapper">
      
      <!-- Step 1: 表單輸入 -->
      <div v-if="step === 1" class="card form-card">
        <!-- 模型選擇器 -->
        <div class="form-section model-selector">
          <label class="section-label">
            🤖 選擇 AI 模型
            <span class="help-text">（依據預算與品質需求選擇）</span>
          </label>

          <!-- 層級切換 -->
          <div class="tier-tabs">
            <button 
              v-for="tier in tiers" 
              :key="tier.id"
              class="tier-tab"
              :class="{ active: selectedTier === tier.id }"
              @click="selectedTier = tier.id"
            >
              {{ tier.icon }} {{ tier.name }}
              <span class="tier-cost">{{ tier.cost }} 點</span>
            </button>
          </div>

          <!-- 模型選項 -->
          <div class="model-grid">
            <div 
              v-for="model in filteredModels" 
              :key="model.name"
              class="model-card" 
              :class="{ 
                active: selectedModel === model.name,
                disabled: (userStore.profile?.credits_balance || 0) < model.cost
              }"
              @click="selectModel(model)"
            >
              <div class="model-header">
                <span class="model-icon">{{ model.icon }}</span>
                <div>
                  <div class="model-name">{{ model.displayName }}</div>
                  <div class="model-provider">{{ model.providerLabel }}</div>
                </div>
              </div>
              <div class="model-cost">💎 {{ model.cost }} 點數</div>
              <div class="model-desc">{{ model.description }}</div>
              
              <!-- 推理標記 -->
              <div v-if="model.thinking" class="thinking-badge">
                🧠 {{ model.thinkingTokens > 0 ? `${model.thinkingTokens} tokens` : '內部推理' }}
              </div>
              
              <!-- 點數不足提示 -->
              <div v-if="(userStore.profile?.credits_balance || 0) < model.cost" class="insufficient-badge">
                點數不足
              </div>
            </div>
          </div>
        </div>

        <!-- 表單欄位 -->
        <div class="form-section">
          <label class="section-label">1. 您的發明叫什麼名字？</label>
          <input 
            v-model="formData.title" 
            type="text" 
            placeholder="例如：智慧型物聯網貓砂盆" 
            class="input-field"
          />
        </div>

        <div class="form-section">
          <label class="section-label">2. 這是屬於哪個技術領域？</label>
          <input 
            v-model="formData.field"
            type="text" 
            placeholder="例如：寵物用品、家用電器、物聯網技術" 
            class="input-field"
          />
        </div>

        <div class="form-section">
          <label class="section-label">3. 現有技術有什麼缺點？ (痛點)</label>
          <textarea 
            v-model="formData.problem" 
            rows="4" 
            placeholder="例如：現有的貓砂盆需要人工清理..." 
            class="input-area"
          ></textarea>
        </div>

        <div class="form-section">
          <label class="section-label">4. 您的技術解決方案是什麼？ (手段)</label>
          <textarea 
            v-model="formData.solution" 
            rows="4" 
            placeholder="例如：利用重力感測器偵測貓咪進出..." 
            class="input-area"
          ></textarea>
        </div>

        <div class="form-section">
          <label class="section-label">5. 核心功能特徵 (條列式)</label>
          <textarea 
            v-model="formData.features" 
            rows="4" 
            placeholder="- 重力感測模組&#10;- 旋轉過濾機構" 
            class="input-area"
          ></textarea>
        </div>

        <div class="form-section">
          <label class="section-label">
            6. 附屬特徵 (選填)
            <span class="help-text">補充說明或次要功能</span>
          </label>
          <textarea 
            v-model="formData.supplementary_features" 
            rows="3" 
            placeholder="- 可選的附加功能&#10;- 替代實施方式" 
            class="input-area"
          ></textarea>
        </div>

        <div class="form-section">
          <label class="section-label">
            7. 圖示說明 (選填)
            <span class="help-text">如有圖面，請簡述各圖內容</span>
          </label>
          <textarea 
            v-model="formData.figures" 
            rows="3" 
            placeholder="圖1：系統架構圖&#10;圖2：流程示意圖" 
            class="input-area"
          ></textarea>
        </div>

        <!-- MCP 選項 -->
        <div class="form-section">
          <label class="checkbox-label">
            <input 
              type="checkbox" 
              v-model="formData.enableMCP"
            />
            <span>啟用專利檢索（額外消耗 100 點）</span>
          </label>
          <p class="help-text">
            系統將搜尋相關專利，提供更精準的先前技術分析
          </p>
        </div>

        <!-- 提交按鈕 -->
        <div class="actions">
          <button 
            class="btn-primary" 
            @click="submitTask" 
            :disabled="isSubmitting || !canSubmit"
          >
            <span v-if="isSubmitting">⏳ 正在建立專案並呼叫 AI...</span>
            <span v-else-if="!canSubmit">❌ 點數不足或資料未填寫完整</span>
            <span v-else>
              🚀 開始分析 (Phase 1)
              <span v-if="formData.enableMCP"> (含專利檢索 100 點)</span>
            </span>
          </button>
          <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>
        </div>
      </div>

      <!-- Step 2: Phase 1 處理中 -->
      <div v-if="step === 2" class="card result-card processing-state">
        <div class="processing-header">
          <div class="loader-ring"></div>
          <h2>🔍 Phase 1: AI 正在分析技術內容...</h2>
        </div>
        
        <div class="knowledge-box">
          <div class="knowledge-icon">💡 專利小知識</div>
          <Transition name="fade" mode="out-in">
            <div :key="currentTipIndex" class="knowledge-content">
              <h3>{{ currentPhaseTips[currentTipIndex]?.title }}</h3>
              <p>{{ currentPhaseTips[currentTipIndex]?.content }}</p>
            </div>
          </Transition>
          <div class="progress-bar-container">
            <div class="progress-bar phase1-progress"></div>
          </div>
          <p class="time-estimate">預計剩餘時間: 60 秒</p>
        </div>
      </div>

<!-- Step 3: Phase 1 審核介面 -->
<div v-if="step === 3 && showPhase1Review" class="card result-card">
  <h2>✅ Phase 1 分析完成！請審核結果</h2>

  <div class="phase1-review">
    
    <!-- 先前技術分析 -->
    <section class="review-section">
      <h3>📚 先前技術分析</h3>
      
      <div class="analysis-content">
        <div class="subsection">
          <h4>技術領域摘要</h4>
          <p class="summary-text">{{ result?.analysis?.prior_art_analysis?.summary || '無資料' }}</p>
        </div>
        
        <div class="subsection">
          <h4>常見問題 ({{ result?.analysis?.prior_art_analysis?.common_problems?.length || 0 }} 項)</h4>
          <ul v-if="result?.analysis?.prior_art_analysis?.common_problems?.length > 0" class="problem-list">
            <li v-for="(problem, idx) in result.analysis.prior_art_analysis.common_problems" :key="idx">
              {{ problem }}
            </li>
          </ul>
          <p v-else class="no-data">無常見問題資料</p>
        </div>
        
        <div class="subsection">
          <h4>現有技術 ({{ result?.analysis?.prior_art_analysis?.existing_technologies?.length || 0 }} 種)</h4>
          <div v-if="result?.analysis?.prior_art_analysis?.existing_technologies?.length > 0" class="tech-list">
            <div v-for="(tech, idx) in result.analysis.prior_art_analysis.existing_technologies" :key="idx" class="tech-card">
              <div class="tech-header">
                <span class="tech-number">技術 {{ idx + 1 }}</span>
                <h5>{{ tech.name }}</h5>
              </div>
              <p class="tech-description">{{ tech.description }}</p>
              <div v-if="tech.limitations" class="tech-limitations">
                <strong>限制：</strong>{{ tech.limitations }}
              </div>
            </div>
          </div>
          <p v-else class="no-data">無現有技術資料</p>
        </div>
      </div>
      
      <div class="modification-input">
        <label>💬 對先前技術分析的修改意見：</label>
        <textarea 
          v-model="userFeedback.modifications.prior_art"
          placeholder="例如：應該補充 XXX 技術..."
          rows="3"
        ></textarea>
      </div>
    </section>

    <!-- 差異分析 -->
    <section class="review-section">
      <h3>🎯 差異分析</h3>
      
      <div class="analysis-content">
        <div class="subsection">
          <h4>差異化效果 ({{ result?.analysis?.differentiation_analysis?.differential_effects?.length || 0 }} 項)</h4>
          <div v-if="result?.analysis?.differentiation_analysis?.differential_effects?.length > 0" class="effect-list">
            <div v-for="(effect, idx) in result.analysis.differentiation_analysis.differential_effects" :key="idx" class="effect-card">
              <div class="effect-header">
                <span class="effect-icon">✨</span>
                <strong>{{ effect.effect }}</strong>
              </div>
              <p>{{ effect.description }}</p>
              <div v-if="effect.quantitative_comparison" class="comparison">
                <span class="comparison-badge">數據對比</span>
                {{ effect.quantitative_comparison }}
              </div>
            </div>
          </div>
          <p v-else class="no-data">無差異化效果資料</p>
        </div>
        
        <div class="subsection">
          <h4>差異化元件 ({{ result?.analysis?.differentiation_analysis?.differential_components?.length || 0 }} 個)</h4>
          <ul v-if="result?.analysis?.differentiation_analysis?.differential_components?.length > 0" class="component-list">
            <li v-for="(component, idx) in result.analysis.differentiation_analysis.differential_components" :key="idx">
              <strong>{{ component.component }}</strong>
              <p>{{ component.description }}</p>
            </li>
          </ul>
          <p v-else class="no-data">無差異化元件資料</p>
        </div>
        
        <div class="subsection" v-if="result?.analysis?.differentiation_analysis?.differential_connections?.length > 0">
          <h4>差異化連接關係 ({{ result.analysis.differentiation_analysis.differential_connections.length }} 項)</h4>
          <ul class="connection-list">
            <li v-for="(connection, idx) in result.analysis.differentiation_analysis.differential_connections" :key="idx">
              <strong>{{ connection.connection }}</strong>
              <p>{{ connection.description }}</p>
            </li>
          </ul>
        </div>
      </div>
      
      <div class="modification-input">
        <label>💬 對差異分析的修改意見：</label>
        <textarea 
          v-model="userFeedback.modifications.differentiation"
          placeholder="例如：應該強調 XXX 特徵..."
          rows="3"
        ></textarea>
      </div>
    </section>

    <!-- 請求項佈局 -->
    <section class="review-section">
      <h3>📋 請求項佈局策略</h3>
      
      <div class="analysis-content">
        <div class="subsection">
          <h4>獨立項（最少必要元件）</h4>
          <ul v-if="result?.analysis?.claim_layout_strategy?.independent_claim?.minimum_elements?.length > 0" class="element-list">
            <li v-for="(element, idx) in result.analysis.claim_layout_strategy.independent_claim.minimum_elements" :key="idx">
              <span class="element-number">{{ idx + 1 }}</span>
              {{ element }}
            </li>
          </ul>
          <p v-else class="no-data">無獨立項資料</p>
        </div>
        
        <div class="subsection">
          <h4>附屬項建議 ({{ result?.analysis?.claim_layout_strategy?.dependent_claims?.length || 0 }} 項)</h4>
          <div v-if="result?.analysis?.claim_layout_strategy?.dependent_claims?.length > 0" class="dependent-claims">
            <div v-for="(claim, idx) in result.analysis.claim_layout_strategy.dependent_claims" :key="idx" class="claim-card">
              <div class="claim-header">
                <span class="claim-badge">項 {{ claim.claim_number || idx + 2 }}</span>
                <span v-if="claim.depends_on" class="depends-badge">依附於項 {{ claim.depends_on }}</span>
              </div>
              <p class="claim-content">{{ claim.content }}</p>
              <div v-if="claim.feature" class="claim-feature">
                <strong>特徵：</strong>{{ claim.feature }}
              </div>
            </div>
          </div>
          <p v-else class="no-data">無附屬項建議</p>
        </div>
      </div>
      
      <div class="modification-input">
        <label>💬 對請求項佈局的修改意見：</label>
        <textarea 
          v-model="userFeedback.modifications.claims"
          placeholder="例如：獨立項應該加入 XXX 元件..."
          rows="3"
        ></textarea>
      </div>
    </section>

    <!-- 圖式建議 -->
    <section class="review-section">
      <h3>🎨 圖式建議</h3>
      
      <div class="analysis-content">
        <div v-if="result?.analysis?.drawing_suggestions?.length > 0" class="drawing-list">
          <div v-for="(drawing, idx) in result.analysis.drawing_suggestions" :key="idx" class="drawing-card">
            <div class="drawing-header">
              <span class="drawing-icon">📐</span>
              <h5>{{ drawing.figure_number || `圖 ${idx + 1}` }}</h5>
            </div>
            <div class="drawing-type">
              <strong>類型：</strong>{{ drawing.type }}
            </div>
            <div v-if="drawing.required_elements" class="drawing-elements">
              <strong>必要元件：</strong>
              <ul>
                <li v-for="(element, eidx) in drawing.required_elements" :key="eidx">
                  {{ element }}
                </li>
              </ul>
            </div>
            <div v-if="drawing.highlight_features" class="drawing-highlights">
              <strong>重點標示：</strong>{{ drawing.highlight_features }}
            </div>
            <div v-if="drawing.connection_indicators" class="drawing-connections">
              <strong>連接指示：</strong>{{ drawing.connection_indicators }}
            </div>
          </div>
        </div>
        <p v-else class="no-data">無圖式建議</p>
      </div>
      
      <div class="modification-input">
        <label>💬 對圖式的修改意見：</label>
        <textarea 
          v-model="userFeedback.modifications.drawings"
          placeholder="例如：應該增加 XXX 圖..."
          rows="3"
        ></textarea>
      </div>
    </section>

    <!-- 術語對應表 -->
    <section class="review-section" v-if="result?.analysis?.term_mapping_table?.length > 0">
      <h3>📖 術語對應表</h3>
      
      <div class="analysis-content">
        <div class="term-table">
          <table>
            <thead>
              <tr>
                <th>使用者術語</th>
                <th>錯誤術語</th>
                <th>正確請求項術語</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(term, idx) in result.analysis.term_mapping_table" :key="idx">
                <td>{{ term.user_term }}</td>
                <td class="wrong-term">{{ term.wrong_term }}</td>
                <td class="correct-term">{{ term.correct_claim_term }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- 補充特徵 -->
    <section class="review-section">
      <h3>➕ 補充特徵</h3>
      
      <div class="additional-items">
        <div v-for="(feature, idx) in userFeedback.additional_features" :key="idx" class="item">
          <span>{{ feature }}</span>
          <button @click="removeFeature(idx)" class="btn-remove">✕</button>
        </div>
        
        <button @click="addFeature" class="btn-add">+ 新增補充特徵</button>
      </div>
    </section>

    <!-- 一般性意見 -->
    <section class="review-section">
      <h3>💬 一般性意見</h3>
      
      <textarea 
        v-model="userFeedback.modifications.general"
        placeholder="其他任何想補充的意見..."
        rows="4"
        class="general-feedback"
      ></textarea>
    </section>

    <!-- 操作按鈕 -->
    <div class="action-buttons">
      <button @click="approvePhase1" class="btn-approve" :disabled="isSubmitting">
        <span v-if="isSubmitting">⏳ 處理中...</span>
        <span v-else>✅ 直接確認，開始撰寫 (Phase 2)</span>
      </button>
      
      <button @click="submitModifications" class="btn-modify" :disabled="isSubmitting">
        <span v-if="isSubmitting">⏳ 處理中...</span>
        <span v-else>✏️ 提交修改意見，開始撰寫 (Phase 2)</span>
      </button>
    </div>
  </div>
</div>

      <!-- Step 4: Phase 2 處理中 -->
      <div v-if="step === 4" class="card result-card processing-state">
        <div class="processing-header">
          <div class="loader-ring"></div>
          <h2>✍️ Phase 2: AI 正在撰寫專利說明書...</h2>
        </div>

        <div v-if="userFeedback.approved === false" class="feedback-notice">
          <span class="notice-icon">✨</span>
          <span>AI 正在根據您的修改意見進行客製化調整</span>
        </div>

        <div class="knowledge-box blue-theme">
          <div class="knowledge-icon">📚 說明書撰寫要點</div>
          <Transition name="fade" mode="out-in">
            <div :key="currentTipIndex" class="knowledge-content">
              <h3>{{ currentPhaseTips[currentTipIndex]?.title }}</h3>
              <p>{{ currentPhaseTips[currentTipIndex]?.content }}</p>
            </div>
          </Transition>
          <div class="progress-bar-container">
            <div class="progress-bar phase2-progress"></div>
          </div>
          <p class="time-estimate">預計剩餘時間: 3 分鐘</p>
        </div>
      </div>

<!-- Step 5: 完成 -->
<div v-if="step === 5 && status === 'completed'" class="card result-card">
  <div class="success-header">
    <div class="success-icon">🎉</div>
    <h2>專利說明書生成完成！</h2>
  </div>

  <!-- 草稿預覽 -->
  <div class="result-content">
    <h3>📄 草稿預覽</h3>
    <div class="draft-preview">
      <pre>{{ result?.draft || result?.markdown_content || '無資料' }}</pre>
    </div>
  </div>

  <!-- 🎯 匯出按鈕區 (雙選項設計) -->
  <div class="export-section">
    <h3>📥 選擇匯出方式</h3>

    <div class="export-options-grid">
      <!-- 選項 1: AI 自動配圖 -->
      <div class="export-option-card recommended">
        <div class="card-badge">推薦</div>
        <div class="icon-wrapper">🤖🎨</div>
        <h4>AI 自動配圖匯出</h4>
        <p>
          使用 Flux.1 模型自動繪製專利圖式，並插入 Word 對應位置。
          <br><small>⏱️ 約需 30-60 秒</small>
        </p>
        <div class="action-buttons">
          <button
            @click="exportWithAI('invention')"
            :disabled="isExporting"
            class="btn-export btn-ai"
          >
            <i class="fas fa-file-word"></i>
            <span v-if="isExporting && exportingType === 'invention'">
              ⏳ 處理中...
            </span>
            <span v-else>匯出發明專利 (含圖)</span>
          </button>
          <button
            @click="exportWithAI('utility')"
            :disabled="isExporting"
            class="btn-export btn-ai btn-secondary"
          >
            <i class="fas fa-file-word"></i>
            <span v-if="isExporting && exportingType === 'utility'">
              ⏳ 處理中...
            </span>
            <span v-else>匯出新型專利 (含圖)</span>
          </button>
        </div>
      </div>

      <!-- 選項 2: 純文字 (自己繪圖) -->
      <div class="export-option-card">
        <div class="icon-wrapper">📄✏️</div>
        <h4>純文字匯出 (自行繪圖)</h4>
        <p>
          產生標準格式專利說明書，圖式頁面留白。
          <br><small>適合已有圖檔或使用 CAD 繪圖</small>
        </p>
        <div class="action-buttons">
          <button
            @click="exportDocx('invention')"
            :disabled="isExporting"
            class="btn-export btn-text"
          >
            <i class="fas fa-file-word"></i>
            <span v-if="isExporting && exportingType === 'invention'">
              ⏳ 匯出中...
            </span>
            <span v-else>匯出發明專利 (純文字)</span>
          </button>
          <button
            @click="exportDocx('utility')"
            :disabled="isExporting"
            class="btn-export btn-text btn-secondary"
          >
            <i class="fas fa-file-word"></i>
            <span v-if="isExporting && exportingType === 'utility'">
              ⏳ 匯出中...
            </span>
            <span v-else>匯出新型專利 (純文字)</span>
          </button>
        </div>
      </div>
    </div>

    <p class="export-hint">
      💡 提示：發明專利包含方法項，新型專利僅包含物品項
    </p>

    <p v-if="exportError" class="error-message">
      ⚠️ {{ exportError }}
    </p>
  </div>

  <!-- ✅ 改成導航按鈕 -->
  <div class="actions">
    <button @click="router.push(`/services/revision/${result.job_id}`)" class="btn-secondary">
      ✏️ 修改說明書
    </button>
    <button @click="router.push(`/services/qc/${result.job_id}`)" class="btn-secondary">
      🔍 品質檢查
    </button>
    <button @click="router.push('/services/workflow')" class="btn-primary">
      📊 查看所有案件
    </button>
  </div>

  <!-- 其他操作 (保留原有) -->
  <div class="actions">
    <button @click="resetForm" class="btn-secondary">
      🔄 建立新專利
    </button>
    <button @click="router.push('/dashboard')" class="btn-primary">
      📊 返回儀表板
    </button>
  </div>
</div>

<!-- 失敗狀態 -->
<div v-if="status === 'failed'" class="card result-card error-state">
  <h3>⚠️ 生成失敗</h3>
  <p>{{ errorMessage || 'AI 暫時無法處理您的請求，請聯繫管理員。' }}</p>
  <button class="btn-outline" @click="resetForm">返回重試</button>
</div>

    </div>

    <!-- 未登入提示 -->
    <div v-else class="login-prompt">
      <h3>請先登入</h3>
      <p>您需要登入才能使用 AI 撰寫功能。</p>
      <button class="btn-primary" @click="router.push('/login')">前往登入</button>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { supabase } from '../../supabase'
import { useUserStore } from '../../stores/user'
import { usePatentDocx } from '../../composables/usePatentDocx'

const router = useRouter()
const route = useRoute()  // 🎯 新增這行
const userStore = useUserStore()
const { isGenerating, error: docError, generateAndHandleDocx } = usePatentDocx()

// ========== 狀態管理 ==========
const step = ref(1)
const isSubmitting = ref(false)
const status = ref('')
const result = ref(null)
const errorMessage = ref('')
const currentPhase = ref('')
const thinkingProcess = ref('')
const creditsUsed = ref(0)
const showThinking = ref(false)

// Phase 1 審核相關狀態
const showPhase1Review = ref(false)
const phase1Approved = ref(false)
const userFeedback = ref({
  approved: false,
  modifications: {
    prior_art: '',
    differentiation: '',
    claims: '',
    drawings: '',
    general: ''
  },
  additional_features: [],
  additional_problems: []
})

// ========== 模型配置-調整為Phase 2獨立可用的Model Mapping-20251223 ==========
const tiers = [
  { id: 'economy', name: '低成本', icon: '🥉', cost: 50 },
  { id: 'standard', name: '中等成本', icon: '🥈', cost: 150 },
  { id: 'premium', name: '高成本', icon: '🥇', cost: 300 }
]

const selectedTier = ref('economy')
const selectedModel = ref('claude-haiku-4.5')

const allModels = [
  // 低成本層
  {
    name: 'claude-haiku-4.5',
    provider: 'claude',
    providerLabel: 'Anthropic',
    displayName: 'Claude Haiku 4.5',
    cost: 50,
    tier: 'economy',
    icon: '⚡',
    description: '最新快速版 (2025-10-15)',
    thinking: false
  },
  {
    name: 'gpt-5-mini',
    provider: 'openai',
    providerLabel: 'OpenAI',
    displayName: 'GPT-5 Mini',
    cost: 50,
    tier: 'economy',
    icon: '🔥',
    description: '低成本推理',
    thinking: true,
    thinkingTokens: 384
  },
  {
    name: 'gemini-flash-2.5',
    provider: 'gemini',
    providerLabel: 'Google',
    displayName: 'Gemini 2.5 Flash',
    cost: 50,
    tier: 'economy',
    icon: '🚀',
    description: '明確推理',
    thinking: true,
    thinkingTokens: 265
  },
  // 中等成本層
  {
    name: 'claude-sonnet-4.5',
    provider: 'claude',
    providerLabel: 'Anthropic',
    displayName: 'Claude Sonnet 4.5',
    cost: 150,
    tier: 'standard',
    icon: '💎',
    description: '高品質進階 (2025-09-29)',
    thinking: false
  },
  {
    name: 'gemini-pro-2.5',
    provider: 'gemini',
    providerLabel: 'Google',
    displayName: 'Gemini 2.5 Pro',
    cost: 150,
    tier: 'standard',
    icon: '🧠',
    description: '最深度推理',
    thinking: true,
    thinkingTokens: 1318
  },
  {
    name: 'gpt-5',
    provider: 'openai',
    providerLabel: 'OpenAI',
    displayName: 'GPT-5',
    cost: 150,
    tier: 'standard',
    icon: '🚀',
    description: '明確推理',
    thinking: true,
    thinkingTokens: 960
  },
  // 高成本層
  {
    name: 'claude-opus-4.5',
    provider: 'claude',
    providerLabel: 'Anthropic',
    displayName: 'Claude Opus 4.5',
    cost: 300,
    tier: 'premium',
    icon: '👑',
    description: '最高品質 (2025-11-24)',
    thinking: false
  },
  {
    name: 'gpt-5.2',
    provider: 'openai',
    providerLabel: 'OpenAI',
    displayName: 'GPT-5.2',
    cost: 300,
    tier: 'premium',
    icon: '⚡',
    description: '最新版本 (2025-12-11)',
    thinking: true,
    thinkingTokens: 0
  },
  {
    name: 'gemini-3-pro',
    provider: 'gemini',
    providerLabel: 'Google',
    displayName: 'Gemini 3 Pro',
    cost: 300,
    tier: 'premium',
    icon: '🚀',
    description: '實驗版',
    thinking: true,
    thinkingTokens: 900
  }
]

// 過濾當前層級的模型
const filteredModels = computed(() => {
  return allModels.filter(m => m.tier === selectedTier.value)
})

// 🎯 Model Mapping - 將前端模型名稱對應到 n8n 需要的格式
const MODEL_MAPPING = {
  // Anthropic Claude 模型
  'claude-haiku-4.5': {
    provider: 'anthropic',
    model: 'claude-3-5-haiku-20241022',  // n8n 實際使用的模型 ID
    displayName: 'Claude Haiku 4.5',
    thinking: false
  },
  'claude-sonnet-4.5': {
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    displayName: 'Claude Sonnet 4.5',
    thinking: false
  },
  'claude-opus-4.5': {
    provider: 'anthropic',
    model: 'claude-opus-4-20250514',  // 假設的 API 模型名稱
    displayName: 'Claude Opus 4.5',
    thinking: false
  },
  
  // OpenAI GPT 模型
  'gpt-5-mini': {
    provider: 'openai',
    model: 'gpt-4o-mini',  // 目前 OpenAI 實際可用的模型
    displayName: 'GPT-5 Mini',
    thinking: true,
    thinkingTokens: 384
  },
  'gpt-5': {
    provider: 'openai',
    model: 'gpt-4o',
    displayName: 'GPT-5',
    thinking: true,
    thinkingTokens: 960
  },
  'gpt-5.2': {
    provider: 'openai',
    model: 'o1',  // 假設對應到 o1 模型
    displayName: 'GPT-5.2',
    thinking: true,
    thinkingTokens: 0
  },
  
  // Google Gemini 模型
  'gemini-flash-2.5': {
    provider: 'google',
    model: 'gemini-2.0-flash-exp',
    displayName: 'Gemini 2.5 Flash',
    thinking: true,
    thinkingTokens: 265
  },
  'gemini-pro-2.5': {
    provider: 'google',
    model: 'gemini-1.5-pro',
    displayName: 'Gemini 2.5 Pro',
    thinking: true,
    thinkingTokens: 1318
  },
  'gemini-3-pro': {
    provider: 'google',
    model: 'gemini-exp-1206',
    displayName: 'Gemini 3 Pro',
    thinking: true,
    thinkingTokens: 900
  }
}

// 🎯 取得模型配置的輔助函數
const getModelConfig = (modelName) => {
  const config = MODEL_MAPPING[modelName]
  if (!config) {
    console.warn(`⚠️ 找不到模型配置: ${modelName}，使用預設值`)
    return {
      provider: 'anthropic',
      model: 'claude-3-5-haiku-20241022',
      displayName: modelName,
      thinking: false
    }
  }
  return config
}

// ========== 表單資料 ==========
const formData = ref({
  title: '',
  field: '',
  problem: '',
  solution: '',
  features: '',
  supplementary_features: '',
  figures: '',
  enableMCP: false
})

// ========== 計算屬性 ==========
const getModelCost = () => {
  const model = allModels.find(m => m.name === selectedModel.value)
  return model?.cost || 50  // 🎯 移除 MCP 費用，只返回模型費用
}

// 🎯 新增：計算 Phase 1 費用
const getPhase1Cost = () => {
  return formData.value.enableMCP ? 100 : 0  // 專利檢索固定 100 點
}

// 🎯 新增：計算 Phase 2 費用
const getPhase2Cost = () => {
  return getModelCost()  // Phase 2 = 模型費用
}

// 🎯 新增：計算總費用（用於檢查餘額）
const getTotalCost = () => {
  return getPhase1Cost() + getPhase2Cost()
}

const getModelDisplayName = () => {
  const model = allModels.find(m => m.name === selectedModel.value)
  return model?.displayName || 'Unknown Model'
}

const canSubmit = computed(() => {
  const hasEnoughCredits = (userStore.profile?.credits_balance || 0) >= getTotalCost()
  const hasRequiredFields = formData.value.title && 
                           formData.value.field &&
                           formData.value.solution
  return hasEnoughCredits && hasRequiredFields && !isSubmitting.value
})

// ========== 方法 ==========
const selectModel = (model) => {
  if ((userStore.profile?.credits_balance || 0) < model.cost) {
    alert(`點數不足！需要 ${model.cost} 點，目前只有 ${userStore.profile?.credits_balance || 0} 點`)
    return
  }
  selectedModel.value = model.name
}

// ========== Phase 1登錄、預扣與確認扣款完整流程20251222 ==========
const submitTask = async () => {
  errorMessage.value = ''
  let transactionId = null
  let projectId = null
  let jobId = null
  
  console.log('========== 除錯資訊開始 ==========')
  
  const { data: { session } } = await supabase.auth.getSession()
  
  console.log('1️⃣ Session 狀態:', session ? '✅ 已登入' : '❌ 未登入')
  
  if (!session) {
    alert('請先登入後再使用此功能')
    router.push('/login')
    return
  }
  
  console.log('2️⃣ 使用者 Email:', session.user.email)
  console.log('3️⃣ User ID:', session.user.id)
  
  // ========== 表單驗證 ==========
  if (!formData.value.title) {
    alert('請填寫「發明名稱」')
    return
  }
  
  if (!formData.value.field) {
    alert('請填寫「技術領域」')
    return
  }
  
  if (!formData.value.solution) {
    alert('請填寫「技術解決方案」')
    return
  }
  
  const userId = userStore.user?.id
  if (!userId) {
    alert('偵測不到使用者身分，請重新登入。')
    router.push('/login')
    return
  }

  // 🎯 修改：分別計算 Phase 1 和 Phase 2 費用
  const phase1Credits = getPhase1Cost()
  const phase2Credits = getPhase2Cost()
  const totalCredits = getTotalCost()
  const currentCredits = userStore.profile?.credits_balance || 0
  
  console.log('4️⃣ 是否啟用專利檢索:', formData.value.enableMCP)
  console.log('5️⃣ Phase 1 所需點數:', phase1Credits)
  console.log('6️⃣ Phase 2 所需點數:', phase2Credits)
  console.log('7️⃣ 總計所需點數:', totalCredits)
  console.log('8️⃣ 目前點數:', currentCredits)
  
  // 🎯 檢查總餘額是否足夠
  if (currentCredits < totalCredits) {
    alert(`點數不足！您目前只有 ${currentCredits} 點，需要 ${totalCredits} 點。`)
    return
  }

  isSubmitting.value = true
  step.value = 2

  try {
    // ==================== 1. 建立專案 ====================
    console.log('9️⃣ 開始建立專案...')
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .insert({
        user_id: userId,
        name: formData.value.title,
        description: formData.value.field,
        status: 'active'
      })
      .select()
      .single()

    if (projectError) {
      console.error('❌ 建立專案失敗:', projectError)
      throw new Error('建立專案失敗: ' + projectError.message)
    }
    
    projectId = projectData.id
    console.log('✅ 專案建立成功:', projectId)

    // ==================== 2. 建立任務 ====================
    console.log('🔟 開始建立任務...')
    const { data: jobData, error: jobError } = await supabase
      .from('saas_jobs')
      .insert({
        user_id: userId,
        project_id: projectId,
        job_type: 'DRAFT_GENERATION',
        status: 'pending',
        payment_status: phase1Credits > 0 ? 'pending' : 'not_required', // 🎯 修改
        input_data: {
          title: formData.value.title,
          field: formData.value.field,
          problem: formData.value.problem,
          solution: formData.value.solution,
          features: formData.value.features.split('\n').filter(i => i.trim()),
          supplementary_features: formData.value.supplementary_features || '',
          figures: formData.value.figures || '',
          project_id: projectId,
          model_name: selectedModel.value,
          enable_mcp: formData.value.enableMCP
        }
      })
      .select()
      .single()

    if (jobError) {
      console.error('❌ 建立任務失敗:', jobError)
      throw new Error('建立任務失敗: ' + jobError.message)
    }
    
    jobId = jobData.id
    console.log('✅ 任務建立成功:', jobId)

    // ==================== 3. Phase 1 預扣款（只在有專利檢索時）====================
    if (phase1Credits > 0) {
      console.log('💰 開始 Phase 1 預扣款...')
      
      const { data: reserveResult, error: reserveError } = await supabase
        .rpc('reserve_credits', {
          p_user_id: userId,
          p_credits: phase1Credits,
          p_action_type: 'PATENT_SEARCH', // 🎯 改為專利檢索
          p_description: `專利檢索 - ${formData.value.title}`,
          p_model_name: 'MCP', // 🎯 MCP 不是模型
          p_job_id: jobId,
          p_project_id: projectId
        })

      if (reserveError) {
        console.error('❌ Phase 1 預扣款失敗:', reserveError)
        throw new Error(`Phase 1 預扣款失敗: ${reserveError.message}`)
      }

      if (!reserveResult.success) {
        console.error('❌ 餘額不足:', reserveResult.error)
        
        await supabase
          .from('saas_jobs')
          .update({
            status: 'failed',
            payment_status: 'failed',
            error_message: reserveResult.error
          })
          .eq('id', jobId)
        
        alert(reserveResult.error)
        throw new Error(reserveResult.error)
      }

      console.log('✅ Phase 1 預扣款成功:', reserveResult)
      transactionId = reserveResult.transaction_id
      
      await supabase
        .from('saas_jobs')
        .update({
          transaction_id: transactionId,
          payment_status: 'reserved',
          credits_deducted: phase1Credits
        })
        .eq('id', jobId)
      
      await userStore.fetchUser()
    } else {
      console.log('⏭️ 跳過 Phase 1 扣款（未啟用專利檢索）')
    }

    // ==================== 4. 觸發 Phase 1 分析 ====================
    console.log('1️⃣1️⃣ 觸發 Phase 1 分析...')
    const n8nResponse = await fetch(import.meta.env.VITE_N8N_WEBHOOK_PHASE1_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job_id: jobId,
        transaction_id: transactionId, // 如果沒有專利檢索，這會是 null
        model_name: selectedModel.value,
        user_id: userId,
        inputs: {
          title: formData.value.title,
          field: formData.value.field,
          problem: formData.value.problem,
          solution: formData.value.solution,
          features: formData.value.features.split('\n').filter(i => i.trim()),
          supplementary_features: formData.value.supplementary_features || '',
          figures: formData.value.figures || '',
          project_id: projectId,
          enable_mcp: formData.value.enableMCP
        },
        supabase_url: import.meta.env.VITE_SUPABASE_URL,
        supabase_anon_key: import.meta.env.VITE_SUPABASE_ANON_KEY
      })
    })

    if (!n8nResponse.ok) {
      throw new Error('n8n Webhook 呼叫失敗')
    }

    console.log('✅ Phase 1 已觸發，開始輪詢...')

    // ==================== 5. 輪詢任務狀態 ====================
    const pollInterval = setInterval(async () => {
      const { data: jobStatus } = await supabase
        .from('saas_jobs')
        .select('status, result_data, payment_status')
        .eq('id', jobId)
        .single()
      
      console.log('📊 Job Status:', jobStatus.status, '| Payment:', jobStatus.payment_status)
      
      if (jobStatus.status === 'phase1_completed') {
        clearInterval(pollInterval)
        
        // 🎯 只在有專利檢索扣款時才需要確認
        if (jobStatus.payment_status === 'reserved' && transactionId) {
          console.log('✅ 開始確認 Phase 1 扣款...')
          
          const { data: confirmResult, error: confirmError } = await supabase
            .rpc('confirm_deduction', {
              p_transaction_id: transactionId
            })

          if (confirmError) {
            console.error('⚠️ 確認扣款失敗:', confirmError)
          } else if (!confirmResult.success) {
            console.error('⚠️ 確認扣款失敗:', confirmResult.error)
          } else {
            console.log('✅ Phase 1 扣款已確認')
            
            await supabase
              .from('saas_jobs')
              .update({
                payment_status: 'completed'
              })
              .eq('id', jobId)
          }
        }

        // 🎯 新增：更新 Job 為 phase1_completed-20251223
        const { error: updatePhaseError } = await supabase
          .from('saas_jobs')
          .update({
            phase: 'phase1_completed',
            phase1_completed_at: new Date().toISOString()
          })
          .eq('id', jobId)
  
        if (updatePhaseError) {
          console.error('⚠️ 更新 Phase 狀態失敗:', updatePhaseError)
        } else {
          console.log('✅ Job 已標記為 phase1_completed')
        }        

        result.value = {
          ...jobStatus.result_data,
          job_id: jobId,
          project_id: projectId
        }
        
        showPhase1Review.value = true
        step.value = 3
        isSubmitting.value = false
        
        await userStore.fetchUser()
        
        console.log('✅ Phase 1 完成，進入審核步驟')
      } else if (jobStatus.status === 'failed') {
        clearInterval(pollInterval)
        throw new Error(jobStatus.error_message || 'Phase 1 處理失敗')
      }
    }, 10000)

  } catch (err) {
    console.error('========== 錯誤資訊 ==========')
    console.error('❌ 完整錯誤堆疊:', err)
    console.error('❌ 錯誤訊息:', err.message)
    console.error('========== 錯誤資訊結束 ==========')
    
    // ==================== 錯誤處理：退款（只在有扣款時）====================
    if (transactionId) {
      console.log('🔄 執行 Phase 1 退款...')
      
      const { data: refundResult, error: refundError } = await supabase
        .rpc('refund_credits', {
          p_transaction_id: transactionId,
          p_reason: err.message
        })

      if (refundError || !refundResult.success) {
        console.error('❌ 退款失敗:', refundError || refundResult.error)
        errorMessage.value = err.message + ' (退款失敗，請聯繫客服)'
      } else {
        console.log('✅ 退款成功')
        errorMessage.value = err.message + ' (點數已退回)'
        
        await userStore.fetchUser()
      }
      
      if (jobId) {
        await supabase
          .from('saas_jobs')
          .update({
            payment_status: 'refunded'
          })
          .eq('id', jobId)
      }
    }
    
    errorMessage.value = errorMessage.value || err.message
    status.value = 'failed'
    isSubmitting.value = false
    step.value = 1
    
    if (jobId) {
      await supabase
        .from('saas_jobs')
        .update({
          status: 'failed',
          error_message: err.message
        })
        .eq('id', jobId)
    }
  }
}

const approvePhase1 = async () => {
  try {
    userFeedback.value.approved = true
    userFeedback.value.timestamp = new Date().toISOString()
    await submitPhase2()
  } catch (err) {
    console.error('❌ 確認 Phase 1 失敗:', err)
    errorMessage.value = err.message
  }
}

const submitModifications = async () => {
  try {
    const hasModifications = 
      userFeedback.value.modifications.prior_art ||
      userFeedback.value.modifications.differentiation ||
      userFeedback.value.modifications.claims ||
      userFeedback.value.modifications.drawings ||
      userFeedback.value.modifications.general ||
      userFeedback.value.additional_features.length > 0 ||
      userFeedback.value.additional_problems.length > 0
    
    if (!hasModifications) {
      alert('請至少提供一項修改意見')
      return
    }
    
    userFeedback.value.approved = false
    userFeedback.value.timestamp = new Date().toISOString()
    await submitPhase2()
  } catch (err) {
    console.error('❌ 提交修改意見失敗:', err)
    errorMessage.value = err.message
  }
}

// 🎯 n8n 模型名稱映射表
const getN8nModelName = (frontendModelName) => {
  const modelMapping = {
    // 低成本層
    'claude-haiku-4.5': 'claude-haiku-4-5-20251001',
    'gpt-5-mini': 'gpt-5-mini',
    'gemini-flash-2.5': 'models/gemini-flash-2.5',
    
    // 中等成本層
    'claude-sonnet-4.5': 'claude-sonnet-4-5-20250929',
    'gemini-pro-2.5': 'models/gemini-pro-2.5',
    'gpt-5': 'gpt-5',
    
    // 高成本層
    'claude-opus-4.5': 'claude-opus-4-5-20251101',
    'gpt-5.2': 'gpt-5.2',
    'gemini-3-pro': 'models/gemini-3-pro-preview'
  }
  
  return modelMapping[frontendModelName] || 'claude-haiku-4-5-20251001'
}

// ==================== Phase 2 預扣款與確認扣款流程 ====================
const submitPhase2 = async () => {
  isSubmitting.value = true
  showPhase1Review.value = false
  step.value = 4
  
  let phase2TransactionId = null
  let pollInterval = null
  let timeoutTimer = null
  
  try {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      throw new Error('使用者未登入')
    }
    
    const jobId = result.value.job_id
    const projectId = result.value.project_id
    
    if (!jobId) {
      throw new Error('找不到 Job ID')
    }
    
    // 🎯 Phase 2 預扣款
    const phase2Credits = getPhase2Cost()
    const currentCredits = userStore.profile?.credits_balance || 0
    
    console.log('💰 Phase 2 所需點數:', phase2Credits)
    console.log('💰 目前點數:', currentCredits)
    
    if (currentCredits < phase2Credits) {
      alert(`點數不足！您目前只有 ${currentCredits} 點，需要 ${phase2Credits} 點。`)
      throw new Error('點數不足')
    }
    
    console.log('💰 開始 Phase 2 預扣款...')
    
    const { data: reserveResult, error: reserveError } = await supabase
      .rpc('reserve_credits', {
        p_user_id: userStore.user.id,
        p_credits: phase2Credits,
        p_action_type: 'DRAFT_GENERATION',
        p_description: `專利撰寫 - ${selectedModel.value}`,
        p_model_name: selectedModel.value,
        p_job_id: jobId,
        p_project_id: projectId
      })

    if (reserveError || !reserveResult.success) {
      throw new Error(`Phase 2 預扣款失敗: ${reserveError?.message || reserveResult.error}`)
    }

    console.log('✅ Phase 2 預扣款成功:', reserveResult)
    phase2TransactionId = reserveResult.transaction_id
    
    await userStore.fetchUser()
    
    console.log('🔄 更新 Job 狀態為 phase1_approved...')
    
    const { error: updateError } = await supabase
      .from('saas_jobs')
      .update({
        status: 'phase1_approved',
        user_feedback: userFeedback.value,
        phase1_approved_at: new Date().toISOString(),
        phase2_transaction_id: phase2TransactionId,
        phase2_credits_deducted: phase2Credits
      })
      .eq('id', jobId)
    
    if (updateError) {
      throw new Error('更新 Job 狀態失敗: ' + updateError.message)
    }
    
    console.log('✅ Job 狀態已更新')
    console.log('🚀 觸發 Phase 2 撰寫...')
    
    currentPhase.value = 'drafting'
    
    // 🎯 取得模型配置
    const modelConfig = getModelConfig(selectedModel.value)
    
    console.log('🤖 前端模型名稱:', selectedModel.value)
    console.log('🤖 模型配置:', modelConfig)
    console.log('🤖 Provider:', modelConfig.provider)
    console.log('🤖 API Model:', modelConfig.model)
    
    // 🎯 準備完整的 webhook payload
    const webhookPayload = {
      job_id: jobId,
      transaction_id: phase2TransactionId,
      user_id: userStore.user.id,
      
      // 🎯 模型相關參數
      model_name: getN8nModelName(selectedModel.value),  // ✅ 新的
      provider: modelConfig.provider,            // API provider (如 'anthropic')
      model: modelConfig.model,                  // 實際 API 模型 ID (如 'claude-3-5-haiku-20241022')
      display_name: modelConfig.displayName,     // 完整顯示名稱
      thinking: modelConfig.thinking,            // 是否支援思考鏈
      thinking_tokens: modelConfig.thinkingTokens || 0,  // 思考 token 數
      
      // Phase 1 結果
      phase1_result: result.value.analysis,
      
      // 使用者反饋
      user_feedback: userFeedback.value,
      
      // 原始輸入
      inputs: {
        title: formData.value.title,
        field: formData.value.field,
        problem: formData.value.problem,
        solution: formData.value.solution,
        features: formData.value.features.split('\n').filter(i => i.trim()),
        supplementary_features: formData.value.supplementary_features || '',
        figures: formData.value.figures || '',
        project_id: projectId,
        enable_mcp: formData.value.enableMCP
      },
      
      // Supabase 連線資訊
      supabase_url: import.meta.env.VITE_SUPABASE_URL,
      supabase_anon_key: import.meta.env.VITE_SUPABASE_ANON_KEY
    }
    
    console.log('📦 Webhook Payload:', JSON.stringify(webhookPayload, null, 2))

    const n8nResponse = await fetch(import.meta.env.VITE_N8N_WEBHOOK_PHASE2_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhookPayload)
    })

    console.log('📡 n8n HTTP Status:', n8nResponse.status)
    console.log('📡 n8n Headers:', Object.fromEntries(n8nResponse.headers.entries()))

    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text()
      console.error('❌ n8n 回應錯誤:', errorText)
      throw new Error(`Phase 2 Webhook 呼叫失敗: ${n8nResponse.status} ${errorText}`)
    }

    // 🎯 改善：先取得文字，再嘗試解析 JSON
    const responseText = await n8nResponse.text()
    console.log('📡 n8n 原始回應:', responseText)

    let n8nResult
    try {
      n8nResult = responseText ? JSON.parse(responseText) : {}
      console.log('✅ n8n 回應 (已解析):', n8nResult)
    } catch (parseError) {
      console.error('❌ 無法解析 n8n 回應為 JSON:', parseError)
      console.error('原始回應內容:', responseText)
  
      // 🎯 即使解析失敗，如果 HTTP 狀態是 200，也繼續執行
      if (n8nResponse.status === 200) {
        console.log('⚠️ n8n 回應格式異常，但 HTTP 200，繼續輪詢...')
        n8nResult = { message: 'Webhook triggered (no JSON response)' }
      } else {
        throw new Error(`n8n 回應格式錯誤: ${responseText}`)
      }
    }

    console.log('✅ Phase 2 已觸發，開始輪詢...')
    
    // 🎯 設定超時機制（15 分鐘）
    const TIMEOUT_MS = 15 * 60 * 1000 // 15 分鐘
    const POLL_INTERVAL = 10000 // 10 秒
    let pollCount = 0
    const MAX_POLLS = TIMEOUT_MS / POLL_INTERVAL // 90 次
    
    timeoutTimer = setTimeout(() => {
      if (pollInterval) {
        clearInterval(pollInterval)
      }
      handlePhase2Timeout(jobId, phase2TransactionId)
    }, TIMEOUT_MS)
    
    pollInterval = setInterval(async () => {
      pollCount++
      
      console.log(`📊 Phase 2 輪詢次數: ${pollCount}/${MAX_POLLS}`)
      
      const { data: jobStatus, error: queryError } = await supabase
        .from('saas_jobs')
        .select('status, result_data, error_message, phase')
        .eq('id', jobId)
        .single()
      
      if (queryError) {
        console.error('❌ 查詢 Job 狀態失敗:', queryError)
        return
      }
      
      console.log('📊 Phase 2 Status:', jobStatus.status)
      console.log('📊 Phase:', jobStatus.phase)
      
      if (jobStatus.status === 'completed') {
        clearInterval(pollInterval)
        clearTimeout(timeoutTimer)
        
        // 🎯 確認 Phase 2 扣款
        if (phase2TransactionId) {
          console.log('✅ 確認 Phase 2 扣款...')
          
          const { data: confirmResult, error: confirmError } = await supabase
            .rpc('confirm_deduction', {
              p_transaction_id: phase2TransactionId
            })
          
          if (confirmError) {
            console.error('⚠️ 確認 Phase 2 扣款失敗:', confirmError)
          } else if (!confirmResult.success) {
            console.error('⚠️ 確認 Phase 2 扣款失敗:', confirmResult.error)
          } else {
            console.log('✅ Phase 2 扣款已確認')
          }
        }
        
        // 🎯 更新 Job 為 phase2_completed
        const { error: updatePhaseError } = await supabase
          .from('saas_jobs')
          .update({
            phase: 'phase2_completed',
            phase2_completed_at: new Date().toISOString()
          })
          .eq('id', jobId)
  
        if (updatePhaseError) {
          console.error('⚠️ 更新 Phase 狀態失敗:', updatePhaseError)
        } else {
          console.log('✅ Job 已標記為 phase2_completed')
        }

        status.value = 'completed'
        result.value = {
          ...jobStatus.result_data,
          job_id: jobId,
          project_id: projectId
        }
        step.value = 5
        isSubmitting.value = false
        
        console.log('🎉 Phase 2 完成！')
        
        await userStore.fetchUser()
        
      } else if (jobStatus.status === 'failed') {
        clearInterval(pollInterval)
        clearTimeout(timeoutTimer)
        throw new Error(jobStatus.error_message || 'Phase 2 處理失敗')
      }
      
      // 🎯 檢查是否超過最大輪詢次數
      if (pollCount >= MAX_POLLS) {
        clearInterval(pollInterval)
        clearTimeout(timeoutTimer)
        throw new Error('Phase 2 處理超時（超過 15 分鐘）')
      }
    }, POLL_INTERVAL)
    
  } catch (err) {
    console.error('❌ Phase 2 錯誤:', err)
    
    // 清理計時器
    if (pollInterval) clearInterval(pollInterval)
    if (timeoutTimer) clearTimeout(timeoutTimer)
    
    // 🎯 Phase 2 失敗時退款
    if (phase2TransactionId) {
      console.log('🔄 執行 Phase 2 退款...')
      
      const { data: refundResult, error: refundError } = await supabase
        .rpc('refund_credits', {
          p_transaction_id: phase2TransactionId,
          p_reason: err.message
        })
      
      if (refundError || !refundResult.success) {
        console.error('❌ Phase 2 退款失敗:', refundError || refundResult.error)
        errorMessage.value = err.message + ' (退款失敗，請聯繫客服)'
      } else {
        console.log('✅ Phase 2 退款成功')
        errorMessage.value = err.message + ' (點數已退回)'
        await userStore.fetchUser()
      }
    }
    
    errorMessage.value = errorMessage.value || err.message
    status.value = 'failed'
    isSubmitting.value = false
    step.value = 3
    showPhase1Review.value = true
  }
}

// 🎯 處理 Phase 2 超時
const handlePhase2Timeout = async (jobId, transactionId) => {
  console.error('⏰ Phase 2 處理超時（15 分鐘）')
  
  try {
    // 更新 Job 狀態為失敗
    await supabase
      .from('saas_jobs')
      .update({
        status: 'failed',
        error_message: 'Phase 2 處理超時（超過 15 分鐘）'
      })
      .eq('id', jobId)
    
    // 退款
    if (transactionId) {
      const { data: refundResult, error: refundError } = await supabase
        .rpc('refund_credits', {
          p_transaction_id: transactionId,
          p_reason: 'Phase 2 處理超時'
        })
      
      if (refundError || !refundResult.success) {
        console.error('❌ 超時退款失敗:', refundError || refundResult.error)
      } else {
        console.log('✅ 超時退款成功')
        await userStore.fetchUser()
      }
    }
    
    errorMessage.value = 'Phase 2 處理超時（超過 15 分鐘），點數已退回'
    status.value = 'failed'
    isSubmitting.value = false
    step.value = 3
    showPhase1Review.value = true
    
  } catch (err) {
    console.error('❌ 處理超時失敗:', err)
  }
}

const addFeature = () => {
  const feature = prompt('請輸入補充特徵：')
  if (feature && feature.trim()) {
    userFeedback.value.additional_features.push(feature.trim())
  }
}

const removeFeature = (index) => {
  userFeedback.value.additional_features.splice(index, 1)
}

const addProblem = () => {
  const problem = prompt('請輸入補充問題：')
  if (problem && problem.trim()) {
    userFeedback.value.additional_problems.push(problem.trim())
  }
}

const removeProblem = (index) => {
  userFeedback.value.additional_problems.splice(index, 1)
}

const resetForm = () => {
  console.log('🔄 重置表單...')
  step.value = 1
  status.value = ''
  result.value = null
  isSubmitting.value = false
  currentPhase.value = ''
  thinkingProcess.value = ''
  creditsUsed.value = 0
  showThinking.value = false
  showPhase1Review.value = false
  phase1Approved.value = false
  userFeedback.value = {
    approved: false,
    modifications: {
      prior_art: '',
      differentiation: '',
      claims: '',
      drawings: '',
      general: ''
    },
    additional_features: [],
    additional_problems: []
  }
  formData.value = {
    title: '',
    field: '',
    problem: '',
    solution: '',
    features: '',
    supplementary_features: '',
    figures: '',
    enableMCP: false
  }
}

// ========== 匯出功能 (修正版 - 方案 B) ==========
// 匯出狀態
const isExporting = ref(false)
const exportingType = ref(null) // 'invention' | 'utility' | null
const exportError = ref('')

// ========================================
// 計算屬性
// ========================================
const jobId = computed(() => {
  return result.value?.job_id || result.value?.analysis?.job_id || null
})

// ✅ 修正版本：同時檢查 draft 或 markdown_content
const canExport = computed(() => {
  // 只要 draft 或 markdown_content 其中一個有值，就允許匯出
  return jobId.value && (result.value?.draft || result.value?.markdown_content)
})

// ========================================
// 載入現有資料
// ========================================
onMounted(async () => {
  const id = route.params.id
  if (!id) return

  try {
    isLoading.value = true
    
    // 從 Supabase 載入 job 資料
    const { data, error: fetchError } = await supabase
      .from('saas_jobs')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError) throw fetchError

    // 填充表單
    if (data.input_data) {
      formData.value = {
        title: data.input_data.title || '',
        inventionName: data.input_data.inventionName || '',
        technicalField: data.input_data.technicalField || '',
        background: data.input_data.background || '',
        summary: data.input_data.summary || '',
        description: data.input_data.description || ''
      }
    }

    // 儲存結果
    result.value = data.result || data

  } catch (err) {
    console.error('載入資料失敗:', err)
    error.value = '載入資料失敗: ' + err.message
  } finally {
    isLoading.value = false
  }
})

// ========================================
// 匯出功能 (修正版 - 方案 B)
// ========================================
const exportDocx = async (type) => {
  if (!jobId.value) {
    alert('❌ 找不到 Job ID，無法匯出')
    return
  }

  if (!canExport.value) {
    alert('❌ 尚未生成內容，無法匯出')
    return
  }

  // 設定 UI 狀態
  isExporting.value = true
  exportingType.value = type
  exportError.value = ''

  try {
    console.log('📤 開始匯出流程 (前端生成模式)...')
    console.log('📋 Job ID:', jobId.value)
    console.log('📋 Type:', type)

    // ========================================
    // 步驟 1：呼叫 n8n Phase 3 - 格式化文字
    // ========================================
    const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_PHASE3_URL

    if (!webhookUrl) {
      throw new Error('未設定 VITE_N8N_WEBHOOK_PHASE3_URL 環境變數')
    }

    console.log('🔗 呼叫 n8n:', webhookUrl)

    const n8nResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job_id: jobId.value,
        type: type // 'invention' 或 'utility'
      })
    })

    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text()
      throw new Error(`格式化服務呼叫失敗 (${n8nResponse.status}): ${errorText}`)
    }

    const data = await n8nResponse.json()
    console.log('✅ n8n 回應:', data)

    // 取得格式化後的 Markdown
    const content = data.formatted_markdown || data.formatted_content

    if (!content) {
      throw new Error('n8n 未回傳格式化內容 (formatted_markdown)')
    }

    console.log('📄 格式化內容長度:', content.length)

    // ========================================
    // 步驟 2：前端生成 Word + 下載 + 上傳
    // ========================================
    console.log('📝 開始生成 DOCX...')

    const exportResult = await generateAndHandleDocx({
      jobId: jobId.value,
      userId: userStore.user.id,
      title: formData.value.title || '未命名專利',
      content: content,
      type: type,
      mode: 'download_and_upload' // 同時下載並上傳
    })

    console.log('✅ 匯出成功:', exportResult)

    // 顯示成功訊息
    const typeText = type === 'invention' ? '發明' : '新型'
    alert(`✅ ${typeText}專利說明書已成功匯出並儲存！\n\n檔案：${exportResult.filename}\n雲端連結：${exportResult.publicUrl || '(私有檔案)'}`)

  } catch (err) {
    console.error('❌ 匯出失敗:', err)
    exportError.value = err.message
    alert('匯出失敗：' + err.message)
  } finally {
    isExporting.value = false
    exportingType.value = null
  }
}

// ========================================
// 僅下載功能（不上傳）
// ========================================
const downloadOnly = async (type) => {
  if (!jobId.value || !canExport.value) {
    alert('❌ 無法下載')
    return
  }

  try {
    isExporting.value = true
    exportingType.value = type

    // 呼叫 n8n 格式化
    const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_PHASE3_URL
    const n8nResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job_id: jobId.value,
        type: type
      })
    })

    if (!n8nResponse.ok) throw new Error('格式化失敗')

    const data = await n8nResponse.json()
    const content = data.formatted_markdown || data.formatted_content

    if (!content) throw new Error('無法取得內容')

    // 僅下載
    await generateAndHandleDocx({
      jobId: jobId.value,
      userId: userStore.user.id,
      title: formData.value.title || '未命名專利',
      content: content,
      type: type,
      mode: 'download_only' // 僅下載
    })

    alert('✅ 檔案已下載')

  } catch (err) {
    console.error('下載失敗:', err)
    alert('下載失敗: ' + err.message)
  } finally {
    isExporting.value = false
    exportingType.value = null
  }
}

// ========================================
// 🆕 新增：AI 自動繪圖 + 專利說明書匯出-20251225修正-抓圖失敗修正
// ========================================
// ✅ 3. 修改 exportWithAI 函式，加入輪播控制
const exportWithAI = async (type) => {
  if (!jobId.value || !canExport.value) return // ...簡化寫法

  isExporting.value = true
  exportingType.value = type
  exportError.value = ''

  // 👉 啟動輪播 (利用現有的函式)
  startTipRotation()

  try {
    console.log('🎨 開始 AI 配圖匯出流程...')
    console.log('📋 Job ID:', jobId.value)
    console.log('📋 Type:', type)

    // ========================================
    // 步驟 1：呼叫 n8n Phase 3 - 格式化文字
    // ========================================
    const phase3Url = import.meta.env.VITE_N8N_WEBHOOK_PHASE3_URL
    if (!phase3Url) {
      throw new Error('未設定 VITE_N8N_WEBHOOK_PHASE3_URL 環境變數')
    }

    console.log('📝 步驟 1/3：格式化文字...')

    const formatResponse = await fetch(phase3Url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job_id: jobId.value,
        type: type
      })
    })

    if (!formatResponse.ok) {
      const errorText = await formatResponse.text()
      throw new Error(`格式化服務失敗 (${formatResponse.status}): ${errorText}`)
    }

    const formatData = await formatResponse.json()
    const content = formatData.formatted_markdown || formatData.formatted_content

    if (!content) {
      throw new Error('n8n 未回傳格式化內容')
    }

    console.log('✅ 格式化完成，內容長度:', content.length)

    // ========================================
    // 步驟 2：呼叫 n8n Image Gen - AI 繪圖
    // ========================================
    const imageGenUrl = import.meta.env.VITE_N8N_WEBHOOK_IMAGE_GEN_URL
    if (!imageGenUrl) {
      throw new Error('未設定 VITE_N8N_WEBHOOK_IMAGE_GEN_URL 環境變數')
    }

    console.log('🎨 步驟 2/3：AI 繪製圖式... (約需 30-60 秒)')

    const imageResponse = await fetch(imageGenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job_id: jobId.value
      })
    })

    if (!imageResponse.ok) {
      const errorText = await imageResponse.text()
      throw new Error(`繪圖服務失敗 (${imageResponse.status}): ${errorText}`)
    }

    const imageData = await imageResponse.json()
    console.log('🔍 n8n 原始回傳資料:', imageData)

    // 解析 figures
    let figures = []
    if (Array.isArray(imageData.figures)) {
      figures = imageData.figures
    } else if (Array.isArray(imageData)) {
      figures = imageData
    } else if (typeof imageData.figures === 'string') {
      try {
        figures = JSON.parse(imageData.figures)
      } catch (e) {
        console.error('❌ 解析 figures 字串失敗', e)
        figures = []
      }
    }

    if (!Array.isArray(figures)) {
      figures = []
    }

    console.log(`✅ AI 繪圖完成，確認有效圖式: ${figures.length} 張`)

    // ========================================
    // 🆕 步驟 2.5：等待 Supabase Storage 同步
    // ========================================
    if (figures.length > 0) {
      console.log('⏳ 等待 Storage 同步 (5 秒)...')
      await new Promise(resolve => setTimeout(resolve, 5000))
    }

    // ========================================
    // 步驟 3：前端生成 Word + 下載 + 上傳
    // ========================================
    console.log('📄 步驟 3/3：生成 Word 文件...')

    const exportResult = await generateAndHandleDocx({
      jobId: jobId.value,
      userId: userStore.user.id,
      title: formData.value.title || '未命名專利',
      content: content,
      type: type,
      mode: 'download_and_upload',
      figures: figures
    })

    console.log('✅ 匯出成功:', exportResult)

    const typeText = type === 'invention' ? '發明' : '新型'
    alert(`🎉 ${typeText}專利說明書 (含 AI 圖式) 已成功匯出！\n\n檔案：${exportResult.filename}\n圖式數量：${exportResult.figuresIncluded} 張`)

  } catch (err) {
    console.error('❌ AI 配圖匯出失敗:', err)
    exportError.value = err.message
    alert('匯出失敗：' + err.message)
  } finally {
    // 👉 停止輪播
    stopTipRotation()
    isExporting.value = false
    exportingType.value = null
  }
}

// ========== 專利知識庫 ==========
const currentTipIndex = ref(0)
let tipInterval = null

const phase1Tips = [
  { title: '什麼是「先前技術」？', content: '先前技術是指在您申請專利之前，已經公開的相關技術或知識。AI 會幫您分析您的發明與這些技術的差異，這是通過專利審查的關鍵。' },
  { title: '「新穎性」與「進步性」', content: '專利必須具備「新穎性」(前所未有) 與「進步性」(非輕易可完成)。AI 會嘗試找出您發明的獨特亮點來強調這兩點。' },
  { title: '為什麼需要「請求項」？', content: '申請專利範圍 (Claims) 是專利權利的核心。獨立項定義了保護的邊界，附屬項則提供了防禦的縱深。' },
  { title: '專利佈局策略', content: '好的專利不僅是保護技術，更是商業武器。透過「上位化」用語，我們可以盡量擴大您的保護範圍，防止競爭對手迴避。' }
]

const phase2Tips = [
  { title: '專利說明書的結構', content: '一份完整的說明書包含：技術領域、先前技術、發明內容、圖式簡單說明、實施方式、符號說明與申請專利範圍。' },
  { title: '什麼是「可據以實施」？', content: '說明書必須寫得夠清楚，讓同領域的技術人員看完後能做得出來。AI 會幫您補充必要的技術細節，避免因揭露不足被駁回。' },
  { title: '圖式的重要性', content: '「一圖勝千言」。在專利中，圖式上的每個元件都要有對應的符號與名稱，且名稱必須前後一致。系統會自動幫您檢查這一點。' },
  { title: '發明 vs 新型', content: '「發明」保護技術思想 (含方法)，審查較嚴，保護 20 年；「新型」只保護實體構造，採形式審查，保護 10 年。' },
  { title: '實施方式的寫法', content: '我們會盡量多寫幾個實施例 (Embodiments)。因為如果只寫一種，競爭對手只要改一點點就能避開專利。' }
]

// ✅ 1. 新增 Phase 3 提示 (AI 繪圖與匯出專用)
const phase3Tips = [
  { title: 'AI 繪圖構思中', content: 'Flux.1 模型正在根據您的專利文字，構思最合適的圖式佈局，並轉化為黑白線稿風格。' },
  { title: '元件符號標註', content: 'AI會嘗試比對說明書中的「符號說明」，確保圖式上的 10, 20... 等標號與內文對應。' },
  { title: '專利圖式規範', content: '專利圖式要求清晰、無陰影、線條分明。AI的目標是：自動過濾掉不必要的裝飾細節，以符合申請要求。但目前版本來不夠健壯，僅供參考。' },
  { title: '圖文整合技術', content: '最後一步，系統會將生成的圖片與文字說明書整合為標準 Word 格式，讓您下載即可使用。' },
  { title: 'AI繪製專利圖，僅供參考', content: '本版本的專利繪製專利圖的AI，還在訓練中，所以，繪製出來的專利圖，供您參考。目前最好的方式是：您自己自行繪圖，會最準確。' },
  { title: '自行繪製專利圖時，要注意符號編號', content: '專利說明書已經將各個元件編號寫入，你可以直接依據元件編號，繪製在圖式當中。' },
]

// ✅ 2. 修改 computed：加入 isExporting 的判斷
// 邏輯：如果有正在匯出 (isExporting)，優先顯示 Phase 3 tips，否則照舊看步驟
const currentPhaseTips = computed(() => {
  if (isExporting.value) {
    return phase3Tips
  }
  return step.value === 2 ? phase1Tips : phase2Tips
})

// ========== 輪播邏輯 ==========
const startTipRotation = () => {
  currentTipIndex.value = 0
  if (tipInterval) clearInterval(tipInterval)
  tipInterval = setInterval(() => {
    const tips = step.value === 2 ? phase1Tips : phase2Tips
    currentTipIndex.value = (currentTipIndex.value + 1) % tips.length
  }, 15000) // 每 15 秒切換一次
}

const stopTipRotation = () => {
  if (tipInterval) {
    clearInterval(tipInterval)
    tipInterval = null
  }
}

// 監聽步驟變化來啟動/停止輪播
watch(step, (newStep) => {
  if (newStep === 2 || newStep === 4) {
    startTipRotation()
  } else {
    stopTipRotation()
  }
})

// 組件卸載時清理
onUnmounted(() => {
  stopTipRotation()
})

// ==================== 載入現有 Job（從工作流程頁面跳轉過來）====================
const loadExistingJob = async (jobId, targetPhase) => {
  try {
    console.log(`🔍 載入 Job: ${jobId}, Phase: ${targetPhase}`)
    
    isSubmitting.value = true
    step.value = 2
    
    const { data: job, error } = await supabase
      .from('saas_jobs')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', userStore.user.id)
      .single()
    
    if (error) {
      console.error('❌ 載入 Job 失敗:', error)
      alert('載入失敗：找不到該案件或無權訪問')
      router.push('/services/workflow')
      return
    }
    
    console.log('✅ Job 載入成功:', job)
    console.log('📊 Job Phase:', job.phase)
    console.log('📊 Job Status:', job.status)
    
    // 載入表單資料
    if (job.input_data) {
      formData.value = {
        title: job.input_data.title || '',
        field: job.input_data.field || '',
        problem: job.input_data.problem || '',
        solution: job.input_data.solution || '',
        features: Array.isArray(job.input_data.features) 
          ? job.input_data.features.join('\n') 
          : (job.input_data.features || ''),
        supplementary_features: job.input_data.supplementary_features || '',
        figures: job.input_data.figures || '',
        enableMCP: job.input_data.enable_mcp || false
      }
      
      console.log('✅ 表單資料已載入:', formData.value)
      
      if (job.input_data.model_name) {
        selectedModel.value = job.input_data.model_name
        const model = allModels.find(m => m.name === job.input_data.model_name)
        if (model) {
          selectedTier.value = model.tier
        }
        console.log('✅ 模型已選擇:', selectedModel.value)
      }
    }
    
    // ========== Phase 2: 繼續撰寫 ==========
    if (targetPhase === '2') {
      if (job.phase !== 'phase1_completed') {
        alert(`⚠️ 此案件目前狀態為 ${job.phase}，無法進入 Phase 2`)
        router.push('/services/workflow')
        return
      }
      
      result.value = {
        ...job.result_data,
        job_id: job.id,
        project_id: job.project_id
      }
      
      console.log('✅ Phase 1 結果已載入:', result.value)
      
      step.value = 3
      showPhase1Review.value = true
      status.value = 'completed'
      currentPhase.value = 'analysis'
      isSubmitting.value = false
      
      console.log('✅ 已載入 Phase 1 結果，可繼續 Phase 2')
      
    // ========== Phase 3: 匯出 ==========
    } else if (targetPhase === '3') {
      if (job.phase !== 'phase2_completed') {
        alert(`⚠️ 此案件目前狀態為 ${job.phase}，無法匯出`)
        router.push('/services/workflow')
        return
      }
      
      result.value = {
        ...job.result_data,
        job_id: job.id,
        project_id: job.project_id
      }
      
      console.log('✅ Phase 2 結果已載入:', result.value)
      
      step.value = 5
      status.value = 'completed'
      currentPhase.value = 'drafting'
      showPhase1Review.value = false
      isSubmitting.value = false
      
      console.log('✅ 已載入 Phase 2 結果，可匯出')
      
    // ========== 無效的 Phase ==========
    } else {
      alert('⚠️ 無效的 Phase 參數: ' + targetPhase)
      router.push('/services/workflow')
    }
    
  } catch (err) {
    console.error('❌ 載入 Job 失敗:', err)
    alert('載入失敗：' + err.message)
    router.push('/services/workflow')
  }
}

// 🎯 修正 onMounted
onMounted(async () => {
  console.log('🚀 Drafting.vue onMounted')
  
  // 先確保使用者已登入
  if (!userStore.user) {
    if (userStore.isLoading) {
      console.log('⏳ 等待使用者資料載入...')
      // 等待 userStore 載入完成
      await new Promise(resolve => {
        const unwatch = watch(() => userStore.isLoading, (loading) => {
          if (!loading) {
            unwatch()
            resolve()
          }
        })
      })
    } else {
      await userStore.fetchUser()
    }
    
    if (!userStore.user) {
      console.warn('⚠️ 使用者未登入，跳轉到登入頁')
      router.push('/login')
      return
    }
  }
  
  console.log('✅ 使用者已登入:', userStore.user.email)
  
  // 🎯 檢查是否有 job_id 參數（從工作流程頁面跳轉過來）
  const jobId = route.query.job_id
  const phase = route.query.phase
  
  if (jobId && phase) {
    console.log(`🔄 偵測到 URL 參數: job_id=${jobId}, phase=${phase}`)
    await loadExistingJob(jobId, phase)
  } else {
    console.log('📝 開始新的專利撰寫')
  }
})
</script>

<style scoped>
.drafting-page { max-width: 900px; margin: 0 auto; padding-bottom: 4rem; }

.header { display: flex; flex-direction: column; margin-bottom: 2rem; }
.title-group { display: flex; align-items: center; gap: 10px; }
.header h2 { margin: 0; color: #1e293b; font-size: 1.8rem; }
.badge { background: #2563eb; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: bold; }
.subtitle { color: #64748b; margin-top: 0.5rem; }

/* 點數顯示 */
.user-credits {
  margin-top: 0.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  font-size: 0.9rem;
  width: fit-content;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

/* 層級切換 */
.tier-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  background: white;
  padding: 0.5rem;
  border-radius: 12px;
}

.tier-tab {
  flex: 1;
  padding: 0.75rem 1rem;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.tier-cost {
  font-size: 0.85rem;
  color: #0369a1;
  font-weight: 700;
}

.tier-tab:hover {
  border-color: #2563eb;
  background: #f0f9ff;
}

.tier-tab.active {
  border-color: #2563eb;
  background: #2563eb;
  color: white;
}

.tier-tab.active .tier-cost {
  color: #fbbf24;
}

/* 模型選擇器 */
.model-selector {
  background: #f8fafc;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.help-text {
  font-size: 0.85rem;
  color: #64748b;
  font-weight: normal;
  margin-left: 0.5rem;
}

.model-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.model-card {
  background: white;
  border: 3px solid #e2e8f0;
  border-radius: 12px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
}

.model-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
  border-color: #2563eb;
}

.model-card.active {
  border-color: #10b981;
  background: #f0fdf4;
  box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.1);
}

.model-card.active::before {
  content: '✓';
  position: absolute;
  top: 10px;
  right: 10px;
  background: #10b981;
  color: white;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.model-card.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.model-card.disabled:hover {
  transform: none;
  border-color: #e2e8f0;
}

.insufficient-badge {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(239, 68, 68, 0.95);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.9rem;
  pointer-events: none;
}

.model-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.model-icon {
  font-size: 2rem;
}

.model-name {
  font-weight: 700;
  font-size: 1rem;
  color: #1e293b;
}

.model-provider {
  font-size: 0.75rem;
  color: #64748b;
  margin-top: 2px;
}

.model-cost {
  font-weight: 700;
  font-size: 1.1rem;
  color: #0369a1;
  margin-bottom: 0.5rem;
}

.model-desc {
  color: #64748b;
  font-size: 0.85rem;
  line-height: 1.4;
  margin-bottom: 0.5rem;
}

/* 🆕 推理標記 */
.thinking-badge {
  background: linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%);
  color: white;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 700;
  margin-top: 0.5rem;
  display: inline-block;
}

/* 🆕 推理過程顯示 */
.thinking-box {
  background: #f8fafc;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.thinking-box h4 {
  margin: 0 0 1rem 0;
  color: #1e293b;
}

.thinking-content {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1rem;
  max-height: 300px;
  overflow-y: auto;
  font-size: 0.85rem;
  line-height: 1.6;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.thinking-summary {
  background: #f8fafc;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 2rem;
}

.thinking-toggle {
  background: none;
  border: none;
  color: #2563eb;
  font-weight: 600;
  cursor: pointer;
  padding: 0.5rem;
  width: 100%;
  text-align: left;
  transition: background 0.2s;
}

.thinking-toggle:hover {
  background: #f0f9ff;
  border-radius: 8px;
}

.phase-info {
  color: #059669;
  font-weight: 600;
  margin-top: 1rem;
}

/* 卡片與表單 */
.card { background: white; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); padding: 2rem; }
.form-section { margin-bottom: 1.5rem; }
.section-label { display: block; font-weight: 600; color: #334155; margin-bottom: 0.5rem; }
.input-field, .input-area { width: 100%; padding: 0.75rem; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 1rem; }
.input-field:focus, .input-area:focus { outline: none; border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1); }

/* 按鈕 */
.actions { margin-top: 2rem; text-align: right; display: flex; flex-direction: column; align-items: flex-end; }
.btn-primary { background: #2563eb; color: white; padding: 0.75rem 2rem; border: none; border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer; transition: background 0.2s; }
.btn-primary:hover:not(:disabled) { background: #1d4ed8; }
.btn-primary:disabled { background: #94a3b8; cursor: not-allowed; }
.btn-outline { background: white; color: #2563eb; border: 2px solid #2563eb; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; }
.error-text { color: #dc2626; margin-top: 10px; font-size: 0.9rem; }

/* 登入提示 */
.login-prompt { text-align: center; padding: 4rem 2rem; background: white; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
.loading-state { text-align: center; padding: 3rem; }

/* Loader 動畫 */
.loader { width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #2563eb; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 1rem; }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

/* 成功標題區 */
.success-header {
  text-align: center;
  margin-bottom: 30px;
}

.success-icon {
  font-size: 64px;
  margin-bottom: 16px;
  animation: bounce 1s ease;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-20px); }
}

/* 草稿預覽 */
.result-content {
  margin-bottom: 40px;
}

.result-content h3 {
  margin-bottom: 16px;
  color: #2d3748;
  font-size: 18px;
  font-weight: 600;
}

.draft-preview {
  max-height: 400px;
  overflow-y: auto;
  background: #f7fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 20px;
}

.draft-preview pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.6;
  margin: 0;
}

/* 匯出區域 */
.export-section {
  margin: 40px 0;
  padding: 30px;
  background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%);
  border-radius: 16px;
  border: 2px solid #667eea30;
}

.export-section h3 {
  text-align: center;
  margin-bottom: 24px;
  color: #2d3748;
  font-size: 20px;
  font-weight: 600;
}

.export-buttons {
  display: flex;
  gap: 20px;
  justify-content: center;
  margin-bottom: 16px;
}

.btn-export {
  padding: 16px 32px;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 240px;
  justify-content: center;
}

.btn-export i {
  font-size: 20px;
}

.btn-invention {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-utility {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
}

.btn-export:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
}

.btn-export:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.export-hint {
  text-align: center;
  color: #718096;
  font-size: 14px;
  margin: 16px 0 0 0;
}

.error-message {
  text-align: center;
  color: #e53e3e;
  font-size: 14px;
  margin-top: 12px;
  padding: 12px;
  background: #fff5f5;
  border-radius: 8px;
  border: 1px solid #feb2b2;
}

/* 操作按鈕 */
.actions {
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-top: 40px;
}

.btn-secondary,
.btn-primary {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-secondary {
  background: #e2e8f0;
  color: #2d3748;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-secondary:hover,
.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* 響應式設計 */
@media (max-width: 768px) {
  .export-buttons {
    flex-direction: column;
  }
  
  .btn-export {
    width: 100%;
  }
  
  .actions {
    flex-direction: column;
  }
  
  .btn-secondary,
  .btn-primary {
    width: 100%;
  }
}

/* Phase 1 審核區塊 */
.phase1-review {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.review-section {
  background: white;
  border-radius: 12px;
  padding: 25px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.review-section h3 {
  margin: 0 0 20px;
  font-size: 20px;
  color: #333;
  border-bottom: 2px solid #4CAF50;
  padding-bottom: 10px;
}

.review-section h4 {
  margin: 20px 0 12px;
  font-size: 16px;
  color: #555;
  font-weight: 600;
}

/* 子區塊 */
.subsection {
  margin-bottom: 25px;
}

.subsection:last-child {
  margin-bottom: 0;
}

/* 摘要文字 */
.summary-text {
  line-height: 1.8;
  color: #444;
  background: #f9f9f9;
  padding: 15px;
  border-radius: 8px;
  border-left: 4px solid #2196F3;
}

/* 問題列表 */
.problem-list {
  list-style: none;
  padding: 0;
}

.problem-list li {
  padding: 12px 15px;
  margin: 8px 0;
  background: #fff3e0;
  border-left: 4px solid #ff9800;
  border-radius: 4px;
  line-height: 1.6;
}

/* 技術卡片 */
.tech-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.tech-card {
  background: #f5f5f5;
  padding: 15px;
  border-radius: 8px;
  border-left: 4px solid #9C27B0;
}

.tech-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.tech-number {
  background: #9C27B0;
  color: white;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
}

.tech-header h5 {
  margin: 0;
  font-size: 16px;
  color: #333;
}

.tech-description {
  color: #666;
  line-height: 1.6;
  margin-bottom: 10px;
}

.tech-limitations {
  background: #ffebee;
  padding: 10px;
  border-radius: 4px;
  font-size: 14px;
  color: #c62828;
}

/* 效果卡片 */
.effect-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.effect-card {
  background: #e8f5e9;
  padding: 15px;
  border-radius: 8px;
  border-left: 4px solid #4CAF50;
}

.effect-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.effect-icon {
  font-size: 18px;
}

.comparison {
  margin-top: 10px;
  padding: 10px;
  background: white;
  border-radius: 4px;
}

.comparison-badge {
  background: #4CAF50;
  color: white;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  margin-right: 8px;
}

/* 元件列表 */
.component-list,
.connection-list {
  list-style: none;
  padding: 0;
}

.component-list li,
.connection-list li {
  padding: 12px;
  margin: 8px 0;
  background: #f5f5f5;
  border-radius: 6px;
  border-left: 3px solid #2196F3;
}

.component-list li strong,
.connection-list li strong {
  display: block;
  color: #2196F3;
  margin-bottom: 5px;
}

/* 元件編號 */
.element-list {
  list-style: none;
  padding: 0;
  counter-reset: element-counter;
}

.element-list li {
  padding: 12px 15px;
  margin: 8px 0;
  background: #e3f2fd;
  border-left: 4px solid #2196F3;
  border-radius: 4px;
  position: relative;
  padding-left: 50px;
}

.element-number {
  position: absolute;
  left: 15px;
  top: 50%;
  transform: translateY(-50%);
  background: #2196F3;
  color: white;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
}

/* 請求項卡片 */
.dependent-claims {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.claim-card {
  background: #fff8e1;
  padding: 15px;
  border-radius: 8px;
  border-left: 4px solid #FFC107;
}

.claim-header {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}

.claim-badge {
  background: #FFC107;
  color: #333;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
}

.depends-badge {
  background: #FF9800;
  color: white;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
}

.claim-content {
  line-height: 1.6;
  color: #444;
  margin-bottom: 10px;
}

.claim-feature {
  background: white;
  padding: 10px;
  border-radius: 4px;
  font-size: 14px;
}

/* 圖式卡片 */
.drawing-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.drawing-card {
  background: #f3e5f5;
  padding: 20px;
  border-radius: 8px;
  border-left: 4px solid #9C27B0;
}

.drawing-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 15px;
}

.drawing-icon {
  font-size: 24px;
}

.drawing-header h5 {
  margin: 0;
  font-size: 18px;
  color: #9C27B0;
}

.drawing-type,
.drawing-highlights,
.drawing-connections {
  margin: 10px 0;
  line-height: 1.6;
}

.drawing-elements ul {
  list-style: none;
  padding: 0;
  margin: 10px 0;
}

.drawing-elements li {
  padding: 8px 12px;
  margin: 5px 0;
  background: white;
  border-radius: 4px;
  font-size: 14px;
}

/* 術語表 */
.term-table {
  overflow-x: auto;
}

.term-table table {
  width: 100%;
  border-collapse: collapse;
}

.term-table th,
.term-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

.term-table th {
  background: #f5f5f5;
  font-weight: 600;
  color: #333;
}

.wrong-term {
  color: #f44336;
  text-decoration: line-through;
}

.correct-term {
  color: #4CAF50;
  font-weight: 600;
}

/* 修改意見輸入 */
.modification-input {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px dashed #ddd;
}

.modification-input label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #555;
}

.modification-input textarea,
.general-feedback {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.6;
  resize: vertical;
  transition: border-color 0.3s;
}

.modification-input textarea:focus,
.general-feedback:focus {
  outline: none;
  border-color: #2196F3;
  box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.1);
}

/* 補充項目 */
.additional-items {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.additional-items .item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 15px;
  background: #f0f0f0;
  border-radius: 6px;
}

.btn-remove {
  background: #f44336;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.3s;
}

.btn-remove:hover {
  background: #d32f2f;
}

.btn-add {
  background: #4CAF50;
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.3s;
}

.btn-add:hover {
  background: #45a049;
}

/* 操作按鈕 */
.action-buttons {
  display: flex;
  gap: 20px;
  justify-content: center;
  margin-top: 30px;
  padding-top: 30px;
  border-top: 2px solid #eee;
}

.btn-approve,
.btn-modify {
  padding: 15px 40px;
  font-size: 16px;
  font-weight: 600;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.btn-approve {
  background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
  color: white;
}

.btn-approve:hover:not(:disabled) {
  background: linear-gradient(135deg, #45a049 0%, #388e3c 100%);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
}

.btn-modify {
  background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%);
  color: white;
}

.btn-modify:hover:not(:disabled) {
  background: linear-gradient(135deg, #1976D2 0%, #1565C0 100%);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(33, 150, 243, 0.3);
}

.btn-approve:disabled,
.btn-modify:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

/* 無資料提示 */
.no-data {
  color: #999;
  font-style: italic;
  padding: 15px;
  background: #f5f5f5;
  border-radius: 6px;
  text-align: center;
}

/* 匯出按鈕樣式 */
.export-buttons {
  margin: 2rem 0;
  padding: 1.5rem;
  background: #f8f9fa;
  border-radius: 8px;
}

.export-buttons h3 {
  margin-bottom: 1rem;
  color: #333;
}

.button-group {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.btn-export {
  padding: 1rem 2rem;
  font-size: 1rem;
  font-weight: 600;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 200px;
}

.btn-export:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-invention {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-invention:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-utility {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
}

.btn-utility:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(240, 147, 251, 0.4);
}

.error-message {
  margin-top: 1rem;
  padding: 0.75rem;
  background: #fee;
  color: #c33;
  border-radius: 4px;
  font-size: 0.9rem;
}

.draft-preview {
  margin: 1.5rem 0;
  padding: 1rem;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.draft-preview pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  color: #555;
}

.actions {
  margin-top: 2rem;
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.btn-secondary {
  padding: 0.75rem 1.5rem;
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-secondary:hover {
  background: #5a6268;
}

.btn-primary {
  padding: 0.75rem 1.5rem;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-primary:hover {
  background: #0056b3;
}

/* ========== 等待畫面與知識輪播樣式 ========== */
.processing-state {
  text-align: center;
  padding: 3rem 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
}

.processing-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.loader-ring {
  width: 50px;
  height: 50px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.knowledge-box {
  background: linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%);
  border: 1px solid #dbeafe;
  border-radius: 16px;
  padding: 2rem;
  max-width: 600px;
  width: 100%;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  position: relative;
  overflow: hidden;
}

.knowledge-box.blue-theme {
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
  border-color: #bbf7d0;
}

.knowledge-icon {
  position: absolute;
  top: 1rem;
  left: 1rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: #64748b;
  background: rgba(255, 255, 255, 0.8);
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
}

.knowledge-content {
  min-height: 120px; /* 固定高度防止跳動 */
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  margin-top: 1rem;
}

.knowledge-content h3 {
  color: #1e293b;
  font-size: 1.25rem;
  margin-bottom: 0.75rem;
  font-weight: 700;
}

.knowledge-content p {
  color: #475569;
  line-height: 1.6;
  font-size: 1rem;
}

.feedback-notice {
  background-color: #eff6ff;
  color: #2563eb;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border: 1px dashed #93c5fd;
}

/* 進度條動畫 */
.progress-bar-container {
  width: 100%;
  height: 6px;
  background-color: #e2e8f0;
  border-radius: 3px;
  margin-top: 1.5rem;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background-color: #3b82f6;
  border-radius: 3px;
  width: 0%;
}

.phase1-progress {
  animation: progress 60s ease-in-out forwards; /* 模擬 60 秒 */
}

.phase2-progress {
  background-color: #10b981;
  animation: progress 180s ease-in-out forwards; /* 模擬 3 分鐘 */
}

.time-estimate {
  margin-top: 0.5rem;
  font-size: 0.85rem;
  color: #94a3b8;
}

/* Vue Transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes progress {
  0% { width: 0%; }
  10% { width: 20%; } /* 初期快一點 */
  50% { width: 60%; }
  90% { width: 90%; }
  100% { width: 98%; } /* 最後停在 98% 等待完成 */
}

/* ========================================
   新增樣式 (雙選項匯出)
   ======================================== */
.export-options-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin: 20px 0;
}

.export-option-card {
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  padding: 24px;
  text-align: center;
  transition: all 0.3s ease;
  position: relative;
  background: #fff;
}

.export-option-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
}

.export-option-card.recommended {
  border: 2px solid #4a90e2;
  background: linear-gradient(135deg, #f0f7ff 0%, #fff 100%);
}

.card-badge {
  position: absolute;
  top: -12px;
  right: 20px;
  background: linear-gradient(135deg, #4a90e2, #357abd);
  color: white;
  padding: 4px 14px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: bold;
}

.icon-wrapper {
  font-size: 2.5rem;
  margin-bottom: 12px;
}

.export-option-card h4 {
  margin: 0 0 10px 0;
  font-size: 1.1rem;
  color: #333;
}

.export-option-card p {
  color: #666;
  font-size: 0.9rem;
  margin-bottom: 16px;
  min-height: 50px;
}

.export-option-card p small {
  color: #999;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.btn-export {
  width: 100%;
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn-export:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-export i {
  font-size: 1rem;
}

.btn-ai {
  background: linear-gradient(135deg, #4a90e2, #357abd);
  color: white;
}

.btn-ai:hover:not(:disabled) {
  background: linear-gradient(135deg, #357abd, #2a5f8f);
  transform: translateY(-1px);
}

.btn-ai.btn-secondary {
  background: linear-gradient(135deg, #6ba3e8, #4a90e2);
}

.btn-text {
  background: #f5f5f5;
  color: #333;
  border: 1px solid #ddd;
}

.btn-text:hover:not(:disabled) {
  background: #e8e8e8;
}

.btn-text.btn-secondary {
  background: #fafafa;
}

/* ========================================
   RWD 響應式
   ======================================== */
@media (max-width: 768px) {
  .export-options-grid {
    grid-template-columns: 1fr;
  }

  .actions {
    flex-direction: column;
  }

  .btn-primary,
  .btn-secondary {
    width: 100%;
  }
}

/* 後續操作區域 */
.next-actions {
  margin-top: 40px;
  padding: 32px;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  border-radius: 16px;
}

.next-actions h3 {
  margin: 0 0 24px 0;
  font-size: 20px;
  color: #1a1a1a;
  text-align: center;
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.action-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 32px 24px;
  background: white;
  border: 2px solid #e0e0e0;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s;
  text-align: center;
}

.action-card:hover {
  border-color: #667eea;
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.2);
}

.action-icon {
  font-size: 48px;
}

.action-title {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
}

.action-desc {
  font-size: 14px;
  color: #666;
}

</style>
