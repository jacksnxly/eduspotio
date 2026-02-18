import { and, lt, type SQL } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

export interface CursorInput {
  cursorValue: Date | string | number;
  cursorId: string;
}

export function cursorWhere(
  orderColumn: PgColumn,
  idColumn: PgColumn,
  cursor: CursorInput | undefined,
): SQL | undefined {
  if (!cursor) return undefined;
  return and(lt(orderColumn, cursor.cursorValue), lt(idColumn, cursor.cursorId));
}
