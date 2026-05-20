import { Link } from "react-router";
import { ArrowLeft, AlertCircle } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";

export default function NotFound() {
  return (
    <div className="min-h-[100dvh] site-bg flex items-center justify-center relative overflow-hidden">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#ff003c]/5 rounded-full blur-[150px]" />

      <div className="relative z-10 text-center max-w-md mx-4">
        <div className="w-20 h-20 rounded-full bg-[#ff003c]/10 flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-10 h-10 text-[#ff003c]" />
        </div>

        <h1 className="font-display text-7xl font-bold text-white mb-2">
          404
        </h1>
        <p className="text-lg text-white/60 mb-2">Page Not Found</p>
        <p className="text-sm text-white/40 mb-8">
          Halaman yang Anda cari tidak ditemukan atau telah dipindahkan.
        </p>

        <Link
          to="/"
          className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#ff003c] to-[#b30029] text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-[#ff003c]/25 transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
          Kembali ke Beranda
        </Link>

        <BrandLogo className="mt-8 justify-center opacity-20" imageClassName="h-8" />
      </div>
    </div>
  );
}
