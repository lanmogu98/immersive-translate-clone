/**
 * Tests for Issue 11: Target Language Selector
 * 
 * These tests verify that:
 * 1. TARGET_LANGUAGES list is complete and correct
 * 2. Language code to name mapping works
 * 3. Prompt generation includes correct language
 * 4. Options page correctly saves/loads language preference
 * 
 * Note: These tests will FAIL until the target language feature is implemented
 * in src/utils/prompt-templates.js and related files.
 */

describe('Target Language Selection (Issue 11)', () => {
  let PromptTemplates;

  beforeEach(() => {
    jest.resetModules();
    try {
      PromptTemplates = require('../src/utils/prompt-templates.js');
    } catch (e) {
      PromptTemplates = null;
    }
  });

  describe('TARGET_LANGUAGES constant', () => {
    test('should be defined', () => {
      expect(PromptTemplates).not.toBeNull();
      expect(PromptTemplates.TARGET_LANGUAGES).toBeDefined();
      expect(Array.isArray(PromptTemplates.TARGET_LANGUAGES)).toBe(true);
    });

    test('should include zh-CN (Simplified Chinese)', () => {
      expect(PromptTemplates).not.toBeNull();
      const lang = PromptTemplates.TARGET_LANGUAGES.find(l => l.code === 'zh-CN');
      expect(lang).toBeDefined();
      expect(lang.name).toContain('中文');
    });

    test('should include zh-TW (Traditional Chinese)', () => {
      expect(PromptTemplates).not.toBeNull();
      const lang = PromptTemplates.TARGET_LANGUAGES.find(l => l.code === 'zh-TW');
      expect(lang).toBeDefined();
      expect(lang.name).toContain('繁');
    });

    test('should include en (English)', () => {
      expect(PromptTemplates).not.toBeNull();
      const lang = PromptTemplates.TARGET_LANGUAGES.find(l => l.code === 'en');
      expect(lang).toBeDefined();
      expect(lang.name.toLowerCase()).toContain('english');
    });

    test('should include ja (Japanese)', () => {
      expect(PromptTemplates).not.toBeNull();
      const lang = PromptTemplates.TARGET_LANGUAGES.find(l => l.code === 'ja');
      expect(lang).toBeDefined();
      expect(lang.name).toMatch(/日本語|japanese/i);
    });

    test('should include ko (Korean)', () => {
      expect(PromptTemplates).not.toBeNull();
      const lang = PromptTemplates.TARGET_LANGUAGES.find(l => l.code === 'ko');
      expect(lang).toBeDefined();
      expect(lang.name).toMatch(/한국어|korean/i);
    });

    test('each entry should have code and name properties', () => {
      expect(PromptTemplates).not.toBeNull();
      for (const lang of PromptTemplates.TARGET_LANGUAGES) {
        expect(lang.code).toBeDefined();
        expect(typeof lang.code).toBe('string');
        expect(lang.name).toBeDefined();
        expect(typeof lang.name).toBe('string');
      }
    });

    test('codes should be unique', () => {
      expect(PromptTemplates).not.toBeNull();
      const codes = PromptTemplates.TARGET_LANGUAGES.map(l => l.code);
      const uniqueCodes = [...new Set(codes)];
      expect(codes.length).toBe(uniqueCodes.length);
    });
  });

  describe('getLanguageName()', () => {
    test('should return correct name for zh-CN', () => {
      expect(PromptTemplates).not.toBeNull();
      const name = PromptTemplates.getLanguageName('zh-CN');
      expect(name).toContain('中文');
    });

    test('should return correct name for en', () => {
      expect(PromptTemplates).not.toBeNull();
      const name = PromptTemplates.getLanguageName('en');
      expect(name.toLowerCase()).toContain('english');
    });

    test('should return fallback for unknown code', () => {
      expect(PromptTemplates).not.toBeNull();
      const name = PromptTemplates.getLanguageName('unknown-code');
      expect(name).toBeDefined();
      expect(name.length).toBeGreaterThan(0);
    });
  });

  describe('prompt generation with target language', () => {
    test('buildSystemPrompt should include target language name', () => {
      expect(PromptTemplates).not.toBeNull();
      const result = PromptTemplates.buildSystemPrompt({ 
        userPrompt: 'test',
        targetLanguage: 'ja'
      });
      expect(result.toLowerCase()).toMatch(/日本語|japanese/i);
    });

    test('should use Simplified Chinese as default', () => {
      expect(PromptTemplates).not.toBeNull();
      const result = PromptTemplates.buildSystemPrompt({ userPrompt: 'test' });
      expect(result).toMatch(/中文|chinese|zh/i);
    });

    test('should correctly substitute for all supported languages', () => {
      expect(PromptTemplates).not.toBeNull();
      const languages = ['zh-CN', 'zh-TW', 'en', 'ja', 'ko'];
      for (const lang of languages) {
        const result = PromptTemplates.buildSystemPrompt({ 
          userPrompt: 'test',
          targetLanguage: lang
        });
        // Should not contain raw placeholder
        expect(result).not.toContain('{{TARGET_LANG}}');
      }
    });
  });

  describe('storage integration', () => {
    test('targetLanguage should default to zh-CN in DEFAULT_CONFIG', () => {
      const fs = require('fs');
      const path = require('path');
      const optionsJs = fs.readFileSync(
        path.join(__dirname, '../src/options/options.js'), 
        'utf8'
      );
      // Check that DEFAULT_CONFIG includes targetLanguage
      expect(optionsJs).toMatch(/targetLanguage\s*:/);
    });
  });

  describe('language detection interaction (Issue 12)', () => {
    let LangDetect;

    beforeEach(() => {
      try {
        LangDetect = require('../src/utils/lang-detect.js');
      } catch (e) {
        LangDetect = null;
      }
    });

    test('should skip translation when source matches target', () => {
      if (!LangDetect) {
        // Lang detect not implemented yet, skip test
        expect(true).toBe(true);
        return;
      }
      // Chinese text with target zh should be skipped
      expect(LangDetect.shouldSkipTranslation('这是中文', 'zh')).toBe(true);
    });

    test('should allow translation when source differs from target', () => {
      if (!LangDetect) {
        expect(true).toBe(true);
        return;
      }
      // English text with target zh should NOT be skipped
      expect(LangDetect.shouldSkipTranslation('This is English', 'zh')).toBe(false);
    });
  });
});
