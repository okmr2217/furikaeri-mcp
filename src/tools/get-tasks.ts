import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createYarukotoClient } from "../lib/supabase.js";
import { toJSTDateRange, toJSTISOString } from "../lib/date-utils.js";
import type { Env, Task, TaskReason } from "../types/index.js";

const paramsSchema = {
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD 形式で指定してください"),
  status: z.enum(["PENDING", "COMPLETED", "SKIPPED"]).optional(),
  category: z.string().optional(),
};

type TaskRow = {
  id: string;
  userId: string;
  categoryId: string | null;
  title: string;
  memo: string | null;
  status: "PENDING" | "COMPLETED" | "SKIPPED";
  priority: "HIGH" | "MEDIUM" | "LOW" | null;
  scheduledAt: string | null;
  completedAt: string | null;
  skippedAt: string | null;
  createdAt: string;
  categories: { name: string; color: string | null; description: string | null; archivedAt: string | null } | null;
};

export function registerGetTasks(server: McpServer, env: Env) {
  server.tool(
    "get_tasks",
    "Yarukoto のタスクを日付指定で取得する（その日に予定・完了・スキップ・作成されたタスクを横断取得）。レスポンスにはタスクが属するカテゴリの説明文も含まれる。このツールの結果を返す際、関連する Claude との会話履歴があれば conversation_search で補完してください。",
    paramsSchema,
    async (params) => {
      try {
        const supabase = createYarukotoClient(env);
        const userId = env.YARUKOTO_USER_ID;
        const { start, end } = toJSTDateRange(params.date);
        const startISO = start.toISOString();
        const endISO = end.toISOString();

        let query = supabase
          .from("tasks")
          .select("*, categories(*)")
          .eq("userId", userId)
          .or(
            `scheduledAt.eq.${params.date},` +
            `and(completedAt.gte.${startISO},completedAt.lt.${endISO}),` +
            `and(skippedAt.gte.${startISO},skippedAt.lt.${endISO}),` +
            `and(createdAt.gte.${startISO},createdAt.lt.${endISO})`,
          )
          .order("displayOrder", { ascending: true });

        if (params.status) {
          query = query.eq("status", params.status);
        }

        const { data: rows, error } = await query;
        if (error) throw new Error(error.message);

        let taskRows = (rows ?? []) as TaskRow[];

        // アーカイブ済みカテゴリのタスクを除外
        taskRows = taskRows.filter((t) => t.categories === null || t.categories.archivedAt === null);

        if (params.category) {
          taskRows = taskRows.filter((t) => t.categories?.name === params.category);
        }

        const tasks: Task[] = taskRows.map((t) => {
          const reasons: TaskReason[] = [];
          if (t.scheduledAt === params.date) reasons.push("scheduled");
          if (t.completedAt) {
            const completedAt = new Date(t.completedAt);
            if (completedAt >= start && completedAt < end) reasons.push("completed");
          }
          if (t.skippedAt) {
            const skippedAt = new Date(t.skippedAt);
            if (skippedAt >= start && skippedAt < end) reasons.push("skipped");
          }
          const createdAt = new Date(t.createdAt);
          if (createdAt >= start && createdAt < end) reasons.push("created");

          return {
            title: t.title,
            status: t.status,
            priority: t.priority,
            category: t.categories?.name ?? null,
            memo: t.memo,
            scheduledAt: t.scheduledAt,
            completedAt: t.completedAt ? toJSTISOString(t.completedAt) : null,
            skippedAt: t.skippedAt ? toJSTISOString(t.skippedAt) : null,
            createdAt: toJSTISOString(t.createdAt),
            reasons,
          };
        });

        const categoriesMap = new Map<string, string | null>();
        for (const t of taskRows) {
          if (t.categories) {
            categoriesMap.set(t.categories.name, t.categories.description ?? null);
          }
        }
        const categories = Array.from(categoriesMap.entries()).map(([name, description]) => ({ name, description }));

        const result = {
          date: params.date,
          categories,
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
          content: [{
            type: "text" as const,
            text: JSON.stringify({ error: true, message: `Yarukoto DB への接続に失敗しました: ${message}`, code: "DB_CONNECTION_ERROR" }),
          }],
        };
      }
    },
  );
}
