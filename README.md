# furikaeri-mcp

**「先週の火曜日、何してた？」に答えられるMCPサーバー**

日々の活動データが複数のサービスに分散している問題を解決する。タスク管理・体調記録・Gitコミット・カレンダー・写真・日記を横断的に取得し、Claudeから自然言語で振り返りができる。

データの整形・要約・振り返りの構成はClaude側が行う。このサーバーは生データを返すだけ。

**Cloudflare Workers 上で動作。GitHub OAuth で認証。**

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

- [Node.js](https://nodejs.org/) 20 以上（ローカル開発用）
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (`npm i -g wrangler`)
- Cloudflare アカウント
- Supabase Project × 2（Yarukoto / Peak Log）
- GitHub Personal Access Token（PAT）— コミット取得用
- GitHub OAuth App × 2（ローカル用・本番用）— MCP 認証用
- Google Calendar API の OAuth 2.0 認証情報

### 1. インストール

```bash
git clone https://github.com/your-username/furikaeri-mcp.git
cd furikaeri-mcp
npm install
```

### 2. Cloudflare KV namespace の作成

```bash
wrangler kv:namespace create "OAUTH_KV"
```

出力された ID を `wrangler.toml` の `<Add-KV-ID-here>` に設定する。

### 3. GitHub OAuth App の作成

[GitHub > Settings > Developer settings > OAuth Apps](https://github.com/settings/developers) で2つ作成する。

**ローカル開発用:**
- Homepage URL: `http://localhost:8788`
- Authorization callback URL: `http://localhost:8788/callback`

**本番用:**
- Homepage URL: `https://furikaeri-mcp.<account>.workers.dev`
- Authorization callback URL: `https://furikaeri-mcp.<account>.workers.dev/callback`

### 4. アクセス許可ユーザーの設定

`src/index.ts` の `ALLOWED_USERNAMES` に自分の GitHub ユーザー名を追加する。

```typescript
const ALLOWED_USERNAMES = new Set<string>([
  "your-github-username",
]);
```

### 5. ローカル開発用 secrets の設定

`.dev.vars.example` をコピーして `.dev.vars` を作成し、各値を入力する。

```bash
cp .dev.vars.example .dev.vars
```

```env
# GitHub OAuth App（ローカル用の Client ID / Secret）
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
COOKIE_ENCRYPTION_KEY=   # openssl rand -hex 32 で生成

# GitHub PAT（コミット取得用）
GITHUB_TOKEN=ghp_...

# Yarukoto（Supabase）
YARUKOTO_SUPABASE_URL=https://xxx.supabase.co
YARUKOTO_SUPABASE_SERVICE_KEY=eyJ...
YARUKOTO_USER_ID=

# Peak Log（Supabase）
PEAK_LOG_SUPABASE_URL=https://yyy.supabase.co
PEAK_LOG_SUPABASE_SERVICE_KEY=eyJ...
PEAK_LOG_USER_ID=

# Google Calendar API
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REFRESH_TOKEN=
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
2. アプリケーションの種類:「デスクトップアプリ」を選択
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

---

## ローカル開発

```bash
wrangler dev
```

起動後、MCP Inspector で動作確認できる。

```bash
npx @modelcontextprotocol/inspector
```

接続先: `http://localhost:8788/mcp`（OAuth Settings > Quick OAuth Flow で GitHub 認証）

---

## デプロイ

### 本番 secrets の登録

```bash
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
```

### デプロイ

```bash
wrangler deploy
```

---

## Claude への登録

### Claude.ai（Web）

1. Settings > Connectors > Add custom connector
2. URL に `https://furikaeri-mcp.<account>.workers.dev/mcp` を入力
3. GitHub OAuth の認可画面でログイン

### Claude Code（CLI）

```bash
claude mcp add furikaeri --transport http https://furikaeri-mcp.<account>.workers.dev/mcp
```

---

## 使い方例

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

## 開発コマンド

```bash
wrangler dev        # ローカル開発サーバー起動
wrangler deploy     # 本番デプロイ
npm run typecheck   # 型チェック（tsc --noEmit）
npm run lint        # ESLint
```

---

## 技術スタック

| カテゴリ | 技術 |
|---|---|
| ランタイム | Cloudflare Workers |
| 言語 | TypeScript (strict mode) |
| MCP SDK | @modelcontextprotocol/sdk / agents (McpAgent) |
| 認証 | GitHub OAuth（@cloudflare/workers-oauth-provider） |
| DB クライアント | @supabase/supabase-js（PostgREST 経由） |
| DB | Supabase（PostgreSQL） |
| 外部API | GitHub REST API / Google Calendar REST API v3 |
| バリデーション | Zod |
| KV | Cloudflare KV（OAuth トークン管理） |
