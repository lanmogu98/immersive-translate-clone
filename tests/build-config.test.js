/**
 * Tests for scripts/build-config.js
 * 
 * Verifies the YAML → JSON/JS conversion pipeline works correctly.
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ROOT_DIR = path.resolve(__dirname, '..');
const YAML_PATH = path.join(ROOT_DIR, 'llm_config.yml');
const JSON_PATH = path.join(ROOT_DIR, 'llm_config.json');
const GENERATED_JS_PATH = path.join(ROOT_DIR, 'src/utils/llm-config.generated.js');

describe('build-config pipeline', () => {
    describe('llm_config.yml (source of truth)', () => {
        let rawConfig;

        beforeAll(() => {
            const content = fs.readFileSync(YAML_PATH, 'utf8');
            rawConfig = yaml.load(content);
        });

        test('should exist', () => {
            expect(fs.existsSync(YAML_PATH)).toBe(true);
        });

        test('should be valid YAML', () => {
            expect(rawConfig).toBeDefined();
            expect(typeof rawConfig).toBe('object');
        });

        test('should have at least one provider (excluding _shared_endpoints)', () => {
            const providers = Object.keys(rawConfig).filter(k => !k.startsWith('_'));
            expect(providers.length).toBeGreaterThan(0);
        });

        test('each provider should have required fields', () => {
            for (const [id, provider] of Object.entries(rawConfig)) {
                if (id.startsWith('_')) continue; // skip internal keys
                
                expect(provider).toHaveProperty('name');
                expect(provider).toHaveProperty('api_base_url');
                expect(provider).toHaveProperty('models');
                expect(typeof provider.models).toBe('object');
            }
        });

        test('each model should have id', () => {
            for (const [providerId, provider] of Object.entries(rawConfig)) {
                if (providerId.startsWith('_')) continue;
                
                for (const [modelKey, model] of Object.entries(provider.models || {})) {
                    expect(model).toHaveProperty('id');
                }
            }
        });

        test('custom provider should exist with empty models', () => {
            expect(rawConfig).toHaveProperty('custom');
            expect(rawConfig.custom.api_base_url).toBe('');
            expect(rawConfig.custom.models).toEqual({});
        });
    });

    describe('generated files (after build:config)', () => {
        let jsonConfig;

        beforeAll(() => {
            const jsonContent = fs.readFileSync(JSON_PATH, 'utf8');
            jsonConfig = JSON.parse(jsonContent);
        });

        test('llm_config.json should exist', () => {
            expect(fs.existsSync(JSON_PATH)).toBe(true);
        });

        test('llm_config.json should have providers object', () => {
            expect(jsonConfig).toHaveProperty('providers');
            expect(typeof jsonConfig.providers).toBe('object');
        });

        test('providers should have transformed field names (camelCase)', () => {
            const firstProvider = Object.values(jsonConfig.providers)[0];
            expect(firstProvider).toHaveProperty('baseUrl');
            expect(firstProvider).toHaveProperty('apiKeyEnvVar');
            expect(firstProvider).toHaveProperty('maxTokens');
            expect(firstProvider).toHaveProperty('contextWindow');
        });

        test('models should be transformed to array format', () => {
            for (const provider of Object.values(jsonConfig.providers)) {
                expect(Array.isArray(provider.models)).toBe(true);
                for (const model of provider.models) {
                    expect(model).toHaveProperty('id');
                    expect(model).toHaveProperty('key');
                    expect(model).toHaveProperty('name');
                }
            }
        });

        test('llm-config.generated.js should exist', () => {
            expect(fs.existsSync(GENERATED_JS_PATH)).toBe(true);
        });

        test('llm-config.generated.js should export config matching JSON', () => {
            // Clear require cache to get fresh module
            delete require.cache[require.resolve(GENERATED_JS_PATH)];
            const generatedConfig = require(GENERATED_JS_PATH);

            expect(generatedConfig).toEqual(jsonConfig);
        });

        test('generated JS should contain expected exports', () => {
            const content = fs.readFileSync(GENERATED_JS_PATH, 'utf8');
            expect(content).toContain('LLM_CONFIG');
            expect(content).toContain('module.exports');
            expect(content).toContain('globalThis');
        });
    });

    describe('transformation correctness', () => {
        let rawConfig;
        let jsonConfig;

        beforeAll(() => {
            const yamlContent = fs.readFileSync(YAML_PATH, 'utf8');
            rawConfig = yaml.load(yamlContent);
            const jsonContent = fs.readFileSync(JSON_PATH, 'utf8');
            jsonConfig = JSON.parse(jsonContent);
        });

        test('all non-internal providers should be in transformed output', () => {
            const yamlProviders = Object.keys(rawConfig).filter(k => !k.startsWith('_'));
            const jsonProviders = Object.keys(jsonConfig.providers);
            
            expect(jsonProviders.sort()).toEqual(yamlProviders.sort());
        });

        test('model count should match after transformation', () => {
            for (const [providerId, provider] of Object.entries(rawConfig)) {
                if (providerId.startsWith('_')) continue;
                
                const yamlModelCount = Object.keys(provider.models || {}).length;
                const jsonModelCount = jsonConfig.providers[providerId]?.models?.length || 0;
                
                expect(jsonModelCount).toBe(yamlModelCount);
            }
        });

        test('YAML anchors should be resolved', () => {
            // Check that volcengine endpoint anchor is resolved
            const deepseekProvider = jsonConfig.providers['deepseek-volcengine'];
            expect(deepseekProvider.baseUrl).toBe('https://ark.cn-beijing.volces.com/api/v3/chat/completions');
        });

        test('rate_limit should be transformed correctly', () => {
            const geminiFree = jsonConfig.providers['gemini-free'];
            expect(geminiFree.rateLimit).toBeDefined();
            expect(geminiFree.rateLimit.minIntervalSeconds).toBe(12);
            expect(geminiFree.rateLimit.maxRequestsPerMinute).toBe(5);
        });

        test('pricing should be preserved', () => {
            const deepseek = jsonConfig.providers['deepseek-volcengine'];
            const v3Model = deepseek.models.find(m => m.id === 'deepseek-v3-2-251201');
            expect(v3Model.pricing).toEqual({ input: 4, output: 6 });
        });
    });
});
