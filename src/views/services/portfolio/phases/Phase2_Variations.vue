<!-- src/views/services/portfolio/phases/Phase2_Variations.vue -->
<script setup>
import { ref, onMounted, computed } from 'vue'
import { supabase } from '../../../../supabase'
import { ElMessage, ElMessageBox } from 'element-plus'

const props = defineProps(['jobData'])
const emit = defineEmits(['next'])
const phaseData = ref(null)
const activeFeature = ref('')
const loading = ref(true)

const loadResult = async () => {
  try {
    const { data } = await supabase.from('job_phase_results')
      .select('phase_data')
      .eq('job_id', props.jobData.id)
      .eq('phase_order', 2)
      .single()
    
    if (data) {
      phaseData.value = typeof data.phase_data === 'string' 
        ? JSON.parse(data.phase_data) 
        : data.phase_data
      
      if (phaseData.value?.feature_variations?.length) {
        activeFeature.value = phaseData.value.feature_variations[0].feature_id
      }
    }
  } catch (e) {
    ElMessage.error('載入變化形式失敗')
  } finally {
    loading.value = false
  }
}

const currentVars = computed(() => {
  return phaseData.value?.feature_variations?.find(f => f.feature_id === activeFeature.value) || {}
})

const totalVariations = computed(() => {
  if (!currentVars.value.variations) return 0
  return Object.values(currentVars.value.variations).reduce((sum, vars) => {
    return sum + (Array.isArray(vars) ? vars.length : 0)
  }, 0)
})

const variationCategories = computed(() => {
  if (!currentVars.value.variations) return []
  
  const categoryMap = {
    'upper_level_variations': { name: '上位概念變化', icon: '⬆️', color: '#f59e0b' },
    'lateral_variations': { name: '平行替代方案', icon: '↔️', color: '#3b82f6' },
    'lower_level_variations': { name: '下位具體實現', icon: '⬇️', color: '#10b981' },
    'combination_variations': { name: '組合變化', icon: '🔄', color: '#8b5cf6' }
  }
  
  return Object.entries(currentVars.value.variations)
    .filter(([key, vars]) => Array.isArray(vars) && vars.length > 0)
    .map(([key, vars]) => ({
      key,
      variations: vars,
      ...categoryMap[key]
    }))
})

const startPhase3 = async () => {
  try {
    await ElMessageBox.confirm(
      '確定要進入競爭分析階段嗎？系統將分析各變化形式與競爭對手專利的衝突情況。',
      '確認進入 Phase 3',
      {
        confirmButtonText: '開始分析',
        cancelButtonText: '取消',
        type: 'info'
      }
    )
    
    ElMessage.success('開始競爭分析...')
    emit('next', import.meta.env.VITE_N8N_PORTFOLIO_PHASE3_URL)
  } catch {
    // 用戶取消
  }
}

onMounted(loadResult)
</script>

<template>
  <div class="variations-container" v-loading="loading">
    <div class="variations-card">
      <!-- 頂部提示 -->
      <div class="alert-section">
        <div class="alert-icon">🧬</div>
        <div class="alert-content">
          <h3>Phase 2: 變化形式生成完成</h3>
          <p>AI 已為 {{ phaseData?.feature_variations?.length || 0 }} 個核心特徵生成多種變化形式，請查看各特徵的擴展方案</p>
        </div>
        <el-button 
          type="primary" 
          size="large"
          class="alert-btn"
          @click="startPhase3"
        >
          開始競爭分析 (Phase 3) →
        </el-button>
      </div>

      <!-- 主要內容區 -->
      <div class="content-layout">
        <!-- 左側：特徵列表 -->
        <div class="features-sidebar">
          <div class="sidebar-header">
            <h4>核心技術特徵</h4>
            <span class="feature-count">{{ phaseData?.feature_variations?.length || 0 }} 個</span>
          </div>

          <div class="features-list">
            <div 
              v-for="f in phaseData?.feature_variations" 
              :key="f.feature_id"
              class="feature-item"
              :class="{ active: activeFeature === f.feature_id }"
              @click="activeFeature = f.feature_id"
            >
              <div class="feature-info">
                <div class="feature-name">{{ f.feature_name }}</div>
                <div class="feature-id">{{ f.feature_id }}</div>
              </div>
              <div class="feature-arrow">→</div>
            </div>
          </div>
        </div>

        <!-- 右側：變化形式詳情 -->
        <div class="variations-content">
          <div v-if="currentVars.variations" class="content-inner">
            <!-- 頂部統計 -->
            <div class="variations-header">
              <div class="header-info">
                <h3>{{ currentVars.feature_name }}</h3>
                <p class="feature-desc">{{ currentVars.feature_id }}</p>
              </div>
              <div class="variations-stats">
                <div class="stat-badge">
                  <span class="stat-number">{{ totalVariations }}</span>
                  <span class="stat-label">變化形式</span>
                </div>
              </div>
            </div>

            <!-- 變化分類 -->
            <div class="categories-section">
              <div 
                v-for="category in variationCategories" 
                :key="category.key"
                class="category-block"
              >
                <div class="category-header" :style="{ borderColor: category.color }">
                  <span class="category-icon">{{ category.icon }}</span>
                  <h4 class="category-name">{{ category.name }}</h4>
                  <span class="category-count">{{ category.variations.length }}</span>
                </div>

                <div class="variations-grid">
                  <div 
                    v-for="(v, i) in category.variations" 
                    :key="i"
                    class="variation-card"
                  >
                    <div class="variation-number">#{{ i + 1 }}</div>
                    <div class="variation-desc">{{ v.description }}</div>
                    <div class="variation-reasoning">
                      <span class="reasoning-label">💡 理由：</span>
                      <span class="reasoning-text">{{ v.reasoning }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="empty-state">
            <div class="empty-icon">📭</div>
            <p>請選擇左側特徵查看變化形式</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.variations-container {
  max-width: 1600px;
  margin: 0 auto;
  padding: 24px;
}

.variations-card {
  background: white;
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

/* 提示區 */
.alert-section {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 24px;
  background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
  border-radius: 12px;
  border: 1px solid #7dd3fc;
  margin-bottom: 32px;
}

.alert-icon {
  font-size: 40px;
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.alert-content {
  flex: 1;
}

.alert-content h3 {
  font-size: 18px;
  font-weight: 700;
  color: #0c4a6e;
  margin: 0 0 4px 0;
}

.alert-content p {
  font-size: 14px;
  color: #0369a1;
  margin: 0;
}

.alert-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  font-weight: 600;
  white-space: nowrap;
}

.alert-btn:hover {
  background: linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%);
}

/* 內容佈局 */
.content-layout {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 24px;
  min-height: 600px;
}

/* 左側特徵列表 */
.features-sidebar {
  background: #f8fafc;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
}

.sidebar-header {
  padding: 20px;
  background: white;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sidebar-header h4 {
  font-size: 15px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

.feature-count {
  font-size: 13px;
  color: #667eea;
  font-weight: 600;
  padding: 4px 12px;
  background: #f0f4ff;
  border-radius: 12px;
}

.features-list {
  overflow-y: auto;
  max-height: calc(100vh - 300px);
}

.feature-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  cursor: pointer;
  border-bottom: 1px solid #e2e8f0;
  transition: all 0.2s;
}

.feature-item:hover {
  background: white;
}

.feature-item.active {
  background: white;
  border-left: 4px solid #667eea;
  padding-left: 16px;
}

.feature-info {
  flex: 1;
}

.feature-name {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 4px;
}

.feature-id {
  font-size: 12px;
  color: #94a3b8;
  font-family: 'Courier New', monospace;
}

.feature-arrow {
  color: #cbd5e1;
  font-size: 18px;
  transition: all 0.2s;
}

.feature-item.active .feature-arrow {
  color: #667eea;
  transform: translateX(4px);
}

/* 右側變化內容 */
.variations-content {
  background: #f8fafc;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  overflow-y: auto;
  max-height: calc(100vh - 300px);
}

.content-inner {
  padding: 24px;
}

/* 頂部統計 */
.variations-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  padding-bottom: 20px;
  border-bottom: 2px solid #e2e8f0;
}

.header-info h3 {
  font-size: 22px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 4px 0;
}

.feature-desc {
  font-size: 13px;
  color: #64748b;
  font-family: 'Courier New', monospace;
  margin: 0;
}

.variations-stats {
  display: flex;
  gap: 12px;
}

.stat-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 24px;
  background: white;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
}

.stat-number {
  font-size: 28px;
  font-weight: 700;
  color: #667eea;
}

.stat-label {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
}

/* 分類區塊 */
.categories-section {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.category-block {
  background: white;
  border-radius: 12px;
  padding: 24px;
  border: 1px solid #e2e8f0;
}

.category-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 3px solid;
}

.category-icon {
  font-size: 24px;
}

.category-name {
  flex: 1;
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

.category-count {
  font-size: 14px;
  font-weight: 700;
  color: #667eea;
  padding: 4px 12px;
  background: #f0f4ff;
  border-radius: 12px;
}

/* 變化網格 */
.variations-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.variation-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 16px;
  transition: all 0.3s;
}

.variation-card:hover {
  border-color: #667eea;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
  transform: translateY(-2px);
}

.variation-number {
  display: inline-block;
  padding: 4px 10px;
  background: #667eea;
  color: white;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 700;
  margin-bottom: 12px;
}

.variation-desc {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  line-height: 1.5;
  margin-bottom: 12px;
}

.variation-reasoning {
  padding: 12px;
  background: white;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.reasoning-label {
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
  display: block;
  margin-bottom: 4px;
}

.reasoning-text {
  font-size: 13px;
  color: #475569;
  line-height: 1.5;
}

/* 空狀態 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
  color: #94a3b8;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.5;
}

/* 響應式 */
@media (max-width: 1200px) {
  .content-layout {
    grid-template-columns: 250px 1fr;
  }

  .variations-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .content-layout {
    grid-template-columns: 1fr;
  }

  .features-sidebar {
    max-height: 200px;
  }

  .alert-section {
    flex-direction: column;
    align-items: flex-start;
  }

  .alert-btn {
    width: 100%;
  }
}
</style>
