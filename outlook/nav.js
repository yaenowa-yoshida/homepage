/* outlook/nav.js — 今後の展望（/outlook/）配下の共通回遊ナビ
   各ページのパンくず（.crumbs）の直後に、テーマ一覧のミニナビを注入する。
   見た目は outlook/outlook.css の .outlook-subnav が受け持つ（本ファイルは構造のみ）。
   テーマは outlook/<テーマ>/index.html、その配下は同ディレクトリ内のファイルに置く
   （例: /outlook/gx/ → /outlook/gx/pipeline → /outlook/gx/pipeline-demo）。
   テーマページを増やしたら THEMES を更新すること（あわせて outlook/index.html の
   .topics 一覧と JSON-LD の hasPart も更新する。CLAUDE.md 参照）。
   JS無効環境ではパンくず＋ハブ経由の回遊がそのまま残る（プログレッシブ・エンハンスメント）。 */
(function () {
  'use strict';

  // children を持つテーマでは、その配下にいる間だけ 2段目に兄弟ページを出す
  var THEMES = [
    { href: '/outlook/', label: 'ジャーナル' },
    { href: '/outlook/gx/', label: 'GX', children: [
      { href: '/outlook/gx/', label: 'GX構想' },
      { href: '/outlook/gx/pipeline', label: '前工程' },
      { href: '/outlook/gx/decokatsu', label: 'デコ活' },
      { href: '/outlook/gx/ai', label: 'AIと電力' }
    ] },
    { href: '/outlook/local/', label: '地域' },
    { href: '/outlook/academics/', label: '学び', children: [
      { href: '/outlook/academics/', label: '学びの記録' },
      { href: '/outlook/academics/guide', label: '音声ガイド' }
    ] },
    { href: '/outlook/sports/', label: 'スポーツ' }
  ];

  function currentPath() {
    // ローカル確認（*.html）と本番（拡張子なし）の両方を正規化する
    return location.pathname
      .replace(/\.html$/, '')
      .replace(/\/index$/, '/');
  }

  // ハブは '/outlook/gx/' というディレクトリURL。末尾スラッシュなしで来ることもあるので
  // （素のパスへのアクセスはサーバー側でスラッシュ付きへ転送される）、両方を同じページ扱いにする
  function samePage(href, path) {
    return path === href || path === href.replace(/\/$/, '');
  }

  function isCurrent(theme, path) {
    if (theme.href === '/outlook/') {
      return path === '/outlook/' || path === '/outlook';
    }
    // テーマ本体と、そのディレクトリ配下（/outlook/gx/pipeline 等）を同一テーマ扱いにする
    var dir = theme.href.replace(/\/$/, '') + '/';
    return samePage(theme.href, path) || path.indexOf(dir) === 0;
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

    // 配下ページを持つテーマの中にいるかどうか
    var open = null;
    THEMES.forEach(function (t) {
      if (t.children && isCurrent(t, path)) { open = t; }
    });

    // 配下ページのうち、いま開いているページに最も近いもの（デモページなら親の企画案）を選ぶ。
    // デモは同じディレクトリ内で「親スラッグ-demo」と命名するので、ハイフンで前方一致させる
    function nearest(children) {
      var best = '';
      children.forEach(function (c) {
        var stem = c.href.replace(/\/$/, '');
        if ((samePage(c.href, path) || path.indexOf(stem + '-') === 0) && c.href.length > best.length) {
          best = c.href;
        }
      });
      return best;
    }

    // aria-current="page" は同一ページに1つだけ付ける。2段目にいま開いているページ
    // そのものが並ぶときは、そちらに譲って1段目には付けない
    var exactInChild = !!open && open.children.some(function (c) { return samePage(c.href, path); });

    function row(items, className, label, currentHref, markCurrentPage) {
      var box = document.createElement('div');
      box.className = className;
      box.setAttribute('role', 'navigation');
      box.setAttribute('aria-label', label);
      items.forEach(function (t) {
        var a = document.createElement('a');
        a.href = t.href;
        a.textContent = t.label;
        // 見た目の選択状態。2段目はデモページで親テーマを選択状態に見せるため条件が異なる
        if (currentHref === undefined ? isCurrent(t, path) : currentHref === t.href) {
          a.className = 'current';
        }
        // 支援技術向けの現在地は「いま開いているページ」に限る
        if (markCurrentPage && samePage(t.href, path)) { a.setAttribute('aria-current', 'page'); }
        box.appendChild(a);
      });
      return box;
    }

    var rows = [row(THEMES, 'outlook-subnav', '今後の展望のテーマ一覧', undefined, !exactInChild)];

    // 兄弟ページへ直接移動できる行を足す
    // （これがないと、同じテーマの別ページへ行くのに毎回ハブへ戻ることになる）
    if (open) {
      rows.push(row(open.children, 'outlook-subnav outlook-subnav-child',
                    open.label + 'の配下ページ', nearest(open.children), true));
    }

    var target = anchor;
    rows.forEach(function (box) {
      target.insertAdjacentElement(before ? 'beforebegin' : 'afterend', box);
      if (!before) { target = box; }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
