import type { Env } from "../types/index.js";

const KV_TOKEN_KEY = "google-calendar-access-token";
const TOKEN_TTL_SECONDS = 3000; // 50分（有効期限3600秒より余裕を持たせる）

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

async function getAccessToken(env: Env): Promise<string> {
  const cached = await env.FURIKAERI_KV.get(KV_TOKEN_KEY);
  if (cached) return cached;

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
  await env.FURIKAERI_KV.put(KV_TOKEN_KEY, access_token, { expirationTtl: TOKEN_TTL_SECONDS });
  return access_token;
}

export async function fetchCalendarEvents(
  env: Env,
  date: string,
  calendarId = "primary",
): Promise<GoogleCalendarListResponse> {
  const access_token = await getAccessToken(env);

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
