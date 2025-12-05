const enabledToggle = document.getElementById('enabledToggle');
const keywordsTextarea = document.getElementById('keywords');
const saveButton = document.getElementById('saveButton');
const status = document.getElementById('status');
const keywordSummary = document.getElementById('keywordSummary');
const keywordChips = document.getElementById('keywordChips');

const DEFAULT_SETTINGS = {
  enabled: true,
  keywords: []
};

function parseKeywordsFromTextarea() {
  return keywordsTextarea.value
    .split('\n')
    .map(k => k.trim())
    .filter(k => k.length > 0);
}

function renderKeywordsUI(keywords) {
  if (keywords.length === 0) {
    keywordSummary.textContent = 'No keywords yet. Add words that stress you out.';
  } else if (keywords.length === 1) {
    keywordSummary.textContent = '1 keyword active.';
  } else {
    keywordSummary.textContent = `${keywords.length} keywords active.`;
  }

  keywordChips.innerHTML = '';

  keywords.forEach((kw) => {
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.textContent = kw;

    const removeBtn = document.createElement('button');
    removeBtn.className = 'chip-remove';
    removeBtn.type = 'button';
    removeBtn.textContent = '✕';

    removeBtn.addEventListener('click', () => {
      const current = parseKeywordsFromTextarea();
      const next = current.filter(k => k !== kw);
      keywordsTextarea.value = next.join('\n');
      renderKeywordsUI(next);
    });

    chip.appendChild(removeBtn);
    keywordChips.appendChild(chip);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.sync.get(DEFAULT_SETTINGS, (data) => {
    enabledToggle.checked = data.enabled;

    const storedKeywords = Array.isArray(data.keywords) ? data.keywords : [];

    const fromStorage = storedKeywords
      .map(k => k.trim())
      .filter(k => k.length > 0);

    keywordsTextarea.value = fromStorage.join('\n');

    renderKeywordsUI(fromStorage);
  });

  keywordsTextarea.addEventListener('input', () => {
    const current = parseKeywordsFromTextarea();
    renderKeywordsUI(current);
  });
});

saveButton.addEventListener('click', () => {
  const enabled = enabledToggle.checked;
  const keywords = parseKeywordsFromTextarea();

  chrome.storage.sync.set({ enabled, keywords }, () => {
    status.textContent = 'Saved!';
    setTimeout(() => status.textContent = '', 1500);
  });
});
