const { streamTranslation, API_TIMEOUT_MS, FALLBACK_PROMPT } = require('../src/background.js');

function createPort() {
  return {
    postMessage: jest.fn(),
    onDisconnect: { addListener: jest.fn() },
  };
}

describe('background streamTranslation', () => {
  test('returns error when apiKey is missing', async () => {
    global.fetch = jest.fn();
    const port = createPort();

    await streamTranslation(
      'hello',
      { apiUrl: 'https://api.example.com', apiKey: '', modelName: 'm', customPrompt: '' },
      port
    );

    expect(port.postMessage).toHaveBeenCalledWith({ error: 'API Key is missing.' });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('uses customPrompt when provided', async () => {
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
        customPrompt: 'CUSTOM_PROMPT',
      },
      port
    );

    expect(capturedBody.messages[0].content).toBe('CUSTOM_PROMPT');
    expect(port.postMessage).toHaveBeenCalledWith({ done: true });
  });

  test('falls back to FALLBACK_PROMPT when customPrompt is empty', async () => {
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
      },
      port
    );

    expect(capturedBody.messages[0].content).toBe(FALLBACK_PROMPT);
    expect(port.postMessage).toHaveBeenCalledWith({ done: true });
  });

  test('aborts request and reports timeout after API_TIMEOUT_MS', async () => {
    jest.useFakeTimers();

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
        customPrompt: '',
      },
      port
    );

    jest.advanceTimersByTime(API_TIMEOUT_MS);
    await promise;

    expect(port.postMessage).toHaveBeenCalledWith({ error: 'Request timed out. Please try again.' });

    jest.useRealTimers();
  });
});


