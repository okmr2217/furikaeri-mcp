import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Env } from "../types/index.js";
import type { YarukotoDB, PeakLogDB } from "../types/db.js";

const clientOptions = {
  auth: { persistSession: false, autoRefreshToken: false },
} as const;

export function createYarukotoClient(env: Env): SupabaseClient<YarukotoDB> {
  return createClient<YarukotoDB>(env.YARUKOTO_SUPABASE_URL, env.YARUKOTO_SUPABASE_SERVICE_KEY, clientOptions);
}

export function createPeakLogClient(env: Env): SupabaseClient<PeakLogDB> {
  return createClient<PeakLogDB>(env.PEAK_LOG_SUPABASE_URL, env.PEAK_LOG_SUPABASE_SERVICE_KEY, clientOptions);
}
