import assert from "node:assert/strict";
import test from "node:test";
import { normalizeIdentifiers } from "../scripts/lib/sql-identifiers.mjs";

test("normalisasi hanya mengubah identifier panjang, mempertahankan statement dan komentar", () => {
  const name = "assessment_periods_instrument_version_id_instrument_versions_id_fk";
  const source = `ALTER TABLE \`periods\` ADD CONSTRAINT \`${name}\` FOREIGN KEY (\`version_id\`) REFERENCES \`versions\`(\`id\`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint\nALTER TABLE \`users\` ADD CONSTRAINT \`users_unit_fk\` FOREIGN KEY (\`unit_id\`) REFERENCES \`units\`(\`id\`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint\nCREATE INDEX \`idx_units\` ON \`users\` (\`unit_id\`);`;
  const normalized = normalizeIdentifiers(source);
  assert.equal(normalized.split("--> statement-breakpoint").length, 3);
  assert.equal((normalized.match(/ALTER TABLE/g) ?? []).length, 2);
  assert.ok(normalized.includes("CREATE INDEX"));
  assert.ok(!normalized.includes(name));
  assert.equal(normalizeIdentifiers(normalized), normalized);
});
