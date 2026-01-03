// src/utils/formatters.js

/**
 * 格式化日期
 * @param {string|Date} dateString - ISO 日期字串或 Date 物件
 * @returns {string} - 例如：2023年10月5日
 */
export const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  
  // 檢查日期是否有效
  if (isNaN(date.getTime())) return dateString

  return new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date)
}

/**
 * 格式化相對時間（例如：3 小時前）
 * @param {string} dateString - ISO 8601 日期字串
 * @returns {string} 相對時間描述
 */
export const formatRelativeTime = (dateString) => {
  if (!dateString) return '未知'
  
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  
  if (diffMins < 1) return '剛剛'
  if (diffMins < 60) return `${diffMins} 分鐘前`
  if (diffHours < 24) return `${diffHours} 小時前`
  if (diffDays < 7) return `${diffDays} 天前`
  
  return formatDate(dateString)
}

/**
 * 格式化檔案大小
 * @param {number} bytes - 位元組數
 * @returns {string} 格式化後的檔案大小
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

/**
 * 格式化金額 (USD)
 * @param {number} amount 
 * @returns {string} - 例如：$1,000
 */
export const formatCurrency = (amount) => {
  if (typeof amount !== 'number') return '$0'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(amount)
}
