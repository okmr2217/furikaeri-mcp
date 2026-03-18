# furikaeri-mcp — プロジェクト概要・技術設計

> このドキュメントは変化の少ない情報（コンセプト・技術設計・アーキテクチャ）を記録する。
> 「今どこにいるか」は @docs/handoff.md を参照。

---

## プロダクトコンセプト

**「先週の火曜日、何してた？」に答えられるMCPサーバー**

日々の活動データが複数のサービスに分散している（タスク管理、体調記録、カレンダー、写真、日記など）。これらをMCPツールとして統合し、Claudeから自然言語で横断的に振り返りができるようにする。

専用UIは作らない。Claudeが自然言語のインターフェースになるため、ツールは生データを返すだけでよい。claude.ai / Claudeアプリ（スマホ）/ Claude Code / Claude Desktop のすべてから同じツール群にアクセスできることが最大の価値。

---

## データソースとツール一覧

| ツール名 | データソース | 取得内容 | 優先度 |
|---|---|---|---|
| `get_tasks` | Yarukoto（Supabase） | 日付指定でタスク一覧を取得 | 高 |
| `get_peak_logs` | Peak Log（Supabase） | 日付指定で体調・ピークログを取得 | 高 |
| `get_commits` | GitHub API | 日付範囲で指定リポジトリのコミット履歴を取得 | 高 |
| `get_calendar_events` | Google Calendar API | 日付範囲でカレンダー予定を取得 | 中 |
| `get_photos_url` | （未定） | 日付指定で写真URLを取得 | 低 |
| `get_diary` | （未定） | 日付指定で日記を取得 | 低 |

### get_commits 設計詳細

**エンドポイント:**
- コミット一覧: `GET /repos/{owner}/{repo}/commits` （`since` / `until` パラメータで日付絞り込み）
- コミット詳細: `GET /repos/{owner}/{repo}/commits/{sha}` （stats + 変更ファイル一覧）

**パラメータ:**
```
get_commits({
  repos: string[],        // ["username/repo1", "username/repo2"] 複数リポジトリ対応
  since: string,          // ISO 8601 日付 "2026-03-18"
  until: string,          // ISO 8601 日付 "2026-03-19"
  include_stats?: boolean // デフォルト false。trueでコミットごとのdiff概要（追加/削除行数・変更ファイル名）を取得
})
```

**レスポンス（include_stats: false）:**
```json
{
  "repo": "username/repo1",
  "commits": [
    {
      "sha": "abc1234",
      "message": "feat: get_tasks ツールを実装",
      "author": "username",
      "date": "2026-03-18T14:30:00Z"
    }
  ]
}
```

**レスポンス（include_stats: true）:** 上記に加えて各コミットに以下が追加される
```json
{
  "stats": { "additions": 120, "deletions": 15 },
  "files": ["src/tools/get-tasks.ts", "src/index.ts"]
}
```

**認証:** Personal Access Token（PAT）を `Authorization: Bearer <token>` ヘッダーで送信。`.env` に `GITHUB_TOKEN` として保存。

**パフォーマンス考慮:**
- `include_stats: false` の場合: リポジトリごとに1 APIコール。個人利用で1日100コミット超はまずないので十分
- `include_stats: true` の場合: 1 + N コール（Nはコミット数）。GitHub API レート制限は認証済み5,000回/時なので個人利用では問題なし
- 複数リポジトリは `Promise.all` で並列取得

**段階的実装方針:** まず `include_stats: false` で実装し、動作確認後に `include_stats: true` を追加する。

---

## 技術スタック

| カテゴリ | 技術 |
|---|---|
| 言語 | TypeScript (strict mode) |
| MCP SDK | @modelcontextprotocol/sdk |
| バリデーション | Zod |
| DB | Supabase（PostgreSQL） |
| 外部API | GitHub REST API, Google Calendar API (OAuth 2.0) |
| ランタイム | Node.js |
| デプロイ（Phase 2） | Railway |

---

## アーキテクチャ

### フォルダ構成

```
furikaeri-mcp/
├── src/
│   ├── index.ts          # MCPサーバーのエントリポイント
│   ├── tools/
│   │   ├── get-tasks.ts
│   │   ├── get-peak-logs.ts
│   │   ├── get-commits.ts
│   │   ├── get-calendar-events.ts
│   │   ├── get-photos-url.ts
│   │   └── get-diary.ts
│   └── lib/
│       ├── supabase.ts   # Supabase クライアント初期化
│       ├── github.ts     # GitHub API クライアント
│       └── google.ts     # Google API クライアント初期化
├── CLAUDE.md
├── CHANGELOG.md
├── docs/
│   ├── project.md
│   ├── handoff.md
│   ├── session-log.md
│   └── versioning.md
├── package.json
├── tsconfig.json
└── .env                  # 接続情報（Git管理外）
```

### 設計方針

- **1ツール = 1ファイル**: 各ツールは `src/tools/` に独立したファイルとして配置。`index.ts` で登録する
- **読み取り専用**: すべてのツールはデータの取得のみ。書き込み・更新・削除は行わない
- **ツールは生データを返す**: 整形・要約はClaude側が行う。ツールはDBやAPIから取得したデータをそのまま返す
- **エラーはクラッシュさせない**: DB接続エラー等はツールの result としてエラーメッセージを返す

### Transport 戦略

- **Phase 1（stdio）**: Claude Code から `claude mcp add` で登録。ローカルで完結
- **Phase 2（Streamable HTTP）**: Railway にデプロイ。claude.ai の Settings > Connectors からカスタムコネクターとして登録。スマホからも利用可能に

---

## 環境変数

```
# Yarukoto DB
YARUKOTO_SUPABASE_URL=
YARUKOTO_SUPABASE_ANON_KEY=

# Peak Log DB
PEAKLOG_SUPABASE_URL=
PEAKLOG_SUPABASE_ANON_KEY=

# GitHub
GITHUB_TOKEN=

# Google Calendar（Phase 2 で追加）
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
```

---

## 鉄則

1. **個人利用に徹する** — マルチテナント対応・認証の複雑化は不要
2. **Claudeに任せる** — データの整形・要約・振り返りの構成はClaudeが行う。ツールは生データを返すだけ
3. **段階的に進める** — まず Yarukoto → Peak Log → GitHub → Google Calendar の順。動くものを1つずつ増やす
4. **transport は後から切り替える** — stdio で動作確認してから Streamable HTTP に移行する
