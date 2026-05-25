import "dotenv/config";
import { sql } from "drizzle-orm";
import { getDb } from "../api/queries/connection";

const db = getDb();

const result = await db.execute(sql`
  update "products"
  set
    "name" = trim(regexp_replace("name", '^[[:space:]]*[-:|/]+[[:space:]]*', '')),
    "supplierProductName" = case
      when "supplierProductName" is null then null
      else trim(regexp_replace("supplierProductName", '^[[:space:]]*[-:|/]+[[:space:]]*', ''))
    end
  where
    "name" ~ '^[[:space:]]*[-:|/]+' or
    coalesce("supplierProductName", '') ~ '^[[:space:]]*[-:|/]+'
`);

console.log(JSON.stringify({ cleaned: result.rowCount ?? 0 }));
