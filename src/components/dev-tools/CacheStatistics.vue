<!-- src/components/dev-tools/CacheStatistics.vue -->
<template>
  <div class="cache-statistics">
    <div v-if="loading" class="loading">
      <div class="spinner-small"></div>
      <span>載入中...</span>
    </div>

    <div v-else-if="stats" class="stats-content">
      <!-- 總覽 -->
      <div class="stat-card overview">
        <div class="stat-icon">📊</div>
        <div class="stat-info">
          <div class="stat-label">總分析數</div>
          <div class="stat-value">{{ stats.total_analyses }}</div>
        </div>
      </div>

      <div class="stat-card hit-rate">
        <div class="stat-icon">🎯</div>
        <div class="stat-info">
          <div class="stat-label">快取命中率</div>
          <div class="stat-value">{{ stats.hit_rate }}%</div>
        </div>
      </div>

      <!-- 技術領域分布 -->
      <div class="section">
        <h4>🎯 技術領域分布</h4>
        <div class="domain-chart">
          <div
            v-for="domain in stats.domain_distribution"
            :key="domain.name"
            class="domain-bar"
          >
            <div class="domain-label">
              <span class="domain-name">{{ domain.name }}</span>
              <span class="domain-count">{{ domain.count }}</span>
            </div>
            <div class="progress-bar">
              <div
                class="progress-fill"
                :class="domain.name"
                :style="{ width: `${(domain.count / stats.total_analyses) * 100}%` }"
              ></div>
            </div>
            <div class="domain-confidence">
              平均信心度: {{ domain.avg_confidence.toFixed(2) }}
            </div>
          </div>
        </div>
      </div>

      <!-- Top CPC 分類號 -->
      <div class="section">
        <h4>🏷️ Top 10 CPC 分類號</h4>
        <div class="cpc-list">
          <div v-for="cpc in stats.top_cpc" :key="cpc.code" class="cpc-item">
            <div class="cpc-code">{{ cpc.code }}</div>
            <div class="cpc-bar">
              <div
                class="cpc-fill"
                :style="{ width: `${(cpc.count / stats.top_cpc[0].count) * 100}%` }"
              ></div>
            </div>
            <div class="cpc-count">{{ cpc.count }}</div>
          </div>
        </div>
      </div>

      <!-- 品質指標 -->
      <div class="section">
        <h4>✨ 品質指標</h4>
        <div class="quality-metrics">
          <div class="quality-item">
            <div class="quality-label">包含數值範圍</div>
            <div class="quality-bar">
              <div
                class="quality-fill has-range"
                :style="{ width: `${stats.quality_metrics.has_numerical_ranges_pct}%` }"
              ></div>
            </div>
            <div class="quality-value">{{ stats.quality_metrics.has_numerical_ranges_pct }}%</div>
          </div>
          <div class="quality-item">
            <div class="quality-label">包含上下位概念</div>
            <div class="quality-bar">
              <div
                class="quality-fill has-concepts"
                :style="{ width: `${stats.quality_metrics.has_hierarchical_concepts_pct}%` }"
              ></div>
            </div>
            <div class="quality-value">{{ stats.quality_metrics.has_hierarchical_concepts_pct }}%</div>
          </div>
          <div class="quality-item">
            <div class="quality-label">包含多層級術語</div>
            <div class="quality-bar">
              <div
                class="quality-fill has-terms"
                :style="{ width: `${stats.quality_metrics.has_multilevel_terms_pct}%` }"
              ></div>
            </div>
            <div class="quality-value">{{ stats.quality_metrics.has_multilevel_terms_pct }}%</div>
          </div>
          <div class="quality-item">
            <div class="quality-label">平均品質分數</div>
            <div class="quality-bar">
              <div
                class="quality-fill avg-score"
                :style="{ width: `${stats.quality_metrics.avg_quality_score * 100}%` }"
              ></div>
            </div>
            <div class="quality-value">{{ (stats.quality_metrics.avg_quality_score * 100).toFixed(1) }}%</div>
          </div>
        </div>
      </div>

      <!-- 人工審核狀態 -->
      <div class="section">
        <h4>✍️ 人工審核狀態</h4>
        <div class="verification-stats">
          <div class="verification-item">
            <span class="verification-label">已驗證</span>
            <span class="verification-value verified">{{ stats.verification.verified_count }}</span>
          </div>
          <div class="verification-item">
            <span class="verification-label">待驗證</span>
            <span class="verification-value pending">{{ stats.verification.pending_count }}</span>
          </div>
          <div class="verification-item">
            <span class="verification-label">有回饋</span>
            <span class="verification-value feedback">{{ stats.verification.with_feedback_count }}</span>
          </div>
        </div>
      </div>

      <!-- 重新整理按鈕 -->
      <button @click="loadStats" class="refresh-btn">
        🔄 重新整理
      </button>
    </div>

    <div v-else class="error-state">
      <p>❌ 無法載入統計資料</p>
      <button @click="loadStats" class="retry-btn">重試</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { supabase } from '../../supabase'

const loading = ref(true)
const stats = ref(null)

const loadStats = async () => {
  loading.value = true
  try {
    // 1. 總分析數與快取命中率
    const { data: allAnalyses } = await supabase
      .from('invalidation_smartsearch_cache')
      .select('id, usage_count')
      .eq('analysis_type', 'feature_extraction')

    const totalAnalyses = allAnalyses?.length || 0
    const cacheHits = allAnalyses?.filter(a => a.usage_count > 0).length || 0
    const hitRate = totalAnalyses > 0 ? ((cacheHits / totalAnalyses) * 100).toFixed(1) : 0

    // 2. 技術領域分布
    const { data: domainData } = await supabase.rpc('get_domain_distribution')
    
    // 如果 RPC 不存在，使用替代方案
    let domainDistribution = []
    if (domainData) {
      domainDistribution = domainData
    } else {
      const { data: rawData } = await supabase
        .from('invalidation_smartsearch_cache')
        .select('technical_domain, domain_confidence')
        .eq('analysis_type', 'feature_extraction')
      
      const domainMap = new Map()
      rawData?.forEach(item => {
        const domain = item.technical_domain || 'Unknown'
        if (!domainMap.has(domain)) {
          domainMap.set(domain, { count: 0, total_confidence: 0 })
        }
        const entry = domainMap.get(domain)
        entry.count++
        entry.total_confidence += item.domain_confidence || 0
      })
      
      domainDistribution = Array.from(domainMap.entries()).map(([name, data]) => ({
        name,
        count: data.count,
        avg_confidence: data.total_confidence / data.count
      }))
    }

    // 3. Top CPC 分類號
    const { data: cpcData } = await supabase
      .from('invalidation_smartsearch_cache')
      .select('predicted_cpc')
      .eq('analysis_type', 'feature_extraction')
      .not('predicted_cpc', 'is', null)

    const cpcMap = new Map()
    cpcData?.forEach(item => {
      const primaryCPC = item.predicted_cpc?.[0]
      if (primaryCPC?.code) {
        cpcMap.set(primaryCPC.code, (cpcMap.get(primaryCPC.code) || 0) + 1)
      }
    })

    const topCPC = Array.from(cpcMap.entries())
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // 4. 品質指標
    const { data: qualityData } = await supabase
      .from('invalidation_smartsearch_cache')
      .select('has_numerical_ranges, has_hierarchical_concepts, has_multilevel_terms, extraction_quality_score')
      .eq('analysis_type', 'feature_extraction')

    const qualityMetrics = {
      has_numerical_ranges_pct: 0,
      has_hierarchical_concepts_pct: 0,
      has_multilevel_terms_pct: 0,
      avg_quality_score: 0
    }

    if (qualityData && qualityData.length > 0) {
      qualityMetrics.has_numerical_ranges_pct = ((qualityData.filter(d => d.has_numerical_ranges).length / qualityData.length) * 100).toFixed(1)
      qualityMetrics.has_hierarchical_concepts_pct = ((qualityData.filter(d => d.has_hierarchical_concepts).length / qualityData.length) * 100).toFixed(1)
      qualityMetrics.has_multilevel_terms_pct = ((qualityData.filter(d => d.has_multilevel_terms).length / qualityData.length) * 100).toFixed(1)
      
      const validScores = qualityData.filter(d => d.extraction_quality_score != null)
      if (validScores.length > 0) {
        const totalScore = validScores.reduce((sum, d) => sum + d.extraction_quality_score, 0)
        qualityMetrics.avg_quality_score = totalScore / validScores.length
      }
    }

    // 5. 人工審核狀態
    const { data: verificationData } = await supabase
      .from('invalidation_smartsearch_cache')
      .select('human_verified, human_feedback')
      .eq('analysis_type', 'feature_extraction')

    const verification = {
      verified_count: verificationData?.filter(d => d.human_verified).length || 0,
      pending_count: verificationData?.filter(d => !d.human_verified).length || 0,
      with_feedback_count: verificationData?.filter(d => d.human_feedback).length || 0
    }

    stats.value = {
      total_analyses: totalAnalyses,
      hit_rate: hitRate,
      domain_distribution: domainDistribution,
      top_cpc: topCPC,
      quality_metrics: qualityMetrics,
      verification: verification
    }

  } catch (error) {
    console.error('載入統計資料失敗:', error)
    stats.value = null
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadStats()
})
</script>

<style scoped>
.cache-statistics {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.loading {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 2rem;
  justify-content: center;
  color: #6b7280;
}

.spinner-small {
  width: 20px;
  height: 20px;
  border: 2px solid #e5e7eb;
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.stats-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px;
  color: white;
}

.stat-card.overview {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.stat-card.hit-rate {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.stat-icon {
  font-size: 2rem;
}

.stat-info {
  flex: 1;
}

.stat-label {
  font-size: 0.875rem;
  opacity: 0.9;
  margin-bottom: 0.25rem;
}

.stat-value {
  font-size: 1.75rem;
  font-weight: 700;
}

.section {
  padding: 1rem;
  background: #f9fafb;
  border-radius: 8px;
}

.section h4 {
  margin: 0 0 1rem 0;
  color: #374151;
  font-size: 1rem;
}

.domain-chart {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.domain-bar {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.domain-label {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
}

.domain-name {
  font-weight: 600;
  color: #374151;
}

.domain-count {
  color: #6b7280;
}

.progress-bar {
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  transition: width 0.3s;
}

.progress-fill.Chemical {
  background: #3b82f6;
}

.progress-fill.Mechanical {
  background: #f59e0b;
}

.progress-fill.Electrical {
  background: #8b5cf6;
}

.domain-confidence {
  font-size: 0.75rem;
  color: #6b7280;
}

.cpc-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.cpc-item {
  display: grid;
  grid-template-columns: 120px 1fr 40px;
  align-items: center;
  gap: 0.75rem;
}

.cpc-code {
  font-family: 'Fira Code', monospace;
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
}

.cpc-bar {
  height: 6px;
  background: #e5e7eb;
  border-radius: 3px;
  overflow: hidden;
}

.cpc-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #2563eb);
  transition: width 0.3s;
}

.cpc-count {
  text-align: right;
  font-size: 0.875rem;
  font-weight: 600;
  color: #6b7280;
}

.quality-metrics {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.quality-item {
  display: grid;
  grid-template-columns: 140px 1fr 60px;
  align-items: center;
  gap: 0.75rem;
}

.quality-label {
  font-size: 0.875rem;
  color: #374151;
}

.quality-bar {
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
}

.quality-fill {
  height: 100%;
  transition: width 0.3s;
}

.quality-fill.has-range {
  background: #10b981;
}

.quality-fill.has-concepts {
  background: #3b82f6;
}

.quality-fill.has-terms {
  background: #8b5cf6;
}

.quality-fill.avg-score {
  background: linear-gradient(90deg, #f59e0b, #10b981);
}

.quality-value {
  text-align: right;
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
}

.verification-stats {
  display: flex;
  gap: 1rem;
}

.verification-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem;
  background: white;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.verification-label {
  font-size: 0.875rem;
  color: #6b7280;
  margin-bottom: 0.5rem;
}

.verification-value {
  font-size: 1.5rem;
  font-weight: 700;
}

.verification-value.verified {
  color: #10b981;
}

.verification-value.pending {
  color: #f59e0b;
}

.verification-value.feedback {
  color: #3b82f6;
}

.refresh-btn {
  padding: 0.75rem;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.refresh-btn:hover {
  background: #1d4ed8;
}

.error-state {
  text-align: center;
  padding: 2rem;
  color: #ef4444;
}

.retry-btn {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.retry-btn:hover {
  background: #dc2626;
}
</style>
