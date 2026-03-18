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
