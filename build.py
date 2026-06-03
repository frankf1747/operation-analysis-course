#!/usr/bin/env python3
"""Build per-week HTML pages from markdown content files (bilingual)."""
import os, html, re

WEEKS = {
    1: ("LP Duality", "对偶性、影子价格", "Bakery LP example, primal-dual, weak/strong duality, shadow prices, complementary slackness"),
    2: ("Revenue Management", "收益管理", "Capacity control LP, bid-price control, single-leg & multi-leg, dynamic re-solving"),
    3: ("Newsvendor Problem", "报童问题", "Critical fractile, CDF inversion (uniform/triangular/normal), empirical & contextual newsvendor"),
    4: ("Location Models", "选址问题", "MCLP, p-median, p-center, formulation strength (strong vs weak constraints)"),
    5: ("Assortment Optimization", "品类选择", "First-choice model, choice probabilities, IP formulation, upper bounds, side constraints"),
    6: ("Pricing", "定价", "Linear demand model, discrete prices IP, bilinear linearization, missing constraints"),
    7: ("Network Flows", "网络流", "MCNF, flow conservation, shortest path, max reliability via logs, piecewise costs"),
    8: ("Traveling Salesman", "旅行商问题", "TSP formulation, subtour elimination, lazy callbacks, getSubtours trace, modifications"),
}

def make_sidebar(current_week):
    items = [
        ('index.html', '🏠 Dashboard', '🏠 主页', None),
        ('strategy.html', '🎯 Exam Strategy', '🎯 考试策略', None),
    ]
    for w, (name, cn, _) in WEEKS.items():
        items.append((f'week{w}.html', f'Week {w} — {name}', f'第{w}周 — {cn}', w))
    items += [
        ('formulas.html', '📐 Formula Sheet', '📐 公式表', None),
        ('templates.html', '🧩 Problem Templates', '🧩 题型模板', None),
        ('crash.html', '🚨 Night Before Exam', '🚨 考前一晚', None),
    ]
    lines = ['<aside class="sidebar">', '<h1>MGMTMSA 408</h1>',
             '<p class="subtitle" data-en="Operations Analytics — Final Review" data-zh="运营分析 — 期末复习">Operations Analytics — Final Review</p>', '<nav>']
    for href, label_en, label_zh, w in items:
        cls = ' class="active"' if w == current_week else ''
        en_attr = html.escape(label_en, quote=True)
        zh_attr = html.escape(label_zh, quote=True)
        lines.append(f'<a href="{href}"{cls} data-en="{en_attr}" data-zh="{zh_attr}">{label_en}</a>')
    lines += ['</nav>', '</aside>']
    return '\n'.join(lines)

def read_md(path):
    if not os.path.exists(path):
        return None
    with open(path) as f:
        return f.read()

def make_week_page(week_num):
    name, cn, topics = WEEKS[week_num]
    md_en = read_md(f'content/week{week_num}.md')
    md_zh = read_md(f'content/week{week_num}_zh.md')

    # Escape closing script tags inside markdown
    def esc(s):
        return s.replace('</script>', '<\\/script>') if s else ''

    md_en_esc = esc(md_en) if md_en else ''
    md_zh_esc = esc(md_zh) if md_zh else ''

    # If Chinese is missing, fall back to English
    if not md_zh_esc:
        md_zh_esc = md_en_esc

    sidebar = make_sidebar(week_num)
    pdf_path = get_pdf_path(week_num)
    html_out = f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Week {week_num} — {name} | MGMTMSA 408</title>
<link rel="stylesheet" href="style.css">
<script>
MathJax = {{
  tex: {{
    inlineMath: [['$','$'],['\\\\(','\\\\)']],
    displayMath: [['$$','$$'],['\\\\[','\\\\]']],
    processEscapes: true
  }},
  options: {{ ignoreHtmlClass: 'tex2jax_ignore', processHtmlClass: 'tex2jax_process' }},
  svg: {{ fontCache: 'global' }}
}};
</script>
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js" async></script>
</head>
<body>
{sidebar}
<main>
<div class="week-banner">
<div class="week-meta">
<span class="week-num" data-en="Week {week_num}" data-zh="第{week_num}周">Week {week_num}</span>
<h1><span data-en="{name}" data-zh="{cn}">{name}</span> <span class="cn">{cn}</span></h1>
<p class="topics" data-en="{topics}" data-zh="{topics}">{topics}</p>
</div>
<div class="open-pdf">
<strong><span data-en="📖 Open lecture PDF alongside:" data-zh="📖 同时打开讲义PDF：">📖 Open lecture PDF alongside:</span></strong><br>
<code>{pdf_path}</code>
</div>
</div>
<article id="content" class="markdown-body"></article>
</main>

<script id="md-en" type="text/markdown">{md_en_esc}</script>
<script id="md-zh" type="text/markdown">{md_zh_esc}</script>

<script>
let __renderInFlight = false;
let __currentLang = null;

// Protect math regions so marked (Markdown parser) doesn't eat _ and * inside them,
// and wrap stray $ (currency) so MathJax doesn't pair them as delimiters.
function __protectMath(src) {{
  const blocks = [];
  const ph = i => '@@@MATHBLOCK' + i + '@@@';
  // First protect any backslash-escaped \$ as literal currency
  const DOLLAR_PH = '@@@DOLLARLITERAL@@@';
  src = src.replace(/\\\\\$/g, DOLLAR_PH);
  // Display math: $$...$$, \[...\]
  src = src.replace(/\$\$([\\s\\S]+?)\$\$/g, m => {{ blocks.push(m); return ph(blocks.length - 1); }});
  src = src.replace(/\\\\\[([\\s\\S]+?)\\\\\]/g, m => {{ blocks.push(m); return ph(blocks.length - 1); }});
  // Inline math: \(...\)
  src = src.replace(/\\\\\(([\\s\\S]+?)\\\\\)/g, m => {{ blocks.push(m); return ph(blocks.length - 1); }});
  // Inline math: $...$ (no whitespace adjacent to either delimiter, content has no $ or newline)
  src = src.replace(/\$([^\\s$][^$\\n]*?[^\\s$]|[^\\s$])\$/g, m => {{ blocks.push(m); return ph(blocks.length - 1); }});
  // Any leftover $ is currency → wrap so MathJax skips it
  src = src.replace(/\$/g, '<span class="tex2jax_ignore">$</span>');
  src = src.split(DOLLAR_PH).join('<span class="tex2jax_ignore">$</span>');
  return {{ src, blocks }};
}}
function __restoreMath(html, blocks) {{
  return html.replace(/@@@MATHBLOCK(\\d+)@@@/g, (_, i) => blocks[+i]);
}}

function renderContent(lang) {{
  // Skip redundant renders for the same language
  if (lang === __currentLang) return;
  if (__renderInFlight) return;
  __renderInFlight = true;

  const id = (lang === 'zh') ? 'md-zh' : 'md-en';
  const rawSrc = document.getElementById(id).textContent;
  const {{ src: protectedSrc, blocks: __mathBlocks }} = __protectMath(rawSrc);
  const contentEl = document.getElementById('content');
  const scrollY = window.scrollY;

  contentEl.innerHTML = __restoreMath(marked.parse(protectedSrc), __mathBlocks);

  // Swap banner labels
  document.querySelectorAll('[data-en][data-zh]').forEach(el => {{
    if (el.children.length === 0) {{
      el.textContent = (lang === 'zh') ? el.dataset.zh : el.dataset.en;
    }}
  }});

  __currentLang = lang;

  const finish = () => {{
    __renderInFlight = false;
    // Preserve scroll position only on language switch, not initial load
    if (scrollY > 0) window.scrollTo(0, scrollY);
  }};

  // Typeset MathJax when ready
  if (window.MathJax && window.MathJax.typesetPromise) {{
    try {{ MathJax.typesetClear([contentEl]); }} catch (e) {{}}
    MathJax.typesetPromise([contentEl]).then(finish).catch(finish);
  }} else if (window.MathJax && MathJax.startup && MathJax.startup.promise) {{
    MathJax.startup.promise.then(() => {{
      try {{ MathJax.typesetClear([contentEl]); }} catch (e) {{}}
      return MathJax.typesetPromise([contentEl]);
    }}).then(finish).catch(finish);
  }} else {{
    // MathJax script not loaded yet — wait for it
    let tries = 0;
    const wait = setInterval(() => {{
      if (window.MathJax && MathJax.typesetPromise) {{
        clearInterval(wait);
        MathJax.typesetPromise([contentEl]).then(finish).catch(finish);
      }} else if (++tries > 30) {{
        clearInterval(wait);
        finish();
      }}
    }}, 200);
  }}
}}

// Initial render based on saved preference (runs once)
renderContent(localStorage.getItem('site_lang') || 'en');

// Listen for language change events from the toggle button (runs only when lang actually changes)
window.addEventListener('langchange', e => renderContent(e.detail));
</script>
<script src="script.js"></script>
</body>
</html>
'''
    with open(f'week{week_num}.html', 'w') as f:
        f.write(html_out)
    has_zh = "✓" if md_zh and md_zh != md_en else "(EN fallback)"
    print(f"Built week{week_num}.html  Chinese: {has_zh}")

def get_pdf_path(w):
    paths = {
        1: '../1/Lecture1_LPDuality_v2-1.pdf',
        2: '../2/Lecture2_RevenueManagement_v1.pdf',
        3: '../3/Lecture3_InventoryOptimization_v2.pdf',
        4: '../4/Lecture4_LocationModels.pdf  +  Lecture4_FormulationStrength.pdf',
        5: '../5/Lecture5_AssortmentOpt_v1.pdf',
        6: '../6/Lecture6_Pricing_v1-1.pdf',
        7: '../7/Lecture7_NetworkFlows_v2.pdf',
        8: '../8/Lecture8_Transportation_v1-1.pdf',
    }
    return paths.get(w, '')

if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    for w in range(1, 9):
        make_week_page(w)
    print("\nDone! Open week1.html through week8.html in your browser.")
