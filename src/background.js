chrome.runtime.onInstalled.addListener(() => {
    console.log('Immersive Translate Clone installed.');
});

// PDF Redirect Logic
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'loading' && tab.url && tab.url.toLowerCase().endsWith('.pdf')) {
        if (tab.url.startsWith(chrome.runtime.getURL('src/pdf-viewer/pdf_viewer.html'))) {
            return;
        }
        const viewerUrl = chrome.runtime.getURL('src/pdf-viewer/pdf_viewer.html') + '?file=' + encodeURIComponent(tab.url);
        chrome.tabs.update(tabId, { url: viewerUrl });
    }
});

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

async function streamTranslation(text, config, port) {
    const { apiUrl, apiKey, modelName, customPrompt } = config;
    const defaultPrompt = `You are a professional Simplified Chinese native translator who needs to fluently translate text into Simplified Chinese.

## Translation Rules
1. Output only the translated content, without explanations or additional content (such as "Here's the translation:" or "Translation as follows:")
2. The returned translation must maintain exactly the same number of paragraphs and format as the original text
3. If the text contains HTML tags, consider where the tags should be placed in the translation while maintaining fluency
4. For content that should not be translated (such as proper nouns, code, etc.), keep the original text.
5. If input contains %%, use %% in your output, if input has no %%, don't use %% in your output

## OUTPUT FORMAT:
- **Single paragraph input** → Output translation directly (no separators, no extra text)
- **Multi-paragraph input** → Use %% as paragraph separator between translations`;

    const systemPrompt = customPrompt || defaultPrompt;

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

    try {
        const response = await fetch(`${apiUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: modelName,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: text }
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
        port.postMessage({ done: true });

    } catch (err) {
        if (err.name === 'AbortError') {
            console.log('Request aborted by user/disconnect.');
        } else {
            port.postMessage({ error: `Network Error: ${err.message}` });
        }
    }
}
