import { z } from "zod";
import { count, desc, eq, sql } from "drizzle-orm";
import { createRouter, publicQuery, authedQuery, adminQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { env } from "../lib/env";
import { recentTools, toolResults, tools, trendingTools, userFavorites } from "@db/schema";
import { getToolDefinition, resolveToolSlug, toolDefinitions } from "@contracts/toolCatalog";

const fragments = {
  prefixes: ["Neo", "Rogue", "Zero", "Nova", "Lunar", "Astra", "Cyber", "Kage", "Ryu", "Vyn"],
  cores: ["Strike", "Vortex", "Reaper", "Pulse", "Blade", "Ghost", "Fang", "Drift", "Flare", "Nexus"],
  symbols: ["x", "z", "ix", "01", "99", "ID", "OP", "GG"],
  squad: ["Eclipse", "Phantom", "Nightfall", "Crimson", "Velocity", "Nocturne", "Titan", "Onyx"],
  captions: [
    "Menang bukan hoki, cuma mekanik lagi sinkron.",
    "Rank naik, mental lawan turun.",
    "Kalah satu game, comeback satu season.",
    "Mabar boleh santai, eksekusi tetap rapi.",
  ],
  trash: [
    "Santai, ini bukan tutorial respawn.",
    "Gameplay kamu buffering, padahal ping aman.",
    "Aim kamu lagi cuti tahunan ya?",
    "Tenang, semua pro player pernah jadi minion juga.",
  ],
};

function pick<T>(items: T[], seed = Math.random()) {
  return items[Math.floor(seed * items.length) % items.length];
}

function templateResult(input: {
  slug: string;
  mode?: string;
  prompt?: string;
  nickname?: string;
}) {
  const mode = input.mode || "Random";
  const base = input.nickname || input.prompt || "Player";
  const seed = Math.abs([...`${input.slug}:${mode}:${base}:${Date.now()}`].reduce((sum, char) => sum + char.charCodeAt(0), 0));
  const rand = (offset: number) => ((seed + offset * 97) % 1000) / 1000;

  if (input.slug === "nickname-generator") {
    const nickname = `${pick(fragments.prefixes, rand(1))}${pick(fragments.cores, rand(2))}${pick(fragments.symbols, rand(3))}`;
    return `${nickname}\n${nickname.toUpperCase()}\n${pick(fragments.prefixes, rand(4))}.${base.replace(/\s+/g, "")}`;
  }

  if (input.slug === "squad-name") {
    const name = `${pick(fragments.squad, rand(1))} ${pick(fragments.cores, rand(2))}`;
    return `${name}\nTagline: ${mode} squad, clean rotation, no panic calls.`;
  }

  if (input.slug === "trash-talk") {
    return `${pick(fragments.trash, rand(1))}\nMode: ${mode}`;
  }

  if (input.slug === "caption-generator") {
    return `${pick(fragments.captions, rand(1))}\n#gaming #mabar #isikuy #topupgame`;
  }

  return `${base} - ${mode}`;
}

async function generateWithGemini(input: {
  slug: string;
  mode?: string;
  prompt?: string;
  nickname?: string;
}) {
  const tool = getToolDefinition(input.slug);
  if (!tool?.aiEnabled || !env.geminiApiKey) return null;

  const prompt = [
    `Buat hasil untuk ${tool.title}.`,
    `Mode: ${input.mode || "Random"}.`,
    `Input user: ${input.prompt || input.nickname || "-"}.`,
    "Jawab singkat, fun, gaming, aman untuk publik, tanpa hinaan SARA, tanpa kata kasar ekstrem.",
    "Berikan 3 opsi maksimal jika cocok.",
  ].join("\n");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.geminiApiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.9, maxOutputTokens: 160 },
      }),
    },
  );

  if (!response.ok) return null;
  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  return payload.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
}

async function ensureToolsSeeded() {
  const db = getDb();
  for (const [index, tool] of toolDefinitions.entries()) {
    await db
      .insert(tools)
      .values({
        slug: tool.slug,
        title: tool.title,
        category: tool.category,
        template: tool.description,
        sortOrder: index + 1,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: tools.slug,
        set: {
          title: tool.title,
          category: tool.category,
          sortOrder: index + 1,
          updatedAt: new Date(),
        },
      });
  }
}

async function recordUse(input: {
  slug: string;
  userId?: number | null;
  result?: string;
  source?: string;
  payload?: Record<string, unknown>;
}) {
  const db = getDb();
  await db.insert(recentTools).values({
    toolSlug: input.slug,
    userId: input.userId ?? null,
  });
  await db
    .insert(trendingTools)
    .values({
      toolSlug: input.slug,
      usageCount: 1,
      lastUsedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: trendingTools.toolSlug,
      set: {
        usageCount: sql`${trendingTools.usageCount} + 1`,
        lastUsedAt: new Date(),
      },
    });
  if (input.result) {
    await db.insert(toolResults).values({
      toolSlug: input.slug,
      userId: input.userId ?? null,
      input: input.payload ?? {},
      result: input.result,
      source: input.source ?? "template",
    });
  }
}

export const toolsRouter = createRouter({
  list: publicQuery.query(async () => {
    await ensureToolsSeeded();
    const db = getDb();
    const rows = await db.select().from(tools);
    const state = new Map(rows.map((row) => [row.slug, row]));
    return toolDefinitions.map((tool) => ({
      ...tool,
      isActive: state.get(tool.slug)?.isActive ?? true,
    }));
  }),

  trending: publicQuery.query(async () => {
    const db = getDb();
    const rows = await db
      .select()
      .from(trendingTools)
      .orderBy(desc(trendingTools.usageCount), desc(trendingTools.lastUsedAt))
      .limit(8);
    const slugs = rows.map((row) => row.toolSlug);
    return toolDefinitions
      .filter((tool) => slugs.includes(tool.slug) || tool.trending)
      .slice(0, 8);
  }),

  track: publicQuery
    .input(z.object({ slug: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const slug = resolveToolSlug(input.slug);
      if (!getToolDefinition(slug)) throw new Error("Tool tidak ditemukan");
      await recordUse({ slug, userId: ctx.user?.id });
      return { success: true };
    }),

  generateText: publicQuery
    .input(
      z.object({
        slug: z.string(),
        mode: z.string().optional(),
        prompt: z.string().max(180).optional(),
        nickname: z.string().max(80).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const slug = resolveToolSlug(input.slug);
      const tool = getToolDefinition(slug);
      if (!tool) throw new Error("Tool tidak ditemukan");

      let result: string | null = null;
      let source = "template";
      try {
        result = await generateWithGemini({ ...input, slug });
        if (result) source = "gemini";
      } catch {
        result = null;
      }
      result ||= templateResult({ ...input, slug });
      await recordUse({
        slug,
        userId: ctx.user?.id,
        result,
        source,
        payload: input,
      });
      return { result, source };
    }),

  favorites: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const rows = await db
      .select()
      .from(userFavorites)
      .where(eq(userFavorites.userId, ctx.user.id))
      .orderBy(desc(userFavorites.createdAt));
    return rows;
  }),

  toggleFavorite: authedQuery
    .input(z.object({ slug: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const slug = resolveToolSlug(input.slug);
      const db = getDb();
      const existing = await db
        .select()
        .from(userFavorites)
        .where(eq(userFavorites.userId, ctx.user.id))
        .limit(50);
      const found = existing.find((row) => row.toolSlug === slug);
      if (found) {
        await db.delete(userFavorites).where(eq(userFavorites.id, found.id));
        return { favorite: false };
      }
      await db.insert(userFavorites).values({ toolSlug: slug, userId: ctx.user.id });
      return { favorite: true };
    }),

  adminStats: adminQuery.query(async () => {
    const db = getDb();
    await ensureToolsSeeded();
    const rows = await db
      .select({
        toolSlug: toolResults.toolSlug,
        total: count(),
      })
      .from(toolResults)
      .groupBy(toolResults.toolSlug)
      .orderBy(desc(count()))
      .limit(30);
    return rows;
  }),

  adminToggle: adminQuery
    .input(z.object({ slug: z.string(), isActive: z.boolean() }))
    .mutation(async ({ input }) => {
      await ensureToolsSeeded();
      await getDb()
        .update(tools)
        .set({ isActive: input.isActive, updatedAt: new Date() })
        .where(eq(tools.slug, resolveToolSlug(input.slug)));
      return { success: true };
    }),
});
