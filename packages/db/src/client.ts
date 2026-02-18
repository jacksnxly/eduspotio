import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";
import { relations } from "./relations";

if (typeof WebSocket === "undefined") {
  const ws = await import("ws");
  neonConfig.webSocketConstructor = ws.default;
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const db = drizzle({ client: pool, schema, relations });
export type Database = typeof db;
