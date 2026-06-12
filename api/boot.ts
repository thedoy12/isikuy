import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";
import { handleFlowixCallback } from "./flowix/callback";
import { failExpiredUnpaidTransactions } from "./lib/transactionExpiry";
import { buildRobotsTxt, buildSitemapXml } from "./lib/seo";

const app = new Hono<{ Bindings: HttpBindings }>();

app.use(bodyLimit({ maxSize: 50 * 1024 * 1024 }));
app.get("/robots.txt", async (c) => {
  c.header("Content-Type", "text/plain; charset=utf-8");
  c.header("Cache-Control", "public, max-age=3600");
  return c.body(await buildRobotsTxt(c.req.url));
});
app.get("/sitemap.xml", async (c) => {
  c.header("Content-Type", "application/xml; charset=utf-8");
  c.header("Cache-Control", "public, max-age=3600");
  return c.body(await buildSitemapXml(c.req.url));
});
app.post("/api/callback/flowix", handleFlowixCallback);
app.use("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
  });
});
app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

export default app;

if (env.isProduction) {
  const { serve } = await import("@hono/node-server");
  const { serveStaticFiles } = await import("./lib/vite");
  serveStaticFiles(app);

  const port = parseInt(process.env.PORT || "3000");
  const hostname = process.env.HOST || "0.0.0.0";
  serve({ fetch: app.fetch, hostname, port }, () => {
    console.log(`Server running on http://${hostname}:${port}/`);
  });

  const runExpirySweep = async () => {
    try {
      const count = await failExpiredUnpaidTransactions();
      if (count > 0) {
        console.log(`[transactions] Auto-failed ${count} expired unpaid QRIS payment(s).`);
      }
    } catch (error) {
      console.error("[transactions] Failed to sweep expired QRIS payments", error);
    }
  };

  void runExpirySweep();
  setInterval(runExpirySweep, 5 * 60 * 1000);
}
