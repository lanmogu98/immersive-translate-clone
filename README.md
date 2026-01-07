# Immersive Translate Clone (Experimental)

A lightweight Chrome Extension that provides "Immersive Translate" style bilingual translation for web pages. It uses your own AI API Key (DeepSeek, OpenAI, etc.) to perform context-aware, high-quality translations.

## Features

- **In-Place Translation**: Displays translated text as a bilingual contrast directly below the original paragraph.
- **Smart Batching**: Groups paragraphs to preserve context and reduce API requests.
- **Stream Rendering**: Real-time typing effect for immediate feedback.
- **Style Inheritance**: Automatically matches the font size, weight, and alignment of the source text.
- **Privacy Focused**: No data is sent to our servers. Your API Key is stored locally in your browser.

## Installation

> **Note**: This is an experimental extension and is not yet available on the Chrome Web Store. You must install it in "Developer Mode".

1.  Clone or download this repository to your local machine.
2.  Open Chrome and navigate to `chrome://extensions`.
3.  Enable **Developer mode** (toggle in the top right corner).
4.  Click **Load unpacked**.
5.  Select the directory where you cloned this project (the folder containing `manifest.json`).

## Configuration (Important!)

Before using the extension, you must configure your API credentials.

1.  Click the extension icon in the toolbar.
2.  Click **Options** (or right-click the icon > Options).
3.  **Provider & Model**:
    *   **Provider**: Select a provider (e.g., Volcengine Ark / DeepSeek / OpenAI / Custom).
    *   **Model**: Select a preset model for that provider.
    *   **API Key**: Enter your secret API Key.
4.  **Translation**:
    *   **Target Language**: Choose the output language (default: Simplified Chinese).
    *   **Style Prompt** (Optional): Customize translation style/tone. Protocol rules are internal and not user-editable.
5.  **Exclusions** (Optional):
    *   **Excluded Domains**: One domain pattern per line (supports `*.example.com`).
    *   **Excluded Selectors**: One CSS selector per line (matching elements/ancestors will be skipped).
6.  **Advanced**:
    *   **API Base URL / Model ID**: Auto-filled by Provider; editable when Provider is **Custom**.
7.  Click **Save Settings**.

## Usage

1.  Navigate to any English article or webpage.
2.  **Right-click** on the page (or click the extension icon popup).
3.  Select **"Translate Page"**.
4.  The extension will scan the page and begin translating paragraphs one by one.

## Troubleshooting

-   **Nothing happens?** Check if you have saved your API Key in Options.
-   **Partial translation?** The API might be rate-limiting you. The extension processes 5 paragraphs at a time to be polite.
-   **Security**: Your API Key is stored in `chrome.storage.sync`. It is never hardcoded in the source code.

## Development

Run unit tests:

```bash
npm install
npm test
```
