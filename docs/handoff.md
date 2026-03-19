# furikaeri-mcp — セッション引き継ぎ

> 最終更新: 2026-03-20（セッション #13）
> バージョン: 0.1.0
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

1. **claude.ai コネクター登録**
   - Settings > Integrations > Add custom integration
   - URL: `https://furikaeri-mcp.okumuradaichi2007.workers.dev/mcp`

2. **Claude Code への登録**（任意）
   ```bash
   claude mcp add furikaeri --transport http https://furikaeri-mcp.okumuradaichi2007.workers.dev/mcp
   ```

3. **本番環境での全ツール動作確認**
   - get_tasks / get_peak_logs / get_calendar_events / get_commits を実データで確認

### その他の注意点

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
2. 日記アプリ開発（`get_diary` のスタブ解除）
3. 追加ツール・機能の検討
