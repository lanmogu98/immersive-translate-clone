class LLMClient {
    constructor(config) {
        this.config = config; // Store full config to send to background
    }

    translateStream(text, onChunk, onError, onDone) {
        // Open a port to the background script
        const port = chrome.runtime.connect({ name: 'llm_stream' });

        // Prevent onDone from being called multiple times
        let isCompleted = false;
        const complete = () => {
            if (!isCompleted) {
                isCompleted = true;
                if (onDone) onDone();
            }
        };

        // Send the translation request
        // We send the config (API Key etc) with every request to avoid state sync issues in background
        port.postMessage({
            action: 'translate',
            text: text,
            config: this.config
        });

        // Listen for responses
        port.onMessage.addListener((msg) => {
            if (msg.error) {
                onError(msg.error);
                port.disconnect();
                complete();
            } else if (msg.chunk) {
                onChunk(msg.chunk);
            } else if (msg.done) {
                port.disconnect();
                complete();
            }
        });

        // Handle abrupt disconnection (e.g. background crash)
        port.onDisconnect.addListener(() => {
            if (chrome.runtime.lastError) {
                console.warn('Port disconnected:', chrome.runtime.lastError.message);
                onError(chrome.runtime.lastError.message);
            }
            complete(); // Always complete on disconnect to ensure cleanup
        });
    }
}

// Node.js test support (no effect in extension runtime)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LLMClient };
}
