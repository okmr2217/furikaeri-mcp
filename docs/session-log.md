# Session Log

> セッションごとの作業記録。新しい記録をこの直下に追記する（時系列降順）。

<!--
## YYYY-MM-DD セッション記録フォーマット

### やったこと
-

### 改善案（未対応）
-

### 失敗したアプローチ
-

### 技術メモ
-

### 次にやりたいこと
-
-->

---

## 2026-03-20 セッション記録 #13

### やったこと
- `get_commits` のリポジトリ未指定時の対象を personal リポジトリのみに絞り込み
  - `/user/repos` に `type=owner` パラメータを追加し、organization リポジトリを除外

### 技術メモ
- GitHub API `/user/repos?type=owner` は認証ユーザー本人が owner のリポジトリのみ返す（organization・collaborator リポジトリは除外）

### 次にやりたいこと
- 全ツールの本番環境動作確認

---

## 2026-03-19 セッション記録 #12

### やったこと
- Peak Log Supabase プロジェクトの PostgREST 503（PGRST002）を調査・解決
  - 原因: Supabase ダッシュボードで Data API（PostgREST）が無効になっていた
  - Project Settings → API → Data API を有効化して解決

### 技術メモ
- PGRST002「Could not query the database for the schema cache」は PostgREST がスキーマ情報を取得できない状態を示す
- SQL Editor は直接 PostgreSQL に接続するため、PostgREST が無効でも動作する（切り分けの注意点）
- Supabase で Data API を有効化する場所: Project Settings → API → Data API（Enable/Disable トグル）

### 次にやりたいこと
- get_peak_logs の実データ動作確認
- 全ツールの本番環境動作確認

---

## 2026-03-19 セッション記録 #11

### やったこと
- 本番 secrets 登録（`wrangler secret put` × 13個）
  - GitHub OAuth App（本番用）を新規作成し CLIENT_ID / CLIENT_SECRET を登録
  - その他（COOKIE_ENCRYPTION_KEY / GITHUB_TOKEN / Supabase / Google Calendar）は `.dev.vars` の値をそのまま登録
- `wrangler deploy` で本番デプロイ完了
  - デプロイ先: `https://furikaeri-mcp.okumuradaichi2007.workers.dev`
  - MCP エンドポイント: `https://furikaeri-mcp.okumuradaichi2007.workers.dev/mcp`
- GitHub OAuth App の Callback URL を本番 URL に更新

### 技術メモ
- 初回デプロイ前に Cloudflare ダッシュボードで Workers & Pages を一度開く必要がある（workers.dev サブドメインの自動作成のため）。開かずに `wrangler deploy` すると `code: 10063` エラーになる
- `wrangler secret put` は非対話モードで `echo "value" | wrangler secret put KEY` として実行できる
- 初回 `wrangler deploy` 時に Worker が存在しない場合、`wrangler secret put` が自動で Worker を作成する

### 次にやりたいこと
- claude.ai コネクター登録・動作確認
- Claude Code への MCP 登録
- 本番環境での全ツール実データ動作確認

---

## 2026-03-19 セッション記録 #10

### やったこと
- ローカル開発環境のセットアップを完了
  - Cloudflare KV namespace 作成（OAUTH_KV）・`wrangler.toml` に ID 反映
  - `wrangler.toml` の `[[migrations]]` 構文エラーを修正（`[migrations]` → `[[migrations]]`）
  - GitHub OAuth App 作成（ローカル用）・`ALLOWED_USERNAMES` に `okmr2217` を追加
  - `.dev.vars` を作成し全 secrets を設定（`.env` から移植 + Supabase service key 追加）
  - Supabase 接続: 接続文字列（Prisma 用）からプロジェクト URL + service_role key 方式に移行
  - `wrangler dev` 起動・MCP Inspector で GitHub OAuth フロー動作確認
- `get_commits` の 403 エラーを修正
  - 原因: Cloudflare Workers の `fetch()` は `User-Agent` を自動付与しない
  - 対処: `src/lib/github.ts` に `"User-Agent": "furikaeri-mcp"` を追加
  - classic PAT（`ghp_`）を新規発行（fine-grained PAT では `/user/repos` が 403 になるため）
- プロジェクト整理
  - `.wrangler/` を `.gitignore` に追加
  - `.env` / `.env.example` を削除（Workers 移行で不要に）

### 技術メモ
- Cloudflare Workers の `fetch()` は User-Agent を付与しない。GitHub API は User-Agent 必須なので `"User-Agent": "furikaeri-mcp"` を明示する必要がある
- fine-grained PAT は `/user/repos`（全リポジトリ一覧）に 403 を返す。`repos` 省略時の全リポジトリ取得には classic PAT（`repo` スコープ）が必要
- Supabase URL は接続文字列の `postgres.[project-id]` からプロジェクト ID を取り出して `https://[project-id].supabase.co` で構成できる

### 次にやりたいこと
- 残りのツール（`get_tasks` / `get_peak_logs` / `get_calendar_events`）の動作確認
- `wrangler deploy` で本番デプロイ
- claude.ai コネクター / Claude Code への登録

---

## 2026-03-19 セッション記録 #9

### やったこと
- Cloudflare Workers + GitHub OAuth 構成へ全面移行
  - Prisma / Express / Node.js 依存を完全削除
  - `package.json` を Workers 向けに書き換え（wrangler, agents, @cloudflare/workers-oauth-provider 等）
  - `tsconfig.json` を Workers（bundler モード）向けに変更
  - `wrangler.toml` を新規作成（Durable Objects, KV binding 設定）
  - `src/index.ts` を McpAgent + OAuthProvider ベースに全面書き換え
  - `src/github-handler.ts` を新規作成（GitHub OAuth フロー）
  - `src/utils.ts` / `src/workers-oauth-utils.ts` を新規作成（OAuth ユーティリティ）
  - `src/lib/supabase.ts` を新規作成（Supabase JS Client ヘルパー）
  - `src/lib/google-calendar.ts` を googleapis → fetch ベースに書き換え
  - `src/lib/photos-url.ts` を Buffer → Uint8Array / btoa に書き換え
  - `src/lib/date-utils.ts` を date-fns → 標準 Date + 手動 JST 計算に変更
  - `src/lib/github.ts` を `process.env` → `env: Env` に変更
  - 全ツール（7本）を `env: Env` 受け渡し形式に変更、Supabase PostgREST クエリに移行
  - `src/types/index.ts` に `Env` インターフェースを追加
  - Prisma 関連ファイル（`prisma/` ディレクトリ、`src/lib/prisma-*.ts`）を削除

### 技術メモ
- `agents@0.5.0` が `@modelcontextprotocol/sdk@1.26.0` をピン留めしている。外部で `^1.x` を入れると別バージョンがインストールされ private property の型不一致が発生する → `"@modelcontextprotocol/sdk": "1.26.0"` で固定することで解消
- `github-handler.ts` で `import { env } from "cloudflare:workers"` を使うと型が合わない。`c.env` （Hono コンテキスト）から取得するのが正解
- Supabase PostgREST の OR 条件内で AND を組み合わせる構文: `.or("and(col.gte.X,col.lt.Y),...")`
- `catch (_e)` は ESLint `no-unused-vars` に引っかかる。`catch {}` に統一する

### 次にやりたいこと
1. KV namespace を作成し `wrangler.toml` の `<Add-KV-ID-here>` を実際の ID に更新
2. GitHub OAuth App を作成（ローカル用・本番用各1つ）
3. `.dev.vars` を作成してローカル開発 secrets を設定
4. `ALLOWED_USERNAMES` に自分の GitHub ユーザー名を追記
5. `wrangler dev` でローカル動作確認（MCP Inspector で接続テスト）
6. 問題なければ `wrangler deploy` で本番デプロイ
7. `claude mcp add furikaeri --transport http https://furikaeri-mcp.<account>.workers.dev/mcp` で登録

---

## 2026-03-19 セッション記録 #8

### やったこと
- Streamable HTTP transport 対応を実装
  - `src/mcp-server.ts` に `createServer()` ファクトリを切り出し
  - `src/index.ts` を `TRANSPORT=stdio|http` 環境変数で分岐するよう変更
  - HTTP モード: `createMcpExpressApp()` + `StreamableHTTPServerTransport` でセッション管理付き実装
  - `express` / `@types/express` を依存に追加
  - `.env.example` に `TRANSPORT` / `PORT` / `GITHUB_TOKEN` を追記

### 技術メモ
- `createMcpExpressApp({ host: "0.0.0.0" })` は Railway など公開環境でのバインドに必要
  - localhost 系では DNS rebinding protection が自動有効になるが、`0.0.0.0` では無効（警告が出るのみ）
- セッション管理: `StreamableHTTPServerTransport` は1インスタンス = 1セッション
  - `onsessioninitialized` / `onsessionclosed` コールバックで `Map<sessionId, transport>` を管理
  - `onsessioninitialized: (id) => { transports.set(id, t); }` で `t` を閉じる（クロージャパターン）
- `Map.set()` / `Map.delete()` の戻り値が `void | Promise<void>` と不一致でエラー → `{ }` で包んで解決
- claude.ai カスタムコネクターは OAuth か authless の2択 → Phase 2 は authless で実装
  - 将来的な保護はインフラ層（Cloudflare Access 等）で対応する設計

### 次にやりたいこと
- Railway デプロイ（`TRANSPORT=http` で起動確認）
- claude.ai のカスタムコネクター登録・動作確認

---

## 2026-03-19 セッション記録 #7

### やったこと
- `get_commits` の `repos` パラメータを省略可能に変更
  - 未指定時は `GET /user/repos` で全リポジトリ一覧を自動取得し、横断的にコミット検索
- `README.md` 新規作成（プロジェクト概要・セットアップ手順・ツール一覧）
- `docs/handoff.md` にマルチユーザー対応の将来構想セクションを追加

### 技術メモ
- `GET /user/repos` は GitHub の認証済み PAT でアクセスでき、全リポジトリ名を返す
- repos 省略時の全取得はページネーション未対応（100件上限）だが個人利用では問題なし

### 次にやりたいこと
- 全ツールの実動作確認（Supabase・GitHub・Google Calendar それぞれ接続確認）
- Phase 2: Streamable HTTP transport への切り替え・Railway デプロイ

---

## 2026-03-19 セッション記録 #6

### やったこと
- `src/tools/get-day-summary.ts` 実装（集約ツール）
  - fetchTasks / fetchPeakLogs / fetchDiary / fetchCalendarEvents / fetchPhotosUrl を内部関数として定義
  - `Promise.allSettled` で 5 ソース並行取得、部分成功に対応
  - 失敗したソースは `{ error: true, message, code }` 形式で格納
- `src/index.ts` に registerGetDaySummary を登録
- typecheck・lint・build（tsc）すべてクリーン、コミット完了

### 技術メモ
- fetchPhotosUrl は同期関数だが `Promise.resolve()` でラップして allSettled に渡す
- 既存ツールを改変せず、get-day-summary.ts 内に同等ロジックを直接実装（不要な抽象化を避けるため）

### 次にやりたいこと
- Claude Code での動作確認（`get_day_summary` を実際に呼び出してテスト）
- `get_calendar_events` / `get_commits` の実動作確認（Supabase・GitHub・Google Calendar）
- Phase 2: Streamable HTTP transport への切り替え・Railway デプロイ

---

## 2026-03-19 セッション記録 #5

### やったこと
- `src/lib/google-calendar.ts` 作成（OAuth2 クライアント、`getCalendarClient()` エクスポート）
- `src/tools/get-calendar-events.ts` 実装（Zod バリデーション、JST オフセット付き timeMin/timeMax、終日/時間指定イベント区別、summary 算出、エラーハンドリング）
- `src/tools/get-diary.ts` 実装（スタブ：空の entries 配列を返す）
- `src/index.ts` に両ツール登録
- typecheck・lint クリーン、コミット完了

### 技術メモ
- `googleapis` の `calendar.events.list` は `res.data.items` が `undefined` の場合あり、`?? []` でフォールバック
- 終日イベント判定: `event.start.date` あり かつ `event.start.dateTime` なし
- `google.auth.OAuth2` は `client_id`/`client_secret` のみで初期化し、`setCredentials({ refresh_token })` でトークンをセット

### 次にやりたいこと
- `get_calendar_events` の動作確認（実際の Google Calendar データで確認）
- `get_commits` の動作確認

---

## 2026-03-19 セッション記録 #4

### やったこと
- `prisma/peak-log/schema.prisma` 作成（Activity・Log・Reflection モデル、`@@map` でテーブル名明示）
- `npx prisma generate --schema=prisma/peak-log/schema.prisma` 実行（output: `node_modules/.prisma/peak-log`）
- `src/lib/prisma-peak-log.ts` 作成（Peak Log 用 PrismaClient）
- `src/tools/get-peak-logs.ts` 実装（performedAt の JST 日付範囲フィルター、activity + reflection を include、summary 算出）
- `src/index.ts` に get_peak_logs を登録

### 改善案（未対応）
- なし

### 失敗したアプローチ
- なし

### 技術メモ
- `averageExcitement` は excitement が null でないログのみ対象にして計算（小数点1桁に丸め）
- `prisma:generate` スクリプトは既に両スキーマを含む構成になっていた

### 次にやりたいこと
- get_peak_logs の動作確認（Supabase セッションプーラーで接続確認）
- get_calendar_events の実装（Google Calendar API）

---

## 2026-03-18 セッション記録 #3

### やったこと
- `prisma/yarukoto/schema.prisma` 作成（Task・Category モデル、TaskStatus・Priority enum、`@@map` でテーブル名を明示）
- `npx prisma generate` 実行（output: `node_modules/.prisma/yarukoto`）
- `src/lib/prisma-yarukoto.ts` 作成（Yarukoto 用 PrismaClient）
- `src/tools/get-tasks.ts` 初期実装（scheduledAt のみフィルター）→ 横断取得に再設計
  - scheduledAt / completedAt / skippedAt / createdAt の OR 条件で union 取得
  - 各タスクに `reasons` フィールドを追加
  - summary を scheduled / completedOnDate / skippedOnDate / createdOnDate に変更
- `src/index.ts` に get_tasks を登録
- `src/types/index.ts` の Task / TasksResult 型を新仕様に合わせて更新
- `docs/spec.md` §4.1 を新仕様に更新

### 改善案（未対応）
- なし

### 失敗したアプローチ
- Supabase ダイレクト接続（port 5432）はローカル環境（IPv4）から到達不可 → セッションプーラーに切り替えが必要

### 技術メモ
- Supabase ダイレクト接続は IPv6 必須。ローカル開発はセッションプーラー（pooler.supabase.com:5432）を使う
- Railway 本番はダイレクト接続が使えるが、セッションプーラーでも問題なし
- `toJSTDateRange` が DateTime フィルターの JST→UTC 変換をカバー。scheduledAt（DATE 型）は直接比較

### 次にやりたいこと
- get_tasks の動作確認（Supabase セッションプーラーで接続確認）
- get_peak_logs の実装（Peak Log DB）
- get_calendar_events の実装（Google Calendar API）

---

## 2026-03-18 セッション記録 #2

### やったこと
- `src/lib/photos-url.ts` 実装（formatDateForPhotos / encodeVarint / generatePhotosSearchUrl）
- `src/tools/get-photos-url.ts` 実装（Zod バリデーション付き、PhotosUrlResult 返却）
- `src/index.ts` に get_photos_url を登録
- `.env` ファイル作成（空値のテンプレート）
- `claude mcp add` で Claude Code に MCP を登録
- 動作確認: get_photos_url が正常動作することを確認

### 改善案（未対応）
- なし

### 失敗したアプローチ
- なし

### 技術メモ
- Google Photos URL 生成は Protobuf を手動エンコード（Field 1: クエリ, Field 4: 内部メッセージ, Field 5: タイムスタンプms, Field 7: 固定値3）
- `encodeVarint` は 7 ビットずつ分割して MSB を continuation bit として使う標準実装
- `claude mcp add furikaeri-mcp -- npx tsx src/index.ts` で登録、セッション再起動後に有効化

### 次にやりたいこと
- Prisma スキーマ作成（prisma/yarukoto/schema.prisma、prisma/peak-log/schema.prisma）
- get_tasks ツール実装（Yarukoto DB）
- get_peak_logs ツール実装（Peak Log DB）

---

## 2026-03-18 セッション記録

### やったこと
- package.json（type: module、全依存パッケージ）
- tsconfig.json（strict mode、NodeNext モジュール解決）
- .env.example（§3 の環境変数一覧）
- .gitignore（node_modules / .env / .prisma / dist）
- eslint.config.js（typescript-eslint flat config、any 禁止）
- src/index.ts（McpServer 初期化 + StdioServerTransport 接続、ツール登録は空）
- src/types/index.ts（全ツールの返却データ型: TasksResult / PeakLogsResult / DiaryResult / CalendarEventsResult / PhotosUrlResult / DaySummaryResult / ErrorResult）
- src/lib/date-utils.ts（toJSTDateRange: JST日付文字列→UTC Dateの日範囲変換）
- npm install 完了、typecheck・lint エラーなし

### 改善案（未対応）
- なし

### 失敗したアプローチ
- なし

### 技術メモ
- `"type": "module"` + `moduleResolution: NodeNext` のため、TS import には `.js` 拡張子が必要
- `date-fns-tz` v3 の API は `fromZonedTime`（v2 の `zonedTimeToUtc` から改名）
- Prisma マルチDB は `prisma generate --schema=...` を2回実行する構成（スキーマはまだ未作成）

### 次にやりたいこと
- Prisma スキーマ作成（prisma/yarukoto/schema.prisma、prisma/peak-log/schema.prisma）
- get_tasks ツール実装（Yarukoto DB）
- get_peak_logs ツール実装（Peak Log DB）
- stdio 動作確認（Claude Code に登録してテスト）

---

（まだ記録なし — 次のセッション終了時から追記が始まる）
