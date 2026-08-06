import { env } from "cloudflare:workers";
import { and, eq } from "drizzle-orm";
import { getDb } from "../../db";
import { auditLogs, users } from "../../db/schema";

export type AppRole = "admin" | "staff" | "head";
export type CurrentUser = { id: string; email: string; displayName: string; role: AppRole; unitId: string | null };

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

const encoder = new TextEncoder();
const toHex = (bytes: ArrayBuffer) => Array.from(new Uint8Array(bytes)).map((value) => value.toString(16).padStart(2, "0")).join("");
export const randomToken = (length = 32) => { const bytes = new Uint8Array(length); crypto.getRandomValues(bytes); return Array.from(bytes).map((value) => value.toString(16).padStart(2, "0")).join(""); };

export async function hashPassword(password: string, salt = randomToken(16)) {
  if (password.length < 10 || password.length > 128) throw new ApiError(400, "Password minimal 10 karakter");
  const material = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: encoder.encode(salt), iterations: 210000 }, material, 256);
  return { hash: toHex(bits), salt };
}

export async function verifyPassword(password: string, salt: string, expected: string) {
  const actual = (await hashPassword(password, salt)).hash;
  if (actual.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < actual.length; index += 1) difference |= actual.charCodeAt(index) ^ expected.charCodeAt(index);
  return difference === 0;
}

export async function hashToken(token: string) { return toHex(await crypto.subtle.digest("SHA-256", encoder.encode(token))); }
export function sessionCookie(token: string, request: Request, maxAge = 43200) { return `satunilai_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`; }
export function clearSessionCookie(request: Request) { return sessionCookie("", request, 0); }
export async function createSession(userId: string) {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + 43200000).toISOString();
  await (env as unknown as { DB: D1Database }).DB.prepare("INSERT INTO auth_sessions(id,user_id,token_hash,expires_at) VALUES(?,?,?,?)").bind(crypto.randomUUID(), userId, await hashToken(token), expiresAt).run();
  return token;
}

export function assertSameOrigin(request: Request) {
  const fetchSite = request.headers.get("sec-fetch-site");
  const origin = request.headers.get("origin");
  const requestOrigin = new URL(request.url).origin;
  if ((fetchSite && fetchSite === "cross-site") || (origin && origin !== requestOrigin)) throw new ApiError(403, "Permintaan lintas situs ditolak");
}

export async function requireUser(request: Request, allowed?: AppRole[]): Promise<CurrentUser> {
  const token = (request.headers.get("cookie") ?? "").split(";").map((part) => part.trim()).find((part) => part.startsWith("satunilai_session="))?.slice("satunilai_session=".length);
  if (!token) throw new ApiError(401, "Autentikasi diperlukan");
  const session = await (env as unknown as { DB: D1Database }).DB.prepare("SELECT user_id AS userId FROM auth_sessions WHERE token_hash=? AND expires_at>CURRENT_TIMESTAMP LIMIT 1").bind(await hashToken(token)).first<{ userId: string }>();
  if (!session) throw new ApiError(401, "Sesi telah berakhir");
  const db = getDb();
  const [record] = await db.select().from(users).where(and(eq(users.id, session.userId), eq(users.active, true))).limit(1);
  if (!record) throw new ApiError(403, "Akun belum didaftarkan oleh administrator");
  if (allowed && !allowed.includes(record.role)) throw new ApiError(403, "Anda tidak memiliki izin untuk tindakan ini");
  return { id: record.id, email: record.email, displayName: record.displayName, role: record.role, unitId: record.unitId };
}

export async function requireAssignment(user: CurrentUser, periodId: string, indicatorId: string) {
  if (user.role === "admin") return;
  const binding = (env as unknown as { DB: D1Database }).DB;
  const access = await binding.prepare(`SELECT 1 ok FROM assessment_periods p JOIN user_assessment_types uat ON uat.assessment_type_id=p.assessment_type_id JOIN categories c ON c.instrument_version_id=p.instrument_version_id JOIN subcategories sc ON sc.category_id=c.id JOIN indicators i ON i.subcategory_id=sc.id WHERE p.id=? AND i.id=? AND uat.user_id=? LIMIT 1`).bind(periodId, indicatorId, user.id).first();
  if (!access) throw new ApiError(403, "Indikator tidak termasuk dalam akses penilaian Anda");
}

export async function audit(request: Request, user: CurrentUser | null, action: string, entityType: string, entityId: string, metadata: Record<string, unknown> = {}) {
  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip));
  const ipHash = Array.from(new Uint8Array(digest)).map((value) => value.toString(16).padStart(2, "0")).join("");
  await getDb().insert(auditLogs).values({ id: crypto.randomUUID(), actorId: user?.id ?? null, action, entityType, entityId, metadata: JSON.stringify(metadata).slice(0, 4000), ipHash });
}

export function apiError(error: unknown) {
  if (error instanceof ApiError) return Response.json({ error: error.message }, { status: error.status });
  console.error("API error", error instanceof Error ? error.message : "unknown");
  if (error instanceof Error && /UNIQUE constraint failed/i.test(error.message)) return Response.json({ error: "Kode atau data tersebut sudah digunakan" }, { status: 409 });
  if (error instanceof Error && /FOREIGN KEY constraint failed/i.test(error.message)) return Response.json({ error: "Data terkait belum valid atau masih digunakan" }, { status: 409 });
  return Response.json({ error: "Permintaan tidak dapat diproses" }, { status: 500 });
}

export function getEvidenceBucket(): R2Bucket {
  const bucket = (env as unknown as { EVIDENCE?: R2Bucket }).EVIDENCE;
  if (!bucket) throw new ApiError(503, "Penyimpanan dokumen belum tersedia");
  return bucket;
}
