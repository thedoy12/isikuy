const optimizedImagePrefixes: Record<string, string> = {
  "/aset/": "/aset-optimized/",
  "/games/": "/games-optimized/",
};

export function optimizedImagePath(src: string | null | undefined) {
  if (!src) return src ?? "";

  for (const [prefix, optimizedPrefix] of Object.entries(optimizedImagePrefixes)) {
    if (!src.startsWith(prefix)) continue;
    const dotIndex = src.lastIndexOf(".");
    const basePath = dotIndex === -1 ? src : src.slice(0, dotIndex);
    return `${optimizedPrefix}${basePath.slice(prefix.length)}.webp`;
  }

  return src;
}
