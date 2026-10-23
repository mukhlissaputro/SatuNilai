# Flexible assessment scoring implementation plan

**Goal:** ITKP 2026 uses direct points with per-indicator maxima, consistent UI/API/reports, and a fresh 100-point instrument.
**Architecture:** Add backward-compatible scoring mode and nullable maximum. A shared calculator and database reader aggregate one row per indicator to avoid evidence fan-out. Preserve 2025 scores and all other instruments.
**Spec:** ../specs/2026-10-23-flexible-assessment-scoring-design.md (approved; user permits fresh 2026 instead of conversion).

## Constraints and decisions
- Work in a feature branch in the existing checkout so the local Docker source mount receives the authorized update. No push or deployment.
- Old tests have six known failures caused by deleted database.sql; keep separate from new regression tests.
- Do not delete old ITKP: fresh 2026 has no scores and its own instrument version.
- Direct finalization derives final points from approved internal scores; admin reviews the indicator values before finalization. No independent freehand final subtotal.
- Missing points count as zero contribution but remain incomplete. Multiple units are averaged per indicator before summation, never summed into a score above its maximum.

## Tasks
- [x] 1. RED: calculator tests for maxima, sum 100, partial score 25, missing and multi-unit rows, weighted compatibility. GREEN: shared calculator and schema migration.
- [x] 2. Integrate validation, aggregation and finalization in workspace/dashboard/public and exports. Add API integration tests on disposable data.
- [x] 3. Preserve existing UI; add mode and indicator maximum, point labels, per-indicator limits and automatic final subtotals.
- [x] 4. Backup database, transactionally prepare empty ITKP 2026 instrument with 4 categories, 7 subcategories, 12 indicators; verify idempotence and unchanged old scores.
- [x] 5. Run typecheck/lint/build/new tests, browser verification, final review, document results.

## Review focus
Missing values; multiple evidence rows; old scoring unchanged; mode/maximum changes after scores exist; finalization bypass; unmatched instrument/year; repeated setup must never erase scores.

## Progress
Planning complete. Baseline: typecheck/lint/build passed in this session history; six tests failed because database.sql was deleted in HEAD.

Task 1: 5 calculator tests RED (module missing) then GREEN.
Task 2–3: disposable MariaDB integration passed legacy workflow and direct-point workflow: limits, 25-point sample, duplicate evidence, finalization, public score and PDF/Excel. Central final-instrument locks and mode-copy validation added. UI verified locally: all 12 maxima and Renaksi edit field 6.
Task 4: backup backups/before-itkp-2026-20261023T073137Z/database.sql verified at 213803 bytes; migration applied; seed reported 4/7/12, maximum 100, scores 0, oldScoresUnchanged true. Second run unchanged. Schema check 20 tables, 31 foreign keys, zero orphans.
Final review: fresh reviewer found admin final preview had single-unit scope while finalization averaged all units. Regression failed 6 != 3, fixed global admin subtotal and passed. Additional contribution regression failed 99 != 6, fixed derived contributions and passed.
Ruling: preserve old 2025 data rather than delete — deletion is unnecessary because the 2026 instrument is separate. Cost: 2025 remains visible as an older period.
Ruling: keep existing checkout on feature branch because Docker mounts this source directory — local app receives updates; no worktree or remote push.
Known baseline: six tests still require deleted database.sql. One old source-text assertion updated from periodMaxScore to indicatorMaxScore to reflect the new requirement; remaining existing checks pass.
