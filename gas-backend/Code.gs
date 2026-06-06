/**
 * Meeting Summarizer — Google Apps Script Backend
 * ================================================
 * 部署方式：
 *   1. 前往 https://script.google.com 建立新專案
 *   2. 把這個檔案的內容貼進去（取代 Code.gs）
 *   3. 【設定 GEMINI_KEY】→ 見下方 STEP A
 *   4. 【部署 Web App】→ 見下方 STEP B
 *
 * ─────────────────────────────────────────────────
 * STEP A：設定 API Key（金鑰不會出現在程式碼中）
 * ─────────────────────────────────────────────────
 *   選單列 → 「專案設定」(Project Settings)
 *   → 往下捲到「指令碼屬性」(Script Properties)
 *   → 新增屬性：
 *       屬性名稱（Property）：GEMINI_KEY
 *       值（Value）：  你的 API Key
 *   → 儲存
 *
 * ─────────────────────────────────────────────────
 * STEP B：部署為 Web App
 * ─────────────────────────────────────────────────
 *   選單列 → 「部署」→「新增部署作業」
 *   → 類型選「網路應用程式」
 *   → 執行身分：「我」（Me）
 *   → 存取權：「任何人」（Anyone）
 *   → 按「部署」→ 複製 Web App URL
 *
 * 複製 URL 後，更新 index.html 中的 GAS_URL 變數。
 */

// ── Constants ────────────────────────────────────────────────────
// 2026-06-06: gemini-1.5-flash 已被 Google 停用,改 2.5-flash (v1beta 仍可用)
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/';
const MAX_INPUT_CHARS = 50000; // 防止過長輸入

// ── CORS Headers ─────────────────────────────────────────────────
function buildCorsOutput(data, status) {
  const output = ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
  return output;
}

// ── GET Handler: health check + one-time key setup ─────────────
const SETUP_TOKEN = 'ms-setup-2026';

function doGet(e) {
  const params = e.parameter || {};

  // One-time setup: GET ?setup=ms-setup-2026&key=YOUR_GEMINI_KEY
  if (params.setup === SETUP_TOKEN && params.key) {
    PropertiesService.getScriptProperties().setProperty('GEMINI_KEY', params.key);
    const stored = PropertiesService.getScriptProperties().getProperty('GEMINI_KEY');
    if (stored === params.key) {
      return buildCorsOutput({ status: 'ok', message: 'GEMINI_KEY set successfully. Do not call this URL again.' });
    }
    return buildCorsOutput({ status: 'error', message: 'Failed to store key.' });
  }

  // Health check
  const hasKey = !!PropertiesService.getScriptProperties().getProperty('GEMINI_KEY');
  return buildCorsOutput({ status: 'ok', keyConfigured: hasKey, message: 'Meeting Summarizer API running.' });
}

// ── POST Handler ─────────────────────────────────────────────────
function doPost(e) {
  try {
    // 解析請求內容
    const body = JSON.parse(e.postData.contents);
    const transcript = (body.transcript || '').trim();
    const style      = body.style  || 'zh-tw';
    const length     = body.length || 'detailed';

    // 輸入驗證
    if (!transcript) {
      return buildCorsOutput({ error: '逐字稿內容不能為空。' });
    }
    if (transcript.length > MAX_INPUT_CHARS) {
      return buildCorsOutput({ error: `輸入內容過長（最多 ${MAX_INPUT_CHARS} 字元）。` });
    }

    // 取得 API Key（從 Script Properties，不硬編碼）
    const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_KEY');
    if (!apiKey) {
      return buildCorsOutput({ error: '伺服器未設定 API Key，請聯絡管理員。' });
    }

    // 建立 Prompt
    const prompt = buildPrompt(transcript, style, length);

    // 呼叫 Gemini API
    const summary = callGemini(apiKey, prompt);

    return buildCorsOutput({ summary });

  } catch (err) {
    return buildCorsOutput({ error: '處理請求時發生錯誤：' + err.message });
  }
}

// ── Prompt Builder ───────────────────────────────────────────────
function buildPrompt(transcript, style, length) {
  const langMap = {
    'zh-tw': '繁體中文',
    'zh-cn': '简体中文',
    'en':    'English',
  };

  const lengthMap = {
    'concise':  '簡明扼要，每節不超過 3 點',
    'detailed': '詳細完整，可包含細節說明',
    'bullet':   '純條列格式，不需要說明文字',
  };

  const lang   = langMap[style]  || '繁體中文';
  const detail = lengthMap[length] || '詳細完整';

  return `你是一位專業的會議記錄分析師。請將以下會議逐字稿整理成結構化摘要。

【輸出語言】${lang}
【詳細程度】${detail}

【輸出格式】請用以下 Markdown 格式輸出：

## 會議摘要
（1-3 句話的整體摘要）

## 主要討論議題
（條列式列出主要討論事項）

## 決議事項
（條列式列出已確認的決議，若無則標示「本次無明確決議」）

## 行動項目
（格式：- **負責人**：行動內容，若不明確負責人則用「待確認」）

## 後續追蹤
（需要在下次會議前確認或追蹤的事項）

---
【會議逐字稿內容如下】

${transcript}`;
}

// ── Gemini API Call ──────────────────────────────────────────────
function callGemini(apiKey, prompt) {
  const url = GEMINI_API_BASE + GEMINI_MODEL + ':generateContent?key=' + apiKey;

  const payload = {
    contents: [
      {
        parts: [{ text: prompt }]
      }
    ],
    generationConfig: {
      temperature:     0.3,
      maxOutputTokens: 2048,
      topP:            0.8,
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
    ]
  };

  const options = {
    method:      'post',
    contentType: 'application/json',
    payload:     JSON.stringify(payload),
    muteHttpExceptions: true,
  };

  const response = UrlFetchApp.fetch(url, options);
  const code     = response.getResponseCode();
  const text     = response.getContentText();

  if (code !== 200) {
    let errMsg = `Gemini API 回傳錯誤 (${code})`;
    try {
      const errData = JSON.parse(text);
      if (errData.error && errData.error.message) {
        errMsg += '：' + errData.error.message;
      }
    } catch (_) {}
    throw new Error(errMsg);
  }

  const result = JSON.parse(text);

  // 提取回覆文字
  const candidates = result.candidates || [];
  if (!candidates.length) {
    throw new Error('Gemini 未回傳任何候選結果。');
  }

  const content = candidates[0].content;
  if (!content || !content.parts || !content.parts.length) {
    throw new Error('Gemini 回傳格式異常。');
  }

  return content.parts[0].text || '';
}
