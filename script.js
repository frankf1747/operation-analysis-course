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

document.addEventListener('DOMContentLoaded', () => {
  initChecklists();
  injectLangToggle();
  injectNotesPanel();
  const lang = localStorage.getItem('site_lang') || 'en';
  adjustSidebarLinks(lang);
  syncLangOnLoad();
});
