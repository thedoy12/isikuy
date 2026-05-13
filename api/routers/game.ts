import { z } from "zod";
import { eq, and, like, asc, not, notInArray, inArray } from "drizzle-orm";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { games, categories, products } from "@db/schema";
import { env } from "../lib/env";
import { publicProviderLabel, sanitizePublicText } from "../lib/publicText";
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
  game: ["game"],
  pulsa: ["pulsa"],
  ewallet: ["ewallet"],
  digital: ["data", "voucher", "pln", "produk"],
};

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
  const aliases: Record<string, string> = {
    "e-wallet": "ewallet",
    "e-walet": "ewallet",
    "dompet-digital": "ewallet",
    "paket-data": "data",
    "internet": "data",
  };
  return aliases[slug] ?? slug;
}

function productGroupBaseName(product: FlowixProduct) {
  const categorySlug = productCategorySlug(product);
  const rawName = cleanFlowixName(product.brand || product.name || "Produk");
  if (categorySlug !== "game") return rawName;
  return rawName
    .replace(/\b(top[\s-]*up|voucher|diamonds?|diamond|uc|point|points|cash|coin|coins|gem|gems)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isRegionalGameProduct(product: FlowixProduct) {
  if (productCategorySlug(product) !== "game") return false;
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
  if (isRegionalGameProduct(product)) return false;
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
    voucher: "Voucher",
    pln: "PLN",
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

function cleanProductDisplayName(name: string, brand?: string | null) {
  let value = cleanFlowixName(name)
    .replace(/\b(top[\s-]*up|voucher|produk\s+digital)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  const cleanBrand = brand ? cleanFlowixName(brand) : "";
  if (cleanBrand) {
    const escapedBrand = cleanBrand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    value = value
      .replace(new RegExp(`^${escapedBrand}\\s*[-:]?\\s*`, "i"), "")
      .replace(new RegExp(`\\s*[-:]?\\s*${escapedBrand}$`, "i"), "")
      .replace(/\s+/g, " ")
      .trim();
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

function productDedupeKey(product: ProductDedupeInput) {
  const displayName = cleanProductDisplayName(
    product.name,
    productBrandFromDescription(product.description),
  );
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
  );
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

    const gameData = {
      categoryId: category.id,
      name: group.name,
      slug: group.slug,
      description: `${productCategoryName(group.categorySlug)} ${group.name} tersedia instan.`,
      publisher: FLOWIX_PUBLISHER,
      platform: productPlatform(group.categorySlug),
      isActive: true,
      hasServerId: false,
    };

    const syncedRows: GameRow[] = existing
      ? await db.update(games).set(gameData).where(eq(games.id, existing.id)).returning()
      : await db
          .insert(games)
          .values({
            ...gameData,
            sortOrder: syncedGames.length + 1,
            isTrending: syncedGames.length < 8,
            isPopular: syncedGames.length < 12,
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

    const productData = {
      gameId: game.id,
      name: cleanProductDisplayName(product.name, product.brand),
      description: `${cleanFlowixName(product.brand)} - ${product.code}`,
      nominalAmount: product.code,
      basePrice: String(product.price),
      salePrice: String(withMarkup(product.price)),
      discountPercent: 0,
      isPromo: false,
      stock: 999,
      isActive: true,
      sortOrder: index + 1,
    };

    if (existing) {
      await db.update(products).set(productData).where(eq(products.id, existing.id));
      const duplicateIds = existingProducts.slice(1).map((item) => item.id);
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

      const rows = await db
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
      const [game] = await db
        .select()
        .from(games)
        .where(and(eq(games.slug, input.slug), eq(games.isActive, true), FLOWIX_ONLY_GAME_FILTER))
        .limit(1);

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
        .orderBy(asc(products.sortOrder));

      return {
        ...game,
        description: sanitizePublicText(game.description),
        publisher: publicProviderLabel,
        category,
        products: uniqueProductsByName(localProducts).map((product) => ({
          ...product,
          provider: "flowix" as const,
          providerProductCode: product.nominalAmount,
          providerProductName: product.name,
        })),
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
    return db
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
  }),
});
