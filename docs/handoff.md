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
| `get_tasks` | 未着手 | Yarukoto DB |
| `get_peak_logs` | 未着手 | Peak Log DB |
| `get_calendar_events` | 未着手 | Google Calendar API |
| `get_photos_url` | 未着手 | データソース未定 |
| `get_diary` | 未着手 | データソース未定 |

### Transport

- [x] stdio transport（Phase 1 — 骨格のみ、ツール未登録）
- [ ] Streamable HTTP transport（Phase 2）
- [ ] Railway デプロイ

---

## 積み残し・注意点

- Yarukoto / Peak Log の DB スキーマを確認してからツール実装に入る
- `get_photos_url` と `get_diary` のデータソースが未確定

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

1. Prisma スキーマ（yarukoto・peak-log）を作成して `prisma:generate` を実行する
2. `get_tasks`・`get_peak_logs` を実装して stdio 動作確認まで進める
