import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerGetPhotosUrl } from "./tools/get-photos-url.js";
import { registerGetTasks } from "./tools/get-tasks.js";

const server = new McpServer({
  name: "furikaeri-mcp",
  version: "0.1.0",
});

registerGetPhotosUrl(server);
registerGetTasks(server);

const transport = new StdioServerTransport();
await server.connect(transport);
