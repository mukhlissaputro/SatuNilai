import mysql from "mysql2/promise";
import { verifyMariaSchema } from "./lib/verify-schema.mjs";

const db = await mysql.createConnection({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT ?? 3306), user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME });
try { console.log(JSON.stringify(await verifyMariaSchema(db, { checkRows: true }))); }
finally { await db.end(); }
