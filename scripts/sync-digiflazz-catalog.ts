import "dotenv/config";
import { syncDigiflazzCatalog } from "../api/routers/game";

const result = await syncDigiflazzCatalog();

console.log(
  JSON.stringify({
    games: result.games.length,
    products: result.productCodes.length,
  }),
);
