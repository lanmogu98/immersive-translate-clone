const { LLMClient } = require('../src/utils/llm-client.js');

function createMockPort() {
  const onMessageListeners = [];
  const onDisconnectListeners = [];

  const port = {
    postMessage: jest.fn(),
    onMessage: {
      addListener: (fn) => onMessageListeners.push(fn),
    },
    onDisconnect: {
      addListener: (fn) => onDisconnectListeners.push(fn),
    },
    disconnect: jest.fn(() => {
      onDisconnectListeners.forEach((fn) => fn());
    }),
    _emitMessage: (msg) => {
      onMessageListeners.forEach((fn) => fn(msg));
    },
  };

  return port;
}

describe('LLMClient.translateStream', () => {
  test('calls onDone only once when an error triggers disconnect + onDisconnect', () => {
    const port = createMockPort();
    chrome.runtime.connect.mockReturnValue(port);

    const client = new LLMClient({ apiUrl: 'https://example.com', apiKey: 'k', modelName: 'm' });
    const onChunk = jest.fn();
    const onError = jest.fn();
    const onDone = jest.fn();

    client.translateStream('hi', onChunk, onError, onDone);
    port._emitMessage({ error: 'boom' });

    expect(onError).toHaveBeenCalledWith('boom');
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  test('calls onDone only once when done triggers disconnect + onDisconnect', () => {
    const port = createMockPort();
    chrome.runtime.connect.mockReturnValue(port);

    const client = new LLMClient({ apiUrl: 'https://example.com', apiKey: 'k', modelName: 'm' });
    const onDone = jest.fn();

    client.translateStream('hi', jest.fn(), jest.fn(), onDone);
    port._emitMessage({ done: true });

    expect(onDone).toHaveBeenCalledTimes(1);
  });
});


