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
