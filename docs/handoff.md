# furikaeri-mcp — セッション引き継ぎ

> 最終更新: 2026-03-23（セッション #18）
> バージョン: 0.3.0
> このドキュメントは「今どこにいるか」を記録する。コンセプト・技術設計は @docs/project.md を参照。

---

## 現在の実装状態

### アーキテクチャ

**Cloudflare Workers + GitHub OAuth** 構成への全面移行完了。本番デプロイ済み。

| 項目 | 状態 |
|---|---|
| Workers エントリポイント（McpAgent + OAuthProvider） | **完了** |
| GitHub OAuth フロー（workers-oauth-provider + KV） | **完了・動作確認済み** |
| Supabase JS Client への移行（Prisma 削除） | **完了** |
| 全ツール Workers 対応 | **完了** |
| wrangler.toml 設定（KV ID 設定済み） | **完了** |
| ローカル .dev.vars 設定 | **完了** |
| 本番 secrets 登録（13個） | **完了** |
| `wrangler deploy` 本番デプロイ | **完了** |

**本番 URL: `https://furikaeri-mcp.okumuradaichi2007.workers.dev`**
**MCP エンドポイント: `https://furikaeri-mcp.okumuradaichi2007.workers.dev/mcp`**

### ツール実装状況

| ツール | ステータス | 備考 |
|---|---|---|
| `get_tasks` | **完了** | Supabase PostgREST、OR 条件横断取得、カテゴリ説明文付き |
| `get_peak_logs` | **完了** | Supabase PostgREST、reflections リレーション |
| `get_commits` | **完了・動作確認済み** | GitHub REST API、User-Agent ヘッダー追加済み |
| `get_calendar_events` | **完了** | fetch ベースの Google Calendar REST API |
| `get_photos_url` | **完了** | Uint8Array / btoa（Workers 互換） |
| `get_diary` | **スタブ完了** | 空配列を返す（日記アプリ未開発） |
| `get_day_summary` | **完了** | Promise.allSettled 並行取得（transactions 含む） |
| `get_transactions` | **完了** | Cloudflare R2 から月次 CSV を取得・パース（`transactions/YYYY-MM.csv`） |
| `get_location_history` | **完了** | Google Maps Timeline.json を R2 から取得し日付別にフィルタ・KV キャッシュ（TTL 7日） |

### Transport

- [x] Streamable HTTP（`/mcp`）— Workers 上で McpAgent が処理
- [ ] stdio — 廃止（Workers では不要）

---

## 積み残し・注意点

### 次にやること

1. **claude.ai コネクター登録**
   - Settings > Integrations > Add custom integration
   - URL: `https://furikaeri-mcp.okumuradaichi2007.workers.dev/mcp`

2. **Claude Code への登録**（任意）
   ```bash
   claude mcp add furikaeri --transport http https://furikaeri-mcp.okumuradaichi2007.workers.dev/mcp
   ```

3. **本番環境での全ツール動作確認**
   - get_tasks / get_peak_logs / get_calendar_events / get_commits / get_transactions / get_location_history を実データで確認
   - get_location_history は実際の Timeline.json（全期間）を KV にアップロード後に確認

4. **毎月の transactions CSV 更新**（月次運用）
   ```bash
   iconv -f SHIFT_JIS -t UTF-8 download.csv > transactions-YYYY-MM.csv
   npx wrangler r2 object put furikaeri-storage/transactions/YYYY-MM.csv --file=./transactions-YYYY-MM.csv --remote
   ```

### その他の注意点

- **R2 バケット `furikaeri-storage`**: `location-history/Timeline.json`（102MB）と `transactions/YYYY-MM.csv` を格納。KV ではなく R2 を使用
- **`get_location_history` の R2 キー**: `location-history/Timeline.json`（固定）。Google Maps タイムラインからエクスポートした JSON をアップロード
- **locationHistory KV キャッシュ**: キー `location-history:YYYY-MM-DD`、TTL 7日。Timeline.json 再アップロード後は `wrangler kv key delete "location-history:YYYY-MM-DD" --binding FURIKAERI_KV --remote` でクリアすること
- **Google Calendar access_token KV キャッシュ**: キー `google-calendar-access-token`、TTL 50分。手動クリアは不要（期限切れで自動リフレッシュ）
- **`get_transactions` の R2 キー設計**: `transactions/YYYY-MM.csv`（月次ファイル）。CSV は Shift_JIS → UTF-8 変換済みを R2 にアップロードすること
- **`FURIKAERI_KV` namespace ID**: `1853546da21e4a42985acc9af617dc24`（wrangler.toml に設定済み）
- **`performedAt` のレスポンス形式が変更済み**: `"2026-03-14T19:10:00Z"` → `"2026-03-14T19:10:00+09:00"`（`toJSTISOString` で変換）
- peak-log 本体の DB は UTC 正規化済み（`scripts/migrate-performed-at.ts` を開発 DB で実行済み）
- **`get_tasks` レスポンスにカテゴリ説明文追加済み**: トップレベルに `categories: [{ name, description }]` を返す（Yarukoto の `categories.description` カラム追加対応）
- Peak Log Supabase プロジェクトの Data API は有効化済み（以前は無効で PGRST002 が発生していた）
- `get_diary` は日記アプリ未開発のためスタブ実装（空配列を返す）
- `get_commits` の全リポジトリ取得は 100 件上限（個人利用では問題なし）、`type=owner` で organization リポジトリを除外済み
- `@modelcontextprotocol/sdk` は `1.26.0` に固定（`agents@0.5.0` の依存に合わせるため）
- Supabase PostgREST の OR + AND 条件: `.or("and(col.gte.X,col.lt.Y),...")` 構文を使用
- GitHub PAT は classic（`ghp_`）が必須。fine-grained PAT では `/user/repos` が 403 になる
- Cloudflare Workers の `fetch()` は `User-Agent` を自動付与しない → `getGithubClient` で明示設定済み

---

## 次のセッションで相談したいこと

1. 本番環境での全ツール実データ動作確認
2. 案C: Timeline.json を月次分割して R2 保存（`location-history/YYYY-MM.json`）— 初回アクセスも高速化できる根本的解決策
3. 日記アプリ開発（`get_diary` のスタブ解除）
4. 追加ツール・機能の検討
