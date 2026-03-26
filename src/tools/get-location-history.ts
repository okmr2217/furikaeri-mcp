import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Env } from "../types/index.js";

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
const KV_PLACE_NAME_TTL = 60 * 60 * 24 * 90; // 90日間（店名はそうそう変わらない）

type VisitSegment = {
  startTime: string;
  endTime: string;
  type: "visit";
  visit?: {
    placeId: string;
    placeName?: string | null;
    semanticType: string;
    probability: number;
    placeLocation: string;
  };
};

async function resolvePlaceNames(env: Env, segments: ReturnType<typeof buildSegments>): Promise<Map<string, string | null>> {
  const visitSegments = segments.filter((s): s is VisitSegment => s.type === "visit");
  const placeIds = visitSegments.filter((s) => s.visit?.placeId).map((s) => s.visit!.placeId);
  const uniqueIds = [...new Set(placeIds)];
  const result = new Map<string, string | null>();

  if (uniqueIds.length === 0) return result;

  // 上限チェック（Workers サブリクエスト上限 50）
  const idsToResolve = uniqueIds.slice(0, 50);

  // KV キャッシュを並行チェック
  const cacheResults = await Promise.all(
    idsToResolve.map(async (id) => ({
      id,
      name: await env.FURIKAERI_KV.get(`place-name:${id}`),
    }))
  );

  const misses: string[] = [];
  for (const { id, name } of cacheResults) {
    if (name !== null) {
      result.set(id, name);
    } else {
      misses.push(id);
    }
  }

  // キャッシュミス分を Places API で並行解決
  if (misses.length > 0) {
    const apiResults = await Promise.all(
      misses.map(async (id) => {
        try {
          const res = await fetch(`https://places.googleapis.com/v1/places/${id}`, {
            headers: {
              "X-Goog-Api-Key": env.GOOGLE_MAPS_API_KEY,
              "X-Goog-FieldMask": "displayName",
            },
          });
          if (!res.ok) return { id, name: null };
          const data = (await res.json()) as { displayName?: { text?: string } };
          return { id, name: data.displayName?.text ?? null };
        } catch {
          return { id, name: null };
        }
      })
    );

    // 結果を KV に保存 & Map に追加
    await Promise.all(
      apiResults.map(async ({ id, name }) => {
        result.set(id, name);
        if (name !== null) {
          await env.FURIKAERI_KV.put(`place-name:${id}`, name, { expirationTtl: KV_PLACE_NAME_TTL });
        }
      })
    );
  }

  return result;
}

export async function fetchLocationHistoryForDate(env: Env, date: string): Promise<{ segments: ReturnType<typeof buildSegments> }> {
  const kvKey = `location-history:v2:${date}`;
  const cached = await env.FURIKAERI_KV.get(kvKey);
  if (cached) return JSON.parse(cached) as { segments: ReturnType<typeof buildSegments> };

  const obj = await env.FURIKAERI_R2.get("location-history/Timeline.json");
  const json = obj ? await obj.text() : null;
  if (json === null) return { segments: [] };

  const parsed = JSON.parse(json) as { semanticSegments?: TimelineSegment[] };
  const semanticSegments = parsed.semanticSegments ?? [];
  const segments = buildSegments(semanticSegments, date);

  // 場所名を解決して visit セグメントに付与
  const nameMap = await resolvePlaceNames(env, segments);
  const enrichedSegments = segments.map((seg) => {
    if (seg.type === "visit" && seg.visit?.placeId) {
      return {
        ...seg,
        visit: {
          ...seg.visit,
          placeName: nameMap.get(seg.visit.placeId) ?? null,
        },
      };
    }
    return seg;
  });

  await env.FURIKAERI_KV.put(kvKey, JSON.stringify({ segments: enrichedSegments }), { expirationTtl: KV_LOCATION_CACHE_TTL });
  return { segments: enrichedSegments };
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
