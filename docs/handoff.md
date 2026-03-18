# furikaeri-mcp — セッション引き継ぎ

> 最終更新: 2026-03-18
> バージョン: 0.0.0
> このドキュメントは「今どこにいるか」を記録する。コンセプト・技術設計は @docs/project.md を参照。

---

## 現在の実装状態

### プロジェクト初期化

- [ ] `npm init` + 依存パッケージインストール
- [ ] `tsconfig.json` 設定
- [ ] ESLint 設定
- [ ] `.env` + `.env.example` 作成
- [ ] `src/index.ts` エントリポイント作成

### ツール実装状況

| ツール | ステータス | 備考 |
|---|---|---|
| `get_tasks` | 未着手 | Yarukoto DB |
| `get_peak_logs` | 未着手 | Peak Log DB |
| `get_calendar_events` | 未着手 | Google Calendar API |
| `get_photos_url` | 未着手 | データソース未定 |
| `get_diary` | 未着手 | データソース未定 |

### Transport

- [ ] stdio transport（Phase 1）
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

1. Yarukoto / Peak Log の DB スキーマをもとに `get_tasks` と `get_peak_logs` のレスポンス形式を決める
2. プロジェクト初期化 → 最初のツール実装 → stdio 動作確認まで一気に進める
