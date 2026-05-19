import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import {
  ArrowLeft,
  BarChart3,
  Bell,
  Gamepad2,
  Loader2,
  Receipt,
  Save,
  Settings,
  Tags,
  Trash2,
  Users,
  Wand2,
  Zap,
} from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import { AdminMobileNav } from "@/components/admin/AdminMobileNav";
import { TablePagination } from "@/components/admin/TablePagination";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";

type VoucherForm = {
  id: number | null;
  code: string;
  type: "percent" | "fixed";
  value: string;
  minOrder: string;
  maxDiscount: string;
  usageLimit: string;
  usageCount: string;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
};

const emptyForm: VoucherForm = {
  id: null,
  code: "",
  type: "percent",
  value: "10",
  minOrder: "0",
  maxDiscount: "",
  usageLimit: "100",
  usageCount: "0",
  validFrom: "",
  validUntil: "",
  isActive: true,
};

function toDateTimeInput(value: Date | string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function defaultVoucherDates() {
  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + 30);
  return {
    validFrom: toDateTimeInput(start),
    validUntil: toDateTimeInput(end),
  };
}

function AdminSidebar({ active }: { active: string }) {
  const { logout } = useAuth();
  const navItems = [
    { id: "dashboard", label: "CONSOLE", icon: BarChart3, href: "/admin" },
    { id: "games", label: "ARSENAL", icon: Gamepad2, href: "/admin/games" },
    { id: "transactions", label: "FINANCIALS", icon: Receipt, href: "/admin/transactions" },
    { id: "users", label: "INTEL", icon: Users, href: "/admin/users" },
    { id: "vouchers", label: "VOUCHERS", icon: Tags, href: "/admin/vouchers" },
    { id: "tools", label: "TOOLS", icon: Wand2, href: "/admin/tools" },
    { id: "tools-monitor", label: "TOOLS_MONITOR", icon: Bell, href: "/admin/tools-monitor" },
    { id: "settings", label: "SETTINGS", icon: Settings, href: "/admin/settings" },
  ];

  return (
    <aside className="hidden w-64 flex-shrink-0 flex-col border-r border-[#222] bg-[#0b0d14] lg:flex">
      <div className="border-b border-[#222] p-5">
        <BrandLogo consoleLabel imageClassName="h-10" />
      </div>
      <nav className="flex-1 p-3">
        <p className="mb-2 px-3 font-terminal text-[9px] tracking-wider text-white/20">NAVIGATION</p>
        {navItems.map((item) => (
          <Link
            key={item.id}
            to={item.href}
            className={`flex items-center gap-3 px-3 py-2.5 font-terminal text-sm tracking-wider transition-colors ${
              active === item.id
                ? "border-l-2 border-[#ff003c] bg-white/5 text-[#00f0ff]"
                : "text-[#e1f5fe]/40 hover:bg-white/[0.02] hover:text-white"
            }`}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="border-t border-[#222] p-3">
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 px-3 py-2.5 font-terminal text-sm tracking-wider text-[#ff003c]/60 transition-colors hover:text-[#ff003c]"
        >
          <Zap className="h-4 w-4" />
          LOGOUT
        </button>
        <Link
          to="/"
          className="flex items-center gap-3 px-3 py-2.5 font-terminal text-sm tracking-wider text-[#e1f5fe]/20 transition-colors hover:text-[#e1f5fe]/40"
        >
          <ArrowLeft className="h-4 w-4" />
          BACK_TO_SITE
        </Link>
      </div>
    </aside>
  );
}

export default function AdminVouchers() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const isAdmin = user?.role === "admin";
  const [page, setPage] = useState(0);
  const pageSize = 12;
  const { data: vouchers, isLoading } = trpc.admin.vouchers.useQuery(
    { limit: pageSize, offset: page * pageSize },
    { enabled: isAdmin },
  );
  const [form, setForm] = useState<VoucherForm>(() => ({ ...emptyForm, ...defaultVoucherDates() }));
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const activeCount = useMemo(() => vouchers?.activeCount ?? 0, [vouchers?.activeCount]);

  const invalidate = () => utils.admin.vouchers.invalidate();
  const createVoucher = trpc.admin.createVoucher.useMutation({
    onSuccess: async () => {
      setMessage("Voucher berhasil dibuat");
      setError("");
      setForm({ ...emptyForm, ...defaultVoucherDates() });
      await invalidate();
    },
    onError: (err) => {
      setMessage("");
      setError(err.message);
    },
  });
  const updateVoucher = trpc.admin.updateVoucher.useMutation({
    onSuccess: async () => {
      setMessage("Voucher berhasil diperbarui");
      setError("");
      setForm({ ...emptyForm, ...defaultVoucherDates() });
      await invalidate();
    },
    onError: (err) => {
      setMessage("");
      setError(err.message);
    },
  });
  const deleteVoucher = trpc.admin.deleteVoucher.useMutation({
    onSuccess: async () => {
      setMessage("Voucher dihapus");
      setError("");
      if ((vouchers?.items.length ?? 0) <= 1 && page > 0) setPage((current) => Math.max(0, current - 1));
      await invalidate();
    },
    onError: (err) => {
      setMessage("");
      setError(err.message);
    },
  });

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !isAdmin)) navigate("/");
  }, [authLoading, isAuthenticated, isAdmin, navigate]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setError("");
    const payload = {
      code: form.code,
      type: form.type,
      value: Number(form.value),
      minOrder: Number(form.minOrder || 0),
      maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : null,
      usageLimit: Number(form.usageLimit),
      validFrom: form.validFrom,
      validUntil: form.validUntil,
      isActive: form.isActive,
    };

    if (form.id) {
      updateVoucher.mutate({
        id: form.id,
        ...payload,
        usageCount: Number(form.usageCount || 0),
      });
      return;
    }

    createVoucher.mutate(payload);
  };

  const editVoucher = (voucher: NonNullable<typeof vouchers>["items"][number]) => {
    setForm({
      id: voucher.id,
      code: voucher.code,
      type: voucher.type,
      value: String(voucher.value),
      minOrder: String(voucher.minOrder),
      maxDiscount: voucher.maxDiscount ? String(voucher.maxDiscount) : "",
      usageLimit: String(voucher.usageLimit),
      usageCount: String(voucher.usageCount),
      validFrom: toDateTimeInput(voucher.validFrom),
      validUntil: toDateTimeInput(voucher.validUntil),
      isActive: voucher.isActive,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (authLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#030305]">
        <Loader2 className="h-8 w-8 animate-spin text-[#ff003c]" />
      </div>
    );
  }
  if (!isAdmin) return null;

  return (
    <div className="flex min-h-[100dvh] bg-[#030305] font-terminal text-white">
      <AdminSidebar active="vouchers" />
      <AdminMobileNav active="vouchers" />
      <main className="min-w-0 flex-1">
        <header className="border-b border-[#222] bg-[#11131a]/50 px-4 py-4 sm:px-6">
          <p className="text-[10px] tracking-wider text-[#00f0ff]">VOUCHERS // DISCOUNT_CONTROL</p>
          <p className="mt-1 text-[9px] tracking-wider text-[#e1f5fe]/30">
            ACTIVE_CODES: {activeCount} / TOTAL_CODES: {vouchers?.total ?? 0}
          </p>
        </header>

        <div className="grid gap-6 p-4 pb-24 sm:p-6 lg:grid-cols-[420px_minmax(0,1fr)] lg:pb-6">
          <section className="border border-[#222] bg-[#11131a] p-5">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] tracking-wider text-[#ffb800]">
                  {form.id ? "EDIT_VOUCHER" : "CREATE_VOUCHER"}
                </p>
                <h1 className="mt-1 font-display text-2xl font-bold text-white">Kode Voucher</h1>
              </div>
              <Tags className="h-6 w-6 text-[#ffb800]" />
            </div>

            <form onSubmit={submit} className="grid gap-4">
              <label>
                <span className="mb-2 block text-[10px] tracking-wider text-white/40">CODE</span>
                <input
                  value={form.code}
                  onChange={(event) => setForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))}
                  placeholder="DISKON10"
                  className="w-full border border-[#222] bg-[#0b0d14] px-4 py-3 text-sm uppercase text-white outline-none focus:border-[#00f0ff]/50"
                  required
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label>
                  <span className="mb-2 block text-[10px] tracking-wider text-white/40">TYPE</span>
                  <select
                    value={form.type}
                    onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as "percent" | "fixed" }))}
                    className="w-full border border-[#222] bg-[#0b0d14] px-4 py-3 text-sm text-white outline-none focus:border-[#00f0ff]/50"
                  >
                    <option value="percent">Persen</option>
                    <option value="fixed">Nominal</option>
                  </select>
                </label>
                <label>
                  <span className="mb-2 block text-[10px] tracking-wider text-white/40">
                    VALUE {form.type === "percent" ? "(%)" : "(Rp)"}
                  </span>
                  <input
                    type="number"
                    min="1"
                    value={form.value}
                    onChange={(event) => setForm((current) => ({ ...current, value: event.target.value }))}
                    className="w-full border border-[#222] bg-[#0b0d14] px-4 py-3 text-sm text-white outline-none focus:border-[#00f0ff]/50"
                    required
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label>
                  <span className="mb-2 block text-[10px] tracking-wider text-white/40">MIN_ORDER</span>
                  <input
                    type="number"
                    min="0"
                    value={form.minOrder}
                    onChange={(event) => setForm((current) => ({ ...current, minOrder: event.target.value }))}
                    className="w-full border border-[#222] bg-[#0b0d14] px-4 py-3 text-sm text-white outline-none focus:border-[#00f0ff]/50"
                  />
                </label>
                <label>
                  <span className="mb-2 block text-[10px] tracking-wider text-white/40">MAX_DISCOUNT</span>
                  <input
                    type="number"
                    min="0"
                    value={form.maxDiscount}
                    onChange={(event) => setForm((current) => ({ ...current, maxDiscount: event.target.value }))}
                    placeholder="Kosongkan"
                    className="w-full border border-[#222] bg-[#0b0d14] px-4 py-3 text-sm text-white outline-none placeholder:text-white/20 focus:border-[#00f0ff]/50"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label>
                  <span className="mb-2 block text-[10px] tracking-wider text-white/40">USAGE_LIMIT</span>
                  <input
                    type="number"
                    min="1"
                    value={form.usageLimit}
                    onChange={(event) => setForm((current) => ({ ...current, usageLimit: event.target.value }))}
                    className="w-full border border-[#222] bg-[#0b0d14] px-4 py-3 text-sm text-white outline-none focus:border-[#00f0ff]/50"
                    required
                  />
                </label>
                {form.id && (
                  <label>
                    <span className="mb-2 block text-[10px] tracking-wider text-white/40">USAGE_COUNT</span>
                    <input
                      type="number"
                      min="0"
                      value={form.usageCount}
                      onChange={(event) => setForm((current) => ({ ...current, usageCount: event.target.value }))}
                      className="w-full border border-[#222] bg-[#0b0d14] px-4 py-3 text-sm text-white outline-none focus:border-[#00f0ff]/50"
                    />
                  </label>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label>
                  <span className="mb-2 block text-[10px] tracking-wider text-white/40">VALID_FROM</span>
                  <input
                    type="datetime-local"
                    value={form.validFrom}
                    onChange={(event) => setForm((current) => ({ ...current, validFrom: event.target.value }))}
                    className="w-full border border-[#222] bg-[#0b0d14] px-4 py-3 text-sm text-white outline-none focus:border-[#00f0ff]/50"
                    required
                  />
                </label>
                <label>
                  <span className="mb-2 block text-[10px] tracking-wider text-white/40">VALID_UNTIL</span>
                  <input
                    type="datetime-local"
                    value={form.validUntil}
                    onChange={(event) => setForm((current) => ({ ...current, validUntil: event.target.value }))}
                    className="w-full border border-[#222] bg-[#0b0d14] px-4 py-3 text-sm text-white outline-none focus:border-[#00f0ff]/50"
                    required
                  />
                </label>
              </div>

              <label className="flex items-center justify-between border border-[#222] bg-[#0b0d14] px-4 py-3 text-sm">
                <span className="text-white/60">Voucher aktif</span>
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
                  className="h-5 w-5 accent-[#ff003c]"
                />
              </label>

              {message && <p className="border border-[#0aff00]/20 bg-[#0aff00]/10 px-4 py-3 text-xs text-[#0aff00]">{message}</p>}
              {error && <p className="border border-[#ff003c]/20 bg-[#ff003c]/10 px-4 py-3 text-xs text-[#ffb8c7]">{error}</p>}

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  disabled={createVoucher.isPending || updateVoucher.isPending}
                  className="inline-flex flex-1 items-center justify-center gap-2 bg-[#ff003c] px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
                >
                  {createVoucher.isPending || updateVoucher.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {form.id ? "UPDATE" : "CREATE"}
                </button>
                {form.id && (
                  <button
                    type="button"
                    onClick={() => setForm({ ...emptyForm, ...defaultVoucherDates() })}
                    className="border border-[#222] px-5 py-3 text-sm text-white/60 hover:text-white"
                  >
                    CANCEL
                  </button>
                )}
              </div>
            </form>
          </section>

          <section className="border border-[#222] bg-[#11131a]">
            <div className="flex items-center justify-between border-b border-[#222] p-5">
              <h2 className="font-terminal text-sm tracking-wider text-white">VOUCHER_LIST</h2>
              {isLoading && <Loader2 className="h-4 w-4 animate-spin text-[#ff003c]" />}
            </div>

            <div className="grid gap-3 p-3 xl:hidden">
              {vouchers?.items.map((voucher) => (
                <article key={voucher.id} className="border border-[#222] bg-[#0b0d14] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-bold text-[#00f0ff]">{voucher.code}</p>
                      <p className="mt-1 text-xs text-white/45">
                        {voucher.type === "percent" ? `${voucher.value}%` : `Rp${Number(voucher.value).toLocaleString()}`}
                      </p>
                    </div>
                    <span className={voucher.isActive ? "text-xs text-[#0aff00]" : "text-xs text-[#ff003c]"}>
                      {voucher.isActive ? "ACTIVE" : "OFF"}
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-white/35">
                    Usage {voucher.usageCount}/{voucher.usageLimit} - sampai {new Date(voucher.validUntil).toLocaleDateString("id-ID")}
                  </p>
                  <div className="mt-4 flex gap-2">
                    <button onClick={() => editVoucher(voucher)} className="flex-1 border border-[#00f0ff]/25 px-3 py-2 text-xs text-[#00f0ff]">EDIT</button>
                    <button onClick={() => deleteVoucher.mutate({ id: voucher.id })} className="border border-[#ff003c]/25 px-3 py-2 text-xs text-[#ff003c]">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto xl:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-[#ff003c]">
                    {["CODE", "DISCOUNT", "MIN", "USAGE", "VALID", "STATUS", "ACTION"].map((item) => (
                      <th key={item} className="px-5 py-3 text-left text-[10px] font-normal tracking-wider text-[#e1f5fe]/40">
                        {item}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {vouchers?.items.map((voucher) => (
                    <tr key={voucher.id} className="border-b border-[#222] transition-colors hover:bg-white/[0.02]">
                      <td className="px-5 py-3 text-sm font-bold text-[#00f0ff]">{voucher.code}</td>
                      <td className="px-5 py-3 text-xs text-white">
                        {voucher.type === "percent" ? `${voucher.value}%` : `Rp${Number(voucher.value).toLocaleString()}`}
                        {voucher.maxDiscount && <span className="block text-[10px] text-white/30">max Rp{Number(voucher.maxDiscount).toLocaleString()}</span>}
                      </td>
                      <td className="px-5 py-3 text-xs text-white/50">Rp{Number(voucher.minOrder).toLocaleString()}</td>
                      <td className="px-5 py-3 text-xs text-white/50">{voucher.usageCount}/{voucher.usageLimit}</td>
                      <td className="px-5 py-3 text-[10px] text-white/35">
                        {new Date(voucher.validFrom).toLocaleDateString("id-ID")} - {new Date(voucher.validUntil).toLocaleDateString("id-ID")}
                      </td>
                      <td className={voucher.isActive ? "px-5 py-3 text-xs text-[#0aff00]" : "px-5 py-3 text-xs text-[#ff003c]"}>
                        {voucher.isActive ? "ACTIVE" : "OFF"}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => editVoucher(voucher)} className="border border-[#00f0ff]/25 px-3 py-2 text-[10px] text-[#00f0ff]">EDIT</button>
                          <button onClick={() => deleteVoucher.mutate({ id: voucher.id })} className="border border-[#ff003c]/25 px-3 py-2 text-[10px] text-[#ff003c]">
                            DELETE
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <TablePagination
              page={page}
              pageSize={pageSize}
              total={vouchers?.total ?? 0}
              onPageChange={setPage}
            />
          </section>
        </div>
      </main>
    </div>
  );
}
