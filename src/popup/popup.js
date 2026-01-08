document.getElementById('btn-translate').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) {
    showStatus('No active tab found.', true);
    return;
  }

  // Check if this is a restricted page where content scripts cannot run
  const restrictedProtocols = ['chrome:', 'chrome-extension:', 'about:', 'edge:', 'brave:'];
  if (tab.url && restrictedProtocols.some(p => tab.url.startsWith(p))) {
    showStatus('Cannot translate this page (browser internal page).', true);
    return;
  }

  try {
    await chrome.tabs.sendMessage(tab.id, { action: 'start_translation' });
    window.close();
  } catch (e) {
    // Content script not loaded - try injecting it first
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['src/utils/llm-client.js', 'src/utils/lang-detect.js', 'src/utils/dom-utils.js', 'src/utils/richtext-v2.js', 'src/content.js']
      });
      await chrome.scripting.insertCSS({
        target: { tabId: tab.id },
        files: ['src/content.css']
      });
      await chrome.tabs.sendMessage(tab.id, { action: 'start_translation' });
      window.close();
    } catch (injectError) {
      showStatus('Cannot translate this page.', true);
    }
  }
});

function showStatus(message, isError = false) {
  let status = document.getElementById('popup-status');
  if (!status) {
    status = document.createElement('div');
    status.id = 'popup-status';
    status.style.cssText = 'margin-top: 10px; font-size: 12px; text-align: center;';
    document.body.appendChild(status);
  }
  status.textContent = message;
  status.style.color = isError ? '#e74c3c' : '#27ae60';
}

document.getElementById('link-options').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});
