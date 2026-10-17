#!/usr/bin/env python3
"""グローバルナビを原本（scripts/nav.tmpl）から各ページへ書き出す。

ナビは `site.css` を使う7ページが同じ <nav> を持つ。以前は7か所へ手で書き写していたが、
原本を1つにして、ここから各ページの <nav>…</nav> を生成する（出力は静的HTMLのまま。
JS で後から差し込まないので、検索エンジン・JS無効の環境でもナビが見える）。

    python3 scripts/build_nav.py          # 7ページの <nav> を原本から書き換える
    python3 scripts/build_nav.py --check  # 原本と食い違うページがあれば exit 1（CI 用・書き換えない）

ページごとの違いは次の2点だけで、ここで機械的に決める。
  1. 現在のページへのリンクに aria-current="page" を付ける
  2. トップページ（index.html）だけは、同じページ内への移動になるリンクを
     `#…` の形にする（ロゴ → `#`、自社サービス・お問い合わせ → `#services` `#contact`）

依存なし（標準ライブラリのみ）。ナビの項目・順番・子項目を変えるときは原本だけを直し、
このスクリプトを実行する。outlook/nav.js の THEMES との対応（子項目）は引き続き手で揃える。
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TEMPLATE = ROOT / "scripts" / "nav.tmpl"

# ナビを持つページ → そのページの公開URL
PAGES = {
    "index.html": "/",
    "about.html": "/about",
    "business/index.html": "/business/",
    "business/requirements.html": "/business/requirements",
    "business/introduction.html": "/business/introduction",
    "business/ai.html": "/business/ai",
    "business/app.html": "/business/app",
}

GENERATED_NOTE = (
    "<!-- NAV: scripts/nav.tmpl から scripts/build_nav.py が生成。"
    "ここは直接編集しない -->"
)
# 既存の見出しコメント（<!-- NAV --> など）と <nav>…</nav> をひとまとまりで置き換える
BLOCK = re.compile(r"(?:<!-- NAV[^\n]*-->\n)?<nav>.*?</nav>", re.S)


def render(template: str, page: str, url: str) -> str:
    nav = template.strip("\n")
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
    return GENERATED_NOTE + "\n" + nav


def main() -> int:
    check = "--check" in sys.argv[1:]
    template = TEMPLATE.read_text(encoding="utf-8")
    stale = []
    for page, url in PAGES.items():
        path = ROOT / page
        html = path.read_text(encoding="utf-8")
        if len(BLOCK.findall(html)) != 1:
            print(f"✗ {page}: <nav> ブロックが1つに定まらない", file=sys.stderr)
            return 1
        new = BLOCK.sub(lambda _: render(template, page, url), html)
        if new != html:
            stale.append(page)
            if not check:
                path.write_text(new, encoding="utf-8")
    if check:
        if stale:
            print("✗ ナビが原本（scripts/nav.tmpl）と食い違っています。"
                  "原本を直したあと python3 scripts/build_nav.py を実行してください:", file=sys.stderr)
            for p in stale:
                print(f"  - {p}", file=sys.stderr)
            return 1
        print(f"✓ ナビは原本と一致しています（{len(PAGES)} ページ）")
        return 0
    print(f"✓ {len(stale)} ページを更新しました" if stale else f"✓ 変更なし（{len(PAGES)} ページとも原本どおり）")
    return 0


if __name__ == "__main__":
    sys.exit(main())
