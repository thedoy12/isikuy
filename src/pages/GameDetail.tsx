import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router";
import { trpc } from "@/providers/trpc";
import { optimizedImagePath } from "@/lib/images";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import {
  ChevronRight,
  User,
  Server,
  Wallet,
  CreditCard,
  Landmark,
  QrCode,
  Tag,
  CheckCircle2,
  Clock,
  AlertCircle,
  AlertTriangle,
  Copy,
  Check,
  Loader2,
  Shield,
  Zap,
  ListChecks,
} from "lucide-react";

const paymentIcons: Record<string, React.ReactNode> = {
  qris: <QrCode className="w-5 h-5" />,
  gopay: <Wallet className="w-5 h-5" />,
  ovo: <CreditCard className="w-5 h-5" />,
  dana: <Wallet className="w-5 h-5" />,
  va: <Landmark className="w-5 h-5" />,
  saldo: <Wallet className="w-5 h-5" />,
};

type CheckoutPayment = {
  provider: string;
  reference: string;
  paymentId: string;
  amountTotal: number;
  amountReceived: number;
  amountRequested?: number;
  providerAdjustment?: number;
  payUrl: string | null;
  payCode: string | null;
  qrString: string | null;
  qrImage: string | null;
  instructions: Array<{
    title: string;
    steps: string[];
  }>;
  expiredAt: string;
} | null;

function getTargetGuide(slug: string, targetLabel: string, serverLabel?: string | null) {
  const serverText = serverLabel || "Server ID";
  const guides: Record<string, string[]> = {
    "mobile-legends": [
      "Buka profil Mobile Legends, lalu salin User ID dan Zone ID yang ada di bawah nama akun.",
      "Masukkan User ID di kolom tujuan dan Zone ID di kolom server.",
      "Pilih nominal diamond, bayar QRIS, lalu tunggu item masuk ke akun.",
    ],
    "mobile-legends-gift": [
      "Buka profil Mobile Legends dan pastikan User ID serta Zone ID penerima sudah benar.",
      "Masukkan data penerima sesuai kolom yang tersedia.",
      "Pilih item gift, bayar QRIS, lalu cek akun penerima setelah transaksi diproses.",
    ],
    "genshin-impact": [
      "Buka menu profil Genshin Impact, salin UID, lalu pastikan server akun sudah sesuai.",
      "Masukkan UID pada kolom tujuan dan pilih/ketik server akun.",
      "Pilih nominal Genesis Crystal, bayar QRIS, lalu cek saldo di dalam game.",
    ],
    valorant: [
      "Pastikan Riot ID atau data akun tujuan sudah benar sebelum membuat pesanan.",
      "Masukkan ID tujuan, pilih nominal VP, lalu lanjutkan ke pembayaran QRIS.",
      "Tunggu transaksi selesai dan cek saldo di akun Valorant.",
    ],
    roblox: [
      "Masukkan username atau ID akun Roblox tujuan dengan teliti.",
      "Pilih nominal Robux yang ingin dibeli, lalu buat QRIS.",
      "Setelah pembayaran berhasil, tunggu saldo masuk sesuai proses provider.",
    ],
    "pubg-mobile": [
      "Buka profil PUBG Mobile dan salin Character ID akun tujuan.",
      "Masukkan Character ID, pilih nominal UC, lalu lanjutkan pembayaran.",
      "Cek UC di akun setelah status pesanan berhasil.",
    ],
    "free-fire": [
      "Buka profil Free Fire dan salin Player ID akun tujuan.",
      "Masukkan Player ID, pilih nominal diamond, lalu bayar menggunakan QRIS.",
      "Tunggu pesanan diproses dan cek diamond di akun.",
    ],
  };

  return (
    guides[slug] || [
      `Siapkan ${targetLabel}${serverLabel ? ` dan ${serverText}` : ""} yang benar dari akun tujuan.`,
      "Pilih nominal produk yang ingin dibeli, lalu cek ringkasan pesanan.",
      "Bayar menggunakan QRIS dan tunggu pesanan masuk otomatis setelah pembayaran berhasil.",
    ]
  );
}

export default function GameDetail() {
  const { slug } = useParams<{ slug: string }>();
  const utils = trpc.useUtils();

  const { data: game, isLoading } = trpc.game.getBySlug.useQuery(
    { slug: slug || "" },
    { enabled: !!slug }
  );
  const { data: paymentMethods } = trpc.payment.methods.useQuery();
  const { data: paymentStatus } = trpc.payment.status.useQuery(undefined, {
    refetchInterval: 30_000,
  });
  const createTransaction = trpc.transaction.create.useMutation({
    onSuccess: (data) => {
      setInvoiceNumber(data.invoiceNumber);
      setPaymentDetails(data.payment);
      localStorage.setItem("isikuy:lastPendingInvoice", data.invoiceNumber);
      setShowQris(false);
      setStep("payment");
    },
    onError: (err) => setCheckoutError(err.message),
  });
  const processPayment = trpc.transaction.processPayment.useMutation({
    onSuccess: () => {
      utils.transaction.checkStatus.invalidate({ invoiceNumber });
    },
  });

  const [step, setStep] = useState<"form" | "payment" | "success">("form");
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const [playerId, setPlayerId] = useState("");
  const [serverId, setServerId] = useState("");
  const [selectedPayment, setSelectedPayment] = useState<number | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [paymentDetails, setPaymentDetails] = useState<CheckoutPayment>(null);
  const [voucherCode, setVoucherCode] = useState("");
  const [checkoutError, setCheckoutError] = useState("");
  const [copied, setCopied] = useState(false);
  const [showQris, setShowQris] = useState(false);
  const [timeLeft, setTimeLeft] = useState(3600);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const selectedProductData = game?.products.find((p) => p.id === selectedProduct);
  const selectedProductPrice = selectedProductData
    ? parseFloat(selectedProductData.salePrice || selectedProductData.basePrice)
    : 0;
  const fallbackCover = game
    ? `https://placehold.co/1200x600/09090b/ffffff?text=${encodeURIComponent(game.name)}`
    : "";
  const categorySlug = game?.category?.slug || "";
  const isPhoneTarget = ["pulsa", "data", "ewallet"].includes(categorySlug);
  const isPlnTarget = categorySlug === "pln";
  const targetLabel = isPhoneTarget
    ? "Nomor HP"
    : isPlnTarget
      ? "ID Pelanggan / No. Meter"
      : categorySlug === "game"
        ? "User ID / Player ID"
        : "ID Tujuan";
  const targetPlaceholder = isPhoneTarget
    ? "Contoh: 08xxxxxxxxxx"
    : isPlnTarget
      ? "Contoh: 12345678901"
      : categorySlug === "game"
        ? "Contoh: 123456789"
        : "Masukkan ID tujuan";
  const usageGuide = isPhoneTarget
    ? [
        "Masukkan nomor HP tujuan dengan format yang benar.",
        "Pilih nominal yang ingin dibeli, lalu cek kembali ringkasan pesanan.",
        "Bayar menggunakan QRIS dan tunggu produk masuk ke nomor tujuan.",
      ]
    : isPlnTarget
      ? [
          "Masukkan ID Pelanggan atau nomor meter PLN dengan benar.",
          "Pilih nominal token, lalu cek kembali total pembayaran.",
          "Bayar menggunakan QRIS dan simpan token yang muncul di riwayat pesanan.",
        ]
      : getTargetGuide(slug || "", targetLabel, game?.serverIdLabel);

  const { data: paymentCalc } = trpc.payment.calculate.useQuery(
    {
      productId: selectedProduct || 0,
      paymentMethodId: selectedPayment || 0,
      basePrice: selectedProductPrice || undefined,
      voucherCode: voucherCode.trim() || undefined,
    },
    { enabled: !!selectedProduct && !!selectedPayment }
  );

  const { data: txStatus } = trpc.transaction.checkStatus.useQuery(
    { invoiceNumber },
    { enabled: !!invoiceNumber && step === "payment", refetchInterval: 3000 }
  );
  const payableAmount =
    paymentDetails?.amountTotal ?? (txStatus?.totalAmount ? parseFloat(txStatus.totalAmount) : 0);
  const productBaseAmount = paymentCalc?.basePrice ?? selectedProductPrice;
  const voucherDiscount = paymentCalc?.discountAmount ?? 0;
  const subtotalAfterDiscount =
    paymentDetails?.amountRequested ?? Math.max(1, productBaseAmount - voucherDiscount);
  const qrisAdjustment = Math.max(
    0,
    paymentDetails?.providerAdjustment ?? Math.max(0, payableAmount - subtotalAfterDiscount),
  );
  const orderIsProcessing =
    txStatus?.paymentStatus === "paid" && txStatus.status === "processing";

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (txStatus?.status === "success") {
      setStep("success");
      if (pollRef.current) clearInterval(pollRef.current);
    }
  }, [txStatus]);

  useEffect(() => {
    if (selectedPayment || !paymentMethods?.length) return;
    const qrisMethod =
      paymentMethods.find((method) => method.code === "qris") ??
      paymentMethods[0];
    setSelectedPayment(qrisMethod.id);
  }, [paymentMethods, selectedPayment]);

  useEffect(() => {
    if (step === "payment") {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [step]);

  const handleCheckout = () => {
    setCheckoutError("");
    if (!game || !selectedProduct || !selectedPayment || !playerId || !paymentCalc) return;
    const product = game.products.find((p) => p.id === selectedProduct);
    if (!product) return;

    createTransaction.mutate({
      gameId: game.id,
      productId: selectedProduct,
      playerId,
      serverId: game.hasServerId ? serverId : undefined,
      paymentMethodId: selectedPayment,
      voucherCode: voucherCode.trim() || undefined,
    });
  };

  const handlePayNow = () => {
    if (!invoiceNumber) return;
    if (paymentDetails) {
      utils.transaction.checkStatus.invalidate({ invoiceNumber });
      return;
    }
    if (import.meta.env.DEV) {
      processPayment.mutate({ invoiceNumber });
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const formatRupiah = (value: number) => `Rp${Math.round(value).toLocaleString("id-ID")}`;

  const copyInvoice = () => {
    navigator.clipboard.writeText(invoiceNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] bg-[#030305] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#ff003c] animate-spin" />
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-[100dvh] bg-[#030305] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-[#ff003c] mx-auto mb-4" />
          <h2 className="font-display text-2xl font-bold text-white mb-2">
            Game tidak ditemukan
          </h2>
          <Link
            to="/games"
            className="text-[#00f0ff] hover:underline text-sm"
          >
            Kembali ke daftar game
          </Link>
        </div>
      </div>
    );
  }

  // ─── Payment Status Screen ───
  if (step === "payment" && invoiceNumber) {
    return (
      <div className="min-h-[100dvh] bg-[#030305]">
        <Navbar />
        <div className="pt-28 pb-16">
          <div className="max-w-lg mx-auto px-4">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full bg-[#ff003c]/10 flex items-center justify-center mx-auto mb-4 animate-pulse-glow">
                <Clock className="w-8 h-8 text-[#ff003c]" />
              </div>
              <h2 className="font-display text-2xl font-bold text-white mb-1">
                {orderIsProcessing ? "Pesanan Diproses" : "Menunggu Pembayaran"}
              </h2>
              <p className="text-sm text-white/50">
                {orderIsProcessing
                  ? "Pembayaran sudah diterima, produk sedang dikirim"
                  : "Selesaikan pembayaran sebelum waktu habis"}
              </p>
            </div>

            {/* Timer */}
            <div className="glass rounded-2xl p-6 mb-6 text-center">
              <p className="text-xs text-white/40 mb-2">Waktu Tersisa</p>
              <p
                className={`font-display text-4xl font-bold ${
                  timeLeft < 300 ? "text-[#ff003c]" : "text-white"
                }`}
              >
                {formatTime(timeLeft)}
              </p>
            </div>

            {/* Invoice */}
            <div className="glass rounded-2xl p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-white/40">No. Invoice</span>
                <button
                  onClick={copyInvoice}
                  className="flex items-center gap-1 text-xs text-[#00f0ff] hover:underline"
                >
                  {copied ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <p className="font-terminal text-lg text-white tracking-wider">
                {invoiceNumber}
              </p>
            </div>

            {/* Details */}
            <div className="glass rounded-2xl p-6 mb-6">
              <h3 className="font-display text-sm font-semibold text-white mb-4">
                Detail Pesanan
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Game</span>
                  <span className="text-white">{game.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">{targetLabel}</span>
                  <span className="text-white">{playerId}</span>
                </div>
                {serverId && (
                  <div className="flex justify-between text-sm">
                    <span className="text-white/50">{game.serverIdLabel || "Server"}</span>
                    <span className="text-white">{serverId}</span>
                  </div>
                )}
                <div className="h-px bg-white/10" />
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Harga Awal</span>
                  <span className="text-white">{formatRupiah(productBaseAmount)}</span>
                </div>
                {voucherDiscount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-white/50">Diskon Voucher</span>
                    <span className="font-semibold text-[#0aff00]">-{formatRupiah(voucherDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Subtotal</span>
                  <span className="text-white">{formatRupiah(subtotalAfterDiscount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Biaya/Pajak QRIS</span>
                  <span className={qrisAdjustment > 0 ? "text-[#ffb800]" : "text-white/50"}>
                    {qrisAdjustment > 0 ? `+${formatRupiah(qrisAdjustment)}` : "Rp0"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Total Bayar QRIS</span>
                  <span className="text-[#ff003c] font-semibold">
                    {payableAmount ? formatRupiah(payableAmount) : "-"}
                  </span>
                </div>
              </div>
            </div>

            {/* QRIS Placeholder */}
            <div className="glass rounded-2xl p-6 mb-6 text-center">
              <p className="text-xs text-white/40 mb-2">Total yang harus dibayar</p>
              <p className="font-display text-4xl font-bold text-white mb-5">
                {payableAmount ? formatRupiah(payableAmount) : "-"}
              </p>

              {!showQris && (
                <button
                  type="button"
                  onClick={() => setShowQris(true)}
                  className="mx-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#00f0ff] to-[#00b8c4] px-6 py-3 text-sm font-semibold text-black transition-all hover:shadow-lg hover:shadow-[#00f0ff]/25"
                >
                  <QrCode className="h-4 w-4" />
                  Munculkan QRIS
                </button>
              )}

              <div
                className={`overflow-hidden transition-all duration-700 ease-out ${
                  showQris ? "mt-5 max-h-[440px] opacity-100" : "max-h-0 opacity-0"
                }`}
              >
                <div
                  className={`origin-top transition-transform duration-700 ease-out ${
                    showQris ? "translate-y-0 scale-y-100" : "-translate-y-4 scale-y-0"
                  }`}
                >
                  <p className="text-xs text-white/40 mb-4">
                    Scan QRIS dengan aplikasi e-wallet atau mobile banking
                  </p>
                  {paymentDetails?.qrImage ? (
                    <img
                      src={paymentDetails.qrImage}
                      alt="QRIS pembayaran"
                      loading="eager"
                      decoding="async"
                      className="w-48 h-48 mx-auto bg-white rounded-xl object-contain p-2"
                    />
                  ) : import.meta.env.DEV ? (
                    <div className="w-48 h-48 mx-auto bg-white rounded-xl flex items-center justify-center">
                      <div className="text-center">
                        <QrCode className="w-12 h-12 text-black/20 mx-auto mb-2" />
                        <p className="text-xs text-black/40 font-medium">
                          QRIS Code
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-[#ff003c]/20 bg-[#ff003c]/10 px-4 py-3 text-sm text-[#ffb8c7]">
                      Detail pembayaran belum tersedia. Silakan hubungi admin dengan nomor invoice ini.
                    </div>
                  )}
                  {paymentDetails?.payCode && (
                    <p className="font-terminal text-xs text-white/60 mt-4 break-all">
                      {paymentDetails.payCode}
                    </p>
                  )}
                  {paymentDetails?.reference && (
                    <p className="font-terminal text-[10px] text-white/30 mt-3">
                      REF: {paymentDetails.reference}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Status / dev simulation button */}
            <button
              onClick={handlePayNow}
              disabled={processPayment.isPending || (!paymentDetails && !import.meta.env.DEV)}
              className="w-full py-4 bg-gradient-to-r from-[#00f0ff] to-[#00b8c4] text-black font-semibold rounded-xl hover:shadow-lg hover:shadow-[#00f0ff]/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {processPayment.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-5 h-5" />
              )}
              {paymentDetails
                ? "Cek Status Pesanan"
                : import.meta.env.DEV
                  ? "Simulasikan Pembayaran"
                  : "Menunggu Callback Pembayaran"}
            </button>

            <button
              onClick={() => {
                setStep("form");
                setInvoiceNumber("");
                setPaymentDetails(null);
                setShowQris(false);
              }}
              className="w-full py-3 mt-3 text-sm text-white/40 hover:text-white transition-colors"
            >
              Batal
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // ─── Success Screen ───
  if (step === "success") {
    return (
      <div className="min-h-[100dvh] bg-[#030305]">
        <Navbar />
        <div className="pt-28 pb-16 flex items-center justify-center min-h-[60vh]">
          <div className="max-w-md mx-auto px-4 text-center">
            <div className="w-20 h-20 rounded-full bg-[#0aff00]/10 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-[#0aff00]" />
            </div>
            <h2 className="font-display text-3xl font-bold text-white mb-2">
              Pembayaran Berhasil!
            </h2>
            <p className="text-sm text-white/50 mb-8">
              Top up Anda sedang diproses dan akan masuk dalam 1-3 menit.
            </p>

            <div className="glass rounded-2xl p-6 mb-6 text-left">
              <div className="flex justify-between text-sm mb-3">
                <span className="text-white/50">Invoice</span>
                <span className="font-terminal text-white">
                  {invoiceNumber}
                </span>
              </div>
              <div className="flex justify-between text-sm mb-3">
                <span className="text-white/50">Game</span>
                <span className="text-white">{game.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Status</span>
                <span className="text-[#0aff00] flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Sukses
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to="/history"
                className="flex-1 py-3 bg-gradient-to-r from-[#ff003c] to-[#b30029] text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
              >
                Lihat Riwayat
              </Link>
              <button
                onClick={() => {
                  setStep("form");
                  setSelectedProduct(null);
                  setPlayerId("");
                  setServerId("");
                  setSelectedPayment(null);
                  setInvoiceNumber("");
                  setPaymentDetails(null);
                  setShowQris(false);
                }}
                className="flex-1 py-3 glass text-white font-semibold rounded-xl hover:bg-white/10 transition-colors"
              >
                Top Up Lagi
              </button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // ─── Form Screen ───
  return (
    <div className="min-h-[100dvh] bg-[#030305]">
      <Navbar />

      {/* Game Header */}
      <div className="relative pt-20">
        <div className="absolute inset-0 h-72 overflow-hidden">
          <img
            src={optimizedImagePath(game.bannerImage || game.coverImage) || fallbackCover}
            alt={game.name}
            loading="eager"
            decoding="async"
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#030305] via-[#030305]/70 to-transparent" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-8">
          <div className="flex items-center gap-2 text-sm text-white/40 mb-4">
            <Link to="/" className="hover:text-white transition-colors">
              Home
            </Link>
            <ChevronRight className="w-3 h-3" />
            <Link
              to="/games"
              className="hover:text-white transition-colors"
            >
              Games
            </Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-[#ff003c]">{game.name}</span>
          </div>

          <div className="flex items-start gap-5">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden flex-shrink-0 ring-2 ring-[#ff003c]/20">
              <img
                src={optimizedImagePath(game.cardImage || game.coverImage) || fallbackCover}
                alt={game.name}
                loading="eager"
                decoding="async"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h1 className="font-display text-3xl sm:text-4xl font-bold text-white mb-1">
                {game.name}
              </h1>
              <p className="text-sm text-white/50 mb-2">
                {game.category?.name || "Produk Digital"} &middot;{" "}
                <span className="uppercase">{game.platform}</span>
              </p>
              <p className="text-sm text-white/40 max-w-lg">
                {game.description}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px]">
          {/* Left Column - Form */}
          <div className="space-y-6">
            <div className="glass rounded-2xl p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#00f0ff]/25 bg-[#00f0ff]/10 text-[#00f0ff]">
                  <ListChecks className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-[#00f0ff]">
                    Tata Cara
                  </p>
                  <h3 className="font-display text-lg font-semibold text-white">
                    Cara Top Up {game.name}
                  </h3>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                {usageGuide.map((item, index) => (
                  <div key={item} className="rounded-xl border border-white/10 bg-black/25 p-4">
                    <div className="mb-3 flex h-7 w-7 items-center justify-center rounded-lg bg-[#ff003c] text-xs font-bold text-white">
                      {index + 1}
                    </div>
                    <p className="text-sm leading-relaxed text-white/65">{item}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-xl border border-[#ffb800]/20 bg-[#ffb800]/10 px-4 py-3 text-xs leading-relaxed text-[#ffe4a3]">
                Pastikan data tujuan sudah benar sebelum membuat QRIS. Pesanan yang sudah diproses tidak bisa dibatalkan otomatis.
              </div>
            </div>

            {/* Step 1: Select Product */}
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-lg bg-[#ff003c] flex items-center justify-center text-white text-sm font-bold">
                  1
                </div>
                <h3 className="font-display text-lg font-semibold text-white">
                  Pilih Nominal
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {game.products?.map((product) => {
                  const price = parseFloat(
                    product.salePrice || product.basePrice
                  );
                  const base = parseFloat(product.basePrice);
                  const isSelected = selectedProduct === product.id;

                  return (
                    <button
                      key={product.id}
                      onClick={() => setSelectedProduct(product.id)}
                      className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                        isSelected
                          ? "border-[#ff003c] bg-[#ff003c]/10"
                          : "border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]"
                      }`}
                    >
                      {product.isPromo && (product.discountPercent ?? 0) > 0 && (
                        <span className="absolute -top-2 -right-2 bg-[#ff003c] text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                          -{product.discountPercent}%
                        </span>
                      )}
                      <p className="text-xs text-white/40 mb-1">
                        {product.providerProductCode || product.nominalAmount}
                      </p>
                      <p className="font-display text-lg font-bold text-white">
                        {product.name}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <p className="text-sm text-[#00f0ff] font-semibold">
                          Rp{price.toLocaleString()}
                        </p>
                        {product.salePrice &&
                          parseFloat(product.salePrice) < base && (
                            <p className="text-xs text-white/30 line-through">
                              Rp{base.toLocaleString()}
                            </p>
                          )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Input Player ID */}
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-lg bg-[#ff003c] flex items-center justify-center text-white text-sm font-bold">
                  2
                </div>
                <h3 className="font-display text-lg font-semibold text-white">
                  Masukkan Data Tujuan
                </h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="flex items-center gap-2 text-sm text-white/60 mb-2">
                    <User className="w-4 h-4" />
                    {targetLabel}
                  </label>
                  <input
                    type="text"
                    value={playerId}
                    onChange={(e) => setPlayerId(e.target.value)}
                    placeholder={targetPlaceholder}
                    className="w-full px-4 py-3 rounded-xl glass text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#ff003c]/50 transition-colors"
                  />
                </div>

                {game.hasServerId && (
                  <div>
                    <label className="flex items-center gap-2 text-sm text-white/60 mb-2">
                      <Server className="w-4 h-4" />
                      {game.serverIdLabel || "Server ID"}
                    </label>
                    <input
                      type="text"
                      value={serverId}
                      onChange={(e) => setServerId(e.target.value)}
                      placeholder={game.serverIdPlaceholder || "e.g. 1"}
                      className="w-full px-4 py-3 rounded-xl glass text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#ff003c]/50 transition-colors"
                    />
                  </div>
                )}

                <div className="flex items-center gap-2 text-xs text-white/30">
                  <Shield className="w-3 h-3" />
                  <span>Data Anda terlindungi dengan enkripsi SSL</span>
                </div>
              </div>
            </div>

            {/* Step 3: Select Payment */}
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-lg bg-[#ff003c] flex items-center justify-center text-white text-sm font-bold">
                  3
                </div>
                <h3 className="font-display text-lg font-semibold text-white">
                  Pembayaran QRIS
                </h3>
              </div>

              {paymentStatus?.enabled && (
                <div className="mb-4 rounded-xl border border-[#ffb800]/25 bg-[#ffb800]/10 px-4 py-3 text-sm leading-relaxed text-[#ffe4a3]">
                  <div className="mb-1 flex items-center gap-2 font-semibold text-[#ffb800]">
                    <AlertTriangle className="h-4 w-4" />
                    Pembayaran Ditutup Sementara
                  </div>
                  {paymentStatus.message}
                </div>
              )}

              <div className="space-y-3">
                {paymentMethods?.map((method) => {
                  const isSelected = selectedPayment === method.id;
                  return (
                    <div
                      key={method.id}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                        isSelected
                          ? "border-[#00f0ff] bg-[#00f0ff]/5"
                          : "border-white/5 bg-white/[0.02]"
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          isSelected
                            ? "bg-[#00f0ff]/20 text-[#00f0ff]"
                            : "bg-white/5 text-white/40"
                        }`}
                      >
                        {paymentIcons[method.code] || (
                          <Wallet className="w-5 h-5" />
                        )}
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium text-white">
                          {method.name}
                        </p>
                        <p className="text-xs text-white/40">
                          Tanpa biaya tambahan - scan dengan e-wallet atau mobile banking
                        </p>
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="w-5 h-5 text-[#00f0ff]" />
                      )}
                    </div>
                  );
                })}
                {paymentMethods?.length === 0 && (
                  <div className="rounded-xl border border-[#ff003c]/20 bg-[#ff003c]/10 px-4 py-3 text-sm text-[#ffb8c7]">
                    Metode pembayaran belum tersedia.
                  </div>
                )}

              </div>
            </div>

            {/* Voucher */}
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <Tag className="w-5 h-5 text-[#ffb800]" />
                <h3 className="font-display text-base font-semibold text-white">
                  Kode Voucher
                </h3>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={voucherCode}
                  onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                  placeholder="Masukkan kode voucher"
                  className="flex-1 px-4 py-3 rounded-xl glass text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#ffb800]/50 transition-colors uppercase"
                />
              </div>
              {voucherCode.trim() && paymentCalc?.voucherMessage && (
                <p
                  className={`mt-3 text-xs ${
                    paymentCalc.voucher ? "text-[#0aff00]" : "text-[#ffb800]"
                  }`}
                >
                  {paymentCalc.voucherMessage}
                </p>
              )}
            </div>
          </div>

          {/* Right Column - Summary */}
          <div>
            <div className="sticky top-28">
              <div className="glass rounded-2xl p-6">
                <h3 className="font-display text-lg font-semibold text-white mb-5">
                  Ringkasan Pesanan
                </h3>

                <div className="space-y-3 mb-5">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/50">Game</span>
                    <span className="text-white">{game.name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/50">Item</span>
                    <span className="text-white">
                      {selectedProduct
                        ? selectedProductData?.name || "-"
                        : "-"}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/50">Harga Awal</span>
                    <span className="text-white">
                      {selectedProduct && paymentCalc
                        ? formatRupiah(paymentCalc.basePrice)
                        : "Rp0"}
                    </span>
                  </div>
                  {paymentCalc?.discountAmount ? (
                    <div className="flex justify-between text-sm">
                      <span className="text-white/50">Diskon Voucher</span>
                      <span className="text-[#0aff00]">
                        -{formatRupiah(paymentCalc.discountAmount)}
                      </span>
                    </div>
                  ) : null}
                  <div className="flex justify-between text-sm">
                    <span className="text-white/50">Subtotal</span>
                    <span className="text-white">
                      {paymentCalc ? formatRupiah(paymentCalc.totalAmount) : "Rp0"}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/50">Biaya/Pajak QRIS</span>
                    <span className="text-white/40">Dihitung saat QRIS dibuat</span>
                  </div>
                </div>

                <div className="h-px bg-white/10 mb-5" />

                <div className="flex justify-between mb-3">
                  <span className="text-base font-semibold text-white">
                    Total Bayar
                  </span>
                  <span className="font-display text-xl font-bold text-white">
                    {paymentCalc?.totalAmount
                      ? formatRupiah(paymentCalc.totalAmount)
                      : "Rp0"}
                  </span>
                </div>
                <p className="mb-4 text-[11px] leading-relaxed text-white/35">
                  Total akhir bisa bertambah sesuai nominal QRIS dari provider pembayaran.
                </p>
                {paymentStatus?.enabled && (
                  <p className="mb-4 rounded-xl border border-[#ffb800]/25 bg-[#ffb800]/10 px-4 py-3 text-xs leading-relaxed text-[#ffe4a3]">
                    {paymentStatus.message}
                  </p>
                )}

                <button
                  onClick={handleCheckout}
                  disabled={
                    paymentStatus?.enabled ||
                    !selectedProduct ||
                    !playerId ||
                    (game.hasServerId && !serverId) ||
                    !selectedPayment ||
                    !paymentCalc ||
                    createTransaction.isPending
                  }
                  className="w-full py-4 bg-gradient-to-r from-[#ff003c] to-[#b30029] text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-[#ff003c]/25 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {createTransaction.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Zap className="w-5 h-5" />
                  )}
                  {createTransaction.isPending
                    ? "Membuat QRIS di provider..."
                    : paymentStatus?.enabled
                      ? "Pembayaran Maintenance"
                      : "Buat QRIS"}
                </button>

                <div className="flex items-center justify-center gap-2 mt-4 text-xs text-white/30">
                  <Shield className="w-3 h-3" />
                  <span>Pembayaran aman & terenkripsi</span>
                </div>
                {checkoutError && (
                  <p className="mt-4 rounded-xl border border-[#ff003c]/20 bg-[#ff003c]/10 px-4 py-3 text-xs text-[#ffb8c7]">
                    {checkoutError}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
