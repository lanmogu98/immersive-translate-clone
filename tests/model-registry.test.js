/**
 * Tests for Issue 18: Model Presets + Auto Endpoint Configuration
 * 
 * These tests verify that:
 * 1. MODEL_REGISTRY contains correct provider/model definitions
 * 2. resolveConfig() returns correct API configuration
 * 3. Provider/Model relationships are valid
 * 
 * Note: These tests will FAIL until src/utils/model-registry.js is implemented.
 */

describe('model-registry', () => {
  let ModelRegistry;

  beforeEach(() => {
    jest.resetModules();
    try {
      ModelRegistry = require('../src/utils/model-registry.js');
    } catch (e) {
      // Module not yet implemented
      ModelRegistry = null;
    }
  });

  describe('MODEL_REGISTRY structure', () => {
    test('should be defined', () => {
      expect(ModelRegistry).not.toBeNull();
      expect(ModelRegistry.MODEL_REGISTRY).toBeDefined();
    });

    test('should contain openai provider with correct baseUrl', () => {
      expect(ModelRegistry).not.toBeNull();
      const openai = ModelRegistry.MODEL_REGISTRY.openai;
      expect(openai).toBeDefined();
      expect(openai.baseUrl).toBe('https://api.openai.com/v1');
    });

    test('should contain deepseek provider with correct baseUrl', () => {
      expect(ModelRegistry).not.toBeNull();
      const deepseek = ModelRegistry.MODEL_REGISTRY.deepseek;
      expect(deepseek).toBeDefined();
      expect(deepseek.baseUrl).toBe('https://api.deepseek.com');
    });

    test('should contain volcengine provider with correct baseUrl', () => {
      expect(ModelRegistry).not.toBeNull();
      const volcengine = ModelRegistry.MODEL_REGISTRY.volcengine;
      expect(volcengine).toBeDefined();
      expect(volcengine.baseUrl).toBe('https://ark.cn-beijing.volces.com/api/v3');
    });

    test('should contain custom provider with empty baseUrl', () => {
      expect(ModelRegistry).not.toBeNull();
      const custom = ModelRegistry.MODEL_REGISTRY.custom;
      expect(custom).toBeDefined();
      expect(custom.baseUrl).toBe('');
    });

    test('each provider should have name, baseUrl, models array, and authHeader', () => {
      expect(ModelRegistry).not.toBeNull();
      const providers = Object.values(ModelRegistry.MODEL_REGISTRY);
      for (const provider of providers) {
        expect(provider.name).toBeDefined();
        expect(typeof provider.baseUrl).toBe('string');
        expect(Array.isArray(provider.models)).toBe(true);
        expect(provider.authHeader).toBeDefined();
      }
    });

    test('each model should have id and name properties', () => {
      expect(ModelRegistry).not.toBeNull();
      const providers = Object.values(ModelRegistry.MODEL_REGISTRY);
      for (const provider of providers) {
        for (const model of provider.models) {
          expect(model.id).toBeDefined();
          expect(model.name).toBeDefined();
        }
      }
    });
  });

  describe('getProviders()', () => {
    test('should return list of all provider IDs', () => {
      expect(ModelRegistry).not.toBeNull();
      const providers = ModelRegistry.getProviders();
      expect(Array.isArray(providers)).toBe(true);
      expect(providers).toContain('openai');
      expect(providers).toContain('deepseek');
      expect(providers).toContain('volcengine');
      expect(providers).toContain('custom');
    });

    test('should include custom as last option', () => {
      expect(ModelRegistry).not.toBeNull();
      const providers = ModelRegistry.getProviders();
      expect(providers[providers.length - 1]).toBe('custom');
    });
  });

  describe('getModelsForProvider()', () => {
    test('should return models array for openai provider', () => {
      expect(ModelRegistry).not.toBeNull();
      const models = ModelRegistry.getModelsForProvider('openai');
      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
      expect(models.some(m => m.id === 'gpt-4o')).toBe(true);
    });

    test('should return models array for deepseek provider', () => {
      expect(ModelRegistry).not.toBeNull();
      const models = ModelRegistry.getModelsForProvider('deepseek');
      expect(Array.isArray(models)).toBe(true);
      expect(models.some(m => m.id === 'deepseek-chat')).toBe(true);
    });

    test('should return models array for volcengine provider', () => {
      expect(ModelRegistry).not.toBeNull();
      const models = ModelRegistry.getModelsForProvider('volcengine');
      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
    });

    test('should return empty array for custom provider', () => {
      expect(ModelRegistry).not.toBeNull();
      const models = ModelRegistry.getModelsForProvider('custom');
      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBe(0);
    });

    test('should return empty array for unknown provider', () => {
      expect(ModelRegistry).not.toBeNull();
      const models = ModelRegistry.getModelsForProvider('unknown-provider');
      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBe(0);
    });
  });

  describe('resolveConfig()', () => {
    test('should return correct config for openai/gpt-4o', () => {
      expect(ModelRegistry).not.toBeNull();
      const config = ModelRegistry.resolveConfig('openai', 'gpt-4o', 'test-key');
      expect(config.apiUrl).toBe('https://api.openai.com/v1');
      expect(config.modelName).toBe('gpt-4o');
      expect(config.apiKey).toBe('test-key');
    });

    test('should return correct config for deepseek/deepseek-chat', () => {
      expect(ModelRegistry).not.toBeNull();
      const config = ModelRegistry.resolveConfig('deepseek', 'deepseek-chat', 'test-key');
      expect(config.apiUrl).toBe('https://api.deepseek.com');
      expect(config.modelName).toBe('deepseek-chat');
    });

    test('should return correct config for volcengine/deepseek-v3-2-251201', () => {
      expect(ModelRegistry).not.toBeNull();
      const config = ModelRegistry.resolveConfig('volcengine', 'deepseek-v3-2-251201', 'test-key');
      expect(config.apiUrl).toBe('https://ark.cn-beijing.volces.com/api/v3');
      expect(config.modelName).toBe('deepseek-v3-2-251201');
    });

    test('should use customUrl and customModel for custom provider', () => {
      expect(ModelRegistry).not.toBeNull();
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
      expect(ModelRegistry).not.toBeNull();
      const config = ModelRegistry.resolveConfig('openai', 'gpt-4o', 'my-secret-key');
      expect(config.apiKey).toBe('my-secret-key');
    });

    test('should return null for invalid providerId', () => {
      expect(ModelRegistry).not.toBeNull();
      const config = ModelRegistry.resolveConfig('invalid-provider', 'model', 'key');
      expect(config).toBeNull();
    });
  });

  describe('resolveConfig() edge cases', () => {
    test('should handle empty customUrl for custom provider', () => {
      expect(ModelRegistry).not.toBeNull();
      const config = ModelRegistry.resolveConfig('custom', null, 'key', '', 'model');
      expect(config.apiUrl).toBe('');
    });

    test('should trim whitespace from customUrl and customModel', () => {
      expect(ModelRegistry).not.toBeNull();
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

  describe('provider compatibility', () => {
    test('all providers should use Bearer auth header', () => {
      expect(ModelRegistry).not.toBeNull();
      const providers = Object.values(ModelRegistry.MODEL_REGISTRY);
      for (const provider of providers) {
        expect(provider.authHeader).toBe('Bearer');
      }
    });

    test('all baseUrls should be valid HTTPS URLs (except custom)', () => {
      expect(ModelRegistry).not.toBeNull();
      const registry = ModelRegistry.MODEL_REGISTRY;
      for (const [id, provider] of Object.entries(registry)) {
        if (id === 'custom') {
          expect(provider.baseUrl).toBe('');
        } else {
          expect(provider.baseUrl).toMatch(/^https:\/\//);
        }
      }
    });
  });
});
