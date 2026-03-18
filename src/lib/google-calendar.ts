import type { Env } from "../types/index.js";

type AccessTokenResponse = {
  access_token: string;
};

type GoogleCalendarEvent = {
  summary?: string;
  location?: string;
  description?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
};

export type GoogleCalendarListResponse = {
  items?: GoogleCalendarEvent[];
};

export async function fetchCalendarEvents(
  env: Env,
  date: string,
  calendarId = "primary",
): Promise<GoogleCalendarListResponse> {
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: env.GOOGLE_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });
  if (!tokenRes.ok) {
    throw new Error(`Google OAuth token refresh failed: ${tokenRes.status}`);
  }
  const { access_token } = (await tokenRes.json()) as AccessTokenResponse;

  const params = new URLSearchParams({
    timeMin: `${date}T00:00:00+09:00`,
    timeMax: `${date}T23:59:59+09:00`,
    singleEvents: "true",
    orderBy: "startTime",
  });

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
    { headers: { Authorization: `Bearer ${access_token}` } },
  );
  if (!res.ok) {
    throw new Error(`Google Calendar API failed: ${res.status}`);
  }
  return (await res.json()) as GoogleCalendarListResponse;
}
