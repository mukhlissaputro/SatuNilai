import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";

function objectPath(key: string) {
  const root = resolve(process.env.EVIDENCE_DIR ?? "./data/evidence");
  const path = resolve(root, key);
  if (!key || !path.startsWith(root + sep)) throw new Error("Invalid document key");
  return path;
}
export const evidenceStorage = {
  async put(key: string, data: ArrayBuffer, _metadata?: unknown) {
    void _metadata;
    const path = objectPath(key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, new Uint8Array(data), { flag: "wx", mode: 0o600 });
  },
  async get(key: string) {
    try { return { body: new Uint8Array(await readFile(objectPath(key))) }; }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  },
};
