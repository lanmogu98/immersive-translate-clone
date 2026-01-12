// =============================
// Options / Settings Page Logic
// =============================

// Validates URL format
const isValidUrl = (string) => {
    try {
        const url = new URL(string);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (e) {
        return false;
    }
};

const parseMultilineList = (value) => {
    if (!value || typeof value !== 'string') return [];
    return value
        .split('\n')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
};

const joinMultilineList = (arr) => {
    if (!arr) return '';
    if (Array.isArray(arr)) return arr.join('\n');
    if (typeof arr === 'string') return arr;
    return '';
};

// Shows status message
const showStatus = (message, isError = false) => {
    const status = document.getElementById('status');
    if (!status) return;
    status.textContent = message;
    status.style.color = isError ? '#e74c3c' : '#12c2b6';
    if (!isError) {
        setTimeout(() => {
            status.textContent = '';
        }, 2000);
    }
};

// Default configuration values (single source of truth for defaults)
const DEFAULT_CONFIG = {
    // UI state fields
    providerId: 'deepseek-volcengine',
    modelId: 'deepseek-v3-2-251201',
    targetLanguage: 'zh-CN',
    userTranslationPrompt: '',
    excludedDomains: [],
    excludedSelectors: [],

    // Per-provider API keys storage (Bug 3 fix)
    providerApiKeys: {},

    // Compatibility fields used by content/background today
    apiUrl: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
    apiKey: '',
    modelName: 'deepseek-v3-2-251201',

    // Batch size for translation (Issue 31a)
    batchSize: 10,

    // Legacy field (kept for migration only)
    customPrompt: ''
};

const getEl = (id) => document.getElementById(id);

const setReadOnly = (el, isReadOnly) => {
    if (!el) return;
    el.readOnly = !!isReadOnly;
};

// Current provider API keys cache (loaded from storage)
let providerApiKeys = {};

const populateProviderSelect = (selectedProviderId) => {
    const providerSelect = getEl('providerId');
    if (!providerSelect) return;

    providerSelect.innerHTML = '';

    const providers = (globalThis.ModelRegistry && typeof globalThis.ModelRegistry.getProviders === 'function')
        ? globalThis.ModelRegistry.getProviders()
        : ['deepseek-volcengine', 'gemini', 'openai-openrouter', 'custom'];

    for (const providerId of providers) {
        const option = document.createElement('option');
        option.value = providerId;
        option.textContent = (globalThis.ModelRegistry && typeof globalThis.ModelRegistry.getProviderName === 'function')
            ? globalThis.ModelRegistry.getProviderName(providerId)
            : providerId;
        providerSelect.appendChild(option);
    }

    // Ensure we use default if selectedProviderId is falsy (Bug 2 fix)
    const valueToSet = selectedProviderId || DEFAULT_CONFIG.providerId;
    
    // Check if the value exists in the select options
    const optionExists = Array.from(providerSelect.options).some(opt => opt.value === valueToSet);
    providerSelect.value = optionExists ? valueToSet : (providerSelect.options[0]?.value || '');
};

const populateModelSelect = (providerId, selectedModelId) => {
    const modelSelect = getEl('modelId');
    if (!modelSelect) return;

    modelSelect.innerHTML = '';

    const effectiveProviderId = providerId || DEFAULT_CONFIG.providerId;
    
    const models = (globalThis.ModelRegistry && typeof globalThis.ModelRegistry.getModelsForProvider === 'function')
        ? globalThis.ModelRegistry.getModelsForProvider(effectiveProviderId)
        : [];

    if (effectiveProviderId === 'custom') {
        modelSelect.disabled = true;
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'Custom (set Model ID below)';
        modelSelect.appendChild(option);
        modelSelect.value = '';
        return;
    }

    modelSelect.disabled = false;

    for (const model of models) {
        const option = document.createElement('option');
        option.value = model.id;
        option.textContent = model.name || model.id;
        modelSelect.appendChild(option);
    }

    const defaultModel = (globalThis.ModelRegistry && typeof globalThis.ModelRegistry.getDefaultModel === 'function')
        ? globalThis.ModelRegistry.getDefaultModel(effectiveProviderId)
        : (models[0] ? models[0].id : '');

    // Ensure we use a valid model ID (Bug 2 fix)
    const valueToSet = selectedModelId || defaultModel || '';
    const optionExists = Array.from(modelSelect.options).some(opt => opt.value === valueToSet);
    modelSelect.value = optionExists ? valueToSet : (modelSelect.options[0]?.value || '');
};

const populateTargetLanguageSelect = (selectedLang) => {
    const langSelect = getEl('targetLanguage');
    if (!langSelect) return;
    langSelect.innerHTML = '';

    const langs = (globalThis.PromptTemplates && Array.isArray(globalThis.PromptTemplates.TARGET_LANGUAGES))
        ? globalThis.PromptTemplates.TARGET_LANGUAGES
        : [{ code: 'zh-CN', name: '简体中文' }];

    for (const lang of langs) {
        const option = document.createElement('option');
        option.value = lang.code;
        option.textContent = lang.name;
        langSelect.appendChild(option);
    }

    // Ensure we use default if selectedLang is falsy (Bug 1 fix)
    const valueToSet = selectedLang || DEFAULT_CONFIG.targetLanguage;
    langSelect.value = valueToSet;
};

const deriveApiFieldsFromSelection = () => {
    const providerId = getEl('providerId')?.value || DEFAULT_CONFIG.providerId;
    const modelId = getEl('modelId')?.value || DEFAULT_CONFIG.modelId;

    const apiUrlEl = getEl('apiUrl');
    const modelNameEl = getEl('modelName');

    if (providerId === 'custom') {
        setReadOnly(apiUrlEl, false);
        setReadOnly(modelNameEl, false);
        return;
    }

    const resolved = (globalThis.ModelRegistry && typeof globalThis.ModelRegistry.resolveConfig === 'function')
        ? globalThis.ModelRegistry.resolveConfig(providerId, modelId, '', '', '')
        : null;

    if (resolved) {
        if (apiUrlEl) apiUrlEl.value = resolved.apiUrl;
        if (modelNameEl) modelNameEl.value = resolved.modelName;
    }

    setReadOnly(apiUrlEl, true);
    setReadOnly(modelNameEl, true);
};

// Load API key for current provider from cache (Bug 3 fix)
const loadApiKeyForProvider = (providerId) => {
    const apiKeyEl = getEl('apiKey');
    if (!apiKeyEl) return;
    
    const key = providerApiKeys[providerId] || '';
    apiKeyEl.value = key;
};

// Save current API key to provider cache (Bug 3 fix)
const saveApiKeyForProvider = (providerId, apiKey) => {
    if (apiKey && apiKey.trim()) {
        providerApiKeys[providerId] = apiKey.trim();
    }
};

// Toggle API key visibility (Bug 4 fix)
const toggleApiKeyVisibility = () => {
    const apiKeyEl = getEl('apiKey');
    const toggleBtn = getEl('toggleApiKey');
    if (!apiKeyEl || !toggleBtn) return;
    
    if (apiKeyEl.type === 'password') {
        apiKeyEl.type = 'text';
        toggleBtn.textContent = '🙈';
        toggleBtn.title = 'Hide API Key';
    } else {
        apiKeyEl.type = 'password';
        toggleBtn.textContent = '👁️';
        toggleBtn.title = 'Show API Key';
    }
};

// Restores options from chrome.storage
const restoreOptions = () => {
    chrome.storage.sync.get(DEFAULT_CONFIG, (items) => {
        // Load per-provider API keys (Bug 3 fix)
        providerApiKeys = items.providerApiKeys || {};
        
        // Migration: if old single apiKey exists but providerApiKeys is empty
        if (items.apiKey && Object.keys(providerApiKeys).length === 0) {
            const oldProvider = items.providerId || DEFAULT_CONFIG.providerId;
            providerApiKeys[oldProvider] = items.apiKey;
        }

        // Migration: legacy customPrompt -> userTranslationPrompt (only when new field is empty)
        let migratedUserPrompt = items.userTranslationPrompt || '';
        if (!migratedUserPrompt && items.customPrompt && globalThis.PromptTemplates && typeof globalThis.PromptTemplates.migrateCustomPrompt === 'function') {
            const migrated = globalThis.PromptTemplates.migrateCustomPrompt({
                customPrompt: items.customPrompt,
                userTranslationPrompt: items.userTranslationPrompt,
            });
            if (migrated && migrated.userTranslationPrompt) {
                migratedUserPrompt = migrated.userTranslationPrompt;
                chrome.storage.sync.set({ userTranslationPrompt: migratedUserPrompt }, () => {});
            }
        }

        // Provider/model (Bug 2 fix: ensure defaults are used)
        const effectiveProviderId = items.providerId || DEFAULT_CONFIG.providerId;
        const effectiveModelId = items.modelId || items.modelName || DEFAULT_CONFIG.modelId;
        
        populateProviderSelect(effectiveProviderId);
        populateModelSelect(effectiveProviderId, effectiveModelId);

        // API Key for current provider (Bug 3 fix)
        loadApiKeyForProvider(effectiveProviderId);

        // Language + prompt (Bug 1 fix: ensure defaults are used)
        const effectiveTargetLang = items.targetLanguage || DEFAULT_CONFIG.targetLanguage;
        populateTargetLanguageSelect(effectiveTargetLang);
        getEl('userTranslationPrompt').value = migratedUserPrompt;

        // Exclusions
        getEl('excludedDomains').value = joinMultilineList(items.excludedDomains);
        getEl('excludedSelectors').value = joinMultilineList(items.excludedSelectors);

        // Compatibility fields
        getEl('apiUrl').value = items.apiUrl || DEFAULT_CONFIG.apiUrl;
        getEl('modelName').value = items.modelName || DEFAULT_CONFIG.modelName;

        // Batch size (Issue 31a)
        const batchSizeEl = getEl('batchSize');
        if (batchSizeEl) {
            batchSizeEl.value = items.batchSize ?? DEFAULT_CONFIG.batchSize;
        }

        // Set readonly state and derived values
        deriveApiFieldsFromSelection();
    });
};

// Saves options to chrome.storage
const saveOptions = () => {
    const providerId = getEl('providerId')?.value || DEFAULT_CONFIG.providerId;
    const modelId = getEl('modelId')?.value || '';
    const apiKey = getEl('apiKey')?.value?.trim() || '';
    const targetLanguage = getEl('targetLanguage')?.value || DEFAULT_CONFIG.targetLanguage;
    const userTranslationPrompt = getEl('userTranslationPrompt')?.value?.trim() || '';
    const excludedDomains = parseMultilineList(getEl('excludedDomains')?.value || '');
    const excludedSelectors = parseMultilineList(getEl('excludedSelectors')?.value || '');
    const batchSize = parseInt(getEl('batchSize')?.value, 10) || DEFAULT_CONFIG.batchSize;

    // Save current API key to provider cache (Bug 3 fix)
    if (apiKey) {
        saveApiKeyForProvider(providerId, apiKey);
    }

    // Always keep compatibility fields up-to-date
    deriveApiFieldsFromSelection();
    const apiUrl = getEl('apiUrl')?.value?.trim() || DEFAULT_CONFIG.apiUrl;
    const modelName = getEl('modelName')?.value?.trim() || '';

    // Validate API URL (especially important for custom provider)
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
        showStatus('Model ID is required.', true);
        return;
    }

    chrome.storage.sync.set(
        {
            providerId,
            modelId,
            apiUrl,
            apiKey,
            modelName,
            targetLanguage,
            userTranslationPrompt,
            excludedDomains,
            excludedSelectors,
            providerApiKeys, // Save per-provider keys (Bug 3 fix)
            batchSize, // Issue 31a
        },
        () => {
            if (chrome.runtime.lastError) {
                showStatus('Error saving: ' + chrome.runtime.lastError.message, true);
            } else {
                showStatus('Options saved.');
            }
        }
    );
};

// Initialize when DOM is ready (Bug 5 fix: ensure all event listeners are inside DOMContentLoaded)
document.addEventListener('DOMContentLoaded', () => {
    restoreOptions();

    // Provider change: update models and load API key for that provider
    const providerSelect = getEl('providerId');
    if (providerSelect) {
        providerSelect.addEventListener('change', () => {
            // Save current API key before switching
            const currentKey = getEl('apiKey')?.value?.trim();
            const previousProvider = providerSelect.dataset.previousValue;
            if (previousProvider && currentKey) {
                saveApiKeyForProvider(previousProvider, currentKey);
            }
            
            const newProviderId = providerSelect.value;
            providerSelect.dataset.previousValue = newProviderId;
            
            populateModelSelect(newProviderId, null);
            deriveApiFieldsFromSelection();
            loadApiKeyForProvider(newProviderId); // Load API key for new provider (Bug 3 fix)

            // If user picked Custom, open Advanced for convenience
            const advanced = getEl('advancedSection');
            if (advanced && newProviderId === 'custom') advanced.open = true;
        });
        
        // Store initial provider value
        providerSelect.dataset.previousValue = providerSelect.value;
    }

    const modelSelect = getEl('modelId');
    if (modelSelect) {
        modelSelect.addEventListener('change', deriveApiFieldsFromSelection);
    }

    // Save button (Bug 5 fix: event listener inside DOMContentLoaded)
    const saveBtn = getEl('save');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveOptions);
    }

    // Toggle API key visibility (Bug 4 fix)
    const toggleBtn = getEl('toggleApiKey');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', toggleApiKeyVisibility);
    }
});

// Node.js test support (no effect in extension runtime)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        DEFAULT_CONFIG,
        saveOptions,
        restoreOptions,
        isValidUrl,
        parseMultilineList,
        joinMultilineList,
    };
}
