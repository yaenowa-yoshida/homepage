/* outlook/nav.js — 今後の展望（/outlook/）配下の共通回遊ナビ
   各ページのパンくず（.crumbs）の直後に、テーマ一覧のミニナビを注入する。
   テーマページを増やしたら THEMES を更新すること（あわせて outlook/index.html の
   .topics 一覧と JSON-LD の hasPart も更新する。CLAUDE.md 参照）。
   JS無効環境ではパンくず＋ハブ経由の回遊がそのまま残る（プログレッシブ・エンハンスメント）。 */
(function () {
  'use strict';

  var THEMES = [
    { href: '/outlook/', label: 'ジャーナル' },
    { href: '/outlook/gx', label: 'GX' },
    { href: '/outlook/local', label: '地域' },
    { href: '/outlook/academics', label: '学び' },
    { href: '/outlook/sports', label: 'スポーツ' }
  ];

  function currentPath() {
    // ローカル確認（*.html）と本番（拡張子なし）の両方を正規化する
    return location.pathname
      .replace(/\.html$/, '')
      .replace(/\/index$/, '/');
  }

  function isCurrent(theme, path) {
    if (theme.href === '/outlook/') {
      return path === '/outlook/' || path === '/outlook';
    }
    // テーマ本体・その配下（gx-pipeline / gx-demo 等のハイフン子ページ）を同一テーマ扱いにする
    return path === theme.href || path.indexOf(theme.href + '-') === 0;
  }

  function init() {
    // パンくずのないページ（ジャーナル index）はページラベルを目印にその直前へ挿入する
    var anchor = document.querySelector('.crumbs');
    var before = false;
    if (!anchor) {
      anchor = document.querySelector('.journal-label');
      before = true;
    }
    if (!anchor || document.querySelector('.outlook-subnav')) { return; }

    var path = currentPath();
    var box = document.createElement('div');
    box.className = 'outlook-subnav';
    box.setAttribute('role', 'navigation');
    box.setAttribute('aria-label', '今後の展望のテーマ一覧');

    THEMES.forEach(function (t) {
      var a = document.createElement('a');
      a.href = t.href;
      a.textContent = t.label;
      if (isCurrent(t, path)) {
        a.className = 'current';
        a.setAttribute('aria-current', 'true');
      }
      box.appendChild(a);
    });

    var style = document.createElement('style');
    style.textContent =
      '.outlook-subnav{display:flex;flex-wrap:wrap;gap:.3rem 1rem;font-size:.75rem;letter-spacing:.08em;margin:0 0 1.6rem;}' +
      '.outlook-subnav a{color:var(--ink-light);text-decoration:none;border-bottom:1px solid transparent;padding-bottom:2px;transition:color .3s;}' +
      '.outlook-subnav a:hover{color:var(--accent);}' +
      '.outlook-subnav a.current{color:var(--accent-gold);border-bottom-color:var(--accent-gold);}' +
      '@media (prefers-reduced-motion: reduce){.outlook-subnav a{transition:none;}}';
    document.head.appendChild(style);

    anchor.insertAdjacentElement(before ? 'beforebegin' : 'afterend', box);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
