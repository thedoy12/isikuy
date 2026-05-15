import { Link } from "react-router";

type BrandLogoProps = {
  compact?: boolean;
  consoleLabel?: boolean;
  className?: string;
  imageClassName?: string;
};

export default function BrandLogo({
  compact = false,
  consoleLabel = false,
  className = "",
  imageClassName = "",
}: BrandLogoProps) {
  return (
    <Link to="/" className={`flex items-center gap-3 group ${className}`}>
      <div className="relative flex shrink-0 items-center justify-center">
        <div className="absolute inset-0 rounded-xl bg-[#ff003c]/25 blur-xl opacity-70 transition-opacity group-hover:opacity-100" />
        <img
          src="/aset/logoisikuy.png"
          alt="ISIKUY TOPUP"
          className={`relative h-10 w-auto object-contain drop-shadow-[0_10px_26px_rgba(255,0,60,0.25)] ${imageClassName}`}
        />
      </div>
      {!compact && (
        <div className="min-w-0">
          <span className="block font-display text-xl font-bold tracking-wider text-white">
            {consoleLabel ? "ISIKUY_INTEL" : "ISIKUY"}
          </span>
          <span className="block font-display text-[10px] tracking-[0.3em] text-[#00f0ff]">
            {consoleLabel ? "OPERATOR_CONSOLE" : "TOPUP"}
          </span>
        </div>
      )}
    </Link>
  );
}

