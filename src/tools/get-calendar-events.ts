import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getCalendarClient } from "../lib/google-calendar.js";
import type { CalendarEvent, CalendarEventsResult, ErrorResult } from "../types/index.js";

const paramsSchema = {
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD 形式で指定してください"),
  calendarId: z.string().optional(),
};

export function registerGetCalendarEvents(server: McpServer) {
  server.tool(
    "get_calendar_events",
    "Google Calendar の予定を日付指定で取得する",
    paramsSchema,
    async (params): Promise<{ content: [{ type: "text"; text: string }] }> => {
      try {
        const calendar = getCalendarClient();
        const calendarId = params.calendarId ?? "primary";
        const timeMin = `${params.date}T00:00:00+09:00`;
        const timeMax = `${params.date}T23:59:59+09:00`;

        const res = await calendar.events.list({
          calendarId,
          timeMin,
          timeMax,
          singleEvents: true,
          orderBy: "startTime",
        });

        const items = res.data.items ?? [];

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
        const timedEvents = events.length - allDayEvents;

        const result: CalendarEventsResult = {
          date: params.date,
          events,
          summary: {
            totalEvents: events.length,
            allDayEvents,
            timedEvents,
          },
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
