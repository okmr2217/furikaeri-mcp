// Cloudflare Workers Env bindings
export interface Env {
  // Cloudflare bindings
  OAUTH_KV: KVNamespace;
  FURIKAERI_KV: KVNamespace;
  FURIKAERI_R2: R2Bucket;
  MCP_OBJECT: DurableObjectNamespace;

  // GitHub OAuth（MCP 認証用）
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  COOKIE_ENCRYPTION_KEY: string;

  // GitHub PAT（コミット取得用）
  GITHUB_TOKEN: string;

  // Yarukoto（Supabase）
  YARUKOTO_SUPABASE_URL: string;
  YARUKOTO_SUPABASE_SERVICE_KEY: string;
  YARUKOTO_USER_ID: string;

  // Peak Log（Supabase）
  PEAK_LOG_SUPABASE_URL: string;
  PEAK_LOG_SUPABASE_SERVICE_KEY: string;
  PEAK_LOG_USER_ID: string;

  // Google Calendar API
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_REFRESH_TOKEN: string;
}

export type TaskStatus = "PENDING" | "COMPLETED" | "SKIPPED";
export type TaskPriority = "HIGH" | "MEDIUM" | "LOW";
export type TaskReason = "scheduled" | "completed" | "skipped" | "created";

export type Task = {
  title: string;
  status: TaskStatus;
  priority: TaskPriority | null;
  category: string | null;
  memo: string | null;
  scheduledAt: string | null;
  completedAt: string | null;
  skippedAt: string | null;
  createdAt: string;
  reasons: TaskReason[];
};

export type TasksResult = {
  date: string;
  categories: Array<{ name: string; description: string | null }>;
  tasks: Task[];
  summary: {
    total: number;
    scheduled: number;
    completedOnDate: number;
    skippedOnDate: number;
    createdOnDate: number;
  };
};

export type PeakLogEntry = {
  activity: {
    name: string;
    emoji: string | null;
    color: string | null;
  };
  performedAt: string;
  reflection: {
    excitement: number | null;
    achievement: number | null;
    wantAgain: boolean;
    note: string | null;
  } | null;
};

export type PeakLogsResult = {
  date: string;
  logs: PeakLogEntry[];
  summary: {
    totalLogs: number;
    withReflection: number;
    averageExcitement: number | null;
  };
};

export type DiaryEntry = {
  title: string | null;
  body: string;
  mood: string | null;
  createdAt: string;
};

export type DiaryResult = {
  date: string;
  entries: DiaryEntry[];
};

export type CalendarEvent = {
  title: string;
  startTime: string;
  endTime: string;
  location: string | null;
  description: string | null;
  isAllDay: boolean;
};

export type CalendarEventsResult = {
  date: string;
  events: CalendarEvent[];
  summary: {
    totalEvents: number;
    allDayEvents: number;
    timedEvents: number;
  };
};

export type PhotosUrlResult = {
  date: string;
  searchQuery: string;
  url: string;
};

export type DaySummaryResult = {
  date: string;
  tasks: TasksResult | ErrorResult;
  peakLogs: PeakLogsResult | ErrorResult;
  diary: DiaryResult | ErrorResult;
  calendarEvents: CalendarEventsResult | ErrorResult;
  photosUrl: string;
};

export type CommitEntry = {
  sha: string;
  message: string;
  author: string;
  date: string;
  stats?: { additions: number; deletions: number };
  files?: string[];
};

export type CommitRepoResult = {
  repo: string;
  commits: CommitEntry[];
};

export type ErrorResult = {
  error: true;
  message: string;
  code: string;
};
