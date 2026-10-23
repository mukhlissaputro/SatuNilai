# Period interpretation rules and final score comparison

User selected period/year configuration and requested copying from earlier years.

Design: store the ordered interpretation bands on assessment_periods, independent of instrument structure and other years. Each band has inclusive lower bound, predicate and interpretation. Next lower bound is exclusive upper bound; final upper bound is period max_score inclusive. Empty bands mean unconfigured, never infer ITKP rules for another assessment. Require first lower bound 0, distinct finite bounds within period scale. Seed supplied ITKP 2026 thresholds on 100-point periods lacking configuration, including already finalized 2026 results; do not change scores or overwrite configured rules. This initial backfill makes current published results readable. Subsequent edits to finalized rules are blocked.

Admin editor lives alongside the instrument for selected type/year. Save validated bands; copy earlier same-type/same-scale periods by value, with replacement confirmation. Finalized target rejects all edits and copies. Source remains independent. No score mutation.

One shared classification helper feeds dashboard/workspace/public. For admin/head, raw self total and final assessor total use the same global cross-unit scope. Staff retain their private unit self total, with global final explicitly labeled and no cross-scope gap. Self remains provisional until admin finalization, then immutable locked scores provide its finalization value. Final cards show both interpretations and explicit self-minus-final gap. Public exposes only finalized final interpretation, no self/gap.

Tasks:
1. Add validated pure classification and boundary tests, period schema/migration and supplied ITKP seed.
2. Add authorized read/save/copy API and reject incompatible source, malformed bands and final targets. Exercise integration against disposable database.
3. Reuse shared calculation for comparison; wire dashboard, workspace, final preview and public total/year details. Add scoped admin editor without redesign.
4. Verify types, lint, scoring boundaries, integration/export regressions, migration on local database after backup, browser preview. Review independent of implementation. No production deployment or GitHub push requested this turn.

Edge checks: exact 30/50/60/70/80/90/100 bounds; null/out-of-range score; empty configuration; duplicate/nonzero-first bounds; no non-admin writes; previous same-type/year/scale restrictions; final lock; copied values independent of source; private/public isolation; cross-unit totals align.

Verification completed: typecheck, lint, production build, 12 pure scoring/interpretation tests, 5 disposable-database integration tests. Browser verified ITKP2026 self77/BB vs final69/B gap8, public final69/B, locked rules editor. Local migrations applied after SQL backup; no score values changed. No production or remote Git write. Historical weighted final regression includes two units and uneven evidence counts; public number and predicate both use shared result2.5.

User follow-up: move configuration out of Kategori Indikator into separate admin navigation Interpretasi Nilai, retaining type/year filter and existing category visual patterns. New interpretation-manager.tsx owns separate list, create/edit modal and save/copy actions. Browser fixture2027->2028 confirms add/save, duplicate rejection with editable recovery, copy and persistence; fixture removed afterward. Existing interpretation/scoring database schema unchanged by this UI follow-up.
