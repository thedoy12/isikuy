import { z } from "zod";
import { eq, and, like, asc } from "drizzle-orm";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { games, categories, products } from "@db/schema";
import {
  isFlowixConfigured,
  listFlowixProducts,
  type FlowixProduct,
} from "../flowix/client";

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function matchesGame(product: FlowixProduct, gameName: string) {
  const brand = normalize(product.brand || "");
  const name = normalize(product.name || "");
  const game = normalize(gameName);
  return brand === game || brand.includes(game) || game.includes(brand) || name.includes(game);
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

      if (isFlowixConfigured()) {
        try {
          const flowixProducts = (await listFlowixProducts("game"))
            .filter((product) => product.status.toLowerCase() === "aktif")
            .filter((product) => matchesGame(product, game.name))
            .map((product, index) => ({
              id: -(index + 1),
              gameId: game.id,
              name: product.name,
              description: `${product.brand} - ${product.code}`,
              nominalAmount: product.code,
              basePrice: String(product.price),
              salePrice: String(product.price),
              discountPercent: 0,
              isPromo: false,
              stock: 999,
              sortOrder: index,
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
              provider: "flowix" as const,
              providerProductCode: product.code,
              providerProductName: product.name,
            }));

          if (flowixProducts.length > 0) {
            return { ...game, category, products: flowixProducts };
          }
        } catch (error) {
          console.warn("[flowix] Failed to load products, using local products", error);
        }
      }

      return {
        ...game,
        category,
        products: localProducts.map((product) => ({
          ...product,
          provider: "local" as const,
          providerProductCode: null,
          providerProductName: null,
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
      .orderBy(asc(games.sortOrder))
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
