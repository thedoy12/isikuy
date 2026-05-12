import { z } from "zod";
import { eq, and, like, asc, inArray } from "drizzle-orm";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { games, categories, products } from "@db/schema";
import { env } from "../lib/env";
import {
  isFlowixConfigured,
  listFlowixProducts,
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

function productGameName(product: FlowixProduct) {
  return (product.brand || product.name || "Game").trim();
}

function withMarkup(price: number) {
  return Math.ceil((price * (1 + env.productMarkupPercent / 100)) / 100) * 100;
}

async function ensureFlowixCatalog() {
  if (!isFlowixConfigured()) return null;

  const db = getDb();
  const flowixProducts = (await listFlowixProducts("game")).filter(
    (product) => product.status.toLowerCase() === "aktif",
  );

  const [category] = await db
    .select()
    .from(categories)
    .where(eq(categories.slug, "game"))
    .limit(1);

  const gameCategory =
    category ??
    (
      await db
        .insert(categories)
        .values({
          name: "Game",
          slug: "game",
          icon: "gamepad-2",
          sortOrder: 0,
          isActive: true,
        })
        .returning()
    )[0];

  const brands = Array.from(
    new Map(
      flowixProducts.map((product) => {
        const name = titleCase(productGameName(product));
        return [slugify(name), name] as const;
      }),
    ).entries(),
  );
  const existingGames = await db.select().from(games);

  const syncedGames: SyncedGame[] = [];
  for (const [slug, name] of brands) {
    const existing =
      existingGames.find((game) => game.slug === slug) ??
      existingGames.find((game) => matchKey(game.slug) === matchKey(slug)) ??
      existingGames.find((game) => matchKey(game.name) === matchKey(name));

    const gameData = {
      categoryId: gameCategory.id,
      name,
      description: `Top up ${name} via Flowix.`,
      publisher: "Flowix",
      platform: "mobile" as const,
      isActive: true,
      hasServerId: false,
    };

    const syncedGameRows: GameRow[] = existing
      ? await db
          .update(games)
          .set(gameData)
          .where(eq(games.id, existing.id))
          .returning()
      : await db
          .insert(games)
          .values({
            ...gameData,
            slug,
            sortOrder: syncedGames.length + 1,
            isTrending: syncedGames.length < 8,
            isPopular: syncedGames.length < 12,
            isNew: false,
          })
          .returning();
    const syncedGame = syncedGameRows[0];
    existingGames.push(syncedGame);

    syncedGames.push({ ...syncedGame, categoryName: gameCategory.name });
  }

  const gamesBySlug = new Map(syncedGames.map((game) => [game.slug, game]));
  const activeCodes = new Set(flowixProducts.map((product) => product.code));

  for (const [index, product] of flowixProducts.entries()) {
    const game = gamesBySlug.get(slugify(titleCase(productGameName(product))));
    if (!game) continue;

    const [existing] = await db
      .select()
      .from(products)
      .where(and(eq(products.gameId, game.id), eq(products.nominalAmount, product.code)))
      .limit(1);

    const salePrice = withMarkup(product.price);
    const productData = {
      gameId: game.id,
      name: product.name,
      description: `${product.brand} - ${product.code}`,
      nominalAmount: product.code,
      basePrice: String(product.price),
      salePrice: String(salePrice),
      discountPercent: 0,
      isPromo: false,
      stock: 999,
      isActive: true,
    };

    if (existing) {
      await db.update(products).set(productData).where(eq(products.id, existing.id));
    } else {
      await db
        .insert(products)
        .values({
          ...productData,
          sortOrder: index + 1,
        });
    }
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
      }).optional()
    )
    .query(async ({ input }) => {
      const db = getDb();
      const flowixCatalog = await ensureFlowixCatalog().catch((error) => {
        console.warn("[flowix] Failed to sync catalog, using local catalog", error);
        return null;
      });

      if (flowixCatalog) {
        const search = input?.search?.toLowerCase().trim();
        const offset = input?.offset ?? 0;
        const limit = input?.limit ?? flowixCatalog.games.length;

        return flowixCatalog.games
          .filter((game) => !input?.categoryId || game.categoryId === input.categoryId)
          .filter((game) => !search || game.name.toLowerCase().includes(search))
          .filter((game) => !input?.platform || game.platform === input.platform)
          .filter((game) => !input?.trending || game.isTrending)
          .filter((game) => !input?.popular || game.isPopular)
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
          .slice(offset, offset + limit);
      }

      const filters = [];
      
      if (input?.categoryId) {
        filters.push(eq(games.categoryId, input.categoryId));
      }
      if (input?.search) {
        filters.push(like(games.name, `%${input.search}%`));
      }
      if (input?.platform) {
        filters.push(eq(games.platform, input.platform as "mobile" | "pc" | "console" | "voucher"));
      }
      if (input?.trending) {
        filters.push(eq(games.isTrending, true));
      }
      if (input?.popular) {
        filters.push(eq(games.isPopular, true));
      }
      filters.push(eq(games.isActive, true));

      const where = filters.length > 0 ? and(...filters) : undefined;

      const result = await db
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
        .where(where)
        .orderBy(asc(games.sortOrder))
        .limit(input?.limit || 50)
        .offset(input?.offset || 0);

      return result;
    }),

  getBySlug: publicQuery
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const flowixCatalog = await ensureFlowixCatalog().catch((error) => {
        console.warn("[flowix] Failed to sync catalog, using local products", error);
        return null;
      });

      const [localGame] = await db
        .select()
        .from(games)
        .where(and(eq(games.slug, input.slug), eq(games.isActive, true)))
        .limit(1);

      const game =
        flowixCatalog?.games.find((item) => item.slug === input.slug) ??
        flowixCatalog?.games.find((item) => matchKey(item.slug) === matchKey(input.slug)) ??
        localGame;

      if (!game) return null;

      const [category] = await db
        .select()
        .from(categories)
        .where(eq(categories.id, game.categoryId))
        .limit(1);

      const productFilters = [eq(products.gameId, game.id), eq(products.isActive, true)];
      if (flowixCatalog?.productCodes.length) {
        productFilters.push(inArray(products.nominalAmount, flowixCatalog.productCodes));
      }

      const localProducts = await db
        .select()
        .from(products)
        .where(and(...productFilters))
        .orderBy(asc(products.sortOrder));

      return {
        ...game,
        category,
        products: localProducts.map((product) => ({
          ...product,
          provider: flowixCatalog ? ("flowix" as const) : ("local" as const),
          providerProductCode: flowixCatalog ? product.nominalAmount : null,
          providerProductName: flowixCatalog ? product.name : null,
        })),
      };
    }),

  trending: publicQuery.query(async () => {
    const flowixCatalog = await ensureFlowixCatalog().catch((error) => {
      console.warn("[flowix] Failed to sync trending catalog, using local catalog", error);
      return null;
    });

    if (flowixCatalog) {
      return flowixCatalog.games
        .filter((game) => game.isTrending)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .slice(0, 8);
    }

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
      .orderBy(asc(games.sortOrder))
      .limit(8);
  }),

  popular: publicQuery.query(async () => {
    const flowixCatalog = await ensureFlowixCatalog().catch((error) => {
      console.warn("[flowix] Failed to sync popular catalog, using local catalog", error);
      return null;
    });

    if (flowixCatalog) {
      return flowixCatalog.games
        .filter((game) => game.isPopular)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .slice(0, 12);
    }

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
      .orderBy(asc(games.sortOrder))
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
