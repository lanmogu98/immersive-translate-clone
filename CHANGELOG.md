# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased] - 2026-01-06

### Fixed
-   **P0: Missing Method**: Added `DOMUtils.showError()` method that was being called but didn't exist, causing runtime errors on batch translation failures.
-   **P0: Double Callback**: Fixed `onDone` callback being called twice in `llm-client.js` when errors occurred, preventing unpredictable behavior.
-   **P0: Silent Failure**: Popup now shows user-friendly error when translation cannot run on browser internal pages (chrome://, about://, etc.). Also attempts to inject content script if not already loaded.
-   **P1: State Management**: Fixed race condition where users could trigger duplicate translations. Added `isTranslating` flag to properly track worker state.
-   **P1: API Timeout**: Added 60-second timeout for API requests to prevent indefinite hangs on network issues.
-   **P2: Dead Code**: Removed unused `isAlreadyTranslated()` method from `DOMUtils`.

### Added
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

### Changed
-   **Prompt Architecture**: Removed duplicate default prompt from `background.js`. Now uses prompt from options config with minimal fallback.
-   **Magic Numbers**: Added detailed comments explaining `MAX_CONCURRENT_WORKERS` and `BATCH_SIZE` configuration rationale.
-   **Background Prompt Build**: Background now prefers `PromptTemplates.buildSystemPrompt({ userPrompt, targetLanguage })` when available (with legacy fallback).
-   **Options Migration**: Options page migrates legacy `customPrompt` → `userTranslationPrompt` when the new field is empty.
-   **Scan Heuristics**: Improved DOM scanning to include short main-content strings, and skip navigation areas / interactive UI chrome by default.

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
