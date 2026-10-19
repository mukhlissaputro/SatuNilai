import { drizzle } from "drizzle-orm/mysql2";
import { database, getPool } from "../server/database";
import * as schema from "./schema";

export function getDb() {
  const db = drizzle(getPool(), { schema, mode: "default" });
  return Object.assign(db, {
    async batch(queries: { toSQL(): { sql: string; params: unknown[] } }[]) {
      return database.batch(queries.map((query) => {
        const statement = query.toSQL();
        return database.prepare(statement.sql).bind(...statement.params);
      }));
    },
  });
}
