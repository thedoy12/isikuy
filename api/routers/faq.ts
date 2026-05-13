import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { faqs } from "@db/schema";
import { sanitizePublicText } from "../lib/publicText";

export const faqRouter = createRouter({
  list: publicQuery
    .input(
      z.object({
        category: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = getDb();
      const filters = [eq(faqs.isActive, true)];

      if (input?.category) {
        filters.push(eq(faqs.category, input.category));
      }

      const rows = await db
        .select()
        .from(faqs)
        .where(and(...filters))
        .orderBy(faqs.sortOrder);

      return rows.map((faq) => ({
        ...faq,
        question: sanitizePublicText(faq.question) ?? faq.question,
        answer: sanitizePublicText(faq.answer) ?? faq.answer,
      }));
    }),
});
