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
    // New fields for UI state
    providerId: 'volcengine',
    modelId: 'deepseek-v3-2-251201',
    targetLanguage: 'zh-CN',
    userTranslationPrompt: '',
    excludedDomains: [],
    excludedSelectors: [],

    // Compatibility fields used by content/background today
    apiUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    apiKey: '',
    modelName: 'deepseek-v3-2-251201',

    // Legacy field (kept for migration only)
    customPrompt: ''
};

const getEl = (id) => document.getElementById(id);

const setReadOnly = (el, isReadOnly) => {
    if (!el) return;
    el.readOnly = !!isReadOnly;
};

const populateProviderSelect = (selectedProviderId) => {
    const providerSelect = getEl('providerId');
    if (!providerSelect) return;

    providerSelect.innerHTML = '';

    const providers = (globalThis.ModelRegistry && typeof globalThis.ModelRegistry.getProviders === 'function')
        ? globalThis.ModelRegistry.getProviders()
        : ['volcengine', 'deepseek', 'openai', 'custom'];

    for (const providerId of providers) {
        const option = document.createElement('option');
        option.value = providerId;
        option.textContent = (globalThis.ModelRegistry && typeof globalThis.ModelRegistry.getProviderName === 'function')
            ? globalThis.ModelRegistry.getProviderName(providerId)
            : providerId;
        providerSelect.appendChild(option);
    }

    providerSelect.value = selectedProviderId || DEFAULT_CONFIG.providerId;
};

const populateModelSelect = (providerId, selectedModelId) => {
    const modelSelect = getEl('modelId');
    if (!modelSelect) return;

    modelSelect.innerHTML = '';

    const models = (globalThis.ModelRegistry && typeof globalThis.ModelRegistry.getModelsForProvider === 'function')
        ? globalThis.ModelRegistry.getModelsForProvider(providerId)
        : [];

    if (providerId === 'custom') {
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
        ? globalThis.ModelRegistry.getDefaultModel(providerId)
        : (models[0] ? models[0].id : '');

    modelSelect.value = selectedModelId || defaultModel || '';
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

    langSelect.value = selectedLang || DEFAULT_CONFIG.targetLanguage;
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
        ? globalThis.ModelRegistry.resolveConfig(providerId, modelId, getEl('apiKey')?.value || '', '', '')
        : null;

    if (resolved) {
        if (apiUrlEl) apiUrlEl.value = resolved.apiUrl;
        if (modelNameEl) modelNameEl.value = resolved.modelName;
    }

    setReadOnly(apiUrlEl, true);
    setReadOnly(modelNameEl, true);
};

// Restores options from chrome.storage
const restoreOptions = () => {
    chrome.storage.sync.get(DEFAULT_CONFIG, (items) => {
        // Migration: legacy customPrompt -> userTranslationPrompt (only when new field is empty)
        let migratedUserPrompt = items.userTranslationPrompt || '';
        if (!migratedUserPrompt && items.customPrompt && globalThis.PromptTemplates && typeof globalThis.PromptTemplates.migrateCustomPrompt === 'function') {
            const migrated = globalThis.PromptTemplates.migrateCustomPrompt({
                customPrompt: items.customPrompt,
                userTranslationPrompt: items.userTranslationPrompt,
            });
            if (migrated && migrated.userTranslationPrompt) {
                migratedUserPrompt = migrated.userTranslationPrompt;
                // Best-effort write-back so background can use new field immediately
                chrome.storage.sync.set({ userTranslationPrompt: migratedUserPrompt }, () => {});
            }
        }

        // Provider/model
        populateProviderSelect(items.providerId);
        populateModelSelect(items.providerId || DEFAULT_CONFIG.providerId, items.modelId || items.modelName);

        // API Key
        getEl('apiKey').value = items.apiKey || '';

        // Language + prompt
        populateTargetLanguageSelect(items.targetLanguage);
        getEl('userTranslationPrompt').value = migratedUserPrompt;

        // Exclusions
        getEl('excludedDomains').value = joinMultilineList(items.excludedDomains);
        getEl('excludedSelectors').value = joinMultilineList(items.excludedSelectors);

        // Compatibility fields
        getEl('apiUrl').value = items.apiUrl || DEFAULT_CONFIG.apiUrl;
        getEl('modelName').value = items.modelName || DEFAULT_CONFIG.modelName;

        // Set readonly state and derived values
        deriveApiFieldsFromSelection();
    });
};

// Saves options to chrome.storage
const saveOptions = () => {
    const providerId = getEl('providerId').value;
    const modelId = getEl('modelId').value;
    const apiKey = getEl('apiKey').value.trim();
    const targetLanguage = getEl('targetLanguage').value;
    const userTranslationPrompt = getEl('userTranslationPrompt').value.trim();
    const excludedDomains = parseMultilineList(getEl('excludedDomains').value);
    const excludedSelectors = parseMultilineList(getEl('excludedSelectors').value);

    // Always keep compatibility fields up-to-date
    deriveApiFieldsFromSelection();
    const apiUrl = getEl('apiUrl').value.trim();
    const modelName = getEl('modelName').value.trim();

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
        },
        () => {
            showStatus('Options saved.');
        }
    );
};

document.addEventListener('DOMContentLoaded', () => {
    restoreOptions();

    getEl('providerId').addEventListener('change', () => {
        const providerId = getEl('providerId').value;
        populateModelSelect(providerId, null);
        deriveApiFieldsFromSelection();

        // If user picked Custom, open Advanced for convenience
        const advanced = getEl('advancedSection');
        if (advanced && providerId === 'custom') advanced.open = true;
    });

    getEl('modelId').addEventListener('change', deriveApiFieldsFromSelection);
});

getEl('save').addEventListener('click', saveOptions);

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
