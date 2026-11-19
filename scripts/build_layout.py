#!/usr/bin/env python3
"""共通のナビとフッターを、原本から各ページへ書き出す。

`site.css` を使う7ページ（index.html・about.html・business/ 配下5）は、同じ <nav> と
<footer> を持つ。以前は7か所へ手で書き写していたが、原本を1つにして、ここから各ページへ
生成する。出力は静的HTMLのまま（JS で後から差し込まないので、検索エンジン・JS無効の環境でも
ナビとフッターが見える）。

    python3 scripts/build_layout.py          # 7ページの <nav> と <footer> を原本から書き換える
    python3 scripts/build_layout.py --check  # 原本と食い違うページがあれば exit 1（CI 用・書き換えない）

原本:
    scripts/nav.tmpl      グローバルナビ
    scripts/footer.tmpl   フッター

ページごとの違いは、ここで機械的に決める。
  ナビ    : 現在のページへのリンクに aria-current="page" を付ける。
            トップ（index.html）だけは、同一ページ内への移動になるリンクを `#…` の形にする
            （ロゴ → `#`、自社サービス・お問い合わせ → `#services` `#contact`）
  フッター: トップはロゴをリンクにせず文字にする。会社案内は「会社について」のリンクを出さない

`outlook/`・`services/`・`privacy.html`・`audio-guide-privacy.html` は別の作りのナビ・フッター
（それぞれの文脈に合わせた内容）で、ここの対象ではない。

依存なし（標準ライブラリのみ）。項目・順番・子項目を変えるときは原本だけを直して、このスクリプトを
実行する。ナビの「今後の展望」の子項目は nav.tmpl に書かず、outlook/nav.js の THEMES から生成する
（THEMES が唯一の原本。「事業内容」の子項目は4本柱と同じ集合で、nav.tmpl に書く）。
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
NAV_TEMPLATE = ROOT / "scripts" / "nav.tmpl"
OUTLOOK_NAV_JS = ROOT / "outlook" / "nav.js"
FOOTER_TEMPLATE = ROOT / "scripts" / "footer.tmpl"

# 対象ページ → そのページの公開URL
PAGES = {
    "index.html": "/",
    "about.html": "/about",
    "business/index.html": "/business/",
    "business/requirements.html": "/business/requirements",
    "business/introduction.html": "/business/introduction",
    "business/ai.html": "/business/ai",
    "business/app.html": "/business/app",
}

NAV_NOTE = (
    "<!-- NAV: scripts/nav.tmpl から scripts/build_layout.py が生成。"
    "ここは直接編集しない -->"
)
FOOTER_NOTE = (
    "<!-- FOOTER: scripts/footer.tmpl から scripts/build_layout.py が生成。"
    "ここは直接編集しない -->"
)
# 既存の見出しコメントと <nav>…</nav>（<footer>…</footer>）をひとまとまりで置き換える
NAV_BLOCK = re.compile(r"(?:<!-- NAV[^\n]*-->\n)?<nav>.*?</nav>", re.S)
FOOTER_BLOCK = re.compile(r"(?:<!-- FOOTER[^\n]*-->\n)?<footer>.*?</footer>", re.S)


def load_outlook_themes() -> list:
    """outlook/nav.js の THEMES（今後の展望のテーマ一覧）を読む。

    THEMES は「今後の展望」配下の回遊ナビが実行時に使うデータで、グローバルナビの
    「今後の展望」の子項目もここから生成する（原本を1つにするため）。
    JS のオブジェクトリテラルを、キーと引用符を直して JSON として読む（依存なし）。
    """
    js = OUTLOOK_NAV_JS.read_text(encoding="utf-8")
    m = re.search(r"var THEMES = (\[.*?\n  \]);", js, re.S)
    if not m:
        raise SystemExit("✗ outlook/nav.js の THEMES を読めない（形式が変わった？）")
    body = re.sub(r"//[^\n]*", "", m.group(1))               # 行コメントを除く
    body = re.sub(r"([{,]\s*)([A-Za-z_]\w*)\s*:", r'\1"\2":', body)  # キーを引用符つきに
    body = body.replace("'", '"')
    return json.loads(body)


def outlook_nav_items(template: str) -> str:
    """グローバルナビの「今後の展望」の子項目（<li> の並び）。

    THEMES のうち、親（/outlook/）と URL が重複する「ジャーナル」を除いた各テーマを並べる。
    配下ページ（children）はグローバルナビには出さない。
    """
    items = [t for t in load_outlook_themes() if t["href"] != "/outlook/"]
    return "\n".join(
        '<li><a href="%s">%s</a></li>' % (t["href"], t["label"]) for t in items
    )


def render_nav(template: str, page: str, url: str) -> str:
    nav = template.strip("\n")
    nav = re.sub(
        r"^( *)\{\{OUTLOOK_THEMES\}\}$",
        lambda m: "\n".join(m.group(1) + line for line in outlook_nav_items(template).split("\n")),
        nav,
        flags=re.M,
    )
    if page == "index.html":
        # トップ内の移動は同一ページ内リンクにする（ロゴは先頭へスクロール）
        nav = nav.replace('<a href="/" class="nav-logo">', '<a href="#" class="nav-logo">')
        nav = nav.replace('src="/LOGO.png"', 'src="LOGO.png"')
        nav = nav.replace('href="/#services"', 'href="#services"')
        nav = nav.replace('href="/#contact"', 'href="#contact"')
    else:
        # 現在のページへのリンク（ロゴは除く）に aria-current を付ける
        nav = re.sub(
            r'<a href="%s">' % re.escape(url),
            '<a href="%s" aria-current="page">' % url,
            nav,
        )
    return NAV_NOTE + "\n" + nav


def render_footer(template: str, page: str, url: str) -> str:
    footer = template.strip("\n")
    if page == "index.html":
        # トップではロゴをリンクにしない
        footer = footer.replace(
            '<a href="/" class="footer-logo">株式会社ヤエノワ</a>',
            '<span class="footer-logo">株式会社ヤエノワ</span>',
        )
    if page == "about.html":
        # 会社案内では自分自身へのリンクを出さない
        footer = footer.replace(
            '  <a href="/about" class="footer-link">会社について</a>\n', ""
        )
    return FOOTER_NOTE + "\n" + footer


PARTS = [
    ("nav", NAV_TEMPLATE, NAV_BLOCK, render_nav),
    ("footer", FOOTER_TEMPLATE, FOOTER_BLOCK, render_footer),
]


def main() -> int:
    check = "--check" in sys.argv[1:]
    stale = []
    for page, url in PAGES.items():
        path = ROOT / page
        html = path.read_text(encoding="utf-8")
        new = html
        for name, template_path, block, render in PARTS:
            if len(block.findall(new)) != 1:
                print(f"✗ {page}: <{name}> ブロックが1つに定まらない", file=sys.stderr)
                return 1
            template = template_path.read_text(encoding="utf-8")
            new = block.sub(lambda _: render(template, page, url), new)
        if new != html:
            stale.append(page)
            if not check:
                path.write_text(new, encoding="utf-8")
    if check:
        if stale:
            print("✗ ナビまたはフッターが原本（scripts/nav.tmpl・scripts/footer.tmpl）と食い違っています。"
                  "原本を直したあと python3 scripts/build_layout.py を実行してください:", file=sys.stderr)
            for p in stale:
                print(f"  - {p}", file=sys.stderr)
            return 1
        print(f"✓ ナビとフッターは原本と一致しています（{len(PAGES)} ページ）")
        return 0
    print(f"✓ {len(stale)} ページを更新しました" if stale else f"✓ 変更なし（{len(PAGES)} ページとも原本どおり）")
    return 0


if __name__ == "__main__":
    sys.exit(main())
