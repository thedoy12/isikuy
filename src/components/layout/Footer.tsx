import { Link } from "react-router";
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

export default function Footer() {
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
                  href="#"
                  className="w-9 h-9 rounded-lg glass flex items-center justify-center hover:bg-[#ff003c]/20 transition-colors"
                >
                  <Instagram className="w-4 h-4 text-white/60" />
                </a>
                <a
                  href="#"
                  className="w-9 h-9 rounded-lg glass flex items-center justify-center hover:bg-[#ff003c]/20 transition-colors"
                >
                  <MessageCircle className="w-4 h-4 text-white/60" />
                </a>
                <a
                  href="#"
                  className="w-9 h-9 rounded-lg glass flex items-center justify-center hover:bg-[#ff003c]/20 transition-colors"
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
                  <span className="text-sm text-white/50">
                    support@isikuy.id
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="w-4 h-4 text-[#ff003c] mt-1 flex-shrink-0" />
                  <span className="text-sm text-white/50">
                    +62 812-3456-7890
                  </span>
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
              &copy; 2025 ISIKUY TOPUP. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <span className="text-xs text-white/30 hover:text-white/50 cursor-pointer transition-colors">
                Privacy Policy
              </span>
              <span className="text-xs text-white/30 hover:text-white/50 cursor-pointer transition-colors">
                Terms of Service
              </span>
              <span className="text-xs text-white/30 hover:text-white/50 cursor-pointer transition-colors">
                Refund Policy
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
