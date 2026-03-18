# furikaeri-mcp — 仕様書

> バージョン: 0.1.0
> 最終更新: 2026-03-17

---

## 1. 概要

furikaeri-mcp は、複数のデータソースを統合して「ある日の振り返り」を提供する MCP サーバー。

個人が運用する以下のサービスのデータを、MCP プロトコル経由で読み取り専用で提供する:

| データソース | 接続方式 | 内容 |
|---|---|---|
| Yarukoto（TODO アプリ） | Supabase PostgreSQL（Prisma） | タスクの完了・未完了・スキップ |
| Peak Log（ピーク体験記録） | Supabase PostgreSQL（Prisma） | Activity ログ・余韻（Reflection） |
| 日記アプリ（新規開発予定） | Supabase PostgreSQL（Prisma） | 日記エントリ |
| Google Calendar | Google Calendar API v3 | 予定・イベント |
| Google Photos | URL 生成（API 不使用） | 検索 URL |

---

## 2. 利用シーン

- Claude Code から「3月14日を振り返って」と聞く
- 振り返りアプリ（Next.js、別途開発）から MCP Client として接続
- 日付を指定して各データソースの情報を集約し、AI でまとめを生成する入力データとして使用

---

## 3. 環境変数

```env
# Yarukoto DB
YARUKOTO_DATABASE_URL=postgresql://...

# Peak Log DB
PEAK_LOG_DATABASE_URL=postgresql://...

# 日記アプリ DB（後日追加）
DIARY_DATABASE_URL=postgresql://...

# Google Calendar API
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REFRESH_TOKEN=...

# userId（各アプリでの自分の userId）
YARUKOTO_USER_ID=cuid_xxx
PEAK_LOG_USER_ID=cuid_yyy
```

---

## 4. ツール定義

### 4.1 get_tasks

Yarukoto のタスクを日付指定で取得する。

**パラメータ:**

| 名前 | 型 | 必須 | 説明 |
|---|---|---|---|
| date | string (YYYY-MM-DD) | ✓ | 対象日付 |
| status | "PENDING" \| "COMPLETED" \| "SKIPPED" | - | ステータスフィルター |
| category | string | - | カテゴリ名フィルター |

**返却データ:**

```json
{
  "date": "2026-03-14",
  "tasks": [
    {
      "title": "企画書を書く",
      "status": "COMPLETED",
      "priority": "HIGH",
      "category": "仕事",
      "memo": "15時までに提出",
      "completedAt": "2026-03-14T15:30:00Z"
    }
  ],
  "summary": {
    "total": 5,
    "completed": 3,
    "pending": 1,
    "skipped": 1
  }
}
```

**SQL（Prisma クエリ相当）:**

```
Task WHERE scheduledAt = {date} AND userId = {userId}
  [AND status = {status}]
  [AND category.name = {category}]
ORDER BY displayOrder ASC
INCLUDE category
```

---

### 4.2 get_peak_logs

Peak Log のログと余韻を日付指定で取得する。

**パラメータ:**

| 名前 | 型 | 必須 | 説明 |
|---|---|---|---|
| date | string (YYYY-MM-DD) | ✓ | 対象日付 |

**返却データ:**

```json
{
  "date": "2026-03-14",
  "logs": [
    {
      "activity": {
        "name": "筋トレ",
        "emoji": "💪",
        "color": "#FF6B35"
      },
      "performedAt": "2026-03-14T19:10:00Z",
      "reflection": {
        "excitement": 5,
        "achievement": 4,
        "wantAgain": true,
        "note": "ベンチプレス自己ベスト更新！"
      }
    }
  ],
  "summary": {
    "totalLogs": 3,
    "withReflection": 2,
    "averageExcitement": 4.5
  }
}
```

**SQL（Prisma クエリ相当）:**

```
Log WHERE performedAt >= {date 00:00 JST} AND performedAt < {date+1 00:00 JST}
  AND userId = {userId}
ORDER BY performedAt ASC
INCLUDE activity, reflection
```

---

### 4.3 get_diary

日記アプリのエントリを日付指定で取得する。

> **注意:** 日記アプリは未開発のため、スキーマは暫定。スタブ実装とする。

**パラメータ:**

| 名前 | 型 | 必須 | 説明 |
|---|---|---|---|
| date | string (YYYY-MM-DD) | ✓ | 対象日付 |

**返却データ（暫定）:**

```json
{
  "date": "2026-03-14",
  "entries": [
    {
      "title": "今日の振り返り",
      "body": "朝早く起きて...",
      "mood": "good",
      "createdAt": "2026-03-14T23:00:00Z"
    }
  ]
}
```

**初期実装:** DB 未接続のスタブとして、空の entries を返す。日記アプリの開発後にスキーマに合わせて実装する。

---

### 4.4 get_calendar_events

Google Calendar の予定を日付指定で取得する。

**パラメータ:**

| 名前 | 型 | 必須 | 説明 |
|---|---|---|---|
| date | string (YYYY-MM-DD) | ✓ | 対象日付 |
| calendarId | string | - | カレンダー ID（デフォルト: "primary"） |

**返却データ:**

```json
{
  "date": "2026-03-14",
  "events": [
    {
      "title": "チームミーティング",
      "startTime": "2026-03-14T10:00:00+09:00",
      "endTime": "2026-03-14T11:00:00+09:00",
      "location": "会議室A",
      "description": "週次定例",
      "isAllDay": false
    }
  ],
  "summary": {
    "totalEvents": 4,
    "allDayEvents": 1,
    "timedEvents": 3
  }
}
```

**API 呼び出し:**

```
calendar.events.list({
  calendarId: calendarId || "primary",
  timeMin: {date}T00:00:00+09:00,
  timeMax: {date}T23:59:59+09:00,
  singleEvents: true,
  orderBy: "startTime"
})
```

---

### 4.5 get_photos_url

Google Photos の検索 URL を生成する（API 不使用）。

**パラメータ:**

| 名前 | 型 | 必須 | 説明 |
|---|---|---|---|
| date | string (YYYY-MM-DD) | ✓ | 対象日付 |

**返却データ:**

```json
{
  "date": "2026-03-14",
  "searchQuery": "2026年3月14日",
  "url": "https://photos.google.com/search/..."
}
```

**生成ロジック:**

1. 日付文字列を `YYYY年M月D日` 形式に変換
2. Protobuf メッセージを構築（Field 1: クエリ, Field 4: 内部メッセージ, Field 5: タイムスタンプ, Field 7: 固定値 3）
3. Base64 エンコード → URL エンコード
4. `https://photos.google.com/search/` に連結

**Protobuf 構造:**

```
Field 1 (string): 検索クエリ（例: "2026年3月14日"）
Field 4 (message): 内部メッセージ（Field 1 に同一クエリ）
Field 5 (varint): タイムスタンプ（UNIX ミリ秒、生成時刻）
Field 7 (varint): 固定値 3
```

**実装参照:**

```typescript
function encodeVarint(value: number): Buffer {
  const bytes: number[] = [];
  while (value > 0x7f) {
    bytes.push((value & 0x7f) | 0x80);
    value >>>= 7;
  }
  bytes.push(value & 0x7f);
  return Buffer.from(bytes);
}

function generatePhotosSearchUrl(query: string): string {
  const queryBytes = Buffer.from(query, 'utf-8');
  const qLen = encodeVarint(queryBytes.length);
  const timestampMs = Date.now();

  // Field 4 の内部メッセージ
  const inner = Buffer.concat([Buffer.from([0x0a]), qLen, queryBytes]);

  // 外側のメッセージ
  const outer = Buffer.concat([
    Buffer.from([0x0a]), qLen, queryBytes,                          // Field 1
    Buffer.from([0x22]), encodeVarint(inner.length), inner,         // Field 4
    Buffer.from([0x28]), encodeVarint(timestampMs),                 // Field 5
    Buffer.from([0x38, 0x03]),                                      // Field 7
  ]);

  const encoded = outer.toString('base64');
  return `https://photos.google.com/search/${encodeURIComponent(encoded)}`;
}
```

---

### 4.6 get_day_summary（集約ツール）

上記 5 ツールを内部的にまとめて呼び出し、1 日分のデータを一括返却する。

**パラメータ:**

| 名前 | 型 | 必須 | 説明 |
|---|---|---|---|
| date | string (YYYY-MM-DD) | ✓ | 対象日付 |

**返却データ:**

```json
{
  "date": "2026-03-14",
  "tasks": { "..." : "..." },
  "peakLogs": { "..." : "..." },
  "diary": { "..." : "..." },
  "calendarEvents": { "..." : "..." },
  "photosUrl": "https://photos.google.com/search/..."
}
```

---

## 5. DB スキーマ（参照用）

### Yarukoto

```
Task: id, userId, categoryId?, title, memo?, status(PENDING/COMPLETED/SKIPPED),
      priority?(HIGH/MEDIUM/LOW), scheduledAt?(DATE), completedAt?, skippedAt?,
      skipReason?, displayOrder(Float), createdAt, updatedAt

Category: id, userId, name, color?
```

- `scheduledAt` は PostgreSQL DATE 型（YYYY-MM-DD、タイムゾーンなし）
- `displayOrder` は Float 型（小さい値が先頭）

### Peak Log

```
Activity: id, userId, name, emoji?, color?, sortOrder, isArchived

Log: id, userId, activityId, performedAt(DateTime)

Reflection: id, userId, logId(unique), excitement?(1-5), achievement?(1-5),
            wantAgain(boolean), note?
```

- `performedAt` は DateTime 型（タイムスタンプ）
- アーカイブ済み Activity のログも取得対象に含める

---

## 6. フォルダ構成

```
furikaeri-mcp/
├── src/
│   ├── index.ts                  # McpServer 初期化 + stdio transport
│   ├── tools/
│   │   ├── get-tasks.ts          # Yarukoto タスク取得
│   │   ├── get-peak-logs.ts      # Peak Log ログ取得
│   │   ├── get-diary.ts          # 日記エントリ取得（スタブ）
│   │   ├── get-calendar-events.ts # Google Calendar 予定取得
│   │   ├── get-photos-url.ts     # Google Photos URL 生成
│   │   └── get-day-summary.ts    # 集約ツール
│   ├── lib/
│   │   ├── prisma-yarukoto.ts    # Yarukoto 用 Prisma Client
│   │   ├── prisma-peak-log.ts    # Peak Log 用 Prisma Client
│   │   ├── google-calendar.ts    # Google Calendar API クライアント
│   │   ├── photos-url.ts         # Google Photos URL 生成ロジック
│   │   └── date-utils.ts         # 日付ユーティリティ（JST 変換等）
│   └── types/
│       └── index.ts              # 共通型定義
├── prisma/
│   ├── yarukoto/
│   │   └── schema.prisma         # Yarukoto スキーマ（読み取り専用）
│   └── peak-log/
│       └── schema.prisma         # Peak Log スキーマ（読み取り専用）
├── .env.example
├── .gitignore
├── CLAUDE.md
├── package.json
└── tsconfig.json
```

---

## 7. Prisma マルチ DB 構成

```prisma
// prisma/yarukoto/schema.prisma
generator client {
  provider = "prisma-client-js"
  output   = "../../node_modules/.prisma/yarukoto"
}

datasource db {
  provider = "postgresql"
  url      = env("YARUKOTO_DATABASE_URL")
}
```

```prisma
// prisma/peak-log/schema.prisma
generator client {
  provider = "prisma-client-js"
  output   = "../../node_modules/.prisma/peak-log"
}

datasource db {
  provider = "postgresql"
  url      = env("PEAK_LOG_DATABASE_URL")
}
```

```typescript
// src/lib/prisma-yarukoto.ts
import { PrismaClient } from '../../node_modules/.prisma/yarukoto';
export const prismaYarukoto = new PrismaClient();

// src/lib/prisma-peak-log.ts
import { PrismaClient } from '../../node_modules/.prisma/peak-log';
export const prismaPeakLog = new PrismaClient();
```

`package.json` に以下を追加:

```json
"prisma:generate": "prisma generate --schema=prisma/yarukoto/schema.prisma && prisma generate --schema=prisma/peak-log/schema.prisma"
```

---

## 8. userId の扱い

全データソースは個人利用（シングルユーザー）を前提とする。
userId は以下の環境変数から取得し、全クエリのフィルターに使用する:

- Yarukoto: `process.env.YARUKOTO_USER_ID`
- Peak Log: `process.env.PEAK_LOG_USER_ID`

---

## 9. タイムゾーン

- 全日付処理は JST（Asia/Tokyo, UTC+9）を基準とする
- `date` パラメータは `YYYY-MM-DD` 形式（JST の日付）
- Peak Log の `performedAt` は UTC で格納されているため、JST に変換して日付フィルターを行う
  - `timeMin = {date}T00:00:00+09:00` → UTC: `{date-1}T15:00:00Z`
  - `timeMax = {date+1}T00:00:00+09:00` → UTC: `{date}T15:00:00Z`
- Yarukoto の `scheduledAt` は DATE 型なので日付そのままで比較可能

---

## 10. エラーハンドリング

各ツールは個別にエラーをキャッチし、以下の形式で返す:

```json
{
  "error": true,
  "message": "Yarukoto DB への接続に失敗しました",
  "code": "DB_CONNECTION_ERROR"
}
```

`get_day_summary` は個別のデータソースがエラーでも他のデータは返す（部分成功）。
`Promise.allSettled` で並行呼び出しし、エラー情報付きで返す。
