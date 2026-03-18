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
