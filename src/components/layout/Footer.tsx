import { Link } from "react-router";
import { trpc } from "@/providers/trpc";
import {
  Gamepad2,
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

      <div className="bg-[#0b0d14] pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
            {[
              { icon: Zap, label: "Transaksi", value: "500K+" },
              { icon: Clock, label: "Proses", value: "< 3 Menit" },
              { icon: Shield, label: "Keamanan", value: "100% Aman" },
              { icon: Headphones, label: "Support", value: "24/7" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="flex items-center gap-4 glass rounded-xl p-4"
              >
                <div className="w-10 h-10 rounded-lg bg-[#ff003c]/10 flex items-center justify-center flex-shrink-0">
                  <stat.icon className="w-5 h-5 text-[#ff003c]" />
                </div>
                <div>
                  <p className="font-display text-lg font-bold text-white">
                    {stat.value}
                  </p>
                  <p className="text-xs text-white/50">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Main Footer Content */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-16">
            {/* Brand */}
            <div>
              <Link to="/" className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#ff003c] to-[#b30029] flex items-center justify-center">
                  <Gamepad2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span className="font-display text-xl font-bold tracking-wider text-white">
                    ISIKUY
                  </span>
                  <span className="font-display text-[10px] tracking-[0.3em] text-[#00f0ff] block">
                    TOPUP
                  </span>
                </div>
              </Link>
              <p className="text-sm text-white/50 leading-relaxed mb-5">
                Platform top-up game terpercaya dengan proses cepat dan
                harga terbaik. Melayani ribuan transaksi setiap harinya.
              </p>
              <div className="flex items-center gap-3">
                <a
                  href={instagramUrl}
                  className="w-9 h-9 rounded-lg glass flex items-center justify-center hover:bg-[#ff003c]/20 transition-colors"
                  aria-label="Instagram ISIKUY"
                >
                  <Instagram className="w-4 h-4 text-white/60" />
                </a>
                <a
                  href={`https://wa.me/${whatsappNumber}`}
                  className="w-9 h-9 rounded-lg glass flex items-center justify-center hover:bg-[#ff003c]/20 transition-colors"
                  aria-label="WhatsApp ISIKUY"
                >
                  <MessageCircle className="w-4 h-4 text-white/60" />
                </a>
                <a
                  href="/kontak"
                  className="w-9 h-9 rounded-lg glass flex items-center justify-center hover:bg-[#ff003c]/20 transition-colors"
                  aria-label="Kontak ISIKUY"
                >
                  <Globe className="w-4 h-4 text-white/60" />
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-display text-sm font-semibold tracking-wider text-white mb-5">
                MENU
              </h4>
              <div className="flex flex-col gap-3">
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
                    className="text-sm text-white/50 hover:text-[#00f0ff] transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Games */}
            <div>
              <h4 className="font-display text-sm font-semibold tracking-wider text-white mb-5">
                GAME POPULER
              </h4>
              <div className="flex flex-col gap-3">
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
                    className="text-sm text-white/50 hover:text-[#00f0ff] transition-colors"
                  >
                    {game}
                  </Link>
                ))}
              </div>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-display text-sm font-semibold tracking-wider text-white mb-5">
                KONTAK
              </h4>
              <div className="flex flex-col gap-4">
                <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 text-[#ff003c] mt-1 flex-shrink-0" />
                  <a
                    href={`mailto:${supportEmail}`}
                    className="text-sm text-white/50 hover:text-[#00f0ff] transition-colors"
                  >
                    {supportEmail}
                  </a>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="w-4 h-4 text-[#ff003c] mt-1 flex-shrink-0" />
                  <a
                    href={`https://wa.me/${whatsappNumber}`}
                    className="text-sm text-white/50 hover:text-[#00f0ff] transition-colors"
                  >
                    {displayPhone}
                  </a>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-[#ff003c] mt-1 flex-shrink-0" />
                  <span className="text-sm text-white/50">
                    Jakarta, Indonesia
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-white/30">
              &copy; 2026 ISIKUY TOPUP. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
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
