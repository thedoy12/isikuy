import { useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Globe,
  Loader2,
  Shield,
  UserPlus,
  Zap,
} from "lucide-react";
import { trpc } from "@/providers/trpc";
import BrandLogo from "@/components/BrandLogo";

export default function Register() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");

  const register = trpc.auth.register.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      navigate("/games");
    },
    onError: (err) => setError(err.message),
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Konfirmasi password tidak sama");
      return;
    }

    register.mutate({ name, email, username, password });
  }

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#030305] px-4 py-10">
      <div className="absolute inset-0">
        <div className="absolute left-1/2 top-1/4 h-[620px] w-[620px] -translate-x-1/2 rounded-full bg-[#ff003c]/8 blur-[160px]" />
        <div className="absolute bottom-0 right-0 h-[420px] w-[420px] rounded-full bg-[#00f0ff]/5 blur-[150px]" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,0,60,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,0,60,0.3) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className="relative z-10 grid w-full max-w-5xl overflow-hidden rounded-2xl border border-[#ff4967]/20 bg-[#080407]/88 shadow-[0_30px_100px_rgba(0,0,0,0.55)] backdrop-blur-xl lg:grid-cols-[0.9fr_1.1fr]">
        <aside className="hidden min-h-full border-r border-white/10 bg-[#12060b]/70 p-8 lg:block">
          <BrandLogo className="mb-10" imageClassName="h-14" />

          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#ff6a82]">
            Player Account
          </p>
          <h1 className="mt-3 font-display text-4xl font-bold leading-tight text-white">
            Daftar akun untuk top up lebih cepat.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-white/55">
            Simpan riwayat transaksi, akses checkout lebih mudah, dan pantau
            pesanan dari satu akun ISIKUY.
          </p>

          <div className="mt-8 grid gap-3">
            {[
              { icon: CheckCircle2, label: "Riwayat transaksi tersimpan" },
              { icon: Shield, label: "Akun aman dengan password terenkripsi" },
              { icon: Zap, label: "Checkout top up lebih praktis" },
              { icon: Globe, label: "Support game dan produk digital" },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-3 rounded-lg border border-white/10 bg-black/25 px-4 py-3 text-sm text-white/62"
              >
                <item.icon className="h-4 w-4 text-[#ff4967]" />
                {item.label}
              </div>
            ))}
          </div>
        </aside>

        <section className="p-6 sm:p-8">
          <div className="mb-7 text-center lg:text-left">
            <BrandLogo className="mb-6 justify-center lg:hidden" imageClassName="h-12" />
            <h2 className="font-display text-3xl font-bold text-white">
              Buat Akun
            </h2>
            <p className="mt-2 text-sm text-white/45">
              Isi data di bawah untuk mulai top up.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs text-white/50">Nama</label>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="glass w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/20 focus:border-[#ff003c]/50"
                  autoComplete="name"
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-xs text-white/50">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="glass w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/20 focus:border-[#ff003c]/50"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs text-white/50">Username</label>
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="glass w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/20 focus:border-[#ff003c]/50"
                autoComplete="username"
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs text-white/50">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    minLength={8}
                    className="glass w-full rounded-xl px-4 py-3 pr-12 text-sm text-white outline-none transition-colors placeholder:text-white/20 focus:border-[#ff003c]/50"
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-white/45 transition-colors hover:text-white"
                    aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="mb-2 block text-xs text-white/50">
                  Konfirmasi
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    minLength={8}
                    className="glass w-full rounded-xl px-4 py-3 pr-12 text-sm text-white outline-none transition-colors placeholder:text-white/20 focus:border-[#ff003c]/50"
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((current) => !current)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-white/45 transition-colors hover:text-white"
                    aria-label={showConfirmPassword ? "Sembunyikan konfirmasi password" : "Tampilkan konfirmasi password"}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <p className="rounded-xl border border-[#ff003c]/20 bg-[#ff003c]/10 px-4 py-3 text-xs text-[#ffb8c7]">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={register.isPending}
              className="flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-[#ff003c] to-[#b30029] py-4 font-semibold text-white transition-all hover:shadow-lg hover:shadow-[#ff003c]/25 disabled:opacity-50"
            >
              {register.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <UserPlus className="h-5 w-5" />
              )}
              Daftar
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-white/35">
            Sudah punya akun?{" "}
            <Link to="/login" className="font-semibold text-[#00f0ff] hover:underline">
              Masuk di sini
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}
