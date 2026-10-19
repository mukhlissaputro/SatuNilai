import { spawn } from "node:child_process";

// A unique Compose project owns these disposable test volumes; main data is untouched.
const project = `satunilai-schema-check-${Date.now().toString(36)}`;
function compose(args) {
  return new Promise((resolve, reject) => {
    const child = spawn("docker", ["compose", "-p", project, ...args], { stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => code === 0 ? resolve() : reject(new Error(`Schema test Docker command exited ${code}`)));
  });
}
try {
  await compose(["up", "-d", "--wait", "db"]);
  await compose(["run", "--rm", "--no-deps", "app", "sh", "-c", "node scripts/init-db.mjs && node scripts/verify-schema.mjs"]);
  console.log("PASS: fresh MariaDB install has all 19 application tables and 29 foreign keys.");
} finally { await compose(["down", "-v", "--remove-orphans"]); }
