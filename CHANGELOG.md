# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased] - 2026-01-11

### Changed
-   **Issue 30: Update Extension Icon**: Regenerated extension icons (16x16, 48x48, 128x128) from new source image `icons/imagen.png` using sharp. Added `scripts/generate-icons.js` for reproducible icon generation.

### Fixed
-   **Issue 29: Duplicate Translation in List Items**: Fixed bug where list items (`<li>`) were translated twice - once correctly in place, and again as merged text at the page bottom. Root cause: parent containers (e.g., `<div>`) with direct text were being selected alongside their translatable child elements. Added `hasTranslatableDescendants()` check to skip parent elements that contain translatable leaf containers (`<p>`, `<li>`, `<h1-6>`, etc.).
-   **Issue 32: PDF Viewer Hijacks Browser**: Disabled incomplete PDF redirect logic that was intercepting all `.pdf` URLs and redirecting to a non-functional placeholder page. Browser's native PDF viewing is now restored. The PDF viewer feature will be re-enabled when PDF.js integration is complete.

### Security
-   **Prompt Injection Protection (Issue 25)**: Web page content is now treated as untrusted input. Added `<translate_input>` boundary markers around user content and explicit SECURITY RULES in the system prompt instructing the LLM to ignore any embedded instructions/commands. User-configurable translation style prompts are now sanitized to remove template placeholders and boundary markers, with a 500-character length limit.

### Fixed
-   **Issue 26: CSS Leak**: Skip `<style>` and `<script>` elements during DOM scanning to prevent CSS selectors from leaking into translation output.
-   **Issue 27: Math Formulas**: Skip math formula elements (`<math>`, `.mwe-math-element`, `.katex`, `.MathJax`) to prevent formulas from being incorrectly translated.
-   **P0: Missing Method**: Added `DOMUtils.showError()` method that was being called but didn't exist, causing runtime errors on batch translation failures.
-   **P0: Double Callback**: Fixed `onDone` callback being called twice in `llm-client.js` when errors occurred, preventing unpredictable behavior.
-   **P0: Silent Failure**: Popup now shows user-friendly error when translation cannot run on browser internal pages (chrome://, about://, etc.). Also attempts to inject content script if not already loaded.
-   **P1: State Management**: Fixed race condition where users could trigger duplicate translations. Added `isTranslating` flag to properly track worker state.
-   **P1: API Timeout**: Added 60-second timeout for API requests to prevent indefinite hangs on network issues.
-   **P2: Dead Code**: Removed unused `isAlreadyTranslated()` method from `DOMUtils`.

### Added
-   **External LLM Config (Issue 21)**: Model registry now loads from `llm_config.yml` (single source of truth). Build script converts YAML → JSON for runtime. Edit `llm_config.yml` and run `npm run build:config` to update providers/models.
-   **Extended Config Format (Issue 21)**: Config now supports `temperature`, `max_tokens`, `context_window`, `pricing`, `rate_limit`, and `request_overrides` per provider. YAML anchors supported for shared endpoints.
-   **URL Validation**: Options page now validates API URL format before saving.
-   **Input Validation**: Options page validates required fields (API Key, Model Name) before saving.
-   **Test Suite**: Added Jest + jsdom unit tests (with `chrome.*` mocks) to cover key extension flows and roadmap fixes.
-   **Settings UI**: Redesigned Options page with sectioned layout (Provider/Model, Target Language, Style Prompt, Exclusions) and a dedicated `options.css` (no build tooling).
-   **Model Presets**: Added provider/model presets via `src/utils/model-registry.js` (auto endpoint + model id resolution).
-   **Prompt Templates**: Added `src/utils/prompt-templates.js` for protocol prompt + user translation prompt composition.
-   **Target Language**: Added target language selector in settings; prompt composition includes target language.
-   **Source Language Detection**: Skip scanning paragraphs that are already Chinese when target language is `zh-*` (simple CJK-ratio heuristic).
-   **Exclusions**: Added exclusion rules (domains + CSS selectors) to skip translation on configured sites/elements.
-   **Icons**: Added `icons` and `action.default_icon` in `manifest.json` for proper extension icon rendering.
-   **Rich Text (Issue 16)**: Added RichText V2 token protocol to preserve `<a href>`, inline formatting, and Wikipedia-style footnote references without asking the model to output HTML.

### Changed
-   **Prompt Architecture**: Removed duplicate default prompt from `background.js`. Now uses prompt from options config with minimal fallback.
-   **Magic Numbers**: Added detailed comments explaining `MAX_CONCURRENT_WORKERS` and `BATCH_SIZE` configuration rationale.
-   **Background Prompt Build**: Background now prefers `PromptTemplates.buildSystemPrompt({ userPrompt, targetLanguage })` when available (with legacy fallback).
-   **Options Migration**: Options page migrates legacy `customPrompt` → `userTranslationPrompt` when the new field is empty.
-   **Scan Heuristics**: Improved DOM scanning to include short main-content strings, and skip navigation areas / interactive UI chrome by default.

### Fixed
-   **Rich Text (Issue 16)**: Hardened RichText V2 parsing to strip echoed `[[ITC_RICH_V2]]` / code fences and tolerate close-token corruption via generic `[[/ITC]]` closes.
-   **Options Page Bugs**: Fixed 5 issues discovered during testing:
    1. Target language switch now works correctly
    2. Default provider/model display on first load
    3. API key storage per provider (each provider remembers its own key)
    4. API key visibility toggle button added
    5. Save button event listener moved inside DOMContentLoaded

---

## [1.0.0] - 2025-12-25

### Security
-   **CRITICAL**: Removed all hardcoded API Keys from `content.js` and `options.js`. Configuration now acts strictly through `chrome.storage`.
-   **Network**: Implemented `AbortController` in background script to automatically cancel pending API requests when the frontend disconnects (e.g., tab closed).

### Added
-   **Smart Batching**: The translation engine now groups paragraphs (batch size: 5) into a single API request. This significantly improves translation coherence and reduces API call frequency.
-   **Immersive Protocol**: Established a standard `%%` separator protocol with the LLM. The system prompt now strictly enforces this format, and the client parser robustly handles `\n%%\n` delimiters in the stream.
-   **Style Inheritance**: Translated text now dynamically inherits `text-align`, `font-weight`, and `font-size` from the parent element.

### Fixed
-   **Layout Breakage**: Changed the injection method from "Sibling Node" to "Child Span" (`appendChild`). This prevents breaking parent Flex/Grid containers.
-   **Duplicate Translation**: Fixed a bug in `isSeparatelyTranslated` where the scanner failed to detect existing translations under the new "Child Span" architecture.
-   **Responsiveness**: Implemented a Worker Queue (Concurrency = 1) to prevent freezing the browser UI during heavy translation tasks.

### Changed
-   **System Prompt**: completely rewritten to follow the "Immersive Translate" standard prompt, enforcing strict output formats and forbidding conversational filler.
