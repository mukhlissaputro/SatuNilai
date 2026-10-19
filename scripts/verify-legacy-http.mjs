import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = JSON.parse(await readFile(process.argv[2], "utf8"));
const base = process.env.TEST_BASE_URL ?? `http://127.0.0.1:${process.env.APP_PORT ?? 3000}`;
const login = await fetch(`${base}/api/auth/login`, { method: "POST", headers: { origin: base, "content-type": "application/json" }, body: JSON.stringify({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD }) });
assert.equal(login.status, 200, "Password admin Docker harus tetap berlaku");
const cookie = login.headers.get("set-cookie").split(";")[0];
try {
  for (const period of source.tables.assessment_periods.rows) {
    const response = await fetch(`${base}/api/assessment-workspace?periodId=${encodeURIComponent(period.id)}`, { headers: { cookie } });
    assert.equal(response.status, 200);
    const workspace = await response.json();
    assert.equal(workspace.selectedPeriod.id, period.id);
    const scores = source.tables.indicator_scores.rows.filter((score) => score.period_id === period.id);
    for (const score of scores) {
      const indicator = workspace.indicators.find((indicator) => indicator.id === score.indicator_id);
      assert.ok(indicator, "Indikator lama harus tampil");
      assert.equal(indicator.internalValue, score.internal_value, "Nilai lama harus tampil pada workspace admin");
    }
    const dashboard = await fetch(`${base}/api/dashboard?periodId=${encodeURIComponent(period.id)}`, { headers: { cookie } });
    assert.equal(dashboard.status, 200);
    assert.ok(Number((await dashboard.json()).metrics.assessedIndicators) >= scores.length);
  }
  console.log("PASS: admin Docker tetap bisa login, periode/indikator/nilai lama tampil melalui API MariaDB.");
} finally { await fetch(`${base}/api/auth/logout`, { method: "POST", headers: { cookie, origin: base } }); }
