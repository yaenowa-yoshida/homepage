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

    /* アドレスバー色（theme-color）は media 属性つきの meta 2枚で OS 設定に追従するが、
       サイト内トグルで切り替えたときは OS 設定と食い違うため JS で書き換える。
       色の値はページ側の宣言をそのまま使う（セクションごとに色が違うため
       JS にハードコードしない。/outlook は藍系）。書き換え前の宣言値を控えておく。 */
    var metas = document.querySelectorAll('meta[name="theme-color"]');
    var declared = {};
    Array.prototype.forEach.call(metas, function(m){
      var media = m.getAttribute('media') || '';
      declared[media.indexOf('dark') !== -1 ? 'dark' : 'light'] = m.getAttribute('content');
    });

    function applyTheme(theme){
      root.setAttribute('data-theme', theme);
      themeBtn.setAttribute('aria-label', theme === 'dark' ? 'ライトモードに切り替え' : 'ダークモードに切り替え');
      var color = declared[theme];
      if (!color) return;
      Array.prototype.forEach.call(metas, function(m){
        m.setAttribute('content', color);
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
