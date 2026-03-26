import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createYarukotoClient } from "../lib/supabase.js";
import { toJSTISOString } from "../lib/date-utils.js";
import type { Env, AllTask, AllTasksResult } from "../types/index.js";

const paramsSchema = {
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
  categories: { name: string; color: string | null; description: string | null } | null;
};

export function registerGetAllTasks(server: McpServer, env: Env) {
  server.tool(
    "get_all_tasks",
    "Yarukoto の全タスクをカテゴリ・ステータスで絞り込んで取得する（日付指定なし）。未完了タスクの一覧確認や、特定カテゴリのタスク棚卸しに使用する。",
    paramsSchema,
    async (params) => {
      try {
        const supabase = createYarukotoClient(env);
        const userId = env.YARUKOTO_USER_ID;

        let query = supabase
          .from("tasks")
          .select("*, categories(*)")
          .eq("userId", userId)
          .order("displayOrder", { ascending: true });

        if (params.status) {
          query = query.eq("status", params.status);
        }

        const { data: rows, error } = await query;
        if (error) throw new Error(error.message);

        let taskRows = (rows ?? []) as TaskRow[];

        if (params.category) {
          taskRows = taskRows.filter((t) => t.categories?.name === params.category);
        }

        const tasks: AllTask[] = taskRows.map((t) => ({
          title: t.title,
          status: t.status,
          priority: t.priority,
          category: t.categories?.name ?? null,
          memo: t.memo,
          scheduledAt: t.scheduledAt,
          completedAt: t.completedAt ? toJSTISOString(t.completedAt) : null,
          skippedAt: t.skippedAt ? toJSTISOString(t.skippedAt) : null,
          createdAt: toJSTISOString(t.createdAt),
        }));

        const categoriesMap = new Map<string, string | null>();
        for (const t of taskRows) {
          if (t.categories) {
            categoriesMap.set(t.categories.name, t.categories.description ?? null);
          }
        }
        const categories = Array.from(categoriesMap.entries()).map(([name, description]) => ({ name, description }));

        const result: AllTasksResult = {
          categories,
          tasks,
          summary: {
            total: tasks.length,
            byStatus: {
              PENDING: tasks.filter((t) => t.status === "PENDING").length,
              COMPLETED: tasks.filter((t) => t.status === "COMPLETED").length,
              SKIPPED: tasks.filter((t) => t.status === "SKIPPED").length,
            },
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
