# 剩余项目设计文档

本文档描述 `FUTURE_ROADMAP.md` 中尚未完成的 Issue 的实现路径、技术方案和测试计划。

---

## ⚙️ 项目约束（影响实现方式与测试方式）

- **无构建工具 / 非 ESM**：当前 Options 页与 content scripts 都是直接用 `<script>` 加载；`background.js` 为 MV3 service worker。设计与代码示例需要遵循这一约束（不能直接用 `import ... from ...`）。
- **共享模块（推荐 UMD 风格）**：新增 `src/utils/*.js` 建议同时满足：
  - **扩展运行时**：将 API 挂到 `globalThis`（例如 `globalThis.PromptTemplates = {...}`），这样在 window（Options/Content）与 service worker（Background）里都可用。
  - **Node/Jest 测试**：用 `module.exports` 导出同一套 API（例如 `if (typeof module !== 'undefined' && module.exports) module.exports = {...}`）。
- **加载顺序（非常关键）**：
  - **Options 页**：在 `options.html` 中先加载 utils，再加载 `options.js`（例如：`<script src="../utils/prompt-templates.js"></script>`）。
  - **Background SW**：在 `background.js` 顶部使用 `importScripts('src/utils/prompt-templates.js')`（以及其他 utils），避免重复定义与漂移。
  - **Content scripts**：在 `manifest.json` 的 `content_scripts[].js` 列表里把 utils 放在 `src/content.js` 之前，确保 `globalThis.*` 已初始化。
- **Jest/jsdom 注意事项（避免"真空通过"）**：
  - `jsdom` 默认 `offsetParent === null`，且 `innerText` 支持不完整；凡是测试 `DOMUtils.getTranslatableElements()` 或可见性/文本抽取逻辑的用例，必须显式 mock `offsetParent` 与 `innerText`，否则很容易出现"无论实现如何都通过"的假覆盖。

## 📋 实现顺序与依赖关系

```

---

## 🔴 新发现的 Bug（待修复）

### Issue 32: PDF Viewer 劫持浏览器（PDF Viewer Hijacks Browser）

| 项目 | 内容 |
|------|------|
| **问题** | 插件会拦截所有 `.pdf` URL 并重定向到一个**未完成的placeholder页面**，导致：<br>1. 用户无法正常查看任何PDF文件<br>2. 浏览器的原生PDF查看功能被破坏<br>3. 页面只显示 "PDF Viewer Placeholder" 和mock内容 |
| **优先级** | P0 - Critical（破坏浏览器核心功能） |
| **重现步骤** | 1. 安装扩展<br>2. 打开任意PDF URL（如 https://web.stanford.edu/class/cs234/slides/lecture1pre.pdf）<br>3. 观察URL被重定向到 `chrome-extension://xxx/src/pdf-viewer/pdf_viewer.html?file=...`<br>4. 页面显示placeholder而非实际PDF内容 |
| **根本原因** | `src/background.js:22-31` 中的PDF重定向逻辑：<br>```javascript<br>chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {<br>  if (changeInfo.status === 'loading' && tab.url && tab.url.toLowerCase().endsWith('.pdf')) {<br>    const viewerUrl = chrome.runtime.getURL('src/pdf-viewer/pdf_viewer.html') + '?file=' + encodeURIComponent(tab.url);<br>    chrome.tabs.update(tabId, { url: viewerUrl });<br>  }<br>});<br>```<br><br>PDF viewer本身是未完成的功能：<br>- `src/pdf-viewer/pdf_viewer.html` 只是placeholder<br>- 缺少 PDF.js 库（`lib/` 目录为空）<br>- `viewer.js` 只有mock实现 |
| **影响范围** | - 所有以 `.pdf` 结尾的URL<br>- 包括本地PDF、网络PDF、下载的PDF等 |
| **改动文件** | `src/background.js`（移除/禁用PDF重定向） |
| **修复方案** | **方案 A - 临时修复（推荐）**：<br>注释或删除 `src/background.js` 中的PDF重定向代码（第22-31行），恢复浏览器原生PDF查看功能<br><br>**方案 B - 完整实现**：<br>1. 下载并集成 PDF.js 库到 `lib/` 目录<br>2. 完善 `viewer.js` 实现真正的PDF渲染<br>3. 添加翻译overlay功能<br>（工作量大，建议后续版本再考虑） |
| **建议修复代码** | ```javascript<br>// src/background.js - 注释掉第22-31行<br>// PDF Redirect Logic - DISABLED (Issue 32: incomplete feature)<br>// chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {<br>//     if (changeInfo.status === 'loading' && tab.url && tab.url.toLowerCase().endsWith('.pdf')) {<br>//         ...<br>//     }<br>// });<br>``` |
| **测试计划** | - 修复后打开任意PDF URL，验证使用浏览器原生PDF viewer<br>- 验证扩展其他功能不受影响<br>- 验证不再出现placeholder页面 |

---

### Issue 29: 列表项内容重复翻译（Duplicate Translation in List Items）

| 项目 | 内容 |
|------|------|
| **问题** | 列表项（`<li>` 内的 bulletpoint 内容）被翻译了两次：<br>1. 正常翻译：在列表项内部正确位置（✅ 这部分工作正常）<br>2. 重复翻译：作为合并段落文本被插入到**页面底部或错误位置**<br>结果是页面上出现视觉重复，且第二次翻译破坏了布局结构 |
| **优先级** | P0 - Critical（严重影响用户体验，翻译结果不可用） |
| **测试URL** | **https://web.stanford.edu/class/cs234/** （Stanford CS234 课程页面）<br>该页面包含：<br>- "Learning Outcomes" 部分：5个 bulletpoints<br>- "Course Description & Logistics" 部分：混合段落+列表<br>- 复杂嵌套结构：`<li>` 内含多行文本和中文翻译 |
| **重现步骤** | 1. 打开 https://web.stanford.edu/class/cs234/<br>2. 点击翻译按钮<br>3. 观察 "Learning Outcomes" 部分<br>4. 发现每个 bullet 下方有正确翻译，但页面底部出现大段重复合并文本 |
| **截图观察** | **图1 (Learning Outcomes)**：<br>- 每个 `<li>` 内容被正确翻译并插入到 bullet 下方<br>- **但**：页面底部出现一大段合并的中文文本（所有bullet内容被拼接）<br><br>**图2 (Course Description)**：<br>- 段落翻译正常<br>- 列表项翻译正常<br>- **但**：页面底部同样出现重复的合并翻译文本 |
| **可能原因（需调查）** | 1. **最可能**：DOM 扫描逻辑将 `<li>` 单独扫描后，又将 `<ul>/<ol>` 或其父容器作为整体再次扫描<br>2. `getTranslatableElements()` 没有过滤"已有可翻译子元素"的父容器<br>3. 翻译结果插入位置计算错误（应插入到原元素旁，却插入到容器末尾）<br>4. `isSeparatelyTranslated()` 未正确检测"子元素已翻译"的情况 |
| **改动文件（预估）** | `src/utils/dom-utils.js`（扫描逻辑）, `src/content.js`（翻译队列管理、结果插入） |
| **调查步骤** | 1. 在 CS234 页面打开 DevTools Console<br>2. 在 `getTranslatableElements()` 入口添加 `console.log` 输出所有扫描到的元素<br>3. 检查输出中是否同时包含 `<li>` 元素和其父 `<ul>` 元素<br>4. 在 `translateBatch()` 中 log 每个翻译结果的插入位置<br>5. 验证插入位置是否正确（应为原元素的 appendChild，而非页面末尾） |
| **临时解决方案** | 在 `getTranslatableElements()` 中：<br>- 如果元素是 `<ul>/<ol>`，检查是否所有 `<li>` 子元素都会被单独翻译，若是则跳过父容器<br>- 或：明确只翻译叶子级语义容器（`<p>`, `<li>`, `<h1-6>` 等），不翻译 `<ul>/<ol>/<div>` 等纯容器 |
| **长期解决方案** | 1. 重构扫描逻辑，建立"可翻译元素"的层级优先级：<br>   - 定义 LEAF_CONTAINERS = `['p', 'li', 'td', 'th', 'h1-h6', 'blockquote', 'figcaption']`<br>   - 优先扫描这些叶子容器<br>   - 父容器（`div`, `section`, `article`, `ul`, `ol`）仅在无可翻译子元素时才作为翻译单元<br>2. 增强 `isSeparatelyTranslated()` 以检测"祖先或后代已被翻译"<br>3. 验证翻译结果插入逻辑：必须是 `originalElement.appendChild(translationSpan)`，而非插入到其他位置 |
| **测试计划** | - **E2E测试**：使用 CS234 页面作为真实测试用例<br>- 验证 "Learning Outcomes" 的5个 bulletpoints 各只翻译一次<br>- 验证页面底部不出现重复合并文本<br>- 验证嵌套列表（`<ul>` 内嵌 `<ul>`）不会重复翻译<br>- 验证翻译结果插入到正确的 DOM 位置（原元素内部）<br>- 单测：`getTranslatableElements()` 对 `<ul><li>` 结构只返回 `<li>` 元素 |

---

## 📝 待实现的需求（Planned Features）

### Issue 31a: 批量大小配置（Batch Size Configuration - Basic）

| 项目 | 内容 |
|------|------|
| **需求** | 1. 默认 batch size 从 5 增加到 10<br>2. 在 Settings 页面 Advanced 区域提供用户自定义 batch size 入口 |
| **优先级** | P1 - High |
| **当前状态** | - `BATCH_SIZE = 5` 硬编码在 `src/content.js:16`<br>- Options 页面目前无 batch size 设置 |
| **改动文件** | `src/content.js`, `src/options/options.html`, `src/options/options.js` |
| **技术方案** | 1. `options.html` Advanced 区域新增 number input（id=`batchSize`，min=1，max=50，default=10）<br>2. `options.js` 的 `DEFAULT_CONFIG` 新增 `batchSize: 10`，save/restore 逻辑同步<br>3. `content.js` 从 storage 读取 `batchSize`，替换硬编码常量 |
| **测试计划** | - 验证默认 batch size 为 10<br>- 验证用户设置后正确存储和读取<br>- 验证 content.js 使用 storage 中的值 |

---

### Issue 31b: 智能批量回退（Smart Batch Fallback - Token Limits）

| 项目 | 内容 |
|------|------|
| **需求** | 根据模型的 context_window / max_tokens 限制，自动检测并回退 batch size |
| **优先级** | P2 - Medium（依赖 31a 完成） |
| **当前状态** | `llm_config.yml` 已包含每个 provider-model 的 `context_window` 和 `max_tokens` |
| **改动文件** | 新建 `src/utils/batch-calculator.js`, `src/content.js`（集成）, `manifest.json`（content_scripts 加载顺序） |
| **技术方案** | **1. 配置中心化**（已具备）<br>`llm_config.yml` 已包含所需字段：<br>- `context_window`: 输入上下文限制<br>- `max_tokens`: 输出token限制<br><br>**2. Token Ratio 配置**（需新增）<br>不同语言翻译后的token膨胀系数：<br>```yaml<br>_token_ratios:<br>  en_to_zh: 0.6    # 英→中：中文更紧凑<br>  en_to_ja: 0.8    # 英→日<br>  en_to_ko: 0.7    # 英→韩<br>  zh_to_en: 1.8    # 中→英：英文更长<br>  default: 1.2     # 保守默认值<br>```<br><br>**3. Batch Calculator 核心逻辑**<br>```javascript<br>// src/utils/batch-calculator.js<br>class BatchCalculator {<br>  static TOKEN_RATIOS = { ... };<br>  static FALLBACK_SEQUENCE = [10, 5, 3, 1];<br>  <br>  // 估算文本的token数（简化：1 token ≈ 4 chars for EN, 1.5 chars for CJK）<br>  static estimateTokens(text) { ... }<br>  <br>  // 计算安全的batch size<br>  static calculateSafeBatchSize({<br>    userBatchSize,      // 用户设置值<br>    paragraphs,         // 待翻译段落数组<br>    contextWindow,      // 模型context限制<br>    maxOutputTokens,    // 模型output限制<br>    targetLanguage,     // 目标语言（用于token ratio）<br>    systemPromptTokens  // 系统prompt占用的token<br>  }) {<br>    // 原则A：输入不超过context的2/3<br>    const maxInputTokens = Math.floor(contextWindow * 2 / 3);<br>    <br>    // 原则B：估算输出不超过max_tokens<br>    const tokenRatio = this.getTokenRatio(targetLanguage);<br>    <br>    // 从用户设置值开始，逐步fallback<br>    let candidates = [userBatchSize, ...this.FALLBACK_SEQUENCE];<br>    candidates = [...new Set(candidates)].filter(n => n <= userBatchSize).sort((a,b) => b-a);<br>    <br>    for (const size of candidates) {<br>      const batchText = paragraphs.slice(0, size).join('\\n');<br>      const inputTokens = this.estimateTokens(batchText) + systemPromptTokens;<br>      const estimatedOutput = inputTokens * tokenRatio;<br>      <br>      if (inputTokens <= maxInputTokens && estimatedOutput <= maxOutputTokens) {<br>        return size;<br>      }<br>    }<br>    return 1; // 最终fallback<br>  }<br>}<br>```<br><br>**4. Settings UI**<br>在"Advanced"区域添加：<br>- Label: "Paragraphs per batch"<br>- Input: number, min=1, max=20, default=10<br>- Help text: "Higher values improve efficiency but may hit model limits" |
| **Fallback原则评估** | **用户提出的原则**：`10 -> 5 -> 3 -> 1`<br><br>**评估**：✅ 合理，但建议微调：<br>1. 序列合理：覆盖了常见的安全值<br>2. 建议补充：如果用户设置 > 10，应先尝试用户设置值，再fallback到10<br>3. 最终序列：`[userValue, 10, 5, 3, 1].filter(n => n <= userValue).sort(desc)`<br><br>**额外建议**：<br>- 添加 fallback 时的 console.warn 日志，方便调试<br>- 考虑缓存计算结果，避免每次batch都重算 |
| **测试计划** | - 验证默认batch size为10<br>- 验证用户设置batch size后正确存储和读取<br>- 单测 `BatchCalculator.estimateTokens()` 的准确性<br>- 单测 `calculateSafeBatchSize()` 的fallback逻辑<br>- 集成测试：使用超长段落触发fallback<br>- 验证不同provider-model组合的限制检查 |
| **配置状态检查** | ✅ `llm_config.yml` 已包含所有provider-model的：<br>- `context_window`（8个provider全部配置）<br>- `max_tokens`（8个provider全部配置）<br><br>⚠️ 需新增：<br>- `_token_ratios` 配置块（语言对的token膨胀系数） |

---

### Issue 30: 更新扩展图标（Update Extension Icon）

| 项目 | 内容 |
|------|------|
| **需求** | 使用新的 `imagen.png` (642×642, 200KB) 替换当前的扩展图标 |
| **优先级** | P2 - Medium（UI/品牌改进） |
| **当前状态** | - 当前使用的图标：`icon16.png`, `icon48.png`, `icon128.png`（从旧的 `gpt4o_20250327.png` 生成）<br>- 新图标文件：`icons/imagen.png` (642×642) 已添加到仓库 |
| **改动文件** | `manifest.json`, `icons/` 目录（生成新尺寸图标） |
| **技术方案** | 1. 使用图像处理工具（ImageMagick/sips/在线工具）从 `imagen.png` 生成所需尺寸：<br>   - `icon16.png` (16×16)<br>   - `icon48.png` (48×48)<br>   - `icon128.png` (128×128)<br>2. 替换 `icons/` 目录中的现有文件<br>3. 验证 `manifest.json` 中的路径引用保持不变<br>4. 可选：保留 `imagen.png` 作为源文件，或重命名为 `icon-source.png` |
| **实现步骤** | **方案 A - 使用 macOS sips 命令**（推荐，无需额外工具）：<br>```bash<br>sips -z 16 16 icons/imagen.png --out icons/icon16.png<br>sips -z 48 48 icons/imagen.png --out icons/icon48.png<br>sips -z 128 128 icons/imagen.png --out icons/icon128.png<br>```<br><br>**方案 B - 使用 ImageMagick**（需先安装 `brew install imagemagick`）：<br>```bash<br>convert icons/imagen.png -resize 16x16 icons/icon16.png<br>convert icons/imagen.png -resize 48x48 icons/icon48.png<br>convert icons/imagen.png -resize 128x128 icons/icon128.png<br>```<br><br>**方案 C - 在线工具**：<br>- 使用 https://www.iloveimg.com/resize-image 或类似服务 |
| **测试计划** | - 验证生成的图标文件大小合理（16×16 应 < 2KB，48×48 应 < 5KB，128×128 应 < 20KB）<br>- 在 Chrome 中加载扩展，验证工具栏图标显示正确<br>- 在扩展管理页面（chrome://extensions/）验证大图标显示正确<br>- 验证图标在不同缩放比例下清晰度可接受 |
| **备注** | - 源文件 `imagen.png` (200KB) 较大，建议优化压缩<br>- 考虑是否需要为不同尺寸手工优化（而非简单缩放）以获得更好的视觉效果 |

---

## ✅ 近期已完成（用于收敛 Now 列表）

- **Issue 16**: RichText V2（Token 协议）落地：保留 `<a href>` / 内联格式 / Wikipedia 脚注引用；允许 token 块重排以改善语序；失败安全回退
- **Issue 22**: Prompt 迁移改为“旧默认 prompt 严格相等”判定（不再用 substring signature）
- **Issue 23**: 排除逻辑测试改为覆盖真实实现（不再测 test helper）
- **Issue 24**: 明确 `extractTextNodes()` 语义：**过滤 whitespace-only 文本节点**，避免富文本映射对齐漂移

---

## 🎯 下一迭代建议目标：扫描管线升级（Issue 19 + Issue 12）

把“页面扫描→入队”的行为做成可控、可测、可配置的扫描管线，先把误漏翻/误翻问题解决掉，再进入富文本翻译（Issue 16）。

### Scope

- **Issue 19（P1）**：替换硬编码长度阈值为分层 heuristic
- **Issue 12（P3）**：在扫描阶段跳过“已经是中文”的段落（目标语言为 zh-* 时）

### 插入点（代码为真）

- `src/utils/dom-utils.js`
  - 新增 `DOMUtils.shouldTranslate(element, options)`（纯函数风格，便于单测）
  - `DOMUtils.getTranslatableElements(options)` 内部改为依赖 `shouldTranslate`
- `src/content.js`
  - `runTranslationProcess()` 在 `DOMUtils.getTranslatableElements(...)` 之后增加语言检测过滤（或在 `DOMUtils` 内统一处理）
- `src/utils/lang-detect.js`
  - 先保持最小能力：只判断 `zh` vs `other`，并仅在 target 为 `zh/zh-CN/zh-TW` 时启用跳过

### 测试策略

- **单测（DOM 层）**：`DOMUtils.shouldTranslate` 与 `getTranslatableElements` 的组合测试（jsdom 需 mock `offsetParent`/`innerText`）
- **单测（语言检测）**：覆盖 `LangDetect.shouldSkipTranslation(text, targetLang)` 在 zh-* 目标下的行为
- **集成（content 扫描）**：用 mock `chrome.storage.sync.get` 提供 `targetLanguage`，验证扫描结果会跳过中文段落（不进入 `translationQueue`）
Phase 1: 基础设施 & 配置层
├── Issue 9:  统一默认值（HTML/JS 对齐）
├── Issue 15: 配置扩展图标
└── Issue 17: Prompt 分离（协议 vs 用户翻译偏好）
        ↓ (依赖)
Phase 2: 模型/Provider 抽象
└── Issue 18: 模型预设 + 自动端点配置
        ↓ (依赖 17 的 prompt 架构)
Phase 3: 内容处理增强
├── Issue 16: 富文本格式保留
├── Issue 19: 短文本筛选策略优化
└── Issue 12: 源语言检测（可与 19 合并）
        ↓
Phase 4: 扩展性 & 用户偏好
├── Issue 11: 目标语言选择器
├── Issue 13: 翻译缓存
└── Issue 14: 域名/元素排除列表
        ↓
Phase 5: UI 重构
└── Issue 20: Settings 界面重新设计（依赖 17/18/11/14 的配置项）
```

---

## Phase 1: 基础设施 & 配置层

### Issue 9: HTML 和 JS 默认值不一致

| 项目 | 内容 |
|------|------|
| **问题** | 默认值在多个位置重复定义（如 `options.js` 与 `content.js`），存在漂移风险；历史上也出现过 HTML 展示与 JS 默认值不一致的问题 |
| **目标** | 单一来源：以 JS 中的默认配置为唯一默认值来源；HTML 仅用 placeholder 提示格式，并与默认配置保持一致；`content.js` 不再独自维护默认值 |
| **改动文件** | `src/options/options.html`, `src/options/options.js` |
| **技术方案** | 1. HTML 中 `<input>` 移除 `value` 属性，仅保留 `placeholder`（并确保 placeholder 与默认配置一致）<br>2. `restoreOptions()` 在 `DOMContentLoaded` 时从 `DEFAULT_CONFIG` 填充<br>3. `content.js` 获取配置时，改为与 Options 相同的默认来源（避免重复硬编码） |
| **测试计划** | - 测试 `restoreOptions()` 在 storage 为空时使用 `DEFAULT_CONFIG`<br>- 测试 HTML 中 input 初始值为空（由 JS 填充）<br>- 测试 `content.js` 与 `options.js` 的默认 `apiUrl/modelName` 一致（防漂移） |

---

### Issue 15: 扩展图标未配置

| 项目 | 内容 |
|------|------|
| **问题** | `manifest.json` 缺少 `icons` 和 `action.default_icon`，Chrome 使用灰色默认图标 |
| **目标** | 配置正确的图标路径，使扩展在工具栏和扩展管理页显示品牌图标 |
| **改动文件** | `manifest.json`, `icons/` |
| **技术方案** | 1. 使用现有 `icons/gpt4o_20250327.png` 作为临时图标<br>2. 在 `manifest.json` 添加：<br>```json<br>"icons": { "16": "icons/icon16.png", "48": "icons/icon48.png", "128": "icons/icon128.png" },<br>"action": { "default_icon": { "16": "icons/icon16.png", "48": "icons/icon48.png" } }<br>```<br>3. 生成不同尺寸的图标（或复用同一图标） |
| **测试计划** | - 验证 `manifest.json` 包含正确的 `icons` 和 `action.default_icon` 字段<br>- 验证引用的图标文件存在 |

---

### Issue 17: Prompt 分离（协议 vs 用户翻译偏好）

| 项目 | 内容 |
|------|------|
| **问题** | 当前 `customPrompt` 混合了协议约束（`%%` 分隔符规则）和翻译风格偏好，用户编辑可能破坏流式解析 |
| **目标** | 拆分为：<br>1. **PROTOCOL_PROMPT**（内部，不可编辑）：输出格式、`%%` 规则<br>2. **userTranslationPrompt**（用户可编辑）：翻译风格、术语、语气 |
| **改动文件** | `src/utils/prompt-templates.js`（新建）, `src/options/options.html`, `src/options/options.js`, `src/background.js` |
| **技术方案** | ```javascript<br>// src/utils/prompt-templates.js（无 ESM；扩展运行时 + Jest 均可用）<br>const PROTOCOL_PROMPT = `...(包含 %% 分隔符规则 + 输出格式约束；可包含 {{TARGET_LANG}} 占位)...`;<br>const DEFAULT_USER_PROMPT = `翻译成简体中文，保持原文语气。`;<br><br>function buildSystemPrompt({ userPrompt, targetLanguage }) {<br>  const user = (userPrompt ?? '').length ? userPrompt : DEFAULT_USER_PROMPT;<br>  return PROTOCOL_PROMPT.replace('{{TARGET_LANG}}', targetLanguage || 'zh-CN') + '\\n\\n' + user;<br>}<br><br>function migrateCustomPrompt(oldConfig) {<br>  // 迁移策略：不覆盖已有 userTranslationPrompt；只在 customPrompt 存在且"非旧默认"时迁移<br>  // 建议保留 OLD_DEFAULT_PROMPT 常量用于严格相等对比，避免误迁移<br>}<br><br>const PromptTemplates = { PROTOCOL_PROMPT, DEFAULT_USER_PROMPT, buildSystemPrompt, migrateCustomPrompt };<br>if (typeof module !== 'undefined' && module.exports) module.exports = PromptTemplates;<br>else globalThis.PromptTemplates = PromptTemplates;<br>```<br><br>**Options 页面**：<br>- 隐藏或只读显示 `PROTOCOL_PROMPT`（不可编辑）<br>- 暴露 `userTranslationPrompt` 文本框（可编辑）<br>- `options.html` 通过 `<script src="../utils/prompt-templates.js"></script>` 先加载模板，再加载 `options.js`<br><br>**Background.js**：<br>- 顶部 `importScripts('src/utils/prompt-templates.js')`<br>- 使用 `PromptTemplates.buildSystemPrompt({ userPrompt: config.userTranslationPrompt, targetLanguage: config.targetLanguage })` 构建最终 system message<br><br>**迁移**：<br>- 首次加载：如果旧字段 `customPrompt` 存在且非旧默认，将其迁移到 `userTranslationPrompt`（仅在新字段为空时），然后删除 `customPrompt` |
| **测试计划** | - `buildSystemPrompt()` 始终包含 PROTOCOL_PROMPT<br>- 用户 prompt 为空时使用默认值<br>- 迁移逻辑：旧 `customPrompt` → 新 `userTranslationPrompt`<br>- Background 构建的请求 body 包含正确的合并 prompt |

---

## Phase 2: 模型/Provider 抽象

### Issue 18: 模型预设 + 自动端点配置

| 项目 | 内容 |
|------|------|
| **问题** | 用户必须手动输入 `apiUrl` + `modelName`，容易出错 |
| **目标** | 提供下拉选择器：选择 Provider（OpenAI/DeepSeek/Volcengine）和模型，系统自动填充端点和模型 ID |
| **改动文件** | `src/utils/model-registry.js`（新建）, `src/options/options.html`, `src/options/options.js`, `src/background.js` |
| **技术方案** | ```javascript<br>// src/utils/model-registry.js（无 ESM；扩展运行时 + Jest 均可用）<br>const MODEL_REGISTRY = {<br>  openai: {<br>    name: 'OpenAI',<br>    baseUrl: 'https://api.openai.com/v1',<br>    models: [<br>      { id: 'gpt-4o', name: 'GPT-4o' },<br>      { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },<br>    ],<br>    authHeader: 'Bearer',<br>  },<br>  deepseek: {<br>    name: 'DeepSeek',<br>    baseUrl: 'https://api.deepseek.com',<br>    models: [<br>      { id: 'deepseek-chat', name: 'DeepSeek Chat' },<br>    ],<br>    authHeader: 'Bearer',<br>  },<br>  volcengine: {<br>    name: 'Volcengine Ark',<br>    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',<br>    models: [<br>      { id: 'deepseek-v3-2-251201', name: 'DeepSeek V3' },<br>    ],<br>    authHeader: 'Bearer',<br>  },<br>  custom: {<br>    name: 'Custom Endpoint',<br>    baseUrl: '',<br>    models: [],<br>    authHeader: 'Bearer',<br>  },<br>};<br><br>function resolveConfig(providerId, modelId, apiKey, customUrl, customModel) {<br>  const provider = MODEL_REGISTRY[providerId];<br>  if (!provider) return null;<br>  if (providerId === 'custom') {<br>    return { apiUrl: (customUrl || '').trim(), modelName: (customModel || '').trim(), apiKey };<br>  }<br>  return { apiUrl: provider.baseUrl, modelName: modelId, apiKey };<br>}<br>```<br><br>**Options 页面**：<br>- Provider 下拉 → 联动 Model 下拉<br>- 选择 \"Custom\" 时显示 URL/Model 手动输入框<br><br>**存储结构（迁移风险控制）**：<br>- 推荐 **分阶段迁移**：先引入新字段（`providerId/modelId/...`），但同时继续维护"解析后的"`apiUrl/modelName`（兼容 `background.js/content.js` 现有读取），等后台/内容脚本完全改用新字段后再删除旧字段。<br><br>```javascript<br>// 新字段（source of truth）<br>{ providerId, modelId, apiKey, customUrl, customModel, userTranslationPrompt }<br>// 兼容字段（过渡期保留，由 resolveConfig 派生写回）<br>{ apiUrl, modelName }<br>// 废弃字段（迁移后删除）<br>{ customPrompt }<br>``` |
| **测试计划** | - `resolveConfig()` 对每个 provider 返回正确的 baseUrl + modelName<br>- `resolveConfig('custom', ...)` 使用用户自定义值<br>- Options 页面加载时正确渲染 Provider/Model 下拉<br>- 切换 Provider 时 Model 列表联动更新 |

---

## Phase 3: 内容处理增强

### Issue 16: 富文本格式保留

| 项目 | 内容 |
|------|------|
| **问题** | 当前翻译将译文以纯文本插入，导致丢失所有内联格式（`<a>`, `<strong>`, `<em>` 等），且在链接密集/脚注密集页面（Wikipedia）上，基于“按文本节点数组对齐”的方案极易出现 A2（拼接生硬/错位）与 B（语序不自然） |
| **目标** | 在不让模型输出 HTML 的前提下：<br>1) **保留链接/加粗/斜体/代码/脚注引用**等富文本结构与关键属性（尤其 `href`）；<br>2) 允许模型对语序做合理调整，避免 B；<br>3) 最大化解析成功率，避免 A2；<br>4) 失败时安全回退为纯文本（不空白、不破坏原 DOM）。 |
| **改动文件** | `src/content.js`, `src/utils/prompt-templates.js`, `src/background.js`，新增 `src/utils/richtext-v2.js`（UMD 风格） |
| **技术方案（RichText V2：Token 占位符协议，推荐）** | **核心原则**：<br>- **模型永远只输出纯文本**（不输出 HTML/Markdown，不需要 sanitizer）。<br>- 我们在输入中用“不可变 token”表达富文本节点；模型翻译文本时必须保留 token；我们用 token 将输出映射回“克隆出来的真实 DOM 节点”。<br>- 相比 V1（JSON segments 必须等长），V2 不要求按 text node 一一对齐，因此对 Wikipedia 更稳，并且 token 块可移动以改善语序。<br><br>**1) 适用范围（何时启用 V2）**：当段落包含以下任一情况启用：<br>- 至少一个 `<a>` 链接；或<br>- 至少一个 `<strong>/<em>/<code>` 内联样式；或<br>- 至少一个脚注/引用（Wikipedia: `<sup class=\"reference\">...</sup>`）。<br><br>**2) Token 语法（ASCII，避免编码问题）**：<br>- 段落标记：第一行固定 `[[ITC_RICH_V2]]`（输出不应包含该标记；若模型回显，渲染端会剥离）。<br>- Token：<br>  - 成对 token（包裹可翻译内容）：`[[ITC:a0]] ... [[/ITC]]`、`[[ITC:strong0]] ... [[/ITC]]`、`[[ITC:em0]]...`、`[[ITC:code0]]...`。<br>    - close token 使用**通用 `[[/ITC]]`**（不带 id），用于降低模型把 close id 写错导致整体回退的概率（解析端仍兼容旧式 `[[/ITC:a0]]`）。<br>  - 原子 token（不可翻译/原样保留节点）：`[[ITC:ref0]]`（脚注引用，保留可点击），后续可扩展 `[[ITC:br0]]` 等。<br><br>**3) 输入构造（tokenize）**：对原始元素进行浅层语义抽取：<br>- 对 `<a>/<strong>/<em>/<code>`：输出 open token + 递归子内容 + close token；同时保存 token→DOM clone 映射（`<a>` clone 必须保留 `href/title/target/...`）。<br>- 对脚注/引用（`sup.reference`/`.mw-ref`）：输出 atomic token（例如 `[[ITC:ref0]]`），并保存该 `<sup>` 的深拷贝（包含内部 `<a href=\"#cite_note-...\">[1]</a>`）。<br>- 对未知/复杂节点：默认扁平化为其 text（不保留样式），以控制 token 数量与失败概率。<br><br>**4) 输出解析与写回（detokenize + render）**：模型输出一段纯文本，其中 token 可能被移动（允许）。我们做：<br>- 解析输出为事件流：text / open(id) / close / atomic(id)。<br>- 校验：<br>  - 只允许出现输入阶段生成过的 token id；<br>  - 成对 token 必须正确嵌套（栈匹配）；<br>  - atomic token 每个 id 最多出现一次；<br>  - 如果缺 token / 多 token / 嵌套非法 → 判定失败。<br>- 渲染：创建一个 DocumentFragment，按事件流拼 DOM：<br>  - text → TextNode；<br>  - open → append 对应 shallow clone 并入栈；<br>  - close → 出栈；<br>  - atomic → append 对应 deep clone（脚注保持可点击）。<br><br>**5) 回退策略（必须安全）**：任一失败情形（token 缺失/非法嵌套/未知 token/输出夹带说明） → 直接回退为纯文本（译文节点 `.textContent = output`），确保可读且不破坏页面结构。<br><br>**6) Prompt / System 约束**：在 `PROTOCOL_PROMPT` 中追加 RichText V2 规则：<br>- 输出必须为纯文本 + token（禁止 HTML/Markdown/代码块）；<br>- token 必须保留不变，可移动 token 块以保证译文自然；<br>- `[[ITC:refN]]` 这类脚注 token 必须保留（不可删除/复制）。 |
| **测试计划（必须覆盖 A2/B 的不可接受点）** | **单测（tokenize / parse / render）**：`tests/richtext-v2.test.js`<br>- tokenize：链接+加粗+脚注场景生成正确 token 文本与 tokenMap（href 保留）<br>- parse+render：模型可重排 token 块 → 仍能生成合法 DOM，且 `<a href>`/`<sup.reference>` 可点击保留<br>- 失败回退：缺 token/嵌套错误/未知 token → 回退纯文本<br><br>**集成（content translateBatch）**：扩展 `tests/content-translateBatch.test.js`<br>- 模拟 `translateStream` 返回包含 token 的译文，验证插入的译文节点包含 `<a>` 与 `<sup>`，且 text 顺序符合输出（允许移动）<br>- 模拟多段落 batch：rich + plain 混合时，rich 段落仍按 V2 解析，plain 段落为纯文本。 |

---

### Issue 19: 短文本筛选策略优化

| 项目 | 内容 |
|------|------|
| **问题** | 硬编码 `text.length > 8/10` 导致有意义的短文本被跳过 |
| **目标** | 基于语义上下文而非长度判断是否翻译 |
| **改动文件** | `src/utils/dom-utils.js`, `src/options/options.js`（可选配置） |
| **技术方案** | ```javascript<br>// 新增筛选逻辑<br>static shouldTranslate(element, options = {}) {<br>  const text = element.innerText.trim();<br>  if (!text) return false;<br><br>  // 1. 跳过纯数字<br>  if (/^\d+$/.test(text)) return false;<br><br>  // 2. 语义区域优先级<br>  const inMainContent = element.closest('main, article, [role="main"]');<br>  const inNavArea = element.closest('nav, header, footer, aside, [role="navigation"]');<br><br>  // 3. 跳过交互元素（按钮、输入框）<br>  if (element.closest('button, input, select, textarea')) return false;<br>  if (element.getAttribute('role') === 'button') return false;<br><br>  // 4. 长度阈值（可配置）<br>  const minLength = options.translateShortTexts ? 1 : 8;<br>  const inMainMinLength = 3; // 主内容区放宽限制<br><br>  if (inMainContent) {<br>    return text.length >= inMainMinLength;<br>  }<br>  if (inNavArea && !options.translateNavigation) {<br>    return false; // 默认跳过导航区<br>  }<br>  return text.length >= minLength;<br>}<br>```<br><br>**用户配置**（Phase 4 实现，先预留接口）：<br>- `translateShortTexts: boolean`<br>- `translateNavigation: boolean` |
| **测试计划** | - 主内容区（`<main>/<article>`）中的短文本被翻译<br>- 导航区（`<nav>`）中的短文本默认跳过<br>- 按钮/输入框内文本跳过<br>- 纯数字跳过 |

---

### Issue 12: 源语言检测

| 项目 | 内容 |
|------|------|
| **问题** | 扩展会翻译已经是中文的页面，浪费 API 调用 |
| **目标** | 检测页面/元素语言，跳过已经是目标语言的内容 |
| **改动文件** | `src/utils/lang-detect.js`（新建）, `src/content.js` |
| **技术方案** | ```javascript<br>// src/utils/lang-detect.js<br><br>// 简单启发式：检测 CJK 字符比例<br>function detectLanguage(text) {<br>  const cjkPattern = /[\u4e00-\u9fff\u3400-\u4dbf]/g;<br>  const matches = text.match(cjkPattern) || [];<br>  const cjkRatio = matches.length / text.length;<br><br>  if (cjkRatio > 0.3) return 'zh';<br>  return 'other'; // 简化：非中文即需翻译<br>}<br><br>function shouldSkipTranslation(text, targetLang = 'zh') {<br>  const detected = detectLanguage(text);<br>  return detected === targetLang;<br>}<br>```<br><br>**集成**：在 `getTranslatableElements()` 中调用 `shouldSkipTranslation()` 过滤 |
| **测试计划** | - 纯中文文本被正确识别并跳过<br>- 英文文本不被跳过<br>- 中英混合文本（如技术文档）的边界情况 |

---

## Phase 4: 扩展性 & 用户偏好

### Issue 11: 目标语言选择器

| 项目 | 内容 |
|------|------|
| **问题** | 目标语言硬编码为简体中文 |
| **目标** | 用户可选择目标语言（简中/繁中/英/日/韩等） |
| **改动文件** | `src/options/options.html`, `src/options/options.js`, `src/utils/prompt-templates.js` |
| **技术方案** | ```javascript<br>// 语言列表<br>const TARGET_LANGUAGES = [<br>  { code: 'zh-CN', name: '简体中文' },<br>  { code: 'zh-TW', name: '繁體中文' },<br>  { code: 'en', name: 'English' },<br>  { code: 'ja', name: '日本語' },<br>  { code: 'ko', name: '한국어' },<br>];<br><br>// 动态生成 prompt<br>function buildSystemPrompt(userPrompt, targetLang) {<br>  const langName = TARGET_LANGUAGES.find(l => l.code === targetLang)?.name || 'Simplified Chinese';<br>  return PROTOCOL_PROMPT.replace('{{TARGET_LANG}}', langName) + '\n\n' + userPrompt;<br>}<br>```<br><br>**存储**：`{ targetLanguage: 'zh-CN' }` |
| **测试计划** | - `buildSystemPrompt()` 正确替换目标语言<br>- Options 页面正确渲染语言下拉<br>- 切换语言后 storage 正确更新 |

---

### Issue 13: 翻译缓存

| 项目 | 内容 |
|------|------|
| **问题** | 相同内容每次都重新请求 API |
| **目标** | 缓存已翻译内容，减少 API 调用 |
| **改动文件** | `src/utils/translation-cache.js`（新建）, `src/content.js` |
| **技术方案** | ```javascript<br>// src/utils/translation-cache.js<br><br>class TranslationCache {<br>  constructor(maxSize = 1000) {<br>    this.cache = new Map();<br>    this.maxSize = maxSize;<br>  }<br><br>  // 生成缓存 key：需要考虑"同一文本在不同设置下翻译结果不同"<br>  // 建议 key 至少包含：targetLang + modelName/provider + promptVersion + textHash<br>  getKey({ text, targetLang, modelName, promptVersion }) {<br>    return `${targetLang}:${modelName}:${promptVersion}:${this.hash(text)}`;<br>  }<br><br>  hash(text) {<br>    let h = 0;<br>    for (let i = 0; i < text.length; i++) {<br>      h = ((h << 5) - h) + text.charCodeAt(i);<br>      h |= 0;<br>    }<br>    return h.toString(36);<br>  }<br><br>  get(ctx) {<br>    return this.cache.get(this.getKey(ctx));<br>  }<br><br>  set(ctx, translation) {<br>    if (this.cache.size >= this.maxSize) {<br>      const firstKey = this.cache.keys().next().value;<br>      this.cache.delete(firstKey);<br>    }<br>    this.cache.set(this.getKey(ctx), translation);<br>  }<br>}<br>```<br><br>**promptVersion 建议**：可以是固定常量（例如 `PROMPT_VERSION = 'v1'`），当协议/默认 prompt 有破坏性变化时 bump，避免错误命中旧缓存。<br><br>**持久化**（可选）：使用 `chrome.storage.local` 跨会话缓存 |
| **测试计划** | - 缓存命中时不调用 LLM<br>- 缓存未命中时正常调用并存入缓存<br>- 缓存达到 maxSize 时 LRU 淘汰<br>- 不同目标语言使用不同缓存条目 |

---

### Issue 14: 域名/元素排除列表

| 项目 | 内容 |
|------|------|
| **问题** | 无法跳过特定网站或元素 |
| **目标** | 用户可配置排除规则 |
| **改动文件** | `src/options/options.html`, `src/options/options.js`, `src/content.js` |
| **技术方案** | ```javascript<br>// 存储结构<br>{<br>  excludedDomains: ['example.com', '*.internal.com'],<br>  excludedSelectors: ['.no-translate', '[data-no-translate]'],<br>}<br><br>// content.js 启动时检查<br>function isExcludedDomain(hostname, patterns) {<br>  return patterns.some(pattern => {<br>    if (pattern.startsWith('*.')) {<br>      return hostname.endsWith(pattern.slice(1));<br>    }<br>    return hostname === pattern || hostname.endsWith('.' + pattern);<br>  });<br>}<br><br>// 在 getTranslatableElements 中跳过匹配选择器的元素<br>if (excludedSelectors.some(sel => element.matches(sel) || element.closest(sel))) {<br>  continue;<br>}<br>``` |
| **测试计划** | - 排除域名匹配（精确匹配、通配符）<br>- 排除选择器匹配（class、attribute、祖先元素）<br>- 空排除列表时正常工作 |

---

## Phase 5: UI 重构

### Issue 20: Settings 界面重新设计

| 项目 | 内容 |
|------|------|
| **依赖** | Issue 17（Prompt 分离）、Issue 18（模型预设）、Issue 11（语言选择）、Issue 14（排除列表） |
| **目标** | 现代化、分区的设置界面 |
| **改动文件** | `src/options/options.html`, `src/options/options.css`（新建）, `src/options/options.js` |
| **技术方案** | **布局结构**：<br>```<br>┌─────────────────────────────────────────┐<br>│  Settings                               │<br>├─────────────────────────────────────────┤<br>│  🔌 Provider & Model                    │<br>│  ├─ Provider: [OpenAI ▼]                │<br>│  ├─ Model: [GPT-4o ▼]                   │<br>│  └─ API Key: [••••••••••]               │<br>├─────────────────────────────────────────┤<br>│  🌐 Translation                         │<br>│  ├─ Target Language: [简体中文 ▼]        │<br>│  └─ Style Prompt: [textarea]            │<br>├─────────────────────────────────────────┤<br>│  🚫 Exclusions                          │<br>│  ├─ Excluded Domains: [textarea]        │<br>│  └─ Excluded Selectors: [textarea]      │<br>├─────────────────────────────────────────┤<br>│  ⚙️ Advanced (collapsible)              │<br>│  ├─ Custom API URL: [input]             │<br>│  └─ Custom Model ID: [input]            │<br>├─────────────────────────────────────────┤<br>│  [Save Settings]  ✓ Saved               │<br>└─────────────────────────────────────────┘<br>```<br><br>**样式**：<br>- 无构建工具，纯 CSS<br>- CSS 变量控制颜色主题<br>- 响应式布局（最小宽度 400px）<br>- 分区卡片式设计<br><br>**实现约束（减少联动改动）**：<br>- 尽量保持核心字段的 DOM `id` 稳定（如 `apiUrl/apiKey/modelName`），减少 `options.js` 与 `tests/options.test.js` 的改动范围。<br>- Prompt 分离（Issue 17）后 `customPrompt` 预计迁移为 `userTranslationPrompt`：若变更 `id`，需同步更新测试与迁移逻辑。 |
| **测试计划** | - 各表单字段正确绑定到 storage<br>- Provider 切换联动 Model 列表<br>- 高级选项折叠/展开正常<br>- 验证逻辑（必填字段、URL 格式）|

---

## 📦 新增文件清单

| 文件路径 | 用途 |
|----------|------|
| `src/utils/prompt-templates.js` | PROTOCOL_PROMPT + buildSystemPrompt() |
| `src/utils/model-registry.js` | Provider/Model 注册表 + resolveConfig() |
| `src/utils/lang-detect.js` | 简单语言检测 |
| `src/utils/translation-cache.js` | 翻译缓存（LRU） |
| `src/utils/richtext-v2.js` | RichText V2：tokenize / render（不让模型输出 HTML） |
| `src/options/options.css` | Settings 页面样式 |
| `icons/icon16.png` | 16x16 扩展图标 |
| `icons/icon48.png` | 48x48 扩展图标 |
| `icons/icon128.png` | 128x128 扩展图标 |

---

## 🧪 测试文件清单

| 测试文件 | 覆盖 Issue |
|----------|------------|
| `tests/prompt-templates.test.js` | Issue 17 |
| `tests/model-registry.test.js` | Issue 18 |
| `tests/lang-detect.test.js` | Issue 12 |
| `tests/translation-cache.test.js` | Issue 13 |
| `tests/richtext-v2.test.js` | Issue 16（RichText V2 token 协议） |
| `tests/dom-utils-richtext.test.js` | Issue 16（文本节点抽取基础能力） |
| `tests/dom-utils-filtering.test.js` | Issue 19 + Issue 14 选择器部分 |
| `tests/exclusion.test.js` | Issue 14 域名匹配 |
| `tests/options-defaults.test.js` | Issue 9 |
| `tests/manifest.test.js` | Issue 15 |
| `tests/dom-layout.test.js` | Issue 38（DOM Layout 测试） |

---

## 🧪 Issue 38: DOM Layout Test System（中英段落排布测试系统）

### 背景

插件在中英段落的正确排布上面临挑战，包括：
- 重复翻译（同一内容被翻译多次）
- 错误拆分（一个整体被拆成多个翻译单元）
- 嵌套错误（翻译插入到错误的 DOM 位置）

本 Issue 旨在建立系统化的测试方案，捕获并防止这些问题。

### 问题案例清单

| # | 问题类型 | 触发条件 | 错误表现 | Fixture | 状态 |
|---|----------|----------|----------|---------|------|
| 1 | 重复翻译 + 错误拆分 | `<h1>` 内嵌套多个 `<div class="word">` | 每个 word 被单独翻译 + 整体再次翻译（4次输出） | `case-001-word-divs.html` | 待修复 |
| 2 | 段落错位 / 合并翻译 | `<p>` 内含多个 `<br><br>` 分隔的逻辑段落 | 多段译文合并放在 `<p>` 末尾，与原文位置不对应 | `case-002-br-paragraphs.html` | 待修复 |

---

### 案例 #1: Word Divs 重复翻译

| 项目 | 内容 |
|------|------|
| **问题类型** | 重复翻译 + 错误拆分 |
| **来源页面** | Anthropic 官网（Agent Skills 介绍页） |
| **错误表现** | 1. `<h1>` 内的 3 个 `<div class="word">` 被分别翻译<br>2. `<h1>` 整体又被翻译一次<br>3. 导致出现 4 个翻译片段（"介绍" + "智能体" + "技能" + "介绍智能体技能"） |
| **触发条件** | 块级元素（`<h1>`）内部嵌套多个 `<div>` 子元素，每个子元素包含一个单词 |

**错误输出 HTML：**
```html
<h1 class="u-text-style-h1" aria-label="Introducing Agent Skills">
  <div class="word" aria-hidden="true">Introducing
    <span class="immersive-translate-target">介绍</span>  <!-- ❌ 不应翻译 -->
  </div>
  <div class="word" aria-hidden="true">Agent
    <span class="immersive-translate-target">智能体</span>  <!-- ❌ 不应翻译 -->
  </div>
  <div class="word" aria-hidden="true">Skills
    <span class="immersive-translate-target">技能</span>  <!-- ❌ 不应翻译 -->
  </div>
  <span class="immersive-translate-target">介绍智能体技能</span>  <!-- ❌ 重复 -->
</h1>
```

**期望输出 HTML（参考沉浸式翻译）：**
```html
<h1 class="u-text-style-h1" aria-label="Introducing Agent Skills">
  <div class="word" aria-hidden="true">Introducing</div>
  <div class="word" aria-hidden="true">Agent</div>
  <div class="word" aria-hidden="true">Skills</div>
  <font class="notranslate immersive-translate-target-wrapper" lang="zh-CN">
    <font class="notranslate">&nbsp;&nbsp;</font>
    <font class="notranslate immersive-translate-target-inner">Agent Skills 正式上线</font>
  </font>
</h1>
```

**问题根源分析：**
```
当前行为:
h1 ─────────────────────────────────────┐
├── div.word "Introducing" → 被翻译 ❌   │ 每个子元素被当作
├── div.word "Agent"       → 被翻译 ❌   │ 独立翻译单元
├── div.word "Skills"      → 被翻译 ❌   │
└── h1 整体               → 被翻译 ❌   ← 父元素也被翻译（重复）

期望行为:
h1 ─────────────────────────────────────┐
├── div.word "Introducing" → 跳过       │ 子元素不翻译
├── div.word "Agent"       → 跳过       │ （属于父元素的一部分）
├── div.word "Skills"      → 跳过       │
└── h1 整体               → 翻译一次 ✓ ← 只在父级翻译
```

**修复方向：**
1. `getTranslatableElements()` 应识别"包含多个仅含单词的 div 子元素"的父容器
2. 只翻译父容器，跳过子元素
3. 或：检测 `aria-hidden="true"` 的元素，不单独翻译

**测试断言：**
```javascript
// tests/dom-layout.test.js
describe('Case #1: Word Divs', () => {
  it('should NOT translate individual word divs inside h1', () => {
    // Setup: h1 with multiple div.word children
    // Assert: only h1 is in translatable elements, not the divs
  });

  it('should translate h1 only once', () => {
    // Assert: translation appears once, not 4 times
  });
});
```

---

### 案例 #2: BR 段落合并翻译

| 项目 | 内容 |
|------|------|
| **问题类型** | 段落错位 / 合并翻译 |
| **来源页面** | Anthropic 官网（Agent Skills 介绍页） |
| **错误表现** | 1. 单个 `<p>` 内含两个用 `<br><br>` 分隔的逻辑段落<br>2. 整个 `<p>` 被当作一个翻译单元<br>3. 合并的译文放在 `<p>` 末尾，与原文段落位置不对应 |
| **触发条件** | `<p>` 元素内包含 `<br><br>` 分隔的多个逻辑段落 |

**错误输出 HTML：**
```html
<p>
  Claude automatically invokes relevant skills based on your task—no manual selection needed. You'll even see skills in Claude's chain of thought as it works.
  <br><br>
  Creating skills is simple. The "skill-creator" skill provides interactive guidance: Claude asks about your workflow, generates the folder structure, formats the SKILL.md file, and bundles the resources you need. No manual file editing required.
  <span class="immersive-translate-target">
    Claude会根据您的任务自动调用相关技能——无需手动选择。您甚至能在Claude的思考链路中看到技能调用过程。创建技能非常简单："技能创建器"技能提供交互式指导：Claude会询问您的工作流程，生成文件夹结构，格式化SKILL.md文件，并打包所需资源。无需手动编辑文件。
  </span>  <!-- ❌ 合并译文放在末尾 -->
</p>
```

**期望输出 HTML（参考沉浸式翻译）：**
```html
<p>
  Claude automatically invokes relevant skills based on your task—no manual selection needed. You'll even see skills in Claude's chain of thought as it works.
  <font class="immersive-translate-target-wrapper">
    <br>
    <font class="immersive-translate-target-inner">Claude 会根据您的任务自动调用相关技能——无需手动选择。您甚至能在 Claude 的思考过程中看到它使用的技能。</font>
  </font>  <!-- ✓ 译文1紧跟原文1 -->
  <br><br>
  Creating skills is simple. The "skill-creator" skill provides interactive guidance: Claude asks about your workflow, generates the folder structure, formats the SKILL.md file, and bundles the resources you need. No manual file editing required.
  <font class="immersive-translate-target-wrapper">
    <br>
    <font class="immersive-translate-target-inner">创建技能非常简单。"skill-creator"技能提供交互式引导：Claude 会询问您的工作流程，自动生成文件夹结构、格式化 SKILL.md 文件，并打包所需资源。整个过程无需手动编辑文件。</font>
  </font>  <!-- ✓ 译文2紧跟原文2 -->
</p>
```

**问题根源分析：**
```
当前行为:
<p> ─────────────────────────────────────────┐
│ 原文段落1                                   │
│ <br><br>                                   │ 整个 <p> 作为一个
│ 原文段落2                                   │ 翻译单元
│ <span>译文1+译文2（合并）</span>             │ ← 译文放在末尾
└─────────────────────────────────────────────┘

期望行为:
<p> ─────────────────────────────────────────┐
│ 原文段落1                                   │
│ <font>译文1</font>                         │ ← 紧跟段落1
│ <br><br>                                   │
│ 原文段落2                                   │
│ <font>译文2</font>                         │ ← 紧跟段落2
└─────────────────────────────────────────────┘
```

**修复方向：**
1. 在扫描阶段识别 `<br><br>` 作为段落分隔符
2. 将包含 `<br><br>` 的 `<p>` 拆分为多个逻辑翻译单元
3. 或：在翻译结果插入时，根据 `<br><br>` 位置分段插入译文
4. 需要 LLM 返回分段翻译结果（用 `%%` 分隔符对应每个逻辑段落）

**测试断言：**
```javascript
// tests/dom-layout.test.js
describe('Case #2: BR Paragraphs', () => {
  it('should split p with <br><br> into multiple translation units', () => {
    // Setup: p with two paragraphs separated by <br><br>
    // Assert: two translation spans inserted, each after its source paragraph
  });

  it('should NOT merge translations at the end of p', () => {
    // Assert: no single translation span containing both translations
  });
});
```

---

## 🧪 测试实现注意事项（落实到可执行断言）

- **避免"假通过"**：不要使用 `expect(true).toBe(true)` 作为占位；未实现的测试用例统一使用 `test.todo(...)`（或 `test.skip(...)` 并注明原因），确保"通过"代表真的测到了行为。
- **jsdom 兼容**：涉及可见性与文本抽取时，必须 mock：
  - `Object.defineProperty(el, 'offsetParent', { value: document.body })`
  - `Object.defineProperty(el, 'innerText', { get() { return this.textContent; } })`
  否则 `DOMUtils.getTranslatableElements()` 相关测试很容易不触发核心逻辑。

## ⏱️ 预估工作量

| Phase | Issues | 预估时间 |
|-------|--------|----------|
| Phase 1 | 9, 15, 17 | 2-3h |
| Phase 2 | 18 | 2h |
| Phase 3 | 16, 19, 12 | 4-5h |
| Phase 4 | 11, 13, 14 | 3h |
| Phase 5 | 20 | 3-4h |
| **Total** | | **~15h** |

---

## 🚦 实施建议

1. **先跑通 Phase 1**：这是后续所有功能的基础（配置结构、Prompt 架构）
2. **Issue 16（富文本）复杂度最高**：建议先做 MVP（仅处理单层内联元素），再迭代处理嵌套场景
3. **Issue 20（UI 重构）放最后**：等所有配置项确定后再设计界面，避免返工
4. **每个 Phase 完成后跑全量测试**：确保没有回归

