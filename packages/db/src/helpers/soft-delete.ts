import { isNull, type SQL } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

export function notDeleted(deletedAtColumn: PgColumn): SQL {
  return isNull(deletedAtColumn);
}
