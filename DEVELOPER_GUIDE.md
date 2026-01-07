# Developer Guide

This document outlines the architecture, coding standards, and documentation maintenance protocols for the **Immersive Translate Clone** project.

## Project Structure

```text
/src
  ├── background.js      # Service Worker: Handles API Proxying & Tab events
  ├── content.js         # Content Script: Core logic (Scanning, Batching, Messaging)
  ├── content.css        # Styles for the injected translation nodes
  ├── options/           # Settings UI (Provider/Model, API Key, Language, Exclusions)
  ├── pdf-viewer/        # (Planned) Modified PDF.js viewer
  └── utils/
      ├── dom-utils.js   # Pure DOM manipulation helpers (Side-effect free where possible)
      ├── llm-client.js  # Bridge between Content Script and Background Service
      ├── prompt-templates.js  # Protocol prompt + user prompt combiner (UMD-style)
      ├── model-registry.js    # Provider/model registry + auto endpoint resolution (UMD-style)
      ├── lang-detect.js       # Simple source-language heuristic (UMD-style)
      └── translation-cache.js # LRU translation cache utility (UMD-style)

/tests                  # Jest unit tests (jsdom + chrome mocks)
jest.config.cjs         # Jest configuration
package.json            # Dev dependencies + test scripts
```

## Architecture Principles

1.  **Safety First**: Never hardcode API Keys. Always read from `chrome.storage.sync`.
2.  **Worker-Based Concurrency**: The `content.js` uses a "Producer-Consumer" model.
    -   *Producer*: `DOMUtils` scans the page and pushes tasks to `translationQueue`.
    -   *Consumer*: `translationWorker` pulls tasks (in batches of 5) and processes them.
    -   *Constraint*: Keep `MAX_CONCURRENT_WORKERS = 1` to ensure DOM stability and avoid Rate Limits.
3.  **The "Immersive Protocol"**:
    -   We do not simply ask the LLM to translate. We send a strict protocol.
    -   Separator: `\n%%\n`.
    -   The LLM **MUST** return exact paragraph correspondence separated by `%%`.
    -   The Frontend **MUST** parse this stream and distribute text to the correct nodes.
4.  **Shared Utils (No ESM)**:
    -   `src/utils/*.js` are written in a UMD-like style:
        -   Extension runtime: attach APIs to `globalThis`
        -   Jest/Node: export via `module.exports`
    -   Options page loads utils via `<script>` tags; background service worker loads via `importScripts(...)` (guarded in tests).

## Documentation Protocol (CRITICAL)

All developers must adhere to the following rules when updating code. **Code changes without documentation updates are considered incomplete.**

### 1. Updating `README.md`
-   **When**: You change the installation process, configuration options, or major user-facing features.
-   **How**: Ensure the "Configuration" section matches the actual fields in `src/options/options.html`.

### 2. Updating `TODO.md`
-   **When**: You start a specific task or complete a feature.
-   **How**:
    -   Change `[ ]` to `[x]` upon completion.
    -   Move items from "Planned" to "In Progress" when you start working on them.
    -   Add new ideas to "Backlog".

### 3. Updating `CHANGELOG.md`
-   **When**: Every time you make a commit that affects logic (Fixes, Features, Security).
-   **How**:
    -   Follow the [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format.
    -   Categories: `## [Unreleased]`, `### Added`, `### Changed`, `### Deprecated`, `### Removed`, `### Fixed`, `### Security`.

### 4. Updating `DEVELOPER_GUIDE.md` (This file)
-   **When**: You change the project structure, build tools, or architectural patterns (e.g., switching from Direct Fetch to Proxy).
-   **How**: Update the "Project Structure" tree and "Architecture Principles" to reflect reality.

## Development Workflow

1.  **Make Changes**: Edit the code in `/src`.
2.  **Verify**: Load the unpacked extension and test.
3.  **Document**: Update `CHANGELOG.md` immediately with what you changed.
4.  **Reflect**: If you finished a roadmap item, check it off in `TODO.md`.

## Testing

This repo uses **Jest + jsdom** for unit tests (no build pipeline).

```bash
npm install
npm test
```

## Security Checklist

Before checking in any code:
-   [ ] run `grep -r "sk-" .` (or your key prefix) to ensure no keys are leaked.
-   [ ] Verify `options.js` default values are empty or safe placeholders.
