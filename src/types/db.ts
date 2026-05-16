// Yarukoto DB — Prisma schema より生成
export type YarukotoDB = {
  public: {
    Tables: {
      tasks: {
        Row: {
          id: string;
          userId: string;
          categoryId: string | null;
          title: string;
          memo: string | null;
          status: "PENDING" | "COMPLETED" | "SKIPPED";
          priority: "HIGH" | "MEDIUM" | "LOW" | null;
          isFavorite: boolean;
          scheduledAt: string | null;
          completedAt: string | null;
          skippedAt: string | null;
          skipReason: string | null;
          displayOrder: number;
          createdAt: string;
          updatedAt: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          userId: string;
          groupId: string | null;
          name: string;
          color: string | null;
          description: string | null;
          sortOrder: number;
          archivedAt: string | null;
          createdAt: string;
          updatedAt: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      groups: {
        Row: {
          id: string;
          userId: string;
          name: string;
          emoji: string | null;
          color: string | null;
          sortOrder: number;
          createdAt: string;
          updatedAt: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      TaskStatus: "PENDING" | "COMPLETED" | "SKIPPED";
      Priority: "HIGH" | "MEDIUM" | "LOW";
    };
    CompositeTypes: Record<string, never>;
  };
};

// Peak Log DB — Prisma schema より生成（reflections テーブルはスキーマ未記載のため推定）
export type PeakLogDB = {
  public: {
    Tables: {
      activities: {
        Row: {
          id: string;
          userId: string;
          name: string;
          emoji: string | null;
          color: string | null;
          description: string | null;
          sortOrder: number;
          isArchived: boolean;
          createdAt: string;
          updatedAt: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      logs: {
        Row: {
          id: string;
          userId: string;
          activityId: string;
          performedAt: string;
          stars: number | null;
          note: string | null;
          fieldValues: unknown | null;
          createdAt: string;
          updatedAt: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      reflections: {
        Row: {
          id: string;
          logId: string;
          excitement: number | null;
          achievement: number | null;
          wantAgain: boolean;
          note: string | null;
          createdAt: string;
          updatedAt: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
