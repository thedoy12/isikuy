import { Link } from "react-router";
import { trpc } from "@/providers/trpc";
import BrandLogo from "@/components/BrandLogo";
import {
  Mail,
  Phone,
  MapPin,
  Instagram,
  MessageCircle,
  Globe,
  Shield,
  Zap,
  Clock,
  Headphones,
} from "lucide-react";

const WHATSAPP_NUMBER = "62895393061538";
const DISPLAY_PHONE = "0895393061538";
const SUPPORT_EMAIL = "putradadoy@gmail.com";

export default function Footer() {
  const { data: settings } = trpc.site.publicSettings.useQuery(undefined, {
    staleTime: 60_000,
  });
  const whatsappNumber = settings?.whatsappNumber || WHATSAPP_NUMBER;
  const displayPhone = settings?.contactPhone || DISPLAY_PHONE;
  const supportEmail = settings?.contactEmail || SUPPORT_EMAIL;
  const instagramUrl = settings?.instagramUrl || "https://www.instagram.com/";

  return (
    <footer className="relative overflow-hidden">
      {/* Top Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-[#ff003c]/50 to-transparent" />

      <div className="bg-[#0b0d14]/95 pt-10 pb-7 sm:pt-16 sm:pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Stats Row */}
          <div className="mb-10 grid grid-cols-2 gap-3 sm:mb-14 md:grid-cols-4 md:gap-6">
            {[
              { icon: Zap, label: "Transaksi", value: "500K+" },
              { icon: Clock, label: "Proses", value: "< 3 Menit" },
              { icon: Shield, label: "Keamanan", value: "100% Aman" },
              { icon: Headphones, label: "Support", value: "24/7" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="flex min-w-0 items-center gap-3 rounded-xl border border-white/8 bg-white/[0.035] p-3 backdrop-blur-xl sm:gap-4 sm:p-4"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#ff003c]/10 sm:h-10 sm:w-10">
                  <stat.icon className="h-4 w-4 text-[#ff003c] sm:h-5 sm:w-5" />
                </div>
                <div className="min-w-0">
                  <p className="font-display text-base font-bold leading-none text-white sm:text-lg">
                    {stat.value}
                  </p>
                  <p className="mt-1 truncate text-[11px] text-white/50 sm:text-xs">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Main Footer Content */}
          <div className="mb-10 grid grid-cols-1 gap-8 sm:mb-14 md:grid-cols-2 lg:grid-cols-4 lg:gap-10">
            {/* Brand */}
            <div className="text-center sm:text-left">
              <BrandLogo className="mb-4 justify-center sm:justify-start" imageClassName="h-10 sm:h-11" />
              <p className="mx-auto mb-5 max-w-sm text-sm leading-relaxed text-white/50 sm:mx-0">
                Platform top-up game terpercaya dengan proses cepat dan
                harga terbaik. Melayani ribuan transaksi setiap harinya.
              </p>
              <div className="flex items-center justify-center gap-3 sm:justify-start">
                <a
                  href={instagramUrl}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/8 bg-white/[0.035] transition-colors hover:bg-[#ff003c]/20 sm:h-9 sm:w-9 sm:rounded-lg"
                  aria-label="Instagram ISIKUY"
                >
                  <Instagram className="w-4 h-4 text-white/60" />
                </a>
                <a
                  href={`https://wa.me/${whatsappNumber}`}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/8 bg-white/[0.035] transition-colors hover:bg-[#ff003c]/20 sm:h-9 sm:w-9 sm:rounded-lg"
                  aria-label="WhatsApp ISIKUY"
                >
                  <MessageCircle className="w-4 h-4 text-white/60" />
                </a>
                <a
                  href="/kontak"
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/8 bg-white/[0.035] transition-colors hover:bg-[#ff003c]/20 sm:h-9 sm:w-9 sm:rounded-lg"
                  aria-label="Kontak ISIKUY"
                >
                  <Globe className="w-4 h-4 text-white/60" />
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="mb-4 font-display text-sm font-semibold tracking-wider text-white">
                MENU
              </h4>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:flex sm:flex-col sm:gap-3">
                {[
                  { label: "Beranda", href: "/" },
                  { label: "Daftar Game", href: "/games" },
                  { label: "Trending", href: "/games?trending=true" },
                  { label: "Cek Status", href: "/history" },
                  { label: "Tentang ISIKUY", href: "/tentang" },
                  { label: "Bantuan", href: "/bantuan" },
                  { label: "Kontak", href: "/kontak" },
                ].map((link) => (
                  <Link
                    key={link.label}
                    to={link.href}
                    className="rounded-lg py-1 text-sm text-white/50 transition-colors hover:text-[#00f0ff]"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Games */}
            <div>
              <h4 className="mb-4 font-display text-sm font-semibold tracking-wider text-white">
                GAME POPULER
              </h4>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:flex sm:flex-col sm:gap-3">
                {[
                  "Mobile Legends",
                  "Free Fire",
                  "PUBG Mobile",
                  "Valorant",
                  "Genshin Impact",
                ].map((game) => (
                  <Link
                    key={game}
                    to={`/games/${game.toLowerCase().replace(/\s+/g, "-")}`}
                    className="rounded-lg py-1 text-sm text-white/50 transition-colors hover:text-[#00f0ff]"
                  >
                    {game}
                  </Link>
                ))}
              </div>
            </div>

            {/* Contact */}
            <div>
              <h4 className="mb-4 font-display text-sm font-semibold tracking-wider text-white">
                KONTAK
              </h4>
              <div className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-white/[0.025] p-4 sm:border-0 sm:bg-transparent sm:p-0">
                <div className="flex min-w-0 items-start gap-3">
                  <Mail className="mt-1 h-4 w-4 flex-shrink-0 text-[#ff003c]" />
                  <a
                    href={`mailto:${supportEmail}`}
                    className="min-w-0 break-all text-sm text-white/50 transition-colors hover:text-[#00f0ff]"
                  >
                    {supportEmail}
                  </a>
                </div>
                <div className="flex min-w-0 items-start gap-3">
                  <Phone className="mt-1 h-4 w-4 flex-shrink-0 text-[#ff003c]" />
                  <a
                    href={`https://wa.me/${whatsappNumber}`}
                    className="min-w-0 break-all text-sm text-white/50 transition-colors hover:text-[#00f0ff]"
                  >
                    {displayPhone}
                  </a>
                </div>
                <div className="flex min-w-0 items-start gap-3">
                  <MapPin className="mt-1 h-4 w-4 flex-shrink-0 text-[#ff003c]" />
                  <span className="text-sm text-white/50">
                    Jakarta, Indonesia
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-6 text-center sm:flex-row sm:text-left">
            <p className="text-xs leading-relaxed text-white/30">
              &copy; 2026 ISIKUY TOPUP. All rights reserved.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:justify-end sm:gap-x-6">
              <Link
                to="/privacy"
                className="text-xs text-white/30 hover:text-white/50 transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                to="/terms"
                className="text-xs text-white/30 hover:text-white/50 transition-colors"
              >
                Terms of Service
              </Link>
              <Link
                to="/refund"
                className="text-xs text-white/30 hover:text-white/50 transition-colors"
              >
                Refund Policy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
