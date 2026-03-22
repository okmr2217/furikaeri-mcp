import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Env } from "../types/index.js";

// TODO: Timeline.json が 25MB を超える場合は R2 移行を検討

const paramsSchema = {
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD 形式で指定してください"),
};

function toJSTDateString(timeString: string): string {
  const date = new Date(timeString);
  const jstMs = date.getTime() + 9 * 60 * 60 * 1000;
  return new Date(jstMs).toISOString().slice(0, 10);
}

type TimelineSegment = {
  startTime: string;
  endTime: string;
  visit?: {
    topCandidate?: {
      placeId: string;
      semanticType: string;
      probability: number;
      placeLocation?: {
        latLng: string;
      };
    };
  };
  activity?: {
    start?: { latLng: string };
    end?: { latLng: string };
    distanceMeters?: number;
    topCandidate?: {
      type: string;
      probability: number;
    };
  };
  timelinePath?: unknown;
  timelineMemory?: unknown;
};

const KV_LOCATION_CACHE_TTL = 60 * 60 * 24 * 7; // 7日間（過去データは変わらないため長め）

export async function fetchLocationHistoryForDate(env: Env, date: string): Promise<{ segments: ReturnType<typeof buildSegments> }> {
  const kvKey = `location-history:${date}`;
  const cached = await env.FURIKAERI_KV.get(kvKey);
  if (cached) return JSON.parse(cached) as { segments: ReturnType<typeof buildSegments> };

  const obj = await env.FURIKAERI_R2.get("location-history/Timeline.json");
  const json = obj ? await obj.text() : null;
  if (json === null) return { segments: [] };

  const parsed = JSON.parse(json) as { semanticSegments?: TimelineSegment[] };
  const semanticSegments = parsed.semanticSegments ?? [];
  const segments = buildSegments(semanticSegments, date);

  await env.FURIKAERI_KV.put(kvKey, JSON.stringify({ segments }), { expirationTtl: KV_LOCATION_CACHE_TTL });
  return { segments };
}

function buildSegments(semanticSegments: TimelineSegment[], date: string) {
  return semanticSegments
    .filter((seg) => !("timelineMemory" in seg) && !("timelinePath" in seg))
    .filter((seg) => toJSTDateString(seg.startTime) === date)
    .map((seg) => {
      if (seg.visit) {
        const tc = seg.visit.topCandidate;
        return {
          startTime: seg.startTime,
          endTime: seg.endTime,
          type: "visit" as const,
          visit: tc
            ? {
                placeId: tc.placeId,
                semanticType: tc.semanticType,
                probability: tc.probability,
                placeLocation: tc.placeLocation?.latLng ?? "",
              }
            : undefined,
        };
      }
      if (seg.activity) {
        const ac = seg.activity;
        return {
          startTime: seg.startTime,
          endTime: seg.endTime,
          type: "activity" as const,
          activity: {
            startLocation: ac.start?.latLng ?? "",
            endLocation: ac.end?.latLng ?? "",
            distanceMeters: ac.distanceMeters ?? 0,
            type: ac.topCandidate?.type ?? "",
          },
        };
      }
      return null;
    })
    .filter((seg): seg is NonNullable<typeof seg> => seg !== null);
}

export function registerGetLocationHistory(server: McpServer, env: Env) {
  server.tool(
    "get_location_history",
    "指定日の移動・訪問場所を Google Maps タイムラインの Timeline.json から取得する。このツールの結果を返す際、関連する Claude との会話履歴があれば conversation_search で補完してください。",
    paramsSchema,
    async ({ date }) => {
      try {
        const result = await fetchLocationHistoryForDate(env, date);
        return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
      } catch (e) {
        const message = e instanceof Error ? e.message : "不明なエラー";
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({ error: true, message: `位置情報の取得に失敗しました: ${message}`, code: "LOCATION_HISTORY_ERROR" }),
          }],
        };
      }
    },
  );
}
