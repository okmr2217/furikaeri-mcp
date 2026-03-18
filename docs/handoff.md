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
| `get_commits` | **完了** | GitHub REST API、include_stats 対応 |
| `get_calendar_events` | **完了** | Google Calendar API、JST オフセット付き |
| `get_photos_url` | **完了** | Protobuf 手動エンコード、外部依存なし |
| `get_diary` | **スタブ完了** | 空の entries を返す（日記アプリ未開発） |
| `get_day_summary` | **完了** | 5 ツール Promise.allSettled 並行、部分成功対応 |

### Transport

- [x] stdio transport（Phase 1 — get_photos_url 登録済み、動作確認済み）
- [ ] Streamable HTTP transport（Phase 2）
- [ ] Railway デプロイ

---

## 積み残し・注意点

- ローカル開発では Supabase ダイレクト接続（port 5432）が IPv6 必須で到達不可。`.env` をセッションプーラー URL に変更すること
- `get_diary` は日記アプリ未開発のためスタブ実装となる予定
- `get_diary` は日記アプリ未開発のためスタブ実装となる予定

---

## 今後の候補

### 短期（Phase 1: stdio）

| タスク | 概要 | 優先度 |
|---|---|---|
| プロジェクト初期化 | npm init, tsconfig, eslint | 高 |
| `get_tasks` 実装 | Yarukoto DB からタスク取得 | 高 |
| `get_peak_logs` 実装 | Peak Log DB からログ取得 | 高 |
| stdio 動作確認 | Claude Code に登録して動作テスト | 高 |

### 中期（Phase 1 続き）

| タスク | 概要 | 優先度 |
|---|---|---|
| `get_calendar_events` 実装 | Google Calendar API 連携 | 中 |
| `get_photos_url` 実装 | データソース決定後 | 低 |
| `get_diary` 実装 | データソース決定後 | 低 |

### 長期（Phase 2: リモート化）

| タスク | 概要 | 優先度 |
|---|---|---|
| Streamable HTTP transport 対応 | transport 切り替え | 中 |
| Railway デプロイ | リモートMCPサーバーとして公開 | 中 |
| claude.ai コネクター登録 | スマホから利用可能に | 中 |
| APIキー認証 | 最低限のセキュリティ | 中 |

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

1. `get_day_summary` の動作確認（Claude Code から実際に呼び出してテスト）
2. `get_calendar_events` の動作確認（GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN を .env に設定して実テスト）
3. `get_commits` の動作確認
4. Phase 2: Streamable HTTP transport への切り替え・Railway デプロイ
