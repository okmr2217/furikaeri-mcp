# furikaeri-mcp — セッション引き継ぎ

> 最終更新: 2026-03-19
> バージョン: 0.1.0
> このドキュメントは「今どこにいるか」を記録する。コンセプト・技術設計は @docs/project.md を参照。

---

## 現在の実装状態

### アーキテクチャ

**Cloudflare Workers + GitHub OAuth** 構成への全面移行完了。ローカル開発環境（`wrangler dev`）での動作確認済み。

| 項目 | 状態 |
|---|---|
| Workers エントリポイント（McpAgent + OAuthProvider） | **完了** |
| GitHub OAuth フロー（workers-oauth-provider + KV） | **完了・動作確認済み** |
| Supabase JS Client への移行（Prisma 削除） | **完了** |
| 全ツール Workers 対応 | **完了** |
| wrangler.toml 設定（KV ID 設定済み） | **完了** |
| ローカル .dev.vars 設定 | **完了** |

### ツール実装状況

| ツール | ステータス | 備考 |
|---|---|---|
| `get_tasks` | **完了** | Supabase PostgREST、OR 条件横断取得 |
| `get_peak_logs` | **完了** | Supabase PostgREST、reflections リレーション |
| `get_commits` | **完了・動作確認済み** | GitHub REST API、User-Agent ヘッダー追加済み |
| `get_calendar_events` | **完了** | fetch ベースの Google Calendar REST API |
| `get_photos_url` | **完了** | Uint8Array / btoa（Workers 互換） |
| `get_diary` | **スタブ完了** | 空配列を返す（日記アプリ未開発） |
| `get_day_summary` | **完了** | Promise.allSettled 並行取得 |

### Transport

- [x] Streamable HTTP（`/mcp`）— Workers 上で McpAgent が処理
- [ ] stdio — 廃止（Workers では不要）

---

## 積み残し・注意点

### 次にやること

1. **残りツールの動作確認**（`wrangler dev` 環境で MCP Inspector から）
   - `get_tasks`、`get_peak_logs`、`get_calendar_events` を実際のデータで確認

2. **本番デプロイ**
   ```bash
   # 本番 secrets 登録
   wrangler secret put GITHUB_CLIENT_ID
   wrangler secret put GITHUB_CLIENT_SECRET
   wrangler secret put COOKIE_ENCRYPTION_KEY
   wrangler secret put GITHUB_TOKEN
   wrangler secret put YARUKOTO_SUPABASE_URL
   wrangler secret put YARUKOTO_SUPABASE_SERVICE_KEY
   wrangler secret put YARUKOTO_USER_ID
   wrangler secret put PEAK_LOG_SUPABASE_URL
   wrangler secret put PEAK_LOG_SUPABASE_SERVICE_KEY
   wrangler secret put PEAK_LOG_USER_ID
   wrangler secret put GOOGLE_CLIENT_ID
   wrangler secret put GOOGLE_CLIENT_SECRET
   wrangler secret put GOOGLE_REFRESH_TOKEN

   wrangler deploy
   ```

3. **Claude への登録**
   - Claude.ai: Settings > Connectors > Add custom connector → `https://furikaeri-mcp.<account>.workers.dev/mcp`
   - Claude Code: `claude mcp add furikaeri --transport http https://furikaeri-mcp.<account>.workers.dev/mcp`

### その他の注意点

- `get_diary` は日記アプリ未開発のためスタブ実装（空配列を返す）
- `get_commits` の全リポジトリ取得は 100 件上限（個人利用では問題なし）
- `@modelcontextprotocol/sdk` は `1.26.0` に固定（`agents@0.5.0` の依存に合わせるため）
- Supabase PostgREST の OR + AND 条件: `.or("and(col.gte.X,col.lt.Y),...")` 構文を使用
- GitHub PAT は classic（`ghp_`）が必須。fine-grained PAT では `/user/repos` が 403 になる
- Cloudflare Workers の `fetch()` は `User-Agent` を自動付与しない → `getGithubClient` で明示設定済み

---

## 次のセッションで相談したいこと

1. 残りツール（get_tasks / get_peak_logs / get_calendar_events）の実データ接続テスト
2. `wrangler deploy` で本番デプロイ → claude.ai コネクター / Claude Code 登録
