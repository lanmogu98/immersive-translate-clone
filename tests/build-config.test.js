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
        test('should exist', () => {
            expect(fs.existsSync(YAML_PATH)).toBe(true);
        });

        test('should be valid YAML', () => {
            const content = fs.readFileSync(YAML_PATH, 'utf8');
            expect(() => yaml.load(content)).not.toThrow();
        });

        test('should have providers object', () => {
            const content = fs.readFileSync(YAML_PATH, 'utf8');
            const config = yaml.load(content);
            expect(config).toHaveProperty('providers');
            expect(typeof config.providers).toBe('object');
        });

        test('each provider should have required fields', () => {
            const content = fs.readFileSync(YAML_PATH, 'utf8');
            const config = yaml.load(content);

            for (const [id, provider] of Object.entries(config.providers)) {
                expect(provider).toHaveProperty('name');
                expect(provider).toHaveProperty('baseUrl');
                expect(provider).toHaveProperty('authHeader');
                expect(provider).toHaveProperty('models');
                expect(Array.isArray(provider.models)).toBe(true);
            }
        });

        test('each model should have id and name', () => {
            const content = fs.readFileSync(YAML_PATH, 'utf8');
            const config = yaml.load(content);

            for (const [providerId, provider] of Object.entries(config.providers)) {
                for (const model of provider.models) {
                    expect(model).toHaveProperty('id');
                    expect(model).toHaveProperty('name');
                }
            }
        });
    });

    describe('generated files (after build:config)', () => {
        // These tests verify the generated files exist and are valid
        // They run after `npm run build:config` (via pretest hook)

        test('llm_config.json should exist', () => {
            expect(fs.existsSync(JSON_PATH)).toBe(true);
        });

        test('llm_config.json should be valid JSON matching YAML', () => {
            const yamlContent = fs.readFileSync(YAML_PATH, 'utf8');
            const yamlConfig = yaml.load(yamlContent);

            const jsonContent = fs.readFileSync(JSON_PATH, 'utf8');
            const jsonConfig = JSON.parse(jsonContent);

            expect(jsonConfig).toEqual(yamlConfig);
        });

        test('llm-config.generated.js should exist', () => {
            expect(fs.existsSync(GENERATED_JS_PATH)).toBe(true);
        });

        test('llm-config.generated.js should export config matching YAML', () => {
            const yamlContent = fs.readFileSync(YAML_PATH, 'utf8');
            const yamlConfig = yaml.load(yamlContent);

            // Clear require cache to get fresh module
            delete require.cache[require.resolve(GENERATED_JS_PATH)];
            const generatedConfig = require(GENERATED_JS_PATH);

            expect(generatedConfig).toEqual(yamlConfig);
        });

        test('generated JS should be loadable by model-registry', () => {
            // The real test is that model-registry.js can load the config
            // This is already covered by model-registry.test.js
            // Here we just verify the generated file is syntactically valid JS
            const content = fs.readFileSync(GENERATED_JS_PATH, 'utf8');
            expect(content).toContain('LLM_CONFIG');
            expect(content).toContain('module.exports');
            expect(content).toContain('globalThis');
        });
    });

    describe('YAML ↔ JSON consistency', () => {
        test('all providers in YAML should be in JSON', () => {
            const yamlContent = fs.readFileSync(YAML_PATH, 'utf8');
            const yamlConfig = yaml.load(yamlContent);
            const yamlProviders = Object.keys(yamlConfig.providers);

            const jsonContent = fs.readFileSync(JSON_PATH, 'utf8');
            const jsonConfig = JSON.parse(jsonContent);
            const jsonProviders = Object.keys(jsonConfig.providers);

            expect(jsonProviders.sort()).toEqual(yamlProviders.sort());
        });

        test('custom provider should always exist with empty models', () => {
            const yamlContent = fs.readFileSync(YAML_PATH, 'utf8');
            const yamlConfig = yaml.load(yamlContent);

            expect(yamlConfig.providers).toHaveProperty('custom');
            expect(yamlConfig.providers.custom.baseUrl).toBe('');
            expect(yamlConfig.providers.custom.models).toEqual([]);
        });
    });
});
