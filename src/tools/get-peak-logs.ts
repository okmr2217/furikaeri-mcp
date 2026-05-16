import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createPeakLogClient } from "../lib/supabase.js";
import { toJSTDateRange, toJSTISOString } from "../lib/date-utils.js";
import type { Env } from "../types/index.js";

const paramsSchema = {
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD 形式で指定してください"),
};

type ReflectionRow = {
  excitement: number | null;
  achievement: number | null;
  wantAgain: boolean;
  note: string | null;
};

type LogRow = {
  id: string;
  userId: string;
  activityId: string;
  performedAt: string;
  activities: {
    name: string;
    emoji: string | null;
    color: string | null;
    description: string | null;
  };
  reflections: ReflectionRow | ReflectionRow[] | null;
};

export function registerGetPeakLogs(server: McpServer, env: Env) {
  server.tool(
    "get_peak_logs",
    "Peak Log のログと余韻を日付指定で取得する",
    paramsSchema,
    async (params) => {
      try {
        const supabase = createPeakLogClient(env);
        const userId = env.PEAK_LOG_USER_ID;
        const { start, end } = toJSTDateRange(params.date);

        const { data: rows, error } = await supabase
          .from("logs")
          .select("*, activities(*), reflections(*)")
          .eq("userId", userId)
          .gte("performedAt", start.toISOString())
          .lt("performedAt", end.toISOString())
          .order("performedAt", { ascending: true });

        if (error) throw new Error(error.message);

        const logs = ((rows ?? []) as LogRow[]).map((row: LogRow) => {
          const reflectionRaw = row.reflections;
          const reflection: ReflectionRow | null = Array.isArray(reflectionRaw)
            ? (reflectionRaw.length > 0 ? reflectionRaw[0] : null)
            : (reflectionRaw ?? null);

          return {
            activity: {
              name: row.activities.name,
              emoji: row.activities.emoji,
              color: row.activities.color,
            },
            performedAt: toJSTISOString(row.performedAt),
            reflection: reflection
              ? {
                  excitement: reflection.excitement,
                  achievement: reflection.achievement,
                  wantAgain: reflection.wantAgain,
                  note: reflection.note,
                }
              : null,
          };
        });

        const activitiesMap = new Map<string, string | null>();
        for (const row of ((rows ?? []) as LogRow[])) {
          activitiesMap.set(row.activities.name, row.activities.description ?? null);
        }
        const activities = Array.from(activitiesMap.entries()).map(([name, description]) => ({ name, description }));

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
          activities,
          logs,
          summary: { totalLogs: logs.length, withReflection, averageExcitement },
        };

        return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
      } catch (e) {
        const message = e instanceof Error ? e.message : "不明なエラー";
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({ error: true, message: `Peak Log DB への接続に失敗しました: ${message}`, code: "DB_CONNECTION_ERROR" }),
          }],
        };
      }
    },
  );
}
