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

describe('options page', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('rejects invalid API URL and does not save', () => {
    jest.resetModules();
    setupOptionsDom();

    require('../src/options/options.js');

    document.getElementById('providerId').value = 'custom';
    document.getElementById('apiUrl').value = 'api.openai.com/v1';
    document.getElementById('apiKey').value = 'k';
    document.getElementById('modelName').value = 'm';
    document.getElementById('targetLanguage').value = 'zh-CN';

    document.getElementById('save').click();

    expect(document.getElementById('status').textContent).toMatch(
      'Invalid API URL. Must start with http:// or https://'
    );
    expect(chrome.storage.sync.set).not.toHaveBeenCalled();
  });

  test('saves valid options and clears success status after 2s', () => {
    jest.resetModules();
    setupOptionsDom();

    require('../src/options/options.js');

    document.getElementById('providerId').value = 'custom';
    document.getElementById('apiUrl').value = 'https://api.openai.com/v1';
    document.getElementById('apiKey').value = 'k';
    document.getElementById('modelName').value = 'm';
    document.getElementById('targetLanguage').value = 'zh-CN';
    document.getElementById('userTranslationPrompt').value = 'prompt';
    document.getElementById('excludedDomains').value = 'example.com\n*.internal.com';
    document.getElementById('excludedSelectors').value = '.no-translate\n[data-no-translate]';

    document.getElementById('save').click();

    expect(chrome.storage.sync.set).toHaveBeenCalledTimes(1);
    expect(document.getElementById('status').textContent).toBe('Options saved.');

    jest.advanceTimersByTime(2000);
    expect(document.getElementById('status').textContent).toBe('');
  });

  test('restores defaults on DOMContentLoaded', () => {
    jest.resetModules();
    setupOptionsDom();

    require('../src/options/options.js');

    document.dispatchEvent(new Event('DOMContentLoaded'));

    expect(document.getElementById('apiUrl').value).toBe('https://ark.cn-beijing.volces.com/api/v3');
    expect(document.getElementById('modelName').value).toBe('deepseek-v3-2-251201');
  });
});


