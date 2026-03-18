import "dotenv/config";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { randomUUID } from "node:crypto";
import { createServer } from "./mcp-server.js";

const transportMode = process.env.TRANSPORT ?? "stdio";

if (transportMode === "http") {
  const port = parseInt(process.env.PORT ?? "3000", 10);
  const transports = new Map<string, StreamableHTTPServerTransport>();

  const app = createMcpExpressApp({ host: "0.0.0.0" });

  app.post("/mcp", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"];

    if (sessionId) {
      const t = transports.get(sessionId as string);
      if (!t) {
        res.status(404).end();
        return;
      }
      await t.handleRequest(req, res, req.body);
      return;
    }

    // 新規セッション
    const t = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (id) => { transports.set(id, t); },
      onsessionclosed: (id) => { transports.delete(id); },
    });
    const server = createServer();
    await server.connect(t);
    await t.handleRequest(req, res, req.body);
  });

  app.get("/mcp", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (!sessionId) {
      res.status(400).end();
      return;
    }
    const t = transports.get(sessionId);
    if (!t) {
      res.status(404).end();
      return;
    }
    await t.handleRequest(req, res);
  });

  app.delete("/mcp", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (!sessionId) {
      res.status(400).end();
      return;
    }
    const t = transports.get(sessionId);
    if (!t) {
      res.status(404).end();
      return;
    }
    await t.handleRequest(req, res);
  });

  app.listen(port, "0.0.0.0", () => {
    console.log(`furikaeri-mcp listening on port ${port}`);
  });
} else {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
