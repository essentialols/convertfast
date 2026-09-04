export function enableKeyboardDropZone(dropZoneSelector = '#drop-zone', fileInputSelector = '#file-input') {
  const dropZone = typeof dropZoneSelector === 'string'
    ? document.querySelector(dropZoneSelector)
    : dropZoneSelector;
  const fileInput = typeof fileInputSelector === 'string'
    ? document.querySelector(fileInputSelector)
    : fileInputSelector;
  if (!dropZone || !fileInput) return;

  if (!dropZone.hasAttribute('role')) dropZone.setAttribute('role', 'button');
  if (!dropZone.hasAttribute('tabindex')) dropZone.tabIndex = 0;
  if (fileInput.id) dropZone.setAttribute('aria-controls', fileInput.id);
  if (!dropZone.hasAttribute('aria-label')) dropZone.setAttribute('aria-label', 'Choose files');

  if (dropZone.dataset.kbdDropReady === '1') return;
  dropZone.dataset.kbdDropReady = '1';
  dropZone.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    fileInput.click();
  });
}

function syncFaqItem(item, index) {
  const btn = item.querySelector('.faq-question');
  const answer = item.querySelector('.faq-answer');
  if (!btn || !answer) return;

  if (!answer.id) answer.id = `faq-answer-${index + 1}`;
  btn.setAttribute('aria-controls', answer.id);
  const isOpen = item.classList.contains('open');
  btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  answer.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
}

export function enhanceFaqSemantics(root = document) {
  const items = Array.from(root.querySelectorAll('.faq-item'));
  if (items.length === 0) return;

  items.forEach((item, index) => syncFaqItem(item, index));
  if (document.documentElement.dataset.faqA11yReady === '1') return;
  document.documentElement.dataset.faqA11yReady = '1';

  document.addEventListener('click', (event) => {
    const btn = event.target.closest('.faq-question');
    if (!btn) return;
    requestAnimationFrame(() => {
      document.querySelectorAll('.faq-item').forEach((item, index) => syncFaqItem(item, index));
    });
  }, true);
}

export function normalizeActionLabels(root = document) {
  root.querySelectorAll('button').forEach((btn) => {
    if (btn.dataset.labelNormalized === '1') return;
    const text = btn.textContent ? btn.textContent.trim() : '';
    if (text === 'Clear') btn.textContent = 'Clear All';
    btn.dataset.labelNormalized = '1';
  });
}

function detectInteractionMode(root = document) {
  const convertBtn = root.querySelector('#action-btn, #convert-btn, [data-action=\"convert\"]');
  if (convertBtn) return 'manual';
  return 'auto';
}

export function injectInteractionHint(options = {}) {
  const {
    dropZoneSelector = '#drop-zone',
    hintId = 'interaction-mode-hint',
    manualText = 'Mode: choose files, then click Convert.',
    autoText = 'Mode: processing starts automatically after you add files.',
  } = options;

  const dropZone = document.querySelector(dropZoneSelector);
  if (!dropZone) return;

  const existing = document.getElementById(hintId);
  if (existing) {
    existing.textContent = detectInteractionMode(document) === 'manual' ? manualText : autoText;
    return;
  }

  const hint = document.createElement('p');
  hint.id = hintId;
  hint.className = 'interaction-mode-hint';
  hint.textContent = detectInteractionMode(document) === 'manual' ? manualText : autoText;
  dropZone.insertAdjacentElement('afterend', hint);
}

export function injectPreflightBadge(options = {}) {
  const dropZoneSelector = options.dropZoneSelector || '#drop-zone';
  const dropZone = document.querySelector(dropZoneSelector);
  if (!dropZone || !options.preflight) return;

  const preflight = typeof options.preflight === 'string'
    ? { text: options.preflight }
    : options.preflight;
  if (!preflight.text) return;

  const badgeId = preflight.id || 'preflight-badge';
  let badge = document.getElementById(badgeId);
  if (!badge) {
    badge = document.createElement('div');
    badge.id = badgeId;
    badge.className = 'preflight-badge';
    badge.setAttribute('role', 'status');
    badge.setAttribute('aria-live', 'polite');
    badge.setAttribute('aria-atomic', 'true');

    const text = document.createElement('span');
    text.className = 'preflight-badge__text';
    badge.appendChild(text);

    if (preflight.dismissible) {
      const dismiss = document.createElement('button');
      dismiss.type = 'button';
      dismiss.className = 'preflight-badge__dismiss';
      dismiss.textContent = 'Dismiss';
      dismiss.setAttribute('aria-label', 'Dismiss preflight notice');
      dismiss.addEventListener('click', () => {
        badge.style.display = 'none';
      });
      badge.appendChild(dismiss);
    }
  }

  const textNode = badge.querySelector('.preflight-badge__text');
  if (textNode) textNode.textContent = preflight.text;
  badge.style.display = '';

  const hint = document.getElementById(options.hintId || 'interaction-mode-hint');
  if (!badge.parentElement) {
    const anchor = hint && hint.parentElement === dropZone.parentElement ? hint : dropZone;
    anchor.insertAdjacentElement('afterend', badge);
  }
}

export function syncDropZoneCompactState(options = {}) {
  const dropZone = document.querySelector(options.dropZoneSelector || '#drop-zone');
  const fileList = document.querySelector(options.fileListSelector || '#file-list');
  if (!dropZone || !fileList) return;

  const sync = () => {
    dropZone.classList.toggle('compact', fileList.children.length > 0);
  };

  sync();
  const observer = new MutationObserver(sync);
  observer.observe(fileList, { childList: true });
  return observer;
}

export function applyPageUX(options = {}) {
  enableKeyboardDropZone(options.dropZoneSelector, options.fileInputSelector);
  enhanceFaqSemantics(document);
  normalizeActionLabels(document);
  if (options.showInteractionHint !== false) {
    injectInteractionHint(options);
  }
  injectPreflightBadge(options);
  if (options.syncDropZoneCompact) {
    syncDropZoneCompactState(options);
  }
}
