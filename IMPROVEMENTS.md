# 改善バックログ

週次の自律改善セッションはここから優先度順に着手する。
完了したら「完了ログ」へ移し、新しく見つけた改善候補は「候補」に追記する。
運用ルール（無人マージの範囲など）は CLAUDE.md「自律改善ループ」を参照。

## 候補（優先度順）

1. **og-image.png の軽量化**（技術系・自動マージ可）
   - 現在 671KB。見た目を維持したまま圧縮（目標 200KB 以下）
2. **ファビコンの最適化**（技術系・自動マージ可）
   - 現在 LOGO.png を流用。適切なサイズの favicon 群（32px 等）を生成して軽量化
3. **Lighthouse 監査と改善**（技術系・自動マージ可）
   - パフォーマンス・アクセシビリティ・SEO の定点観測。低スコア項目を改善
4. **`.theme-card` の基底CSSを `outlook/outlook.css` に集約**（技術系・自動マージ可）
   - 現在 `gx.html` と `academics.html` の `<style>` に同一の基底定義が重複している。
   - `outlook.css:443-446` の `@container (max-width: 26rem)` は詳細度を上げないため、
     ソース順で後になるページ内 `<style>` が常に勝ち、**狭コンテナ時の縮小が効いていない**。
     集約すればこのコンテナクエリも復旧する。
   - 見た目が変わる（狭幅で縮むようになる）ため、Playwright でのピクセル比較を必ず行う。
5. **`theme-color` の同期をテーマ切替ボタンの有無から切り離す**（技術系・自動マージ可）
   - `theme.js` の `setupToggle()` は `#theme-toggle` が無いと早期 return するため、
     ボタンを持たない `services/nippo-slides.html` では theme-color が更新されない。
     他ページでダークを選んだ状態で開くと本文はダーク・アドレスバーはライトになる。
   - 同期処理を `setupToggle()` の外へ出すか、当該ページにもトグルを置く。
6. **`services/` 配下のページ固有CSSの整理**（🔒 慎重に扱う・優先度低）
   - `services/` 3ページは `.crumbs` などを各自の `<style>` に持っており、
     `site.css` の SUBPAGE ブロックと重複している。
   - ただし `site.css` は `body` / `nav` / `section` / `p` / `footer` の
     **要素セレクタ**を持つため、`services/` に読み込ませると
     `section { padding: 7rem 4rem }` 等が波及して見た目が変わる。
     とくに `nippo-slides.html` は theme.css すら読まないスライド専用デザイン。
   - 重複しているのは数行のため、**共有化の利は小さくリスクが大きい**。
     やるなら `.crumbs` だけを切り出した小さなファイルにする。
7. **`services/nippo-slides.html` の `.text-link` 再定義を解消**（技術系・自動マージ可）
   - ページ固有 `<style>` で `.text-link { color: var(--accent); … }` を再定義しており、
     `theme.css` の共通定義と二重管理になっている（「色の変更は theme.css だけ」の規約からの逸脱）。
   - ただし当該ページは theme.css を読まないスライド専用デザインのため、
     単に削除すると色が失われる。theme.css を読ませるかどうかから判断する。
8. **アクセス解析の導入**（🔒 ユーザー判断待ち・着手しない）
   - GA4 / Cloudflare Web Analytics 等。ユーザーのアカウント作業が必要。
   - 導入時は privacy.html 第8条・第9条の改定が必須（CLAUDE.md 法務メモ参照）

## 完了ログ

- 2026-07-25: theme.css / theme.js 新設（共通CSS・テーマ処理の一元化）、index.html 内部整理（PR #19）
- 2026-07-25: レビュー用サブエージェント2種（content-legal-review / site-consistency-check）追加（PR #17）
- 2026-07-25: 自動マージ運用の明文化（PR #18）
- 2026-09-03: サイト再構築（事業の4本柱定義・トップ分割・/about・/business/ 新設）（PR #98〜#101）
- 2026-09-03: アイコンSVGの配色を site.css 側の上書きに切り出し、ダークモードで沈む問題を解消
  （属性の直書き色はフォールバックとして残す。属性内 var() は解決できない環境で線が消えるため）
- 2026-09-04: GitHub Actions で機械的な整合性チェックを自動化（`scripts/check_site.py`。
  JSON-LD 構文・noopener・混在コンテンツ・住所の記載箇所・メールの表記ゆれ・apex 統一・
  内部リンクの実在と拡張子なしURL・sitemap の対応・outlook の noindex の9種）
- 2026-09-04: 継続性・程度の修飾を4箇所で緩和（「常に」「〜し続けています」「継続的に」「継続」を落とす）。
  `index.html` の選ばれる理由・`about.html` の代表紹介・`llms.txt` の2節。`business/ai.html` は
  同日に緩和済みで、これで表現が揃った
