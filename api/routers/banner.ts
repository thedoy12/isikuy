import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { banners } from "@db/schema";
import { sanitizePublicText } from "../lib/publicText";

export const bannerRouter = createRouter({
  list: publicQuery
    .input(
      z.object({
        position: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = getDb();
      const filters = [eq(banners.isActive, true)];

      if (input?.position) {
        filters.push(eq(banners.position, input.position as "hero" | "promo" | "sidebar"));
      }

      const rows = await db
        .select()
        .from(banners)
        .where(and(...filters))
        .orderBy(banners.sortOrder);

      return rows.map((banner) => ({
        ...banner,
        title: sanitizePublicText(banner.title) ?? banner.title,
        subtitle: sanitizePublicText(banner.subtitle),
      }));
    }),
});
