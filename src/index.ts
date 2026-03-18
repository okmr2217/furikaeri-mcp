import OAuthProvider from "@cloudflare/workers-oauth-provider";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
import { GitHubHandler } from "./github-handler.js";
import type { Props } from "./utils.js";
import type { Env } from "./types/index.js";
import { registerGetTasks } from "./tools/get-tasks.js";
import { registerGetPeakLogs } from "./tools/get-peak-logs.js";
import { registerGetCommits } from "./tools/get-commits.js";
import { registerGetDiary } from "./tools/get-diary.js";
import { registerGetCalendarEvents } from "./tools/get-calendar-events.js";
import { registerGetPhotosUrl } from "./tools/get-photos-url.js";
import { registerGetDaySummary } from "./tools/get-day-summary.js";

// アクセスを許可する GitHub ユーザー名を設定する
const ALLOWED_USERNAMES = new Set<string>([
  // "your-github-username",
]);

export class FurikaeriMCP extends McpAgent<Env, Record<string, never>, Props> {
  server = new McpServer({ name: "furikaeri-mcp", version: "0.1.0" });

  async init() {
    if (!ALLOWED_USERNAMES.has(this.props!.login)) {
      return;
    }

    const env = this.env;
    registerGetTasks(this.server, env);
    registerGetPeakLogs(this.server, env);
    registerGetCommits(this.server, env);
    registerGetDiary(this.server);
    registerGetCalendarEvents(this.server, env);
    registerGetPhotosUrl(this.server);
    registerGetDaySummary(this.server, env);
  }
}

export default new OAuthProvider({
  apiHandler: FurikaeriMCP.serve("/mcp"),
  apiRoute: "/mcp",
  authorizeEndpoint: "/authorize",
  clientRegistrationEndpoint: "/register",
  defaultHandler: GitHubHandler as ExportedHandler,
  tokenEndpoint: "/token",
});
