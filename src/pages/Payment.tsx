import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Loader2,
  XCircle,
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { trpc } from "@/providers/trpc";

function formatRupiah(value: number | string | null | undefined) {
  const amount = Number(value || 0);
  return `Rp${Math.round(amount).toLocaleString("id-ID")}`;
}

export default function PaymentPage() {
  const { invoiceNumber = "" } = useParams<{ invoiceNumber: string }>();
  const [copied, setCopied] = useState(false);
  const { data: transaction, isLoading, error } = trpc.transaction.getByInvoice.useQuery(
    { invoiceNumber },
    {
      enabled: !!invoiceNumber,
      refetchInterval: (query) => {
        const data = query.state.data;
        return data && ["pending", "processing"].includes(data.status) ? 3000 : false;
      },
    },
  );

  useEffect(() => {
    if (transaction && !["pending", "processing"].includes(transaction.status)) {
      localStorage.removeItem("isikuy:lastPendingInvoice");
    }
  }, [transaction]);

  const copyInvoice = () => {
    navigator.clipboard.writeText(invoiceNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const status = transaction?.status || "pending";
  const paymentStatus = transaction?.paymentStatus || "unpaid";
  const isPaid = paymentStatus === "paid";
  const isSuccess = status === "success";
  const isFailed = ["failed", "cancelled", "refunded"].includes(status);
  const paidButFailed = isPaid && status === "failed";
  const StatusIcon = isSuccess ? CheckCircle2 : isFailed ? XCircle : isPaid ? Loader2 : Clock;

  return (
    <div className="min-h-[100dvh] site-bg text-white">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 pb-16 pt-28 sm:px-6">
        <Link to="/history" className="mb-6 inline-flex items-center gap-2 text-sm text-white/45 hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Riwayat transaksi
        </Link>

        {isLoading ? (
          <div className="flex min-h-80 items-center justify-center rounded-2xl border border-white/10 bg-[#11131a]">
            <Loader2 className="h-8 w-8 animate-spin text-[#ff003c]" />
          </div>
        ) : error || !transaction ? (
          <div className="rounded-2xl border border-[#ff003c]/20 bg-[#27050c]/60 p-6 text-center">
            <AlertCircle className="mx-auto mb-3 h-10 w-10 text-[#ff4967]" />
            <h1 className="font-display text-2xl font-bold">Transaksi tidak ditemukan</h1>
            <p className="mt-2 text-sm text-white/45">Cek kembali nomor invoice yang kamu buka.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <section className="rounded-2xl border border-white/10 bg-[#11131a] p-6 text-center">
              <div
                className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${
                  isSuccess
                    ? "bg-[#0aff00]/10 text-[#0aff00]"
                    : isFailed
                      ? "bg-[#ff003c]/10 text-[#ff4967]"
                      : "bg-[#ffb800]/10 text-[#ffb800]"
                }`}
              >
                <StatusIcon className={`h-8 w-8 ${isPaid && !isSuccess && !isFailed ? "animate-spin" : ""}`} />
              </div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-[#00f0ff]">Invoice</p>
              <div className="mt-2 flex items-center justify-center gap-2">
                <h1 className="break-all font-terminal text-xl font-bold tracking-wider">{transaction.invoiceNumber}</h1>
                <button onClick={copyInvoice} className="rounded p-2 text-[#00f0ff] hover:bg-white/5" aria-label="Copy invoice">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
              <p className="mt-3 text-sm text-white/45">
                {isSuccess
                  ? "Pesanan berhasil diproses."
                  : paidButFailed
                    ? "Pembayaran sudah diterima, tetapi order gagal diproses. Admin akan bantu cek untuk proses ulang atau refund."
                    : isFailed
                    ? "Transaksi tidak bisa dilanjutkan."
                    : isPaid
                      ? "Pembayaran sudah diterima, pesanan sedang diproses."
                      : "Selesaikan pembayaran QRIS sebelum waktu habis."}
              </p>
            </section>

            {(transaction.issue || paidButFailed) && (
              <section className="rounded-2xl border border-[#ffb800]/25 bg-[#2a1d05]/45 p-4 text-sm text-[#ffe5a3]">
                <div className="flex gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#ffb800]" />
                  <div>
                    <p className="font-semibold text-white">Butuh pengecekan admin</p>
                    <p className="mt-1 text-white/60">
                      {transaction.issue ||
                        "Pembayaran sudah masuk, tetapi pesanan gagal diproses. Simpan invoice ini untuk bantuan admin."}
                    </p>
                    {paidButFailed && (
                      <Link
                        to="/kontak"
                        className="mt-3 inline-flex rounded-xl border border-[#ffb800]/30 bg-[#ffb800]/10 px-4 py-2 text-xs font-semibold text-[#ffb800] hover:bg-[#ffb800]/15"
                      >
                        Hubungi kami
                      </Link>
                    )}
                  </div>
                </div>
              </section>
            )}

            <section className="grid gap-6 lg:grid-cols-[1fr_280px]">
              <div className="rounded-2xl border border-white/10 bg-[#11131a] p-6">
                <h2 className="mb-4 font-display text-lg font-bold">Detail Pesanan</h2>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-white/45">Produk</span>
                    <span className="text-right font-semibold">{transaction.providerProductName || transaction.product?.name || "-"}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-white/45">Tujuan</span>
                    <span className="text-right font-semibold">
                      {transaction.playerId}
                      {transaction.serverId ? ` (${transaction.serverId})` : ""}
                    </span>
                  </div>
                  <div className="h-px bg-white/10" />
                  <div className="flex justify-between gap-4">
                    <span className="text-white/45">Harga Awal</span>
                    <span>{formatRupiah(transaction.baseAmount)}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-white/45">Biaya/Pajak QRIS</span>
                    <span>{formatRupiah(Number(transaction.totalAmount) - Number(transaction.baseAmount))}</span>
                  </div>
                  <div className="flex justify-between gap-4 text-base font-bold">
                    <span>Total Bayar</span>
                    <span className="text-[#ff003c]">{formatRupiah(transaction.totalAmount)}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#11131a] p-6 text-center">
                {!isPaid && transaction.payment?.qrImage ? (
                  <>
                    <p className="mb-3 text-xs text-white/45">Scan QRIS</p>
                    <img
                      src={transaction.payment.qrImage}
                      alt="QRIS pembayaran"
                      className="mx-auto h-52 w-52 rounded-xl bg-white object-contain p-2"
                    />
                  </>
                ) : (
                  <div className="flex min-h-52 flex-col items-center justify-center">
                    <StatusIcon className={`mb-3 h-10 w-10 ${isSuccess ? "text-[#0aff00]" : isFailed ? "text-[#ff003c]" : "text-[#ffb800]"}`} />
                    <p className="text-sm text-white/55">
                      {paidButFailed
                        ? "QRIS sudah dibayar, pesanan gagal diproses."
                        : isPaid
                          ? "QRIS sudah dibayar."
                          : "Detail QRIS tidak tersedia."}
                    </p>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
