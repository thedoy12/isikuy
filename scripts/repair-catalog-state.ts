import "dotenv/config";
import { and, eq, sql } from "drizzle-orm";
import { games, products } from "../db/schema";
import { gameAssetPath } from "../api/lib/gameAssets";
import { getDb } from "../api/queries/connection";

const db = getDb();

const digiflazzBackedGames = await db
  .select({ id: games.id, name: games.name, slug: games.slug })
  .from(games)
  .innerJoin(products, eq(products.gameId, games.id))
  .where(and(eq(products.supplierProvider, "digiflazz"), eq(products.isActive, true)))
  .groupBy(games.id);

let activated = 0;
let assetsFixed = 0;

for (const game of digiflazzBackedGames) {
  const asset = gameAssetPath(game.slug, game.name);
  const updateData: Record<string, unknown> = {
    isActive: true,
  };

  if (asset) {
    updateData.coverImage = sql`coalesce(nullif(${games.coverImage}, ''), ${asset})`;
    updateData.cardImage = sql`coalesce(nullif(${games.cardImage}, ''), ${asset})`;
    updateData.bannerImage = sql`coalesce(nullif(${games.bannerImage}, ''), ${asset})`;
    assetsFixed += 1;
  }

  await db.update(games).set(updateData).where(eq(games.id, game.id));
  activated += 1;
}

console.log(JSON.stringify({ activated, assetsFixed }));
