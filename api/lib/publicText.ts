const PUBLIC_PROVIDER_LABEL = "ISIKUY";

export function sanitizePublicText(value: string | null) {
  return value
    ?.replace(/\s+via\s+Flowix\.?/gi, ".")
    .replace(/\bKATALOG\s+FLOWIX\b/gi, "KATALOG DIGITAL")
    .replace(/\bFlowix\b/g, PUBLIC_PROVIDER_LABEL)
    .replace(/\s+/g, " ")
    .trim() ?? null;
}

export const publicProviderLabel = PUBLIC_PROVIDER_LABEL;
