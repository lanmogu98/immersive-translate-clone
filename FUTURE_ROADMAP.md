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

| ID | Priority | Item | Status |
| --- | --- | --- | --- |
| 16 | P1 | Preserve rich text formatting in translated output | ✅ Done |
| 19 | P1 | Replace brittle min-length heuristic to avoid missing short texts | ✅ Done |
| 21 | P1 | Model selection driven by `llm_config.yml` (single source of truth) | ✅ Done |
| 25 | P1 | Prompt injection 防护：将网页内容视为不可信输入（LLM security hardening） | ✅ Done |
| 22 | P2 | Prompt migration should use exact old-default match | ✅ Done |
| 23 | P2 | Exclusion tests should cover real implementation | ✅ Done |
| 24 | P2 | Clarify `extractTextNodes` whitespace semantics | ✅ Done |
| 12 | P3 | Source language detection | ✅ Done |
| 13 | P3 | Translation caching | 🔲 Pending |

---

## Next (Not scheduled yet)

- Add candidates here when they become “near-term actionable”.

