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
  "be-the-king": "be-the-king.png",
  "blood-strike": "blood-strike.png",
  bstation: "bstation.jpg",
  byu: "byu.jpg",
  "castle-duels": "castle-duels.png",
  dana: "dana.jpg",
  "delta-force": "delta-force.png",
  "dragonheir-silent-gods": "dragonheir-silent-gods.png",
  "dragon-raja": "dragon-raja.png",
  "dynasty-warriors": "dynasty-warriors.png",
  "eggy-party": "eggy-party.png",
  "fc-mobile": "fc-mobile.png",
  "football-master-2": "football-master-2.png",
  "free-fire": "free-fire.png",
  "genshin-impact": "genshin-impact.png",
  growtopia: "growtopia.png",
  "honkai-impact-3": "honkai-impact-3.png",
  "honkai-star-rail": "honkai-star-rail.png",
  "honor-of-kings": "honor-of-kings.png",
  "identity-v": "identity-v.png",
  "infinite-borders": "infinite-borders.png",
  "king-of-avalon": "king-of-avalon.png",
  lifeafter: "lifeafter.png",
  "light-of-thel": "light-of-thel.png",
  "lords-mobile": "lords-mobile.png",
  "love-and-deepspace": "love-and-deepspace.png",
  "magic-chess": "magic-chess.png",
  "marvel-duel": "marvel-duel.png",
  "marvel-rivals": "marvel-rivals.png",
  megaxus: "megaxus.png",
  "metal-slug": "metal-slug.png",
  "mobile-legends": "mobile-legends.png",
  "mobile-legends-gift": "mobile-legends-gift.png",
  "one-punch-man": "one-punch-man.png",
  "point-blank": "point-blank.png",
  "pubg-mobile": "pubg-mobile.png",
  "pubg-new-state": "pubg-new-state.png",
  "ragnarok-origin": "ragnarok-origin.png",
  "ragnarok-x-next-generation": "ragnarok-x-next-generation.png",
  "revelation-infinite-journey": "revelation-infinite-journey.png",
  roblox: "roblox.png",
  "sausage-man": "sausage-man.png",
  "state-of-survival": "state-of-survival.png",
  "tom-and-jerry-chase": "tom-and-jerry-chase.png",
  valorant: "valorant.png",
  "watcher-of-realms": "watcher-of-realms.png",
  "whiteout-survival": "whiteout-survival.png",
  "wild-rift": "wild-rift.png",
};

const ASSET_ALIASES: Record<string, string> = {
  "arena-of-valor": "aov",
  "league-of-legends-wild-rift": "wild-rift",
  "league-of-legends": "wild-rift",
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
  "bstation-premium": "bstation",
  "light-of-thel-new-era": "light-of-thel",
  "metal-slug-awakening": "metal-slug",
  "pubg-new-state-mobile": "pubg-new-state",
  "state-of-survival-zombie-war": "state-of-survival",
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
