import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Gamepad2, Shield, Zap, Globe, Loader2 } from "lucide-react";
import { trpc } from "@/providers/trpc";
import BrandLogo from "@/components/BrandLogo";

export default function Login() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const login = trpc.auth.login.useMutation({
    onSuccess: async (user) => {
      await utils.auth.me.invalidate();
      const isAdmin = user?.role === "admin";
      navigate(isAdmin ? "/admin" : "/");
    },
    onError: (err) => setError(err.message),
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    login.mutate({ username, password });
  }

  return (
    <div className="min-h-[100dvh] bg-[#030305] flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#ff003c]/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-[#00f0ff]/3 rounded-full blur-[150px]" />
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,0,60,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,0,60,0.3) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="glass rounded-2xl p-8">
          <div className="text-center mb-8">
            <BrandLogo className="mb-6 justify-center" imageClassName="h-14" />
            <h2 className="font-display text-xl font-semibold text-white mb-1">
              Masuk ke ISIKUY
            </h2>
            <p className="text-xs text-white/40">
              Login user untuk transaksi, admin untuk dashboard operator
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 mb-6">
            <div>
              <label className="text-xs text-white/50 mb-2 block">
                Username
              </label>
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="w-full px-4 py-3 rounded-xl glass text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#ff003c]/50 transition-colors"
                autoComplete="username"
              />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-2 block">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full px-4 py-3 rounded-xl glass text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#ff003c]/50 transition-colors"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <p className="text-xs text-[#ff003c] bg-[#ff003c]/10 border border-[#ff003c]/20 rounded-xl px-4 py-3">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={login.isPending}
              className="w-full flex items-center justify-center gap-3 py-4 bg-gradient-to-r from-[#ff003c] to-[#b30029] text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-[#ff003c]/25 transition-all disabled:opacity-50"
            >
              {login.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Shield className="w-5 h-5" />
              )}
              Masuk
            </button>
          </form>

          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-[10px] text-white/20 tracking-wider">
              SECURE_AUTH
            </span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <p className="mb-6 text-center text-xs text-white/40">
            Belum punya akun?{" "}
            <Link to="/register" className="font-semibold text-[#00f0ff] hover:underline">
              Daftar sekarang
            </Link>
          </p>

          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Zap, label: "Proses Cepat" },
              { icon: Shield, label: "100% Aman" },
              { icon: Globe, label: "24/7 Online" },
              { icon: Gamepad2, label: "16+ Game" },
            ].map((f) => (
              <div
                key={f.label}
                className="flex items-center gap-2 text-xs text-white/30"
              >
                <f.icon className="w-3 h-3 text-[#ff003c]" />
                {f.label}
              </div>
            ))}
          </div>
        </div>

        <p className="text-center mt-6 text-xs text-white/30">
          <Link to="/" className="text-[#00f0ff] hover:underline">
            Kembali ke beranda
          </Link>
        </p>
      </div>
    </div>
  );
}
