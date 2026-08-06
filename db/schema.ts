import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
};

export const units = sqliteTable("units", {
  id: text("id").primaryKey(),
  code: text("code").notNull(),
  name: text("name").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  ...timestamps,
}, (table) => [uniqueIndex("idx_units_code").on(table.code)]);

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  displayName: text("display_name").notNull(),
  role: text("role", { enum: ["admin", "staff", "head"] }).notNull().default("staff"),
  unitId: text("unit_id").references(() => units.id),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  passwordHash: text("password_hash"),
  passwordSalt: text("password_salt"),
  passwordChangedAt: text("password_changed_at"),
  ...timestamps,
}, (table) => [uniqueIndex("idx_users_email").on(table.email), index("idx_users_unit_id").on(table.unitId)]);

export const authSessions = sqliteTable("auth_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  tokenHash: text("token_hash").notNull(),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("idx_auth_sessions_token").on(table.tokenHash), index("idx_auth_sessions_user").on(table.userId)]);

export const passwordResetTokens = sqliteTable("password_reset_tokens", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  tokenHash: text("token_hash").notNull(),
  expiresAt: text("expires_at").notNull(),
  usedAt: text("used_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("idx_password_reset_token").on(table.tokenHash), index("idx_password_reset_user").on(table.userId)]);

export const assessmentTypes = sqliteTable("assessment_types", {
  id: text("id").primaryKey(),
  code: text("code").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  ...timestamps,
}, (table) => [uniqueIndex("idx_assessment_types_code").on(table.code)]);

export const userAssessmentTypes = sqliteTable("user_assessment_types", {
  userId: text("user_id").notNull().references(() => users.id),
  assessmentTypeId: text("assessment_type_id").notNull().references(() => assessmentTypes.id),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("idx_user_assessment_types_unique").on(table.userId, table.assessmentTypeId), index("idx_user_assessment_types_type").on(table.assessmentTypeId)]);

export const instrumentVersions = sqliteTable("instrument_versions", {
  id: text("id").primaryKey(),
  assessmentTypeId: text("assessment_type_id").notNull().references(() => assessmentTypes.id),
  version: integer("version").notNull(),
  name: text("name").notNull(),
  status: text("status", { enum: ["draft", "published", "archived"] }).notNull().default("draft"),
  publishedAt: text("published_at"),
  ...timestamps,
}, (table) => [uniqueIndex("idx_instrument_versions_type_version").on(table.assessmentTypeId, table.version)]);

export const categories = sqliteTable("categories", {
  id: text("id").primaryKey(),
  instrumentVersionId: text("instrument_version_id").notNull().references(() => instrumentVersions.id),
  code: text("code").notNull(),
  name: text("name").notNull(),
  weightPercent: real("weight_percent"),
  targetValue: real("target_value"),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
}, (table) => [uniqueIndex("idx_categories_version_code").on(table.instrumentVersionId, table.code), index("idx_categories_version").on(table.instrumentVersionId)]);

export const subcategories = sqliteTable("subcategories", {
  id: text("id").primaryKey(),
  categoryId: text("category_id").notNull().references(() => categories.id),
  code: text("code").notNull(),
  name: text("name").notNull(),
  weightPercent: real("weight_percent"),
  targetValue: real("target_value"),
  finalValue: real("final_value"),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
}, (table) => [uniqueIndex("idx_subcategories_category_code").on(table.categoryId, table.code), index("idx_subcategories_category").on(table.categoryId)]);

export const indicators = sqliteTable("indicators", {
  id: text("id").primaryKey(),
  subcategoryId: text("subcategory_id").notNull().references(() => subcategories.id),
  code: text("code").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  weightPercent: real("weight_percent"),
  targetValue: real("target_value"),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
}, (table) => [uniqueIndex("idx_indicators_subcategory_code").on(table.subcategoryId, table.code), index("idx_indicators_subcategory").on(table.subcategoryId)]);

export const scoreOptions = sqliteTable("score_options", {
  id: text("id").primaryKey(),
  indicatorId: text("indicator_id").notNull().references(() => indicators.id),
  value: real("value").notNull(),
  label: text("label").notNull(),
  description: text("description").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
}, (table) => [uniqueIndex("idx_score_options_indicator_value").on(table.indicatorId, table.value)]);

export const assessmentPeriods = sqliteTable("assessment_periods", {
  id: text("id").primaryKey(),
  assessmentTypeId: text("assessment_type_id").notNull().references(() => assessmentTypes.id),
  instrumentVersionId: text("instrument_version_id").notNull().references(() => instrumentVersions.id),
  year: integer("year").notNull(),
  name: text("name").notNull(),
  maxScore: real("max_score").notNull().default(5),
  startsAt: text("starts_at").notNull(),
  dueAt: text("due_at").notNull(),
  status: text("status", { enum: ["draft", "open", "review", "finalized"] }).notNull().default("draft"),
  finalizedAt: text("finalized_at"),
  finalizedBy: text("finalized_by").references(() => users.id),
  ...timestamps,
}, (table) => [index("idx_periods_type_year").on(table.assessmentTypeId, table.year), index("idx_periods_status_due").on(table.status, table.dueAt)]);

export const assignments = sqliteTable("assignments", {
  id: text("id").primaryKey(),
  periodId: text("period_id").notNull().references(() => assessmentPeriods.id),
  indicatorId: text("indicator_id").notNull().references(() => indicators.id),
  unitId: text("unit_id").notNull().references(() => units.id),
  assignedBy: text("assigned_by").notNull().references(() => users.id),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("idx_assignments_period_indicator_unit").on(table.periodId, table.indicatorId, table.unitId), index("idx_assignments_unit_period").on(table.unitId, table.periodId)]);

export const indicatorScores = sqliteTable("indicator_scores", {
  id: text("id").primaryKey(),
  periodId: text("period_id").notNull().references(() => assessmentPeriods.id),
  indicatorId: text("indicator_id").notNull().references(() => indicators.id),
  unitId: text("unit_id").notNull().references(() => units.id),
  targetValue: real("target_value"),
  internalValue: real("internal_value"),
  assessorValue: real("assessor_value"),
  status: text("status", { enum: ["draft", "submitted", "approved", "rejected", "locked"] }).notNull().default("draft"),
  staffNote: text("staff_note").notNull().default(""),
  reviewerNote: text("reviewer_note").notNull().default(""),
  submittedAt: text("submitted_at"),
  reviewedAt: text("reviewed_at"),
  reviewedBy: text("reviewed_by").references(() => users.id),
  revision: integer("revision").notNull().default(1),
  ...timestamps,
}, (table) => [uniqueIndex("idx_scores_period_indicator_unit").on(table.periodId, table.indicatorId, table.unitId), index("idx_scores_status").on(table.status), index("idx_scores_unit_period").on(table.unitId, table.periodId)]);

export const evidence = sqliteTable("evidence", {
  id: text("id").primaryKey(),
  unitId: text("unit_id").notNull().references(() => units.id),
  title: text("title").notNull(),
  sourceType: text("source_type", { enum: ["file", "link"] }).notNull(),
  currentVersionId: text("current_version_id"),
  status: text("status", { enum: ["active", "superseded", "deleted"] }).notNull().default("active"),
  rejectedAt: text("rejected_at"),
  createdBy: text("created_by").notNull().references(() => users.id),
  ...timestamps,
}, (table) => [index("idx_evidence_unit_status").on(table.unitId, table.status)]);

export const evidenceVersions = sqliteTable("evidence_versions", {
  id: text("id").primaryKey(),
  evidenceId: text("evidence_id").notNull().references(() => evidence.id),
  version: integer("version").notNull(),
  objectKey: text("object_key"),
  externalUrl: text("external_url"),
  originalFilename: text("original_filename"),
  contentType: text("content_type"),
  sizeBytes: integer("size_bytes"),
  sha256: text("sha256"),
  reviewerNote: text("reviewer_note").notNull().default(""),
  uploadedBy: text("uploaded_by").notNull().references(() => users.id),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("idx_evidence_versions_evidence_version").on(table.evidenceId, table.version), index("idx_evidence_versions_hash").on(table.sha256)]);

export const evidenceLinks = sqliteTable("evidence_links", {
  id: text("id").primaryKey(),
  evidenceId: text("evidence_id").notNull().references(() => evidence.id),
  scoreId: text("score_id").notNull().references(() => indicatorScores.id),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("idx_evidence_links_evidence_score").on(table.evidenceId, table.scoreId), index("idx_evidence_links_score").on(table.scoreId)]);

export const notificationReads = sqliteTable("notification_reads", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  notificationKey: text("notification_key").notNull(),
  readAt: text("read_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("idx_notification_reads_user_key").on(table.userId, table.notificationKey), index("idx_notification_reads_user").on(table.userId)]);

export const auditLogs = sqliteTable("audit_logs", {
  id: text("id").primaryKey(),
  actorId: text("actor_id").references(() => users.id),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  metadata: text("metadata").notNull().default("{}"),
  ipHash: text("ip_hash"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_audit_entity").on(table.entityType, table.entityId), index("idx_audit_actor_created").on(table.actorId, table.createdAt)]);
