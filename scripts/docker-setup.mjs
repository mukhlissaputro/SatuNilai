import { existsSync, writeFileSync, readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";

if (existsSync(".env")) {
  console.log(".env sudah ada; konfigurasi dipertahankan.");
} else {
  const random = () => randomBytes(24).toString("hex");
  const config = readFileSync(".env.example", "utf8")
    .replace("DB_PASSWORD=", `DB_PASSWORD=${random()}`)
    .replace("DB_ROOT_PASSWORD=", `DB_ROOT_PASSWORD=${random()}`)
    .replace("ADMIN_PASSWORD=", `ADMIN_PASSWORD=${random()}`);
  writeFileSync(".env", config, { mode: 0o600, flag: "wx" });
  console.log(".env dibuat dengan password acak. Kredensial admin dapat dilihat di .env.");
}
