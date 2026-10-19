import mysql from "mysql2/promise";
import { pbkdf2Sync, randomBytes } from "node:crypto";

if (process.env.NODE_ENV === "development" && process.env.DEV_QUICK_LOGIN === "1") {
  const db = await mysql.createConnection({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT ?? 3306), user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME });
  try {
    await db.beginTransaction();
    const [[unit]] = await db.query("SELECT id FROM units WHERE active=1 ORDER BY created_at LIMIT 1");
    if (!unit) throw new Error("Unit untuk akun development belum tersedia");
    for (const account of [
      { id: "development-staff", email: "staff@localhost", name: "Staf Development", role: "staff" },
      { id: "development-head", email: "kepala.unit@localhost", name: "Kepala Unit Development", role: "head" },
    ]) {
      const [[existing]] = await db.query("SELECT id,role FROM users WHERE email=?", [account.email]);
      if (existing && existing.role !== account.role) throw new Error("Peran akun development tidak sesuai; periksa Pengguna & Akses");
      if (!existing) {
        const salt = randomBytes(16).toString("hex");
        const hash = pbkdf2Sync(randomBytes(32).toString("hex"), salt, 210000, 32, "sha256").toString("hex");
        await db.query("INSERT INTO users(id,email,display_name,role,unit_id,password_hash,password_salt,password_changed_at) VALUES(?,?,?,?,?,?,?,?)", [account.id, account.email, account.name, account.role, unit.id, hash, salt, new Date().toISOString()]);
        await db.query("INSERT INTO user_assessment_types(user_id,assessment_type_id) SELECT ?,id FROM assessment_types WHERE active=1", [account.id]);
      }
    }
    await db.commit();
    console.log("Akun development siap; password admin dan akun yang sudah ada dipertahankan.");
  } catch (error) { await db.rollback(); throw error; }
  finally { await db.end(); }
}
