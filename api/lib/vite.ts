import type { Hono } from "hono";
import type { HttpBindings } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import fs from "fs";
import path from "path";

type App = Hono<{ Bindings: HttpBindings }>;

export function serveStaticFiles(app: App) {
  const distPath = path.resolve(import.meta.dirname, "../dist/public");

  app.use(
    "*",
    serveStatic({
      root: "./dist/public",
      rewriteRequestPath: (requestPath) =>
        requestPath.replace(
          /^\/(aset|games)\/(.+)\.(png|jpe?g)$/i,
          (_match, folder, fileName) => `/${folder}-optimized/${fileName}.webp`,
        ),
      onFound: (filePath, c) => {
        if (/\.(avif|webp|png|jpe?g|svg|ico|css|js)$/i.test(filePath)) {
          c.header("Cache-Control", "public, max-age=31536000, immutable");
        } else if (/\.html$/i.test(filePath)) {
          c.header("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
          c.header("Pragma", "no-cache");
          c.header("Expires", "0");
        }
      },
    }),
  );

  app.notFound((c) => {
    const accept = c.req.header("accept") ?? "";
    if (!accept.includes("text/html")) {
      return c.json({ error: "Not Found" }, 404);
    }
    const indexPath = path.resolve(distPath, "index.html");
    const content = fs.readFileSync(indexPath, "utf-8");
    c.header("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    c.header("Pragma", "no-cache");
    c.header("Expires", "0");
    return c.html(content);
  });
}
