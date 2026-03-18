# 振り返りMCP

個人の活動データを横断的に取得し、Claudeから自然言語で振り返りができるMCPサーバー。TypeScript + @modelcontextprotocol/sdk。

---

<!-- ▼ プロジェクト固有（このプロジェクト専用の設定） ▼ -->

## Tech Stack

- TypeScript / @modelcontextprotocol/sdk
- Prisma 6 / Supabase PostgreSQL × 3（Yarukoto / Peak Log / 日記）
- googleapis（Calendar API v3）
- Zod / date-fns / date-fns-tz

## コマンド

```bash
npm run dev              # 開発サーバー起動（tsx）
npm run build            # プロダクションビルド（tsc）
npm run start            # ビルド済みサーバー起動
npm run lint             # ESLint
npm run typecheck        # 型チェック（tsc --noEmit）
npm run prisma:generate  # Prisma クライアント生成（両 DB）
npx prettier --write .   # フォーマット（printWidth: 120）
```

## コーディングルール

- TypeScript strict mode。`any` 禁止
- すべてのクエリに `userId` フィルタを必ず含める（環境変数から取得）
- ツールのパラメータは Zod でバリデーション
- named export を使用
- 全日付処理は JST（Asia/Tokyo, UTC+9）基準

## プロダクト前提

- 個人利用のMCPサーバー（マルチテナント不要）
- Phase 1: stdio transport（Claude Code から利用）
- Phase 2: Streamable HTTP transport（Railway デプロイ → claude.ai / スマホから利用）
- データソースは読み取り専用（書き込みツールは作らない）
- Claudeが自然言語で振り返りを組み立てるので、ツールは生データを返すだけでよい

## やらないこと

- 不要な抽象化・ライブラリ追加
- コードコメント・docstring の追加（変更していないコードへ）
- エラーハンドリングの過剰追加（起こりえないケースへの対処）
- リファクタリング・整理（明示的に依頼されていない場合）
- データの書き込み・更新・削除ツールの実装
- フロントエンド・UI の実装

---

<!-- ▼ 汎用ルール（他プロジェクトでも同じ） ▼ -->

## Git ワークフロー

- コミットメッセージは日本語: `feat: ○○を実装` / `fix: ○○を修正`
- プレフィックス: `feat:` / `fix:` / `refactor:` / `chore:` / `docs:` / `test:` / `style:`
- 1つの論理的変更 = 1コミット
- コミット前に `npm run typecheck && npm run lint` を実行

## セッション管理

- **開始時**: `docs/handoff.md` を読んで現状を把握する
- **終了時**: 以下を実行する
  1. `npm run typecheck && npm run lint` を実行して問題なければコミット
  2. `docs/session-log.md` の先頭にセッション記録を追記（やったこと・改善案・失敗・技術メモ・次にやりたいこと）
  3. `docs/handoff.md` を更新する（実装状態・積み残し・次回相談事項）
- **コンテキスト 60% 到達時**: session-log.md と handoff.md を更新してから `/compact`

---

## 参照ドキュメント

- @docs/project.md（プロジェクト概要・技術設計・アーキテクチャ）
- @docs/spec.md（ツール仕様・DB スキーマ・フォルダ構成・実装参照）
- @docs/handoff.md（現在の実装状態・積み残し・次にやること）
- @docs/session-log.md（セッション作業記録）
- @CHANGELOG.md
```
