import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createYarukotoClient, createPeakLogClient } from "../lib/supabase.js";
import { toJSTDateRange, toJSTISOString } from "../lib/date-utils.js";
import { fetchCalendarEvents } from "../lib/google-calendar.js";
import { formatDateForPhotos, generatePhotosSearchUrl } from "../lib/photos-url.js";
import { fetchLocationHistoryForDate } from "./get-location-history.js";
import type { Env, Task, TaskReason } from "../types/index.js";

function parseCSVLine(line: string): string[] {
  const trimmed = line.startsWith('"') ? line.slice(1) : line;
  const cleaned = trimmed.endsWith('"') ? trimmed.slice(0, -1) : trimmed;
  return cleaned.split('","');
}

const paramsSchema = {
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD 形式で指定してください"),
};

type TaskRow = {
  title: string;
  memo: string | null;
  status: "PENDING" | "COMPLETED" | "SKIPPED";
  priority: "HIGH" | "MEDIUM" | "LOW" | null;
  scheduledAt: string | null;
  completedAt: string | null;
  skippedAt: string | null;
  createdAt: string;
  categories: { name: string; color: string | null } | null;
};

type ReflectionRow = {
  excitement: number | null;
  achievement: number | null;
  wantAgain: boolean;
  note: string | null;
};

type LogRow = {
  performedAt: string;
  activities: { name: string; emoji: string | null; color: string | null };
  reflections: ReflectionRow | ReflectionRow[] | null;
};

async function fetchTasks(env: Env, date: string) {
  const supabase = createYarukotoClient(env);
  const userId = env.YARUKOTO_USER_ID;
  const { start, end } = toJSTDateRange(date);
  const startISO = start.toISOString();
  const endISO = end.toISOString();

  const { data: rows, error } = await supabase
    .from("tasks")
    .select("*, categories(*)")
    .eq("userId", userId)
    .or(
      `scheduledAt.eq.${date},` +
      `and(completedAt.gte.${startISO},completedAt.lt.${endISO}),` +
      `and(skippedAt.gte.${startISO},skippedAt.lt.${endISO}),` +
      `and(createdAt.gte.${startISO},createdAt.lt.${endISO})`,
    )
    .order("displayOrder", { ascending: true });

  if (error) throw new Error(error.message);

  const tasks: Task[] = (rows ?? [] as TaskRow[]).map((t: TaskRow) => {
    const reasons: TaskReason[] = [];
    if (t.scheduledAt === date) reasons.push("scheduled");
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

  return {
    date,
    tasks,
    summary: {
      total: tasks.length,
      scheduled: tasks.filter((t) => t.reasons.includes("scheduled")).length,
      completedOnDate: tasks.filter((t) => t.reasons.includes("completed")).length,
      skippedOnDate: tasks.filter((t) => t.reasons.includes("skipped")).length,
      createdOnDate: tasks.filter((t) => t.reasons.includes("created")).length,
    },
  };
}

async function fetchPeakLogs(env: Env, date: string) {
  const supabase = createPeakLogClient(env);
  const userId = env.PEAK_LOG_USER_ID;
  const { start, end } = toJSTDateRange(date);

  const { data: rows, error } = await supabase
    .from("logs")
    .select("*, activities(*), reflections(*)")
    .eq("userId", userId)
    .gte("performedAt", start.toISOString())
    .lt("performedAt", end.toISOString())
    .order("performedAt", { ascending: true });

  if (error) throw new Error(error.message);

  const logs = (rows ?? [] as LogRow[]).map((row: LogRow) => {
    const reflectionRaw = row.reflections;
    const reflection: ReflectionRow | null = Array.isArray(reflectionRaw)
      ? (reflectionRaw.length > 0 ? reflectionRaw[0] : null)
      : (reflectionRaw ?? null);

    return {
      activity: { name: row.activities.name, emoji: row.activities.emoji, color: row.activities.color },
      performedAt: toJSTISOString(row.performedAt),
      reflection: reflection
        ? { excitement: reflection.excitement, achievement: reflection.achievement, wantAgain: reflection.wantAgain, note: reflection.note }
        : null,
    };
  });

  const withReflection = logs.filter((l) => l.reflection !== null).length;
  const excitementValues = logs.filter((l) => l.reflection?.excitement != null).map((l) => l.reflection!.excitement as number);
  const averageExcitement = excitementValues.length > 0
    ? Math.round((excitementValues.reduce((a, b) => a + b, 0) / excitementValues.length) * 10) / 10
    : null;

  return { date, logs, summary: { totalLogs: logs.length, withReflection, averageExcitement } };
}

async function fetchDiary(date: string) {
  return { date, entries: [] as unknown[] };
}

async function fetchCalendar(env: Env, date: string) {
  const response = await fetchCalendarEvents(env, date);
  const items = response.items ?? [];
  const events = items.map((event) => {
    const isAllDay = Boolean(event.start?.date && !event.start?.dateTime);
    return {
      title: event.summary ?? "",
      startTime: event.start?.dateTime ?? event.start?.date ?? "",
      endTime: event.end?.dateTime ?? event.end?.date ?? "",
      location: event.location ?? null,
      description: event.description ?? null,
      isAllDay,
    };
  });
  const allDayEvents = events.filter((e) => e.isAllDay).length;
  return { date, events, summary: { totalEvents: events.length, allDayEvents, timedEvents: events.length - allDayEvents } };
}

function fetchPhotosUrl(date: string) {
  const searchQuery = formatDateForPhotos(date);
  const url = generatePhotosSearchUrl(searchQuery);
  return { date, searchQuery, url };
}


async function fetchTransactions(env: Env, date: string) {
  const yearMonth = date.slice(0, 7);
  const kvKey = `transactions/${yearMonth}.csv`;

  const obj = await env.FURIKAERI_R2.get(kvKey);
  const csv = obj ? await obj.text() : null;
  if (csv === null) return { transactions: [] };

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

    const csvDate = fields[1].replace(/\//g, "-");
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

  return { transactions };
}

export function registerGetDaySummary(server: McpServer, env: Env) {
  server.tool(
    "get_day_summary",
    "1日分のデータ（タスク・ピークログ・日記・カレンダー・写真URL）を一括取得する",
    paramsSchema,
    async ({ date }) => {
      const [tasksResult, peakLogsResult, diaryResult, calendarResult, photosResult, transactionsResult, locationHistoryResult] = await Promise.allSettled([
        fetchTasks(env, date),
        fetchPeakLogs(env, date),
        fetchDiary(date),
        fetchCalendar(env, date),
        Promise.resolve(fetchPhotosUrl(date)),
        fetchTransactions(env, date),
        fetchLocationHistoryForDate(env, date),
      ]);

      const resolveResult = <T>(result: PromiseSettledResult<T>, code: string) => {
        if (result.status === "fulfilled") return result.value;
        const message = result.reason instanceof Error ? result.reason.message : "不明なエラー";
        return { error: true, message, code };
      };

      const result = {
        date,
        tasks: resolveResult(tasksResult, "TASKS_ERROR"),
        peakLogs: resolveResult(peakLogsResult, "PEAK_LOGS_ERROR"),
        diary: resolveResult(diaryResult, "DIARY_ERROR"),
        calendarEvents: resolveResult(calendarResult, "CALENDAR_ERROR"),
        photosUrl: resolveResult(photosResult, "PHOTOS_ERROR"),
        transactions: resolveResult(transactionsResult, "TRANSACTIONS_ERROR"),
        locationHistory: resolveResult(locationHistoryResult, "LOCATION_HISTORY_ERROR"),
      };

      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    },
  );
}
