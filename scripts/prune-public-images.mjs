import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const folders = [
  path.join(root, "dist", "public", "aset"),
  path.join(root, "dist", "public", "games"),
];
const extensions = new Set([".png", ".jpg", ".jpeg"]);

let removedCount = 0;
let removedBytes = 0;

for (const folder of folders) {
  try {
    const entries = await fs.readdir(folder, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      if (!extensions.has(path.extname(entry.name).toLowerCase())) continue;

      const filePath = path.join(folder, entry.name);
      const stat = await fs.stat(filePath);
      await fs.unlink(filePath);
      removedCount += 1;
      removedBytes += stat.size;
    }
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

console.log(
  `Pruned ${removedCount} original public images from dist (${(removedBytes / 1024 / 1024).toFixed(2)} MB).`,
);
