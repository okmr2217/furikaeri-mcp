import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { prismaPeakLog } from "../lib/prisma-peak-log.js";
import { toJSTDateRange } from "../lib/date-utils.js";

const paramsSchema = {
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD 形式で指定してください"),
};

export function registerGetPeakLogs(server: McpServer) {
  server.tool("get_peak_logs", "Peak Log のログと余韻を日付指定で取得する", paramsSchema, async (params) => {
    try {
      const userId = process.env.PEAK_LOG_USER_ID;
      if (!userId) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ error: true, message: "PEAK_LOG_USER_ID が設定されていません", code: "MISSING_ENV" }),
            },
          ],
        };
      }

      const { start, end } = toJSTDateRange(params.date);

      const rows = await prismaPeakLog.log.findMany({
        where: {
          userId,
          performedAt: { gte: start, lt: end },
        },
        include: {
          activity: true,
          reflection: true,
        },
        orderBy: { performedAt: "asc" },
      });

      const logs = rows.map((row) => ({
        activity: {
          name: row.activity.name,
          emoji: row.activity.emoji,
          color: row.activity.color,
        },
        performedAt: row.performedAt.toISOString(),
        reflection: row.reflection
          ? {
              excitement: row.reflection.excitement,
              achievement: row.reflection.achievement,
              wantAgain: row.reflection.wantAgain,
              note: row.reflection.note,
            }
          : null,
      }));

      const withReflection = logs.filter((l) => l.reflection !== null).length;
      const excitementValues = logs
        .filter((l) => l.reflection?.excitement != null)
        .map((l) => l.reflection!.excitement as number);
      const averageExcitement =
        excitementValues.length > 0
          ? Math.round((excitementValues.reduce((a, b) => a + b, 0) / excitementValues.length) * 10) / 10
          : null;

      const result = {
        date: params.date,
        logs,
        summary: {
          totalLogs: logs.length,
          withReflection,
          averageExcitement,
        },
      };

      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    } catch (e) {
      const message = e instanceof Error ? e.message : "不明なエラー";
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ error: true, message: `Peak Log DB への接続に失敗しました: ${message}`, code: "DB_CONNECTION_ERROR" }),
          },
        ],
      };
    }
  });
}
