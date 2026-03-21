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

---

## ADR-003: レスポンスの performedAt は JST ISO 文字列で返す

- **ステータス**: 採用
- **決定**: `get_peak_logs` / `get_day_summary` の `performedAt` は DB から取得した UTC 文字列をそのまま返さず、`toJSTISOString()` で `"+09:00"` 付き JST ISO 文字列に変換してから返す
- **理由**: このサーバーを利用するのは日本語文脈の Claude であり、UTC のまま返すと「19:10 UTC = 04:10 JST 翌日」のような誤解が生じる。JST 明示の ISO 文字列にすることで Claude が時刻を正しく解釈できる
- **実装**: `src/lib/date-utils.ts` の `toJSTISOString(utcStr)` — UTC ms + 9h → `.toISOString().slice(0, 19) + "+09:00"`
- **却下した選択肢**: UTC のまま返す → Claude が「今日の記録」を参照する際に日付がズレる可能性がある
