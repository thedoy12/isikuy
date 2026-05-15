import { getDb } from "../api/queries/connection";
import {
  categories,
  games,
  products,
  paymentMethods,
  banners,
  faqs,
  siteSettings,
} from "./schema";
import { isFlowixConfigured } from "../api/flowix/client";
import { gameAssetPath } from "../api/lib/gameAssets";
import { seedSupportContent } from "../api/queries/seedSupport";
import { syncFlowixCatalog } from "../api/routers/game";

async function seed() {
  const db = getDb();

  if (isFlowixConfigured()) {
    const result = await syncFlowixCatalog();
    await seedSupportContent();
    console.log(`Synced Flowix catalog: ${result.games.length} catalogs / ${result.productCodes.length} products`);
    console.log("Seeded support content");
    return;
  }

  const existingCategories = await db.select().from(categories).limit(1);
  if (existingCategories.length > 0) {
    await seedSupportContent();
    console.log("Database already seeded. Support content checked.");
    return;
  }

  // Seed categories
  const cats = await db.insert(categories).values([
    { name: "Mobile Games", slug: "mobile-games", icon: "Smartphone", sortOrder: 1 },
    { name: "PC Games", slug: "pc-games", icon: "Monitor", sortOrder: 2 },
    { name: "Console", slug: "console", icon: "Gamepad2", sortOrder: 3 },
    { name: "Voucher", slug: "voucher", icon: "Ticket", sortOrder: 4 },
    { name: "Streaming", slug: "streaming", icon: "Play", sortOrder: 5 },
    { name: "Social", slug: "social", icon: "MessageCircle", sortOrder: 6 },
    { name: "Utility", slug: "utility", icon: "Zap", sortOrder: 7 },
  ]).returning({ id: categories.id });
  console.log("Seeded categories:", cats.length);

  // Seed games
  const seededGames = await db.insert(games).values([
    {
      categoryId: cats[0].id,
      name: "Mobile Legends",
      slug: "mobile-legends",
      description: "Top up Diamonds Mobile Legends untuk membeli skin, hero, dan item premium.",
      coverImage: gameAssetPath("mobile-legends"),
      cardImage: gameAssetPath("mobile-legends"),
      publisher: "Moonton",
      platform: "mobile",
      isTrending: true,
      isPopular: true,
      hasServerId: true,
      serverIdLabel: "Server ID",
      serverIdPlaceholder: "e.g. 1234",
      sortOrder: 1,
    },
    {
      categoryId: cats[0].id,
      name: "Free Fire",
      slug: "free-fire",
      description: "Top up Diamonds Free Fire untuk mendapatkan skin senjata, bundle, dan elite pass.",
      coverImage: gameAssetPath("free-fire"),
      cardImage: gameAssetPath("free-fire"),
      publisher: "Garena",
      platform: "mobile",
      isTrending: true,
      isPopular: true,
      hasServerId: false,
      sortOrder: 2,
    },
    {
      categoryId: cats[0].id,
      name: "PUBG Mobile",
      slug: "pubg-mobile",
      description: "Top up UC PUBG Mobile untuk membeli Royale Pass, skin, dan crate.",
      coverImage: gameAssetPath("pubg-mobile"),
      cardImage: gameAssetPath("pubg-mobile"),
      publisher: "Tencent",
      platform: "mobile",
      isTrending: true,
      isPopular: true,
      hasServerId: false,
      sortOrder: 3,
    },
    {
      categoryId: cats[1].id,
      name: "Valorant",
      slug: "valorant",
      description: "Top up Valorant Points untuk membeli skin senjata, battle pass, dan agent.",
      coverImage: gameAssetPath("valorant"),
      cardImage: gameAssetPath("valorant"),
      publisher: "Riot Games",
      platform: "pc",
      isTrending: true,
      isPopular: true,
      isNew: true,
      hasServerId: false,
      sortOrder: 4,
    },
    {
      categoryId: cats[1].id,
      name: "Roblox",
      slug: "roblox",
      description: "Top up Robux untuk membeli game pass, avatar items, dan premium features.",
      coverImage: gameAssetPath("roblox"),
      cardImage: gameAssetPath("roblox"),
      publisher: "Roblox Corp",
      platform: "pc",
      isTrending: false,
      isPopular: true,
      hasServerId: false,
      sortOrder: 5,
    },
    {
      categoryId: cats[1].id,
      name: "Genshin Impact",
      slug: "genshin-impact",
      description: "Top up Genesis Crystals untuk membeli primogems, welkin moon, dan bundle.",
      coverImage: gameAssetPath("genshin-impact"),
      cardImage: gameAssetPath("genshin-impact"),
      publisher: "HoYoverse",
      platform: "pc",
      isTrending: true,
      isPopular: true,
      isNew: true,
      hasServerId: true,
      serverIdLabel: "Server",
      serverIdPlaceholder: "e.g. Asia",
      sortOrder: 6,
    },
    {
      categoryId: cats[3].id,
      name: "Steam Wallet",
      slug: "steam-wallet",
      description: "Isi saldo Steam Wallet untuk membeli game, DLC, dan item di Steam.",
      coverImage: "/games/steam-wallet.jpg",
      cardImage: "/games/steam-wallet.jpg",
      publisher: "Valve",
      platform: "pc",
      isTrending: false,
      isPopular: true,
      hasServerId: false,
      sortOrder: 7,
    },
    {
      categoryId: cats[0].id,
      name: "Call of Duty Mobile",
      slug: "cod-mobile",
      description: "Top up CP Call of Duty Mobile untuk membeli battle pass, draw, dan bundle.",
      coverImage: "/games/cod-mobile.jpg",
      cardImage: "/games/cod-mobile.jpg",
      publisher: "Activision",
      platform: "mobile",
      isTrending: false,
      isPopular: true,
      hasServerId: false,
      sortOrder: 8,
    },
    {
      categoryId: cats[0].id,
      name: "League of Legends: Wild Rift",
      slug: "wild-rift",
      description: "Top up Wild Cores untuk membeli skin champion, battle pass, dan emotes.",
      coverImage: gameAssetPath("wild-rift"),
      cardImage: gameAssetPath("wild-rift"),
      publisher: "Riot Games",
      platform: "mobile",
      isTrending: false,
      isPopular: true,
      isNew: true,
      hasServerId: false,
      sortOrder: 9,
    },
    {
      categoryId: cats[0].id,
      name: "Arena of Valor",
      slug: "aov",
      description: "Top up Vouchers AOV untuk membeli skin hero, arcana, dan battle pass.",
      coverImage: gameAssetPath("aov"),
      cardImage: gameAssetPath("aov"),
      publisher: "Garena",
      platform: "mobile",
      isTrending: false,
      isPopular: false,
      hasServerId: true,
      serverIdLabel: "Server",
      serverIdPlaceholder: "e.g. 1",
      sortOrder: 10,
    },
    {
      categoryId: cats[0].id,
      name: "Honor of Kings",
      slug: "honor-of-kings",
      description: "Top up Tokens Honor of Kings untuk membeli skin hero dan battle pass.",
      coverImage: gameAssetPath("honor-of-kings"),
      cardImage: gameAssetPath("honor-of-kings"),
      publisher: "Level Infinite",
      platform: "mobile",
      isTrending: false,
      isPopular: false,
      isNew: true,
      hasServerId: true,
      serverIdLabel: "Server ID",
      serverIdPlaceholder: "e.g. 12345",
      sortOrder: 11,
    },
    {
      categoryId: cats[1].id,
      name: "Point Blank",
      slug: "point-blank",
      description: "Top up Cash PB untuk membeli senjata permanen, character, dan item.",
      coverImage: gameAssetPath("point-blank"),
      cardImage: gameAssetPath("point-blank"),
      publisher: "Zepetto",
      platform: "pc",
      isTrending: false,
      isPopular: false,
      hasServerId: false,
      sortOrder: 12,
    },
    {
      categoryId: cats[3].id,
      name: "Google Play",
      slug: "google-play",
      description: "Voucher Google Play untuk membeli aplikasi, game, dan konten digital.",
      coverImage: "/games/google-play.jpg",
      cardImage: "/games/google-play.jpg",
      publisher: "Google",
      platform: "voucher",
      isTrending: false,
      isPopular: true,
      hasServerId: false,
      sortOrder: 13,
    },
    {
      categoryId: cats[4].id,
      name: "Netflix",
      slug: "netflix",
      description: "Voucher Netflix untuk berlangganan streaming film dan series.",
      coverImage: "/games/netflix.jpg",
      cardImage: "/games/netflix.jpg",
      publisher: "Netflix Inc",
      platform: "voucher",
      isTrending: false,
      isPopular: true,
      hasServerId: false,
      sortOrder: 14,
    },
    {
      categoryId: cats[4].id,
      name: "Spotify",
      slug: "spotify",
      description: "Voucher Spotify Premium untuk streaming musik tanpa iklan.",
      coverImage: "/games/spotify.jpg",
      cardImage: "/games/spotify.jpg",
      publisher: "Spotify AB",
      platform: "voucher",
      isTrending: false,
      isPopular: false,
      hasServerId: false,
      sortOrder: 15,
    },
    {
      categoryId: cats[0].id,
      name: "Sausage Man",
      slug: "sausage-man",
      description: "Top up Candy Sausage Man untuk membeli skin, costume, dan battle pass.",
      coverImage: gameAssetPath("sausage-man"),
      cardImage: gameAssetPath("sausage-man"),
      publisher: "XD Entertainment",
      platform: "mobile",
      isTrending: false,
      isPopular: false,
      isNew: true,
      hasServerId: false,
      sortOrder: 16,
    },
  ]).returning({ id: games.id });
  console.log("Seeded games:", seededGames.length);

  // Seed products for each game
  const gameProducts = [];
  for (const game of seededGames) {
    const prices = [
      { name: "Starter Pack", nominal: "Small", price: "15000" },
      { name: "Basic Pack", nominal: "Medium", price: "45000" },
      { name: "Popular Pack", nominal: "Large", price: "90000", promo: true, discount: 5 },
      { name: "Premium Pack", nominal: "XL", price: "150000", promo: true, discount: 8 },
      { name: "Mega Pack", nominal: "XXL", price: "300000", promo: true, discount: 10 },
      { name: "Ultimate Pack", nominal: "MAX", price: "500000", promo: true, discount: 12 },
    ];
    for (const p of prices) {
      gameProducts.push({
        gameId: game.id,
        name: p.name,
        description: `${p.nominal} top-up package`,
        nominalAmount: p.nominal,
        basePrice: p.price,
        salePrice: p.discount ? String(Math.round(parseInt(p.price) * (100 - p.discount) / 100)) : p.price,
        discountPercent: p.discount || 0,
        isPromo: p.promo || false,
        sortOrder: prices.indexOf(p),
      });
    }
  }
  await db.insert(products).values(gameProducts);
  console.log("Seeded products:", gameProducts.length);

  // Seed payment methods
  await db.insert(paymentMethods).values([
    { name: "QRIS", code: "qris", type: "qris", icon: "QrCode", feePercent: "1.00", feeFixed: "0", sortOrder: 1 },
  ]);
  console.log("Seeded payment methods");

  // Seed banners
  await db.insert(banners).values([
    {
      title: "HOT PROMO RAMADHAN",
      subtitle: "Diskon hingga 25% untuk top-up semua game mobile",
      position: "hero",
      bgColor: "#ff003c",
      textColor: "#ffffff",
      sortOrder: 1,
      isActive: true,
    },
    {
      title: "CASHBACK 10%",
      subtitle: "Dapatkan cashback 10% untuk transaksi pertama kali",
      position: "promo",
      bgColor: "#11131a",
      textColor: "#00f0ff",
      sortOrder: 2,
      isActive: true,
    },
    {
      title: "NEW GAME: HONOR OF KINGS",
      subtitle: "Top up sekarang dan dapatkan bonus 20%",
      position: "promo",
      bgColor: "#b30029",
      textColor: "#ffffff",
      sortOrder: 3,
      isActive: true,
    },
  ]);
  console.log("Seeded banners");

  // Seed FAQs
  await db.insert(faqs).values([
    {
      question: "Bagaimana cara melakukan top-up?",
      answer: "Pilih game yang ingin di-top-up, pilih nominal, masukkan Player ID, lalu klik Bayar. Selesaikan pembayaran QRIS dan top-up akan diproses otomatis.",
      category: "general",
      sortOrder: 1,
    },
    {
      question: "Berapa lama proses top-up?",
      answer: "Proses top-up biasanya memakan waktu 1-5 menit setelah pembayaran berhasil. Dalam kondisi normal, top-up akan masuk ke akun game Anda kurang dari 3 menit.",
      category: "general",
      sortOrder: 2,
    },
    {
      question: "Apakah transaksi di sini aman?",
      answer: "Ya, 100% aman. Kami menggunakan enkripsi SSL 256-bit untuk melindungi data Anda. Semua transaksi diproses secara otomatis tanpa intervensi manual.",
      category: "general",
      sortOrder: 3,
    },
    {
      question: "Metode pembayaran apa saja yang tersedia?",
      answer: "Saat ini checkout aktif menggunakan QRIS.",
      category: "payment",
      sortOrder: 4,
    },
    {
      question: "Bagaimana jika top-up gagal?",
      answer: "Jika top-up gagal, uang Anda akan dikembalikan secara otomatis ke metode pembayaran yang digunakan. Proses refund memakan waktu 1x24 jam.",
      category: "payment",
      sortOrder: 5,
    },
  ]);
  console.log("Seeded FAQs");

  // Seed site settings
  await db.insert(siteSettings).values([
    { key: "siteName", value: "ISIKUY TOPUP", type: "string" },
    { key: "siteTagline", value: "The Premier Top-Up Experience", type: "string" },
    { key: "contactEmail", value: "support@isikuy.id", type: "string" },
    { key: "contactPhone", value: "+62 812-3456-7890", type: "string" },
    { key: "whatsappNumber", value: "+6281234567890", type: "string" },
    { key: "instagramUrl", value: "https://instagram.com/isikuytopup", type: "string" },
    { key: "telegramUrl", value: "https://t.me/isikuytopup", type: "string" },
    { key: "facebookUrl", value: "https://facebook.com/isikuytopup", type: "string" },
    { key: "maintenanceMode", value: "false", type: "boolean" },
    { key: "qrisMerchantId", value: "ISIKUY001", type: "string" },
    { key: "minTransaction", value: "10000", type: "number" },
    { key: "maxTransaction", value: "10000000", type: "number" },
  ]);
  console.log("Seeded site settings");

  console.log("Seed completed successfully!");
}

seed().catch(console.error);
