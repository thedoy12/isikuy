import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import {
  categories,
  games,
  products,
  paymentMethods,
  banners,
  faqs,
  siteSettings,
} from "@db/schema";
import { isFlowixConfigured } from "../flowix/client";
import { seedSupportContent } from "../queries/seedSupport";
import { syncFlowixCatalog } from "./game";
import { gameAssetPath } from "../lib/gameAssets";

const GAME_DATA = [
  {
    categorySlug: "mobile-games",
    name: "Mobile Legends",
    slug: "mobile-legends",
    description: "Top up Diamonds Mobile Legends untuk membeli skin, hero, dan item premium.",
    coverImage: "/aset/mobile-legends.png",
    cardImage: "/aset/mobile-legends.png",
    publisher: "Moonton",
    platform: "mobile" as const,
    isTrending: true,
    isPopular: true,
    hasServerId: true,
    serverIdLabel: "Server ID",
    serverIdPlaceholder: "e.g. 1234",
    sortOrder: 1,
  },
  {
    categorySlug: "mobile-games",
    name: "Free Fire",
    slug: "free-fire",
    description: "Top up Diamonds Free Fire untuk mendapatkan skin senjata, bundle, dan elite pass.",
    coverImage: "/aset/free-fire.png",
    cardImage: "/aset/free-fire.png",
    publisher: "Garena",
    platform: "mobile" as const,
    isTrending: true,
    isPopular: true,
    hasServerId: false,
    sortOrder: 2,
  },
  {
    categorySlug: "mobile-games",
    name: "PUBG Mobile",
    slug: "pubg-mobile",
    description: "Top up UC PUBG Mobile untuk membeli Royale Pass, skin, dan crate.",
    coverImage: "/aset/pubg-mobile.png",
    cardImage: "/aset/pubg-mobile.png",
    publisher: "Tencent",
    platform: "mobile" as const,
    isTrending: true,
    isPopular: true,
    hasServerId: false,
    sortOrder: 3,
  },
  {
    categorySlug: "pc-games",
    name: "Valorant",
    slug: "valorant",
    description: "Top up Valorant Points untuk membeli skin senjata, battle pass, dan agent.",
    coverImage: "/aset/valorant.png",
    cardImage: "/aset/valorant.png",
    publisher: "Riot Games",
    platform: "pc" as const,
    isTrending: true,
    isPopular: true,
    isNew: true,
    hasServerId: false,
    sortOrder: 4,
  },
  {
    categorySlug: "pc-games",
    name: "Roblox",
    slug: "roblox",
    description: "Top up Robux untuk membeli game pass, avatar items, dan premium features.",
    coverImage: "/aset/roblox.png",
    cardImage: "/aset/roblox.png",
    publisher: "Roblox Corp",
    platform: "pc" as const,
    isPopular: true,
    hasServerId: false,
    sortOrder: 5,
  },
  {
    categorySlug: "pc-games",
    name: "Genshin Impact",
    slug: "genshin-impact",
    description: "Top up Genesis Crystals untuk membeli primogems, welkin moon, dan bundle.",
    coverImage: "/aset/genshin-impact.png",
    cardImage: "/aset/genshin-impact.png",
    publisher: "HoYoverse",
    platform: "pc" as const,
    isTrending: true,
    isPopular: true,
    isNew: true,
    hasServerId: true,
    serverIdLabel: "Server",
    serverIdPlaceholder: "e.g. Asia",
    sortOrder: 6,
  },
  {
    categorySlug: "voucher",
    name: "Steam Wallet",
    slug: "steam-wallet",
    description: "Isi saldo Steam Wallet untuk membeli game, DLC, dan item di Steam.",
    coverImage: "/games/steam-wallet.jpg",
    cardImage: "/games/steam-wallet.jpg",
    publisher: "Valve",
    platform: "pc" as const,
    isPopular: true,
    hasServerId: false,
    sortOrder: 7,
  },
  {
    categorySlug: "mobile-games",
    name: "Call of Duty Mobile",
    slug: "cod-mobile",
    description: "Top up CP Call of Duty Mobile untuk membeli battle pass, draw, dan bundle.",
    coverImage: "/games/cod-mobile.jpg",
    cardImage: "/games/cod-mobile.jpg",
    publisher: "Activision",
    platform: "mobile" as const,
    isPopular: true,
    hasServerId: false,
    sortOrder: 8,
  },
  {
    categorySlug: "mobile-games",
    name: "League of Legends: Wild Rift",
    slug: "wild-rift",
    description: "Top up Wild Cores untuk membeli skin champion, battle pass, dan emotes.",
    coverImage: "/aset/wild-rift.png",
    cardImage: "/aset/wild-rift.png",
    publisher: "Riot Games",
    platform: "mobile" as const,
    isPopular: true,
    isNew: true,
    hasServerId: false,
    sortOrder: 9,
  },
  {
    categorySlug: "mobile-games",
    name: "Arena of Valor",
    slug: "aov",
    description: "Top up Vouchers AOV untuk membeli skin hero, arcana, dan battle pass.",
    coverImage: "/aset/aov.png",
    cardImage: "/aset/aov.png",
    publisher: "Garena",
    platform: "mobile" as const,
    hasServerId: true,
    serverIdLabel: "Server",
    serverIdPlaceholder: "e.g. 1",
    sortOrder: 10,
  },
  {
    categorySlug: "mobile-games",
    name: "Honor of Kings",
    slug: "honor-of-kings",
    description: "Top up Tokens Honor of Kings untuk membeli skin hero dan battle pass.",
    coverImage: "/aset/honor-of-kings.png",
    cardImage: "/aset/honor-of-kings.png",
    publisher: "Level Infinite",
    platform: "mobile" as const,
    isNew: true,
    hasServerId: true,
    serverIdLabel: "Server ID",
    serverIdPlaceholder: "e.g. 12345",
    sortOrder: 11,
  },
  {
    categorySlug: "pc-games",
    name: "Point Blank",
    slug: "point-blank",
    description: "Top up Cash PB untuk membeli senjata permanen, character, dan item.",
    coverImage: "/aset/point-blank.png",
    cardImage: "/aset/point-blank.png",
    publisher: "Zepetto",
    platform: "pc" as const,
    hasServerId: false,
    sortOrder: 12,
  },
  {
    categorySlug: "voucher",
    name: "Google Play",
    slug: "google-play",
    description: "Voucher Google Play untuk membeli aplikasi, game, dan konten digital.",
    coverImage: "/games/google-play.jpg",
    cardImage: "/games/google-play.jpg",
    publisher: "Google",
    platform: "voucher" as const,
    isPopular: true,
    hasServerId: false,
    sortOrder: 13,
  },
  {
    categorySlug: "streaming",
    name: "Netflix",
    slug: "netflix",
    description: "Voucher Netflix untuk berlangganan streaming film dan series.",
    coverImage: "/games/netflix.jpg",
    cardImage: "/games/netflix.jpg",
    publisher: "Netflix Inc",
    platform: "voucher" as const,
    isPopular: true,
    hasServerId: false,
    sortOrder: 14,
  },
  {
    categorySlug: "streaming",
    name: "Spotify",
    slug: "spotify",
    description: "Voucher Spotify Premium untuk streaming musik tanpa iklan.",
    coverImage: "/games/spotify.jpg",
    cardImage: "/games/spotify.jpg",
    publisher: "Spotify AB",
    platform: "voucher" as const,
    hasServerId: false,
    sortOrder: 15,
  },
  {
    categorySlug: "mobile-games",
    name: "Sausage Man",
    slug: "sausage-man",
    description: "Top up Candy Sausage Man untuk membeli skin, costume, dan battle pass.",
    coverImage: "/aset/sausage-man.png",
    cardImage: "/aset/sausage-man.png",
    publisher: "XD Entertainment",
    platform: "mobile" as const,
    isNew: true,
    hasServerId: false,
    sortOrder: 16,
  },
];

export const seedRouter = createRouter({
  run: publicQuery.mutation(async () => {
    const db = getDb();

    try {
      if (isFlowixConfigured()) {
        const result = await syncFlowixCatalog();
        await seedSupportContent();
        return {
          success: true,
          message: "Catalog synced successfully",
          games: result.games.length,
        };
      }

      // Check if data already exists
      const existingCats = await db.select().from(categories).limit(1);
      if (existingCats.length > 0) {
        await seedSupportContent();
        return { success: false, message: "Database already seeded" };
      }

      // Seed categories
      const catValues = [
        { name: "Mobile Games", slug: "mobile-games", icon: "Smartphone", sortOrder: 1 },
        { name: "PC Games", slug: "pc-games", icon: "Monitor", sortOrder: 2 },
        { name: "Console", slug: "console", icon: "Gamepad2", sortOrder: 3 },
        { name: "Voucher", slug: "voucher", icon: "Ticket", sortOrder: 4 },
        { name: "Streaming", slug: "streaming", icon: "Play", sortOrder: 5 },
        { name: "Social", slug: "social", icon: "MessageCircle", sortOrder: 6 },
        { name: "Utility", slug: "utility", icon: "Zap", sortOrder: 7 },
      ];
      const catResults = await db.insert(categories).values(catValues).returning({ id: categories.id });

      const catMap = new Map<string, number>();
      for (let i = 0; i < catValues.length; i++) {
        catMap.set(catValues[i].slug, catResults[i].id);
      }

      // Seed games
      const gameValues = GAME_DATA.map((g) => ({
        categoryId: catMap.get(g.categorySlug) || catResults[0].id,
        name: g.name,
        slug: g.slug,
        description: g.description,
        coverImage: gameAssetPath(g.slug, g.name) ?? g.coverImage,
        cardImage: gameAssetPath(g.slug, g.name) ?? g.cardImage,
        publisher: g.publisher,
        platform: g.platform,
        isTrending: g.isTrending || false,
        isPopular: g.isPopular || false,
        isNew: g.isNew || false,
        hasServerId: g.hasServerId,
        serverIdLabel: g.serverIdLabel || null,
        serverIdPlaceholder: g.serverIdPlaceholder || null,
        sortOrder: g.sortOrder,
      }));

      const gameResults = await db.insert(games).values(gameValues).returning({ id: games.id });

      // Seed products
      const priceData = [
        { name: "Starter Pack", nominal: "Small", price: "15000" },
        { name: "Basic Pack", nominal: "Medium", price: "45000" },
        { name: "Popular Pack", nominal: "Large", price: "90000", promo: true, discount: 5 },
        { name: "Premium Pack", nominal: "XL", price: "150000", promo: true, discount: 8 },
        { name: "Mega Pack", nominal: "XXL", price: "300000", promo: true, discount: 10 },
        { name: "Ultimate Pack", nominal: "MAX", price: "500000", promo: true, discount: 12 },
      ];

      const productValues = [];
      for (let i = 0; i < gameResults.length; i++) {
        for (const p of priceData) {
          productValues.push({
            gameId: gameResults[i].id,
            name: p.name,
            description: `${p.nominal} top-up package`,
            nominalAmount: p.nominal,
            basePrice: p.price,
            salePrice: p.discount ? String(Math.round(parseInt(p.price) * (100 - p.discount) / 100)) : p.price,
            discountPercent: p.discount || 0,
            isPromo: p.promo || false,
            sortOrder: priceData.indexOf(p),
          });
        }
      }
      await db.insert(products).values(productValues);

      // Seed payment methods
      await db.insert(paymentMethods).values([
        { name: "QRIS", code: "qris", type: "qris", icon: "QrCode", feePercent: "0", feeFixed: "0", sortOrder: 1 },
      ]);

      // Seed banners
      await db.insert(banners).values([
        { title: "HOT PROMO RAMADHAN", subtitle: "Diskon hingga 25% untuk top-up semua game mobile", position: "hero", bgColor: "#ff003c", textColor: "#ffffff", sortOrder: 1 },
        { title: "CASHBACK 10%", subtitle: "Dapatkan cashback 10% untuk transaksi pertama kali", position: "promo", bgColor: "#11131a", textColor: "#00f0ff", sortOrder: 2 },
        { title: "NEW GAME: HONOR OF KINGS", subtitle: "Top up sekarang dan dapatkan bonus 20%", position: "promo", bgColor: "#b30029", textColor: "#ffffff", sortOrder: 3 },
      ]);

      // Seed FAQs
      await db.insert(faqs).values([
        { question: "Bagaimana cara melakukan top-up?", answer: "Pilih game yang ingin di-top-up, pilih nominal, masukkan Player ID, lalu klik Bayar. Selesaikan pembayaran QRIS dan top-up akan diproses otomatis.", category: "general", sortOrder: 1 },
        { question: "Berapa lama proses top-up?", answer: "Proses top-up biasanya memakan waktu 1-5 menit setelah pembayaran berhasil. Dalam kondisi normal, top-up akan masuk ke akun game Anda kurang dari 3 menit.", category: "general", sortOrder: 2 },
        { question: "Apakah transaksi di sini aman?", answer: "Ya, 100% aman. Kami menggunakan enkripsi SSL 256-bit untuk melindungi data Anda. Semua transaksi diproses secara otomatis tanpa intervensi manual.", category: "general", sortOrder: 3 },
        { question: "Metode pembayaran apa saja yang tersedia?", answer: "Saat ini checkout publik menggunakan QRIS. Metode lain dapat ditambahkan setelah kanal pembayaran aktif dan terkonfigurasi.", category: "payment", sortOrder: 4 },
        { question: "Bagaimana jika top-up gagal?", answer: "Jika top-up gagal, uang Anda akan dikembalikan secara otomatis ke metode pembayaran yang digunakan. Proses refund memakan waktu 1x24 jam.", category: "payment", sortOrder: 5 },
      ]);

      // Seed site settings
      await db.insert(siteSettings).values([
        { key: "siteName", value: "ISIKUY TOPUP", type: "string" },
        { key: "siteTagline", value: "The Premier Top-Up Experience", type: "string" },
        { key: "contactEmail", value: "support@isikuy.id", type: "string" },
        { key: "contactPhone", value: "+62 812-3456-7890", type: "string" },
        { key: "whatsappNumber", value: "+6281234567890", type: "string" },
        { key: "maintenanceMode", value: "false", type: "boolean" },
      ]);

      return { success: true, message: "Database seeded successfully", games: gameResults.length };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }),
});
