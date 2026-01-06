// src/constants/jobTypes.js

/**
 * 案件類型常數
 */
export const JOB_TYPES = {
  PATENT_AMENDMENT: 'patent_amendment',       // 專利修正
  PATENT_CORRECTION: 'patent_correction',     // 專利補正
  PATENT_REEXAMINATION: 'patent_reexamination', // 專利再審查
  PATENT_RECTIFICATION: 'patent_rectification'  // 專利更正
}

/**
 * 案件類型標籤
 */
export const JOB_TYPE_LABELS = {
  [JOB_TYPES.PATENT_AMENDMENT]: '專利修正',
  [JOB_TYPES.PATENT_CORRECTION]: '專利補正',
  [JOB_TYPES.PATENT_REEXAMINATION]: '專利再審查',
  [JOB_TYPES.PATENT_RECTIFICATION]: '專利更正'
}

/**
 * 案件類型圖示
 */
export const JOB_TYPE_ICONS = {
  [JOB_TYPES.PATENT_AMENDMENT]: '📝',
  [JOB_TYPES.PATENT_CORRECTION]: '📋',
  [JOB_TYPES.PATENT_REEXAMINATION]: '🔄',
  [JOB_TYPES.PATENT_RECTIFICATION]: '✏️'
}

/**
 * 案件狀態常數
 */
export const JOB_STATUS = {
  DRAFT: 'draft',           // 草稿
  PENDING: 'pending',       // 進行中
  COMPLETED: 'completed',   // 已完成
  CANCELLED: 'cancelled'    // 已取消
}

/**
 * 案件狀態標籤
 */
export const JOB_STATUS_LABELS = {
  [JOB_STATUS.DRAFT]: '草稿',
  [JOB_STATUS.PENDING]: '進行中',
  [JOB_STATUS.COMPLETED]: '已完成',
  [JOB_STATUS.CANCELLED]: '已取消'
}

/**
 * 案件狀態顏色
 */
export const JOB_STATUS_COLORS = {
  [JOB_STATUS.DRAFT]: '#6b7280',
  [JOB_STATUS.PENDING]: '#1e40af',
  [JOB_STATUS.COMPLETED]: '#065f46',
  [JOB_STATUS.CANCELLED]: '#991b1b'
}

/**
 * 專利類型
 */
export const PATENT_TYPES = {
  INVENTION: 'invention',   // 發明專利
  UTILITY: 'utility',       // 新型專利
  DESIGN: 'design'          // 設計專利
}

/**
 * 專利類型標籤
 */
export const PATENT_TYPE_LABELS = {
  [PATENT_TYPES.INVENTION]: '發明專利',
  [PATENT_TYPES.UTILITY]: '新型專利',
  [PATENT_TYPES.DESIGN]: '設計專利'
}

/**
 * 補正類型（案由）
 */
export const CORRECTION_TYPES = {
  '24000': '24000 - 一般補正',
  '24002': '24002 - 形式補正',
  '24036': '24036 - 說明書補正',
  '24046': '24046 - 圖式補正'
}

/**
 * 更正時機
 */
export const RECTIFICATION_TIMINGS = {
  BEFORE_GRANT: 'before_grant',                   // 核准審定書送達後、證書發給前
  AFTER_GRANT: 'after_grant',                     // 證書發給後、舉發案審定前
  DURING_OPPOSITION: 'during_opposition'          // 舉發案審定後
}

/**
 * 更正時機標籤
 */
export const RECTIFICATION_TIMING_LABELS = {
  [RECTIFICATION_TIMINGS.BEFORE_GRANT]: '核准審定書送達後、證書發給前',
  [RECTIFICATION_TIMINGS.AFTER_GRANT]: '證書發給後、舉發案審定前',
  [RECTIFICATION_TIMINGS.DURING_OPPOSITION]: '舉發案審定後'
}

/**
 * 更正類型
 */
export const RECTIFICATION_TYPES = {
  OBVIOUS_ERROR: 'obvious_error',       // 明顯錯誤之訂正
  SCOPE_REDUCTION: 'scope_reduction'    // 縮減申請專利範圍
}

/**
 * 更正類型標籤
 */
export const RECTIFICATION_TYPE_LABELS = {
  [RECTIFICATION_TYPES.OBVIOUS_ERROR]: '明顯錯誤之訂正',
  [RECTIFICATION_TYPES.SCOPE_REDUCTION]: '縮減申請專利範圍'
}

/**
 * 國籍選項
 */
export const NATIONALITIES = [
  '中華民國',
  '美國',
  '日本',
  '韓國',
  '德國',
  '法國',
  '英國',
  '加拿大',
  '澳洲',
  '新加坡',
  '香港',
  '其他'
]

/**
 * 取得案件類型標籤
 */
export function getJobTypeLabel(jobType) {
  return JOB_TYPE_LABELS[jobType] || jobType
}

/**
 * 取得案件類型圖示
 */
export function getJobTypeIcon(jobType) {
  return JOB_TYPE_ICONS[jobType] || '📄'
}

/**
 * 取得案件狀態標籤
 */
export function getJobStatusLabel(status) {
  return JOB_STATUS_LABELS[status] || status
}

/**
 * 取得案件狀態顏色
 */
export function getJobStatusColor(status) {
  return JOB_STATUS_COLORS[status] || '#6b7280'
}

/**
 * 取得專利類型標籤
 */
export function getPatentTypeLabel(patentType) {
  return PATENT_TYPE_LABELS[patentType] || patentType
}

