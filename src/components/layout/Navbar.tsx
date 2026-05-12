import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import {
  Gamepad2,
  Search,
  User,
  LogOut,
  History,
  Shield,
  Menu,
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
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setProfileOpen(false);
  }, [location.pathname]);

  const isAdmin = user?.role === "admin" || user?.role === "superadmin";

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "glass-strong py-3"
          : "bg-transparent py-5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#ff003c] to-[#b30029] flex items-center justify-center">
                <Gamepad2 className="w-5 h-5 text-white" />
              </div>
              <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-[#ff003c] to-[#b30029] blur-lg opacity-50 group-hover:opacity-80 transition-opacity" />
            </div>
            <div>
              <span className="font-display text-2xl font-bold tracking-wider text-white">
                ISIKUY
              </span>
              <span className="hidden sm:inline font-display text-xs tracking-[0.3em] text-[#00f0ff] ml-2">
                TOPUP
              </span>
            </div>
          </Link>

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
              <Link
                to="/login"
                className="flex items-center gap-2 bg-gradient-to-r from-[#ff003c] to-[#b30029] text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">Login</span>
              </Link>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden w-9 h-9 rounded-lg glass flex items-center justify-center"
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
          <div className="md:hidden mt-4 pt-4 border-t border-white/10">
            <div className="flex flex-col gap-2">
              <Link
                to="/"
                className="px-4 py-3 rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition-colors"
              >
                Home
              </Link>
              <Link
                to="/games"
                className="px-4 py-3 rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition-colors"
              >
                Games
              </Link>
              <Link
                to="/games?trending=true"
                className="px-4 py-3 rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition-colors"
              >
                Trending
              </Link>
              {isAuthenticated && (
                <>
                  <Link
                    to="/history"
                    className="px-4 py-3 rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    Riwayat Transaksi
                  </Link>
                  {isAdmin && (
                    <Link
                      to="/admin"
                      className="px-4 py-3 rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      Admin Panel
                    </Link>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
