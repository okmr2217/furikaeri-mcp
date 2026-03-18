# furikaeri-mcp — セッション引き継ぎ

> 最終更新: 2026-03-19
> バージョン: 0.1.0
> このドキュメントは「今どこにいるか」を記録する。コンセプト・技術設計は @docs/project.md を参照。

---

## 現在の実装状態

### アーキテクチャ

**Cloudflare Workers + GitHub OAuth** 構成への全面移行完了。

| 項目 | 状態 |
|---|---|
| Workers エントリポイント（McpAgent + OAuthProvider） | **完了** |
| GitHub OAuth フロー（workers-oauth-provider + KV） | **実装完了（未テスト）** |
| Supabase JS Client への移行（Prisma 削除） | **完了** |
| 全ツール Workers 対応 | **完了** |
| wrangler.toml 設定 | **作成済み（KV ID 未設定）** |

### ツール実装状況

| ツール | ステータス | 備考 |
|---|---|---|
| `get_tasks` | **完了** | Supabase PostgREST、OR 条件横断取得 |
| `get_peak_logs` | **完了** | Supabase PostgREST、reflections リレーション |
| `get_commits` | **完了** | GitHub REST API、env 経由に変更済み |
| `get_calendar_events` | **完了** | fetch ベースの Google Calendar REST API |
| `get_photos_url` | **完了** | Uint8Array / btoa（Workers 互換） |
| `get_diary` | **スタブ完了** | 空配列を返す（日記アプリ未開発） |
| `get_day_summary` | **完了** | Promise.allSettled 並行取得 |

### Transport

- [x] Streamable HTTP（`/mcp`）— Workers 上で McpAgent が処理
- [ ] stdio — 廃止（Workers では不要）

---

## 積み残し・注意点

### デプロイ前に必要な作業（ユーザーが手動で実施）

1. **KV namespace 作成**
   ```bash
   wrangler kv:namespace create "OAUTH_KV"
   ```
   出力された ID を `wrangler.toml` の `<Add-KV-ID-here>` に設定する。

2. **GitHub OAuth App 作成**（GitHub の Settings > Developer settings > OAuth Apps）
   - ローカル用: Homepage `http://localhost:8788`, Callback `http://localhost:8788/callback`
   - 本番用: Homepage `https://furikaeri-mcp.<account>.workers.dev`, Callback `https://furikaeri-mcp.<account>.workers.dev/callback`

3. **ALLOWED_USERNAMES に自分の GitHub ユーザー名を追記**（`src/index.ts`）
   ```typescript
   const ALLOWED_USERNAMES = new Set<string>([
     "your-github-username",  // ← ここに追記
   ]);
   ```

4. **`.dev.vars` 作成**（`.dev.vars.example` をコピーして値を設定）

5. **ローカル動作確認**
   ```bash
   wrangler dev
   npx @modelcontextprotocol/inspector  # 接続先: http://localhost:8788/mcp
   ```

6. **本番 secrets 登録 + デプロイ**
   ```bash
   wrangler secret put GITHUB_CLIENT_ID
   # ... 他 secrets も同様
   wrangler deploy
   ```

### その他の注意点

- `get_diary` は日記アプリ未開発のためスタブ実装（空配列を返す）
- `get_commits` の全リポジトリ取得は 100 件上限（個人利用では問題なし）
- `@modelcontextprotocol/sdk` は `1.26.0` に固定（`agents@0.5.0` の依存に合わせるため）
- Supabase PostgREST の OR + AND 条件: `.or("and(col.gte.X,col.lt.Y),...")` 構文を使用

---

## 次のセッションで相談したいこと

1. KV 作成・OAuth App 作成・secrets 設定 → `wrangler dev` でローカル動作確認
2. 全ツールの実データ接続テスト（Supabase・GitHub・Google Calendar）
3. `wrangler deploy` で本番デプロイ → claude.ai コネクター登録
