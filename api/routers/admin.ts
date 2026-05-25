import { z } from "zod";
import { eq, and, desc, sql, gte, count, ilike, or, inArray, isNull } from "drizzle-orm";
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
  siteSettings,
  vouchers,
} from "@db/schema";
import { syncDigiflazzCatalog, syncFlowixCatalog } from "./game";
import { parseMoney, priceWithMarkup } from "../lib/pricing";
import {
  getAdminCredentials,
  hashPassword,
  setAdminPassword,
  verifyAdminPassword,
} from "../lib/adminCredentials";
import { getPublicSiteSettings } from "./site";
import { normalizePhone } from "../queries/users";
import { getPaymentMaintenance, setPaymentMaintenance } from "../lib/paymentMaintenance";
import { logAdminAction } from "../lib/adminAudit";
import {
  getSupplierRouting,
  getSupplierMaintenance,
  setSupplierRouting,
  setSupplierMaintenance,
  SUPPLIER_ROUTE_MODES,
} from "../lib/supplierRouting";
import {
  isActiveDigiflazzProduct,
  isDigiflazzConfigured,
  listDigiflazzProducts,
  type DigiflazzProduct,
} from "../digiflazz/client";
import { getFlowixProfile, isFlowixConfigured } from "../flowix/client";
import { getCommerceSettings, setCommerceSettings } from "../lib/commerceSettings";
import { submitSupplierOrder } from "../suppliers/orders";
import { withTransactionLock } from "../lib/transactionLock";

const MAX_PAGE_SIZE = 15;

function pageLimit(value: number | null | undefined) {
  return Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(value || MAX_PAGE_SIZE)));
}

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

function adminTokens(value: string | null | undefined) {
  return (value || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((part) => part.length > 1);
}

function adminNumbers(value: string | null | undefined) {
  return adminTokens(value)
    .filter((part) => /^\d+$/.test(part))
    .filter((part) => part !== "0");
}

function adminSupplierMatchScore(input: {
  gameName: string | null;
  productName: string;
  productCode: string | null;
  supplier: DigiflazzProduct;
}) {
  const sourceText = `${input.gameName || ""} ${input.productName} ${input.productCode || ""}`;
  const supplierText = `${input.supplier.brand} ${input.supplier.product_name} ${input.supplier.buyer_sku_code}`;
  const gameKey = adminMatchKey(input.gameName);
  const supplierBrandKey = adminMatchKey(input.supplier.brand);
  const sourceKey = adminMatchKey(sourceText);
  const supplierKey = adminMatchKey(supplierText);
  let score = 0;

  if (gameKey && supplierKey.includes(gameKey)) score += 5;
  if (supplierBrandKey && sourceKey.includes(supplierBrandKey)) score += 4;

  const sourceNumbers = adminNumbers(sourceText);
  const supplierNumbers = adminNumbers(supplierText);
  const numberHits = sourceNumbers.filter((item) => supplierNumbers.includes(item));
  score += Math.min(numberHits.length, 3) * 2;

  const productTokens = adminTokens(input.productName).filter(
    (token) => !["top", "up", "voucher", "digital", "produk"].includes(token),
  );
  const supplierTokenSet = new Set(adminTokens(supplierText));
  score += Math.min(
    productTokens.filter((token) => supplierTokenSet.has(token)).length,
    4,
  );

  if (adminMatchKey(input.productName) && supplierKey.includes(adminMatchKey(input.productName))) {
    score += 3;
  }

  return score;
}

function bestDigiflazzMatch(input: {
  gameName: string | null;
  productName: string;
  productCode: string | null;
  suppliers: DigiflazzProduct[];
}) {
  const ranked = input.suppliers
    .map((supplier) => ({
      supplier,
      score: adminSupplierMatchScore({ ...input, supplier }),
    }))
    .sort((a, b) => b.score - a.score);

  const best = ranked[0];
  if (!best || best.score < 7) return null;
  return best;
}

function transactionNetRevenue(row: {
  baseAmount: string;
  providerResponse: string | null;
}) {
  const baseAmount = parseMoney(row.baseAmount);
  if (!row.providerResponse) return baseAmount;

  try {
    const state = JSON.parse(row.providerResponse) as {
      voucher?: { discountAmount?: number };
      deposit?: {
        amount_received?: number;
        amountRequested?: number;
      };
      payment?: {
        amountReceived?: number;
        amountRequested?: number;
      };
    };
    const providerAmount =
      state.deposit?.amount_received ??
      state.deposit?.amountRequested ??
      state.payment?.amountReceived ??
      state.payment?.amountRequested;

    if (typeof providerAmount === "number" && Number.isFinite(providerAmount)) {
      return providerAmount;
    }

    return Math.max(0, baseAmount - Number(state.voucher?.discountAmount || 0));
  } catch {
    return baseAmount;
  }
}

function salesSummary(rows: Array<{
  totalAmount: string;
  providerResponse: string | null;
  productCost: string | null;
  status: string;
}>) {
  return rows.reduce(
    (summary, row) => {
      const gross = transactionNetRevenue({
        baseAmount: row.totalAmount,
        providerResponse: row.providerResponse,
      });
      const cost = parseMoney(row.productCost);
      summary.revenue += gross;
      summary.cost += cost;
      summary.profit += gross - cost;
      summary.transactions += 1;
      if (row.status === "success") summary.success += 1;
      if (row.status === "failed") summary.paidFailed += 1;
      return summary;
    },
    { revenue: 0, cost: 0, profit: 0, transactions: 0, success: 0, paidFailed: 0 },
  );
}

function transactionIssue(providerResponse: string | null) {
  if (!providerResponse) return null;

  try {
    const state = JSON.parse(providerResponse) as {
      paymentHoldReason?: string;
      orderSubmitError?: string;
      voucherUsageError?: string;
    };
    return state.paymentHoldReason || state.orderSubmitError || state.voucherUsageError || null;
  } catch {
    return null;
  }
}

function parseProviderState(raw: string | null) {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function stringifyProviderState(raw: string | null, patch: Record<string, unknown>) {
  return JSON.stringify({
    ...parseProviderState(raw),
    ...patch,
  });
}

async function countVoucherUsageOnce(raw: string | null) {
  const state = parseProviderState(raw) as {
    voucher?: { id?: number; usageCounted?: boolean };
  };
  const voucher = state.voucher;
  if (!voucher?.id || voucher.usageCounted) return raw;

  const counted = await getDb()
    .update(vouchers)
    .set({ usageCount: sql`${vouchers.usageCount} + 1` })
    .where(
      and(
        eq(vouchers.id, voucher.id),
        eq(vouchers.isActive, true),
        sql`${vouchers.usageCount} < ${vouchers.usageLimit}`,
      ),
    )
    .returning({ id: vouchers.id });

  if (counted.length === 0) {
    return JSON.stringify({
      ...state,
      voucherUsageError: "Voucher tidak dihitung karena sudah tidak valid atau limitnya sudah habis saat retry order selesai.",
    });
  }

  return JSON.stringify({
    ...state,
    voucher: { ...voucher, usageCounted: true },
    voucherUsageError: undefined,
  });
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
    .mutation(async ({ input, ctx }) => {
      const currentPasswordIsValid = await verifyAdminPassword(input.currentPassword);
      if (!currentPasswordIsValid) {
        throw new Error("Password lama tidak sesuai");
      }

      await setAdminPassword(input.newPassword);
      await logAdminAction({
        ctx,
        action: "admin.password.update",
        entityType: "admin",
      });
      return { success: true };
    }),

  paymentStatus: adminQuery.query(async () => getPaymentMaintenance()),

  supplierRouting: adminQuery.query(async () => getSupplierRouting()),

  supplierMaintenance: adminQuery.query(async () => getSupplierMaintenance()),

  commerceSettings: adminQuery.query(async () => getCommerceSettings()),

  updateCommerceSettings: adminQuery
    .input(
      z.object({
        markupMode: z.enum(["tiered", "percent"]),
        productMarkupPercent: z.number().min(0).max(50),
        checkoutFeePercent: z.number().min(0).max(25),
        checkoutFeeFixed: z.number().min(0).max(100_000),
        qrisExpiryMinutes: z.number().int().min(5).max(1440),
        flowixMinimumBalanceReserve: z.number().min(0).max(10_000_000),
        flowixProductCategories: z.array(z.string().min(1).max(40)).min(1).max(20),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const result = await setCommerceSettings(input);
      await logAdminAction({
        ctx,
        action: "commerce.settings.update",
        entityType: "commerceSettings",
        details: {
          ...input,
          flowixProductCategories: input.flowixProductCategories.join(","),
        },
      });
      return result;
    }),

  setSupplierMaintenance: adminQuery
    .input(z.object({ flowix: z.boolean().optional(), digiflazz: z.boolean().optional() }))
    .mutation(async ({ input, ctx }) => {
      const result = await setSupplierMaintenance(input);
      await logAdminAction({
        ctx,
        action: "supplier.maintenance.set",
        entityType: "supplier",
        details: input,
      });
      return result;
    }),

  supplierHealth: adminQuery.query(async () => {
    const startedAt = Date.now();
    const flowix = await getFlowixProfile()
      .then((profile) => ({
        ok: true,
        username: profile.username,
        balance: Number(profile.financials?.balance ?? 0),
        message: "OK",
      }))
      .catch((error) => ({
        ok: false,
        username: null,
        balance: null,
        message: isFlowixConfigured()
          ? error instanceof Error ? error.message : String(error)
          : "Flowix belum dikonfigurasi",
      }));

    const [digiflazzProductCount] = await getDb()
      .select({ count: count() })
      .from(products)
      .where(and(eq(products.supplierProvider, "digiflazz"), eq(products.isActive, true)));
    const digiflazzConfigured = isDigiflazzConfigured();
    const digiflazzCount = digiflazzProductCount?.count ?? 0;
    const digiflazz = {
      ok: digiflazzConfigured && digiflazzCount > 0,
      count: digiflazzCount,
      message: digiflazzConfigured
        ? "CACHE_ONLY. Gunakan SYNC_DIGIFLAZZ untuk cek live pricelist."
        : "Digiflazz belum dikonfigurasi",
    };

    return {
      flowix,
      digiflazz,
      checkedAt: new Date().toISOString(),
      responseMs: Date.now() - startedAt,
    };
  }),

  scanSupplierMapping: adminQuery.query(async () => {
    const db = getDb();
    const digiflazzProducts = (await listDigiflazzProducts()).filter(isActiveDigiflazzProduct);
    const localProducts = await db
      .select({
        id: products.id,
        name: products.name,
        nominalAmount: products.nominalAmount,
        supplierProvider: products.supplierProvider,
        supplierProductCode: products.supplierProductCode,
        gameName: games.name,
      })
      .from(products)
      .innerJoin(games, eq(products.gameId, games.id))
      .where(and(eq(games.publisher, "Flowix"), eq(games.isActive, true), eq(products.isActive, true)));

    const mapped = localProducts.filter(
      (product) => product.supplierProvider === "digiflazz" && !!product.supplierProductCode,
    ).length;
    const matches = [];
    const unmatched = [];
    for (const product of localProducts) {
      const best = bestDigiflazzMatch({
        gameName: product.gameName,
        productName: product.name,
        productCode: product.nominalAmount,
        suppliers: digiflazzProducts,
      });
      if (!best) {
        unmatched.push({ id: product.id, name: product.name, gameName: product.gameName });
        continue;
      }
      matches.push({
        id: product.id,
        name: product.name,
        gameName: product.gameName,
        currentCode: product.supplierProductCode,
        suggestedCode: best.supplier.buyer_sku_code,
        suggestedName: best.supplier.product_name,
        score: best.score,
      });
    }

    return {
      total: localProducts.length,
      mapped,
      matched: matches.length,
      unmatched: unmatched.length,
      matches: matches.slice(0, 20),
      samples: unmatched.slice(0, 20),
    };
  }),

  setSupplierRouting: adminQuery
    .input(z.object({ mode: z.enum(SUPPLIER_ROUTE_MODES) }))
    .mutation(async ({ input, ctx }) => {
      const result = await setSupplierRouting(input);
      await logAdminAction({
        ctx,
        action: "supplier.routing.set",
        entityType: "supplierRouting",
        details: input,
      });
      return result;
    }),

  applySupplierRouting: adminQuery
    .input(z.object({ mode: z.enum(SUPPLIER_ROUTE_MODES) }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      await setSupplierRouting({ mode: input.mode });

      if (input.mode === "manual") {
        await logAdminAction({
          ctx,
          action: "supplier.routing.apply",
          entityType: "supplierRouting",
          details: { mode: input.mode, matched: 0, unmatched: 0 },
        });
        return { success: true, mode: input.mode, matched: 0, unmatched: 0, samples: [] };
      }

      if (input.mode === "flowix") {
        const rows = await db
          .select({ id: products.id })
          .from(products)
          .innerJoin(games, eq(products.gameId, games.id))
          .where(and(eq(games.publisher, "Flowix"), eq(games.isActive, true), eq(products.isActive, true)));
        const ids = rows.map((row) => row.id);
        if (ids.length > 0) {
          await db
            .update(products)
            .set({
              supplierProvider: "flowix",
              supplierProductName: null,
              supplierTargetFormat: "auto",
            })
            .where(inArray(products.id, ids));
        }
        await logAdminAction({
          ctx,
          action: "supplier.routing.apply",
          entityType: "supplierRouting",
          details: { mode: input.mode, matched: ids.length, unmatched: 0 },
        });
        return { success: true, mode: input.mode, matched: ids.length, unmatched: 0, samples: [] };
      }

      const commerceSettings = await getCommerceSettings();
      const digiflazzProducts = (await listDigiflazzProducts()).filter(isActiveDigiflazzProduct);
      const localProducts = await db
        .select({
          id: products.id,
          name: products.name,
          nominalAmount: products.nominalAmount,
          basePrice: products.basePrice,
          isPriceManual: products.isPriceManual,
          gameName: games.name,
        })
        .from(products)
        .innerJoin(games, eq(products.gameId, games.id))
        .where(and(eq(games.publisher, "Flowix"), eq(games.isActive, true), eq(products.isActive, true)));

      let matched = 0;
      const unmatched: Array<{ id: number; name: string; gameName: string | null }> = [];
      for (const product of localProducts) {
        const best = bestDigiflazzMatch({
          gameName: product.gameName,
          productName: product.name,
          productCode: product.nominalAmount,
          suppliers: digiflazzProducts,
        });

        if (!best) {
          unmatched.push({ id: product.id, name: product.name, gameName: product.gameName });
          continue;
        }

        const updateData: Record<string, unknown> = {
          supplierProvider: "digiflazz",
          supplierProductCode: best.supplier.buyer_sku_code,
          supplierProductName: best.supplier.product_name,
          basePrice: String(best.supplier.price),
          supplierTargetFormat: "auto",
        };
        if (!product.isPriceManual) {
          updateData.salePrice = priceWithMarkup(
            best.supplier.price,
            commerceSettings.effectiveProductMarkupPercent,
          ).toString();
        }

        await db.update(products).set(updateData).where(eq(products.id, product.id));
        matched += 1;
      }

      await logAdminAction({
        ctx,
        action: "supplier.routing.apply",
        entityType: "supplierRouting",
        details: { mode: input.mode, matched, unmatched: unmatched.length },
      });
      return {
        success: true,
        mode: input.mode,
        matched,
        unmatched: unmatched.length,
        samples: unmatched.slice(0, 10),
      };
    }),

  setPaymentMaintenance: adminQuery
    .input(z.object({ enabled: z.boolean(), message: z.string().max(240).optional() }))
    .mutation(async ({ input, ctx }) => {
      const result = await setPaymentMaintenance(input);
      await logAdminAction({
        ctx,
        action: "payment.maintenance.set",
        entityType: "payment",
        details: input,
      });
      return result;
    }),

  siteSettings: adminQuery.query(async () => getPublicSiteSettings()),

  updateSiteSettings: adminQuery
    .input(
      z.object({
        siteName: z.string().min(1).max(100),
        siteTagline: z.string().max(160),
        metaTitle: z.string().min(1).max(160),
        metaDescription: z.string().min(1).max(320),
        metaKeywords: z.string().max(500),
        canonicalUrl: z.string().max(500),
        ogImage: z.string().max(500),
        contactEmail: z.string().email(),
        contactPhone: z.string().min(5).max(30),
        whatsappNumber: z.string().min(5).max(30),
        instagramUrl: z.string().max(500),
        robotsIndex: z.boolean(),
        robotsFollow: z.boolean(),
        popupEnabled: z.boolean(),
        popupTitle: z.string().max(80),
        popupMessage: z.string().max(240),
        popupImage: z.string().max(500),
        popupButtonText: z.string().max(40),
        popupButtonUrl: z.string().max(500),
        popupDismissHours: z.number().min(1).max(720),
        toolsPopupEnabled: z.boolean(),
        toolsPopupTitle: z.string().max(80),
        toolsPopupMessage: z.string().max(240),
        toolsPopupImage: z.string().max(500),
        toolsPopupButtonText: z.string().max(40),
        toolsPopupButtonUrl: z.string().max(500),
        toolsPopupDismissHours: z.number().min(1).max(720),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const entries = Object.entries(input).map(([key, value]) => ({
        key,
        value: String(value),
        type:
          typeof value === "boolean"
            ? ("boolean" as const)
            : typeof value === "number"
              ? ("number" as const)
              : ("string" as const),
      }));

      for (const entry of entries) {
        await db
          .insert(siteSettings)
          .values(entry)
          .onConflictDoUpdate({
            target: siteSettings.key,
            set: {
              value: entry.value,
              type: entry.type,
              updatedAt: new Date(),
            },
          });
      }

      await logAdminAction({
        ctx,
        action: "site.settings.update",
        entityType: "siteSettings",
        details: { keys: Object.keys(input) },
      });
      return { success: true };
    }),

  syncFlowixCatalog: adminQuery.mutation(async ({ ctx }) => {
    const result = await syncFlowixCatalog();
    await logAdminAction({
      ctx,
      action: "catalog.flowix.sync",
      entityType: "catalog",
      details: { games: result.games.length, products: result.productCodes.length },
    });
    return {
      success: true,
      games: result.games.length,
      products: result.productCodes.length,
    };
  }),

  syncDigiflazzCatalog: adminQuery.mutation(async ({ ctx }) => {
    try {
      const result = await syncDigiflazzCatalog();
      await logAdminAction({
        ctx,
        action: "catalog.digiflazz.sync",
        entityType: "catalog",
        details: { games: result.games.length, products: result.productCodes.length },
      });
      return {
        success: true,
        games: result.games.length,
        products: result.productCodes.length,
        message: "Digiflazz berhasil disinkronkan.",
      };
    } catch (error) {
      const db = getDb();
      const [gameCount] = await db
        .select({ count: count() })
        .from(games)
        .where(eq(games.publisher, "Digiflazz"));
      const [productCount] = await db
        .select({ count: count() })
        .from(products)
        .where(eq(products.supplierProvider, "digiflazz"));
      const message = error instanceof Error ? error.message : String(error);
      await logAdminAction({
        ctx,
        action: "catalog.digiflazz.sync_failed",
        entityType: "catalog",
        details: { message },
      });
      return {
        success: false,
        games: gameCount.count,
        products: productCount.count,
        message,
      };
    }
  }),

  vouchers: adminQuery
    .input(
      z.object({
        limit: z.number().default(MAX_PAGE_SIZE),
        offset: z.number().default(0),
      }).optional(),
    )
    .query(async ({ input }) => {
    const db = getDb();
      const limit = pageLimit(input?.limit);
      const offset = input?.offset || 0;
      const [totalRow] = await db.select({ count: count() }).from(vouchers);
      const [activeRow] = await db
        .select({ count: count() })
        .from(vouchers)
        .where(eq(vouchers.isActive, true));
      const items = await db
        .select()
        .from(vouchers)
        .orderBy(desc(vouchers.createdAt))
        .limit(limit)
        .offset(offset);

      return { items, total: totalRow.count, activeCount: activeRow.count, limit, offset };
    }),

  createVoucher: adminQuery
    .input(
      z.object({
        code: z.string().min(3).max(50),
        type: z.enum(["percent", "fixed"]),
        value: z.number().positive(),
        minOrder: z.number().min(0).default(0),
        maxDiscount: z.number().min(0).nullable().optional(),
        usageLimit: z.number().int().positive(),
        validFrom: z.string().min(1),
        validUntil: z.string().min(1),
        isActive: z.boolean().default(true),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const code = input.code.trim().toUpperCase();
      const validFrom = new Date(input.validFrom);
      const validUntil = new Date(input.validUntil);
      if (Number.isNaN(validFrom.getTime()) || Number.isNaN(validUntil.getTime())) {
        throw new Error("Tanggal voucher tidak valid");
      }
      if (validUntil <= validFrom) {
        throw new Error("Tanggal selesai harus lebih besar dari tanggal mulai");
      }

      const [created] = await db.insert(vouchers).values({
        code,
        type: input.type,
        value: input.value.toString(),
        minOrder: input.minOrder.toString(),
        maxDiscount: input.maxDiscount ? input.maxDiscount.toString() : null,
        usageLimit: input.usageLimit,
        validFrom,
        validUntil,
        isActive: input.isActive,
      }).returning({ id: vouchers.id });

      await logAdminAction({
        ctx,
        action: "voucher.create",
        entityType: "voucher",
        entityId: created?.id,
        details: { code, type: input.type, value: input.value },
      });
      return { success: true };
    }),

  updateVoucher: adminQuery
    .input(
      z.object({
        id: z.number(),
        code: z.string().min(3).max(50),
        type: z.enum(["percent", "fixed"]),
        value: z.number().positive(),
        minOrder: z.number().min(0),
        maxDiscount: z.number().min(0).nullable().optional(),
        usageLimit: z.number().int().positive(),
        usageCount: z.number().int().min(0),
        validFrom: z.string().min(1),
        validUntil: z.string().min(1),
        isActive: z.boolean(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const validFrom = new Date(input.validFrom);
      const validUntil = new Date(input.validUntil);
      if (Number.isNaN(validFrom.getTime()) || Number.isNaN(validUntil.getTime())) {
        throw new Error("Tanggal voucher tidak valid");
      }
      if (validUntil <= validFrom) {
        throw new Error("Tanggal selesai harus lebih besar dari tanggal mulai");
      }

      await db
        .update(vouchers)
        .set({
          code: input.code.trim().toUpperCase(),
          type: input.type,
          value: input.value.toString(),
          minOrder: input.minOrder.toString(),
          maxDiscount: input.maxDiscount ? input.maxDiscount.toString() : null,
          usageLimit: input.usageLimit,
          usageCount: input.usageCount,
          validFrom,
          validUntil,
          isActive: input.isActive,
        })
        .where(eq(vouchers.id, input.id));

      await logAdminAction({
        ctx,
        action: "voucher.update",
        entityType: "voucher",
        entityId: input.id,
        details: { code: input.code.trim().toUpperCase(), isActive: input.isActive },
      });
      return { success: true };
    }),

  deleteVoucher: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      await db.delete(vouchers).where(eq(vouchers.id, input.id));
      await logAdminAction({
        ctx,
        action: "voucher.delete",
        entityType: "voucher",
        entityId: input.id,
      });
      return { success: true };
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
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const yearStart = new Date(today.getFullYear(), 0, 1);
    const recentRevenueRows = await db
      .select({
        baseAmount: transactions.baseAmount,
        totalAmount: transactions.totalAmount,
        providerResponse: transactions.providerResponse,
        productCost: products.basePrice,
        createdAt: transactions.createdAt,
      })
      .from(transactions)
      .leftJoin(products, eq(transactions.productId, products.id))
      .where(and(gte(transactions.createdAt, sevenDaysAgo), eq(transactions.paymentStatus, "paid")));
    const periodRows = await db
      .select({
        totalAmount: transactions.totalAmount,
        providerResponse: transactions.providerResponse,
        productCost: products.basePrice,
        status: transactions.status,
        createdAt: transactions.createdAt,
      })
      .from(transactions)
      .leftJoin(products, eq(transactions.productId, products.id))
      .where(and(gte(transactions.createdAt, yearStart), eq(transactions.paymentStatus, "paid")));

    const monthlySales = salesSummary(periodRows.filter((row) => row.createdAt >= monthStart));
    const yearlySales = salesSummary(periodRows);

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
        profit: rows.reduce(
          (sum, row) => sum + (transactionNetRevenue(row) - parseMoney(row.productCost)),
          0,
        ),
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
      monthlySales,
      yearlySales,
    };
  }),

  transactions: adminQuery
    .input(
      z.object({
        status: z.string().optional(),
        limit: z.number().default(MAX_PAGE_SIZE),
        offset: z.number().default(0),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = getDb();
      const limit = pageLimit(input?.limit);
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
          providerResponse: transactions.providerResponse,
          gameName: games.name,
          productName: products.name,
          methodName: paymentMethods.name,
          supplierProvider: transactions.supplierProvider,
          providerProductCode: transactions.providerProductCode,
          providerReference: transactions.providerReference,
        })
        .from(transactions)
        .leftJoin(games, eq(transactions.gameId, games.id))
        .leftJoin(products, eq(transactions.productId, products.id))
        .leftJoin(paymentMethods, eq(transactions.paymentMethodId, paymentMethods.id))
        .where(where)
        .orderBy(desc(transactions.createdAt))
        .limit(limit)
        .offset(offset);

      return {
        items: items.map(({ providerResponse, ...item }) => ({
          ...item,
          issue: transactionIssue(providerResponse),
        })),
        total: totalRow.count,
        limit,
        offset,
      };
    }),

  updateTransaction: adminQuery
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["pending", "processing", "success", "failed", "cancelled", "refunded"]),
        paymentStatus: z.enum(["unpaid", "paid", "expired", "refunded"]).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const updateData: any = { status: input.status };
      if (input.paymentStatus) updateData.paymentStatus = input.paymentStatus;

      await db
        .update(transactions)
        .set(updateData)
        .where(eq(transactions.id, input.id));

      await logAdminAction({
        ctx,
        action: "transaction.update",
        entityType: "transaction",
        entityId: input.id,
        details: { status: input.status, paymentStatus: input.paymentStatus },
      });
      return { success: true };
    }),

  retryTransactionOrder: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const result = await withTransactionLock(`admin-retry-order:${input.id}`, async (db) => {
        const [transaction] = await db
          .select({
            id: transactions.id,
            invoiceNumber: transactions.invoiceNumber,
            status: transactions.status,
            paymentStatus: transactions.paymentStatus,
            providerProductCode: transactions.providerProductCode,
            supplierProvider: transactions.supplierProvider,
            playerId: transactions.playerId,
            serverId: transactions.serverId,
            productId: transactions.productId,
            providerResponse: transactions.providerResponse,
            productCost: products.basePrice,
            supplierTargetFormat: products.supplierTargetFormat,
          })
          .from(transactions)
          .leftJoin(products, eq(transactions.productId, products.id))
          .where(eq(transactions.id, input.id))
          .limit(1);

        if (!transaction) throw new Error("Transaksi tidak ditemukan.");
        if (transaction.paymentStatus !== "paid") {
          throw new Error("Retry hanya bisa untuk transaksi yang pembayarannya sudah paid.");
        }
        if (transaction.status !== "failed") {
          throw new Error("Retry hanya bisa untuk transaksi berstatus failed.");
        }
        if (!transaction.providerProductCode) {
          throw new Error("Kode produk supplier kosong, retry tidak bisa dijalankan.");
        }

        const state = parseProviderState(transaction.providerResponse) as {
          retryAttempts?: number;
        };
        const retryAttempts = Number(state.retryAttempts || 0) + 1;
        const retryReference = `${transaction.invoiceNumber}-R${retryAttempts}`;

        let providerResponse = stringifyProviderState(transaction.providerResponse, {
          retryAttempts,
          lastRetryAt: new Date().toISOString(),
          lastRetryReference: retryReference,
        });

        try {
          const productOrder = await submitSupplierOrder({
            provider: transaction.supplierProvider,
            productCode: transaction.providerProductCode,
            productCost: Number(transaction.productCost || 0),
            playerId: transaction.playerId,
            serverId: transaction.serverId,
            invoiceNumber: retryReference,
            targetFormat: transaction.supplierTargetFormat,
          });
          const nextStatus = productOrder.status;
          providerResponse = stringifyProviderState(providerResponse, {
            productOrder,
            orderSubmitError: nextStatus === "failed"
              ? productOrder.provider === "flowix"
                ? productOrder.raw.note || "Order supplier gagal saat retry."
                : productOrder.raw.message || "Order supplier gagal saat retry."
              : undefined,
          });
          const finalProviderResponse =
            nextStatus === "success"
              ? await countVoucherUsageOnce(providerResponse) ?? providerResponse
              : providerResponse;

          await db
            .update(transactions)
            .set({
              status: nextStatus,
              providerResponse: finalProviderResponse,
              providerReference: productOrder.reference,
              ...(nextStatus === "success" ? { completedAt: new Date() } : {}),
            })
            .where(eq(transactions.id, transaction.id));

          return {
            success: nextStatus !== "failed",
            status: nextStatus,
            reference: productOrder.reference,
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : "Gagal retry order supplier.";
          providerResponse = stringifyProviderState(providerResponse, {
            orderSubmitError: message,
          });
          await db
            .update(transactions)
            .set({
              status: "failed",
              providerResponse,
            })
            .where(eq(transactions.id, transaction.id));
          return {
            success: false,
            status: "failed" as const,
            reference: retryReference,
            message,
          };
        }
      });

      await logAdminAction({
        ctx,
        action: "transaction.retry_order",
        entityType: "transaction",
        entityId: input.id,
        details: result,
      });

      return result;
    }),

  users: adminQuery
    .input(
      z.object({
        search: z.string().optional(),
        role: z.string().optional(),
        limit: z.number().default(MAX_PAGE_SIZE),
        offset: z.number().default(0),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = getDb();
      const limit = pageLimit(input?.limit);
      const offset = input?.offset || 0;
      const filters = [];

      if (input?.role) {
        filters.push(eq(users.role, input.role as "user" | "admin"));
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
        .where(eq(users.role, "admin"));
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
        username: z.string().min(3).max(255).optional(),
        name: z.string().max(255).nullable().optional(),
        email: z.string().email().or(z.literal("")).nullable().optional(),
        phone: z.string().max(30).nullable().optional(),
        avatar: z.string().max(500).nullable().optional(),
        role: z.enum(["user", "admin"]).optional(),
        isActive: z.boolean().optional(),
        newPassword: z.string().min(8).max(128).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const updateData: any = {};
      if (input.username !== undefined) updateData.username = input.username.trim();
      if (input.name !== undefined) updateData.name = input.name?.trim() || null;
      if (input.email !== undefined) updateData.email = input.email?.trim() || null;
      if (input.phone !== undefined) updateData.phone = input.phone ? normalizePhone(input.phone) || null : null;
      if (input.avatar !== undefined) updateData.avatar = input.avatar?.trim() || null;
      if (input.role) updateData.role = input.role;
      if (input.isActive !== undefined) updateData.isActive = input.isActive;
      if (input.newPassword) updateData.passwordHash = hashPassword(input.newPassword);

      await db.update(users).set(updateData).where(eq(users.id, input.id));
      await logAdminAction({
        ctx,
        action: "user.update",
        entityType: "user",
        entityId: input.id,
        details: {
          fields: Object.keys(updateData).filter((key) => key !== "passwordHash"),
          passwordChanged: !!input.newPassword,
        },
      });
      return { success: true };
    }),

  userById: adminQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const [user] = await db
        .select({
          id: users.id,
          username: users.username,
          name: users.name,
          email: users.email,
          phone: users.phone,
          avatar: users.avatar,
          role: users.role,
          balance: users.balance,
          isActive: users.isActive,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
          lastSignInAt: users.lastSignInAt,
        })
        .from(users)
        .where(eq(users.id, input.id))
        .limit(1);

      if (!user) throw new Error("User tidak ditemukan");
      return user;
    }),

  games: adminQuery
    .input(
      z.object({
        search: z.string().optional(),
        categoryId: z.number().optional(),
        limit: z.number().default(MAX_PAGE_SIZE),
        offset: z.number().default(0),
      }).optional(),
    )
    .query(async ({ input }) => {
      const db = getDb();
      const limit = pageLimit(input?.limit);
      const offset = input?.offset || 0;
      const filters = [inArray(games.publisher, ["Flowix", "Digiflazz"])];
      if (input?.search) {
        filters.push(ilike(games.name, `%${input.search}%`));
      }
      if (input?.categoryId) {
        filters.push(eq(games.categoryId, input.categoryId));
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
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const { id, ...updateData } = input;
      const values: typeof updateData & { isManuallyHidden?: boolean } = { ...updateData };
      if (input.isActive !== undefined) {
        values.isManuallyHidden = !input.isActive;
      }

      await db.update(games).set(values).where(eq(games.id, id));
      await logAdminAction({
        ctx,
        action: "game.update",
        entityType: "game",
        entityId: id,
        details: values,
      });
      return { success: true };
    }),

  products: adminQuery
    .input(
      z.object({
        gameId: z.number().optional(),
        categoryId: z.number().optional(),
        search: z.string().optional(),
        supplier: z.enum(["all", "flowix", "digiflazz", "unmapped", "inactive", "manualPrice"]).optional(),
        limit: z.number().default(MAX_PAGE_SIZE),
        offset: z.number().default(0),
      }).optional(),
    )
    .query(async ({ input }) => {
      const db = getDb();
      const limit = pageLimit(input?.limit);
      const offset = input?.offset || 0;
      const filters = [];
      if (input?.gameId) filters.push(eq(products.gameId, input.gameId));
      if (input?.categoryId) filters.push(eq(games.categoryId, input.categoryId));
      if (input?.search) {
        const search = `%${input.search}%`;
        filters.push(or(
          ilike(products.name, search),
          ilike(products.nominalAmount, search),
          ilike(products.supplierProductCode, search),
          ilike(products.supplierProductName, search),
          ilike(games.name, search),
        ));
      }
      if (input?.supplier === "flowix") filters.push(eq(products.supplierProvider, "flowix"));
      if (input?.supplier === "digiflazz") filters.push(eq(products.supplierProvider, "digiflazz"));
      if (input?.supplier === "unmapped") {
        filters.push(or(
          isNull(products.supplierProductCode),
          eq(products.supplierProductCode, ""),
          eq(products.supplierProvider, "flowix"),
        ));
      }
      if (input?.supplier === "inactive") filters.push(eq(products.isActive, false));
      if (input?.supplier === "manualPrice") filters.push(eq(products.isPriceManual, true));
      filters.push(inArray(games.publisher, ["Flowix", "Digiflazz"]));
      if (input?.supplier !== "inactive") filters.push(eq(games.isActive, true));

      const where = and(...filters);

      const items = await db
        .select({
          id: products.id,
          name: products.name,
          description: products.description,
          nominalAmount: products.nominalAmount,
          supplierProvider: products.supplierProvider,
          supplierProductCode: products.supplierProductCode,
          supplierProductName: products.supplierProductName,
          supplierTargetFormat: products.supplierTargetFormat,
          basePrice: products.basePrice,
          salePrice: products.salePrice,
          isPriceManual: products.isPriceManual,
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
        .orderBy(desc(products.isActive), products.sortOrder);

      const seen = new Set<string>();
      const uniqueItems = items.filter((item) => {
        const key = `${item.gameId}:${item.supplierProvider}:${item.supplierProductCode || item.nominalAmount || adminProductKey(item)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      return { items: uniqueItems.slice(offset, offset + limit), total: uniqueItems.length, limit, offset };
    }),

  bulkUpdateProducts: adminQuery
    .input(
      z.object({
        ids: z.array(z.number()).min(1).max(500),
        action: z.enum(["activate", "deactivate", "supplierFlowix", "supplierDigiflazz", "resetAutoPrice"]),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const updateData: any = {};
      if (input.action === "activate") {
        updateData.isActive = true;
        updateData.isManuallyHidden = false;
      }
      if (input.action === "deactivate") {
        updateData.isActive = false;
        updateData.isManuallyHidden = true;
      }
      if (input.action === "supplierFlowix") {
        updateData.supplierProvider = "flowix";
        updateData.supplierTargetFormat = "auto";
      }
      if (input.action === "supplierDigiflazz") {
        updateData.supplierProvider = "digiflazz";
      }
      if (input.action === "resetAutoPrice") {
        const commerceSettings = await getCommerceSettings();
        const rows = await db
          .select({ id: products.id, basePrice: products.basePrice })
          .from(products)
          .where(inArray(products.id, input.ids));
        for (const row of rows) {
          await db
            .update(products)
            .set({
              salePrice: priceWithMarkup(
                parseMoney(row.basePrice),
                commerceSettings.effectiveProductMarkupPercent,
              ).toString(),
              isPriceManual: false,
            })
            .where(eq(products.id, row.id));
        }
      } else {
        await db.update(products).set(updateData).where(inArray(products.id, input.ids));
      }

      await logAdminAction({
        ctx,
        action: "product.bulk_update",
        entityType: "product",
        details: { action: input.action, count: input.ids.length },
      });
      return { success: true, count: input.ids.length };
    }),

  updateProduct: adminQuery
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        basePrice: z.number().optional(),
        salePrice: z.number().optional(),
        resetAutoPrice: z.boolean().optional(),
        discountPercent: z.number().optional(),
        isPromo: z.boolean().optional(),
        stock: z.number().optional(),
        isActive: z.boolean().optional(),
        supplierProvider: z.enum(["flowix", "digiflazz"]).optional(),
        supplierProductCode: z.string().max(100).nullable().optional(),
        supplierProductName: z.string().max(255).nullable().optional(),
        supplierTargetFormat: z.enum(["auto", "player", "pipe", "dash", "space", "comma"]).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const { id, ...data } = input;
      const updateData: any = {};
      const [current] = await db.select().from(products).where(eq(products.id, id)).limit(1);
      if (!current) throw new Error("Produk tidak ditemukan");

      if (data.name) updateData.name = data.name;
      if (data.basePrice !== undefined) updateData.basePrice = data.basePrice.toString();
      if (data.resetAutoPrice) {
        const commerceSettings = await getCommerceSettings();
        const providerPrice = data.basePrice !== undefined ? data.basePrice : parseMoney(current.basePrice);
        updateData.salePrice = priceWithMarkup(
          providerPrice,
          commerceSettings.effectiveProductMarkupPercent,
        ).toString();
        updateData.isPriceManual = false;
      } else if (data.salePrice !== undefined) {
        updateData.salePrice = data.salePrice.toString();
        updateData.isPriceManual = true;
      }
      if (data.discountPercent !== undefined) updateData.discountPercent = data.discountPercent;
      if (data.isPromo !== undefined) updateData.isPromo = data.isPromo;
      if (data.stock !== undefined) updateData.stock = data.stock;
      if (data.supplierProvider !== undefined) updateData.supplierProvider = data.supplierProvider;
      if (data.supplierProductCode !== undefined) updateData.supplierProductCode = data.supplierProductCode?.trim() || null;
      if (data.supplierProductName !== undefined) updateData.supplierProductName = data.supplierProductName?.trim() || null;
      if (data.supplierTargetFormat !== undefined) updateData.supplierTargetFormat = data.supplierTargetFormat;
      if (data.isActive !== undefined) {
        updateData.isActive = data.isActive;
        updateData.isManuallyHidden = !data.isActive;
      }

      await db.update(products).set(updateData).where(eq(products.id, id));
      await logAdminAction({
        ctx,
        action: "product.update",
        entityType: "product",
        entityId: id,
        details: updateData,
      });
      return { success: true };
    }),

  banners: adminQuery.query(async () => {
    const db = getDb();
    return db.select().from(banners).orderBy(banners.sortOrder);
  }),

  createBanner: adminQuery
    .input(
      z.object({
        title: z.string().min(1).max(255),
        subtitle: z.string().max(500).nullable().optional(),
        image: z.string().max(500).nullable().optional(),
        link: z.string().max(500).nullable().optional(),
        position: z.enum(["hero", "promo", "sidebar"]),
        bgColor: z.string().max(20).nullable().optional(),
        textColor: z.string().max(20).nullable().optional(),
        sortOrder: z.number().int().default(0),
        isActive: z.boolean().default(true),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const [banner] = await db.insert(banners).values(input).returning();
      await logAdminAction({
        ctx,
        action: "banner.create",
        entityType: "banner",
        entityId: banner.id,
        details: input,
      });
      return banner;
    }),

  updateBanner: adminQuery
    .input(
      z.object({
        id: z.number(),
        title: z.string().min(1).max(255).optional(),
        subtitle: z.string().max(500).nullable().optional(),
        image: z.string().max(500).nullable().optional(),
        link: z.string().max(500).nullable().optional(),
        position: z.enum(["hero", "promo", "sidebar"]).optional(),
        bgColor: z.string().max(20).nullable().optional(),
        textColor: z.string().max(20).nullable().optional(),
        isActive: z.boolean().optional(),
        sortOrder: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const { id, ...data } = input;
      await db.update(banners).set(data).where(eq(banners.id, id));
      await logAdminAction({
        ctx,
        action: "banner.update",
        entityType: "banner",
        entityId: id,
        details: data,
      });
      return { success: true };
    }),

  deleteBanner: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      await db.delete(banners).where(eq(banners.id, input.id));
      await logAdminAction({
        ctx,
        action: "banner.delete",
        entityType: "banner",
        entityId: input.id,
      });
      return { success: true };
    }),

  faqs: adminQuery.query(async () => {
    const db = getDb();
    return db.select().from(faqs).orderBy(faqs.sortOrder);
  }),

  createFaq: adminQuery
    .input(
      z.object({
        question: z.string().min(1).max(500),
        answer: z.string().min(1).max(3000),
        category: z.string().min(1).max(100).default("general"),
        sortOrder: z.number().int().default(0),
        isActive: z.boolean().default(true),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const [faq] = await db.insert(faqs).values(input).returning();
      await logAdminAction({
        ctx,
        action: "faq.create",
        entityType: "faq",
        entityId: faq.id,
        details: input,
      });
      return faq;
    }),

  updateFaq: adminQuery
    .input(
      z.object({
        id: z.number(),
        question: z.string().min(1).max(500).optional(),
        answer: z.string().min(1).max(3000).optional(),
        category: z.string().min(1).max(100).optional(),
        sortOrder: z.number().int().optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const { id, ...data } = input;
      await db.update(faqs).set(data).where(eq(faqs.id, id));
      await logAdminAction({
        ctx,
        action: "faq.update",
        entityType: "faq",
        entityId: id,
        details: data,
      });
      return { success: true };
    }),

  deleteFaq: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      await db.delete(faqs).where(eq(faqs.id, input.id));
      await logAdminAction({
        ctx,
        action: "faq.delete",
        entityType: "faq",
        entityId: input.id,
      });
      return { success: true };
    }),

  logs: adminQuery
    .input(z.object({ limit: z.number().default(MAX_PAGE_SIZE) }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      return db
        .select()
        .from(activityLogs)
        .orderBy(desc(activityLogs.createdAt))
        .limit(pageLimit(input?.limit));
    }),
});
