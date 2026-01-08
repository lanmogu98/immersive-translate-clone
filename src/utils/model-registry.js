/**
 * Model Registry for Immersive Translate Clone
 * 
 * This module provides a registry of supported LLM providers and their models,
 * enabling automatic endpoint configuration based on provider selection.
 * 
 * Configuration is loaded from llm_config.yml (via generated JS/JSON).
 * See: llm_config.yml (source of truth)
 * 
 * Usage:
 * - Extension runtime: globalThis.ModelRegistry (requires llm-config.generated.js loaded first)
 * - Jest tests: require('./model-registry.js')
 */

// Load config from globalThis.LLM_CONFIG (set by llm-config.generated.js)
// or require it directly in Node.js/Jest environment
function loadConfig() {
    // Browser / Extension runtime: LLM_CONFIG is set by llm-config.generated.js
    if (typeof globalThis !== 'undefined' && globalThis.LLM_CONFIG) {
        return globalThis.LLM_CONFIG;
    }
    
    // Node.js / Jest: require the generated config
    if (typeof require !== 'undefined') {
        try {
            return require('./llm-config.generated.js');
        } catch (e) {
            // Fallback: try loading JSON directly
            try {
                return require('../../llm_config.json');
            } catch (e2) {
                console.warn('ModelRegistry: Failed to load LLM config, using empty fallback');
                return { providers: {} };
            }
        }
    }
    
    console.warn('ModelRegistry: No config available, using empty fallback');
    return { providers: {} };
}

// Load configuration
const CONFIG = loadConfig();

// MODEL_REGISTRY is now derived from the loaded config
const MODEL_REGISTRY = CONFIG.providers || {};

/**
 * Get list of all provider IDs
 * @returns {string[]} Array of provider IDs
 */
function getProviders() {
    const providers = Object.keys(MODEL_REGISTRY);
    // Ensure 'custom' is always last
    return providers.filter(p => p !== 'custom').concat(
        providers.includes('custom') ? ['custom'] : []
    );
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
