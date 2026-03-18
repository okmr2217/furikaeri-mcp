import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { prismaYarukoto } from "../lib/prisma-yarukoto.js";
import { toJSTDateRange } from "../lib/date-utils.js";
import type { Task, TaskReason } from "../types/index.js";

const paramsSchema = {
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD 形式で指定してください"),
  status: z.enum(["PENDING", "COMPLETED", "SKIPPED"]).optional(),
  category: z.string().optional(),
};

export function registerGetTasks(server: McpServer) {
  server.tool("get_tasks", "Yarukoto のタスクを日付指定で取得する（その日に予定・完了・スキップ・作成されたタスクを横断取得）", paramsSchema, async (params) => {
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

      const { start, end } = toJSTDateRange(params.date);

      const rows = await prismaYarukoto.task.findMany({
        where: {
          userId,
          OR: [
            { scheduledAt: new Date(params.date) },
            { completedAt: { gte: start, lt: end } },
            { skippedAt: { gte: start, lt: end } },
            { createdAt: { gte: start, lt: end } },
          ],
          ...(params.status ? { status: params.status } : {}),
          ...(params.category ? { category: { name: params.category } } : {}),
        },
        include: { category: true },
        orderBy: { displayOrder: "asc" },
      });

      const tasks: Task[] = rows.map((t) => {
        const reasons: TaskReason[] = [];
        if (t.scheduledAt?.toISOString().slice(0, 10) === params.date) reasons.push("scheduled");
        if (t.completedAt && t.completedAt >= start && t.completedAt < end) reasons.push("completed");
        if (t.skippedAt && t.skippedAt >= start && t.skippedAt < end) reasons.push("skipped");
        if (t.createdAt >= start && t.createdAt < end) reasons.push("created");

        return {
          title: t.title,
          status: t.status,
          priority: t.priority,
          category: t.category?.name ?? null,
          memo: t.memo,
          scheduledAt: t.scheduledAt ? t.scheduledAt.toISOString().slice(0, 10) : null,
          completedAt: t.completedAt ? t.completedAt.toISOString() : null,
          skippedAt: t.skippedAt ? t.skippedAt.toISOString() : null,
          createdAt: t.createdAt.toISOString(),
          reasons,
        };
      });

      const result = {
        date: params.date,
        tasks,
        summary: {
          total: tasks.length,
          scheduled: tasks.filter((t) => t.reasons.includes("scheduled")).length,
          completedOnDate: tasks.filter((t) => t.reasons.includes("completed")).length,
          skippedOnDate: tasks.filter((t) => t.reasons.includes("skipped")).length,
          createdOnDate: tasks.filter((t) => t.reasons.includes("created")).length,
        },
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
