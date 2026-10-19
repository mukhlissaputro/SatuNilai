import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const saved = JSON.parse(await readFile("outputs/docker-verification.json", "utf8"));
const base = process.env.TEST_BASE_URL ?? `http://127.0.0.1:${process.env.APP_PORT ?? 3000}`;
const login = await fetch(`${base}/api/auth/login`, { method: "POST", headers: { "content-type": "application/json", origin: base }, body: JSON.stringify({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD }) });
assert.equal(login.status, 200);
const cookie = login.headers.get("set-cookie").split(";")[0];
const response = await fetch(`${base}/api/evidence/${saved.evidenceId}/download`, { headers: { cookie } });
assert.equal(response.status, 200);
assert.match(await response.text(), /Docker integration evidence/);
const workspace = await fetch(`${base}/api/assessment-workspace?periodId=${saved.periodId}`, { headers: { cookie } });
assert.equal(workspace.status, 200);
assert.equal((await workspace.json()).selectedPeriod.status, "finalized");
await fetch(`${base}/api/auth/logout`, { method: "POST", headers: { cookie, origin: base } });
console.log("PASS: login, finalized assessment and private evidence persist after container recreation.");
