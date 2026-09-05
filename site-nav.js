/* site-nav.js — グローバルナビの共通処理
   （ハンバーガーの開閉 ＋ 子を持つ項目の展開）

   読み込むのは `site.css` を使う7ファイル（index / about / business 配下5）。
   もとは各ページのインライン <script> にハンバーガー処理が重複していたものを、
   子項目の展開を足すタイミングで1つに集約した。index.html 側の実装（aria-label の
   出し分け・Esc・幅が戻ったときの自動クローズ）を正として揃えている。

   `outlook/nav.js` は「今後の展望」配下だけの回遊ナビで、別物。混同しないこと。

   子を持つ項目の構造（HTML 側）:
     <li class="nav-has-sub">
       <a href="/business/">事業内容</a>
       <button class="nav-sub-toggle" aria-expanded="false" aria-controls="nav-sub-xxx">…</button>
       <ul class="nav-sub" id="nav-sub-xxx"> … </ul>
     </li>
   親はリンクのまま残し、開閉はボタンが持つ。こうしないと親ページ（/business/）へ
   行けなくなる。表示の出し分けは site.css 側（デスクトップはドロップダウン、
   1200px 以下はアコーディオン）。

   JS が動かない環境では、親リンクだけが残って子は出ない（各ハブページから辿れる）。 */
(function () {
  'use strict';

  var DESKTOP = '(min-width: 1201px)';

  function init() {
    var nav = document.querySelector('nav');
    if (!nav) { return; }

    var toggle = document.getElementById('nav-toggle');
    var links = document.getElementById('nav-links');
    var scrim = document.getElementById('nav-scrim');
    var subs = Array.prototype.slice.call(nav.querySelectorAll('.nav-has-sub'));

    function isDesktop() {
      return window.matchMedia && window.matchMedia(DESKTOP).matches;
    }

    /* ── 子項目の展開 ── */

    function setSub(li, open) {
      li.classList.toggle('is-open', open);
      var btn = li.querySelector('.nav-sub-toggle');
      if (btn) {
        btn.setAttribute('aria-expanded', String(open));
        var name = btn.getAttribute('data-label') || '';
        btn.setAttribute('aria-label', name + (open ? 'の下層を閉じる' : 'の下層を開く'));
      }
    }

    function closeSubs(except) {
      subs.forEach(function (li) {
        if (li !== except) { setSub(li, false); }
      });
    }

    subs.forEach(function (li) {
      var btn = li.querySelector('.nav-sub-toggle');
      if (!btn) { return; }

      btn.addEventListener('click', function (e) {
        e.preventDefault();
        var open = !li.classList.contains('is-open');
        // デスクトップでは同時に開くのは1つだけ（横並びで重なるため）
        if (isDesktop()) { closeSubs(li); }
        setSub(li, open);
      });

      // デスクトップはホバーでも開く。aria-expanded も合わせて、
      // 見た目と支援技術への通知がずれないようにする
      li.addEventListener('mouseenter', function () {
        if (!isDesktop()) { return; }
        closeSubs(li);
        setSub(li, true);
      });
      li.addEventListener('mouseleave', function () {
        if (!isDesktop()) { return; }
        // 子にフォーカスがあるまま閉じると、visibility:hidden でフォーカスが
        // body へ飛んでしまう。キーボード操作中は閉じない
        if (li.contains(document.activeElement)) { return; }
        setSub(li, false);
      });

      // キーボード操作（Tab で子に入ったら開く／出たら閉じる）
      li.addEventListener('focusin', function () {
        if (!isDesktop()) { return; }
        closeSubs(li);
        setSub(li, true);
      });
      li.addEventListener('focusout', function (e) {
        if (!isDesktop()) { return; }
        if (!li.contains(e.relatedTarget)) { setSub(li, false); }
      });
    });

    // デスクトップでナビの外を押したら閉じる
    document.addEventListener('click', function (e) {
      if (!isDesktop()) { return; }
      if (!nav.contains(e.target)) { closeSubs(null); }
    });

    /* ── ハンバーガー ── */

    function closeMenu() {
      nav.classList.remove('nav-open');
      document.body.classList.remove('menu-open');
      closeSubs(null);
      if (toggle) {
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-label', 'メニューを開く');
      }
    }

    if (toggle) {
      toggle.addEventListener('click', function () {
        var open = nav.classList.toggle('nav-open');
        document.body.classList.toggle('menu-open', open);
        toggle.setAttribute('aria-expanded', String(open));
        toggle.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
        if (!open) { closeSubs(null); }
      });
    }

    // メニュー内のリンクをたどったら閉じる（開閉ボタンは button なので対象外）
    if (links) {
      links.addEventListener('click', function (e) {
        if (e.target.closest && e.target.closest('a')) { closeMenu(); }
      });
    }

    if (scrim) { scrim.addEventListener('click', closeMenu); }

    // Esc は「開いている子項目 → メニュー本体」の順に閉じる
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') { return; }
      var openSub = subs.filter(function (li) { return li.classList.contains('is-open'); })[0];
      if (openSub) {
        // フォーカスを先に戻してから閉じる。順序が逆だと、focus() が focusin を
        // 起こして開き直してしまう
        var btn = openSub.querySelector('.nav-sub-toggle');
        if (btn) { btn.focus(); }
        setSub(openSub, false);
        return;
      }
      closeMenu();
    });

    // 横並びナビへ戻る幅まで広げたら閉じる
    // （開いたままだとスクロールがロックされ続けるため）
    if (window.matchMedia) {
      var wide = window.matchMedia(DESKTOP);
      var onWide = function (e) { if (e.matches) { closeMenu(); } };
      if (wide.addEventListener) { wide.addEventListener('change', onWide); }
      else if (wide.addListener) { wide.addListener(onWide); }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
