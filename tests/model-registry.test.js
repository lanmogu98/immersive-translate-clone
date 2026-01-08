/**
 * Tests for Model Registry (Issue 18 + Issue 21)
 * 
 * These tests verify that:
 * 1. MODEL_REGISTRY is loaded correctly from config
 * 2. Provider/Model APIs work correctly
 * 3. resolveConfig() returns correct API configuration with extended fields
 */

describe('model-registry', () => {
    let ModelRegistry;

    beforeEach(() => {
        jest.resetModules();
        ModelRegistry = require('../src/utils/model-registry.js');
    });

    describe('MODEL_REGISTRY structure', () => {
        test('should be defined and loaded from config', () => {
            expect(ModelRegistry).not.toBeNull();
            expect(ModelRegistry.MODEL_REGISTRY).toBeDefined();
            expect(Object.keys(ModelRegistry.MODEL_REGISTRY).length).toBeGreaterThan(0);
        });

        test('each provider should have required fields', () => {
            for (const [id, provider] of Object.entries(ModelRegistry.MODEL_REGISTRY)) {
                expect(provider.name).toBeDefined();
                expect(typeof provider.baseUrl).toBe('string');
                expect(Array.isArray(provider.models)).toBe(true);
                expect(typeof provider.temperature).toBe('number');
                expect(typeof provider.maxTokens).toBe('number');
            }
        });

        test('each model should have id, key, and name', () => {
            for (const [id, provider] of Object.entries(ModelRegistry.MODEL_REGISTRY)) {
                for (const model of provider.models) {
                    expect(model.id).toBeDefined();
                    expect(model.key).toBeDefined();
                    expect(model.name).toBeDefined();
                }
            }
        });

        test('custom provider should exist with empty models', () => {
            const custom = ModelRegistry.MODEL_REGISTRY.custom;
            expect(custom).toBeDefined();
            expect(custom.baseUrl).toBe('');
            expect(custom.models).toEqual([]);
        });
    });

    describe('getProviders()', () => {
        test('should return list of all provider IDs', () => {
            const providers = ModelRegistry.getProviders();
            expect(Array.isArray(providers)).toBe(true);
            expect(providers.length).toBeGreaterThan(0);
        });

        test('should include custom as last option', () => {
            const providers = ModelRegistry.getProviders();
            expect(providers[providers.length - 1]).toBe('custom');
        });

        test('should include deepseek-volcengine provider', () => {
            const providers = ModelRegistry.getProviders();
            expect(providers).toContain('deepseek-volcengine');
        });
    });

    describe('getProviderName()', () => {
        test('should return display name for known provider', () => {
            const name = ModelRegistry.getProviderName('deepseek-volcengine');
            expect(name).toBe('DeepSeek (Volcengine)');
        });

        test('should return provider ID for unknown provider', () => {
            const name = ModelRegistry.getProviderName('unknown-provider');
            expect(name).toBe('unknown-provider');
        });
    });

    describe('getProvider()', () => {
        test('should return full provider config', () => {
            const provider = ModelRegistry.getProvider('deepseek-volcengine');
            expect(provider).not.toBeNull();
            expect(provider.name).toBe('DeepSeek (Volcengine)');
            expect(provider.baseUrl).toContain('volces.com');
            expect(provider.temperature).toBe(0.4);
        });

        test('should return null for unknown provider', () => {
            const provider = ModelRegistry.getProvider('unknown');
            expect(provider).toBeNull();
        });
    });

    describe('getModelsForProvider()', () => {
        test('should return models array for known provider', () => {
            const models = ModelRegistry.getModelsForProvider('deepseek-volcengine');
            expect(Array.isArray(models)).toBe(true);
            expect(models.length).toBeGreaterThan(0);
        });

        test('models should have pricing info', () => {
            const models = ModelRegistry.getModelsForProvider('deepseek-volcengine');
            for (const model of models) {
                expect(model.pricing).toBeDefined();
                expect(typeof model.pricing.input).toBe('number');
                expect(typeof model.pricing.output).toBe('number');
            }
        });

        test('should return empty array for custom provider', () => {
            const models = ModelRegistry.getModelsForProvider('custom');
            expect(Array.isArray(models)).toBe(true);
            expect(models.length).toBe(0);
        });

        test('should return empty array for unknown provider', () => {
            const models = ModelRegistry.getModelsForProvider('unknown-provider');
            expect(Array.isArray(models)).toBe(true);
            expect(models.length).toBe(0);
        });
    });

    describe('getProviderDefaults()', () => {
        test('should return default settings for known provider', () => {
            const defaults = ModelRegistry.getProviderDefaults('deepseek-volcengine');
            expect(defaults.temperature).toBe(0.4);
            expect(defaults.maxTokens).toBe(16000);
            expect(defaults.contextWindow).toBe(128000);
            expect(defaults.pricingCurrency).toBe('¥');
        });

        test('should return fallback defaults for unknown provider', () => {
            const defaults = ModelRegistry.getProviderDefaults('unknown');
            expect(defaults.temperature).toBe(0.6);
            expect(defaults.maxTokens).toBe(4096);
            expect(defaults.contextWindow).toBe(128000);
        });

        test('should include rateLimit if configured', () => {
            const defaults = ModelRegistry.getProviderDefaults('gemini-free');
            expect(defaults.rateLimit).toBeDefined();
            expect(defaults.rateLimit.minIntervalSeconds).toBe(12);
            expect(defaults.rateLimit.maxRequestsPerMinute).toBe(5);
        });
    });

    describe('resolveConfig()', () => {
        test('should return correct config for deepseek-volcengine', () => {
            const config = ModelRegistry.resolveConfig(
                'deepseek-volcengine',
                'deepseek-v3-2-251201',
                'test-key'
            );
            expect(config.apiUrl).toContain('volces.com');
            expect(config.modelName).toBe('deepseek-v3-2-251201');
            expect(config.apiKey).toBe('test-key');
            expect(config.temperature).toBe(0.4);
            expect(config.maxTokens).toBe(16000);
        });

        test('should include pricing from model config', () => {
            const config = ModelRegistry.resolveConfig(
                'deepseek-volcengine',
                'deepseek-v3-2-251201',
                'test-key'
            );
            expect(config.pricing).toEqual({ input: 4, output: 6 });
            expect(config.pricingCurrency).toBe('¥');
        });

        test('should use customUrl and customModel for custom provider', () => {
            const config = ModelRegistry.resolveConfig(
                'custom',
                null,
                'test-key',
                'https://my-api.com/v1',
                'my-custom-model'
            );
            expect(config.apiUrl).toBe('https://my-api.com/v1');
            expect(config.modelName).toBe('my-custom-model');
        });

        test('should always include apiKey in returned config', () => {
            const config = ModelRegistry.resolveConfig(
                'deepseek-volcengine',
                'deepseek-v3-2-251201',
                'my-secret-key'
            );
            expect(config.apiKey).toBe('my-secret-key');
        });

        test('should return null for invalid providerId', () => {
            const config = ModelRegistry.resolveConfig('invalid-provider', 'model', 'key');
            expect(config).toBeNull();
        });

        test('should include rateLimit if provider has it', () => {
            const config = ModelRegistry.resolveConfig(
                'gemini-free',
                'gemini-2.5-flash',
                'test-key'
            );
            expect(config.rateLimit).toBeDefined();
            expect(config.rateLimit.minIntervalSeconds).toBe(12);
        });
    });

    describe('getDefaultModel()', () => {
        test('should return first model ID for known provider', () => {
            const modelId = ModelRegistry.getDefaultModel('deepseek-volcengine');
            expect(modelId).toBeDefined();
            expect(typeof modelId).toBe('string');
        });

        test('should return null for custom provider', () => {
            const modelId = ModelRegistry.getDefaultModel('custom');
            expect(modelId).toBeNull();
        });

        test('should return null for unknown provider', () => {
            const modelId = ModelRegistry.getDefaultModel('unknown');
            expect(modelId).toBeNull();
        });
    });

    describe('resolveConfig() edge cases', () => {
        test('should handle empty customUrl for custom provider', () => {
            const config = ModelRegistry.resolveConfig('custom', null, 'key', '', 'model');
            expect(config.apiUrl).toBe('');
        });

        test('should trim whitespace from customUrl and customModel', () => {
            const config = ModelRegistry.resolveConfig(
                'custom',
                null,
                'key',
                '  https://api.example.com  ',
                '  my-model  '
            );
            expect(config.apiUrl).toBe('https://api.example.com');
            expect(config.modelName).toBe('my-model');
        });
    });
});
