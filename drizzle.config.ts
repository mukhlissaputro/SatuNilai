import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle-mysql",
  schema: "./db/schema.ts",
  dialect: "mysql",
});
