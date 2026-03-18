import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Env } from "../types/index.js";

export function createYarukotoClient(env: Env): SupabaseClient {
  return createClient(env.YARUKOTO_SUPABASE_URL, env.YARUKOTO_SUPABASE_SERVICE_KEY);
}

export function createPeakLogClient(env: Env): SupabaseClient {
  return createClient(env.PEAK_LOG_SUPABASE_URL, env.PEAK_LOG_SUPABASE_SERVICE_KEY);
}
