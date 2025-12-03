console.log('[SanityShield] Content script loaded on', window.location.href);
window.SanityShieldLoaded = true;

// Current settings
let sanitySettings = {
  enabled: true,
  keywords: ['politics', 'war', 'election', 'crisis']
};

// Get initial settings
chrome.storage.sync.get(sanitySettings, (data) => {
  sanitySettings = data;
  runFiltering();
});

// Listen for settings changes
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync') return;

  if (changes.enabled) {
    sanitySettings.enabled = changes.enabled.newValue;
  }
  if (changes.keywords) {
    sanitySettings.keywords = changes.keywords.newValue;
  }

  // Re-run on changes
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


function textMatchesBlocked(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return sanitySettings.keywords.some(kw =>
    kw && lower.includes(kw.toLowerCase())
  );
}

function blurElement(el) {
  if (el.classList.contains('sanityshield-blur')) return;

  el.classList.add('sanityshield-blur');

  const overlay = document.createElement('div');
  overlay.className = 'sanityshield-overlay';
  overlay.textContent = 'Hidden by SanityShield - click to reveal';

  overlay.addEventListener('click', (e) => {
    e.stopPropagation();
    el.classList.remove('sanityshield-blur');
    overlay.remove();
  });

  el.appendChild(overlay);
}

function filterReddit() {
  console.log('[SanityShield] Filtering Reddit posts (shreddit-post)...');

  // All main post components
  const posts = document.querySelectorAll('shreddit-post');

  console.log('[SanityShield] Found shreddit-post elements:', posts.length);

  posts.forEach(post => {
    if (post.dataset.sanityChecked === '1') return;

    // 1) Get title from attribute
    const title = post.getAttribute('post-title') || '';

    // 2) Get subreddit from attribute
    const subreddit = post.getAttribute('subreddit-prefixed-name') || '';

    // 3) Get text body preview if available
    const bodyEl = post.querySelector('[property="schema:articleBody"]');
    const bodyText = bodyEl ? bodyEl.innerText : '';

    // 4) Combine text for keyword-based filtering
    const combinedText = `${title}\n${bodyText}\n${subreddit}`;

    const byKeyword = textMatchesBlocked(combinedText);

    // If you have subreddit-based blocking, use it here
    let bySubreddit = false;
    if (typeof subredditMatchesBlocked === 'function') {
      bySubreddit = subredditMatchesBlocked(subreddit);
    }

    if (byKeyword || bySubreddit) {
      console.log('[SanityShield] Blurring Reddit post:', {
        subreddit,
        title,
        byKeyword,
        bySubreddit
      });
      blurElement(post);
    }

    post.dataset.sanityChecked = '1';
  });
}

function filterTwitter() {
  console.log('[SanityShield] Filtering X/Twitter tweets...');

  // Each tweet in the feed
  const tweets = document.querySelectorAll('article[data-testid="tweet"]');
  console.log('[SanityShield] Found tweets:', tweets.length);

  tweets.forEach(tweet => {
    // Avoid re-processing same tweet
    if (tweet.dataset.sanityChecked === '1') return;

    // 1) Tweet main text
    const textEl = tweet.querySelector('div[data-testid="tweetText"]');
    const text = textEl ? textEl.innerText : '';

    // 2) Username / handle (optional, for author-based filtering)
    const userBlock = tweet.querySelector('div[data-testid="User-Name"]');
    let name = '';
    let handle = '';

    if (userBlock) {
      const nameSpan = userBlock.querySelector('a[role="link"] div[dir="ltr"] span span');
      if (nameSpan) name = nameSpan.innerText;

      const handleSpan = userBlock.querySelector('a[tabindex="-1"] div[dir="ltr"] span');
      if (handleSpan) handle = handleSpan.innerText; // like @narendramodi
    }

    const combinedText = `${name}\n${handle}\n${text}`;

    const byKeyword = textMatchesBlocked(combinedText);
    let byAuthor = false;

    if (typeof authorMatchesBlocked === 'function') {
      byAuthor = authorMatchesBlocked(handle || name);
    }

    if (byKeyword || byAuthor) {
      console.log('[SanityShield] Blurring tweet:', {
        name,
        handle,
        preview: text.slice(0, 80),
        byKeyword,
        byAuthor
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
