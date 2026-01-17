// src/composables/useMessage.js

export function useMessage() {
  const showMessage = (message, type = 'info') => {
    // 方案 A: 使用原生 alert（最簡單）
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    }
    alert(`${icons[type] || 'ℹ️'} ${message}`)
    
    // 方案 B: 使用自訂的 Toast（如果你有的話）
    // const toast = document.createElement('div')
    // toast.className = `toast toast-${type}`
    // toast.textContent = message
    // document.body.appendChild(toast)
    // setTimeout(() => toast.remove(), 3000)
    
    // 方案 C: 使用 console（開發時）
    // console[type === 'error' ? 'error' : 'log'](`[${type.toUpperCase()}] ${message}`)
  }

  return {
    success: (msg) => showMessage(msg, 'success'),
    error: (msg) => showMessage(msg, 'error'),
    warning: (msg) => showMessage(msg, 'warning'),
    info: (msg) => showMessage(msg, 'info'),
  }
}
