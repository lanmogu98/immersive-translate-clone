/**
 * Model Registry for Immersive Translate Clone
 * 
 * This module provides a registry of supported LLM providers and their models,
 * enabling automatic endpoint configuration based on provider selection.
 * 
 * Usage:
 * - Extension runtime: globalThis.ModelRegistry
 * - Jest tests: require('./model-registry.js')
 */

// Model and Provider Registry
const MODEL_REGISTRY = {
    openai: {
        name: 'OpenAI',
        baseUrl: 'https://api.openai.com/v1',
        models: [
            { id: 'gpt-4o', name: 'GPT-4o' },
            { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
            { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
            { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' }
        ],
        authHeader: 'Bearer'
    },
    deepseek: {
        name: 'DeepSeek',
        baseUrl: 'https://api.deepseek.com',
        models: [
            { id: 'deepseek-chat', name: 'DeepSeek Chat' },
            { id: 'deepseek-coder', name: 'DeepSeek Coder' }
        ],
        authHeader: 'Bearer'
    },
    volcengine: {
        name: 'Volcengine Ark',
        baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
        models: [
            { id: 'deepseek-v3-2-251201', name: 'DeepSeek V3 (Ark)' },
            { id: 'doubao-pro-32k', name: 'Doubao Pro 32K' },
            { id: 'doubao-lite-32k', name: 'Doubao Lite 32K' }
        ],
        authHeader: 'Bearer'
    },
    anthropic: {
        name: 'Anthropic',
        baseUrl: 'https://api.anthropic.com/v1',
        models: [
            { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
            { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' }
        ],
        authHeader: 'Bearer'
    },
    custom: {
        name: 'Custom Endpoint',
        baseUrl: '',
        models: [],
        authHeader: 'Bearer'
    }
};

/**
 * Get list of all provider IDs
 * @returns {string[]} Array of provider IDs
 */
function getProviders() {
    const providers = Object.keys(MODEL_REGISTRY);
    // Ensure 'custom' is always last
    return providers.filter(p => p !== 'custom').concat(['custom']);
}

/**
 * Get provider display name
 * @param {string} providerId - Provider ID
 * @returns {string} Provider display name
 */
function getProviderName(providerId) {
    const provider = MODEL_REGISTRY[providerId];
    return provider ? provider.name : providerId;
}

/**
 * Get models for a specific provider
 * @param {string} providerId - Provider ID
 * @returns {Array<{id: string, name: string}>} Array of model objects
 */
function getModelsForProvider(providerId) {
    const provider = MODEL_REGISTRY[providerId];
    return provider ? provider.models : [];
}

/**
 * Resolve API configuration from provider/model selection
 * @param {string} providerId - Provider ID
 * @param {string} modelId - Model ID (ignored for custom provider)
 * @param {string} apiKey - API key
 * @param {string} customUrl - Custom API URL (only for custom provider)
 * @param {string} customModel - Custom model name (only for custom provider)
 * @returns {Object|null} Configuration object or null if invalid
 */
function resolveConfig(providerId, modelId, apiKey, customUrl, customModel) {
    const provider = MODEL_REGISTRY[providerId];
    
    if (!provider) {
        return null;
    }
    
    if (providerId === 'custom') {
        return {
            apiUrl: (customUrl || '').trim(),
            modelName: (customModel || '').trim(),
            apiKey: apiKey
        };
    }
    
    return {
        apiUrl: provider.baseUrl,
        modelName: modelId,
        apiKey: apiKey
    };
}

/**
 * Get default model for a provider
 * @param {string} providerId - Provider ID
 * @returns {string|null} Default model ID or null
 */
function getDefaultModel(providerId) {
    const models = getModelsForProvider(providerId);
    return models.length > 0 ? models[0].id : null;
}

// Export for both browser (globalThis) and Node.js (module.exports)
const ModelRegistry = {
    MODEL_REGISTRY,
    getProviders,
    getProviderName,
    getModelsForProvider,
    resolveConfig,
    getDefaultModel
};

// Node.js / Jest support
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModelRegistry;
}

// Browser / Extension runtime support
if (typeof globalThis !== 'undefined') {
    globalThis.ModelRegistry = ModelRegistry;
}

