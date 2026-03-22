# Changelog

## 0.3.0 - 2026-03-23

- マネーフォワード ME の決済・支出履歴取得に対応（get_transactions）—— R2 から月次 CSV を取得・パース
- Google Maps タイムラインの移動・訪問場所取得に対応（get_location_history）—— R2 から Timeline.json を取得し、日付別に KV キャッシュ（TTL 7日）
- get_day_summary に transactions・locationHistory を追加

## 0.2.0 - 2026-03-19

- Cloudflare Workers + GitHub OAuth 構成に全面移行（stdio → Streamable HTTP）
- Prisma を廃止し Supabase JS Client（PostgREST）に移行
- GitHub OAuth 認証を実装（workers-oauth-provider、ALLOWED_USERNAMES によるユーザー制限）
- 全ツールを Workers ランタイム対応に移植
- get_commits に User-Agent ヘッダーを追加（Workers の fetch は自動付与しないため）
- performedAt を JST ISO 文字列（+09:00）で返すよう修正
- get_tasks レスポンスにカテゴリ説明文（categories）を追加

## 0.1.0 - 2026-03-19

- Google Calendar のイベント取得に対応（指定日の予定一覧）
- 日記の取得に対応（Supabase 上の日記データ）
- GitHub コミット履歴の取得に対応（複数リポジトリ対応、省略時は全リポジトリ自動取得）
- タスク管理アプリ（Yarukoto）のタスク取得に対応（指定日に関係するタスクを横断取得）
- Peak Log の記録取得に対応
- 写真 URL の取得に対応
- 1日分の活動データをまとめて取得できる集約ツール（get_day_summary）を追加
