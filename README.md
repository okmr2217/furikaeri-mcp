# furikaeri-mcp

**「先週の火曜日、何してた？」に答えられるMCPサーバー**

日々の活動データが複数のサービスに分散している問題を解決する。タスク管理・体調記録・Gitコミット・カレンダー・写真・日記を横断的に取得し、Claudeから自然言語で振り返りができる。

データの整形・要約・振り返りの構成はClaude側が行う。このサーバーは生データを返すだけ。

---

## ツール一覧

| ツール | データソース | 取得内容 |
|---|---|---|
| `get_tasks` | Yarukoto（Supabase） | 日付指定でタスク一覧を取得 |
| `get_peak_logs` | Peak Log（Supabase） | 日付指定で体調・ピーク体験ログを取得 |
| `get_commits` | GitHub API | 日付範囲でコミット履歴を取得 |
| `get_calendar_events` | Google Calendar API | 日付指定でカレンダー予定を取得 |
| `get_photos_url` | Google Photos（URL生成） | 日付指定でGoogle Photos検索URLを生成 |
| `get_diary` | 日記アプリ（開発予定） | 日付指定で日記エントリを取得（スタブ） |
| `get_day_summary` | 上記5ツールを集約 | 1日分のデータを一括取得 |

---

## セットアップ

### 必要なもの

- Node.js 20以上
- Supabase接続URL × 2（Yarukoto / Peak Log）
- GitHub Personal Access Token（PAT）
- Google Calendar API の OAuth 2.0 認証情報

### 1. インストール

```bash
git clone https://github.com/your-username/furikaeri-mcp.git
cd furikaeri-mcp
npm install
npm run prisma:generate
```

### 2. 環境変数の設定

`.env.example` をコピーして `.env` を作成し、各値を設定する。

```bash
cp .env.example .env
```

```env
# Yarukoto DB（Supabase接続URL）
YARUKOTO_DATABASE_URL=postgresql://...

# Peak Log DB（Supabase接続URL）
PEAK_LOG_DATABASE_URL=postgresql://...

# 日記アプリ DB（後日追加）
DIARY_DATABASE_URL=postgresql://...

# Google Calendar API
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REFRESH_TOKEN=...

# GitHub Personal Access Token
GITHUB_TOKEN=ghp_...

# 各アプリでの自分のユーザーID
YARUKOTO_USER_ID=cuid_xxx
PEAK_LOG_USER_ID=cuid_yyy
```

#### GitHub PAT の取得方法

1. GitHub > Settings > Developer settings > Personal access tokens > Tokens (classic)
2. 「Generate new token (classic)」をクリック
3. スコープは `repo`（プライベートリポジトリも取得する場合）または `public_repo` を選択
4. 生成されたトークンを `GITHUB_TOKEN` に設定

#### Google Calendar OAuth の設定方法

**① Google Cloud Console でプロジェクト作成**

1. [Google Cloud Console](https://console.cloud.google.com/) を開く
2. 新しいプロジェクトを作成
3. 「APIとサービス」>「ライブラリ」から「Google Calendar API」を有効化

**② OAuth 2.0 クライアントID の作成**

1. 「APIとサービス」>「認証情報」>「認証情報を作成」>「OAuthクライアントID」
2. アプリケーションの種類: 「デスクトップアプリ」を選択
3. 作成後、`GOOGLE_CLIENT_ID` と `GOOGLE_CLIENT_SECRET` をメモ

**③ リフレッシュトークンの取得**

以下のスクリプトをローカルで一度だけ実行してリフレッシュトークンを取得する。

```javascript
// get-refresh-token.mjs
import { google } from 'googleapis';
import * as readline from 'readline';

const oauth2Client = new google.auth.OAuth2(
  'YOUR_CLIENT_ID',
  'YOUR_CLIENT_SECRET',
  'urn:ietf:wg:oauth:2.0:oob'
);

const url = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://www.googleapis.com/auth/calendar.readonly'],
});

console.log('以下のURLをブラウザで開いてください:\n', url);

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question('\n認証コードを入力してください: ', async (code) => {
  const { tokens } = await oauth2Client.getToken(code);
  console.log('\nGOOGLE_REFRESH_TOKEN=' + tokens.refresh_token);
  rl.close();
});
```

```bash
node get-refresh-token.mjs
```

出力されたリフレッシュトークンを `GOOGLE_REFRESH_TOKEN` に設定する。

### 3. ビルド

```bash
npm run build
```

---

## Claude Codeへの登録

```bash
claude mcp add furikaeri-mcp -- node /絶対パス/furikaeri-mcp/dist/index.js
```

登録後、Claude Codeを再起動すると `/mcp` でツールが確認できる。

---

## 使い方例

以下のようにClaudeに自然言語で話しかけるだけでよい。

```
3月14日を振り返って
```

```
今週コミットしたリポジトリを教えて（repos: ["username/repo1", "username/repo2"]）
```

```
昨日のタスク完了率を教えて
```

```
先週のピーク体験ログをまとめて
```

```
今日のカレンダーと昨日の積み残しタスクを合わせて確認したい
```

---

## 開発

```bash
npm run dev          # 開発サーバー起動（tsx）
npm run build        # プロダクションビルド
npm run typecheck    # 型チェック
npm run lint         # ESLint
```

---

## 技術スタック

| カテゴリ | 技術 |
|---|---|
| 言語 | TypeScript (strict mode) |
| MCP SDK | @modelcontextprotocol/sdk |
| バリデーション | Zod |
| DB ORM | Prisma 6（マルチDB構成） |
| DB | Supabase（PostgreSQL） |
| 外部API | GitHub REST API / Google Calendar API v3 |
| ランタイム | Node.js |

---

## フェーズ

- **Phase 1（現在）**: stdio transport — Claude Code からローカルで利用
- **Phase 2（予定）**: Streamable HTTP transport — Railway にデプロイし、claude.ai やスマホからも利用可能に
