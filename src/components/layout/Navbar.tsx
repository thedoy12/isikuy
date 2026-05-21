import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router";
import BrandLogo from "@/components/BrandLogo";
import { useAuth } from "@/hooks/useAuth";
import {
  Flame,
  Gamepad2,
  Home,
  Search,
  User,
  LogOut,
  History,
  Settings,
  Shield,
  Menu,
  Sparkles,
  X,
  ChevronDown,
} from "lucide-react";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();

  useEffect(() => {
    let frame = 0;
    const updateScrolled = () => {
      frame = 0;
      const nextScrolled = window.scrollY > 50;
      setScrolled((current) => (current === nextScrolled ? current : nextScrolled));
    };
    const handleScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(updateScrolled);
    };

    updateScrolled();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setProfileOpen(false);
  }, [location.pathname]);

  const isAdmin = user?.role === "admin";
  const mobileLinkClass = (href: string) => {
    const active =
      href === "/"
        ? location.pathname === "/"
        : href.includes("?")
          ? `${location.pathname}${location.search}` === href
          : location.pathname === href;

    return `flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors ${
      active
        ? "border-[#ff003c]/25 bg-[#ff003c]/12 text-white"
        : "border-white/5 bg-white/[0.03] text-white/72 hover:border-white/12 hover:bg-white/[0.07] hover:text-white"
    }`;
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled || mobileOpen
          ? "glass-strong py-3"
          : "bg-transparent py-5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <BrandLogo imageClassName="h-11" />

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <Link
              to="/"
              className="text-sm font-medium text-white/70 hover:text-white transition-colors"
            >
              Home
            </Link>
            <Link
              to="/games"
              className="text-sm font-medium text-white/70 hover:text-white transition-colors"
            >
              Games
            </Link>
            <Link
              to="/games?trending=true"
              className="text-sm font-medium text-white/70 hover:text-white transition-colors"
            >
              Trending
            </Link>
            <Link
              to="/tools"
              className="text-sm font-medium text-white/70 hover:text-white transition-colors"
            >
              Tools
            </Link>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-3">
            <Link
              to="/games"
              className="hidden sm:flex w-9 h-9 rounded-lg glass items-center justify-center hover:bg-white/10 transition-colors"
            >
              <Search className="w-4 h-4 text-white/70" />
            </Link>

            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 glass rounded-lg px-3 py-2 hover:bg-white/10 transition-colors"
                >
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name || "User"}
                      loading="lazy"
                      decoding="async"
                      className="w-6 h-6 rounded-full"
                    />
                  ) : (
                    <User className="w-5 h-5 text-white/70" />
                  )}
                  <span className="hidden sm:block text-sm text-white/80 max-w-[100px] truncate">
                    {user?.name || "User"}
                  </span>
                  <ChevronDown className="w-3 h-3 text-white/50" />
                </button>

                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-56 glass-strong rounded-xl overflow-hidden shadow-2xl">
                    <div className="p-3 border-b border-white/5">
                      <p className="text-sm font-medium text-white truncate">
                        {user?.name}
                      </p>
                      <p className="text-xs text-[#00f0ff]">
                        Rp{parseFloat(user?.balance || "0").toLocaleString()}
                      </p>
                    </div>
                    <div className="p-2">
                      <Link
                        to="/account"
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                      >
                        <Settings className="w-4 h-4" />
                        Pengaturan Akun
                      </Link>
                      <Link
                        to="/history"
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                      >
                        <History className="w-4 h-4" />
                        Riwayat Transaksi
                      </Link>
                      {isAdmin && (
                        <Link
                          to="/admin"
                          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                        >
                          <Shield className="w-4 h-4" />
                          Admin Panel
                        </Link>
                      )}
                      <button
                        onClick={logout}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[#ff003c] hover:bg-white/5 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/register"
                  className="hidden sm:flex items-center gap-2 rounded-lg border border-[#ff003c]/25 bg-[#13060b]/70 px-4 py-2 text-sm font-medium text-white hover:border-[#ff4967]/50 transition-colors"
                >
                  Daftar
                </Link>
                <Link
                  to="/login"
                  className="hidden sm:flex items-center gap-2 bg-gradient-to-r from-[#ff003c] to-[#b30029] text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  <User className="w-4 h-4" />
                  <span>Login</span>
                </Link>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => {
                setMobileOpen(!mobileOpen);
                setProfileOpen(false);
              }}
              className="md:hidden w-11 h-11 rounded-xl glass flex items-center justify-center hover:bg-white/10 transition-colors"
              aria-label={mobileOpen ? "Tutup menu" : "Buka menu"}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? (
                <X className="w-5 h-5 text-white" />
              ) : (
                <Menu className="w-5 h-5 text-white" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="md:hidden mt-4 overflow-hidden rounded-2xl border border-white/10 bg-[#07090f]/95 p-3 shadow-[0_24px_70px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
            {isAuthenticated && (
              <div className="mb-3 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3">
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name || "User"}
                    loading="lazy"
                    decoding="async"
                    className="h-10 w-10 rounded-full border border-white/10 object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#ff003c]/25 bg-[#ff003c]/10">
                    <User className="h-5 w-5 text-[#ff4967]" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{user?.name || "User"}</p>
                  <p className="text-xs font-medium text-[#00f0ff]">
                    Rp{parseFloat(user?.balance || "0").toLocaleString()}
                  </p>
                </div>
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Link
                to="/"
                className={mobileLinkClass("/")}
              >
                <Home className="h-4 w-4 text-[#ff4967]" />
                Home
              </Link>
              <Link
                to="/games"
                className={mobileLinkClass("/games")}
              >
                <Gamepad2 className="h-4 w-4 text-[#00f0ff]" />
                Games
              </Link>
              <Link
                to="/games?trending=true"
                className={mobileLinkClass("/games?trending=true")}
              >
                <Flame className="h-4 w-4 text-[#ffb800]" />
                Trending
              </Link>
              <Link
                to="/tools"
                className={mobileLinkClass("/tools")}
              >
                <Sparkles className="h-4 w-4 text-[#ff4967]" />
                Tools
              </Link>
              {!isAuthenticated && (
                <>
                  <Link
                    to="/register"
                    className="flex items-center justify-center rounded-xl border border-[#ff003c]/25 bg-[#ff003c]/12 px-4 py-3 text-sm font-bold text-white transition-colors hover:border-[#ff4967]/45"
                  >
                    Daftar
                  </Link>
                  <Link
                    to="/login"
                    className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#ff003c] to-[#b30029] px-4 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
                  >
                    <User className="h-4 w-4" />
                    Login
                  </Link>
                </>
              )}
              {isAuthenticated && (
                <>
                  <Link
                    to="/account"
                    className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-white/72 transition-colors hover:border-white/12 hover:bg-white/[0.07] hover:text-white"
                  >
                    <Settings className="h-4 w-4 text-white/55" />
                    Pengaturan Akun
                  </Link>
                  <Link
                    to="/history"
                    className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-white/72 transition-colors hover:border-white/12 hover:bg-white/[0.07] hover:text-white"
                  >
                    <History className="h-4 w-4 text-white/55" />
                    Riwayat Transaksi
                  </Link>
                  {isAdmin && (
                    <Link
                      to="/admin"
                      className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-white/72 transition-colors hover:border-white/12 hover:bg-white/[0.07] hover:text-white"
                    >
                      <Shield className="h-4 w-4 text-white/55" />
                      Admin Panel
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={logout}
                    className="flex items-center gap-3 rounded-xl border border-[#ff003c]/15 bg-[#ff003c]/10 px-4 py-3 text-left text-sm font-semibold text-[#ff6a82] transition-colors hover:border-[#ff003c]/30 hover:bg-[#ff003c]/15"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
