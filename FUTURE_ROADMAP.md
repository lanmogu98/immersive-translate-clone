# Future Roadmap (Task Hub)

This is the **high-signal entrypoint** for near-term work.

- **Deep implementation notes**: `docs/DESIGN_REMAINING_ISSUES.md`
- **History / prior long-form roadmap**: `docs/roadmap/ROADMAP_ARCHIVE.md`

---

## Notes for Agents

- Default: read **only** the `## Now` section unless deeper context is required.
- Keep scope tight: pick **one** item, confirm insertion points, implement minimally, and update status.

---

## Now (Next 1–2 iterations)

| ID | Priority | Item | Status | GH |
| --- | --- | --- | --- | --- |
| **Security Sprint (P3 remaining)** | | | | |
| 45 | P3 | 提示词注入防护增强: 扩展sanitizeUserPrompt过滤更多注入模式 | 🔲 Pending | — |
| **Existing Items** | | | | |
| 31a | P1 | Batch size configuration: increase default from 5→10, add Settings UI (Advanced section) | ✅ Done | — |
| 31b | P2 | Smart batch fallback: check context/output token limits and auto-reduce batch size | 🔲 Pending | — |
| 33 | P2 | Extract magic numbers as named constants: consolidate `8`, `3`, `10` thresholds in `dom-utils.js` with documented rationale | 🔲 Pending | — |
| 34 | P2 | Improve visibility check: `offsetParent === null` misses `position: fixed` elements; add `getComputedStyle` fallback | 🔲 Pending | — |
| 13 | P3 | Translation caching | 🔲 Pending | — |
| 35 | P3 | Refactor `getTranslatableElements` to pipeline pattern: split 95-line function into composable filter stages | 🔲 Pending | — |
| 36 | P3 | Add Shadow DOM support: traverse shadow roots for Web Components (YouTube, GitHub Codespaces, etc.) | 🔲 Pending | — |
| 38 | P1 | 优化测试系统：解决中英段落排布问题（DOM Layout Test System） | 🔄 In Progress | — |

### Recently Done

| ID | Priority | Item | Status | GH |
| --- | --- | --- | --- | --- |
| **Security Sprint Completed** | | | | |
| 38 | P0 | XSS防护: 富文本渲染时消毒DOM克隆元素的危险属性(event handlers) | ✅ Done | — |
| 39 | P1 | XSS防护: 使用textContent替代innerHTML设置固定文本,避免潜在注入风险 | ✅ Done | — |
| 40 | P1 | 输入验证: CSS选择器白名单验证,防止ReDoS和恶意选择器 | ✅ Done | — |
| 41 | P1 | 输入验证: 批量大小(batchSize)后端验证,限制1-50范围 | ✅ Done | — |
| 42 | P2 | 错误处理: API错误信息脱敏,避免泄露敏感端点和配置信息 | ✅ Done | — |
| 43 | P2 | CSP配置: 在manifest.json中添加Content Security Policy | ✅ Done | — |
| 44 | P2 | URL验证增强: API端点验证防止SSRF,增加域名白名单检查 | ✅ Done | — |
| **Previous** | | | | |
| 37 | P1 | Fix duplicate translation when h2 contains body-text (custom element case sensitivity) | ✅ Done | — |
| 30 | P2 | Update extension icon: generated 16/48/128px icons from `imagen.png` | ✅ Done | — |
| 29 | P0 | Duplicate translation in list items: skip parent containers with translatable descendants | ✅ Done | — |
| 32 | P0 | PDF viewer hijacks browser: disabled incomplete PDF redirect to restore native PDF viewing | ✅ Done | — |
| 26 | P1 | Skip `<style>` tags: CSS selectors leaking into translation output | ✅ Done | — |
| 27 | P1 | Skip math elements (`<math>`, `.mwe-math-element`): formulas should not be translated | ✅ Done | — |
| 25 | P1 | Prompt injection 防护：将网页内容视为不可信输入（LLM security hardening） | ✅ Done | — |
| 16 | P1 | Preserve rich text formatting in translated output | ✅ Done | — |
| 19 | P1 | Replace brittle min-length heuristic to avoid missing short texts | ✅ Done | — |
| 21 | P1 | Model selection driven by `llm_config.yml` (single source of truth) | ✅ Done | — |
| 22 | P2 | Prompt migration should use exact old-default match | ✅ Done | — |
| 23 | P2 | Exclusion tests should cover real implementation | ✅ Done | — |
| 24 | P2 | Clarify `extractTextNodes` whitespace semantics | ✅ Done | — |
| 12 | P3 | Source language detection | ✅ Done | — |

---

## Next (Not scheduled yet)

- Add candidates here when they become "near-term actionable".
