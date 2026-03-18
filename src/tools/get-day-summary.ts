import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { prismaYarukoto } from "../lib/prisma-yarukoto.js";
import { prismaPeakLog } from "../lib/prisma-peak-log.js";
import { toJSTDateRange } from "../lib/date-utils.js";
import { getCalendarClient } from "../lib/google-calendar.js";
import { formatDateForPhotos, generatePhotosSearchUrl } from "../lib/photos-url.js";
import type { Task, TaskReason } from "../types/index.js";

const paramsSchema = {
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD 形式で指定してください"),
};

async function fetchTasks(date: string) {
  const userId = process.env.YARUKOTO_USER_ID;
  if (!userId) throw new Error("YARUKOTO_USER_ID が設定されていません");

  const { start, end } = toJSTDateRange(date);
  const rows = await prismaYarukoto.task.findMany({
    where: {
      userId,
      OR: [
        { scheduledAt: new Date(date) },
        { completedAt: { gte: start, lt: end } },
        { skippedAt: { gte: start, lt: end } },
        { createdAt: { gte: start, lt: end } },
      ],
    },
    include: { category: true },
    orderBy: { displayOrder: "asc" },
  });

  const tasks: Task[] = rows.map((t) => {
    const reasons: TaskReason[] = [];
    if (t.scheduledAt?.toISOString().slice(0, 10) === date) reasons.push("scheduled");
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

async function fetchPeakLogs(date: string) {
  const userId = process.env.PEAK_LOG_USER_ID;
  if (!userId) throw new Error("PEAK_LOG_USER_ID が設定されていません");

  const { start, end } = toJSTDateRange(date);
  const rows = await prismaPeakLog.log.findMany({
    where: {
      userId,
      performedAt: { gte: start, lt: end },
    },
    include: { activity: true, reflection: true },
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

  return {
    date,
    logs,
    summary: { totalLogs: logs.length, withReflection, averageExcitement },
  };
}

async function fetchDiary(date: string) {
  return { date, entries: [] as unknown[] };
}

async function fetchCalendarEvents(date: string) {
  const calendar = getCalendarClient();
  const res = await calendar.events.list({
    calendarId: "primary",
    timeMin: `${date}T00:00:00+09:00`,
    timeMax: `${date}T23:59:59+09:00`,
    singleEvents: true,
    orderBy: "startTime",
  });

  const items = res.data.items ?? [];
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
  return {
    date,
    events,
    summary: { totalEvents: events.length, allDayEvents, timedEvents: events.length - allDayEvents },
  };
}

function fetchPhotosUrl(date: string) {
  const searchQuery = formatDateForPhotos(date);
  const url = generatePhotosSearchUrl(searchQuery);
  return { date, searchQuery, url };
}

export function registerGetDaySummary(server: McpServer) {
  server.tool("get_day_summary", "1日分のデータ（タスク・ピークログ・日記・カレンダー・写真URL）を一括取得する", paramsSchema, async ({ date }) => {
    const [tasksResult, peakLogsResult, diaryResult, calendarResult, photosResult] = await Promise.allSettled([
      fetchTasks(date),
      fetchPeakLogs(date),
      fetchDiary(date),
      fetchCalendarEvents(date),
      Promise.resolve(fetchPhotosUrl(date)),
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
    };

    return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
  });
}
