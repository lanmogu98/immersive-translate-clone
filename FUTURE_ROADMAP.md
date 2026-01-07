# Future Roadmap

This document tracks identified issues and planned improvements for the Immersive Translate Clone project.

---

## 🔴 P0 - Critical (Correctness Issues)

### 1. `DOMUtils.showError` method does not exist
- **File**: `src/content.js:34-35`
- **Problem**: `DOMUtils.showError(node, err.message)` is called but the method doesn't exist in `DOMUtils` class
- **Impact**: Runtime error when batch translation fails
- **Fix**: Add `showError` static method to `DOMUtils` class

### 2. `onDone` callback may be called twice
- **File**: `src/utils/llm-client.js:19-39`
- **Problem**: When error occurs, `port.disconnect()` triggers `onDisconnect` listener which calls `onDone` again
- **Impact**: Promise may resolve twice, causing unpredictable behavior
- **Fix**: Add completion flag to prevent duplicate calls

### 3. Popup fails silently when content script not loaded
- **File**: `src/popup/popup.js:1-7`
- **Problem**: `sendMessage` to tabs without content script (chrome://, new tab, etc.) fails silently
- **Impact**: User clicks translate button with no feedback
- **Fix**: Wrap in try-catch and show user-friendly error message

---

## 🟠 P1 - High Priority (Robustness & Product Features)

### 4. `isScanning` state management is incorrect
- **File**: `src/content.js:160-192`
- **Problem**: `isScanning` is set to `false` after scanning completes, but workers may still be running
- **Impact**: User can trigger duplicate translation of same elements
- **Fix**: Check `translationQueue.length` and `activeWorkers` before allowing new scan

### 5. No timeout for API calls
- **File**: `src/background.js:61-77`
- **Problem**: Network issues can cause requests to hang indefinitely
- **Impact**: Translation appears stuck with no way to recover
- **Fix**: Add timeout using `AbortController` (e.g., 60 seconds)

### 6. Default prompt duplicated in two files
- **Files**: `src/background.js:33-44`, `src/options/options.js:29-40`
- **Problem**: Same prompt defined in two places, violates DRY principle
- **Impact**: Changes in one place don't propagate, leads to inconsistency
- **Fix**: Remove duplicate from `background.js`, use only value from config

### 7. No API URL validation
- **File**: `src/options/options.js`
- **Problem**: Invalid URLs (missing protocol, path) cause confusing errors
- **Impact**: Poor user experience when misconfigured
- **Fix**: Validate URL format before saving

### 16. 翻译结果需要保留原文相同的富文本格式（Rich Text Preservation）
- **Files**: `src/content.js`, `src/utils/dom-utils.js`, `src/content.css`
- **Current State**:
  - Content script currently translates plain text (`element.innerText`) and appends translation via `node.textContent += ...`, so inline formatting (links/bold/italic/etc) is lost in the translated output.
- **Impact**: Translated content becomes “pure text”, which is a major quality regression on rich pages (docs/blogs/product pages).
- **Research / Options**:
  - **Option A (safer default)**: Clone the original element DOM structure into the translation container and translate only **text nodes** (keep tags/attributes from the original DOM). Avoids injecting model-produced HTML (XSS risk).
  - **Option B (higher quality, higher complexity)**: Placeholder/template-based translation: keep markup fixed, send a structured representation of text runs to the model, then map results back deterministically (likely requires changing the streaming parser).
  - **Option C (highest risk)**: Ask model to return translated HTML; would require strict sanitization + robust parsing and is risky for a browser extension.
- **Suggested Plan**:
  - Start with Option A to get correct rich-text preservation quickly.
  - Add focused tests for typical rich text: `<a>`, `<strong>`, `<em>`, mixed inline nodes, lists.

### 17. 分离“系统/协议 Prompt”与“用户翻译 Prompt”（Prompt Separation）
- **Files**: `src/options/options.html`, `src/options/options.js`, `src/background.js`, `src/content.js`
- **Problem**:
  - Current UI exposes a single “System Prompt” (`customPrompt`) that also implicitly carries protocol requirements (e.g. `%%` separator expectations).
  - Allowing users to edit protocol-critical rules makes the system fragile (stream parser can break) and mixes “产品/程序约束”与“翻译风格偏好”.
- **Impact**: User customization can accidentally break batching/stream parsing and cause partial/misaligned translations.
- **Fix / Plan**:
  - Make an internal, non-editable **protocol/system prompt** (output-only, paragraph/`%%` rules, no extra text).
  - Add a separate user-facing **translation prompt** (tone, domain terminology, style) in settings.
  - Combine prompts safely in `background.js` when building messages (e.g. system: protocol; system/user: user preferences).
  - Add migration: map current `customPrompt` to new field(s) on first run, without breaking existing users.

### 18. 预置模型与自动配置（Model Presets + Auto Endpoint/Params）
- **Files**: `src/options/options.html`, `src/options/options.js`, `src/background.js`, (new) `src/utils/model-registry.js`
- **Current State**: User must manually input `apiUrl` + `modelName`. `background.js` assumes OpenAI-compatible `${apiUrl}/chat/completions` and `Authorization: Bearer ...`.
- **Goal**: Provide a curated list of providers/models; user selects a model by name and enters only API key. System fills endpoint/model id/other required parameters automatically.
- **Research Questions**:
  - Which providers/models must be supported first (Volcengine Ark, DeepSeek, OpenAI, etc.)?
  - Are all targeted providers OpenAI-compatible? If not, define the minimal adapter surface (path, auth header, request/response shape).
- **Plan**:
  - Define a **single source of truth** registry describing provider defaults (base URL, path, auth scheme) and model ids.
  - Update options UI to a dropdown-based selection with an “Advanced override” section (optional custom endpoint/model id for power users).
  - Add unit tests for config resolution + request building.

### 19. 替换“硬编码字符数阈值”的筛选策略，避免漏翻短文本（Short Text Heuristic）
- **File**: `src/utils/dom-utils.js`
- **Problem**: Current heuristics rely on hard-coded length thresholds (e.g. `text.length > 8/10`), which is unreliable and misses meaningful short texts.
- **Impact**: Real pages often contain valuable short strings (“Read more”, “Docs”, “Sign in”, captions, labels) that get skipped.
- **Research / Options**:
  - Context-aware filtering: prioritize `main/article` and deprioritize `nav/header/footer/aside`.
  - Skip interactive UI chrome by role/tag (buttons/inputs/menus) while still allowing an opt-in for UI translation.
  - Combine with language detection (skip already Chinese) and per-site/element exclusions (ties to Issue 14).
  - Provide a user setting: “Translate short texts” toggle or configurable threshold (default safer).
- **Plan**:
  - Replace the fixed threshold with a layered heuristic (DOM context + element semantics + optional user setting).
  - Add tests using representative DOM snippets to prevent regressions.

---

## 🟡 P2 - Medium Priority (Maintainability & UX/Polish)

### 8. Dead code: `isAlreadyTranslated` method
- **File**: `src/utils/dom-utils.js:16-19`
- **Problem**: Method is defined but never called
- **Impact**: Code bloat, confusion for maintainers
- **Fix**: Remove or consolidate with `isSeparatelyTranslated`

### 9. HTML and JS default values inconsistent
- **Files**: `src/options/options.html:72`, `src/options/options.js:26`
- **Problem**: HTML shows OpenAI URL, JS defaults to Volcengine URL
- **Impact**: Confusing user experience on first use
- **Fix**: Align default values in both files

### 10. Magic numbers without explanation
- **File**: `src/content.js:8-9`
- **Problem**: `BATCH_SIZE = 5`, `MAX_CONCURRENT_WORKERS = 1` lack rationale
- **Impact**: Hard to tune parameters without understanding trade-offs
- **Fix**: Add detailed comments or move to configuration

### 15. Chrome 插件未正确使用 `icons/` 里的图片作为“头像/图标”（Extension Icon Not Configured）
- **Files**: `manifest.json`, `icons/*`
- **Current State**: `manifest.json` currently has no `icons` and no `action.default_icon`, so Chrome uses a generic fallback icon.
- **Impact**: Toolbar icon/avatar looks wrong; reduces product polish and trust.
- **Fix / Plan**:
  - Add `icons` (16/32/48/128) and `action.default_icon` entries.
  - Decide whether to generate proper size-specific PNGs (recommended for sharpness) or reuse the existing `icons/gpt4o_20250327.png` for all sizes as a stopgap.

### 20. 重新设计 Settings（Options）界面：简洁、现代、美观（Settings UI Redesign）
- **Files**: `src/options/options.html`, `src/options/options.js` (and optionally a new `src/options/options.css`)
- **Problem**: Current options UI is a basic form; it will not scale to support prompt separation and model presets without becoming cluttered.
- **Impact**: Poor UX and low perceived quality; harder for users to configure correctly.
- **Plan / UX Requirements**:
  - Sectioned layout: Provider/Model selection, API key, Translation prompt (user), Advanced overrides, and status/validation feedback.
  - Keep “protocol/system prompt” hidden (Issue 17) while exposing user prompt clearly.
  - Prefer lightweight vanilla HTML/CSS (no build pipeline); ensure responsive layout and readable typography.

---

## 🟢 P3 - Low Priority (Extensibility Enhancements)

### 11. Target language hardcoded to Simplified Chinese
- **Problem**: No way to translate to other languages
- **Impact**: Limited user base
- **Fix**: Add target language selector in options

### 12. No source language detection
- **Problem**: Extension translates all content including already-Chinese pages
- **Impact**: Wasted API calls, confusing translations
- **Fix**: Add simple language detection before translating

### 13. No translation caching
- **Problem**: Same content is re-translated on every request
- **Impact**: Wasted API quota
- **Fix**: Implement caching using Map or chrome.storage.local

### 14. No domain/element exclusion list
- **Problem**: Cannot skip specific websites or DOM elements
- **Impact**: Unwanted translations on certain sites
- **Fix**: Add exclude patterns in options

---

## Progress Tracking

| ID | Issue | Priority | Status |
| --- | --- | --- | --- |
| 1 | DOMUtils.showError missing | P0 | ✅ Fixed |
| 2 | onDone double-call | P0 | ✅ Fixed |
| 3 | Popup silent failure | P0 | ✅ Fixed |
| 4 | isScanning state bug | P1 | ✅ Fixed |
| 5 | No API timeout | P1 | ✅ Fixed |
| 6 | Duplicate prompt | P1 | ✅ Fixed |
| 7 | No URL validation | P1 | ✅ Fixed |
| 8 | Dead code | P2 | ✅ Fixed |
| 9 | Inconsistent defaults | P2 | ✅ Fixed |
| 10 | Magic numbers | P2 | ✅ Fixed |
| 11 | Hardcoded language | P3 | ✅ Fixed |
| 12 | No language detection | P3 | 🔲 Pending |
| 13 | No caching | P3 | 🔲 Pending |
| 14 | No exclusion list | P3 | 🔲 Pending |
| 15 | Extension icon/avatar not configured | P2 | ✅ Fixed |
| 16 | Preserve rich text formatting in translated output | P1 | 🔲 Pending |
| 17 | Separate protocol/system prompt from user translation prompt | P1 | ✅ Fixed |
| 18 | Built-in model presets (auto endpoint/params) | P1 | ✅ Fixed |
| 19 | Replace brittle min-length heuristic to avoid missing short texts | P1 | 🔲 Pending |
| 20 | Settings UI redesign (modern + scalable) | P2 | ✅ Fixed |
