import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerGetPhotosUrl } from "./tools/get-photos-url.js";
import { registerGetTasks } from "./tools/get-tasks.js";
import { registerGetPeakLogs } from "./tools/get-peak-logs.js";
import { registerGetCommits } from "./tools/get-commits.js";
import { registerGetCalendarEvents } from "./tools/get-calendar-events.js";
import { registerGetDiary } from "./tools/get-diary.js";
import { registerGetDaySummary } from "./tools/get-day-summary.js";

const server = new McpServer({
  name: "furikaeri-mcp",
  version: "0.1.0",
});

registerGetPhotosUrl(server);
registerGetTasks(server);
registerGetPeakLogs(server);
registerGetCommits(server);
registerGetCalendarEvents(server);
registerGetDiary(server);
registerGetDaySummary(server);

const transport = new StdioServerTransport();
await server.connect(transport);
