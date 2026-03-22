import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Env } from "../types/index.js";

const paramsSchema = {
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD 形式で指定してください"),
};

function parseCSVLine(line: string): string[] {
  const trimmed = line.startsWith('"') ? line.slice(1) : line;
  const cleaned = trimmed.endsWith('"') ? trimmed.slice(0, -1) : trimmed;
  return cleaned.split('","');
}

export function registerGetTransactions(server: McpServer, env: Env) {
  server.tool(
    "get_transactions",
    "指定日の決済・支出履歴をマネーフォワード ME の CSV から取得する",
    paramsSchema,
    async ({ date }) => {
      try {
        const yearMonth = date.slice(0, 7); // "YYYY-MM"
        const kvKey = `transactions/${yearMonth}.csv`;

        const csv = await env.FURIKAERI_KV.get(kvKey, "text");
        if (csv === null) {
          return { content: [{ type: "text" as const, text: JSON.stringify({ transactions: [] }) }] };
        }

        const lines = csv.split("\n");
        const transactions: Array<{
          date: string;
          content: string;
          amount: number;
          institution: string;
          categoryL: string;
          categoryM: string;
          memo: string;
        }> = [];

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const fields = parseCSVLine(line);
          if (fields.length < 10) continue;

          const csvDate = fields[1].replace(/\//g, "-"); // "YYYY/MM/DD" → "YYYY-MM-DD"
          const isTransfer = fields[8] === "1";

          if (csvDate !== date || isTransfer) continue;

          const amountStr = fields[3].replace(/,/g, "");
          const amount = parseInt(amountStr, 10);

          transactions.push({
            date: csvDate,
            content: fields[2],
            amount: isNaN(amount) ? 0 : amount,
            institution: fields[4],
            categoryL: fields[5],
            categoryM: fields[6],
            memo: fields[7],
          });
        }

        return { content: [{ type: "text" as const, text: JSON.stringify({ transactions }) }] };
      } catch (e) {
        const message = e instanceof Error ? e.message : "不明なエラー";
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({ error: true, message: `決済履歴の取得に失敗しました: ${message}`, code: "TRANSACTIONS_ERROR" }),
          }],
        };
      }
    },
  );
}
