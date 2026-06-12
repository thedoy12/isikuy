import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import { Clock, Loader2, X } from "lucide-react";
import { trpc } from "@/providers/trpc";

export default function PendingPaymentResume() {
  const location = useLocation();
  const [invoice, setInvoice] = useState("");
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setInvoice(localStorage.getItem("isikuy:lastPendingInvoice") || "");
  }, [location.pathname]);

  const { data } = trpc.transaction.checkStatus.useQuery(
    { invoiceNumber: invoice },
    {
      enabled: !!invoice && !dismissed,
      refetchInterval: 10_000,
    },
  );

  useEffect(() => {
    if (data && !["pending", "processing"].includes(data.status)) {
      localStorage.removeItem("isikuy:lastPendingInvoice");
      setInvoice("");
    }
  }, [data]);

  if (!invoice || dismissed || location.pathname.startsWith("/payment/")) return null;
  if (data && data.paymentStatus !== "unpaid") return null;
  const paymentIsProcessing = data?.status === "processing";

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[60] mx-auto max-w-md rounded-2xl border border-[#ffb800]/25 bg-[#11131a]/95 p-4 text-white shadow-2xl backdrop-blur-xl sm:left-auto sm:right-5">
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="absolute right-3 top-3 rounded p-1 text-white/35 hover:text-white"
        aria-label="Tutup"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex gap-3 pr-7">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ffb800]/10 text-[#ffb800]">
          {paymentIsProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Clock className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-bold">
            {paymentIsProcessing ? "Pembayaran Diproses" : "Pembayaran Belum Selesai"}
          </p>
          <p className="mt-1 truncate font-terminal text-[11px] text-white/40">{invoice}</p>
          <Link
            to={`/payment/${invoice}`}
            className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-[#ffb800] px-4 py-2 text-sm font-bold text-black"
          >
            {paymentIsProcessing ? "Cek Status" : "Lanjutkan Pembayaran"}
          </Link>
        </div>
      </div>
    </div>
  );
}
