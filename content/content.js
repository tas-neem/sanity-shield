console.log('[SanityShield] Content script loaded on', window.location.href);
window.SanityShieldLoaded = true;

let sanitySettings = {
  enabled: true,
  keywords: ['']
};

chrome.storage.sync.get(sanitySettings, (data) => {
  sanitySettings = data;
  runFiltering();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync') return;

  if (changes.enabled) {
    sanitySettings.enabled = changes.enabled.newValue;
  }
  if (changes.keywords) {
    sanitySettings.keywords = changes.keywords.newValue;
  }

  runFiltering(true);
});

function runFiltering(force = false) {
  if (!sanitySettings.enabled) {
    console.log('[SanityShield] Filtering disabled, skipping');
    return;
  }

  const host = window.location.hostname;
  console.log('[SanityShield] Running filter on host:', host);

  if (host.includes('reddit.com')) {
    filterReddit(force);
  } else if (host.includes('twitter.com') || host.includes('x.com')) {
    filterTwitter(force);
  }
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function textMatchesBlocked(text) {
  if (!text) return false;

  for (const kw of sanitySettings.keywords) {
    if (!kw) continue;

    const trimmed = kw.trim();
    if (!trimmed) continue;

    const pattern = new RegExp(`\\b${escapeRegex(trimmed)}\\w*`, 'i');

    if (pattern.test(text)) {
      console.log(`[SanityShield] Matched keyword: "${trimmed}"`);
      return trimmed; 
    }
  }

  return false;
}

function blurElement(el) {
  if (el.classList.contains('sanityshield-wrapped')) return;

  el.classList.add('sanityshield-wrapped');

  const blurWrapper = document.createElement('div');
  blurWrapper.className = 'sanityshield-blur-inner';

  while (el.firstChild) {
    blurWrapper.appendChild(el.firstChild);
  }

  el.appendChild(blurWrapper);

  const overlay = document.createElement('div');
  overlay.className = 'sanityshield-overlay';
  overlay.textContent = 'Hidden by SanityShield - Click to reveal';

  overlay.addEventListener('click', (e) => {
    e.stopPropagation();

    while (blurWrapper.firstChild) {
      el.appendChild(blurWrapper.firstChild);
    }

    blurWrapper.remove();
    overlay.remove();     
    el.classList.remove('sanityshield-wrapped');
  });

  el.appendChild(overlay);
}

function filterReddit(force = false) {
  console.log('[SanityShield] Filtering Reddit posts (shreddit-post)...');

  const posts = document.querySelectorAll('shreddit-post');
  console.log('[SanityShield] Found shreddit-post elements:', posts.length);

  posts.forEach(post => {
    if (!force && post.dataset.sanityChecked === '1') return;

    const title = post.getAttribute('post-title') || '';

    const bodyEl = post.querySelector('[property="schema:articleBody"]');
    const bodyText = bodyEl ? bodyEl.innerText : '';

    const combinedText = `${title}\n${bodyText}`;

    const byKeyword = textMatchesBlocked(combinedText);

    console.log(combinedText);

    if (byKeyword) {
      console.log('[SanityShield] Blurring Reddit post:', {
        title,
        byKeyword
      });
      blurElement(post);
    }

    post.dataset.sanityChecked = '1';
  });
}

function filterTwitter(force = false) {
  console.log('[SanityShield] Filtering X/Twitter tweets...');

  const tweets = document.querySelectorAll('article[data-testid="tweet"]');
  console.log('[SanityShield] Found tweets:', tweets.length);

  tweets.forEach(tweet => {
    if (!force && tweet.dataset.sanityChecked === '1') return;

    const textEl = tweet.querySelector('div[data-testid="tweetText"]');
    const text = textEl ? textEl.innerText : '';

    const userBlock = tweet.querySelector('div[data-testid="User-Name"]');
    let name = '';
    let handle = '';

    if (userBlock) {
      const nameSpan = userBlock.querySelector('a[role="link"] div[dir="ltr"] span span');
      if (nameSpan) name = nameSpan.innerText;

      const handleSpan = userBlock.querySelector('a[tabindex="-1"] div[dir="ltr"] span');
      if (handleSpan) handle = handleSpan.innerText;
    }

    const combinedText = `${name}\n${handle}\n${text}`;

    const byKeyword = textMatchesBlocked(combinedText);

    if (byKeyword) {
      console.log('[SanityShield] Blurring tweet:', {
        name,
        handle,
        preview: text.slice(0, 80),
        byKeyword
      });
      blurElement(tweet);
    }

    tweet.dataset.sanityChecked = '1';
  });
}

setInterval(() => {
  if (sanitySettings.enabled) {
    runFiltering();
  }
}, 2000);
