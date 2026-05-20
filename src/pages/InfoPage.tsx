import { useEffect } from "react";
import { Link, useLocation } from "react-router";
import {
  ChevronRight,
  Clock,
  Gamepad2,
  Mail,
  MessageCircle,
  Shield,
  Zap,
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { trpc } from "@/providers/trpc";

const WHATSAPP_NUMBER = "62895393061538";
const DISPLAY_PHONE = "0895393061538";
const SUPPORT_EMAIL = "putradadoy@gmail.com";

type PageContent = {
  eyebrow: string;
  title: string;
  description: string;
  sections: Array<{
    title: string;
    body: string;
  }>;
};

const pages: Record<string, PageContent> = {
  tentang: {
    eyebrow: "Tentang ISIKUY",
    title: "Top up game cepat dengan katalog yang rapi.",
    description:
      "ISIKUY adalah platform top up game, pulsa, e-wallet, dan voucher digital untuk pemain Indonesia yang butuh proses praktis dan bantuan yang jelas.",
    sections: [
      {
        title: "Fokus layanan",
        body: "Kami membantu pembelian produk digital populer seperti Mobile Legends, Free Fire, PUBG Mobile, Valorant, Genshin Impact, e-wallet, dan pulsa dalam alur checkout yang sederhana.",
      },
      {
        title: "Pengalaman transaksi",
        body: "Pelanggan dapat memilih produk, mengisi data tujuan, membayar melalui metode yang tersedia, lalu memantau status pesanan dari halaman riwayat transaksi.",
      },
      {
        title: "Bantuan pelanggan",
        body: `Jika ada kendala, tim ISIKUY dapat dihubungi melalui WhatsApp ${DISPLAY_PHONE} atau email ${SUPPORT_EMAIL}.`,
      },
    ],
  },
  kontak: {
    eyebrow: "Kontak Resmi",
    title: "Hubungi admin ISIKUY untuk bantuan pesanan.",
    description:
      "Butuh bantuan top up, pembayaran, status transaksi, atau kerja sama? Kontak resmi ISIKUY tersedia melalui WhatsApp dan email.",
    sections: [
      {
        title: "WhatsApp admin",
        body: `Chat admin ISIKUY di ${DISPLAY_PHONE}. Sertakan ID transaksi, nama produk, dan detail kendala agar pengecekan lebih cepat.`,
      },
      {
        title: "Email support",
        body: `Kirim pertanyaan atau dokumen pendukung ke ${SUPPORT_EMAIL}. Email cocok untuk kendala yang membutuhkan bukti pembayaran atau lampiran.`,
      },
      {
        title: "Jam bantuan",
        body: "Pesan dapat dikirim kapan saja. Admin akan membalas sesuai antrean dan prioritas kendala transaksi.",
      },
    ],
  },
  bantuan: {
    eyebrow: "Pusat Bantuan",
    title: "Panduan singkat sebelum dan sesudah top up.",
    description:
      "Temukan informasi penting tentang cara order, status pembayaran, data tujuan, dan langkah yang harus dilakukan jika pesanan belum masuk.",
    sections: [
      {
        title: "Cara top up",
        body: "Pilih game atau produk digital, isi data tujuan dengan benar, pilih nominal, lalu lanjutkan pembayaran. Pastikan data akun sudah sesuai sebelum checkout.",
      },
      {
        title: "Pesanan belum masuk",
        body: `Cek status transaksi di menu riwayat. Jika pembayaran sudah berhasil tetapi produk belum diterima, hubungi WhatsApp ${DISPLAY_PHONE} dengan bukti pembayaran.`,
      },
      {
        title: "Kesalahan data tujuan",
        body: "Pesanan yang sudah diproses ke data tujuan yang salah biasanya tidak dapat dibatalkan. Selalu cek ulang User ID, server, nomor HP, atau alamat akun sebelum membayar.",
      },
    ],
  },
  privacy: {
    eyebrow: "Privacy Policy",
    title: "Kebijakan privasi pengguna ISIKUY.",
    description:
      "Halaman ini menjelaskan bagaimana ISIKUY menggunakan data pelanggan untuk memproses transaksi, menjaga keamanan, dan memberikan bantuan.",
    sections: [
      {
        title: "Data yang digunakan",
        body: "ISIKUY dapat menggunakan data seperti nama akun, kontak, ID game, server, nomor HP, detail pembayaran, dan riwayat transaksi untuk menjalankan layanan.",
      },
      {
        title: "Tujuan penggunaan",
        body: "Data digunakan untuk memproses pesanan, verifikasi pembayaran, layanan pelanggan, pencegahan penyalahgunaan, dan peningkatan kualitas layanan.",
      },
      {
        title: "Kontak privasi",
        body: `Pertanyaan terkait privasi dapat dikirim ke ${SUPPORT_EMAIL} atau WhatsApp ${DISPLAY_PHONE}.`,
      },
    ],
  },
  terms: {
    eyebrow: "Terms of Service",
    title: "Syarat dan ketentuan penggunaan ISIKUY.",
    description:
      "Dengan menggunakan ISIKUY, pelanggan menyetujui aturan transaksi produk digital, tanggung jawab pengisian data, dan ketentuan layanan.",
    sections: [
      {
        title: "Kewajiban pelanggan",
        body: "Pelanggan wajib memastikan data tujuan, nominal, dan produk yang dipilih sudah benar sebelum melakukan pembayaran.",
      },
      {
        title: "Proses pesanan",
        body: "Pesanan diproses setelah pembayaran diterima dan data valid. Waktu proses dapat berbeda tergantung produk, provider, dan kondisi sistem.",
      },
      {
        title: "Penyalahgunaan layanan",
        body: "ISIKUY berhak menolak atau menahan transaksi yang terindikasi melanggar hukum, menggunakan data palsu, atau berhubungan dengan aktivitas mencurigakan.",
      },
    ],
  },
  refund: {
    eyebrow: "Refund Policy",
    title: "Kebijakan refund dan penanganan transaksi.",
    description:
      "Refund diproses sesuai kondisi transaksi, status pesanan, validitas data, dan hasil pengecekan dari sistem atau provider produk digital.",
    sections: [
      {
        title: "Kapan refund dapat diajukan",
        body: "Refund dapat diajukan jika pembayaran berhasil tetapi pesanan gagal diproses, produk tidak tersedia, atau terjadi kendala sistem yang terkonfirmasi.",
      },
      {
        title: "Kapan refund tidak berlaku",
        body: "Refund umumnya tidak berlaku untuk kesalahan input data tujuan, produk yang sudah berhasil dikirim, atau transaksi yang sudah diproses oleh provider.",
      },
      {
        title: "Cara mengajukan refund",
        body: `Hubungi WhatsApp ${DISPLAY_PHONE} atau email ${SUPPORT_EMAIL} dengan ID transaksi, bukti pembayaran, dan kronologi kendala.`,
      },
    ],
  },
};

const fallback = pages.bantuan;

export default function InfoPage() {
  const location = useLocation();
  const slug = location.pathname.replace(/^\//, "") || "bantuan";
  const page = pages[slug] ?? fallback;
  const { data: settings } = trpc.site.publicSettings.useQuery(undefined, {
    staleTime: 60_000,
  });
  const whatsappNumber = settings?.whatsappNumber || WHATSAPP_NUMBER;
  const displayPhone = settings?.contactPhone || DISPLAY_PHONE;
  const supportEmail = settings?.contactEmail || SUPPORT_EMAIL;

  useEffect(() => {
    document.title = `${page.eyebrow} | ${settings?.siteName || "ISIKUY TOPUP"}`;
    const description = document.querySelector<HTMLMetaElement>(
      'meta[name="description"]',
    );
    if (description) {
      description.content = page.description;
    }
  }, [page, settings?.siteName]);

  return (
    <div className="min-h-[100dvh] site-bg">
      <Navbar />
      <main className="relative overflow-hidden pt-28">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(255,0,60,0.26),transparent_30%),radial-gradient(circle_at_82%_0%,rgba(0,240,255,0.08),transparent_24%)]" />
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,45,77,0.32) 1px, transparent 1px), linear-gradient(90deg, rgba(255,45,77,0.24) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />

        <section className="relative z-10 mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-wrap items-center gap-2 text-xs text-white/45">
            <Link to="/" className="hover:text-white">
              Beranda
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-[#ff6a82]">{page.eyebrow}</span>
          </div>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,0.78fr)_360px]">
            <article className="rounded-xl border border-[#ff4967]/20 bg-[#0b0509]/88 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.42)] sm:p-8">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#ff6a82]">
                {page.eyebrow}
              </p>
              <h1 className="font-display text-4xl font-bold leading-tight text-white sm:text-5xl">
                {page.title}
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-relaxed text-white/62">
                {page.description}
              </p>

              <div className="mt-8 grid gap-4">
                {page.sections.map((section) => (
                  <section
                    key={section.title}
                    className="rounded-lg border border-white/[0.08] bg-black/25 p-5"
                  >
                    <h2 className="font-display text-xl font-semibold text-white">
                      {section.title}
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-white/58">
                      {section.body}
                    </p>
                  </section>
                ))}
              </div>
            </article>

            <aside className="h-fit rounded-xl border border-[#ff4967]/20 bg-[#0b0509]/88 p-5">
              <p className="font-display text-xl font-bold text-white">
                Kontak ISIKUY
              </p>
              <p className="mt-2 text-sm leading-relaxed text-white/52">
                Admin siap bantu cek pesanan, pembayaran, refund, dan pertanyaan
                produk.
              </p>

              <div className="mt-5 grid gap-3">
                <a
                  href={`https://wa.me/${whatsappNumber}`}
                  className="flex items-center gap-3 rounded-lg border border-[#0aff00]/20 bg-[#0aff00]/10 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0aff00]/15"
                >
                  <MessageCircle className="h-4 w-4 text-[#0aff00]" />
                  WhatsApp {displayPhone}
                </a>
                <a
                  href={`mailto:${supportEmail}`}
                  className="flex items-center gap-3 rounded-lg border border-[#00f0ff]/20 bg-[#00f0ff]/10 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#00f0ff]/15"
                >
                  <Mail className="h-4 w-4 text-[#00f0ff]" />
                  {supportEmail}
                </a>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-2">
                {[
                  { icon: Gamepad2, label: "Game" },
                  { icon: Zap, label: "Cepat" },
                  { icon: Shield, label: "Aman" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-lg border border-white/[0.08] bg-black/25 px-3 py-4 text-center"
                  >
                    <item.icon className="mx-auto mb-2 h-4 w-4 text-[#ff4967]" />
                    <p className="text-xs font-semibold text-white/70">
                      {item.label}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-lg border border-white/[0.08] bg-black/25 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
                  <Clock className="h-4 w-4 text-[#ff4967]" />
                  Respon Bantuan
                </div>
                <p className="text-xs leading-relaxed text-white/50">
                  Kirim detail transaksi agar admin bisa cek lebih cepat.
                </p>
              </div>
            </aside>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
