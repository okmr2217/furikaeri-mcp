# furikaeri-mcp — セッション引き継ぎ

> 最終更新: 2026-03-18
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
| `get_peak_logs` | 未着手 | Peak Log DB |
| `get_calendar_events` | 未着手 | Google Calendar API |
| `get_photos_url` | **完了** | Protobuf 手動エンコード、外部依存なし |
| `get_diary` | 未着手 | 日記アプリ未開発 |

### Transport

- [x] stdio transport（Phase 1 — get_photos_url 登録済み、動作確認済み）
- [ ] Streamable HTTP transport（Phase 2）
- [ ] Railway デプロイ

---

## 積み残し・注意点

- ローカル開発では Supabase ダイレクト接続（port 5432）が IPv6 必須で到達不可。`.env` をセッションプーラー URL に変更すること
- `get_diary` は日記アプリ未開発のためスタブ実装となる予定
- Peak Log の `prisma/peak-log/schema.prisma` はまだ未作成

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

---

## 次のセッションで相談したいこと

1. get_tasks の動作確認（Supabase セッションプーラー URL で接続確認）
2. `get_peak_logs` 実装（prisma/peak-log/schema.prisma 作成 → prisma generate → ツール実装）
3. `get_calendar_events` 実装（Google Calendar API 認証セットアップ）
