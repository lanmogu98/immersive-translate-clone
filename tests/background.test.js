function createPort() {
  return {
    postMessage: jest.fn(),
    onDisconnect: { addListener: jest.fn() },
  };
}

describe('background streamTranslation', () => {
  beforeEach(() => {
    jest.resetModules();
    // Ensure deterministic behavior (other tests may have loaded PromptTemplates)
    delete global.PromptTemplates;
  });

  test('returns error when apiKey is missing', async () => {
    const { streamTranslation } = require('../src/background.js');
    global.fetch = jest.fn();
    const port = createPort();

    await streamTranslation(
      'hello',
      { apiUrl: 'https://api.example.com', apiKey: '', modelName: 'm', userTranslationPrompt: '', targetLanguage: 'zh-CN' },
      port
    );

    expect(port.postMessage).toHaveBeenCalledWith({ error: 'API Key is missing.' });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('uses PromptTemplates.buildSystemPrompt when available', async () => {
    // Load PromptTemplates (it attaches to globalThis in Node)
    const PromptTemplates = require('../src/utils/prompt-templates.js');
    expect(PromptTemplates).toBeDefined();

    const { streamTranslation } = require('../src/background.js');
    const port = createPort();
    let capturedBody;

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

    await streamTranslation(
      'hello',
      {
        apiUrl: 'https://api.example.com',
        apiKey: 'k',
        modelName: 'm',
        userTranslationPrompt: 'CUSTOM_PROMPT',
        targetLanguage: 'ja',
      },
      port
    );

    expect(capturedBody.messages[0].content).toBe(
      PromptTemplates.buildSystemPrompt({ userPrompt: 'CUSTOM_PROMPT', targetLanguage: 'ja' })
    );
    expect(port.postMessage).toHaveBeenCalledWith({ done: true });
  });

  test('falls back to FALLBACK_PROMPT when PromptTemplates is not available and customPrompt is empty', async () => {
    const { streamTranslation, FALLBACK_PROMPT } = require('../src/background.js');
    const port = createPort();
    let capturedBody;

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

    await streamTranslation(
      'hello',
      {
        apiUrl: 'https://api.example.com',
        apiKey: 'k',
        modelName: 'm',
        customPrompt: '',
        userTranslationPrompt: '',
        targetLanguage: '',
      },
      port
    );

    expect(capturedBody.messages[0].content).toBe(FALLBACK_PROMPT);
    expect(port.postMessage).toHaveBeenCalledWith({ done: true });
  });

  test('aborts request and reports timeout after API_TIMEOUT_MS', async () => {
    jest.useFakeTimers();
    const { streamTranslation, API_TIMEOUT_MS } = require('../src/background.js');

    const port = createPort();

    global.fetch = jest.fn((url, options) => {
      const { signal } = options;
      return new Promise((resolve, reject) => {
        signal.addEventListener('abort', () => {
          const err = new Error('aborted');
          err.name = 'AbortError';
          reject(err);
        });
      });
    });

    const promise = streamTranslation(
      'hello',
      {
        apiUrl: 'https://api.example.com',
        apiKey: 'k',
        modelName: 'm',
        userTranslationPrompt: '',
        targetLanguage: 'zh-CN',
      },
      port
    );

    jest.advanceTimersByTime(API_TIMEOUT_MS);
    await promise;

    expect(port.postMessage).toHaveBeenCalledWith({ error: 'Request timed out. Please try again.' });

    jest.useRealTimers();
  });
});


