/* ============================================================
   theme.js — 全ページ共通のテーマ処理
   各ページの <head> 冒頭で同期読み込みすること
   （描画前に data-theme を確定させてちらつきを防ぐため defer/async は付けない）。
   1) JS有効フラグ（html.js）の付与 — CSS側の演出出し分けに使う
   2) 保存済み設定 / OS設定からテーマを初期化
   3) アドレスバー色（theme-color）の同期（切替ボタンの有無によらない）
   4) テーマ切替ボタン（#theme-toggle）の配線
   ============================================================ */
(function(){
  document.documentElement.className += ' js';

  /* テーマ初期化（描画前に実行してちらつきを防ぐ） */
  try {
    var saved = localStorage.getItem('theme');
    var dark = saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  } catch(e) {}

  /* DOM構築後の処理（theme-color の同期 → テーマ切替ボタンの配線） */
  function setup(){
    var root = document.documentElement;

    /* アドレスバー色（theme-color）は media 属性つきの meta 2枚で OS 設定に追従するが、
       保存済み設定やサイト内トグルで OS 設定と食い違うときは JS で書き換える。
       切替ボタンを持たないページ（/services/nippo-slides）でも同期させるため、
       ボタンの有無とは独立に行う。
       色の値はページ側の宣言をそのまま使う（セクションごとに色が違うため
       JS にハードコードしない。/outlook は藍系）。書き換え前の宣言値を控えておく。 */
    var metas = document.querySelectorAll('meta[name="theme-color"]');
    var declared = {};
    Array.prototype.forEach.call(metas, function(m){
      var media = m.getAttribute('media') || '';
      declared[media.indexOf('dark') !== -1 ? 'dark' : 'light'] = m.getAttribute('content');
    });
    function syncThemeColor(theme){
      var color = declared[theme];
      if (!color) return;
      Array.prototype.forEach.call(metas, function(m){
        m.setAttribute('content', color);
      });
    }
    function currentTheme(){
      return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    }
    syncThemeColor(currentTheme());

    var themeBtn = document.getElementById('theme-toggle');
    if (!themeBtn) return;
    function applyTheme(theme){
      root.setAttribute('data-theme', theme);
      themeBtn.setAttribute('aria-label', theme === 'dark' ? 'ライトモードに切り替え' : 'ダークモードに切り替え');
      syncThemeColor(theme);
    }
    applyTheme(currentTheme());
    themeBtn.addEventListener('click', function(){
      var next = currentTheme() === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      try { localStorage.setItem('theme', next); } catch(e) {}
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }
})();
