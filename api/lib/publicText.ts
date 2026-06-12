const PUBLIC_PROVIDER_LABEL = "ISIKUY";
export const publicProductUnavailableMessage =
  "Produk sedang tidak tersedia. Silakan pilih produk lain.";

export function sanitizePublicText(value: string | null) {
  if (/access denied.*ip address.*whitelist/i.test(value || "")) {
    return "Pembayaran QRIS belum bisa dibuat karena IP server belum diizinkan oleh provider pembayaran.";
  }

  return value
    ?.replace(/\s+via\s+Flowix\.?/gi, ".")
    .replace(/\s+di\s+(?:Flowix|Digiflazz)\b/gi, "")
    .replace(/\bKATALOG\s+FLOWIX\b/gi, "KATALOG DIGITAL")
    .replace(/\bSupplier\s+(?:Flowix|Digiflazz)\b/gi, "Layanan")
    .replace(/\b(?:Flowix|Digiflazz)\b/gi, PUBLIC_PROVIDER_LABEL)
    .replace(/\bjalur API\b/gi, "layanan")
    .replace(/\s+/g, " ")
    .trim() ?? null;
}

export const publicProviderLabel = PUBLIC_PROVIDER_LABEL;
