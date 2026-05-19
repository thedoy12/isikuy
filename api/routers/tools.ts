import { z } from "zod";
import { count, desc, eq, sql } from "drizzle-orm";
import { createRouter, publicQuery, authedQuery, adminQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { env } from "../lib/env";
import { recentTools, siteSettings, toolAlerts, toolResults, tools, trendingTools, userFavorites } from "@db/schema";
import { getToolDefinition, isPublicTool, resolveToolSlug, toolDefinitions } from "@contracts/toolCatalog";

type GenerateToolInput = {
  slug: string;
  mode?: string;
  prompt?: string;
  nickname?: string;
  nicknameTwo?: string;
  selectedValue?: string;
  matches?: number;
  wins?: number;
  targetWr?: number;
  diamonds?: number;
  spinCount?: number;
};

const TOOLS_MAINTENANCE_KEY = "toolsMaintenanceEnabled";
const TOOLS_MAINTENANCE_MESSAGE_KEY = "toolsMaintenanceMessage";
const DEFAULT_TOOLS_MAINTENANCE_MESSAGE = "Tools sedang maintenance. Coba lagi nanti.";
const geminiModelCooldowns = new Map<string, number>();

const numericInput = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) return undefined;
  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
}, z.number().optional()).optional();

function clampNumber(value: number | undefined, fallback: number, min: number, max: number) {
  const next = Number.isFinite(value) ? Number(value) : fallback;
  return Math.min(max, Math.max(min, next));
}

function normalizeGenerateInput(input: GenerateToolInput): GenerateToolInput {
  const normalized: GenerateToolInput = {
    slug: input.slug,
    mode: input.mode,
    prompt: input.prompt?.slice(0, 180),
    nickname: input.nickname?.slice(0, 80),
  };

  if (input.slug === "compatibility") {
    normalized.nicknameTwo = input.nicknameTwo?.slice(0, 80);
  }
  if (getToolDefinition(input.slug)?.kind === "wheel") {
    normalized.selectedValue = input.selectedValue?.slice(0, 120);
  }
  if (input.slug === "winrate-calculator") {
    normalized.matches = clampNumber(input.matches, 1000, 0, 1_000_000);
    normalized.wins = clampNumber(input.wins, 50, 0, 100);
    normalized.targetWr = clampNumber(input.targetWr, 60, 0, 100);
  }
  if (input.slug === "diamond-calculator") {
    normalized.diamonds = clampNumber(input.diamonds, 86, 0, 10_000_000);
  }
  if (input.slug === "magic-wheel") {
    normalized.spinCount = clampNumber(input.spinCount, 10, 0, 100_000);
  }

  return normalized;
}

async function getSetting(key: string) {
  const [row] = await getDb()
    .select({ value: siteSettings.value })
    .from(siteSettings)
    .where(eq(siteSettings.key, key))
    .limit(1);
  return row?.value ?? null;
}

async function setSetting(key: string, value: string, type: "string" | "boolean" = "string") {
  await getDb()
    .insert(siteSettings)
    .values({ key, value, type })
    .onConflictDoUpdate({
      target: siteSettings.key,
      set: { value, type, updatedAt: new Date() },
    });
}

async function getToolsMaintenance() {
  const enabled = (await getSetting(TOOLS_MAINTENANCE_KEY)) === "true";
  const message = (await getSetting(TOOLS_MAINTENANCE_MESSAGE_KEY)) || DEFAULT_TOOLS_MAINTENANCE_MESSAGE;
  return { enabled, message };
}

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

const heroPool = ["Layla", "Gusion", "Fanny", "Chou", "Lancelot", "Miya", "Tigreal", "Angela"];
const agentPool = ["Jett", "Reyna", "Sova", "Killjoy", "Raze", "Omen", "Sage", "Phoenix"];
const lanePool = ["EXP Lane", "Gold Lane", "Mid Lane", "Jungle", "Roam"];
const difficultyPool = ["Easy", "Normal", "Hard", "Nightmare"];
function pick<T>(items: T[], seed = Math.random()) {
  return items[Math.floor(seed * items.length) % items.length];
}

function hashPercent(value: string, salt: string) {
  const raw = `${value || "player"}:${salt}`;
  const total = [...raw].reduce((sum, char) => sum + char.charCodeAt(0) * 17, 0);
  return (total % 91) + 9;
}

function winrateNeeded(input: GenerateToolInput) {
  const matches = Math.max(0, Math.round(input.matches ?? 1000));
  const currentWr = Math.max(0, Math.min(100, input.wins ?? 50));
  const targetWr = Math.max(0, Math.min(100, input.targetWr ?? 60));
  if (targetWr <= currentWr) return 0;
  if (targetWr >= 100) return Number.POSITIVE_INFINITY;
  const currentWins = Math.round(matches * (currentWr / 100));
  let needed = 0;
  while (matches + needed > 0 && ((currentWins + needed) / (matches + needed)) * 100 < targetWr && needed < 10000) needed += 1;
  return needed;
}

function formatWinrateResult(input: GenerateToolInput) {
  const needed = winrateNeeded(input);
  const targetWr = input.targetWr ?? 60;
  const matches = input.matches ?? 1000;
  const currentWr = input.wins ?? 50;

  if (!Number.isFinite(needed)) {
    return `Target ${targetWr}% WR tidak bisa dicapai dengan winrate saat ini.\nTotal match: ${matches.toLocaleString("id-ID")}\nCurrent WR: ${currentWr}%`;
  }

  if (needed === 0) {
    return `Target ${targetWr}% WR sudah tercapai.\nTotal match: ${matches.toLocaleString("id-ID")}\nCurrent WR: ${currentWr}%`;
  }

  return `Butuh ${needed.toLocaleString("id-ID")} win beruntun untuk target ${targetWr}% WR.\nTotal match: ${matches.toLocaleString("id-ID")}\nCurrent WR: ${currentWr}%`;
}

function templateResult(input: GenerateToolInput) {
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

  if (input.slug === "challenge-wheel" || input.slug === "punishment-wheel") {
    return `${input.selectedValue || mode}\nRules: Jalankan hasil spin ini untuk ronde berikutnya.\nTip: Bikin clip singkat biar challenge makin seru.`;
  }

  if (input.slug === "hero-picker") {
    const isValorant = mode === "Valorant";
    const picked = isValorant ? pick(agentPool, rand(1)) : pick(heroPool, rand(1));
    return `${picked}\nRole: ${pick(["Tank", "Mage", "Marksman", "Duelist", "Sentinel"], rand(2))}\nLane: ${pick(lanePool, rand(3))}\nDifficulty: ${pick(difficultyPool, rand(4))}`;
  }

  if (input.slug === "compatibility") {
    const target = `${base}:${input.nicknameTwo || "Duo"}:${Date.now()}`;
    return `Chemistry ${hashPercent(target, "chem")}%\nFriendship ${hashPercent(target, "friend")}%\nVerdict: ${hashPercent(target, "duo") > 55 ? "Cocok buat duo rank" : "Cocoknya warm up dulu"}`;
  }

  if (input.slug === "toxic-meter") {
    const target = `${base}:${Date.now()}`;
    return `Toxic Score ${hashPercent(target, "toxic")}%\nSavage Level ${hashPercent(target, "savage")}%\nNoob Percentage ${hashPercent(target, "noob")}%`;
  }

  if (input.slug === "aura-calculator") {
    const target = `${base}:${Date.now()}`;
    return `Aura ${hashPercent(target, "aura")}%\nHoki ${hashPercent(target, "hoki")}%\nToxic ${hashPercent(target, "toxic")}%\nMVP ${hashPercent(target, "mvp")}%`;
  }

  if (input.slug === "winrate-calculator") {
    return formatWinrateResult(input);
  }

  if (input.slug === "diamond-calculator") {
    const diamonds = Math.max(0, Math.round(input.diamonds ?? 86));
    return `${diamonds.toLocaleString("id-ID")} diamond kira-kira Rp${Math.round(diamonds * 265).toLocaleString("id-ID")}.\nCek harga real di katalog topup sebelum checkout.\nEstimasi ini hanya simulasi budget.`;
  }

  if (input.slug === "magic-wheel") {
    const spinCount = Math.max(0, Math.round(input.spinCount ?? 10));
    return `${spinCount} spin butuh estimasi ${spinCount * 60} diamond.\nLuck hari ini: ${hashPercent(String(spinCount), "luck")}%\nGunakan hasil ini sebagai simulasi, bukan jaminan drop.`;
  }

  return `${base} - ${mode}`;
}

function shouldUseAi(tool: NonNullable<ReturnType<typeof getToolDefinition>>) {
  return tool.category === "AI Text" || tool.category === "Fun Viral";
}

function cleanGeneratedResult(value: string, fallback: string) {
  const cleaned = value
    .split("\n")
    .map((line) =>
      line
        .replace(/\*\*/g, "")
        .replace(/`/g, "")
        .replace(/^#+\s*/g, "")
        .replace(/^\s*\d+[.)]\s*/g, "")
        .replace(/^\s*[-*•]\s*/g, "")
        .replace(/^\s*\u2022\s*/g, "")
        .replace(/\s{2,}/g, " ")
        .trim(),
    )
    .filter(Boolean)
    .slice(0, 6)
    .join("\n");
  return cleaned || fallback;
}

async function recordToolAlert(input: {
  toolSlug?: string | null;
  model?: string | null;
  statusCode?: number | null;
  message: string;
}) {
  await getDb().insert(toolAlerts).values({
    toolSlug: input.toolSlug || null,
    model: input.model || null,
    statusCode: input.statusCode ?? null,
    message: input.message.slice(0, 2000),
  });
}

async function callGemini(input: GenerateToolInput, baselineResult: string) {
  const tool = getToolDefinition(input.slug);
  if (!tool) throw new Error("Tool tidak ditemukan");
  if (!env.geminiApiKey) {
    await recordToolAlert({
      toolSlug: input.slug,
      message: "GEMINI_API_KEY belum dikonfigurasi",
    });
    throw new Error("GEMINI_API_KEY belum dikonfigurasi");
  }
  const models = Array.from(new Set([
    env.geminiModel,
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-2.5-flash",
  ].filter(Boolean)));

  const prompt = [
    `Kamu adalah generator mini tools gaming untuk ISIKUY.`,
    `Tool: ${tool.title}.`,
    `Deskripsi tool: ${tool.description}.`,
    `Jenis tool: ${tool.kind}.`,
    `Mode: ${input.mode || "Random"}.`,
    `Input user: ${input.prompt || input.nickname || "-"}.`,
    input.nicknameTwo ? `Input kedua: ${input.nicknameTwo}.` : "",
    input.selectedValue ? `Hasil spin/pilihan final: ${input.selectedValue}.` : "",
    input.matches !== undefined ? `Total match: ${input.matches}.` : "",
    input.wins !== undefined ? `Winrate/current WR: ${input.wins}.` : "",
    input.targetWr !== undefined ? `Target WR: ${input.targetWr}.` : "",
    input.diamonds !== undefined ? `Jumlah diamond: ${input.diamonds}.` : "",
    input.spinCount !== undefined ? `Jumlah spin: ${input.spinCount}.` : "",
    `Baseline akurat yang wajib dipertahankan:\n${baselineResult}`,
    "Jawab dalam Bahasa Indonesia yang natural, fun, gaming, dan siap dipakai untuk konten.",
    "Format output: plain text, maksimal 4 baris, satu hasil per baris.",
    "Jangan pakai markdown, bullet, numbering, tanda **, heading, pembuka panjang, atau emoji dekoratif.",
    "Untuk mode Custom, ikuti persis arahan custom dari input user.",
    "Pertahankan angka, persen, rank, nama hero, hasil spin, dan estimasi dari baseline.",
    "Untuk calculator, jangan ubah angka hasil hitung. Boleh tambahkan catatan singkat.",
    "Untuk wheel, baris pertama harus hasil spin final, lalu boleh tambahkan aturan singkat.",
    "Jangan pakai penjelasan proses, hinaan SARA, seksual eksplisit, atau kata kasar ekstrem.",
    "Kalau tool meminta nickname/squad/caption, hasil harus langsung berupa pilihan yang bisa disalin.",
  ].filter(Boolean).join("\n");

  for (const model of models) {
    const cooldownUntil = geminiModelCooldowns.get(model) ?? 0;
    if (cooldownUntil > Date.now()) continue;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.9, maxOutputTokens: 160 },
        }),
      },
    );

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      const message = detail.slice(0, 600).replace(/\s+/g, " ");
      if (response.status === 429) {
        const retryMatch = detail.match(/retry in ([\d.]+)s/i);
        const retrySeconds = retryMatch ? Number(retryMatch[1]) : 60;
        geminiModelCooldowns.set(model, Date.now() + Math.max(30, retrySeconds) * 1000);
      }
      console.warn(`[tools] Gemini ${model} failed: ${response.status}`);
      await recordToolAlert({
        toolSlug: input.slug,
        model,
        statusCode: response.status,
        message,
      });
      continue;
    }

    const payload = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = payload.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (text) return cleanGeneratedResult(text, baselineResult);
  }

  throw new Error("Gemini sedang bermasalah. Semua model gagal merespons.");
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

  status: publicQuery.query(async () => getToolsMaintenance()),

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
        prompt: z.string().optional(),
        nickname: z.string().optional(),
        nicknameTwo: z.string().optional(),
        selectedValue: z.string().optional(),
        matches: numericInput,
        wins: numericInput,
        targetWr: numericInput,
        diamonds: numericInput,
        spinCount: numericInput,
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const slug = resolveToolSlug(input.slug);
      const tool = getToolDefinition(slug);
      if (!tool) throw new Error("Tool tidak ditemukan");
      if (!ctx.user && !isPublicTool(slug)) {
        throw new Error("Login dulu untuk memakai tool ini.");
      }
      const normalizedInput = normalizeGenerateInput({ ...input, slug });
      const maintenance = await getToolsMaintenance();
      if (maintenance.enabled) throw new Error(maintenance.message);

      const baselineResult = templateResult(normalizedInput);
      let result = baselineResult;
      let source = "template";

      if (shouldUseAi(tool)) {
        try {
          result = await callGemini(normalizedInput, baselineResult);
          source = "gemini";
        } catch (error) {
          await recordToolAlert({
            toolSlug: slug,
            message: error instanceof Error ? error.message : "Gemini sedang bermasalah",
          });
        }
      }

      await recordUse({
        slug,
        userId: ctx.user?.id,
        result,
        source,
        payload: normalizedInput,
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

  adminMonitor: adminQuery
    .input(
      z.object({
        alertLimit: z.number().default(10),
        alertOffset: z.number().default(0),
      }).optional(),
    )
    .query(async ({ input }) => {
    const db = getDb();
    const alertLimit = input?.alertLimit || 10;
    const alertOffset = input?.alertOffset || 0;
    const [totalGenerates] = await db.select({ count: count() }).from(toolResults);
    const [geminiGenerates] = await db
      .select({ count: count() })
      .from(toolResults)
      .where(eq(toolResults.source, "gemini"));
    const [openAlerts] = await db
      .select({ count: count() })
      .from(toolAlerts)
      .where(eq(toolAlerts.isResolved, false));
    const [totalAlerts] = await db.select({ count: count() }).from(toolAlerts);
    const latestAlerts = await db
      .select()
      .from(toolAlerts)
      .orderBy(desc(toolAlerts.createdAt))
      .limit(alertLimit)
      .offset(alertOffset);
    const latestResults = await db
      .select({
        id: toolResults.id,
        toolSlug: toolResults.toolSlug,
        source: toolResults.source,
        createdAt: toolResults.createdAt,
      })
      .from(toolResults)
      .orderBy(desc(toolResults.createdAt))
      .limit(20);

    return {
      maintenance: await getToolsMaintenance(),
      totalGenerates: totalGenerates.count,
      geminiGenerates: geminiGenerates.count,
      openAlerts: openAlerts.count,
      totalAlerts: totalAlerts.count,
      latestAlerts,
      latestResults,
    };
  }),

  adminSetMaintenance: adminQuery
    .input(z.object({ enabled: z.boolean(), message: z.string().max(240).optional() }))
    .mutation(async ({ input }) => {
      await setSetting(TOOLS_MAINTENANCE_KEY, String(input.enabled), "boolean");
      await setSetting(
        TOOLS_MAINTENANCE_MESSAGE_KEY,
        input.message?.trim() || DEFAULT_TOOLS_MAINTENANCE_MESSAGE,
      );
      return { success: true };
    }),

  adminResolveAlert: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await getDb()
        .update(toolAlerts)
        .set({ isResolved: true, resolvedAt: new Date() })
        .where(eq(toolAlerts.id, input.id));
      return { success: true };
    }),

  adminTestGemini: adminQuery.mutation(async () => {
    const result = await callGemini(
      {
        slug: "nickname-generator",
        mode: "Custom: test koneksi admin",
        prompt: "test koneksi",
        nickname: "test koneksi",
      },
      "TestKoneksi\nTESTKONEKSI",
    );
    return { success: true, result };
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
