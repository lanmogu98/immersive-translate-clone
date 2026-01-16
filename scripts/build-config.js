#!/usr/bin/env node
/**
 * Build script: Convert llm_config.yml to JSON and generated JS
 * 
 * Outputs:
 * - llm_config.json (for programmatic access / tests)
 * - src/utils/llm-config.generated.js (for browser extension runtime)
 * 
 * Usage: node scripts/build-config.js
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ROOT_DIR = path.resolve(__dirname, '..');
const YAML_PATH = path.join(ROOT_DIR, 'llm_config.yml');
const JSON_PATH = path.join(ROOT_DIR, 'llm_config.json');
const GENERATED_JS_PATH = path.join(ROOT_DIR, 'src/utils/llm-config.generated.js');

/**
 * Transform raw YAML config to extension-friendly format
 * - Filters out internal keys (starting with _)
 * - Converts models from object to array format
 * - Adds default values for optional fields
 */
function transformConfig(rawConfig) {
    const defaultTemperature = rawConfig?._defaults?.temperature ?? 0.7;
    const providers = {};

    for (const [providerId, providerConfig] of Object.entries(rawConfig)) {
        // Skip internal/shared entries (e.g., _shared_endpoints)
        if (providerId.startsWith('_')) {
            continue;
        }

        // Skip if not a valid provider object
        if (!providerConfig || typeof providerConfig !== 'object') {
            continue;
        }

        // Transform models from object to array
        const modelsObj = providerConfig.models || {};
        const modelsArray = [];
        
        for (const [modelKey, modelConfig] of Object.entries(modelsObj)) {
            if (!modelConfig || typeof modelConfig !== 'object') {
                continue;
            }
            modelsArray.push({
                key: modelKey,
                id: modelConfig.id || modelKey,
                name: modelConfig.name || modelConfig.id || modelKey,
                pricing: modelConfig.pricing || { input: 0, output: 0 }
            });
        }

        // Build provider entry with all fields
        providers[providerId] = {
            name: providerConfig.name || providerId,
            apiKeyEnvVar: providerConfig.api_key_env_var || '',
            baseUrl: providerConfig.api_base_url || '',
            temperature: providerConfig.temperature ?? defaultTemperature,
            maxTokens: providerConfig.max_tokens ?? 4096,
            contextWindow: providerConfig.context_window ?? 128000,
            pricingCurrency: providerConfig.pricing_currency || '$',
            rateLimit: providerConfig.rate_limit ? {
                minIntervalSeconds: providerConfig.rate_limit.min_interval_seconds ?? 0.5,
                maxRequestsPerMinute: providerConfig.rate_limit.max_requests_per_minute ?? 60
            } : null,
            requestOverrides: providerConfig.request_overrides || null,
            models: modelsArray
        };
    }

    return { providers };
}

function validateConfig(config) {
    if (!config || !config.providers) {
        throw new Error('Invalid config structure. Expected { providers: {...} }');
    }

    for (const [id, provider] of Object.entries(config.providers)) {
        if (!provider.name) {
            throw new Error(`Provider "${id}" missing "name" field`);
        }
        if (typeof provider.baseUrl !== 'string') {
            throw new Error(`Provider "${id}" missing or invalid "baseUrl" field`);
        }
        if (!Array.isArray(provider.models)) {
            throw new Error(`Provider "${id}" missing or invalid "models" array`);
        }
        // Validate models (can be empty for custom provider)
        for (const model of provider.models) {
            if (!model.id) {
                throw new Error(`Model in provider "${id}" missing "id"`);
            }
        }
    }
}

function main() {
    console.log('Building LLM config from llm_config.yml...');

    // Read YAML file
    if (!fs.existsSync(YAML_PATH)) {
        console.error(`Error: ${YAML_PATH} not found`);
        process.exit(1);
    }

    const yamlContent = fs.readFileSync(YAML_PATH, 'utf8');

    // Parse YAML (js-yaml automatically resolves anchors)
    let rawConfig;
    try {
        rawConfig = yaml.load(yamlContent);
    } catch (e) {
        console.error(`Error parsing YAML: ${e.message}`);
        process.exit(1);
    }

    // Transform to extension-friendly format
    const config = transformConfig(rawConfig);

    // Validate
    try {
        validateConfig(config);
    } catch (e) {
        console.error(`Validation error: ${e.message}`);
        process.exit(1);
    }

    // 1. Write JSON file (for tests and programmatic access)
    const jsonContent = JSON.stringify(config, null, 2);
    fs.writeFileSync(JSON_PATH, jsonContent, 'utf8');
    console.log(`✓ Generated ${path.relative(ROOT_DIR, JSON_PATH)}`);

    // 2. Write generated JS file (for browser extension runtime)
    const jsContent = `// AUTO-GENERATED from llm_config.yml - DO NOT EDIT
// Run "npm run build:config" to regenerate
(function() {
    var LLM_CONFIG = ${JSON.stringify(config, null, 2)};

    // Browser / Extension runtime
    if (typeof globalThis !== 'undefined') {
        globalThis.LLM_CONFIG = LLM_CONFIG;
    }

    // Node.js / Jest support
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = LLM_CONFIG;
    }
})();
`;
    fs.writeFileSync(GENERATED_JS_PATH, jsContent, 'utf8');
    console.log(`✓ Generated ${path.relative(ROOT_DIR, GENERATED_JS_PATH)}`);

    // Summary
    const providerCount = Object.keys(config.providers).length;
    const modelCount = Object.values(config.providers).reduce((sum, p) => sum + p.models.length, 0);
    console.log(`  Providers: ${providerCount}, Models: ${modelCount}`);
}

main();
