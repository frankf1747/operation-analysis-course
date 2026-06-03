// MGMTMSA 408 Final Exam Review — language toggle, sticky notes, checklist persistence

// ====== Persist checklist state ======
function initChecklists() {
  document.querySelectorAll('.checklist input[type="checkbox"]').forEach((cb, i) => {
    const key = 'check_' + i;
    if (localStorage.getItem(key) === 'true') cb.checked = true;
    cb.addEventListener('change', () => localStorage.setItem(key, cb.checked));
  });
}

// ====== Page detection ======
function getCurrentFile() {
  // Netlify "Pretty URLs" strips .html; re-add it so regex/string checks below
  // work whether the URL is /week1 or /week1.html.
  let f = window.location.pathname.split('/').pop() || 'index.html';
  if (f && !f.endsWith('.html')) f += '.html';
  return f;
}

function isWeekPage() {
  return /^week[1-8](_zh)?\.html$/.test(getCurrentFile());
}

// ====== Language toggle (floating FAB) ======
function injectLangToggle() {
  const btn = document.createElement('button');
  btn.id = 'lang-toggle';
  btn.className = 'lang-toggle-fab';
  btn.type = 'button';
  const currentLang = localStorage.getItem('site_lang') || 'en';
  btn.innerHTML = '<span class="lang-icon">🌐</span> <span class="lang-label">' +
                  (currentLang === 'en' ? '中文' : 'English') + '</span>';
  btn.title = 'Switch language / 切换语言';
  document.body.appendChild(btn);

  btn.addEventListener('click', () => {
    const current = localStorage.getItem('site_lang') || 'en';
    const next = (current === 'en') ? 'zh' : 'en';
    localStorage.setItem('site_lang', next);

    if (isWeekPage()) {
      // Toggle clicks DO need to fire the event so content swaps
      applyWeekLang(next, true);
      adjustSidebarLinks(next);
      btn.querySelector('.lang-label').textContent = (next === 'en') ? '中文' : 'English';
    } else {
      const file = getCurrentFile();
      let target;
      if (next === 'zh') {
        target = file.endsWith('_zh.html') ? file : file.replace('.html', '_zh.html');
      } else {
        target = file.replace('_zh.html', '.html');
      }
      window.location.href = target;
    }
  });
}

function applyWeekLang(lang, fireEvent) {
  document.documentElement.lang = (lang === 'zh') ? 'zh-CN' : 'en';
  if (fireEvent) {
    window.dispatchEvent(new CustomEvent('langchange', { detail: lang }));
  }
}

function syncLangOnLoad() {
  const savedLang = localStorage.getItem('site_lang') || 'en';
  const file = getCurrentFile();

  if (isWeekPage()) {
    // Don't fire langchange — the inline script in the week page already rendered initial content
    applyWeekLang(savedLang, false);
    return;
  }

  const onZh = file.endsWith('_zh.html');
  if (savedLang === 'zh' && !onZh) {
    const zhFile = file.replace('.html', '_zh.html');
    fetch(zhFile, { method: 'HEAD' })
      .then(r => { if (r.ok) window.location.replace(zhFile); })
      .catch(() => {});
  } else if (savedLang === 'en' && onZh) {
    const enFile = file.replace('_zh.html', '.html');
    window.location.replace(enFile);
  }
}

// Adjust sidebar links so cross-page navigation keeps language
function adjustSidebarLinks(lang) {
  document.querySelectorAll('.sidebar nav a').forEach(a => {
    const href = a.getAttribute('href') || '';
    const fileName = href.split('/').pop();
    if (/^week[1-8]\.html$/.test(fileName)) return;
    if (lang === 'zh' && !fileName.endsWith('_zh.html') && fileName.endsWith('.html')) {
      a.setAttribute('href', fileName.replace('.html', '_zh.html'));
    } else if (lang === 'en' && fileName.endsWith('_zh.html')) {
      a.setAttribute('href', fileName.replace('_zh.html', '.html'));
    }
  });
}

// ====== Sticky Notes Panel ======
function injectNotesPanel() {
  // The collapsed tab (always visible)
  const tab = document.createElement('button');
  tab.id = 'notes-tab';
  tab.className = 'notes-tab';
  tab.type = 'button';
  tab.title = 'Open notes / 打开笔记';
  tab.innerHTML = '<span class="notes-tab-icon">📝</span>';

  // The expanded panel
  const panel = document.createElement('div');
  panel.id = 'notes-panel';
  panel.className = 'notes-panel collapsed';
  const lang = localStorage.getItem('site_lang') || 'en';
  const heading = (lang === 'zh') ? '📝 我的学习笔记' : '📝 My Study Notes';
  const placeholder = (lang === 'zh')
    ? '在此记下你的学习笔记...\n(自动保存到本地浏览器，刷新或切换页面后仍然存在)'
    : 'Take your study notes here...\n(auto-saved in your browser; persists across pages and reloads)';
  const savedTxt = (lang === 'zh') ? '已保存 ✓' : 'Saved ✓';
  const clearBtnTxt = (lang === 'zh') ? '清空' : 'Clear';

  panel.innerHTML = `
    <div class="notes-header">
      <span class="notes-title">${heading}</span>
      <button class="notes-close" type="button" title="Close / 关闭">×</button>
    </div>
    <textarea id="notes-textarea" placeholder="${placeholder}"></textarea>
    <div class="notes-footer">
      <span class="notes-saved-indicator">${savedTxt}</span>
      <button class="notes-clear" type="button">${clearBtnTxt}</button>
    </div>
  `;

  document.body.appendChild(panel);
  document.body.appendChild(tab);

  const textarea = panel.querySelector('#notes-textarea');
  const savedIndicator = panel.querySelector('.notes-saved-indicator');

  // Restore saved notes
  const saved = localStorage.getItem('site_notes') || '';
  textarea.value = saved;

  // Auto-save (debounced)
  let saveTimer = null;
  textarea.addEventListener('input', () => {
    savedIndicator.classList.add('saving');
    savedIndicator.textContent = (localStorage.getItem('site_lang') === 'zh') ? '保存中...' : 'Saving...';
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      localStorage.setItem('site_notes', textarea.value);
      savedIndicator.classList.remove('saving');
      savedIndicator.textContent = (localStorage.getItem('site_lang') === 'zh') ? '已保存 ✓' : 'Saved ✓';
    }, 400);
  });

  // Open / close behavior
  function openPanel() {
    panel.classList.remove('collapsed');
    tab.classList.add('hidden');
  }
  function closePanel() {
    panel.classList.add('collapsed');
    tab.classList.remove('hidden');
  }

  tab.addEventListener('click', openPanel);
  panel.querySelector('.notes-close').addEventListener('click', closePanel);

  // Clear button (confirm first)
  panel.querySelector('.notes-clear').addEventListener('click', () => {
    const msg = (localStorage.getItem('site_lang') === 'zh')
      ? '确定要清空所有笔记吗？'
      : 'Clear all notes?';
    if (confirm(msg)) {
      textarea.value = '';
      localStorage.setItem('site_notes', '');
      savedIndicator.textContent = (localStorage.getItem('site_lang') === 'zh') ? '已清空' : 'Cleared';
    }
  });

  // Remember open/closed state
  const wasOpen = localStorage.getItem('notes_open') === 'true';
  if (wasOpen) openPanel();

  // Persist on toggle
  tab.addEventListener('click', () => localStorage.setItem('notes_open', 'true'));
  panel.querySelector('.notes-close').addEventListener('click', () => localStorage.setItem('notes_open', 'false'));
}

// ====== Highlighter (select text → pick a color) ======
function injectHighlighter() {
  const SKIP_TAGS = new Set(['code', 'pre', 'script', 'style', 'svg', 'aside', 'nav', 'button', 'textarea', 'input']);
  function isHighlightableTextNode(node, root) {
    let p = node.parentElement;
    while (p && p !== root) {
      const tag = p.tagName && p.tagName.toLowerCase();
      if (SKIP_TAGS.has(tag)) return false;
      if (tag && tag.indexOf('mjx-') === 0) return false;
      p = p.parentElement;
    }
    return true;
  }
  function* iterTextNodes(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: n => {
        // Skip empty text nodes — they confuse offset arithmetic when a 0-length
        // node sits at a boundary (e.g. the empty <span>s from tex2jax_ignore wrappers).
        if (!n.nodeValue || n.nodeValue.length === 0) return NodeFilter.FILTER_REJECT;
        return isHighlightableTextNode(n, root) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    let n; while ((n = walker.nextNode())) yield n;
  }
  function getCharOffset(root, container, containerOffset) {
    if (container.nodeType === Node.ELEMENT_NODE) {
      // Normalize: convert element + child offset to text node + offset
      const child = container.childNodes[containerOffset];
      if (child && child.nodeType === Node.TEXT_NODE) {
        container = child; containerOffset = 0;
      } else if (child) {
        const w = document.createTreeWalker(child, NodeFilter.SHOW_TEXT);
        const t = w.nextNode();
        if (t) { container = t; containerOffset = 0; }
      }
    }
    let total = 0;
    for (const node of iterTextNodes(root)) {
      if (node === container) return total + containerOffset;
      total += node.textContent.length;
    }
    return -1;
  }
  function rangeFromOffsets(root, start, end) {
    let pos = 0;
    let startNode = null, startOffset = 0, endNode = null, endOffset = 0;
    for (const node of iterTextNodes(root)) {
      const len = node.textContent.length;
      // For start: prefer pos+len > start (interior) over pos+len === start (boundary).
      // A boundary start would put the range at the END of an unrelated text node and
      // force the range to cross element boundaries → bad surroundContents.
      if (!startNode && pos + len > start) { startNode = node; startOffset = start - pos; }
      // For end: pos+len >= end is fine; offset clamps to len at the boundary.
      if (startNode && pos + len >= end) { endNode = node; endOffset = end - pos; break; }
      pos += len;
    }
    if (!startNode || !endNode) return null;
    const range = document.createRange();
    try { range.setStart(startNode, startOffset); range.setEnd(endNode, endOffset); } catch (e) { return null; }
    return range;
  }
  function wrapRange(range, cls) {
    const span = document.createElement('span');
    span.className = cls;
    try { range.surroundContents(span); }
    catch (e) {
      span.appendChild(range.extractContents());
      range.insertNode(span);
    }
  }

  function getHighlightRoot() {
    return document.getElementById('content') || document.querySelector('main') || document.body;
  }
  function pageKey() {
    const file = getCurrentFile();
    const lang = (typeof isWeekPage === 'function' && isWeekPage())
      ? (localStorage.getItem('site_lang') || 'en')
      : ''; // non-week pages already have separate _zh files
    return 'highlights_' + file + (lang ? '_' + lang : '');
  }

  function collectExistingHighlights() {
    const root = getHighlightRoot();
    if (!root) return [];
    const out = [];
    root.querySelectorAll('.hl-y, .hl-g').forEach(el => {
      const color = el.classList.contains('hl-y') ? 'y' : 'g';
      // Compute offset of this span's first text + length
      const first = el.firstChild;
      if (!first) return;
      const start = getCharOffset(root, first, 0);
      const len = el.textContent.length;
      if (start < 0) return;
      out.push({ start, end: start + len, color });
    });
    return out;
  }
  function save() {
    try { localStorage.setItem(pageKey(), JSON.stringify(collectExistingHighlights())); } catch (e) {}
  }
  let restoreInFlight = false;
  function restore() {
    if (restoreInFlight) return;
    restoreInFlight = true;
    try {
      const root = getHighlightRoot();
      if (!root) return;
      // Already restored?
      if (root.querySelector('.hl-y, .hl-g')) return;
      const data = JSON.parse(localStorage.getItem(pageKey()) || '[]');
      if (!Array.isArray(data) || !data.length) return;
      // Apply in reverse start-order so earlier offsets aren't affected by structural splits.
      data.sort((a, b) => b.start - a.start);
      data.forEach(({ start, end, color }) => {
        const range = rangeFromOffsets(root, start, end);
        if (!range) return;
        wrapRange(range, 'hl-' + color);
      });
    } finally {
      restoreInFlight = false;
    }
  }

  // ----- Popup UI -----
  const popup = document.createElement('div');
  popup.className = 'hl-popup';
  popup.innerHTML = '<button class="hl-swatch yellow" data-color="y" title="Yellow"></button>'
                  + '<button class="hl-swatch green" data-color="g" title="Green"></button>'
                  + '<button class="hl-remove" title="Remove highlight">×</button>';
  document.body.appendChild(popup);
  const removeBtn = popup.querySelector('.hl-remove');

  let pendingRange = null;
  let pendingExisting = null; // existing highlight span clicked

  function hidePopup() {
    popup.classList.remove('visible');
    pendingRange = null;
    pendingExisting = null;
  }
  function showPopupAt(rect) {
    popup.classList.add('visible'); // need visible to measure
    const w = popup.offsetWidth, h = popup.offsetHeight;
    let left = window.scrollX + rect.left + rect.width / 2 - w / 2;
    let top = window.scrollY + rect.top - h - 10;
    if (top < window.scrollY + 4) top = window.scrollY + rect.bottom + 10; // flip below if too close to top
    left = Math.max(8, Math.min(window.scrollX + document.documentElement.clientWidth - w - 8, left));
    popup.style.left = left + 'px';
    popup.style.top = top + 'px';
  }

  document.addEventListener('mouseup', (e) => {
    if (popup.contains(e.target)) return;
    setTimeout(() => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.toString().trim()) return;
      const root = getHighlightRoot();
      if (!root || !root.contains(sel.anchorNode) || !root.contains(sel.focusNode)) return;
      const range = sel.getRangeAt(0);
      // Reject selections that include skipped tags (math, code)
      if (!isHighlightableTextNode(range.startContainer.nodeType === Node.TEXT_NODE ? range.startContainer : range.startContainer.firstChild || range.startContainer, root)) return;
      pendingRange = range.cloneRange();
      pendingExisting = null;
      removeBtn.style.display = 'none';
      showPopupAt(range.getBoundingClientRect());
    }, 0);
  });

  // Click an existing highlight → show popup with remove + recolor options
  document.addEventListener('click', (e) => {
    const hl = e.target.closest('.hl-y, .hl-g');
    if (!hl) {
      if (!popup.contains(e.target)) {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed) hidePopup();
      }
      return;
    }
    e.stopPropagation();
    pendingExisting = hl;
    pendingRange = null;
    removeBtn.style.display = 'inline-flex';
    showPopupAt(hl.getBoundingClientRect());
  });

  popup.addEventListener('click', (e) => {
    const swatch = e.target.closest('.hl-swatch');
    const removeBtn = e.target.closest('.hl-remove');
    if (swatch) {
      const color = swatch.dataset.color;
      if (pendingRange) {
        wrapRange(pendingRange, 'hl-' + color);
        window.getSelection().removeAllRanges();
      } else if (pendingExisting) {
        pendingExisting.className = 'hl-' + color;
      }
      hidePopup();
      save();
    } else if (removeBtn && pendingExisting) {
      const parent = pendingExisting.parentNode;
      while (pendingExisting.firstChild) parent.insertBefore(pendingExisting.firstChild, pendingExisting);
      parent.removeChild(pendingExisting);
      parent.normalize();
      hidePopup();
      save();
    }
  });

  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hidePopup(); });
  window.addEventListener('scroll', hidePopup, { passive: true });

  // Restore on initial DOM render (with a short delay for MathJax-driven layout)
  setTimeout(restore, 600);

  // For week pages: content gets re-rendered on language change. Restore after that.
  window.addEventListener('langchange', () => {
    // Wait for inline renderContent + MathJax to settle
    setTimeout(restore, 2500);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initChecklists();
  injectLangToggle();
  injectNotesPanel();
  injectHighlighter();
  const lang = localStorage.getItem('site_lang') || 'en';
  adjustSidebarLinks(lang);
  syncLangOnLoad();
});
