export type ToolKind =
  | "ai-text"
  | "wheel"
  | "picker"
  | "meter"
  | "calculator";

export type ToolDefinition = {
  slug: string;
  title: string;
  shortTitle: string;
  description: string;
  category: "AI Text" | "Spin Random" | "Fun Viral" | "Calculator";
  kind: ToolKind;
  modes: string[];
  aiEnabled?: boolean;
  trending?: boolean;
  seoTitle: string;
  seoDescription: string;
  ctaGameSlug?: string;
};

const baseToolDefinitions: ToolDefinition[] = [
  {
    slug: "nickname-generator",
    title: "AI Nickname Generator",
    shortTitle: "Nickname",
    description: "Generate nickname gaming pro, aesthetic, Jepang, Korea, cyber, dan simbol unik.",
    category: "AI Text",
    kind: "ai-text",
    modes: ["Pro Player", "Aesthetic", "Jepang", "Korea", "Cyber", "Unicode"],
    aiEnabled: true,
    trending: true,
    seoTitle: "AI Nickname Generator Gaming Keren - ISIKUY Tools",
    seoDescription: "Buat nickname gaming keren untuk Mobile Legends, Free Fire, Valorant, dan game favorit kamu.",
    ctaGameSlug: "mobile-legends",
  },
  {
    slug: "squad-name",
    title: "AI Squad Name Generator",
    shortTitle: "Squad Name",
    description: "Buat nama squad, guild, clan, dan tagline esports yang terdengar siap turnamen.",
    category: "AI Text",
    kind: "ai-text",
    modes: ["Esport", "Savage", "Anime", "Cyber"],
    aiEnabled: true,
    trending: true,
    seoTitle: "AI Squad Name Generator Esports - ISIKUY Tools",
    seoDescription: "Generate nama squad dan tagline gaming yang savage, anime, cyber, dan esports-ready.",
    ctaGameSlug: "free-fire",
  },
  {
    slug: "trash-talk",
    title: "AI Trash Talk Generator",
    shortTitle: "Trash Talk",
    description: "Trash talk gaming lucu, absurd, friendly, dan savage tanpa berlebihan.",
    category: "AI Text",
    kind: "ai-text",
    modes: ["Savage", "Absurd", "Friendly", "Random Roast"],
    aiEnabled: true,
    seoTitle: "AI Trash Talk Generator Gaming Lucu - ISIKUY Tools",
    seoDescription: "Buat trash talk gaming lucu untuk mabar dengan mode savage, absurd, dan friendly.",
    ctaGameSlug: "mobile-legends",
  },
  {
    slug: "caption-generator",
    title: "AI Gaming Caption Generator",
    shortTitle: "Caption",
    description: "Caption kemenangan, kekalahan, savage, lucu, lengkap dengan hashtag otomatis.",
    category: "AI Text",
    kind: "ai-text",
    modes: ["Kemenangan", "Kekalahan", "Savage", "Lucu"],
    aiEnabled: true,
    trending: true,
    seoTitle: "AI Gaming Caption Generator - ISIKUY Tools",
    seoDescription: "Generate caption gaming untuk kemenangan, kekalahan, savage moments, dan konten lucu.",
    ctaGameSlug: "valorant",
  },
  {
    slug: "challenge-wheel",
    title: "Random Challenge Wheel",
    shortTitle: "Challenge Wheel",
    description: "Spin challenge gamer seperti no heal, sniper only, no recall, rush mid, dan random hero.",
    category: "Spin Random",
    kind: "wheel",
    modes: ["No Heal", "Sniper Only", "No Recall", "Rush Mid", "Random Hero", "One Tap Only"],
    trending: true,
    seoTitle: "Random Challenge Wheel Gaming - ISIKUY Tools",
    seoDescription: "Spin challenge mabar acak untuk bikin match lebih seru, lucu, dan viral.",
    ctaGameSlug: "mobile-legends",
  },
  {
    slug: "punishment-wheel",
    title: "Spin Hukuman Mabar",
    shortTitle: "Hukuman Mabar",
    description: "Wheel hukuman lucu untuk tim mabar: push-up, open mic, no skin, pistol only, no armor.",
    category: "Spin Random",
    kind: "wheel",
    modes: ["Push-up", "Open Mic", "No Skin", "Pistol Only", "No Armor", "Role Swap"],
    seoTitle: "Spin Hukuman Mabar Lucu - ISIKUY Tools",
    seoDescription: "Wheel hukuman mabar lucu untuk party gaming dan konten sosial media.",
    ctaGameSlug: "free-fire",
  },
  {
    slug: "hero-picker",
    title: "Random Hero Picker",
    shortTitle: "Hero Picker",
    description: "Random hero Mobile Legends, role, lane, difficulty, dan agent Valorant.",
    category: "Spin Random",
    kind: "picker",
    modes: ["Mobile Legends", "Valorant", "Role", "Lane", "Difficulty"],
    seoTitle: "Random Hero Picker ML dan Valorant - ISIKUY Tools",
    seoDescription: "Pilih hero Mobile Legends atau agent Valorant secara random untuk challenge mabar.",
    ctaGameSlug: "mobile-legends",
  },
  {
    slug: "aura-calculator",
    title: "Aura Calculator",
    shortTitle: "Aura",
    description: "Hitung aura, hoki, toxic, dan MVP percentage dari nickname kamu.",
    category: "Fun Viral",
    kind: "meter",
    modes: ["Aura", "Hoki", "Toxic", "MVP"],
    trending: true,
    seoTitle: "Aura Calculator Gaming - ISIKUY Tools",
    seoDescription: "Cek aura gaming dan hoki nickname kamu dengan hasil lucu dan progress bar neon.",
    ctaGameSlug: "mobile-legends",
  },
  {
    slug: "toxic-meter",
    title: "Toxic Meter",
    shortTitle: "Toxic Meter",
    description: "Cek toxic score, savage level, dan noob percentage secara random lucu.",
    category: "Fun Viral",
    kind: "meter",
    modes: ["Toxic", "Savage", "Noob"],
    seoTitle: "Toxic Meter Gaming - ISIKUY Tools",
    seoDescription: "Cek level toxic nickname gaming kamu secara fun untuk hiburan mabar.",
    ctaGameSlug: "free-fire",
  },
  {
    slug: "compatibility",
    title: "Gamer Compatibility Checker",
    shortTitle: "Compatibility",
    description: "Cek chemistry squad, friendship percentage, dan cocok tidaknya duo kamu.",
    category: "Fun Viral",
    kind: "meter",
    modes: ["Duo", "Squad", "Friendship"],
    seoTitle: "Gamer Compatibility Checker - ISIKUY Tools",
    seoDescription: "Cek chemistry dua nickname gamer untuk duo rank, squad, dan mabar.",
    ctaGameSlug: "mobile-legends",
  },
  {
    slug: "winrate-calculator",
    title: "Winrate Calculator",
    shortTitle: "Winrate",
    description: "Hitung jumlah win yang dibutuhkan untuk mengejar target winrate.",
    category: "Calculator",
    kind: "calculator",
    modes: ["WR Target"],
    trending: true,
    seoTitle: "Winrate Calculator ML - ISIKUY Tools",
    seoDescription: "Hitung berapa win lagi yang dibutuhkan untuk mencapai target winrate Mobile Legends.",
    ctaGameSlug: "mobile-legends",
  },
  {
    slug: "diamond-calculator",
    title: "Diamond Calculator",
    shortTitle: "Diamond",
    description: "Konversi diamond ke rupiah dan simulasi estimasi harga topup.",
    category: "Calculator",
    kind: "calculator",
    modes: ["Diamond", "Rupiah"],
    seoTitle: "Diamond Calculator Rupiah - ISIKUY Tools",
    seoDescription: "Simulasi konversi diamond game ke rupiah untuk estimasi budget topup.",
    ctaGameSlug: "mobile-legends",
  },
  {
    slug: "magic-wheel",
    title: "Magic Wheel Calculator",
    shortTitle: "Magic Wheel",
    description: "Estimasi diamond spin dan simulasi luck animation untuk Magic Wheel.",
    category: "Calculator",
    kind: "calculator",
    modes: ["Luck", "Spin", "Diamond"],
    seoTitle: "Magic Wheel Calculator - ISIKUY Tools",
    seoDescription: "Simulasi kebutuhan diamond dan keberuntungan untuk Magic Wheel.",
    ctaGameSlug: "mobile-legends",
  },
];

export const toolDefinitions: ToolDefinition[] = baseToolDefinitions.map((tool) => ({
  ...tool,
  modes: tool.modes.includes("Custom") ? tool.modes : [...tool.modes, "Custom"],
}));

export const toolAliases: Record<string, string> = {
  "nickname-ml": "nickname-generator",
  "winrate-ml": "winrate-calculator",
  "caption-gaming": "caption-generator",
};

export function resolveToolSlug(slug: string) {
  return toolAliases[slug] ?? slug;
}

export function getToolDefinition(slug: string) {
  const resolved = resolveToolSlug(slug);
  return toolDefinitions.find((tool) => tool.slug === resolved) ?? null;
}
