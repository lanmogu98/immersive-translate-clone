// Validates URL format
const isValidUrl = (string) => {
    try {
        const url = new URL(string);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (e) {
        return false;
    }
};

// Shows status message
const showStatus = (message, isError = false) => {
    const status = document.getElementById('status');
    status.textContent = message;
    status.style.color = isError ? '#e74c3c' : '#27ae60';
    if (!isError) {
        setTimeout(() => {
            status.textContent = '';
        }, 2000);
    }
};

// Saves options to chrome.storage
const saveOptions = () => {
    const apiUrl = document.getElementById('apiUrl').value.trim();
    const apiKey = document.getElementById('apiKey').value.trim();
    const modelName = document.getElementById('modelName').value.trim();
    const customPrompt = document.getElementById('customPrompt').value.trim();

    // Validate API URL
    if (!isValidUrl(apiUrl)) {
        showStatus('Invalid API URL. Must start with http:// or https://', true);
        return;
    }

    // Validate required fields
    if (!apiKey) {
        showStatus('API Key is required.', true);
        return;
    }

    if (!modelName) {
        showStatus('Model Name is required.', true);
        return;
    }

    chrome.storage.sync.set(
        { apiUrl, apiKey, modelName, customPrompt },
        () => {
            showStatus('Options saved.');
        }
    );
};

// Default system prompt - single source of truth
const DEFAULT_PROMPT = `You are a professional Simplified Chinese native translator who needs to fluently translate text into Simplified Chinese.

## Translation Rules
1. Output only the translated content, without explanations or additional content (such as "Here's the translation:" or "Translation as follows:")
2. The returned translation must maintain exactly the same number of paragraphs and format as the original text
3. If the text contains HTML tags, consider where the tags should be placed in the translation while maintaining fluency
4. For content that should not be translated (such as proper nouns, code, etc.), keep the original text.
5. If input contains %%, use %% in your output, if input has no %%, don't use %% in your output

## OUTPUT FORMAT:
- **Single paragraph input** → Output translation directly (no separators, no extra text)
- **Multi-paragraph input** → Use %% as paragraph separator between translations`;

// Default configuration values
const DEFAULT_CONFIG = {
    apiUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    apiKey: '',
    modelName: 'deepseek-v3-2-251201',
    customPrompt: DEFAULT_PROMPT
};

// Restores options from chrome.storage
const restoreOptions = () => {
    chrome.storage.sync.get(DEFAULT_CONFIG, (items) => {
        document.getElementById('apiUrl').value = items.apiUrl;
        document.getElementById('apiKey').value = items.apiKey;
        document.getElementById('modelName').value = items.modelName;
        document.getElementById('customPrompt').value = items.customPrompt;
    });
};

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);
