# [プロジェクト名]

[プロジェクトの一行説明]。[主要技術スタック]。

---

<!-- ▼ プロジェクト固有（このプロジェクト専用の設定） ▼ -->

## Tech Stack

- [フレームワーク]
- [DB / ORM]
- [認証]
- [スタイリング]

## コマンド

\`\`\`bash
npm run dev
npm run build
npm run lint
npm run typecheck
\`\`\`

## コーディングルール

- TypeScript strict mode。`any` 禁止
- [プロジェクト固有のルール]

## プロダクト前提

- [重要な設計判断]

## やらないこと

- 不要な抽象化・ライブラリ追加
- コードコメント・docstring の追加（変更していないコードへ）
- エラーハンドリングの過剰追加（起こりえないケースへの対処）
- リファクタリング・整理（明示的に依頼されていない場合）

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
- @docs/handoff.md（現在の実装状態・積み残し・次にやること）
- @docs/session-log.md（セッション作業記録）
- @CHANGELOG.md
```
