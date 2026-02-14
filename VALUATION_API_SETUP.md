# 專利鑑價引擎 API 串接設定

## 概述

cloud-patent-office 前端專案已配置為連接到獨立的專利鑑價後端引擎 (patent-valuation-engine)。

## 環境變數配置

### VITE_VALUATION_API_URL

此環境變數用於指定專利鑑價引擎的 API 端點。

**預設值**: `http://178.128.125.69:8080/api/v1/analyze_valuation`

### 設定步驟

1. **複製環境變數範本**：
   ```bash
   cp .env.example .env
   ```

2. **驗證配置**：
   檢查 `.env` 文件中是否包含：
   ```env
   VITE_VALUATION_API_URL=http://178.128.125.69:8080/api/v1/analyze_valuation
   ```

3. **重新構建前端** (如果需要部署)：
   ```bash
   npm run build
   ```

## 前端使用方式

在 `src/views/services/Valuation.vue` 中，API URL 會自動從環境變數讀取：

```javascript
const apiUrl = import.meta.env.VITE_VALUATION_API_URL || 'fallback-url'
```

## API 端點說明

### POST /api/v1/analyze_valuation

執行專利鑑價分析。

**請求格式**：
```json
{
  "patent_number": "TWI572490B",
  "market_size_usd": 10000000,
  "development_stage": "production"
}
```

**注意**: `ipc_code` 欄位是可選的，後端會自動推斷。

**回應格式**：
```json
{
  "success": true,
  "message": "Patent valuation analysis completed successfully",
  "data": {
    "patent_number": "TWI572490B",
    "weighted_average_valuation": 1649295.64,
    "confidence_level": "Medium",
    "confidence_percentage": 53.9,
    ...
  }
}
```

## 後端服務資訊

- **主機**: 178.128.125.69
- **端口**: 8080 (Nginx 反向代理)
- **後端實際端口**: 8000 (Uvicorn/FastAPI)
- **服務管理**: Supervisor

### 檢查後端服務狀態

```bash
# SSH 到後端伺服器後執行
supervisorctl status patent-valuation
```

### 重啟後端服務

```bash
supervisorctl restart patent-valuation
```

### 查看後端日誌

```bash
tail -f /var/log/patent-valuation.log
```

## 開發環境設定

如果在本地開發環境運行鑑價引擎：

1. 修改 `.env` 中的 URL：
   ```env
   VITE_VALUATION_API_URL=http://localhost:8080/api/v1/analyze_valuation
   ```

2. 啟動本地鑑價引擎：
   ```bash
   cd /path/to/patent-valuation
   uvicorn main:app --host 0.0.0.0 --port 8080
   ```

## 故障排除

### 1. CORS 錯誤

確保後端 CORS 設定允許前端域名：

```python
# main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生產環境應限制特定域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 2. 422 錯誤 (Unprocessable Entity)

如果出現 "Field required: ipc_code" 錯誤：
- 確保後端已更新到最新版本（支援自動推斷 IPC code）
- 檢查 `models.py` 中 `ipc_code` 是否為 `Optional` 欄位

### 3. 連接超時

檢查：
- 後端服務是否正在運行
- 防火牆是否允許 8080 端口
- Nginx 配置是否正確

## 更新日誌

### 2024-02-14

- ✅ 添加 `VITE_VALUATION_API_URL` 環境變數
- ✅ 創建 `.env.example` 範本文件
- ✅ 更新 `Valuation.vue` 使用環境變數
- ✅ 後端支援自動推斷 IPC code（可選欄位）
