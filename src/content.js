// Main Content Script Logic
console.log('Immersive Translate Clone loaded.');

// Global State
let isScanning = false;
let isTranslating = false;
let translationQueue = [];
let activeWorkers = 0;

// Configuration constants
// MAX_CONCURRENT_WORKERS = 1: Single worker ensures DOM stability and avoids API rate limits
// when using batched requests. Increase only if API supports high concurrency.
const MAX_CONCURRENT_WORKERS = 1;
// BATCH_SIZE = 5: Groups paragraphs for better translation context while keeping
// request size reasonable. Larger batches improve context but increase latency.
const BATCH_SIZE = 5;

// Worker function: continuously pulls from queue until empty
async function translationWorker(llmClient) {
    if (activeWorkers >= MAX_CONCURRENT_WORKERS) return;
    activeWorkers++;
    isTranslating = true;

    console.log('Worker started. Active:', activeWorkers);

    while (translationQueue.length > 0) {
        // Create a batch
        const batch = [];
        while (batch.length < BATCH_SIZE && translationQueue.length > 0) {
            batch.push(translationQueue.shift());
        }

        if (batch.length === 0) break;

        try {
            await translateBatch(batch, llmClient);
        } catch (err) {
            console.error('Batch translation failed:', err);
            // Mark failed items as error
            batch.forEach(ctx => {
                const node = DOMUtils.injectTranslationNode(ctx.element);
                DOMUtils.showError(node, err.message || 'Error');
            });
        }
    }

    activeWorkers--;
    console.log('Worker stopped. Active:', activeWorkers);

    // Mark translation as complete when all workers finish
    if (activeWorkers === 0) {
        isTranslating = false;
        console.log('All translations completed.');
    }
}

async function translateBatch(batch, llmClient) {
    // 1. Prepare UI nodes
    const nodes = batch.map(ctx => {
        if (DOMUtils.isSeparatelyTranslated(ctx.element)) return null;
        return DOMUtils.injectTranslationNode(ctx.element);
    });

    // 2. Prepare Text with %% separator
    // If batch size is 1, we don't need separator, but strictly following rule 5 in prompt is safer.
    // However, prompt says "Multi-paragraph input -> Use %%".
    const separator = '\n%%\n';
    const combinedText = batch.map(ctx => ctx.text.replace(/\n/g, ' ')).join(separator);

    // 3. Stream Handler State
    let buffer = '';
    let currentNodeIndex = 0;

    return new Promise((resolve) => {
        llmClient.translateStream(
            combinedText,
            (chunk) => {
                buffer += chunk;

                // We look for the separator pattern "%%"
                // It might be surrounded by newlines, but "%%" is the strong signal.

                while (true) {
                    const tagIndex = buffer.indexOf('%%');

                    if (tagIndex !== -1) {
                        // Found a separator

                        // Content before the separator belongs to the CURRENT node
                        const content = buffer.substring(0, tagIndex);

                        // Append to current node if exists
                        if (nodes[currentNodeIndex]) {
                            // Trim trailing newlines usually associated with the separator
                            DOMUtils.appendTranslation(nodes[currentNodeIndex], content.trimEnd());
                        }

                        // Advance to next node
                        currentNodeIndex++;

                        // Remove processed part + separator length (2 for %%) from buffer
                        // But wait, it might be \n%%\n.
                        // We should be resilient.
                        // Let's remove the %% and any immediate following newlines or spaces to start fresh for next node.

                        let nextStart = tagIndex + 2;
                        // Skip logic or simple slice? 
                        // Simple slice is safest, subsequent trim usually handles whitespace.

                        buffer = buffer.substring(nextStart);

                    } else {
                        // No separator found yet.
                        // BUT we must filter out partial "%%" before flushing to UI
                        // to avoid users seeing "%" momentarily.

                        const partialMatch = buffer.lastIndexOf('%');
                        if (partialMatch !== -1 && buffer.length - partialMatch < 2) {
                            // Possible start of %%, keep it in buffer
                            const safeContent = buffer.substring(0, partialMatch);
                            if (nodes[currentNodeIndex]) {
                                DOMUtils.appendTranslation(nodes[currentNodeIndex], safeContent);
                            }
                            buffer = buffer.substring(partialMatch);
                        } else {
                            // Safe to flush all
                            if (nodes[currentNodeIndex]) {
                                DOMUtils.appendTranslation(nodes[currentNodeIndex], buffer);
                            }
                            buffer = '';
                        }
                        break; // Wait for more data
                    }
                }
            },
            (error) => {
                batch.forEach((ctx, idx) => {
                    if (nodes[idx]) {
                        nodes[idx].textContent += ` [Error: ${error}]`;
                        nodes[idx].classList.add('immersive-translate-error');
                        DOMUtils.removeLoadingState(nodes[idx]);
                    }
                });
                resolve();
            },
            () => {
                // Final flush of whatever is left in buffer
                if (buffer.length > 0 && nodes[currentNodeIndex]) {
                    DOMUtils.appendTranslation(nodes[currentNodeIndex], buffer.trim());
                }

                nodes.forEach(node => {
                    if (node) DOMUtils.removeLoadingState(node);
                });
                resolve();
            }
        );
    });
}


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'start_translation') {
        runTranslationProcess();
    }
});

// Auto-start for testing
if (new URLSearchParams(window.location.search).get('autostart') === 'true') {
    setTimeout(runTranslationProcess, 1000);
}

async function runTranslationProcess() {
    // Prevent duplicate scans or interrupting ongoing translation
    if (isScanning) {
        console.log('Already scanning, skipping...');
        return;
    }
    if (isTranslating) {
        console.log('Translation in progress, please wait...');
        return;
    }
    isScanning = true;
    console.log('Scanning for translatable elements...');

    try {
        const config = await chrome.storage.sync.get({
            apiUrl: 'https://ark.cn-beijing.volces.com/api/v3',
            apiKey: '',
            modelName: 'deepseek-v3-2-251201',
            customPrompt: '',
            targetLanguage: 'zh-CN',
            userTranslationPrompt: '',
            excludedDomains: [],
            excludedSelectors: []
        });

        const llmClient = new LLMClient(config);

        // Domain exclusion (Issue 14)
        if (isExcludedDomain(window.location.hostname, config.excludedDomains)) {
            console.log('Translation skipped: excluded domain.');
            return;
        }

        const newNodes = DOMUtils.getTranslatableElements({ excludedSelectors: config.excludedSelectors });
        console.log(`Found ${newNodes.length} new elements.`);

        translationQueue.push(...newNodes);

        while (activeWorkers < MAX_CONCURRENT_WORKERS && translationQueue.length > 0) {
            translationWorker(llmClient);
        }

    } catch (e) {
        console.error('Error starting translation:', e);
    } finally {
        isScanning = false;
    }
}

function isExcludedDomain(hostname, patterns) {
    if (!patterns || !Array.isArray(patterns)) return false;
    return patterns.some((pattern) => {
        if (pattern.startsWith('*.')) {
            return hostname.endsWith(pattern.slice(1));
        }
        return hostname === pattern || hostname.endsWith('.' + pattern);
    });
}

// Node.js test support (no effect in extension runtime)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        translateBatch,
        translationWorker,
        runTranslationProcess,
    };
}
