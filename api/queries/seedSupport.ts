import { banners, faqs, paymentMethods, siteSettings } from "@db/schema";
import { getDb } from "./connection";

export async function seedSupportContent() {
  const db = getDb();

  const existingPaymentMethods = await db.select().from(paymentMethods).limit(1);
  if (existingPaymentMethods.length === 0) {
    await db.insert(paymentMethods).values([
      { name: "QRIS", code: "qris", type: "qris", icon: "QrCode", feePercent: "1.00", feeFixed: "0", sortOrder: 1 },
      { name: "GoPay", code: "gopay", type: "ewallet", icon: "Wallet", feePercent: "2.00", feeFixed: "0", sortOrder: 2 },
      { name: "OVO", code: "ovo", type: "ewallet", icon: "CreditCard", feePercent: "2.00", feeFixed: "0", sortOrder: 3 },
      { name: "DANA", code: "dana", type: "ewallet", icon: "Wallet", feePercent: "1.50", feeFixed: "0", sortOrder: 4 },
      { name: "Virtual Account", code: "va", type: "va", icon: "Landmark", feePercent: "0", feeFixed: "4000", sortOrder: 5 },
      { name: "Saldo Internal", code: "saldo", type: "saldo", icon: "Wallet", feePercent: "0", feeFixed: "0", sortOrder: 6 },
    ]);
  }

  const existingBanners = await db.select().from(banners).limit(1);
  if (existingBanners.length === 0) {
    await db.insert(banners).values([
      { title: "HOT PROMO", subtitle: "Produk game, pulsa, dan e-wallet dari Flowix", position: "hero", bgColor: "#ff003c", textColor: "#ffffff", sortOrder: 1, isActive: true },
      { title: "KATALOG FLOWIX", subtitle: "Harga dan produk tersinkron otomatis", position: "promo", bgColor: "#11131a", textColor: "#00f0ff", sortOrder: 2, isActive: true },
      { title: "PEMBAYARAN CEPAT", subtitle: "Checkout QRIS dan metode pembayaran lain", position: "promo", bgColor: "#b30029", textColor: "#ffffff", sortOrder: 3, isActive: true },
    ]);
  }

  const existingFaqs = await db.select().from(faqs).limit(1);
  if (existingFaqs.length === 0) {
    await db.insert(faqs).values([
      { question: "Bagaimana cara melakukan top-up?", answer: "Pilih produk, pilih nominal, masukkan tujuan, pilih metode pembayaran, lalu ikuti instruksi pembayaran.", category: "general", sortOrder: 1 },
      { question: "Produk berasal dari mana?", answer: "Katalog game, pulsa, paket data, e-wallet, voucher, dan PLN disinkronkan dari Flowix.", category: "general", sortOrder: 2 },
      { question: "Berapa lama proses top-up?", answer: "Pesanan diproses setelah pembayaran berhasil. Waktu proses mengikuti status dan respons provider.", category: "general", sortOrder: 3 },
      { question: "Metode pembayaran apa saja yang tersedia?", answer: "Metode pembayaran aktif dapat dilihat saat checkout.", category: "payment", sortOrder: 4 },
      { question: "Bagaimana jika top-up gagal?", answer: "Silakan cek riwayat transaksi dan hubungi support dengan nomor invoice jika status belum berubah.", category: "payment", sortOrder: 5 },
    ]);
  }

  const existingSettings = await db.select().from(siteSettings).limit(1);
  if (existingSettings.length === 0) {
    await db.insert(siteSettings).values([
      { key: "siteName", value: "ISIKUY TOPUP", type: "string" },
      { key: "siteTagline", value: "The Premier Top-Up Experience", type: "string" },
      { key: "contactEmail", value: "support@isikuy.id", type: "string" },
      { key: "contactPhone", value: "+62 812-3456-7890", type: "string" },
      { key: "whatsappNumber", value: "+6281234567890", type: "string" },
      { key: "maintenanceMode", value: "false", type: "boolean" },
    ]);
  }
}
