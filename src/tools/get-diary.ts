import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { DiaryResult } from "../types/index.js";

const paramsSchema = {
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD 形式で指定してください"),
};

export function registerGetDiary(server: McpServer) {
  server.tool(
    "get_diary",
    "日記エントリを日付指定で取得する（スタブ: 日記アプリ未開発）",
    paramsSchema,
    async (params): Promise<{ content: [{ type: "text"; text: string }] }> => {
      const result: DiaryResult = { date: params.date, entries: [] };
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    },
  );
}
