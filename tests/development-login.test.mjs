import assert from "node:assert/strict";
import test from "node:test";

const base = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3000";
const production = process.env.EXPECT_QUICK_LOGIN_DISABLED === "1";

test("masuk cepat hanya tersedia pada development lokal dan memakai hak akses asli", async () => {
  const endpoint = `${base}/api/auth/development`;
  if (production) {
    assert.equal((await fetch(endpoint)).status, 404);
    assert.equal((await fetch(endpoint, { method: "POST", headers: { origin: base, "content-type": "application/json" }, body: JSON.stringify({ account: "admin" }) })).status, 404);
    return;
  }
  const response = await fetch(endpoint);
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.deepEqual(payload.accounts.map((account) => account.role).sort(), ["admin", "head", "staff"]);
  assert.doesNotMatch(JSON.stringify(payload), /password|salt|token/i);
  assert.match(response.headers.get("cache-control"), /no-store/);
  for (const account of payload.accounts) {
    const login = await fetch(endpoint, { method: "POST", headers: { origin: base, "content-type": "application/json" }, body: JSON.stringify({ account: account.key }) });
    assert.equal(login.status, 200);
    assert.match(login.headers.get("set-cookie"), /HttpOnly/);
    const cookie = login.headers.get("set-cookie").split(";")[0];
    const me = await fetch(`${base}/api/me`, { headers: { cookie } });
    assert.equal((await me.json()).user.role, account.role);
    if (account.role !== "admin") assert.equal((await fetch(`${base}/api/admin`, { headers: { cookie } })).status, 403);
    await fetch(`${base}/api/auth/logout`, { method: "POST", headers: { cookie, origin: base } });
  }
  assert.equal((await fetch(endpoint, { method: "POST", headers: { origin: "https://other.example", "content-type": "application/json" }, body: JSON.stringify({ account: "admin" }) })).status, 403);
  assert.equal((await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ account: "admin" }) })).status, 403);
  assert.equal((await fetch(endpoint, { method: "POST", headers: { origin: base, "content-type": "application/json" }, body: JSON.stringify({ account: "arbitrary-user" }) })).status, 400);
});
