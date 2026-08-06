import { sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { assessmentPeriods, assessmentTypes, assignments, categories, indicatorScores, indicators, instrumentVersions, scoreOptions, subcategories, units, users } from "../../../db/schema";
import { ApiError, apiError, assertSameOrigin, audit } from "../_security";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const id = request.headers.get("oai-authenticated-user-id");
    const email = request.headers.get("oai-authenticated-user-email")?.trim().toLowerCase();
    if (!id || !email) throw new ApiError(401, "Autentikasi diperlukan");
    const db = getDb();
    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(users);
    let current;
    if (Number(count) === 0) {
      const encodedName = request.headers.get("oai-authenticated-user-full-name");
      let displayName = email;
      if (encodedName && request.headers.get("oai-authenticated-user-full-name-encoding") === "percent-encoded-utf-8") {
        try { displayName = decodeURIComponent(encodedName); } catch { /* use email */ }
      }
      current = { id, email, displayName, role: "admin" as const, unitId: null };
      await db.insert(users).values({ id, email, displayName, role: "admin" });
      await audit(request, current, "system.bootstrap", "user", id, { role: "admin" });
    } else {
      const [existing] = await db.select().from(users).where(sql`${users.id} = ${id}`).limit(1);
      if (!existing) throw new ApiError(403, "Akun belum didaftarkan oleh administrator");
      current = { id: existing.id, email: existing.email, displayName: existing.displayName, role: existing.role, unitId: existing.unitId };
    }

    const [{ typeCount }] = await db.select({ typeCount: sql<number>`count(*)` }).from(assessmentTypes);
    let seeded = false;
    if (Number(typeCount) === 0 && current.role === "admin") {
      const unitId = "unit-diskominfo";
      const typeId = "type-spbe";
      const versionId = "instrument-spbe-2025-v1";
      const periodId = "period-spbe-2025";
      const categoryRows = [
        { id: "cat-1", code: "1", name: "Kebijakan Internal Tata Kelola", weight: 20 },
        { id: "cat-2", code: "2", name: "Tata Kelola Pemerintah Digital", weight: 30 },
        { id: "cat-3", code: "3", name: "Manajemen Pemerintah Digital", weight: 20 },
        { id: "cat-4", code: "4", name: "Layanan Pemerintah Digital", weight: 30 },
      ];
      const subcategoryRows = [
        { id: "sub-11", categoryId: "cat-1", code: "1.1", name: "Tata Kelola Pemerintah Digital" },
        { id: "sub-12", categoryId: "cat-1", code: "1.2", name: "Manajemen Layanan Digital Pemerintah" },
        { id: "sub-21", categoryId: "cat-2", code: "2.1", name: "Layanan Pemerintah Digital" },
      ];
      const indicatorRows = [
        { id: "ind-111", subcategoryId: "sub-11", code: "1.1.1", name: "Arsitektur SPBE Instansi Pusat/Pemerintah Daerah", value: 4, target: 5, assessor: 4 },
        { id: "ind-112", subcategoryId: "sub-11", code: "1.1.2", name: "Peta Rencana SPBE Instansi", value: 3, target: 4, assessor: 3 },
        { id: "ind-121", subcategoryId: "sub-12", code: "1.2.1", name: "Penerapan Manajemen Risiko SPBE", value: 2, target: 4, assessor: null },
        { id: "ind-211", subcategoryId: "sub-21", code: "2.1.1", name: "Layanan Administrasi Pemerintahan Berbasis Elektronik", value: 5, target: 5, assessor: 5 },
      ];
      await db.batch([
        db.insert(units).values({ id: unitId, code: "DISKOMINFO", name: "Dinas Komunikasi dan Informatika" }),
        db.insert(assessmentTypes).values({ id: typeId, code: "SPBE", name: "Indeks Sistem Pemerintahan Berbasis Elektronik" }),
        db.insert(instrumentVersions).values({ id: versionId, assessmentTypeId: typeId, version: 1, name: "Instrumen SPBE 2025", status: "published", publishedAt: new Date().toISOString() }),
        ...categoryRows.map((row, index) => db.insert(categories).values({ id: row.id, instrumentVersionId: versionId, code: row.code, name: row.name, weightPercent: row.weight, sortOrder: index + 1 })),
        ...subcategoryRows.map((row, index) => db.insert(subcategories).values({ id: row.id, categoryId: row.categoryId, code: row.code, name: row.name, sortOrder: index + 1 })),
        ...indicatorRows.map((row, index) => db.insert(indicators).values({ id: row.id, subcategoryId: row.subcategoryId, code: row.code, name: row.name, sortOrder: index + 1 })),
        ...indicatorRows.flatMap((row) => [1, 2, 3, 4, 5].map((value) => db.insert(scoreOptions).values({ id: `opt-${row.id}-${value}`, indicatorId: row.id, value, label: ["", "Kurang", "Cukup", "Baik", "Sangat Baik", "Memuaskan"][value], sortOrder: value }))),
        db.insert(assessmentPeriods).values({ id: periodId, assessmentTypeId: typeId, instrumentVersionId: versionId, year: 2025, name: "Penilaian SPBE 2025", startsAt: "2025-01-01T00:00:00.000Z", dueAt: "2025-12-31T23:59:59.000Z", status: "open" }),
        ...indicatorRows.map((row) => db.insert(assignments).values({ id: `assign-${row.id}`, periodId, indicatorId: row.id, unitId, assignedBy: current.id })),
        ...indicatorRows.map((row) => db.insert(indicatorScores).values({ id: `score-${row.id}`, periodId, indicatorId: row.id, unitId, targetValue: row.target, internalValue: row.value, assessorValue: row.assessor, status: row.value ? "draft" : "draft" })),
      ]);
      seeded = true;
      await audit(request, current, "system.seeded", "assessment_period", periodId, { assessmentType: "SPBE" });
    }
    return Response.json({ initialized: Number(count) === 0, seeded, user: current }, { status: Number(count) === 0 ? 201 : 200 });
  } catch (error) { return apiError(error); }
}
