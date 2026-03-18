import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { prismaYarukoto } from "../lib/prisma-yarukoto.js";

const paramsSchema = {
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD 形式で指定してください"),
  status: z.enum(["PENDING", "COMPLETED", "SKIPPED"]).optional(),
  category: z.string().optional(),
};

export function registerGetTasks(server: McpServer) {
  server.tool("get_tasks", "Yarukoto のタスクを日付指定で取得する", paramsSchema, async (params) => {
    try {
      const userId = process.env.YARUKOTO_USER_ID;
      if (!userId) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ error: true, message: "YARUKOTO_USER_ID が設定されていません", code: "MISSING_ENV" }),
            },
          ],
        };
      }

      const tasks = await prismaYarukoto.task.findMany({
        where: {
          userId,
          scheduledAt: new Date(params.date),
          ...(params.status ? { status: params.status } : {}),
          ...(params.category ? { category: { name: params.category } } : {}),
        },
        include: { category: true },
        orderBy: { displayOrder: "asc" },
      });

      const summary = {
        total: tasks.length,
        completed: tasks.filter((t) => t.status === "COMPLETED").length,
        pending: tasks.filter((t) => t.status === "PENDING").length,
        skipped: tasks.filter((t) => t.status === "SKIPPED").length,
      };

      const result = {
        date: params.date,
        tasks: tasks.map((t) => ({
          title: t.title,
          status: t.status,
          priority: t.priority,
          category: t.category?.name ?? null,
          memo: t.memo,
          completedAt: t.completedAt,
        })),
        summary,
      };

      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    } catch (e) {
      const message = e instanceof Error ? e.message : "不明なエラー";
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ error: true, message: `Yarukoto DB への接続に失敗しました: ${message}`, code: "DB_CONNECTION_ERROR" }),
          },
        ],
      };
    }
  });
}
