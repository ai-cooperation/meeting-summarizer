# 🚀 部署說明

## 兩個部署目標

| 服務 | 用途 | 狀態 |
|------|------|------|
| GitHub Pages | 前端 `index.html` | ⬇ 步驟一 |
| Google Apps Script | 後端 API + 存金鑰 | ⬇ 步驟二 |

---

## 步驟一：部署到 GitHub Pages

### 1-A 在 GitHub 建立新 repo

1. 前往 https://github.com/new
2. Repository name：`meeting-summarizer`（或任意名稱）
3. 設為 **Public**（GitHub Pages 免費方案需要 Public）
4. **不要**勾選 Initialize README（因為本地已有檔案）
5. 按「Create repository」

### 1-B 推上 GitHub

複製你在 GitHub 看到的 remote URL，然後在 terminal 執行：

```bash
cd /Users/user/Desktop/mepa_testimonials/meeting-summarizer

# 替換成你的 GitHub username
git remote add origin https://github.com/YOUR_USERNAME/meeting-summarizer.git

git push -u origin main
```

### 1-C 開啟 GitHub Pages

1. 前往你的 repo → Settings → Pages
2. Source 選擇：**Deploy from a branch**
3. Branch 選：`main`，資料夾選 `/ (root)`
4. 按「Save」

幾分鐘後，GitHub Pages URL 為：
```
https://YOUR_USERNAME.github.io/meeting-summarizer/
```

---

## 步驟二：部署 GAS 後端

### 2-A 建立 Apps Script 專案

1. 前往 https://script.google.com
2. 左上角「新增專案」
3. 刪除預設內容，貼上 `gas-backend/Code.gs` 的全部內容
4. 儲存（Ctrl+S），可命名為「Meeting Summarizer API」

### 2-B 設定 GEMINI_KEY（金鑰放這裡，不寫在程式碼裡）

1. 左側齒輪圖示 → 「專案設定」（Project Settings）
2. 往下捲到「**指令碼屬性**」（Script Properties）
3. 按「**新增屬性**」
4. 填入：
   - 屬性名稱：`GEMINI_KEY`
   - 值：貼上你的 Gemini API Key（在 Google AI Studio 取得，或由管理員提供）
5. 按「儲存指令碼屬性」

> ⚠️ 這裡設定的 Key 只存在 GAS 的加密儲存空間，不會出現在程式碼或 git 中。

### 2-C 部署 Web App

1. 右上角「**部署**」→「**新增部署作業**」
2. 類型選「**網路應用程式**」（Web app）
3. 設定：
   - 說明：`v1`
   - 執行身分（Execute as）：**「我」（Me）**
   - 存取權（Who has access）：**「任何人」（Anyone）**
4. 按「**部署**」
5. 複製顯示的 **Web App URL**（格式如 `https://script.google.com/macros/s/AKfy.../exec`）

### 2-D 更新前端 URL

打開 `index.html`，找到這一行：

```javascript
const GAS_URL = 'YOUR_GAS_WEB_APP_URL_HERE';
```

替換成你的 Web App URL：

```javascript
const GAS_URL = 'https://script.google.com/macros/s/AKfy.../exec';
```

然後再 commit 一次：

```bash
git add index.html
git commit -m "config: set GAS backend URL"
git push
```

---

## 最終網址

| 服務 | URL |
|------|-----|
| 前端（GitHub Pages） | `https://YOUR_USERNAME.github.io/meeting-summarizer/` |
| 後端（GAS Web App） | `https://script.google.com/macros/s/YOUR_ID/exec` |

---

## 確認 GEMINI_KEY 在哪裡

去這裡確認：

```
Google Apps Script 專案
  → 左側齒輪 → 專案設定
  → 往下捲到「指令碼屬性」區塊
  → 你會看到 GEMINI_KEY 的屬性名稱（值會被遮住）
```

**Key 只存在 GAS Script Properties，不會在：**
- ❌ 任何程式碼檔案
- ❌ GitHub repo
- ❌ 瀏覽器 Network 請求

---

## 安全性說明

| 風險 | 防護措施 |
|------|----------|
| Key 外洩到 GitHub | Key 只存在 GAS Script Properties，Code.gs 不含 Key |
| 前端暴露 Key | 前端只發請求給 GAS，不知道 Key |
| 未授權使用 API | 可在 GAS 加 rate limiting（進階選項） |

---

## 如果需要更新 GAS 程式碼

每次修改 Code.gs 後，需要重新部署：
1. GAS → 部署 → **管理部署作業**
2. 右上角「編輯」→ 版本選「新版本」
3. 按「部署」（URL 不變）
