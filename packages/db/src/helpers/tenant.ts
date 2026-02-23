import { sql } from "drizzle-orm";
import { db } from "../client";

export type TenantDatabase = Parameters<
  Parameters<typeof db.transaction>[0]
>[0];

export async function tenantDB<T>(
  communityId: string,
  callback: (tx: TenantDatabase) => Promise<T>,
): Promise<T> {
  if (!communityId) {
    throw new Error("communityId is required for tenant context");
  }

  return db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT set_config('app.current_tenant_id', ${communityId}, true)`,
    );
    return callback(tx);
  });
}
