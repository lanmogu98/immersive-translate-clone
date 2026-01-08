/**
 * Tests for Issue 13: Translation Caching
 * 
 * These tests verify that:
 * 1. Cache correctly stores and retrieves translations
 * 2. LRU eviction works when cache is full
 * 3. Different target languages use separate cache entries
 * 4. Cache key generation is deterministic
 * 
 * Note: These tests will FAIL until src/utils/translation-cache.js is implemented.
 */

describe('TranslationCache', () => {
  let TranslationCache;
  let cache;

  beforeEach(() => {
    jest.resetModules();
    try {
      const module = require('../src/utils/translation-cache.js');
      TranslationCache = module.TranslationCache;
      cache = new TranslationCache(100);
    } catch (e) {
      // Module not yet implemented
      TranslationCache = null;
      cache = null;
    }
  });

  describe('constructor', () => {
    test('should initialize with empty cache', () => {
      expect(TranslationCache).not.toBeNull();
      const c = new TranslationCache();
      expect(c.size).toBe(0);
    });

    test('should accept maxSize parameter', () => {
      expect(TranslationCache).not.toBeNull();
      const c = new TranslationCache(50);
      expect(c.maxSize).toBe(50);
    });

    test('should default to reasonable maxSize if not specified', () => {
      expect(TranslationCache).not.toBeNull();
      const c = new TranslationCache();
      expect(c.maxSize).toBeGreaterThan(0);
      expect(c.maxSize).toBeLessThanOrEqual(10000);
    });
  });

  describe('get()', () => {
    test('should return undefined for uncached text', () => {
      expect(cache).not.toBeNull();
      const result = cache.get({ 
        text: 'uncached text', 
        targetLang: 'zh-CN',
        modelName: 'gpt-4o',
        promptVersion: 'v1'
      });
      expect(result).toBeUndefined();
    });

    test('should return cached translation for cached text', () => {
      expect(cache).not.toBeNull();
      const ctx = { 
        text: 'hello', 
        targetLang: 'zh-CN',
        modelName: 'gpt-4o',
        promptVersion: 'v1'
      };
      cache.set(ctx, '你好');
      expect(cache.get(ctx)).toBe('你好');
    });

    test('should return undefined for same text with different target language', () => {
      expect(cache).not.toBeNull();
      const ctx1 = { 
        text: 'hello', 
        targetLang: 'zh-CN',
        modelName: 'gpt-4o',
        promptVersion: 'v1'
      };
      const ctx2 = { 
        text: 'hello', 
        targetLang: 'ja',
        modelName: 'gpt-4o',
        promptVersion: 'v1'
      };
      cache.set(ctx1, '你好');
      expect(cache.get(ctx2)).toBeUndefined();
    });
  });

  describe('set()', () => {
    test('should store translation', () => {
      expect(cache).not.toBeNull();
      const ctx = { 
        text: 'world', 
        targetLang: 'zh-CN',
        modelName: 'gpt-4o',
        promptVersion: 'v1'
      };
      cache.set(ctx, '世界');
      expect(cache.get(ctx)).toBe('世界');
    });

    test('should overwrite existing translation for same key', () => {
      expect(cache).not.toBeNull();
      const ctx = { 
        text: 'test', 
        targetLang: 'zh-CN',
        modelName: 'gpt-4o',
        promptVersion: 'v1'
      };
      cache.set(ctx, '测试1');
      cache.set(ctx, '测试2');
      expect(cache.get(ctx)).toBe('测试2');
    });

    test('should store same text with different target languages separately', () => {
      expect(cache).not.toBeNull();
      const ctxZh = { 
        text: 'hello', 
        targetLang: 'zh-CN',
        modelName: 'gpt-4o',
        promptVersion: 'v1'
      };
      const ctxJa = { 
        text: 'hello', 
        targetLang: 'ja',
        modelName: 'gpt-4o',
        promptVersion: 'v1'
      };
      cache.set(ctxZh, '你好');
      cache.set(ctxJa, 'こんにちは');
      expect(cache.get(ctxZh)).toBe('你好');
      expect(cache.get(ctxJa)).toBe('こんにちは');
    });

    test('should store same text with different models separately', () => {
      expect(cache).not.toBeNull();
      const ctx1 = { 
        text: 'hello', 
        targetLang: 'zh-CN',
        modelName: 'gpt-4o',
        promptVersion: 'v1'
      };
      const ctx2 = { 
        text: 'hello', 
        targetLang: 'zh-CN',
        modelName: 'deepseek-chat',
        promptVersion: 'v1'
      };
      cache.set(ctx1, '你好1');
      cache.set(ctx2, '你好2');
      expect(cache.get(ctx1)).toBe('你好1');
      expect(cache.get(ctx2)).toBe('你好2');
    });
  });

  describe('hash()', () => {
    test('should return same hash for same input', () => {
      expect(cache).not.toBeNull();
      const hash1 = cache.hash('hello world');
      const hash2 = cache.hash('hello world');
      expect(hash1).toBe(hash2);
    });

    test('should return different hash for different input', () => {
      expect(cache).not.toBeNull();
      const hash1 = cache.hash('hello');
      const hash2 = cache.hash('world');
      expect(hash1).not.toBe(hash2);
    });

    test('should handle empty string', () => {
      expect(cache).not.toBeNull();
      const hash = cache.hash('');
      expect(hash).toBeDefined();
    });

    test('should handle unicode characters', () => {
      expect(cache).not.toBeNull();
      const hash1 = cache.hash('你好世界');
      const hash2 = cache.hash('你好世界');
      expect(hash1).toBe(hash2);
    });

    test('should handle very long strings', () => {
      expect(cache).not.toBeNull();
      const longText = 'a'.repeat(10000);
      const hash = cache.hash(longText);
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
    });
  });

  describe('getKey()', () => {
    test('should include target language in key', () => {
      expect(cache).not.toBeNull();
      const key = cache.getKey({ 
        text: 'test', 
        targetLang: 'zh-CN',
        modelName: 'gpt-4o',
        promptVersion: 'v1'
      });
      expect(key).toContain('zh-CN');
    });

    test('should include model name in key', () => {
      expect(cache).not.toBeNull();
      const key = cache.getKey({ 
        text: 'test', 
        targetLang: 'zh-CN',
        modelName: 'gpt-4o',
        promptVersion: 'v1'
      });
      expect(key).toContain('gpt-4o');
    });

    test('should be deterministic', () => {
      expect(cache).not.toBeNull();
      const ctx = { 
        text: 'test', 
        targetLang: 'zh-CN',
        modelName: 'gpt-4o',
        promptVersion: 'v1'
      };
      const key1 = cache.getKey(ctx);
      const key2 = cache.getKey(ctx);
      expect(key1).toBe(key2);
    });
  });

  describe('LRU eviction', () => {
    test('should evict oldest entry when cache is full', () => {
      expect(TranslationCache).not.toBeNull();
      const smallCache = new TranslationCache(3);
      const makeCtx = (text) => ({ 
        text, 
        targetLang: 'zh-CN',
        modelName: 'gpt-4o',
        promptVersion: 'v1'
      });
      
      smallCache.set(makeCtx('text1'), '翻译1');
      smallCache.set(makeCtx('text2'), '翻译2');
      smallCache.set(makeCtx('text3'), '翻译3');
      smallCache.set(makeCtx('text4'), '翻译4'); // Should evict text1
      
      expect(smallCache.get(makeCtx('text1'))).toBeUndefined();
      expect(smallCache.get(makeCtx('text4'))).toBe('翻译4');
    });

    test('should not evict if cache is not full', () => {
      expect(TranslationCache).not.toBeNull();
      const smallCache = new TranslationCache(5);
      const makeCtx = (text) => ({ 
        text, 
        targetLang: 'zh-CN',
        modelName: 'gpt-4o',
        promptVersion: 'v1'
      });
      
      smallCache.set(makeCtx('text1'), '翻译1');
      smallCache.set(makeCtx('text2'), '翻译2');
      smallCache.set(makeCtx('text3'), '翻译3');
      
      expect(smallCache.get(makeCtx('text1'))).toBe('翻译1');
      expect(smallCache.get(makeCtx('text2'))).toBe('翻译2');
      expect(smallCache.get(makeCtx('text3'))).toBe('翻译3');
    });
  });

  describe('has()', () => {
    test('should return true for cached text', () => {
      expect(cache).not.toBeNull();
      const ctx = { 
        text: 'test', 
        targetLang: 'zh-CN',
        modelName: 'gpt-4o',
        promptVersion: 'v1'
      };
      cache.set(ctx, '测试');
      expect(cache.has(ctx)).toBe(true);
    });

    test('should return false for uncached text', () => {
      expect(cache).not.toBeNull();
      const ctx = { 
        text: 'not cached', 
        targetLang: 'zh-CN',
        modelName: 'gpt-4o',
        promptVersion: 'v1'
      };
      expect(cache.has(ctx)).toBe(false);
    });
  });

  describe('clear()', () => {
    test('should remove all entries', () => {
      expect(cache).not.toBeNull();
      const ctx = { 
        text: 'test', 
        targetLang: 'zh-CN',
        modelName: 'gpt-4o',
        promptVersion: 'v1'
      };
      cache.set(ctx, '测试');
      cache.clear();
      expect(cache.get(ctx)).toBeUndefined();
    });

    test('should reset size to 0', () => {
      expect(cache).not.toBeNull();
      const ctx = { 
        text: 'test', 
        targetLang: 'zh-CN',
        modelName: 'gpt-4o',
        promptVersion: 'v1'
      };
      cache.set(ctx, '测试');
      cache.clear();
      expect(cache.size).toBe(0);
    });
  });

  describe('size property', () => {
    test('should return current number of entries', () => {
      expect(cache).not.toBeNull();
      expect(cache.size).toBe(0);
    });

    test('should update after set()', () => {
      expect(cache).not.toBeNull();
      const ctx = { 
        text: 'test', 
        targetLang: 'zh-CN',
        modelName: 'gpt-4o',
        promptVersion: 'v1'
      };
      cache.set(ctx, '测试');
      expect(cache.size).toBe(1);
    });

    test('should update after clear()', () => {
      expect(cache).not.toBeNull();
      const ctx = { 
        text: 'test', 
        targetLang: 'zh-CN',
        modelName: 'gpt-4o',
        promptVersion: 'v1'
      };
      cache.set(ctx, '测试');
      cache.clear();
      expect(cache.size).toBe(0);
    });
  });
});
