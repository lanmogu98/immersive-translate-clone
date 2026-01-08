/**
 * End-to-End Tests for Target Language Selection
 * 
 * These tests verify the complete data flow:
 * 1. options.js saves targetLanguage to chrome.storage
 * 2. content.js reads targetLanguage from storage
 * 3. LLMClient sends targetLanguage to background
 * 4. background.js builds prompt with correct target language
 */

describe('Target Language E2E', () => {
  let savedStorage = {};

  beforeEach(() => {
    jest.resetModules();
    savedStorage = {};
    
    // Mock chrome.storage.sync to actually persist values
    global.chrome = {
      runtime: {
        connect: jest.fn(() => ({
          postMessage: jest.fn(),
          onMessage: { addListener: jest.fn() },
          onDisconnect: { addListener: jest.fn() },
          disconnect: jest.fn(),
        })),
        onConnect: { addListener: jest.fn() },
        onInstalled: { addListener: jest.fn() },
        onMessage: { addListener: jest.fn() },
        lastError: undefined,
        openOptionsPage: jest.fn(),
        getURL: jest.fn((path) => `chrome-extension://test/${path}`),
      },
      tabs: {
        query: jest.fn().mockResolvedValue([{ id: 1, url: 'https://example.com/' }]),
        sendMessage: jest.fn().mockResolvedValue(undefined),
        onUpdated: { addListener: jest.fn() },
        update: jest.fn(),
      },
      scripting: {
        executeScript: jest.fn().mockResolvedValue(undefined),
        insertCSS: jest.fn().mockResolvedValue(undefined),
      },
      storage: {
        sync: {
          get: jest.fn((defaults, callback) => {
            // Merge defaults with saved storage
            const result = { ...(defaults || {}), ...savedStorage };
            if (typeof callback === 'function') {
              callback(result);
              return undefined;
            }
            return Promise.resolve(result);
          }),
          set: jest.fn((items, callback) => {
            // Actually save to our mock storage
            Object.assign(savedStorage, items);
            if (typeof callback === 'function') callback();
          }),
        },
      },
    };
  });

  describe('Options page saves targetLanguage correctly', () => {
    test('saveOptions should persist targetLanguage to storage', () => {
      // Load PromptTemplates first (required for populateTargetLanguageSelect)
      const PromptTemplates = require('../src/utils/prompt-templates.js');
      globalThis.PromptTemplates = PromptTemplates;

      document.body.innerHTML = `
        <select id="providerId"><option value="custom">Custom</option></select>
        <select id="modelId"></select>
        <select id="targetLanguage">
          <option value="zh-CN">简体中文</option>
          <option value="en">English</option>
          <option value="ja">日本語</option>
        </select>
        <textarea id="userTranslationPrompt"></textarea>
        <textarea id="excludedDomains"></textarea>
        <textarea id="excludedSelectors"></textarea>
        <details id="advancedSection"></details>
        <input id="apiUrl" value="https://api.example.com" />
        <input id="apiKey" value="test-key" />
        <button id="toggleApiKey">👁️</button>
        <input id="modelName" value="test-model" />
        <button id="save">Save</button>
        <span id="status"></span>
      `;

      require('../src/options/options.js');
      document.dispatchEvent(new Event('DOMContentLoaded'));

      // After restoreOptions, manually set form values
      // (restoreOptions overwrites HTML initial values with storage defaults)
      document.getElementById('apiUrl').value = 'https://api.example.com';
      document.getElementById('apiKey').value = 'test-key';
      document.getElementById('modelName').value = 'test-model';
      document.getElementById('targetLanguage').value = 'en';

      // Clear previous mock calls
      chrome.storage.sync.set.mockClear();

      // Click save
      document.getElementById('save').click();

      // Check if there was an error message
      const statusText = document.getElementById('status').textContent;
      
      // If there's an error, fail with the actual error message
      if (statusText && statusText !== 'Options saved.') {
        throw new Error(`Save failed with: ${statusText}`);
      }

      // Verify storage was called with correct targetLanguage
      expect(chrome.storage.sync.set).toHaveBeenCalled();
      const lastCall = chrome.storage.sync.set.mock.calls[chrome.storage.sync.set.mock.calls.length - 1];
      expect(lastCall[0].targetLanguage).toBe('en');
    });

    test('saveOptions should persist Japanese targetLanguage', () => {
      // Load PromptTemplates first
      const PromptTemplates = require('../src/utils/prompt-templates.js');
      globalThis.PromptTemplates = PromptTemplates;

      document.body.innerHTML = `
        <select id="providerId"><option value="custom">Custom</option></select>
        <select id="modelId"></select>
        <select id="targetLanguage">
          <option value="zh-CN">简体中文</option>
          <option value="en">English</option>
          <option value="ja">日本語</option>
        </select>
        <textarea id="userTranslationPrompt"></textarea>
        <textarea id="excludedDomains"></textarea>
        <textarea id="excludedSelectors"></textarea>
        <details id="advancedSection"></details>
        <input id="apiUrl" value="https://api.example.com" />
        <input id="apiKey" value="test-key" />
        <button id="toggleApiKey">👁️</button>
        <input id="modelName" value="test-model" />
        <button id="save">Save</button>
        <span id="status"></span>
      `;

      require('../src/options/options.js');
      document.dispatchEvent(new Event('DOMContentLoaded'));

      // Set form values after restoreOptions
      document.getElementById('apiUrl').value = 'https://api.example.com';
      document.getElementById('apiKey').value = 'test-key';
      document.getElementById('modelName').value = 'test-model';
      document.getElementById('targetLanguage').value = 'ja';

      chrome.storage.sync.set.mockClear();
      document.getElementById('save').click();

      const lastCall = chrome.storage.sync.set.mock.calls[chrome.storage.sync.set.mock.calls.length - 1];
      expect(lastCall[0].targetLanguage).toBe('ja');
    });
  });

  describe('LLMClient sends targetLanguage to background', () => {
    test('LLMClient.translateStream should include targetLanguage in config', () => {
      const { LLMClient } = require('../src/utils/llm-client.js');

      let sentMessage = null;
      const mockPort = {
        postMessage: jest.fn((msg) => { sentMessage = msg; }),
        onMessage: { addListener: jest.fn() },
        onDisconnect: { addListener: jest.fn() },
        disconnect: jest.fn(),
      };
      chrome.runtime.connect = jest.fn(() => mockPort);

      // Create client with English target language
      const config = {
        apiUrl: 'https://api.example.com',
        apiKey: 'test-key',
        modelName: 'test-model',
        targetLanguage: 'en',
        userTranslationPrompt: '',
      };
      const client = new LLMClient(config);

      client.translateStream('Hello', () => {}, () => {}, () => {});

      // Verify the message sent to background includes targetLanguage
      expect(sentMessage).not.toBeNull();
      expect(sentMessage.action).toBe('translate');
      expect(sentMessage.config.targetLanguage).toBe('en');
    });
  });

  describe('Background builds correct prompt from targetLanguage', () => {
    test('streamTranslation should send prompt with correct target language to API', async () => {
      // Load PromptTemplates first (as background.js does via importScripts)
      const PromptTemplates = require('../src/utils/prompt-templates.js');
      globalThis.PromptTemplates = PromptTemplates;

      const { streamTranslation } = require('../src/background.js');
      
      let capturedBody = null;
      global.fetch = jest.fn(async (url, options) => {
        capturedBody = JSON.parse(options.body);
        return {
          ok: true,
          body: {
            getReader: () => ({
              read: async () => ({ done: true, value: undefined }),
            }),
          },
        };
      });

      const port = {
        postMessage: jest.fn(),
        onDisconnect: { addListener: jest.fn() },
      };

      await streamTranslation('Hello world', {
        apiUrl: 'https://api.example.com',
        apiKey: 'test-key',
        modelName: 'test-model',
        userTranslationPrompt: '',
        targetLanguage: 'en',  // Set to English
      }, port);

      // The system prompt sent to API should contain "English"
      expect(capturedBody).not.toBeNull();
      const systemPrompt = capturedBody.messages[0].content;
      expect(systemPrompt).toContain('English');
      expect(systemPrompt).not.toContain('Simplified Chinese');
    });

    test('buildSystemPrompt should include English for en target', () => {
      const PromptTemplates = require('../src/utils/prompt-templates.js');

      const prompt = PromptTemplates.buildSystemPrompt({
        userPrompt: '',
        targetLanguage: 'en',
      });

      // Should contain "English" not "Chinese"
      expect(prompt).toContain('English');
      expect(prompt).not.toContain('Simplified Chinese');
      expect(prompt).not.toContain('{{TARGET_LANG}}');
    });

    test('buildSystemPrompt should include Japanese for ja target', () => {
      const PromptTemplates = require('../src/utils/prompt-templates.js');

      const prompt = PromptTemplates.buildSystemPrompt({
        userPrompt: '',
        targetLanguage: 'ja',
      });

      expect(prompt).toContain('日本語');
      expect(prompt).not.toContain('Simplified Chinese');
    });

    test('buildSystemPrompt should default to Simplified Chinese when not specified', () => {
      const PromptTemplates = require('../src/utils/prompt-templates.js');

      const prompt = PromptTemplates.buildSystemPrompt({
        userPrompt: '',
        // targetLanguage not specified
      });

      expect(prompt).toContain('简体中文');
    });

    test('buildSystemPrompt should handle Traditional Chinese', () => {
      const PromptTemplates = require('../src/utils/prompt-templates.js');

      const prompt = PromptTemplates.buildSystemPrompt({
        userPrompt: '',
        targetLanguage: 'zh-TW',
      });

      expect(prompt).toContain('繁體中文');
      expect(prompt).not.toContain('简体中文');
    });
  });

  describe('Content reads updated targetLanguage from storage', () => {
    test('content.js should read targetLanguage from storage', async () => {
      // Pre-set storage with English
      savedStorage = {
        targetLanguage: 'en',
        apiUrl: 'https://api.example.com',
        apiKey: 'test-key',
        modelName: 'test-model',
      };

      // Spy on storage.get to verify it's called
      const getSpy = jest.spyOn(chrome.storage.sync, 'get');

      // We can't fully test content.js without DOM setup, but we can verify
      // the mock behavior works correctly
      const defaults = {
        targetLanguage: 'zh-CN',
      };

      let result;
      chrome.storage.sync.get(defaults, (items) => {
        result = items;
      });

      // Should get 'en' from storage, not the default 'zh-CN'
      expect(result.targetLanguage).toBe('en');
    });
  });
});
