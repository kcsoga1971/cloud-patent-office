// src/utils/dateUtils.js

/**
 * 格式化日期
 * @param {string|Date} dateString - 日期字串或 Date 物件
 * @param {string} format - 格式 ('short' | 'long' | 'time')
 * @returns {string} 格式化後的日期
 */
export function formatDate(dateString, format = 'short') {
  if (!dateString) return '-'
  
  const date = new Date(dateString)
  
  if (isNaN(date.getTime())) return '-'
  
  const options = {
    short: {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    },
    long: {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    },
    time: {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }
  }
  
  return date.toLocaleDateString('zh-TW', options[format] || options.short)
}

/**
 * 計算剩餘天數
 * @param {string|Date} deadline - 截止日期
 * @returns {number|null} 剩餘天數（負數表示已逾期）
 */
export function getDaysRemaining(deadline) {
  if (!deadline) return null
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const deadlineDate = new Date(deadline)
  deadlineDate.setHours(0, 0, 0, 0)
  
  const diffTime = deadlineDate - today
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  return diffDays
}

/**
 * 取得期限狀態
 * @param {string|Date} deadline - 截止日期
 * @returns {string} 狀態 ('safe' | 'normal' | 'warning' | 'critical' | 'overdue')
 */
export function getDeadlineStatus(deadline) {
  const days = getDaysRemaining(deadline)
  
  if (days === null) return 'unknown'
  if (days < 0) return 'overdue'
  if (days <= 3) return 'critical'
  if (days <= 7) return 'warning'
  if (days <= 14) return 'normal'
  return 'safe'
}

/**
 * 取得期限文字
 * @param {string|Date} deadline - 截止日期
 * @returns {string} 期限文字
 */
export function getDeadlineText(deadline) {
  const days = getDaysRemaining(deadline)
  
  if (days === null) return '未設定'
  if (days < 0) return `已逾期 ${Math.abs(days)} 天`
  if (days === 0) return '今天到期'
  if (days === 1) return '明天到期'
  return `剩 ${days} 天`
}

/**
 * 取得期限 CSS 類別
 * @param {string|Date} deadline - 截止日期
 * @returns {string} CSS 類別名稱
 */
export function getDeadlineClass(deadline) {
  const status = getDeadlineStatus(deadline)
  return `deadline-${status}`
}

/**
 * 計算日期加上指定月數
 * @param {string|Date} date - 起始日期
 * @param {number} months - 要加上的月數
 * @returns {Date} 計算後的日期
 */
export function addMonths(date, months) {
  const result = new Date(date)
  result.setMonth(result.getMonth() + months)
  return result
}

/**
 * 計算日期加上指定天數
 * @param {string|Date} date - 起始日期
 * @param {number} days - 要加上的天數
 * @returns {Date} 計算後的日期
 */
export function addDays(date, days) {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

/**
 * 檢查日期是否在範圍內
 * @param {string|Date} date - 要檢查的日期
 * @param {string|Date} startDate - 開始日期
 * @param {string|Date} endDate - 結束日期
 * @returns {boolean} 是否在範圍內
 */
export function isDateInRange(date, startDate, endDate) {
  const checkDate = new Date(date)
  const start = new Date(startDate)
  const end = new Date(endDate)
  
  return checkDate >= start && checkDate <= end
}

/**
 * 取得今天的日期字串（YYYY-MM-DD）
 * @returns {string} 今天的日期
 */
export function getTodayString() {
  const today = new Date()
  return today.toISOString().split('T')[0]
}

/**
 * 取得相對時間文字（例如：2小時前、3天前）
 * @param {string|Date} date - 日期
 * @returns {string} 相對時間文字
 */
export function getRelativeTime(date) {
  const now = new Date()
  const past = new Date(date)
  const diffMs = now - past
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)
  const diffMonth = Math.floor(diffDay / 30)
  const diffYear = Math.floor(diffDay / 365)
  
  if (diffSec < 60) return '剛剛'
  if (diffMin < 60) return `${diffMin} 分鐘前`
  if (diffHour < 24) return `${diffHour} 小時前`
  if (diffDay < 30) return `${diffDay} 天前`
  if (diffMonth < 12) return `${diffMonth} 個月前`
  return `${diffYear} 年前`
}
