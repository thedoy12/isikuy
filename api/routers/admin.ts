import { z } from "zod";
import { eq, and, desc, sql, gte, count, ilike, or } from "drizzle-orm";
import { createRouter, adminQuery } from "../middleware";
import { getDb } from "../queries/connection";
import {
  users,
  games,
  products,
  transactions,
  paymentMethods,
  banners,
  faqs,
  categories,
  activityLogs,
} from "@db/schema";
import { syncFlowixCatalog } from "./game";
import {
  getAdminCredentials,
  setAdminPassword,
  verifyAdminPassword,
} from "../lib/adminCredentials";

function adminMatchKey(value: string | null | undefined) {
  return (value || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .map((part) => (part.length > 3 && part.endsWith("s") ? part.slice(0, -1) : part))
    .join("");
}

function adminProductKey(input: {
  name: string;
  description: string | null;
  nominalAmount: string | null;
}) {
  const brand = input.description?.split(" - ")[0] || "";
  const escapedBrand = brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const displayName = input.name
    .replace(/\b(top[\s-]*up|voucher|produk\s+digital)\b/gi, " ")
    .replace(brand ? new RegExp(`^${escapedBrand}\\s*[-:]?\\s*`, "i") : /^$/, "")
    .replace(brand ? new RegExp(`\\s*[-:]?\\s*${escapedBrand}$`, "i") : /^$/, "")
    .replace(/\s+/g, " ")
    .trim();

  return adminMatchKey(displayName) || adminMatchKey(input.nominalAmount) || adminMatchKey(input.name);
}

export const adminRouter = createRouter({
  settings: adminQuery.query(async () => {
    const credentials = await getAdminCredentials();
    return {
      adminUsername: credentials.username,
      hasCustomPassword: !!credentials.passwordHash,
    };
  }),

  updateAdminPassword: adminQuery
    .input(
      z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(8),
      }),
    )
    .mutation(async ({ input }) => {
      const currentPasswordIsValid = await verifyAdminPassword(input.currentPassword);
      if (!currentPasswordIsValid) {
        throw new Error("Password lama tidak sesuai");
      }

      await setAdminPassword(input.newPassword);
      return { success: true };
    }),

  syncFlowixCatalog: adminQuery.mutation(async () => {
    const result = await syncFlowixCatalog();
    return {
      success: true,
      games: result.games.length,
      products: result.productCodes.length,
    };
  }),

  stats: adminQuery.query(async () => {
    const db = getDb();

    const [totalUsers] = await db.select({ count: count() }).from(users);
    const [totalGames] = await db
      .select({ count: count() })
      .from(games)
      .where(eq(games.publisher, "Flowix"));
    const [totalTransactions] = await db.select({ count: count() }).from(transactions);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [todaySales] = await db
      .select({
        count: count(),
        revenue: sql<string>`COALESCE(SUM(${transactions.totalAmount}), 0)`,
      })
      .from(transactions)
      .where(and(gte(transactions.createdAt, today), eq(transactions.paymentStatus, "paid")));

    const [pendingTransactions] = await db
      .select({ count: count() })
      .from(transactions)
      .where(eq(transactions.status, "pending"));

    const [successTransactions] = await db
      .select({ count: count() })
      .from(transactions)
      .where(eq(transactions.status, "success"));

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const recentRevenueRows = await db
      .select({
        totalAmount: transactions.totalAmount,
        feeAmount: transactions.feeAmount,
        createdAt: transactions.createdAt,
      })
      .from(transactions)
      .where(and(gte(transactions.createdAt, sevenDaysAgo), eq(transactions.paymentStatus, "paid")));

    const dailyRevenue = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(sevenDaysAgo);
      date.setDate(sevenDaysAgo.getDate() + index);
      const key = date.toISOString().slice(0, 10);
      const rows = recentRevenueRows.filter(
        (row) => row.createdAt.toISOString().slice(0, 10) === key,
      );
      return {
        name: date.toLocaleDateString("id-ID", { weekday: "short" }),
        sales: rows.reduce((sum, row) => sum + parseFloat(row.totalAmount), 0),
        profit: rows.reduce((sum, row) => sum + parseFloat(row.feeAmount || "0"), 0),
      };
    });

    return {
      totalUsers: totalUsers.count,
      totalGames: totalGames.count,
      totalTransactions: totalTransactions.count,
      todayRevenue: parseFloat(todaySales.revenue) || 0,
      todayTransactions: todaySales.count,
      pendingTransactions: pendingTransactions.count,
      successTransactions: successTransactions.count,
      dailyRevenue,
    };
  }),

  transactions: adminQuery
    .input(
      z.object({
        status: z.string().optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = getDb();
      const limit = input?.limit || 50;
      const offset = input?.offset || 0;
      const filters = [];

      if (input?.status) {
        filters.push(eq(transactions.status, input.status as any));
      }

      const where = filters.length > 0 ? and(...filters) : undefined;

      const [totalRow] = await db
        .select({ count: count() })
        .from(transactions)
        .where(where);

      const items = await db
        .select({
          id: transactions.id,
          invoiceNumber: transactions.invoiceNumber,
          playerId: transactions.playerId,
          serverId: transactions.serverId,
          baseAmount: transactions.baseAmount,
          feeAmount: transactions.feeAmount,
          totalAmount: transactions.totalAmount,
          status: transactions.status,
          paymentStatus: transactions.paymentStatus,
          createdAt: transactions.createdAt,
          paidAt: transactions.paidAt,
          completedAt: transactions.completedAt,
          gameName: games.name,
          productName: products.name,
          methodName: paymentMethods.name,
        })
        .from(transactions)
        .leftJoin(games, eq(transactions.gameId, games.id))
        .leftJoin(products, eq(transactions.productId, products.id))
        .leftJoin(paymentMethods, eq(transactions.paymentMethodId, paymentMethods.id))
        .where(where)
        .orderBy(desc(transactions.createdAt))
        .limit(limit)
        .offset(offset);

      return { items, total: totalRow.count, limit, offset };
    }),

  updateTransaction: adminQuery
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["pending", "processing", "success", "failed", "cancelled", "refunded"]),
        paymentStatus: z.enum(["unpaid", "paid", "expired", "refunded"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const updateData: any = { status: input.status };
      if (input.paymentStatus) updateData.paymentStatus = input.paymentStatus;

      await db
        .update(transactions)
        .set(updateData)
        .where(eq(transactions.id, input.id));

      return { success: true };
    }),

  users: adminQuery
    .input(
      z.object({
        search: z.string().optional(),
        role: z.string().optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = getDb();
      const limit = input?.limit || 50;
      const offset = input?.offset || 0;
      const filters = [];

      if (input?.role) {
        filters.push(eq(users.role, input.role as "user" | "admin" | "superadmin"));
      }
      if (input?.search) {
        filters.push(
          or(
            ilike(users.name, `%${input.search}%`),
            ilike(users.email, `%${input.search}%`),
            ilike(users.username, `%${input.search}%`),
          ),
        );
      }

      const where = filters.length > 0 ? and(...filters) : undefined;

      const [totalRow] = await db.select({ count: count() }).from(users).where(where);
      const [adminCount] = await db
        .select({ count: count() })
        .from(users)
        .where(or(eq(users.role, "admin"), eq(users.role, "superadmin")));
      const [activeCount] = await db
        .select({ count: count() })
        .from(users)
        .where(eq(users.isActive, true));

      const items = await db
        .select({
          id: users.id,
          username: users.username,
          name: users.name,
          email: users.email,
          avatar: users.avatar,
          role: users.role,
          balance: users.balance,
          isActive: users.isActive,
          createdAt: users.createdAt,
          lastSignInAt: users.lastSignInAt,
        })
        .from(users)
        .where(where)
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset(offset);

      return {
        items,
        total: totalRow.count,
        adminCount: adminCount.count,
        activeCount: activeCount.count,
        limit,
        offset,
      };
    }),

  updateUser: adminQuery
    .input(
      z.object({
        id: z.number(),
        role: z.enum(["user", "admin", "superadmin"]).optional(),
        balance: z.number().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const updateData: any = {};
      if (input.role) updateData.role = input.role;
      if (input.balance !== undefined) updateData.balance = input.balance.toString();
      if (input.isActive !== undefined) updateData.isActive = input.isActive;

      await db.update(users).set(updateData).where(eq(users.id, input.id));
      return { success: true };
    }),

  games: adminQuery
    .input(
      z.object({
        search: z.string().optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      }).optional(),
    )
    .query(async ({ input }) => {
      const db = getDb();
      const limit = input?.limit || 50;
      const offset = input?.offset || 0;
      const filters = [eq(games.publisher, "Flowix")];
      if (input?.search) {
        filters.push(ilike(games.name, `%${input.search}%`));
      }
      const flowixFilter = and(...filters);
      const items = await db
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
          isActive: games.isActive,
          isManuallyHidden: games.isManuallyHidden,
          hasServerId: games.hasServerId,
          sortOrder: games.sortOrder,
          categoryId: games.categoryId,
          categoryName: categories.name,
        })
        .from(games)
        .leftJoin(categories, eq(games.categoryId, categories.id))
        .where(flowixFilter)
        .orderBy(desc(games.isActive), games.sortOrder, games.name);

      const seen = new Set<string>();
      const uniqueItems = items.filter((item) => {
        const key = `${item.categoryId}:${adminMatchKey(item.slug) || adminMatchKey(item.name)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      return {
        items: uniqueItems.slice(offset, offset + limit),
        total: uniqueItems.length,
        limit,
        offset,
      };
    }),

  updateGame: adminQuery
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().nullable().optional(),
        coverImage: z.string().nullable().optional(),
        cardImage: z.string().nullable().optional(),
        bannerImage: z.string().nullable().optional(),
        isTrending: z.boolean().optional(),
        isPopular: z.boolean().optional(),
        isNew: z.boolean().optional(),
        isActive: z.boolean().optional(),
        sortOrder: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...updateData } = input;
      const values: typeof updateData & { isManuallyHidden?: boolean } = { ...updateData };
      if (input.isActive !== undefined) {
        values.isManuallyHidden = !input.isActive;
      }

      await db.update(games).set(values).where(eq(games.id, id));
      return { success: true };
    }),

  products: adminQuery
    .input(
      z.object({
        gameId: z.number().optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      }).optional(),
    )
    .query(async ({ input }) => {
      const db = getDb();
      const limit = input?.limit || 50;
      const offset = input?.offset || 0;
      const filters = [];
      if (input?.gameId) filters.push(eq(products.gameId, input.gameId));
      filters.push(eq(games.publisher, "Flowix"));
      filters.push(eq(games.isActive, true));

      const where = and(...filters);

      const items = await db
        .select({
          id: products.id,
          name: products.name,
          description: products.description,
          nominalAmount: products.nominalAmount,
          basePrice: products.basePrice,
          salePrice: products.salePrice,
          discountPercent: products.discountPercent,
          isPromo: products.isPromo,
          stock: products.stock,
          isActive: products.isActive,
          isManuallyHidden: products.isManuallyHidden,
          sortOrder: products.sortOrder,
          gameId: products.gameId,
          gameName: games.name,
        })
        .from(products)
        .leftJoin(games, eq(products.gameId, games.id))
        .where(where)
        .orderBy(desc(products.isActive), products.sortOrder)
        .limit(limit * 3)
        .offset(offset);

      const seen = new Set<string>();
      const uniqueItems = items.filter((item) => {
        const key = `${item.gameId}:${adminProductKey(item)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }).slice(0, limit);

      return { items: uniqueItems, total: uniqueItems.length, limit, offset };
    }),

  updateProduct: adminQuery
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        basePrice: z.number().optional(),
        salePrice: z.number().optional(),
        discountPercent: z.number().optional(),
        isPromo: z.boolean().optional(),
        stock: z.number().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...data } = input;
      const updateData: any = {};
      if (data.name) updateData.name = data.name;
      if (data.basePrice !== undefined) updateData.basePrice = data.basePrice.toString();
      if (data.salePrice !== undefined) updateData.salePrice = data.salePrice.toString();
      if (data.discountPercent !== undefined) updateData.discountPercent = data.discountPercent;
      if (data.isPromo !== undefined) updateData.isPromo = data.isPromo;
      if (data.stock !== undefined) updateData.stock = data.stock;
      if (data.isActive !== undefined) {
        updateData.isActive = data.isActive;
        updateData.isManuallyHidden = !data.isActive;
      }

      await db.update(products).set(updateData).where(eq(products.id, id));
      return { success: true };
    }),

  banners: adminQuery.query(async () => {
    const db = getDb();
    return db.select().from(banners).orderBy(banners.sortOrder);
  }),

  updateBanner: adminQuery
    .input(
      z.object({
        id: z.number(),
        isActive: z.boolean().optional(),
        sortOrder: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...data } = input;
      await db.update(banners).set(data).where(eq(banners.id, id));
      return { success: true };
    }),

  faqs: adminQuery.query(async () => {
    const db = getDb();
    return db.select().from(faqs).orderBy(faqs.sortOrder);
  }),

  logs: adminQuery
    .input(z.object({ limit: z.number().default(50) }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      return db
        .select()
        .from(activityLogs)
        .orderBy(desc(activityLogs.createdAt))
        .limit(input?.limit || 50);
    }),
});
