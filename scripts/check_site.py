#!/usr/bin/env python3
"""サイトの機械的な整合性チェック。

CI（.github/workflows/site-checks.yml）から実行する。人のレビューでは見落としやすい
「壊れていたら公開前に気づきたい」項目だけを対象にしており、文言の良し悪しは見ない。

依存は Python 標準ライブラリのみ（pip install を挟まない）。ローカルでも動く:

    python3 scripts/check_site.py

住所そのものは **このファイルに書かない**。GMOのバーチャルオフィスを解約したとき、
削除箇所が1つ増えていると漏れるため。郵便番号は llms.txt から実行時に読み出す
（CLAUDE.md「所在地」の削除箇所一覧を参照）。
"""

import json
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# 住所を書いてよいファイル（CLAUDE.md「所在地」の7箇所と対応させる）。
# 増減させたら CLAUDE.md の一覧も同時に直すこと。
ADDRESS_FILES = {
    "about.html",
    "index.html",
    "llms.txt",
    "privacy.html",
    "audio-guide-privacy.html",
    "CLAUDE.md",
    ".claude/agents/site-consistency-check.md",
}

CANONICAL_HOST = "https://yaenowa.co.jp"
CONTACT_MAIL = "yoshida+contact@yaenowa.co.jp"

# 名前空間の宣言などブラウザが取得しないURL。混在コンテンツの検査から外す。
HTTP_ALLOWED = (
    "http://www.w3.org/",
    "http://www.sitemaps.org/",
    "http://schema.org",
)

failures = []


def fail(check, path, message):
    failures.append((check, path, message))


def html_files():
    for p in sorted(ROOT.rglob("*.html")):
        if ".git" in p.parts:
            continue
        yield p


def text_files():
    """テキストとして読める全ファイル。拡張子で絞ると新しい種類のファイルを取りこぼす。"""
    for p in sorted(ROOT.rglob("*")):
        if ".git" in p.parts or not p.is_file():
            continue
        try:
            yield p, p.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue


def rel(p):
    return str(p.relative_to(ROOT))


def check_json_ld():
    """構造化データが JSON として壊れていないか。"""
    for p in html_files():
        text = p.read_text(encoding="utf-8")
        blocks = re.findall(
            r'<script type="application/ld\+json">(.*?)</script>', text, re.S
        )
        for i, block in enumerate(blocks, 1):
            try:
                json.loads(block)
            except json.JSONDecodeError as e:
                fail("json-ld", rel(p), f"{i}番目のブロックが不正: {e}")


def check_noopener():
    """外部リンク（target="_blank"）に rel="noopener" が付いているか。"""
    for p in html_files():
        for m in re.finditer(r"<a\s[^>]*>", p.read_text(encoding="utf-8")):
            tag = m.group(0)
            if 'target="_blank"' in tag and "noopener" not in tag:
                fail("noopener", rel(p), f'rel="noopener" がない: {tag[:100]}')


def check_mixed_content():
    """http:// でリソースを読んでいないか（ブラウザが「安全ではありません」と出す）。"""
    for p, text in text_files():
        if p.suffix not in {".html", ".css", ".js", ".txt", ".xml"}:
            continue
        for m in re.finditer(r"http://[^\s\"'<>)]+", text):
            url = m.group(0)
            if not url.startswith(HTTP_ALLOWED):
                fail("mixed-content", rel(p), f"http:// を参照している: {url}")


def check_address_locations():
    """住所の記載箇所が、想定している一覧と一致しているか。

    住所そのものはこのファイルに書かない（解約時の削除箇所を増やさないため）。
    検索語は ADDRESS_FILES に残っているファイルから実行時に組み立てる。

    **1ファイルだけ消した状態で打ち切らないこと。** 解約作業は1ファイルずつ進むので、
    そこで検査が止まると「残り6箇所が見えないまま緑」になり、安全網として最も必要な
    場面で外れる。全箇所から消えたときだけ、検査ごと畳むよう促す。
    """
    postals = {}
    streets = set()
    for name in sorted(ADDRESS_FILES):
        p = ROOT / name
        if not p.exists():
            continue
        try:
            text = p.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue
        for m in re.finditer(r"(\d{3}-\d{4})[\s　]*([^\s　<。、\n]{6,40})?", text):
            postals.setdefault(m.group(1), set()).add(name)
            if m.group(2):
                streets.add(m.group(2))

    if not postals:
        fail(
            "address",
            "-",
            "住所がどこにも見つからない。解約手続きで全削除したのなら、"
            "CLAUDE.md「所在地」の一覧・ADDRESS_FILES・この住所チェックごと削除し、"
            "最後に人が grep で0件を確認すること（この検査は住所を持たないため、"
            "全削除後は成立しない）",
        )
        return
    if len(postals) > 1:
        fail("address", "-", f"郵便番号が一致しない: { {k: sorted(v) for k, v in postals.items()} }")
        return

    keys = {next(iter(postals))} | streets
    found = set()
    for p, text in text_files():
        if any(k in text for k in keys):
            found.add(rel(p))

    for extra in sorted(found - ADDRESS_FILES):
        fail(
            "address",
            extra,
            "住所の記載箇所が増えている。CLAUDE.md「所在地」の一覧と "
            "scripts/check_site.py の ADDRESS_FILES に追記すること",
        )
    remaining = sorted(ADDRESS_FILES & found)
    for missing in sorted(ADDRESS_FILES - found):
        fail(
            "address",
            missing,
            "住所があるはずのファイルに見つからない。解約作業の途中なら、"
            f"**まだ残っている {len(remaining)} 箇所を先に消しきる**こと（{', '.join(remaining)}）。"
            "このチェックを消して赤を解消しないこと。"
            "意図した掲載場所の移動なら CLAUDE.md の一覧と ADDRESS_FILES を直す",
        )


def check_contact_mail():
    """問い合わせ先メールアドレスに表記ゆれがないか。"""
    pattern = re.compile(r"[\w.+-]+@yaenowa\.co\.jp")
    for p, text in text_files():
        if p.suffix not in {".html", ".txt"}:
            continue
        for addr in set(pattern.findall(text)):
            if addr != CONTACT_MAIL:
                fail("mail", rel(p), f"想定と違うアドレス: {addr}")


def check_canonical_apex():
    """canonical / og:url が apex ドメイン（www 無し・https）で統一されているか。"""
    for p in html_files():
        text = p.read_text(encoding="utf-8")
        urls = re.findall(r'<link rel="canonical" href="([^"]+)"', text)
        urls += re.findall(r'<meta property="og:url" content="([^"]+)"', text)
        for url in urls:
            if not url.startswith(CANONICAL_HOST):
                fail("apex", rel(p), f"apex ドメインになっていない: {url}")


def resolve_link(page, href):
    """内部リンクの href を実ファイルに解決する。見つからなければ None。"""
    path = href.split("#")[0].split("?")[0]
    if not path:
        return page
    base = ROOT if path.startswith("/") else page.parent
    target = (base / path.lstrip("/")).resolve()
    candidates = [target, target.with_suffix(".html"), target / "index.html"]
    if path.endswith("/"):
        candidates = [target / "index.html"]
    for c in candidates:
        if c.exists():
            return c
    return None


def check_internal_links():
    """内部リンクが実在するか。拡張子つきURLを使っていないか。"""
    for p in html_files():
        text = p.read_text(encoding="utf-8")
        for href in re.findall(r'href="([^"]+)"', text):
            if re.match(r"^(https?:|mailto:|tel:|#|data:)", href):
                continue
            if re.search(r"\.html(#|\?|$)", href):
                fail("url", rel(p), f"拡張子なしURL運用に反する: {href}")
            if resolve_link(p, href) is None:
                fail("url", rel(p), f"リンク先が見つからない: {href}")


def check_sitemap():
    """sitemap の URL が実ファイルに対応しているか。outlook 配下を載せていないか。"""
    sitemap = (ROOT / "sitemap.xml").read_text(encoding="utf-8")
    locs = re.findall(r"<loc>([^<]+)</loc>", sitemap)
    if not locs:
        fail("sitemap", "sitemap.xml", "<loc> が1件も無い")
    for loc in locs:
        if not loc.startswith(CANONICAL_HOST):
            fail("sitemap", "sitemap.xml", f"apex ドメインになっていない: {loc}")
            continue
        if "/outlook/" in loc:
            fail("sitemap", "sitemap.xml", f"outlook 配下は noindex 運用なので載せない: {loc}")
            continue
        path = loc[len(CANONICAL_HOST) :]
        if resolve_link(ROOT / "index.html", path or "/") is None:
            fail("sitemap", "sitemap.xml", f"対応するファイルが無い: {loc}")


def check_outlook_noindex():
    """outlook 配下が noindex のままか。"""
    for p in sorted((ROOT / "outlook").rglob("*.html")):
        text = p.read_text(encoding="utf-8")
        if not re.search(r'<meta name="robots"[^>]*noindex', text):
            fail("noindex", rel(p), "outlook 配下は noindex 運用（robots メタが無い）")


CHECKS = [
    check_json_ld,
    check_noopener,
    check_mixed_content,
    check_address_locations,
    check_contact_mail,
    check_canonical_apex,
    check_internal_links,
    check_sitemap,
    check_outlook_noindex,
]


def main():
    for check in CHECKS:
        check()

    if not failures:
        print(f"✓ {len(CHECKS)} 種類のチェックをすべて通過しました")
        return 0

    print(f"✗ {len(failures)} 件の問題が見つかりました\n")
    current = None
    for name, path, message in failures:
        if name != current:
            print(f"[{name}]")
            current = name
        print(f"  {path}: {message}")
    return 1


if __name__ == "__main__":
    sys.exit(main())
