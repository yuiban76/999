import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export function getDb(runtimeEnv?: { DB?: D1Database }) {
  if (!runtimeEnv?.DB) {
    throw new Error("Cloudflare D1 binding `DB` is unavailable.");
  }
  return drizzle(runtimeEnv.DB, { schema });
}
