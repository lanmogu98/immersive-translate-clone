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
| 26 | P1 | Skip `<style>` tags: CSS selectors leaking into translation output | 🔲 Pending | — |
| 27 | P1 | Skip math elements (`<math>`, `.mwe-math-element`): formulas should not be translated | 🔲 Pending | — |
| 13 | P3 | Translation caching | 🔲 Pending | — |
| 28 | P3 | Configurable batch size: allow user to set paragraphs per request (default 5) | 🔲 Pending | — |

### Recently Done

| ID | Priority | Item | Status | GH |
| --- | --- | --- | --- | --- |
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
