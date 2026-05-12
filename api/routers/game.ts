import { z } from "zod";
import { eq, and, like, asc, desc } from "drizzle-orm";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { games, categories, products } from "@db/schema";
import { env } from "../lib/env";
import {
  isFlowixConfigured,
  listFlowixCatalog,
  type FlowixProduct,
} from "../flowix/client";

type GameRow = typeof games.$inferSelect;
type SyncedGame = GameRow & { categoryName: string };

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
    .replace(/\s*-\s*produk\s+digital\s*/gi, " ")
    .replace(/\s*produk\s+digital\s*/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function productCategorySlug(product: FlowixProduct) {
  return slugify(product.sourceCategory || product.category || "produk");
}

function productGroupBaseName(product: FlowixProduct) {
  return cleanFlowixName(product.brand || product.name || "Produk");
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

function isAllowedGameProduct(product: FlowixProduct) {
  if (productCategorySlug(product) !== "game") return true;
  if (isRegionalGameProduct(product)) return false;
  if (/\b(gift|test|promo|voucher\s+gift)\b/i.test(`${product.brand} ${product.name}`)) {
    return false;
  }
  const haystack = matchKey(`${product.brand || ""} ${product.name || ""}`);
  return env.flowixGameWhitelist.some((item) => haystack.includes(matchKey(item)));
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

function productGroupName(product: FlowixProduct) {
  return titleCase(productGroupBaseName(product));
}

function withMarkup(price: number) {
  return Math.ceil((price * (1 + env.productMarkupPercent / 100)) / 100) * 100;
}

export async function syncFlowixCatalog() {
  if (!isFlowixConfigured()) return { games: [], productCodes: [] };

  const db = getDb();
  const flowixProducts = (await listFlowixCatalog())
    .filter((product) => product.status.toLowerCase() === "aktif")
    .filter(isAllowedGameProduct);

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

    const existing =
      existingGames.find((game) => game.slug === group.slug) ??
      existingGames.find((game) => matchKey(game.slug) === matchKey(group.slug)) ??
      existingGames.find((game) => matchKey(game.name) === matchKey(group.name));

    const gameData = {
      categoryId: category.id,
      name: group.name,
      description: `${productCategoryName(group.categorySlug)} ${group.name} via Flowix.`,
      publisher: "Flowix",
      platform: "mobile" as const,
      isActive: true,
      hasServerId: false,
    };

    const syncedRows: GameRow[] = existing
      ? await db.update(games).set(gameData).where(eq(games.id, existing.id)).returning()
      : await db
          .insert(games)
          .values({
            ...gameData,
            slug: group.slug,
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

  for (const [index, product] of flowixProducts.entries()) {
    const game = gamesBySlug.get(productGroupSlug(product));
    if (!game) continue;

    const [existing] = await db
      .select()
      .from(products)
      .where(and(eq(products.gameId, game.id), eq(products.nominalAmount, product.code)))
      .limit(1);

    const productData = {
      gameId: game.id,
      name: cleanFlowixName(product.name),
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
    } else {
      await db.insert(products).values(productData);
    }
  }

  const syncedGameIds = syncedGames.map((game) => game.id);
  const allFlowixGames = await db
    .select({ id: games.id })
    .from(games)
    .where(eq(games.publisher, "Flowix"));
  for (const stale of allFlowixGames.filter((game) => !syncedGameIds.includes(game.id))) {
    await db.update(games).set({ isActive: false }).where(eq(games.id, stale.id));
    await db.update(products).set({ isActive: false }).where(eq(products.gameId, stale.id));
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
        trending: z.boolean().optional(),
        popular: z.boolean().optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      }).optional(),
    )
    .query(async ({ input }) => {
      const db = getDb();
      const filters = [eq(games.isActive, true)];
      if (input?.categoryId) filters.push(eq(games.categoryId, input.categoryId));
      if (input?.search) filters.push(like(games.name, `%${input.search}%`));
      if (input?.platform) {
        filters.push(eq(games.platform, input.platform as "mobile" | "pc" | "console" | "voucher"));
      }
      if (input?.trending) filters.push(eq(games.isTrending, true));
      if (input?.popular) filters.push(eq(games.isPopular, true));

      return db
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
        .orderBy(desc(games.publisher), asc(games.sortOrder))
        .limit(input?.limit || 50)
        .offset(input?.offset || 0);
    }),

  getBySlug: publicQuery
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const [game] = await db
        .select()
        .from(games)
        .where(and(eq(games.slug, input.slug), eq(games.isActive, true)))
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

      const isFlowixGame = game.publisher === "Flowix";
      return {
        ...game,
        category,
        products: localProducts.map((product) => ({
          ...product,
          provider: isFlowixGame ? ("flowix" as const) : ("local" as const),
          providerProductCode: isFlowixGame ? product.nominalAmount : null,
          providerProductName: isFlowixGame ? product.name : null,
        })),
      };
    }),

  trending: publicQuery.query(async () => {
    const db = getDb();
    return db
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
        categoryName: categories.name,
      })
      .from(games)
      .leftJoin(categories, eq(games.categoryId, categories.id))
      .where(and(eq(games.isTrending, true), eq(games.isActive, true)))
      .orderBy(desc(games.publisher), asc(games.sortOrder))
      .limit(8);
  }),

  popular: publicQuery.query(async () => {
    const db = getDb();
    return db
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
        categoryName: categories.name,
      })
      .from(games)
      .leftJoin(categories, eq(games.categoryId, categories.id))
      .where(and(eq(games.isPopular, true), eq(games.isActive, true)))
      .orderBy(desc(games.publisher), asc(games.sortOrder))
      .limit(12);
  }),

  categories: publicQuery.query(async () => {
    const db = getDb();
    return db
      .select()
      .from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(asc(categories.sortOrder));
  }),
});
