import type { OAuthHelpers } from "@cloudflare/workers-oauth-provider";
import type { Hono } from "hono";
import type { Env } from "../types/index.js";
import { signAdminToken, verifyAdminCookie, makeAdminCookie, clearAdminCookie } from "./auth.js";
import { renderLoginPage, renderUploadPage } from "./pages.js";

type AppType = Hono<{ Bindings: Env & { OAUTH_PROVIDER: OAuthHelpers } }>;

async function isAuthenticated(req: Request, secret: string): Promise<boolean> {
  return verifyAdminCookie(req.headers.get("Cookie"), secret);
}

export function registerAdminRoutes(app: AppType): void {
  app.get("/admin/login", (c) => c.html(renderLoginPage()));

  app.post("/admin/login", async (c) => {
    const form = await c.req.formData();
    const password = form.get("password");
    if (typeof password !== "string" || password !== c.env.ADMIN_SECRET) {
      return c.html(renderLoginPage(true), 401);
    }
    const token = await signAdminToken(c.env.ADMIN_SECRET);
    return new Response(null, {
      status: 302,
      headers: { Location: "/admin", "Set-Cookie": makeAdminCookie(token) },
    });
  });

  app.get("/admin/logout", () =>
    new Response(null, {
      status: 302,
      headers: { Location: "/admin/login", "Set-Cookie": clearAdminCookie() },
    }),
  );

  app.get("/admin", async (c) => {
    if (!(await isAuthenticated(c.req.raw, c.env.ADMIN_SECRET))) {
      return c.redirect("/admin/login");
    }
    return c.html(renderUploadPage());
  });

  app.post("/admin/upload/transactions", async (c) => {
    if (!(await isAuthenticated(c.req.raw, c.env.ADMIN_SECRET))) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    const yearMonth = c.req.header("X-Year-Month");
    if (!yearMonth || !/^\d{4}-\d{2}$/.test(yearMonth)) {
      return c.json({ error: "X-Year-Month ヘッダーが不正です（形式: YYYY-MM）" }, 400);
    }
    const body = await c.req.text();
    if (!body.trim()) return c.json({ error: "ファイルが空です" }, 400);

    const key = `transactions/${yearMonth}.csv`;
    await c.env.FURIKAERI_R2.put(key, body, {
      httpMetadata: { contentType: "text/csv; charset=utf-8" },
    });
    return c.json({ ok: true, key });
  });

  app.post("/admin/upload/location", async (c) => {
    if (!(await isAuthenticated(c.req.raw, c.env.ADMIN_SECRET))) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    const yearMonth = c.req.header("X-Year-Month");
    if (!yearMonth || !/^\d{4}-\d{2}$/.test(yearMonth)) {
      return c.json({ error: "X-Year-Month ヘッダーが不正です（形式: YYYY-MM）" }, 400);
    }
    const body = await c.req.text();
    if (!body.trimStart().startsWith("{")) {
      return c.json({ error: "JSON フォーマットが不正です" }, 400);
    }

    const key = `location-history/${yearMonth}.json`;
    await c.env.FURIKAERI_R2.put(key, body, {
      httpMetadata: { contentType: "application/json" },
    });
    return c.json({ ok: true, key });
  });

  app.post("/admin/invalidate/location", async (c) => {
    if (!(await isAuthenticated(c.req.raw, c.env.ADMIN_SECRET))) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    let yearMonth: string | undefined;
    try {
      const body = await c.req.json<{ yearMonth?: string }>();
      yearMonth = body.yearMonth;
    } catch {
      return c.json({ error: "リクエストボディが不正です" }, 400);
    }
    if (!yearMonth || !/^\d{4}-\d{2}$/.test(yearMonth)) {
      return c.json({ error: "yearMonth が不正です（形式: YYYY-MM）" }, 400);
    }

    const [year, month] = yearMonth.split("-").map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const keys = Array.from({ length: daysInMonth }, (_, i) => {
      const day = String(i + 1).padStart(2, "0");
      return `location-history:v2:${yearMonth}-${day}`;
    });

    await Promise.all(keys.map((key) => c.env.FURIKAERI_KV.delete(key)));
    return c.json({ ok: true, deletedCount: keys.length });
  });
}
