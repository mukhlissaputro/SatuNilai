import { sql } from "drizzle-orm";
import { index, int, double, mysqlTable, varchar, text as mysqlText, boolean, uniqueIndex } from "drizzle-orm/mysql-core";

const timestamps = {
  createdAt: varchar("created_at", { length: 255 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: varchar("updated_at", { length: 255 }).notNull().default(sql`CURRENT_TIMESTAMP`),
};

export const units = mysqlTable("units", {
  id: varchar("id", { length: 80 }).primaryKey(),
  code: varchar("code", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  active: boolean("active").notNull().default(true),
  ...timestamps,
}, (table) => [uniqueIndex("idx_units_code").on(table.code)]);

export const users = mysqlTable("users", {
  id: varchar("id", { length: 80 }).primaryKey(),
  email: varchar("email", { length: 255 }).notNull(),
  displayName: varchar("display_name", { length: 255 }).notNull(),
  role: varchar("role", { length: 32, enum: ["admin", "staff", "head"] }).notNull().default("staff"),
  unitId: varchar("unit_id", { length: 80 }).references(() => units.id),
  active: boolean("active").notNull().default(true),
  passwordHash: varchar("password_hash", { length: 64 }),
  passwordSalt: varchar("password_salt", { length: 255 }),
  passwordChangedAt: varchar("password_changed_at", { length: 255 }),
  ...timestamps,
}, (table) => [uniqueIndex("idx_users_email").on(table.email), index("idx_users_unit_id").on(table.unitId)]);

export const authSessions = mysqlTable("auth_sessions", {
  id: varchar("id", { length: 80 }).primaryKey(),
  userId: varchar("user_id", { length: 80 }).notNull().references(() => users.id),
  tokenHash: varchar("token_hash", { length: 64 }).notNull(),
  expiresAt: varchar("expires_at", { length: 255 }).notNull(),
  createdAt: varchar("created_at", { length: 255 }).notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("idx_auth_sessions_token").on(table.tokenHash), index("idx_auth_sessions_user").on(table.userId)]);

export const passwordResetTokens = mysqlTable("password_reset_tokens", {
  id: varchar("id", { length: 80 }).primaryKey(),
  userId: varchar("user_id", { length: 80 }).notNull().references(() => users.id),
  tokenHash: varchar("token_hash", { length: 64 }).notNull(),
  expiresAt: varchar("expires_at", { length: 255 }).notNull(),
  usedAt: varchar("used_at", { length: 255 }),
  createdAt: varchar("created_at", { length: 255 }).notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("idx_password_reset_token").on(table.tokenHash), index("idx_password_reset_user").on(table.userId)]);

export const assessmentTypes = mysqlTable("assessment_types", {
  id: varchar("id", { length: 80 }).primaryKey(),
  code: varchar("code", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: mysqlText("description").notNull().default(""),
  isPublic: boolean("is_public").notNull().default(false),
  active: boolean("active").notNull().default(true),
  ...timestamps,
}, (table) => [uniqueIndex("idx_assessment_types_code").on(table.code), index("idx_assessment_types_public_active").on(table.isPublic, table.active)]);

export const userAssessmentTypes = mysqlTable("user_assessment_types", {
  userId: varchar("user_id", { length: 80 }).notNull().references(() => users.id),
  assessmentTypeId: varchar("assessment_type_id", { length: 80 }).notNull().references(() => assessmentTypes.id),
  createdAt: varchar("created_at", { length: 255 }).notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("idx_user_assessment_types_unique").on(table.userId, table.assessmentTypeId), index("idx_user_assessment_types_type").on(table.assessmentTypeId)]);

export const instrumentVersions = mysqlTable("instrument_versions", {
  id: varchar("id", { length: 80 }).primaryKey(),
  assessmentTypeId: varchar("assessment_type_id", { length: 80 }).notNull().references(() => assessmentTypes.id),
  version: int("version").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  status: varchar("status", { length: 32, enum: ["draft", "published", "archived"] }).notNull().default("draft"),
  publishedAt: varchar("published_at", { length: 255 }),
  ...timestamps,
}, (table) => [uniqueIndex("idx_instrument_versions_type_version").on(table.assessmentTypeId, table.version)]);

export const categories = mysqlTable("categories", {
  id: varchar("id", { length: 80 }).primaryKey(),
  instrumentVersionId: varchar("instrument_version_id", { length: 80 }).notNull().references(() => instrumentVersions.id),
  code: varchar("code", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  weightPercent: double("weight_percent"),
  targetValue: double("target_value"),
  sortOrder: int("sort_order").notNull().default(0),
  ...timestamps,
}, (table) => [uniqueIndex("idx_categories_version_code").on(table.instrumentVersionId, table.code), index("idx_categories_version").on(table.instrumentVersionId)]);

export const subcategories = mysqlTable("subcategories", {
  id: varchar("id", { length: 80 }).primaryKey(),
  categoryId: varchar("category_id", { length: 80 }).notNull().references(() => categories.id),
  code: varchar("code", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  weightPercent: double("weight_percent"),
  targetValue: double("target_value"),
  finalValue: double("final_value"),
  sortOrder: int("sort_order").notNull().default(0),
  ...timestamps,
}, (table) => [uniqueIndex("idx_subcategories_category_code").on(table.categoryId, table.code), index("idx_subcategories_category").on(table.categoryId)]);

export const indicators = mysqlTable("indicators", {
  id: varchar("id", { length: 80 }).primaryKey(),
  subcategoryId: varchar("subcategory_id", { length: 80 }).notNull().references(() => subcategories.id),
  code: varchar("code", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: mysqlText("description").notNull().default(""),
  weightPercent: double("weight_percent"),
  targetValue: double("target_value"),
  sortOrder: int("sort_order").notNull().default(0),
  ...timestamps,
}, (table) => [uniqueIndex("idx_indicators_subcategory_code").on(table.subcategoryId, table.code), index("idx_indicators_subcategory").on(table.subcategoryId)]);

export const scoreOptions = mysqlTable("score_options", {
  id: varchar("id", { length: 80 }).primaryKey(),
  indicatorId: varchar("indicator_id", { length: 80 }).notNull().references(() => indicators.id),
  value: double("value").notNull(),
  label: varchar("label", { length: 255 }).notNull(),
  description: mysqlText("description").notNull().default(""),
  sortOrder: int("sort_order").notNull().default(0),
}, (table) => [uniqueIndex("idx_score_options_indicator_value").on(table.indicatorId, table.value)]);

export const assessmentPeriods = mysqlTable("assessment_periods", {
  id: varchar("id", { length: 80 }).primaryKey(),
  assessmentTypeId: varchar("assessment_type_id", { length: 80 }).notNull().references(() => assessmentTypes.id),
  instrumentVersionId: varchar("instrument_version_id", { length: 80 }).notNull().references(() => instrumentVersions.id),
  year: int("year").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  maxScore: double("max_score").notNull().default(5),
  startsAt: varchar("starts_at", { length: 255 }).notNull(),
  dueAt: varchar("due_at", { length: 255 }).notNull(),
  status: varchar("status", { length: 32, enum: ["draft", "open", "review", "finalized"] }).notNull().default("draft"),
  finalizedAt: varchar("finalized_at", { length: 255 }),
  finalizedBy: varchar("finalized_by", { length: 255 }).references(() => users.id),
  ...timestamps,
}, (table) => [index("idx_periods_type_year").on(table.assessmentTypeId, table.year), index("idx_periods_status_due").on(table.status, table.dueAt)]);

export const assignments = mysqlTable("assignments", {
  id: varchar("id", { length: 80 }).primaryKey(),
  periodId: varchar("period_id", { length: 80 }).notNull().references(() => assessmentPeriods.id),
  indicatorId: varchar("indicator_id", { length: 80 }).notNull().references(() => indicators.id),
  unitId: varchar("unit_id", { length: 80 }).notNull().references(() => units.id),
  assignedBy: varchar("assigned_by", { length: 255 }).notNull().references(() => users.id),
  createdAt: varchar("created_at", { length: 255 }).notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("idx_assignments_period_indicator_unit").on(table.periodId, table.indicatorId, table.unitId), index("idx_assignments_unit_period").on(table.unitId, table.periodId)]);

export const indicatorScores = mysqlTable("indicator_scores", {
  id: varchar("id", { length: 80 }).primaryKey(),
  periodId: varchar("period_id", { length: 80 }).notNull().references(() => assessmentPeriods.id),
  indicatorId: varchar("indicator_id", { length: 80 }).notNull().references(() => indicators.id),
  unitId: varchar("unit_id", { length: 80 }).notNull().references(() => units.id),
  targetValue: double("target_value"),
  internalValue: double("internal_value"),
  assessorValue: double("assessor_value"),
  status: varchar("status", { length: 32, enum: ["draft", "submitted", "approved", "rejected", "locked"] }).notNull().default("draft"),
  staffNote: mysqlText("staff_note").notNull().default(""),
  reviewerNote: mysqlText("reviewer_note").notNull().default(""),
  submittedAt: varchar("submitted_at", { length: 255 }),
  reviewedAt: varchar("reviewed_at", { length: 255 }),
  reviewedBy: varchar("reviewed_by", { length: 255 }).references(() => users.id),
  revision: int("revision").notNull().default(1),
  ...timestamps,
}, (table) => [uniqueIndex("idx_scores_period_indicator_unit").on(table.periodId, table.indicatorId, table.unitId), index("idx_scores_status").on(table.status), index("idx_scores_unit_period").on(table.unitId, table.periodId)]);

export const evidence = mysqlTable("evidence", {
  id: varchar("id", { length: 80 }).primaryKey(),
  unitId: varchar("unit_id", { length: 80 }).notNull().references(() => units.id),
  title: varchar("title", { length: 255 }).notNull(),
  sourceType: varchar("source_type", { length: 32, enum: ["file", "link"] }).notNull(),
  currentVersionId: varchar("current_version_id", { length: 80 }),
  status: varchar("status", { length: 32, enum: ["active", "superseded", "deleted"] }).notNull().default("active"),
  rejectedAt: varchar("rejected_at", { length: 255 }),
  createdBy: varchar("created_by", { length: 255 }).notNull().references(() => users.id),
  ...timestamps,
}, (table) => [index("idx_evidence_unit_status").on(table.unitId, table.status)]);

export const evidenceFavorites = mysqlTable("evidence_favorites", {
  userId: varchar("user_id", { length: 80 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  evidenceId: varchar("evidence_id", { length: 80 }).notNull().references(() => evidence.id, { onDelete: "cascade" }),
  createdAt: varchar("created_at", { length: 255 }).notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("idx_evidence_favorites_unique").on(table.userId, table.evidenceId), index("idx_evidence_favorites_user").on(table.userId, table.createdAt)]);

export const evidenceVersions = mysqlTable("evidence_versions", {
  id: varchar("id", { length: 80 }).primaryKey(),
  evidenceId: varchar("evidence_id", { length: 80 }).notNull().references(() => evidence.id),
  version: int("version").notNull(),
  objectKey: mysqlText("object_key"),
  externalUrl: mysqlText("external_url"),
  originalFilename: varchar("original_filename", { length: 255 }),
  contentType: varchar("content_type", { length: 255 }),
  sizeBytes: int("size_bytes"),
  sha256: varchar("sha256", { length: 64 }),
  reviewerNote: mysqlText("reviewer_note").notNull().default(""),
  uploadedBy: varchar("uploaded_by", { length: 255 }).notNull().references(() => users.id),
  createdAt: varchar("created_at", { length: 255 }).notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("idx_evidence_versions_evidence_version").on(table.evidenceId, table.version), index("idx_evidence_versions_hash").on(table.sha256)]);

export const evidenceLinks = mysqlTable("evidence_links", {
  id: varchar("id", { length: 80 }).primaryKey(),
  evidenceId: varchar("evidence_id", { length: 80 }).notNull().references(() => evidence.id),
  scoreId: varchar("score_id", { length: 80 }).notNull().references(() => indicatorScores.id),
  createdAt: varchar("created_at", { length: 255 }).notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("idx_evidence_links_evidence_score").on(table.evidenceId, table.scoreId), index("idx_evidence_links_score").on(table.scoreId)]);

export const notificationReads = mysqlTable("notification_reads", {
  id: varchar("id", { length: 80 }).primaryKey(),
  userId: varchar("user_id", { length: 80 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  notificationKey: varchar("notification_key", { length: 500 }).notNull(),
  readAt: varchar("read_at", { length: 255 }).notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("idx_notification_reads_user_key").on(table.userId, table.notificationKey), index("idx_notification_reads_user").on(table.userId)]);

export const auditLogs = mysqlTable("audit_logs", {
  id: varchar("id", { length: 80 }).primaryKey(),
  actorId: varchar("actor_id", { length: 80 }).references(() => users.id),
  action: varchar("action", { length: 255 }).notNull(),
  entityType: varchar("entity_type", { length: 255 }).notNull(),
  entityId: varchar("entity_id", { length: 80 }).notNull(),
  metadata: mysqlText("metadata").notNull().default("{}"),
  ipHash: varchar("ip_hash", { length: 255 }),
  createdAt: varchar("created_at", { length: 255 }).notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_audit_entity").on(table.entityType, table.entityId), index("idx_audit_actor_created").on(table.actorId, table.createdAt)]);
