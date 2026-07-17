/* ============================================================
   theme.js — 全ページ共通のテーマ処理
   各ページの <head> 冒頭で同期読み込みすること
   （描画前に data-theme を確定させてちらつきを防ぐため defer/async は付けない）。
   1) JS有効フラグ（html.js）の付与 — CSS側の演出出し分けに使う
   2) 保存済み設定 / OS設定からテーマを初期化
   3) テーマ切替ボタン（#theme-toggle）の配線
   ============================================================ */
(function(){
  document.documentElement.className += ' js';

  /* テーマ初期化（描画前に実行してちらつきを防ぐ） */
  try {
    var saved = localStorage.getItem('theme');
    var dark = saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  } catch(e) {}

  /* テーマ切替ボタン（DOM構築後に配線） */
  function setupToggle(){
    var root = document.documentElement;
    var themeBtn = document.getElementById('theme-toggle');
    if (!themeBtn) return;
    function applyTheme(theme){
      root.setAttribute('data-theme', theme);
      themeBtn.setAttribute('aria-label', theme === 'dark' ? 'ライトモードに切り替え' : 'ダークモードに切り替え');
      document.querySelectorAll('meta[name="theme-color"]').forEach(function(m){
        m.setAttribute('content', theme === 'dark' ? '#161316' : '#7a3a4a');
      });
    }
    applyTheme(root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');
    themeBtn.addEventListener('click', function(){
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      try { localStorage.setItem('theme', next); } catch(e) {}
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupToggle);
  } else {
    setupToggle();
  }
})();
