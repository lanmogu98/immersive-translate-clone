const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

function setupPopupDom() {
  document.body.innerHTML = `
    <button id="btn-translate">Translate</button>
    <a id="link-options" href="#">Options</a>
  `;
}

describe('popup translate button', () => {
  test('shows a user-friendly error if content script is not available and injection fails', async () => {
    jest.resetModules();
    setupPopupDom();

    window.close = jest.fn();

    chrome.tabs.query.mockResolvedValue([{ id: 123, url: 'https://example.com/page' }]);
    chrome.tabs.sendMessage.mockRejectedValue(new Error('Could not establish connection'));
    chrome.scripting.executeScript.mockRejectedValue(new Error('inject failed'));
    chrome.scripting.insertCSS.mockRejectedValue(new Error('inject css failed'));

    require('../src/popup/popup.js');

    document.getElementById('btn-translate').click();
    await flushPromises();
    await flushPromises();

    const status = document.getElementById('popup-status');
    expect(status).not.toBeNull();
    expect(status.textContent).toBe('Cannot translate this page.');
  });

  test('blocks restricted/internal pages with a clear message', async () => {
    jest.resetModules();
    setupPopupDom();

    chrome.tabs.query.mockResolvedValue([{ id: 123, url: 'chrome://extensions' }]);

    require('../src/popup/popup.js');

    document.getElementById('btn-translate').click();
    await flushPromises();

    const status = document.getElementById('popup-status');
    expect(status).not.toBeNull();
    expect(status.textContent).toBe('Cannot translate this page (browser internal page).');
    expect(chrome.tabs.sendMessage).not.toHaveBeenCalled();
  });
});


