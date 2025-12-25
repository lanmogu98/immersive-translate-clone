// Saves options to chrome.storage
const saveOptions = () => {
    const apiUrl = document.getElementById('apiUrl').value;
    const apiKey = document.getElementById('apiKey').value;
    const modelName = document.getElementById('modelName').value;
    const customPrompt = document.getElementById('customPrompt').value;

    chrome.storage.sync.set(
        { apiUrl, apiKey, modelName, customPrompt },
        () => {
            // Update status to let user know options were saved.
            const status = document.getElementById('status');
            status.textContent = 'Options saved.';
            setTimeout(() => {
                status.textContent = '';
            }, 750);
        }
    );
};

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
const restoreOptions = () => {
    chrome.storage.sync.get(
        {
            apiUrl: 'https://ark.cn-beijing.volces.com/api/v3', // Guessed based on 'VOLC'
            apiKey: '', // Removed hardcoded key
            modelName: 'deepseek-v3-2-251201', // Common updated model name, or user can change
            customPrompt: `You are a professional Simplified Chinese native translator who needs to fluently translate text into Simplified Chinese.

## Translation Rules
1. Output only the translated content, without explanations or additional content (such as "Here's the translation:" or "Translation as follows:")
2. The returned translation must maintain exactly the same number of paragraphs and format as the original text
3. If the text contains HTML tags, consider where the tags should be placed in the translation while maintaining fluency
4. For content that should not be translated (such as proper nouns, code, etc.), keep the original text.
5. If input contains %%, use %% in your output, if input has no %%, don't use %% in your output

## OUTPUT FORMAT:
- **Single paragraph input** → Output translation directly (no separators, no extra text)
- **Multi-paragraph input** → Use %% as paragraph separator between translations`
        },
        (items) => {
            document.getElementById('apiUrl').value = items.apiUrl;
            document.getElementById('apiKey').value = items.apiKey;
            document.getElementById('modelName').value = items.modelName;
            document.getElementById('customPrompt').value = items.customPrompt;
        }
    );
};

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);
