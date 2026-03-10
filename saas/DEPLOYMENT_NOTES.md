# SBIR 網站部署問題筆記

> 記錄日期：2026-03-10
> 耗時：1.5 天

## 問題 1：Google OAuth redirect_uri_mismatch

### 錯誤訊息
```
redirect_uri_mismatch
The redirect URI provided is missing or does not match the callback URL
```

### 根本原因
- Google OAuth 設定的 callback URL 與實際請求的 URL 不匹配
- 後端沒有正確使用 FRONTEND_URL 環境變數

### 解決方案
- 修改 [`backend/src/auth.ts`](backend/src/auth.ts:39-45) 中的 `getGoogleOAuthUrl` 函數
- 使用 `BACKEND_URL` 環境變數建構正確的 callback URL

---

## 問題 2：Turnstile 驗證失敗

### 錯誤訊息
- Turnstile 驗證錯誤

### 根本原因
- 使用了 Turnstile Site Key（公開金鑰）當作 Secret Key（私鑰）

### 解決方案
- 在 Cloudflare Workers Secrets 中設定正確的 `TURNSTILE_SECRET_KEY`
- 不要將 Site Key 當作 Secret Key 使用

---

## 問題 3：跨域 Cookie 問題

### 問題描述
- 前端部署在 Vercel (vercel.app)
- 後端部署在 Cloudflare Workers (workers.dev)
- 無法共享 Cookie

### 根本原因
- Vercel 和 Cloudflare Workers 是不同的域名
- 瀏覽器的 Same-Origin Policy 阻止跨域 Cookie

### 解決方案
- 放棄使用 Cookie，改用 JWT Token
- Token 存儲在 localStorage
- 使用 Bearer Token 在 Authorization Header 中傳遞
- 修改 [`backend/src/middleware.ts`](backend/src/middleware.ts:34-55) 支援 Bearer Token

---

## 問題 4：CORS 問題

### 錯誤訊息
- CORS error：Access-Control-Allow-Origin

### 根本原因
- 後端 CORS 設定不允許 pages.dev 域名

### 解決方案
- 修改 [`backend/src/index.ts`](backend/src/index.ts:24-40) 的 CORS 設定
- 加入 pages.dev 的支援

---

## 問題 5：Wrangler 部署問題

### 錯誤訊息 1
```
TypeError: Cannot find module 'wrangler'
```

### 錯誤訊息 2
```
Unknown key: 'compatibility_flags' in wrangler.toml
```

### 錯誤訊息 3
```
Error: Workers API tile failed: workers.api.error.not_found
```

### 根本原因
- Wrangler 版本過舊
- Wrangler 4.x 語法不同
- Worker 不存在但嘗試部署

### 解決方案
1. 安裝最新版本：`npm install -g wrangler`
2. 修正 wrangler.toml 語法：
   ```toml
   # 錯誤写法
   [compatibility_flags]
   nodejs_compat = true
   
   # 正確写法
   compatibility_flags = ["nodejs_compat"]
   ```
3. 先刪除現有 Worker 再重新部署
4. 使用 `-c wrangler.toml` 明確指定設定檔

---

## 問題 6：GitHub Actions 部署失敗

### 錯誤訊息
- 前端部署到 Cloudflare Pages 失敗
- 部署到空的資料夾

### 根本原因
- GitHub Actions workflow 缺少 `npm run build` 步驟
- 直接部署 `./` 而不是建置後的 `dist` 目錄

### 解決方案
- 修改 [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml:36-57)
- 加入 `npm install` 和 `npm run build` 步驟
- 設定環境變數（VITE_API_BASE, VITE_TURNSTILE_SITE_KEY 等）
- 修正部署指令為 `npx wrangler pages deploy dist --project-name=sbir-grants`

---

## 問題 7：登入後无限循环 (SIGILL)

### 錯誤訊息
- 畫面不斷重新整理
- 出現 SIGILL 錯誤

### 根本原因
- [`AuthContext.tsx`](frontend/src/contexts/AuthContext.tsx:32-78) 中的 `checkAuth` 函數
- 每次渲染時都會處理 URL hash 並重新整理
- 沒有清除 URL hash 導致无限循环

### 解決方案
```typescript
const checkAuth = async () => {
    const hash = window.location.hash;
    let token = '';
    let needsReload = false;
    
    if (hash && hash.includes('token=')) {
        token = decodeURIComponent(hash.split('token=')[1].split('&')[0]);
        localStorage.setItem('auth_token', token);
        window.location.hash = '';  // 清除 hash 防止循环
        needsReload = true;
    }

    if (needsReload) {
        window.location.reload();  // 重新載入頁面
        return;
    }
    // ...
};
```

---

## 環境變數清單

### Backend (Cloudflare Workers Secrets)
| 變數名稱 | 說明 |
|---------|------|
| GOOGLE_CLIENT_ID | Google OAuth 客戶端 ID |
| GOOGLE_CLIENT_SECRET | Google OAuth 客戶端密鑰 |
| JWT_SECRET | JWT 簽名密鑰 |
| TURNSTILE_SECRET_KEY | Turnstile 私鑰 |
| FRONTEND_URL | 前端網址（用於 CORS 和重定向） |
| BACKEND_URL | 後端網址（用於 OAuth callback） |

### Frontend (.env.production)
| 變數名稱 | 說明 |
|---------|------|
| VITE_API_BASE | 後端 API 網址 |
| VITE_TURNSTILE_SITE_KEY | Turnstile 公開金鑰 |
| VITE_SKIP_TURNSTILE | 是否跳過 Turnstile ## 部署網驗證 |

---

址

- **前端網址**：https://sbir-grants.pages.dev
- **後端網址**：https://sbir-backend.wayneq77.workers.dev
- **GitHub Repo**：https://github.com/wayneq77/sbir-grants

---

## 部署流程（重要！）

### 從本機部署
```bash
# 前端
cd frontend
npm run build
npx wrangler pages deploy dist --project-name=sbir-grants

# 後端
cd backend
npx wrangler deploy -c wrangler.toml
```

### 從 GitHub 部署
1. 確保程式碼已推送到 GitHub main 分支
2. GitHub Actions 會自動觸發部署
3. 或者手動觸發 workflow_dispatch

---

## 待解決問題

1. **路由問題**：訪問 /app/settings 會跳轉回首頁
   - 可能需要檢查 React Router 設定
   - 檢查 ProtectedRoute 元件

---

## 重要發現

### 網址對應關係
- 前端網址：`https://{hash}.sbir-grants.pages.dev`
- 後端網址：`https://sbir-backend.wayneq77.workers.dev`
- 前端呼叫後端 API：`VITE_API_URL = https://sbir-backend.wayneq77.workers.dev/api`
- Auth 路由：`/api/auth/google/precheck` 和 `/api/auth/google/callback`

### Google OAuth 設定
- 每次修改 auth 路徑（例如從 `/auth` 改到 `/api/auth`），都需要更新 Google Cloud Console 的 authorized redirect URIs
- 新增 URL：`https://sbir-backend.wayneq77.workers.dev/api/auth/google/callback`
- 設定需要 5-30 分鐘才會生效

### Cloudflare Pages 部署
- 每次部署都會產生新的網址（例如 `https://78b5469e.sbir-grants.pages.dev`）
- 需要更新後端的 FRONTEND_URL 環境變數
- 長期方案：設定自定義網域

---

## 經驗教訓

1. **Wrangler 4.x 有語法變化** - 要注意 compatibility_flags 格式
2. **跨域認證要用 JWT** - Cookie 無法跨域名共享
3. **GitHub Actions 要先建置** - 不能直接部署原始碼
4. **部署前要清除 Worker** - 有時候需要刪除重建
5. **環境變數要分開管理** - 前端用 VITE_ 前綴，後端用 Secrets

---

## 🔐 API 金鑰與 Token 整理（2026-03-10 更新）

### GitHub Token
| 名稱 | 值 | 用途 |
|------|-----|------|
| GitHub Personal Access Token | `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` | 用於 git push 到 GitHub |

> ⚠️ **重要**：千萬不要把真實的 Token 推送到 GitHub！請用上述格式的佔位符

### 環境變數 (.env)

#### 前端 (.env.production)
```env
VITE_API_URL=https://sbir-backend.wayneq77.workers.dev/api
VITE_TURNSTILE_SITE_KEY=0x4AAAAAAAxxxxxxxxxxxxx  # 請填入您的 Turnstile Site Key
VITE_SKIP_TURNSTILE=false
```

#### 後端 Secrets (Cloudflare Workers)
請使用以下指令設定：
```bash
cd backend
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put JWT_SECRET
npx wrangler secret put TURNSTILE_SECRET_KEY
npx wrangler secret put FRONTEND_URL
npx wrangler secret put BACKEND_URL
```

### Cloudflare 設定
| 服務 | 名稱 | 網址 |
|------|------|------|
| 前端 | sbir-grants | https://sbir-grants.pages.dev |
| 後端 | sbir-backend | https://sbir-backend.wayneq77.workers.dev |
| D1 資料庫 | sbir-db | - |
| R2 儲存桶 | sbir-storage | - |
| Vectorize | sbir-embeddings | - |
| AI | - | - |

### Google OAuth 設定
- **authorized redirect URIs**:
  - `https://sbir-backend.wayneq77.workers.dev/api/auth/google/callback`
- **authorized JavaScript origins**:
  - `https://sbir-grants.pages.dev`
  - `https://sbir-backend.wayneq77.workers.dev`

### Wrangler 部署指令
```bash
# 後端部署
cd saas/backend
npx wrangler deploy -c wrangler.toml

# 前端部署
cd saas/frontend
npm run build
npx wrangler pages deploy dist --project-name=sbir-grants
```

### 常見問題快速排除
1. **Wrangler 未登入**：`npx wrangler login`
2. **Token 過期**：`gh auth refresh`
3. **部署失敗**檢查 `.github/workflows/deploy.yml` 是否存在於正確路徑
4. **CORS 錯誤**：確認後端 CORS 設定允許正確的 origin
