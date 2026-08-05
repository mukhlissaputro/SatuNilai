import { env } from "cloudflare:workers";
import { and, eq } from "drizzle-orm";
import { getDb } from "../../db";
import { assignments, auditLogs, users } from "../../db/schema";

export type AppRole = "admin" | "staff" | "head";
export type CurrentUser = { id: string; email: string; displayName: string; role: AppRole; unitId: string | null };

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function assertSameOrigin(request: Request) {
  const fetchSite = request.headers.get("sec-fetch-site");
  const origin = request.headers.get("origin");
  const requestOrigin = new URL(request.url).origin;
  if ((fetchSite && fetchSite === "cross-site") || (origin && origin !== requestOrigin)) throw new ApiError(403, "Permintaan lintas situs ditolak");
}

export async function requireUser(request: Request, allowed?: AppRole[]): Promise<CurrentUser> {
  const id = request.headers.get("oai-authenticated-user-id");
  const email = request.headers.get("oai-authenticated-user-email")?.trim().toLowerCase();
  if (!id || !email) throw new ApiError(401, "Autentikasi diperlukan");
  const db = getDb();
  const [record] = await db.select().from(users).where(and(eq(users.id, id), eq(users.active, true))).limit(1);
  if (!record) throw new ApiError(403, "Akun belum didaftarkan oleh administrator");
  if (allowed && !allowed.includes(record.role)) throw new ApiError(403, "Anda tidak memiliki izin untuk tindakan ini");
  return { id: record.id, email: record.email, displayName: record.displayName, role: record.role, unitId: record.unitId };
}

export async function requireAssignment(user: CurrentUser, periodId: string, indicatorId: string) {
  if (user.role === "admin" || user.role === "head") return;
  if (!user.unitId) throw new ApiError(403, "Pengguna belum terhubung ke unit kerja");
  const db = getDb();
  const [assignment] = await db.select({ id: assignments.id }).from(assignments).where(and(eq(assignments.periodId, periodId), eq(assignments.indicatorId, indicatorId), eq(assignments.unitId, user.unitId))).limit(1);
  if (!assignment) throw new ApiError(403, "Indikator tidak ditugaskan kepada unit Anda");
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
  return Response.json({ error: "Permintaan tidak dapat diproses" }, { status: 500 });
}

export function getEvidenceBucket(): R2Bucket {
  const bucket = (env as unknown as { EVIDENCE?: R2Bucket }).EVIDENCE;
  if (!bucket) throw new ApiError(503, "Penyimpanan dokumen belum tersedia");
  return bucket;
}
