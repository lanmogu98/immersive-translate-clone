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

/**
 * Issue 42: Sanitize error messages to prevent information leakage
 * @param {number} statusCode - HTTP status code
 * @param {string} rawError - Raw error message from API
 * @returns {string} Sanitized user-friendly error message
 */
function sanitizeApiError(statusCode, rawError) {
    // Map common HTTP status codes to user-friendly messages
    const statusMessages = {
        400: 'Bad request. Please check your settings.',
        401: 'Authentication failed. Please check your API key.',
        403: 'Access denied. Please verify your API key permissions.',
        404: 'API endpoint not found. Please check your API URL.',
        429: 'Rate limit exceeded. Please try again later.',
        500: 'Server error. Please try again later.',
        502: 'Server temporarily unavailable. Please try again.',
        503: 'Service unavailable. Please try again later.',
    };

    // Use mapped message if available
    if (statusMessages[statusCode]) {
        // Log full error for debugging (only visible in extension console)
        console.error(`API Error ${statusCode}:`, rawError);
        return statusMessages[statusCode];
    }

    // For other errors, provide generic message
    console.error(`API Error ${statusCode}:`, rawError);
    return `API request failed (${statusCode}). Please try again.`;
}

/**
 * Issue 42: Sanitize network error messages
 * @param {string} errorMessage - Raw error message
 * @returns {string} Sanitized error message
 */
function sanitizeNetworkError(errorMessage) {
    // Log full error for debugging
    console.error('Network Error:', errorMessage);

    // Check for common network issues and provide friendly messages
    if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        return 'Network connection failed. Please check your internet connection.';
    }
    if (errorMessage.includes('CORS') || errorMessage.includes('cross-origin')) {
        return 'Connection blocked. The API may not support direct browser requests.';
    }
    if (errorMessage.includes('SSL') || errorMessage.includes('certificate')) {
        return 'Secure connection failed. Please check the API URL.';
    }

    // Generic fallback
    return 'Network error occurred. Please try again.';
}

async function streamTranslation(text, config, port) {
    const {
        apiUrl,
        apiKey,
        modelName,
        customPrompt, // legacy
        userTranslationPrompt,
        targetLanguage,
        temperature,
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

        const requestBody = {
            model: modelName,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: wrappedText }
            ],
            stream: true
        };
        if (typeof temperature === 'number' && !Number.isNaN(temperature)) {
            requestBody.temperature = temperature;
        }

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(requestBody),
            signal: signal
        });

        if (!response.ok) {
            const errText = await response.text();
            // Issue 42: Sanitize error message to prevent information leakage
            port.postMessage({ error: sanitizeApiError(response.status, errText) });
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
            // Issue 42: Sanitize network error message
            port.postMessage({ error: sanitizeNetworkError(err.message) });
        }
    }
}

// Node.js test support (no effect in extension runtime)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        streamTranslation,
        API_TIMEOUT_MS,
        FALLBACK_PROMPT,
        sanitizeApiError,
        sanitizeNetworkError,
    };
}
