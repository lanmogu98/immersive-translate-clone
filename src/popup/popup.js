document.getElementById('btn-translate').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    chrome.tabs.sendMessage(tab.id, { action: 'start_translation' });
    window.close();
  }
});

document.getElementById('link-options').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});
