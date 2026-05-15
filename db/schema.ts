import {
  pgTable,
  pgEnum,
  serial,
  varchar,
  text,
  timestamp,
  numeric,
  integer,
  boolean,
  jsonb,
  index,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["user", "admin", "superadmin"]);
export const platformEnum = pgEnum("platform", ["mobile", "pc", "console", "voucher"]);
export const paymentMethodTypeEnum = pgEnum("payment_method_type", ["qris", "ewallet", "va", "saldo"]);
export const transactionStatusEnum = pgEnum("transaction_status", ["pending", "processing", "success", "failed", "cancelled", "refunded"]);
export const paymentStatusEnum = pgEnum("payment_status", ["unpaid", "paid", "expired", "refunded"]);
export const voucherTypeEnum = pgEnum("voucher_type", ["percent", "fixed"]);
export const bannerPositionEnum = pgEnum("banner_position", ["hero", "promo", "sidebar"]);
export const settingTypeEnum = pgEnum("setting_type", ["string", "number", "boolean", "json"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  passwordHash: text("passwordHash"),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  avatar: text("avatar"),
  role: userRoleEnum("role").default("user").notNull(),
  balance: numeric("balance", { precision: 12, scale: 2 }).default("0").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
  lastSignInAt: timestamp("lastSignInAt").defaultNow().notNull(),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  icon: varchar("icon", { length: 100 }),
  sortOrder: integer("sortOrder").default(0),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const games = pgTable("games", {
  id: serial("id").primaryKey(),
  categoryId: integer("categoryId").references(() => categories.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  coverImage: varchar("coverImage", { length: 500 }),
  cardImage: varchar("cardImage", { length: 500 }),
  bannerImage: varchar("bannerImage", { length: 500 }),
  publisher: varchar("publisher", { length: 255 }),
  platform: platformEnum("platform").default("mobile").notNull(),
  isTrending: boolean("isTrending").default(false).notNull(),
  isPopular: boolean("isPopular").default(false).notNull(),
  isNew: boolean("isNew").default(false).notNull(),
  hasServerId: boolean("hasServerId").default(false).notNull(),
  serverIdLabel: varchar("serverIdLabel", { length: 100 }),
  serverIdPlaceholder: varchar("serverIdPlaceholder", { length: 100 }),
  sortOrder: integer("sortOrder").default(0),
  isActive: boolean("isActive").default(true).notNull(),
  isManuallyHidden: boolean("isManuallyHidden").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  gameId: integer("gameId").references(() => games.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  nominalAmount: varchar("nominalAmount", { length: 100 }),
  basePrice: numeric("basePrice", { precision: 12, scale: 2 }).notNull(),
  salePrice: numeric("salePrice", { precision: 12, scale: 2 }),
  discountPercent: integer("discountPercent").default(0),
  isPromo: boolean("isPromo").default(false).notNull(),
  stock: integer("stock").default(999),
  sortOrder: integer("sortOrder").default(0),
  isActive: boolean("isActive").default(true).notNull(),
  isManuallyHidden: boolean("isManuallyHidden").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

export const paymentMethods = pgTable("paymentMethods", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  type: paymentMethodTypeEnum("type").notNull(),
  icon: varchar("icon", { length: 100 }),
  feePercent: numeric("feePercent", { precision: 5, scale: 2 }).default("0"),
  feeFixed: numeric("feeFixed", { precision: 12, scale: 2 }).default("0"),
  isActive: boolean("isActive").default(true).notNull(),
  sortOrder: integer("sortOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("userId").references(() => users.id),
  invoiceNumber: varchar("invoiceNumber", { length: 50 }).notNull().unique(),
  gameId: integer("gameId").references(() => games.id).notNull(),
  productId: integer("productId").references(() => products.id),
  playerId: varchar("playerId", { length: 100 }).notNull(),
  serverId: varchar("serverId", { length: 100 }),
  paymentMethodId: integer("paymentMethodId").references(() => paymentMethods.id).notNull(),
  baseAmount: numeric("baseAmount", { precision: 12, scale: 2 }).notNull(),
  feeAmount: numeric("feeAmount", { precision: 12, scale: 2 }).default("0"),
  totalAmount: numeric("totalAmount", { precision: 12, scale: 2 }).notNull(),
  status: transactionStatusEnum("status").default("pending").notNull(),
  paymentStatus: paymentStatusEnum("paymentStatus").default("unpaid").notNull(),
  paidAt: timestamp("paidAt"),
  completedAt: timestamp("completedAt"),
  expiryAt: timestamp("expiryAt").notNull(),
  providerProductCode: varchar("providerProductCode", { length: 100 }),
  providerProductName: varchar("providerProductName", { length: 255 }),
  providerReference: varchar("providerReference", { length: 100 }),
  providerPaymentId: varchar("providerPaymentId", { length: 100 }),
  providerResponse: text("providerResponse"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_user_id").on(table.userId),
  index("idx_status").on(table.status),
  index("idx_payment_status").on(table.paymentStatus),
  index("idx_created_at").on(table.createdAt),
]);

export const vouchers = pgTable("vouchers", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  type: voucherTypeEnum("type").notNull(),
  value: numeric("value", { precision: 12, scale: 2 }).notNull(),
  minOrder: numeric("minOrder", { precision: 12, scale: 2 }).default("0").notNull(),
  maxDiscount: numeric("maxDiscount", { precision: 12, scale: 2 }),
  usageLimit: integer("usageLimit").default(1).notNull(),
  usageCount: integer("usageCount").default(0).notNull(),
  validFrom: timestamp("validFrom").notNull(),
  validUntil: timestamp("validUntil").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const banners = pgTable("banners", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  subtitle: varchar("subtitle", { length: 500 }),
  image: varchar("image", { length: 500 }),
  link: varchar("link", { length: 500 }),
  position: bannerPositionEnum("position").default("promo").notNull(),
  bgColor: varchar("bgColor", { length: 20 }),
  textColor: varchar("textColor", { length: 20 }),
  sortOrder: integer("sortOrder").default(0),
  isActive: boolean("isActive").default(true).notNull(),
  startDate: timestamp("startDate"),
  endDate: timestamp("endDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const faqs = pgTable("faqs", {
  id: serial("id").primaryKey(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  category: varchar("category", { length: 100 }).default("general"),
  sortOrder: integer("sortOrder").default(0),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const activityLogs = pgTable("activityLogs", {
  id: serial("id").primaryKey(),
  userId: integer("userId").references(() => users.id),
  action: varchar("action", { length: 100 }).notNull(),
  entityType: varchar("entityType", { length: 50 }),
  entityId: integer("entityId"),
  details: jsonb("details"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: varchar("userAgent", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const siteSettings = pgTable("siteSettings", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value"),
  type: settingTypeEnum("type").default("string").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type Game = typeof games.$inferSelect;
export type Product = typeof products.$inferSelect;
export type PaymentMethod = typeof paymentMethods.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Voucher = typeof vouchers.$inferSelect;
export type Banner = typeof banners.$inferSelect;
export type FAQ = typeof faqs.$inferSelect;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type SiteSetting = typeof siteSettings.$inferSelect;
