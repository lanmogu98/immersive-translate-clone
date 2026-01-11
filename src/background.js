chrome.runtime.onInstalled.addListener(() => {
    console.log('Immersive Translate Clone installed.');
});

// Load shared utils (no ESM; safe-guarded for Jest/Node)
// In Manifest V3 service workers, importScripts paths are relative to extension root
try {
    if (typeof importScripts === 'function') {
        // Try both possible paths (relative to root vs relative to service worker)
        try {
            importScripts('src/utils/prompt-templates.js');
        } catch (e1) {
            importScripts('./utils/prompt-templates.js');
        }
        console.log('PromptTemplates loaded:', typeof globalThis.PromptTemplates !== 'undefined');
    }
} catch (e) {
    console.warn('Failed to load prompt-templates.js:', e);
    // ignore (tests / non-extension runtime)
}

// PDF Redirect Logic - DISABLED (Issue 32: incomplete feature breaks browser PDF viewing)
// The PDF viewer is a placeholder and does not actually render PDFs.
// Re-enable when PDF.js integration is complete.
//
// chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
//     if (changeInfo.status === 'loading' && tab.url && tab.url.toLowerCase().endsWith('.pdf')) {
//         if (tab.url.startsWith(chrome.runtime.getURL('src/pdf-viewer/pdf_viewer.html'))) {
//             return;
//         }
//         const viewerUrl = chrome.runtime.getURL('src/pdf-viewer/pdf_viewer.html') + '?file=' + encodeURIComponent(tab.url);
//         chrome.tabs.update(tabId, { url: viewerUrl });
//     }
// });

// ==========================================
// API Proxy Logic (Fix for CORS/CSP issues)
// ==========================================

chrome.runtime.onConnect.addListener((port) => {
    if (port.name === 'llm_stream') {
        port.onMessage.addListener(async (msg) => {
            if (msg.action === 'translate') {
                const { text, config } = msg; // config contains apiKey, apiUrl, modelName, systemPrompt
                await streamTranslation(text, config, port);
            }
        });
    }
});

// API request timeout in milliseconds (60 seconds)
const API_TIMEOUT_MS = 60000;

// Minimal fallback prompt if user hasn't configured one
const FALLBACK_PROMPT = 'Translate the following text into Simplified Chinese. Maintain the original format. Use %% as paragraph separator for multi-paragraph input.';

async function streamTranslation(text, config, port) {
    const {
        apiUrl,
        apiKey,
        modelName,
        customPrompt, // legacy
        userTranslationPrompt,
        targetLanguage,
    } = config;

    // Prefer building prompt from separated fields (Issue 17 + 11)
    let systemPrompt = '';
    if (globalThis.PromptTemplates && typeof globalThis.PromptTemplates.buildSystemPrompt === 'function') {
        systemPrompt = globalThis.PromptTemplates.buildSystemPrompt({
            userPrompt: userTranslationPrompt || '',
            targetLanguage: targetLanguage || 'zh-CN',
        });
    } else {
        // Fallback for older runtime / tests: use customPrompt if present
        systemPrompt = customPrompt || '';
    }

    if (!systemPrompt) {
        systemPrompt = FALLBACK_PROMPT;
    }

    if (!apiKey) {
        port.postMessage({ error: 'API Key is missing.' });
        return;
    }

    const controller = new AbortController();
    const signal = controller.signal;

    // Abort fetch if the frontend disconnects (e.g. tab closed)
    port.onDisconnect.addListener(() => {
        controller.abort();
    });

    // Set timeout for API request
    const timeoutId = setTimeout(() => {
        controller.abort();
    }, API_TIMEOUT_MS);

    try {
        // Use apiUrl as-is if it already contains endpoint path, otherwise append
        const endpoint = apiUrl.endsWith('/chat/completions') ? apiUrl : `${apiUrl}/chat/completions`;

        // Issue 25: Wrap untrusted web page content in boundary markers
        // This pairs with SECURITY RULES in PROTOCOL_PROMPT to prevent prompt injection
        const wrappedText = `<translate_input>\n${text}\n</translate_input>`;

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: modelName,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: wrappedText }
                ],
                stream: true
            }),
            signal: signal
        });

        if (!response.ok) {
            const errText = await response.text();
            port.postMessage({ error: `API Error: ${response.status} - ${errText}` });
            return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;

            const lines = buffer.split('\n');
            // Keep the last segment in the buffer as it might be incomplete
            buffer = lines.pop();

            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed === '' || trimmed === 'data: [DONE]') continue;

                if (trimmed.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(trimmed.slice(6));
                        if (data.choices && data.choices[0].delta && data.choices[0].delta.content) {
                            port.postMessage({ chunk: data.choices[0].delta.content });
                        }
                    } catch (e) {
                        console.error('JSON Parse Error:', e);
                    }
                }
            }
        }

        // Done
        clearTimeout(timeoutId);
        port.postMessage({ done: true });

    } catch (err) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
            // Check if it was a timeout or user disconnect
            console.log('Request aborted (timeout or disconnect).');
            // Only send error if port is still connected (timeout case)
            try {
                port.postMessage({ error: 'Request timed out. Please try again.' });
            } catch (e) {
                // Port already disconnected, ignore
            }
        } else {
            port.postMessage({ error: `Network Error: ${err.message}` });
        }
    }
}

// Node.js test support (no effect in extension runtime)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        streamTranslation,
        API_TIMEOUT_MS,
        FALLBACK_PROMPT
    };
}
