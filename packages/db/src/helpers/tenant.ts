import { sql } from "drizzle-orm";
import { db, type Database } from "../client";

export async function tenantDB<T>(
  communityId: string,
  callback: (tx: Database) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT set_config('app.current_tenant_id', ${communityId}, true)`,
    );
    return callback(tx as unknown as Database);
  });
}
