import { env } from "cloudflare:workers";
import {
  ApiError,
  apiError,
  assertSameOrigin,
  requireUser,
} from "../_security";

type WorkspaceEnv = { DB: D1Database };

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const db = (env as unknown as WorkspaceEnv).DB;
    const scope =
      user.role === "admin"
        ? {
            sql: "AND s.status IN ('submitted','draft')",
            values: [] as string[],
          }
        : user.role === "staff"
          ? {
              sql: "AND s.status IN ('approved','rejected','locked') AND s.unit_id=? AND EXISTS(SELECT 1 FROM user_assessment_types uat WHERE uat.user_id=? AND uat.assessment_type_id=p.assessment_type_id)",
              values: [String(user.unitId ?? ""), user.id],
            }
          : {
              sql: "AND s.status IN ('approved','rejected','locked') AND EXISTS(SELECT 1 FROM user_assessment_types uat WHERE uat.user_id=? AND uat.assessment_type_id=p.assessment_type_id)",
              values: [user.id],
            };
    const result = await db
      .prepare(
        `SELECT s.id AS scoreId,s.status,s.reviewer_note AS reviewerNote,s.updated_at AS updatedAt,i.code,i.name,p.id AS periodId,p.year,t.code AS typeCode,COUNT(el.id) AS evidenceCount FROM indicator_scores s JOIN indicators i ON i.id=s.indicator_id JOIN assessment_periods p ON p.id=s.period_id JOIN assessment_types t ON t.id=p.assessment_type_id LEFT JOIN evidence_links el ON el.score_id=s.id WHERE EXISTS(SELECT 1 FROM evidence_links check_el WHERE check_el.score_id=s.id) ${scope.sql} GROUP BY s.id ORDER BY s.updated_at DESC LIMIT 50`,
      )
      .bind(...scope.values)
      .all();
    const notifications = await Promise.all(
      result.results.map(async (row) => {
        const status = String(row.status);
        const effectiveStatus = status === "draft" ? "submitted" : status;
        const key = `${String(row.scoreId)}:${effectiveStatus}:${String(row.updatedAt)}`;
        const read = await db
          .prepare(
            "SELECT 1 ok FROM notification_reads WHERE user_id=? AND notification_key=? LIMIT 1",
          )
          .bind(user.id, key)
          .first();
        const label =
          effectiveStatus === "rejected"
            ? "Bukti ditolak admin"
            : effectiveStatus === "approved" || effectiveStatus === "locked"
              ? "Bukti diterima admin"
              : "Bukti menunggu verifikasi";
        return {
          key,
          scoreId: row.scoreId,
          periodId: row.periodId,
          code: row.code,
          name: row.name,
          year: row.year,
          typeCode: row.typeCode,
          status: effectiveStatus,
          label,
          note: row.reviewerNote,
          evidenceCount: Number(row.evidenceCount ?? 0),
          read: Boolean(read),
          updatedAt: row.updatedAt,
        };
      }),
    );
    return Response.json(
      {
        notifications,
        unread: notifications.filter((item) => !item.read).length,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const body = (await request.json()) as { key?: string };
    const key = String(body.key ?? "").slice(0, 500);
    if (!key) throw new ApiError(400, "Notifikasi tidak valid");
    await (env as unknown as WorkspaceEnv).DB.prepare(
      "INSERT OR IGNORE INTO notification_reads(id,user_id,notification_key) VALUES(?,?,?)",
    )
      .bind(crypto.randomUUID(), user.id, key)
      .run();
    return Response.json({ read: true });
  } catch (error) {
    return apiError(error);
  }
}
