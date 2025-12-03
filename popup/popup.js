const enabledToggle = document.getElementById('enabledToggle');
const keywordsTextarea = document.getElementById('keywords');
const saveButton = document.getElementById('saveButton');
const status = document.getElementById('status');

// Default settings
const DEFAULT_SETTINGS = {
  enabled: true,
  keywords: ['']
};

document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.sync.get(DEFAULT_SETTINGS, (data) => {
    enabledToggle.checked = data.enabled;
    keywordsTextarea.value = data.keywords.join('\n');
  });
});

saveButton.addEventListener('click', () => {
  const enabled = enabledToggle.checked;
  const keywords = keywordsTextarea.value
    .split('\n')
    .map(k => k.trim())
    .filter(k => k.length > 0);

  chrome.storage.sync.set({ enabled, keywords }, () => {
    status.textContent = 'Saved!';
    setTimeout(() => status.textContent = '', 1500);
  });
});
