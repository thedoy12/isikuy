import { z } from "zod";
import { eq, and, like, asc, not, notInArray, inArray, sql } from "drizzle-orm";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { games, categories, products } from "@db/schema";
import { env } from "../lib/env";
import { publicProviderLabel, sanitizePublicText } from "../lib/publicText";
import { gameAssetPath } from "../lib/gameAssets";
import {
  isFlowixConfigured,
  listFlowixCatalog,
  type FlowixProduct,
} from "../flowix/client";

type GameRow = typeof games.$inferSelect;
type ProductRow = typeof products.$inferSelect;
type ProductDedupeInput = Pick<ProductRow, "nominalAmount" | "name" | "description">;
type SyncedGame = GameRow & { categoryName: string };

const FLOWIX_PUBLISHER = "Flowix";
const FLOWIX_ONLY_GAME_FILTER = eq(games.publisher, FLOWIX_PUBLISHER);

const categoryGroupSlugs: Record<string, string[]> = {
  game: ["game", "games", "game-online", "top-up-game", "topup-game", "voucher-game"],
  pulsa: ["pulsa", "pulsa-reguler", "pulsa-transfer"],
  ewallet: ["ewallet", "e-wallet", "e-walet", "e-money", "emoney", "dompet-digital"],
  digital: [
    "data",
    "paket-data",
    "data-internet",
    "internet",
    "voucher",
    "premium",
    "pln",
    "token-pln",
    "listrik",
    "tagihan",
    "produk",
  ],
};

const favoriteGameOrder = [
  "mobile-legends",
  "mobile-legends-gift",
  "pubg-mobile",
  "point-blank",
  "valorant",
  "free-fire",
  "genshin-impact",
  "roblox",
  "call-of-duty-mobile",
  "honor-of-kings",
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function matchKey(value: string) {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .map((part) => (part.length > 3 && part.endsWith("s") ? part.slice(0, -1) : part))
    .join("");
}

function cleanFlowixName(value: string) {
  return value
    .replace(/\([^)]*\b(global|indonesia|indo|id)\b[^)]*\)/gi, " ")
    .replace(/\s*-\s*produk\s+digital\s*/gi, " ")
    .replace(/\s*produk\s+digital\s*/gi, " ")
    .replace(/\s+(global|indonesia|indo|id)\s*$/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function productCategorySlug(product: FlowixProduct) {
  const slug = slugify(product.sourceCategory || product.category || "produk");
  if (knownGameName(product)) return "game";
  const text = `${product.brand || ""} ${product.name || ""} ${product.code || ""}`;
  if (/\b(dana|gopay|go\s*pay|ovo|shopee\s*pay|grab)\b/i.test(text)) return "ewallet";
  if (/\b(pln|token\s*pln|listrik)\b/i.test(text)) return "pln";
  if (/\b(amazon\s*prime|bstation|alight\s*motion|razer\s*gold|steam\s*wallet|voucher|premium)\b/i.test(text)) {
    return "premium";
  }

  const aliases: Record<string, string> = {
    games: "game",
    "game-online": "game",
    "top-up-game": "game",
    "topup-game": "game",
    "voucher-game": "game",
    "e-wallet": "ewallet",
    "e-walet": "ewallet",
    "e-money": "ewallet",
    emoney: "ewallet",
    "dompet-digital": "ewallet",
    "akun-premium": "premium",
    "paket-data": "data",
    "data-internet": "data",
    "internet": "data",
    "token-pln": "pln",
    listrik: "pln",
  };
  return aliases[slug] ?? slug;
}

function mobileLegendsVariant(product: FlowixProduct) {
  const text = `${product.brand || ""} ${product.name || ""} ${product.code || ""}`.toLowerCase();
  if (!/\b(mobile\s*legends?|mlbb|moonton)\b/i.test(text)) return null;
  if (/\bgift\b/i.test(text)) return "gift";
  if (/\bglobal\b/i.test(text)) return "global";
  if (/\bmobile\s*legends\s*a\b|\bmlbb\s*a\b|\bml\s*a\b/i.test(text)) return "a";
  if (/\bmobile\s*legends\s*b\b|\bmlbb\s*b\b|\bml\s*b\b/i.test(text)) return "b";
  if (
    /\(([^)]*(brazil|malaysia|philippines|russia|singapore|thailand|vietnam|turkey|korea|japan)[^)]*)\)/i.test(text) ||
    /\b(brazil|malaysia|philippines|russia|singapore|thailand|vietnam|turkey|korea|japan)\b/i.test(text)
  ) {
    return "regional";
  }
  return "main";
}

function knownGameName(product: FlowixProduct) {
  const text = `${product.brand || ""} ${product.name || ""} ${product.code || ""}`.toLowerCase();
  const mlVariant = mobileLegendsVariant(product);
  if (mlVariant === "gift") return "Mobile Legends Gift";
  if (mlVariant) return "Mobile Legends";

  const knownGames: Array<[RegExp, string]> = [
    [/\b(point\s*blank|pb\s*cash|zepetto)\b/i, "Point Blank"],
    [/\b(valorant|valorant\s*points?|\bvp\b)\b/i, "Valorant"],
    [/\b(free\s*fire|\bff\b|garena)\b/i, "Free Fire"],
    [/\b(pubg\s*mobile|pubgm)\b/i, "PUBG Mobile"],
    [/\b(genshin\s*impact|hoyoverse|genesis\s*crystals?)\b/i, "Genshin Impact"],
    [/\b(call\s*of\s*duty\s*mobile|codm|cp\s*cod)\b/i, "Call of Duty Mobile"],
    [/\b(honor\s*of\s*kings|hok)\b/i, "Honor of Kings"],
    [/\b(roblox|robux)\b/i, "Roblox"],
    [/\b(arena\s*of\s*valor|\baov\b)\b/i, "Arena of Valor"],
    [/\b(wild\s*rift)\b/i, "League of Legends Wild Rift"],
  ];

  return knownGames.find(([pattern]) => pattern.test(text))?.[1] ?? null;
}

function productGroupBaseName(product: FlowixProduct) {
  const categorySlug = productCategorySlug(product);
  const knownName = knownGameName(product);
  if (knownName) return knownName;
  const rawName = cleanFlowixName(product.brand || product.name || "Produk");
  if (categorySlug !== "game") return rawName;
  return rawName
    .replace(/^\s*(top[\s-]*up|voucher)\s+/gi, " ")
    .replace(/\s+\b(diamonds?|points?|uc|vp|cash|coins?|gems?|credits?|tokens?|cp)\b$/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isRegionalGameProduct(product: FlowixProduct) {
  if (productCategorySlug(product) !== "game") return false;
  if (mobileLegendsVariant(product) === "regional") return true;
  if (knownGameName(product) === "Mobile Legends" || knownGameName(product) === "Mobile Legends Gift") return false;
  const text = `${product.brand || ""} ${product.name || ""}`.toLowerCase();
  const parenthesized = text.match(/\(([^)]+)\)/);
  if (parenthesized && !parenthesized[1].includes("global")) return true;
  return [
    "malaysia",
    "philippines",
    "russia",
    "singapore",
    "thailand",
    "vietnam",
    "brazil",
    "turkey",
    "korea",
    "japan",
  ].some((region) => text.includes(region));
}

function isAllowedFlowixProduct(product: FlowixProduct) {
  if (productCategorySlug(product) !== "game") return true;
  const knownName = knownGameName(product);
  if (mobileLegendsVariant(product) === "b") return false;
  if (isRegionalGameProduct(product)) return false;
  if (
    knownName === "Mobile Legends" &&
    !/\b(diamonds?|dm|weekly\s+diamond\s+pass|wdp|twilight\s+pass)\b/i.test(
      `${product.brand} ${product.name} ${product.code}`,
    )
  ) {
    return false;
  }
  if (knownName === "Mobile Legends Gift") {
    return true;
  }
  if (/\b(gift|test|promo|voucher\s+gift)\b/i.test(`${product.brand} ${product.name}`)) {
    return false;
  }
  return true;
}

function productCategoryName(slug: string) {
  const labels: Record<string, string> = {
    game: "Game",
    pulsa: "Pulsa",
    data: "Paket Data",
    ewallet: "E-Wallet",
    emoney: "E-Wallet",
    voucher: "Voucher",
    premium: "Akun Premium",
    pln: "PLN",
    tagihan: "Tagihan",
    produk: "Lainnya",
  };
  return labels[slug] ?? titleCase(slug.replace(/-/g, " "));
}

function productGroupSlug(product: FlowixProduct) {
  const categorySlug = productCategorySlug(product);
  const brandSlug = slugify(titleCase(productGroupBaseName(product)));
  return categorySlug === "game" ? brandSlug : `${categorySlug}-${brandSlug}`;
}

function productPlatform(categorySlug: string) {
  return categorySlug === "game" ? ("mobile" as const) : ("voucher" as const);
}

function productGroupName(product: FlowixProduct) {
  return titleCase(productGroupBaseName(product));
}

function targetInputMetadata(slug: string, categorySlug: string) {
  const base = {
    hasServerId: false,
    serverIdLabel: null as string | null,
    serverIdPlaceholder: null as string | null,
  };

  if (slug === "mobile-legends" || slug === "mobile-legends-gift") {
    return {
      hasServerId: true,
      serverIdLabel: "Zone ID",
      serverIdPlaceholder: "Contoh: 1234",
    };
  }

  if (["genshin-impact", "arena-of-valor", "honor-of-kings"].includes(slug)) {
    return {
      hasServerId: true,
      serverIdLabel: "Server",
      serverIdPlaceholder: "Contoh: Asia / 1",
    };
  }

  if (["ragnarok-m", "lifeafter", "sausage-man"].includes(slug)) {
    return {
      hasServerId: true,
      serverIdLabel: "Server ID",
      serverIdPlaceholder: "Contoh: 1",
    };
  }

  if (categorySlug === "pln") {
    return {
      hasServerId: false,
      serverIdLabel: null,
      serverIdPlaceholder: null,
    };
  }

  return base;
}

function cleanMobileLegendsDisplayName(value: string) {
  return value
    .replace(/\[\s*(mobile\s*legends?|mlbb|moonton)(?:\s+(?:a|b|global|indonesia|indo|id))?\s*\]\s*/gi, " ")
    .replace(/\(\s*(mobile\s*legends?|mlbb|moonton)(?:\s+(?:a|b|global|indonesia|indo|id))?\s*\)\s*/gi, " ")
    .replace(/\b(mobile\s*legends?|mlbb|moonton)\s+(?:a|b|global|indonesia|indo|id)\b/gi, " ")
    .replace(/\b(mobile\s*legends?|mlbb|moonton)\b/gi, " ")
    .replace(/\s+\b(a|b|global|indonesia|indo|id)\b(?=\s*(?:[-:]|$))/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanProductDisplayName(name: string, brand?: string | null, code?: string | null) {
  let value = cleanFlowixName(name)
    .replace(/\b(top[\s-]*up|voucher|produk\s+digital)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  const cleanBrand = brand ? cleanFlowixName(brand) : "";
  const sourceText = `${cleanBrand} ${name} ${code || ""}`;
  const isMobileLegendsVariant = /\b(mobile\s*legends?|mlbb|moonton)\b/i.test(sourceText);
  if (cleanBrand) {
    const escapedBrand = cleanBrand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    value = value
      .replace(new RegExp(`^${escapedBrand}\\s*[-:]?\\s*`, "i"), "")
      .replace(new RegExp(`\\s*[-:]?\\s*${escapedBrand}$`, "i"), "")
      .replace(/\s+/g, " ")
      .trim();
  }

  if (isMobileLegendsVariant) {
    value = cleanMobileLegendsDisplayName(value);
  }

  return value || cleanFlowixName(name);
}

function productBrandFromDescription(description: string | null) {
  if (!description) return null;
  return description.split(" - ")[0] || null;
}

function withMarkup(price: number) {
  return Math.ceil((price * (1 + env.productMarkupPercent / 100)) / 100) * 100;
}

function gameDedupeKey(game: Pick<GameRow, "slug" | "name" | "categoryId">) {
  return `${game.categoryId}:${matchKey(game.slug) || matchKey(game.name)}`;
}

function favoriteRank(slug: string) {
  const index = favoriteGameOrder.indexOf(slug);
  return index === -1 ? null : index + 1;
}

function productDedupeKey(product: ProductDedupeInput) {
  const displayName = cleanProductDisplayName(
    product.name,
    productBrandFromDescription(product.description),
  );
  const brand = productBrandFromDescription(product.description) || "";
  if (/\b(mobile\s*legends?|mlbb|moonton)\b/i.test(`${brand} ${product.name}`)) {
    return matchKey(`${displayName}:${product.nominalAmount || ""}`);
  }
  return matchKey(displayName) || matchKey(product.nominalAmount || product.name);
}

function uniqueProductsByName<T extends ProductDedupeInput>(items: T[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = productDedupeKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function uniqueGamesByName<T extends Pick<GameRow, "slug" | "name" | "categoryId">>(items: T[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = gameDedupeKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function syncFlowixCatalog() {
  if (!isFlowixConfigured()) return { games: [], productCodes: [] };

  const db = getDb();
  const flowixProducts = (await listFlowixCatalog())
    .filter((product) => product.status.toLowerCase() === "aktif")
    .filter(isAllowedFlowixProduct);

  if (flowixProducts.length === 0) {
    console.warn("[catalog] Sync skipped because provider returned an empty catalog.");
    return { games: [], productCodes: [] };
  }

  const categorySlugs = Array.from(new Set(flowixProducts.map(productCategorySlug)));
  const categoryBySlug = new Map<string, typeof categories.$inferSelect>();
  for (const [index, slug] of categorySlugs.entries()) {
    const [existing] = await db
      .select()
      .from(categories)
      .where(eq(categories.slug, slug))
      .limit(1);

    const [category] = existing
      ? await db
          .update(categories)
          .set({
            name: productCategoryName(slug),
            isActive: true,
            sortOrder: index + 1,
          })
          .where(eq(categories.id, existing.id))
          .returning()
      : await db
          .insert(categories)
          .values({
            name: productCategoryName(slug),
            slug,
            icon: slug === "game" ? "gamepad-2" : "box",
            sortOrder: index + 1,
            isActive: true,
          })
          .returning();

    categoryBySlug.set(slug, category);
  }

  const groups = Array.from(
    new Map(
      flowixProducts.map((product) => {
        const categorySlug = productCategorySlug(product);
        const slug = productGroupSlug(product);
        return [slug, { slug, name: productGroupName(product), categorySlug }] as const;
      }),
    ).values(),
  ).sort((a, b) => {
    const rankA = favoriteRank(a.slug) ?? Number.MAX_SAFE_INTEGER;
    const rankB = favoriteRank(b.slug) ?? Number.MAX_SAFE_INTEGER;
    if (rankA !== rankB) return rankA - rankB;
    return a.name.localeCompare(b.name);
  });

  if (groups.length === 0) {
    console.warn("[catalog] Sync skipped because no catalog groups could be built.");
    return { games: [], productCodes: [] };
  }
  const existingGames = await db.select().from(games);
  const syncedGames: SyncedGame[] = [];

  for (const group of groups) {
    const category = categoryBySlug.get(group.categorySlug);
    if (!category) continue;

    const slugKey = matchKey(group.slug);
    const nameKey = matchKey(group.name);
    const existing =
      existingGames.find((game) => matchKey(game.slug) === slugKey) ??
      existingGames.find((game) => matchKey(game.name) === nameKey);
    const assetPath = gameAssetPath(group.slug, group.name);

    const defaultSortOrder =
      favoriteRank(group.slug) ?? syncedGames.length + favoriteGameOrder.length + 1;
    const inputMetadata = targetInputMetadata(group.slug, group.categorySlug);
    const gameData = {
      categoryId: category.id,
      name: existing?.name ?? group.name,
      slug: group.slug,
      description:
        existing?.description ?? `${productCategoryName(group.categorySlug)} ${group.name} tersedia instan.`,
      coverImage: existing?.coverImage ?? assetPath ?? null,
      cardImage: existing?.cardImage ?? assetPath ?? null,
      bannerImage: existing?.bannerImage ?? assetPath ?? null,
      publisher: FLOWIX_PUBLISHER,
      platform: productPlatform(group.categorySlug),
      isActive: existing ? !existing.isManuallyHidden : true,
      isTrending:
        existing?.isTrending ?? (syncedGames.length < 8 || favoriteRank(group.slug) !== null),
      isPopular:
        existing?.isPopular ?? (syncedGames.length < 12 || favoriteRank(group.slug) !== null),
      hasServerId: existing?.hasServerId ?? inputMetadata.hasServerId,
      serverIdLabel: existing?.serverIdLabel ?? inputMetadata.serverIdLabel,
      serverIdPlaceholder: existing?.serverIdPlaceholder ?? inputMetadata.serverIdPlaceholder,
      sortOrder: existing?.sortOrder ?? defaultSortOrder,
    };

    const syncedRows: GameRow[] = existing
      ? await db.update(games).set(gameData).where(eq(games.id, existing.id)).returning()
      : await db
          .insert(games)
          .values({
            ...gameData,
            isNew: false,
          })
          .returning();

    const syncedGame = syncedRows[0];
    existingGames.push(syncedGame);
    syncedGames.push({ ...syncedGame, categoryName: category.name });
  }

  const gamesBySlug = new Map(syncedGames.map((game) => [game.slug, game]));
  const activeCodes = new Set(flowixProducts.map((product) => product.code));
  const activeCodesByGame = new Map<number, Set<string>>();

  for (const [index, product] of flowixProducts.entries()) {
    const game = gamesBySlug.get(productGroupSlug(product));
    if (!game) continue;

    const gameCodes = activeCodesByGame.get(game.id) ?? new Set<string>();
    gameCodes.add(product.code);
    activeCodesByGame.set(game.id, gameCodes);

    const existingProducts = await db
      .select()
      .from(products)
      .where(and(eq(products.gameId, game.id), eq(products.nominalAmount, product.code)))
      .orderBy(asc(products.id));
    const [existing] = existingProducts;

    const providerName = cleanProductDisplayName(product.name, product.brand, product.code);
    const providerSalePrice = String(withMarkup(product.price));
    const productData = {
      gameId: game.id,
      name: existing?.name ?? providerName,
      description: `${cleanFlowixName(product.brand)} - ${product.code}`,
      nominalAmount: product.code,
      basePrice: String(product.price),
      salePrice: existing?.salePrice ?? providerSalePrice,
      discountPercent: existing?.discountPercent ?? 0,
      isPromo: existing?.isPromo ?? false,
      stock: existing?.stock ?? 999,
      isActive: existing ? !existing.isManuallyHidden : true,
      sortOrder: existing?.sortOrder ?? index + 1,
    };

    if (existing) {
      await db.update(products).set(productData).where(eq(products.id, existing.id));
      const duplicateIds = existingProducts.slice(1).filter((item) => !item.isManuallyHidden).map((item) => item.id);
      for (const duplicateId of duplicateIds) {
        await db.update(products).set({ isActive: false }).where(eq(products.id, duplicateId));
      }
    } else {
      await db.insert(products).values(productData);
    }
  }

  for (const [gameId, codes] of activeCodesByGame.entries()) {
    if (codes.size === 0) continue;
    await db
      .update(products)
      .set({ isActive: false })
      .where(and(eq(products.gameId, gameId), notInArray(products.nominalAmount, Array.from(codes))));
  }

  const syncedGameIds = syncedGames.map((game) => game.id);
  const allFlowixGames = await db
    .select({ id: games.id })
    .from(games)
    .where(FLOWIX_ONLY_GAME_FILTER);
  for (const stale of allFlowixGames.filter((game) => !syncedGameIds.includes(game.id))) {
    await db.update(games).set({ isActive: false }).where(eq(games.id, stale.id));
    await db.update(products).set({ isActive: false }).where(eq(products.gameId, stale.id));
  }

  const activeFlowixGames = await db
    .select()
    .from(games)
    .where(and(eq(games.isActive, true), FLOWIX_ONLY_GAME_FILTER))
    .orderBy(asc(games.sortOrder), asc(games.id));
  const keptGameKeys = new Set<string>();
  for (const game of activeFlowixGames) {
    const key = gameDedupeKey(game);
    if (!keptGameKeys.has(key)) {
      keptGameKeys.add(key);
      continue;
    }
    if (game.isManuallyHidden) continue;
    await db.update(games).set({ isActive: false }).where(eq(games.id, game.id));
    await db.update(products).set({ isActive: false }).where(eq(products.gameId, game.id));
  }

  const activeFlowixProducts = await db
    .select({
      id: products.id,
      gameId: products.gameId,
      nominalAmount: products.nominalAmount,
      name: products.name,
      description: products.description,
    })
    .from(products)
    .innerJoin(games, eq(products.gameId, games.id))
    .where(and(eq(products.isActive, true), eq(games.isActive, true), FLOWIX_ONLY_GAME_FILTER))
    .orderBy(asc(products.gameId), asc(products.sortOrder), asc(products.id));
  const keptProductKeys = new Set<string>();
  for (const product of activeFlowixProducts) {
    const key = `${product.gameId}:${productDedupeKey(product)}`;
    if (!keptProductKeys.has(key)) {
      keptProductKeys.add(key);
      continue;
    }
    await db.update(products).set({ isActive: false }).where(eq(products.id, product.id));
  }

  const nonFlowixGames = await db
    .select({ id: games.id })
    .from(games)
    .where(and(eq(games.isActive, true), not(FLOWIX_ONLY_GAME_FILTER)));
  for (const localGame of nonFlowixGames) {
    await db.update(games).set({ isActive: false }).where(eq(games.id, localGame.id));
    await db.update(products).set({ isActive: false }).where(eq(products.gameId, localGame.id));
  }

  return { games: syncedGames, productCodes: Array.from(activeCodes) };
}

export const gameRouter = createRouter({
  list: publicQuery
    .input(
      z.object({
        categoryId: z.number().optional(),
        search: z.string().optional(),
        platform: z.string().optional(),
        categoryGroup: z.enum(["game", "pulsa", "ewallet", "digital"]).optional(),
        trending: z.boolean().optional(),
        popular: z.boolean().optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      }).optional(),
    )
    .query(async ({ input }) => {
      const db = getDb();
      const filters = [eq(games.isActive, true), FLOWIX_ONLY_GAME_FILTER];
      if (input?.categoryId) filters.push(eq(games.categoryId, input.categoryId));
      if (input?.categoryGroup) {
        filters.push(inArray(categories.slug, categoryGroupSlugs[input.categoryGroup]));
      }
      if (input?.search) filters.push(like(games.name, `%${input.search}%`));
      if (input?.platform) {
        filters.push(eq(games.platform, input.platform as "mobile" | "pc" | "console" | "voucher"));
      }
      if (input?.trending) filters.push(eq(games.isTrending, true));
      if (input?.popular) filters.push(eq(games.isPopular, true));

      const loadRows = () =>
        db
          .select({
            id: games.id,
            name: games.name,
            slug: games.slug,
            description: games.description,
            coverImage: games.coverImage,
            cardImage: games.cardImage,
            bannerImage: games.bannerImage,
            publisher: games.publisher,
            platform: games.platform,
            isTrending: games.isTrending,
            isPopular: games.isPopular,
            isNew: games.isNew,
            hasServerId: games.hasServerId,
            serverIdLabel: games.serverIdLabel,
            serverIdPlaceholder: games.serverIdPlaceholder,
            sortOrder: games.sortOrder,
            categoryId: games.categoryId,
            categoryName: categories.name,
          })
          .from(games)
          .leftJoin(categories, eq(games.categoryId, categories.id))
          .where(and(...filters))
          .orderBy(asc(games.sortOrder), asc(games.name))
          .limit((input?.limit || 50) * 3)
          .offset(input?.offset || 0);

      const rows = await loadRows();

      return uniqueGamesByName(rows).slice(0, input?.limit || 50).map((game) => ({
        ...game,
        description: sanitizePublicText(game.description),
        publisher: publicProviderLabel,
      }));
    }),

  getBySlug: publicQuery
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const loadGame = () =>
        db
          .select()
          .from(games)
          .where(and(eq(games.slug, input.slug), eq(games.isActive, true), FLOWIX_ONLY_GAME_FILTER))
          .limit(1);

      const [game] = await loadGame();

      if (!game) return null;

      const [category] = await db
        .select()
        .from(categories)
        .where(eq(categories.id, game.categoryId))
        .limit(1);

      const localProducts = await db
        .select()
        .from(products)
        .where(and(eq(products.gameId, game.id), eq(products.isActive, true)))
        .orderBy(
          asc(sql<number>`coalesce(${products.salePrice}, ${products.basePrice})::numeric`),
          asc(products.sortOrder),
          asc(products.id),
        );

      return {
        ...game,
        description: sanitizePublicText(game.description),
        publisher: publicProviderLabel,
        category,
        products: uniqueProductsByName(localProducts).map((product) => {
          const displayName = cleanProductDisplayName(
            product.name,
            productBrandFromDescription(product.description),
            product.nominalAmount,
          );

          return {
            ...product,
            name: displayName,
            provider: "flowix" as const,
            providerProductCode: product.nominalAmount,
            providerProductName: displayName,
          };
        }),
      };
    }),

  trending: publicQuery.query(async () => {
    const db = getDb();
    const rows = await db
      .select({
        id: games.id,
        name: games.name,
        slug: games.slug,
        description: games.description,
        coverImage: games.coverImage,
        cardImage: games.cardImage,
        publisher: games.publisher,
        platform: games.platform,
        isTrending: games.isTrending,
        isPopular: games.isPopular,
        isNew: games.isNew,
        categoryId: games.categoryId,
        categoryName: categories.name,
      })
      .from(games)
      .leftJoin(categories, eq(games.categoryId, categories.id))
      .where(and(eq(games.isTrending, true), eq(games.isActive, true), FLOWIX_ONLY_GAME_FILTER))
      .orderBy(asc(games.sortOrder), asc(games.name))
      .limit(24);
    return uniqueGamesByName(rows).slice(0, 8).map((game) => ({
      ...game,
      description: sanitizePublicText(game.description),
      publisher: publicProviderLabel,
    }));
  }),

  popular: publicQuery.query(async () => {
    const db = getDb();
    const rows = await db
      .select({
        id: games.id,
        name: games.name,
        slug: games.slug,
        description: games.description,
        coverImage: games.coverImage,
        cardImage: games.cardImage,
        publisher: games.publisher,
        platform: games.platform,
        isTrending: games.isTrending,
        isPopular: games.isPopular,
        isNew: games.isNew,
        categoryId: games.categoryId,
        categoryName: categories.name,
      })
      .from(games)
      .leftJoin(categories, eq(games.categoryId, categories.id))
      .where(and(eq(games.isPopular, true), eq(games.isActive, true), FLOWIX_ONLY_GAME_FILTER))
      .orderBy(asc(games.sortOrder), asc(games.name))
      .limit(36);
    return uniqueGamesByName(rows).slice(0, 12).map((game) => ({
      ...game,
      description: sanitizePublicText(game.description),
      publisher: publicProviderLabel,
    }));
  }),

  categories: publicQuery.query(async () => {
    const db = getDb();
    const loadCategories = () =>
      db
        .selectDistinct({
          id: categories.id,
          name: categories.name,
          slug: categories.slug,
          icon: categories.icon,
          sortOrder: categories.sortOrder,
          isActive: categories.isActive,
          createdAt: categories.createdAt,
        })
        .from(categories)
        .innerJoin(games, eq(games.categoryId, categories.id))
        .where(and(eq(categories.isActive, true), eq(games.isActive, true), FLOWIX_ONLY_GAME_FILTER))
        .orderBy(asc(categories.sortOrder));

    const rows = await loadCategories();

    return rows;
  }),
});
