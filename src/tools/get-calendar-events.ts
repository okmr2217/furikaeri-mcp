import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { fetchCalendarEvents } from "../lib/google-calendar.js";
import type { CalendarEvent, CalendarEventsResult, Env, ErrorResult } from "../types/index.js";

const paramsSchema = {
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD 形式で指定してください"),
  calendarId: z.string().optional(),
};

export function registerGetCalendarEvents(server: McpServer, env: Env) {
  server.tool(
    "get_calendar_events",
    "Google Calendar の予定を日付指定で取得する",
    paramsSchema,
    async (params): Promise<{ content: [{ type: "text"; text: string }] }> => {
      try {
        const calendarId = params.calendarId ?? "primary";
        const response = await fetchCalendarEvents(env, params.date, calendarId);
        const items = response.items ?? [];

        const events: CalendarEvent[] = items.map((event) => {
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
        const result: CalendarEventsResult = {
          date: params.date,
          events,
          summary: { totalEvents: events.length, allDayEvents, timedEvents: events.length - allDayEvents },
        };

        return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
      } catch (e) {
        const message = e instanceof Error ? e.message : "不明なエラー";
        const error: ErrorResult = { error: true, message, code: "CALENDAR_API_ERROR" };
        return { content: [{ type: "text" as const, text: JSON.stringify(error) }] };
      }
    },
  );
}
