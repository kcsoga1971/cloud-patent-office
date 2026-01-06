// src/utils/validators.js

/**
 * 驗證身分證字號
 * @param {string} id - 身分證字號
 * @returns {boolean} 是否有效
 */
export function validateTaiwanID(id) {
  if (!id || typeof id !== 'string') return false
  
  // 移除空白
  id = id.trim().toUpperCase()
  
  // 檢查格式：1個英文字母 + 9個數字
  const pattern = /^[A-Z][12]\d{8}$/
  if (!pattern.test(id)) return false
  
  // 字母對應數字
  const letterMap = {
    A: 10, B: 11, C: 12, D: 13, E: 14, F: 15, G: 16, H: 17, I: 34, J: 18,
    K: 19, L: 20, M: 21, N: 22, O: 35, P: 23, Q: 24, R: 25, S: 26, T: 27,
    U: 28, V: 29, W: 32, X: 30, Y: 31, Z: 33
  }
  
  // 取得字母對應的數字
  const letterNum = letterMap[id[0]]
  const n1 = Math.floor(letterNum / 10)
  const n2 = letterNum % 10
  
  // 計算檢查碼
  const weights = [1, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1]
  const nums = [n1, n2, ...id.slice(1).split('').map(Number)]
  const sum = nums.reduce((acc, num, idx) => acc + num * weights[idx], 0)
  
  return sum % 10 === 0
}

/**
 * 驗證統一編號
 * @param {string} taxId - 統一編號
 * @returns {boolean} 是否有效
 */
export function validateTaxID(taxId) {
  if (!taxId || typeof taxId !== 'string') return false
  
  // 移除空白
  taxId = taxId.trim()
  
  // 檢查格式：8個數字
  const pattern = /^\d{8}$/
  if (!pattern.test(taxId)) return false
  
  // 計算檢查碼
  const weights = [1, 2, 1, 2, 1, 2, 4, 1]
  const nums = taxId.split('').map(Number)
  
  let sum = 0
  for (let i = 0; i < 8; i++) {
    let product = nums[i] * weights[i]
    sum += Math.floor(product / 10) + (product % 10)
  }
  
  // 特殊規則：第7碼為7時，檢查碼可能為0或1
  if (nums[6] === 7) {
    return sum % 10 === 0 || (sum + 1) % 10 === 0
  }
  
  return sum % 10 === 0
}

/**
 * 驗證電子郵件
 * @param {string} email - 電子郵件
 * @returns {boolean} 是否有效
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string') return false
  
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return pattern.test(email.trim())
}

/**
 * 驗證電話號碼
 * @param {string} phone - 電話號碼
 * @returns {boolean} 是否有效
 */
export function validatePhone(phone) {
  if (!phone || typeof phone !== 'string') return false
  
  // 移除空白、括號、連字號
  phone = phone.replace(/[\s()-]/g, '')
  
  // 檢查格式：至少8個數字
  const pattern = /^\d{8,}$/
  return pattern.test(phone)
}

/**
 * 驗證專利申請案號
 * @param {string} appNum - 申請案號
 * @returns {boolean} 是否有效
 */
export function validateApplicationNumber(appNum) {
  if (!appNum || typeof appNum !== 'string') return false
  
  // 移除空白
  appNum = appNum.trim()
  
  // 檢查格式：通常是9位數字（例如：112345678）
  const pattern = /^\d{9}$/
  return pattern.test(appNum)
}

/**
 * 驗證專利證書號
 * @param {string} patentNum - 證書號
 * @returns {boolean} 是否有效
 */
export function validatePatentNumber(patentNum) {
  if (!patentNum || typeof patentNum !== 'string') return false
  
  // 移除空白
  patentNum = patentNum.trim()
  
  // 檢查格式：I + 6-7位數字（發明）或 M + 6-7位數字（新型）或 D + 6-7位數字（設計）
  const pattern = /^[IMD]\d{6,7}$/
  return pattern.test(patentNum)
}

/**
 * 驗證必填欄位
 * @param {any} value - 值
 * @returns {boolean} 是否有效
 */
export function validateRequired(value) {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  return true
}

/**
 * 驗證最小長度
 * @param {string} value - 值
 * @param {number} minLength - 最小長度
 * @returns {boolean} 是否有效
 */
export function validateMinLength(value, minLength) {
  if (!value || typeof value !== 'string') return false
  return value.trim().length >= minLength
}

/**
 * 驗證最大長度
 * @param {string} value - 值
 * @param {number} maxLength - 最大長度
 * @returns {boolean} 是否有效
 */
export function validateMaxLength(value, maxLength) {
  if (!value || typeof value !== 'string') return true
  return value.trim().length <= maxLength
}

/**
 * 驗證日期格式
 * @param {string} dateString - 日期字串
 * @returns {boolean} 是否有效
 */
export function validateDate(dateString) {
  if (!dateString || typeof dateString !== 'string') return false
  
  const date = new Date(dateString)
  return !isNaN(date.getTime())
}

/**
 * 驗證日期是否在未來
 * @param {string} dateString - 日期字串
 * @returns {boolean} 是否在未來
 */
export function validateFutureDate(dateString) {
  if (!validateDate(dateString)) return false
  
  const date = new Date(dateString)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  return date >= today
}
