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
        for (const model of provider.models) {
            if (!model.id || !model.name) {
                throw new Error(`Model in provider "${id}" missing "id" or "name"`);
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

    // Parse YAML
    let config;
    try {
        config = yaml.load(yamlContent);
    } catch (e) {
        console.error(`Error parsing YAML: ${e.message}`);
        process.exit(1);
    }

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

    console.log(`  Providers: ${Object.keys(config.providers).join(', ')}`);
}

main();
