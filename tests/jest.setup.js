const { TextDecoder, TextEncoder } = require('util');

// Ensure TextEncoder/TextDecoder exist (used by background streaming code)
global.TextDecoder = global.TextDecoder || TextDecoder;
global.TextEncoder = global.TextEncoder || TextEncoder;

const createChromeMock = () => ({
    runtime: {
      connect: jest.fn(),
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
          const result = { ...(defaults || {}) };
          if (typeof callback === 'function') {
            callback(result);
            return undefined;
          }
          return Promise.resolve(result);
        }),
        set: jest.fn((items, callback) => {
          if (typeof callback === 'function') callback();
        }),
      },
    },
  });

// Provide a default chrome mock immediately so modules that access chrome at import time can load.
global.chrome = global.chrome || createChromeMock();

beforeEach(() => {
  document.body.innerHTML = '';
  global.chrome = createChromeMock();
});


