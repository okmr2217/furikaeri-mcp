# furikaeri-mcp — 仕様書

> バージョン: 0.3.0
> 最終更新: 2026-03-23

---

## 1. 概要

furikaeri-mcp は、複数のデータソースを統合して「ある日の振り返り」を提供する MCP サーバー。

個人が運用する以下のサービスのデータを、MCP プロトコル経由で読み取り専用で提供する:

| データソース | 接続方式 | 内容 |
|---|---|---|
| Yarukoto（TODO アプリ） | Supabase PostgreSQL（PostgREST） | タスクの完了・未完了・スキップ |
| Peak Log（ピーク体験記録） | Supabase PostgreSQL（PostgREST） | Activity ログ・余韻（Reflection） |
| GitHub | GitHub REST API（PAT 認証） | コミット履歴 |
| 日記アプリ（新規開発予定） | Supabase PostgreSQL（PostgREST） | 日記エントリ |
| Google Calendar | Google Calendar API v3 | 予定・イベント |
| Google Photos | URL 生成（API 不使用） | 検索 URL |
| マネーフォワード ME | Cloudflare R2（CSV） | 決済・支出履歴 |
| Google Maps タイムライン | Cloudflare R2（Timeline.json） | 移動・訪問場所履歴 |

---

## 2. 利用シーン

- Claude Code から「3月14日を振り返って」と聞く
- 振り返りアプリ（Next.js、別途開発）から MCP Client として接続
- 日付を指定して各データソースの情報を集約し、AI でまとめを生成する入力データとして使用

---

## 3. 環境変数

```env
# Yarukoto（Supabase）
YARUKOTO_SUPABASE_URL=https://xxx.supabase.co
YARUKOTO_SUPABASE_SERVICE_KEY=eyJ...

# Peak Log（Supabase）
PEAK_LOG_SUPABASE_URL=https://yyy.supabase.co
PEAK_LOG_SUPABASE_SERVICE_KEY=eyJ...

# Google Calendar API
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REFRESH_TOKEN=...

# GitHub（コミット取得用 PAT）
GITHUB_TOKEN=ghp_...

# GitHub OAuth（MCP 認証用）
GITHUB_CLIENT_ID=...         # OAuth App の Client ID
GITHUB_CLIENT_SECRET=...     # OAuth App の Client Secret
COOKIE_ENCRYPTION_KEY=...    # ランダム文字列（openssl rand -hex 32）

# userId（各アプリでの自分の userId）
YARUKOTO_USER_ID=cuid_xxx
PEAK_LOG_USER_ID=cuid_yyy
```

※ `GITHUB_TOKEN`（PAT、コミット取得用）と `GITHUB_CLIENT_ID/SECRET`（OAuth App、MCP 認証用）は別物。

---

## 4. ツール定義

### 4.1 get_tasks

Yarukoto のタスクを日付指定で横断取得する。
`scheduledAt` / `completedAt` / `skippedAt` / `createdAt` のいずれかが当日に一致するタスクをすべて返す。

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
      "scheduledAt": "2026-03-14",
      "completedAt": "2026-03-14T15:30:00Z",
      "skippedAt": null,
      "createdAt": "2026-03-14T09:00:00Z",
      "reasons": ["scheduled", "completed", "created"]
    }
  ],
  "summary": {
    "total": 8,
    "scheduled": 5,
    "completedOnDate": 6,
    "skippedOnDate": 1,
    "createdOnDate": 3
  }
}
```

**`reasons` フィールド:**

| 値 | 条件 |
|---|---|
| `"scheduled"` | `scheduledAt = date` |
| `"completed"` | `completedAt` が当日（JST） |
| `"skipped"` | `skippedAt` が当日（JST） |
| `"created"` | `createdAt` が当日（JST） |

**SQL（Prisma クエリ相当）:**

```
Task WHERE userId = {userId}
  AND (
    scheduledAt = {date}
    OR completedAt >= {date 00:00 JST} AND completedAt < {date+1 00:00 JST}
    OR skippedAt  >= {date 00:00 JST} AND skippedAt  < {date+1 00:00 JST}
    OR createdAt  >= {date 00:00 JST} AND createdAt  < {date+1 00:00 JST}
  )
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
      "performedAt": "2026-03-14T19:10:00+09:00",
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

### 4.3 get_commits

GitHub リポジトリのコミット履歴を日付範囲で取得する。
複数リポジトリを指定でき、`Promise.all` で並列取得する。

**パラメータ:**

| 名前 | 型 | 必須 | 説明 |
|---|---|---|---|
| repos | string[] | ✓ | 対象リポジトリ（`"owner/repo"` 形式） |
| since | string (YYYY-MM-DD) | ✓ | 取得開始日（JST） |
| until | string (YYYY-MM-DD) | ✓ | 取得終了日（JST、この日を含む） |
| include_stats | boolean | - | デフォルト false。true で追加/削除行数・変更ファイル名を含む |

**返却データ（include_stats: false）:**

```json
{
  "since": "2026-03-14",
  "until": "2026-03-14",
  "results": [
    {
      "repo": "username/repo1",
      "commits": [
        {
          "sha": "abc1234",
          "message": "feat: get_tasks ツールを実装",
          "author": "username",
          "date": "2026-03-14T14:30:00Z"
        }
      ]
    }
  ]
}
```

**include_stats: true の場合:** 各コミットに以下が追加される

```json
{
  "stats": { "additions": 120, "deletions": 15 },
  "files": ["src/tools/get-tasks.ts", "src/index.ts"]
}
```

**API 呼び出し:**

```
// コミット一覧
GET /repos/{owner}/{repo}/commits
  ?since={since}T00:00:00+09:00
  &until={until}T23:59:59+09:00
Authorization: Bearer {GITHUB_TOKEN}

// コミット詳細（include_stats: true のときのみ）
GET /repos/{owner}/{repo}/commits/{sha}
Authorization: Bearer {GITHUB_TOKEN}
```

**実装参照（src/lib/github.ts）:**

```typescript
export function getGithubHeaders() {
  return {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json',
  };
}
```

---

### 4.4 get_diary

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

### 4.5 get_calendar_events

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

### 4.6 get_photos_url

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

### 4.7 get_day_summary（集約ツール）

上記ツールを内部的にまとめて呼び出し、1 日分のデータを一括返却する。

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
  "photosUrl": "https://photos.google.com/search/...",
  "transactions": { "transactions": [ "..." ] },
  "locationHistory": { "segments": [ "..." ] }
}
```

---

### 4.8 get_transactions

マネーフォワード ME からエクスポートした CSV を Cloudflare R2 から取得し、指定日の決済・支出履歴を返す。

**パラメータ:**

| 名前 | 型 | 必須 | 説明 |
|---|---|---|---|
| date | string (YYYY-MM-DD) | ✓ | 対象日付 |

**返却データ:**

```json
{
  "transactions": [
    {
      "date": "2026-03-14",
      "content": "セブン-イレブン",
      "amount": 540,
      "institution": "楽天カード",
      "categoryL": "食費",
      "categoryM": "コンビニ",
      "memo": ""
    }
  ]
}
```

**R2 オブジェクトキー:** `transactions/YYYY-MM.csv`（月次ファイル）

**CSV フォーマット（マネーフォワード ME エクスポート形式）:**

- 1 行目: ヘッダー（スキップ）
- `fields[1]`: 日付（`YYYY/MM/DD` → `YYYY-MM-DD` に変換）
- `fields[2]`: 内容
- `fields[3]`: 金額（カンマ区切り → 整数）
- `fields[4]`: 保有金融機関
- `fields[5]`: 大項目（カテゴリ）
- `fields[6]`: 中項目（サブカテゴリ）
- `fields[7]`: メモ
- `fields[8]`: 振替フラグ（`"1"` の場合は除外）

**CSV アップロード手順（月次運用）:**

```bash
iconv -f SHIFT_JIS -t UTF-8 download.csv > transactions-YYYY-MM.csv
npx wrangler r2 object put furikaeri-storage/transactions/YYYY-MM.csv --file=./transactions-YYYY-MM.csv --remote
```

---

### 4.9 get_location_history

Google Maps タイムラインからエクスポートした Timeline.json を Cloudflare R2 から取得し、指定日の移動・訪問場所を返す。102MB 超のファイルに対応するため R2 から取得し、日付別にパース結果を KV にキャッシュする。

**パラメータ:**

| 名前 | 型 | 必須 | 説明 |
|---|---|---|---|
| date | string (YYYY-MM-DD) | ✓ | 対象日付 |

**返却データ:**

```json
{
  "segments": [
    {
      "startTime": "2026-03-14T09:00:00Z",
      "endTime": "2026-03-14T10:30:00Z",
      "type": "visit",
      "visit": {
        "placeId": "ChIJ...",
        "semanticType": "TYPE_WORK",
        "probability": 0.95,
        "placeLocation": "35.6895,139.6917"
      }
    },
    {
      "startTime": "2026-03-14T10:30:00Z",
      "endTime": "2026-03-14T11:00:00Z",
      "type": "activity",
      "activity": {
        "startLocation": "35.6895,139.6917",
        "endLocation": "35.6580,139.7016",
        "distanceMeters": 5200,
        "type": "IN_PASSENGER_VEHICLE"
      }
    }
  ]
}
```

**R2 オブジェクトキー:** `location-history/Timeline.json`（固定）

**KV キャッシュキー:** `location-history:{date}`（TTL: 7日間）

**KV キャッシュ戦略:** R2 から 102MB の JSON を毎回パースするのを避けるため、日付別のパース結果を KV にキャッシュする。過去データは変わらないため TTL は 7 日間。

**Timeline.json アップロード手順:**

```bash
npx wrangler r2 object put furikaeri-storage/location-history/Timeline.json --file=./Timeline.json --remote
```

**`semanticSegments` のフィルタリング:**
- `timelinePath` / `timelineMemory` を含むセグメントは除外
- `startTime` を JST に変換して日付フィルタリング
- `visit` または `activity` を持つセグメントのみ返す

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

## 6. Transport

### 6.1 Transport モード

Cloudflare Workers 上で Streamable HTTP のみ提供する。stdio モードは廃止。

| 環境 | Transport | 用途 |
|---|---|---|
| Cloudflare Workers（本番） | Streamable HTTP (`/mcp`) | Claude.ai / Claude Desktop / Claude Code から利用 |
| `wrangler dev`（ローカル） | Streamable HTTP (`/mcp`) | 開発・テスト |

### 6.2 認証

GitHub OAuth を使用する。Cloudflare の `workers-oauth-provider` ライブラリで実装。

| 項目 | 値 |
|---|---|
| OAuth プロバイダー | GitHub |
| ライブラリ | `@cloudflare/workers-oauth-provider` |
| トークン管理 | Cloudflare KV（`OAUTH_KV`） |
| ユーザー制限 | `ALLOWED_USERNAMES`（GitHub ユーザー名のセット） |

**OAuth フロー:**

1. MCP クライアント（Claude.ai 等）が `/mcp` に接続
2. 未認証の場合、GitHub の認可画面にリダイレクト
3. ユーザーが GitHub で認可
4. Workers が GitHub のトークンを受け取り、自前の MCP トークンを発行
5. 以降のリクエストは MCP トークンで認証

**ユーザー制限:**

```typescript
const ALLOWED_USERNAMES = new Set([
  'your-github-username',
  'friend-github-username',
])
```

ALLOWED_USERNAMES に含まれない GitHub ユーザーは認可されない。

### 6.3 エンドポイント構成

| パス | メソッド | 役割 |
|---|---|---|
| `/mcp` | POST | MCP メッセージ送受信 |
| `/mcp` | GET | SSE ストリーム（サーバー→クライアント通知） |
| `/mcp` | DELETE | セッション終了 |
| `/authorize` | GET | OAuth 認可エンドポイント |
| `/token` | POST | OAuth トークンエンドポイント |
| `/register` | POST | OAuth 動的クライアント登録 |
| `/callback` | GET | GitHub OAuth コールバック |

---

## 7. フォルダ構成

```
furikaeri-mcp/
├── src/
│   ├── index.ts              # Workers エントリポイント（OAuthProvider ラップ）
│   ├── mcp-server.ts         # MCP サーバー定義（ツール登録）
│   ├── auth-handler.ts       # GitHub OAuth ハンドラー（/authorize, /callback）
│   ├── tools/
│   │   ├── get-tasks.ts          # Yarukoto タスク取得
│   │   ├── get-peak-logs.ts      # Peak Log ログ取得
│   │   ├── get-commits.ts        # GitHub コミット履歴取得
│   │   ├── get-diary.ts          # 日記エントリ取得（スタブ）
│   │   ├── get-calendar-events.ts # Google Calendar 予定取得
│   │   ├── get-photos-url.ts     # Google Photos URL 生成
│   │   ├── get-transactions.ts   # マネーフォワード ME 決済履歴取得
│   │   ├── get-location-history.ts # Google Maps タイムライン取得
│   │   └── get-day-summary.ts    # 集約ツール
│   ├── lib/
│   │   ├── supabase.ts       # Supabase クライアント生成ヘルパー
│   │   ├── github.ts         # GitHub API ヘッダー・クライアント
│   │   ├── google-calendar.ts # fetch ベースの Google Calendar API
│   │   ├── photos-url.ts     # Google Photos URL 生成ロジック
│   │   └── date-utils.ts     # 日付ユーティリティ（JST 変換等）
│   └── types/
│       └── index.ts          # Env 型定義・共通型
├── wrangler.toml             # Cloudflare Workers 設定
├── .dev.vars                 # ローカル開発用 secrets
├── .gitignore
├── CLAUDE.md
├── package.json
└── tsconfig.json
```

---

## 8. データベース接続

### 8.1 接続方式

Supabase JS Client（`@supabase/supabase-js`）を使用し、PostgREST 経由で HTTP 接続する。

Prisma は使用しない。理由:
- Cloudflare Workers の V8 isolates ランタイムでは TCP 接続に制限がある
- Prisma のバンドルサイズが Workers の無料プラン（3MB）を超過する可能性がある
- 読み取り専用の用途では Supabase JS Client で十分

### 8.2 クライアント生成

```typescript
// src/lib/supabase.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js'

export function createYarukotoClient(env: Env): SupabaseClient {
  return createClient(env.YARUKOTO_SUPABASE_URL, env.YARUKOTO_SUPABASE_SERVICE_KEY)
}

export function createPeakLogClient(env: Env): SupabaseClient {
  return createClient(env.PEAK_LOG_SUPABASE_URL, env.PEAK_LOG_SUPABASE_SERVICE_KEY)
}
```

**重要:** クライアントはリクエストごとに生成する。グローバルスコープで保持しない。

### 8.3 Service Role Key の使用

RLS（Row Level Security）を bypass するために Service Role Key を使用する。
これは個人利用・読み取り専用の MCP サーバーであるため許容する。
Service Role Key は Wrangler secrets として管理し、コードにハードコードしない。

---

## 9. userId の扱い

全データソースは個人利用（シングルユーザー）を前提とする。
userId は以下の環境変数から取得し、全クエリのフィルターに使用する:

- Yarukoto: `process.env.YARUKOTO_USER_ID`
- Peak Log: `process.env.PEAK_LOG_USER_ID`

---

## 10. タイムゾーン

- 全日付処理は JST（Asia/Tokyo, UTC+9）を基準とする
- `date` パラメータは `YYYY-MM-DD` 形式（JST の日付）
- Peak Log の `performedAt` は UTC で DB に格納されているため、`toJSTDateRange` で JST 日付範囲を UTC に変換してフィルターする
  - `{date}T00:00:00+09:00` → UTC: `{date-1}T15:00:00Z`
  - `{date+1}T00:00:00+09:00` → UTC: `{date}T15:00:00Z`
- レスポンスの `performedAt` は `toJSTISOString()` で `"+09:00"` 付き ISO 文字列に変換して返す（例: `"2026-03-14T19:10:00+09:00"`）。Claude が日本語文脈で直感的に読めるようにするため
- Yarukoto の `scheduledAt` は DATE 型なので日付そのままで比較可能

---

## 11. エラーハンドリング

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

---

## 12. デプロイ

### 12.1 プラットフォーム

Cloudflare Workers（無料プラン）

| 項目 | 制限 |
|---|---|
| リクエスト数 | 100,000 / 日 |
| CPU 時間 | 10ms / リクエスト |
| バンドルサイズ | 3MB（圧縮後） |

### 12.2 必要なリソース

| リソース | 用途 |
|---|---|
| Cloudflare Workers | MCP サーバー本体 |
| Cloudflare KV（`OAUTH_KV`） | OAuth トークン管理 |
| Cloudflare KV（`FURIKAERI_KV`） | location-history 日付別キャッシュ |
| Cloudflare R2（`furikaeri-storage`） | Timeline.json・transactions CSV の格納 |
| GitHub OAuth App × 2 | ローカル開発用 + 本番用 |

### 12.3 デプロイ手順

```bash
# Secrets 登録
wrangler secret put GITHUB_CLIENT_ID
wrangler secret put GITHUB_CLIENT_SECRET
wrangler secret put COOKIE_ENCRYPTION_KEY
# ... 他の secrets も同様

# デプロイ
wrangler deploy
```

### 12.4 Claude.ai からの接続

1. Claude.ai の Settings > Connectors を開く
2. 「Add custom connector」をクリック
3. URL に `https://furikaeri-mcp.<account>.workers.dev/mcp` を入力
4. GitHub OAuth の認可画面でログイン
5. ツールが利用可能になる

### 12.5 Claude Code からの接続

```bash
claude mcp add furikaeri --transport http https://furikaeri-mcp.<account>.workers.dev/mcp
```

---

## 13. ローカル開発

### 13.1 セットアップ

```bash
# .dev.vars にローカル用の secrets を記載
cp .dev.vars.example .dev.vars

# 開発サーバー起動
wrangler dev
```

### 13.2 テスト

```bash
# MCP Inspector で動作確認
npx @modelcontextprotocol/inspector

# 接続先: http://localhost:8788/mcp
# OAuth Settings > Quick OAuth Flow で GitHub 認証
```

### 13.3 GitHub OAuth App（ローカル用）

- Homepage URL: `http://localhost:8788`
- Authorization callback URL: `http://localhost:8788/callback`
