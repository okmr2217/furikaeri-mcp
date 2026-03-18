# furikaeri-mcp — セッション引き継ぎ

> 最終更新: 2026-03-19
> バージョン: 0.0.0
> このドキュメントは「今どこにいるか」を記録する。コンセプト・技術設計は @docs/project.md を参照。

---

## 現在の実装状態

### プロジェクト初期化

- [x] `npm init` + 依存パッケージインストール
- [x] `tsconfig.json` 設定（strict mode、NodeNext）
- [x] ESLint 設定（typescript-eslint flat config）
- [x] `.env.example` 作成
- [x] `src/index.ts` エントリポイント作成（McpServer + StdioServerTransport）
- [x] `src/types/index.ts`（全ツールの返却データ型）
- [x] `src/lib/date-utils.ts`（toJSTDateRange）

### ツール実装状況

| ツール | ステータス | 備考 |
|---|---|---|
| `get_tasks` | **完了** | OR 条件横断取得・reasons フィールド付き |
| `get_peak_logs` | **完了** | Peak Log DB、performedAt JST 変換済み |
| `get_commits` | **完了** | GitHub REST API、include_stats 対応、repos 省略時は全リポジトリ自動取得 |
| `get_calendar_events` | **完了** | Google Calendar API、JST オフセット付き |
| `get_photos_url` | **完了** | Protobuf 手動エンコード、外部依存なし |
| `get_diary` | **スタブ完了** | 空の entries を返す（日記アプリ未開発） |
| `get_day_summary` | **完了** | 5 ツール Promise.allSettled 並行、部分成功対応 |

### Transport

- [x] stdio transport（Phase 1 — get_photos_url 登録済み、動作確認済み）
- [x] Streamable HTTP transport（Phase 2 — `TRANSPORT=http` で起動、セッション管理付き）
- [ ] Railway デプロイ

---

## 積み残し・注意点

- ローカル開発では Supabase ダイレクト接続（port 5432）が IPv6 必須で到達不可。`.env` をセッションプーラー URL に変更すること
- `get_diary` は日記アプリ未開発のためスタブ実装（空配列を返す）
- `get_commits` の `repos` 省略時の全リポジトリ取得は 100 件上限（ページネーション未対応）。個人利用では問題なし

---

## 今後の候補

### 短期（Phase 1: stdio）

| タスク | 概要 | 優先度 |
|---|---|---|
| 全ツール動作確認 | Supabase・GitHub・Google Calendar 接続テスト | 高 |

### 中期（Phase 1 続き）

| タスク | 概要 | 優先度 |
|---|---|---|
| `get_commits` 全リポジトリ取得ページネーション対応 | 100 件超のリポジトリがある場合 | 低 |
| `get_diary` 実装 | 日記アプリ開発後 | 低 |

### 長期（Phase 2: リモート化）

| タスク | 概要 | 優先度 |
|---|---|---|
| ~~Streamable HTTP transport 対応~~ | **完了** | ~~中~~ |
| Railway デプロイ | `TRANSPORT=http` で起動、PORT 環境変数で公開 | 中 |
| claude.ai コネクター登録 | authless で登録（Settings > Connectors） | 中 |
| インフラ層での保護 | Cloudflare Access / IP 制限等（認証なし運用の場合） | 低 |

### 将来構想（マルチユーザー対応）

ユーザーごとに異なる認証情報・ID を保持できる仕組みへの移行。現在は環境変数（単一ユーザー固定）だが、将来的には複数ユーザーが同一サーバーを共有できるようにする。

**管理が必要な認証情報の種類:**

| 項目 | 現在の管理方法 | マルチユーザー時 |
|---|---|---|
| `YARUKOTO_USER_ID` | 環境変数 | ユーザーごとに保持 |
| `PEAK_LOG_USER_ID` | 環境変数 | ユーザーごとに保持 |
| `GITHUB_TOKEN` | 環境変数（PAT） | ユーザーごとに保持 |
| `GOOGLE_REFRESH_TOKEN` | 環境変数 | ユーザーごとに保持 |
| `GOOGLE_CLIENT_ID/SECRET` | 環境変数（共通でもOK） | サーバー共通でOK |

**実現方式の候補:**

- **MCP の `_meta.userId` を使う**: Streamable HTTP 移行後、MCP リクエストのメタデータにユーザーIDを付与し、サーバー側でユーザーIDに対応する認証情報をDBから引く
- **認証情報をDBで管理**: ユーザーテーブルに各種トークン・IDを暗号化して格納（Railway + Supabase）
- **OAuth フロー統合**: Google / GitHub の認可フローをサーバーが仲介し、取得したトークンをDBに保存

**前提条件:**
- Phase 2（Streamable HTTP transport）への移行後に検討
- 認証情報の暗号化保存が必須（平文 DB 格納は NG）

---

## 次のセッションで相談したいこと

1. 全ツールの実動作確認（Supabase・GitHub・Google Calendar それぞれ接続して動作テスト）
   - `get_tasks` / `get_peak_logs`（Supabase セッションプーラー接続確認）
   - `get_calendar_events`（GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN を .env に設定）
   - `get_commits`（GitHub PAT で全リポジトリ取得確認）
   - `get_day_summary`（5 ソース並行取得の総合確認）
2. Railway デプロイ（`TRANSPORT=http PORT=3000` で起動 → claude.ai コネクター登録）
