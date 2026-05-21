import { sql } from "drizzle-orm";
import { getDb } from "../queries/connection";

export async function withTransactionLock<T>(
  key: string,
  run: (tx: ReturnType<typeof getDb>) => Promise<T>,
) {
  const db = getDb();
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${key}))`);
    return run(tx as unknown as ReturnType<typeof getDb>);
  });
}
