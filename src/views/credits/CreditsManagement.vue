<template>
  <div class="credits-page">
    <div class="page-header">
      <h1>💰 點數管理</h1>
      <p>管理您的 AI 服務點數</p>
    </div>

    <div class="credits-card">
      <div class="current-balance">
        <h2>當前餘額</h2>
        <div class="balance-amount">1,000 點</div>
      </div>

      <div class="purchase-section">
        <h3>購買點數</h3>
        <div class="plans">
          <div class="plan-card">
            <h4>基礎方案</h4>
            <div class="price">NT$ 500</div>
            <div class="credits">500 點</div>
            <button class="btn-primary">購買</button>
          </div>
          <div class="plan-card popular">
            <div class="badge">最受歡迎</div>
            <h4>標準方案</h4>
            <div class="price">NT$ 1,800</div>
            <div class="credits">2,000 點</div>
            <button class="btn-primary">購買</button>
          </div>
          <div class="plan-card">
            <h4>專業方案</h4>
            <div class="price">NT$ 4,500</div>
            <div class="credits">5,000 點</div>
            <button class="btn-primary">購買</button>
          </div>
        </div>
      </div>

      <div class="usage-history">
        <h3>使用記錄</h3>
        <div class="history-list">
          <div class="history-item">
            <span class="service">專利說明書撰寫</span>
            <span class="date">2025-12-23</span>
            <span class="amount">-50 點</span>
          </div>
          <div class="history-item">
            <span class="service">專利檢索分析</span>
            <span class="date">2025-12-22</span>
            <span class="amount">-30 點</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.credits-page {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 2rem;
}

.page-header h1 {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.page-header p {
  color: #666;
}

.credits-card {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.current-balance {
  text-align: center;
  padding: 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  color: white;
  margin-bottom: 2rem;
}

.balance-amount {
  font-size: 3rem;
  font-weight: bold;
  margin-top: 1rem;
}

.purchase-section {
  margin-bottom: 2rem;
}

.purchase-section h3 {
  margin-bottom: 1.5rem;
}

.plans {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.plan-card {
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  padding: 2rem;
  text-align: center;
  position: relative;
  transition: all 0.3s;
}

.plan-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.plan-card.popular {
  border-color: #667eea;
  background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%);
}

.badge {
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  background: #667eea;
  color: white;
  padding: 0.25rem 1rem;
  border-radius: 20px;
  font-size: 0.875rem;
}

.plan-card h4 {
  margin-bottom: 1rem;
}

.price {
  font-size: 1.5rem;
  font-weight: bold;
  color: #667eea;
  margin-bottom: 0.5rem;
}

.credits {
  color: #666;
  margin-bottom: 1.5rem;
}

.btn-primary {
  background: #667eea;
  color: white;
  border: none;
  padding: 0.75rem 2rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.3s;
}

.btn-primary:hover {
  background: #5568d3;
  transform: scale(1.05);
}

.usage-history h3 {
  margin-bottom: 1rem;
}

.history-list {
  border-top: 1px solid #e0e0e0;
}

.history-item {
  display: flex;
  justify-content: space-between;
  padding: 1rem 0;
  border-bottom: 1px solid #f0f0f0;
}

.history-item .service {
  font-weight: 500;
}

.history-item .date {
  color: #666;
}

.history-item .amount {
  color: #f44336;
  font-weight: bold;
}
</style>
