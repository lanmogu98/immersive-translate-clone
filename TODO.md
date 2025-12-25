# Project Roadmap & Status

## ✅ Completed

-   **Core Architecture**
    -   [x] Manifest V3 Extension structure.
    -   [x] Background Service Worker for API Proxying (CORS handling).
    -   [x] Options Page for secure API Key management.

-   **Web Translation Engine**
    -   [x] DOM Scanner: Intelligently identifies translatable content (P, H1-H6, LI, etc.).
    -   [x] Injection Strategy: `appendChild` based `<span>` injection (preserves Layout/Flexbox).
    -   [x] Style Inheritance: Matches font-family, size, weight, and text-alignment.
    -   [x] Double-Translation Prevention: Robust checks to avoid duplicating translations.

-   **AI Integration Protocol**
    -   [x] **Smart Batching**: Groups 5 paragraphs per request for context awareness.
    -   [x] **Immersive Protocol**: Uses `\n%%\n` delimiters for reliable stream parsing.
    -   [x] **Flow Control**: Producer-Consumer worker queue (Wait-free UI).
    -   [x] **Robustness**: `AbortController` support to cancel requests when tabs close.

## 🚧 In Progress

-   **PDF Translation**
    -   [ ] Integrate `pdf.js` library.
    -   [ ] Intercept `.pdf` requests or provide "Open with..." context menu.
    -   [ ] Inject translation layer over PDF text layer.

## 📝 Planned / Backlog

-   **Hover Mode**: Show translation only when hovering over a paragraph.
-   **Export**: Export bilingual Markdown/HTML.
-   **Mobile Support**: Adapt for mobile browsers (where extensions are supported).
