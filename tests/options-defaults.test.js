/**
 * Tests for Issue 9: HTML and JS Default Values Consistency
 * 
 * These tests verify that:
 * 1. HTML inputs don't have hardcoded value attributes
 * 2. JS DEFAULT_CONFIG is the single source of truth
 * 3. restoreOptions() correctly populates fields from DEFAULT_CONFIG
 * 4. content.js uses the same defaults as options.js
 */

const fs = require('fs');
const path = require('path');

describe('Options Defaults Consistency (Issue 9)', () => {
  describe('options.html structure', () => {
    let htmlContent;

    beforeAll(() => {
      const htmlPath = path.join(__dirname, '../src/options/options.html');
      htmlContent = fs.readFileSync(htmlPath, 'utf8');
    });

    test('apiUrl input should not have value attribute', () => {
      // Check that the input doesn't have a hardcoded value
      // It should only have placeholder
      const apiUrlMatch = htmlContent.match(/<input[^>]*id=["']apiUrl["'][^>]*>/);
      expect(apiUrlMatch).not.toBeNull();
      
      const inputTag = apiUrlMatch[0];
      // Should have placeholder but not value (or value should be empty)
      expect(inputTag).toMatch(/placeholder=/);
      
      // If value exists, it should be empty
      const valueMatch = inputTag.match(/value=["']([^"']*)["']/);
      if (valueMatch) {
        expect(valueMatch[1]).toBe('');
      }
    });

    test('modelName input should not have value attribute', () => {
      const modelMatch = htmlContent.match(/<input[^>]*id=["']modelName["'][^>]*>/);
      expect(modelMatch).not.toBeNull();
      
      const inputTag = modelMatch[0];
      const valueMatch = inputTag.match(/value=["']([^"']*)["']/);
      if (valueMatch) {
        expect(valueMatch[1]).toBe('');
      }
    });

    test('userTranslationPrompt textarea should not have hardcoded content', () => {
      // The textarea should be empty in HTML; JS fills it
      const textareaMatch = htmlContent.match(/<textarea[^>]*id=["']userTranslationPrompt["'][^>]*>([^<]*)<\/textarea>/);
      expect(textareaMatch).not.toBeNull();
      // Content between tags should be empty or just whitespace
      expect(textareaMatch[1].trim()).toBe('');
    });
  });

  describe('options.js DEFAULT_CONFIG', () => {
    let optionsJsContent;
    
    beforeAll(() => {
      const jsPath = path.join(__dirname, '../src/options/options.js');
      optionsJsContent = fs.readFileSync(jsPath, 'utf8');
    });

    test('DEFAULT_CONFIG should be defined', () => {
      expect(optionsJsContent).toMatch(/const\s+DEFAULT_CONFIG\s*=/);
    });

    test('DEFAULT_CONFIG should contain apiUrl', () => {
      expect(optionsJsContent).toMatch(/DEFAULT_CONFIG\s*=\s*\{[^}]*apiUrl\s*:/);
    });

    test('DEFAULT_CONFIG should contain modelName', () => {
      expect(optionsJsContent).toMatch(/DEFAULT_CONFIG\s*=\s*\{[^}]*modelName\s*:/);
    });

    test('DEFAULT_CONFIG.apiKey should be empty string (security)', () => {
      // apiKey default should be empty to avoid leaking keys
      expect(optionsJsContent).toMatch(/apiKey\s*:\s*['"]['"],?/);
    });
  });

  describe('content.js defaults alignment', () => {
    let contentJsContent;
    let optionsJsContent;
    
    beforeAll(() => {
      const contentPath = path.join(__dirname, '../src/content.js');
      const optionsPath = path.join(__dirname, '../src/options/options.js');
      contentJsContent = fs.readFileSync(contentPath, 'utf8');
      optionsJsContent = fs.readFileSync(optionsPath, 'utf8');
    });

    test('content.js should use same apiUrl default as options.js', () => {
      // Extract apiUrl from both files and compare
      const contentMatch = contentJsContent.match(/apiUrl\s*:\s*['"]([^'"]+)['"]/);
      const optionsMatch = optionsJsContent.match(/apiUrl\s*:\s*['"]([^'"]+)['"]/);
      
      expect(contentMatch).not.toBeNull();
      expect(optionsMatch).not.toBeNull();
      expect(contentMatch[1]).toBe(optionsMatch[1]);
    });

    test('content.js should use same modelName default as options.js', () => {
      const contentMatch = contentJsContent.match(/modelName\s*:\s*['"]([^'"]+)['"]/);
      const optionsMatch = optionsJsContent.match(/modelName\s*:\s*['"]([^'"]+)['"]/);
      
      expect(contentMatch).not.toBeNull();
      expect(optionsMatch).not.toBeNull();
      expect(contentMatch[1]).toBe(optionsMatch[1]);
    });
  });

  describe('restoreOptions() behavior', () => {
    function setupOptionsDom() {
      document.body.innerHTML = `
        <select id="providerId"></select>
        <select id="modelId"></select>
        <select id="targetLanguage"></select>
        <textarea id="userTranslationPrompt"></textarea>
        <textarea id="excludedDomains"></textarea>
        <textarea id="excludedSelectors"></textarea>
        <details id="advancedSection"></details>
        <input id="apiUrl" />
        <input id="apiKey" />
        <input id="modelName" />
        <button id="save">Save</button>
        <span id="status"></span>
      `;
    }

    test('should populate apiUrl from DEFAULT_CONFIG when storage is empty', () => {
      jest.resetModules();
      setupOptionsDom();

      require('../src/options/options.js');
      document.dispatchEvent(new Event('DOMContentLoaded'));

      const apiUrl = document.getElementById('apiUrl').value;
      expect(apiUrl).toBe('https://ark.cn-beijing.volces.com/api/v3/chat/completions');
    });

    test('should populate modelName from DEFAULT_CONFIG when storage is empty', () => {
      jest.resetModules();
      setupOptionsDom();

      require('../src/options/options.js');
      document.dispatchEvent(new Event('DOMContentLoaded'));

      const modelName = document.getElementById('modelName').value;
      expect(modelName).toBe('deepseek-v3-2-251201');
    });

    test('should use stored value when available (not DEFAULT_CONFIG)', () => {
      jest.resetModules();
      setupOptionsDom();

      // Mock storage to return custom values
      chrome.storage.sync.get.mockImplementation((defaults, callback) => {
        callback({
          providerId: 'custom',
          apiUrl: 'https://custom.api.com',
          apiKey: 'custom-key',
          modelName: 'custom-model',
          targetLanguage: 'zh-CN',
          userTranslationPrompt: 'custom prompt'
        });
      });

      require('../src/options/options.js');
      document.dispatchEvent(new Event('DOMContentLoaded'));

      expect(document.getElementById('apiUrl').value).toBe('https://custom.api.com');
      expect(document.getElementById('modelName').value).toBe('custom-model');
    });
  });
});
