import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Save,
  Shield,
  UserRound,
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";

export default function AccountSettings() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const { user, isAuthenticated, isLoading, refresh } = useAuth();
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "",
    avatar: "",
  });
  const [password, setPassword] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const updateProfile = trpc.auth.updateProfile.useMutation({
    onSuccess: async () => {
      setProfileError("");
      setProfileMessage("Profil akun berhasil diperbarui");
      await Promise.all([utils.auth.me.invalidate(), refresh()]);
    },
    onError: (error) => {
      setProfileMessage("");
      setProfileError(error.message);
    },
  });

  const changePassword = trpc.auth.changePassword.useMutation({
    onSuccess: () => {
      setPassword({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPasswordError("");
      setPasswordMessage("Password berhasil diganti");
    },
    onError: (error) => {
      setPasswordMessage("");
      setPasswordError(error.message);
    },
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) navigate("/login");
  }, [isLoading, isAuthenticated, navigate]);

  useEffect(() => {
    if (!user) return;
    setProfile({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      avatar: user.avatar || "",
    });
  }, [user]);

  const submitProfile = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileMessage("");
    setProfileError("");
    updateProfile.mutate(profile);
  };

  const submitPassword = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordMessage("");
    setPasswordError("");

    if (password.newPassword !== password.confirmPassword) {
      setPasswordError("Konfirmasi password tidak sama");
      return;
    }

    changePassword.mutate({
      currentPassword: password.currentPassword,
      newPassword: password.newPassword,
    });
  };

  if (isLoading || !user) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#030305]">
        <Loader2 className="h-8 w-8 animate-spin text-[#ff003c]" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#030305] text-white">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 pb-20 pt-28 sm:px-6 lg:px-8">
        <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm text-white/45 hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Kembali ke beranda
        </Link>

        <div className="mb-7">
          <p className="text-[10px] uppercase tracking-[0.22em] text-[#00f0ff]">Account Settings</p>
          <h1 className="mt-2 font-display text-4xl font-bold">Pengaturan Akun</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/55">
            Kelola data profil, nomor telepon, email, avatar, dan password akun ISIKUY kamu.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-2xl border border-white/10 bg-[#0b0d14]/88 p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#00f0ff]/25 bg-[#00f0ff]/10 text-[#00f0ff]">
                <UserRound className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display text-xl font-bold">Profil</h2>
                <p className="text-xs text-white/40">Data ini dipakai untuk login, transaksi, dan riwayat.</p>
              </div>
            </div>

            <form onSubmit={submitProfile} className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label>
                  <span className="mb-2 block text-xs text-white/50">Nama</span>
                  <input
                    value={profile.name}
                    onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-[#00f0ff]/50"
                    required
                  />
                </label>
                <label>
                  <span className="mb-2 block text-xs text-white/50">Email</span>
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(event) => setProfile((current) => ({ ...current, email: event.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-[#00f0ff]/50"
                    required
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label>
                  <span className="mb-2 block text-xs text-white/50">No. Telepon</span>
                  <input
                    value={profile.phone}
                    onChange={(event) => setProfile((current) => ({ ...current, phone: event.target.value }))}
                    placeholder="Contoh: 08xxxxxxxxxx"
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-white/20 focus:border-[#00f0ff]/50"
                    required
                  />
                </label>
                <label>
                  <span className="mb-2 block text-xs text-white/50">Avatar URL</span>
                  <input
                    value={profile.avatar}
                    onChange={(event) => setProfile((current) => ({ ...current, avatar: event.target.value }))}
                    placeholder="https://..."
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-white/20 focus:border-[#00f0ff]/50"
                  />
                </label>
              </div>

              {profileMessage && (
                <p className="rounded-xl border border-[#0aff00]/20 bg-[#0aff00]/10 px-4 py-3 text-sm text-[#0aff00]">
                  {profileMessage}
                </p>
              )}
              {profileError && (
                <p className="rounded-xl border border-[#ff003c]/20 bg-[#ff003c]/10 px-4 py-3 text-sm text-[#ffb8c7]">
                  {profileError}
                </p>
              )}

              <button
                type="submit"
                disabled={updateProfile.isPending}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#ff003c] to-[#b30029] px-5 py-3 font-semibold text-white disabled:opacity-60 sm:w-fit"
              >
                {updateProfile.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Simpan Profil
              </button>
            </form>
          </section>

          <aside className="grid gap-6">
            <section className="rounded-2xl border border-white/10 bg-[#11131a] p-5">
              <div className="mb-4 flex items-center gap-3">
                {profile.avatar ? (
                  <img src={profile.avatar} alt={profile.name || user.username} className="h-14 w-14 rounded-full object-cover" />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#ff003c]/10">
                    <UserRound className="h-7 w-7 text-[#ff4967]" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate font-display text-lg font-bold">{profile.name || user.username}</p>
                  <p className="truncate text-xs text-white/40">@{user.username}</p>
                </div>
              </div>
              <div className="grid gap-2 text-xs">
                <p className="rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-white/60">{profile.email || "-"}</p>
                <p className="rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-white/60">{profile.phone || "-"}</p>
                <p className="inline-flex items-center gap-2 rounded-lg border border-[#ffb800]/15 bg-[#ffb800]/10 px-3 py-2 text-[#ffdb7a]">
                  <Shield className="h-3 w-3" />
                  {user.role.toUpperCase()}
                </p>
              </div>
            </section>

            <section className="rounded-2xl border border-[#ffb800]/15 bg-[#171006] p-5">
              <div className="mb-4 flex items-center gap-3">
                <KeyRound className="h-5 w-5 text-[#ffb800]" />
                <h2 className="font-display text-xl font-bold">Password</h2>
              </div>
              <form onSubmit={submitPassword} className="grid gap-3">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password.currentPassword}
                  onChange={(event) => setPassword((current) => ({ ...current, currentPassword: event.target.value }))}
                  placeholder="Password lama"
                  className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-white/20 focus:border-[#ffb800]/50"
                  required
                />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password.newPassword}
                  onChange={(event) => setPassword((current) => ({ ...current, newPassword: event.target.value }))}
                  placeholder="Password baru"
                  minLength={8}
                  className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-white/20 focus:border-[#ffb800]/50"
                  required
                />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password.confirmPassword}
                  onChange={(event) => setPassword((current) => ({ ...current, confirmPassword: event.target.value }))}
                  placeholder="Konfirmasi password baru"
                  minLength={8}
                  className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-white/20 focus:border-[#ffb800]/50"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="inline-flex items-center gap-2 text-xs text-white/45 hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {showPassword ? "Sembunyikan password" : "Tampilkan password"}
                </button>

                {passwordMessage && (
                  <p className="rounded-xl border border-[#0aff00]/20 bg-[#0aff00]/10 px-4 py-3 text-sm text-[#0aff00]">
                    <CheckCircle2 className="mr-2 inline h-4 w-4" />
                    {passwordMessage}
                  </p>
                )}
                {passwordError && (
                  <p className="rounded-xl border border-[#ff003c]/20 bg-[#ff003c]/10 px-4 py-3 text-sm text-[#ffb8c7]">
                    {passwordError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={changePassword.isPending}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#ffb800]/25 bg-[#ffb800]/10 px-5 py-3 font-semibold text-[#ffdb7a] disabled:opacity-60"
                >
                  {changePassword.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                  Ganti Password
                </button>
              </form>
            </section>
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  );
}
