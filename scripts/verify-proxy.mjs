import assert from "node:assert/strict";

const base = "http://127.0.0.1:3000";
const login = await fetch(`${base}/api/auth/login`, {
  method: "POST",
  headers: { "content-type": "application/json", origin: "https://satunilai.test", "x-forwarded-host": "satunilai.test", "x-forwarded-proto": "https" },
  body: JSON.stringify({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD }),
});
assert.equal(login.status, 200, await login.clone().text());
assert.match(login.headers.get("set-cookie"), /; Secure/);
const cookie = login.headers.get("set-cookie").split(";")[0];
const denied = await fetch(`${base}/api/auth/logout`, { method: "POST", headers: { cookie, origin: "https://other.test", "x-forwarded-host": "satunilai.test", "x-forwarded-proto": "https" } });
assert.equal(denied.status, 403);
const logout = await fetch(`${base}/api/auth/logout`, { method: "POST", headers: { cookie, origin: "https://satunilai.test", "x-forwarded-host": "satunilai.test", "x-forwarded-proto": "https" } });
assert.equal(logout.status, 200);
console.log("PASS: HTTPS proxy login, Secure cookie, same-origin logout and cross-origin rejection.");
