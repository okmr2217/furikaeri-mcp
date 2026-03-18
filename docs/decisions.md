# アーキテクチャ決定記録（ADR）

設計上の重要な判断をここに記録する。
「なぜその設計にしたか」「何を却下したか」を残すことで、同じ議論を繰り返さない。

---

## ADR-001: DB アクセスはサーバーのみ

- **ステータス**: 採用
- **決定**: Prisma クライアントは Server Components・Server Actions からのみ呼び出す。Client Component から直接呼ばない
- **理由**: セキュリティ上、DB 接続情報をクライアントに公開しない。Next.js App Router のサーバー/クライアント境界を明確に保つ
- **却下した選択肢**: tRPC や REST API エンドポイント経由 → MVP 段階では Server Actions で十分、過剰な抽象化を避ける

---

## ADR-002: バージョン番号の正本を package.json に置く

- **ステータス**: 採用
- **決定**: バージョン番号は `package.json` の `version` を唯一の正本とする。UI 表示は `package.json` を参照する
- **理由**: 複数ファイルで管理すると同期ズレが起きる。`package.json` はエコシステム標準であり、npm/GitHub Actions 等のツールと自然に連携できる
- **却下した選択肢**: `src/lib/constants.ts` にハードコード → 更新箇所が増え忘れが発生しやすい
