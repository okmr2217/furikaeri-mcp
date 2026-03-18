# furikaeri-mcp — セッション別指示文

このファイルは、Claude Code で実装を進める際の各セッションの指示文をまとめたものです。

## 指示文を使う上での原則

- **今日やること**と**やらないこと**を両方明示する
- 仕様書のセクション番号で参照箇所を指定する（Claude が読む範囲を絞れる）
- フェーズをまたぐ実装を 1 セッションで頼まない
- Claude が自律的に範囲を広げないよう、明示的に制御する

## セッション構成

| セッション | フェーズ | 内容 | 仕様書参照 |
|---|---|---|---|
| #1 | Phase 1-2 | プロジェクト初期化 + MCP 骨格 | §3 §6 §7 |
| #2 | Phase 3 | get_photos_url | §4.5 |
| #3 | Phase 4-5 | Prisma マルチ DB + get_tasks | §5 §7 §4.1 §8 §9 |
| #4 | Phase 6 | get_peak_logs | §4.2 §5 §8 §9 |
| #5 | Phase 7 | get_commits | §4.3 |
| #6 | Phase 8-9 | get_calendar_events + get_diary スタブ | §4.4 §4.5 §9 §10 |
| #7 | Phase 10-11 | get_day_summary + 動作確認 | §4.6 §10 |

---

## セッション #1 — プロジェクト初期化 + MCP サーバーの骨格

```
docs/handoff.md を読んで現状を把握してください。

今日のゴール: Phase 1-2（プロジェクト初期化 + MCP サーバーの骨格）

仕様書は docs/spec.md を参照してください（特に §3 §6 §7）。

今日実装するのは以下だけです:

【ファイル・設定】
- package.json（"type": "module" を含む）
- tsconfig.json（strict mode）
- .env.example（§4 の環境変数）
- .gitignore（node_modules, .env, .prisma, dist）
- ESLint 設定

【ソースコード】
- src/index.ts（McpServer 初期化 + StdioServerTransport 接続のみ。ツール登録は空）
- src/types/index.ts（共通型定義。§5 の返却データ型を定義）
- src/lib/date-utils.ts（§10 の JST 変換: toJSTDateRange(date: string): { start: Date; end: Date }）

【やらないこと】
- ツール（get_tasks 等）の実装
- Prisma スキーマの作成
- Google Calendar API の設定

依存パッケージ: @modelcontextprotocol/sdk, zod, prisma, @prisma/client, googleapis, dotenv, date-fns, date-fns-tz, tsx（devDeps）
```

---

## セッション #2 — get_photos_url

```
docs/handoff.md を読んで現状を把握してください。

今日のゴール: get_photos_url ツールの実装（外部依存なし、最初の動作確認）

仕様書は docs/spec.md §4.5 を参照してください。

今日実装するのは以下だけです:

- src/lib/photos-url.ts
  - formatDateForPhotos(dateStr: string): string（YYYY-MM-DD → YYYY年M月D日）
  - encodeVarint(value: number): Buffer
  - generatePhotosSearchUrl(query: string): string（§5.5 の Protobuf 構造に従う）

- src/tools/get-photos-url.ts
  - Zod でパラメータバリデーション（date: YYYY-MM-DD）
  - src/lib/photos-url.ts を呼び出してURL生成
  - src/index.ts にツールを登録

【やらないこと】
- Prisma・DB 関連の実装
- Google Calendar API の実装
- 他のツールの実装

実装後、tsx src/index.ts でビルドが通ることを確認してください。
```

---

## セッション #3 — Prisma マルチ DB + get_tasks

```
docs/handoff.md を読んで現状を把握してください。

今日のゴール: Prisma マルチ DB セットアップ + get_tasks 実装

仕様書は docs/spec.md の以下を参照してください:
- §5（Yarukoto DB スキーマ）
- §7（Prisma マルチ DB 構成）
- §4.1（get_tasks ツール仕様）
- §8（userId の扱い）
- §9（タイムゾーン。ただし scheduledAt は DATE 型なので JST 変換不要）

今日実装するのは以下だけです:

【Prisma セットアップ】
- prisma/yarukoto/schema.prisma（§6 §8 に従う。output は ../../node_modules/.prisma/yarukoto）
  - enum: TaskStatus (PENDING, COMPLETED, SKIPPED)
  - enum: Priority (HIGH, MEDIUM, LOW)
  - Task モデル・Category モデル
- package.json に prisma:generate スクリプト追加
- npx prisma generate --schema=prisma/yarukoto/schema.prisma を実行
- src/lib/prisma-yarukoto.ts（§8 の通り）

【ツール実装】
- src/tools/get-tasks.ts（§5.1 に従う）
  - Zod でパラメータバリデーション（date 必須、status・category オプション）
  - scheduledAt = {date} でフィルター（DATE 型、そのまま比較）
  - YARUKOTO_USER_ID でフィルター
  - displayOrder ASC でソート
  - category を include
  - summary（total, completed, pending, skipped）を算出
  - エラーは §11 の形式で返す
- src/index.ts にツールを登録

【やらないこと】
- Peak Log（prisma/peak-log）の実装
- get_peak_logs の実装
- Google Calendar の実装
```

---

## セッション #4 — get_peak_logs

```
docs/handoff.md を読んで現状を把握してください。

今日のゴール: Peak Log の Prisma セットアップ + get_peak_logs 実装

仕様書は docs/spec.md の以下を参照してください:
- §5（Peak Log DB スキーマ）
- §7（Prisma マルチ DB 構成）
- §4.2（get_peak_logs ツール仕様）
- §8（userId の扱い）
- §9（performedAt は UTC 格納 → JST 変換が必要）

今日実装するのは以下だけです:

【Prisma セットアップ】
- prisma/peak-log/schema.prisma（§6 §8 に従う。output は ../../node_modules/.prisma/peak-log）
  - Activity モデル・Log モデル・Reflection モデル
- prisma:generate スクリプトに peak-log を追加
- npx prisma generate --schema=prisma/peak-log/schema.prisma を実行
- src/lib/prisma-peak-log.ts（§8 の通り）

【ツール実装】
- src/tools/get-peak-logs.ts（§5.2 に従う）
  - JST 日付範囲変換（src/lib/date-utils.ts の toJSTDateRange を使用）
    - performedAt >= {date}T00:00:00+09:00
    - performedAt < {date+1}T00:00:00+09:00
  - PEAK_LOG_USER_ID でフィルター
  - activity と reflection を include
  - アーカイブ済み activity も含める（isArchived でフィルターしない）
  - summary（totalLogs, withReflection, averageExcitement）を算出
  - エラーは §11 の形式で返す
- src/index.ts にツールを登録

【やらないこと】
- Google Calendar の実装
- get_diary の実装
- get_day_summary の実装
```

---

## セッション #5 — get_commits

```
docs/handoff.md を読んで現状を把握してください。

今日のゴール: get_commits 実装（GitHub REST API）

仕様書は docs/project.md の「get_commits 設計詳細」を参照してください。

今日実装するのは以下だけです:

【ライブラリ・クライアント】
- src/lib/github.ts
  - GITHUB_TOKEN で Authorization ヘッダーを設定した fetch ラッパー or octokit クライアント
  - getGithubClient() 関数をエクスポート

【ツール実装（まず include_stats: false）】
- src/tools/get-commits.ts
  - Zod でパラメータバリデーション（repos: string[], since: string, until: string, include_stats?: boolean）
  - GET /repos/{owner}/{repo}/commits を since / until で絞り込み
  - 複数リポジトリは Promise.all で並列取得
  - include_stats: false の場合: sha / message / author / date のみ返す
  - include_stats: true の場合: 各コミットに対して GET /repos/{owner}/{repo}/commits/{sha} を呼び出し stats + files を追加
  - エラーは ErrorResult の形式で返す（リポジトリ単位でエラーを分離し、他のリポジトリの結果は返す）
- src/index.ts にツールを登録

【やらないこと】
- get_calendar_events の実装
- Prisma の追加実装
- include_stats: true は実装してもよいが、まず false で動作確認してから追加する
```

---

## セッション #6 — get_calendar_events + get_diary スタブ

```
docs/handoff.md を読んで現状を把握してください。

今日のゴール: get_calendar_events 実装 + get_diary スタブ実装

仕様書は docs/spec.md の以下を参照してください:
- §4.4（get_calendar_events ツール仕様）
- §4.3（get_diary ツール仕様）
- §9（タイムゾーン。timeMin/timeMax は JST オフセット付きで指定）
- §10（エラーハンドリング）

今日実装するのは以下だけです:

【Google Calendar】
- src/lib/google-calendar.ts
  - googleapis の calendar_v3 を使用
  - OAuth2 クライアントを GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN で初期化
  - getCalendarClient() 関数をエクスポート

- src/tools/get-calendar-events.ts（§5.4 に従う）
  - Zod でパラメータバリデーション（date 必須、calendarId オプション）
  - timeMin: {date}T00:00:00+09:00、timeMax: {date}T23:59:59+09:00
  - singleEvents: true、orderBy: "startTime"
  - 終日イベント（event.start.date あり）と時間指定イベントを区別
  - summary（totalEvents, allDayEvents, timedEvents）を算出
  - エラーは §11 の形式で返す

【日記スタブ】
- src/tools/get-diary.ts（§5.3 に従う）
  - DB 未接続のスタブとして空の entries 配列を返す
  - TODO: 日記アプリ開発後に実装

- src/index.ts に両ツールを登録

【やらないこと】
- get_day_summary の実装
- Prisma の追加実装
```

---

## セッション #7 — get_day_summary + 動作確認

```
docs/handoff.md を読んで現状を把握してください。

今日のゴール: get_day_summary 実装 + ビルド・動作確認

仕様書は docs/spec.md の以下を参照してください:
- §4.6（get_day_summary ツール仕様）
- §10（エラーハンドリング。部分成功を許容する）

今日実装するのは以下:

【集約ツール】
- src/tools/get-day-summary.ts（§5.6 に従う）
  - 5 ツール（get_tasks, get_peak_logs, get_diary, get_calendar_events, get_photos_url）を Promise.allSettled で並行呼び出し
  - 個別のデータソースがエラーでも他のデータは返す（部分成功）
  - エラーのデータソースは { error: true, message, code } 形式で格納
- src/index.ts にツールを登録

【ビルド・動作確認】
- npm run build（tsc）が通ることを確認
- package.json に以下を確認:
  - "build": "tsc"
  - "start": "node dist/index.js"
  - "dev": "tsx src/index.ts"
- Claude Code への登録コマンドを確認:
  claude mcp add furikaeri-mcp -- node /path/to/furikaeri-mcp/dist/index.js

【セッション終了時】
- npm run typecheck && npm run lint を実行
- 問題なければコミット
- session-log.md・handoff.md を更新
```

---

## 補足: トラブル時の対処

### Prisma generate が失敗する場合

```
# 各スキーマを個別に実行する
npx prisma generate --schema=prisma/yarukoto/schema.prisma
npx prisma generate --schema=prisma/peak-log/schema.prisma
```

### Google Calendar の認証が通らない場合

```
# refresh_token の取得には OAuth2 フローが必要
# GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN を .env に設定
# OAuth2 Playground (https://developers.google.com/oauthplayground) で取得可能
```

### stdio transport で Claude Code に接続する場合

```bash
# dist/index.js をビルドしてから登録
npm run build
claude mcp add furikaeri-mcp -- node /絶対パス/furikaeri-mcp/dist/index.js

# 接続確認
claude mcp list
```
