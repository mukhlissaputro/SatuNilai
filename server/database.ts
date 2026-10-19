import mysql, { type Pool, type PoolConnection, type ResultSetHeader, type RowDataPacket } from "mysql2/promise";

let pool: Pool | undefined;
export function getPool() {
  return pool ??= mysql.createPool({
    host: process.env.DB_HOST ?? "127.0.0.1", port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? "satunilai", password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME ?? "satunilai", connectionLimit: 10,
    timezone: "Z", dateStrings: true, decimalNumbers: true,
  });
}
export class LocalStatement {
  constructor(public sql: string, public values: unknown[] = []) {}
  bind(...values: unknown[]) { return new LocalStatement(this.sql, values); }
  async all<T = Record<string, unknown>>() {
    const [rows] = await getPool().query<RowDataPacket[]>(this.sql, this.values);
    return { results: rows as T[] };
  }
  async first<T = Record<string, unknown>>() { return (await this.all<T>()).results[0] ?? null; }
  async run() { return execute(getPool(), this); }
}
async function execute(connection: Pool | PoolConnection, statement: LocalStatement) {
  const [result] = await connection.query<ResultSetHeader>(statement.sql, statement.values);
  return { success: true, meta: { changes: result.affectedRows } };
}
export const database = {
  prepare(sql: string) { return new LocalStatement(sql); },
  async batch(statements: LocalStatement[]) {
    const connection = await getPool().getConnection();
    try {
      await connection.beginTransaction();
      const results = [];
      for (const statement of statements) results.push(await execute(connection, statement));
      await connection.commit();
      return results;
    } catch (error) { await connection.rollback(); throw error; }
    finally { connection.release(); }
  },
};
