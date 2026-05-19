import { useState } from "react";
import { Link } from "react-router";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { optimizedImagePath } from "@/lib/images";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import {
  History,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  ChevronRight,
  Loader2,
  Gamepad2,
  Receipt,
} from "lucide-react";

export default function HistoryPage() {
  const { isAuthenticated } = useAuth();
  const [searchInvoice, setSearchInvoice] = useState("");
  const [searchedTx, setSearchedTx] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const utils = trpc.useUtils();

  const { data: myHistory, isLoading } =
    trpc.transaction.myHistory.useQuery(undefined, {
      enabled: isAuthenticated,
    });

  const handleSearch = async () => {
    if (!searchInvoice.trim()) return;
    setSearching(true);
    try {
      const data = await utils.transaction.getByInvoice.fetch({
        invoiceNumber: searchInvoice.trim(),
      });
      setSearchedTx(data);
    } catch {
      setSearchedTx(null);
    } finally {
      setSearching(false);
    }
  };

  const statusConfig: Record<string, { icon: any; color: string; label: string }> = {
    pending: { icon: Clock, color: "text-[#ffb800]", label: "Pending" },
    processing: { icon: Loader2, color: "text-[#00f0ff]", label: "Processing" },
    success: { icon: CheckCircle2, color: "text-[#0aff00]", label: "Success" },
    failed: { icon: XCircle, color: "text-[#ff003c]", label: "Failed" },
    cancelled: { icon: XCircle, color: "text-white/30", label: "Cancelled" },
    refunded: { icon: AlertCircle, color: "text-[#ffb800]", label: "Refunded" },
  };

  return (
    <div className="min-h-[100dvh] bg-[#030305]">
      <Navbar />

      <div className="pt-28 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-10">
            <div className="flex items-center gap-2 text-sm text-white/40 mb-4">
              <Link to="/" className="hover:text-white transition-colors">
                Home
              </Link>
              <ChevronRight className="w-3 h-3" />
              <span className="text-[#ff003c]">Riwayat</span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-white mb-2">
              Riwayat Transaksi
            </h1>
            <p className="text-sm text-white/50">
              Lacak dan kelola semua transaksi top-up Anda
            </p>
          </div>

          {/* Invoice Search */}
          <div className="glass rounded-2xl p-6 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Receipt className="w-5 h-5 text-[#00f0ff]" />
              <h3 className="font-display text-base font-semibold text-white">
                Cek Status Transaksi
              </h3>
            </div>
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Receipt className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                <input
                  type="text"
                  value={searchInvoice}
                  onChange={(e) => setSearchInvoice(e.target.value)}
                  placeholder="Masukkan nomor invoice..."
                  className="w-full pl-10 pr-4 py-3 rounded-xl glass text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#00f0ff]/50 transition-colors"
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={searching || !searchInvoice.trim()}
                className="px-6 py-3 bg-gradient-to-r from-[#00f0ff] to-[#00b8c4] text-black font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-30 flex items-center gap-2"
              >
                {searching ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                Cek
              </button>
            </div>

            {/* Search Result */}
            {searchedTx && (
              <div className="mt-4 p-4 glass rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-terminal text-sm text-[#00f0ff]">
                    {searchedTx.invoiceNumber}
                  </span>
                  <span
                    className={`text-xs font-medium ${
                      statusConfig[searchedTx.status]?.color || "text-white/50"
                    }`}
                  >
                    {statusConfig[searchedTx.status]?.label || searchedTx.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-white/40">Game</span>
                  <span className="text-white text-right">
                    {searchedTx.game?.name || "-"}
                  </span>
                  <span className="text-white/40">Total</span>
                  <span className="text-[#ff003c] font-semibold text-right">
                    Rp{parseFloat(searchedTx.totalAmount).toLocaleString()}
                  </span>
                </div>
                <Link
                  to={`/payment/${searchedTx.invoiceNumber}`}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#00f0ff]/25 bg-[#00f0ff]/10 px-4 py-3 text-sm font-semibold text-[#00f0ff]"
                >
                  Lihat Pembayaran / QRIS
                </Link>
              </div>
            )}
          </div>

          {/* Transaction List */}
          {isAuthenticated ? (
            <div>
              <div className="flex items-center gap-3 mb-5">
                <History className="w-5 h-5 text-[#ff003c]" />
                <h3 className="font-display text-base font-semibold text-white">
                  Transaksi Saya
                </h3>
              </div>

              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-6 h-6 text-[#ff003c] animate-spin" />
                </div>
              ) : myHistory && myHistory.length > 0 ? (
                <div className="space-y-3">
                  {myHistory.map((tx: any) => {
                    const status = statusConfig[tx.status] || {
                      icon: AlertCircle,
                      color: "text-white/30",
                      label: tx.status,
                    };
                    const StatusIcon = status.icon;

                    return (
                      <div
                        key={tx.id}
                        className="glass rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-4"
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-white/5">
                            {tx.gameCover ? (
                              <img
                                src={optimizedImagePath(tx.gameCover)}
                                alt={tx.gameName}
                                loading="lazy"
                                decoding="async"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Gamepad2 className="w-6 h-6 text-white/20 m-3" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white truncate">
                              {tx.gameName}
                            </p>
                            <p className="text-xs text-white/40">
                              {tx.productName} &middot; {tx.nominalAmount}
                            </p>
                            <p className="font-terminal text-[10px] text-white/20 mt-1">
                              {tx.invoiceNumber}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-4">
                          <div className="text-right">
                            <p className="font-display text-base font-bold text-[#ff003c]">
                              Rp{parseFloat(tx.totalAmount).toLocaleString()}
                            </p>
                            <div className="flex items-center gap-1 justify-end mt-1">
                              <StatusIcon
                                className={`w-3 h-3 ${status.color}`}
                              />
                              <span
                                className={`text-xs ${status.color}`}
                              >
                                {status.label}
                              </span>
                            </div>
                            <Link
                              to={`/payment/${tx.invoiceNumber}`}
                              className="mt-2 inline-flex items-center justify-center rounded-lg border border-[#00f0ff]/25 px-3 py-1.5 text-xs font-semibold text-[#00f0ff] hover:bg-[#00f0ff]/10"
                            >
                              {tx.paymentStatus === "unpaid" ? "Lanjut Bayar" : "Detail"}
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 glass rounded-2xl">
                  <History className="w-10 h-10 text-white/10 mx-auto mb-3" />
                  <p className="text-sm text-white/40">
                    Belum ada transaksi
                  </p>
                  <Link
                    to="/games"
                    className="text-sm text-[#00f0ff] hover:underline mt-2 inline-block"
                  >
                    Mulai Top Up
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 glass rounded-2xl">
              <AlertCircle className="w-10 h-10 text-white/10 mx-auto mb-3" />
              <p className="text-sm text-white/40 mb-3">
                Login untuk melihat riwayat transaksi Anda
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#ff003c] to-[#b30029] text-white font-semibold rounded-xl text-sm"
              >
                Login
              </Link>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
