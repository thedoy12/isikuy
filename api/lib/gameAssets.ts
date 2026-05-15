const ASSET_BY_SLUG: Record<string, string> = {
  "ace-racer": "ace-racer.png",
  "afk-journey": "afk-journey.png",
  "age-of-empires": "age-of-empires.png",
  "alight-motion": "alight-motion.jpg",
  "amazon-prime-video": "amazon-prime-video.jpg",
  aov: "aov.png",
  "arena-breakout": "arena-breakout.png",
  "astral-guardians": "astral-guardians.png",
  axis: "axis.jpg",
  "blood-strike": "blood-strike.png",
  bstation: "bstation.jpg",
  byu: "byu.jpg",
  "castle-duels": "castle-duels.png",
  dana: "dana.jpg",
  "delta-force": "delta-force.png",
  "dragon-raja": "dragon-raja.png",
  "dynasty-warriors": "dynasty-warriors.png",
  "fc-mobile": "fc-mobile.png",
  "free-fire": "free-fire.png",
  "genshin-impact": "genshin-impact.png",
  "honor-of-kings": "honor-of-kings.png",
  "magic-chess": "magic-chess.png",
  "mobile-legends": "mobile-legends.png",
  "mobile-legends-gift": "mobile-legends-gift.png",
  "point-blank": "point-blank.png",
  "pubg-mobile": "pubg-mobile.png",
  roblox: "roblox.png",
  "sausage-man": "sausage-man.png",
  valorant: "valorant.png",
  "wild-rift": "wild-rift.png",
};

const ASSET_ALIASES: Record<string, string> = {
  "arena-of-valor": "aov",
  "league-of-legends-wild-rift": "wild-rift",
  "mobile-legends-a": "mobile-legends",
  "mobile-legends-global": "mobile-legends",
  "mlbb": "mobile-legends",
  "pubg": "pubg-mobile",
  "pubgm": "pubg-mobile",
  "align-motion": "alight-motion",
  "amazone-prime-video": "amazon-prime-video",
  "by-u": "byu",
  "ea-sports-fc-mobile": "fc-mobile",
  "fifa-mobile": "fc-mobile",
  "magic-chess-go-go": "magic-chess",
  "arena-breakout-infinite": "arena-breakout",
  "age-of-empires-mobile": "age-of-empires",
  "astral-guardians-cyber-fantasy": "astral-guardians",
  "dragon-raja-sea": "dragon-raja",
  "dynasty-warriors-overlords": "dynasty-warriors",
  "castle-duels-tower-defense": "castle-duels",
};

const CATEGORY_PREFIXES = ["game", "pulsa", "data", "ewallet", "voucher", "pln", "produk", "digital"];

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function withoutCategoryPrefix(slug: string) {
  for (const prefix of CATEGORY_PREFIXES) {
    if (slug.startsWith(`${prefix}-`)) return slug.slice(prefix.length + 1);
  }
  return slug;
}

export function gameAssetPath(slug: string | null | undefined, name?: string | null) {
  const baseSlug = slugify(slug || "");
  const nameSlug = slugify(name || "");
  const candidates = [
    baseSlug,
    withoutCategoryPrefix(baseSlug),
    ASSET_ALIASES[baseSlug],
    ASSET_ALIASES[withoutCategoryPrefix(baseSlug)],
    nameSlug,
    withoutCategoryPrefix(nameSlug),
    ASSET_ALIASES[nameSlug],
    ASSET_ALIASES[withoutCategoryPrefix(nameSlug)],
  ].filter(Boolean);

  for (const candidate of candidates) {
    const fileName = ASSET_BY_SLUG[candidate];
    if (fileName) return `/aset/${fileName}`;
  }

  return null;
}
