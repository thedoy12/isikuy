import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const jobs = [
  {
    input: path.join(root, "public", "aset"),
    output: path.join(root, "public", "aset-optimized"),
    width: 600,
    quality: 82,
  },
  {
    input: path.join(root, "public", "games"),
    output: path.join(root, "public", "games-optimized"),
    width: 600,
    quality: 82,
  },
];

const imageExtensions = new Set([".png", ".jpg", ".jpeg"]);

async function optimizeDirectory({ input, output, width, quality }) {
  await fs.mkdir(output, { recursive: true });
  const entries = await fs.readdir(input, { withFileTypes: true });
  let originalBytes = 0;
  let optimizedBytes = 0;
  let count = 0;

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const extension = path.extname(entry.name).toLowerCase();
    if (!imageExtensions.has(extension)) continue;

    const inputPath = path.join(input, entry.name);
    const outputName = `${path.basename(entry.name, extension)}.webp`;
    const outputPath = path.join(output, outputName);
    const stat = await fs.stat(inputPath);

    await sharp(inputPath)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality, effort: 5 })
      .toFile(outputPath);

    const optimizedStat = await fs.stat(outputPath);
    originalBytes += stat.size;
    optimizedBytes += optimizedStat.size;
    count += 1;
  }

  return { input, output, count, originalBytes, optimizedBytes };
}

function formatMb(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

const results = [];
for (const job of jobs) {
  results.push(await optimizeDirectory(job));
}

for (const result of results) {
  console.log(
    `${path.relative(root, result.input)} -> ${path.relative(root, result.output)}: ` +
      `${result.count} images, ${formatMb(result.originalBytes)} -> ${formatMb(result.optimizedBytes)}`,
  );
}
